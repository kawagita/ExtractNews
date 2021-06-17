/*
 *  Define functions to import or export the option data from or to a file.
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
 * Returns the message of file in this locale.
 */
function getFileMessage(id, substitutions) {
  return browser.i18n.getMessage("file" + id, substitutions);
}

const FILTERING_ID_BRACKETS = [ "[", "]" ];
const FILTERING_ID_REGEXP = new RegExp(/^[0-9A-Z_a-z]+$/);

const FILTERING_TARGET_WORD_BEGINNING_TO_LOWER_CASE =
  ExtractNews.TARGET_WORD_BEGINNING.toLowerCase();
const FILTERING_TARGET_WORD_END_TO_LOWER_CASE =
  ExtractNews.TARGET_WORD_END.toLowerCase();
const FILTERING_TARGET_WORDS_EXCLUDED_TO_LOWER_CASE =
  ExtractNews.TARGET_WORDS_EXCLUDED.toLowerCase();

const SELECTION_SETTING_NAME_QUOTES = [ "\"", "\"" ];
const SELECTION_REGULAR_EXPRESSION_SLASHES = [ "/", "/" ];

const SELECTION_SETTING_NAME_LINE = 0;
const SELECTION_SELECTED_TOPIC_LINE = 1;
const SELECTION_SELECTED_SENDER_LINE = 2;
const SELECTION_OPENED_URL_LINE = 3;

const OPTION_DATA_GENERAL = "General";
const OPTION_DATA_FITERING = "Filtering";
const OPTION_DATA_SELECTION = "Selection";

const LINE_TEXT_SEPARATOR = "\t";

/*
 * The object to read the option data from text lines.
 */
class ImportData {
  constructor(importText) {
    this.lines = importText.split(new RegExp(/\r?\n/));
    this.lineIndex = -1;
    this.lineTextArray = undefined;
    this.error = {
      messageId: undefined,
      lineNumber: "",
      data: undefined
    }
  }

  readLine() {
    this.lineIndex++;
    if (this.lineIndex >= 0 && this.lineIndex < this.lines.length) {
      this.lineTextArray =
        this.lines[this.lineIndex].split(LINE_TEXT_SEPARATOR);
      this.lineTextArray[0] = _Text.trimText(this.lineTextArray[0]);
      return true;
    }
    return false;
  }

  backLine() {
    this.lineIndex--;
    this.lineTextArray = undefined;
  }

  hasIgnoredLine() {
    return this.lineTextArray != undefined
      && ((this.lineTextArray[0] == "" && this.lineTextArray.length == 1)
        || this.lineTextArray[0].startsWith("#"));
  }

  get lineTextSize() {
    if (this.lineTextArray != undefined) {
      return this.lineTextArray.length;
    }
    return 0;
  }

  getFirstText() {
    if (this.lineTextArray == undefined) {
      throw newUnsupportedOperationException();
    }
    return this.lineTextArray[0];
  }

  getFirstEnclosedText(enclosingCharacters) {
    var lineFirstText = this.getFirstText();
    if (lineFirstText.startsWith(enclosingCharacters[0])
      && lineFirstText.endsWith(enclosingCharacters[1])) {
      return _Text.trimText(
        lineFirstText.substring(1, lineFirstText.length - 1));
    }
    return undefined;
  }

  getLineText(index) {
    if (index < 0 || index >= this.lineTextSize) {
      throw newIndexOutOfBoundsException("line texts", index);
    } else if (index == 0) {
      return this.lineTextArray[0];
    }
    return this.lineTextArray[index].trim();
  }

  get errorMessageId() {
    return this.error.messageId;
  }

  get errorLineNumber() {
    return this.error.lineNumber;
  }

  get errorData() {
    return this.error.data;
  }

  setError(messageId) {
    if (messageId == undefined) {
      throw newNullPointerException("messageId");
    }
    this.error.messageId = messageId;
  }

  setLineError(messageId, data) {
    if (this.lineIndex < 0) {
      throw newUnsupportedOperation();
    }
    this.setError(messageId);
    this.error.lineNumber = String(this.lineIndex + 1);
    this.error.data = data;
  }
}

/*
 * Sends the specified warning of an imported data to the background script.
 */
