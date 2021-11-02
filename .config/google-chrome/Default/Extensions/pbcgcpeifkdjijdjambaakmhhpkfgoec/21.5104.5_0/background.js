/**
 * Фоновая страница расширения
 * Фоновая страница запустится как только данное расширение будет разрешено (включено).
 * Фоновая страница создана с учётом техник Event Pages:
 * [1] https://developer.chrome.com/extensions/event_pages
 * [2] http://chrome-ext.blogspot.ru/2014/02/event-pages.html
 * 27.09.2019 (Временно?) делаем persistent:true. Для работы мониторинга УРЛ в Event Pages режиме
 * требуются большие доработки и более тщательное тестирование.
 * Возможно, persistent:false нецелесообразно по CPU, т.к. требуется часто сохранять в локальное хранилище и читать обратно данные.
 *
 * @author Есин А.И.
 */
/* eslint-disable no-undef */ // срабатывает на chrome, logger, am, AM_TAB_ID
'use strict';

//
// Приватные константы
//

// Прочитать список доменов для которых будут автоматически подключаться контентные скрипты
// const MATCH_PATTERNS = chrome.runtime.getManifest().content_scripts[0].matches;
const NATIVE_MESSAGING_HOST = 'ru.tensor.sbis_plugin_nmh';

//
// Приватные глобальные переменные
//

/**
 * @type {?chrome.runtime.Port}
 */
let nmhPort = null; // Пока соединение с NMH установлено, скрипт не будет выгружен и переменная будет существовать

/**
 * @type {Map<number, string>}
 */
let contentTabs = new Map();

/**
 * Буфер для сборки цепочки блоков ответного сообщения
 * @type {Object}
 */
let queries = {};

//
// Инициализация
//

// Установка обработчика для события "вкладка закрыта"
chrome.tabs.onRemoved.addListener(
   function (tabId) {
      if (checkTab(tabId)) {

         // Удалить вкладку из списка
         logger.log('Remove tab: id=' + tabId);
         removeTab(tabId);

         // Закрыть все соединения для закрываемой вкладки
         sendMessageToNmh({'tab_id': tabId, 'id': -1, 'cmd': 'disconnect', 'data': ''});

         // Если список вкладок оказался пуст, то закрываем соединение с NMH
         if (checkTabListOnEmpty()) {
            disconnectFromNmh();
         }
      }
   });

// Установка поключения к контентным скриптам
connectToContent();

//
// Вспомогательные сервисы
//

/**
 * @brief Проверить наличие вкладки в списке
 * @param tabId {number} Номер вкладки
 * @return {boolean} true - есть в списке; false - нет в списке
 */
function checkTab(tabId) {
   if (typeof (tabId) != 'number') {
      return false;
   }

   return contentTabs.has(tabId);
}

/**
 * @brief Проверить список вкладок на пустоту
 * @return {boolean} true - список пуст; false - список не пуст
 */
function checkTabListOnEmpty() {
   return contentTabs.size === 0;
}

/**
 * @brief Добавить вкладку в список
 * @param tabId {number} Номер вкладки
 * @param url {string} URL вкладки
 * @return {void}
 */
function addTab(tabId, url) {
   contentTabs.set(tabId, url);
}

/**
 * @brief Удалить вкладку из списка
 * @param tabId {number} Номер вкладки
 * @return {void}
 */
function removeTab(tabId) {
   contentTabs.delete(tabId);
}

/**
 * @brief Выполнить действие над каждой вкладкой списка
 * @param handler {function} Функция обработчик : void function (number tabId)
 * @return {void}
 */
function foreachTabs(handler) {
   contentTabs.forEach((url, tabId) => handler(tabId));
}

//
// Сервисы комуникации с контентным скриптом
//

/**
 * @brief Подключение к контентному скрипту
 * @return {void}
 */
function connectToContent() {
   chrome.runtime.onMessage.addListener(receiveMessageFromContent);
}

/**
 * @brief Приём сообщения от контентного скрипта
 * @param message {Object} Сообщение
 * @param sender Структура содержащая дескриптор отправителя сообщения
 * @param sendResponse Указатель на функцию, с помощью которой можно отправить ответ отправителю
 * @return {void}
 */
