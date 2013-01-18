var pollerFactory = function (window, jQuery, statusChecker, cursorFetcher) {
        "use strict";
        var defaults = {
            // jQuery.ajax options
                dataType: "json",
                type: "POST",
                global: false,
                timeout: 5 * 60 * 1000,
                data: { 'cursor': null },
            // poller options
                errorSleepTime: 500,
                pollInterval: 1 // miliseconds between consecutive polls
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
                if (response !== (void 0) && 1 === parseInt(response.status, 10)) {
                    return response.messages[response.messages.length - 1].id;
                }
            },

            // placeholder/declaration (implementation/definition put below - JSLint compliance)
            doSendRequest = null,
            
            // sends request according to given timeout
            sendRequest = function (url, timeout) {
                if (timeout !== (void 0) && timeout > 0) {
                    window.setTimeout(
                        function () {
                            doSendRequest(url);
                        },
                        timeout
                    );
                    return;
                }
                doSendRequest(url);
            },

            // called on erroneous response
            onError = function (response, url) {
                // poller was removed
                if (!listeners.hasOwnProperty(url)) {
                    return;
                }
                // when response does not contain "status" field it means that "timeout" occured,
                // so wo don`t increase error sleep time
                if (checkStatus(response) !== 1) {
                    errorSleepTime[url] *= 2;
                }
                sendRequest(url, errorSleepTime[url]);
            },

            // called on succeeded response
            onSuccess = function (response, url) {
                // poller was removed
                if (!listeners.hasOwnProperty(url)) {
                    return;
                }
                // fetch last message ID (cursor)
                options[url].data.cursor = fetchCursor(response);
                errorSleepTime[url] = options[url].errorSleepTime;
                sendRequest(url, options[url].pollInterval);
            };

        // sends request
        doSendRequest = function (url) {
            // poller was removed
            if (!listeners.hasOwnProperty(url)) {
                return;
            }
            // send request
            deferreds[url] = jQuery.ajax(options[url]);
            // append listeners
            for (i = 0; i < listeners[url].length; i = i + 1) {
                deferreds[url].success(listeners[url][i]);
            }
            // append "onError" action
            deferreds[url].error(function (response) {
                onError(response, url);
            });
        };

        return function (url, success, params) {
            // for each new URL define standard structure
            if (!listeners.hasOwnProperty(url)) {
                // merge options
                options[url] = jQuery.extend(true, {}, defaults, params, {url: url});
                // add listeners (at least one - internal listener that updates cursor)
                listeners[url] = [function (response) { onSuccess(response, url); }];
                // set default errorSleepTime
                errorSleepTime[url] = options[url].errorSleepTime;
                // force request send right now (not after timeout)
                // it sets deferreds[url]
                doSendRequest(url);
            }
            // append callback to listeners
            listeners[url].push(success);
            // append callback to current deferred instance
            deferreds[url].success(success);
            // return function that allows to remove poller
            return function () {
                // listeners hav removed already
                if (!listeners.hasOwnProperty(url)) {
                    return;
                }
                // remove listeners
                for (i = 0; i < listeners[url].length; i = i + 1) {
                    if (listeners[url][i] === success) {
                        listeners[url].remove(i);
                    }
                }
                // have more than 1 listeners (there is always one left - default 'onSuccess') - skip
                if (listeners[url].length > 1) {
                    return;
                }
                // no listeners - remove everything
                deferreds[url].abort();
                delete listeners[url];
                delete options[url];
                delete errorSleepTime[url];
                delete deferreds[url];
            };

        };
    },
    poller = null;

if (!Array.prototype.hasOwnProperty('remove')) {
    // Array Remove - By John Resig (MIT Licensed)
    Array.prototype.remove = function (from, to) {
        "use strict";
        var rest = this.slice(parseInt(to || from, 10) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };
}

try {
    poller = pollerFactory(window, jQuery);
} catch (e) {
}
