/*
 *  Receive the message from each tab and dispatch the process by it.
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

    // Map of the site data for each news site
    var _newsSiteDataMap = new Map();

    // Modified time of the site data
    var _newsSiteDataModifiedTime;

    // Count of the accesse to the news site after the site data is saved
    var _newsSiteSavedAccessCount = 0;

    // Minutes in which the site data is saved
    const SITE_DATA_SAVED_MINUTES = 10;

   // Period in which the site data is modified by a ratio
    const SITE_DATA_MODIFIED_PERIOD = 3600000 * 24;

    // Ratio to converge for the access count to the average of a week
    const SITE_ACCESS_WEEK_RATIO = 6 / 7;

    // Milliseconds to wait for loading the favicon on a site
    const SITE_FAVICON_WAIT_MILLISECONDS = 2000;

    // Map of the flag whether the comment is hidden for each news site
    var _newsSiteCommentHiddenMap = new Map();

    // Flag whether filterings are disabled every news site
    var _newsFilteringDisabled = false;

    // Map of the filtering data for each category ID
    var _newsFilteringDataMap = new Map();

    // Map of message dialogs which have opened by each tab
    var _tabMessageDialogMap = new Map();

    /*
     * The setting of a tab on the news site.
     */
    class TabNewsSetting extends TabSetting {
      constructor(selection) {
        super();
        // Parameters of a setting
        //
        // siteId                     Site ID of a news site accessed lastly
        // domainId                   Domain ID of a news site accessed lastly
        // filteringIds               Array of category IDs to filter topics
        //                            on the news site
        // filteringPolicyTarget      Filtering target for topics which not
        //                            match all filterings on the news site
        // topicWordsString           String to which topic words on the news
        //                            site are joined by commas
        // selection                  Selection of topics and/or senders on
        //                            the news site
        // selectionDisabled          Flag whether the selection is disabled
        //                            on the news site
        // excludedRegularExpression  String of a regular expression by which
        //                            topics are excluded on the news site
        // linkDisabled               Flag whether the hyperlink is disabled
        // suspendedCount             Number of opening the page of disabled
        //                            or no news site continuously
        this.setting = {
            siteId: undefined,
            domainId: undefined,
            filteringIds: new Array(),
            filteringPolicyTarget:
              ExtractNews.newFilteringTarget(ExtractNews.TARGET_ACCEPT),
            topicWordsString: "",
            excludedRegularExpression: "",
            selection: selection,
            selectionDisabled: false,
            linkDisabled: false,
            suspendedCount: 0
          };
      }

      get siteId() {
        return this.setting.siteId;
      }

      get domainId() {
        return this.setting.domainId;
      }

      isSiteEnabled() {
        if (this.domainId != undefined) {
          return ExtractNews.isDomainEnabled(this.domainId);
        }
        return false;
      }

      get newsSelection() {
        return this.setting.selection;
      }

      get excludedRegularExpression() {
        return this.setting.excludedRegularExpression;
      }

      set excludedRegularExpression(regexpString) {
        this.setting.excludedRegularExpression = regexpString;
      }

      hasNewsSelectedTopicRegularExpression() {
        return this.setting.selection.topicRegularExpression != "";
      }

      hasNewsSelectedSenderRegularExpression() {
        return this.setting.selection.senderRegularExpression != "";
      }

      hasNewsExcludedTopicRegularExpression() {
        return this.excludedRegularExpression != "";
      }

      isNewsSelectionDisabled() {
        return this.setting.selectionDisabled;
      }

      setNewsSelectionDisabled(disabled) {
        this.setting.selectionDisabled = disabled
      }

      isNewsSiteCommentHidden() {
        if (this.siteId != undefined) {
          return _newsSiteCommentHiddenMap.get(this.siteId);
        }
        return false;
      }

      setNewsSiteCommentHidden(hidden) {
        if (this.siteId != undefined) {
          _newsSiteCommentHiddenMap.set(this.siteId, hidden);
        }
      }

      isRequestRecieved() {
        return this.siteId != undefined;
      }

      isLinkDisabled() {
        return this.setting.linkDisabled;
      }

      setLinkDisabled(disabled) {
        this.setting.linkDisabled = disabled;
      }

      get suspendedCount() {
        return this.setting.suspendedCount;
      }

      incrementSuspendedCount() {
        this.setting.suspendedCount++;
      }

      copyTabSetting(tabSetting) {
        this.setting.siteId = tabSetting.siteId;
        this.setting.domainId = tabSetting.domainId;
        this.setting.excludedRegularExpression =
          tabSetting.excludedRegularExpression;
        this.setting.selection.settingName =
          tabSetting.newsSelection.settingName;
        this.setting.selection.topicRegularExpression =
          tabSetting.newsSelection.topicRegularExpression;
        this.setting.selection.senderRegularExpression =
          tabSetting.newsSelection.senderRegularExpression;
        this.setting.selection.openedUrl = tabSetting.newsSelection.openedUrl;
      }

      setSiteData(siteData, topicWordsString) {
        this.setting.siteId = siteData.id;
        this.setting.domainId = siteData.domainId;
        this.setting.topicWordsString = topicWordsString;
        this.setting.linkDisabled = false;
        this.setting.suspendedCount = 0;
      }

      updateNewsFilterings() {
        this.setting.filteringIds = new Array();
        for (const filteringId of _newsFilteringDataMap.keys()) {
          var filteringData = _newsFilteringDataMap.get(filteringId);
          var newsTopicWords =
            this.setting.topicWordsString.toLowerCase().split(WORD_SEPARATOR);
          if (filteringData.appliesTo(newsTopicWords)) {
            this.setting.filteringIds.push(filteringId);
            // Set the last target of filterings to the policy target which
            // is accepted or dropped for any word.
            var filteringPolicyTarget = filteringData.policyTarget;
            if (filteringPolicyTarget.name != ExtractNews.TARGET_BREAK) {
              this.setting.filteringPolicyTarget = filteringPolicyTarget;
              break;
            }
          }
        }
        return this.setting.filteringIds;
      }

      toApplyMessage(filteringUpdated = false) {
        var message = {
            command: ExtractNews.COMMAND_SETTING_APPLY,
            selectionSettingName: this.newsSelection.settingName,
            selectedTopicRegularExpression:
              this.newsSelection.topicRegularExpression,
            selectedSenderRegularExpression:
              this.newsSelection.senderRegularExpression,
            selectionDisabled: this.isNewsSelectionDisabled(),
            excludedRegularExpression: this.excludedRegularExpression,
            filteringDisabled: _newsFilteringDisabled,
            commentHidden: this.isNewsSiteCommentHidden()
          };
        if (filteringUpdated) {
          message.filteringTargetObjects = new Array();
          this.setting.filteringIds.forEach((filteringId) => {
              var filteringData = _newsFilteringDataMap.get(filteringId);
              filteringData.targetObjects.forEach((filteringTargetObject) => {
                  message.filteringTargetObjects.push(filteringTargetObject);
                });
            });
          message.filteringTargetObjects.push(
            this.setting.filteringPolicyTarget.toObject());
        }
        return message;
      }

      toInformMessage() {
        var message = this.toApplyMessage();
        message.command = ExtractNews.COMMAND_SETTING_INFORM;
        message.selectionOpenedUrl = this.newsSelection.openedUrl;
        message.topicWords =
          this.setting.topicWordsString.split(WORD_SEPARATOR);
        message.siteEnabled = this.isSiteEnabled();
        message.siteAccessCount = 0;
        if (this.siteId != undefined) {
          var siteData = _newsSiteDataMap.get(this.siteId);
          if (siteData != undefined) {
            message.siteAccessCount = siteData.accessCount;
          }
        }
        return message;
      }
    }

    // The setting on tabs of diabled or no news site
    const INACTIVE_TAB_SETTING =
      new TabNewsSetting(ExtractNews.newSelection());

    // Map of the settings for each tab
    var _tabSettingMap = new Map();

    // Count to retain the setting suspended by the disabled or no news site
    const TAB_SETTING_RETAINED_COUNT = 3;

    /*
     * Returns the setting for the tab of the specified ID on the news site
     * which is enabled and not suspended, otherwise, INACTIVE_TAB_SETTING.
     */
    function getTabSetting(tabId) {
      var tabSetting = _tabSettingMap.get(tabId);
      if (tabSetting != undefined && tabSetting.isSiteEnabled()
        && tabSetting.suspendedCount == 0) {
        return tabSetting;
      }
      return INACTIVE_TAB_SETTING;
    }

    /*
     * Removes the setting for the tab of the specified ID on the news site.
     */
    function removeTabSetting(tabId) {
      var tabSetting = _tabSettingMap.get(tabId);
      if (tabSetting != undefined) {
        if (tabSetting.isRequestRecieved()) {
          var siteData = _newsSiteDataMap.get(tabSetting.siteId);
          if (siteData != undefined && siteData.accessCount <= 0) {
            // Remove zombie "loading" of a favicon for the specified ID when
            // the promise is rejected or tab is closed before completing.
            ExtractNews.deleteSite(siteData);
            _newsSiteDataMap.delete(siteData.id);
            Debug.printMessage("Delete the site data of " + siteData.id + ".");
          }
        }
        _tabSettingMap.delete(tabId);
        Debug.printMessage("Remove the setting on Tab " + String(tabId) + ".");
      }
    }

    _Daemon.getTabSetting = getTabSetting;
    _Daemon.removeTabSetting = removeTabSetting;

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

    /*
     * Reads the filtering data of news topics and returns the promise.
     */
    function readFilteringData() {
      return _Storage.readFilteringIds().then((filteringIds) => {
          return _Storage.readFilterings(filteringIds);
        }).then((filteringMap) => {
          _newsFilteringDataMap = new Map();
          Debug.printMessage("Read the filtering ...");
          filteringMap.forEach((filtering, filteringId) => {
              var filteringTargetObjects = new Array();
              if (Debug.isLoggingOn()) {
                var categoryTopicsString = "";
                if (filtering.categoryTopics != undefined) {
                  categoryTopicsString =
                    filtering.categoryTopics.join(WORD_SEPARATOR);
                  filtering.setCategoryTopics(
                    categoryTopicsString.toLowerCase().split(WORD_SEPARATOR));
                }
                Debug.dump("", "[" + filteringId + "]");
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
                    var wordOptions = new Array();
                    if (filteringTarget.isWordBeginningMatched()) {
                      wordOptions.push(ExtractNews.TARGET_WORD_BEGINNING);
                    }
                    if (filteringTarget.isWordEndMatched()) {
                      wordOptions.push(ExtractNews.TARGET_WORD_END);
                    }
                    if (filteringTarget.isWordsExcluded()) {
                      wordOptions.push(ExtractNews.TARGET_WORDS_EXCLUDED);
                    }
                    Debug.dump(
                      "\t", filteringTarget.name,
                      filteringTargetWords.join(WORD_SEPARATOR),
                      wordOptions.join(WORD_SEPARATOR));
                  }
                  filteringTargetObjects.push(filteringTarget.toObject());
                });
              if (Debug.isLoggingOn()) {
                Debug.dump("", filtering.policyTarget.name);
              }
              _newsFilteringDataMap.set(
                filteringId,
                new FilteringData(filtering.categoryTopics,
                  filteringTargetObjects, filtering.policyTarget));
            });
        });
    }

    /*
     * Updates the filtering data of news topics and returns the promise.
     */
    function updateFilteringData() {
      const applyingPromises = new Array();
      return readFilteringData().then(() => {
          _tabSettingMap.forEach((tabSetting, tabId) => {
              if (tabSetting.isRequestRecieved()) {
                var filteringIds = tabSetting.updateNewsFilterings();
                Debug.printMessage(
                  "Set the filtering for " + filteringIds.join(", ")
                  + " on Tab " + String(tabId) + ".");
                applyingPromises.push(_applyTabNewsSetting(tabId, true));
              }
            });
          return Promise.all(applyingPromises);
        });
    }

    _Daemon.updateFilteringData = updateFilteringData;

    // Sends the specified messeage of a command to a tab of the specified ID
    // and returns the promise.

    function _sendTabMessage(tabId, message) {
      return callAsynchronousAPI(
        browser.tabs.sendMessage, tabId, message).then(() => {
          if (browser.runtime.lastError != undefined) {
            Debug.printProperty(
              "tabs.sendMessage()", browser.runtime.lastError.message);
          }
          Debug.printMessage(
            "Send the command " + message.command.toUpperCase()
            + " to Tab " + String(tabId) + ".");
        });
    }

    /*
     * Sends the messeage by which news display options are switched to a tab
     * of the specified ID and returns the promise.
     */
    function sendTabSwitchMessage(tabId) {
      var tabSetting = _tabSettingMap.get(tabId);
      if (tabSetting.isRequestRecieved() && tabSetting.suspendedCount == 0) {
        return _sendTabMessage(tabId, {
            command: ExtractNews.COMMAND_SETTING_SWITCH,
            commentHidden: tabSetting.isNewsSiteCommentHidden(),
            filteringDisabled: _newsFilteringDisabled,
            selectionDisabled: tabSetting.isNewsSelectionDisabled()
          });
      }
      return Promise.resolve();
    }

    /*
     * Sends the specified flags to display news to tabs of the specified site
     * ID or all tabs if undefined and returns the promise.
     */
    function switchNewsDisplayOptions(newsDisplayOptions) {
      const applyingPromises = new Array();
      if (newsDisplayOptions.filteringDisabled != undefined) {
        _newsFilteringDisabled = newsDisplayOptions.filteringDisabled;
      }
      for (const tabId of _tabSettingMap.keys()) {
        applyingPromises.push(sendTabSwitchMessage(tabId));
      }
      return Promise.all(applyingPromises);
    }

    _Daemon.sendTabSwitchMessage = sendTabSwitchMessage;
    _Daemon.switchNewsDisplayOptions = switchNewsDisplayOptions;

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
          if (dialogTabId == tabMessageDialogTabId) {
            // Send the message to the present dialog if not closed previously.
            sendTabWarningMessage(tabId);
          }
        });
    }

    function _setTabMessageDialog(tabId, messageId) {
      return setTabMessageDialog(tabId, _Alert.getWarning(messageId));
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
              callAsynchronousAPI(browser.tabs.remove, tab.id);
            }
          });
      }
      return Promise.resolve();
    }

    _Daemon.sendTabWarningMessage = sendTabWarningMessage;
    _Daemon.setTabMessageDialog = setTabMessageDialog;
    _Daemon.removeTabMessageDialog = removeTabMessageDialog;

    // Sends the message of settings to select and exclude news topics and/or
    // senders applied to a tab of the specified ID and returns the promise.

    function _applyTabNewsSetting(tabId, tabUpdated) {
      var tabSetting = getTabSetting(tabId);
      if (tabSetting != undefined) {
        return _sendTabMessage(
          tabId, tabSetting.toApplyMessage(tabUpdated)).then(() => {
            if (_Menus.hasCreated()) {
              _Popup.getWindowActiveTab().then((tab) => {
                  if (tab != undefined && tab.id == tabId) {
                    if (tabUpdated) {
                      _Menus.updateContextMenus(tabSetting);
                    } else {
                      _Menus.updateTabNewsSettingContextMenus(tabSetting);
                    }
                  }
                });
            }
          });
      }
      return Promise.resolve();
    }

    /*
     * Creates and sends the setting to select and exclude news topics and/or
     * senders to the specified tab of an enabled site and returns the promise.
     */
    function requestTabNewsSetting(tab, openedUrl, topicWordsString) {
      const applyingPromises = Array.of(removeTabMessageDialog(tab.id));
      var tabSetting = _tabSettingMap.get(tab.id);
      var urlSite = ExtractNews.getUrlSite(tab.url);
      if (urlSite == undefined || ! urlSite.isEnabled()) {
        if (tabSetting != undefined) {
          if (! tabSetting.isRequestRecieved()
            || tabSetting.suspendedCount >= TAB_SETTING_RETAINED_COUNT) {
            // Remove the setting suspended on the specified tab
            applyingPromises.push(removeTabSetting(tab.id));
          } else {
            tabSetting.incrementSuspendedCount();
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

      if (tabSetting != undefined) {
        // Take the selection for the specified tab on which a news site has
        // already been opened.
        newsSelection = tabSetting.newsSelection;
      } else {
        newsSelection = ExtractNews.newSelection();
        tabSetting = new TabNewsSetting(newsSelection);
        var openerTabSetting = _tabSettingMap.get(tab.openerTabId);
        if (openerTabSetting != undefined) {
          // Set the setting copied from the opener tab.
          tabSetting.copyTabSetting(openerTabSetting);
        //} else {
        // Set an empty setting of a tab opened at present.
        }
        _tabSettingMap.set(tab.id, tabSetting);
      }

      var siteData = urlSite.data;
      if (openedUrl != "") {
        // Set the opened URL to the URL sent from the content script except
        // for pages which don't contain selected topics like an article.
        newsSelection.openedUrl = openedUrl;
      } else if (newsSelection.openedUrl == ""
        || tabSetting.siteId != siteData.id) {
        // Set the opened URL to the URL of a top page on each news site.
        newsSelection.openedUrl = siteData.url;
      }
      tabSetting.setSiteData(siteData, topicWordsString);

      var filteringIds = tabSetting.updateNewsFilterings();
      Debug.printMessage(
        "Set the filtering for " + filteringIds.join(", ") + " on Tab "
        + String(tab.id) + ".");

      Debug.printMessage(
        "Set the news setting on Tab " + String(tab.id) + ".");
      Debug.printProperty(
        "Excluded Topic", tabSetting.excludedRegularExpression);
      Debug.printProperty("Setting Name", newsSelection.settingName);
      Debug.printProperty(
        "Selected Topic", newsSelection.topicRegularExpression);
      Debug.printProperty(
        "Selected Sender", newsSelection.senderRegularExpression);
      Debug.printProperty("Opened URL", newsSelection.openedUrl);

      applyingPromises.push(_applyTabNewsSetting(tab.id, true));

      if (urlSite.isFirstAccessed()) {
        _newsSiteDataMap.set(siteData.id, siteData);
        Debug.printMessage("Set the site data of " + siteData.id + ".");
        // Load the favicon string of a sender tab after waiting few seconds
        // because the current status is "loading" probably.
        applyingPromises.push(
          new Promise((resolve, reject) => {
              setTimeout(() => {
                  _Popup.searchTab(tab.id).then((loadedTab) => {
                      if (loadedTab != undefined
                        && loadedTab.url == tab.url
                        && loadedTab.favIconUrl != undefined
                        && loadedTab.favIconUrl != "") {
                        _Storage.writeSiteFavicon(
                          siteData.id, loadedTab.favIconUrl).then(() => {
                              // Increment the access count by this promise
                              // firstly after the favicon is saved.
                              siteData.incrementAccessCount();
                              _newsSiteSavedAccessCount++;
                              Debug.printMessage(
                                "Write the favicon of " + siteData.id + ".");
                              resolve();
                            }, reject);
                      } else if (_newsSiteDataMap.has(siteData.id)) {
                        ExtractNews.deleteSite(siteData);
                        _newsSiteDataMap.delete(siteData.id);
                        Debug.printMessage(
                          "Delete the site data of " + siteData.id + ".");
                      }
                      resolve();
                    }, reject);
                }, SITE_FAVICON_WAIT_MILLISECONDS);
            }));
      } else if (siteData.accessCount > 0) {
        siteData.incrementAccessCount();
        _newsSiteSavedAccessCount++;
      }

      return Promise.all(applyingPromises);
    }

    _Daemon.requestTabNewsSetting = requestTabNewsSetting;

    /*
     * Sends the setting of news selection and site data for a tab of
     * the specified ID to the specified tab and returns the promise.
     */
    function informTabNewsSetting(tab, tabId) {
      var tabSetting = _tabSettingMap.get(tabId);
      if (tabSetting == undefined) {
        tabSetting = INACTIVE_TAB_SETTING;
      }
      return _sendTabMessage(tab.id, tabSetting.toInformMessage());
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
      var tabSetting = _tabSettingMap.get(tabId);
      if (tabSetting == undefined || ! tabSetting.isRequestRecieved()) {
        return _setTabMessageDialog(tabId, _Alert.SELECTION_NOT_ENABLED);
      }
      var newsSelection = tabSetting.newsSelection;
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
            return _setTabMessageDialog(
              tabId, _Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED);
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
            return _setTabMessageDialog(
              tabId, _Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED);
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
          "Set the news selection on Tab " + String(tabId) + ".");
        Debug.printProperty("Setting Name", settingName);
        Debug.printProperty(
          "Selected Topic ", newsSelection.topicRegularExpression);
        Debug.printProperty(
          "Selected Sender", newsSelection.senderRegularExpression);
      } else {
        Debug.printMessage(
          "Clear the news selection on Tab " + String(tabId) + ".");
      }

      // Apply above news selection to a tab of the specified ID.
      return _applyTabNewsSetting(tabId);
    }

    /*
     * Excludes news topics by the specified regular expression on a tab
     * of the specified ID and returns the promise.
     */
    function excludeTabNews(tabId, regexpString, regexpAdded = false) {
      var tabSetting = _tabSettingMap.get(tabId);
      if (tabSetting == undefined || ! tabSetting.isRequestRecieved()) {
        return _setTabMessageDialog(tabId, _Alert.SELECTION_NOT_ENABLED);
      }

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
              tabSetting.excludedRegularExpression, regexpString);
        }
        if (regexpString.length > _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
          return setTabMessageDialog(
            tabId, _Alert.EXCLUDED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED);
        }
        Debug.printMessage(
          "Set the news exclusion on Tab " + String(tabId) + ".");
        Debug.printProperty("Excluded Topic", regexpString);
      } else {
        Debug.printMessage(
          "Clear the news exclusion on Tab " + String(tabId) + ".");
      }
      tabSetting.excludedRegularExpression = regexpString;

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
    function applyTabNewsSelections(tabId, tabUrl, newsSelectionObjects) {
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
          return _setTabMessageDialog(
            tabId, _Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED);
        }
        senderRegexpString =
          _Regexp.getAlternative(
            senderRegexpString, newsSelection.senderRegularExpression);
        if (senderRegexpString.length > _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
          return _setTabMessageDialog(
            tabId, _Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED);
        }
        if (openedUrl == undefined) {
          openedUrl = newsSelection.openedUrl;
        }
      }
      var settingName =
        _Text.concatTextStrings(settingNames, _Alert.SETTING_NAME_MAX_WIDTH);

      var newsSelection;
      var tabOpen = tabUrl == undefined;
      var tabSetting = _tabSettingMap.get(tabId);
      if (tabSetting != undefined) {
        newsSelection = tabSetting.newsSelection;
      } else {
        if (tabOpen && ! ExtractNews.isUrlSiteEnabled(openedUrl)) {
          // Never prepare any setting if the disabled or no news site
          // is loaded on an open tab.
          return Promise.resolve();
        }
        newsSelection = ExtractNews.newSelection();
        newsSelection.openedUrl = openedUrl;
        tabSetting = new TabNewsSetting(newsSelection);
        _tabSettingMap.set(tabId, tabSetting);
      }

      var applyingPromise;
      if (! tabOpen
        && tabUrl != URL_ABOUT_NEW_TAB && tabUrl != URL_ABOUT_BLANK) {
        if (! tabSetting.isRequestRecieved()) {
          return _setTabMessageDialog(tabId, _Alert.SELECTION_NOT_ENABLED);
        }
        // Apply above news selection to the active tab of the specified ID.
        newsSelection.settingName = settingName;
        newsSelection.topicRegularExpression = topicRegexpString;
        newsSelection.senderRegularExpression = senderRegexpString;
        applyingPromise = _applyTabNewsSetting(tabId);
        Debug.printMessage(
          "Set the news setting on Tab " + String(tabId) + ".");
        Debug.printProperty(
          "Excluded Topic", tabSetting.excludedRegularExpression);
      } else {
        // Not apply the news selection but wait for the content script
        // to send the request of settings.
        newsSelection.settingName = settingName;
        newsSelection.topicRegularExpression = topicRegexpString;
        newsSelection.senderRegularExpression = senderRegexpString;
        applyingPromise = Promise.resolve();
        Debug.printMessage(
          "Prepare the news selection on Tab " + String(tabId) + ".");
      }
      Debug.printProperty("Setting Name", settingName);
      Debug.printProperty("Selected Topic", topicRegexpString);
      Debug.printProperty("Selected Sender", senderRegexpString);
      Debug.printProperty("Opened URL", newsSelection.openedUrl);

      return applyingPromise;
    }

    /*
     * Saves the setting to select news topics and/or senders on a tab
     * of the specified ID and returns the promise.
     */
    function saveTabNewsSelection(tabId) {
      var tabSetting = _tabSettingMap.get(tabId);
      if (tabSetting != undefined) {
        var newsSelection = undefined;
        return _Storage.readSelectionCount().then((newsSelectionCount) => {
            if (newsSelectionCount + 1 >= ExtractNews.SELECTION_MAX_COUNT) {
              // No longer save the news selection over the maximum size.
              return _setTabMessageDialog(
                tabId, _Alert.SELECTION_NOT_SAVED_ANY_MORE);
            }
            newsSelection = tabSetting.newsSelection;
            return _Storage.writeSelection(newsSelectionCount, newsSelection);
          }).then(() => {
            if (newsSelection != undefined) {
              Debug.printMessage(
                "Save the news selection on Tab " + String(tabId) + ".");
              Debug.printProperty("Setting Name", newsSelection.settingName);
              Debug.printProperty(
                "Selected Topic", newsSelection.topicRegularExpression);
              Debug.printProperty(
                "Selected Sender", newsSelection.senderRegularExpression);
              Debug.printProperty("Opened URL", newsSelection.openedUrl);
            }
          });
      }
      return Promise.resolve();
    }

    _Daemon.applyTabNewsSelections = applyTabNewsSelections;
    _Daemon.saveTabNewsSelection = saveTabNewsSelection;

    /*
     * Disables or enables the hyperlink on the tab of the specified ID by
     * true or false of the specified flag and returns the promise.
     */
    function setTabLinkDisabled(tabId, tabLinkDisabled) {
      var tabSetting = _tabSettingMap.get(tabId);
      if (tabSetting != undefined) {
        var changeCSS = undefined;
        if (tabSetting.isLinkDisabled()) {
          if (! tabLinkDisabled) {
            changeCSS = browser.tabs.removeCSS;
          }
        } else if (tabLinkDisabled) {
          changeCSS = browser.tabs.insertCSS;
        }
        if (changeCSS != undefined) {
          return callAsynchronousAPI(changeCSS, tabId, {
              code: "a { pointer-events: none; }"
            }).then(() => {
              tabSetting.setLinkDisabled(tabLinkDisabled);
            });
        }
      }
      return Promise.resolve();
    }

    _Daemon.setTabLinkDisabled = setTabLinkDisabled;

    /*
     * Hides or shows comments on the news site for the tab of the specified ID
     * by true or false of the specified flag and returns the promise.
     */
    function setTabCommentHidden(tabId, commentHidden) {
      var commentTabSetting = _tabSettingMap.get(tabId);
      if (commentTabSetting != undefined) {
        var siteId = commentTabSetting.siteId;
        commentTabSetting.setNewsSiteCommentHidden(commentHidden);
        return _Storage.writeCommentMode(siteId, ! commentHidden).then(() => {
            const applyingPromises = new Array();
            _tabSettingMap.forEach((tabSetting, tabId) => {
                if (siteId == tabSetting.siteId) {
                  applyingPromises.push(sendTabSwitchMessage(tabId));
                }
              });
            Promise.all(applyingPromises);
          });
      }
    }

    _Daemon.setTabCommentHidden = setTabCommentHidden;

    /*
     * Updates enabling or disabling the news domain in the background context
     * by the specified data object and return the promise.
     */
    function updateNewsDomainData(domainDataObjects) {
      var updatingPromise = Promise.resolve();
      Debug.printMessage("Enable the news site ...");
      domainDataObjects.forEach(ExtractNews.setDomain);
      if (_Menus.hasCreated()) {
        updatingPromise = _Menus.createContextMenus();
      }
      return updatingPromise.then(() => {
          const disposingPromises = new Array();
          var disabledDomainIds = new Array();
          ExtractNews.forEachDomain((domainData) => {
              if (! ExtractNews.isDomainEnabled(domainData.id)) {
              // Add the ID of news domains disabled from the enabled state
              // to the specified array.
                disabledDomainIds.push(domainData.id);
              }
            });
          if (disabledDomainIds.length > 0) {
            var disabledDomainIdSet = new Set(disabledDomainIds);
            _tabSettingMap.forEach((tabSetting, tabId) => {
                if (tabSetting.isRequestRecieved()
                  && disabledDomainIdSet.has(tabSetting.domainId)) {
                  // Dispose the resource to arrange news items for disabled
                  // domains on the tab from which the request is received.
                  if (tabSetting.suspendedCount == 0) {
                    disposingPromises.push(
                      _sendTabMessage(tabId, {
                          command: ExtractNews.COMMAND_SETTING_DISPOSE
                        }));
                  }
                  disposingPromises.push(removeTabSetting(tabId));
                }
              });
            Debug.printMessage(
              "Disable the news site of " + disabledDomainIds.join(", ")
              + ".");
            ExtractNews.forEachSite((siteData) => {
                // Delete the site data of disabled domains with the favicon.
                if (disabledDomainIdSet.has(siteData.domainId)) {
                  var siteId = siteData.id;
                  ExtractNews.deleteSite(siteData);
                  _newsSiteDataMap.delete(siteId);
                  disposingPromises.push(_Storage.removeSiteFavicon(siteId));
                  Debug.printMessage(
                    "Delete the site data and favicon of " + siteId + ".");
                }
              });
            disposingPromises.push(
              _Storage.writeSiteData().then(() => {
                  _newsSiteSavedAccessCount = 0;
                }));
          }
          Promise.all(disposingPromises);
        });
    }

    _Daemon.updateNewsDomainData = updateNewsDomainData;

    // Executes writing the site data accessed in SITE_DATA_SAVED_MINUTES
    // and modifying it every SITE_DATA_MODIFIED_PERIOD by the alarm.

    const ALARM_WRITE_SITE_DATA = "Write";
    const ALARM_MODIFY_SITE_DATA = "Modify";

    browser.alarms.create(ALARM_WRITE_SITE_DATA, {
        periodInMinutes: SITE_DATA_SAVED_MINUTES
      });

    function _writeNewsSiteData() {
      return _Storage.writeSiteData().then(() => {
          _newsSiteSavedAccessCount = 0;
          Debug.printMessage("Write the site data ...");
          ExtractNews.forEachSite((siteData) => {
              if (Debug.isLoggingOn()) {
                Debug.dump("\t", siteData.accessCount, siteData.url);
              }
            });
        });
    }

    function _modifyNewsSiteAccessCount(passedCount = 0) {
      const writingPromises = new Array();
      var deletedSiteDataArray = new Array();
      // Multiply the access count for each news site by the common ratio in
      // a period, and write the modified time moved by the specified count
      // and those site data into the storage.
      var commonRatio = SITE_ACCESS_WEEK_RATIO;
      if (passedCount > 0) {
        commonRatio = Math.pow(commonRatio, passedCount);
        _newsSiteDataModifiedTime += SITE_DATA_MODIFIED_PERIOD * passedCount;
      }
      writingPromises.push(
        _Storage.writeSiteDataLastModifiedTime(_newsSiteDataModifiedTime));
      Debug.printMessage("Modify and write the site data ...");
      ExtractNews.forEachSite((siteData) => {
          var oldCountData = "(" + String(siteData.accessCount) + ")";
          siteData.modifyAccessCount(commonRatio);
          if (Debug.isLoggingOn()) {
            Debug.dump("\t", siteData.accessCount, oldCountData, siteData.url);
          }
          if (siteData.accessCount <= 0) { // No access in a week
            deletedSiteDataArray.push(siteData);
          }
        });
      deletedSiteDataArray.forEach((siteData) => {
          // Delete the site data when the access count for it is zero
          // but retain the favicon.
          ExtractNews.deleteSite(siteData);
          _newsSiteDataMap.delete(siteData.id);
          Debug.printMessage("Delete the site data of " + siteData.id + ".");
        });
      writingPromises.push(
        _Storage.writeSiteData().then(() => {
            _newsSiteSavedAccessCount = 0;
          }));
      return Promise.all(writingPromises);
    }

    browser.alarms.onAlarm.addListener((alarm) => {
        var writingPromise = undefined;
        switch (alarm.name) {
        case ALARM_WRITE_SITE_DATA:
          if (_newsSiteSavedAccessCount > 0) {
            writingPromise = _writeNewsSiteData();
          }
          break;
        case ALARM_MODIFY_SITE_DATA:
          writingPromise =
            _modifyNewsSiteAccessCount().then(() => {
                _newsSiteDataModifiedTime += SITE_DATA_MODIFIED_PERIOD;
                Debug.printMessage(
                  "Set the next alarm at "
                  + (new Date(_newsSiteDataModifiedTime).toString()) + ".");
              });
          break;
        }
        if (writingPromise != undefined) {
          writingPromise.catch((error) => {
              Debug.printStackTrace(error);
            });
        }
      });

    // Reads the domain, site, or filtering data, and comment hidden flags
    // from the storage, saved previously.

    {
      const readingPromises = new Array();

      readingPromises.push(
        _Storage.readDomainData().then(() => {
            _Storage.readContextMenuDisabled().then((contextMenuDisabled) => {
                if (! contextMenuDisabled) {
                  _Menus.createContextMenus();
                }
              });
            const commentPromises = new Array();
            Debug.printMessage("Read the comment mode ...");
            ExtractNews.setDomainSites();
            ExtractNews.forEachSite((siteData) => {
                commentPromises.push(
                  _Storage.readCommentMode(siteData.id).then((commentOn) => {
                      _newsSiteCommentHiddenMap.set(siteData.id, ! commentOn);
                      if (Debug.isLoggingOn()) {
                        Debug.dump("\t", String(commentOn), siteData.id);
                      }
                    }));
              });
            ExtractNews.clearDomainSites();
            return Promise.all(commentPromises);
          }).then(() => {
            return _Storage.readSiteData();
          }).then((siteDataArray) => {
            siteDataArray.forEach((siteData) => {
                _newsSiteDataMap.set(siteData.id, siteData);
              });
            return _Storage.readSiteDataLastModifiedTime();
          }).then((lastModifiedTime) => {
            const writingPromises = new Array()
            if (lastModifiedTime >= 0) {
              _newsSiteDataModifiedTime = lastModifiedTime;
              var passedCount =
                Math.floor(
                  (Date.now() - lastModifiedTime) / SITE_DATA_MODIFIED_PERIOD);
              if (passedCount > 0) {
                Debug.printMessage(
                  String(passedCount) + " day" + (passedCount > 1 ? "s" : "")
                  + " passed from the last modified time.");
                writingPromises.push(_modifyNewsSiteAccessCount(passedCount));
              }
            } else { // No domain or site data, and selection in the storage
              ExtractNews.forEachDomain((domainData) => {
                  if (ExtractNews.isDomainEnabled(domainData.id)) {
                    writingPromises.push(
                      ExtractNews.writeDomainLanguage(domainData));
                  }
                });
              var newsSelectionIds = splitLocalizedString("SelectionIds");
              var newsSelections = new Array();
              for (let i = 0; i < newsSelectionIds.length; i++) {
                var newsSelectionData =
                  splitLocalizedString("Selection" + newsSelectionIds[i]);
                var newsSelection = ExtractNews.newSelection();
                newsSelection.settingName = newsSelectionData[0];
                newsSelection.topicRegularExpression = newsSelectionData[1];
                newsSelection.senderRegularExpression = newsSelectionData[2];
                newsSelection.openedUrl = newsSelectionData[3];
                newsSelections.push(newsSelection);
              }
              writingPromises.push(_Storage.writeSelectionAll(newsSelections));
              // Write the current time as the last modified time of site data.
              lastModifiedTime = Date.now();
              writingPromises.push(
                _Storage.writeSiteDataLastModifiedTime(lastModifiedTime));
              _newsSiteDataModifiedTime = lastModifiedTime;
            }
            return Promise.all(writingPromises);
          }).then(() => {
            // Set the alarm started from the next modified time of site data.
            var siteDataModifiedMinutes = SITE_DATA_MODIFIED_PERIOD / 60000;
            _newsSiteDataModifiedTime += SITE_DATA_MODIFIED_PERIOD;
            browser.alarms.create(ALARM_MODIFY_SITE_DATA, {
                when: _newsSiteDataModifiedTime,
                periodInMinutes: siteDataModifiedMinutes
              });
            Debug.printMessage(
              "Start the alarm in " + String(siteDataModifiedMinutes / 60)
              + " hours from "
              + (new Date(_newsSiteDataModifiedTime).toString()) + ".");
          }),
        _Storage.readFilteringDisabled().then((filteringDisabled) => {
            _newsFilteringDisabled = filteringDisabled;
          }),
        readFilteringData());

      Promise.all(readingPromises).catch((error) => {
          Debug.printStackTrace(error);
        });
    }

    return _Daemon;
  })();

