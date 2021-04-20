/*
 *  Receive the message and dispatch the setting process to content scripts.
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

ExtractNews.Daemon = (() => {
    const _Storage = ExtractNews.Storage;
    const _Text = ExtractNews.Text;
    const _Regexp = ExtractNews.Regexp;
    const _Alert = ExtractNews.Alert;
    const _Popup = ExtractNews.Popup;
    const _Menus = ExtractNews.Menus;
    const _Daemon = { };

    // Count to retain the setting suspended by the disabled or no news site
    const TAB_SETTING_RETAINED_COUNT = 3;

    // Map of settings to select and exclude news topics and/or senders
    // on each tab of news site
    var _tabNewsSettingMap = new Map();

    function _createTabNewsSetting(newsSelection) {
      return {
          siteId: undefined,
          filteringIds: new Array(),
          filteringPolicyTarget:
            ExtractNews.newFilteringTarget(ExtractNews.TARGET_ACCEPT),
          selection: newsSelection,
          excludedRegularExpression: "",
          topicWordsString: undefined,
          suspendedCount: 0
        };
    }

    // Map of flags on each tab of news site
    var _tabFlagsMap = new Map();

    function _createTabFlags() {
      return {
          newsSelectionDisabled: false,
          linkDisabled: false,
          requestRecieved: false,
          applyingSuspended: false
        };
    }

    /*
     * Calls the specified function with the tab and site ID, and flags
     * for each tab.
     */
    function _tabFlagsForEach(callback) {
      _tabFlagsMap.forEach((tabFlags, tabId) => {
          var tabSiteId = undefined;
          var tabNewsSetting = _tabNewsSettingMap.get(tabId);
          if (tabNewsSetting != undefined) {
            tabSiteId = tabNewsSetting.siteId;
          }
          callback(tabId, tabSiteId, tabFlags);
        });
    }

    const SITE_FAVICON_STATUS_LOADING = "loading";
    const SITE_FAVICON_STATUS_CHACHED = "chached";

    // Map of statuses whether the favicon is cached by each news site
    var _newsSiteFaviconStatusMap = new Map();

    // Map of flags whether the comment is hidden by each news site
    var _newsSiteCommentHiddenMap = new Map();

    // Map of message dialogs which has opened by each tab
    var _tabMessageDialogMap = new Map();

    // Sends the specified messeage of a command to a tab of the specified ID
    // and returns the promise.

    function _sendTabMessage(tabId, message) {
      return callAsynchronousAPI(
        browser.tabs.sendMessage, tabId, message).then(() => {
          if (browser.runtime.lastError != undefined) {
            Debug.printMessage(
              "Send Message Error: " + browser.runtime.lastError.message);
          }
          Debug.printMessage(
            "Send the command " + message.command.toUpperCase()
            + " to Tab " + String(tabId) + ".");
          return Promise.resolve();
        });
    }

    // The filtering data of a category applied to specific topics.

    class FilteringData {
      constructor(categoryTopics, targetObjects, policyTarget) {
        if (categoryTopics != null) {
          this.categoryTopicSet = new Set(categoryTopics);
        }
        this._targetObjects = targetObjects;
        this._policyTarget = policyTarget;
      }

      appliesTo(newsTopicWords) {
        if (this.categoryTopicSet != undefined) {
          for (let i = 0; i < newsTopicWords.length; i++) {
            if (this.categoryTopicSet.has(newsTopicWords[i])) {
              return true;
            }
          }
          return false;
        // } else {
        // Apply the filtering data for all topics.
        }
        return true;
      }

      get targetObjects() {
        return this._targetObjects;
      }

      get policyTarget() {
        return this._policyTarget;
      }
    }

    var _newsFilteringIds = new Array();
    var _newsFilteringDataMap = new Map();
    var _newsFilteringDisabled = false;

    /*
     * Loads filterings of news topics and returns the promise.
     */
    function loadNewsFilterings() {
      return _Storage.readNewsFilteringIds().then((filteringIds) => {
          _newsFilteringIds = filteringIds;
          Debug.printMessage(
            "Load the news filtering of " + filteringIds.join(", ") + ".");
          return _Storage.readNewsFilterings(filteringIds);
        }).then((newsFilteringMap) => {
          _newsFilteringDataMap = new Map();
          _newsFilteringIds.forEach((filteringId) => {
              var filtering = newsFilteringMap.get(filteringId);
              var filteringTargetObjects = new Array();
              if (Debug.isLoggingOn()) {
                var categoryTopicsString = "";
                if (filtering.categoryTopics != undefined) {
                  categoryTopicsString = filtering.categoryTopics.join(",");
                  filtering.setCategoryTopics(
                    categoryTopicsString.toLowerCase().split(","));
                }
                Debug.dump("\t", "[" + filteringId + "]");
                Debug.dump("\t", filtering.categoryName, categoryTopicsString);
              }
              filtering.targets.forEach((filteringTarget) => {
                  var filteringTargetWords = filteringTarget.words;
                  if (! filteringTarget.terminatesBlock()
                    && filteringTargetWords.length <= 0) {
                    // Ignore the filtering target if not the end of a block
                    // and has no word which matches news topics.
                    return;
                  }
                  if (Debug.isLoggingOn()) {
                    var wordMatchings = new Array();
                    if (filteringTarget.isWordBeginningMatched()) {
                      wordMatchings.push(ExtractNews.TARGET_WORD_BEGINNING);
                    }
                    if (filteringTarget.isWordEndMatched()) {
                      wordMatchings.push(ExtractNews.TARGET_WORD_END);
                    }
                    if (filteringTarget.isWordNegative()) {
                      wordMatchings.push(ExtractNews.TARGET_WORD_NEGATIVE);
                    }
                    Debug.dump("\t", filteringTarget.name,
                      filteringTargetWords.join(","), wordMatchings.join(","));
                  }
                  filteringTargetObjects.push(filteringTarget.toObject());
                });
              if (Debug.isLoggingOn()) {
                Debug.dump("\t", filtering.policyTarget.name);
              }
              var filteringData =
                new FilteringData(filtering.categoryTopics,
                  filteringTargetObjects, filtering.policyTarget);
              _newsFilteringDataMap.set(filteringId, filteringData);
            });
          return Promise.resolve();
        });
    }

    function _setTabNewsFilterings(tabNewsSetting) {
      var tabUrl = tabNewsSetting.selection.openedUrl;
      tabNewsSetting.filteringIds = new Array();
      for (let i = 0; i < _newsFilteringIds.length; i++) {
        var filteringId = _newsFilteringIds[i];
        var filteringData = _newsFilteringDataMap.get(filteringId);
        if (filteringData.appliesTo(
          tabNewsSetting.topicWordsString.toLowerCase().split(","))) {
          tabNewsSetting.filteringIds.push(filteringId);
          // Set the last target of filterings to the policy target which
          // is accepted or dropped for any word.
          var filteringPolicyTarget = filteringData.policyTarget;
          if (filteringPolicyTarget.name != ExtractNews.TARGET_RETURN) {
            tabNewsSetting.filteringPolicyTarget = filteringPolicyTarget;
            break;
          }
        }
      }
    }

    /*
     * Updates filterings of news topics and returns the promise.
     */
    function updateNewsFilterings() {
      const applyingPromises = new Array();
      return loadNewsFilterings().then(() => {
          _tabNewsSettingMap.forEach((tabNewsSetting, tabId) => {
              _setTabNewsFilterings(tabNewsSetting);
              if (tabNewsSetting.filteringIds.length > 0) {
                Debug.printMessage(
                  "Set the news setting for "
                  + tabNewsSetting.filteringIds.join(", ") + " on Tab "
                  + String(tabId) + ".");
              } else {
                Debug.printMessage(
                  "Clear filterings on Tab " + String(tabId) + ".");
              }
              applyingPromises.push(_applyTabNewsSetting(tabId, true));
            });
          return Promise.all(applyingPromises);
        });
    }

    _Daemon.loadNewsFilterings = loadNewsFilterings;
    _Daemon.updateNewsFilterings = updateNewsFilterings;

    /*
     * Sends the specified flags to display news to tabs of the specified site
     * ID or all tabs if undefined and returns the promise.
     */
    function switchNewsDisplayOptions(newsDisplayOptions) {
      const applyingPromises = new Array();
      if (newsDisplayOptions.newsFilteringDisabled != undefined) {
        _newsFilteringDisabled = newsDisplayOptions.newsFilteringDisabled;
      }
      _tabFlagsForEach((tabId, tabSiteId, tabFlags) => {
          if (tabFlags.requestRecieved && ! tabFlags.applyingSuspended) {
            applyingPromises.push(
              _sendTabMessage(tabId, {
                  command: ExtractNews.COMMAND_SETTING_SWITCH,
                  newsCommentHidden: _newsSiteCommentHiddenMap.get(tabSiteId),
                  newsFilteringDisabled: _newsFilteringDisabled,
                  newsSelectionDisabled: tabFlags.newsSelectionDisabled
                }));
          }
        });
      return Promise.all(applyingPromises);
    }

    /*
     * Sends the specified flags to display news to a tab of the specified ID
     * and returns the promise.
     */
    function switchTabNewsDisplayOptions(tabId, newsDisplayOptions) {
      var tabFlags = _tabFlagsMap.get(tabId);
      if (tabFlags == undefined) {
        tabFlags = _createTabFlags();
        _tabFlagsMap.set(tabId, tabFlags);
      }
      if (newsDisplayOptions.newsSelectionDisabled != undefined) {
        tabFlags.newsSelectionDisabled =
          newsDisplayOptions.newsSelectionDisabled;
      }
      if (tabFlags.requestRecieved && ! tabFlags.applyingSuspended) {
        return _sendTabMessage(tabId, {
            command: ExtractNews.COMMAND_SETTING_SWITCH,
            newsCommentHidden:
              _newsSiteCommentHiddenMap.get(
                _tabNewsSettingMap.get(tabId).siteId),
            newsFilteringDisabled: _newsFilteringDisabled,
            newsSelectionDisabled: tabFlags.newsSelectionDisabled
          });
      }
      return Promise.resolve();
    }

    _Daemon.switchNewsDisplayOptions = switchNewsDisplayOptions;
    _Daemon.switchTabNewsDisplayOptions = switchTabNewsDisplayOptions;

    /*
     * Sends the warning message to the dialog which opened by a tab
     * of the specified ID and returns the promise.
     */
    function sendTabWarningMessage(tabId) {
      var tabMessageDialog = _tabMessageDialogMap.get(tabId);
      if (tabMessageDialog != undefined) {
        var warning = tabMessageDialog.warning;
        return _sendTabMessage(tabMessageDialog.tabId, {
            command: ExtractNews.COMMAND_DIALOG_ALERT,
            message: warning.message,
            description: warning.description,
            emphasisRegularExpression: warning.emphasisRegularExpression
          });
      }
      return Promise.resolve();
    }

    /*
     * Sets the specified warning displayed on the dialog which opened by a tab
     * of the specified ID and returns the promise.
     */
    function setTabMessageDialog(tabId, warning) {
      var tabMessageDialogTabId = undefined;
      var tabMessageDialog = _tabMessageDialogMap.get(tabId);
      if (tabMessageDialog != undefined) {
        tabMessageDialogTabId = tabMessageDialog.tabId;
      }
      return _Popup.openMessageDialog(
        tabId, tabMessageDialogTabId).then((dialogTabId) => {
          _tabMessageDialogMap.set(tabId, {
              tabId: dialogTabId,
              warning: warning
            });
          if (dialogTabId != tabMessageDialogTabId) {
            return Promise.resolve();
          }
          // Send the message to the present dialog if not closed previously.
          return sendTabWarningMessage(tabId);
        });
    }

    /*
     * Removes the message dialog opening by a tab of the specified ID
     * and returns the promise.
     */
    function removeTabMessageDialog(tabId) {
      var tabMessageDialog = _tabMessageDialogMap.get(tabId);
      if (tabMessageDialog != undefined) {
        return _Popup.searchTab(tabMessageDialog.tabId).then((tab) => {
            if (tab != undefined) {
              _tabMessageDialogMap.delete(tab.id);
              return callAsynchronousAPI(browser.tabs.remove, tab.id);
            }
            return Promise.resolve();
          });
      }
      return Promise.resolve();
    }

    _Daemon.sendTabWarningMessage = sendTabWarningMessage;
    _Daemon.setTabMessageDialog = setTabMessageDialog;
    _Daemon.removeTabMessageDialog = removeTabMessageDialog;

    /*
     * Returns the promise fulfilled with the setting to select and exclude
     * news topics and/or senders and flags on the tab of the specified ID
     * if its news site is enabled, otherwise, undefined.
     */
    function activateTabSetting(tabId) {
      var activatingPromise;
      var tabFlags = _tabFlagsMap.get(tabId);
      if (tabFlags != undefined) {
        activatingPromise = Promise.resolve(tabFlags);
      } else {
        activatingPromise =
          _Popup.getTab(tabId).then((tab) => {
              var newsSite = ExtractNews.getNewsSite(tab.url);
              if (newsSite != undefined
                && ExtractNews.isNewsSiteEnabled(newsSite.id)) {
                tabFlags = _createTabFlags();
                _tabFlagsMap.set(tabId, tabFlags);
              }
              return Promise.resolve(tabFlags);
            });
      }
      return activatingPromise.then((activatedTabFlags) => {
          var tabSetting = undefined;
          if (activatedTabFlags != undefined) {
            tabSetting = {
                newsExcludedRegularExpression: "",
                newsSelectionSettingName: "",
                newsSelectedTopicRegularExpression: "",
                newsSelectedSenderRegularExpression: "",
                newsSelectionDisabled: activatedTabFlags.newsSelectionDisabled,
                newsCommentHidden: false,
                linkDisabled: activatedTabFlags.linkDisabled,
                applyingSuspended: activatedTabFlags.applyingSuspended
              };
            if (activatedTabFlags.requestRecieved) {
              var tabNewsSetting = _tabNewsSettingMap.get(tabId);
              tabSetting.newsSelectionSettingName =
                tabNewsSetting.selection.settingName;
              tabSetting.newsSelectedTopicRegularExpression =
                tabNewsSetting.selection.topicRegularExpression;
              tabSetting.newsSelectedSenderRegularExpression =
                tabNewsSetting.selection.senderRegularExpression;
              tabSetting.newsExcludedRegularExpression =
                tabNewsSetting.excludedRegularExpression;
              tabSetting.newsCommentHidden =
                _newsSiteCommentHiddenMap.get(tabNewsSetting.siteId);
            }
          }
          return Promise.resolve(tabSetting);
        });
    }

    /*
     * Removes the setting to select and exclude news topics and/or senders
     * and flags on a tab of the specified ID.
     */
    function removeTabSetting(tabId) {
      var tabFlags = _tabFlagsMap.get(tabId);
      if (tabFlags != undefined) {
        if (tabFlags.requestRecieved) {
          var tabNewsSetting = _tabNewsSettingMap.get(tabId);
          var faviconId =
            ExtractNews.getNewsSiteFaviconId(
              tabNewsSetting.siteId, tabNewsSetting.selection.openedUrl);
          var faviconStatus = _newsSiteFaviconStatusMap.get(faviconId);
          if (faviconStatus == SITE_FAVICON_STATUS_LOADING) {
            // Remove zombie "loading" of a favicon for the specified ID when
            // the promise is rejected or tab is closed before completing. Even
            // if loading by the other tab, "cached" is overwritten.
            _newsSiteFaviconStatusMap.delete(faviconId);
          }
          _tabNewsSettingMap.delete(tabId);
          Debug.printMessage(
            "Remove the news setting on Tab " + String(tabId) + ".");
        }
        _tabFlagsMap.delete(tabId);
      }
    }

    _Daemon.activateTabSetting = activateTabSetting;
    _Daemon.removeTabSetting = removeTabSetting;

    // Sends the message of settings to select and exclude news topics and/or
    // senders applied to a tab of the specified ID and returns the promise.

    function _applyTabNewsSetting(tabId, tabUpdated = false) {
      var tabNewsSetting = _tabNewsSettingMap.get(tabId);
      if (tabNewsSetting == undefined) {
        return Promise.resolve();
      }
      var message = {
          command: ExtractNews.COMMAND_SETTING_APPLY,
          newsSelectedTopicRegularExpression:
            tabNewsSetting.selection.topicRegularExpression,
          newsSelectedSenderRegularExpression:
            tabNewsSetting.selection.senderRegularExpression,
          newsExcludedRegularExpression:
            tabNewsSetting.excludedRegularExpression
        };
      if (tabUpdated) {
        message.newsCommentHidden =
          _newsSiteCommentHiddenMap.get(tabNewsSetting.siteId);
        message.newsFilteringDisabled = _newsFilteringDisabled;
        message.newsFilteringTargetObjects = new Array();
        tabNewsSetting.filteringIds.forEach((filteringId) => {
            var filteringData = _newsFilteringDataMap.get(filteringId);
            filteringData.targetObjects.forEach((filteringTargetObject) => {
                message.newsFilteringTargetObjects.push(filteringTargetObject);
              });
          });
        message.newsFilteringTargetObjects.push(
          tabNewsSetting.filteringPolicyTarget.toObject());
      }
      return _sendTabMessage(tabId, message).then(() => {
          return _Popup.getWindowActiveTab();
        }).then((tab) => {
          if (tab != undefined && tab.id == tabId) {
            return activateTabSetting(tabId);
          }
          return Promise.resolve();
        }).then((tabSetting) => {
          if (tabSetting != undefined) {
            if (tabUpdated) {
              return Menus.updateContextMenus(tabSetting);
            }
            return _Menus.updateTabNewsSettingContextMenus(tabSetting);
          }
          return Promise.resolve();
        });
    }

    /*
     * Creates and sends the setting to select and exclude news topics and/or
     * senders to the specified tab if loaded completely on an enabled site
     * and returns the promise.
     */
    function requestTabNewsSetting(tab, openedUrl, topicWordsString) {
      const applyingPromises = Array.of(removeTabMessageDialog(tab.id));
      var tabFlags = _tabFlagsMap.get(tab.id);
      if (tabFlags != undefined) {
        tabFlags.applyingSuspended = true;
      }
      var tabNewsSetting = _tabNewsSettingMap.get(tab.id);
      var newsSite = ExtractNews.getNewsSite(tab.url);
      if (newsSite == undefined
        || ! ExtractNews.isNewsSiteEnabled(newsSite.id)) {
        if (tabNewsSetting != undefined) {
          if (tabNewsSetting.suspendedCount >= TAB_SETTING_RETAINED_COUNT) {
            // Remove the setting suspended on the specified tab
            applyingPromises.push(removeTabSetting(tab.id));
          } else {
            tabNewsSetting.suspendedCount++;
          }
        }
        // Dispose the resource to arrange news items for the disabled site.
        applyingPromises.push(
          _sendTabMessage(tab.id, {
              command: ExtractNews.COMMAND_SETTING_DISPOSE
            }));
        return Promise.all(applyingPromises);
      }
      var newsSelection;

      if (tabNewsSetting != undefined) {
        // Take the news setting from the map for the specified tab which
        // has already been opened.
        newsSelection = tabNewsSetting.selection;
      } else {
        newsSelection = ExtractNews.newSelection();
        tabNewsSetting = _createTabNewsSetting(newsSelection);
        if (tabFlags == undefined) {
          tabFlags = _createTabFlags();
          _tabFlagsMap.set(tab.id, tabFlags);
        }
        var openerTabNewsSetting = _tabNewsSettingMap.get(tab.openerTabId);
        if (openerTabNewsSetting != undefined) {
          // Set the news setting copied from the opener tab.
          var openerTabNewsSelection = openerTabNewsSetting.selection;
          tabNewsSetting.siteId = openerTabNewsSetting.siteId;
          tabNewsSetting.filteringIds = openerTabNewsSetting.filteringIds;
          tabNewsSetting.filteringPolicyTarget =
            openerTabNewsSetting.filteringPolicyTarget;
          tabNewsSetting.excludedRegularExpression =
            openerTabNewsSetting.excludedRegularExpression;
          newsSelection.settingName = openerTabNewsSelection.settingName;
          newsSelection.topicRegularExpression =
            openerTabNewsSelection.topicRegularExpression;
          newsSelection.senderRegularExpression =
            openerTabNewsSelection.senderRegularExpression;
          newsSelection.openedUrl = openerTabNewsSelection.openedUrl;
        //} else {
        // Set an empty setting of a tab opened at present.
        }
        _tabNewsSettingMap.set(tab.id, tabNewsSetting);
      }
      if (openedUrl != "") {
        // Set the opened URL to the URL sent from the content script except
        // for pages which do not contain selected news list, like articles.
        newsSelection.openedUrl = openedUrl;
        tabNewsSetting.siteId = newsSite.id;
      } else if (newsSelection.openedUrl == ""
        || newsSite.id != tabNewsSetting.siteId) {
        // Set the opened URL to the URL of a top page on each news site.
        newsSelection.openedUrl = newsSite.url;
        tabNewsSetting.siteId = newsSite.id;
      }
      tabNewsSetting.topicWordsString = topicWordsString;
      tabNewsSetting.suspendedCount = 0;
      tabFlags.linkDisabled = false;
      tabFlags.requestRecieved = true;
      tabFlags.applyingSuspended = false;

      _setTabNewsFilterings(tabNewsSetting);

      Debug.printMessage(
        "Set the news setting for " + tabNewsSetting.filteringIds.join(", ")
        + " on Tab " + String(tab.id) + ".");
      Debug.printProperty(
        "Exclusion", tabNewsSetting.excludedRegularExpression);
      Debug.printProperty("Setting Name", newsSelection.settingName);
      Debug.printProperty(
        "Selected Topic", newsSelection.topicRegularExpression);
      Debug.printProperty(
        "Selected Sender", newsSelection.senderRegularExpression);
      Debug.printProperty("Opened URL", newsSelection.openedUrl);

      applyingPromises.push(_applyTabNewsSetting(tab.id, true));

      // Load the favicon string of a sender tab after waiting few seconds
      // because the current status is "loading" probably.
      var faviconId = ExtractNews.getNewsSiteFaviconId(newsSite.id, tab.url);
      if (! _newsSiteFaviconStatusMap.has(faviconId)) {
        _newsSiteFaviconStatusMap.set(faviconId, SITE_FAVICON_STATUS_LOADING);
        applyingPromises.push(
          new Promise((resolve, reject) => {
              setTimeout(() => {
                  _Popup.searchTab(tab.id).then((loadedTab) => {
                      if (loadedTab != undefined
                        && loadedTab.url == tab.url
                        && loadedTab.favIconUrl != undefined
                        && loadedTab.favIconUrl != "") {
                        return _Storage.writeFavicon(
                          faviconId, loadedTab.favIconUrl).then(() => {
                              _newsSiteFaviconStatusMap.set(
                                faviconId, SITE_FAVICON_STATUS_CHACHED);
                              resolve();
                            }, reject);
                      } else if (_newsSiteFaviconStatusMap.has(faviconId)) {
                        _newsSiteFaviconStatusMap.delete(faviconId);
                      }
                      resolve();
                    }, reject);
                }, 1500);
            }));
      }

      return Promise.all(applyingPromises);
    }

    _Daemon.requestTabNewsSetting = requestTabNewsSetting;

    /*
     * Sends the setting to select and exclude news topics and/or senders on
     * a tab of the specified ID to the specified tab and returns the promise.
     */
    function informTabNewsSetting(tab, tabId) {
      var tabFlags = _tabFlagsMap.get(tabId);
      if (tabFlags == undefined || ! tabFlags.requestRecieved) {
        return Promise.resolve();
      }
      var tabNewsSetting = _tabNewsSettingMap.get(tabId);
      return _sendTabMessage(tab.id, {
          command: ExtractNews.COMMAND_SETTING_INFORM,
          newsSiteEnabled:
            ExtractNews.isNewsSiteEnabled(tabNewsSetting.siteId),
          newsSelectionSettingName: tabNewsSetting.selection.settingName,
          newsSelectedTopicRegularExpression:
            tabNewsSetting.selection.topicRegularExpression,
          newsSelectedSenderRegularExpression:
            tabNewsSetting.selection.senderRegularExpression,
          newsExcludedRegularExpression:
            tabNewsSetting.excludedRegularExpression,
          newsOpenedUrl: tabNewsSetting.selection.openedUrl,
          newsTopicWords: tabNewsSetting.topicWordsString.split(",")
        });
    }

    _Daemon.informTabNewsSetting = informTabNewsSetting;

    /*
     * Selects news topics and/or senders by the specified regular expression
     * on a tab of the specified ID and returns the promise.
     */
    function selectTabNews(tabId, regexpString, settingProperty = {
        topicSelected: false,
        senderSelected: false,
        regexpAdded: false
      }) {
      var tabFlags = _tabFlagsMap.get(tabId);
      if (tabFlags == undefined || ! tabFlags.requestRecieved) {
        return setTabMessageDialog(tabId,
          _Alert.WARNING_NEWS_SETTING_NOT_INITIALIZED);
      }
      var tabNewsSetting = _tabNewsSettingMap.get(tabId);
      var newsSelection = tabNewsSetting.selection;
      var settingName = newsSelection.settingName;

      regexpString = _Text.trimText(
        _Text.replaceTextLineBreaksToSpace(
          _Text.removeTextZeroWidthSpaces(regexpString)));
      if (regexpString != "") {
        // Set the selected regular expression to the specified checked string.
        var regexpResult =
          _Regexp.checkRegularExpression(_Regexp.escape(regexpString), {
              localized: true,
              wordCaptured: true
            });
        if (regexpResult.localizedText != undefined) {
          regexpString = regexpResult.localizedText.textString;
        } else {
          regexpString = regexpResult.checkedText.textString;
        }
        if (settingProperty.topicSelected) {
          if (! settingProperty.regexpAdded) {
            newsSelection.topicRegularExpression = "";
          }
          newsSelection.topicRegularExpression =
            _Regexp.getAlternative(
              newsSelection.topicRegularExpression, regexpString);
          if (newsSelection.topicRegularExpression.length
            > _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
            return setTabMessageDialog(tabId,
              _Alert.WARNING_SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED);
          }
        } else if (settingProperty.senderSelected) {
          if (! settingProperty.regexpAdded) {
            newsSelection.senderRegularExpression = "";
          }
          newsSelection.senderRegularExpression =
            _Regexp.getAlternative(
              newsSelection.senderRegularExpression, regexpString);
          if (newsSelection.senderRegularExpression.length
            > _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
            return setTabMessageDialog(tabId,
              _Alert.WARNING_SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED);
          }
        }
        if (settingProperty.regexpAdded && newsSelection.settingName != "") {
          regexpResult.wordArray.unshift(newsSelection.settingName);
        }
        settingName =
          _Text.concatTextStrings(
            regexpResult.wordArray, _Alert.SETTING_NAME_MAX_WIDTH);
      } else if (! settingProperty.regexpAdded) {
        // Clear selected topic or sender of news selection if the context
        // menu of "clear" is chosen or "select more" with an empty string.
        var unselectedRegexpString = "";
        settingName = "";
        if (! settingProperty.topicSelected) {
          newsSelection.senderRegularExpression = "";
          unselectedRegexpString = newsSelection.topicRegularExpression;
        }
        if (! settingProperty.senderSelected) {
          newsSelection.topicRegularExpression = "";
          unselectedRegexpString = newsSelection.senderRegularExpression;
        }
        if (unselectedRegexpString != "") {
          // Set the setting name to the text of unselected regular expression.
          var regexpResult =
            _Regexp.checkRegularExpression(unselectedRegexpString, {
                wordCaptured: true
              });
          if (regexpResult.wordArray.length > 0) {
            settingName =
              _Text.concatTextStrings(
                regexpResult.wordArray, _Alert.SETTING_NAME_MAX_WIDTH);
          }
        }
      }
      newsSelection.settingName = settingName;

      if (newsSelection.topicRegularExpression != ""
        || newsSelection.senderRegularExpression != "") {
        Debug.printMessage(
          "Set the news setting on Tab " + String(tabId) + ".");
        Debug.printProperty("Setting Name", settingName);
        Debug.printProperty(
          "Selected Topic ", newsSelection.topicRegularExpression);
        Debug.printProperty(
          "Selected Sender", newsSelection.senderRegularExpression);
      } else {
        Debug.printMessage(
          "Clear the news setting of selected topics and senders on Tab "
          + String(tabId) + ".");
      }

      // Apply above news selection to a tab of the specified ID.
      return _applyTabNewsSetting(tabId);
    }

    /*
     * Excludes news topics by the specified regular expression on a tab
     * of the specified ID and returns the promise.
     */
    function excludeTabNews(tabId, regexpString, regexpAdded = false) {
      var tabFlags = _tabFlagsMap.get(tabId);
      if (tabFlags == undefined || ! tabFlags.requestRecieved) {
        return setTabMessageDialog(tabId,
          _Alert.WARNING_NEWS_SETTING_NOT_INITIALIZED);
      }
      var tabNewsSetting = _tabNewsSettingMap.get(tabId);

      regexpString = _Text.trimText(
        _Text.replaceTextLineBreaksToSpace(
          _Text.removeTextZeroWidthSpaces(regexpString)));
      if (regexpString != "") {
        // Set the regular expression to the specified checked string.
        var regexpResult =
          _Regexp.checkRegularExpression(
            _Regexp.escape(regexpString), { localized: true });
        if (regexpResult.localizedText != undefined) {
          regexpString = regexpResult.localizedText.textString;
        } else {
          regexpString = regexpResult.checkedText.textString;
        }
        if (regexpAdded) {
          regexpString =
            _Regexp.getAlternative(
              tabNewsSetting.excludedRegularExpression, regexpString);
        }
        if (regexpString.length > _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
          return setTabMessageDialog(tabId,
            _Alert.WARNING_EXCLUDED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED);
        }
        Debug.printMessage(
          "Set the news setting on Tab " + String(tabId) + ".");
        Debug.printProperty("Exclusion", regexpString);
      } else {
        Debug.printMessage(
          "Clear the news setting of excluded topics on Tab "
          + String(tabId) + ".");
      }
      tabNewsSetting.excludedRegularExpression = regexpString;

      // Apply above news exclusion to a tab of the specified ID.
      return _applyTabNewsSetting(tabId);
    }

    _Daemon.selectTabNews = selectTabNews;
    _Daemon.excludeTabNews = excludeTabNews;

    /*
     * Selects news topics or senders by the regular expression concatenating
     * the specified objects of news selection on a tab of the specified ID
     * and returns the promise.
     */
    function applyTabNewsSelections(
      tabId, tabOpen, tabUpdated, newsSelectionObjects) {
      var settingNames = new Array();
      var topicRegexpString = "";
      var senderRegexpString = "";
      var openedUrl = undefined;
      for (let i = 0; i < newsSelectionObjects.length; i++) {
        var newsSelection = new ExtractNews.Selection(newsSelectionObjects[i]);
        settingNames.push(newsSelection.settingName);
        topicRegexpString =
          _Regexp.getAlternative(
            topicRegexpString, newsSelection.topicRegularExpression);
        if (topicRegexpString.length > _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
          return setTabMessageDialog(tabId,
            _Alert.WARNING_SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED);
        }
        senderRegexpString =
          _Regexp.getAlternative(
            senderRegexpString, newsSelection.senderRegularExpression);
        if (senderRegexpString.length > _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
          return setTabMessageDialog(tabId,
            _Alert.WARNING_SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED);
        }
        if (openedUrl == undefined) {
          openedUrl = newsSelection.openedUrl;
        }
      }
      var settingName =
        _Text.concatTextStrings(settingNames, _Alert.SETTING_NAME_MAX_WIDTH);

      var newsSelection;
      var tabFlags = _tabFlagsMap.get(tabId);
      var tabNewsSetting = _tabNewsSettingMap.get(tabId);
      if (tabNewsSetting != undefined) {
        newsSelection = tabNewsSetting.selection;
      } else {
        if (tabUpdated) {
          var newsSite = ExtractNews.getNewsSite(openedUrl);
          if (newsSite == undefined
            || ! ExtractNews.isNewsSiteEnabled(newsSite.id)) {
            // Never prepare any news setting if the disabled or no news site
            // is loaded on new tab.
            return Promise.resolve();
          }
        }
        if (tabFlags == undefined) {
          tabFlags = _createTabFlags();
          _tabFlagsMap.set(tabId, tabFlags);
        }
        newsSelection = ExtractNews.newSelection();
        newsSelection.openedUrl = openedUrl;
        tabNewsSetting = _createTabNewsSetting(newsSelection);
        _tabNewsSettingMap.set(tabId, tabNewsSetting);
      }

      var applyingPromise;
      if (! tabUpdated) {
        if (! tabFlags.requestRecieved) {
          return setTabMessageDialog(tabId,
            _Alert.WARNING_NEWS_SETTING_NOT_INITIALIZED);
        }
        // Apply above news selections to the active tab of the specified ID.
        newsSelection.settingName = settingName;
        newsSelection.topicRegularExpression = topicRegexpString;
        newsSelection.senderRegularExpression = senderRegexpString;
        applyingPromise = _applyTabNewsSetting(tabId);
        Debug.printMessage(
          "Set the news setting for " + tabNewsSetting.filteringIds.join(", ")
          + " on Tab " + String(tabId) + ".");
        Debug.printProperty(
          "Exclusion", tabNewsSetting.excludedRegularExpression);
      } else {
        // Not apply news selections but wait for the content script to send
        // the request of news settings.
        newsSelection.settingName = settingName;
        newsSelection.topicRegularExpression = topicRegexpString;
        newsSelection.senderRegularExpression = senderRegexpString;
        applyingPromise = Promise.resolve();
        Debug.printMessage(
          "Prepare the news setting on Tab " + String(tabId) + ".");
      }
      Debug.printProperty("Setting Name", settingName);
      Debug.printProperty("Selected Topic", topicRegexpString);
      Debug.printProperty("Selected Sender", senderRegexpString);
      Debug.printProperty("Opened URL", newsSelection.openedUrl);

      return applyingPromise;
    }

    /*
     * Saves the setting to select news topics or senders on a tab
     * of the specified ID and returns the promise.
     */
    function saveTabNewsSelection(tabId) {
      var tabNewsSetting = _tabNewsSettingMap.get(tabId);
      if (tabNewsSetting == undefined) {
        throw newUnsupportedOperationException();
      }
      var newsSelection = tabNewsSetting.selection;
      return _Storage.readNewsSelectionCount().then((newsSelectionCount) => {
          if (newsSelectionCount + 1 >= ExtractNews.SELECTION_MAX_COUNT) {
            // No longer save the news selection over the maximum size.
            return setTabMessageDialog(tabId,
              _Alert.WARNING_NEWS_SELECTION_NOT_SAVED_ANY_MORE);
          }
          return _Storage.writeNewsSelection(
            newsSelectionCount, newsSelection).then(() => {
              Debug.printMessage(
                "Save the news setting on Tab " + String(tabId) + ".");
              Debug.printProperty("Setting Name", newsSelection.settingName);
              Debug.printProperty(
                "Selected Topic", newsSelection.topicRegularExpression);
              Debug.printProperty(
                "Selected Sender", newsSelection.senderRegularExpression);
              Debug.printProperty("Opened URL", newsSelection.openedUrl);
              return Promise.resolve();
            });
        });
    }

    _Daemon.applyTabNewsSelections = applyTabNewsSelections;
    _Daemon.saveTabNewsSelection = saveTabNewsSelection;

    /*
     * Disables the link on the tab of the specified ID if the specified flag
     * is true and returns the promise.
     */
    function setTabLinkDisabled(tabId, tabLinkDisabled) {
      var tabFlags = _tabFlagsMap.get(tabId);
      if (tabFlags != undefined) {
        var changeCSS = undefined;
        if (tabFlags.linkDisabled) {
          if (! tabLinkDisabled) {
            changeCSS = browser.tabs.removeCSS;
          }
        } else if (tabLinkDisabled) {
          changeCSS = browser.tabs.insertCSS;
        }
        if (changeCSS != undefined) {
          return  callAsynchronousAPI(changeCSS, tabId, {
              code: "a { pointer-events: none; }"
            }).then(() => {
              tabFlags.linkDisabled = tabLinkDisabled;
              return Promise.resolve();
            });
        }
      }
      return Promise.resolve();
    }

    _Daemon.setTabLinkDisabled = setTabLinkDisabled;

    /*
     * Hides the comment on every tab of the news site for the specified URL
     * if the specified flag is true and returns the promise.
     */
    function setTabCommentHidden(tabUrl, tabCommentHidden) {
      var siteId = ExtractNews.getNewsSite(tabUrl).id;
      _newsSiteCommentHiddenMap.set(siteId, tabCommentHidden);
      return _Storage.writeCommentMode(siteId, ! tabCommentHidden).then(() => {
          const applyingPromises = new Array();
          _tabFlagsForEach((tabId, tabSiteId, tabFlags) => {
              if (siteId == tabSiteId && tabFlags.requestRecieved) {
                applyingPromises.push(
                  _sendTabMessage(tabId, {
                      command: ExtractNews.COMMAND_SETTING_SWITCH,
                      newsCommentHidden: tabCommentHidden,
                      newsFilteringDisabled: _newsFilteringDisabled,
                      newsSelectionDisabled: tabFlags.newsSelectionDisabled
                    }));
              }
            });
          return Promise.all(applyingPromises);
        });
    }

    _Daemon.setTabCommentHidden = setTabCommentHidden;

    /*
     * Enabling news sites on this extension and returns the promise.
     */
    function enablingNewsSites() {
      return _Storage.readEnabledNewsSiteIds().then((enabledSiteIds) => {
          ExtractNews.setEnabledNewsSites(enabledSiteIds);
          Debug.printMessage(
            "Enabling the news site of " + enabledSiteIds.join(", ") + ".");
          return _Menus.createContextMenus();
        });
    }

    /*
     * Updates enabling or disabling the news site of the specified ID
     * and return the promise.
     */
    function updateNewsSiteEnabled(siteId, siteEnabled) {
      const updatingPromises = new Array();
      ExtractNews.setNewsSiteEnabled(siteId, siteEnabled);
      if (siteEnabled) {
        Debug.printMessage("Enabling the news site of " + siteId + ".");
      } else {
        _tabFlagsForEach((tabId, tabSiteId, tabFlags) => {
            if (siteId == tabSiteId) {
              // Dispose the resource to arrange news items for disabled sites
              // on the tab from which the request is received.
              if (tabFlags.requestRecieved && ! tabFlags.applyingSuspended) {
                updatingPromises.push(
                  _sendTabMessage(tabId, {
                      command: ExtractNews.COMMAND_SETTING_DISPOSE
                    }));
              }
              removeTabSetting(tabId);
            }
          });
        Debug.printMessage("Disabling the news site of " + siteId + ".");
      }
      updatingPromises.push(_Menus.createContextMenus());
      return Promise.all(updatingPromises);
    }

    _Daemon.enablingNewsSites = enablingNewsSites;
    _Daemon.updateNewsSiteEnabled = updateNewsSiteEnabled;

    {
      // Read the flag to disable the word filterings and hide comments.
      const readingPromises = new Array();
      readingPromises.push(
        _Storage.readNewsFilteringDisabled().then((filteringDisabled) => {
            _newsFilteringDisabled = filteringDisabled;
            return Promise.resolve();
          }));
      ExtractNews.getNewsSites().forEach((newsSite) => {
          readingPromises.push(
            _Storage.readCommentMode(newsSite.id).then((commentOn) => {
                _newsSiteCommentHiddenMap.set(newsSite.id, ! commentOn);
                return Promise.resolve();
              }));
        });
      Promise.all(readingPromises).catch((error) => {
          Debug.printStackTrace(error);
        });
    }

    return _Daemon;
  })();

