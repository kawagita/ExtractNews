/*
 *  Display and change the setting of this extension on the option page.
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

var optionUpdateParagraph = getOptionElement("OptionUpdate", "p");
var optionImportButton = getOptionButton("Import");
var optionExportButton = getOptionButton("Export");
var optionApplyButton = getOptionButton("Apply");
var optionFocusedGroup = new _Event.FocusedGroup();

optionUpdateParagraph.textContent = getOptionMessage("UpdateNotification");
optionFocusedGroup.addElements(
  Array.of(optionImportButton, optionExportButton, optionApplyButton));

// Creates the data and pane of general, filtering, and selection options.

var optionGeneralDataMap = new Map();
var optionFilteringData = new FilteringData();
var optionSelectionData = new SelectionData();

class OptionPageSettings extends OptionSettings {
  constructor() {
    super(optionGeneralDataMap, optionFilteringData, optionSelectionData);
    this.clearDataUpdated();
  }
  setGeneralDataUpdated() {
    optionApplyButton.disabled = false;
    optionUpdateParagraph.className = OPTION_NOTIFIED;
    super.setGeneralDataUpdated()
  }
  setFilteringDataUpdated() {
    optionApplyButton.disabled = false;
    optionUpdateParagraph.className = OPTION_NOTIFIED;
    super.setFilteringDataUpdated()
  }
  setSelectionDataUpdated() {
    optionApplyButton.disabled = false;
    optionUpdateParagraph.className = OPTION_NOTIFIED;
    super.setSelectionDataUpdated()
  }
  clearDataUpdated() {
    optionApplyButton.disabled = true;
    optionUpdateParagraph.className = "";
    super.clearDataUpdated()
  }
}

var optionSettings = new OptionPageSettings();

var optionGeneralPane = new GeneralPane(optionSettings);
var optionFilteringPane = new FilteringPane(new _Event.BubblingFocusedGroup());
var optionSelectionPageManager;
var optionSelectionPane;
var optionSelectionEditPane;

optionGeneralPane.setEventRelativeGroup(optionFocusedGroup);
optionFilteringPane.setEventRelativeGroup(optionFocusedGroup);

class SelectionFocusedGroup extends _Event.BubblingFocusedGroup {
  constructor() {
    super();
  }
  setFocusedTarget(event) {
    var target = super.setFocusedTarget(event);
    if (! optionSelectionPane.focusFaviconElement(target)) {
      optionSelectionPane.hideFaviconList(true);
    }
    return target;
  }
  clearFocusedTarget(event) {
    var target = super.clearFocusedTarget(event);
    if (! optionSelectionPane.containsFaviconElement(target)) {
      optionSelectionPane.hideFaviconList(true);
    }
    return target;
  }
}

optionSelectionPane = new SelectionPane(new SelectionFocusedGroup());
optionSelectionEditPane = optionSelectionPane.getEditPane();
optionSelectionPane.setEventRelativeGroup(optionFocusedGroup);

// Displays the menu list of general, filtering, and selection options.

const OPTION_MENU_GENERAL = "general";
const OPTION_MENU_FILTERING = "filtering";
const OPTION_MENU_SELECTION = "selection";
const OPTION_MENUS = [
    OPTION_MENU_GENERAL, OPTION_MENU_FILTERING, OPTION_MENU_SELECTION
  ];

var optionMenuClassList = document.body.classList;
var optionMenuItems = Array.from(document.querySelectorAll("#OptionMenu li"));

optionMenuItems.forEach((optionMenuItem) => {
    optionMenuItem.textContent = getOptionMessage(optionMenuItem.id);
    optionFocusedGroup.addElement(optionMenuItem);
  });

var optionMenuManager =
  new _Event.PageListManager((event, menuIndex, previousMenuIndex) => {
    if (previousMenuIndex >= 0) {
      if (optionSelectionEditPane.isDisplaying()) {
        optionSelectionEditPane.close(true);
      }
      optionMenuClassList.toggle(OPTION_MENUS[previousMenuIndex]);
    }
    optionMenuClassList.toggle(OPTION_MENUS[menuIndex]);
  }, optionMenuItems);
optionMenuManager.setPageSize(optionMenuItems.length);

// Functions to display and operate the node in filtering blocks.

function _fireFilteringTargetNodeInsertEvent(event) {
  event.target.disabled = true;
  var insertedIndex = optionFilteringPane.getEventNodeIndex(event);
  var insertedEmptyData = createFilteringTargetData();
  optionFilteringData.insertTargetData(insertedIndex, insertedEmptyData);
  insertFilteringTargetNode(insertedIndex, insertedEmptyData);
  if (optionFilteringData.targetDataTotal >= ExtractNews.FILTERING_MAX_COUNT) {
    // Disable "Insert" button by an increase of filterings to the maximum.
    optionFilteringPane.disableInsertButtonAll();
  } else {
    optionFilteringPane.focusNode(insertedIndex);
    event.target.disabled = false;
  }
  optionSettings.setFilteringDataUpdated();
}

function _fireFilteringTargetNameChangeEvent(event) {
  var changedIndex = optionFilteringPane.getEventNodeIndex(event);
  optionFilteringData.getTargetData(changedIndex).name = event.target.value;
  optionSettings.setFilteringDataUpdated();
}

function _fireFilteringTargetDataInputEvent(event) {
  var targetIndex = optionFilteringPane.getEventNodeIndex(event);
  var targetData = optionFilteringData.getTargetData(targetIndex);
  if (! event.target.classList.contains(FILTERING_TARGET_TERMINATE_BLOCK)) {
    if (targetData.wordsString != "") {
      optionSettings.setFilteringDataUpdated();
    }
    switch (event.target.value) {
    case ExtractNews.TARGET_WORD_BEGINNING:
      targetData.wordBeginningMatched = event.target.checked;
      break;
    case ExtractNews.TARGET_WORD_END:
      targetData.wordEndMatched = event.target.checked;
      break;
    case ExtractNews.TARGET_WORDS_EXCLUDED:
      targetData.wordsExcluded = event.target.checked;
      break;
    default: // Target words input
      targetData.wordsString = event.target.value;
      targetData.localizedWordSet = undefined;
      optionSettings.setFilteringDataUpdated();
      break;
    }
  } else { // "End of Block" checkbox
    if (event.target.checked) {
      targetData.wordsString = "";
      targetData.blockTerminated = true;
      targetData.localizedWordSet = undefined;
      targetData.wordBeginningMatched = false;
      targetData.wordEndMatched = false;
      targetData.wordsExcluded = false;
    } else {
      targetData.blockTerminated = false;
    }
    optionFilteringPane.toggleTargetEndOfBlock(targetIndex);
    optionSettings.setFilteringDataUpdated();
  }
}

function _fireFilteringTargetWordsLocalizeEvent(event) {
  event.target.disabled = true;
  var targetIndex = optionFilteringPane.getEventNodeIndex(event);
  var targetData = optionFilteringData.getTargetData(targetIndex);
  if (targetData.wordsString != "") {
    var wordSet = getFilteringTargetWordSet(targetData.wordsString, true);
    var wordsInput = optionFilteringPane.getTargetWordsInput(targetIndex);
    var wordsString = Array.from(wordSet).join(WORD_SEPARATOR);
    if (wordsString.length <= _Alert.FILTERING_WORDS_MAX_UTF16_CHARACTERS) {
      wordsInput.value = wordsString;
      targetData.wordsString = wordsString;
      targetData.localizedWordSet = wordSet;
      optionSettings.setFilteringDataUpdated();
    } else {
      sendOpitonWarningMessage(
        _Alert.getWarning(
          _Alert.FILETERING_WORDS_MAX_UTF16_CHARACTERS_EXCEEDED));
      wordsInput.focus();
    }
  }
  event.target.disabled = false;
}

function _fireFilteringTargetNodeMoveEvent(event) {
  // Lock "Up" or "Down" button pressed in a node of filtering blocks.
  event.target.disabled = true;
  var movedUp = event.target.classList.contains(OPERATION_UP);
  var movedUpIndex = optionFilteringPane.getEventNodeIndex(event);
  var movedDownIndex = movedUpIndex;
  if (movedUp) {
    movedDownIndex--;
  } else {
    movedUpIndex++;
  }
  // Swap the lower and upper node and those data in two filtering targets.
  optionFilteringData.insertTargetData(
    movedDownIndex, optionFilteringData.removeTargetData(movedUpIndex));
  optionFilteringPane.swapTargetNode(movedUpIndex, movedDownIndex);
  movedUpIndex--;
  movedDownIndex++;
  if (movedDownIndex <= 1) {
    // Move the lower node up to the top of filtering blocks and disable "Up"
    // button if not pressed, otherwise, focus "Down" button.
    if (! movedUp) {
      optionFilteringPane.disableButton(movedUpIndex, OPERATION_UP);
    } else { // "Up" button pressed on the lower node
      optionFilteringPane.focusNode(movedUpIndex, OPERATION_DOWN);
    }
    optionFilteringPane.enableButton(movedDownIndex, OPERATION_UP);
  } else if (movedUp) {
    // Unlock and focus "Up" button pressed on the lower node.
    optionFilteringPane.enableButton(movedUpIndex, OPERATION_UP);
    optionFilteringPane.focusNode(movedUpIndex, OPERATION_UP);
  }
  if (movedUpIndex >= optionFilteringPane.nodeSize - 3) {
    // Move the upper node down to the bottom except for the node of policy
    // target on the category and disable "Down" button if not pressed,
    // otherwise, focus "Up" button.
    if (movedUp) {
      optionFilteringPane.disableButton(movedDownIndex, OPERATION_DOWN);
    } else { // "Down" button pressed on the upper node
      optionFilteringPane.focusNode(movedDownIndex, OPERATION_UP);
    }
    optionFilteringPane.enableButton(movedUpIndex, OPERATION_DOWN);
  } else if (! movedUp) {
    // Unlock and focus "Down" button pressed on the upper node.
    optionFilteringPane.enableButton(movedDownIndex, OPERATION_DOWN);
    optionFilteringPane.focusNode(movedDownIndex, OPERATION_DOWN);
  }
  optionSettings.setFilteringDataUpdated();
}

function _fireFilteringTargetNodeRemoveEvent(event) {
  event.target.disabled = false;
  var removedTargetDataTotal = optionFilteringData.targetDataTotal;
  var removedIndex = optionFilteringPane.getEventNodeIndex(event);
  optionFilteringData.removeTargetData(removedIndex);
  removeFilteringTargetNode(removedIndex);
  if (removedTargetDataTotal >= ExtractNews.FILTERING_MAX_COUNT) {
    // Enable "Insert" button by a decrease of filterings from the maximum.
    optionFilteringPane.enableInsertButtonAll();
  }
  var focusedOperation = OPERATION_INSERT;
  if (removedIndex < optionFilteringPane.nodeSize - 1) {
    optionFilteringPane.focusNode(removedIndex);
    focusedOperation = OPERATION_REMOVE;
  }
  optionFilteringPane.focusNode(removedIndex, focusedOperation);
  optionSettings.setFilteringDataUpdated();
}

/*
 * Adds a node of the specified filtering data to the filtering block on
 * the selected category.
 */
