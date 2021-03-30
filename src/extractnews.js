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


    /*
     * The information of a page on news site.
     */
    class NewsPage {
      constructor() {
      }

      getSiteId() {
        throw newUnsupportedOperationException();
      }

      getUrl() {
        throw newUnsupportedOperationException();
      }

      getDomain() {
        throw newUnsupportedOperationException();
      }

      containsUrl(url) {
        return false;
      }
    }

    /*
     * The information of a top page on news site.
     */
    class NewsTopPage extends NewsPage {
      constructor(siteId, hostServerPattern) {
        super();
        this.siteId = siteId;
        this.hostServerPattern = hostServerPattern;
        this.domain = getLocalizedString(siteId + "UrlDomain");
        this.rootDirectoryPath =
          getLocalizedString(siteId + "UrlRootDirectoryPath");
      }

      getSiteId() {
        return this.siteId;
      }

      getUrl() {
        var url = URL_HTTPS_SCHEME;
        var hostServer = this.getHostServer();
        if (hostServer != "") {
          url += hostServer + ".";
        }
        url += this.domain;
        if (this.rootDirectoryPath != "") {
          url += this.rootDirectoryPath + "/";
        }
        return url;
      }

      getHostServer() {
        if (this.hostServerPattern != URL_PATTERN_ANY_HOST_SERVER) {
          return this.hostServerPattern;
        }
        return URL_DEFAULT_HOST_SERVER;
      }

      getDomain() {
        return this.domain;
      }

      containsHostPath(hostPath) {
        var newsTopDomainPath = this.domain + this.rootDirectoryPath;
        var relativePath = undefined;
        if (this.hostServerPattern == URL_PATTERN_NO_HOST_SERVER
          || this.hostServerPattern == URL_PATTERN_ANY_HOST_SERVER) {
          if (this.hostServerPattern == URL_PATTERN_NO_HOST_SERVER
            && hostPath.startsWith(newsTopDomainPath)) { // "slashdot.org"
            relativePath = hostPath.substring(newsTopDomainPath.length);
          }
          if (relativePath == undefined) { // "devices.slashdot.org"
            var domainPath = hostPath.substring(hostPath.indexOf(".") + 1);
            if (! domainPath.startsWith(newsTopDomainPath)) {
              return false;
            }
            relativePath = domainPath.substring(newsTopDomainPath.length);
          }
        } else { // "www.yahoo.com" or "news.yahoo.co.jp"
          var newsTopHostPath =
            this.hostServerPattern + "." + newsTopDomainPath;
          if (! hostPath.startsWith(newsTopHostPath)) {
            return false;
          }
          relativePath = hostPath.substring(newsTopHostPath.length);
        }
        return relativePath == "" || relativePath.startsWith("/");
      }

      containsUrl(url) {
        if (url != undefined) {
          if ((typeof url) != "string") {
            throw newIllegalArgumentException("url");
          } else if (url.startsWith(URL_HTTPS_SCHEME)) {
            return this.containsHostPath(
              url.substring(URL_HTTPS_SCHEME.length));
          }
        }
        return false;
      }
    }

    // IDs of news sites enabled on this extension
    var _enabledSiteIdSet = new Set();

    // IDs of news sites used by this extension
    const SITE_IDS = new Array();

    // Map of news sites used by this extension
    const SITE_MAP = new Map();

    // Sets the information of sites used for each language.

    splitLocalizedString("SiteLanguages").forEach((siteLanguage) => {
        var siteIds = splitLocalizedString(siteLanguage + "SiteIds");
        var commentSiteIdSet =
          new Set(splitLocalizedString(siteLanguage + "CommentSiteIds"));
        var hostFaviconSiteIdSet =
          new Set(splitLocalizedString(siteLanguage + "HostFaviconSiteIds"));

        siteIds.forEach((siteId) => {
            var site = {
                name: getLocalizedString(siteId + "Name"),
                language: siteLanguage,
                hostServerPatterns:
                  splitLocalizedString(siteId + "UrlHostServerPatterns"),
                hasHostFavicon: hostFaviconSiteIdSet.has(siteId),
                hasComment: commentSiteIdSet.has(siteId)
              };
            var hostServerPattern = site.hostServerPatterns[0];
            if (hostServerPattern != URL_PATTERN_NO_HOST_SERVER
              && site.hostServerPatterns.length > 1) {
              hostServerPattern = URL_PATTERN_ANY_HOST_SERVER;
            }
            site.newsTopPage = new NewsTopPage(siteId, hostServerPattern);
            if (site.newsTopPage.containsUrl(document.URL)) {
              // Sets the site ID as an enabled site for the content script.
              _enabledSiteIdSet.add(siteId);
            }
            SITE_IDS.push(siteId);
            SITE_MAP.set(siteId, site);
          });
      });

    /*
     * Returns the array of news site pages used by the current local.
     */
    function getNewsSitePages() {
      var sitePages = new Array();
      SITE_IDS.forEach((siteId) => {
          sitePages.push(SITE_MAP.get(siteId).newsTopPage);
        });
      return sitePages;
    }

    _ExtractNews.NewsPage = NewsPage;
    _ExtractNews.getNewsSitePages = getNewsSitePages;

    function _checkSiteId(siteId) {
      if (siteId == undefined) {
        throw newNullPointerException("siteId");
      } else if ((typeof siteId) != "string") {
        throw newIllegalArgumentException("siteId");
      }
    }

    /*
     * Returns true if a news site for the specified ID is enabled.
     */
    function isNewsSiteEnabled(siteId) {
      _checkSiteId(siteId);
      return _enabledSiteIdSet.has(siteId);
    }

    /*
     * Returns the favicon ID of a news site for the specified ID if exists,
     * otherwise, undefined.
     */
    function getNewsSiteFaviconId(siteId, siteUrl) {
      _checkSiteId(siteId);
      var site = SITE_MAP.get(siteId);
      if (site != undefined) {
        if (! site.hasHostFavicon) {
          return siteId;
        } else if (siteUrl == undefined) {
          throw newNullPointerException("siteUrl");
        } else if ((typeof siteUrl) != "string") {
          throw newIllegalArgumentException("siteUrl");
        } else if (siteUrl.startsWith(URL_HTTPS_SCHEME)) {
          var siteDomainIndex = siteUrl.indexOf(site.newsTopPage.getDomain());
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

    /*
     * Returns the language of a news site for the specified ID if exists,
     * otherwise, undefined.
     */
    function getNewsSiteLanguage(siteId) {
      _checkSiteId(siteId);
      var site = SITE_MAP.get(siteId);
      if (site != undefined) {
        return site.language;
      }
      return undefined;
    }

    _ExtractNews.isNewsSiteEnabled = isNewsSiteEnabled;
    _ExtractNews.getNewsSiteFaviconId = getNewsSiteFaviconId;
    _ExtractNews.getNewsSiteLanguage = getNewsSiteLanguage;

    function _getUrlPattern(hostServerPattern, domain) {
      if (hostServerPattern != URL_PATTERN_NO_HOST_SERVER) {
        hostServerPattern += ".";
      }
      return URL_HTTPS_SCHEME + hostServerPattern + domain
        + URL_PATTERN_ANY_PATH;
    }

    /*
     * Returns the array of URL patterns whose news sites are enabled.
     */
    function getEnabledSiteUrlPatterns() {
      var enabledSiteUrlPatterns = new Array();
      _enabledSiteIdSet.forEach((siteId) => {
          var site = SITE_MAP.get(siteId);
          site.hostServerPatterns.forEach((hostServerPattern) => {
              enabledSiteUrlPatterns.push(
                _getUrlPattern(
                  hostServerPattern, site.newsTopPage.getDomain()));
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
      _enabledSiteIdSet.forEach((siteId) => {
          var site = SITE_MAP.get(siteId);
          if (site.hasComment) {
            site.hostServerPatterns.forEach((hostServerPattern) => {
                enabledCommentSiteUrlPatterns.push(
                  _getUrlPattern(
                    hostServerPattern, site.newsTopPage.getDomain()));
              });
          }
        });
      return enabledCommentSiteUrlPatterns;
    }

    _ExtractNews.getEnabledSiteUrlPatterns = getEnabledSiteUrlPatterns;
    _ExtractNews.getEnabledCommentSiteUrlPatterns =
      getEnabledCommentSiteUrlPatterns;

    /*
     * Returns the news site page which contains the specified URL if used by
     * the current locale, otherwise, undefined.
     */
    function getNewsSitePage(url) {
      if (url != undefined) {
        if ((typeof url) != "string") {
          throw newIllegalArgumentException("url");
        } else if (url.startsWith(URL_HTTPS_SCHEME)) {
          var hostPath = url.substring(URL_HTTPS_SCHEME.length);
          for (let i = 0; i < SITE_IDS.length; i++) {
            var site = SITE_MAP.get(SITE_IDS[i]);
            if (site.newsTopPage.containsHostPath(hostPath)) {
              return site.newsTopPage;
            }
          }
        }
      }
      return undefined;
    }

    _ExtractNews.getNewsSitePage = getNewsSitePage;


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


    const STORAGE_AREA = browser.storage.local;

    /*
     * Reads the storage area by the specified key and returns the promise
     * fulfilled with its value.
     */
    function readStorageArea(key) {
      if (BROWSER_PROMISE_RETURNED) {
        return STORAGE_AREA.get(key);
      }
      return new Promise((resolve) => { STORAGE_AREA.get(key, resolve); });
    }

    /*
     * Writes the storage area by the specified object which consists of pairs
     * of a key and value and returns the promise.
     */
    function writeStorageArea(items) {
      if (BROWSER_PROMISE_RETURNED) {
        return STORAGE_AREA.set(items);
      }
      return new Promise((resolve) => { STORAGE_AREA.set(items, resolve); });
    }

    /*
     * Reads the storage area by the specified key and returns the promise
     * fulfilled with its value.
     */
    function removeStorageArea(key) {
      if (BROWSER_PROMISE_RETURNED) {
        return STORAGE_AREA.remove(key);
      }
      return new Promise((resolve) => { STORAGE_AREA.remove(key, resolve); });
    }

    _ExtractNews.readStorageArea = readStorageArea;
    _ExtractNews.writeStorageArea = writeStorageArea;
    _ExtractNews.removeStorageArea = removeStorageArea;


    const ENABLED_KEY = "Enabled";

    /*
     * Reads IDs of enabled sites from the local storage and returns
     * the promise fulfilled with the set of its or rejected.
     */
    function getEnabledSites() {
      const readingPromises = new Array();
      SITE_IDS.forEach((siteId) => {
          var siteEnabledKey = siteId + ENABLED_KEY;
          readingPromises.push(
              readStorageArea(siteEnabledKey).then((items) => {
                  var enabledSiteId = undefined;
                  var siteEnabled = items[siteEnabledKey];
                  if (siteEnabled | siteEnabled == undefined) {
                    enabledSiteId = siteId;
                  }
                  return Promise.resolve(enabledSiteId);
                })
            );
        });
      return Promise.all(readingPromises).then((enabledSiteIds) => {
          _enabledSiteIdSet = new Set();
          enabledSiteIds.forEach((enabledSiteId) => {
              if (enabledSiteId != undefined) {
                _enabledSiteIdSet.add(enabledSiteId);
              }
            });
          return Promise.resolve(new Set(_enabledSiteIdSet));
        });
    }

    /*
     * Writes the specified flag to enable the site of the specified ID into
     * the local storage and returns the promise.
     */
    function setEnabledSite(siteId, enabled) {
      if (siteId == undefined) {
        throw newNullPointerException("siteId");
      }
      var siteEnabledKey = siteId + ENABLED_KEY;
      return writeStorageArea({
          [siteEnabledKey]: enabled
        }).then(() => {
          if (enabled) {
            _enabledSiteIdSet.add(siteId);
          } else {
            _enabledSiteIdSet.delete(siteId);
          }
          return Promise.resolve();
        });
    }

    _ExtractNews.getEnabledSites = getEnabledSites;
    _ExtractNews.setEnabledSite = setEnabledSite;


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
      return readStorageArea(DEBUG_KEY).then((items) => {
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
      return writeStorageArea({ [DEBUG_KEY]: debugOn });
    }

    _ExtractNews.Debug = Debug;
    _ExtractNews.getDebugMode = getDebugMode;
    _ExtractNews.setDebugMode = setDebugMode;


    const FILTERING_DISABLED_KEY = "FilteringDisabled";

    /*
     * Reads the flag to disable the filtering from the local storage
     * and returns the promise fulfilled with its value or rejected.
     */
    function getFilteringDisabled() {
      return readStorageArea(FILTERING_DISABLED_KEY).then((items) => {
          var filteringDisabled = items[FILTERING_DISABLED_KEY];
          if (filteringDisabled == undefined) {
            filteringDisabled = false;
          }
          return Promise.resolve(filteringDisabled);
        });
    }

    /*
     * Writes the specified flag to disable the filtering into the local
     * storage and returns the promise.
     */
    function setFilteringDisabled(filteringDisabled) {
      if ((typeof filteringDisabled) != "boolean") {
        throw newIllegalArgumentException("filteringDisabled");
      }
      return writeStorageArea({ [FILTERING_DISABLED_KEY]: filteringDisabled });
    }

    _ExtractNews.getFilteringDisabled = getFilteringDisabled;
    _ExtractNews.setFilteringDisabled = setFilteringDisabled;


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
