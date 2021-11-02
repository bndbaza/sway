
var REQUEST_TYPE = 'diag-helper-request';
var RESPONSE_TYPE = 'diag-helper-response';

var send = (function() {
	var port = null;

	return function(request, origin) {
		if (!port) {
			port = chrome.runtime.connect();
			port.onMessage.addListener(function(response) {
				window.postMessage({
					type: RESPONSE_TYPE, 
					response: response
				}, origin);
			});
			port.onDisconnect.addListener(function() {
				port = null;
			});
		}
		port.postMessage(request);
	};
}());

window.addEventListener('message', function(ev) {
	var data = ev.data;
	if (data && (data.type === REQUEST_TYPE)) {
		var request = data.request,
			origin = ev.origin || window.location.origin;
			request.origin = origin;
		send(request, origin);
	}
}, false);
