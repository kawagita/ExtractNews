/*
 *  Define functions and constant variables for filterings on the option page.
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
 * Returns data for the specified filtering on the option page.
 */
function createFilteringData(filtering) {
  var filteringData = {
      categoryName: filtering.categoryName,
      categoryTopicsString: undefined,
      targetDataArray: new Array()
    };
  if (filtering.categoryTopics != undefined) {
    filteringData.categoryTopicsString = filtering.categoryTopics.join(",");
  }
  filtering.targets.forEach((filteringTarget) => {
      filteringData.targetDataArray.push(createTargetData(filteringTarget));
    });
  filteringData.targetDataArray.push(createTargetData(filtering.policyTarget));
  return filteringData;
}

/*
 * Returns data for the specified filtering target on the option page.
 */
function createTargetData(filteringTarget) {
  var targetData = {
      name: ExtractNews.TARGET_ACCEPT,
      wordsString: "",
      localizedWordSet: undefined,
      blorkTerminated: false,
      wordBeginningMatched: false,
      wordEndMatched: false,
      wordNegative: false
    };
  if (filteringTarget != undefined) {
    targetData.name = filteringTarget.name;
    targetData.wordsString = filteringTarget.words.join(",");
    targetData.blorkTerminated = filteringTarget.terminatesBlock();
    targetData.wordBeginningMatched = filteringTarget.isWordBeginningMatched();
    targetData.wordEndMatched = filteringTarget.isWordEndMatched();
    targetData.wordNegative = filteringTarget.isWordNegative();
  }
  return targetData;
}

/*
 * Returns the filtering target for the specified data on the option page, or
 * undefined if blorkTerminated is false and wordsString is an empty string.
 */
function _newFilteringTarget(targetData) {
  if (targetData.blorkTerminated) {
    return ExtractNews.newFilteringTarget(targetData.name);
  }
  var targetWordSet = targetData.localizedWordSet;
  if (targetWordSet == undefined) {
    targetWordSet = new Set();
    targetData.wordsString.split(",").forEach((word) => {
        var targetWord = _Text.trimText(_Text.removeTextZeroWidthSpaces(word));
        if (targetWord != "") {
          targetWordSet.add(targetWord);
        }
      });
  }
  return ExtractNews.newFilteringTarget(
    targetData.name, Array.from(targetWordSet),
    targetData.wordBeginningMatched, targetData.wordEndMatched,
    targetData.wordNegative);
}

/*
 * The filtering object on the option page.
 */
class OptionFiltering {
  constructor() {
    this.dataIds = new Array();
    this.dataArray = new Array();
    this.dataSelectedIndex = -1;
    this.removedDataIds = new Array();
  }

  _getSelectedData() {
    if (this.dataSelectedIndex < 0) {
      throw newUnsupportedOperationException();
    }
    return this.dataArray[this.dataSelectedIndex];
  }

  get id() {
    if (this.dataSelectedIndex < 0) {
      throw newUnsupportedOperationException();
    }
    return this.dataIds[this.dataSelectedIndex];
  }

  get categoryTopicsString() {
    return this._getSelectedData().categoryTopicsString;
  }

  set categoryTopicsString(topicsString) {
    this._getSelectedData().categoryTopicsString = topicsString;
  }

  targetDataSize() {
    return this._getSelectedData().targetDataArray.length;
  }

  getTargetData(targetIndex) {
    var targetDataArray = this._getSelectedData().targetDataArray;
    if (targetIndex < 0 || targetIndex >= targetDataArray.length) {
      throw newIndexOutOfBoundsException("target data", targetIndex);
    }
    return targetDataArray[targetIndex];
  }

  insertTargetData(targetIndex, targetData) {
    var targetDataArray = this._getSelectedData().targetDataArray;
    if (targetIndex < 0 || targetIndex >= targetDataArray.length) {
      throw newIndexOutOfBoundsException("target data", targetIndex);
    } else if (targetData == undefined) {
      throw newNullPointerException("targetData");
    }
    targetDataArray.splice(targetIndex, 0, targetData);
  }