function addFilteringTargetNode(targetData, policyTargetAdded = false) {
  var addedIndex = optionFilteringPane.nodeSize;
  if (policyTargetAdded) {
    optionFilteringPane.insertTargetNode(
      addedIndex, targetData, true, _fireFilteringTargetNodeInsertEvent,
      _fireFilteringTargetNodeMoveEvent, _fireFilteringTargetNodeRemoveEvent,
      _fireFilteringTargetNameChangeEvent, _fireFilteringTargetDataInputEvent,
      _fireFilteringTargetWordsLocalizeEvent);
  } else {
    insertFilteringTargetNode(addedIndex, targetData);
  }
}

/*
 * Inserts a node of the specified filtering data at the specified index to
 * the filtering block on the selected category.
 */
function insertFilteringTargetNode(addedIndex, targetData) {
  optionFilteringPane.insertTargetNode(
    addedIndex, targetData, false, _fireFilteringTargetNodeInsertEvent,
    _fireFilteringTargetNodeMoveEvent, _fireFilteringTargetNodeRemoveEvent,
    _fireFilteringTargetNameChangeEvent, _fireFilteringTargetDataInputEvent,
    _fireFilteringTargetWordsLocalizeEvent);
  if (addedIndex < optionFilteringPane.nodeSize + 1) {
    // Enable "Up" or "Down" button in the second node or the previous node
    // of the bottom except for the node of policy target on the category.
    var moveUpEnabled = true;
    var moveDownEnabled = true;
    if (addedIndex <= 0) {
      if (optionFilteringPane.nodeSize > 2) {
        optionFilteringPane.enableButton(1, OPERATION_UP);
      }
      moveUpEnabled = false;
    }
    if (addedIndex >= optionFilteringPane.nodeSize - 2) {
      if (optionFilteringPane.nodeSize > 2) {
        optionFilteringPane.enableButton(
          optionFilteringPane.nodeSize - 3, OPERATION_DOWN);
      }
      moveDownEnabled = false;
    }
    optionFilteringPane.enableAllButtons(
      addedIndex, moveUpEnabled, moveDownEnabled);
  }
}

