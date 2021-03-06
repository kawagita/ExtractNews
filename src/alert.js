/*
 *  Define functions and constant variables for the warning alert.
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
 * Alert functions and constant variables.
 */
ExtractNews.Alert = (() => {
    const _Alert = {
        // Warning IDs for the error of news selections
        SETTING_NAME_MAX_WITDH_EXCEEDED: "SettingNameMaxWidthExceeded",
        SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED:
          "SelectedTopicMaxUTF16CharactersExceeded",
        SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED:
          "SelectedSenderMaxUTF16CharactersExceeded",
        EXCLUDED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED:
          "ExcludedTopicMaxUTF16CharactersExceeded",
        SELECTION_NOT_SAVED_ANY_MORE: "SelectionNotSavedAnyMore",
        SELECTION_NOT_ENABLED: "SelectionNotEnabled",

        // Maximum numbers for the setting name and regular expressions input
        // on the edit window or option page and selected by the context menu
        SETTING_NAME_MAX_WIDTH: 30,
        REGEXP_MAX_UTF16_CHARACTERS: 256,

        // Warning IDs for the error of filterings
        FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED:
          "FilteringWordsMaxUTF16CharactersExceeded",
        FILTERING_NOT_SAVED_ANY_MORE: "FilteringNotSavedAnyMore",

        // Maximum numbers of the string of filtering words separated by commas
        // input or imported on the option page
        FILTERING_WORDS_MAX_UTF16_CHARACTERS: 64
      };

    /*
     * The information of a warning displayed on the message dialog.
     */
    class Warning {
      constructor(message, description = "", emphasisRegexpString = "") {
        if (message == undefined) {
          throw newNullPointerException("message");
        } else if ((typeof message) != "string") {
          throw newIllegalArgumentException("message");
        } else if (message == "") {
          throw newEmptyStringException("message");
        } else if ((typeof description) != "string") {
          throw newIllegalArgumentException("description");
        } else if ((typeof emphasisRegexpString) != "string") {
          throw newIllegalArgumentException("emphasisRegexpString");
        }
        this.warning = {
            message: message,
            description: description,
            emphasisRegularExpression: emphasisRegexpString
          };
      }

      get message() {
        return this.warning.message;
      }

      get description() {
        return this.warning.description;
      }

      get emphasisRegularExpression() {
        return this.warning.emphasisRegularExpression;
      }

      toObject() {
        return this.warning;
      }
    }

    function _newWarning(messageId, substitutions) {
      return new Warning(getLocalizedString(messageId, substitutions));
    }

    // Map of warnings for message IDs
    const WARNING_MAP = new Map();

    {
      var settingNameMaxWidth = _Alert.SETTING_NAME_MAX_WIDTH;
      if (browser.i18n.getUILanguage().startsWith(LANGUAGE_CODE_JA)) {
        settingNameMaxWidth /= 2;
      }
      WARNING_MAP.set(
        _Alert.SETTING_NAME_MAX_WITDH_EXCEEDED,
        _newWarning(
          _Alert.SETTING_NAME_MAX_WITDH_EXCEEDED,
          String(settingNameMaxWidth)));
    }

    WARNING_MAP.set(
      _Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED,
      _newWarning(
        _Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED,
        String(_Alert.REGEXP_MAX_UTF16_CHARACTERS)));
    WARNING_MAP.set(
      _Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED,
      _newWarning(
        _Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED,
        String(_Alert.REGEXP_MAX_UTF16_CHARACTERS)));
    WARNING_MAP.set(
      _Alert.EXCLUDED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED,
      _newWarning(
        _Alert.EXCLUDED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED,
        String(_Alert.REGEXP_MAX_UTF16_CHARACTERS)));
    WARNING_MAP.set(
      _Alert.SELECTION_NOT_SAVED_ANY_MORE,
      _newWarning(_Alert.SELECTION_NOT_SAVED_ANY_MORE));
    WARNING_MAP.set(
      _Alert.FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED,
      _newWarning(
        _Alert.FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED,
        String(_Alert.FILTERING_WORDS_MAX_UTF16_CHARACTERS)));
    WARNING_MAP.set(
      _Alert.FILTERING_NOT_SAVED_ANY_MORE,
      _newWarning(_Alert.FILTERING_NOT_SAVED_ANY_MORE));
    WARNING_MAP.set(
      _Alert.SELECTION_NOT_ENABLED,
      _newWarning(_Alert.SELECTION_NOT_ENABLED));

    /*
     * Returns the information of a warning for the specified ID displayed
     * on the message dialog if exists, otherwise, undefined.
     */
    function getWarning(messageId) {
      return WARNING_MAP.get(messageId);
    }

    _Alert.Warning = Warning;
    _Alert.getWarning = getWarning;

    return _Alert;
  })();
