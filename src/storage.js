/*
 *  Define functions to read, write, and remove settings for the storage.
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

    const readStorage = ExtractNews.readStorage;
    const writeStorage = ExtractNews.writeStorage;
    const removeStorage = ExtractNews.removeStorage;

    /*
     * Reads IDs of enabled domains from the storage and returns the promise
     * fulfilled with the array of its or rejected.
     */
    function readEnabledDomainIds() {
      var enabledDomainIds = new Array();
      var enabledKeys = new Array();
      ExtractNews.forEachDomain((domainId) => {
          enabledKeys.push(domainId + ExtractNews.ENABLED_KEY);
        });
      return readStorage(enabledKeys).then((items) => {
          enabledKeys.forEach((enabledKey) => {
              var enabled = items[enabledKey];
              if (enabled | enabled == undefined) {
                enabledDomainIds.push(
                  enabledKey.substring(
                    0, enabledKey.indexOf(ExtractNews.ENABLED_KEY)));
              }
            });
          return Promise.resolve(enabledDomainIds);
        })
    }

    /*
     * Writes the specified flag to enable the domain of the specified ID
     * into the storage and returns the promise.
     */
    function writeDomainEnabled(domainId, enabled) {
      if (domainId == undefined) {
        throw newNullPointerException("domainId");
      } else if ((typeof domainId) != "string") {
        throw newIllegalArgumentException("domainId");
      } else if (domainId == "") {
        throw newEmptyStringException("domainId");
      } else if ((typeof enabled) != "boolean") {
        throw newIllegalArgumentException("enabled");
      }
      var enabledKey = domainId + ExtractNews.ENABLED_KEY;
      return writeStorage({
          [enabledKey]: enabled
        });
    }

    _Storage.readEnabledDomainIds = readEnabledDomainIds;
    _Storage.writeDomainEnabled = writeDomainEnabled;


    // Key to read and write the flag whether the filtering is disabled
    const FILTERING_DISABLED_KEY = "FilteringDisabled";

    /*
     * Reads the flag to disable the filtering from the storage and returns
     * the promise fulfilled with its value or rejected.
     */
    function readFilteringDisabled() {
      return readStorage(FILTERING_DISABLED_KEY).then((items) => {
          var filteringDisabled = items[FILTERING_DISABLED_KEY];
          if (filteringDisabled == undefined) {
            filteringDisabled = false;
          }
          return Promise.resolve(filteringDisabled);
        });
    }

    /*
     * Writes the specified flag to disable the filtering into the storage
     * and returns the promise.
     */
    function writeFilteringDisabled(filteringDisabled) {
      if ((typeof filteringDisabled) != "boolean") {
        throw newIllegalArgumentException("filteringDisabled");
      }
      return writeStorage({
          [FILTERING_DISABLED_KEY]: filteringDisabled
        });
    }

    _Storage.readFilteringDisabled = readFilteringDisabled;
    _Storage.writeFilteringDisabled = writeFilteringDisabled;

    // Key to read and write filtering IDs, or filterings by suffixing with its
    const FILTERING_KEY = "Filtering";

    /*
     * Reads IDs of filterings on news site from the storage and returns
     * the promise fulfilled with the array of its or rejected.
     */
    function readFilteringIds() {
      return readStorage(FILTERING_KEY).then((items) => {
          var filteringIdsString = items[FILTERING_KEY];
          if (filteringIdsString == undefined) {
            filteringIdsString =
              ExtractNews.getLocalizedString("FilteringIds");
          }
          return Promise.resolve(filteringIdsString.split(","));
        });
    }

    /*
     * Writes the specified IDs of filtering on news site to the storage
     * and returns the promise.
     */
    function writeFilteringIds(filteringIds) {
      if (! Array.isArray(filteringIds)) {
        throw newIllegalArgumentException("filteringIds");
      } else if (filteringIds.length > 0) {
        return writeStorage({
            [FILTERING_KEY]: filteringIds.join(",")
          });
      }
      return Promise.resolve();
    }

    _Storage.readFilteringIds = readFilteringIds;
    _Storage.writeFilteringIds = writeFilteringIds;

    /*
     * Reads filterings on news site for IDs in the specified array from
     * the storage and returns the promise fulfilled with the map of its
     * or rejected.
     */
    function readFilterings(filteringIds) {
      if (! Array.isArray(filteringIds)) {
        throw newIllegalArgumentException("filteringIds");
      }
      const readingPromises = new Array();
      var filteringMap = new Map();
      filteringIds.forEach((filteringId) => {
          var filteringKey = FILTERING_KEY + filteringId;
          readingPromises.push(
            readStorage(filteringKey).then((items) => {
                var filtering;
                if (items[filteringKey] != undefined) {
                  filtering =
                    new ExtractNews.Filtering(items[filteringKey]);
                } else { // Only the category for all in the initial setting
                  filtering = ExtractNews.newFiltering();
                  filtering.setCategoryName(
                    ExtractNews.getLocalizedString(
                      filteringId + "FilteringCategoryName"));
                  filtering.setPolicyTarget(ExtractNews.TARGET_ACCEPT);
                }
                filteringMap.set(filteringId, filtering);
              }));
        });
      return Promise.all(readingPromises).then(() => {
          return Promise.resolve(filteringMap);
        });
    }

    /*
     * Writes filterings on news site in the specified map to the storage
     * and returns the promise.
     */
    function writeFilterings(filteringMap) {
      if (filteringMap == undefined) {
        throw newNullPointerException("filteringMap");
      } else if (filteringMap.size > 0) {
        const writingPromises = new Array();
        filteringMap.forEach((filtering, filteringId) => {
            var filteringKey = FILTERING_KEY + filteringId;
            writingPromises.push(
              writeStorage({
                  [filteringKey]: filtering.toObject()
                }));
          });
        return Promise.all(writingPromises);
      }
      return Promise.resolve();
    }

    /*
     * Removes filterings on news site for IDs in the specified array from
     * the storage and returns the promise.
     */
    function removeFilterings(filteringIds) {
      if (! Array.isArray(filteringIds)) {
        throw newIllegalArgumentException("filteringIds");
      } else if (filteringIds.length > 0) {
        const removingPromises = new Array();
        filteringIds.forEach((filteringId) => {
            var filteringKey = FILTERING_KEY + filteringId;
            removingPromises.push(removeStorage(filteringKey));
          });
        return Promise.all(removingPromises);
      }
      return Promise.resolve();
    }

    _Storage.readFilterings = readFilterings;
    _Storage.writeFilterings = writeFilterings;
    _Storage.removeFilterings = removeFilterings;


    // Key to read and write the count of news selections
    const SELECTION_COUNT_KEY = "SelectionCount";

    /*
     * Returns the count of news selections in the storage and returns
     * the promise fulfilled with its value or rejected.
     */
    function readSelectionCount() {
      return readStorage(SELECTION_COUNT_KEY).then((items) => {
          var selectionCount = 0;
          if (items[SELECTION_COUNT_KEY] != undefined) {
            selectionCount = items[SELECTION_COUNT_KEY];
          }
          return Promise.resolve(selectionCount);
        });
    }

    _Storage.readSelectionCount = readSelectionCount;

    function _checkSelectionIndex(index, size) {
      if (! Number.isInteger(index)) {
        throw newIllegalArgumentException("index");
      } else if (index < 0 || index >= size) {
        throw newIndexOutOfBoundsException("news selections", index);
      }
    }

    /*
     * Reads a news selection for the specified index from the storage
     * and returns the promise fulfilled with its value or rejected.
     */
    function readSelection(index) {
      return readSelectionCount().then((selectionCount) => {
          _checkSelectionIndex(index, selectionCount);
          var indexString = String(index);
          return readStorage(indexString).then((items) => {
              return Promise.resolve(
                new ExtractNews.Selection(items[indexString]));
            });
        });
    }

    /*
     * Reads news selections for index strings in the specified array from
     * the storage and returns the promise fulfilled with the array of its
     * or rejected.
     */
    function readSelections(indexStrings) {
      if (indexStrings == undefined) {
        throw newNullPointerException("indexStrings");
      } else if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      } else if (indexStrings.length > 0) {
        return readSelectionCount().then((selectionCount) => {
            for (let i = 0; i < indexStrings.length; i++) {
              _checkSelectionIndex(Number(indexStrings[i]), selectionCount);
            }
            return readStorage(indexStrings);
          }).then((items) => {
            var selections = new Array();
            for (let i = 0; i < indexStrings.length; i++) {
              var indexString = indexStrings[i];
              var selectionObject = items[indexString];
              if (selectionObject != undefined) {
                selections.push(new ExtractNews.Selection(selectionObject));
              }
            }
            return Promise.resolve(selections);
          });
      }
      return Promise.resolve(new Array());
    }

    _Storage.readSelection = readSelection;
    _Storage.readSelections = readSelections;

    /*
     * Writes the specified news selection for the specified index into
     * the storage and returns the promise.
     */
    function writeSelection(index, selection) {
      if (selection == undefined) {
        throw newNullPointerException("selection");
      }
      return readSelectionCount().then((selectionCount) => {
          _checkSelectionIndex(index, selectionCount + 1);
          var indexString = String(index);
          writeStorage({
              [indexString]: selection.toObject()
            }).then(() => {
              if (index >= selectionCount) {
                writeStorage({
                    [SELECTION_COUNT_KEY]: selectionCount + 1
                  });
              }
            });
        });
    }

    // Writes the specified news selection objects for the specified indexes
    // into the storage.

    function _writeSelectionObjects(indexStrings, selectionObjects) {
      if (indexStrings.length > 0) {
        var selectionItems = { };
        for (let i = 0; i < indexStrings.length; i++) {
          var indexString = indexStrings[i];
          Object.assign(selectionItems, {
              [indexString]: selectionObjects[i]
            });
        }
        return writeStorage(selectionItems);
      }
      return Promise.resolve();
    }

    /*
     * Writes news selections for index strings in the specified arrray into
     * the storage and returns the promise.
     */
    function writeSelections(indexStrings, selections) {
      if (indexStrings == undefined) {
        throw newNullPointerException("indexStrings");
      } else if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      } else if (! Array.isArray(selections)) {
        throw newIllegalArgumentException("selections");
      } else if (indexStrings.length > selections.length) {
        throw newIndexOutOfBoundsException(
          "news selections", indexStrings.length);
      } else if (indexStrings.length > 0) {
        return readSelectionCount().then((selectionCount) => {
            var selectionObjects = new Array();
            for (let i = 0; i < indexStrings.length; i++) {
              var index = Number(indexStrings[i]);
              _checkSelectionIndex(index, selectionCount + 1);
              if (index >= selectionCount) {
                selectionCount++;
              }
              selectionObjects.push(selections[i].toObject());
            }
            _writeSelectionObjects(indexStrings, selectionObjects).then(() => {
                writeStorage({
                    [SELECTION_COUNT_KEY]: selectionCount
                  });
              });
          });
      }
      return Promise.resolve();
    }

    _Storage.writeSelection = writeSelection;
    _Storage.writeSelections = writeSelections;

    /*
     * Removes a news selection for the specified index from the storage
     * and returns the promise.
     */
    function removeSelection(index) {
      return removeSelections(Array.of(String(index)));
    }

    /*
     * Removes news selections for index strings in the specified sorted arrray
     * from the storage and returns the promise.
     */
    function removeSelections(indexStrings) {
      if (indexStrings == undefined) {
        throw newNullPointerException("indexStrings");
      } else if (! Array.isArray(indexStrings)) {
        throw newIllegalArgumentException("indexStrings");
      } else if (indexStrings.length > 0) {
        var removedFirstIndex;
        var removedSelectionSize = indexStrings.length;
        var retainedSelectionSize = 0;
        var retainedIndexStrings = new Array();
        return readSelectionCount().then((selectionCount) => {
            var removedIndexes = new Array();
            indexStrings.forEach((indexString) => {
                // Insert the index string into the array of removed indexes
                // which sorted by the number.
                var sortedIndex = Number(indexString);
                _checkSelectionIndex(sortedIndex, selectionCount);
                for (let i = 0; i < removedIndexes.length; i++) {
                  if (sortedIndex < removedIndexes[i]) {
                    removedIndexes.splice(i, 0, sortedIndex);
                    return;
                  }
                }
                removedIndexes.push(sortedIndex);
              });
            removedFirstIndex = removedIndexes[0];
            // Collect the string of indexes between news selections removed
            // from the storage. See below, if the array of indexes [ 2, 5, 7 ]
            // is removed, [ 1 ] is fixed, and [ 3, 4, 6, 8, 9, 10 ] is moved
            // and retained for 10 news selections.
            //
            // removedIndexes  = [    2,       5,    7           ]
            // retainedIndexes = [       3, 4,    6,    8, 9, 10 ]
            var retainedIndex = selectionCount;
            for (let i = 0; i < removedIndexes.length; i++) {
              if (retainedIndex < selectionCount) {
                var removedIndex = removedIndexes[i];
                if (removedIndex > retainedIndex) {
                  do {
                    retainedIndexStrings.push(String(retainedIndex));
                    retainedIndex++;
                  } while (removedIndex > retainedIndex);
                }
              } else {
                retainedIndex = removedFirstIndex;
              }
              retainedIndex++;
            }
            while (retainedIndex < selectionCount) {
              retainedIndexStrings.push(String(retainedIndex));
              retainedIndex++;
            }
            retainedSelectionSize = retainedIndexStrings.length;
            return readStorage(retainedIndexStrings);
          }).then((items) => {
            // Overwrite retained news selections into the first position
            // of removed indexes.
            var movedIndexStrings = new Array();
            var movedObjects = new Array();
            for (let i = 0; i < retainedSelectionSize; i++) {
              movedIndexStrings.push(String(removedFirstIndex + i));
              movedObjects.push(items[retainedIndexStrings[i]]);
            }
            return _writeSelectionObjects(movedIndexStrings, movedObjects);
          }).then(() => {
            // Remove trailing spaces after retained news selections are moved.
            var trailingIndexSrings = new Array();
            var trailingIndex = removedFirstIndex + retainedSelectionSize;
            for (let i = 0; i < removedSelectionSize; i++) {
              trailingIndexSrings.push(String(trailingIndex));
              trailingIndex++;
            }
            removeStorage(trailingIndexSrings).then(() => {
                writeStorage({
                    [SELECTION_COUNT_KEY]:
                      removedFirstIndex + retainedSelectionSize
                  });
              });
          });
      }
      return Promise.resolve();
    }

    /*
     * Removes all news selections from the storage and returns the promise.
     */
    function removeSelectionAll() {
      return readSelectionCount().then((selectionCount) => {
          var indexStrings = new Array();
          for (let i = 0; i < selectionCount; i++) {
            indexStrings.push(String(i));
          }
          return removeStorage(indexStrings);
        }).then(() => {
          writeStorage({
              [SELECTION_COUNT_KEY]: 0
            });
        });
    }

    _Storage.removeSelection = removeSelection;
    _Storage.removeSelections = removeSelections;
    _Storage.removeSelectionAll = removeSelectionAll;


    function _checkSiteId(siteId) {
      if (siteId == undefined) {
        throw newNullPointerException("siteId");
      } else if ((typeof siteId) != "string") {
        throw newIllegalArgumentException("siteId");
      } else if (siteId == "") {
        throw newEmptyStringException("siteId");
      }
    }

    // Key to read and write the favicon string by suffixing the favicon ID
    const FAVICON_KEY = "Favicon";

    /*
     * Reads the favicon on the news site of the specified ID from the storage
     * and returns the promise fulfilled with its value or rejected.
     */
    function readSiteFavicon(siteId) {
      _checkSiteId(siteId);
      var faviconKey = siteId + FAVICON_KEY;
      return readStorage(faviconKey).then((items) => {
          var favicon = "";
          if (items[faviconKey] != undefined) {
            favicon = items[faviconKey];
          }
          return Promise.resolve(favicon);
        });
    }

    /*
     * Writes the specified favicon on the news site of the specified ID into
     * the storage and returns the promise.
     */
    function writeSiteFavicon(siteId, favicon) {
      _checkSiteId(siteId);
      if (favicon == undefined) {
        throw newNullPointerException("favicon");
      } else if ((typeof favicon) != "string") {
        throw newIllegalArgumentException("favicon");
      } else if (favicon == "") {
        throw newEmptyStringException("favicon");
      }
      var faviconKey = siteId + FAVICON_KEY;
      return writeStorage({
          [faviconKey]: favicon
        });
    }

    _Storage.readSiteFavicon = readSiteFavicon;
    _Storage.writeSiteFavicon = writeSiteFavicon;


    // Key to read and write the last modified time or array of site data
    const SITE_DATA_LAST_MODIFIED_TIME_KEY = "SiteDataLastModifiedTime";
    const SITE_DATA_KEY = "SiteData";

    /*
     * Reads the last modified time of site data from the storage and returns
     * the promise fulfilled with its value or rejected.
     */
    function readSiteDataLastModifiedTime() {
      return readStorage(SITE_DATA_LAST_MODIFIED_TIME_KEY).then((items) => {
          var siteDataModifiedTime = items[SITE_DATA_LAST_MODIFIED_TIME_KEY];
          if (siteDataModifiedTime == undefined) {
            siteDataModifiedTime = -1;
          }
          return Promise.resolve(siteDataModifiedTime);
        });
    }

    /*
     * Writes the specified last modified time of site data into the storage
     * and returns the promise.
     */
    function writeSiteDataLastModifiedTime(siteDataModifiedTime) {
      if (! Number.isInteger(siteDataModifiedTime)) {
        throw newIllegalArgumentException("siteDataModifiedTime");
      }
      return writeStorage({
          [SITE_DATA_LAST_MODIFIED_TIME_KEY]: siteDataModifiedTime
        });
    }

    /*
     * Reads the site data from the storage and returns the promise fulfilled
     * with the array of it or rejected.
     */
    function readSiteData() {
      return readStorage(SITE_DATA_KEY).then((items) => {
          var siteDataArray = items[SITE_DATA_KEY];
          if (siteDataArray == undefined) {
            siteDataArray = new Array();
          }
          return Promise.resolve(siteDataArray);
        });
    }

    /*
     * Writes the specified array of site data into the storage and returns
     * the promise.
     */
    function writeSiteData(siteDataArray) {
      if (siteDataArray == undefined) {
        throw newNullPointerException("siteDataArray");
      } else if (! Array.isArray(siteDataArray)) {
        throw newIllegalArgumentException("siteDataArray");
      }
      return writeStorage({
          [SITE_DATA_KEY]: siteDataArray
        });
    }

    _Storage.readSiteDataLastModifiedTime = readSiteDataLastModifiedTime;
    _Storage.writeSiteDataLastModifiedTime = writeSiteDataLastModifiedTime;
    _Storage.readSiteData = readSiteData;
    _Storage.writeSiteData = writeSiteData;


    // Key to read and write the comment flag by suffixing the site ID
    const COMMENT_KEY = "Comment";

    /*
     * Reads the comment mode for the news site of the specified ID
     * from the storage and returns the promise fulfilled with its value
     * or rejected.
     */
    function readCommentMode(siteId) {
      _checkSiteId(siteId);
      var commentKey = siteId + COMMENT_KEY;
      return readStorage(commentKey).then((items) => {
          var commentOn = true;
          if (items[commentKey] != undefined) {
            commentOn = items[commentKey];
          }
          return Promise.resolve(commentOn);
        });
    }

    /*
     * Writes the specified comment mode for the news site of the specified ID
     * into the storage and returns the promise.
     */
    function writeCommentMode(siteId, commentOn) {
      _checkSiteId(siteId);
      if ((typeof commentOn) != "boolean") {
        throw newIllegalArgumentException("commentOn");
      }
      var commentKey = siteId + COMMENT_KEY;
      return writeStorage({
          [commentKey]: commentOn
        });
    }

    _Storage.readCommentMode = readCommentMode;
    _Storage.writeCommentMode = writeCommentMode;

    return _Storage;
  })();
