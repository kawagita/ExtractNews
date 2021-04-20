/*
 *  Define functions and constant variables for selections on the option page.
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

const OPTION_SELECTION_NODE_SIZE = 20;
const OPTION_SELECTION_PAGE_SIZE =
  Math.ceil(ExtractNews.SELECTION_MAX_COUNT / OPTION_SELECTION_NODE_SIZE);
const OPTION_SELECTION_FAVICON_MAP = new Map();
const OPTION_SELECTION_DEFAULT_FAVICON = "../icons/night-40.png";

/*
 * Returns data for the specified news selection on the option page.
 */
function createSelectionData(newsSelection) {
  var selectionData = {
      settingName: "",
      topicRegularExpression: "",
      senderRegularExpression: "",
      openedUrl: URL_ABOUT_BLANK,
      faviconId: ""
    };
  if (newsSelection != undefined) {
    selectionData.settingName = newsSelection.settingName;
    selectionData.topicRegularExpression =
      newsSelection.topicRegularExpression;
    selectionData.senderRegularExpression =
      newsSelection.senderRegularExpression;
    if (newsSelection.openedUrl != URL_ABOUT_BLANK) {
      var newsSite = ExtractNews.getNewsSite(newsSelection.openedUrl);
      if (newsSite != undefined) {
        var faviconId =
          ExtractNews.getNewsSiteFaviconId(
            newsSite.id, newsSelection.openedUrl);
        if (faviconId != undefined) {
          selectionData.faviconId = faviconId;
        }
      }
      selectionData.openedUrl = newsSelection.openedUrl;
    }
  }
  return selectionData;
}

/*
 * Returns the news selection for the specified selection data on the option
 * page.
 */
function _newSelection(selectionData) {
  var newsSelection = ExtractNews.newSelection();
  newsSelection.settingName = selectionData.settingName;
  newsSelection.topicRegularExpression =
    selectionData.topicRegularExpression;
  newsSelection.senderRegularExpression =
    selectionData.senderRegularExpression;
  newsSelection.openedUrl = selectionData.openedUrl;
  return newsSelection;
}

/*
 * The selection object on the option page.
 */
class OptionSelection {
  constructor() {
    this.dataIndexStrings = new Array();
    this.dataArray = new Array();
  }

  _setDataIndexStrings(indexSize) {
    if (this.dataIndexStrings.length <= indexSize) {
      for (let i = this.dataIndexStrings.length; i < indexSize; i++) {
        this.dataIndexStrings.push(ExtractNews.SELECTION_INDEX_STRINGS[i]);
      }
    } else {
      this.dataIndexStrings.splice(indexSize);
    }
  }

  _setDataFavicons(dataAppendedIndex = 0) {
    const readingPromises = new Array();
    var faviconIds = new Array();
    for (let i = dataAppendedIndex; i < this.dataArray.length; i++) {
      var faviconId = this.dataArray[i].faviconId;
      if (faviconId != "" && faviconIds.indexOf(faviconId) < 0
        && ! OPTION_SELECTION_FAVICON_MAP.has(faviconId)) {
        readingPromises.push(ExtractNews.Storage.readFavicon(faviconId));
        faviconIds.push(faviconId);
      }
    }
    return Promise.all(readingPromises).then((favicons) => {
        for (let i = 0; i < faviconIds.length; i++) {
          if (favicons[i] != "") {
            OPTION_SELECTION_FAVICON_MAP.set(faviconIds[i], favicons[i]);
          }
        }
        return Promise.resolve();
      });
  }

  get dataSize() {
    return this.dataArray.length;
  }

  getData(dataIndex) {
    if (dataIndex < 0 || dataIndex >= this.dataArray.length) {
      throw newIndexOutOfBoundsException("selection data", dataIndex);
    }
    return this.dataArray[dataIndex];
  }

