(function(){function b(a){chrome.tabs.query({},function(c){for(var b in c)chrome.tabs.sendMessage(c[b].id,a)})}function e(){a=null}var a;chrome.extension.onMessage.addListener(function(d){a||(a=chrome.runtime.connectNative("com.bifit.signer"),a.onMessage.addListener(b),a.onDisconnect.addListener(e));a.postMessage(d)})})();