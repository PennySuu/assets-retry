(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.assetsRetry = factory());
}(this, (function () { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }

    var retryTimesProp = 'retryTimes';
    var succeededProp = 'succeeded';
    var failedProp = 'failed';
    var maxRetryCountProp = 'maxRetryCount';
    var onRetryProp = 'onRetry';
    var onSuccessProp = 'onSuccess';
    var onFailProp = 'onFail';
    var domainProp = 'domain';
    var styleImageNoImportant = 'styleImageNoImportant';
    var innerProxyProp = '_assetsRetryProxy';
    var innerOnloadProp = '_assetsRetryOnload';
    var innerOnerrorProp = '_assetsRetryOnerror';
    var scriptTag = 'script';
    var linkTag = 'link';
    var hookedIdentifier = 'data-assets-retry-hooked';
    var ignoreIdentifier = 'data-assets-retry-ignore';
    var retryIdentifier = 'data-retry-id';
    var win = window;
    var doc = window.document;
    var ElementCtor = win.HTMLElement;
    var ScriptElementCtor = win.HTMLScriptElement;
    var StyleElementCtor = win.HTMLStyleElement;
    var LinkElementCtor = win.HTMLLinkElement;
    var ImageElementCtor = win.HTMLImageElement;

    var identity = function (x) {
        return x;
    };
    var noop = function () {
        /* noop */
    };
    var hasOwn = Object.prototype.hasOwnProperty;
    /**
     * safely calls a function
     *
     * @template T this
     * @template R ReturnType<func>
     * @param {(this: T, ...callbackArgs: any[]) => R} func
     * @param {T} thisArg
     * @param {*} args
     * @returns {R}
     */
    var safeCall = function (func, thisArg, args) {
        // eslint-disable-next-line
        if (typeof func !== 'function') {
            return null;
        }
        return func.call(thisArg, args);
    };
    /**
     * replace a substring with new one
     *
     * @param {string} current current string
     * @param {string} oldStr substring to replace
     * @param {string} newStr new string
     * @returns
     */
    var stringReplace = function (current, oldStr, newStr) {
        var idx = current.indexOf(oldStr);
        if (idx === -1) {
            return current;
        }
        return current.substring(0, idx) + newStr + current.substring(idx + oldStr.length);
    };
    /**
     * remove duplicates from an array of strings
     */
    var unique = function (array) {
        var map = {};
        array.forEach(function (item) {
            map[item] = true;
        });
        return Object.keys(map);
    };
    /**
     * convert a camelCase string to a dash-separated string.
     *
     * @param {string} str
     * @returns
     */
    var toSlug = function (str) {
        return str.replace(/([a-z])([A-Z])/g, function (_, $1, $2) { return $1 + "-" + $2.toLowerCase(); });
    };
    /**
     * transform an array-like object to array
     *
     * @template T
     * @param {ArrayLike<T>} arrayLike
     * @returns {T[]}
     */
    var arrayFrom = function (arrayLike) {
        return [].slice.call(arrayLike);
    };
    /**
     * collect all property names from current object to its ancestor
     *
     * @param {any} obj
     * @returns
     */
    var collectPropertyNames = function (obj) {
        var getProto = Object.getPrototypeOf
            ? Object.getPrototypeOf
            : function (x) {
                return x.__proto__;
            };
        var keys = Object.keys(obj);
        while (getProto(obj)) {
            keys = keys.concat(Object.keys(getProto(obj)));
            obj = getProto(obj);
        }
        return keys.filter(function (key) { return key !== 'constructor'; });
    };
    /**
     * @example
     * isFunctionProperty(HTMLScriptElement.prototype, 'src); // false
     * isFunctionProperty(HTMLScriptElement.prototype, 'getAttribute'); // true
     * @param {any} proto
     * @param {string} key
     * @returns
     */
    var isFunctionProperty = function (proto, key) {
        try {
            return typeof proto[key] === 'function';
        }
        catch (e) {
            // TypeError: Illegal invocation
            // when evaluating properties like
            // HTMLScriptElement.prototype.src
            return false;
        }
    };
    /**
     * on some browsers, calling `document.write` when
     * `document.readyState` is `loading` will clear the whole
     * page, which is not what we wanted.
     *
     * @returns
     */
    var supportDocumentWrite = function () {
        return !/Edge|MSIE|rv:/i.test(navigator.userAgent);
    };
    /**
     * loads a new script element by previous failed script element
     *
     * @param {HTMLScriptElement} $script previous script element
     * @param {string} newSrc new url to try
     */
    var loadNextScript = function ($script, newSrc, onload, isAsync) {
        if (onload === void 0) { onload = noop; }
        if (isAsync === void 0) { isAsync = false; }
        // when dealing with failed script tags in html,
        // use `document.write` to ensure the correctness
        // of loading order
        var isAsyncScript = isAsync || $script.defer || $script.async;
        // only use document.write for non-async scripts,
        // which includes script tag created by document.createElement
        // or with `defer` or `async` attribute
        if (doc.readyState === 'loading' && supportDocumentWrite() && !isAsyncScript) {
            var retryId = randomString();
            var newHtml = $script.outerHTML
                // delete previous retry id
                .replace(/data-retry-id="[^"]+"/, '')
                .replace(/src=(?:"[^"]+"|.+)([ >])/, retryIdentifier + "=" + retryId + " src=\"" + newSrc + "\"$1");
            doc.write(newHtml);
            var newScript = doc.querySelector("script[" + retryIdentifier + "=\"" + retryId + "\"]");
            if (newScript) {
                newScript.onload = onload;
            }
            return;
        }
        var $newScript = doc.createElement(scriptTag);
        // copy script properties except src:
        // type, noModule, charset, async, defer,
        // crossOrigin, text, referrerPolicy, event,
        // htmlFor, integrity (chrome)
        Object.keys(ScriptElementCtor.prototype).forEach(function (key) {
            if (key !== 'src' && $script[key] && typeof $script[key] !== 'object') {
                try {
                    ;
                    $newScript[key] = $script[key];
                }
                catch (_) {
                    /* noop */
                }
            }
        });
        $newScript.src = newSrc;
        $newScript.onload = $script.onload;
        $newScript.onerror = $script.onerror;
        $newScript.setAttribute(retryIdentifier, randomString());
        // webpack nonce for csp
        var originalNonce = $script.getAttribute('nonce');
        if (originalNonce) {
            $newScript.setAttribute('nonce', originalNonce);
        }
        doc.getElementsByTagName('head')[0].appendChild($newScript);
    };
    /**
     * get rules from styleSheet
     *
     * @param {CSSStyleSheet} styleSheet
     * @returns
     */
    var getCssRules = function (styleSheet) {
        try {
            return styleSheet.rules;
        }
        catch (_) {
            try {
                return styleSheet.cssRules;
            }
            catch (_) {
                return null;
            }
        }
    };
    /**
     * test if current browser support CSSRuleList
     *
     * @param {CSSStyleSheet} styleSheet
     * @returns
     */
    var supportRules = function (styleSheet) {
        var rules = getCssRules(styleSheet);
        return !!rules;
    };
    /**
     * loads a new link element by previous failed link element
     *
     * @param {HTMLLinkElement} $link previous link element
     * @param {string} newHref new url to try
     */
    var loadNextLink = function ($link, newHref, onload) {
        var $newLink = doc.createElement(linkTag);
        // copy link properties except href:
        // disabled, href, crossOrigin, rel, relList, media, hreflang,
        // type, as, referrerPolicy, sizes, imageSrcset, imageSizes,
        // charset, rev, target, sheet, integrity, import (chrome)
        Object.keys(LinkElementCtor.prototype).forEach(function (key) {
            if (key !== 'href' && $link[key] && typeof $link[key] !== 'object') {
                try {
                    ;
                    $newLink[key] = $link[key];
                }
                catch (_) {
                    /* noop */
                }
            }
        });
        $newLink.href = newHref;
        $newLink.onload = onload || $link.onload;
        $newLink.onerror = $link.onerror;
        $newLink.setAttribute(retryIdentifier, randomString());
        doc.getElementsByTagName('head')[0].appendChild($newLink);
    };
    var hashTarget = function (element) {
        if (!element) {
            return 'null';
        }
        if (!(element instanceof ElementCtor)) {
            return 'not_supported';
        }
        var nodeName = element.nodeName;
        var src = element.src;
        var href = element.href;
        var dataRetryId = element.getAttribute(retryIdentifier);
        return [nodeName, src, href, dataRetryId].join(';');
    };
    var randomString = function () {
        return Math.random()
            .toString(36)
            .slice(2);
    };
    /**
     * 获取 HTML 标签中包含的 URL 信息
     * @param target
     */
    var getTargetUrl = function (target) {
        if (target instanceof ScriptElementCtor || target instanceof ImageElementCtor) {
            return target.src;
        }
        if (target instanceof LinkElementCtor) {
            return target.href;
        }
        return '';
    };

    /** @description data collector */
    // statistic collector
    var retryCollector = {};

    /**
     * generate the domain map from user
     * @example
     * generateDomainMap(['a.cdn', 'b.cdn', 'c.cdn']) // {'a.cdn': 'b.cdn', 'b.cdn': 'c.cdn', 'c.cdn': 'a.cdn'}
     *
     * @param {Domain} domains
     * @returns {DomainMap}
     */
    var prepareDomainMap = function (domains) {
        // array
        if (Array.isArray(domains)) {
            return domains.reduce(function (domainMap, domain, idx, array) {
                domainMap[domain] = array[(idx + 1) % array.length];
                return domainMap;
            }, {});
        }
        // object
        return domains;
    };
    /**
     * get path from src
     * @example
     * getUrlPath('https://a.cdn/js/1.js', 'a.cdn'); // '/js/1.js'
     * getUrlPath('https://a.cdn/namespace/js/1.js', 'a.cdn/namespace'); // '/js/1.js'
     * @param {string} src script src
     * @param {string} currentDomain domain name
     * @returns {string}
     */
    var getUrlPath = function (src, currentDomain) {
        return src.substr(src.indexOf(currentDomain) + currentDomain.length, src.length);
    };
    /**
     * find out the domain of current loading script
     *
     * @param {string} src
     * @param {{ [x: string]: string }} domainMap
     * @returns
     */
    var getCurrentDomain = function (src, domainMap) {
        return (Object.keys(domainMap)
            .filter(function (domain) {
            return src.indexOf(domain) > -1;
        })
            // sort by length (relevance)
            .sort(function (prev, next) { return next.length - prev.length; })[0]);
    };
    /**
     * extract domain from url, and get the
     * corresponding statistic collector
     * @param {string} url
     * @returns
     */
    var extractInfoFromUrl = function (url, domainMap) {
        var _a;
        var _b = splitUrl(url, domainMap), srcPath = _b[0], currentDomain = _b[1];
        if (!srcPath) {
            return [];
        }
        retryCollector[srcPath] = retryCollector[srcPath] || (_a = {},
            _a[retryTimesProp] = 0,
            _a[failedProp] = [],
            _a[succeededProp] = [],
            _a);
        return [currentDomain, retryCollector[srcPath]];
    };
    var splitUrl = function (url, domainMap) {
        var currentDomain = getCurrentDomain(url, domainMap);
        if (!currentDomain) {
            return ['', ''];
        }
        var srcPath = getUrlPath(url, currentDomain);
        return [srcPath, currentDomain];
    };

    // cache all properties of HTMLScriptElement.prototype
    // (including prototype properties) because it's big (length > 200)
    // otherwise it would be calculated every time when
    // a script request failed.
    var scriptAndLinkProperties;
    try {
        scriptAndLinkProperties = unique(__spreadArrays(collectPropertyNames(ScriptElementCtor.prototype), collectPropertyNames(LinkElementCtor.prototype)));
    }
    catch (_) {
        /* noop */
    }
    /**
     * create the descriptor of hooked element object,
     * accessing any property on the hooked element object
     * will be delegated to the real HTMLElement
     * except onload/onerror events
     *
     * @param {any} self hookedScript
     * @param {object} opts
     * @returns
     */
    var getHookedElementDescriptors = function (self, opts) {
        var maxRetryCount = opts[maxRetryCountProp];
        var domainMap = prepareDomainMap(opts[domainProp]);
        var onRetry = opts[onRetryProp];
        return scriptAndLinkProperties.reduce(function (descriptor, key) {
            var isFn = isFunctionProperty(ScriptElementCtor.prototype, key);
            // for function properties,
            // do not assign getters/setters
            if (isFn) {
                descriptor[key] = {
                    value: function () {
                        return self[innerProxyProp][key].apply(self[innerProxyProp], arguments);
                    }
                };
            }
            else {
                descriptor[key] = {
                    set: function (newVal) {
                        var realElement = self[innerProxyProp];
                        if (key === 'onerror') {
                            self[innerOnerrorProp] = newVal;
                            // hook error events,
                            // forward the original onerror handler
                            // to the next script element to load
                            realElement.onerror = function (event) {
                                if (typeof event === 'string')
                                    return;
                                event.stopPropagation && event.stopPropagation();
                                var callOriginalOnError = function () {
                                    return safeCall(self[innerOnerrorProp], realElement, event);
                                };
                                var url = getTargetUrl(realElement);
                                var _a = extractInfoFromUrl(url, domainMap), currentDomain = _a[0], currentCollector = _a[1];
                                var shouldIgnore = realElement.hasAttribute(ignoreIdentifier);
                                if (!currentDomain || !currentCollector || shouldIgnore) {
                                    return callOriginalOnError();
                                }
                                var newSrc = stringReplace(url, currentDomain, domainMap[currentDomain]);
                                var userModifiedSrc = onRetry(newSrc, url, currentCollector);
                                // if onRetry returns null, do not retry this url
                                if (userModifiedSrc === null) {
                                    return callOriginalOnError();
                                }
                                // eslint-disable-next-line
                                if (typeof userModifiedSrc !== 'string') {
                                    throw new Error('a string should be returned in `onRetry` function');
                                }
                                if (currentCollector[retryTimesProp] <= maxRetryCount) {
                                    if (realElement instanceof ScriptElementCtor) {
                                        loadNextScript(realElement, userModifiedSrc, noop, true);
                                    }
                                    else if (realElement instanceof LinkElementCtor) {
                                        loadNextLink(realElement, userModifiedSrc);
                                    }
                                }
                                else {
                                    callOriginalOnError();
                                }
                            };
                            return;
                        }
                        if (key === 'onload') {
                            self[innerOnloadProp] = newVal;
                            self[innerProxyProp].onload = function (event) {
                                if (newVal && !newVal._called) {
                                    newVal._called = true;
                                    newVal.call(self[innerProxyProp], event);
                                }
                            };
                            return;
                        }
                        realElement[key] = newVal;
                    },
                    get: function () {
                        return self[innerProxyProp][key];
                    }
                };
            }
            return descriptor;
        }, {});
    };
    var createHookedElement = function ($element, opts) {
        var _a;
        $element.setAttribute(hookedIdentifier, 'true');
        var $hookedElement = (_a = {},
            _a[innerProxyProp] = $element,
            _a[innerOnerrorProp] = noop,
            _a);
        var descriptors = getHookedElementDescriptors($hookedElement, opts);
        Object.defineProperties($hookedElement, descriptors);
        $hookedElement.onload = noop;
        $hookedElement.onerror = noop;
        return $hookedElement;
    };
    /**
     * hook `document.createElement`
     * @param {InnerAssetsRetryOptions} opts
     */
    var hookCreateElement = function (opts) {
        var originalCreateElement = doc.createElement;
        doc.createElement = function (name, options) {
            if (name === scriptTag || name === linkTag) {
                return createHookedElement(originalCreateElement.call(doc, name), opts);
            }
            return originalCreateElement.call(doc, name, options);
        };
    };
    /**
     * create a hooked function which hooks every method of target.
     * if a method is hooked and its arguments contains the inner script tag
     * it will be replaced with the value of inner script tag
     *
     * @param {any} target hook target
     */
    var hookPrototype = function (target) {
        var functionKeys = Object.keys(target).filter(function (key) { return isFunctionProperty(target, key); });
        functionKeys.forEach(function (key) {
            var originalFunc = target[key];
            target[key] = function () {
                var args = [].slice.call(arguments).map(function (item) {
                    if (!item)
                        return item;
                    return hasOwn.call(item, innerProxyProp) ? item[innerProxyProp] : item;
                });
                return originalFunc.apply(this, args);
            };
        });
    };
    /**
     * init asynchronous retrying of script tags
     * @param {InnerAssetsRetryOptions} opts
     * @returns
     */
    function initAsync(opts) {
        hookCreateElement(opts);
        // eslint-disable-next-line
        if (typeof Node !== 'undefined') {
            hookPrototype(Node.prototype);
        }
        // eslint-disable-next-line
        if (typeof Element !== 'undefined') {
            hookPrototype(Element.prototype);
        }
        return retryCollector;
    }

    var retryCache = {};
    /**
     * init synchronous retrying of assets,
     * this includes the retrying of
     * script, link and img tags
     *
     * @export
     * @param {InnerAssetsRetryOptions} opts
     */
    function initSync(opts) {
        var onRetry = opts[onRetryProp];
        var onSuccess = opts[onSuccessProp];
        var onFail = opts[onFailProp];
        var domainMap = opts[domainProp];
        /**
         * capture error on window
         * when js / css / image failed to load
         * reload the target with new domain
         *
         * @param {ErrorEvent} event
         * @returns
         */
        var errorHandler = function (event) {
            if (!event) {
                return;
            }
            var target = event.target || event.srcElement;
            var originalUrl = getTargetUrl(target);
            if (!originalUrl) {
                // not one of script / link / image element
                return;
            }
            var _a = extractInfoFromUrl(originalUrl, domainMap), currentDomain = _a[0], currentCollector = _a[1];
            var hasIgnoreIdentifier = target instanceof HTMLElement && target.hasAttribute(ignoreIdentifier);
            if (!currentCollector || !currentDomain || hasIgnoreIdentifier) {
                return;
            }
            currentCollector[retryTimesProp]++;
            currentCollector[failedProp].push(originalUrl);
            var isFinalRetry = currentCollector[retryTimesProp] > opts[maxRetryCountProp];
            if (isFinalRetry) {
                var srcPath = splitUrl(originalUrl, domainMap)[0];
                onFail(srcPath);
            }
            if (!domainMap[currentDomain] || isFinalRetry) {
                // can not find a domain to switch
                // or failed too many times
                return;
            }
            var newDomain = domainMap[currentDomain];
            var newUrl = stringReplace(originalUrl, currentDomain, newDomain);
            var userModifiedUrl = onRetry(newUrl, originalUrl, currentCollector);
            // if onRetry returns null, do not retry this url
            if (userModifiedUrl === null) {
                return;
            }
            // eslint-disable-next-line
            if (typeof userModifiedUrl !== 'string') {
                throw new Error('a string should be returned in `onRetry` function');
            }
            if (target instanceof ImageElementCtor && target.src) {
                target.setAttribute(retryIdentifier, randomString());
                target.src = userModifiedUrl;
                return;
            }
            // cache retried elements
            var elementId = hashTarget(target);
            if (retryCache[elementId]) {
                return;
            }
            retryCache[elementId] = true;
            if (target instanceof ScriptElementCtor &&
                !target.getAttribute(hookedIdentifier) &&
                target.src) {
                loadNextScript(target, userModifiedUrl);
                return;
            }
            if (target instanceof LinkElementCtor &&
                !target.getAttribute(hookedIdentifier) &&
                target.href) {
                loadNextLink(target, userModifiedUrl);
                return;
            }
        };
        /**
         * test is link element loaded in load event
         *
         * @param {Event} event
         */
        var loadHandler = function (event) {
            if (!event) {
                return;
            }
            var target = event.target || event.srcElement;
            var originalUrl = getTargetUrl(target);
            if (!originalUrl) {
                // not one of script / link / image element
                return;
            }
            var _a = extractInfoFromUrl(originalUrl, domainMap), _ = _a[0], currentCollector = _a[1];
            var srcPath = splitUrl(originalUrl, domainMap)[0];
            var callOnSuccess = function () {
                if (currentCollector) {
                    currentCollector[succeededProp].push(originalUrl);
                }
                onSuccess(srcPath);
            };
            // script / img tags succeeded to load without retry, add to collector
            if (!(target instanceof LinkElementCtor)) {
                callOnSuccess();
                return;
            }
            var supportStyleSheets = doc.styleSheets;
            // do not support styleSheets API
            if (!supportStyleSheets) {
                return;
            }
            var styleSheets = arrayFrom(doc.styleSheets);
            var targetStyleSheet = styleSheets.filter(function (styleSheet) {
                return styleSheet.href === target.href;
            })[0];
            var rules = getCssRules(targetStyleSheet);
            if (rules === null) {
                return;
            }
            // if the loaded stylesheet does not have rules, treat as failed
            if (rules.length === 0) {
                errorHandler(event);
                return;
            }
            callOnSuccess();
        };
        doc.addEventListener('error', errorHandler, true);
        doc.addEventListener('load', loadHandler, true);
    }

    // cache for <link rel="stylesheet" />
    var handledStylesheets = {};
    // cache for <style />
    var handledStyleTags = [];
    var processRules = function (name, rule, styleSheet, styleRules, opts) {
        var _a;
        var domainMap = opts[domainProp];
        var onRetry = opts[onRetryProp];
        var targetRule = rule.style && rule.style[name];
        if (!targetRule) {
            return;
        }
        // skip data-uri
        if (/^url\(["']?data:/.test(targetRule)) {
            return;
        }
        var _b = targetRule.match(/^url\(["']?(.+?)["']?\)/) || [], _ = _b[0], originalUrl = _b[1];
        if (!originalUrl) {
            return;
        }
        var currentDomain = getCurrentDomain(originalUrl, domainMap);
        if (!currentDomain) {
            return;
        }
        var domain = currentDomain;
        var urlMap = (_a = {}, _a[domain] = true, _a);
        while (domain && domainMap[domain]) {
            var newDomain = domainMap[domain];
            if (urlMap[newDomain]) {
                break;
            }
            urlMap[newDomain] = true;
            domain = newDomain;
        }
        var urlList = Object.keys(urlMap)
            .map(function (domain) {
            var newUrl = stringReplace(originalUrl, currentDomain, domain);
            var userModifiedUrl = onRetry(newUrl, originalUrl, null);
            return userModifiedUrl ? "url(\"" + userModifiedUrl + "\")" : null;
        })
            .filter(Boolean)
            .join(',');
        var cssText = rule.selectorText + ("{ " + toSlug(name) + ": " + urlList + " " + (opts.styleImageNoImportant ? '' : '!important') + "; }");
        try {
            styleSheet.insertRule(cssText, styleRules.length);
        }
        catch (_) {
            styleSheet.insertRule(cssText, 0);
        }
    };
    var processStyleSheets = function (styleSheets, opts) {
        var urlProperties = ['backgroundImage', 'borderImage', 'listStyleImage'];
        styleSheets.forEach(function (styleSheet) {
            var rules = getCssRules(styleSheet);
            if (rules === null) {
                return;
            }
            var rulesLength = rules.length;
            var _loop_1 = function (i) {
                var rule = rules[i];
                urlProperties.forEach(function (cssProperty) {
                    processRules(cssProperty, rule, styleSheet, rules, opts);
                });
            };
            for (var i = 0; i < rulesLength; i++) {
                _loop_1(i);
            }
            if (styleSheet.href) {
                handledStylesheets[styleSheet.href] = true;
            }
            if (styleSheet.ownerNode instanceof StyleElementCtor) {
                handledStyleTags.push(styleSheet.ownerNode);
            }
        });
    };
    var getStyleSheetsToBeHandled = function (styleSheets, domainMap) {
        var sheetsArray = arrayFrom(styleSheets);
        return sheetsArray.filter(function (styleSheet) {
            if (!supportRules(styleSheet)) {
                return false;
            }
            // <style /> tags
            if (!styleSheet.href) {
                var ownerNode = styleSheet.ownerNode;
                if (ownerNode instanceof StyleElementCtor && handledStyleTags.indexOf(ownerNode) > -1) {
                    return false;
                }
                return true;
            }
            if (handledStylesheets[styleSheet.href]) {
                return false;
            }
            var currentDomain = getCurrentDomain(styleSheet.href, domainMap);
            return !!currentDomain;
        });
    };
    function initCss(opts) {
        // detect is support styleSheets
        var supportStyleSheets = doc.styleSheets;
        var domainMap = opts[domainProp];
        if (!supportStyleSheets)
            return false;
        setInterval(function () {
            var newStyleSheets = getStyleSheetsToBeHandled(doc.styleSheets, domainMap);
            if (newStyleSheets.length > 0) {
                processStyleSheets(newStyleSheets, opts);
            }
        }, 250);
    }

    function init(opts) {
        var _a;
        if (opts === void 0) { opts = {}; }
        try {
            // eslint-disable-next-line
            if (typeof opts[domainProp] !== 'object') {
                throw new Error('opts.domain cannot be non-object.');
            }
            var optionList_1 = [maxRetryCountProp, onRetryProp, onSuccessProp, onFailProp, domainProp, styleImageNoImportant];
            var invalidOptions = Object.keys(opts).filter(function (key) { return optionList_1.indexOf(key) === -1; });
            if (invalidOptions.length > 0) {
                throw new Error('option name: ' + invalidOptions.join(', ') + ' is not valid.');
            }
            var innerOpts = (_a = {},
                _a[maxRetryCountProp] = opts[maxRetryCountProp] || 3,
                _a[onRetryProp] = opts[onRetryProp] || identity,
                _a[onSuccessProp] = opts[onSuccessProp] || noop,
                _a[onFailProp] = opts[onFailProp] || noop,
                _a[domainProp] = prepareDomainMap(opts[domainProp]),
                _a[styleImageNoImportant] = opts[styleImageNoImportant] || false,
                _a);
            initAsync(innerOpts);
            initSync(innerOpts);
            // if (undefined) {
            //     initCss(innerOpts)
            // }
            initCss(innerOpts);
            return retryCollector;
        }
        catch (e) {
            win.console && console.error('[assetsRetry] error captured', e);
        }
    }

    return init;

})));
//# sourceMappingURL=assets-retry.umd.js.map
