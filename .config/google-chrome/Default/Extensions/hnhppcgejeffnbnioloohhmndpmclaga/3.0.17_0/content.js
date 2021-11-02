var REQUEST_TYPE = 'kontur-toolbox-request';
var RESPONSE_TYPE = 'kontur-toolbox-response';
var INSTALLATION_FLAG_ATTRIBUTE = 'kontur-toolbox-installed';
var KONTUR_HOST_NAMES = ['.kontur.ru', '.kontur-ca.ru', '.kontur-extern.ru', '.kontur', '.testkontur.ru'];

function checkCurrentHostName() {
    var elem = document.createElement('a');
    elem.href = window.location.href;
    var currentHostName = elem.hostname;
    for (var i = 0; i < KONTUR_HOST_NAMES.length; ++i) {
        var hostName = KONTUR_HOST_NAMES[i];
        if (currentHostName.indexOf(hostName, currentHostName.length - hostName.length) !== -1) {
            return true;
        }
    }
    return false;
}

try {
    if (checkCurrentHostName()) {
        document.addEventListener('DOMContentLoaded', function(event) {
            if (!!document.head) {
                var meta = document.createElement('meta');
                meta.setAttribute(INSTALLATION_FLAG_ATTRIBUTE, 'true');
                document.head.appendChild(meta);
            }
        });
    }
} catch (err){
}

var send = (function() {
    var ports = {};

    function onPortResponse(response) {
        window.postMessage({
            type: RESPONSE_TYPE, 
            response: response
        }, '*');
    }

    function onDisconnect(sessionId) {
        delete ports[sessionId];
        var error = chrome.runtime.lastError;
        var message = !!error
            ? (!!error.message ? error.message : error)
            : 'disconnect from background script';
        onPortResponse({
            sessionId: sessionId,
            error: {
                type: 'connect',
                message: message
            }
        });
    }

    return function(request) {
        try {
            var sessionId = request.sessionId;
            var port = ports[sessionId];
            if (!port) {
                port = chrome.runtime.connect({ name: sessionId });
                ports[sessionId] = port;
                port.onMessage.addListener(onPortResponse);
                port.onDisconnect.addListener(function() { onDisconnect(sessionId); });
            }
            port.postMessage(request);
        } catch (err) {
            onPortResponse({
                sessionId: request.sessionId,
                commandId: request.commandId,
                error: {
                    type: 'connect',
                    message: err.message || 'failed to send message to background script'
                }
            });
        }
    };
}());

window.addEventListener('message', function(ev) {
    if (ev.source != window) {
        return;
    }

    if (!!ev.data && ev.data.type === REQUEST_TYPE) {
        var request = ev.data.request;
        if (!!request && !!request.sessionId) {
            request.hostUri = window.location.href;
            send(request);
        }
    }
}, false);