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
const SELECTION_FAVICON = "favicon";

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
          // Sort the site ID and URL by the access count to the news site.
          for (let i = 0; i < selectionSiteDataArray.length; i++) {
            if (siteData.accessCount > selectionSiteDataArray[i].accessCount) {
              selectionSiteDataArray.splice(i, 0, siteData);
              return;
            }
          }
          selectionSiteDataArray.push(siteData);
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
    });
}

/*
 * Sets the opened URL of the specified selection data to the specified URL.
 */
function setSelectionOpenedUrl(selectionData, openedUrl) {
  if (openedUrl != URL_ABOUT_BLANK) {
    var siteData = ExtractNews.getSite(openedUrl);
    if (siteData != undefined) {
      selectionData.openedSiteId = siteData.id;
    } else {
      selectionData.openedSiteId = "";
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
  newsSelection.topicRegularExpression = selectionData.topicRegularExpression;
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
    if (indexSize >= this.dataIndexStrings.length) {
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
   * Replaces selection data by the specified array.
   */
  replace(newsSelections) {
    this.dataArray = new Array();
    this._setDataIndexStrings(newsSelections.length);
    newsSelections.forEach((newsSelection) => {
        this.dataArray.push(createSelectionData(newsSelection));
      });
    Debug.printMessage("Replace the selection data ...");
    Debug.printJSON(newsSelections);
  }

  /*
   * Reads selection data from the storage and return the promise.
   */
  read() {
    return _Storage.readSelectionCount().then((newsSelectionCount) => {
        this._setDataIndexStrings(newsSelectionCount);
        return _Storage.readSelections(this.dataIndexStrings);
      }).then((newsSelections) => {
        this.replace(newsSelections);
      });
  }

  /*
   * Writes selection data into the storage and return the promise.
   */
  write() {
    return _Storage.removeSelectionAll().then(() => {
        return _Storage.writeSelections(this.dataIndexStrings, this.toArray());
      }).then(() => {
        if (this.dataArray.length > 0) {
          Debug.printMessage(
            "Write the news selection of " + this.dataIndexStrings[0]
            + (this.dataArray.length > 1 ?
              " ... " + this.dataIndexStrings[this.dataArray.length - 1] : "")
            + ".");
        }
      });
  }

  /*
   * Returns the array of news selections for this data.
   */
  toArray() {
    var newsSelections = new Array();
    this.dataArray.forEach((selectionData) => {
        newsSelections.push(_newSelection(selectionData));
      });
    return newsSelections;
  }
}

// Variables and functions for the node of news selections.

const SELECTION_PAGE_NODE_SIZE = 20;
const SELECTION_PAGE_SIZE =
  Math.ceil(ExtractNews.SELECTION_MAX_COUNT / SELECTION_PAGE_NODE_SIZE);

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

function _createSelectionNode(selectionData) {
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
 * The pane to edit a news selection on this option page.
 */
class SelectionEditPane {
  constructor(selectionPane, editPointedGroup) {
    this.selectionPane = selectionPane;
    this.editPane = _Popup.getSelectionEditPane(".edit_header span");
    this.editOkButton = getOptionButton("OK");
    this.editCloseButton = document.querySelector(".edit_header .close");
    this.editCloseButton.addEventListener(_Event.CLICK, (event) => {
        this.close(true);
      });
    this.editCloseButton.addEventListener(_Event.KEYUP, (event) => {
        if (event.code == "Enter") {
          this.close(true);
        }
      });
    this.editDataIndex = -1;
    this.editDataOperation = "";
    this.editDataWarning = undefined;
    editPointedGroup.addElements(
      Array.of(
        this.editPane.nameInput, this.editPane.urlSelect,
        this.editOkButton, this.editCloseButton));
    this.editPane.regexps.forEach((editRegexp) => {
        editPointedGroup.addElement(editRegexp.textarea);
      });
  }

  get dataIndex() {
    return this.editDataIndex;
  }

  get dataOperation() {
    return this.editDataOperation;
  }

  isDisplaying() {
    return document.body.classList.contains(OPERATION_EDIT);
  }

  open(selectionDataIndex, selectionData) {
    var openedUrl = undefined;
    this.editDataIndex = selectionDataIndex;
    if (selectionData != undefined) {
      this.editDataOperation = OPERATION_EDIT;
      var regexpStrings =
        Array.of(
          selectionData.topicRegularExpression,
          selectionData.senderRegularExpression);
      this.editPane.nameInput.value = selectionData.settingName;
      for (let i = 0; i < this.editPane.regexps.length; i++) {
        this.editPane.regexps[i].textarea.value = regexpStrings[i];
      }
      openedUrl = selectionData.openedUrl;
    } else {
      this.editDataOperation = OPERATION_INSERT;
    }
    _Popup.setSelectionEditTitle(this.editPane, selectionDataIndex);
    _Popup.setSelectionEditUrlSelect(this.editPane, openedUrl);
    document.body.classList.toggle(OPERATION_EDIT);
    this.editPane.nameInput.focus();
  }

  close(canceled = false) {
    if (this.isDisplaying()) {
      var selectionIndex = this.editDataIndex % SELECTION_PAGE_NODE_SIZE;
      this.editDataIndex = -1;
      this.editDataOperation = "";
      this.editDataWarning = undefined;
      this.editPane.nameInput.value = "";
      for (let i = 0; i < this.editPane.regexps.length; i++) {
        this.editPane.regexps[i].textarea.value = "";
      }
      _Popup.clearSelectionEditTitle(this.editPane);
      _Popup.clearSelectionEditUrlSelect(this.editPane);
      document.body.classList.toggle(OPERATION_EDIT);
      if (! this.selectionPane.focusNode(selectionIndex) && canceled) {
        this.selectionPane.focusNode(selectionIndex, OPERATION_APPEND);
      }
    }
  }

  localizeRegularExpression(regexpIndex) {
    if (regexpIndex < 0 || regexpIndex >= this.editPane.regexps.length) {
      throw newIndexOutOfBoundsException("regular expressions", regexpIndex);
    }
    var editRegexp = this.editPane.regexps[regexpIndex];
    var regexpResult =
      _Regexp.checkRegularExpression(
        _Text.trimText(
          _Text.replaceTextLineBreaksToSpace(
            _Text.removeTextZeroWidthSpaces(editRegexp.textarea.value))),
        { localized: true });
    if (regexpResult.errorCode < 0) {
      var regexpString = regexpResult.localizedText.textString;
      if (regexpString.length <= _Alert.REGEXP_MAX_UTF16_CHARACTERS) {
        editRegexp.textarea.value = regexpString;
        editRegexp.errorChecked = true;
        return true;
      }
      this.editDataWarning = editRegexp.warningMaxUtf16CharactersExceeded;
    } else {
      this.editDataWarning =
        _Regexp.getErrorWarning(editRegexp.name, regexpResult);
    }
    editRegexp.textarea.focus();
    return false;
  }

  getNewsSelection() {
    // Return the news selection checked whether the length of a setting name
    // is fit or regular expressions are valid.
    var editNewsSelection = ExtractNews.newSelection();
    var regexpStrings = new Array();
    var settingName =
      _Text.trimText(
        _Text.removeTextZeroWidthSpaces(this.editPane.nameInput.value));
    this.editPane.nameInput.value = settingName;
    if (_Text.getTextWidth(settingName) > _Alert.SETTING_NAME_MAX_WIDTH) {
      this.editDataWarning =
        _Alert.getWarning(_Alert.SETTING_NAME_MAX_WITDH_EXCEEDED);
      this.editPane.nameInput.focus();
      return undefined;
    }
    editNewsSelection.settingName = settingName;
    for (let i = 0; i < this.editPane.regexps.length; i++) {
      var editRegexp = this.editPane.regexps[i];
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
        this.editDataWarning =
          _Regexp.getErrorWarning(editRegexp.name, regexpResult);
        editRegexp.textarea.focus();
        return undefined;
      }
      regexpStrings.push(regexpString);
      editRegexp.textarea.value = regexpString;
      editRegexp.errorChecked = true;
    }
    editNewsSelection.topicRegularExpression = regexpStrings[0];
    editNewsSelection.senderRegularExpression = regexpStrings[1];
    editNewsSelection.openedUrl = this.editPane.urlSelect.value;
    return editNewsSelection;
  }

  getDataWarning() {
    return this.editDataWarning;
  }

  addLocalizeButtonClickEventListener(callback) {
    this.editPane.localizedButtons.forEach((localizedButton) => {
        localizedButton.addEventListener(_Event.CLICK, callback);
      });
  }

  addOkButtonClickEventListener(callback) {
    this.editOkButton.addEventListener(_Event.CLICK, callback);
  }
}

/*
 * The pane of news selections focused on this option page.
 */
class SelectionPane extends FocusedOptionPane {
  constructor(focusedNodeGroup) {
    super(focusedNodeGroup);
    this.pane = {
        pageNumberList: document.querySelector(".page_number_list"),
        selectionList: document.querySelector(".selection_list"),
        deleteCheckbox: document.querySelector(".page_header input"),
        deleteButton: getOptionButton("Delete"),
        editPane: undefined,
        editPointedGroup: new _Event.PointedGroup()
      };
    _setSelectionPageNumberList(
      this.pane.pageNumberList, this.pane.deleteButton.tabIndex + 1);
    this.pane.deleteCheckbox.addEventListener("input", (event) => {
        for (let i = 0; i < this.nodeSize; i++) {
          var selectionCheckbox = this.getSelectionCheckbox(i);
          if (selectionCheckbox != null) {
            selectionCheckbox.checked = event.target.checked;
          }
        }
        this.pane.deleteButton.disabled = ! event.target.checked;
      });
    this.pane.deleteButton.disabled = true;
    this.pane.editPane =
      new SelectionEditPane(this, this.pane.editPointedGroup);
    this.faviconList = undefined;
    this.faviconFocusedIndex = -1;
    this.faviconElements = new Array();
  }

  get pageNumberArray() {
    return Array.from(this.pane.pageNumberList.children);
  }

  containsListElement(element) {
    return this.pane.selectionList.contains(element);
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
    this.pane.deleteCheckbox.checked = deleteChecked;
    this.pane.deleteButton.disabled = ! deleteChecked;
  }

  addDeleteButtonClickEventListener(callback) {
    this.pane.deleteButton.addEventListener(_Event.CLICK, callback);
  }

  getFocusedNode(selectionIndex) {
    return _getSelectionFocusedNode(this.getNode(selectionIndex));
  }

  insertSelectionNode(
    selectionIndex, selectionData, fireSelectionNodeInsertEvent,
    fireSelectionNodeMoveEvent, fireSelectionNodeRemoveEvent,
    fireSelectionEditPaneOpenEvent) {
    var selectionNode = _createSelectionNode(selectionData);
    var selectionFocusedNode = _getSelectionFocusedNode(selectionNode);
    if (selectionFocusedNode != null) {
      // Set the event listener into elements focused on the selection node.
      var selectionFocusedNodeGroup = this.getFocusedNodeGroup();
      var selectionCheckbox = _getSelectionCheckbox(selectionFocusedNode);
      var selectionFaviconImage =
        _getSelectionFaviconNode(selectionFocusedNode).querySelector("input");
      selectionCheckbox.addEventListener("input", (event) => {
          if (event.target.checked) {
            this.pane.deleteCheckbox.checked = true;
            this.pane.deleteButton.disabled = false;
          } else {
            this.setSelectionCheckboxAll();
          }
        });
      selectionFaviconImage.addEventListener(_Event.CLICK, (event) => {
          if (this.faviconList != undefined) {
            // Display the favicon list on the node of a selection data.
            var selectionFaviconNode = event.target.parentNode;
            if (this.faviconList.parentNode != null) {
              this.faviconList.parentNode.removeChild(this.faviconList);
              selectionFaviconNode.appendChild(this.faviconList);
            } else {
              // Set favicon elements for which the border or popup URL is
              // appeared by pointer and key events of the group focused on
              // the pane. However, this addition must be after the list is
              // appended to a node because of the check of focused parent.
              selectionFaviconNode.appendChild(this.faviconList);
              this.getFocusedNodeGroup().addElements(this.faviconElements);
            }
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
        Array.of(selectionCheckbox, selectionFaviconImage));
    }
    super.insertNode(
      selectionIndex, selectionNode, fireSelectionNodeInsertEvent,
      fireSelectionNodeMoveEvent, fireSelectionNodeRemoveEvent);
    // Append the specified node at the specified index to the current page.
    var nextSelectionNode = null;
    if (selectionIndex < this.nodeSize - 1) {
      nextSelectionNode = this.getNode(selectionIndex + 1);
    }
    this.pane.selectionList.insertBefore(selectionNode, nextSelectionNode);
  }

  updateSelectionNode(selectionIndex, selectionData) {
    var selectionNode = this.getNode(selectionIndex);
    var selectionFaviconNode = _getSelectionFaviconNode(selectionNode);
    if (selectionFaviconNode != null) {
      var selectionSetingNameLabel =
        selectionFaviconNode.parentNode.querySelector("label");
      var selectionFaviconImage =
        selectionFaviconNode.querySelector("input");
      var selectionFavicon =
        SELECTION_FAVICON_MAP.get(selectionData.openedSiteId);
      if (selectionFavicon == undefined) {
        selectionFavicon = SELECTION_DEFAULT_FAVICON;
      }
      selectionFaviconImage.src = selectionFavicon.data;
      selectionFaviconImage.title = selectionData.openedUrl;
      selectionSetingNameLabel.textContent = selectionData.settingName;
    }
  }

  removeSelectionNode(selectionIndex) {
    var selectionNode = this.removeNode(selectionIndex);
    selectionNode.parentNode.removeChild(selectionNode);
    // Remove the favicon list from the node at the specified index
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
    this.pane.selectionList.removeChild(movedUpNode);
    this.pane.selectionList.insertBefore(movedUpNode, movedDownNode);
  }

  getEditPane() {
    return this.pane.editPane;
  }

  createFaviconList() {
    // Create the list of favicons which have been read from the storage yet
    // but it has no parent until those are displayed for the first time.
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
            // Prevent moving from the favicon list by tab or other keys.
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
    var removedItems = Array.from(this.pane.selectionList.children);
    for (let i = removedItems.length - 1; i >= 0; i--) {
      this.pane.selectionList.removeChild(removedItems[i]);
    }
    this.pane.deleteCheckbox.checked = false;
    this.pane.deleteButton.disabled = true;
  }

  setEventRelation(eventGroup) {
    super.setEventRelation(eventGroup);
    eventGroup.addElements(this.pageNumberArray);
    eventGroup.addElements(
      Array.of(this.pane.deleteCheckbox, this.pane.deleteButton));
    eventGroup.setEventRelation(this.pane.editPointedGroup);
  }
}