function receiveMessageFromContent(message, sender, sendResponse) {

   // Слушаем команду конфигурации
   if (message.cmd === 'configure') {
      let data = JSON.parse(message.data);
      if (data && data.hasOwnProperty('debug')) {
         logger.debugMode = data.debug;
      }
   }

   // Добавить в сообщение идентификатор сессии (по сути, номер вкладки с которой пришёл запрос)
   message.tab_id = sender.tab.id; // eslint-disable-line id-match

   // Отправить вкладкке её номер (из контентного скрипта узнать номер его вкладки нельзя)
   sendResponse({'tab_id': sender.tab.id});

   // Добавить вкладку в список
   if (!checkTab(sender.tab.id)) {
      connectToNmh();
      logger.log('Create tab: id=' + sender.tab.id + '; url=' + sender.tab.url);
      addTab(sender.tab.id, sender.tab.url);
   } else if (!nmhPort) {
      connectToNmh();
   }

   // Отправить сообщение в NMH
   sendMessageToNmh(message);
}

/**
 * @brief Отправка сообщения в контентный скрипт
 * @param message {Object} Сообщение
 * @return {void}
 */
function sendMessageToContent(message) {
   if (message.tab_id === AM_TAB_ID) {
      am.messageFromNmhToAm(message);
      return;
   }

   // Проверить номер вкладки
   if (!checkTab(message.tab_id)) {
      logger.log('received data from NMH is bad');
      return;
   }

   // Перезаписать направление передачи сообщения
   message.type = 'FROM_BACKGROUND_SCRIPT_TO_CONTENT_SCRIPT';

   logger.log(message);

   try {
      // Отправить сообщение вкладке с которой пришёл запрос
      chrome.tabs.sendMessage(message.tab_id, message);
   } catch (err) {
      logger.error('Send message to content fail (' + err.name + ') : ' + err.message);
   }
}

//
// Сервисы комуникации с Native Messaging Host приложением
//

/**
 * @brief Подключение к NMH
 * @return {void}
 */
function connectToNmh() {
   if (nmhPort) {
      return;
   }

   // Открытие соединения с NMH
   try {
      nmhPort = chrome.runtime.connectNative(NATIVE_MESSAGING_HOST);
   } catch (err) {
      logger.error('Native Messaging Host connection fail (' + err.name + ') : ' + err.message);
      return;
   }

   logger.log('Native Messaging Host connection successful');

   // Установка обработчика "принято сообщение от NMH"
   nmhPort.onMessage.addListener(receiveMessageFromNmh);

   // Установка обработчика на событие "отключение NMH"
   nmhPort.onDisconnect.addListener(
      function () {
         logger.log('Native Messaging Host disconnected outside');
         am.tryReconnect();

         // Уничтожить предыдущий NMH порт
         nmhPort = null;

         // Уведомить web страницы что все соединения были разорваны
         foreachTabs(
            function (tabId) {
               sendMessageToContent({
                  'tab_id': tabId,
                  'id': -1,
                  'cmd': 'error',
                  'data': 'Native Messaging Host is crashed'
               });
            });

         // NMH выключился - перезапустить
         if (chrome.runtime.lastError.message === 'Native host has exited.') {
            connectToNmh();
         }
      });
}

/**
 * @brief Отключение от NMH
 * @return {void}
 */
function disconnectFromNmh() {
   if (!nmhPort) {
      return;
   }

   logger.log('Native Messaging Host disconnect');
   nmhPort.disconnect();
   nmhPort = null;
}

/**
 * @brief Приём сообщений от NMH (ChromeNMHTransport в СБИС Плагин)
 * @param message {Object} Сообщение
 * @param sender Структура содержащая дескриптор отправителя сообщения
 * @param sendResponse Указатель на функцию, с помощью которой можно отправить ответ отправителю
 * @return {void}
 */