  removeTargetData(targetIndex) {
    var targetDataArray = this._getSelectedData().targetDataArray;
    if (targetIndex < 0 || targetIndex >= targetDataArray.length) {
      throw newIndexOutOfBoundsException("target data", targetIndex);
    }
    return targetDataArray.splice(targetIndex, 1)[0];
  }

  /*
   * Reads filtering data from the local storage and return the promise.
   */
  read() {
    return ExtractNews.Storage.readNewsFilteringIds().then((filteringIds) => {
        this.dataIds = filteringIds;
        return ExtractNews.Storage.readNewsFilterings(filteringIds);
      }).then((filteringMap) => {
        Debug.printMessage(
          "Read filterings for " + this.dataIds.join(", ") + ".");
        this.dataIds.forEach((filteringId) => {
            var filtering = filteringMap.get(filteringId);
            Debug.printJSON(filtering);
            this.dataArray.push(createFilteringData(filtering));
          });
        this.dataSelectedIndex = 0;
        return Promise.resolve();
      });
  }

  /*
   * Imports filtering data from a file and return the promise fulfilled with
   * the index of filtering targets appended to the option page.
   */
  import(dataReplaced = false) {
    var filteringTargetAppendedIndex = 0;
    var filteringTargetAppendedIndexMap = new Map();
    if (! dataReplaced) {
      this.dataIds.forEach((filteringId, index) => {
          filteringTargetAppendedIndexMap.set(
            filteringId, this.dataArray[index].targetDataArray.length - 1);
        });
    }
    const importPromise = new Promise((resolve) => {
        ExtractNews.File.importNewsFilterings(
          filteringTargetAppendedIndexMap, (filteringIds, filteringMap) => {
            if (dataReplaced) {
              // Replace the category name or topics, and targets of all
              // filterings with file's data.
              this.dataIds.forEach((dataId) => {
                  // Remove these filterings from the local storage when
                  // new filterings are saved on the option page.
                  if (this.removedDataIds.indexOf(dataId) < 0) {
                    this.removedDataIds.push(dataId);
                  }
                });
              this.dataIds = new Array();
              this.dataArray = new Array();
              this.dataSelectedIndex = 0;
            } else {
              filteringTargetAppendedIndex =
                this._getSelectedData().targetDataArray.length - 1;
            }
            if (filteringIds.length > 0) {
              Debug.printMessage(
                "Import filterings for " + filteringIds.join(", ") + ".");
              filteringIds.forEach((filteringId) => {
                  var filtering = filteringMap.get(filteringId);
                  Debug.printJSON(filtering);
                  for (let i = 0; i < this.dataArray.length; i++) {
                    if (filteringId == this.dataIds[i]) {
                      // Insert targets before the policy target in filtering
                      // data if has already been existed.
                      var filteringData = this.dataArray[i];
                      var targetDataArray = filteringData.targetDataArray;
                      var policyTarget =
                        ExtractNews.newFilteringTarget(
                          targetDataArray.pop().name);
                      if (filteringId != ExtractNews.FILTERING_FOR_ALL) {
                        filteringData.categoryTopicsString =
                          filtering.categoryTopics.join(",");
                      }
                      filteringData.categoryName = filtering.categoryName;
                      filtering.targets.forEach((filteringTarget) => {
                          targetDataArray.push(
                            createTargetData(filteringTarget));
                        });
                      targetDataArray.push(createTargetData(policyTarget));
                      return;
                    }
                  }
                  // Add new filtering data of imported targets to the array.
                  this.dataArray.push(createFilteringData(filtering));
                  this.dataIds.push(filteringId);
                });
            }
            // Always put the filtering for all topics to the last position.
            var filteringforAllIndex =
              this.dataIds.indexOf(ExtractNews.FILTERING_FOR_ALL);
            if (filteringforAllIndex < 0) { // No filtering for all topics
              var filtering = ExtractNews.newFiltering();
              filtering.setCategoryName(
                ExtractNews.getLocalizedString("AllFilteringCategoryName"));
              filtering.setPolicyTarget(ExtractNews.TARGET_ACCEPT);
              this.dataArray.push(createFilteringData(filtering));
            } else {
              if (filteringforAllIndex < this.dataIds.length - 1) {
                this.dataArray.push(
                  this.dataArray.splice(filteringforAllIndex, 1)[0]);
              }
              this.dataIds.splice(filteringforAllIndex, 1);
            }
            this.dataIds.push(ExtractNews.FILTERING_FOR_ALL);
            resolve();
          });
      });
    return importPromise.then(() => {
        return Promise.resolve(filteringTargetAppendedIndex);
      });
  }