/*
 * Removes a node at the specified index from the filtering block on
 * the selected category.
 */
function removeFilteringTargetNode(removedIndex) {
  optionFilteringPane.removeTargetNode(removedIndex);
  if (optionFilteringPane.nodeSize > 1) {
    // Disable "Up" or "Down" button in the top or bottom except for the node
    // of policy target on the category.
    if (removedIndex <= 0) {
      optionFilteringPane.disableButton(0, OPERATION_UP);
    }
    if (removedIndex >= optionFilteringPane.nodeSize - 2) {
      optionFilteringPane.disableButton(
        optionFilteringPane.nodeSize - 2, OPERATION_DOWN);
    }
  }
}

/*
 * Reflects the filtering data to filtering blocks on the selected category.
 */
function reflectOptionFilteringData() {
  var filteringCategoryId = optionFilteringData.categoryId;
  if (filteringCategoryId != ExtractNews.FILTERING_FOR_ALL) {
    optionFilteringPane.setCategoryTopics(
      optionFilteringData.categoryTopicsString);
  } else {
    optionFilteringPane.clearCategoryTopics();
  }
  optionFilteringPane.changeCategory(filteringCategoryId);
  var addedTargetData = optionFilteringData.getTargetData(0);
  for (let i = 1; i < optionFilteringData.targetDataSize; i++) {
    addFilteringTargetNode(addedTargetData);
    addedTargetData = optionFilteringData.getTargetData(i);
  }
  addFilteringTargetNode(addedTargetData, true);
  Debug.printMessage(
    "Display filtering targets of " + filteringCategoryId + ".");
  // Enable "Insert", "Localize", "Up", "Down", and "Remove" button after all
  // nodes are appended to filteling blocks.
  for (let i = 0; i < optionFilteringPane.nodeSize; i++) {
    optionFilteringPane.enableAllButtons(
      i, i > 0, i < optionFilteringPane.nodeSize - 2);
  }
  if (optionFilteringData.targetDataTotal >= ExtractNews.FILTERING_MAX_COUNT) {
    // Disable "Insert" button by an increase of filterings to the maximum.
    optionFilteringPane.disableInsertButtonAll();
  }
}

optionFilteringPane.addCategorySelectChangeEventListener((event) => {
    optionFilteringPane.clear();
    optionFilteringData.selectCategory(event.target.value);
    reflectOptionFilteringData();
  });
