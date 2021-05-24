/*
 *  Define functions and constant variables for the news selection option.
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


const SELECTION_FAVICON_MAP = new Map();
const SELECTION_DEFAULT_FAVICON = {
    data: "../icons/night-40.png",
    siteUrl: URL_ABOUT_BLANK
  };

const SELECTION_INDEX_STRINGS = new Array();

for (let i = 0; i < ExtractNews.SELECTION_MAX_COUNT; i++) {
  SELECTION_INDEX_STRINGS.push(String(i));
}

/*
 * Reads the site data specified for news selections from the storage
 * and returns the promise.
 */
function readSelectionSiteData() {
  var selectionSiteDataArray = new Array();
  return _Storage.readSiteData().then((siteDataArray) => {
      const readingPromises = new Array();
      siteDataArray.forEach((siteData) => {
          var newsSite = new ExtractNews.NewsSite(siteData);
          var selectionSiteData = {
              id: newsSite.id,
              url: newsSite.url,
              accessCount: siteData.accessCount
            };
          ExtractNews.setNewsSite(newsSite);
          // Sort the site ID and URL by the access count to the news site.
          for (let i = 0; i < selectionSiteDataArray.length; i++) {
            if (siteData.accessCount > selectionSiteDataArray[i].accessCount) {
              selectionSiteDataArray.splice(i, 0, selectionSiteData);
              return;
            }
          }
          selectionSiteDataArray.push(selectionSiteData);
        });
      selectionSiteDataArray.forEach((siteData) => {
          readingPromises.push(_Storage.readSiteFavicon(siteData.id));
        });
      return Promise.all(readingPromises);
    }).then((favicons) => {
      for (let i = 0; i < selectionSiteDataArray.length; i++) {
        var faviconData = favicons[i];
        if (faviconData == "") {
          return;
        }
        SELECTION_FAVICON_MAP.set(selectionSiteDataArray[i].id, {
            data: faviconData,
            siteUrl: selectionSiteDataArray[i].url
          });
      }
      SELECTION_FAVICON_MAP.set("", SELECTION_DEFAULT_FAVICON);
      return Promise.resolve();
    });
}

/*
 * Sets the opened URL of the specified selection data to the specified URL.
 */
function setSelectionOpenedUrl(selectionData, openedUrl) {
  if (openedUrl != URL_ABOUT_BLANK) {
    var newsSite = ExtractNews.getNewsSite(openedUrl);
    if (newsSite != undefined) {
      selectionData.openedSiteId = newsSite.id;
    }
    selectionData.openedUrl = openedUrl;
  } else {
    selectionData.openedSiteId = "";
    selectionData.openedUrl = URL_ABOUT_BLANK;
  }
}

/*
 * Returns data for the specified news selection on the option page.
 */
function createSelectionData(newsSelection) {
  var selectionData = {
      settingName: "",
      topicRegularExpression: "",
      senderRegularExpression: ""
    };
  if (newsSelection != undefined) {
    selectionData.settingName = newsSelection.settingName;
    selectionData.topicRegularExpression =
      newsSelection.topicRegularExpression;
    selectionData.senderRegularExpression =
      newsSelection.senderRegularExpression;
    setSelectionOpenedUrl(selectionData, newsSelection.openedUrl);
  }
  return selectionData;
}

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
 * The news selection data on the option page.
 */
class SelectionData {
  constructor() {
    this.dataIndexStrings = new Array();
    this.dataArray = new Array();
  }