function sendImportWarningMessage(importData) {
  if (importData == undefined) {
    throw newNullPointerException("importData");
  } else if (importData.errorMessageId == undefined) {
    throw newUnsupportedOperation();
  }
  var message;
  var description = undefined;
  var emphasisRegexpString = undefined;
  if (importData.errorLineNumber != undefined) {
    var warning = _Alert.getWarning(importData.errorMessageId);
    message = getFileMessage("ImportLineError");
    description = getFileMessage("ImportLine", importData.errorLineNumber);
    if (warning != undefined) {
      description += warning.message;
    } else {
      var substitutions = undefined;
      if (importData.errorData != undefined) {
        emphasisRegexpString =
          "(" + _Regexp.escape(importData.errorData) + ").$";
        substitutions = Array.of(importData.errorData);
      }
      description +=
        getFileMessage(
          "ImportLine" + importData.errorMessageId, substitutions);
    }
  } else {
    message = getFileMessage(importData.errorMessageId);
  }
  callAsynchronousAPI(browser.tabs.getCurrent).then((tab) => {
      ExtractNews.sendRuntimeMessage({
          command: ExtractNews.COMMAND_DIALOG_OPEN,
          tabId: tab.id,
          warning:
            (new _Alert.Warning(
              message, description, emphasisRegexpString)).toObject()
        }, " by Import on Option Page " + tab.id);
    }).catch((error) => {
      Debug.printStackTrace(error);
    });
}

function _setFilteringTargets(filtering, filteringTargets) {
  if (filteringTargets.length > 0) {
    var lastTarget = filteringTargets[filteringTargets.length - 1];
    if (lastTarget.terminatesBlock()) {
      filtering.setPolicyTarget(filteringTargets.pop().name);
      filtering.setTargets(filteringTargets);
      return true;
    }
  }
  return false;
}

// Reads filterings for each category from the specified import data
// and sets its data to the specified map.