optionFilteringPane.addCategoryTopicsInputEventListener((event) => {
    optionFilteringData.categoryTopicsString = event.target.value;
    optionSettings.setFilteringDataUpdated();
  });

// Functions to display and operate the node in the selection list.

function _fireNewsSelectionNodeInsertEvent(event) {
  optionSelectionEditPane.open(
    optionSelectionPageManager.pageIndex * SELECTION_PAGE_NODE_SIZE
    + optionSelectionPane.getEventNodeIndex(event));
}

function _fireNewsSelectionEditPaneOpenEvent(event, selectionDataOperation) {
  if (selectionDataOperation == OPERATION_INSERT
    || (event.target.tagName != "INPUT" && event.target.tagName != "BUTTON")) {
    var selectionDataIndex =
      optionSelectionPageManager.pageIndex * SELECTION_PAGE_NODE_SIZE
      + optionSelectionPane.getEventNodeIndex(event);
    var selectionData = undefined;
    if (selectionDataOperation == OPERATION_EDIT) {
      selectionData = optionSelectionData.getData(selectionDataIndex);
    }
    optionSelectionEditPane.open(selectionDataIndex, selectionData);
  //} else {
  // Ignore the click event on the delete checkbox, favicon, and buttons
  // focused on a node in the selection list, not including "Insert" button.
  }
}

function _fireNewsSelectionNodeMoveEvent(event) {
  // Lock "Up" or "Down" button pressed in a node of the selection list.
  event.target.disabled = true;
  var selectionPageFirstDataIndex =
    SELECTION_PAGE_NODE_SIZE * optionSelectionPageManager.pageIndex;
  var movedUp = event.target.classList.contains(OPERATION_UP);
  var movedUpIndex = optionSelectionPane.getEventNodeIndex(event);
  var movedDownIndex = movedUpIndex;
  if (movedUp) {
    movedDownIndex--;
  } else {
    movedUpIndex++;
  }
  optionSelectionData.insertData(
    selectionPageFirstDataIndex + movedDownIndex,
    optionSelectionData.removeData(
      selectionPageFirstDataIndex + movedUpIndex));
  if (movedDownIndex < 0) {
    // Move the top node of the list and its data to the previous page.
    optionSelectionPageManager.movePage(_Event.PAGE_MOVE_BACK_EVENT);
    var focusedIndex = SELECTION_PAGE_NODE_SIZE - 1;
    optionSelectionPane.focusNode(focusedIndex);
    optionSelectionPane.focusNode(focusedIndex, OPERATION_UP);
  } else if (movedUpIndex >= SELECTION_PAGE_NODE_SIZE) {
    // Move the bottom node of the list and its data to the next page.
    optionSelectionPageManager.movePage(_Event.PAGE_MOVE_FORWARD_EVENT);
    var focusedOperation = OPERATION_DOWN;
    if (optionSelectionPane.nodeSize <= 2) {
      // Focus "Up" button instead of "Down" disabled on the bottom except
      // for the node to append new data.
      focusedOperation = OPERATION_UP;
    }
    optionSelectionPane.focusNode(0);
    optionSelectionPane.focusNode(0, focusedOperation);
  } else {
    // Swap the lower and upper node and those data in two news selections.
    optionSelectionPane.swapSelectionNode(movedUpIndex, movedDownIndex);
    movedUpIndex--;
    movedDownIndex++;
    if (movedDownIndex <= 1
      && optionSelectionPageManager.isFirstPageKeeping()) {
      // Move the lower node up to the top on the first page and disable "Up"
      // button if not pressed, otherwise, focus "Down" button.
      if (! movedUp) {
        optionSelectionPane.disableButton(movedUpIndex, OPERATION_UP);
      } else { // "Up" button pressed on the lower node
        optionSelectionPane.focusNode(movedUpIndex, OPERATION_DOWN);
      }
      optionSelectionPane.enableButton(movedDownIndex, OPERATION_UP);
    } else if (movedUp) {
      // Unlock and focus "Up" button pressed on the lower node.
      optionSelectionPane.enableButton(movedUpIndex, OPERATION_UP);
      optionSelectionPane.focusNode(movedUpIndex, OPERATION_UP);
    }
    var bottomMovedUpIndex = optionSelectionPane.nodeSize - 3;
    if (optionSelectionData.dataSize >= ExtractNews.SELECTION_MAX_COUNT) {
      bottomMovedUpIndex++;
    }
    if (movedUpIndex >= bottomMovedUpIndex
      && optionSelectionPageManager.isLastPageKeeping()) {
      // Move the upper node down to the bottom except for the node to append
      // new data on the last page and disable "Down" button if not pressed,
      // otherwise, focus "Up" button.
      if (movedUp) {
        optionSelectionPane.disableButton(movedDownIndex, OPERATION_DOWN);
      } else { // "Down" button pressed on the upper node
        optionSelectionPane.focusNode(movedDownIndex, OPERATION_UP);
      }
      optionSelectionPane.enableButton(movedUpIndex, OPERATION_DOWN);
    } else if (! movedUp) {
      // Unlock and focus "Down" button pressed on the upper node.
      optionSelectionPane.enableButton(movedDownIndex, OPERATION_DOWN);
      optionSelectionPane.focusNode(movedDownIndex, OPERATION_DOWN);
    }
  }
  optionSettings.setSelectionDataUpdated();
}