const Daemon = ExtractNews.Daemon;
const Menus = ExtractNews.Menus;

// Dispatch the process by the message received from the content script, popup
// list, edit window, message dialog, and option page.

ExtractNews.getDebugMode().then(() => {
    browser.runtime.onMessage.addListener((message, sender) => {
        var settingPromise = undefined;
        Debug.printMessage(
          "Receive the command " + message.command.toUpperCase() + ".");
        switch (message.command) {
        case ExtractNews.COMMAND_SETTING_REQUEST:
          if (message.openedUrl != undefined) {
            // Receive the request of sending the setting to select and exclude
            // news topics and/or senders on a tab from the content script.
            settingPromise =
              Daemon.requestTabNewsSetting(
                sender.tab, message.openedUrl, message.topicWordsString);
          } else {
            // Receive the request of the setting information for a tab from
            // the edit window.
            settingPromise =
              Daemon.informTabNewsSetting(sender.tab, message.tabId);
          }
          break;
        case ExtractNews.COMMAND_SETTING_SELECT:
          if (message.newsSelectionObjects.length > 0) {
            // Receive settings to select news topics and/or senders from
            // the popup list, which applied to a tab.
            settingPromise =
              Daemon.applyTabNewsSelections(
                message.tabId, message.tabOpen, message.tabUpdated,
                message.newsSelectionObjects);
          }
          break;
        case ExtractNews.COMMAND_SETTING_UPDATE:
          if (message.siteId != undefined) {
            // Receive enabling or disabling a news site from the option page.
            settingPromise =
              Daemon.updateNewsSiteEnabled(
                message.siteId, message.siteEnabled);
          } else if (message.filteringDisabled != undefined) {
            // Receive the flag to disable the filtering from the option page.
            settingPromise =
              Daemon.switchNewsDisplayOptions({
                  newsFilteringDisabled: message.filteringDisabled
                });
          } else if (message.debugOn != undefined) {
            // Receive the debug mode from the option page.
            settingPromise = ExtractNews.setDebugMode(message.debugOn);
          } else {
            // Receive updating of category filterings from the option page.
            settingPromise = Daemon.updateNewsFilterings();
          }
          break;
        case ExtractNews.COMMAND_DIALOG_OPEN:
          // Receive the warning message from tab or window and open a dialog.
          settingPromise =
            Daemon.setTabMessageDialog(message.tabId, message.warning);
          break;
        case ExtractNews.COMMAND_DIALOG_STANDBY:
          // Receive the standby to send the warning message from a dialog.
          settingPromise = Daemon.sendTabWarningMessage(message.tabId);
          break;
        case ExtractNews.COMMAND_DIALOG_CLOSE:
          // Receive closing of the message dialog from itself.
          settingPromise = Daemon.removeTabMessageDialog(message.tabId);
          break;
        }
        if (settingPromise != undefined) {
          settingPromise.catch((error) => {
              Debug.printStackTrace(error);
            });
        }
      });

    return Promise.all(Array.of(
        Daemon.enablingNewsSites(),
        Daemon.loadNewsFilterings()
      ));
  }).catch((error) => {
    Debug.printStackTrace(error);
  });

