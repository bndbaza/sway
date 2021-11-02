var manifest = chrome.runtime.getManifest();
var info = {
    type: 'chrome',
    version: manifest.version
};

function Session(sessionId, onMessage) {
    var nativePort = null;
    var buffers = {};

    function reply(request, error, result) {
        onMessage({
            sessionId: request.sessionId,
            commandId: request.commandId,
            error: error,
            result: result
        });
    }

    function onResponse(message) {
        if (message.isChunked) {
            var id = message.id;
            var buffer = buffers[id] || '';
            buffer += message.data;
            if (!message.isFinalChunk) {
                buffers[id] = buffer;
                return;
            }
            delete buffers[id];
            message = JSON.parse(buffer);
        }
        onMessage(message);
    }

    function clear() {
        nativePort = null;
        buffers = {};
    }

    function onDisconnect() {
        clear();
        var error = chrome.runtime.lastError;
        var message = !!error
            ? (!!error.message ? error.message : error)
            : 'disconnect from native messaging host';
        onMessage({
            sessionId: sessionId,
            error: {
                type: 'connect',
                message: message
            }
        });
    }

    this.send = function(request) {
        if (request.type === 'extension.info') {
            reply(request, undefined, info);
            return;
        }
        if (request.type === 'extension.close') {
            this.close();
            return;
        }
        try {
            if (nativePort === null) {
                nativePort = chrome.runtime.connectNative('kontur.plugin');
                nativePort.onMessage.addListener(onResponse);
                nativePort.onDisconnect.addListener(onDisconnect);
            }
            nativePort.postMessage(request);
        } catch (err) {
            reply(request, { 
                type: 'connect', 
                message: !!err.message ? err.message : 'failed to send message to native messaging host' 
            });
        }
    };

    this.close = function() {
        if (nativePort !== null) {
            tryDisconnect(nativePort);
            clear();
        }
    };
}

function tryDisconnect(port) {
    try {
        port.disconnect();
    } catch (err) {
    }
}

function reloadContentScripts() {
    var scripts = manifest.content_scripts[0].js;

    chrome.windows.getAll({}, function(windows) {
        windows.forEach(function(window) {
            chrome.tabs.query({ windowId: window.id }, function(tabs) {
                tabs.forEach(executeScripts)
            });
        });
    });

    function executeScripts(tab) {
        scripts.forEach(function(script) {
            chrome.tabs.executeScript(tab.id, {
                file: script,
                allFrames: true
            }, function (_) {
                const lastErr = chrome.runtime.lastError;
                if (lastErr) console.log('tab: ' + tab.id + ' lastError: ' + JSON.stringify(lastErr));
            });
        });
    }
}

function closeExtensionInstallPages() {
    chrome.tabs.query(
        { url: [
            'https://chrome.google.com/webstore/detail/*',
            'https://addons.opera.com/*/extensions/details/*',
            'https://microsoftedge.microsoft.com/addons/detail/*'
        ]},
        function (tabs) {
            tabs.forEach( function (tab) { 
                if (tab.title.includes('Контур.Плагин')) {
                    chrome.tabs.query({ windowId: tab.windowId }, (tabs) => {
                        if (tabs.length === 1 && tabs[0].id === tab.id) {
                            chrome.windows.remove(tabs[0].windowId);
                        } else {
                            chrome.tabs.remove(tab.id);
                        }
                    });
                }
            }
        )}
    );
}

chrome.runtime.onConnect.addListener(function(port) {
    var session = new Session(port.name, onResponse);
    port.onMessage.addListener(function(message) { session.send(message); });
    port.onDisconnect.addListener(onDisconnect);

    function onResponse(message) {
        if(!!port) {
            try {
                port.postMessage(message);
            } catch (err) {
                tryDisconnect(port);
                onDisconnect();
            }
        }
    }

    function onDisconnect() {
        port = null;
        session.close();
        session = null;
    }
});

chrome.runtime.onInstalled.addListener(function(details) {
    var isFirefox = navigator.userAgent.toLowerCase().lastIndexOf('firefox/') !== -1;
    if (!isFirefox && (details.reason === 'install' || details.reason === 'update')) {
        reloadContentScripts();
        closeExtensionInstallPages();
    }
});