function _readFilterings(importData, filteringMap) {
  var filtering = ExtractNews.newFiltering();
  var filteringId = undefined;
  var filteringTargets = new Array();
  var filteringTargetTotal = 1; // Count for all topics beforehand
  while (importData.readLine()) {
    if (importData.hasIgnoredLine()) {
      continue;
    }
    var lineFirstText = importData.getFirstText();
    if (lineFirstText == OPTION_DATA_SELECTION) {
      importData.backLine();
      break;
    }
    var bracketedText = importData.getFirstEnclosedText(FILTERING_ID_BRACKETS);
    if (bracketedText != undefined) {
      if (filteringId != undefined) {
        // Append the filtering data for each category to the map
        // by the appearance of the next filtering ID.
        if (! _setFilteringTargets(filtering, filteringTargets)) {
          importData.setLineError(
            "FilteringCategoryNotTerminatedByEndOfBlock");
          return false;
        } else if (filtering.categoryName == "") {
          filtering.categoryName = filteringId;
        }
        filteringMap.set(filteringId, filtering);
      }
      filteringId = getCapitalizedString(bracketedText);
      if (FILTERING_ID_REGEXP.test(filteringId)) {
        if (! filteringMap.has(filteringId)) {
          // Set the filtering category ID to a string enclosed by "[" and "]".
          filtering = ExtractNews.newFiltering();
          filteringTargets = new Array();
          if (filteringId == ExtractNews.FILTERING_FOR_ALL) {
            filteringTargetTotal--;
          }
          continue;
        }
        importData.setLineError("DuplicateFilteringId", filteringId);
      } else {
        importData.setLineError("NonAlphanumericFilteringId", filteringId);
      }
    } else if (filteringId != undefined) {
      if (filtering.categoryName == "") {
        if (lineFirstText != "") {
          // Set the filtering category name to the 1st and topics to 2nd data
          // separated by "," on the next line of a category ID.
          if (filteringId != ExtractNews.FILTERING_FOR_ALL) {
            var categoryTopicsString = "";
            if (importData.lineTextSize > 1) {
              categoryTopicsString = importData.getLineText(1);
            }
            filtering.setCategoryTopics(categoryTopicsString.split(","));
          }
          filtering.setCategoryName(lineFirstText);
          continue;
        }
        importData.setLineError("FilteringCategoryNameNotSpecified");
      } else if (ExtractNews.isFilteringTargetName(lineFirstText)) {
        if (filteringTargetTotal < ExtractNews.FILTERING_MAX_COUNT) {
          // Set the filtering target name to 1st data on the next line
          // of a category name and topics.
          var filteringTargetName = lineFirstText;
          if (importData.lineTextSize >= 2) {
            // Set words and/or options for those separated by ","
            // of a filtering target to the 2nd and/or 3rd data.
            var wordsString = importData.getLineText(1);
            if (wordsString.length
              > _Alert.FILTERING_WORDS_MAX_UTF16_CHARACTERS) {
              importData.setLineError(
                _Alert.FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED);
              return false;
            }
            var wordSet = new Set();
            var wordBeginningMatched = false;
            var wordEndMatched = false;
            var wordsExcluded = false;
            wordsString.split(",").forEach((wordString) => {
                var word = wordString.trim();
                if (word != "") {
                  wordSet.add(word);
                }
              });
            if (importData.lineTextSize >= 3) {
              var wordOptions = importData.getLineText(2).split(",");
              for (let j = 0; j < wordOptions.length; j++) {
                var wordOption = wordOptions[j].trim();
                if (wordOption != "") {
                  switch (wordOption.toLowerCase()) {
                  case FILTERING_TARGET_WORD_BEGINNING_TO_LOWER_CASE:
                    wordBeginningMatched = true;
                    continue;
                  case FILTERING_TARGET_WORD_END_TO_LOWER_CASE:
                    wordEndMatched = true;
                    continue;
                  case FILTERING_TARGET_WORDS_EXCLUDED_TO_LOWER_CASE:
                    wordsExcluded = true;
                    continue;
                  }
                  importData.setLineError(
                    "UnknownFilteringWordOption", wordOption);
                  return false;
                }
              }
            }
            filteringTargets.push(
              ExtractNews.newFilteringTarget(
                filteringTargetName, wordSet, wordBeginningMatched,
                wordEndMatched, wordsExcluded));
            filteringTargetTotal++;
          } else { // Filtering target in the end of a block
            filteringTargets.push(
              ExtractNews.newFilteringTarget(filteringTargetName));
            filteringTargetTotal++;
          }
          continue;
        }
        importData.setLineError(_Alert.FILTERING_NOT_SAVED_ANY_MORE);
      } else if (lineFirstText != "") {
        importData.setLineError("UnknownFilteringTargetName", lineFirstText);
      } else {
        importData.setLineError("FilteringTargetNameNotSpecified");
      }
    } else {
      importData.setLineError("FilteringIdNotSpecified");
    }
    return false;
  }
  if (filteringId != undefined) { // Last category ID
    if (! _setFilteringTargets(filtering, filteringTargets)) {
      importData.setLineError("FilteringCategoryNotTerminatedByEndOfBlock");
      return false;
    }
    if (filtering.categoryName == "") {
      filtering.categoryName = filteringId;
    }
    filteringMap.set(filteringId, filtering);
  }
  return true;
}

// Reads news selections from the specified import data and sets its data
// to the specified array.