// Registers functions to a listener and call when the context menu is clicked.

browser.contextMenus.onClicked.addListener((info, tab) => {
    var applyingPromise = undefined;
    var regexpAdded = true;

    switch (info.menuItemId) {
    case Menus.ID_SELECT_NEWS_TOPIC:
    case Menus.ID_SELECT_NEWS_SENDER:
      regexpAdded = false;
    case Menus.ID_SELECT_NEWS_TOPIC_ADDITIONALLY:
    case Menus.ID_SELECT_NEWS_SENDER_ADDITIONALLY:
      applyingPromise =
        Daemon.selectTabNews(tab.id, info.selectionText, {
            topicSelected: info.menuItemId == Menus.ID_SELECT_NEWS_TOPIC
              || info.menuItemId == Menus.ID_SELECT_NEWS_TOPIC_ADDITIONALLY,
            senderSelected: info.menuItemId == Menus.ID_SELECT_NEWS_SENDER
              || info.menuItemId == Menus.ID_SELECT_NEWS_SENDER_ADDITIONALLY,
            regexpAdded: regexpAdded
          });
      break;
    case Menus.ID_EXCLUDE_NEWS_TOPIC:
      regexpAdded = false;
    case Menus.ID_EXCLUDE_NEWS_TOPIC_ADDITIONALLY:
      applyingPromise =
        Daemon.excludeTabNews(tab.id, info.selectionText, regexpAdded);
      break;
    case Menus.ID_DISABLE_TAB_LINK:
      applyingPromise = Daemon.setTabLinkDisabled(tab.id, info.checked);
      break;
    case Menus.ID_DISABLE_TAB_NEWS_SELECTION:
      applyingPromise =
        Daemon.switchTabNewsDisplayOptions(tab.id, {
            newsSelectionDisabled: info.checked
          });
      break;
    case Menus.ID_SAVE_TAB_NEWS_SELECTION:
      applyingPromise = Daemon.saveTabNewsSelection(tab.id);
      break;
    case Menus.ID_CLEAR_TAB_SELECTED_TOPIC:
    case Menus.ID_CLEAR_TAB_SELECTED_SENDER:
      applyingPromise =
        Daemon.selectTabNews(tab.id, "", {
            topicSelected:
              info.menuItemId == Menus.ID_CLEAR_TAB_SELECTED_TOPIC,
            senderSelected:
              info.menuItemId == Menus.ID_CLEAR_TAB_SELECTED_SENDER,
            regexpAdded: false
          });
      break;
    case Menus.ID_CLEAR_TAB_NEWS_EXCLUSION:
      applyingPromise = Daemon.excludeTabNews(tab.id, "");
      break;
    case Menus.ID_HIDE_COMMENT:
      applyingPromise = Daemon.setTabCommentHidden(tab.url, info.checked);
      break;
    }

    if (applyingPromise != undefined) {
      applyingPromise.catch((error) => {
          Debug.printStackTrace(error);
        });
    }
  });

// Registers functions to a listener and call when a tab is activated.

browser.tabs.onActivated.addListener((activeInfo) => {
    Daemon.activateTabSetting(activeInfo.tabId).then((tabSetting) => {
        if (tabSetting != undefined && ! tabSetting.applyingSuspended) {
          return Menus.updateContextMenus(tabSetting);
        }
        return Promise.resolve();
      }).catch((error) => {
        Debug.printStackTrace(error);
      });
  });

// Removes the news exclusion and selection form the map for a closed tab.

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    Daemon.removeTabSetting(tabId);
    Daemon.removeTabMessageDialog(tabId).catch((error) => {
        Debug.printStackTrace(error);
      });
  });
