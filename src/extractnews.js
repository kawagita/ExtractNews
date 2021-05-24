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

const URL_DOMAIN_LABEL_SEPARATOR = ".";
const URL_DOMAIN_LABEL_REGULAR_EXPRESSION =
  "[0-9A-Za-z](?:[-0-9A-Za-z]*[0-9A-Za-z])?";
const URL_PATH_SEPARATOR = "/";
const URL_PATH_SEPARATOR_CODE_POINT = URL_PATH_SEPARATOR.codePointAt(0);

const URL_PATTERN_NON_EXISTENCE = "";
const URL_PATTERN_ANY_MATCH = "*";

/*
 * Functions and constant variables to select and exclude news topics.
 */
const ExtractNews = (() => {
    const _ExtractNews = {
        // Languages of news site
        SITE_ENGLISH: "English",
        SITE_JAPANESE: "Japanese",

        // Key to read and write the flag whether the site is enabled
        ENABLED_KEY: "Enabled",

        // Maximum count of news selections or fitlerings
        SELECTION_MAX_COUNT: 100,
        FILTERING_MAX_COUNT: 100,

        // Filtering ID for all categories
        FILTERING_FOR_ALL: "All",

        // Names and word options of filtering target
        TARGET_ACCEPT: "ACCEPT",
        TARGET_DROP: "DROP",
        TARGET_RETURN: "RETURN",
        TARGET_WORD_BEGINNING: "Beginning",
        TARGET_WORD_END: "End",
        TARGET_WORDS_EXCLUDED: "Excluded",

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


    function _capitalizeString(str) {
      return str.substring(0, 1).toUpperCase() + str.substring(1);
    }

    function _createNewsDomainId(hostDomain) {
      var domainId = "";
      var domainLabels = hostDomain.split(URL_DOMAIN_LABEL_SEPARATOR);
      domainLabels.forEach((domainLabel) => {
          domainId += _capitalizeString(domainLabel);
        });
      return domainId;
    }

    function _forEachHostServerUrlPatterns(
      callback, hostServerPattern, hostDomain, sitePaths) {
      var hostName = "";
      if (hostServerPattern != URL_PATTERN_NON_EXISTENCE) {
        hostName = hostServerPattern + URL_DOMAIN_LABEL_SEPARATOR;
      }
      hostName += hostDomain;
      if (sitePaths != undefined) {
        for (const sitePath of sitePaths) {
          callback(URL_HTTPS_SCHEME + hostName + sitePath
            + URL_PATH_SEPARATOR + URL_PATTERN_ANY_MATCH);
        }
      } else {
        callback(URL_HTTPS_SCHEME + hostName + URL_PATH_SEPARATOR
          + URL_PATTERN_ANY_MATCH);
      }
    }

    /*
     * The information of a news domain.
     */
    class NewsDomain {
      constructor(
        name, language, hostServerPatterns, hostDomain, sitePaths,
        commentHostServerPatterns, commentSitePaths) {
        this.domain = {
            name: name,
            language: language,
            hostServerPatterns: hostServerPatterns,
            hostDomain: hostDomain
          };
        if (sitePaths.length > 0 && sitePaths[0] != "") {
          if (hostServerPatterns.length > 1
            || hostServerPatterns[0] == URL_PATTERN_NON_EXISTENCE
            || hostServerPatterns[0] == URL_PATTERN_ANY_MATCH) {
            throw newIllegalArgumentException("sitePaths");
          }
          this.domain.sitePaths = sitePaths;
        }
        if (commentHostServerPatterns != undefined) {
          this.domain.commentHostServerPatterns = commentHostServerPatterns;
        }
        if (commentSitePaths.length > 0 && commentSitePaths[0] != "") {
          this.domain.commentSitePaths = commentSitePaths;
        }
        var sites = new Array();
        var hostRegexpString = "^";
        if (hostServerPatterns.length > 1) {
          if (hostServerPatterns[0] != URL_PATTERN_NON_EXISTENCE) {
            // Add the news site of host servers specified for the domain.
            for (let i = 0; i < hostServerPatterns.length; i++) {
              sites.push(new NewsSite({
                  hostServer: hostServerPatterns[i],
                  hostDomain: hostDomain
                }));
            }
            hostRegexpString += "(";
            for (let i = 0; i < hostServerPatterns.length; i++) {
              if (i > 0) {
                hostRegexpString += "|";
              }
              hostRegexpString += hostServerPatterns[i];
            }
            hostRegexpString += ")\\" + URL_DOMAIN_LABEL_SEPARATOR;
          } else { // No host server for the domain top like "slashdot.org"
            sites.push(new NewsSite({ hostDomain: hostDomain }));
            hostRegexpString +=
              "(?:|" + URL_DOMAIN_LABEL_REGULAR_EXPRESSION + "\\"
              + URL_DOMAIN_LABEL_SEPARATOR + ")";
          }
        } else if (hostServerPatterns[0] != URL_PATTERN_NON_EXISTENCE) {
          hostRegexpString += "(";
          if (hostServerPatterns[0] != URL_PATTERN_ANY_MATCH) {
            if (sitePaths.length > 0 && sitePaths[0] != "") {
              // Add the news site of a host server and directory paths
              // specified for the domain.
              sitePaths.forEach((path) => {
                  sites.push(new NewsSite({
                      hostServer: hostServerPatterns[0],
                      hostDomain: hostDomain,
                      path: path
                    }));
                });
            } else { // A host server specified for the domain
              sites.push(new NewsSite({
                  hostServer: hostServerPatterns[0],
                  hostDomain: hostDomain
                }));
            }
            hostRegexpString += hostServerPatterns[0];
          } else { // Any host server on the domain
            sites.push(new NewsSite({
                hostServer: URL_DEFAULT_HOST_SERVER,
                hostDomain: hostDomain
              }));
            hostRegexpString += URL_DOMAIN_LABEL_REGULAR_EXPRESSION;
          }
          hostRegexpString += ")\\" + URL_DOMAIN_LABEL_SEPARATOR;
        } else { // No host server on the domain
          sites.push(new NewsSite({ hostDomain: hostDomain }));
        }
        hostRegexpString +=
          hostDomain.replaceAll(URL_DOMAIN_LABEL_SEPARATOR, "\\$&")
          + "(?:/|$)";
        this.domain.hostRegexp = new RegExp(hostRegexpString);
        this.domain.sites = sites;
      }

      get id() {
        return _createNewsDomainId(this.domain.hostDomain);
      }

      get name() {
        return this.domain.name;
      }

      get language() {
        return this.domain.language;
      }

      isAlwaysHostServerSpecified() {
        return this.domain.hostServerPatterns[0] != URL_PATTERN_NON_EXISTENCE;
      }

      getSite(siteId) {
        for (const site of this.domain.sites) {
          if (siteId == site.id) {
            return site;
          }
        }
        return undefined;
      }

      addSite(site) {
        this.domain.sites.push(site);
      }

      forEachSite(callback) {
        this.domain.sites.forEach(callback);
      }

      forEachUrlPattern(callback) {
        this.domain.hostServerPatterns.forEach((hostServerPattern) => {
            _forEachHostServerUrlPatterns(
              callback, hostServerPattern, this.domain.hostDomain,
              this.domain.sitePaths);
          });
      }

      forEachCommentSiteUrlPattern(callback) {
        if (this.domain.commentHostServerPatterns == undefined) {
          return;
        }
        this.domain.commentHostServerPatterns.forEach((hostServerPattern) => {
            _forEachHostServerUrlPatterns(
              callback, hostServerPattern, this.domain.hostDomain,
              this.domain.commentSitePaths);
          });
      }

      match(url) {
        if (url != undefined) {
          if ((typeof url) != "string") {
            throw newIllegalArgumentException("url");
          } else if (url.startsWith(URL_HTTPS_SCHEME)) {
            var urlHostPath = url.substring(URL_HTTPS_SCHEME.length);
            var urlHostMatch = urlHostPath.match(this.domain.hostRegexp);
            if (urlHostMatch != null) {
              var siteData = {
                  hostDomain: this.domain.hostDomain
                };
              if (urlHostMatch.length >= 1) {
                siteData.hostServer = urlHostMatch[1];
              }
              if (this.domain.sitePaths == null) {
                return siteData;
              }
              var urlPath =
                urlHostPath.substring(urlHostPath.indexOf(URL_PATH_SEPARATOR));
              for (const sitePath of this.domain.sitePaths) {
                if (urlPath.startsWith(sitePath)
                  && (urlPath.length == sitePath.length
                    || urlPath.codePointAt(sitePath.length)
                      == URL_PATH_SEPARATOR_CODE_POINT)) {
                  siteData.path = sitePath;
                  return siteData;
                }
              }
            }
          }
        }
        return null;
      }
    }

    // Map of news domains registered in the current context
    var newsDomainMap = new Map();

    function _createNewsSiteId(domainId, siteData) {
      var siteId = domainId;
      var newsDomain = newsDomainMap.get(domainId);
      if (newsDomain != undefined) {
        if (newsDomain.isAlwaysHostServerSpecified()
          && siteData.hostServer != undefined
          && siteData.hostServer != URL_DEFAULT_HOST_SERVER) {
          siteId += _capitalizeString(siteData.hostServer);
        }
        if (siteData.path != undefined) {
          var pathSegments =
            siteData.path.substring(1).split(URL_PATH_SEPARATOR);
          pathSegments.forEach((pathSegment) => {
              siteId += _capitalizeString(pathSegment);
            });
        }
      }
      return siteId;
    }

    /*
     * The information of a news site.
     */
    class NewsSite {
      constructor(siteData) {
        if (siteData == undefined) {
          throw newNullPointerException("siteData");
        }
        this.site = {
            domainId: _createNewsDomainId(siteData.hostDomain),
            hostDomain: siteData.hostDomain
          };
        if (siteData.hostServer != undefined) {
          this.site.hostServer = siteData.hostServer;
        }
        if (siteData.path != undefined) {
          this.site.path = siteData.path;
        }
      }

      get domainId() {
        return this.site.domainId;
      }

      get id() {
        return _createNewsSiteId(this.site.domainId, this.site);
      }

      get hostServer() {
        if (this.site.hostServer != undefined) {
          return this.site.hostServer;
        }
        return "";
      }

      get hostDomain() {
        return this.site.hostDomain;
      }

      get path() {
        if (this.site.path != undefined) {
          return this.site.path;
        }
        return "";
      }

      get url() {
        var url = URL_HTTPS_SCHEME;
        if (this.site.hostServer != undefined) {
          url += this.site.hostServer + URL_DOMAIN_LABEL_SEPARATOR;
        }
        url += this.site.hostDomain;
        if (this.site.path != undefined) {
          url += this.site.path + URL_PATH_SEPARATOR;
        }
        return url;
      }
    }

    // Sets domains and sites read from the message for the specified language
    // to the current context.

    function _setLocalizedNewsSites(language) {
      splitLocalizedString(language + "SitePrefixes").forEach((sitePrefix) => {
          var hostDomain = getLocalizedString(sitePrefix + "Domain");
          var commentHostServerPatterns = undefined;
          var commentHostServerPatternsString =
            getLocalizedString(sitePrefix + "CommentHostServerPatterns");
          if (commentHostServerPatternsString != "") {
            commentHostServerPatterns =
              commentHostServerPatternsString.split(",");
          }
          newsDomainMap.set(
            _createNewsDomainId(hostDomain),
            new NewsDomain(
              getLocalizedString(sitePrefix + "Name"), language,
              splitLocalizedString(sitePrefix + "HostServerPatterns"),
              hostDomain, splitLocalizedString(sitePrefix + "SitePaths"),
              commentHostServerPatterns,
              splitLocalizedString(sitePrefix + "CommentSitePaths")));
        });
    }

    splitLocalizedString("SiteLanguages").forEach(_setLocalizedNewsSites);

    /*
     * Calls the specified function with the ID, URL, and domain enabled flag
     * for each news site set in the current context.
     */
    function forEachNewsSite(callback) {
      for (const newsDomain of newsDomainMap.values()) {
        newsDomain.forEachSite((site) => {
            callback(site.id, site.url, isDomainEnabled(site.domainId));
          });
      }
    }

    /*
     * Returns the news site which contains the specified URL if set
     * in the current context, otherwise, undefined.
     */
    function getNewsSite(url) {
      if (url != undefined) {
        if ((typeof url) != "string") {
          throw newIllegalArgumentException("url");
        }
        for (const newsDomain of newsDomainMap.values()) {
          var siteData = newsDomain.match(url);
          if (siteData != null) {
            var newsSite =
              newsDomain.getSite(_createNewsSiteId(newsDomain.id, siteData));
            if (newsSite != undefined) {
              return newsSite;
            }
            return new NewsSite(siteData);
          }
        }
      }
      return undefined;
    }

    /*
     * Sets the specified news site into the array of news sites set
     * in this contens if not exist.
     */
    function setNewsSite(newsSite) {
      if (newsSite == undefined) {
        throw newNullPointerException("newsSite");
      }
      for (const newsDomain of newsDomainMap.values()) {
        if (newsSite.domainId == newsDomain.id) {
          if (newsDomain.getSite(newsSite.id) == undefined) {
            newsDomain.addSite(newsSite);
          }
          return;
        }
      }
    }

    /*
     * Reads the enabled news site for the specified URL from the storage
     * and returns the promise fulfilled with it if exists.
     */
    function readEnabledNewsSite(url) {
      var newsSite = getNewsSite(url);
      if (newsSite != undefined) {
        var enabledKey = newsSite.domainId + _ExtractNews.ENABLED_KEY;
        return ExtractNews.readStorage(enabledKey).then((items) => {
            var enabled = items[enabledKey];
            if (enabled | enabled == undefined) {
              return Promise.resolve(newsSite);
            }
          });
      }
      return Promise.resolve();
    }

    _ExtractNews.NewsSite = NewsSite;
    _ExtractNews.forEachNewsSite = forEachNewsSite;
    _ExtractNews.getNewsSite = getNewsSite;
    _ExtractNews.setNewsSite = setNewsSite;
    _ExtractNews.readEnabledNewsSite = readEnabledNewsSite;

    /*
     * Calls the specified function with the ID, name, and language for each
     * domain set in the current context.
     */
    function forEachDomain(callback) {
      for (const newsDomain of newsDomainMap.values()) {
        callback(newsDomain.id, newsDomain.name, newsDomain.language);
      }
    }

    function _checkDomainId(domainId) {
      if (domainId == undefined) {
        throw newNullPointerException("domainId");
      } else if ((typeof domainId) != "string") {
        throw newIllegalArgumentException("domainId");
      }
    }

    // IDs whose the domain is enabled in the current context
    var enabledDomainIdSet = new Set();

    /*
     * Returns true if the domain of the specified ID is set and enabled
     * in the current context.
     */
    function isDomainEnabled(domainId) {
      _checkDomainId(domainId);
      return enabledDomainIdSet.has(domainId);
    }

    /*
     * Enables the domain of the specified ID in the current context
     * if the specified flag is true, otherwise, disables it.
     */
    function setDomainEnabled(domainId, enabled) {
      _checkDomainId(domainId);
      if (enabled) {
        enabledDomainIdSet.add(domainId);
      } else if (enabledDomainIdSet.has(domainId)) {
        enabledDomainIdSet.delete(domainId);
      }
    }

    /*
     * Returns the language by which the domain of the specified ID set
     * in the current context is localized.
     */
    function getDomainLanguage(domainId) {
      _checkDomainId(domainId);
      for (const newsDomain of newsDomainMap.values()) {
        if (domainId == newsDomain.id) {
          return newsDomain.language;
        }
      }
      return _ExtractNews.SITE_ENGLISH;
    }

    _ExtractNews.forEachDomain = forEachDomain;
    _ExtractNews.isDomainEnabled = isDomainEnabled;
    _ExtractNews.setDomainEnabled = setDomainEnabled;
    _ExtractNews.getDomainLanguage = getDomainLanguage;

    /*
     * Returns the array of URL patterns whose news sites are contained
     * in the domain set and enabled in the current context.
     */
    function getEnabledNewsSiteUrlPatterns() {
      var enabledSiteUrlPatterns = new Array();
      enabledDomainIdSet.forEach((domainId) => {
          var newsDomain = newsDomainMap.get(domainId);
          newsDomain.forEachUrlPattern((urlPattern) => {
              enabledSiteUrlPatterns.push(urlPattern);
            });
        });
      return enabledSiteUrlPatterns;
    }

    /*
     * Returns the array of URL patterns whose comment sites are contained
     * in the domain set and enabled in the current context.
     */
    function getEnabledCommentSiteUrlPatterns() {
      var enabledCommentSiteUrlPatterns = new Array();
      enabledDomainIdSet.forEach((domainId) => {
          var newsDomain = newsDomainMap.get(domainId);
          newsDomain.forEachCommentSiteUrlPattern((urlPattern) => {
              enabledCommentSiteUrlPatterns.push(urlPattern);
            });
        });
      return enabledCommentSiteUrlPatterns;
    }

    _ExtractNews.getEnabledNewsSiteUrlPatterns = getEnabledNewsSiteUrlPatterns;
    _ExtractNews.getEnabledCommentSiteUrlPatterns =
      getEnabledCommentSiteUrlPatterns;


    // Target names to accept or drop a news topic or sender by the filtering
    const TARGET_NAME_SET = new Set([
        _ExtractNews.TARGET_ACCEPT,
        _ExtractNews.TARGET_DROP,
        _ExtractNews.TARGET_RETURN
      ]);

    _ExtractNews.TARGET_NAME_SET = TARGET_NAME_SET;

    /*
     * Returns true if the specified string is a filtering target name.
     */
    function isFilteringTargetName(targetName) {
      return TARGET_NAME_SET.has(targetName.toUpperCase());
    }

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

      isWordsExcluded() {
        if (! this.terminatesBlock()) {
          return this.target.wordsExcluded;
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
      name, wordSet, wordBeginningMatched, wordEndMatched, wordsExcluded) {
      name = name.toUpperCase();
      if (wordSet == undefined) {
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
          words: Array.from(wordSet),
          wordBeginningMatched: wordBeginningMatched,
          wordEndMatched: wordEndMatched,
          wordsExcluded: wordsExcluded,
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
     * The filtering setting for a category and it topics.
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
            Debug.printProperty(
              "SendMessage Error", browser.runtime.lastError.message);
          }
          Debug.printMessage(
            "Send the command " + message.command.toUpperCase()
            + senderOnTab + ".");
        });
    }

    _ExtractNews.sendRuntimeMessage = sendRuntimeMessage;

    return _ExtractNews;
  })();

const Debug = ExtractNews.Debug;