function _readSelections(importData, newsSelections) {
  var selection = undefined;
  var selectionDataLine = SELECTION_SETTING_NAME_LINE;
  var regexpStrings = new Array();
  var importLineErrorOccurred = false;
  while (importData.readLine()) {
    if (importData.hasIgnoredLine()) {
      continue;
    }
    if (selectionDataLine <= SELECTION_SETTING_NAME_LINE) {
      if (selection != undefined) {
        // Append each news selection to the array by the appearance
        // of the next setting name.
        selection.topicRegularExpression = regexpStrings.shift();
        selection.senderRegularExpression = regexpStrings.shift();
        newsSelections.push(selection);
      }
      if (newsSelections.length < ExtractNews.SELECTION_MAX_COUNT) {
        var quotedText =
          importData.getFirstEnclosedText(SELECTION_SETTING_NAME_QUOTES);
        if (quotedText != undefined) {
            // Set the selection name to the 1st line text enclosed by quotes.
            var settingName = quotedText;
            var settingNameWidth = _Text.getTextWidth(settingName);
            if (settingNameWidth <= _Alert.SETTING_NAME_MAX_WIDTH) {
              selection = ExtractNews.newSelection();
              selection.settingName = settingName;
              selectionDataLine++;
              continue;
            }
            importData.setLineError(_Alert.SETTING_NAME_MAX_WITDH_EXCEEDED);
        } else {
          importData.setLineError("SettingNameNotEnclosedByDoubleQuotes");
        }
      } else {
        importData.setLineError(_Alert.SELECTION_NOT_SAVED_ANY_MORE);
      }
    } else if (selectionDataLine < SELECTION_OPENED_URL_LINE) {
      var slashedText =
        importData.getFirstEnclosedText(SELECTION_REGULAR_EXPRESSION_SLASHES);
      if (slashedText != undefined) {
        // Set the regular expression of selected topics or senders
        // to the 2nd and 3rd line text enclosed by slashes.
        var regexpString =
          _Text.replaceTextLineBreaksToSpace(
            _Text.removeTextZeroWidthSpaces(slashedText));
        var regexpResult = _Regexp.checkRegularExpression(regexpString);
        if (regexpResult.errorCode < 0) {
          if (regexpString.length <= _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
            regexpStrings.push(regexpString);
            selectionDataLine++;
            continue;
          }
          switch (selectionDataLine) {
          case SELECTION_SELECTED_TOPIC_LINE:
            importData.setLineError(
              _Alert.SELECTED_TOPIC_MAX_UTF16_CHARACTERS_EXCEEDED);
            break;
          case SELECTION_SELECTED_SENDER_LINE:
            importData.setLineError(
              _Alert.SELECTED_SENDER_MAX_UTF16_CHARACTERS_EXCEEDED);
            break;
          }
        } else {
          importData.setLineError("IncorrectRegularExpression");
        }
      } else {
        importData.setLineError("RegularExpressionNotEnclosedBySlashes");
      }
    } else {
      // Set the opened URL by a news selection to the 4th line text.
      var url = importData.getFirstText();
      if (url == URL_ABOUT_BLANK || url.startsWith(URL_HTTPS_SCHEME)) {
        selection.openedUrl = url;
        selectionDataLine = SELECTION_SETTING_NAME_LINE;
        continue;
      }
      importData.setLineError("OpenedUrlNotSpecified");
    }
    return false;
  }
  if (selection != undefined) { // Last news selection
    if (selectionDataLine >= SELECTION_SELECTED_TOPIC_LINE) {
      selection.topicRegularExpression = regexpStrings.shift();
      if (selectionDataLine >= SELECTION_SELECTED_SENDER_LINE) {
        selection.senderRegularExpression = regexpStrings.shift();
      }
    }
    newsSelections.push(selection);
  }
  return true;
}

/*
 * Imports the option data from a file specified by the dialog to open it
 * and returns the promise.
 */
function importOptionData(optionSettings) {
  return new Promise((resolve, reject) => {
      var importInput = document.createElement("input");
      importInput.type = "file";
      importInput.addEventListener("change", (event) => {
          var reader = new FileReader();
          reader.addEventListener("load", (readEvent) => {
              var importData = new ImportData(readEvent.target.result);
              while (importData.readLine()) {
                if (importData.hasIgnoredLine()) {
                  continue;
                }
                var lineFirstText = importData.getFirstText();
                if (lineFirstText == OPTION_DATA_SELECTION) {
                  // Replace the selection data by news selections read from
                  // the file even if contains an error.
                  var newsSelections = new Array();
                  var noError = _readSelections(importData, newsSelections);
                  optionSettings.selectionData.replace(newsSelections);
                  optionSettings.setSelectionDataUpdated();
                  if (! noError) {
                    sendImportWarningMessage(importData);
                    break;
                  }
                } else if (lineFirstText == OPTION_DATA_FITERING) {
                  // Replace the fitering data by the filtering ID, category,
                  // or targets read from the file even if contains an error.
                  var filteringMap = new Map();
                  var noError = _readFilterings(importData, filteringMap);
                  optionSettings.filteringData.replace(filteringMap);
                  optionSettings.setFilteringDataUpdated();
                  if (! noError) {
                    sendImportWarningMessage(importData);
                    break;
                  }
                } else { // General options
                  var optionData =
                    optionSettings.generalDataMap.get(lineFirstText);
                  if (optionData != undefined && importData.lineTextSize > 1) {
                    // Set the option data if its ID exists in the data map.
                    var valueString = importData.getLineText(1);
                    if (! optionData.isValueStringAcceptable(valueString)) {
                      importData.setLineError("InvalidValueSpecified");
                      sendImportWarningMessage(importData);
                      break;
                    }
                    optionData.setValueString(valueString);
                    if (! optionData.isAdvanced()) {
                      optionSettings.setGeneralDataUpdated();
                    }
                  }
                }
              }
              resolve();
            });
          reader.readAsText(event.target.files[0]);
        }, false);
      importInput.focus();
      importInput.click();
    });
}