  setData(dataIndex, selectionData) {
    if (dataIndex < 0 || dataIndex >= this.dataArray.length) {
      throw newIndexOutOfBoundsException("selection data", dataIndex);
    } else if (selectionData == undefined) {
      throw newNullPointerException("selectionData");
    }
    this.dataArray[dataIndex] = selectionData;
  }

  insertData(dataIndex, selectionData) {
    if (dataIndex < 0 || dataIndex > this.dataArray.length) {
      throw newIndexOutOfBoundsException("selection data", dataIndex);
    } else if (selectionData == undefined) {
      throw newNullPointerException("selectionData");
    }
    this.dataArray.splice(dataIndex, 0, selectionData);
    this._setDataIndexStrings(this.dataArray.length);
  }

  removeData(dataIndex) {
    if (dataIndex < 0 || dataIndex >= this.dataArray.length) {
      throw newIndexOutOfBoundsException("selection data", dataIndex);
    }
    this._setDataIndexStrings(this.dataArray.length - 1);
    return this.dataArray.splice(dataIndex, 1)[0];
  }

  /*
   * Reads selection data from the local storage and return the promise.
   */
  read() {
    return ExtractNews.Storage.readNewsSelectionCount().then(
      (newsSelectionCount) => {
        this._setDataIndexStrings(newsSelectionCount);
        return ExtractNews.Storage.readNewsSelections(this.dataIndexStrings);
      }).then((newsSelections) => {
        const faviconPromises = new Array();
        Debug.printMessage("Read news selections.");
        Debug.printJSON(newsSelections);
        newsSelections.forEach((newsSelection) => {
            this.dataArray.push(createSelectionData(newsSelection));
          });
        return this._setDataFavicons();
      });
  }

  /*
   * Imports selection data from a file and return the promise fulfilled with
   * the index of news selections appended to the option page.
   */
  import(dataReplaced = false) {
    var selectionDataAppendedIndex = 0;
    if (! dataReplaced) {
      selectionDataAppendedIndex = this.dataArray.length;
    }
    const importPromise = new Promise((resolve, reject) => {
        ExtractNews.File.importNewsSelections(
          selectionDataAppendedIndex, (newsSelections) => {
            if (dataReplaced) {
              // Replace a setting name or url's regular expression,
              // and all selections with file's data.
              this.dataArray = new Array();
            }
            const faviconPromises = new Array();
            Debug.printMessage("Import news selections.");
            Debug.printJSON(newsSelections);
            newsSelections.forEach((newsSelection) => {
                this.dataArray.push(createSelectionData(newsSelection));
              });
            this._setDataIndexStrings(this.dataArray.length);
            this._setDataFavicons().then(resolve, reject);
          });
      });
    return importPromise.then(() => {
        return Promise.resolve(selectionDataAppendedIndex);
      });
  }

  /*
   * Exports selection data to a file.
   */
  export() {
    var newsSelections = new Array();
    this.dataArray.forEach((selectionData) => {
        newsSelections.push(_newSelection(selectionData));
      });
    ExtractNews.File.exportNewsSelections(newsSelections);
    if (this.dataArray.length > 0) {
      Debug.printMessage(
        "Export " + this.dataArray.length + " news selection"
        + (this.dataArray.length > 1 ? "s.": "."));
    } else {
      Debug.printMessage("Export no news selection.");
    }
  }

  /*
   * Saves selection data to the local storage and return the promise.
   */
  save() {
    var newsSelections = new Array();
    this.dataArray.forEach((selectionData) => {
        newsSelections.push(_newSelection(selectionData));
      });
    return ExtractNews.Storage.removeNewsSelectionAll().then(() => {
        return ExtractNews.Storage.writeNewsSelections(
          this.dataIndexStrings, newsSelections);
      }).then(() => {
        if (this.dataArray.length > 0) {
          Debug.printMessage(
            "Save " + this.dataArray.length + " news selection"
            + (this.dataArray.length > 1 ? "s.": "."));
        } else {
          Debug.printMessage("Save no news selection.");
        }
        return Promise.resolve();
      });
  }
}
