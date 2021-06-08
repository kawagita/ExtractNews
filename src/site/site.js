/*
 *  Define the class to display news topics and/or senders arranged on a site.
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
 * The site on which news topics and/or senders are displayed by the selector.
 */
ExtractNews.Site = (() => {
    const _Site = { };

    var newsSelector = undefined;
    var newsOpenedUrl = "";
    var newsTopicWordSet = new Set();
    var newsDesigns = new Array();
    var newsDisplayOptions = {
        newsCommentHidden: false,
        newsFilteringDisabled: false,
        newsSelectionDisabled: false
      };
    var newsReadyStateSet = undefined;

    /*
     * Returns the selector which settle to show or hide news topics and/or
     * senders on this site.
     */
    function getNewsSelector() {
      return newsSelector;
    }

    /*
     * Sets the specified selector which settle to show or hide news topics
     * and/or senders into this site.
     */
    function setNewsSelector(selector) {
      if (selector == undefined) {
        throw newNullPointerException("selector");
      }
      newsSelector = selector;
    }

    _Site.getNewsSelector = getNewsSelector;
    _Site.setNewsSelector = setNewsSelector;

    /*
     * Sets the specified opened URL of news selections on this site.
     */
    function setNewsOpenedUrl(openedUrl) {
      if (openedUrl == undefined) {
        throw newNullPointerException("openedUrl");
      }
      newsOpenedUrl = openedUrl;
    }

    _Site.setNewsOpenedUrl = setNewsOpenedUrl;

    /*
     * Returns the object of options to display news items on this site.
     */
    function getNewsDisplayOptions() {
      return newsDisplayOptions;
    }

    _Site.getNewsDisplayOptions = getNewsDisplayOptions;

    /*
     * Sets the specified news design into this site.
     */
    function setNewsDesign(design) {
      if (design == undefined) {
        throw newNullPointerException("design");
      }
      newsDesigns.push(design);
    }

    /*
     * Sets news designs of the specified variable into this site.
     */
    function setNewsDesigns(...designs) {
      if (designs == undefined) {
        throw newNullPointerException("designs");
      }
      designs.forEach(setNewsDesign);
    }

    _Site.setNewsDesign = setNewsDesign;
    _Site.setNewsDesigns = setNewsDesigns;

    /*
     * Adds the specified topic to the set of topics word this site.
     */
    function addNewsTopicWord(topicWord) {
      if (topicWord == undefined) {
        throw newNullPointerException("topicWord");
      } else if (topicWord != "") {
        newsTopicWordSet.add(topicWord);
      }
    }

    /*
     * Adds topics of the specified array to the set of topics word this site.
     */
    function addNewsTopicWords(topicWords) {
      if (topicWords == undefined) {
        throw newNullPointerException("topicWords");
      } else if (! Array.isArray(topicWords)) {
        throw newIllegalArgumentException("topicWords");
      }
      topicWords.forEach(addNewsTopicWord);
    }

    _Site.addNewsTopicWord = addNewsTopicWord;
    _Site.addNewsTopicWords = addNewsTopicWords;

    function _arrangeNewsDesigns() {
      const arrangingPromises = new Array();
      if (newsSelector != undefined) {
        newsDesigns.forEach((newsDesign) => {
            if (newsDesign.hasComments != undefined
              && newsDesign.hasComments()) {
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
            arrangingPromises.push(newsDesign.arrange());
          });
      }
      return Promise.all(arrangingPromises);
    }

    function _changeNewsDisplaying(message) {
      Debug.printMessage(
        "Receive the command " + message.command.toUpperCase() + ".");
      switch (message.command) {
      case ExtractNews.COMMAND_SETTING_APPLY:
        if (message.newsFilteringTargetObjects != undefined) {
          newsDesigns.forEach((newsDesign) => {
              newsDesign.reset();
            });
          newsSelector.setNewsFilterings(message.newsFilteringTargetObjects);
          newsDisplayOptions.newsCommentHidden = message.newsCommentHidden;
          newsDisplayOptions.newsFilteringDisabled =
            message.newsFilteringDisabled;
          Debug.printProperty(
            "Comment Hidden", String(message.newsCommentHidden));
          Debug.printProperty(
            "Filtering Disabled", String(message.newsFilteringDisabled));
        }
        newsSelector.setNewsSelection(
          message.newsSelectedTopicRegularExpression,
          message.newsSelectedSenderRegularExpression,
          message.newsExcludedRegularExpression);
        Debug.printProperty(
          "Selected Topic", message.newsSelectedTopicRegularExpression);
        Debug.printProperty(
          "Selected Sender", message.newsSelectedSenderRegularExpression);
        Debug.printProperty(
          "Exclusion", message.newsExcludedRegularExpression);
        break;
      case ExtractNews.COMMAND_SETTING_SWITCH:
        if (message.newsCommentHidden == newsDisplayOptions.newsCommentHidden
          && message.newsFilteringDisabled
            == newsDisplayOptions.newsFilteringDisabled
          && message.newsSelectionDisabled
            == newsDisplayOptions.newsSelectionDisabled) {
          Debug.printMessage("Keep the same arrangement.");
          return;
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
        break;
      case ExtractNews.COMMAND_SETTING_DISPOSE:
        if (newsSelector != undefined) {
          newsSelector.setNewsFilterings();
          newsSelector.setNewsSelection();
          newsDisplayOptions.newsCommentHidden = false;
          newsDisplayOptions.newsFilteringDisabled = false;
          newsDisplayOptions.newsSelectionDisabled = false;
          Debug.printMessage("Disabling this site.");
        }
        break;
      }
      _arrangeNewsDesigns().then(() => {
          if (message.command == ExtractNews.COMMAND_SETTING_DISPOSE) {
            browser.runtime.onMessage.removeListener(_changeNewsDisplaying);
            newsSelector = undefined;
            newsDesigns.forEach((newsDesign) => {
                newsDesign.clear();
              });
            newsDesigns = undefined;
            newsTopicWordSet = undefined;
          }
        }).catch((error) => {
          Debug.printStackTrace(error);
        });
    }

    browser.runtime.onMessage.addListener(_changeNewsDisplaying);

    function _setNewsDisplaying(event) {
      if (newsReadyStateSet == undefined
        || newsReadyStateSet.has(event.target.readyState)) {
        if (newsReadyStateSet != undefined) {
          document.removeEventListener("readystatechange", _setNewsDisplaying);
          newsReadyStateSet = undefined;
          Debug.printMessage(
            "Display news designs by the event "
            + document.readyState.toUpperCase() + ".");
        } else {
          Debug.printMessage("Display news designs immediately.");
        }
        const displayingPromises = new Array();
        newsDesigns.forEach((newsDesign) => {
            displayingPromises.push(newsDesign.display());
          });
        Promise.all(displayingPromises).then(() => {
            var newsTopicWordsString = Array.from(newsTopicWordSet).join(",");
            Debug.printProperty("Opened URL", newsOpenedUrl);
            Debug.printProperty("Topic Words", newsTopicWordsString);
            ExtractNews.sendRuntimeMessage({
                command: ExtractNews.COMMAND_SETTING_REQUEST,
                openedUrl: newsOpenedUrl,
                topicWordsString: newsTopicWordsString
              });
          }).catch((error) => {
            Debug.printStackTrace(error);
          });
      }
    }

    /*
     * Displays news designs arranged by the selector on this site.
     */
    function displayNewsDesigns(readyStateSet) {
      if (readyStateSet == undefined) {
        throw newNullPointerException("readyStateSet");
      } else if (newsSelector == undefined) {
        throw newUnsupportedOperationException();
      }
      if (! readyStateSet.has(document.readyState)) {
        newsReadyStateSet = readyStateSet;
        document.addEventListener("readystatechange", _setNewsDisplaying);
      } else { // "interactive" or "complete"
        _setNewsDisplaying();
      }
    }

    _Site.displayNewsDesigns = displayNewsDesigns;

    ExtractNews.getDebugMode();

    window.addEventListener("beforeunload", (event) => {
        newsDesigns.forEach((newsDesign) => {
          newsDesign.clear();
        });
      });

    return _Site;
  })();

const Site = ExtractNews.Site;
