var pollerFactory = function (window, jQuery) {
        "use strict";
        var defaults = {
            // jQuery.ajax options
                dataType: "json",
                type: "POST",
                global: false,
                timeout: 5 * 60 * 1000,
                data: {},
            // poller options
                errorSleepTime: 500,
                pollInterval: 1 // miliseconds between consecutive polls
            },
            options = {},
            errorSleepTime = {},
            listeners = {},
            deferreds = {},
            i = 0,

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
                // do not increase error sleep time in case of "timeout" occured
                if (response.statusText !== 'timeout') {
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
                errorSleepTime[url] = options[url].errorSleepTime;
                // set data to be passed back in next request
                sendRequest(url, options[url].pollInterval);
            };

        // sends request
        doSendRequest = function (url) {
            // poller was removed
            if (!listeners.hasOwnProperty(url)) {
                return;
            }
            // send request
            deferreds[url] = jQuery.ajax(jQuery.extend(true, options[url], {url: url}));
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
                // set default options
                options[url] = jQuery.extend(true, {}, defaults, params);
                // add listeners (at least one - internal listener that updates data)
                listeners[url] = [function (response) { onSuccess(response, url); }];
                // set default errorSleepTime
                errorSleepTime[url] = options[url].errorSleepTime;
                // force request send right now (not after timeout)
                // it sets deferreds[url]
                doSendRequest(url);
            } else {
                // merge options
                options[url] = jQuery.extend(true, options[url], params);
            }
            // append callback to listeners
            var tmp = function (r) { jQuery.extend(true, options[url].data, success(r)); };
            listeners[url].push(tmp);
            // append callback to current deferred instance
            deferreds[url].success(tmp);
            // return function that allows to remove poller
            return function () {
                // listeners have been removed already
                if (!listeners.hasOwnProperty(url)) {
                    return;
                }
                // remove listeners
                for (i = 0; i < listeners[url].length; i = i + 1) {
                    if (listeners[url][i] === tmp) {
                        listeners[url].remove(i);
                        // force deferred to abort in order to refresh listeners
                        deferreds[url].abort();
                        // remove only one listener of that type
                        break;
                    }
                }
                // have more than 1 listeners (there is always one left - default 'onSuccess') - skip
                if (listeners[url].length > 1) {
                    return;
                }
                // no listeners - remove everything
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