function _fireNewsSelectionNodeRemoveEvent(event) {
  event.target.disabled = true;
  var removedSelectionDataSize = optionSelectionData.dataSize;
  var removedIndex = optionSelectionPane.getEventNodeIndex(event);
  var removedSelectionDeleteChecked =
    optionSelectionPane.getSelectionCheckbox(removedIndex).checked;
  optionSelectionData.removeData(
    SELECTION_PAGE_NODE_SIZE * optionSelectionPageManager.pageIndex
    + removedIndex);
  removeNewsSelectionNode(removedIndex);
  // Index    A       B       C
  // 16     Insert  Insert  Insert
  // 17     Insert  Insert  Insert
  // 18     Insert  Insert  Append
  // 19     Insert  Append
  //
  // The state B or C is appeared on only the last page. If a news selection
  // is removed at the index 18 or 19 (optionSelectionPane.nodeSize - 2),
  // "Append" button is focused, otherwise, "Insert". Any deletion on the last
  // page don't reduce the total of pages.
  //
  // If a news selection is removed at the index 19 in the state A on the last
  // page or the page changed to the last page by its deletion, "Append" button
  // is focused, otherwise, "Insert" in the node added at the same index.
  var focusedOperation = OPERATION_REMOVE;
  if (removedSelectionDataSize < ExtractNews.SELECTION_MAX_COUNT
    && optionSelectionPageManager.isLastPageKeeping()) {
    if (removedIndex >= optionSelectionPane.nodeSize - 1) {
      focusedOperation = OPERATION_APPEND;
    }
  } else if (optionSelectionPane.nodeSize >= SELECTION_PAGE_NODE_SIZE - 1) {
    if (removedSelectionDataSize >= ExtractNews.SELECTION_MAX_COUNT) {
      // Enable "Insert" button by a decrease of selections from the maximum.
      optionSelectionPane.enableInsertButtonAll();
    }
    optionSelectionPageManager.setPageSize(
      Math.ceil(removedSelectionDataSize / SELECTION_PAGE_NODE_SIZE));
    if (removedIndex >= SELECTION_PAGE_NODE_SIZE - 1
      && optionSelectionPageManager.isLastPageKeeping()) {
      focusedOperation = OPERATION_APPEND;
    }
    // Need to add a node because removed at the maximum index on the page.
    var selectionData = undefined;
    var selectionDataIndex =
      SELECTION_PAGE_NODE_SIZE * (optionSelectionPageManager.pageIndex + 1)
      - 1;
    if (selectionDataIndex < optionSelectionData.dataSize) {
      // Add the data in the top of the selection list on the next page.
      selectionData = optionSelectionData.getData(selectionDataIndex);
    }
    addNewsSelectionNode(selectionData);
    optionSelectionPane.enableAllButtons(SELECTION_PAGE_NODE_SIZE - 1);
  }
  if (removedSelectionDeleteChecked) {
    optionSelectionPane.setSelectionCheckboxAll();
  }
  optionSelectionPane.focusNode(removedIndex);
  optionSelectionPane.focusNode(removedIndex, focusedOperation);
  optionSettings.setSelectionDataUpdated();
}

/*
 * Adds a node of the specified data to the selection list on the current
 * page.
 */
function addNewsSelectionNode(selectionData) {
  insertNewsSelectionNode(optionSelectionPane.nodeSize, selectionData);
}

/*
 * Inserts a node of the specified data at the specified index to
 * the selection list on the current page.
 */
function insertNewsSelectionNode(addedIndex, selectionData) {
  optionSelectionPane.insertSelectionNode(
    addedIndex, selectionData, _fireNewsSelectionNodeInsertEvent,
    _fireNewsSelectionNodeMoveEvent, _fireNewsSelectionNodeRemoveEvent,
    _fireNewsSelectionEditPaneOpenEvent);
  // Remove the element over the size of nodes displayed on the current page.
  if (optionSelectionPane.nodeSize > SELECTION_PAGE_NODE_SIZE) {
    removeNewsSelectionNode(SELECTION_PAGE_NODE_SIZE);
  }
  if (addedIndex < optionSelectionPane.nodeSize + 1) {
    // Enable "Up" or "Down" button in the second node or the previous node
    // of the bottom except for the node to append new data on the list.
    var upEnabled = true;
    var downEnabled = true;
    if (addedIndex <= 0
      && optionSelectionPageManager.isFirstPageKeeping()) {
      if (optionSelectionPane.nodeSize > 2) {
        optionSelectionPane.enableButton(1, OPERATION_UP);
      }
      upEnabled = false;
    }
    if (addedIndex >= optionSelectionPane.nodeSize - 2
      && optionSelectionPageManager.isLastPageKeeping()) {
      if (optionSelectionPane.nodeSize > 2) {
        optionSelectionPane.enableButton(
          optionSelectionPane.nodeSize - 3, OPERATION_DOWN);
      }
      downEnabled = false;
    }
    optionSelectionPane.enableAllButtons(addedIndex, upEnabled, downEnabled);
    if (optionSelectionData.dataSize >= ExtractNews.SELECTION_MAX_COUNT) {
      optionSelectionPane.disableButton(addedIndex, OPERATION_INSERT);
    }
  }
}

