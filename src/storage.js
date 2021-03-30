/*
 *  Define functions for the local storage on this extension.
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
 * Functions to read, write, and remove settings of this extension.
 */
ExtractNews.Storage = (() => {
    const _Storage = { };

    // Key to read and write filtering IDs, or filterings by suffixing with its
    const FILTERING_KEY = "Filtering";

    /*
     * Reads IDs of filterings on news site from the local storage and returns
     * the promise fulfilled with the array of its or rejected.
     */
    function readNewsFilteringIds() {
      return ExtractNews.readStorageArea(FILTERING_KEY).then((items) => {
          var filteringIdsString = items[FILTERING_KEY];
          if (filteringIdsString == undefined) {
            filteringIdsString =
              ExtractNews.getLocalizedString("FilteringIds");
          }
          return Promise.resolve(filteringIdsString.split(","));
        });
    }

    /*
     * Writes the specified IDs of filtering on news site to the local storage
     * and returns the promise.
     */
    function writeNewsFilteringIds(filteringIds) {
      if (! Array.isArray(filteringIds)) {
        throw newIllegalArgumentException("filteringIds");
      } else if (filteringIds.length == 0) {
        return Promise.resolve();
      }
      return ExtractNews.writeStorageArea({
          [FILTERING_KEY]: filteringIds.join(",")
        });
    }

    _Storage.readNewsFilteringIds = readNewsFilteringIds;
    _Storage.writeNewsFilteringIds = writeNewsFilteringIds;

    /*
     * Reads filterings on news site for IDs in the specified array from
     * the local storage and returns the promise fulfilled with the map
     * of its or rejected.
     */
    function readNewsFilterings(filteringIds) {
      if (! Array.isArray(filteringIds)) {
        throw newIllegalArgumentException("filteringIds");
      }
      const readingPromises = new Array();
      var newsFilteringMap = new Map();
      filteringIds.forEach((filteringId) => {
          var newsFilteringKey = FILTERING_KEY + filteringId;
          readingPromises.push(
            ExtractNews.readStorageArea(newsFilteringKey).then((items) => {
                var filtering;
                if (items[newsFilteringKey] != undefined) {
                  filtering =
                    new ExtractNews.Filtering(items[newsFilteringKey]);
                } else {
                  filtering = ExtractNews.newFiltering();
                  filtering.setCategoryName(
                    ExtractNews.getLocalizedString(
                      filteringId + "FilteringCategoryName"));
                  if (filteringId != ExtractNews.FILTERING_FOR_ALL) {
                    filtering.setCategoryTopics(
                      ExtractNews.splitLocalizedString(
                        filteringId + "FilteringCategoryTopics"));
                  } else {
                    filtering.setPolicyTarget(ExtractNews.TARGET_ACCEPT);
                  }
                }
                newsFilteringMap.set(filteringId, filtering);
              }));
        });
      return Promise.all(readingPromises).then(() => {
          return Promise.resolve(newsFilteringMap);
        });
    }

    /*
     * Writes filterings on news site in the specified map to the local storage
     * and returns the promise.
     */
    function writeNewsFilterings(newsFilteringMap) {
      if (newsFilteringMap == undefined) {
        throw newNullPointerException("newsFilteringMap");
      } else if (newsFilteringMap.size == 0) {
        return Promise.resolve();
      }
      const writingPromises = new Array();
      newsFilteringMap.forEach((filtering, filteringId) => {
          var newsFilteringKey = FILTERING_KEY + filteringId;
          writingPromises.push(
            ExtractNews.writeStorageArea({
                [newsFilteringKey]: filtering.toObject()
              }));
        });
      return Promise.all(writingPromises);
    }

    /*
     * Removes filterings on news site for IDs in the specified array from
     * the local storage and returns the promise.
     */
    function removeNewsFilterings(filteringIds) {
      if (! Array.isArray(filteringIds)) {
        throw newIllegalArgumentException("filteringIds");
      }
      const removingPromises = new Array();
      filteringIds.forEach((filteringId) => {
          var newsFilteringKey = FILTERING_KEY + filteringId;
          removingPromises.push(
            ExtractNews.removeStorageArea(newsFilteringKey));
        });
      return Promise.all(removingPromises);
    }

    _Storage.readNewsFilterings = readNewsFilterings;
    _Storage.writeNewsFilterings = writeNewsFilterings;
    _Storage.removeNewsFilterings = removeNewsFilterings;


    // Key to read and write the count of news selections
    const SELECTION_COUNT_KEY = "SelectionCount";

    /*
     * Returns the count of news selections in the local storage and returns
     * the promise fulfilled with its value or rejected.
     */
    function readNewsSelectionCount() {
      return ExtractNews.readStorageArea(SELECTION_COUNT_KEY).then((items) => {
          var newsSelectionCount = 0;
          if (items[SELECTION_COUNT_KEY] != undefined) {
            newsSelectionCount = items[SELECTION_COUNT_KEY];
          }
          return Promise.resolve(newsSelectionCount);
        });
    }

    _Storage.readNewsSelectionCount = readNewsSelectionCount;


    // Read and write functions for news selections as the key of index number

    function _checkIndex(index, maxIndex) {
      if (! Number.isInteger(index)) {
        throw newIllegalArgumentException("index");
      } else if (index < 0 || index > maxIndex) {
        throw newIndexOutOfBoundsException("news selections", index);
      }
    }

    function _getIndex(indexString, maxIndex) {
      var index = Number(indexString);
      _checkIndex(index, maxIndex);
      return index;
    }

    function _checkIndexString(indexString, maxIndexNumber) {
      _getIndex(indexString, maxIndexNumber);
    }

    /*
     * Reads a news selection for the specified index from the local storage
     * and returns the promise fulfilled with its value or rejected.
     */
    function readNewsSelection(index) {
      return readNewsSelectionCount().then((newsSelectionCount) => {
          _checkIndex(index, newsSelectionCount - 1);
          var indexString = ExtractNews.SELECTION_INDEX_STRINGS[index];
          return ExtractNews.readStorageArea(indexString).then((items) => {
              return Promise.resolve(
                new ExtractNews.Selection(items[indexString]));
            });
        });
    }

    /*
     * Reads news selections for index strings in the specified array from
     * the local storage and returns the promise fulfilled with the array of
     * its or rejected.
     */
    function readNewsSelections(indexStrings) {
      if (indexStrings == undefined) {
        throw newNullPointerException("indexStrings");
      } else if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      } else if (indexStrings.length == 0) {
        return Promise.resolve(new Array());
      }
      return readNewsSelectionCount().then((newsSelectionCount) => {
          for (let i = 0; i < indexStrings.length; i++) {
            _checkIndexString(indexStrings[i], newsSelectionCount - 1);
          }
          return ExtractNews.readStorageArea(indexStrings);
        }).then((items) => {
          var newsSelections = new Array();
          for (let i = 0; i < indexStrings.length; i++) {
            var indexString = indexStrings[i];
            var newsSelectionObject = items[indexString];
            if (newsSelectionObject == undefined) {
              throw newStorageConsistencyException(indexString, "undefined");
            }
            newsSelections.push(
              new ExtractNews.Selection(newsSelectionObject));
          }
          return Promise.resolve(newsSelections);
        });
    }

    _Storage.readNewsSelection = readNewsSelection;
    _Storage.readNewsSelections = readNewsSelections;

    /*
     * Writes the specified news selection for the specified index to the local
     * storage and returns the promise.
     */
    function writeNewsSelection(index, newsSelection) {
      if (newsSelection == undefined) {
        throw newNullPointerException("newsSelection");
      }
      var writtenMaxIndex;
      return readNewsSelectionCount().then((newsSelectionCount) => {
          writtenMaxIndex = newsSelectionCount;
          if (writtenMaxIndex >= ExtractNews.SELECTION_MAX_COUNT) {
            writtenMaxIndex--;
          }
          _checkIndex(index, writtenMaxIndex + 1);
          var indexString = ExtractNews.SELECTION_INDEX_STRINGS[index];
          return ExtractNews.writeStorageArea({
              [indexString]: newsSelection.toObject()
            });
        }).then(() => {
          if (index >= writtenMaxIndex) {
            return ExtractNews.writeStorageArea({
                [SELECTION_COUNT_KEY]: index + 1
              });
          }
          return Promise.resolve();
        });
    }

    // Writes the specified objects of news selection to the local storage.

    function _writeNewsSelectionObject(indexStrings, newsSelectionObjects) {
      if (indexStrings.length > 0) {
        var newsSelectionItems = { };
        for (let i = 0; i < indexStrings.length; i++) {
          var indexString = indexStrings[i];
          Object.assign(newsSelectionItems, {
              [indexString]: newsSelectionObjects[i]
            });
        }
        return ExtractNews.writeStorageArea(newsSelectionItems);
      }
      return Promise.resolve();
    }

    /*
     * Writes news selections for index strings in the specified arrray into
     * the local storage and returns the promise.
     */
    function writeNewsSelections(indexStrings, newsSelections) {
      if (! Array.isArray(newsSelections)) {
        throw newIllegalArgumentException("newsSelections");
      } else if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      } else if (indexStrings.length == 0) {
        return Promise.resolve();
      }
      var writtenMaxIndex;
      return readNewsSelectionCount().then((newsSelectionCount) => {
          writtenMaxIndex = newsSelectionCount;
          if (writtenMaxIndex >= ExtractNews.SELECTION_MAX_COUNT) {
            writtenMaxIndex--;
          }
          var newsSelectionObjects = new Array();
          for (let i = 0; i < indexStrings.length; i++) {
            if (newsSelections[i] == undefined) {
              throw newArrayInvalidParametersException(newsSelections);
            }
            var indexString = indexStrings[i];
            var index = _getIndex(indexString, writtenMaxIndex);
            if (index >= writtenMaxIndex) {
              writtenMaxIndex = index + 1;
            }
            newsSelectionObjects.push(newsSelections[i].toObject());
          }
          return _writeNewsSelectionObject(indexStrings, newsSelectionObjects);
        }).then(() => {
          return ExtractNews.writeStorageArea({
              [SELECTION_COUNT_KEY]: writtenMaxIndex
            });
        });
    }

    _Storage.writeNewsSelection = writeNewsSelection;
    _Storage.writeNewsSelections = writeNewsSelections;

    /*
     * Removes a news selection for the specified index from the local storage
     * and returns the promise.
     */
    function removeNewsSelection(index) {
      return removeNewsSelections([ String(index) ]);
    }

    // Inserts the specified index string into the specified array of indexes
    // which sorted by the number.

    function _setSortedIndexes(indexString, sortedMaxIndex, sortedIndexes) {
      var sortedIndex = _getIndex(indexString, sortedMaxIndex);
      for (let i = 0; i < sortedIndexes.length; i++) {
        if (sortedIndex < sortedIndexes[i]) {
          sortedIndexes.splice(i, 0, sortedIndex);
          return;
        }
      }
      sortedIndexes.push(sortedIndex);
    }

    /*
     * Removes news selections for index strings in the specified sorted arrray
     * from the local storage and returns the promise.
     */
    function removeNewsSelections(indexStrings) {
      if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      } else if (indexStrings.length == 0) {
        return Promise.resolve();
      }
      var removedFirstIndex;
      var removedNewsSelectionSize = indexStrings.length;
      var retainedNewsSelectionSize = 0;
      var retainedIndexStrings = new Array();
      return readNewsSelectionCount().then((newsSelectionCount) => {
          var removedIndexes = new Array();
          for (let i = 0; i < indexStrings.length; i++) {
            _setSortedIndexes(
              indexStrings[i], newsSelectionCount - 1, removedIndexes);
          }
          removedFirstIndex = removedIndexes[0];
          // Collect the string of indexes between news selections removed from
          // the local storage into an array.
          var retainedIndex = ExtractNews.SELECTION_MAX_COUNT;
          for (let i = 0; i < removedIndexes.length; i++) {
            if (retainedIndex < ExtractNews.SELECTION_MAX_COUNT) {
              var removedIndex = removedIndexes[i];
              if (removedIndex > retainedIndex) {
                do {
                  retainedIndexStrings.push(
                    ExtractNews.SELECTION_INDEX_STRINGS[retainedIndex++]);
                } while (removedIndex > retainedIndex);
              }
            } else {
              retainedIndex = removedFirstIndex;
            }
            retainedIndex++;
          }
          while (retainedIndex < newsSelectionCount) {
            retainedIndexStrings.push(
              ExtractNews.SELECTION_INDEX_STRINGS[retainedIndex++]);
          }
          retainedNewsSelectionSize = retainedIndexStrings.length;

          // Read news selections retained in the local storage.
          return ExtractNews.readStorageArea(retainedIndexStrings);
        }).then((items) => {
          // Overwrite retained news selections into the first position
          // of removed indexes.
          var movedIndexStrings = new Array();
          var movedObjects = new Array();
          for (let i = 0; i < retainedNewsSelectionSize; i++) {
            movedIndexStrings.push(
              ExtractNews.SELECTION_INDEX_STRINGS[removedFirstIndex + i]);
            movedObjects.push(items[retainedIndexStrings[i]]);
          }
          return _writeNewsSelectionObject(movedIndexStrings, movedObjects);
        }).then(() => {
          // Clear the trailing spaces after moving retained news selections.
          var trailingIndexSrings = new Array();
          var trailingIndex = removedFirstIndex + retainedNewsSelectionSize;
          for (let i = 0; i < removedNewsSelectionSize; i++) {
            trailingIndexSrings.push(
              ExtractNews.SELECTION_INDEX_STRINGS[trailingIndex++]);
          }
          return ExtractNews.removeStorageArea(trailingIndexSrings);
        }).then(() => {
          return ExtractNews.writeStorageArea({
              [SELECTION_COUNT_KEY]:
                removedFirstIndex + retainedNewsSelectionSize
            });
        });
    }

    /*
     * Removes all news selections from the local storage and returns
     * the promise.
     */
    function removeNewsSelectionAll() {
      return readNewsSelectionCount().then((newsSelectionCount) => {
          var indexStrings = new Array();
          for (let i = 0; i < newsSelectionCount; i++) {
            indexStrings.push(ExtractNews.SELECTION_INDEX_STRINGS[i]);
          }
          return ExtractNews.removeStorageArea(indexStrings);
        }).then(() => {
          return ExtractNews.writeStorageArea({
              [SELECTION_COUNT_KEY]: 0
            });
        });
    }

    _Storage.removeNewsSelection = removeNewsSelection;
    _Storage.removeNewsSelections = removeNewsSelections;
    _Storage.removeNewsSelectionAll = removeNewsSelectionAll;

    /*
     * Moves a news selection for index strings up into the local storage
     * and returns the promise.
     */
    function moveNewsSelectionUp(index) {
      return moveNewsSelectionsUp([ String(index) ]);
    }

    /*
     * Moves news selections for index strings in the specified sorted array up
     * into the local storage and returns the promise.
     */
    function moveNewsSelectionsUp(indexStrings) {
      if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      } else if (indexStrings.length == 0) {
        throw newEmptyArrayException("indexStrings");
      }
      var readIndexStrings = new Array();
      var movedIndexStrings = new Array();
      return readNewsSelectionCount().then((newsSelectionCount) => {
          var movedIndexes = new Array();
          for (let i = 0; i < indexStrings.length; i++) {
            _setSortedIndexes(
              indexStrings[i], newsSelectionCount - 1, movedIndexes);
          }
          // Collect the string of indexes for news selections moved up and
          // the previous of its read from the local storage into an array.
          for (let i = 0; i < movedIndexes.length; i++) {
            var movedIndex = movedIndexes[i];
            var movedPartStart = movedIndex;
            while (i + 1 < movedIndexes.length) {
              var movedNextIndex = movedIndexes[i + 1];
              if (movedNextIndex > movedIndex - 1) {
                break;
              }
              movedIndex = movedNextIndex;
              i++;
            }

            if (movedPartStart == 0) {
              // Throw the exception because the first news selection is moved
              // up as in the below case for indexStrings = [ 0, 1, 2 ].
              //
              // readIndexStrings  = [ -1, 0, 1, 2 ]
              // movedIndexStrings = [ 2, -1, 0, 1 ]
              throw newArrayInvalidParametersException(indexStrings);
            }

            // See below, when news selections for indexStrings = [ 2, 5, 6 ]
            // are moved up, its indexes are replaced.
            //
            // readIndexStrings  = [ 1, 2, 4, 5, 6 ]
            // movedIndexStrings = [ 2, 1, 6, 4, 5 ]
            var movedPartEnd = movedIndex;
            readIndexStrings.push(
              ExtractNews.SELECTION_INDEX_STRINGS[movedPartStart - 1]);
            movedIndexStrings.push(
              ExtractNews.SELECTION_INDEX_STRINGS[movedPartEnd]);
            movedIndex = movedPartStart;
            do {
              readIndexStrings.push(
                ExtractNews.SELECTION_INDEX_STRINGS[movedIndex]);
              movedIndexStrings.push(
                ExtractNews.SELECTION_INDEX_STRINGS[movedIndex - 1]);
            } while (++movedIndex <= movedPartEnd);
          }
          return ExtractNews.removeStorageArea(readIndexStrings);
        }).then((objects) => {
          var movedObjects = new Array();
          for (let i = 0; i < readIndexStrings.length; i++) {
            movedObjects.push(objects[readIndexStrings[i]]);
          }
          return _writeNewsSelectionObject(movedIndexStrings, movedObjects);
        });
    }

    /*
     * Moves a news selection for index strings down into the local storage
     * and returns the promise.
     */
    function moveNewsSelectionDown(index) {
      return moveNewsSelectionsDown([ String(index) ]);
    }

    /*
     * Moves news selections for index strings in the specified sorted array
     * down into the local storage and returns the promise.
     */
    function moveNewsSelectionsDown(indexStrings) {
      if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      } else if (indexStrings.length == 0) {
        throw newEmptyArrayException("indexStrings");
      }
      var readIndexStrings = new Array();
      var movedIndexStrings = new Array();
      return readNewsSelectionCount().then((newsSelectionCount) => {
          var movedIndexes = new Array();
          for (let i = 0; i < indexStrings.length; i++) {
            _setSortedIndexes(
              indexStrings[i], newsSelectionCount - 1, movedIndexes);
          }
          // Collect the string of indexes for news selections moved down and
          // the next of its read from the local storage into an array.
          var movedPreviousIndex = -1;
          var movedPartStart = movedIndexes[0];
          for (let i = 0; i < movedIndexes.length; i++) {
            var movedIndex = movedIndexes[i];
            if (movedPreviousIndex >= 0
              && movedPreviousIndex < movedIndex - 1) {
              readIndexStrings.push(
                ExtractNews.SELECTION_INDEX_STRINGS[movedPreviousIndex + 1]);
              movedIndexStrings.push(
                ExtractNews.SELECTION_INDEX_STRINGS[movedPartStart]);
              movedPartStart = movedIndex;
            }
            readIndexStrings.push(
              ExtractNews.SELECTION_INDEX_STRINGS[movedIndex]);
            movedIndexStrings.push(
              ExtractNews.SELECTION_INDEX_STRINGS[movedIndex + 1]);
            movedPreviousIndex = movedIndex;
          }

          if (movedPreviousIndex + 1 >= newsSelectionCount) {
            // Throw the exception because the last news selection is moved
            // down as in the below case for indexStrings = [ 2, 5, 6 ].
            //
            // existing indexes  = [ 2, 3, 5, 6    ]
            // movedIndexStrings = [ 3, 2, 6, 7, 5 ]  <- undefined for 5
            throw newArrayInvalidParametersException(indexStrings);
          }

          // See below, when news selections for indexStrings = [ 2, 5, 6 ]
          // are moved down, its indexes are replaced.
          //
          // readIndexStrings  = [ 2, 3, 5, 6, 7 ]
          // movedIndexStrings = [ 3, 2, 6, 7, 5 ]
          readIndexStrings.push(
            ExtractNews.SELECTION_INDEX_STRINGS[movedPreviousIndex + 1]);
          movedIndexStrings.push(
            ExtractNews.SELECTION_INDEX_STRINGS[movedPartStart]);
          return ExtractNews.removeStorageArea(readIndexStrings);
        }).then((objects) => {
          var movedObjects = new Array();
          for (let i = 0; i < readIndexStrings.length; i++) {
            movedObjects.push(objects[readIndexStrings[i]]);
          }
          return _writeNewsSelectionObject(movedIndexStrings, movedObjects);
        });
    }

    _Storage.moveNewsSelectionDown = moveNewsSelectionDown;
    _Storage.moveNewsSelectionsDown = moveNewsSelectionsDown;
    _Storage.moveNewsSelectionUp = moveNewsSelectionUp;
    _Storage.moveNewsSelectionsUp = moveNewsSelectionsUp;


    // Key to read and write a favicon string by suffixing the favicon ID.
    const FAVICON_KEY = "Favicon";
    const FAVICON_ID_REGEXP = new RegExp(/^[A-Za-z][0-9A-Za-z]+$/);

    function _checkFaviconId(faviconId) {
      if (faviconId == undefined) {
        throw newNullPointerException("faviconId");
      } else if ((typeof faviconId) != "string") {
        throw newIllegalArgumentException("faviconId");
      } else if (! FAVICON_ID_REGEXP.test(faviconId)) {
        throw newInvalidParameterException(faviconId);
      }
    }

    /*
     * Reads the favicon string for the specified ID from the local storage
     * and returns the promise fulfilled with its value or rejected.
     */
    function readFavicon(faviconId) {
      _checkFaviconId(faviconId);
      var faviconKey = FAVICON_KEY + faviconId;
      return ExtractNews.readStorageArea(faviconKey).then((items) => {
          var favicon = "";
          if (items[faviconKey] != undefined) {
            favicon = items[faviconKey];
          }
          return Promise.resolve(favicon);
        });
    }

    /*
     * Writes the specified favicon string for the specified ID into the local
     * storage and returns the promise.
     */
    function writeFavicon(faviconId, favicon) {
      _checkFaviconId(faviconId);
      if (favicon == undefined) {
        throw newNullPointerException("favicon");
      } else if ((typeof favicon) != "string") {
        throw newIllegalArgumentException("favicon");
      } else if (favicon == "") {
        throw newEmptyStringException("favicon");
      }
      var faviconKey = FAVICON_KEY + faviconId;
      return ExtractNews.writeStorageArea({ [faviconKey]: favicon });
    }

    _Storage.readFavicon = readFavicon;
    _Storage.writeFavicon = writeFavicon;


    // Key to read and write a comment mode by suffixing the site ID.
    const COMMENT_KEY = "Comment";

    function _checkSiteId(siteId) {
      if (siteId == undefined) {
        throw newNullPointerException("siteId");
      } else if ((typeof siteId) != "string") {
        throw newIllegalArgumentException("siteId");
      }
    }

    /*
     * Reads the comment mode for a site of the specified ID from the local
     * storage and returns the promise fulfilled with its value or rejected.
     */
    function readCommentMode(siteId) {
      _checkSiteId(siteId);
      var commentKey = COMMENT_KEY + siteId;
      return ExtractNews.readStorageArea(commentKey).then((items) => {
          var commentOn = true;
          if (items[commentKey] != undefined) {
            commentOn = items[commentKey];
          }
          return Promise.resolve(commentOn);
        });
    }

    /*
     * Writes the specified comment mode for a site of the specified URL
     * into the local storage and returns the promise.
     */
    function writeCommentMode(siteId, commentOn) {
      _checkSiteId(siteId);
      if ((typeof commentOn) != "boolean") {
        throw newIllegalArgumentException("commentOn");
      }
      var commentKey = COMMENT_KEY + siteId;
      return ExtractNews.writeStorageArea({ [commentKey]: commentOn });
    }

    _Storage.readCommentMode = readCommentMode;
    _Storage.writeCommentMode = writeCommentMode;

    return _Storage;
  })();
