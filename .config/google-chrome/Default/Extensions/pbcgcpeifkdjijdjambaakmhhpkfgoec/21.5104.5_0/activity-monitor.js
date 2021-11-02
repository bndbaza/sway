/**
 * Обработка событий перехода по URL и отправка событий в СБИС3 Плагин
 * @author Волков Д.А.
 */
'use strict';

/* eslint-disable no-undef*/               // ругается на logger, chrome
/* eslint-disable no-use-before-define */  // ругается на am

/**
 * Номер псевдовкладки, от которого отправляются сообщения ActivityMonitor
 * @type {number}
 */
var AM_TAB_ID = -5; // -1, -2 - служебные id, взял произвольный свободный
const AM_CONNECTION_ID_INITIAL = -5; // тоже произвольное отрицательное
const AM_PORT_DEFAULT = 8201;

/**
 * Интервал отправки данных в Плагин
 * @type {number}
 */
const AM_SEND_INTERVAL_MS = 5 * 60 * 1000;

/**
 * URL, при переходе по которому предлагается сохранить файл с логами расширения
 * @type {string}
 */
const AM_SAVE_LOGS_URL = 'chrome://extensions/SbisPluginExtension/save_logs';

/**
 * Запись о посещённом URL
 * @property {int} type 1 - URL, 0 - файл или devtools
 * @property {string} site адрес сайта
 * @property {int} timeFrom время перехода по ссылке
 * @property {int} timeTo время перехода по следующей ссылке
 */
class UrlRecord {
   /**
    * @constructor
    * @param {int} type 1 - сайт, 0 - файл или devtools
    * @param {string} site адрес сайта
    * @param {int} timeFrom  время перехода по ссылке
    * @param {int} timeTo время перехода по следующей ссылке
    */
   constructor(type, site, timeFrom = 0, timeTo = 0) {
      this.type = type;
      this.site = site;
      this.timeFrom = timeFrom;
      this.timeTo = timeTo;
   }
}

function save(filename, data) {
   let blob = new Blob([data], {type: 'text/csv'});
   if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
   } else {
      let elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
   }
}

function onUpdatedListener(tabId, changeInfo, tab) {
   if (changeInfo.status === 'loading' && tab.active) {
      am.onURLChanged(tab.url);

      if (tab.url === AM_SAVE_LOGS_URL) {
         logger.logsLoaded.then(() => {
            save(`SBISPluginExtension_${chrome.runtime.getManifest().version}_logs.txt`, JSON.stringify(logger.logs));
         });
      }
   }
}

function onActivatedListener(onActivated) {
   if (onActivated.tabId !== chrome.tabs.TAB_ID_NONE) {
      chrome.tabs.get(onActivated.tabId, (tab) => {
         am.onURLChanged(tab.url);
      });
   }
}

function onFocusChangedListener(windowId) {
   if (windowId === chrome.windows.WINDOW_ID_NONE) {
      chrome.windows.getCurrent({populate: false, windowTypes: ['normal', 'devtools']}, (window) => {
         if (window.type === 'devtools') {
            am.onURLChanged('devtools');
         }
      });
   } else {
      chrome.tabs.query({active: true, windowId: window.id}, (tabs) => {
         am.onURLChanged(tabs[0].url);
      });
   }
}

/**
 * Класс, отслеживающий переход по URL, накапливающий и передающий данные
 * @property {function} nmhSendFunction метод отправки данных через NMH
 * @property {int} connId идентификатор текущей сессии NMH
 * @property {int} port порт слушателя WebSocket плагина
 * @property {boolean} needConnect нужно ли делать вызов Connect перед отправкой данных
 * @property {Array<UrlRecord>} urlCache кеш собранных URL
 * @property {Array<UrlRecord>} urlToSend URL для отправки
 */
class ActivityMonitor {
   /**
    * @constructor
    */
   constructor() {
      this.nmhSendFunction = null;

      this.urlCache = [];
      this.urlToSend = [];

      this.connId = AM_CONNECTION_ID_INITIAL;
      this.port = AM_PORT_DEFAULT;
      this.needConnect = true;
   }

   /**
    * Обработка ответов, пришедших через NMH
    * @param message сообщение
    */
   messageFromNmhToAm(message) {
      logger.info('messageFromNmhToAm ' + JSON.stringify(message));
      if (!message.hasOwnProperty('cmd')) {
         return;
      }
      if (message.cmd === 'connect') {
         if (message.id === this.connId) {
            this.needConnect = false;
            logger.logStore('подключение успешно');
         }
         return;
      }
      if (message.cmd === 'disconnect') {
         if (message.id === this.connId) {
            this.tryReconnect();
         }
         return;
      }
      if (message.cmd === 'error') {
         this.tryReconnect();
         return;
      }

      if (message.cmd !== 'message') {
         return;
      }
      let data1 = JSON.parse(message.data);
      if (!data1.hasOwnProperty('type') || !data1.hasOwnProperty('data')) {
         return;
      }
      let data2 = data1.data;
      if (data1.type === 'event') {
         if (data2.hasOwnProperty('eventName') && data2.eventName === 'needReconnect' && data2.hasOwnProperty('data')) {
            let data3 = data2.data;
            if (data3.hasOwnProperty('Port')) {
               this.port = data3.Port;
               this.tryReconnect();
               logger.logStore(`Подключение к порту ${this.port}, ИД подключения ${this.connId}`);
               this.nmhSendFunction(this._composeConnectMessage());
            }
            logger.logStore('needReconnect без указания нового порта');
         }
      } else if (data1.type === 'answer') {
         data2 = JSON.parse(data2);
         if (data2.hasOwnProperty('result')) {
            if (data2.result === null) {
               logger.logStore('успешная отправка');
               this.urlToSend = [];
            }
         }
      } else if (data1.type === 'error' && data2.hasOwnProperty('error') && data2.hasOwnProperty('errorType')) {
         if (data2.errorType === 'RPC_ERROR') {
            let error1 = data2.error;
            logger.logStore('RPC_ERROR ' + JSON.stringify(error1));

            //this.tryReconnect();
            //this.stop();
         }
      }
   }