/*
 * Removes a node at the specified index from the selection list on
 * the current page.
 */
function removeNewsSelectionNode(removedIndex) {
  optionSelectionPane.removeSelectionNode(removedIndex);
  if (optionSelectionPane.nodeSize > 1) {
    // Disable "Up" or "Down" button in the top or bottom except for the node
    // to append new data on the list.
    if (removedIndex <= 0
      && optionSelectionPageManager.isFirstPageKeeping()) {
      optionSelectionPane.disableButton(0, OPERATION_UP);
    }
    if (removedIndex >= optionSelectionPane.nodeSize - 2
      && optionSelectionPageManager.isLastPageKeeping()) {
      var disabledIndex = optionSelectionPane.nodeSize - 2;
      if (removedIndex >= SELECTION_PAGE_NODE_SIZE - 1) {
        disabledIndex++;
      }
      optionSelectionPane.disableButton(disabledIndex, OPERATION_DOWN);
    }
  }
}

/*
 * Reflects the selection data to the list on the current page.
 */
function reflectOptionSelectionData() {
  var selectionDataIndex =
    SELECTION_PAGE_NODE_SIZE * optionSelectionPageManager.pageIndex;
  var selectionDataSize = optionSelectionData.dataSize;
  var addedSelectionCount = selectionDataSize - selectionDataIndex;
  if (addedSelectionCount > 0) {
    var addedSelectionMaxCount = SELECTION_PAGE_NODE_SIZE;
    if (optionSelectionPane.nodeSize > 0) {
      var bottomSelectionFocusedNode =
        optionSelectionPane.getFocusedNode(optionSelectionPane.nodeSize - 1);
      if (bottomSelectionFocusedNode == null) {
        // Count the node to append new data to the selection list.
        addedSelectionMaxCount++;
      }
      addedSelectionMaxCount -= optionSelectionPane.nodeSize;
    }
    if (addedSelectionCount > addedSelectionMaxCount) {
      addedSelectionCount = addedSelectionMaxCount;
    }
    for (let i = 0; i < addedSelectionCount; i++) {
      insertNewsSelectionNode(
        i, optionSelectionData.getData(selectionDataIndex + i));
    }
    Debug.printMessage(
      "Display news selections on Page "
      + String(optionSelectionPageManager.pageIndex + 1) + ".");
    // Enable "Insert", "Up", "Down", and "Remove" button after all nodes
    // are appended to the selection list.
    for (let i = 0; i < addedSelectionCount; i++) {
      optionSelectionPane.enableAllButtons(
        i, selectionDataIndex > 0, selectionDataIndex < selectionDataSize - 1);
      selectionDataIndex++;
    }
    if (selectionDataSize >= ExtractNews.SELECTION_MAX_COUNT) {
      // Disable "Insert" button by an increase of selections to the maximum.
      optionSelectionPane.disableInsertButtonAll();
    }
  }
  if (addedSelectionCount >= optionSelectionPane.nodeSize
    && optionSelectionPane.nodeSize < SELECTION_PAGE_NODE_SIZE) {
    // Add "Append" button to the bottom of the selection list.
    addNewsSelectionNode();
    optionSelectionPane.enableAllButtons(
      optionSelectionPane.nodeSize - 1, false, false);
  }
}

// Removes the data and node from the selection data and list on the current
// page when "Delete" button is pressed.

optionSelectionPane.addDeleteButtonClickEventListener((event) => {
    event.target.disabled = true;
    var selectionPageFirstDataIndex =
      SELECTION_PAGE_NODE_SIZE * optionSelectionPageManager.pageIndex;
    for (let i = optionSelectionPane.nodeSize - 1; i >= 0; i--) {
      var selectionCheckbox = optionSelectionPane.getSelectionCheckbox(i);
      if (selectionCheckbox != null && selectionCheckbox.checked) {
        optionSelectionData.removeData(selectionPageFirstDataIndex + i);
      }
    }
    var selectionNodeTotal = optionSelectionData.dataSize;
    if (selectionNodeTotal < ExtractNews.SELECTION_MAX_COUNT) {
      // Count the node to append new data to the selection list.
      selectionNodeTotal++;
    }
    optionSelectionPageManager.setPageSize(
      Math.ceil(selectionNodeTotal / SELECTION_PAGE_NODE_SIZE));
    optionSelectionPageManager.getEventTarget().focus();
    optionSelectionPane.clear();
    reflectOptionSelectionData();
    optionSettings.setSelectionDataUpdated();
  });

optionSelectionEditPane.addLocalizeButtonClickEventListener((event) => {
    var regexpIndex = Number(event.target.value);
    if (! optionSelectionEditPane.localizeRegularExpression(regexpIndex)) {
      sendOpitonWarningMessage(optionSelectionEditPane.getDataWarning());
    }
  });

// Inserts the data and node to the selection data and list if the edit pane is
// opened by "Insert" or "Append" button, otherwise, replaces the data and node
// when "OK" button is pressed.