  _setDataIndexStrings(indexSize) {
    if (this.dataIndexStrings.length <= indexSize) {
      for (let i = this.dataIndexStrings.length; i < indexSize; i++) {
        this.dataIndexStrings.push(SELECTION_INDEX_STRINGS[i]);
      }
    } else {
      this.dataIndexStrings.splice(indexSize);
    }
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
    return _Storage.readSelectionCount().then((newsSelectionCount) => {
        this._setDataIndexStrings(newsSelectionCount);
        return _Storage.readSelections(this.dataIndexStrings);
      }).then((newsSelections) => {
        Debug.printMessage("Read news selections.");
        Debug.printJSON(newsSelections);
        newsSelections.forEach((newsSelection) => {
            this.dataArray.push(createSelectionData(newsSelection));
          });
        return Promise.resolve();
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
        _File.importNewsSelections(
          selectionDataAppendedIndex, (newsSelections) => {
            if (dataReplaced) {
              // Replace a setting name or url's regular expression,
              // and all selections with file's data.
              this.dataArray = new Array();
            }
            Debug.printMessage("Import news selections.");
            Debug.printJSON(newsSelections);
            newsSelections.forEach((newsSelection) => {
                this.dataArray.push(createSelectionData(newsSelection));
              });
            this._setDataIndexStrings(this.dataArray.length);
            resolve();
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
    _File.exportNewsSelections(newsSelections);
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
    return _Storage.removeSelectionAll().then(() => {
        return _Storage.writeSelections(this.dataIndexStrings, newsSelections);
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

// Variables and functions for the node of news selections.

const SELECTION_PAGE_NODE_SIZE = 20;
const SELECTION_PAGE_SIZE =
  Math.ceil(ExtractNews.SELECTION_MAX_COUNT / SELECTION_PAGE_NODE_SIZE);

const SELECTION_FAVICON = "favicon";

function _createSelectionFaviconInput(favicon) {
  var faviconInput = document.createElement("input");
  if (favicon == undefined) {
    favicon = SELECTION_DEFAULT_FAVICON;
  }
  faviconInput.type = "image";
  faviconInput.src = favicon.data;
  faviconInput.alt = favicon.siteUrl;
  return faviconInput;
}

function _createSelectionFaviconList() {
  var faviconList = document.createElement("div");
  faviconList.className = "favicon_list";
  SELECTION_FAVICON_MAP.forEach((favicon) => {
      var faviconDiv = document.createElement("div");
      var faviconSiteUrlSpan = document.createElement("span");
      faviconSiteUrlSpan.textContent = favicon.siteUrl;
      faviconDiv.appendChild(_createSelectionFaviconInput(favicon));
      faviconDiv.appendChild(faviconSiteUrlSpan);
      faviconList.appendChild(faviconDiv);
    });
  return faviconList;
}

/*
 * Creates the element to set a news selection and insert the previous.
 */
function createSelectionNode(selectionData) {
  var selectionNode = document.createElement("div");
  var selectionAppended = selectionData == undefined;
  selectionNode.className = "selection_item";
  selectionNode.appendChild(createInsertionNode(selectionAppended));
  if (! selectionAppended) {
    var selectionDataDiv = document.createElement("div");
    var selectionCheckbox = document.createElement("input");
    var selectionFaviconNode = document.createElement("div");
    var selectionSettingNameLabel = document.createElement("label");
    selectionDataDiv.className = "selection_data";
    selectionCheckbox.type = "checkbox";
    selectionFaviconNode.className = SELECTION_FAVICON;
    selectionSettingNameLabel.textContent = selectionData.settingName;
    selectionFaviconNode.appendChild(
      _createSelectionFaviconInput(
        SELECTION_FAVICON_MAP.get(selectionData.openedSiteId)));
    selectionDataDiv.appendChild(selectionCheckbox);
    selectionDataDiv.appendChild(selectionFaviconNode);
    selectionDataDiv.appendChild(selectionSettingNameLabel);
    selectionNode.appendChild(document.createElement("div"));
    selectionNode.lastElementChild.tabIndex = 0;
    selectionNode.lastElementChild.appendChild(selectionDataDiv);
    selectionNode.lastElementChild.appendChild(createOperationNode());
  }
  return selectionNode;
}

function _setSelectionPageNumberList(pageNumberList, pageNumberListTabIndex) {
  for (let i = 0; i < SELECTION_PAGE_SIZE; i++) {
    var pageNumberListItem = document.createElement("li");
    pageNumberListItem.textContent = String(i + 1);
    pageNumberListItem.tabIndex = pageNumberListTabIndex;
    pageNumberListTabIndex++;
    pageNumberList.appendChild(pageNumberListItem);
  }
}

function _getSelectionFocusedNode(selectionNode) {
  if (selectionNode.children.length > 1) {
    return selectionNode.lastElementChild;
  }
  return null;
}

function _getSelectionCheckbox(selectionNode) {
  return selectionNode.querySelector("input[type='checkbox']");
}

function _getSelectionFaviconNode(selectionNode) {
  return selectionNode.querySelector("." + SELECTION_FAVICON);
}

/*
 * The pane of news selections on this option page.
 */
class SelectionPane extends OptionPane {
  constructor(focusedNodeGroup) {
    super("Selection", focusedNodeGroup);
    this.selection = {
        pageNumberList: this.element.querySelector(".page_number_list"),
        list: this.element.querySelector(".selection_list"),
        deleteCheckbox: this.element.querySelector(".page_header input"),
        deleteButton: getOptionButton("Delete"),
        editPane: _Popup.getSelectionEditPane(".edit_header span"),
        editApplyButton: getOptionButton("Apply"),
        editCloseButton: this.element.querySelector(".edit_header .close"),
        editPointedGroup: new _Event.PointedGroup(),
        editDataIndex: -1,
        editDataOperation: "",
        editDataWarning: undefined
      };
    _setSelectionPageNumberList(
      this.selection.pageNumberList, this.selection.deleteButton.tabIndex + 1);
    this.selection.deleteCheckbox.addEventListener("input", (event) => {
        for (let i = 0; i < this.nodeSize; i++) {
          var selectionCheckbox = this.getSelectionCheckbox(i);
          if (selectionCheckbox != null) {
            selectionCheckbox.checked = event.target.checked;
          }
        }
        this.selection.deleteButton.disabled = ! event.target.checked;
      });
    this.selection.deleteButton.disabled = true;
    this.selection.editCloseButton.addEventListener(_Event.CLICK, (event) => {
        this.closeEditPane(true);
      });
    this.selection.editCloseButton.addEventListener(_Event.KEYUP, (event) => {
        if (event.code == "Enter") {
          this.closeEditPane(true);
        }
      });
    this.selection.editPointedGroup.addElements(
      Array.of(
        this.selection.editPane.nameInput, this.selection.editPane.urlSelect,
        this.selection.editApplyButton, this.selection.editCloseButton));
    this.selection.editPane.regexps.forEach((editRegexp) => {
        this.selection.editPointedGroup.addElement(editRegexp.textarea);
      });
    this.faviconList = undefined;
    this.faviconFocusedIndex = -1;
    this.faviconElements = new Array();
  }

  get pageNumberArray() {
    return Array.from(this.selection.pageNumberList.children);
  }

  containsListElement(element) {
    return this.selection.list.contains(element);
  }

  getSelectionCheckbox(selectionIndex) {
    return _getSelectionCheckbox(this.getNode(selectionIndex));
  }

  setSelectionCheckboxAll() {
    var deleteChecked = false;
    for (let i = 0; i < this.nodeSize; i++) {
      var selectionCheckbox = this.getSelectionCheckbox(i);
      if (selectionCheckbox != null && selectionCheckbox.checked) {
        deleteChecked = true;
        break;
      }
    }
    this.selection.deleteCheckbox.checked = deleteChecked;
    this.selection.deleteButton.disabled = ! deleteChecked;
  }

  addDeleteButtonClickEventListener(callback) {
    this.selection.deleteButton.addEventListener(_Event.CLICK, callback);
  }

  getFocusedNode(selectionIndex) {
    return _getSelectionFocusedNode(this.getNode(selectionIndex));
  }

  insertSelectionNode(
    selectionIndex, selectionNode, fireSelectionNodeInsertEvent,
    fireSelectionNodeMoveEvent, fireSelectionNodeRemoveEvent,
    fireSelectionEditPaneOpenEvent) {
    var selectionFocusedNode = _getSelectionFocusedNode(selectionNode);
    if (selectionFocusedNode != null) {
      // Set the event listener into elements focused on the selection node.
      var selectionFocusedNodeGroup = this.getFocusedNodeGroup();
      var selectionCheckbox = _getSelectionCheckbox(selectionFocusedNode);
      var selectionFaviconInput =
        _getSelectionFaviconNode(selectionFocusedNode).querySelector("input");
      selectionCheckbox.addEventListener("input", (event) => {
          if (event.target.checked) {
            this.selection.deleteCheckbox.checked = true;
            this.selection.deleteButton.disabled = false;
          } else {
            this.setSelectionCheckboxAll();
          }
        });
      selectionFaviconInput.addEventListener(_Event.CLICK, (event) => {
          if (this.faviconList != undefined) {
            this.faviconList.parentNode.removeChild(this.faviconList);
            event.target.parentNode.appendChild(this.faviconList);
            this.faviconList.style.visibility = "visible";
            this.faviconFocusedIndex = 0;
            this.faviconElements[0].focus();
          }
        });
      selectionFocusedNode.addEventListener(_Event.KEYDOWN, (event) => {
          if (event.code == "Enter") {
            fireSelectionEditPaneOpenEvent(event, OPERATION_EDIT);
          }
        });
      selectionFocusedNode.addEventListener(_Event.DBLCLICK, (event) => {
          fireSelectionEditPaneOpenEvent(event, OPERATION_EDIT);
        })
      selectionFocusedNodeGroup.addFocusedElement(selectionFocusedNode);
      selectionFocusedNodeGroup.addElements(
        Array.of(selectionCheckbox, selectionFaviconInput));
      // Append the favicon list to the node of the first selection data.
      if (this.faviconList != undefined
        && this.faviconList.parentNode == null) {
        var selectionFaviconNode = _getSelectionFaviconNode(selectionNode);
        if (selectionFaviconNode != null) {
          selectionFaviconNode.appendChild(this.faviconList);
          selectionFocusedNodeGroup.addElements(this.faviconElements);
        }
      }
    }
    super.insertNode(
      selectionIndex, selectionNode, fireSelectionNodeInsertEvent,
      fireSelectionNodeMoveEvent, fireSelectionNodeRemoveEvent);
    // Append the specified node to the current page at the specified index.
    var nextSelectionNode = null;
    if (selectionIndex < this.nodeSize - 1) {
      nextSelectionNode = this.getNode(selectionIndex + 1);
    }
    this.selection.list.insertBefore(selectionNode, nextSelectionNode);
  }

  updateSelectionNode(selectionIndex, selectionData) {
    var selectionNode = this.getNode(selectionIndex);
    var selectionFaviconNode = _getSelectionFaviconNode(selectionNode);
    if (selectionFaviconNode != null) {
      var selectionSetingNameLabel =
        selectionFaviconNode.parentNode.querySelector("label");
      var selectionFaviconInput =
        selectionFaviconNode.querySelector("input");
      var selectionFavicon =
        SELECTION_FAVICON_MAP.get(selectionData.openedSiteId);
      if (selectionFavicon == undefined) {
        selectionFavicon = SELECTION_DEFAULT_FAVICON;
      }
      selectionFaviconInput.src = selectionFavicon.data;
      selectionFaviconInput.title = selectionData.openedUrl;
      selectionSetingNameLabel.textContent = selectionData.settingName;
    }
  }

  removeSelectionNode(selectionIndex) {
    var selectionNode = this.removeNode(selectionIndex);
    selectionNode.parentNode.removeChild(selectionNode);
    // Remove the favicon list from the node of the specified index
    // and append to the first node.
    var selectionFaviconNode = _getSelectionFaviconNode(selectionNode);
    if (selectionFaviconNode != null
      && selectionFaviconNode == this.faviconList.parentNode) {
      selectionFaviconNode.removeChild(this.faviconList);
      if (this.nodeSize > 1) { // Not only the node to append new data
        selectionFaviconNode = _getSelectionFaviconNode(this.getNode(0));
        selectionFaviconNode.appendChild(this.faviconList);
      }
    }
    return selectionNode;
  }

  swapSelectionNode(movedUpIndex, movedDownIndex) {
    var movedUpNode = this.getNode(movedUpIndex);
    var movedDownNode = this.getNode(movedDownIndex);
    this.swapNode(movedUpIndex, movedDownIndex);
    this.selection.list.removeChild(movedUpNode);
    this.selection.list.insertBefore(movedUpNode, movedDownNode);
  }

  isEditPaneDisplaying() {
    return this.element.classList.contains(OPERATION_EDIT);
  }

  get editDataIndex() {
    return this.selection.editDataIndex;
  }

  get editDataOperation() {
    return this.selection.editDataOperation;
  }

  openEditPane(selectionDataIndex, selectionData) {
    var openedUrl = undefined;
    this.selection.editDataIndex = selectionDataIndex;
    if (selectionData != undefined) {
      this.selection.editDataOperation = OPERATION_EDIT;
      var regexpStrings =
        Array.of(
          selectionData.topicRegularExpression,
          selectionData.senderRegularExpression);
      this.selection.editPane.nameInput.value = selectionData.settingName;
      for (let i = 0; i < this.selection.editPane.regexps.length; i++) {
        this.selection.editPane.regexps[i].textarea.value = regexpStrings[i];
      }
      openedUrl = selectionData.openedUrl;
    } else {
      this.selection.editDataOperation = OPERATION_INSERT;
    }
    _Popup.setSelectionEditTitle(this.selection.editPane, selectionDataIndex);
    _Popup.setSelectionEditUrlSelect(this.selection.editPane, openedUrl);
    this.element.classList.toggle(OPERATION_EDIT);
    this.selection.editPane.nameInput.focus();
  }

  closeEditPane(canceled = false) {
    if (this.isEditPaneDisplaying()) {
      var selectionIndex = this.editDataIndex % SELECTION_PAGE_NODE_SIZE;
      this.selection.editDataIndex = -1;
      this.selection.editDataOperation = "";
      this.selection.editDataWarning = undefined;
      this.selection.editPane.nameInput.value = "";
      for (let i = 0; i < this.selection.editPane.regexps.length; i++) {
        this.selection.editPane.regexps[i].textarea.value = "";
      }
      _Popup.clearSelectionEditTitle(this.selection.editPane);
      _Popup.clearSelectionEditUrlSelect(this.selection.editPane);
      this.element.classList.toggle(OPERATION_EDIT);
      if (! this.focusNode(selectionIndex) && canceled) {
        this.focusNode(selectionIndex, OPERATION_APPEND);
      }
    }
  }

  localizeEditRegularExpression(regexpIndex) {
    if (regexpIndex < 0
      || regexpIndex >= this.selection.editPane.regexps.length) {
      throw newIndexOutOfBoundsException("regular expressions", regexpIndex);
    }
    var editRegexp = this.selection.editPane.regexps[regexpIndex];
    var regexpResult =
      _Regexp.checkRegularExpression(
        _Text.trimText(
          _Text.replaceTextLineBreaksToSpace(
            _Text.removeTextZeroWidthSpaces(editRegexp.textarea.value))),
        { localized: true });
    if (regexpResult.errorCode < 0) {
      var regexpString = regexpResult.localizedText.textString;
      if (regexpString.length <= _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
        // Set localized string into text area and checked flag to true.
        editRegexp.textarea.value = regexpString;
        editRegexp.errorChecked = true;
        return true;
      }
      this.selection.editDataWarning =
        editRegexp.warningMaxUtf16CharactersExceeded;
    } else {
      this.selection.editDataWarning =
        _Regexp.getErrorWarning(editRegexp.name, regexpResult);
    }
    editRegexp.textarea.focus();
    return false;
  }

  getEditNewsSelection() {
    var editPane = this.selection.editPane;
    var editNewsSelection = ExtractNews.newSelection();
    var regexpStrings = new Array();
    var settingName =
      _Text.trimText(
        _Text.removeTextZeroWidthSpaces(editPane.nameInput.value));
    editPane.nameInput.value = settingName;
    if (_Text.getTextWidth(settingName) > _Alert.SETTING_NAME_MAX_WIDTH) {
      this.selection.editDataWarning =
        _Alert.getWarning(_Alert.SETTING_NAME_MAX_WITDH_EXCEEDED);
      editPane.nameInput.focus();
      return undefined;
    }
    editNewsSelection.settingName = settingName;
    // Check whether a regular expression of text area is valid.
    for (let i = 0; i < editPane.regexps.length; i++) {
      var editRegexp = editPane.regexps[i];
      if (editRegexp.errorChecked) {
        regexpStrings.push(editRegexp.textarea.value);
        continue;
      }
      var regexpString =
        _Text.trimText(
          _Text.replaceTextLineBreaksToSpace(
            _Text.removeTextZeroWidthSpaces(editRegexp.textarea.value)));
      var regexpResult = _Regexp.checkRegularExpression(regexpString);
      if (regexpResult.errorCode >= 0) {
        this.selection.editDataWarning =
          _Regexp.getErrorWarning(editRegexp.name, regexpResult);
        editRegexp.textarea.focus();
        return undefined;
      }
      // Set checked string into text area and checked flag to true.
      regexpStrings.push(regexpString);
      editRegexp.textarea.value = regexpString;
      editRegexp.errorChecked = true;
    }
    editNewsSelection.topicRegularExpression = regexpStrings[0];
    editNewsSelection.senderRegularExpression = regexpStrings[1];
    editNewsSelection.openedUrl = editPane.urlSelect.value;
    return editNewsSelection;
  }

  getEditDataWarning() {
    return this.selection.editDataWarning;
  }

  addEditLocalizeButtonClickEventListener(callback) {
    this.selection.editPane.localizedButtons.forEach((localizedButton) => {
        localizedButton.addEventListener(_Event.CLICK, callback);
      });
  }

  addEditApplyButtonClickEventListener(callback) {
    this.selection.editApplyButton.addEventListener(_Event.CLICK, callback);
  }

  createFaviconList() {
    // Create the list of favicons which have been read from the storage yet
    // but no news selection node contain it until appending new data.
    this.faviconList = _createSelectionFaviconList();
    this.faviconList.querySelectorAll("input").forEach((element) => {
        element.addEventListener(_Event.KEYDOWN, (event) => {
            switch (event.code) {
            case "Enter":
              return;
            case "PageUp":
            case "PageDown":
              var focusedIndex = 0;
              if (event.code == "PageDown") {
                focusedIndex = this.faviconElements.length - 1;
              }
              this.faviconElements[focusedIndex].focus();
              this.faviconFocusedIndex = focusedIndex;
              break;
            case "ArrowUp":
            case "ArrowDown":
              var focusedIndex = this.faviconFocusedIndex;
              if (event.code == "ArrowUp") {
                focusedIndex--;
              } else {
                focusedIndex++;
              }
              if (focusedIndex >= 0
                && focusedIndex < this.faviconElements.length) {
                this.faviconElements[focusedIndex].focus();
                this.faviconFocusedIndex = focusedIndex;
              }
              break;
            }
            // Prevent moving from the favicon list by the tab or other keys.
            event.preventDefault();
          });
        this.faviconElements.push(element);
      });
  }

  isFaviconListDisplaying() {
    return this.faviconList != undefined
      && this.faviconList.style.visibility == "visible";
  }

  containsFaviconElement(element) {
    return this.faviconList != undefined && this.faviconList.parentNode != null
      && this.faviconList.parentNode.contains(element);
  }

  focusFaviconElement(element) {
    if (this.isFaviconListDisplaying()) {
      this.faviconFocusedIndex = this.faviconElements.indexOf(element);
      if (this.faviconFocusedIndex >= 0) {
        this.faviconElements[this.faviconFocusedIndex].focus();
        return true;
      }
    }
    return false;
  }

  hideFaviconList(focusedOut = false) {
    if (this.isFaviconListDisplaying()) {
      this.faviconFocusedIndex = -1;
      this.faviconList.style.visibility = "hidden";
      if (! focusedOut) {
        _Event.getBubblingFocusedTarget(this.faviconList).focus();
      }
      return true;
    }
    return false;
  }

  addFaviconListClickEventListener(callback) {
    if (this.faviconList != undefined) {
      this.faviconElements.forEach((element) => {
          element.addEventListener(_Event.CLICK, (event) => {
              event.target.disabled = true;
              callback(event);
              this.faviconFocusedIndex = -1;
              this.faviconList.style.visibility = "hidden";
              _Event.getBubblingFocusedTarget(this.faviconList).focus();
              event.target.disabled = false;
            });
        });
    }
  }

  clear() {
    super.clear();
    if (this.faviconList != undefined && this.faviconList.parentNode != null) {
      this.faviconList.parentNode.removeChild(this.faviconList);
    }
    var removedItems = Array.from(this.selection.list.children);
    for (let i = removedItems.length - 1; i >= 0; i--) {
      this.selection.list.removeChild(removedItems[i]);
    }
    this.selection.deleteCheckbox.checked = false;
    this.selection.deleteButton.disabled = true;
  }

  setEventRelation(eventGroup) {
    super.setEventRelation(eventGroup);
    eventGroup.addElements(this.pageNumberArray);
    eventGroup.addElements(
      Array.of(this.selection.deleteCheckbox, this.selection.deleteButton));
    eventGroup.setEventRelation(this.selection.editPointedGroup);
  }
}
