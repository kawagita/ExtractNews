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

// Storage area to store the settings of this extension
const BROWSER_STORAGE_AREA = browser.storage.local;

/*
 * Reads the storage area by the specified key and returns the promise
 * fulfilled with its value.
 */
function readStorage(key) {
  if (BROWSER_PROMISE_RETURNED) {
    return BROWSER_STORAGE_AREA.get(key);
  }
  return new Promise((resolve) => {
      BROWSER_STORAGE_AREA.get(key, resolve);
    });
}

/*
 * Writes the storage area by the specified object which consists of pairs
 * of a key and value and returns the promise.
 */
function writeStorage(items) {
  if (BROWSER_PROMISE_RETURNED) {
    return BROWSER_STORAGE_AREA.set(items);
  }
  return new Promise((resolve) => {
      BROWSER_STORAGE_AREA.set(items, resolve);
    });
}

/*
 * Reads the storage area by the specified key and returns the promise
 * fulfilled with its value.
 */
function removeStorage(key) {
  if (BROWSER_PROMISE_RETURNED) {
    return BROWSER_STORAGE_AREA.remove(key);
  }
  return new Promise((resolve) => {
      BROWSER_STORAGE_AREA.remove(key, resolve);
    });
}

/*
 * Returns the string localized for the specified ID prefixed with
 * "extractNews".
 */
function getLocalizedString(id, substitutions) {
  return browser.i18n.getMessage("extractNews" + id, substitutions);
}

/*
 * Returns the array of strings localized for the specified ID prefixed
 * with "extractNews" and separated by commas.
 */
function splitLocalizedString(id) {
  return getLocalizedString(id).split(",");
}

/*
 * Returns the RegExp object of a string localized for the specified ID
 * prefixed with "extractNews" and suffixed with "RegularExpression".
 */
function getLocalizedRegExp(id) {
  var regexpString = getLocalizedString(id + "RegularExpression");
  if (regexpString != "") {
    return new RegExp(regexpString);
  }
  return new RegExp("^$");
}

/*
 * Returns the string capitalized for the specified text.
 */
function getCapitalizedString(textString) {
  if (textString.length > 0) {
    var capitalizedString = textString.substring(0, 1).toUpperCase();
    if (textString.length > 1) {
      capitalizedString += textString.substring(1);
    }
    return capitalizedString;
  }
  return "";
}

const URL_ABOUT_BLANK = "about:blank";

const URL_HTTPS_SCHEME = "https://";
const URL_DEFAULT_HOST_SERVER = "www";

const URL_DOMAIN_LABEL_SEPARATOR = ".";
const URL_DOMAIN_LABEL_REGULAR_EXPRESSION =
  "[0-9A-Za-z](?:[-0-9A-Za-z]*[0-9A-Za-z])?";