// eslint-disable-next-line no-unused-vars
function receiveMessageFromNmh(message, sender, sendResponse) {

   // Для случая когда объем возвращаемых данных превышает 1Mb
   // сообщения из СБИС Плагин разделяются на блоки не превышающие 1 Mb
   //
   // Для определения цепочки блоков одного сообщения из СБИС Плагин приходят данные содержащий следующие поля
   // parts_id - GUID единый для цепочки блоков одного сообщения
   // part - номер блока
   // parts - общее кол-во блоков в одной цепочке

   if (message.hasOwnProperty('parts') && parseInt(message.parts, 10) > 1) {
      if (!queries.hasOwnProperty(message.parts_id)) {
         queries[message.parts_id] = [];

         // Добавляем таймаут на ожидание всех блоков цепочки - ??? надо ли
      }

      // Сохраняем данные в буфере и ждем получения следующего блока цепочки
      queries[message.parts_id].push(message);

      // Склеиваем блоки
      if (queries[message.parts_id].length === parseInt(message.parts, 10)) {
         let result = {
            cmd: message.cmd,
            id: message.id,
            tab_id: message.tab_id, // eslint-disable-line id-match
            data: ''
         };

         queries[message.parts_id].forEach(function (element /*, index, array*/) {
            result.data += element.data;
         });

         // Отправляем собранные блоки
         sendMessageToContent(result);

         // убираем из буфера
         delete queries[message.parts_id];
      }
   } else {
      sendMessageToContent(message);
   }
}

/**
 * @brief Отправка сообщения в NMH (ChromeNMHTransport в СБИС Плагин)
 * @param message {Object} Сообщение
 * @return {void}
 */
function sendMessageToNmh(message) {
   if (!nmhPort) {
      sendMessageToContent({
         'tab_id': message.tab_id,
         'id': message.id,
         'cmd': 'error',
         'data': 'Send message to NMH fail. NMHPort is unavailable'
      });
      return;
   }

   // Перезаписать направление передачи сообщения
   message.type = 'FROM_BACKGROUND_SCRIPT_TO_NMH';

   logger.log(message);

   try {
      nmhPort.postMessage(message);
   } catch (err) {
      logger.error('Send message to NMH fail (' + err.name + ') : ' + err.message);
      sendMessageToContent({
         'tab_id': message.tab_id,
         'id': message.id,
         'cmd': 'error',
         'data': 'Send message to NMH fail'
      });
   }
}

chrome.runtime.onStartup.addListener(() => {
   logger.deleteOldLogs()
      .then(logger.logStore('startup'));
});

function trySend(message) {
   logger.info('messageFromAmToNmh ' + JSON.stringify(message));
   connectToNmh();
   if (!nmhPort) {
      logger.log('null nmhPort');
      return;
   }
   try {
      nmhPort.postMessage(message);
   } catch (err) {
      logger.log('failSend ' + JSON.stringify(err));
   }
}

if (window.navigator.platform.search('Linux') !== -1) {
   am.nmhSendFunction = trySend;
   am.start();
}

function reloadContentScripts() {
   var manifest = chrome.runtime.getManifest();
   var scripts = manifest.content_scripts[0].js;
   var matches = manifest.content_scripts[0].matches;
   chrome.tabs.query({url: matches}, function (foundTabs) {
      foundTabs.forEach(function (tab) {
         scripts.forEach(function (script) {
            chrome.tabs.executeScript(tab.id, {
               file: script,
               allFrames: true
            });
         });
      })
   });
}

function closeStoreWindows() {
   chrome.tabs.query({
      url: [
         '*://chrome.google.com/webstore/*/' + chrome.runtime.id + '*',
         '*://addons.opera.com/*/sbis-plugin-extension*'
      ]
   }, function (foundTabs) {
      foundTabs.forEach(function (tab) {
         chrome.windows.get(tab.windowId, { populate: true }, function(window) {
            if (window.tabs.length === 1) {
               chrome.windows.remove(tab.windowId);
            }
         });
      })
   });
}

// Обновляем content скрипты на страницах
reloadContentScripts();
// При включении закрываем окна с вкладкой расширения
closeStoreWindows();
