/*
 *  Define classes to display news topics or senders arranged on a site.
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

/*
 * The selector whether to show or hide news topics or senders on the site.
 */
class NewsSelector {
  constructor() {
  }

  drop(newsTopicString) {
    return false;
  }

  select(newsTopicString, newsSenderString) {
    return true;
  }

  exclude(newsTopicString) {
    return false;
  }
}

/*
 * The site on which news topics or senders are displayed by the selector.
 */
ExtractNews.Site = (() => {
    // The information of top page on this site to arrange news topics.
    var newsSitePage = undefined;

    {
      var newsSitePages = ExtractNews.getNewsSitePages();
      for (let i = 0; i < newsSitePages.length; i++) {
        if (newsSitePages[i].containsUrl(document.URL)) {
          newsSitePage = newsSitePages[i];
          break;
        }
      }
    }

    const _Site = {
        isNewsArranged: () => {
            return newsSitePage != undefined;
          }
      };

    if (newsSitePage == undefined) {
      // Never apply the setting if news site is not used by this locale
      // but sends the request to suspend it on the same tab.
      browser.runtime.onMessage.addListener((message) => {
          if (message.command == ExtractNews.COMMAND_SETTING_DISPOSE) {
            Debug.printMessage(
              "Receive the command "
              + ExtractNews.COMMAND_SETTING_DISPOSE.toUpperCase() + ".");
          }
        });
      ExtractNews.getDebugMode().then(() => {
          return ExtractNews.sendRuntimeMessage({
              command: ExtractNews.COMMAND_SETTING_REQUEST,
              openedUrl: ""
            });
        }).catch((error) => {
          Debug.printStackTrace(error);
        });
      return _Site;
    }

    var newsDesigns = new Array();
    var newsTopicWordSet = new Set();

    const ID = newsSitePage.getSiteId();
    const LANGUAGE = ExtractNews.getNewsSiteLanguage(ID);

    _Site.LANGUAGE = LANGUAGE;

    const DOMAIN = newsSitePage.getDomain();
    const ROOT_DIRECTORY_PATH =
      ExtractNews.getLocalizedString(ID + "UrlRootDirectoryPath");
    const PATH_DIRECTORY_REGEXP = new RegExp(/^\/(?:index.html?)?$/);
    const PATH_HTML_DOCUMENT_REGEXP = new RegExp(/[^/]+\.html?$/);

    /*
     * The object to parse the URL into a host server, path, and query,
     * opened by news selection on this site.
     */
    class OpenedUrlParser {
      constructor(url) {
        if (url == undefined) {
          throw newNullPointerException("url");
        } else if ((typeof url) != "string") {
          throw newIllegalArgumentException("url");
        }
        this.url = url;
        this.urlPathParsed = false;
        this.urlParams = { path: "" };
      }

      /*
       * Parses the host name on this site in the current position of URL.
       */
      parseHostName() {
        if (this.urlParams.hostServer != undefined) {
          return false;
        }
        var hostPath;
        var hostServer = "";
        var relativePath = undefined;
        if (this.url.startsWith(URL_HTTPS_SCHEME)) {
          hostPath = this.url.substring(URL_HTTPS_SCHEME.length);
        } else if (this.url.startsWith("//")) {
          hostPath = this.url.substring(2);
        } else if (this.url.startsWith("/")) {
          var domainIndex = document.URL.indexOf(DOMAIN);
          if (domainIndex > 1) {
            hostServer =
              document.URL.substring(URL_HTTPS_SCHEME.length, domainIndex - 1);
          }
          relativePath = this.url;
        } else {
          return false;
        }
        if (relativePath == undefined) {
          if (hostPath.startsWith(DOMAIN)) {
            relativePath = hostPath.substring(DOMAIN.length);
          } else {
            var domainIndex = hostPath.indexOf(".") + 1;
            var domainPath = hostPath.substring(domainIndex);
            if (! domainPath.startsWith(DOMAIN)) {
              return false;
            }
            hostServer = hostPath.substring(0, domainIndex - 1);
            relativePath = domainPath.substring(DOMAIN.length);
          }
        }
        if (relativePath == "" || relativePath.startsWith("/")) {
          if (relativePath != "") {
            var fragmentIndex = relativePath.indexOf("#");
            if (fragmentIndex >= 0) {
              relativePath = relativePath.substring(0, fragmentIndex);
            }
            var queryIndex = relativePath.indexOf("?");
            if (queryIndex >= 0) {
              relativePath = relativePath.substring(0, queryIndex);
            }
          }
          this.urlParams.hostServer = hostServer;
          this.urlParams.relativePath = relativePath;
          if (ROOT_DIRECTORY_PATH == "") {
            this.urlPathParsed = true;
          }
          return true;
        }
        return false;
      }

      _parsePath(path) {
        var relativePath = this.urlParams.relativePath.substring(path.length);
        if (relativePath == "" || relativePath.startsWith("/")) {
          this.urlParams.path += path;
          this.urlParams.relativePath = relativePath;
          return true;
        }
        return false;
      }

      /*
       * Parses the root directory on this site in the current position of URL.
       */
      parseRootDirectory() {
        if (this.urlParams.relativePath != undefined
          && this.urlParams.relativePath.startsWith(ROOT_DIRECTORY_PATH)) {
          if (this._parsePath(ROOT_DIRECTORY_PATH)) {
            this.urlPathParsed = true;
            return true;
          }
        }
        return false;
      }

      /*
       * Parses the specified path in the current position of URL.
       */
      parse(path) {
        if (path == undefined) {
          throw newNullPointerException("path");
        } else if ((typeof path) != "string") {
          throw newIllegalArgumentException("path");
        } else if (path == "/") {
          throw newInvalidParameterException(path);
        } else if (path != "" && this.urlPathParsed) {
          if (path.endsWith("/")) {
            path = path.substring(0, path.length - 1);
          }
          if (this.urlParams.relativePath.startsWith(path)) {
            return this._parsePath(path);
          }
        }
        return false;
      }

      /*
       * Parses a path from the specified array in the current position of URL.
       */
      parseFrom(paths) {
        if (! Array.isArray(paths)) {
          throw newIllegalArgumentException("paths");
        }
        for (let i = 0; i < paths.length; i++) {
          if (this.parse(paths[i])) {
            return true;
          }
        }
        return false;
      }

      /*
       * Parses the directory in the current position of URL.
       */
      parseDirectory() {
        if (this.urlPathParsed) {
          var directoryMatch =
            this.urlParams.relativePath.match(PATH_DIRECTORY_REGEXP);
          if (directoryMatch != null) {
            return this._parsePath(directoryMatch[0]);
          }
        }
        return false;
      }

      /*
       * Parses the directory hierarchy in the current position of URL.
       */
      parseDirectoryHierarchy() {
        if (this.urlPathParsed) {
          var lastPathIndex = this.urlParams.relativePath.lastIndexOf("/");
          if (lastPathIndex >= 0) {
            return this._parsePath(
              this.urlParams.relativePath.substring(0, lastPathIndex));
          }
        }
        return false;
      }

      /*
       * Parses the path to the last from the current position of URL.
       */
      parseAll() {
        if (this.urlPathParsed) {
          return this._parsePath(this.urlParams.relativePath);
        }
        return false;
      }

      /*
       * Returns the array into which String.match() stores the result
       * of matching the path in the current position of URL against
       * the specified regular expression.
       */
      match(pathRegexp) {
        if (pathRegexp == undefined) {
          throw newNullPointerException("pathRegexp");
        }
        if (this.urlPathParsed) {
          return this.urlParams.relativePath.match(pathRegexp);
        }
        return null;
      }

      /*
       * Returns the array into which String.match() stores the result
       * of matching the path in the current position of URL against
       * /[^/]+\.html?$/.
       */
      matchHtmlDocument() {
        return this.match(PATH_HTML_DOCUMENT_REGEXP);
      }

      /*
       * Parses the key and value of query parameters in the URL.
       */
      parseQuery() {
        var queryIndex = this.url.indexOf("?");
        if (queryIndex >= 0) {
          var query = this.url.substring(queryIndex);
          var queryMap = new Map();
          (new URLSearchParams(query)).forEach((queryValue, queryKey) => {
              queryMap.set(queryKey, queryValue);
            });
          this.urlParams.queryMap = queryMap;
          return true;
        }
        return false;
      }

      isCompleted() {
        return this.urlPathParsed && this.urlParams.relativePath == "";
      }

      get hostServer() {
        return this.urlParams.hostServer;
      }

      get path() {
        return this.urlParams.path;
      }

      getQueryValue(queryKey) {
        if (this.urlParams.queryMap != undefined) {
          return this.urlParams.queryMap.get(queryKey);
        }
        return undefined;
      }

      /*
       * Returns the string parsed to the current position of URL.
       */
      toString(queryKeys) {
        if (this.path != "" && this.path != ROOT_DIRECTORY_PATH) {
          var url = URL_HTTPS_SCHEME;
          if (this.hostServer != "") {
            url += this.hostServer + ".";
          }
          url += DOMAIN;
          if (this.path != "/") {
            url += this.path;
            if (! this.path.endsWith("/")
              && this.urlParams.relativePath != "") {
              // Append a slash to the end of directory path.
              url += "/";
            }
          //} else {
          // Never appended a slash to only the host name.
          }
          if (queryKeys != undefined && this.urlParams.queryMap != undefined) {
            var query = "";
            queryKeys.forEach((queryKey) => {
                var queryValue = this.urlParams.queryMap.get(queryKey);
                if (queryValue != undefined) {
                  if (query != "") {
                    query += "&";
                  } else {
                    if (this.path == "/") {
                      // Append a slash to only the host name, see above.
                      query = "/";
                    }
                    query += "?";
                  }
                  query += queryKey + "=" + queryValue;
                }
              });
            url += query;
          }
          return url;
        }
        return undefined;
      }
    }

    _Site.OpenedUrlParser = OpenedUrlParser;

    /*
     * Adds the specified news design into this site.
     */
    function addNewsDesign(newsDesign) {
      if (newsDesign == undefined) {
        throw newNullPointerException("newsDesign");
      }
      newsDesigns.push(newsDesign);
    }

    /*
     * Adds news designs of the specified variable into this site.
     */
    function addNewsDesigns(...newsDesigns) {
      if (! Array.isArray(newsDesigns)) {
        throw newIllegalArgumentException("newsDesigns");
      }
      newsDesigns.forEach(addNewsDesign);
    }

    _Site.addNewsDesign = addNewsDesign;
    _Site.addNewsDesigns = addNewsDesigns;

    const TOPIC_TEXT_ENCLOSING_REGEXP = new RegExp(/^(.+) +\((.+)\)$/);
    const TOPIC_WORD_JOINED_REGEXP =
      ExtractNews.getLocalizedRegExp(LANGUAGE + "TopicWordJoined");

    /*
     * Returns the set of news words gotten from the specified text.
     */
    function getNewsWordSet(newsTopicText) {
      var topicWordSet = new Set();
      var topicTexts = new Array();
      var topicTextMatch = newsTopicText.match(TOPIC_TEXT_ENCLOSING_REGEXP);
      if (topicTextMatch != null) {
        topicTexts.push(topicTextMatch[1], topicTextMatch[2]);
      } else {
        topicTexts.push(newsTopicText);
      }
      topicTexts.forEach((topicText) => {
          do {
            var wordJoinedMatch = topicText.match(TOPIC_WORD_JOINED_REGEXP);
            if (wordJoinedMatch == null) {
              topicWordSet.add(topicText);
              break;
            }
            topicWordSet.add(topicText.substring(0, wordJoinedMatch.index));
            topicText =
              topicText.substring(
                wordJoinedMatch.index + wordJoinedMatch[0].length);
          } while (true);
        });
      return topicWordSet;
    }

    _Site.getNewsWordSet = getNewsWordSet;

    /*
     * Adds the specified news topic word into this site.
     */
    function addNewsTopicWord(newsTopicWord) {
      if (newsTopicWord == undefined) {
        throw newNullPointerException("newsTopicWord");
      } else if (newsTopicWord != "") {
        newsTopicWordSet.add(newsTopicWord);
      }
    }

    /*
     * Adds news topic words of the specified array into this site.
     */
    function addNewsTopicWords(newsTopicWords) {
      if (! Array.isArray(newsTopicWords)) {
        throw newIllegalArgumentException("newsTopicWords");
      }
      newsTopicWords.forEach(addNewsTopicWord);
    }

    _Site.addNewsTopicWord = addNewsTopicWord;
    _Site.addNewsTopicWords = addNewsTopicWords;

    const WORD_SEPARATORS = new Set();

    {
      var wordSeparators =
        ExtractNews.getLocalizedString(LANGUAGE + "WordSeparators");
      for (let i = 0; i < wordSeparators.length; i++) {
        var codePoint = wordSeparators.codePointAt(i);
        if (codePoint > 0xFFFF) {
          i++;
        }
        WORD_SEPARATORS.add(codePoint);
      }
    }

    function _newRegexp(regexpString) {
      if (regexpString != undefined) {
        if ((typeof regexpString) != "string") {
          throw newIllegalArgumentException("Regular Expression");
        } else if (regexpString != "") {
          return new RegExp(regexpString, "i");
        }
      }
      return undefined;
    }

    /*
     * The selector whether to show or hide news topics or senders on the site,
     * in which news topics are dropped by filtering targets.
     */
    class NewsFilteringSelector extends NewsSelector {
      constructor(newsFilteringTargetObjects = new Array()) {
        super();
        this.newsFilteringTargets = new Array();
        newsFilteringTargetObjects.forEach((newsFilteringTargetObject) => {
            var newsFilteringTarget =
              new ExtractNews.FilteringTarget(newsFilteringTargetObject);
            this.newsFilteringTargets.push(newsFilteringTarget);
            if (Debug.isLoggingOn()) {
              Debug.dump("\t", newsFilteringTarget.name,
                (newsFilteringTarget.isWordNegative() ? "! " : "  ")
                + newsFilteringTarget.words.join(","));
            }
          });
        this.newsTopicRegexp = undefined;
        this.newsSenderRegexp = undefined;
        this.newsExcludedRegexp = undefined;
      }

      setNewsSettingRegexp(
        topicRegexpString, senderRegexpString, excludedRegexpString) {
        this.newsTopicRegexp = _newRegexp(topicRegexpString);
        this.newsSenderRegexp = _newRegexp(senderRegexpString);
        this.newsExcludedRegexp = _newRegexp(excludedRegexpString);
      }

      _testTargetWords(target, newsTopicString) {
        var targetResult = ! target.isWordNegative();
        if (target.words.length > 0) {
          let i = 0;
          do {
            var targetWord = target.words[i];
            var targetWordSearchIndex = newsTopicString.indexOf(targetWord);
            if (targetWordSearchIndex >= 0) {
              do {
                var targetWordMatching = true;
                if (target.isWordBeginningMatched()
                  && targetWordSearchIndex >= 1) {
                  var targetWordPrecedingCodePoint =
                    newsTopicString.codePointAt(targetWordSearchIndex - 1);
                  if (targetWordPrecedingCodePoint >= 0xDC00
                    && targetWordPrecedingCodePoint <= 0xDFFF
                    && targetWordSearchIndex >= 2) {
                    targetWordPrecedingCodePoint =
                      newsTopicString.codePointAt(targetWordSearchIndex - 2);
                  }
                  targetWordMatching =
                    WORD_SEPARATORS.has(targetWordPrecedingCodePoint);
                }
                targetWordSearchIndex += targetWord.length;
                if (targetWordMatching
                  && (! target.isWordEndMatched()
                    || targetWordSearchIndex >= newsTopicString.length
                    || WORD_SEPARATORS.has(
                      newsTopicString.codePointAt(targetWordSearchIndex)))) {
                  Debug.printProperty("Match filtering word", targetWord);
                  return targetResult;
                }
                targetWordSearchIndex =
                  newsTopicString.indexOf(targetWord, targetWordSearchIndex);
              } while (targetWordSearchIndex >= 0);
            }
            i++;
          } while (i < target.words.length);
          targetResult = ! targetResult;
        }
        return targetResult;
      }

      drop(newsTopicString) {
        var targetBlockSkipped = false;
        for (let i = 0; i < this.newsFilteringTargets.length; i++) {
          var target = this.newsFilteringTargets[i];
          if (targetBlockSkipped) {
            targetBlockSkipped = ! target.terminatesBlock();
            continue;
          } else if (this._testTargetWords(target, newsTopicString)) {
            if (target.name != ExtractNews.TARGET_RETURN) {
              return target.name == ExtractNews.TARGET_DROP;
            }
            targetBlockSkipped = true;
          }
        }
        // Returns false for the final "RETURN" which is the same as "ACCEPT".
        return false;
      }

      select(newsTopicString, newsSenderString) {
        if (this.newsTopicRegexp != undefined
          && ! this.newsTopicRegexp.test(newsTopicString)) {
          return false;
        }
        if (newsSenderString != undefined) {
          if (this.newsSenderRegexp != undefined
            && ! this.newsSenderRegexp.test(newsSenderString)) {
            return false;
          }
        }
        return true;
      }

      exclude(newsTopicString) {
        return this.newsExcludedRegexp != undefined
          && this.newsExcludedRegexp.test(newsTopicString);
      }
    }

    function _arrangeNewsDesigns(newsSelector, newsDisplayOptions) {
      const arrangingPromises = new Array();
      newsDesigns.forEach((newsDesign) => {
          if (newsDesign.hasComments()) {
            arrangingPromises.push(
              new Promise((resolve) => {
                  var commentNodes = newsDesign.getCommentNodes();
                  if (newsDisplayOptions.newsCommentHidden) {
                    commentNodes.forEach(newsDesign.hideComment);
                    Debug.printMessage("Hide comment nodes.");
                  } else {
                    commentNodes.forEach(newsDesign.showComment);
                    Debug.printMessage("Show comment nodes.");
                  }
                  Debug.printNodes(commentNodes);
                  resolve();
                }));
          }
          arrangingPromises.push(
            newsDesign.arrange(newsSelector, newsDisplayOptions));
        });
      return Promise.all(arrangingPromises);
    }

    function _resetNewsDesigns(disposed = false) {
      newsDesigns.forEach((newsDesign) => {
        newsDesign.reset(disposed);
      });
    }

    /*
     * Displays news designs arranged by the selector on this site.
     */
    function displayNewsDesigns(newsOpenedUrl = "") {
      var newsSelector = undefined;
      var newsDisplayOptions = {
          newsCommentHidden: false,
          newsFilteringDisabled: false,
          newsSelectionDisabled: false
        };

      browser.runtime.onMessage.addListener((message) => {
          Debug.printMessage(
            "Receive the command " + message.command.toUpperCase() + ".");
          switch (message.command) {
          case ExtractNews.COMMAND_SETTING_APPLY:
            if (message.newsFilteringTargetObjects != undefined) {
              newsDisplayOptions.newsCommentHidden = message.newsCommentHidden;
              newsDisplayOptions.newsFilteringDisabled =
                message.newsFilteringDisabled;
              Debug.printProperty(
                "Comment Hidden", String(message.newsCommentHidden));
              Debug.printProperty(
                "Filtering Disabled", String(message.newsFilteringDisabled));
              newsSelector =
                new NewsFilteringSelector(message.newsFilteringTargetObjects);
              _resetNewsDesigns();
            } else if (newsSelector == undefined) {
              throw newUnsupportedOperationException();
            }
            newsSelector.setNewsSettingRegexp(
              message.newsSelectedTopicRegularExpression,
              message.newsSelectedSenderRegularExpression,
              message.newsExcludedRegularExpression);
            Debug.printProperty(
              "Selected Topic", message.newsSelectedTopicRegularExpression);
            Debug.printProperty(
              "Selected Sender", message.newsSelectedSenderRegularExpression);
            Debug.printProperty(
              "Exclusion", message.newsExcludedRegularExpression);
            _arrangeNewsDesigns(
              newsSelector, newsDisplayOptions).catch((error) => {
                Debug.printStackTrace(error);
              });
            break;
          case ExtractNews.COMMAND_SETTING_SWITCH:
            if (newsSelector == undefined) {
              throw newUnsupportedOperationException();
            } else if (message.newsCommentHidden
                == newsDisplayOptions.newsCommentHidden
              && message.newsFilteringDisabled
                == newsDisplayOptions.newsFilteringDisabled
              && message.newsSelectionDisabled
                == newsDisplayOptions.newsSelectionDisabled) {
              Debug.printMessage("Keep the same arrangement.");
              break;
            }
            newsDisplayOptions.newsCommentHidden = message.newsCommentHidden;
            newsDisplayOptions.newsFilteringDisabled =
              message.newsFilteringDisabled;
            newsDisplayOptions.newsSelectionDisabled =
              message.newsSelectionDisabled;
            Debug.printProperty(
              "Comment Hidden", String(message.newsCommentHidden));
            Debug.printProperty(
              "Filtering Disabled", String(message.newsFilteringDisabled));
            Debug.printProperty(
              "Selection Disabled", String(message.newsSelectionDisabled));
            _arrangeNewsDesigns(
              newsSelector, newsDisplayOptions).catch((error) => {
                Debug.printStackTrace(error);
              });
            break;
          case ExtractNews.COMMAND_SETTING_DISPOSE:
            var arrangingPromise = Promise.resolve();
            if (newsSelector != undefined) {
              newsDisplayOptions.newsCommentHidden = false;
              newsDisplayOptions.newsFilteringDisabled = false;
              newsDisplayOptions.newsSelectionDisabled = false;
              newsDisplayOptions.newsDisposed = true;
              newsSelector = undefined;
              arrangingPromise =
                _arrangeNewsDesigns(
                  new NewsFilteringSelector(), newsDisplayOptions);
            }
            arrangingPromise.then(() => {
                _resetNewsDesigns(true);
                Debug.printMessage("Disabling this site.");
              }).catch((error) => {
                Debug.printStackTrace(error);
              });
            break;
          }
        });

      window.addEventListener("beforeunload", (event) => {
          _resetNewsDesigns(true);
        });

      ExtractNews.getDebugMode().then(() => {
          const displayingPromises = new Array();
          newsDesigns.forEach((newsDesign) => {
              displayingPromises.push(newsDesign.display());
            });
          return Promise.all(displayingPromises);
        }).then(() => {
          var newsTopicWordsString = Array.from(newsTopicWordSet).join(",");
          Debug.printProperty("Opened URL", newsOpenedUrl);
          Debug.printProperty("Topic Words", newsTopicWordsString);
          return ExtractNews.sendRuntimeMessage({
              command: ExtractNews.COMMAND_SETTING_REQUEST,
              openedUrl: newsOpenedUrl,
              topicWordsString: newsTopicWordsString
            });
        }).catch((error) => {
          Debug.printStackTrace(error);
        });
    }

    _Site.displayNewsDesigns = displayNewsDesigns;

    return _Site;
  })();

const Site = ExtractNews.Site;
