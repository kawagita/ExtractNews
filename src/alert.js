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
        // Maximum numbers for the setting name and regular expressions input
        // on the edit window or option page and selected by the context menu
        SETTING_NAME_MAX_WIDTH: 30,
        REGEXP_MAX_UTF16_CHARACTERS: 256,

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
        this._message = message;
        this._description = description;
        this._emphasisRegularExpression = emphasisRegexpString;
      }

      get message() {
        return this._message;
      }

      get description() {
        return this._description;
      }

      get emphasisRegularExpression() {
        return this._emphasisRegularExpression;
      }

      toObject() {
        return {
            message: this._message,
            description: this._description,
            emphasisRegularExpression: this._emphasisRegularExpression
          };
      }
    }

    function _newWarning(messageId, substitutions) {
      return new Warning(
        ExtractNews.getLocalizedString(messageId, substitutions));
    }

    _Alert.Warning = Warning;

    // Warnings for the error of news selections

    _Alert.SETTING_NAME_MAX_WITDH_EXCEEDED = "SettingNameMaxWidthExceeded";
    _Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED =
      "SelectedTopicMaxUTF16CharactersExceeded";
    _Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED =
      "SelectedSenderMaxUTF16CharactersExceeded";
    _Alert.EXCLUDED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED =
      "ExcludedTopicMaxUTF16CharactersExceeded";
    _Alert.NEWS_SELECTION_NOT_SAVED_ANY_MORE = "NewsSelectionNotSavedAnyMore";

    var settingNameMaxWidth = String(_Alert.SETTING_NAME_MAX_WIDTH);

    if (browser.i18n.getUILanguage().startsWith("ja")) {
      var localizedContext =
        ExtractNews.Text.getLocalizedContext(
          String(_Alert.SETTING_NAME_MAX_WIDTH / 2));
      if (localizedContext.hasDifferentWidth()) {
        settingNameMaxWidth = localizedContext.fullwidthText.textString;
      }
    }

    _Alert.WARNING_SETTING_NAME_MAX_WITDH_EXCEEDED =
      _newWarning(_Alert.SETTING_NAME_MAX_WITDH_EXCEEDED, settingNameMaxWidth);
    _Alert.WARNING_SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED =
      _newWarning(_Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED,
        String(_Alert.REGEXP_MAX_UTF16_CHARACTERS));
    _Alert.WARNING_SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED =
      _newWarning(_Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED,
        String(_Alert.REGEXP_MAX_UTF16_CHARACTERS));
    _Alert.WARNING_EXCLUDED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED =
      _newWarning(_Alert.EXCLUDED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED,
        String(_Alert.REGEXP_MAX_UTF16_CHARACTERS));
    _Alert.WARNING_NEWS_SELECTION_NOT_SAVED_ANY_MORE =
      _newWarning(_Alert.NEWS_SELECTION_NOT_SAVED_ANY_MORE);

    // Warnings for the error of word filterings

    _Alert.FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED =
      "FilteringWordsMaxUTF16CharactersExceeded";
    _Alert.FILTERING_NOT_SAVED_ANY_MORE = "FilteringNotSavedAnyMore";

    _Alert.WARNING_FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED =
      _newWarning(_Alert.FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED,
        String(_Alert.FILTERING_WORDS_MAX_UTF16_CHARACTERS));
    _Alert.WARNING_FILTERING_NOT_SAVED_ANY_MORE =
      _newWarning(_Alert.FILTERING_NOT_SAVED_ANY_MORE);

    // Warnings for the error of the news setting

    _Alert.WARNING_NEWS_SETTING_NOT_INITIALIZED =
      _newWarning("NewsSettingNotInitialized");

    return _Alert;
  })();