  _write(writeNewsFilterings) {
    var filteringMap = new Map();
    this.dataArray.forEach((filteringData, index) => {
        var filtering = ExtractNews.newFiltering();
        filtering.setCategoryName(filteringData.categoryName);
        if (this.dataIds[index] != ExtractNews.FILTERING_FOR_ALL) {
          filtering.setCategoryTopics(
            filteringData.categoryTopicsString.split(","));
        }
        var filteringTargets = new Array();
        var targetDataArray = filteringData.targetDataArray;
        for (let i = 0; i < targetDataArray.length - 1; i++) {
          var filteringTarget =_newFilteringTarget(targetDataArray[i]);
          if (filteringTarget != undefined) {
            filteringTargets.push(filteringTarget);
          }
        }
        filtering.setTargets(filteringTargets);
        filtering.setPolicyTarget(
          targetDataArray[targetDataArray.length - 1].name);
        filteringMap.set(this.dataIds[index], filtering);
      });
    return writeNewsFilterings(this.dataIds, filteringMap);
  }

  /*
   * Exports filtering data to a file.
   */
  export() {
    this._write((filteringIds, filteringMap) => {
        ExtractNews.File.exportNewsFilterings(filteringIds, filteringMap);
        Debug.printMessage(
          "Export filterings for " + filteringIds.join(", ") + ".");
      });
  }

  /*
   * Saves filtering data to the local storage and return the promise.
   */
  save() {
    return this._write((filteringIds, filteringMap) => {
        const removingPromise =
          ExtractNews.Storage.removeNewsFilterings(this.removedDataIds);
        return removingPromise.then(() => {
            this.removedDataIds = new Array();
            return ExtractNews.Storage.writeNewsFilteringIds(filteringIds);
          }).then(() => {
            return ExtractNews.Storage.writeNewsFilterings(filteringMap);
          }).then(() => {
            Debug.printMessage(
              "Save filterings for " + filteringIds.join(", ") + ".");
            return Promise.resolve();
          });
      });
  }

  /*
   * Selects the filtering data of the specified ID on the option page.
   */
  selectData(filteringId) {
    if (filteringId == undefined) {
      throw newNullPointerException("filteringId");
    } else if ((typeof filteringId) != "string") {
      throw newIllegalArgumentException("filteringId");
    }
    for (let i = 0; i < this.dataIds.length; i++) {
      if (filteringId == this.dataIds[i]) {
        this.dataSelectedIndex = i;
        return;
      }
    }
    throw newInvalidParameterException(filteringId);
  }

  /*
   * Calls the specified function with the ID, category name and topics string,
   * and targets for each data.
   */
  forEachData(callback) {
    if (callback != undefined) {
      for (let i = 0; i < this.dataIds.length; i++) {
        var filteringData = this.dataArray[i];
        callback(this.dataIds[i], filteringData.categoryName,
          filteringData.categoryTopicsString, filteringData.targetDataArray);
      }
    }
  }
}
