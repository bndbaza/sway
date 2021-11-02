/**
 * Контентный скрипт
 * Контентный скрипт подключается к главной странице автоматически,
 * если её домен совпадает со списком разрешений из manifest.json
 * Контентный скрипт загружается до загрузки главной страницы (см. content_scripts[0].run_at в manifest.json)
 *
 * WARNING!!!
 * Фоновая страница может посылать сообщения контентным скриптам при помощи метода chrome.tabs.sendMessage()
 * (см. https://developer.chrome.com/extensions/tabs#method-sendMessage) с явным указанием в какую вкладку отправлять.
 * Но сообщение отправляется всем вкладкам данного расширения!! А узнать номер своей вкладки напрямую контентный
 * скрипт не может (см. https://developer.chrome.com/extensions/content_scripts).
 *
 * Номер вкладки будет получен следующим образом: при передаче данных в фоновую страницу в chrome.runtime.sendMessage()
 * (см. https://developer.chrome.com/extensions/runtime#method-sendMessage) назначается обработчик responseCallback,
 * которому возращается номер вкладки через sendResponse из обработчика события chrome.runtime.onMessage фоновой страницы
 * (см. https://developer.chrome.com/extensions/runtime#event-onMessage).
 *
 * @author Есин А.И.
 */

'use strict';

//
// Приватные глобальные переменные
//

var currentTabId = undefined;

//
// Инициализация
//

injectExtensionInfoToPage();

/*
Теперь в Chrome и Opera background.js внедряет в страницу content.js при запуске
(FF изначально сам так делает, причем сначала выгружая старый контентный скрипт)
Поэтому нужно стрельнуть из нового content.js в старый событием, чтобы тот уничтожил все подписки и был съеден GC.
 */
var destructionEvent = 'destructExtension_' + chrome.runtime.id;

document.dispatchEvent(new CustomEvent(destructionEvent));
document.addEventListener(destructionEvent, function () {
   window.removeEventListener('message', receiveMessageFromPage);
   chrome.runtime.onMessage.removeListener(receiveMessageFromBackground);
});

connectToPage();
connectToBackground();

/**
 * Логгер
 * Если debugMode == true, то логи выводятся
 * @property {function} log - Показать сообщение в консоли
 * @property {function} error - Показать ошибку в консоли
 * @property {boolean} debugMode - Нужно ли показывать сообщения в консоли
 */
var logger = {
   log: function(data) {
      // eslint-disable-next-line no-console
      return (this.debugMode) ? console.log('SbisPluginTransport:NMH:content:' + (+new Date()), data) : false;
   },
   error: function(data) {
      // eslint-disable-next-line no-console
      return (this.debugMode) ? console.error('SbisPluginTransport:NMH:content:' + (+new Date()), data) : false;
   },
   info: function(data) {
      // eslint-disable-next-line no-console
      return (this.debugMode) ? console.info('SbisPluginTransport:NMH:content:' + (+new Date()), data) : false;
   },
   debugMode: false
};

//
// Сервисы комуникации с главной страницей
//

/**
 * @brief Внедрение информациии о расширении в главную страницу
 * Как проверить наличие расширения SBIS Plugin Extension в браузере Chrome?
 * - обратиться к переменной window.sbisPluginExtensionInfo, если она не равна undefined,
 * то необходимое расширение установлено и включено.
 * @return {void}
 */
function injectExtensionInfoToPage() {
   let script = document.createElement('script');
   script.setAttribute('type', 'text/javascript');
   script.textContent =
	'Object.defineProperty(window,\n\
		"sbisPluginExtensionInfo",\n\
		{\n\
			value: "' + 'chrome-extension://' + String(chrome.runtime.id) + '",\n\
			writable: false,\n\
			configurable: false\n\
		});';

   // Внедрение поля <script type=text/javascript>"Object.defineProperty(window, ..."</script>
   // непосредственно в главную страницу (<html lang="en"> ... </html>)
   document.documentElement.appendChild(script);
}

/**
 * @brief Подключение к главной странице
 * @return {void}
 */
function connectToPage() {
   window.addEventListener('message', receiveMessageFromPage);
}

/**
 * @brief Приём сообщения от главной страницы
 * @param event Структура содержащая дескриптор отправителя
 * @return {void}
 */
function receiveMessageFromPage(event) {
   if (event.source !== window) {
      return;
   }

   if (event.data.type && (event.data.type === 'FROM_WEB_PAGE_TO_CONTENT_SCRIPT')) {

      // Слушаем команду конфигурации
      if (event.data.cmd === 'configure') {
         let data = JSON.parse(event.data.data);
         if (data && data.hasOwnProperty('debug')) {
            logger.debugMode = data.debug;
         }
      }

      sendMessageToBackground(event.data);
   }
}

/**
 * @brief Отправка сообщения на главную страницу
 * Этоже сообщение попадает и в контентный скрипт тоже (так работает window.postMessage()),
 * поэтому необходимо тегировать пакет (см. поле type)
 * @param message {Object} Сообщение
 * @return {void}
 */
function sendMessageToPage(message) {
   message.type = 'FROM_CONTENT_SCRIPT_TO_WEB_PAGE';

   logger.log(message);

   try {
      window.postMessage(message, '*');
   } catch (err) {
      logger.error('Send message to web page fail (' + err.name + ') : ' + err.message);
   }
}

//
// Сервисы комуникации с фоновой страницей расширения
//

/**
 * @brief Подключение к фоновой странице расширения
 * @return {void}
 */
function connectToBackground() {
   chrome.runtime.onMessage.addListener(receiveMessageFromBackground);
}

/**
 * @brief Приём сообщения от фоновой страницы расширения
 * @param message {Object} Сообщение
 * @param sender Структура содержащая дескриптор отправителя сообщения
 * @param sendResponse Указатель на функцию, с помощью которой можно отправить ответ отправителю
 * @return {void}
 */
// eslint-disable-next-line no-unused-vars
function receiveMessageFromBackground(message, sender, sendResponse) {
   // Принимаем сообщения только для этой вкладки или широковещательный запрос
   if ((message.tab_id === currentTabId) || (message.tab_id === -1)) {
      sendMessageToPage(message);
   }
}

/**
 * @brief Отправка сообщения фоновой странице расширения
 * @param message {Object} Сообщение
 * @return {void}
 */
function sendMessageToBackground(message) {
   message.type = 'FROM_CONTENT_SCRIPT_TO_BACKGROUND';

   logger.log(message);

   try {
      chrome.runtime.sendMessage(message,

         // Получить номер вкладки, в которой исполняется этот контентный скрипт
         function(response) {
            if (response) {
               currentTabId = response.tab_id;
            }
         });
   } catch (err) {
      logger.error('Send message to background fail (' + err.name + ') : ' + err.message);
      sendMessageToPage({ 'id': message.id, 'cmd': 'error', 'data': 'Send message to background fail' });
   }
}
