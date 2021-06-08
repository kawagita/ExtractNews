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
var optionPointedGroup = new _Event.PointedGroup();

optionUpdateParagraph.textContent = getOptionMessage("UpdateDescription");
optionUpdateParagraph.className = OPTION_GRAYED_OUT;
optionApplyButton.disabled = true;

optionPointedGroup.addElements(
  Array.of(optionImportButton, optionExportButton, optionApplyButton));

// Creates and displays elements on the general setting firstly.

var optionGeneralPane = new GeneralPane();
var optionDataMap = new Map();

_Storage.readDomainData().then((domainDataArray) => {
    const readingPromises = new Array();
    domainDataArray.forEach(ExtractNews.setDomain);
    optionGeneralPane.forEachOptionData((optionData) => {
        optionDataMap.set(optionData.id, optionData);
        readingPromises.push(optionData.readValue());
      });
    return Promise.all(readingPromises);
  }).catch((error) => {
    Debug.printStackTrace(error);
  });

optionGeneralPane.setEventRelation(optionPointedGroup);

const OPTION_MENU_GENERAL = "general";
const OPTION_MENU_FILTERING = "filtering";
const OPTION_MENU_SELECTION = "selection";

const OPTION_MENUS = [
    OPTION_MENU_GENERAL, OPTION_MENU_FILTERING, OPTION_MENU_SELECTION
  ];

var optionMenuClassList = document.body.classList;
var optionMenuItems = Array.from(document.querySelectorAll("#OptionMenu li"));

var optionFilteringData = new FilteringData();
var optionFilteringPane = new FilteringPane(new _Event.BubblingFocusedGroup());
var optionFilteringUpdated = false;

optionFilteringPane.setEventRelation(optionPointedGroup);

var optionSelectionData = new SelectionData();
var optionSelectionPageManager;
var optionSelectionPane;
var optionSelectionEditPane;

class SelectionFocusedGroup extends _Event.BubblingFocusedGroup {
  constructor() {
    super();
  }
  setFocusedTarget(event) {
    super.setFocusedTarget(event);
    if (! optionSelectionPane.focusFaviconElement(event.target)) {
      optionSelectionPane.hideFaviconList(true);
    }
  }
  clearFocusedTarget(event) {
    var target = super.clearFocusedTarget(event);
    if (! optionSelectionPane.containsFaviconElement(event.target)) {
      optionSelectionPane.hideFaviconList(true);
    }
    return target;
  }
}

optionSelectionPane = new SelectionPane(new SelectionFocusedGroup());
optionSelectionEditPane = optionSelectionPane.getEditPane();
optionSelectionPane.setEventRelation(optionPointedGroup);

// Displays the menu list of general, filtering, and selection options.