const Daemon = ExtractNews.Daemon;
const Menus = ExtractNews.Menus;

// Dispatches the process by the message received from the content script,
// popup list, edit window, message dialog, and option page.

browser.runtime.onMessage.addListener((message, sender) => {
    var settingPromise = undefined;
    Debug.printMessage(
      "Receive the command " + message.command.toUpperCase()
      + (sender.tab != undefined ? " from Tab " + sender.tab.id : "" ) + ".");
    switch (message.command) {
    case ExtractNews.COMMAND_SETTING_REQUEST:
      if (message.openedUrl != undefined) {
        // Receive the request of sending the setting to select and exclude
        // news topics and/or senders on a tab from the content script.
        settingPromise =
          Daemon.requestTabNewsSetting(
            sender.tab, message.openedUrl, message.topicWordsString);
      } else { // Request of tab's information
        settingPromise =
          Daemon.informTabNewsSetting(sender.tab, message.tabId);
      }
      break;
    case ExtractNews.COMMAND_SETTING_SELECT:
      if (message.newsSelectionObjects.length > 0) {
        // Receive settings to select news topics and/or senders from the list
        // of news selections, which applied to a tab of the specified ID.
        settingPromise =
          Daemon.applyTabNewsSelections(
            message.tabId, message.tabUrl, message.newsSelectionObjects);
      }
      break;
    case ExtractNews.COMMAND_SETTING_UPDATE:
      if (message.domainDataObjects != undefined) {
        // Receive data objects for each domain updated on the option page.
        settingPromise =
          Daemon.updateNewsDomainData(message.domainDataObjects).then(() => {
              if (message.filteringUpdated) {
                Daemon.updateFilteringData();
              }
            });
      } else if (message.filteringUpdated) {
        settingPromise = Daemon.updateFilteringData();
      } else {
        // Receive settings in "Advanced Options" from the option page
        // when changed immediately.
        var updatingPromises = new Array();
        if (message.filteringDisabled != undefined) {
          updatingPromises.push(
            Daemon.switchNewsDisplayOptions({
                filteringDisabled: message.filteringDisabled
              }));
        }
        if (message.contextMenuDisabled != undefined) {
          if (message.contextMenuDisabled) {
            updatingPromises.push(Menus.removeContextMenus());
          } else if (! Menus.hasCreated()) {
            updatingPromises.push(Menus.createContextMenus());
          }
        }
        if (message.debugOn != undefined) {
          ExtractNews.setDebugMode(message.debugOn);
        }
        settingPromise = Promise.all(updatingPromises);
      }
      break;
    case ExtractNews.COMMAND_DIALOG_OPEN:
      settingPromise =
        Daemon.setTabMessageDialog(message.tabId, message.warning);
      break;
    case ExtractNews.COMMAND_DIALOG_STANDBY:
      settingPromise = Daemon.sendTabWarningMessage(message.tabId);
      break;
    case ExtractNews.COMMAND_DIALOG_CLOSE:
      settingPromise = Daemon.removeTabMessageDialog(message.tabId);
      break;
    }
    if (settingPromise != undefined) {
      settingPromise.catch((error) => {
          Debug.printStackTrace(error);
        });
    }
  });

