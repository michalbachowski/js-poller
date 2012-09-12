var pollerFactory = function (window, jQuery, statusChecker, cursorFetcher) {
        "use strict";
        var defaults = {
                timeout: 1,      // minutes
                pollInterval: 1, // seconds between consecutive polls
                data: { 'cursor': null },
                errorSleepTime: 500
            },
            options = {},
            errorSleepTime = {},
            listeners = {},
            deferreds = {},
            i = 0,

            // checks status for response
            checkStatus = statusChecker || function (response) {
                try {
                    return parseInt(response.status, 10);
                } catch (e) {
                }
                return 0;
            },

            // fetches last message ID (cursor)
            fetchCursor = cursorFetcher || function (response) {
                if (typeof response !== "undefined" && 1 === parseInt(response.status, 10)) {
                    return response.messages[response.messages.length - 1].id;
                }
            },

            // placeholder/declaration (implementation/definition put below - JSLint compliance)
            doSendRequest = null,
            
            // sends request according to given timeout
            sendRequest = function (url, timeout) {
                if (typeof timeout !== 'undefined' && timeout > 0) {
                    window.setTimeout(
                        function () {
                            doSendRequest(url);
                        },
                        timeout
                    );
                    return;
                }
                sendRequest(url);
            },

            // called on erroneous response
            onError = function (response, url) {
                // when response does not contain "status" field it means that "timeout" occured,
                // so wo don`t increase error sleep time
                if (checkStatus(response) !== 1) {
                    errorSleepTime[url] *= 2;

                }
                sendRequest(url, errorSleepTime[url]);
            },

            onSuccess = function (response, url) {
                // fetch last message ID (cursor)
                options[url].data.cursor = fetchCursor(response);
                errorSleepTime[url] = options[url].errorSleepTime;
                sendRequest(url, options[url].pollInterval);
            };

        doSendRequest = function (url) {
            deferreds[url] = jQuery.ajax({
                url: url,
                data: options[url].data,
                dataType: "jsonp",
                type: "POST",
                timeout: options[url].timeout * 60 * 1000,
                global: false
            });
            for (i = 0; i < listeners[url].length; i = i + 1) {
                deferreds[url].success(listeners[url][i]);
            }
            deferreds[url].error(function (response, url) {
                onError(response, url);
            });
        };


        return function (url, success, params) {
            if (!listeners.hasOwnProperty(url)) {
                options[url] = jQuery.extend(defaults, params);
                listeners[url] = [function (response) { onSuccess(response, url); }];
                errorSleepTime[url] = options[url].errorSleepTime;
                doSendRequest(url);
            }
            listeners[url].push(success);
            deferreds[url].success(success);
        };
    },
    poller = null;

try {
    poller = pollerFactory(window, jQuery);
} catch (e) {
}