optionSelectionEditPane.addOkButtonClickEventListener((event) => {
    var newsSelection = optionSelectionEditPane.getNewsSelection();
    if (newsSelection == undefined) {
      sendOpitonWarningMessage(optionSelectionEditPane.getDataWarning());
      return;
    }
    var selectionData = createSelectionData(newsSelection);
    var selectionDataIndex = optionSelectionEditPane.dataIndex;
    var selectionIndex = selectionDataIndex % SELECTION_PAGE_NODE_SIZE;
    if (optionSelectionEditPane.dataOperation == OPERATION_INSERT) {
      optionSelectionData.insertData(selectionDataIndex, selectionData);
      var selectionNodeTotal = optionSelectionData.dataSize;
      if (selectionNodeTotal >= ExtractNews.SELECTION_MAX_COUNT) {
        // Disable "Insert" button by an increase of selections to the maximum.
        optionSelectionPane.disableInsertButtonAll();
      } else {
        // Count the node to append new data to the selection list.
        selectionNodeTotal++;
      }
      insertNewsSelectionNode(selectionIndex, selectionData);
      optionSelectionPageManager.setPageSize(
        Math.ceil(selectionNodeTotal / SELECTION_PAGE_NODE_SIZE));
    } else { // Existing news selection
      optionSelectionData.setData(selectionDataIndex, selectionData);
      optionSelectionPane.updateSelectionNode(selectionIndex, selectionData);
    }
    optionSelectionEditPane.close();
    optionSettings.setSelectionDataUpdated();
  });

function _fireNewsSelectionFaviconListClickEvent(event) {
  var selectionIndex = optionSelectionPane.getEventNodeIndex(event);
  var selectionData =
    optionSelectionData.getData(
      SELECTION_PAGE_NODE_SIZE * optionSelectionPageManager.pageIndex
      + selectionIndex);
  setSelectionOpenedUrl(selectionData, event.target.alt);
  optionSelectionPane.updateSelectionNode(selectionIndex, selectionData);
  optionSelectionPane.focusNode(selectionIndex);
  optionSettings.setSelectionDataUpdated();
}

// Reads the setting of general, filtering, and selection options from
// the storage.

{
  const readingPromises = new Array();

  readingPromises.push(
    _Storage.readDomainData().then(() => {
        const readingPromises = new Array();
        optionGeneralPane.forEachOptionData((optionData) => {
            optionGeneralDataMap.set(optionData.id, optionData);
            readingPromises.push(optionData.read());
          });
        return Promise.all(readingPromises);
      }).then(() => {
        // Read the favicon data and access count of news sites.
        return readSelectionSiteData();
      }).then(() => {
        ExtractNews.setDomainSites();
        optionSelectionPane.createFaviconList();
        optionSelectionPane.addFaviconListClickEventListener(
          _fireNewsSelectionFaviconListClickEvent);
      }));
  readingPromises.push(
    optionFilteringData.read().then(() => {
        optionFilteringPane.setCategoryNames(optionFilteringData);
        reflectOptionFilteringData();
      }));
  readingPromises.push(
    optionSelectionData.read().then(() => {
        var selectionNodeTotal = optionSelectionData.dataSize;
        if (selectionNodeTotal < ExtractNews.SELECTION_MAX_COUNT) {
          // Count the node to append new data to the selection list.
          selectionNodeTotal++;
        }
        optionSelectionPageManager.setPageSize(
          Math.ceil(selectionNodeTotal / SELECTION_PAGE_NODE_SIZE));
      }));

  Promise.all(readingPromises).catch((error) => {
      Debug.printStackTrace(error);
    });
}

optionSelectionPageManager =
  new _Event.PageListManager((event, pageIndex, previousPageIndex) => {
    if (pageIndex != previousPageIndex) {
      optionSelectionPageManager.setEventTarget(pageIndex);
      optionSelectionPane.clear();
      reflectOptionSelectionData();
    }
  }, optionSelectionPane.pageNumberArray);

// Reads or writes the option data of each setting from or to a file
// when "Import" or "Export" button is pressed.

optionImportButton.addEventListener(_Event.CLICK, (event) => {
    importOptionData(optionSettings).then(() => {
        optionFilteringPane.clear();
        optionSelectionPane.clear();
        optionFilteringPane.setCategoryNames(optionFilteringData);
        reflectOptionFilteringData();
        reflectOptionSelectionData();
        var selectionNodeTotal = optionSelectionData.dataSize;
        if (selectionNodeTotal < ExtractNews.SELECTION_MAX_COUNT) {
          // Count the node to append new data to the selection list.
          selectionNodeTotal++;
        }
        optionSelectionPageManager.setPageSize(
          Math.ceil(selectionNodeTotal / SELECTION_PAGE_NODE_SIZE));
        // Save and send the updated data of advanced options on the general
        // pane to the background script.
        var updatedObject = { };
        optionGeneralPane.forEachOptionData((optionData) => {
            if (optionData.isAdvanced()) {
              optionData.write();
              updatedObject = optionData.getUpdatedObject(updatedObject);
            }
          });
        sendOpitonUpdateMessage(updatedObject);
        optionApplyButton.focus();
      }).catch((error) => {
        Debug.printStackTrace(error);
      });
  });
optionExportButton.addEventListener(_Event.CLICK, (event) => {
    exportOptionData(optionSettings);
  });

// Writes the filtering and selection data into the storage and sends
// a message to the background script when "Apply" button is pressed.

