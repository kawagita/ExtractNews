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

    // Key to read and write the array of domain data
    const DOMAIN_DATA_KEY = "DomainData";

    /*
     * Reads the data object for each domain from the storage and returns
     * the promise fulfilled with the array of domain data registered to
     * the current context or rejected.
     */
    function readDomainData(domainDebugOn = Debug.isLoggingOn()) {
      return readStorage(DOMAIN_DATA_KEY).then((items) => {
          var domainDataObjects = items[DOMAIN_DATA_KEY];
          if (domainDataObjects != undefined) {
            var debugOn = Debug.isLoggingOn();
            ExtractNews.setDebugMode(domainDebugOn);
            Debug.printMessage("Read the domain data ...");
            domainDataObjects.forEach(ExtractNews.setDomain);
            ExtractNews.setDebugMode(debugOn);
          }
          var domainDataArray = new Array();
          ExtractNews.forEachDomain((domainData) => {
              domainDataArray.push(domainData);
            });
          return Promise.resolve(domainDataArray);
        });
    }

    /*
     * Writes the data object for each domain registered in the current context
     * into the storage and returns the promise.
     */
    function writeDomainData() {
      var domainDataObjects = new Array();
      ExtractNews.forEachDomain((domainData) => {
          domainDataObjects.push(domainData.toObject());
        });
      return writeStorage({
          [DOMAIN_DATA_KEY]: domainDataObjects
        });
    }

    _Storage.readDomainData = readDomainData;
    _Storage.writeDomainData = writeDomainData;


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
     * Reads the data object for each site from the storage and returns
     * the promise fulfilled with the array of site data registered to
     * the current context or rejected.
     */
    function readSiteData(siteDebugOn = Debug.isLoggingOn()) {
      return readStorage(SITE_DATA_KEY).then((items) => {
          var siteDataArray = new Array();
          var siteDataObjects = items[SITE_DATA_KEY];
          if (siteDataObjects != undefined) {
            var debugOn = Debug.isLoggingOn();
            ExtractNews.setDebugMode(siteDebugOn);
            Debug.printMessage("Read the site data ...");
            siteDataObjects.forEach((siteDataObject) => {
                siteDataArray.push(ExtractNews.addSite(siteDataObject));
              });
            ExtractNews.setDebugMode(debugOn);
          }
          return Promise.resolve(siteDataArray);
        });
    }

    /*
     * Writes the data object for each site registered in the current context
     * into the storage and returns the promise.
     */
    function writeSiteData() {
      var siteDataObjects = new Array();
      ExtractNews.forEachSite((siteData) => {
          siteDataObjects.push(siteData.toObject());
        });
      return writeStorage({
          [SITE_DATA_KEY]: siteDataObjects
        });
    }

    _Storage.readSiteDataLastModifiedTime = readSiteDataLastModifiedTime;
    _Storage.writeSiteDataLastModifiedTime = writeSiteDataLastModifiedTime;
    _Storage.readSiteData = readSiteData;
    _Storage.writeSiteData = writeSiteData;

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


    // Key to read and write filtering IDs or data, and disabled flag
    const FILTERING_KEY = "Filtering";

    const NO_FILTERING_IDS = new Array();

    /*
     * Reads filtering IDs from the storage and returns the promise
     * fulfilled with the array of its or rejected.
     */
    function readFilteringIds() {
      return readStorage(FILTERING_KEY).then((items) => {
          var filteringIds = NO_FILTERING_IDS;
          if (items[FILTERING_KEY] != undefined) {
            filteringIds = items[FILTERING_KEY].split(WORD_SEPARATOR);
          }
          return Promise.resolve(filteringIds);
        });
    }

    /*
     * Writes the specified filtering IDs into the storage and returns
     * the promise.
     */
    function writeFilteringIds(filteringIds) {
      if (! Array.isArray(filteringIds)) {
        throw newIllegalArgumentException("filteringIds");
      } else if (filteringIds.length > 0) {
        return writeStorage({
            [FILTERING_KEY]: filteringIds.join(WORD_SEPARATOR)
          });
      }
      return Promise.resolve();
    }

    _Storage.readFilteringIds = readFilteringIds;
    _Storage.writeFilteringIds = writeFilteringIds;

    /*
     * Reads filterings for IDs in the specified array from the storage and
     * returns the promise fulfilled with the map of its or rejected.
     */
    function readFilterings(filteringIds) {
      if (! Array.isArray(filteringIds)) {
        throw newIllegalArgumentException("filteringIds");
      }
      const readingPromises = new Array();
      var filteringMap = new Map();
      filteringIds.forEach((filteringId) => {
          var filteringKey = FILTERING_KEY + filteringId;
          readingPromises.push(readStorage(filteringKey).then((items) => {
              if (items[filteringKey] != undefined) {
                filteringMap.set(
                  filteringId, new ExtractNews.Filtering(items[filteringKey]));
              }
            }));
        });
      if (filteringIds.length <= 0) {
        // Set the filtering data to drop offensive words for all topics
        // initially to the map.
        var wordBeginningMatched =
          browser.i18n.getUILanguage().startsWith(LANGUAGE_CODE_EN);
        var filtering = ExtractNews.newFiltering();
        filtering.setCategoryName(
          getLocalizedString("FilteringAllCategoryName"));
        filtering.setTargets(
          Array.of(
            ExtractNews.newFilteringTarget(
              ExtractNews.TARGET_DROP,
              new Set(splitLocalizedString("FilteringOffensiveWords")),
              wordBeginningMatched, false, false)));
        filtering.setPolicyTarget(ExtractNews.TARGET_ACCEPT);
        filteringMap.set(getLocalizedString("FilteringAllId"), filtering);
      }
      return Promise.all(readingPromises).then(() => {
          return Promise.resolve(filteringMap);
        });
    }

    /*
     * Writes filterings in the specified map into the storage and returns
     * the promise.
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
     * Removes filterings for IDs in the specified array from the storage
     * and returns the promise.
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

    /*
     * Reads the flag to disable the filtering from the storage and returns
     * the promise fulfilled with its value or rejected.
     */
    function readFilteringDisabled() {
      return readStorageDisabled(FILTERING_KEY);
    }

    /*
     * Writes the specified flag to disable the filtering into the storage
     * and returns the promise.
     */
    function writeFilteringDisabled(filteringDisabled) {
      if ((typeof filteringDisabled) != "boolean") {
        throw newIllegalArgumentException("filteringDisabled");
      }
      return writeStorageDisabled(FILTERING_KEY, filteringDisabled);
    }

    _Storage.readFilteringDisabled = readFilteringDisabled;
    _Storage.writeFilteringDisabled = writeFilteringDisabled;


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
              selections.push(
                new ExtractNews.Selection(items[indexStrings[i]]));
            }
            return Promise.resolve(selections);
          });
      }
      return Promise.resolve(new Array());
    }

    /*
     * Reads all news selections from the storage and returns the promise
     * fulfilled with the array of its or rejected.
     */
    function readSelectionAll() {
      return readSelectionCount().then((selectionCount) => {
          var selections = new Array();
          if (selectionCount > 0) {
            var indexStrings = new Array();
            for (let i = 0; i < selectionCount; i++) {
              indexStrings[i] = String(i);
            }
            return readStorage(indexStrings).then((items) => {
                for (let i = 0; i < indexStrings.length; i++) {
                  selections.push(
                    new ExtractNews.Selection(items[indexStrings[i]]));
                }
                return Promise.resolve(selections);
              });
          }
          return Promise.resolve(selections);
        });
    }

    _Storage.readSelection = readSelection;
    _Storage.readSelections = readSelections;
    _Storage.readSelectionAll = readSelectionAll;

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
      } else if (selections.length < indexStrings.length) {
        throw newIndexOutOfBoundsException("selections", indexStrings.length);
      } else if (selections.length > 0) {
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

    /*
     * Replaces news selections in the storage by all in the specified arrray
     * and returns the promise.
     */
    function writeSelectionAll(selections) {
      if (! Array.isArray(selections)) {
        throw newIllegalArgumentException("selections");
      }
      var indexStrings = new Array();
      return readSelectionCount().then((selectionCount) => {
          // Removes all news selections from the storage firstly.
          for (let i = 0; i < selectionCount; i++) {
            indexStrings.push(String(i));
          }
          return removeStorage(indexStrings);
        }).then(() => {
          if (selections.length > 0) {
            var selectionObjects = new Array();
            for (let i = 0; i < selections.length; i++) {
              if (i >= indexStrings.length) {
                // Add the string of an index greater than the removed count.
                indexStrings.push(String(i));
              }
              selectionObjects.push(selections[i].toObject());
            }
            if (selections.length < indexStrings.length) {
              // Truncate the array of index strings if the count of selections
              // is less than removed count.
              indexStrings.splice(selections.length);
            }
            return _writeSelectionObjects(indexStrings, selectionObjects);
          }
          return Promise.resolve();
        }).then(() => {
          writeStorage({
              [SELECTION_COUNT_KEY]: selections.length
            });
        });
    }

    _Storage.writeSelection = writeSelection;
    _Storage.writeSelections = writeSelections;
    _Storage.writeSelectionAll = writeSelectionAll;

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


    // Key to read and write the context menu disabled flag
    const CONTEXT_MENU_KEY = "ContextMenu";

    /*
     * Reads the flag to disable the context menu from the storage and returns
     * the promise fulfilled with its value or rejected.
     */
    function readContextMenuDisabled() {
      return readStorageDisabled(CONTEXT_MENU_KEY);
    }

    /*
     * Writes the specified flag to disable the context menu into the storage
     * and returns the promise.
     */
    function writeContextMenuDisabled(contextMenuDisabled) {
      if ((typeof contextMenuDisabled) != "boolean") {
        throw newIllegalArgumentException("contextMenuDisabled");
      }
      return writeStorageDisabled(CONTEXT_MENU_KEY, contextMenuDisabled);
    }

    _Storage.readContextMenuDisabled = readContextMenuDisabled;
    _Storage.writeContextMenuDisabled = writeContextMenuDisabled;

    return _Storage;
  })();
