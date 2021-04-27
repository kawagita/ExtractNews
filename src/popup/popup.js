/*
 *  Define functions and constant variables for the popup window.
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
 * Functions and constant variables to open or close the edit or dialog window.
 */
ExtractNews.Popup = (() => {
    const _Popup = {
        // Query string added to URL of the edit window or dialog
        QUERY_OPENER_TAB_ID: "openerTabId",
        QUERY_NEWS_SELECTION_INDEX_STRINGS: "newsSelectionIndexStrings"
      };

    function _getQueryString(name, value) {
      var queryString = name + "=";
      if ((typeof value) == "number") {
        queryString += String(value);
      } else {
        queryString += value.join(",");
      }
      return queryString;
    }

    const QUERY_KEYS = [
        _Popup.QUERY_OPENER_TAB_ID,
        _Popup.QUERY_NEWS_SELECTION_INDEX_STRINGS
      ];

    /*
     * Returns the map of parameters parsed from the query string
     * of the specified URL.
     */
    function getQueryMap(url) {
      if (url == undefined) {
        throw newNullPointerException("url");
      } else if ((typeof url) != "string") {
        throw newIllegalArgumentException("url");
      } else if (url == "") {
        throw newEmptyStringException("url");
      }
      var queryIndex = url.indexOf("?") + 1;
      var queryMap = new Map();
      var queryParams = new URLSearchParams(url.substring(queryIndex));

      QUERY_KEYS.forEach((queryKey) => {
          if (queryParams.has(queryKey)) {
            var queryValue = queryParams.get(queryKey);
            switch (queryKey) {
            case _Popup.QUERY_OPENER_TAB_ID:
              queryMap.set(queryKey, Number(queryValue));
              break;
            case _Popup.QUERY_NEWS_SELECTION_INDEX_STRINGS:
              var queryArray;
              if (queryValue != "") {
                queryArray = queryValue.split(",");
              } else {
                queryArray = new Array();
              }
              queryMap.set(queryKey, queryArray);
              break;
            }
          }
        });
      return queryMap;
    }

    _Popup.getQueryMap = getQueryMap;

    /*
     * Finds the tab of the specified ID from all tabs opened on the browser
     * and returns the promise fulfilled with its information.
     */
    function searchTab(tabId) {
      return callAsynchronousAPI(browser.tabs.query, { }).then((tabs) => {
          for (let i = 0; i < tabs.length; i++) {
            if (tabId == tabs[i].id) {
              return Promise.resolve(tabs[i]);
            }
          }
          return Promise.resolve();
        })
    }

    /*
     * Gets the tab of the specified ID and returns the promise fulfilled with
     * its information.
     */
    function getTab(tabId) {
      return callAsynchronousAPI(browser.tabs.get, tabId);
    }

    /*
     * Gets the active tab on the current window and returns the promise
     * fulfilled with its information.
     */
    function getWindowActiveTab() {
      return callAsynchronousAPI(browser.tabs.query, {
          currentWindow: true,
          active: true
        }).then((tabs) => {
          return Promise.resolve(tabs[0]);
        });
    }

    _Popup.searchTab = searchTab;
    _Popup.getTab = getTab;
    _Popup.getWindowActiveTab = getWindowActiveTab;

    function _getEditMessage(messageIdPrefix, id) {
      return browser.i18n.getMessage(messageIdPrefix + id);
    }

    function _getEditElement(messageIdPrefix, id, tagName) {
      var element = document.getElementById(id);
      var label = element.querySelector("label");
      if (label != null) {
        label.textContent = _getEditMessage(messageIdPrefix, id);
      }
      if (tagName != undefined) {
        element = element.querySelector(tagName);
      }
      return element;
    }

    /*
     * Returns an object to edit a news selection on the pane, which consists
     * of an inupt element for the setting name, the array of objects to input
     * the regular expression of selected topics and senders, and a select
     * element for the URL of news sites.
     */
    function getNewsSelectionEditPane(editTabId) {
      if (editTabId != undefined && ! Number.isInteger(editTabId)) {
        throw newIllegalArgumentException("editTabId");
      }
      var editMessageIdPrefix = "option";
      var editPane = {
          nameInput: undefined,
          regexps: undefined,
          localizedButtons: new Array(),
          urlSelect: undefined,
          _openerTabNewsOpenedUrl: undefined,
          _newsOpenedUrl: undefined
        };
      var editUILanguage = browser.i18n.getUILanguage();
      var editNameInput =
        _getEditElement(editMessageIdPrefix, "SettingName", "input");
      var editSelectedTopicDiv =
        _getEditElement(editMessageIdPrefix, "SelectedTopic");
      var editSelectedSenderDiv =
        _getEditElement(editMessageIdPrefix, "SelectedSender");
      var editRegexps = new Array();
      var editUrlSelect =
        _getEditElement(editMessageIdPrefix, "OpenedUrl", "select");
      editPane.nameInput = editNameInput;
      editPane.regexps = editRegexps;
      editPane.urlSelect = editUrlSelect;

      if (editTabId != undefined) {
        // Receive the news opened URL on the tab of the specified ID.
        browser.runtime.onMessage.addListener((message) => {
            if (message.command != ExtractNews.COMMAND_SETTING_INFORM) {
              return;
            }
            for (const newsSite of ExtractNews.getNewsSites()) {
              if (message.newsOpenedUrl == newsSite.url) {
                // Never insert the duplicate URL as one of news sites.
                return;
              }
            }
            if (editPane._newsOpenedUrl == undefined
              || editPane._newsOpenedUrl != message.newsOpenedUrl) {
              // Insert the opener tab's URL which is not added by
              // setNewsSelectionEditUrlSelect() to the top of select
              // element on the edit pane.
              var openerTabUrlOption = document.createElement("option");
              openerTabUrlOption.value = message.newsOpenedUrl;
              openerTabUrlOption.text = message.newsOpenedUrl;
              editPane.urlSelect.insertBefore(
                openerTabUrlOption, editPane.urlSelect.firstElementChild);
              openerTabUrlOption.selected = true;
              editPane._openerTabNewsOpenedUrl = message.newsOpenedUrl;
            }
          });
        ExtractNews.sendRuntimeMessage({
            command: ExtractNews.COMMAND_SETTING_REQUEST,
            tabId: editTabId
          });
        editMessageIdPrefix = "edit";
      }
      editNameInput.maxLength = _Alert.SETTING_NAME_MAX_WIDTH;
      editNameInput.placeholder =
        _getEditMessage(editMessageIdPrefix, "InputTitle");
      Array.of(
        editSelectedTopicDiv,
        editSelectedSenderDiv).forEach((editRegexpDiv) => {
          var editTextarea = editRegexpDiv.querySelector("textarea");
          var editRegexp = {
              name: editRegexpDiv.querySelector("label").textContent,
              textarea: editTextarea,
              errorChecked: false
            };
          editTextarea.maxLength = _Alert.REGEXP_MAX_UTF16_CHARACTERS;
          editTextarea.placeholder =
            _getEditMessage(editMessageIdPrefix, "InputRegularExpression");
          editTextarea.addEventListener("input", (event) => {
              for (let i = 0; i < editPane.regexps.length; i++) {
                if (event.target == editPane.regexps[i].textarea) {
                  editPane.regexps[i].errorChecked = false;
                  break;
                }
              }
            });
          if (editUILanguage.startsWith("ja")) {
            // Enable the button to localize a regular expression.
            var editLocalizedButton = editRegexpDiv.querySelector(".localize");
            editLocalizedButton.textContent =
              _getEditMessage(editMessageIdPrefix, "Localize");
            editLocalizedButton.value = String(editRegexps.length);
            editLocalizedButton.style.visibility = "visible";
            if (editRegexpDiv == editSelectedTopicDiv) {
              editRegexp.warningMaxUtf16CharactersExceeded =
                _Alert.WARNING_SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED;
            } else {
              editRegexp.warningMaxUtf16CharactersExceeded =
                _Alert.WARNING_SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED;
            }
            editPane.localizedButtons.push(editLocalizedButton);
          }
          editRegexps.push(editRegexp);
        });
      return editPane;
    }

    function _addEditOpenedUrl(editUrlSelect, openedUrl) {
      var editUrlOption = document.createElement("option");
      editUrlOption.value = openedUrl;
      editUrlOption.text = openedUrl;
      editUrlSelect.appendChild(editUrlOption);
      return editUrlOption;
    }

    /*
     * Sets the URL of news sites opened by a news selection into the select
     * element in the specified object to edit it on the pane.
     */
    function setNewsSelectionEditUrlSelect(editPane, newsOpenedUrl = "") {
      if (editPane == undefined) {
        throw newNullPointerException("editPane");
      }
      var editUrlSelect = editPane.urlSelect;
      var newsOpenedUrlAppended = false;
      if (newsOpenedUrl != "") {
        if (newsOpenedUrl != URL_ABOUT_BLANK) {
          newsOpenedUrlAppended = true;
        }
        editPane._newsOpenedUrl = newsOpenedUrl;
      }
      // Put URLs to the select element on the edit pane in below order.
      //
      //   https://devices.slashdot.org          - Opener tab if exists
      //   https://www.yahoo.com
      //   https://www.yahoo.com/entertainment/  - Opened URL if exists
      //   https://slashdot.org
      //   about:blank
      //
      // The priority which the URL is selected firstly in the select element
      // is in the order of the opened URL, opener tab, and "about:blank".
      // If an opener tab is the same as the opened URL or one of news sites,
      // removed or not added by this function or event listner. 
      ExtractNews.getNewsSites().forEach((newsSite) => {
          var newsSiteUrl = newsSite.url;
          var editUrlOption = _addEditOpenedUrl(editUrlSelect, newsSiteUrl);
          if (newsSiteUrl == newsOpenedUrl) {
            editUrlOption.selected = true;
          } else if (newsOpenedUrlAppended) {
            if (newsSite.containsUrl(newsOpenedUrl)) {
              // Append the option element for the specified opened URL to
              // the next of news site which contains it.
              _addEditOpenedUrl(editUrlSelect, newsOpenedUrl).selected = true;
              if (newsOpenedUrl == editPane._openerTabNewsOpenedUrl) {
                // Remove the opener tab's URL from the top if inserted ahead.
                editUrlSelect.removeChild(editUrlSelect.firstElementChild);
              }
              newsOpenedUrlAppended = false;
            }
          }
        });
      if (newsOpenedUrlAppended) {
        _addEditOpenedUrl(editUrlSelect, newsOpenedUrl).selected = true;
      }
      var editUrlOption = _addEditOpenedUrl(editUrlSelect, URL_ABOUT_BLANK);
      if (newsOpenedUrl == URL_ABOUT_BLANK
        || (newsOpenedUrl == ""
          && editPane._openerTabNewsOpenedUrl == undefined)) {
        editUrlOption.selected = true;
      }
    }

    /*
     * Clears the URL of news sites opened by a news selection into the select
     * element in the specified object to edit it on the pane.
     */
    function clearNewsSelectionEditUrlSelect(editPane) {
      if (editPane == undefined) {
        throw newNullPointerException("editPane");
      }
      var editUrlSelect = editPane.urlSelect;
      var editUrlOptions = Array.from(editUrlSelect.children);
      for (let i = 0; i < editUrlOptions.length; i++) {
        editUrlSelect.removeChild(editUrlOptions[i]);
      }
      editPane._newsOpenedUrl = undefined;
    }

    _Popup.getNewsSelectionEditPane = getNewsSelectionEditPane;
    _Popup.setNewsSelectionEditUrlSelect = setNewsSelectionEditUrlSelect;
    _Popup.clearNewsSelectionEditUrlSelect = clearNewsSelectionEditUrlSelect;

    // URL of edit window only opened on the extension
    const EDIT_WINDOW_URL = browser.runtime.getURL("popup/edit.html");

    /*
     * Creates the window to edit a news selection for the specified indexes
     * and the promise with fulfilled with its tab ID or rejected. If the array
     * has a negative or multiple indexes, edit for new setting.
     */
    function openNewsSelectionEditWindow(indexStrings = new Array()) {
      if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      }
      return getWindowActiveTab().then((tab) => {
          return callAsynchronousAPI(browser.windows.create, {
              url: EDIT_WINDOW_URL + "?"
                + _getQueryString(_Popup.QUERY_OPENER_TAB_ID, tab.id)
                + "&" + _getQueryString(
                  _Popup.QUERY_NEWS_SELECTION_INDEX_STRINGS, indexStrings),
              type: "popup",
              height: 575,
              width: 540
            });
        });
    }

    /*
     * Checks whether the window to edit a news selection has been opened
     * and returns the promise fulfilled with its tab ID if exists, otherwise,
     * browser.tabs.TAB_ID_NONE.
     */
    function queryNewsSelectionEditWindow() {
      return callAsynchronousAPI(browser.tabs.query, { }).then((tabs) => {
          for (let i = 0; i < tabs.length; i++) {
            if (tabs[i].url.startsWith(EDIT_WINDOW_URL)) {
              return Promise.resolve(tabs[i].id);
            }
          }
          return Promise.resolve(browser.tabs.TAB_ID_NONE);
        });
    }

    /*
     * Closes the window to edit a news selection and returns the promise.
     */
    function closeNewsSelectionEditWindow() {
      return queryNewsSelectionEditWindow().then((editWindowTabId) => {
          if (editWindowTabId != browser.tabs.TAB_ID_NONE) {
            return callAsynchronousAPI(browser.tabs.remove, editWindowTabId);
          }
          return Promise.resolve();
        });
    }

    _Popup.openNewsSelectionEditWindow = openNewsSelectionEditWindow;
    _Popup.queryNewsSelectionEditWindow = queryNewsSelectionEditWindow;
    _Popup.closeNewsSelectionEditWindow = closeNewsSelectionEditWindow;

    /*
     * Applies the setting of news selections in the specified array to a tab
     * and returns the promise.
     */
    function openNewsSelectionsInTab(tabOpen, newsSelections) {
      if (! Array.isArray(newsSelections)) {
        throw newIllegalArgumentException("newsSelections");
      } else if (newsSelections.length == 0) {
        return Promise.resolve();
      }
      var tabGettingPromise;
      var newsSelectionObjects = new Array();
      newsSelections.forEach((newsSelection) => {
          newsSelectionObjects.push(newsSelection.toObject());
        });
      //                            In this tab   In new tab
      //
      // Enabled site               Current URL   Opened URL
      // Disabled or no news site   Opened URL    Opened URL
      //
      // Divide by the state of a site on the active tab, and apply news
      // selections to the current URL on enabled sites if open in this tab,
      // otherwise, update by the opened URL of its.
      if (tabOpen) {
        tabGettingPromise = callAsynchronousAPI(browser.tabs.create, {
            active: false,
            url: URL_ABOUT_BLANK
          });
      } else {
        tabGettingPromise = getWindowActiveTab();
      }
      return tabGettingPromise.then((tab) => {
          var tabUpdated = true;
          if (! tabOpen) {
            var newsSite = ExtractNews.getNewsSite(tab.url);
            if (newsSite != undefined) {
              // Update the active tab by the opened URL of news selections
              // if its site is not enabled.
              tabUpdated = ! ExtractNews.isNewsSiteEnabled(newsSite.id);
            }
            if (tabUpdated && newsSelections[0].openedUrl == URL_ABOUT_BLANK) {
              return Promise.resolve();
            }
          }
          return ExtractNews.sendRuntimeMessage({
              command: ExtractNews.COMMAND_SETTING_SELECT,
              tabId: tab.id,
              tabOpen: tabOpen,
              tabUpdated: tabUpdated,
              newsSelectionObjects: newsSelectionObjects
            }).then(() => {
              if (tabUpdated) {
                return callAsynchronousAPI(browser.tabs.update, tab.id, {
                    active: ! tabOpen,
                    url: newsSelections[0].openedUrl
                  });
              }
              return Promise.resolve();
            });
        });
    }

    _Popup.openNewsSelectionsInTab = openNewsSelectionsInTab;

    // URL of the warning dialog opened for each tab
    const MESSAGE_DIALOG_URL = browser.runtime.getURL("popup/dialog.html");

    function _checkTabId(tabId) {
      if (! Number.isInteger(tabId)) {
        throw newIllegalArgumentException("tabId");
      } else if (tabId == browser.tabs.TAB_ID_NONE) {
        throw newInvalidParameterException(tabId);
      }
    }

    /*
     * Opens the dialog to display the string of a message and description to
     * a tab of the specified ID and returns the promise with fulfilled with
     * its tab ID or rejected.
     *
     * NOTE: Emphasises are set by matching characters enclosed with the first
     *       "(" and ")" in the specified regular expression.
     */
    function openMessageDialog(tabId, dialogSearchTabId) {
      _checkTabId(tabId);
      var dialogSearchPromise;
      if (dialogSearchTabId != undefined) {
        _checkTabId(dialogSearchTabId);
        dialogSearchPromise = searchTab(dialogSearchTabId).then((tab) => {
            if (tab != undefined) {
              return Promise.resolve(dialogSearchTabId);
            }
            // Open new dialog if has already been closed by [X] button.
            return Promise.resolve(browser.tabs.TAB_ID_NONE);
          });
      } else {
        dialogSearchPromise = Promise.resolve(browser.tabs.TAB_ID_NONE);
      }
      return dialogSearchPromise.then((dialogTabId) => {
          if (dialogTabId != browser.tabs.TAB_ID_NONE) {
            return getTab(dialogTabId).then((tab) => {
                return callAsynchronousAPI(
                  browser.windows.update, tab.windowId, { focused: true });
              }).then(() => {
                return Promise.resolve(dialogTabId);
              });
          }
          return callAsynchronousAPI(browser.windows.create, {
              url: MESSAGE_DIALOG_URL + "?"
                + _getQueryString(_Popup.QUERY_OPENER_TAB_ID, tabId),
              type: "popup",
              height: 220,
              width: 450
            }).then((windowInfo) => {
              return Promise.resolve(windowInfo.tabs[0].id);
            });
        });
    }

    _Popup.openMessageDialog = openMessageDialog;

    return _Popup;
  })();
