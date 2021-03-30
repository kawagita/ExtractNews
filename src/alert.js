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
        // Maximum numbers for a news selection or word filterings
        SETTING_NAME_MAX_WIDTH: 30,
        REGEXP_MAX_UTF16_CHARACTER_LENGTH: 256,
        FILTERING_CATEGORY_MAX_COUNT: 32,
        FILTERING_TARGET_MAX_COUNT: 64
      };

    /*
     * The warning which consists of a message and description displayed
     * on the dialog.
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
    _Alert.REGEXP_MAX_UTF16_CHARACTER_LENGTH_EXCEEDED =
      "RegularExpressionMaxUTF16CharacterLengthExceeded";
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
    _Alert.WARNING_REGEXP_MAX_UTF16_CHARACTER_LENGTH_EXCEEDED =
      _newWarning(_Alert.REGEXP_MAX_UTF16_CHARACTER_LENGTH_EXCEEDED,
        String(_Alert.REGEXP_MAX_UTF16_CHARACTER_LENGTH));

    _Alert.WARNING_NEWS_SELECTION_NOT_SAVED_ANY_MORE =
      _newWarning(_Alert.NEWS_SELECTION_NOT_SAVED_ANY_MORE);

    // Warnings for the error of word filterings

    _Alert.FILTERING_CATEGORY_NOT_SAVED_OVER_MAX_COUNT =
      "FilteringCategoryNotSavedOverMaxCount";
    _Alert.FILTERING_TARGET_NOT_SAVED_OVER_MAX_COUNT =
      "FilteringTargetNotSavedOverMaxCount";

    _Alert.WARNING_FILTERING_CATEGORY_NOT_SAVED_OVER_MAX_COUNT =
      _newWarning(_Alert.FILTERING_CATEGORY_NOT_SAVED_OVER_MAX_COUNT,
        String(_Alert.FILTERING_CATEGORY_MAX_COUNT));
    _Alert.WARNING_FILTERING_TARGET_NOT_SAVED_OVER_MAX_COUNT =
      _newWarning(_Alert.FILTERING_TARGET_NOT_SAVED_OVER_MAX_COUNT,
        String(_Alert.FILTERING_TARGET_MAX_COUNT));

    // Warnings for the error of setting initialization

    _Alert.WARNING_SETTING_NOT_INITIALIZED =
      _newWarning("SettingNotInitialized");

    return _Alert;
  })();