optionApplyButton.addEventListener(_Event.CLICK, (event) => {
    event.target.disabled = true;
    // Close the selection edit window because an error occurs by overwriting.
    _Popup.closeSelectionEditWindow();
    const updatingPromises = new Array();
    var updatedObject = { };
    if (optionSettings.isGeneralDataUpdated()) {
      // Save and send the updated data except for advanced options on
      // the general pane to the background script.
      optionGeneralPane.forEachOptionData((optionData) => {
          if (! optionData.isAdvanced()) {
            updatingPromises.push(optionData.write());
            updatedObject = optionData.getUpdatedObject(updatedObject);
          }
        });
      updatingPromises.push(_Storage.writeDomainData());
    }
    if (optionSettings.isFilteringDataUpdated()) {
      updatingPromises.push(optionFilteringData.write());
      updatedObject.filteringUpdated = true;
    }
    if (optionSettings.isSelectionDataUpdated()) {
      updatingPromises.push(optionSelectionData.write());
    }
    Promise.all(updatingPromises).then(() => {
        sendOpitonUpdateMessage(updatedObject);
        optionSettings.clearDataUpdated();
        optionMenuManager.getEventTarget().focus();
      }).catch((error) => {
        Debug.printStackTrace(error);
      });
  });

// Controls the pane of filterings or selections by the key event.

document.body.addEventListener(_Event.KEYDOWN, (event) => {
    switch (event.code) {
    case "Escape":
      // Close the edit pane or favicon list of a news selection if opened.
      if (optionMenuClassList.contains(OPTION_MENU_SELECTION)) {
        if (optionSelectionEditPane.isDisplaying()) {
          optionSelectionEditPane.close(true);
          break;
        } else if (optionSelectionPane.hideFaviconList()) {
          break;
        }
      }
      optionMenuManager.getEventTarget().focus();
      break;
    case "PageUp":
    case "PageDown":
      // Focus the top or bottom node of filtering targets for the selected
      // category or news selections on the current page.
      if (optionMenuClassList.contains(OPTION_MENU_FILTERING)) {
        if (optionFilteringPane.containsBlockElement(event.target)) {
          var targetIndex = 0;
          if (event.code == "PageDown") {
            targetIndex = optionFilteringPane.nodeSize - 1;
          }
          optionFilteringPane.focusNode(targetIndex);
          event.preventDefault();
        }
      } else if (optionMenuClassList.contains(OPTION_MENU_SELECTION)
        && optionSelectionPane.containsListElement(event.target)
        && ! optionSelectionPane.isFaviconListDisplaying()) {
        var selectionIndex = 0;
        if (event.code == "PageDown") {
          selectionIndex = optionSelectionPane.nodeSize - 1;
        }
        if (! optionSelectionPane.focusNode(selectionIndex)) {
          optionSelectionPane.focusNode(selectionIndex, OPERATION_APPEND);
        }
        event.preventDefault();
      }
      break;
    case "ArrowUp":
    case "ArrowDown":
      // Focus the previous or next node of filtering targets for the selected
      // category or news selections on the current page.
      var focusedIndex = 0;
      if (event.code == "ArrowUp") {
        focusedIndex--;
      } else {
        focusedIndex++;
      }
      if (optionMenuClassList.contains(OPTION_MENU_FILTERING)) {
        if (event.target.tagName != "SELECT" && event.target.tagName != "INPUT"
          && optionFilteringPane.containsBlockElement(event.target)) {
          var targetIndex = optionFilteringPane.getEventNodeIndex(event);
          if (targetIndex >= 0) {
            focusedIndex += targetIndex;
            if (focusedIndex >= 0
              && focusedIndex < optionFilteringPane.nodeSize) {
              optionFilteringPane.focusNode(focusedIndex);
            }
          }
          event.preventDefault();
        }
      } else if (optionMenuClassList.contains(OPTION_MENU_SELECTION)
        && event.target.tagName != "INPUT"
        && optionSelectionPane.containsListElement(event.target)
        && ! optionSelectionPane.isFaviconListDisplaying()) {
        var selectionIndex = optionSelectionPane.getEventNodeIndex(event);
        if (selectionIndex >= 0) {
          focusedIndex += selectionIndex;
          if (focusedIndex < 0) {
            // Move the page of selections back and focus the bottom node
            // if not on the first page, otherwise, not change.
            if (! optionSelectionPageManager.isFirstPageKeeping()) {
              optionSelectionPageManager.movePage(_Event.PAGE_MOVE_BACK_EVENT);
              focusedIndex = optionSelectionPane.nodeSize - 1;
            } else {
              focusedIndex = 0;
            }
          } else if (focusedIndex >= optionSelectionPane.nodeSize) {
            // Move the page of selections forward and focus the top node
            // if not on the last page, otherwise, not change.
            if (! optionSelectionPageManager.isLastPageKeeping()) {
              optionSelectionPageManager.movePage(
                _Event.PAGE_MOVE_FORWARD_EVENT);
              focusedIndex = 0;
            } else {
              focusedIndex = selectionIndex;
            }
          }
          if (! optionSelectionPane.focusNode(focusedIndex)) {
            optionSelectionPane.focusNode(focusedIndex, OPERATION_APPEND);
          }
          event.preventDefault();
        }
      }
      break;
    }
  });

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
