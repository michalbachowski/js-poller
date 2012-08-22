var pollerFactory = function (window, jQuery) {
        "use strict";
        var defaults = {
                timeout: 1,      // minutes
                data: { 'cursor': null },
                errorSleepTime: 500
            },
            options = {},
            errorSleepTime = {},
            listeners = {},
            deferreds = {},
            i = 0,

            onError = function (response, url) {
                // when response does not contain "status" field it means that "timeout" occured,
                // so wo don`t increase error sleep time
                var status = 0;
                try {
                    status = parseInt(response.status, 10);
                } catch (e) {
                }
                if (status !== 1) {
                    errorSleepTime[url] *= 2;

                }
                window.setTimeout(
                    function () {
                        sendRequest(url);
                    },
                    errorSleepTime[url]
                );
            },

            sendRequest = function (url) {
                // send request
                deferreds[url] = jQuery.ajax({
                    url: url,
                    data: options[url].data,
                    dataType: "jsonp",
                    type: "POST",
                    timeout: options[url].timeout * 60 * 1000,
                    global: false
                });
                // append listeners
                for (i = 0; i < listeners[url].length; i = i + 1) {
                    deferreds[url].success(listeners[url][i]);
                }
                deferreds[url].error(function (response, url) {
                    onError(response, url);
                });
            },

            onSuccess = function (response, url) {
                // fetch last message ID (cursor)
                if (typeof response !== "undefined" && 1 === parseInt(response.status, 10)) {
                    options[url].data.cursor = response.messages[response.messages.length - 1].id;
                }
                errorSleepTime[url] = options[url].errorSleepTime;
                sendRequest(url);
            };

        return function (url, success, params) {
            if (!listeners.hasOwnProperty(url)) {
                options[url] = jQuery.extend(defaults, params);
                listeners[url] = [function (response) { onSuccess(response, url); }];
                errorSleepTime[url] = options[url].errorSleepTime;
                deferreds[url] = null;
                sendRequest(url);
                deferreds[url].success(success);
            }
            listeners[url].push(success);
        };
    },
    poller = null;

try {
    poller = pollerFactory(window, jQuery);
} catch (e) {
}