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
        QUERY_SELECTION_INDEX_STRINGS: "selectionIndexStrings"
      };

    function _getQueryString(name, value) {
      var queryString = name + "=";
      if (Array.isArray(value)) {
        queryString += value.join(",");
      } else {
        queryString += String(value);
      }
      return queryString;
    }

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
      var queryMap = new Map();
      var queryIndex = url.indexOf("?") + 1;
      if (queryIndex > 0) {
        var queryString = url.substring(queryIndex);
        (new URLSearchParams(queryString)).forEach((queryValue, queryKey) => {
            switch (queryKey) {
            case _Popup.QUERY_OPENER_TAB_ID:
              queryMap.set(queryKey, Number(queryValue));
              break;
            case _Popup.QUERY_SELECTION_INDEX_STRINGS:
              var queryArray;
              if (queryValue != "") {
                queryArray = queryValue.split(",");
              } else {
                queryArray = new Array();
              }
              queryMap.set(queryKey, queryArray);
              break;
            }
          });
      }
      return queryMap;
    }

    _Popup.getQueryMap = getQueryMap;


    function _queryTab(tabInfo = { }) {
      return callAsynchronousAPI(browser.tabs.query, tabInfo).then((tabs) => {
          if (browser.runtime.lastError != undefined) {
            Debug.printProperty(
              "tabs.query()", browser.runtime.lastError.message);
          }
          return Promise.resolve(tabs);
        })
    }

    /*
     * Finds the tab of the specified ID from all tabs opened on the browser
     * and returns the promise fulfilled with its information.
     */
    function searchTab(tabId) {
      return _queryTab().then((tabs) => {
          if (tabs != undefined) {
            for (const tab of tabs) {
              if (tabId == tab.id) {
                return Promise.resolve(tab);
              }
            }
          }
        })
    }

    /*
     * Gets the tab of the specified ID and returns the promise fulfilled with
     * its information.
     */
    function getTab(tabId) {
      return callAsynchronousAPI(browser.tabs.get, tabId).then((tab) => {
          if (browser.runtime.lastError != undefined) {
            Debug.printProperty(
              "tabs.get()", browser.runtime.lastError.message);
          }
          return Promise.resolve(tab);
        });
    }

    /*
     * Gets the active tab on the current window and returns the promise
     * fulfilled with its information.
     */
    function getWindowActiveTab() {
      return _queryTab({
          currentWindow: true,
          active: true
        }).then((tabs) => {
          if (tabs != undefined && tabs.length > 0) {
            return Promise.resolve(tabs[0]);
          }
        });
    }

    _Popup.searchTab = searchTab;
    _Popup.getWindowActiveTab = getWindowActiveTab;


    function _getEditMessage(id) {
      return browser.i18n.getMessage("edit" + id);
    }

    function _getEditElement(id, tagName) {
      var element = document.getElementById(id);
      var label = element.querySelector("label");
      if (label != null) {
        label.textContent = _getEditMessage(id);
      }
      if (tagName != undefined) {
        element = element.querySelector(tagName);
      }
      return element;
    }

    const SELECTION_EDIT_SETTING_NAME = "SettingName";
    const SELECTION_EDIT_SELECTED_TOPIC = "SelectedTopic";
    const SELECTION_EDIT_SELECTED_SENDER = "SelectedSender";
    const SELECTION_EDIT_OPENED_URL = "OpenedUrl";

    /*
     * Returns an object to edit a news selection on the pane, which consists
     * of an inupt element for the setting name, the array of objects to input
     * the regular expression of selected topics and senders, and a select
     * element for the URL of news sites.
     */
    function getSelectionEditPane(editTitleSelectors, editTabId) {
      if (editTitleSelectors == undefined) {
        throw newNullPointerException("editTitleSelectors");
      } else if ((typeof editTitleSelectors) != "string") {
        throw newIllegalArgumentException("editTitleSelectors");
      } else if (editTabId != undefined && ! Number.isInteger(editTabId)) {
        throw newIllegalArgumentException("editTabId");
      }
      var editPane = {
          tabId: editTabId,
          titleElement: document.querySelector(editTitleSelectors),
          nameInput: _getEditElement(SELECTION_EDIT_SETTING_NAME, "input"),
          regexps: new Array(),
          localizedButtons: new Array(),
          urlSelect: _getEditElement(SELECTION_EDIT_OPENED_URL, "select")
        };
      var editRegexpDivs =
        Array.of(
          _getEditElement(SELECTION_EDIT_SELECTED_TOPIC),
          _getEditElement(SELECTION_EDIT_SELECTED_SENDER));
      var editUILanguage = browser.i18n.getUILanguage();

      editPane.nameInput.maxLength = _Alert.SETTING_NAME_MAX_WIDTH;
      editRegexpDivs.forEach((editRegexpDiv) => {
          var editTextarea = editRegexpDiv.querySelector("textarea");
          var editRegexp = {
              name: editRegexpDiv.querySelector("label").textContent,
              textarea: editTextarea,
              errorChecked: false
            };
          editTextarea.maxLength = _Alert.REGEXP_MAX_UTF16_CHARACTERS;
          editTextarea.placeholder = _getEditMessage("InputRegularExpression");
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
            editLocalizedButton.textContent = _getEditMessage("Localize");
            editLocalizedButton.value = String(editPane.regexps.length);
            editLocalizedButton.style.visibility = "visible";
            if (editRegexpDiv.id == SELECTION_EDIT_SELECTED_TOPIC) {
              editRegexp.warningMaxUtf16CharactersExceeded =
                _Alert.getWarning(
                  _Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED);
            } else {
              editRegexp.warningMaxUtf16CharactersExceeded =
                _Alert.getWarning(
                  _Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED);
            }
            editPane.localizedButtons.push(editLocalizedButton);
          }
          editPane.regexps.push(editRegexp);
        });
      return editPane;
    }

    function _addEditUrlOption(editUrlSelect, url) {
      var editUrlOption = document.createElement("option");
      editUrlOption.value = url;
      editUrlOption.text = url;
      editUrlSelect.appendChild(editUrlOption);
      return editUrlOption;
    }

    const SELECTION_EDIT_TITLE = _getEditMessage("NewsSelection");
    const SELECTION_EDIT_NUMBER_SUFFIX = "#";

    /*
     * Returns the title number string to edit the news selection
     * of the specified index on the pane.
     */
    function getSelectionEditTitleNumber(editIndex) {
      if (! Number.isInteger(editIndex)) {
        throw newIllegalArgumentException("editIndex");
      }
      return SELECTION_EDIT_NUMBER_SUFFIX + String(editIndex + 1);
    }

    /*
     * Sets the title in the specified object to edit the news selection
     * of the specified index on the pane.
     */
    function setSelectionEditTitle(editPane, editIndex) {
      if (editPane == undefined) {
        throw newNullPointerException("editPane");
      }
      editPane.titleElement.textContent =
        SELECTION_EDIT_TITLE + " " + getSelectionEditTitleNumber(editIndex);
    }

    /*
     * Clears the title in the specified object to edit the news selection
     * on the pane.
     */
    function clearSelectionEditTitle(editPane) {
      if (editPane == undefined) {
        throw newNullPointerException("editPane");
      }
      editPane.titleElement.textContent = "";
    }

    function _setEditUrlSelect(editPane, openedUrl, tabSelectionOpenedUrl) {
      var editUrlSelect = editPane.urlSelect;
      var openedSiteId = undefined;
      var openedUrlAppended = false;
      if (openedUrl != "") {
        if (openedUrl != URL_ABOUT_BLANK) {
          if (openedUrl == tabSelectionOpenedUrl) {
            tabSelectionOpenedUrl = undefined;
          }
          var openedSiteData = ExtractNews.getSite(openedUrl);
          if (openedSiteData != undefined) {
            openedSiteId = openedSiteData.id;
          }
          openedUrlAppended = true;
        }
      }

      // Put URLs to the select element on the edit pane in below order.
      //
      //   https://devices.slashdot.org          - Opener tab on a news site
      //   https://www.yahoo.com
      //   https://www.yahoo.com/entertainment/  - Opened URL if not empty
      //   https://slashdot.org
      //   about:blank
      //
      // The priority which the URL is selected firstly in the select element
      // is in the order of the opened URL, opener tab, and "about:blank".
      // The opener tab same as the opened URL is not added and one of news
      // sites same as the opener tab is also not added.
      var selectedUrlOption = undefined;
      if (tabSelectionOpenedUrl != "") { // Opener tab on a news site
        var tabSelectionOpenedUrlOption =
          _addEditUrlOption(editUrlSelect, tabSelectionOpenedUrl);
        if (openedUrl == "") {
          selectedUrlOption = tabSelectionOpenedUrlOption;
        }
      }
      ExtractNews.forEachSite((siteData) => {
          if (! ExtractNews.isDomainEnabled(siteData.domainId)) {
            return;
          }
          var siteUrl = siteData.url;
          if (siteUrl != tabSelectionOpenedUrl) {
            var siteUrlOption = _addEditUrlOption(editUrlSelect, siteUrl);
            if (siteUrl == openedUrl) { // Opened URL same as a news site
              selectedUrlOption = siteUrlOption;
              openedUrlAppended = false;
            } else if (siteData.id == openedSiteId) {
              // Append the option element for the specified opened URL to
              // the next of a news site which contains it.
              selectedUrlOption = _addEditUrlOption(editUrlSelect, openedUrl);
              openedUrlAppended = false;
            }
          }
        });
      if (openedUrlAppended) { // Opened URL of no news site
        selectedUrlOption = _addEditUrlOption(editUrlSelect, openedUrl);
      }
      var aboutBlankOption = _addEditUrlOption(editUrlSelect, URL_ABOUT_BLANK);
      if (selectedUrlOption == undefined) { // "about:blank" or new edit
        selectedUrlOption = aboutBlankOption;
      }
      selectedUrlOption.selected = true;
    }

    /*
     * Sets the URL of news sites opened by a news selection into the select
     * element in the specified object to edit it on the pane.
     */
    function setSelectionEditUrlSelect(editPane, openedUrl = "") {
      if (editPane == undefined) {
        throw newNullPointerException("editPane");
      } else if (editPane.tabId != undefined) {
        // Receive the opened URL on the news site tab of the specified ID.
        browser.runtime.onMessage.addListener((message) => {
            if (message.command == ExtractNews.COMMAND_SETTING_INFORM) {
              _setEditUrlSelect(
                editPane, openedUrl, message.selectionOpenedUrl);
            }
          });
        ExtractNews.sendRuntimeMessage({
            command: ExtractNews.COMMAND_SETTING_REQUEST,
            tabId: editPane.tabId
          }).catch((error) => {
            Debug.printStackTrace(error);
          });
      } else {
        _setEditUrlSelect(editPane, openedUrl, "");
      }
    }

    /*
     * Clears the URL of news sites opened by a news selection into the select
     * element in the specified object to edit it on the pane.
     */
    function clearSelectionEditUrlSelect(editPane) {
      if (editPane == undefined) {
        throw newNullPointerException("editPane");
      }
      var editUrlSelect = editPane.urlSelect;
      var editUrlOptions = Array.from(editUrlSelect.children);
      for (let i = 0; i < editUrlOptions.length; i++) {
        editUrlSelect.removeChild(editUrlOptions[i]);
      }
    }

    _Popup.getSelectionEditPane = getSelectionEditPane;

    _Popup.getSelectionEditTitleNumber = getSelectionEditTitleNumber;
    _Popup.setSelectionEditTitle = setSelectionEditTitle;
    _Popup.clearSelectionEditTitle = clearSelectionEditTitle;

    _Popup.setSelectionEditUrlSelect = setSelectionEditUrlSelect;
    _Popup.clearSelectionEditUrlSelect = clearSelectionEditUrlSelect;


    // URL of only an edit window opened on the extension
    const EDIT_WINDOW_URL = browser.runtime.getURL("popup/edit.html");

    /*
     * Creates the window to edit a news selection for the specified indexes
     * and the promise with fulfilled with its tab ID or rejected. If the array
     * has a negative or multiple indexes, edit for new setting.
     */
    function openSelectionEditWindow(indexStrings = new Array()) {
      if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      }
      return getWindowActiveTab().then((tab) => {
          callAsynchronousAPI(browser.windows.create, {
              url: EDIT_WINDOW_URL + "?"
                + _getQueryString(_Popup.QUERY_OPENER_TAB_ID, tab.id)
                + "&" + _getQueryString(
                  _Popup.QUERY_SELECTION_INDEX_STRINGS, indexStrings),
              type: "popup",
              height: 575,
              width: 540
            });
        });
    }

    /*
     * Finds the window to edit a news selection from all tabs opened on
     * the browser and returns the promise fulfilled with its information.
     */
    function searchSelectionEditWindow() {
      return _queryTab().then((tabs) => {
          if (tabs != undefined) {
            for (const tab of tabs) {
              if (tab.url.startsWith(EDIT_WINDOW_URL)) {
                return Promise.resolve(tab);
              }
            }
          }
        });
    }

    /*
     * Closes the window to edit a news selection and returns the promise.
     */
    function closeSelectionEditWindow() {
      return searchSelectionEditWindow().then((tab) => {
          if (tab != undefined) {
            return callAsynchronousAPI(browser.tabs.remove, tab.id);
          }
        });
    }

    _Popup.openSelectionEditWindow = openSelectionEditWindow;
    _Popup.searchSelectionEditWindow = searchSelectionEditWindow;
    _Popup.closeSelectionEditWindow = closeSelectionEditWindow;

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
            var siteData = ExtractNews.getSite(tab.url);
            if (siteData != undefined) {
              // Update the active tab by the opened URL of news selections
              // if its site is not enabled.
              tabUpdated = ! ExtractNews.isDomainEnabled(siteData.domainId);
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
                callAsynchronousAPI(browser.tabs.update, tab.id, {
                    active: ! tabOpen,
                    url: newsSelections[0].openedUrl
                  });
              }
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