const URL_PATH_SEPARATOR = "/";

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
        TARGET_BREAK: "BREAK",
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

    /*
     * The debug object in the current context.
     */
    class DebugLogger extends Logger {
      constructor() {
        super();
        this.debugOn = false;
      }

      setDebugMode(debugOn) {
        return this.debugOn = debugOn;
      }

      isLoggingOn() {
        return this.debugOn;
      }
    }

    const Debug = new DebugLogger();

    const DEBUG_KEY = "Debug";

    readStorage(DEBUG_KEY).then((items) => {
        var debugOn = items[DEBUG_KEY];
        if (debugOn != undefined) {
          Debug.setDebugMode(debugOn);
        }
      }).catch((error) => {
        Debug.printStackTrace(error);
      });

    _ExtractNews.Debug = Debug;

    /*
     * Reads the debug mode from the storage and returns the promise
     * fulfilled with its value or rejected.
     */
    function readDebugMode() {
      return readStorage(DEBUG_KEY).then((items) => {
          var debugOn = items[DEBUG_KEY];
          if (debugOn == undefined) {
            debugOn = false;
          }
          return Promise.resolve(debugOn);
        });
    }

    /*
     * Writes the specified debug mode into the storage and returns
     * the promise.
     */
    function writeDebugMode(debugOn) {
      if ((typeof debugOn) != "boolean") {
        throw newIllegalArgumentException("debugOn");
      }
      return writeStorage({
          [DEBUG_KEY]: debugOn
        });
    }

    /*
     * Sets the specified debug mode into the current context.
     */
    function setDebugMode(debugOn) {
      if ((typeof debugOn) != "boolean") {
        throw newIllegalArgumentException("debugOn");
      }
      Debug.setDebugMode(debugOn);
    }

    _ExtractNews.readDebugMode = readDebugMode;
    _ExtractNews.writeDebugMode = writeDebugMode;
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
              "runtime.sendMessage()", browser.runtime.lastError.message);
          }
          Debug.printMessage(
            "Send the command " + message.command.toUpperCase()
            + senderOnTab + ".");
        });
    }

    _ExtractNews.sendRuntimeMessage = sendRuntimeMessage;


    function _checkDomainId(domainId) {
      if (domainId == undefined) {
        throw newNullPointerException("domainId");
      } else if ((typeof domainId) != "string") {
        throw newIllegalArgumentException("domainId");
      } else if (domainId == "") {
        throw newEmptyStringException("domainId");
      }
    }

    /*
     * The information of a news site.
     */
    class SiteData {
      constructor(domainId, siteId, siteDataObject) {
        _checkDomainId(domainId);
        if (siteId == undefined) {
          throw newNullPointerException("siteId");
        } else if ((typeof siteId) != "string") {
          throw newIllegalArgumentException("siteId");
        } else if (siteId == "") {
          throw newEmptyStringException("siteId");
        } else if (siteDataObject == undefined) {
          throw newNullPointerException("siteDataObject");
        }
        this.siteDomainId = domainId;
        this.siteId = siteId;
        this.siteDataObject = siteDataObject;
      }

      get domainId() {
        return this.siteDomainId;
      }

      get id() {
        return this.siteId;
      }

      get hostServer() {
        if (this.siteDataObject.hostServer != undefined) {
          return this.siteDataObject.hostServer;
        }
        return "";
      }

      get hostDomain() {
        return this.siteDataObject.hostDomain;
      }

      get path() {
        if (this.siteDataObject.path != undefined) {
          return this.siteDataObject.path;
        }
        return "";
      }

      get accessCount() {
        return this.siteDataObject.accessCount;
      }

      incrementAccessCount() {
        this.siteDataObject.accessCount++;
      }

      modifyAccessCount(multiplier) {
        if ((typeof multiplier) != "number") {
          throw newIllegalArgumentException("multiplier");
        }
        this.siteDataObject.accessCount =
          Math.floor(this.siteDataObject.accessCount * multiplier);
      }

      get url() {
        var url = URL_HTTPS_SCHEME;
        if (this.siteDataObject.hostServer != undefined) {
          url += this.siteDataObject.hostServer + URL_DOMAIN_LABEL_SEPARATOR;
        }
        url += this.siteDataObject.hostDomain;
        if (this.siteDataObject.path != undefined) {
          url += this.siteDataObject.path + URL_PATH_SEPARATOR;
        }
        return url;
      }

      toObject() {
        return this.siteDataObject;
      }
    }

    function _createSiteId(domainData, hostServer, path) {
      var siteId = domainData.id;
      if (hostServer != undefined) {
        if (hostServer != URL_DEFAULT_HOST_SERVER
          && domainData.hostServerPatterns[0] != URL_PATTERN_NON_EXISTENCE) {
          siteId += getCapitalizedString(hostServer);
        }
      }
      if (path != undefined) {
        path.substring(1).split(URL_PATH_SEPARATOR).forEach((pathSegment) => {
            siteId += getCapitalizedString(pathSegment);
          });
      }
      return siteId;
    }

    this.SiteData = SiteData;

    /*
     * The information of a news domain.
     */
    class DomainData {
      constructor(domainId, domainDataObject) {
        _checkDomainId(domainId);
        if (domainDataObject == undefined) {
          throw newNullPointerException("domainDataObject");
        } else if (domainDataObject.paths != undefined
          && domainDataObject.paths[0] != "") {
          var hostServerPatterns = domainDataObject.hostServerPatterns;
          if (hostServerPatterns.length > 1
            || hostServerPatterns[0] == URL_PATTERN_NON_EXISTENCE
            || hostServerPatterns[0] == URL_PATTERN_ANY_MATCH) {
            throw newIllegalArgumentException("domainData");
          }
        }
        this.domainId = domainId;
        this.domainDataObject = domainDataObject;
      }

      get id() {
        return this.domainId;
      }

      get name() {
        return this.domainDataObject.name;
      }

      get language() {
        return this.domainDataObject.language;
      }

      get hostServerPatterns() {
        return this.domainDataObject.hostServerPatterns;
      }

      get hostDomain() {
        return this.domainDataObject.hostDomain;
      }

      get paths() {
        return this.domainDataObject.paths;
      }

      get commentServerPatterns() {
        return this.domainDataObject.commentServerPatterns;
      }

      get commentPaths() {
        return this.domainDataObject.commentPaths;
      }

      toObject() {
        return this.domainDataObject;
      }
    }

    function _createDomainId(hostDomain) {
      var domainId = "";
      var domainLabels = hostDomain.split(URL_DOMAIN_LABEL_SEPARATOR);
      domainLabels.forEach((domainLabel) => {
          domainId += getCapitalizedString(domainLabel);
        });
      return domainId;
    }

    this.DomainData = DomainData;

    /*
     * The map of site data for each domain.
     */
    class DomainSiteDataMap {
      constructor() {
        this.domainRegExpMap = new Map();
        this.siteDataArrayMap = new Map();
      }

      hasDomain(domainId) {
        return this.domainRegExpMap.has(domainId);
      }

      setDomain(domainData) {
        var domainRegexpString = "^";
        var hostServerPatterns = domainData.hostServerPatterns;
        if (hostServerPatterns.length > 1) {
          if (hostServerPatterns[0] != URL_PATTERN_NON_EXISTENCE) {
            domainRegexpString += "(";
            for (let i = 0; i < hostServerPatterns.length; i++) {
              if (i > 0) {
                domainRegexpString += "|";
              }
              domainRegexpString += hostServerPatterns[i];
            }
            domainRegexpString += ")\\" + URL_DOMAIN_LABEL_SEPARATOR;
          } else { // No host server for the domain top like "slashdot.org"
            domainRegexpString +=
              "(?:|" + URL_DOMAIN_LABEL_REGULAR_EXPRESSION + "\\"
              + URL_DOMAIN_LABEL_SEPARATOR + ")";
          }
        } else if (hostServerPatterns[0] != URL_PATTERN_NON_EXISTENCE) {
          domainRegexpString += "(";
          if (hostServerPatterns[0] != URL_PATTERN_ANY_MATCH) {
            domainRegexpString += hostServerPatterns[0];
          } else { // Any host server on the domain
            domainRegexpString += URL_DOMAIN_LABEL_REGULAR_EXPRESSION;
          }
          domainRegexpString += ")\\" + URL_DOMAIN_LABEL_SEPARATOR;
        }
        domainRegexpString +=
          domainData.hostDomain.replaceAll(URL_DOMAIN_LABEL_SEPARATOR, "\\$&")
          + "(?:/|$)";
        this.domainRegExpMap.set(
          domainData.id, new RegExp(domainRegexpString));
        this.siteDataArrayMap.set(domainData.id, new Array());
      }

      deleteDomain(domainId) {
        this.domainRegExpMap.delete(domainId);
        this.siteDataArrayMap.delete(domainId);
      }

      getDomainRegExp(domainId) {
        return this.domainRegExpMap.get(domainId);
      }

      addSite(domainData, siteDataObject) {
        var siteId =
          _createSiteId(
            domainData, siteDataObject.hostServer, siteDataObject.paths);
        var siteDataArray = this.siteDataArrayMap.get(domainData.id);
        var siteData;
        for (let i = 0; i < siteDataArray.length; i++) {
          siteData = siteDataArray[i];
          if (siteId == siteData.id) {
            if (siteDataObject.accessCount != undefined) {
              siteData.toObject().accessCount = siteDataObject.accessCount;
            //} else {
            // Not overwrite existing count if this is called by getSite().
            }
            return siteData;
          }
        }
        if (siteDataObject.accessCount == undefined) {
          // Clear the accessed count only when this is called by getSite().
          siteDataObject.accessCount = 0;
        }
        siteData = new SiteData(domainData.id, siteId, siteDataObject);
        siteDataArray.push(siteData);
        return siteData;
      }

      deleteSite(siteData) {
        var siteDataArray = this.siteDataArrayMap.get(siteData.domainId);
        for (let i = 0; i < siteDataArray.length; i++) {
          if (siteData.id == siteDataArray[i].id) {
            siteDataArray.splice(i, 1);
            break;
          }
        }
      }

      deleteSiteAll() {
        for (const domainId of this.siteDataArrayMap.keys()) {
          this.siteDataArrayMap.set(domainId, new Array());
        }
      }

      forEachSite(callback) {
        this.siteDataArrayMap.forEach((siteDataArray) => {
            siteDataArray.forEach(callback);
          });
      }
    }

    // Array of domain data registered in the current context
    var domainDataArray = new Array();

    // Map of the site data registered for each domain in the current context
    var domainSiteDataMap = new DomainSiteDataMap();

    // Set of IDs for which the domain is enabled in the current context
    var enabledDomainIdSet = new Set();

    /*
     * Returns true if the domain of the specified ID is registered and enabled
     * in the current context.
     */
    function isDomainEnabled(domainId) {
      _checkDomainId(domainId);
      return enabledDomainIdSet.has(domainId);
    }

    /*
     * Returns the language by which the domain of the specified ID registered
     * in the current context is localized.
     */
    function getDomainLanguage(domainId) {
      _checkDomainId(domainId);
      for (const domainData of domainDataArray) {
        if (domainId == domainData.id) {
          return domainData.language;
        }
      }
      return _ExtractNews.SITE_ENGLISH;
    }

    /*
     * Registers the domain of the specified object to the current context.
     */
    function setDomain(domainDataObject) {
      if (domainDataObject == undefined) {
        throw newNullPointerException("domainDataObject");
      }
      var domainId = _createDomainId(domainDataObject.hostDomain);
      if (! domainSiteDataMap.hasDomain(domainId)) {
        var domainData = new DomainData(domainId, domainDataObject);
        domainDataArray.push(domainData);
        domainSiteDataMap.setDomain(domainData);
      }
      if (domainDataObject.enabled) {
        enabledDomainIdSet.add(domainId);
        if (Debug.isLoggingOn()) {
          Debug.dump(
            "\t", domainDataObject.language,
            domainDataObject.hostServerPatterns.join(","),
            domainDataObject.hostDomain);
        }
      } else if (enabledDomainIdSet.has(domainId)) {
        enabledDomainIdSet.delete(domainId);
      }
    }

    /*
     * Removes the domain of the specified ID from the current context.
     */
    function removeDomain(domainId) {
      _checkDomainId(domainId);
      if (domainSiteDataMap.hasDomain(domainId)) {
        for (let i = 0; i < domainDataArray.length; i++) {
          if (domainId == domainDataArray[i].id) {
            domainDataArray.splice(i, 1);
            break;
          }
        }
        domainSiteDataMap.deleteDomain(domainId);
      }
    }

    /*
     * Calls the specified function with each domain data registered in
     * the current context.
     */
    function forEachDomain(callback) {
      domainDataArray.forEach(callback);
    }

    _ExtractNews.isDomainEnabled = isDomainEnabled;
    _ExtractNews.getDomainLanguage = getDomainLanguage;
    _ExtractNews.setDomain = setDomain;
    _ExtractNews.removeDomain = removeDomain;
    _ExtractNews.forEachDomain = forEachDomain;

    // Registers domain data read from the message for the specified language
    // to the current context.

    function _setLocalizedDomains(language, index) {
      splitLocalizedString(language + "SitePrefixes").forEach((sitePrefix) => {
          var paths = splitLocalizedString(sitePrefix + "Paths");
          var commentServerPatterns =
            splitLocalizedString(sitePrefix + "CommentServerPatterns");
          var commentPaths = splitLocalizedString(sitePrefix + "CommentPaths");
          var domainDataObject = {
              name: getLocalizedString(sitePrefix + "Name"),
              language: language,
              hostServerPatterns:
                splitLocalizedString(sitePrefix + "HostServerPatterns"),
              hostDomain: getLocalizedString(sitePrefix + "Domain"),
              enabled: false
            };
          if (paths[0] != "" || paths.length > 1) {
            domainDataObject.paths = paths;
          }
          if (commentServerPatterns[0] != ""
            || commentServerPatterns.length > 1) {
            domainDataObject.commentServerPatterns = commentServerPatterns;
          }
          if (commentPaths[0] != "" || commentPaths.length > 1) {
            domainDataObject.commentPaths = commentPaths;
          }
          if (index == 0) {
            // Set the flag whether the domain is enabled to true initially
            // only for the first language.
            domainDataObject.enabled = true;
          }
          setDomain(domainDataObject);
        });
    }

    splitLocalizedString("SiteLanguages").forEach(_setLocalizedDomains);

    function _getDomainSiteDataObject(domainData, url) {
      var urlHostPath = url.substring(URL_HTTPS_SCHEME.length);
      var urlHostMatch =
        urlHostPath.match(domainSiteDataMap.getDomainRegExp(domainData.id));
      if (urlHostMatch != null) {
        var siteDataObject = {
            hostDomain: domainData.hostDomain
          };
        if (urlHostMatch.length >= 1) {
          siteDataObject.hostServer = urlHostMatch[1];
        }
        if (domainData.paths == undefined) {
          return siteDataObject;
        }
        var urlPath =
          urlHostPath.substring(urlHostPath.indexOf(URL_PATH_SEPARATOR));
        for (const path of domainData.paths) {
          if (urlPath.startsWith(path)
            && (urlPath.length == path.length
              || urlPath.codePointAt(path.length)
                == URL_PATH_SEPARATOR.codePointAt(0))) {
            siteDataObject.path = path;
            return siteDataObject;
          }
        }
      }
      return undefined;
    }

    /*
     * Returns the site data for the specified URL contained in a domain
     * if it's registered in the current context, otherwise, undefined.
     */
    function getSite(url) {
      if (url != undefined) {
        if ((typeof url) != "string") {
          throw newIllegalArgumentException("url");
        } else if (url.startsWith(URL_HTTPS_SCHEME)) {
          for (const domainData of domainDataArray) {
            var siteDataObject = _getDomainSiteDataObject(domainData, url);
            if (siteDataObject != undefined) {
              return domainSiteDataMap.addSite(domainData, siteDataObject);
            }
          }
        }
      }
      return undefined;
    }

    /*
     * Registers the site of the specified data object to the current context
     * and returns its data.
     */
    function addSite(siteDataObject) {
      if (siteDataObject == undefined) {
        throw newNullPointerException("siteDataObject");
      }
      var domainId = _createDomainId(siteDataObject.hostDomain);
      for (const domainData of domainDataArray) {
        if (domainId == domainData.id) {
          var siteData = domainSiteDataMap.addSite(domainData, siteDataObject);
          if (Debug.isLoggingOn()) {
            Debug.dump("\t", siteData.accessCount, siteData.url);
          }
          return siteData;
        }
      }
      return undefined;
    }

    /*
     * Deletes the site of the specified data from the current context.
     */
    function deleteSite(siteData) {
      if (siteData == undefined) {
        throw newNullPointerException("siteData");
      } else if (domainSiteDataMap.hasDomain(siteData.domainId)) {
        domainSiteDataMap.deleteSite(siteData);
      }
    }

    /*
     * Calls the specified function with each site data registered in
     * the current context.
     */
    function forEachSite(callback) {
      domainSiteDataMap.forEachSite(callback);
    }

    _ExtractNews.getSite = getSite;
    _ExtractNews.addSite = addSite;
    _ExtractNews.deleteSite = deleteSite;
    _ExtractNews.forEachSite = forEachSite;

    /*
     * Registers the site data for each domain to the current context.
     */
    function setDomainSites() {
      domainDataArray.forEach((domainData) => {
          var siteDataObjects = new Array();
          var hostServerPatterns = domainData.hostServerPatterns;
          if (hostServerPatterns.length > 1) {
            if (hostServerPatterns[0] != URL_PATTERN_NON_EXISTENCE) {
              // Add the site data of host servers specified for the domain.
              for (let i = 0; i < hostServerPatterns.length; i++) {
                siteDataObjects.push({
                    hostServer: hostServerPatterns[i],
                    hostDomain: domainData.hostDomain
                  });
              }
            } else { // No host server for the domain top like "slashdot.org"
              siteDataObjects.push({
                  hostDomain: domainData.hostDomain
                });
            }
          } else if (hostServerPatterns[0] != URL_PATTERN_NON_EXISTENCE) {
            if (hostServerPatterns[0] != URL_PATTERN_ANY_MATCH) {
              if (domainData.paths != undefined) {
                // Add the site data of a host server and directory paths
                // specified for the domain.
                domainData.paths.forEach((path) => {
                    siteDataObjects.push({
                        hostServer: hostServerPatterns[0],
                        hostDomain: domainData.hostDomain,
                        path: path
                      });
                  });
              } else { // A host server specified for the domain
                siteDataObjects.push({
                    hostServer: hostServerPatterns[0],
                    hostDomain: domainData.hostDomain
                  });
              }
            } else { // Any host server on the domain
              siteDataObjects.push({
                  hostServer: URL_DEFAULT_HOST_SERVER,
                  hostDomain: domainData.hostDomain
                });
            }
          } else { // No host server on the domain
            siteDataObjects.push({
                hostDomain: domainData.hostDomain
              });
          }
          // Never print the debug message for default sites on each domain
          var debugOn = Debug.isLoggingOn();
          ExtractNews.setDebugMode(false);
          siteDataObjects.forEach((siteDataObject) => {
              siteDataObject.accessCount = 0;
              addSite(siteDataObject);
            });
          ExtractNews.setDebugMode(debugOn);
        });
    }

    /*
     * Clears the site data for each domain from the current context.
     */
    function clearDomainSites() {
      domainSiteDataMap.deleteSiteAll();
    }

    _ExtractNews.setDomainSites = setDomainSites;
    _ExtractNews.clearDomainSites = clearDomainSites;

    /*
     * Reads the enabled site which contains the specified URL from the storage
     * and returns the promise fulfilled with it if exists.
     */
    function readEnabledSite(url) {
      var siteData = getSite(url);
      if (siteData != undefined) {
        var domainEnabledKey =
          _createDomainId(siteData.hostDomain) + _ExtractNews.ENABLED_KEY;
        return readStorage(domainEnabledKey).then((items) => {
            var enabled = items[domainEnabledKey];
            if (enabled | enabled == undefined) {
              return Promise.resolve(siteData);
            }
          });
      }
      return Promise.resolve();
    }

    _ExtractNews.readEnabledSite = readEnabledSite;


    function _forEachHostServerUrlPatterns(
      callback, hostServerPattern, hostDomain, paths) {
      var urlHost = URL_HTTPS_SCHEME;
      if (hostServerPattern != URL_PATTERN_NON_EXISTENCE) {
        urlHost += hostServerPattern + URL_DOMAIN_LABEL_SEPARATOR;
      }
      urlHost += hostDomain;
      if (paths != undefined) {
        paths.forEach((path) => {
            callback(
              urlHost + path + URL_PATH_SEPARATOR + URL_PATTERN_ANY_MATCH);
          });
      } else {
        callback(urlHost + URL_PATH_SEPARATOR + URL_PATTERN_ANY_MATCH);
      }
    }

    /*
     * Returns the array of URL patterns whose news sites are contained
     * in the domain set and enabled in the current context.
     */
    function getEnabledSiteUrlPatterns() {
      var enabledSiteUrlPatterns = new Array();
      domainDataArray.forEach((domainData) => {
          if (enabledDomainIdSet.has(domainData.id)) {
            domainData.hostServerPatterns.forEach((hostServerPattern) => {
                _forEachHostServerUrlPatterns((urlPattern) => {
                    enabledSiteUrlPatterns.push(urlPattern);
                  },
                  hostServerPattern, domainData.hostDomain,
                  domainData.paths);
              });
          }
        });
      return enabledSiteUrlPatterns;
    }

    /*
     * Returns the array of URL patterns whose comment sites are contained
     * in the domain set and enabled in the current context.
     */
    function getEnabledCommentSiteUrlPatterns() {
      var enabledCommentSiteUrlPatterns = new Array();
      domainDataArray.forEach((domainData) => {
          if (enabledDomainIdSet.has(domainData.id)) {
            var commentServerPatterns = domainData.commentServerPatterns;
            if (commentServerPatterns != undefined) {
              commentServerPatterns.forEach((commentServerPattern) => {
                  _forEachHostServerUrlPatterns((urlPattern) => {
                      enabledCommentSiteUrlPatterns.push(urlPattern);
                    },
                    commentServerPattern, domainData.hostDomain,
                    domainData.commentPaths);
                });
            }
          }
        });
      return enabledCommentSiteUrlPatterns;
    }

    _ExtractNews.getEnabledSiteUrlPatterns = getEnabledSiteUrlPatterns;
    _ExtractNews.getEnabledCommentSiteUrlPatterns =
      getEnabledCommentSiteUrlPatterns;


    // Target names to accept or drop a news topic or sender by the filtering
    const TARGET_NAME_SET = new Set([
        _ExtractNews.TARGET_ACCEPT,
        _ExtractNews.TARGET_DROP,
        _ExtractNews.TARGET_BREAK
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
    const FILTERING_BREAK = new FilteringTarget({
        name: _ExtractNews.TARGET_BREAK,
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
        case ExtractNews.TARGET_BREAK:
          return FILTERING_BREAK;
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
        this.filtering = {
            categoryName: filtering.categoryName,
            categoryTopics: filtering.categoryTopics,
            policyTargetName: filtering.policyTargetName,
            targets: new Array()
          };
        if (filtering.targetObjects != undefined) {
          filtering.targetObjects.forEach((targetObject) => {
              this.filtering.targets.push(new FilteringTarget(targetObject));
            });
        }
      }

      get categoryName() {
        return this.filtering.categoryName;
      }

      setCategoryName(categoryName) {
        if (categoryName == undefined) {
          throw newNullPointerException("categoryName");
        } else if ((typeof categoryName) != "string") {
          throw newIllegalArgumentException("categoryName");
        }
        return this.filtering.categoryName = categoryName;
      }

      get categoryTopics() {
        return this.filtering.categoryTopics;
      }

      setCategoryTopics(categoryTopics) {
        if (! Array.isArray(categoryTopics)) {
          throw newIllegalArgumentException("categoryTopics");
        }
        this.filtering.categoryTopics = categoryTopics;
      }

      get policyTarget() {
        return newFilteringTarget(this.filtering.policyTargetName);
      }

      setPolicyTarget(targetName) {
        var policyTargetName = targetName.toUpperCase();
        _checkTargetName(policyTargetName);
        this.filtering.policyTargetName = policyTargetName;
      }

      get targets() {
        if (this.filtering.targets != undefined) {
          return this.filtering.targets;
        }
        return new Array();
      }

      setTargets(targets) {
        if (! Array.isArray(targets)) {
          throw newIllegalArgumentException("targets");
        }
        this.filtering.targets = targets;
      }

      toObject() {
        var filteringObject = {
            categoryName: this.filtering.categoryName,
            categoryTopics: this.filtering.categoryTopics,
            policyTargetName: this.filtering.policyTargetName,
            targetObjects: new Array()
          };
        if (this.filtering.targets != undefined) {
          this.filtering.targets.forEach((target) => {
              filteringObject.targetObjects.push(target.toObject());
            });
        }
        return filteringObject;
      }
    }

    /*
     * Returns the setting of an empty filtering.
     */
    function newFiltering() {
      return new Filtering({
          categoryName: "",
          categoryTopics: undefined,
          policyTargetName: _ExtractNews.TARGET_BREAK
        });
    }

    _ExtractNews.Filtering = Filtering;
    _ExtractNews.newFiltering = newFiltering;


    /*
     * The selection to display news topics and/or senders.
     */
    class Selection {
      constructor(selection) {
        if (selection == undefined) {
          throw newNullPointerException("selection");
        }
        this.selection = selection;
      }

      get settingName() {
        return this.selection.settingName;
      }

      set settingName(name) {
        if (name == undefined) {
          throw newNullPointerException("name");
        } else if ((typeof name) != "string") {
          throw newIllegalArgumentException("name");
        }
        return this.selection.settingName = name;
      }

      get topicRegularExpression() {
        return this.selection.topicRegularExpression;
      }

      set topicRegularExpression(regexpString) {
        _checkRegularExpression(regexpString);
        this.selection.topicRegularExpression = regexpString;
      }

      get senderRegularExpression() {
        return this.selection.senderRegularExpression;
      }

      set senderRegularExpression(regexpString) {
        _checkRegularExpression(regexpString);
        this.selection.senderRegularExpression = regexpString;
      }

      get openedUrl() {
        return this.selection.openedUrl;
      }

      set openedUrl(url) {
        if (url == undefined) {
          throw newNullPointerException("url");
        } else if ((typeof url) != "string") {
          throw newIllegalArgumentException("url");
        } else if (url == "") {
          throw newEmptyStringException("url");
        }
        return this.selection.openedUrl = url;
      }

      toObject() {
        return this.selection;
      }
    }

    /*
     * Returns the empty setting to select news topics and/or senders.
     */
    function newSelection() {
      return new Selection({
          settingName: "",
          topicRegularExpression: "",
          senderRegularExpression: "",
          openedUrl: ""
        });
    }

    _ExtractNews.Selection = Selection;
    _ExtractNews.newSelection = newSelection;

    return _ExtractNews;
  })();

const Debug = ExtractNews.Debug;
