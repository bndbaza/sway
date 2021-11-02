
var manifest = chrome.runtime.getManifest(),
	info = {
		version: manifest.version
	},
	matchesRE = null;

(function() {
	var urlsRE = [],
		parse = new RegExp("^(\\*|http|https)\\:\\/\\/(\\*)?\\.?([^\\*\\/]+)\\/(.*)", "i");
	
	function getUrlRE(res) {
		var acc = (res[1] == "*" ? "(http|https)" : res[1]);
		acc += "\\:\\/\\/";
		if (res[2]) {
			acc += "[^\\/]*.?";
		}
		acc += res[3] + "(\\:\\d+)?";
		acc += (res[4] == "*" ? "($|\\/.*)" : "\\/" + res[4]);
		return acc;
	}
	
	manifest.content_scripts[0].matches.forEach(function(mask) {
		var res = parse.exec(mask);
		if (res && (res.length > 4)) {
			urlsRE.push(getUrlRE(res));
		} else {
			console.log("init matchesRE: can't parse " + mask);
		}
	});
	
	matchesRE = new RegExp("(" + urlsRE.join("|") + ")", "i");
})();

function checkAccess(origin) {
	try {
		return matchesRE && matchesRE.test(origin);
	} catch(e) {
		return false;
	}
}

function Session(port) {
	var nativePort = null,
		originChecked = false,
		hasAccess = false;

	function toPage(message) {
		port.postMessage(message);
	}
	
	function onDisconnect() {
		var lastError = chrome.runtime.lastError;
		var message = (lastError !== null) ? lastError.message : "disconnect from native messaging host";
		toPage({
			type: "DisconnectNativePort",
			message: message
		});
		nativePort = null;
	}

	port.onMessage.addListener(function send(request) {
		if (!originChecked) {
			originChecked = true;
			hasAccess = checkAccess(request.origin);
		}
		if (!hasAccess) {
			request.type = "NativeClientHasNotAccess";
			request.kdError = 5;
			toPage(request);
			return;
		}
		try {
			var cmd = request.cmd;
			if (cmd < 0) {
				request.type = "Control";
				if (cmd == -1) { // Info
					request.result = info;
					toPage(request);
				} else if (cmd == -2) { // Disconnect
					nativePort.disconnect();
					nativePort = null;
					request.result = true;
					toPage(request);
					try {
						port.disconnect();
						port = null;
					} catch(e) { }
				}
				return;
			}
			if (!nativePort) {
				nativePort = chrome.runtime.connectNative('kd.nc');
				nativePort.onMessage.addListener(toPage);
				nativePort.onDisconnect.addListener(onDisconnect);
			}
			nativePort.postMessage(request);
		} catch (ex) {
			request.type = "NativePortConnectError";
			request.errorMessage = ex.message && ex;
			request.kdError  = ex.number;
			var lastError = chrome.runtime.lastError;
			if (lastError) {
				request.errorMessage += ' (' + lastError.message + ')';
			}
			toPage(request);
		}
	});
	
	port.onDisconnect.addListener(function close() {
		if (nativePort !== null) {
			try {
				nativePort.disconnect();
			} catch (err) { }
		}
	});
}

chrome.runtime.onConnect.addListener(Session);

function reloadContentScripts() {
	var scripts = manifest.content_scripts[0].js,
		except = new RegExp("^chrome:\/\/", "i");
	chrome.windows.getAll({ populate: true }, function(windows) {
		windows.forEach(function(window) {
			window.tabs.forEach(function(tab) {
				if (!except.test(tab.url)) {
					scripts.forEach(function(script) {
						chrome.tabs.executeScript(tab.id, {
							file: script,
							allFrames: true
						});
					});
				}
			});
		});
	});
}

function closeWebStorePage() {
	chrome.tabs.query(
		{url: ['https://chrome.google.com/webstore/*/' + chrome.runtime.id + '*']},
		function(tabs){
			tabs.forEach(function(tab){
				chrome.tabs.remove(tab.id);
			});
		});
}

chrome.runtime.onInstalled.addListener(function(details) {
	var UPDATE = chrome.runtime.OnInstalledReason.UPDATE;
	if (!details || details.reason !== UPDATE) {
		reloadContentScripts();
		closeWebStorePage();
	}
});
