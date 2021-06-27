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
 * Sends the specified warning on the edit window to the background script.
 */
function sendEditWarningMessage(warning) {
  callAsynchronousAPI(browser.tabs.getCurrent).then((tab) => {
      ExtractNews.sendRuntimeMessage({
          command: ExtractNews.COMMAND_DIALOG_OPEN,
          tabId: tab.id,
          warning: warning.toObject()
        }, " on Edit Window Tab " + tab.id);
    }).catch((error) => {
      Debug.printStackTrace(error);
    });
}

var newsSelectionNewEdit = false;
var newsSelectionEditIndex;

var newsSelectionEditQueryMap = _Popup.getQueryMap(document.URL);
var newsSelectionEditPane =
  _Popup.getSelectionEditPane(
    "title", newsSelectionEditQueryMap.get(_Popup.QUERY_OPENER_TAB_ID));
var newsSelectionEditFocusedGroup = new _Event.FocusedGroup();

newsSelectionEditFocusedGroup.addElements(
  Array.of(newsSelectionEditPane.nameInput, newsSelectionEditPane.urlSelect));
newsSelectionEditPane.regexps.forEach((editRegexp) => {
    newsSelectionEditFocusedGroup.addElement(editRegexp.textarea);
  });

// Sets the alternative of halfwidth and fullwidth strings for a regular
// expression into the textarea when "Localize" button is pressed, after it's
// checked whether the regular expression are valid or length is fit.

newsSelectionEditPane.localizedButtons.forEach((localizedButton) => {
    localizedButton.disabled = true;
    localizedButton.addEventListener(_Event.CLICK, (event) => {
        var editRegexp =
          newsSelectionEditPane.regexps[Number(event.target.value)];
        var regexpResult =
          _Regexp.checkRegularExpression(
            _Text.trimText(
              _Text.replaceTextLineBreaksToSpace(
                _Text.removeTextZeroWidthSpaces(editRegexp.textarea.value))),
            { localized: true });
        if (regexpResult.errorCode < 0) {
          var regexpString = regexpResult.localizedText.textString;
          if (regexpString.length <= _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
            editRegexp.textarea.value = regexpString;
            editRegexp.errorChecked = true;
            return;
          }
          sendEditWarningMessage(editRegexp.warningMaxUtf16CharactersExceeded);
        } else {
          sendEditWarningMessage(
            _Regexp.getErrorWarning(editRegexp.name, regexpResult));
        }
        editRegexp.textarea.focus();
      });
    newsSelectionEditFocusedGroup.addElement(localizedButton);
  });

var newsSelectionEditSaveButton = getEditButton("Save");
var newsSelectionEditRemoveButton = getEditButton("Remove");

newsSelectionEditSaveButton.disabled = true;
newsSelectionEditRemoveButton.disabled = true;

newsSelectionEditFocusedGroup.addElements(
  Array.of(newsSelectionEditSaveButton, newsSelectionEditRemoveButton));

// Writes the news selection into the storage when "Save" button is pressed,
// after it's checked whether the length of a setting name is fit or regular
// expressions are valid, and finally closes the edit window.

newsSelectionEditSaveButton.addEventListener(_Event.CLICK, (event) => {
    var newsSelection = ExtractNews.newSelection();
    var regexpStrings = new Array();
    var settingName =
      _Text.trimText(
        _Text.removeTextZeroWidthSpaces(
          newsSelectionEditPane.nameInput.value));
    newsSelectionEditPane.nameInput.value = settingName;
    if (_Text.getTextWidth(settingName) > _Alert.SETTING_NAME_MAX_WIDTH) {
      sendEditWarningMessage(
        _Alert.getWarning(_Alert.SETTING_NAME_MAX_WITDH_EXCEEDED));
      newsSelectionEditPane.nameInput.focus();
      return;
    }
    newsSelection.settingName = settingName;
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
        editRegexp.textarea.focus();
        return;
      }
      regexpStrings.push(regexpString);
      editRegexp.textarea.value = regexpString;
      editRegexp.errorChecked = true;
    }

    newsSelection.topicRegularExpression = regexpStrings[0];
    newsSelection.senderRegularExpression = regexpStrings[1];
    newsSelection.openedUrl = newsSelectionEditPane.urlSelect.value;
    _Storage.writeSelection(newsSelectionEditIndex, newsSelection).then(() => {
        Debug.printMessage(
          "Save the news selection "
          + _Popup.getSelectionEditTitleNumber(newsSelectionEditIndex) + ".");
        Debug.printProperty("Setting Name", newsSelection.settingName);
        Debug.printProperty(
          "Selected Topic", newsSelection.topicRegularExpression);
        Debug.printProperty(
          "Selected Sender", newsSelection.senderRegularExpression);
        Debug.printProperty("Opened URL", newsSelection.openedUrl);
      }).catch((error) => {
        Debug.printStackTrace(error);
      }).finally(() => {
        _Popup.closeSelectionEditWindow();
      });
  });