   /**
    * Зарегистрировать слушатели событий перехода по URL
    */
   start() {
      logger.logStore('Запуск ActivityMonitor');
      chrome.tabs.onUpdated.addListener(onUpdatedListener);
      chrome.tabs.onActivated.addListener(onActivatedListener);
      chrome.windows.onFocusChanged.Filters = ['normal', 'devtools'];
      chrome.windows.onFocusChanged.addListener(onFocusChangedListener);

      this.sendIntervalId = setInterval(() => this.sendUrls(), AM_SEND_INTERVAL_MS);
   }

   /**
    * Удалить слушатели событий перехода по URL
    */
   stop() {
      logger.logStore('Остановка ActivityMonitor');
      chrome.tabs.onUpdated.removeListener(onUpdatedListener);
      chrome.tabs.onActivated.removeListener(onActivatedListener);
      chrome.windows.onFocusChanged.removeListener(onFocusChangedListener);

      if (this.sendIntervalId) {
         clearInterval(this.sendIntervalId);
      }
   }

   /**
    * Вызывается при пропадании соединения с NMH
    */
   tryReconnect() {
      this.needConnect = true;
      this.connId--; // новый id подключения. Отрицательный id, поэтому уменьшаем.
   }

   /**
    * Обработка события перехода по URL
    * @param url {String}
    */
   onURLChanged(url) {
      let now = Math.floor(Date.now() / 1000); // округляем до целых секунд
      let cur = ActivityMonitor._siteFromUrl(url);

      if (this.urlCache.length) {
         let prev = this.urlCache[this.urlCache.length - 1];
         prev.timeTo = now;
         if (prev.site === cur.site) {
            return;
         }
      }
      cur.timeFrom = now;
      this.urlCache.push(cur);
      logger.info(cur.site);
   }

   /**
    * Отправка в Плагин накопленной информации по URL
    * @returns {Promise<void>}
    */
   async sendUrls() {
      if (this.urlCache.length) {
         let now = Math.floor(Date.now() / 1000);
         let lastRec = this.urlCache[this.urlCache.length - 1];
         lastRec.timeTo = now;
         this.urlToSend = this.urlToSend.concat(this.urlCache.filter((rec) => {
            return rec.timeFrom < rec.timeTo;
         }));
         this.urlCache = [new UrlRecord(lastRec.type, lastRec.site, now, now)];
      }

      if (!this.urlToSend.length) {
         return;
      }
      if (this.needConnect) {
         logger.logStore(`Подключение к порту ${this.port}, ИД подключения ${this.connId}`);
         this.nmhSendFunction(this._composeConnectMessage());
         await sleep(1000);
         if (this.needConnect) {
            return;
         }
      }
      logger.logStore(`Отправка ${this.urlToSend.length} записей`);
      this.nmhSendFunction(this._composeMessage());
   }

   _composeConnectMessage() {
      return {
         type: 'FROM_BACKGROUND_SCRIPT_TO_NMH',
         cmd: 'connect',
         tab_id: AM_TAB_ID, // eslint-disable-line id-match
         id: this.connId,
         part: 1,
         parts: 1,
         parts_id: generateUUID(),  // eslint-disable-line id-match
         data: 'ws://127.0.0.1:' + (this.port)
      };
   }

   _urlsToRecordSetTimestamp() {
      return {
         s: [
            {n: 'Type', t: 'Число целое'},
            {n: 'Name', t: 'Строка'},
            {n: 'Description', t: 'Строка'},
            {n: 'Begin', t: 'Число целое'},
            {n: 'End', t: 'Число целое'}
         ],
         f: 0,
         d: this.urlToSend.map((rec) => [rec.type, rec.site, '', rec.timeFrom, rec.timeTo]),
         _type: 'recordset'
      };
   }

   _composeMessage() {
      return {
         type: 'FROM_BACKGROUND_SCRIPT_TO_NMH',
         cmd: 'message',
         tab_id: AM_TAB_ID, // eslint-disable-line id-match
         id: this.connId,
         part: 1,
         parts: 1,
         parts_id: generateUUID(), // eslint-disable-line id-match
         data: JSON.stringify({
            accessToken: null,
            protoVersion: 1,
            queryId: generateUUID(),
            lang: 'ru-RU',
            moduleName: 'ActivityMonitor',
            moduleVersion: '1.1.0.0',
            query: JSON.stringify({
               jsonrpc: '2.0',
               protocol: 5,
               method: 'ActivityMonitor.UrlFromExtension',
               params: {
                  browser: 'chrome',
                  urls: this._urlsToRecordSetTimestamp()
               },
               id: this.connId
            })
         })
      };
   }

   /**
    * Преобразовать URL к структуре Activity
    * @param {String} url URL, либо 'devtools', либо null
    * @returns {UrlRecord}
    */
   static _siteFromUrl(url) {
      if (!url || url === 'devtools') {
         return new UrlRecord(0, 'Инструмент разработчика в браузере');
      }
      let urlObj = new URL(url);
      if (urlObj.protocol === 'file:') {
         return new UrlRecord(0, 'Просмотр файлов в браузере');
      }
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
         return new UrlRecord(0, 'chrome');
      }
      return new UrlRecord(1, punycode.toUnicode(urlObj.hostname));
   }
}

function sleep(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

function generateUUID() {
   let dt = new Date().getTime();
   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      let r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
   });
}

var am = new ActivityMonitor();