browser.contextMenus.onClicked.addListener((info, tab) => {
    var applyingPromise = undefined;
    switch (info.menuItemId) {
    case Menus.ID_SELECT_NEWS_TOPIC:
    case Menus.ID_SELECT_NEWS_SENDER:
      applyingPromise =
        Daemon.selectTabNews(tab.id, info.selectionText, {
            topicSelected: info.menuItemId == Menus.ID_SELECT_NEWS_TOPIC,
            senderSelected: info.menuItemId == Menus.ID_SELECT_NEWS_SENDER,
            regexpAdded: true
          });
      break;
    case Menus.ID_EXCLUDE_NEWS_TOPIC:
      applyingPromise =
        Daemon.excludeTabNews(tab.id, info.selectionText, true);
      break;
    case Menus.ID_DISABLE_TAB_LINK:
      applyingPromise = Daemon.setTabLinkDisabled(tab.id, info.checked);
      break;
    case Menus.ID_DISABLE_TAB_NEWS_SELECTION:
      var tabSetting = Daemon.getTabSetting(tab.id);
      tabSetting.setNewsSelectionDisabled(info.checked);
      applyingPromise = Daemon.sendTabSwitchMessage(tab.id);
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
      applyingPromise = Daemon.setTabCommentHidden(tab.id, info.checked);
      break;
    case Menus.ID_OPTION:
      applyingPromise = callAsynchronousAPI(browser.runtime.openOptionsPage);
      break;
    }
    if (applyingPromise != undefined) {
      applyingPromise.catch((error) => {
          Debug.printStackTrace(error);
        });
    }
  });

// Updates the context menu for the tab of a new site when activated.

browser.tabs.onActivated.addListener((activeInfo) => {
    if (Menus.hasCreated()) {
      Menus.updateContextMenus(
        Daemon.getTabSetting(activeInfo.tabId)).catch((error) => {
          Debug.printStackTrace(error);
        });
    }
  });

// Closes the dialog and remove the setting for the tab of a new site
// in the background script when removed.

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    Daemon.removeTabSetting(tabId);
    Daemon.removeTabMessageDialog(tabId).catch((error) => {
        Debug.printStackTrace(error);
      });
  });