optionMenuItems.forEach((optionMenuItem) => {
    optionMenuItem.textContent = getOptionMessage(optionMenuItem.id);
    optionPointedGroup.addElement(optionMenuItem);
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

// Functions to display and operate the node of filtering targets.

function _fireFilteringTargetNodeInsertEvent(event) {
  event.target.disabled = true;
  var insertedIndex = optionFilteringPane.getEventNodeIndex(event);
  var insertedEmptyData = createFilteringTargetData();
  optionFilteringData.insertTargetData(insertedIndex, insertedEmptyData);
  insertFilteringTargetNode(insertedIndex, insertedEmptyData);
  if (optionFilteringData.targetDataTotal >= ExtractNews.FILTERING_MAX_COUNT) {
    // Disable to insert data by increasing filtering targets to the maximum.
    optionFilteringPane.disableInsertButtonAll();
  } else {
    optionFilteringPane.focusNode(insertedIndex);
    event.target.disabled = false;
  }
  optionUpdateParagraph.className = "";
  optionFilteringUpdated = true;
  optionApplyButton.disabled = false;
}

function _fireFilteringTargetNameChangeEvent(event) {
  var changedIndex = optionFilteringPane.getEventNodeIndex(event);
  optionFilteringData.getTargetData(changedIndex).name = event.target.value;
  optionUpdateParagraph.className = "";
  optionFilteringUpdated = true;
  optionApplyButton.disabled = false;
}

function _fireFilteringTargetDataInputEvent(event) {
  var targetIndex = optionFilteringPane.getEventNodeIndex(event);
  var targetData = optionFilteringData.getTargetData(targetIndex);
  if (! event.target.classList.contains(FILTERING_TARGET_TERMINATE_BLOCK)) {
    if (targetData.wordsString != "") {
      optionUpdateParagraph.className = "";
      optionFilteringUpdated = true;
      optionApplyButton.disabled = false;
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
      optionUpdateParagraph.className = "";
      optionFilteringUpdated = true;
      optionApplyButton.disabled = false;
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
    optionUpdateParagraph.className = "";
    optionFilteringUpdated = true;
    optionApplyButton.disabled = false;
  }
}

function _fireFilteringTargetWordsLocalizeEvent(event) {
  event.target.disabled = true;
  var targetIndex = optionFilteringPane.getEventNodeIndex(event);
  var targetData = optionFilteringData.getTargetData(targetIndex);
  var wordSet = new Set();
  if (targetData.wordsString != "") {
    targetData.wordsString.split(",").forEach((word) => {
        var targetWord = _Text.trimText(_Text.removeTextZeroWidthSpaces(word));
        if (targetWord != "") {
          var localizedContext = _Text.getLocalizedContext(targetWord);
          wordSet.add(localizedContext.halfwidthText.textString);
          if (localizedContext.hasDifferentWidth()) {
            wordSet.add(localizedContext.fullwidthText.textString);
          }
        }
      });
    var wordsInput = optionFilteringPane.getTargetWordsInput(targetIndex);
    var wordsString = Array.from(wordSet).join(",");
    if (wordsString.length <= _Alert.FILTERING_WORDS_MAX_UTF16_CHARACTERS) {
      wordsInput.value = wordsString;
      targetData.wordsString = wordsString;
      targetData.localizedWordSet = wordSet;
      optionUpdateParagraph.className = "";
      optionFilteringUpdated = true;
      optionApplyButton.disabled = false;
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
  // Set the lock of "Up" or "Down" button pressed on the filtering target.
  event.target.disabled = true;
  var movedUp = event.target.classList.contains(OPERATION_MOVE_UP);
  var movedUpIndex = optionFilteringPane.getEventNodeIndex(event);
  var movedDownIndex = movedUpIndex;
  if (movedUp) {
    movedDownIndex--;
  } else {
    movedUpIndex++;
  }
  optionFilteringData.insertTargetData(
    movedDownIndex, optionFilteringData.removeTargetData(movedUpIndex));
  optionFilteringPane.swapTargetNode(movedUpIndex, movedDownIndex);
  movedUpIndex--;
  movedDownIndex++;
  if (movedDownIndex <= 1) {
    // Move the lower fitering target up to the top of filtering targets.
    if (! movedUp) {
      // Disable "Up" button of the filtering target moved up instead
      // of the target on which the specified event occurs.
      optionFilteringPane.disableButton(movedUpIndex, OPERATION_MOVE_UP);
    } else {
      optionFilteringPane.focusNode(movedUpIndex, OPERATION_MOVE_DOWN);
    }
    optionFilteringPane.enableButton(movedDownIndex, OPERATION_MOVE_UP);
  } else if (movedUp) {
    // Release the lock of "Up" button pressed on the filtering target
    // and focus it if not moved up to the top.
    optionFilteringPane.enableButton(movedUpIndex, OPERATION_MOVE_UP);
    optionFilteringPane.focusNode(movedUpIndex, OPERATION_MOVE_UP);
  }
  if (movedUpIndex >= optionFilteringPane.nodeSize - 3) {
    // Move the upper fitering target down to the bottom except for
    // the policy target.
    if (movedUp) {
      // Disable "Down" button of the filtering target moved down instead
      // of the target on which the specified event occurs.
      optionFilteringPane.disableButton(movedDownIndex, OPERATION_MOVE_DOWN);
    } else {
      optionFilteringPane.focusNode(movedDownIndex, OPERATION_MOVE_UP);
    }
    optionFilteringPane.enableButton(movedUpIndex, OPERATION_MOVE_DOWN);
  } else if (! movedUp) {
    // Release the lock of "Down" button pressed on the filtering target
    // and focus it if not moved down to the bottom except for the policy
    // target.
    optionFilteringPane.enableButton(movedDownIndex, OPERATION_MOVE_DOWN);
    optionFilteringPane.focusNode(movedDownIndex, OPERATION_MOVE_DOWN);
  }
  optionUpdateParagraph.className = "";
  optionFilteringUpdated = true;
  optionApplyButton.disabled = false;
}

function _fireFilteringTargetNodeRemoveEvent(event) {
  event.target.disabled = false;
  var removedTargetDataTotal = optionFilteringData.targetDataTotal;
  var removedIndex = optionFilteringPane.getEventNodeIndex(event);
  optionFilteringData.removeTargetData(removedIndex);
  removeFilteringTargetNode(removedIndex);
  if (removedTargetDataTotal >= ExtractNews.FILTERING_MAX_COUNT) {
    // Enable to insert data by removing a filtering target from the maximum.
    optionFilteringPane.enableInsertButtonAll();
  }
  var focusedOperation = OPERATION_INSERT;
  if (removedIndex < optionFilteringPane.nodeSize - 1) {
    optionFilteringPane.focusNode(removedIndex);
    focusedOperation = OPERATION_REMOVE;
  }
  optionFilteringPane.focusNode(removedIndex, focusedOperation);
  optionUpdateParagraph.className = "";
  optionFilteringUpdated = true;
  optionApplyButton.disabled = false;
}

/*
 * Adds the node of the specified filtering target to this option page.
 */
function addFilteringTargetNode(targetData, policyTargetAdded = false) {
  var addedIndex = optionFilteringPane.nodeSize;
  if (policyTargetAdded) {
    optionFilteringPane.insertTargetNode(
      addedIndex, createTargetNode(targetData, true),
      _fireFilteringTargetNodeInsertEvent, _fireFilteringTargetNodeMoveEvent,
      _fireFilteringTargetNodeRemoveEvent,
      _fireFilteringTargetNameChangeEvent, _fireFilteringTargetDataInputEvent,
      _fireFilteringTargetWordsLocalizeEvent);
  } else {
    insertFilteringTargetNode(addedIndex, targetData);
  }
}

/*
 * Inserts the node of the specified filtering target at the specified index
 * into this option page.
 */
function insertFilteringTargetNode(addedIndex, targetData) {
  optionFilteringPane.insertTargetNode(
    addedIndex, createTargetNode(targetData),
    _fireFilteringTargetNodeInsertEvent, _fireFilteringTargetNodeMoveEvent,
    _fireFilteringTargetNodeRemoveEvent,
    _fireFilteringTargetNameChangeEvent, _fireFilteringTargetDataInputEvent,
    _fireFilteringTargetWordsLocalizeEvent);

  if (addedIndex < optionFilteringPane.nodeSize + 1) {
    // Enable the "Insert" and "Remove" button if not initial addition,
    // and "Up" or "Down" button if not the first or last target.
    var moveUpEnabled = true;
    var moveDownEnabled = true;
    if (addedIndex <= 0) {
      if (optionFilteringPane.nodeSize > 2) {
        optionFilteringPane.enableButton(0, OPERATION_MOVE_UP);
      }
      moveUpEnabled = false;
    }
    if (addedIndex >= optionFilteringPane.nodeSize - 1) {
      if (optionFilteringPane.nodeSize > 2) {
        optionFilteringPane.enableButton(
          optionFilteringPane.nodeSize - 2, OPERATION_MOVE_DOWN);
      }
      moveDownEnabled = false;
    }
    optionFilteringPane.enableAllButtons(
      addedIndex, moveUpEnabled, moveDownEnabled);
  }
}

/*
 * Removes the node of a filtering target for the specified index from this
 * option page.
 */
function removeFilteringTargetNode(removedIndex) {
  optionFilteringPane.removeTargetNode(removedIndex);
  if (optionFilteringPane.nodeSize > 1) {
    // Disable the moved up and down button of the first and last target
    // except for the default filtering target.
    if (removedIndex <= 0) {
      optionFilteringPane.disableButton(0, OPERATION_MOVE_UP);
    }
    if (removedIndex >= optionFilteringPane.nodeSize - 2) {
      optionFilteringPane.disableButton(
        optionFilteringPane.nodeSize - 2, OPERATION_MOVE_DOWN);
    }
  }
}

/*
 * Reflects filtering data appended with targets after the specified index on
 * this option page when it's loaded firstly or imported, or other filtering
 * name is selected.
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
  // Enable to insert, move up or down, and remove the filtering target
  // after all target nodes are appended to the option page.
  for (let i = 0; i < optionFilteringPane.nodeSize; i++) {
    optionFilteringPane.enableAllButtons(
      i, i > 0, i < optionFilteringPane.nodeSize - 2);
  }
  if (optionFilteringData.targetDataTotal >= ExtractNews.FILTERING_MAX_COUNT) {
    // Disable to insert data by increasing filtering targets to the maximum.
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
    optionUpdateParagraph.className = "";
    optionFilteringUpdated = true;
    optionApplyButton.disabled = false;
  });

// Functions to display and operate the node of news selections.

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
  // focused on a news selection, not including "Insert" button.
  }
}

function _fireNewsSelectionNodeMoveEvent(event) {
  // Set the lock of "Up" or "Down" button pressed on the news selection.
  event.target.disabled = true;
  var selectionPageFirstDataIndex =
    SELECTION_PAGE_NODE_SIZE * optionSelectionPageManager.pageIndex;
  var movedUp = event.target.classList.contains(OPERATION_MOVE_UP);
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
    // Move the top node of news selections and its data to the previous page.
    optionSelectionPageManager.movePage(_Event.PAGE_MOVE_BACK_EVENT);
    var focusedIndex = SELECTION_PAGE_NODE_SIZE - 1;
    optionSelectionPane.focusNode(focusedIndex);
    optionSelectionPane.focusNode(focusedIndex, OPERATION_MOVE_UP);
  } else if (movedUpIndex >= SELECTION_PAGE_NODE_SIZE) {
    // Move the bottom node of news selections and its data to the next page.
    optionSelectionPageManager.movePage(_Event.PAGE_MOVE_FORWARD_EVENT);
    var focusedOperation = OPERATION_MOVE_DOWN;
    if (optionSelectionPane.nodeSize <= 2) {
      // Focus "Up" button instead of "Down" disabled on the bottom except
      // for the node to append new data.
      focusedOperation = OPERATION_MOVE_UP;
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
      // Move the lower news selection up to the top of the current page.
      if (! movedUp) {
        // Disable "Up" button of the news selection moved up instead
        // of the selection on which the specified event occurs.
        optionSelectionPane.enableButton(movedUpIndex, OPERATION_MOVE_UP);
      } else {
        optionSelectionPane.focusNode(movedUpIndex, OPERATION_MOVE_DOWN);
      }
      optionSelectionPane.enableButton(movedDownIndex, OPERATION_MOVE_UP);
    } else if (movedUp) {
      // Release the lock of "Up" button pressed on the news selection
      // and focus it if not moved up to the top.
      optionSelectionPane.enableButton(movedUpIndex, OPERATION_MOVE_UP);
      optionSelectionPane.focusNode(movedUpIndex, OPERATION_MOVE_UP);
    }
    var bottomMovedUpIndex = optionSelectionPane.nodeSize - 3;
    if (optionSelectionData.dataSize >= ExtractNews.SELECTION_MAX_COUNT) {
      bottomMovedUpIndex++;
    }
    if (movedUpIndex >= bottomMovedUpIndex
      && optionSelectionPageManager.isLastPageKeeping()) {
      // Move the upper news selection down to the bottom of the current page
      // except for the node to append new data.
      if (movedUp) {
        // Disable "Down" button of the news selection moved down instead
        // of the selection on which the specified event occurs.
        optionSelectionPane.disableButton(movedDownIndex, OPERATION_MOVE_DOWN);
      } else {
        optionSelectionPane.focusNode(movedDownIndex, OPERATION_MOVE_UP);
      }
      optionSelectionPane.enableButton(movedUpIndex, OPERATION_MOVE_DOWN);
    } else if (! movedUp) {
      // Release the lock of "Down" button pressed on the news selection
      // and focus it if not moved down to the bottom except for the node
      // to append new data.
      optionSelectionPane.enableButton(movedDownIndex, OPERATION_MOVE_DOWN);
      optionSelectionPane.focusNode(movedDownIndex, OPERATION_MOVE_DOWN);
    }
  }
  optionUpdateParagraph.className = "";
  optionApplyButton.disabled = false;
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
  // of the index 18 or 19 (optionSelectionPane.nodeSize - 2) is removed,
  // "Append" button is focused, otherwise, "Insert". Any deletion on the last
  // page don't reduce the total of pages.
  //
  // If a news selection of the state A and index 19 is removed on the page
  // which is changed to the last page after the deletion, "Append" button
  // is focused, otherwise, "Insert".
  var focusedOperation = OPERATION_REMOVE;
  if (removedSelectionDataSize < ExtractNews.SELECTION_MAX_COUNT
    && optionSelectionPageManager.isLastPageKeeping()) {
    if (removedIndex >= optionSelectionPane.nodeSize - 1) {
      focusedOperation = OPERATION_APPEND;
    }
  } else if (optionSelectionPane.nodeSize >= SELECTION_PAGE_NODE_SIZE - 1) {
    if (removedSelectionDataSize >= ExtractNews.SELECTION_MAX_COUNT) {
      // Enable to insert data by removing a news selection from the maximum.
      optionSelectionPane.enableInsertButtonAll();
    }
    optionSelectionPageManager.setPageSize(
      Math.ceil(removedSelectionDataSize / SELECTION_PAGE_NODE_SIZE));
    if (removedIndex >= SELECTION_PAGE_NODE_SIZE - 1
      && optionSelectionPageManager.isLastPageKeeping()) {
      focusedOperation = OPERATION_APPEND;
    }
    // Add the element for the top news selection on the next page
    // or to append new data to the selection list.
    var selectionData = undefined;
    var selectionDataIndex =
      SELECTION_PAGE_NODE_SIZE * (optionSelectionPageManager.pageIndex + 1)
      - 1;
    if (selectionDataIndex < optionSelectionData.dataSize) {
      selectionData = optionSelectionData.getData(selectionDataIndex);
    }
    addNewsSelectionNode(selectionData);
    optionSelectionPane.enableAllButtons(SELECTION_PAGE_NODE_SIZE - 1);
  }
  if (removedSelectionDeleteChecked) {
    // Clear the checkbox to delete news selections if never checked.
    optionSelectionPane.setSelectionCheckboxAll();
  }
  optionSelectionPane.focusNode(removedIndex);
  optionSelectionPane.focusNode(removedIndex, focusedOperation);
  optionUpdateParagraph.className = "";
  optionApplyButton.disabled = false;
}

/*
 * Adds the node of the specified news election to this option page.
 */
function addNewsSelectionNode(addedSelectionData) {
  insertNewsSelectionNode(optionSelectionPane.nodeSize, addedSelectionData);
}

/*
 * Inserts the node of the specified news election at the specified index
 * into this option page.
 */
function insertNewsSelectionNode(addedIndex, addedSelectionData) {
  var selectionNode = createSelectionNode(addedSelectionData);
  optionSelectionPane.insertSelectionNode(
    addedIndex, selectionNode, _fireNewsSelectionNodeInsertEvent,
    _fireNewsSelectionNodeMoveEvent, _fireNewsSelectionNodeRemoveEvent,
    _fireNewsSelectionEditPaneOpenEvent);

  // Remove the element over the size of nodes displayed on the current page.
  if (optionSelectionPane.nodeSize > SELECTION_PAGE_NODE_SIZE) {
    removeNewsSelectionNode(SELECTION_PAGE_NODE_SIZE);
  }

  if (addedIndex < optionSelectionPane.nodeSize + 1) {
    // Enable the "Insert" and "Remove" button if not initial addition,
    // and "Up" or "Down" button if not the first or last selection.
    var moveUpEnabled = true;
    var moveDownEnabled = true;
    if (addedIndex <= 0
      && optionSelectionPageManager.isFirstPageKeeping()) {
      if (optionSelectionPane.nodeSize > 2) {
        optionSelectionPane.enableButton(0, OPERATION_MOVE_UP);
      }
      moveUpEnabled = false;
    }
    if (addedIndex >= optionSelectionPane.nodeSize
      && optionSelectionPageManager.isLastPageKeeping()) {
      if (optionSelectionPane.nodeSize > 2) {
        optionSelectionPane.enableButton(
          optionSelectionPane.nodeSize - 2, OPERATION_MOVE_DOWN);
      }
      moveDownEnabled = false;
    }
    optionSelectionPane.enableAllButtons(
      addedIndex, moveUpEnabled, moveDownEnabled);
    if (optionSelectionData.dataSize >= ExtractNews.SELECTION_MAX_COUNT) {
      optionSelectionPane.disableButton(addedIndex, OPERATION_INSERT);
    }
  }
}

/*
 * Removes the node of a news selection for the specified index from this
 * option page.
 */
function removeNewsSelectionNode(removedIndex) {
  optionSelectionPane.removeSelectionNode(removedIndex);
  if (optionSelectionPane.nodeSize > 1) {
    // Disable the moved up and down button of the first and last selection.
    if (removedIndex <= 0
      && optionSelectionPageManager.isFirstPageKeeping()) {
      optionSelectionPageManager.disableButton(0, OPERATION_MOVE_UP);
    }
    if (removedIndex >= optionSelectionPane.nodeSize - 2
      && optionSelectionPageManager.isLastPageKeeping()) {
      var disabledIndex = optionSelectionPane.nodeSize - 2;
      if (removedIndex >= SELECTION_PAGE_NODE_SIZE - 1) {
        disabledIndex++;
      }
      optionSelectionPane.disableButton(disabledIndex, OPERATION_MOVE_DOWN);
    }
  }
}

/*
 * Reflects selection data appended after the specified index on this option
 * page when it's loaded firstly or imported.
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
    // Enable to insert, move up or down, edit, and remove the news selection
    // after all selection nodes are appended to the option page.
    for (let i = 0; i < addedSelectionCount; i++) {
      optionSelectionPane.enableAllButtons(
        i, selectionDataIndex > 0, selectionDataIndex < selectionDataSize - 1);
      selectionDataIndex++;
    }
    if (selectionDataSize >= ExtractNews.SELECTION_MAX_COUNT) {
      // Disable to insert data by increasing news selections to the maximum.
      optionSelectionPane.disableInsertButtonAll();
    }
  }
  if (addedSelectionCount >= optionSelectionPane.nodeSize
    && optionSelectionPane.nodeSize < SELECTION_PAGE_NODE_SIZE) {
    // Add the append button of news selection if has not existed on this page.
    addNewsSelectionNode();
    optionSelectionPane.enableAllButtons(
      optionSelectionPane.nodeSize - 1, false, false);
  }
}

optionSelectionPageManager =
  new _Event.PageListManager((event, pageIndex, previousPageIndex) => {
    if (pageIndex != previousPageIndex) {
      optionSelectionPageManager.setEventTarget(pageIndex);
      optionSelectionPane.clear();
      reflectOptionSelectionData();
    }
  }, optionSelectionPane.pageNumberArray);

// Registers click events to operate the list of news selections or edit pane.

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
    optionUpdateParagraph.className = "";
    optionApplyButton.disabled = false;
  });
optionSelectionEditPane.addLocalizeButtonClickEventListener((event) => {
    var regexpIndex = Number(target.value);
    if (! optionSelectionEditPane.localizeRegularExpression(regexpIndex)) {
      sendOpitonWarningMessage(optionSelectionEditPane.getDataWarning());
    }
  });
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
      // Insert selection data and the div element into the option page
      // for an edited news selection.
      optionSelectionData.insertData(selectionDataIndex, selectionData);
      var selectionNodeTotal = optionSelectionData.dataSize;
      if (selectionNodeTotal >= ExtractNews.SELECTION_MAX_COUNT) {
        // Disable to insert data by increasing news selections to the maximum.
        optionSelectionPane.disableInsertButtonAll();
      } else {
        // Count the node to append new data to the selection list.
        selectionNodeTotal++;
      }
      insertNewsSelectionNode(selectionIndex, selectionData);
      optionSelectionPageManager.setPageSize(
        Math.ceil(selectionNodeTotal / SELECTION_PAGE_NODE_SIZE));
    } else {
      // Replace selection data and update the element on the option page
      // for an edited news selection.
      optionSelectionData.setData(selectionDataIndex, selectionData);
      optionSelectionPane.updateSelectionNode(selectionIndex, selectionData);
    }
    optionSelectionEditPane.close();
    optionUpdateParagraph.className = "";
    optionApplyButton.disabled = false;
  });

// Reads filtering targets, news selections, and favicons from the storage.

function _fireNewsSelectionFaviconListClickEvent(event) {
  var selectionIndex = optionSelectionPane.getEventNodeIndex(event);
  var selectionData =
    optionSelectionData.getData(
      SELECTION_PAGE_NODE_SIZE * optionSelectionPageManager.pageIndex
      + selectionIndex);
  setSelectionOpenedUrl(selectionData, event.target.alt);
  optionSelectionPane.updateSelectionNode(selectionIndex, selectionData);
  optionSelectionPane.focusNode(selectionIndex);
  optionUpdateParagraph.className = "";
  optionApplyButton.disabled = false;
}

{
  const readingPromises = new Array();

  readingPromises.push(
    optionFilteringData.read().then(() => {
        optionFilteringPane.setCategoryNames(optionFilteringData);
        reflectOptionFilteringData();
      }));
  readingPromises.push(
    optionSelectionData.read().then(() => {
        // Set the page number to the header on the list of news selections.
        var selectionNodeTotal = optionSelectionData.dataSize;
        if (selectionNodeTotal < ExtractNews.SELECTION_MAX_COUNT) {
          // Count the node to append new data to the selection list.
          selectionNodeTotal++;
        }
        optionSelectionPageManager.setPageSize(
          Math.ceil(selectionNodeTotal / SELECTION_PAGE_NODE_SIZE));
      }));
  readingPromises.push(
    readSelectionSiteData().then(() => {
        // Registers events to select the favicon read from the storage.
        optionSelectionPane.createFaviconList();
        optionSelectionPane.addFaviconListClickEventListener(
          _fireNewsSelectionFaviconListClickEvent);
      }));

  Promise.all(readingPromises).catch((error) => {
      Debug.printStackTrace(error);
    });
}

// Registers click events to read and write filtering or selection data.

optionImportButton.addEventListener(_Event.CLICK, (event) => {
    importOptionData(
      optionDataMap, optionFilteringData, optionSelectionData).then(() => {
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
        // Send the update data enabled or disabled by checkboxes
        // on the general pane.
        var updatedObject = { };
        optionDataMap.forEach((optionData) => {
            updatedObject = optionData.getUpdatedObject(updatedObject);
          });
        sendOpitonUpdateMessage(updatedObject);
        optionUpdateParagraph.className = "";
        optionApplyButton.disabled = false;
        optionApplyButton.focus();
      }).catch((error) => {
        Debug.printStackTrace(error);
      });
  });
optionExportButton.addEventListener(_Event.CLICK, (event) => {
    exportOptionData(optionDataMap, optionFilteringData, optionSelectionData);
  });
optionApplyButton.addEventListener(_Event.CLICK, (event) => {
    event.target.disabled = true;
    Promise.all(
      Array.of(
        optionFilteringData.write(),
        optionSelectionData.write())).then(() => {
            sendOpitonUpdateMessage({
                filteringUpdated: optionFilteringUpdated
              });
            // Focus the menu list because the "Apply" button is disabled.
            optionMenuManager.getEventTarget().focus();
            optionUpdateParagraph.className = OPTION_GRAYED_OUT;
            optionFilteringUpdated = false;
          }).catch((error) => {
            Debug.printStackTrace(error);
          });
  });

// Registers key events to control the pane of filterings or news selections.

document.body.addEventListener(_Event.KEYDOWN, (event) => {
    switch (event.code) {
    case "Escape":
      if (optionMenuClassList.contains(OPTION_MENU_SELECTION)) {
        if (optionSelectionEditPane.isDisplaying()) {
          // Close the edit pane for a news selection by the escape key.
          optionSelectionEditPane.close(true);
          break;
        } else if (optionSelectionPane.hideFaviconList()) {
          break;
        }
      }
      // Focus the menu list by the escape key pressed on other elements.
      optionMenuManager.getEventTarget().focus();
      break;
    case "PageUp":
    case "PageDown":
      if (optionMenuClassList.contains(OPTION_MENU_FILTERING)) {
        if (optionFilteringPane.containsBlockElement(event.target)) {
          // Focus the first or last filtering target by the page up
          // or down key.
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
        // Focus the first or last news selection by the page up or down key.
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
              // Focus the previous or next filtering target by the arrow
              // up or down key.
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
            if (! optionSelectionPageManager.isFirstPageKeeping()) {
              // Move the page of news selections back by the arrow up key.
              optionSelectionPageManager.movePage(_Event.PAGE_MOVE_BACK_EVENT);
              focusedIndex = optionSelectionPane.nodeSize - 1;
            } else { // Top of news selection nodes
              focusedIndex = 0;
            }
          } else if (focusedIndex >= optionSelectionPane.nodeSize) {
            if (! optionSelectionPageManager.isLastPageKeeping()) {
              // Move the page of news selections forward by the arrow
              // down key.
              optionSelectionPageManager.movePage(
                _Event.PAGE_MOVE_FORWARD_EVENT);
              focusedIndex = 0;
            } else { // Bottom of news selection nodes
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
