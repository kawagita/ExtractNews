/*
 *  Edit the setting to select news topics and/or senders on a window.
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

const _Storage = ExtractNews.Storage;
const _Text = ExtractNews.Text;
const _Regexp = ExtractNews.Regexp;
const _Alert = ExtractNews.Alert;
const _Event = ExtractNews.Event;
const _Popup = ExtractNews.Popup;

/*
 * Returns the edit message.
 */
function getEditMessage(id) {
  return browser.i18n.getMessage("edit" + id);
}

/*
 * Returns the button element to edit a news selection.
 */
function getEditButton(id) {
  var button = document.getElementById(id);
  button.textContent = getEditMessage(id);
  return button;
}

/*
 * Sends the specified warning message on this edit window to the background.
 */
function sendEditWarningMessage(warning) {
  callAsynchronousAPI(browser.tabs.getCurrent).then((tab) => {
      return ExtractNews.sendRuntimeMessage({
          command: ExtractNews.COMMAND_DIALOG_OPEN,
          tabId: tab.id,
          warning: warning.toObject()
        }, " on Edit Window Tab " + tab.id);
    }).catch((error) => {
      Debug.printStackTrace(error);
    });
}

var newsSelectionEditQueryMap = _Popup.getQueryMap(document.URL);
var newsSelectionEditPane =
  _Popup.getNewsSelectionEditPane(
    newsSelectionEditQueryMap.get(_Popup.QUERY_OPENER_TAB_ID));
var newsSelectionEditPointedGroup = new _Event.PointedGroup();

newsSelectionEditPane.nameInput.addEventListener("focus", (event) => {
    newsSelectionEditPointedGroup.clearEventTarget();
  });
newsSelectionEditPane.regexps.forEach((editRegexp) => {
    editRegexp.textarea.addEventListener("focus", (event) => {
        newsSelectionEditPointedGroup.clearEventTarget();
      });
  });
newsSelectionEditPane.urlSelect.addEventListener("focus", (event) => {
    newsSelectionEditPointedGroup.clearEventTarget();
  });

// Sets buttons to localize the regular expression of a news selection.

newsSelectionEditPane.localizedButtons.forEach((localizedButton) => {
    localizedButton.addEventListener(_Event.CLICK, (event) => {
        var editRegexp =
          newsSelectionEditPane.regexps[Number(event.target.value)];
        var regexpString =
          _Text.trimText(
            _Text.replaceTextLineBreaksToSpace(
              _Text.removeTextZeroWidthSpaces(editRegexp.textarea.value)));
        var regexpResult =
          _Regexp.checkRegularExpression(regexpString, { localized: true });
        if (regexpResult.errorCode >= 0) {
          sendEditWarningMessage(
            _Regexp.getErrorWarning(editRegexp.name, regexpResult));
        } else {
          regexpString = regexpResult.localizedText.textString;
          if (regexpString.length > _Alert.REGEXP_MAX_UTF16_CHARACTER_LENGTH) {
            sendEditWarningMessage(
              _Alert.WARNING_REGEXP_MAX_UTF16_CHARACTER_LENGTH_EXCEEDED);
          } else {
            // Set localized string into text area and checked flag to true.
            editRegexp.textarea.value = regexpString;
            editRegexp.errorChecked = true;
          }
        }
      });
    newsSelectionEditPointedGroup.addElement(localizedButton);
  });

var newsSelectionEditTitleElement = document.querySelector("title");
var newsSelectionEditIndex;
var newsSelectionNewEdit = false;