// Removes the news selection from the storage when "Remove" button is pressed
// if not new edit, otherwise, do nothing, and finally closes the edit window.

newsSelectionEditRemoveButton.addEventListener(_Event.CLICK, (event) => {
    var removingPromise = Promise.resolve();
    if (! newsSelectionNewEdit) {
      removingPromise =
        _Storage.removeSelection(newsSelectionEditIndex).then(() => {
            Debug.printMessage(
              "Remove the news selection "
              + _Popup.getSelectionEditTitleNumber(newsSelectionEditIndex)
              + ".");
          });
    }
    removingPromise.catch((error) => {
        Debug.printStackTrace(error);
      }).finally(() => {
        _Popup.closeSelectionEditWindow();
      });
  });

_Storage.readSelectionCount().then((newsSelectionCount) => {
    var editIndexStrings =
      newsSelectionEditQueryMap.get(_Popup.QUERY_SELECTION_INDEX_STRINGS);
    if (editIndexStrings.length != 1) {
      // Save a news selection edited from scratch or compounded setting
      // and never remove any news selection.
      newsSelectionNewEdit = true;
      newsSelectionEditIndex = newsSelectionCount;
    } else {
      newsSelectionEditIndex = Number(editIndexStrings[0]);
    }
    _Popup.setSelectionEditTitle(
      newsSelectionEditPane, newsSelectionEditIndex);
    return _Storage.readSelections(editIndexStrings);
  }).then((newsSelections) => {
    // Concatenate the setting name and regular expressions set into the news
    // selection of the specified index strings.
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
        senderRegexpString =
          _Regexp.getAlternative(
            senderRegexpString, newsSelections[i].senderRegularExpression);
      }
      if (topicRegexpString.length > _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
        topicRegexpString =
          topicRegexpString.substring(0, _Alert.REGEXP_MAX_UTF16_CHARACTERS);
      }
      if (senderRegexpString.length > _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
        senderRegexpString =
          senderRegexpString.substring(0, _Alert.REGEXP_MAX_UTF16_CHARACTERS);
      }
      newsSelection.settingName = settingName;
      newsSelection.topicRegularExpression = topicRegexpString;
      newsSelection.senderRegularExpression = senderRegexpString;
      newsSelection.openedUrl = newsSelections[0].openedUrl;

      newsSelectionEditPane.nameInput.value = settingName;
      var regexpStrings =
        Array.of(
          newsSelection.topicRegularExpression,
          newsSelection.senderRegularExpression);
      for (let i = 0; i < regexpStrings.length; i++) {
        newsSelectionEditPane.regexps[i].textarea.value = regexpStrings[i];
      }
    }

    _Storage.readDomainData(false).then(() => {
        return _Storage.readSiteData(false);
      }).then(() => {
        // Set URLs to open the site to which above news selection is
        // applied into the select element on the edit window.
        ExtractNews.setDomainSites();
        _Popup.setSelectionEditUrlSelect(
          newsSelectionEditPane, newsSelection.openedUrl);

        newsSelectionEditPane.localizedButtons.forEach((localizedButton) => {
            localizedButton.disabled = false;
          });
        newsSelectionEditSaveButton.disabled = false;
        newsSelectionEditRemoveButton.disabled = false;
      });
  }).catch((error) => {
    Debug.printStackTrace(error);
  });

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