/*
 * The object to write the option data to text lines.
 */
class ExportData {
  constructor() {
    this.lines = new Array();
    this.lineTextArray = new Array();
  }

  writeLine() {
    if (this.lineTextArray.length > 0) {
      this.lines.push(this.lineTextArray.join(LINE_TEXT_SEPARATOR));
      this.lineTextArray = new Array();
    } else {
      this.lines.push("");
    }
  }

  addLineText(text) {
    this.lineTextArray.push(text);
  }

  addEnclosedText(text, enclosingCharacters) {
    this.addLineText(enclosingCharacters[0] + text + enclosingCharacters[1]);
  }

  getBlob() {
    return new Blob([ this.lines.join("\n") ], {
        type: "text/tsv"
      });
  }
}

// Writes filterings for each category in the specified map to the specified
// export data.

function _writeFilterings(exportData, filteringMap) {
  filteringMap.forEach((filtering, filteringId) => {
      exportData.addEnclosedText(filteringId, FILTERING_ID_BRACKETS);
      exportData.writeLine();
      var filteringCategoryTopicsString = "";
      if (filteringId != ExtractNews.FILTERING_FOR_ALL) {
        filteringCategoryTopicsString = filtering.categoryTopics.join(",");
      }
      exportData.addLineText(filtering.categoryName);
      exportData.addLineText(filteringCategoryTopicsString);
      exportData.writeLine();
      filtering.targets.forEach((filteringTarget) => {
          exportData.addLineText(filteringTarget.name);
          if (! filteringTarget.terminatesBlock()) {
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
            exportData.addLineText(filteringTarget.words.join(","));
            exportData.addLineText(wordOptions.join(","));
          }
          exportData.writeLine();
        });
      exportData.addLineText(filtering.policyTarget.name);
      exportData.writeLine();
    });
}

// Writes news selections in the specified array to the specified export data.

function _writeSelections(exportData, newsSelections) {
  newsSelections.forEach((selection) => {
      exportData.addEnclosedText(
        selection.settingName, SELECTION_SETTING_NAME_QUOTES);
      exportData.writeLine();
      exportData.addEnclosedText(
        selection.topicRegularExpression,
        SELECTION_REGULAR_EXPRESSION_SLASHES);
      exportData.writeLine();
      exportData.addEnclosedText(
        selection.senderRegularExpression,
        SELECTION_REGULAR_EXPRESSION_SLASHES);
      exportData.writeLine();
      exportData.addLineText(selection.openedUrl);
      exportData.writeLine();
    });
}

/*
 * Exports the specified option data to the file as "ExtractNewsSettings.tsv".
 */
function exportOptionData(optionSettings) {
  var exportData = new ExportData();
  exportData.addLineText(OPTION_DATA_GENERAL);
  exportData.writeLine();
  optionSettings.generalDataMap.forEach((optionData) => {
      exportData.addLineText(optionData.id);
      exportData.addLineText(optionData.toString());
      exportData.writeLine();
    });
  if (optionSettings.filteringData.targetDataTotal > 0) {
    exportData.addLineText(OPTION_DATA_FITERING);
    exportData.writeLine();
    _writeFilterings(exportData, optionSettings.filteringData.toMap());
  }
  if (optionSettings.selectionData.dataSize > 0) {
    exportData.addLineText(OPTION_DATA_SELECTION);
    exportData.writeLine();
    _writeSelections(exportData, optionSettings.selectionData.toArray());
  }
  var exportUrl = URL.createObjectURL(exportData.getBlob());
  var exportAnchor = document.createElement("a");
  exportAnchor.href = exportUrl;
  exportAnchor.download = "ExtractNewsSettings.tsv";
  exportAnchor.click();
  URL.revokeObjectURL(exportUrl);
}
