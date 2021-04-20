/*
 *  Define functions or the constant variables for this extension.
 *  Copyright (C) 2021 Yoshinori Kawagita.
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

"use strict";

const BROWSER_PROMISE_RETURNED =
  (self.chrome != undefined && self.browser != undefined);
if (! BROWSER_PROMISE_RETURNED) {
  if (self.browser == undefined) {
    self.browser = self.chrome;
  }
}

/*
 * Returns the promise by the specified function under browser namespace.
 */
function callAsynchronousAPI(browserFunc, ...args) {
  if (BROWSER_PROMISE_RETURNED) {
    return browserFunc.apply(null, args);
  }
  return new Promise((resolve) => {
      args.push(resolve);
      browserFunc.apply(null, args);
    });
}

const URL_ABOUT_BLANK = "about:blank";

const URL_HTTPS_SCHEME = "https://";
const URL_DEFAULT_HOST_SERVER = "www";

const URL_PATTERN_NO_HOST_SERVER = "";
const URL_PATTERN_ANY_HOST_SERVER = "*";
const URL_PATTERN_ANY_PATH = "/*";

/*
 * Functions and constant variables to select and exclude news topics.
 */
const ExtractNews = (() => {
    const _ExtractNews = {
        // Languages of news site
        SITE_ENGLISH: "English",
        SITE_JAPANESE: "Japanese",

        SITE_LABEL_REGULAR_EXPRESSION:
          "[0-9A-Za-z](?:[-0-9A-Za-z]*[0-9A-Za-z])?",

        // Key to read and write the flag whether the site is enabled
        SITE_ENABLED_KEY: "Enabled",

        // Filtering ID for all categories
        FILTERING_FOR_ALL: "All",

        // Names and word matchings of filtering target
        TARGET_ACCEPT: "ACCEPT",
        TARGET_DROP: "DROP",
        TARGET_RETURN: "RETURN",
        TARGET_WORD_BEGINNING: "Beginning",
        TARGET_WORD_END: "End",
        TARGET_WORD_NEGATIVE: "Negative",

        // Commands sent by sendMessage() of browser.tabs or browser.runtime
        COMMAND_SETTING_REQUEST: "request",
        COMMAND_SETTING_APPLY: "apply",
        COMMAND_SETTING_SWITCH: "switch",
        COMMAND_SETTING_SELECT: "select",
        COMMAND_SETTING_DISPOSE: "dispose",
        COMMAND_SETTING_UPDATE: "update",
        COMMAND_SETTING_INFORM: "inform",
        COMMAND_DIALOG_ALERT: "alert",
        COMMAND_DIALOG_STANDBY: "standby",
        COMMAND_DIALOG_OPEN: "open",
        COMMAND_DIALOG_CLOSE: "close"
      };

    // Storage area to store the settings of this extension
    const STORAGE_AREA = browser.storage.local;

    /*
     * Reads the storage area by the specified key and returns the promise
     * fulfilled with its value.
     */
    function readStorage(key) {
      if (BROWSER_PROMISE_RETURNED) {
        return STORAGE_AREA.get(key);
      }
      return new Promise((resolve) => {
          STORAGE_AREA.get(key, resolve);
        });
    }

    /*
     * Writes the storage area by the specified object which consists of pairs
     * of a key and value and returns the promise.
     */
    function writeStorage(items) {
      if (BROWSER_PROMISE_RETURNED) {
        return STORAGE_AREA.set(items);
      }
      return new Promise((resolve) => {
          STORAGE_AREA.set(items, resolve);
        });
    }

    /*
     * Reads the storage area by the specified key and returns the promise
     * fulfilled with its value.
     */
    function removeStorage(key) {
      if (BROWSER_PROMISE_RETURNED) {
        return STORAGE_AREA.remove(key);
      }
      return new Promise((resolve) => {
          STORAGE_AREA.remove(key, resolve);
        });
    }

    _ExtractNews.readStorage = readStorage;
    _ExtractNews.writeStorage = writeStorage;
    _ExtractNews.removeStorage = removeStorage;

    /*
     * Returns the string localized for the specified ID prefixed with
     * "extractNews" on this extension.
     */
    function getLocalizedString(id, substitutions) {
      return browser.i18n.getMessage("extractNews" + id, substitutions);
    }

    /*
     * Returns the array of strings separated by commas after localizing for
     * the specified ID prefixed with "extractNews" on this extension.
     */
    function splitLocalizedString(id) {
      return getLocalizedString(id).split(",");
    }

    /*
     * Returns RegExp object created after localizing for the specified ID
     * prefixed with "extractNews" and suffixed with "RegularExpression" on
     * this extension.
     */
    function getLocalizedRegExp(id) {
      var regexpString = getLocalizedString(id + "RegularExpression");
      if (regexpString != "") {
        return new RegExp(regexpString);
      }
      return new RegExp("^$");
    }

    _ExtractNews.getLocalizedString = getLocalizedString;
    _ExtractNews.splitLocalizedString = splitLocalizedString;
    _ExtractNews.getLocalizedRegExp = getLocalizedRegExp;


    function _checkSiteId(siteId) {
      if (siteId == undefined) {
        throw newNullPointerException("siteId");
      } else if ((typeof siteId) != "string") {
        throw newIllegalArgumentException("siteId");
      }
    }

    /*
     * The information of a news site.
     */
    class NewsSite {
      constructor(siteId, siteLanguage,
        hostServerPatterns, domain, rootDirectoryPath) {
        _checkSiteId(siteId);
        if ((typeof siteLanguage) != "string") {
          throw newIllegalArgumentException("siteLanguage");
        } else if (! Array.isArray(hostServerPatterns)) {
          throw newIllegalArgumentException("hostServerPatterns");
        }
        this.siteId = siteId;
        if (siteLanguage == _ExtractNews.SITE_JAPANESE) {
          this.siteLanguage = siteLanguage;
        } else {
          this.siteLanguage = _ExtractNews.SITE_ENGLISH;
        }
        var hostPathRegexpString = "^";
        if (hostServerPatterns.length <= 1) {
          if (hostServerPatterns[0] != URL_PATTERN_ANY_HOST_SERVER) {
            hostPathRegexpString += hostServerPatterns[0];
          } else {
            hostPathRegexpString +=
              _ExtractNews.SITE_LABEL_REGULAR_EXPRESSION;
          }
          hostPathRegexpString += "\\.";
        } else if (hostServerPatterns[0] != URL_PATTERN_NO_HOST_SERVER) {
          hostPathRegexpString += "(?:";
          for (let i = 0; i < hostServerPatterns.length; i++) {
            if (i > 0) {
              hostPathRegexpString += "|";
            }
            hostPathRegexpString += hostServerPatterns[i];
          }
          hostPathRegexpString += ")\\.";
        } else {
          hostPathRegexpString +=
            "(?:|" + _ExtractNews.SITE_LABEL_REGULAR_EXPRESSION + "\\.)";
        }
        hostPathRegexpString +=
          (domain + rootDirectoryPath).replaceAll(".", "\\.") + "(?:/|$)";
        this.siteUrl = {
            hostPathRegexp: new RegExp(hostPathRegexpString),
            hostServerPatterns: hostServerPatterns,
            domain: domain,
            rootDirectoryPath: rootDirectoryPath
          };
      }

      get id() {
        return this.siteId;
      }

      get language() {
        return this.siteLanguage;
      }

      get url() {
        var url = URL_HTTPS_SCHEME;
        var hostServer = this.hostServer;
        if (hostServer != "") {
          url += hostServer + ".";
        }
        url += this.domain;
        var rootDirectoryPath = this.rootDirectoryPath;
        if (rootDirectoryPath != "") {
          url += rootDirectoryPath + "/";
        }
        return url;
      }

      get hostServerPatterns() {
        return this.siteUrl.hostServerPatterns;
      }

      get hostServer() {
        if (this.hostServerPatterns.length <= 1) {
          if (this.hostServerPatterns[0] != URL_PATTERN_ANY_HOST_SERVER) {
            return this.hostServerPatterns[0];
          }
        } else if (this.hostServerPatterns[0] == URL_PATTERN_NO_HOST_SERVER) {
          return "";
        }
        return URL_DEFAULT_HOST_SERVER;
      }

      get domain() {
        return this.siteUrl.domain;
      }

      get rootDirectoryPath() {
        return this.siteUrl.rootDirectoryPath;
      }

      containsUrl(url) {
        if (url != undefined) {
          if ((typeof url) != "string") {
            throw newIllegalArgumentException("url");
          } else if (url.startsWith(URL_HTTPS_SCHEME)) {
            var hostPath = url.substring(URL_HTTPS_SCHEME.length);
            return this.siteUrl.hostPathRegexp.test(hostPath);
          }
        }
        return false;
      }
    }

    // IDs of news sites enabled in this locale
    var _enabledNewsSiteIdSet = new Set();

    // Map of news sites used in this locale
    const NEWS_SITE_MAP = new Map();

    const COMMENT_SITE_ID_SET = new Set();
    const HOST_FAVICON_SITE_ID_SET = new Set();

    // Sets the information of news sites used for each language.

    splitLocalizedString("SiteLanguages").forEach((siteLanguage) => {
        splitLocalizedString(siteLanguage + "SiteIds").forEach((siteId) => {
            var newsSite =
              new NewsSite(siteId, siteLanguage,
                splitLocalizedString(siteId + "UrlHostServerPatterns"),
                getLocalizedString(siteId + "UrlDomain"),
                getLocalizedString(siteId + "UrlRootDirectoryPath"));
            NEWS_SITE_MAP.set(siteId, newsSite);
          });
        var commentSiteIds =
          splitLocalizedString(siteLanguage + "CommentSiteIds");
        commentSiteIds.forEach((siteID) => {
            COMMENT_SITE_ID_SET.add(siteID);
          });
        var hostFaviconSiteIds =
          splitLocalizedString(siteLanguage + "HostFaviconSiteIds");
        hostFaviconSiteIds.forEach((siteID) => {
            HOST_FAVICON_SITE_ID_SET.add(siteID);
          });
      });

    /*
     * Returns the array of news sites used in this locale.
     */
    function getNewsSites() {
      var newsSites = new Array();
      for (const newsSite of NEWS_SITE_MAP.values()) {
        newsSites.push(newsSite);
      }
      return newsSites;
    }

    /*
     * Returns the news site which contains the specified URL if used in
     * this locale, otherwise, undefined.
     */
    function getNewsSite(url) {
      if (url != undefined) {
        if ((typeof url) != "string") {
          throw newIllegalArgumentException("url");
        } else {
          for (const newsSite of NEWS_SITE_MAP.values()) {
            if (newsSite.containsUrl(url)) {
              return newsSite;
            }
          }
        }
      }
      return undefined;
    }

    /*
     * Reads the enabled news site for the specified URL from the local storage
     * and returns the promise fulfilled with it if exists.
     */
    function readEnabledNewsSite(url) {
      var readingPromise = Promise.resolve();
      var newsSite = getNewsSite(url);
      if (newsSite != undefined) {
        readingPromise = Promise.resolve(newsSite.id);
      }
      return readingPromise.then((newsSiteId) => {
          if (newsSiteId != undefined) {
            var siteEnabledKey = newsSiteId + _ExtractNews.SITE_ENABLED_KEY;
            return ExtractNews.readStorage(siteEnabledKey).then((items) => {
                var siteEnabled = items[siteEnabledKey];
                if (siteEnabled | siteEnabled == undefined) {
                  return Promise.resolve(newsSite);
                }
                return Promise.resolve();
              });
          }
          return Promise.resolve();
        });
    }

    _ExtractNews.NewsSite = NewsSite;
    _ExtractNews.getNewsSites = getNewsSites;
    _ExtractNews.getNewsSite = getNewsSite;
    _ExtractNews.readEnabledNewsSite = readEnabledNewsSite;

    /*
     * Returns true if the news site of the specified ID is enabled.
     */
    function isNewsSiteEnabled(siteId) {
      _checkSiteId(siteId);
      return _enabledNewsSiteIdSet.has(siteId);
    }

    /*
     * Sets the specified flag to enable or disable the news site
     * of the specified ID.
     */
    function setNewsSiteEnabled(siteId, siteEnabled) {
      _checkSiteId(siteId);
      if (siteEnabled) {
        _enabledNewsSiteIdSet.add(siteId);
      } else if (_enabledNewsSiteIdSet.has(siteId)) {
        _enabledNewsSiteIdSet.delete(siteId);
      }
    }

    /*
     * Returns the favicon ID for the news site of the specified ID if exists,
     * otherwise, undefined.
     */
    function getNewsSiteFaviconId(siteId, siteUrl) {
      _checkSiteId(siteId);
      var newsSite = NEWS_SITE_MAP.get(siteId);
      if (newsSite != undefined) {
        if (! HOST_FAVICON_SITE_ID_SET.has(siteId)) {
          return siteId;
        } else if (siteUrl == undefined) {
          throw newNullPointerException("siteUrl");
        } else if ((typeof siteUrl) != "string") {
          throw newIllegalArgumentException("siteUrl");
        } else if (siteUrl.startsWith(URL_HTTPS_SCHEME)) {
          var siteDomainIndex = siteUrl.indexOf(newsSite.domain);
          if (siteDomainIndex > URL_HTTPS_SCHEME.length + 1) {
            var siteFaviconId = siteId;
            var siteHostServer =
              siteUrl.substring(URL_HTTPS_SCHEME.length, siteDomainIndex - 1);
            if (siteHostServer != URL_DEFAULT_HOST_SERVER) {
              siteFaviconId +=
                siteHostServer.substring(0, 1).toUpperCase()
                + siteHostServer.substring(1).replaceAll("-", "");
            }
            return siteFaviconId;
          }
        }
      }
      return undefined;
    }

    _ExtractNews.isNewsSiteEnabled = isNewsSiteEnabled;
    _ExtractNews.setNewsSiteEnabled = setNewsSiteEnabled;
    _ExtractNews.getNewsSiteFaviconId = getNewsSiteFaviconId;

    /*
     * Sets enabled news sites for IDs in the specified array.
     */
    function setEnabledNewsSites(enabledSiteIds) {
      if (enabledSiteIds == undefined) {
        throw newNullPointerException("enabledSiteIds");
      } else if (! Array.isArray(enabledSiteIds)) {
        throw newIllegalArgumentException("enabledSiteIds");
      }
      enabledSiteIds.forEach((enabledSiteId) => {
          setNewsSiteEnabled(enabledSiteId, true);
        });
    }

    function _getUrlPattern(hostServerPattern, domain) {
      var hostServer = "";
      if (hostServerPattern != URL_PATTERN_NO_HOST_SERVER) {
        hostServer = hostServerPattern + ".";
      }
      return URL_HTTPS_SCHEME + hostServer + domain + URL_PATTERN_ANY_PATH;
    }

    /*
     * Returns the array of URL patterns whose news sites are enabled.
     */
    function getEnabledNewsSiteUrlPatterns() {
      var enabledSiteUrlPatterns = new Array();
      _enabledNewsSiteIdSet.forEach((siteId) => {
          var newsSite = NEWS_SITE_MAP.get(siteId);
          newsSite.hostServerPatterns.forEach((hostServerPattern) => {
              enabledSiteUrlPatterns.push(
                _getUrlPattern(hostServerPattern, newsSite.domain));
            });
        });
      return enabledSiteUrlPatterns;
    }

    /*
     * Returns the array of URL patterns whose news sites are enabled
     * and commented.
     */
    function getEnabledCommentSiteUrlPatterns() {
      var enabledCommentSiteUrlPatterns = new Array();
      _enabledNewsSiteIdSet.forEach((siteId) => {
          if (COMMENT_SITE_ID_SET.has(siteId)) {
            var newsSite = NEWS_SITE_MAP.get(siteId);
            newsSite.hostServerPatterns.forEach((hostServerPattern) => {
                enabledCommentSiteUrlPatterns.push(
                  _getUrlPattern(hostServerPattern, newsSite.domain));
              });
          }
        });
      return enabledCommentSiteUrlPatterns;
    }

    _ExtractNews.setEnabledNewsSites = setEnabledNewsSites;
    _ExtractNews.getEnabledNewsSiteUrlPatterns = getEnabledNewsSiteUrlPatterns;
    _ExtractNews.getEnabledCommentSiteUrlPatterns =
      getEnabledCommentSiteUrlPatterns;


    // Target names to accept or drop a news topic or sender by the filtering
    const TARGET_NAME_SET = new Set([
        _ExtractNews.TARGET_ACCEPT,
        _ExtractNews.TARGET_DROP,
        _ExtractNews.TARGET_RETURN
      ]);

    /*
     * Returns true if the specified string is a filtering target name.
     */
    function isFilteringTargetName(targetName) {
      return ExtractNews.TARGET_NAME_SET.has(targetName.toUpperCase());
    }

    _ExtractNews.TARGET_NAME_SET = TARGET_NAME_SET;
    _ExtractNews.isFilteringTargetName = isFilteringTargetName;

    function _checkTargetName(targetName) {
      if (targetName == undefined) {
        throw newNullPointerException("targetName");
      } else if ((typeof targetName) != "string") {
        throw newIllegalArgumentException("targetName");
      } else if (! TARGET_NAME_SET.has(targetName)) {
        throw newInvalidParameterException(targetName);
      }
    }

    const END_OF_BLOCK_TARGET_WORDS = new Array();

    /*
     * The filtering target to accept or drop news topics or senders.
     */
    class FilteringTarget {
      constructor(target) {
        if (target == undefined) {
          throw newNullPointerException("target");
        }
        _checkTargetName(target.name);
        this.target = target;
      }

      get name() {
        return this.target.name;
      }

      get words() {
        if (! this.terminatesBlock()) {
          return this.target.words;
        }
        return END_OF_BLOCK_TARGET_WORDS;
      }

      isWordBeginningMatched() {
        if (! this.terminatesBlock()) {
          return this.target.wordBeginningMatched;
        }
        return false;
      }

      isWordEndMatched() {
        if (! this.terminatesBlock()) {
          return this.target.wordEndMatched;
        }
        return false;
      }

      isWordNegative() {
        if (! this.terminatesBlock()) {
          return this.target.wordNegative;
        }
        return false;
      }

      terminatesBlock() {
        return this.target.terminatesBlock;
      }

      toObject() {
        return this.target;
      }
    }

    const FILTERING_ACCEPT = new FilteringTarget({
        name: _ExtractNews.TARGET_ACCEPT,
        terminatesBlock: true
      });
    const FILTERING_DROP = new FilteringTarget({
        name: _ExtractNews.TARGET_DROP,
        terminatesBlock: true
      });
    const FILTERING_RETURN = new FilteringTarget({
        name: _ExtractNews.TARGET_RETURN,
        terminatesBlock: true
      });

    /*
     * Returns the filtering target to accept or drop news topics or senders.
     */
    function newFilteringTarget(
      name, words, wordBeginningMatched, wordEndMatched, wordNegative) {
      name = name.toUpperCase();
      if (words == undefined) {
        switch (name) {
        case ExtractNews.TARGET_ACCEPT:
          return FILTERING_ACCEPT;
        case ExtractNews.TARGET_DROP:
          return FILTERING_DROP;
        case ExtractNews.TARGET_RETURN:
          return FILTERING_RETURN;
        }
      }
      return new FilteringTarget({
          name: name,
          words: words,
          wordBeginningMatched: wordBeginningMatched,
          wordEndMatched: wordEndMatched,
          wordNegative: wordNegative,
          terminatesBlock: false
        });
    }

    _ExtractNews.FilteringTarget = FilteringTarget;
    _ExtractNews.newFilteringTarget = newFilteringTarget;

    function _checkRegularExpression(regexpString) {
      if (regexpString == undefined) {
        throw newNullPointerException("regexpString");
      } else if ((typeof regexpString) != "string") {
        throw newIllegalArgumentException("regexpString");
      }
    }

    /*
     * The setting of filterings.
     */
    class Filtering {
      constructor(filtering) {
        if (filtering == undefined) {
          throw newNullPointerException("filtering");
        }
        this._categoryName = filtering.categoryName;
        this._categoryTopics = filtering.categoryTopics;
        this.policyTargetName = filtering.policyTargetName;
        this._targets = new Array();
        if (filtering.targetObjects != undefined) {
          filtering.targetObjects.forEach((targetObject) => {
              this._targets.push(new FilteringTarget(targetObject));
            });
        }
      }

      get categoryName() {
        return this._categoryName;
      }

      setCategoryName(categoryName) {
        if (categoryName == undefined) {
          throw newNullPointerException("categoryName");
        } else if ((typeof categoryName) != "string") {
          throw newIllegalArgumentException("categoryName");
        }
        return this._categoryName = categoryName;
      }

      get categoryTopics() {
        return this._categoryTopics;
      }

      setCategoryTopics(categoryTopics) {
        if (! Array.isArray(categoryTopics)) {
          throw newIllegalArgumentException("categoryTopics");
        }
        this._categoryTopics = categoryTopics;
      }

      get policyTarget() {
        return newFilteringTarget(this.policyTargetName);
      }

      setPolicyTarget(targetName) {
        var policyTargetName = targetName.toUpperCase();
        _checkTargetName(policyTargetName);
        this.policyTargetName = policyTargetName;
      }

      get targets() {
        return this._targets;
      }

      setTargets(targets) {
        if (! Array.isArray(targets)) {
          throw newIllegalArgumentException("targets");
        }
        this._targets = targets;
      }

      toObject() {
        var targetObjects = new Array();
        this.targets.forEach((target) => {
            targetObjects.push(target.toObject());
          });
        return {
            categoryName: this._categoryName,
            categoryTopics: this._categoryTopics,
            policyTargetName: this.policyTargetName,
            targetObjects: targetObjects
          };
      }
    }

    /*
     * Returns the setting of an empty filtering.
     */
    function newFiltering() {
      return new Filtering({
          categoryName: "",
          categoryTopics: undefined,
          policyTargetName: _ExtractNews.TARGET_RETURN
        });
    }

    _ExtractNews.Filtering = Filtering;
    _ExtractNews.newFiltering = newFiltering;


    // Maximum count and index strings used by read or written functions
    const SELECTION_MAX_COUNT = 100;
    const SELECTION_INDEX_STRINGS = new Array();

    for (let i = 0; i < SELECTION_MAX_COUNT; i++) {
      SELECTION_INDEX_STRINGS.push(String(i));
    }

    _ExtractNews.SELECTION_MAX_COUNT = SELECTION_MAX_COUNT;
    _ExtractNews.SELECTION_INDEX_STRINGS = SELECTION_INDEX_STRINGS;

    /*
     * The setting to select news topics and/or senders.
     */
    class Selection {
      constructor(setting) {
        if (setting == undefined) {
          throw newNullPointerException("setting");
        }
        this.setting = setting;
      }

      get settingName() {
        return this.setting.name;
      }

      set settingName(name) {
        if (name == undefined) {
          throw newNullPointerException("name");
        } else if ((typeof name) != "string") {
          throw newIllegalArgumentException("name");
        }
        return this.setting.name = name;
      }

      get topicRegularExpression() {
        return this.setting.topicRegularExpression;
      }

      set topicRegularExpression(regexpString) {
        _checkRegularExpression(regexpString);
        this.setting.topicRegularExpression = regexpString;
      }

      get senderRegularExpression() {
        return this.setting.senderRegularExpression;
      }

      set senderRegularExpression(regexpString) {
        _checkRegularExpression(regexpString);
        this.setting.senderRegularExpression = regexpString;
      }

      get openedUrl() {
        return this.setting.openedUrl;
      }

      set openedUrl(url) {
        if (url == undefined) {
          throw newNullPointerException("url");
        } else if ((typeof url) != "string") {
          throw newIllegalArgumentException("url");
        } else if (url == "") {
          throw newEmptyStringException("url");
        }
        return this.setting.openedUrl = url;
      }

      toObject() {
        return this.setting;
      }
    }

    /*
     * Returns the empty setting to select news topics and/or senders.
     */
    function newSelection() {
      return new Selection({
          name: "",
          topicRegularExpression: "",
          senderRegularExpression: "",
          openedUrl: ""
        });
    }

    _ExtractNews.Selection = Selection;
    _ExtractNews.newSelection = newSelection;


    /*
     * Debug object in this extension.
     */
    class DebugLogger extends Logger {
      constructor() {
        super();
        this._debugOn = false;
      }

      get debugOn() {
        return this._debugOn;
      }

      set debugOn(debugOn) {
        return this._debugOn = debugOn;
      }

      isLoggingOn() {
        return this.debugOn;
      }
    }

    const Debug = new DebugLogger();
    const DEBUG_KEY = "Debug";

    /*
     * Reads the debug mode on this extension from the local storage
     * and returns the promise fulfilled with its value or rejected.
     */
    function getDebugMode() {
      return readStorage(DEBUG_KEY).then((items) => {
          var debugOn = items[DEBUG_KEY];
          if (debugOn == undefined) {
            debugOn = false;
          }
          Debug.debugOn = debugOn;
          return Promise.resolve(debugOn);
        });
    }

    /*
     * Writes the specified debug mode on this extension into the local
     * storage and returns the promise.
     */
    function setDebugMode(debugOn) {
      if ((typeof debugOn) != "boolean") {
        throw newIllegalArgumentException("debugOn");
      }
      Debug.debugOn = debugOn;
      return writeStorage({
          [DEBUG_KEY]: debugOn
        });
    }

    _ExtractNews.Debug = Debug;
    _ExtractNews.getDebugMode = getDebugMode;
    _ExtractNews.setDebugMode = setDebugMode;


     /*
      * Sends the specified messeage of a command to the background script
      * and returns the promise.
      */
    function sendRuntimeMessage(message, senderOnTab = "") {
      if (message == undefined) {
        throw newNullPointerException("message");
      } else if (message.command == undefined
        || (typeof message.command) != "string") {
        throw newIllegalArgumentException("message");
      }
      return callAsynchronousAPI(
        browser.runtime.sendMessage, message).then(() => {
          if (browser.runtime.lastError != undefined) {
            Debug.printMessage(
              "Send Message Error: " + browser.runtime.lastError.message);
          }
          Debug.printMessage(
            "Send the command " + message.command.toUpperCase()
            + senderOnTab + ".");
          return Promise.resolve();
        });
    }

    _ExtractNews.sendRuntimeMessage = sendRuntimeMessage;

    return _ExtractNews;
  })();

const Debug = ExtractNews.Debug;
