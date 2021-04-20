/*
 *  Define functions and constant variables for the file input and output.
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
 * Functions and constant variables to import and export settings.
 */
ExtractNews.File = (() => {
    /*
     * Returns the message of file in this locale.
     */
    function getFileMessage(id, substitutions) {
      return browser.i18n.getMessage("file" + id, substitutions);
    }

    const _Text = ExtractNews.Text;
    const _Regexp = ExtractNews.Regexp;
    const _Alert = ExtractNews.Alert;
    const _File = { };

    const FILTERING_ID_LEFT_BRACKET = "[";
    const FILTERING_ID_RIGHT_BRACKET = "]";
    const FILTERING_ID_REGEXP = new RegExp(/^[0-9A-Z_a-z]+$/);
    const FILTERING_DATA_SEPARATOR = "\t";

    const FILTERING_TARGET_WORD_BEGINNING_TO_LOWER_CASE =
      ExtractNews.TARGET_WORD_BEGINNING.toLowerCase();
    const FILTERING_TARGET_WORD_END_TO_LOWER_CASE =
      ExtractNews.TARGET_WORD_END.toLowerCase();
    const FILTERING_TARGET_WORD_NEGATIVE_TO_LOWER_CASE =
      ExtractNews.TARGET_WORD_NEGATIVE.toLowerCase();

    const SELECTION_NAME_QUOTE = "\"";
    const SELECTION_SETTING_NAME_LINE = 1;
    const SELECTION_SELECTED_TOPIC_LINE = 2;
    const SELECTION_SELECTED_SENDER_LINE = 3;
    const SELECTION_OPENED_URL_LINE = 4;

    const TEXT_LINE_FEED = "\n";

    // Map of messages definded by "alert.js" which are used instead of
    // messages for the line error on a file.
    const IMPORT_MESSAGE_MAP = new Map();

    IMPORT_MESSAGE_MAP.set(
      _Alert.SETTING_NAME_MAX_WITDH_EXCEEDED,
      _Alert.WARNING_SETTING_NAME_MAX_WITDH_EXCEEDED.message);
    IMPORT_MESSAGE_MAP.set(
      _Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED,
      _Alert.WARNING_SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED.message);
    IMPORT_MESSAGE_MAP.set(
      _Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED,
      _Alert.WARNING_SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED.message);
    IMPORT_MESSAGE_MAP.set(
      _Alert.NEWS_SELECTION_NOT_SAVED_ANY_MORE,
      _Alert.WARNING_NEWS_SELECTION_NOT_SAVED_ANY_MORE.message);
    IMPORT_MESSAGE_MAP.set(
      _Alert.FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED,
      _Alert.WARNING_FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED.message);
    IMPORT_MESSAGE_MAP.set(
      _Alert.FILTERING_NOT_SAVED_ANY_MORE,
      _Alert.WARNING_FILTERING_NOT_SAVED_ANY_MORE.message);

    const IMPORT_LINE_FEED_REGEXP = new RegExp(/\r?\n/);
    const IMPORT_LINE_COMMENT_REGEXP = new RegExp(/^#/);

    /*
     * Sends the specified warning message of this import to the background.
     */
    function sendImportWarningMessage(messageId, errorLineIndex, errorData) {
      var message;
      var description = undefined;
      var emphasisRegexpString = undefined;
      if (errorLineIndex != undefined) {
        var substitutions = new Array();
        if (errorData != undefined) {
          emphasisRegexpString = "(" + _Regexp.escape(errorData) + ").$";
          substitutions.push(errorData);
        }
        message = getFileMessage("ImportLineError");
        description = getFileMessage("ImportLine", String(errorLineIndex + 1));
        if (IMPORT_MESSAGE_MAP.has(messageId)) {
          description += IMPORT_MESSAGE_MAP.get(messageId);
        } else {
          description +=
            getFileMessage("ImportLine" + messageId, substitutions);
        }
      } else {
        message = getFileMessage(messageId);
      }
      callAsynchronousAPI(browser.tabs.getCurrent).then((tab) => {
          return ExtractNews.sendRuntimeMessage({
              command: ExtractNews.COMMAND_DIALOG_OPEN,
              tabId: tab.id,
              warning:
                (new _Alert.Warning(
                  message, description, emphasisRegexpString)).toObject()
            }, "Import File (" + tab.id + ")");
        }).catch((error) => {
          Debug.printStackTrace(error);
        });
    }

    /*
     * Imports the text string from a file specified by the dialog to open it.
     */
    function _importText(fireTextLoadEvent) {
      var importInput = document.createElement("input");
      importInput.type = "file";
      importInput.addEventListener("change", (event) => {
          var reader = new FileReader();
          reader.addEventListener("load", fireTextLoadEvent);
          reader.readAsText(event.target.files[0]);
        }, false);
      importInput.focus();
      importInput.click();
    }

    function _setNewsFiltering(filtering, filteringTargets, lineIndex) {
      if (filteringTargets.length > 0) {
        var lastTarget = filteringTargets[filteringTargets.length - 1];
        if (lastTarget.terminatesBlock()) {
          filtering.setPolicyTarget(filteringTargets.pop().name);
          filtering.setTargets(filteringTargets);
          return true;
        }
      }
      sendImportWarningMessage(
        "FilteringCategoryNotTerminatedByEndOfBlock", lineIndex);
      return false;
    }

    /*
     * Reads filterings on news site from a file and calls the specified
     * function with the array of IDs and map of its data.
     */
    function importNewsFilterings(filteringTargetTotal, callback) {
      if (! Number.isInteger(filteringTargetTotal)) {
        throw newIllegalArgumentException("filteringTargetTotal");
      } else if (filteringTargetTotal < 0
        || filteringTargetTotal >= _Alert.FILTERING_MAX_COUNT) {
        throw newIndexOutOfBoundsException(
          "filtering targets", filteringTargetTotal);
      } else if (callback == undefined) {
        throw newNullPointerException("callback");
      }
      var filteringIds = new Array();
      var filteringMap = new Map();
      _importText((event) => {
          var filteringId = undefined;
          var filtering = ExtractNews.newFiltering();
          var filteringTargets = new Array();
          var filteringReplaced = filteringTargetTotal == 0;
          if (filteringReplaced) {
            // Count the filtering category for all topics beforehand.
            filteringTargetTotal++;
          }
          var importLineErrorOccurred = false;
          var importLines = event.target.result.split(IMPORT_LINE_FEED_REGEXP);
          for (let i = 0; i < importLines.length; i++) {
            var importMessageId = undefined;
            var importData = undefined;
            var importLineText = _Text.trimText(importLines[i]);
            if (importLineText == ""
              || IMPORT_LINE_COMMENT_REGEXP.test(importLineText)) {
              continue;
            } else if (importLineText.startsWith(FILTERING_ID_LEFT_BRACKET)
              && importLineText.endsWith(FILTERING_ID_RIGHT_BRACKET)) {
              if (filteringId != undefined) {
                // Append each filtering to the array and map by the appearance
                // of the next filtering ID.
                if (! _setNewsFiltering(filtering, filteringTargets, i)) {
                  importLineErrorOccurred = true;
                  break;
                } else if (filtering.categoryName == "") {
                  filtering.categoryName = filteringId;
                }
                filteringIds.push(filteringId);
                filteringMap.set(filteringId, filtering);
              }
              importData =
                importLineText.substring(1, importLineText.length - 1).trim();
              if (FILTERING_ID_REGEXP.test(importData)) {
                if (! filteringMap.has(importData)) {
                  // Set the filtering ID to a string enclosed by "[" and "]".
                  filteringId = importData;
                  filtering = ExtractNews.newFiltering();
                  filteringTargets = new Array();
                  if (filteringReplaced
                    && filteringId == ExtractNews.FILTERING_FOR_ALL) {
                    filteringTargetTotal--;
                  }
                  continue;
                }
                importMessageId = "DuplicateFilteringId";
              } else {
                importMessageId = "NonAlphanumericFilteringId";
              }
            } else if (filteringId != undefined) {
              var importLineData =
                importLines[i].split(FILTERING_DATA_SEPARATOR);
              importData = _Text.trimText(importLineData[0]);
              if (filtering.categoryName == "") {
                if (importData == "") {
                  sendImportWarningMessage(
                    "FilteringCategoryNameNotSpecified", i);
                  importLineErrorOccurred = true;
                  break;
                }
                // Set the filtering category name to the 1st and topics
                // to 2nd data separated by "," on the next line of ID.
                if (filteringId != ExtractNews.FILTERING_FOR_ALL) {
                  var categoryTopicsString = "";
                  if (importLineData.length > 1) {
                    categoryTopicsString = _Text.trimText(importLineData[1]);
                  }
                  filtering.setCategoryTopics(categoryTopicsString.split(","));
                }
                filtering.setCategoryName(importData);
                continue;
              } else if (ExtractNews.isFilteringTargetName(importData)) {
                if (filteringTargetTotal >= _Alert.FILTERING_MAX_COUNT) {
                  sendImportWarningMessage(
                    _Alert.FILTERING_NOT_SAVED_ANY_MORE, i);
                  importLineErrorOccurred = true;
                  break;
                }
                // Set the filtering target name to 1st data on each line.
                var filteringTargetName = importData;
                if (importLineData.length >= 2) {
                  // Set words and matchings for its separated by ","
                  // of a filtering target to the 2nd and/or 3rd data.
                  var wordsString = importLineData[1];
                  if (wordsString.length
                    <= _Alert.FILTERING_WORDS_MAX_UTF16_CHARACTERS) {
                    var wordSet = new Set();
                    var wordBeginningMatched = false;
                    var wordEndMatched = false;
                    var wordNegative = false;
                    wordsString.split(",").forEach((wordString) => {
                        var word = wordString.trim();
                        if (word != "") {
                          wordSet.add(word);
                        }
                      });
                    if (importLineData.length >= 3) {
                      var wordMatchings = importLineData[2].split(",");
                      for (let j = 0; j < wordMatchings.length; j++) {
                        importData = wordMatchings[j].trim();
                        if (importData != "") {
                          switch (importData.toLowerCase()) {
                          case FILTERING_TARGET_WORD_BEGINNING_TO_LOWER_CASE:
                            wordBeginningMatched = true;
                            continue;
                          case FILTERING_TARGET_WORD_END_TO_LOWER_CASE:
                            wordEndMatched = true;
                            continue;
                          case FILTERING_TARGET_WORD_NEGATIVE_TO_LOWER_CASE:
                            wordNegative = true;
                            continue;
                          }
                          importMessageId = "UnknownFilteringWordMatching";
                          break;
                        }
                      }
                    }
                    if (importMessageId == undefined) {
                      filteringTargets.push(
                        ExtractNews.newFilteringTarget(
                          filteringTargetName, Array.from(wordSet),
                          wordBeginningMatched, wordEndMatched, wordNegative));
                      filteringTargetTotal++;
                      continue;
                    }
                  } else {
                    importMessageId =
                      _Alert.FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED;
                    importData = undefined;
                  }
                } else { // Filtering target in the end of a block
                  filteringTargets.push(
                    ExtractNews.newFilteringTarget(filteringTargetName));
                  filteringTargetTotal++;
                  continue;
                }
              } else if (importData == "") {
                importMessageId = "FilteringTargetNameNotSpecified";
                importData = undefined;
              } else {
                importMessageId = "UnknownFilteringTargetName";
              }
            } else {
              importMessageId = "FilteringIdNotSpecified";
            }
            sendImportWarningMessage(importMessageId, i, importData);
            importLineErrorOccurred = true;
            break;
          }
          if (! importLineErrorOccurred) {
            if (filteringId != undefined) {
              // Append the last filtering of no error to the array and map.
              if (_setNewsFiltering(
                filtering, filteringTargets, importLines.length)) {
                if (filtering.categoryName == "") {
                  filtering.categoryName = filteringId;
                }
                filteringIds.push(filteringId);
                filteringMap.set(filteringId, filtering);
              }
            } else if (filteringIds.length <= 0) {
              sendImportWarningMessage("ImportDataNotIncluded");
            }
          }
          callback(filteringIds, filteringMap);
        });
    }

    /*
     * Reads news selections from a file and calls the specified function
     * with the array of its.
     */
    function importNewsSelections(selectionTotal, callback) {
      if (! Number.isInteger(selectionTotal)) {
        throw newIllegalArgumentException("selectionTotal");
      } else if (selectionTotal < 0
        || selectionTotal >= ExtractNews.SELECTION_MAX_COUNT) {
        throw newIndexOutOfBoundsException("news selections", selectionTotal);
      } else if (callback == undefined) {
        throw newNullPointerException("callback");
      }
      var newsSelections = new Array();
      _importText((event) => {
          var selection = ExtractNews.newSelection();
          var selectionDataLine = SELECTION_SETTING_NAME_LINE;
          var regexpStrings = new Array();
          var importLineErrorOccurred = false;
          var importLines = event.target.result.split(IMPORT_LINE_FEED_REGEXP);
          for (let i = 0; i < importLines.length; i++) {
            var importMessageId = undefined;
            var importLineText = _Text.trimText(importLines[i]);
            if (selectionDataLine <= SELECTION_SETTING_NAME_LINE) {
              if (importLineText == ""
                || IMPORT_LINE_COMMENT_REGEXP.test(importLineText)) {
                continue;
              } else if (importLineText.startsWith(SELECTION_NAME_QUOTE)
                && importLineText.endsWith(SELECTION_NAME_QUOTE)) {
                if (selectionTotal >= ExtractNews.SELECTION_MAX_COUNT) {
                  sendImportWarningMessage(
                    _Alert.NEWS_SELECTION_NOT_SAVED_ANY_MORE, i);
                  importLineErrorOccurred = true;
                  break;
                }
                // Set the selection name to the 1st text enclosed by quotes
                // on the file top or after empty line.
                var settingName =
                  importLineText.substring(1, importLineText.length - 1);
                var settingNameWidth = _Text.getTextWidth(settingName);
                if (settingNameWidth <= _Alert.SETTING_NAME_MAX_WIDTH) {
                  selection.settingName = settingName;
                  selectionDataLine++;
                  continue;
                }
                importMessageId = _Alert.SETTING_NAME_MAX_WITDH_EXCEEDED;
              } else {
                importMessageId = "SettingNameNotEnclosedByDoubleQuotes";
              }
            } else if (selectionDataLine < SELECTION_OPENED_URL_LINE) {
              // Set the regular expression of selected topics or senders
              // to the 2nd and 3rd text.
              var regexpString =
                _Text.replaceTextLineBreaksToSpace(
                  _Text.removeTextZeroWidthSpaces(importLineText));
              var regexpResult = _Regexp.checkRegularExpression(regexpString);
              if (regexpResult.errorCode < 0) {
                if (regexpString.length
                  <= _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
                  regexpStrings.push(regexpString);
                  selectionDataLine++;
                  continue;
                }
                switch (selectionDataLine) {
                case SELECTION_SELECTED_TOPIC_LINE:
                  importMessageId =
                    _Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED;
                  break;
                case SELECTION_SELECTED_SENDER_LINE:
                  importMessageId =
                    _Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED;
                  break;
                }
              } else {
                importMessageId = "IncorrectRegularExpression";
              }
            } else if (selectionDataLine == SELECTION_OPENED_URL_LINE) {
              // Set the opened URL by a news selection to the 4th text.
              if (importLineText == URL_ABOUT_BLANK
                || importLineText.startsWith(URL_HTTPS_SCHEME)) {
                selection.openedUrl = importLineText;
                selectionDataLine++;
                continue;
              }
              importMessageId = "OpenedUrlNotSpecified";
            } else if (importLineText == "") {
              // Append each news selection to the array by the appearance
              // of an empty line preceded by 4 lines for a setting name,
              // selected topics and senders, and opened URL.
              selection.topicRegularExpression = regexpStrings.shift();
              selection.senderRegularExpression = regexpStrings.shift();
              newsSelections.push(selection);
              selectionTotal++;
              selection = ExtractNews.newSelection();
              selectionDataLine = SELECTION_SETTING_NAME_LINE;
              continue;
            } else {
              importMessageId = "TooMuchNewsSelectionDataLines";
            }
            sendImportWarningMessage(importMessageId, i);
            importLineErrorOccurred = true;
            break;
          }
          if (! importLineErrorOccurred) {
            if (selectionDataLine > SELECTION_SETTING_NAME_LINE) {
              // Append the last news selection to the array.
              if (selectionDataLine >= SELECTION_SELECTED_TOPIC_LINE) {
                selection.topicRegularExpression = regexpStrings.shift();
                if (selectionDataLine >= SELECTION_SELECTED_SENDER_LINE) {
                  selection.senderRegularExpression = regexpStrings.shift();
                }
              }
              newsSelections.push(selection);
            } else if (newsSelections.length <= 0) {
              sendImportWarningMessage("ImportDataNotIncluded");
            }
          }
          callback(newsSelections);
       });
    }

    _File.importNewsFilterings = importNewsFilterings;
    _File.importNewsSelections = importNewsSelections;

    /*
     * Exports the specified string to a file specified by the property.
     */
    function _exportText(exportString, exportProperty) {
      var exportUrl =
        URL.createObjectURL(
          new Blob([ exportString ], {
              type: exportProperty.type
            }));
      var exportAnchor = document.createElement("a");
      exportAnchor.href = exportUrl;
      exportAnchor.download = exportProperty.fileName;
      exportAnchor.click();
      URL.revokeObjectURL(exportUrl);
    }

    /*
     * Writes filterings on news site in the specified map for IDs in
     * the specified array to a file.
     */
    function exportNewsFilterings(newsFilteringIds, newsFilteringMap) {
      if (! Array.isArray(newsFilteringIds)) {
        throw newIllegalArgumentException("newsFilteringIds");
      } else if (newsFilteringMap == undefined) {
        throw newNullPointerException("newsFilteringMap");
      }
      var filteringsExportString = "";
      for (let i = 0; i < newsFilteringIds.length; i++) {
        var filteringId = newsFilteringIds[i];
        var filtering = newsFilteringMap.get(filteringId);
        var filteringCategoryTopicsString = "";
        if (filteringId != ExtractNews.FILTERING_FOR_ALL) {
          filteringCategoryTopicsString = filtering.categoryTopics.join(",");
        }
        filteringsExportString +=
          FILTERING_ID_LEFT_BRACKET + filteringId + FILTERING_ID_RIGHT_BRACKET
          + TEXT_LINE_FEED
          + filtering.categoryName + FILTERING_DATA_SEPARATOR
          + filteringCategoryTopicsString + TEXT_LINE_FEED;
        filtering.targets.forEach((filteringTarget) => {
            var filteringTargetData = new Array();
            filteringTargetData.push(filteringTarget.name);
            if (! filteringTarget.terminatesBlock()) {
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
              filteringTargetData.push(filteringTarget.words.join(","));
              filteringTargetData.push(wordMatchings.join(","));
            }
            filteringsExportString +=
              filteringTargetData.join(FILTERING_DATA_SEPARATOR)
              + TEXT_LINE_FEED;
          });
        filteringsExportString += filtering.policyTarget.name + TEXT_LINE_FEED;
        if (i < newsFilteringIds.length - 1) {
          filteringsExportString += TEXT_LINE_FEED;
        }
      }
      _exportText(filteringsExportString, {
          fileName: "ExtractNewsFilterings.tsv",
          type: "text/tsv"
        });
    }

    /*
     * Writes news selections in the specified array to a file.
     */
    function exportNewsSelections(newsSelections) {
      if (! Array.isArray(newsSelections)) {
        throw newIllegalArgumentException("newsSelections");
      }
      var newsSelectionsExportString = "";
      for (let i = 0; i < newsSelections.length; i++) {
        var newsSelection = newsSelections[i];
        newsSelectionsExportString +=
          SELECTION_NAME_QUOTE + newsSelection.settingName
          + SELECTION_NAME_QUOTE + TEXT_LINE_FEED
          + newsSelection.topicRegularExpression + TEXT_LINE_FEED
          + newsSelection.senderRegularExpression + TEXT_LINE_FEED
          + newsSelection.openedUrl + TEXT_LINE_FEED;
        if (i < newsSelections.length - 1) {
          newsSelectionsExportString += TEXT_LINE_FEED;
        }
      }
      _exportText(newsSelectionsExportString, {
          fileName: "ExtractNewsSelections.txt",
          type: "text/plain"
        });
    }

    _File.exportNewsFilterings = exportNewsFilterings;
    _File.exportNewsSelections = exportNewsSelections;

    return _File;
  })();