_Storage.readNewsSelectionCount().then((newsSelectionCount) => {
    var editIndexStrings =
      newsSelectionEditQueryMap.get(_Popup.QUERY_NEWS_SELECTION_INDEX_STRINGS);
    if (editIndexStrings.length != 1) {
      // Save a news selection edited from scratch or compounded setting
      // and never remove any news selection.
      newsSelectionNewEdit = true;
      newsSelectionEditIndex = newsSelectionCount;
    } else {
      newsSelectionEditIndex = Number(editIndexStrings[0]);
    }
    return _Storage.readNewsSelections(editIndexStrings);
  }).then((newsSelections) => {
    var editSaveButton = getEditButton("Save");
    var editRemoveButton = getEditButton("Remove");
    var editNumberString = "#" + String(newsSelectionEditIndex + 1);
    newsSelectionEditTitleElement.textContent =
      getEditMessage("NewsSelection") + " " + editNumberString;

    // Concatenate the setting name and regular expressions of news selections
    // for the specified index strings.
    var newsSelection = ExtractNews.newSelection();
    if (newsSelections.length > 0) {
      var settingName = newsSelections[0].settingName;
      var topicRegexpString = newsSelections[0].topicRegularExpression;
      var senderRegexpString = newsSelections[0].senderRegularExpression;
      for (let i = 1; i < newsSelections.length; i++) {
        settingName =
          _Text.concatTextStrings(
            Array.of(settingName, newsSelections[i].settingName),
            _Alert.SETTING_NAME_MAX_WIDTH);
        topicRegexpString =
          _Regexp.getAlternative(
            topicRegexpString, newsSelections[i].topicRegularExpression);
        if (topicRegexpString.length
          > _Alert.REGEXP_MAX_UTF16_CHARACTER_LENGTH) {
          sendEditWarningMessage(
            _Alert.WARNING_REGEXP_MAX_UTF16_CHARACTER_LENGTH_EXCEEDED);
          break;
        }
        senderRegexpString =
          _Regexp.getAlternative(
            senderRegexpString, newsSelections[i].senderRegularExpression);
        if (topicRegexpString.length
          > _Alert.REGEXP_MAX_UTF16_CHARACTER_LENGTH) {
          sendEditWarningMessage(
            _Alert.WARNING_REGEXP_MAX_UTF16_CHARACTER_LENGTH_EXCEEDED);
          break;
        }
      }
      newsSelection.settingName = settingName;
      newsSelection.topicRegularExpression = topicRegexpString;
      newsSelection.senderRegularExpression = senderRegexpString;
      newsSelection.openedUrl = newsSelections[0].openedUrl;

      newsSelectionEditPane.nameInput.value = settingName;
      var regexpStrings =
        Array.of(newsSelection.topicRegularExpression,
          newsSelection.senderRegularExpression);
      for (let i = 0; i < regexpStrings.length; i++) {
        newsSelectionEditPane.regexps[i].textarea.value = regexpStrings[i];
      }
    }

    // Set buttons to save or remove a new selection and localize the regular
    // expression into the edit button group.
    editSaveButton.addEventListener(_Event.CLICK, (event) => {
        var newsSelection = ExtractNews.newSelection();
        var regexpStrings = new Array();
        var settingName =
          _Text.trimText(
            _Text.removeTextZeroWidthSpaces(
              newsSelectionEditPane.nameInput.value));
        newsSelectionEditPane.nameInput.value = settingName;
        if (_Text.getTextWidth(settingName) > _Alert.SETTING_NAME_MAX_WIDTH) {
          sendEditWarningMessage(
            _Alert.WARNING_SETTING_NAME_MAX_WITDH_EXCEEDED);
          return;
        }
        newsSelection.settingName = settingName;
        // Check whether a regular expression of text area is valid.
        for (let i = 0; i < newsSelectionEditPane.regexps.length; i++) {
          var editRegexp = newsSelectionEditPane.regexps[i];
          if (editRegexp.errorChecked) {
            regexpStrings.push(editRegexp.textarea.value);
            continue;
          }
          var regexpString =
            _Text.trimText(
              _Text.replaceTextLineBreaksToSpace(
                _Text.removeTextZeroWidthSpaces(editRegexp.textarea.value)));
          var regexpResult = _Regexp.checkRegularExpression(regexpString);
          if (regexpResult.errorCode >= 0) {
            sendEditWarningMessage(
              _Regexp.getErrorWarning(editRegexp.name, regexpResult));
            return;
          }
          // Set checked string into text area and checked flag to true.
          regexpStrings.push(regexpString);
          editRegexp.textarea.value = regexpString;
          editRegexp.errorChecked = true;
        }

        newsSelection.topicRegularExpression = regexpStrings[0];
        newsSelection.senderRegularExpression = regexpStrings[1];
        newsSelection.openedUrl = newsSelectionEditPane.urlSelect.value;
        _Storage.writeNewsSelection(
          newsSelectionEditIndex, newsSelection).then(() => {
            Debug.printMessage(
              "Change the news selection " + editNumberString + ".");
            Debug.printProperty("Setting Name", newsSelection.settingName);
            Debug.printProperty(
              "Selected Topic", newsSelection.topicRegularExpression);
            Debug.printProperty(
              "Selected Sender", newsSelection.senderRegularExpression);
            Debug.printProperty("Open Page URL", newsSelection.openedUrl);
          }).catch((error) => {
            Debug.printStackTrace(error);
          }).finally(() => {
            _Popup.closeNewsSelectionEditWindow();
          });
      });
    editRemoveButton.addEventListener(_Event.CLICK, (event) => {
        var removingPromise = Promise.resolve();
        if (! newsSelectionNewEdit) {
          removingPromise =
            _Storage.removeNewsSelection(newsSelectionEditIndex).then(() => {
                Debug.printMessage(
                  "Remove the news selection " + editNumberString + ".");
              });
        }
        removingPromise.catch((error) => {
            Debug.printStackTrace(error);
          }).finally(() => {
            _Popup.closeNewsSelectionEditWindow();
          });
      });
    newsSelectionEditPointedGroup.addElement(editSaveButton);
    newsSelectionEditPointedGroup.addElement(editRemoveButton);

    // Set URLs to open a news site to which above news selection is applied
    // into the select element on the edit window.
    _Popup.setNewsSelectionEditUrlSelect(
      newsSelectionEditPane, newsSelection.openedUrl);

    return ExtractNews.getDebugMode();
  }).catch((error) => {
    Debug.printStackTrace(error);
  });

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
