/**
 * Логгер
 * @author Волков Д.А.
 */
'use strict';

// Храним логи 10 дней
const LOGS_KEEP_FOR_MS = 10 * 24 * 60 * 60 * 1000;

// Максимальное число хранимых записей
const LOGS_KEEP_MAX_RECORDS = 1000;

// Префикс, выводимый в консоль перед записью логов
const LOG_PREFIX = 'SbisPluginTransport:NMH:background:';

/**
 * Возвращает дату в виде "2019-07-04 15:10:14"
 * @param {Date|number} d
 * @return {string}
 */
function toDateTimeStr(d) {
   if (typeof d === 'number') {
      return toDateTimeStr(new Date(d));
   }
   return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)} ` +
      `${('0' + d.getHours()).slice(-2)}:${('0' + d.getMinutes()).slice(-2)}:${('0' + d.getSeconds()).slice(-2)}`;
}

/**
 * Логгер. Вывод логов в консоль в зависимости от признака debugMode, хранение в local storage.
 * Если debugMode == true, то логи выводятся.
 * @property {boolean} debugMode - Нужно ли показывать сообщения в консоли
 * @property {[Array<Object>]} logs - Записи логов, для хранения
 * @property {Promise<void>} logsLoaded - Логи прочитаны из хранилища
 */
class Logger {
   /**
    * @constructor
    */
   constructor() {
      this.debugMode = false;
      this.logs = null;

      // Для однократного вызова асинхронной операции чтения хранилища
      this.logsLoaded = new Promise(resolve => {
         chrome.storage.local.get(['logs'], (storage) => {
            if (storage.hasOwnProperty('logs')) {
               this.logs = storage.logs;
            } else {
               this.logs = [];
            }
            resolve();
         });
      });
   }

   /**
    * Показать сообщение в консоли
    * @param {Object} data Данные для вывода
    * @returns {void}
    */
   log(data) {
      if (this.debugMode) {
         console.log(LOG_PREFIX + (+new Date()), data); // eslint-disable-line no-console
      }
   }

   /**
    * Показать ошибку в консоли
    * @param {Object} data Данные для вывода
    * @returns {void}
    */
   error(data) {
      if (this.debugMode) {
         console.error(LOG_PREFIX + (+new Date()), data); // eslint-disable-line no-console
      }
   }

   /**
    * Показать info в консоли
    * @param {Object} data Данные для вывода
    * @returns {void}
    */
   info(data) {
      if (this.debugMode) {
         console.info(LOG_PREFIX + (+new Date()), data); // eslint-disable-line no-console
      }
   }

   /**
    * Показать сообщение в консоли и сохранить в local storage
    * @param {Object} data Данные для вывода
    * @returns {void}
    */
   logStore(data) {
      let now = Date.now();
      let message = `${toDateTimeStr(now)} ${now / 1000} ${JSON.stringify(data)}`;
      if (this.debugMode) {
         console.log(LOG_PREFIX + message); // eslint-disable-line no-console
      }
      this.logsLoaded.then(() => {
         this.logs.push({'time': now, 'message': message});
         this._saveLogsToStorage();
      });
   }

   /**
    * Удалить записи логов старше LOGS_KEEP_FOR_MS
    * @returns {Promise<void>}
    */
   async deleteOldLogs() {
      let oldDate = Date.now() - LOGS_KEEP_FOR_MS;
      await this.logsLoaded;
      let len = this.logs.length;
      this.logs = this.logs.filter((record) => {
         return record.time > oldDate;
      });
      let nDeleted = this.logs.length - len;
      if (nDeleted) {
         this.logStore(`deleteOldLogs: удалено ${nDeleted} записей старше ${toDateTimeStr(oldDate)}, осталось ${this.logs.length}`);
      }
   }

   /**
    * Сохранить логи в local storage. Сохраняются не более LOGS_KEEP_MAX_RECORDS последних записей.
    * @returns {void}
    * @private
    */
   _saveLogsToStorage() {
      if (this.logs) {
         this.logs.splice(0, this.logs.length - LOGS_KEEP_MAX_RECORDS);
         chrome.storage.local.set({'logs': this.logs});
      }
   }
}

var logger = new Logger(); // eslint-disable-line no-unused-vars
