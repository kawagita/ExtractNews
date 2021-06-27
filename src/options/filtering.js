/*
 *  Define functions and constant variables for the filtering option.
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
 * Returns data for the specified filtering target on the option page.
 */
function createFilteringTargetData(filteringTarget) {
  var targetData = {
      name: ExtractNews.TARGET_ACCEPT,
      wordsString: "",
      localizedWordSet: undefined,
      blockTerminated: false,
      wordBeginningMatched: false,
      wordEndMatched: false,
      wordsExcluded: false
    };
  if (filteringTarget != undefined) {
    targetData.name = filteringTarget.name;
    targetData.wordsString = filteringTarget.words.join(WORD_SEPARATOR);
    targetData.blockTerminated = filteringTarget.terminatesBlock();
    targetData.wordBeginningMatched = filteringTarget.isWordBeginningMatched();
    targetData.wordEndMatched = filteringTarget.isWordEndMatched();
    targetData.wordsExcluded = filteringTarget.isWordsExcluded();
  }
  return targetData;
}

/*
 * Returns data for the specified filtering on the option page.
 */
function createFilteringCategoryData(filtering) {
  var categoryData = {
      name: filtering.categoryName,
      topicsString: undefined,
      targetDataArray: new Array()
    };
  if (filtering.categoryTopics != undefined) {
    categoryData.topicsString = filtering.categoryTopics.join(WORD_SEPARATOR);
  }
  filtering.targets.forEach((filteringTarget) => {
      categoryData.targetDataArray.push(
        createFilteringTargetData(filteringTarget));
    });
  categoryData.targetDataArray.push(
    createFilteringTargetData(filtering.policyTarget));
  return categoryData;
}

/*
 * Returns true if the specified string is a filtering target name.
 */
function isFilteringTargetName(targetName) {
  return ExtractNews.TARGET_NAME_SET.has(targetName.toUpperCase());
}

const WORD_EMPTY_SEQUENCE_REGEXP = new RegExp("\\" + WORD_ADDITION + "+", "g");

/*
 * Returns the set of words for a filtering target divided from the specified
 * string.
 */
function getFilteringTargetWordSet(wordsString, localized = false) {
  var targetWordSet = new Set();
  wordsString.split(WORD_SEPARATOR).forEach((wordString) => {
      wordString =
        _Text.trimText(
          _Text.removeTextZeroWidthSpaces(wordString)).replace(
            WORD_EMPTY_SEQUENCE_REGEXP, WORD_ADDITION);
      var wordStartIndex = 0;
      var wordEndIndex = wordString.length;
      if (wordString.startsWith(WORD_ADDITION)) {
        wordStartIndex++;
      }
      if (wordString.endsWith(WORD_ADDITION)) {
        wordEndIndex--;
      }
      var targetWord = wordString.substring(wordStartIndex, wordEndIndex);
      if (targetWord != "") {
        if (localized) {
          var localizedContext =
            _Text.getLocalizedContext(targetWord, (codePoint) => {
                return codePoint == WORD_ADDITION.codePointAt(0);
              });
          targetWordSet.add(localizedContext.halfwidthText.textString);
          if (localizedContext.hasDifferentWidth()) {
            targetWordSet.add(localizedContext.fullwidthText.textString);
          }
        } else {
          targetWordSet.add(targetWord);
        }
      }
    });
  return targetWordSet;
}

function _newFilteringTarget(targetData) {
  if (targetData.blockTerminated) {
    return ExtractNews.newFilteringTarget(targetData.name);
  }
  var targetWordSet = targetData.localizedWordSet;
  if (targetWordSet == undefined) {
    targetWordSet = getFilteringTargetWordSet(targetData.wordsString);
  }
  return ExtractNews.newFilteringTarget(
    targetData.name, targetWordSet, targetData.wordBeginningMatched,
    targetData.wordEndMatched, targetData.wordsExcluded);
}

/*
 * The filtering data on the option page.
 */
class FilteringData {
  constructor() {
    this.categoryIds = new Array();
    this.categoryDataArray = new Array();
    this.categorySelectedIndex = -1;
    this._targetDataTotal = 0;
    this.removedCategoryIds = new Array();
  }

  _getCategorySelectedData() {
    if (this.categorySelectedIndex < 0) {
      throw newUnsupportedOperationException();
    }
    return this.categoryDataArray[this.categorySelectedIndex];
  }

  get categoryId() {
    if (this.categorySelectedIndex < 0) {
      throw newUnsupportedOperationException();
    }
    return this.categoryIds[this.categorySelectedIndex];
  }

  get categoryTopicsString() {
    return this._getCategorySelectedData().topicsString;
  }

  set categoryTopicsString(topicsString) {
    this._getCategorySelectedData().topicsString = topicsString;
  }

  get targetDataSize() {
    return this._getCategorySelectedData().targetDataArray.length;
  }

  getTargetData(targetIndex) {
    var targetDataArray = this._getCategorySelectedData().targetDataArray;
    if (targetIndex < 0 || targetIndex >= targetDataArray.length) {
      throw newIndexOutOfBoundsException("target data", targetIndex);
    }
    return targetDataArray[targetIndex];
  }

  insertTargetData(targetIndex, targetData) {
    var targetDataArray = this._getCategorySelectedData().targetDataArray;
    if (targetIndex < 0 || targetIndex >= targetDataArray.length) {
      throw newIndexOutOfBoundsException("target data", targetIndex);
    } else if (targetData == undefined) {
      throw newNullPointerException("targetData");
    }
    targetDataArray.splice(targetIndex, 0, targetData);
    this._targetDataTotal++;
  }

  removeTargetData(targetIndex) {
    var targetDataArray = this._getCategorySelectedData().targetDataArray;
    if (targetIndex < 0 || targetIndex >= targetDataArray.length) {
      throw newIndexOutOfBoundsException("target data", targetIndex);
    }
    this._targetDataTotal--;
    return targetDataArray.splice(targetIndex, 1)[0];
  }

  get targetDataTotal() {
    return this._targetDataTotal;
  }

  /*
   * Selects the filtering category of the specified ID on the option page.
   */
  selectCategory(categoryId) {
    if (categoryId == undefined) {
      throw newNullPointerException("categoryId");
    } else if ((typeof categoryId) != "string") {
      throw newIllegalArgumentException("categoryId");
    }
    for (let i = 0; i < this.categoryIds.length; i++) {
      if (categoryId == this.categoryIds[i]) {
        this.categorySelectedIndex = i;
        return;
      }
    }
    throw newInvalidParameterException(categoryId);
  }

  /*
   * Calls the specified function with the ID and data for each category.
   */
  forEachCategory(callback) {
    for (let i = 0; i < this.categoryIds.length; i++) {
      callback(this.categoryIds[i], this.categoryDataArray[i]);
    }
  }

  /*
   * Replaces filtering data by the specified map.
   */
  replace(filteringMap) {
    if (this.removedCategoryIds.length <= 0) {
      // Remove filtering data for these IDs which are not added after saving
      // its previously from the storage when saved.
      this.categoryIds.forEach((categoryId) => {
          this.removedCategoryIds.push(categoryId);
        });
    }
    this.categoryIds = new Array();
    this.categoryDataArray = new Array();
    this.categorySelectedIndex = 0;
    this._targetDataTotal = 0;
    Debug.printMessage("Replace the filtering data ...");
    filteringMap.forEach((filtering, filteringId) => {
        // Add new filtering data of read or imported targets to the array.
        var categoryData = createFilteringCategoryData(filtering);
        Debug.printJSON(filtering);
        this.categoryDataArray.push(categoryData);
        this.categoryIds.push(filteringId);
        this._targetDataTotal += categoryData.targetDataArray.length;
      });
    // Always put the category for all topics to the last position.
    var categoryIndexforAll =
      this.categoryIds.indexOf(ExtractNews.FILTERING_FOR_ALL);
    if (categoryIndexforAll < 0) { // No category for all topics
      var filtering = ExtractNews.newFiltering();
      filtering.setCategoryName(
        getLocalizedString("FilteringAllCategoryName"));
      filtering.setPolicyTarget(ExtractNews.TARGET_ACCEPT);
      this.categoryDataArray.push(createFilteringCategoryData(filtering));
      this._targetDataTotal++;
    } else {
      if (categoryIndexforAll < this.categoryIds.length - 1) {
        this.categoryDataArray.push(
          this.categoryDataArray.splice(categoryIndexforAll, 1)[0]);
      }
      this.categoryIds.splice(categoryIndexforAll, 1);
    }
    this.categoryIds.push(ExtractNews.FILTERING_FOR_ALL);
  }

  /*
   * Reads filtering data from the storage and return the promise.
   */
  read() {
    return _Storage.readFilteringIds().then((filteringIds) => {
        return _Storage.readFilterings(filteringIds);
      }).then((filteringMap) => {
        this.replace(filteringMap)
      });
  }

  /*
   * Writes filtering data into the storage and return the promise.
   */
  write() {
    return _Storage.removeFilterings(this.removedCategoryIds).then(() => {
        if (this.removedCategoryIds.length > 0) {
          Debug.printMessage(
            "Remove the filtering for " + this.removedCategoryIds.join(", ")
            + ".");
          this.removedCategoryIds = new Array();
        }
        return _Storage.writeFilteringIds(this.categoryIds);
      }).then(() => {
        return _Storage.writeFilterings(this.toMap());
      }).then(() => {
        if (this.categoryIds.length > 0) {
          Debug.printMessage(
            "Write the filtering for " + this.categoryIds.join(", ") + ".");
        }
      });
  }

  /*
   * Returns the map of filterings for this data.
   */
  toMap() {
    var filteringMap = new Map();
    this.forEachCategory((categoryId, categoryData) => {
        var filtering = ExtractNews.newFiltering();
        filtering.setCategoryName(categoryData.name);
        if (categoryId != ExtractNews.FILTERING_FOR_ALL) {
          filtering.setCategoryTopics(
            categoryData.topicsString.split(WORD_SEPARATOR));
        }
        var filteringTargets = new Array();
        var targetDataArray = categoryData.targetDataArray;
        for (let i = 0; i < targetDataArray.length - 1; i++) {
          filteringTargets.push(_newFilteringTarget(targetDataArray[i]));
        }
        filtering.setTargets(filteringTargets);
        filtering.setPolicyTarget(
          targetDataArray[targetDataArray.length - 1].name);
        filteringMap.set(categoryId, filtering);
      });
    return filteringMap;
  }
}

// Variables and functions for the node of filtering targets.

function _getTargetMessage(id) {
  return getOptionMessage("Target" + id);
}

const FILTERING_CATEGORY_FOR_ALL = "for_all";

const FILTERING_BLOCK = "block";

const FILTERING_TARGET_END_OF_BLOCK = "end_of_block";
const FILTERING_TARGET_TERMINATE_BLOCK = "terminate_block";

const FILTERING_TARGET_NAME_MAP = new Map();

ExtractNews.TARGET_NAME_SET.forEach((targetName) => {
    FILTERING_TARGET_NAME_MAP.set(
      targetName, _getTargetMessage(getCapitalizedString(targetName)));
  });

const FILTERING_TARGET_WORDS = "target_words";
const FILTERING_TARGET_WORDS_MATCH_TYPES = [
    ExtractNews.TARGET_WORD_BEGINNING,
    ExtractNews.TARGET_WORD_END
  ];
const FILTERING_TARGET_WORDS_MATCH_LABEL_TEXTS = [
    _getTargetMessage("MatchWordBeginning"),
    _getTargetMessage("MatchWordEnd")
  ];

const FILTERING_TARGET_ANY = "target_any";

function _createTargetNameDiv(name, blockTerminated, policyTargetCreated) {
  var targetNameDiv = document.createElement("div");
  var targetNameSelect = document.createElement("select");
  targetNameDiv.className = "target_name";
  ExtractNews.TARGET_NAME_SET.forEach((targetName) => {
      var targetNameOption = document.createElement("option");
      if (name == targetName) {
        targetNameOption.selected = true;
      }
      targetNameOption.value = targetName;
      targetNameOption.text = FILTERING_TARGET_NAME_MAP.get(targetName);
      targetNameSelect.add(targetNameOption);
    });
  targetNameDiv.appendChild(targetNameSelect);
  if (! policyTargetCreated) {
    var terminateBlockDiv = document.createElement("div");
    var terminateBlockInput = document.createElement("input");
    var terminateBlockLabel = document.createElement("label");
    terminateBlockDiv.className = "checked_option";
    terminateBlockInput.className = FILTERING_TARGET_TERMINATE_BLOCK;
    terminateBlockInput.type = "checkbox";
    terminateBlockInput.checked = blockTerminated;
    terminateBlockLabel.textContent = _getTargetMessage("TerminateBlock");
    terminateBlockDiv.appendChild(terminateBlockInput);
    terminateBlockDiv.appendChild(terminateBlockLabel);
    targetNameDiv.appendChild(terminateBlockDiv);
  }
  return targetNameDiv;
}

function _isTargetBlockTeminated(targetNode) {
  var terminateBlockInput =
    targetNode.querySelector("." + FILTERING_TARGET_TERMINATE_BLOCK);
  if (terminateBlockInput != null) {
    return terminateBlockInput.checked;
  }
  return true;
}

function _createTargetWordsDiv(wordsString, wordsMatches) {
  var targetWordsDiv = document.createElement("div");
  var targetWordsInput = document.createElement("input");
  targetWordsDiv.className = FILTERING_TARGET_WORDS;
  targetWordsInput.value = wordsString;
  targetWordsInput.placeholder =
    getOptionMessage("SeparateTargetWordsByCommas");
  targetWordsInput.maxLength = _Alert.FILTERING_WORDS_MAX_UTF16_CHARACTERS;
  targetWordsDiv.appendChild(targetWordsInput);
  for (let i = 0; i < FILTERING_TARGET_WORDS_MATCH_TYPES.length; i++) {
    var targetWordsMatchDiv = document.createElement("div");
    var targetWordsMatchCheckbox = document.createElement("input");
    var targetWordsMatchLabel = document.createElement("label");
    targetWordsMatchDiv.className = "checked_option";
    targetWordsMatchCheckbox.type = "checkbox";
    targetWordsMatchCheckbox.checked = wordsMatches[i];
    targetWordsMatchCheckbox.value = FILTERING_TARGET_WORDS_MATCH_TYPES[i];
    targetWordsMatchLabel.textContent =
      FILTERING_TARGET_WORDS_MATCH_LABEL_TEXTS[i];
    targetWordsMatchDiv.appendChild(targetWordsMatchCheckbox);
    targetWordsMatchDiv.appendChild(targetWordsMatchLabel);
    targetWordsDiv.appendChild(targetWordsMatchDiv);
  }
  return targetWordsDiv;
}

function _createTargetNode(targetData, policyTargetCreated = false) {
  var targetNode = document.createElement("div");
  var targetAnyDiv = document.createElement("div");
  var targetAnySpan = document.createElement("span");
  var targetDataDiv = document.createElement("div");
  targetNode.className = "target";
  targetAnyDiv.className = FILTERING_TARGET_ANY;
  targetAnySpan.textContent = _getTargetMessage("AnyWordMatched");
  targetAnyDiv.appendChild(targetAnySpan);
  targetDataDiv.tabIndex = 0;
  targetDataDiv.appendChild(
    _createTargetNameDiv(
      targetData.name, targetData.blockTerminated, policyTargetCreated));
  targetDataDiv.appendChild(targetAnyDiv);
  if (! policyTargetCreated) {
    // Create and append the element to select a target name, input target
    // words, and check those options, and operation buttons.
    var targetOperationDiv = createOperationNode();
    var targetExcludeWordsDiv = document.createElement("div");
    var targetExcludeWordsCheckbox = document.createElement("input");
    var targetExcludeWordsLabel = document.createElement("label");
    targetExcludeWordsDiv.className = "checked_option";
    targetExcludeWordsCheckbox.type = "checkbox";
    targetExcludeWordsCheckbox.checked = targetData.wordsExcluded;
    targetExcludeWordsCheckbox.value = ExtractNews.TARGET_WORDS_EXCLUDED;
    targetExcludeWordsLabel.textContent = _getTargetMessage("ExcludeWords");
    targetExcludeWordsDiv.appendChild(targetExcludeWordsCheckbox);
    targetExcludeWordsDiv.appendChild(targetExcludeWordsLabel);
    targetOperationDiv.firstElementChild.appendChild(targetExcludeWordsDiv);
    if (browser.i18n.getUILanguage().startsWith(LANGUAGE_CODE_JA)) {
      var targetLocalizeButton = document.createElement("button");
      targetLocalizeButton.className = OPERATION_LOCALIZE;
      targetLocalizeButton.textContent = getOptionMessage("Localize");
      targetOperationDiv.firstElementChild.appendChild(targetLocalizeButton);
    }
    targetDataDiv.appendChild(
      _createTargetWordsDiv(targetData.wordsString,
        Array.of(targetData.wordBeginningMatched, targetData.wordEndMatched)));
    targetDataDiv.appendChild(targetOperationDiv);
  }
  targetNode.appendChild(createInsertionNode());
  targetNode.appendChild(targetDataDiv);
  return targetNode;
}

function _getTargetFocusedNode(targetNode) {
  if (targetNode.children.length > 1) {
    return targetNode.lastElementChild;
  }
  return null;
}

function _isTargetAnyMatched(targetNode) {
  var targetFocusedNode = _getTargetFocusedNode(targetNode);
  return targetFocusedNode != null
    && targetFocusedNode.lastElementChild.className == FILTERING_TARGET_ANY;
}

/*
 * The pane of filterings focused on this option page.
 */
class FilteringPane extends FocusedOptionPane {
  constructor(focusedNodeGroup) {
    super(focusedNodeGroup);
    this.pane = {
        filteringCategory: document.getElementById("FilteringCategory"),
        filteringCategorySelect:
          getOptionElement("FilteringCategoryName", "select"),
        filteringCategoryTopicsInput:
          getOptionElement("FilteringCategoryTopics", "input"),
        filteringBlocks: document.getElementById("FilteringBlocks")
      };
    this.pane.filteringCategoryTopicsInput.placeholder =
      getOptionMessage("SeparateFilteringCategoryTopicsByCommas");
    getOptionElement("FilteringCategoryAlways");
  }

  changeCategory(categoryId) {
    var categoryOptions = this.pane.filteringCategorySelect.children;
    for (let i = 0; i < categoryOptions.length; i++) {
      if (categoryId == categoryOptions[i].value) {
        categoryOptions[i].selected = true;
        break;
      }
    }
  }

  setCategoryNames(filteringData) {
    if (this.pane.filteringCategorySelect.children.length > 0) {
      var categoryOptions =
        Array.from(this.pane.filteringCategorySelect.children);
      for (let i = 0; i < categoryOptions.length; i++) {
        this.pane.filteringCategorySelect.removeChild(categoryOptions[i]);
      }
    }
    filteringData.forEachCategory((categoryId, categoryData) => {
        var categoryOption = document.createElement("option");
        categoryOption.value = categoryId;
        categoryOption.text = categoryData.name;
        this.pane.filteringCategorySelect.appendChild(categoryOption);
      });
  }

  addCategorySelectChangeEventListener(callback) {
    this.pane.filteringCategorySelect.addEventListener("change", callback);
  }

  setCategoryTopics(categoryTopicsString) {
    this.pane.filteringCategoryTopicsInput.value = categoryTopicsString;
    this.pane.filteringCategory.className = "";
  }

  clearCategoryTopics() {
    this.pane.filteringCategoryTopicsInput.value = "";
    this.pane.filteringCategory.className = FILTERING_CATEGORY_FOR_ALL;
  }

  addCategoryTopicsInputEventListener(callback) {
    this.pane.filteringCategoryTopicsInput.addEventListener("input", callback);
  }

  containsBlockElement(element) {
    return this.pane.filteringBlocks.contains(element);
  }

  /*
   * Creates new block at the specified index to which filtering targets from
   * the its position to the end of block are moved from the previous block.
   */
  _splitBlockAt(targetIndex) {
    var splitBlock = document.createElement("div");
    var nextBlock = null;
    if (targetIndex < this.nodeSize) {
      var targetNode = this.getNode(targetIndex);
      var previousBlock = targetNode.parentNode;
      nextBlock = previousBlock.nextElementSibling;
      do {
        var nextTargetNode = targetNode.nextElementSibling;
        previousBlock.removeChild(targetNode);
        splitBlock.appendChild(targetNode);
        targetNode = nextTargetNode;
      } while (targetNode != null);
    }
    splitBlock.className = FILTERING_BLOCK;
    this.pane.filteringBlocks.insertBefore(splitBlock, nextBlock);
  }

  /*
   * Removes the block at the specified index from which filtering targets from
   * the its position to the end of block are moved to the previous block.
   */
  _joinBlockAt(targetIndex) {
    if (targetIndex < this.nodeSize) {
      var targetNode = this.getNode(targetIndex);
      var joinedBlock = targetNode.parentNode;
      var previousBlock = joinedBlock.previousElementSibling;
      if (previousBlock != null) {
        do {
          var nextTargetNode = targetNode.nextElementSibling;
          joinedBlock.removeChild(targetNode);
          previousBlock.appendChild(targetNode);
          targetNode = nextTargetNode;
        } while (targetNode != null);
        this.pane.filteringBlocks.removeChild(joinedBlock);
      }
    }
  }

  getFocusedNode(targetIndex) {
    return _getTargetFocusedNode(this.getNode(targetIndex));
  }

  insertTargetNode(
    targetIndex, targetData, policyTargetAdded, fireTargetNodeInsertEvent,
    fireTargetNodeMoveEvent, fireTargetNodeRemoveEvent,
    fireTargetNameChangeEvent, fireTargetDataInputEvent,
    fireTargetWordsLocalizeEvent) {
    var targetNode = _createTargetNode(targetData, policyTargetAdded);
    var targetFocusedNode = _getTargetFocusedNode(targetNode);
    if (targetFocusedNode != null) {
      // Set the event listener into elements focused on the target node.
      var targetFocusedNodeGroup = this.getFocusedNodeGroup();
      var targetNameSelect = targetFocusedNode.querySelector("select");
      targetNameSelect.addEventListener("change", fireTargetNameChangeEvent);
      targetFocusedNodeGroup.addFocusedElement(targetFocusedNode);
      targetFocusedNodeGroup.addElement(targetNameSelect);
    }
    super.insertNode(
      targetIndex, targetNode, fireTargetNodeInsertEvent,
      fireTargetNodeMoveEvent, fireTargetNodeRemoveEvent,
      fireTargetDataInputEvent, fireTargetWordsLocalizeEvent);
    // Append the specified target node at the specified index to the block.
    if (targetIndex < this.nodeSize - 1) {
      var nextTargetNode = this.getNode(targetIndex + 1);
      nextTargetNode.parentNode.insertBefore(targetNode, nextTargetNode);
    } else {
      this.pane.filteringBlocks.lastElementChild.appendChild(targetNode);
    }
    if (_isTargetBlockTeminated(targetNode)) {
      // Insert new block and move filtering target nodes in the block
      // at the specified index after the inserted node to it.
      this.toggleTargetEndOfBlock(targetIndex);
    }
  }

  removeTargetNode(targetIndex) {
    var targetNode = this.getNode(targetIndex);
    // Merge the block just after the removed target if the end of a block
    // and not the policy target.
    if (_isTargetBlockTeminated(targetNode)) {
      this.toggleTargetEndOfBlock(targetIndex);
    }
    this.removeNode(targetIndex);
    return targetNode.parentNode.removeChild(targetNode);
  }

  swapTargetNode(movedUpIndex, movedDownIndex) {
    var movedUpNode = this.getNode(movedUpIndex);
    var movedDownNode = this.getNode(movedDownIndex);
    var movedDownBlock = movedDownNode.parentNode;
    this.swapNode(movedUpIndex, movedDownIndex);
    if (movedUpNode.classList.contains(FILTERING_TARGET_END_OF_BLOCK)) {
      var movedDownNextBlock = movedDownBlock.nextElementSibling;
      if (movedDownNode.classList.contains(FILTERING_TARGET_END_OF_BLOCK)) {
        // Swap the last and first target on two adjacent blocks when the next
        // block contains only movedUpNode as the end of block.
        movedDownNextBlock.removeChild(movedUpNode);
        movedDownBlock.insertBefore(movedUpNode, movedDownNode);
      //} else {
      // Drop a target before the last target to the next block.
      }
      movedDownBlock.removeChild(movedDownNode);
      movedDownNextBlock.insertBefore(
        movedDownNode, movedDownNextBlock.firstElementChild)
    } else {
      // Insert the first target of the next block before the last target,
      // or swap two targets on the same block which are not the last.
      movedUpNode.parentNode.removeChild(movedUpNode);
      movedDownBlock.insertBefore(movedUpNode, movedDownNode);
    }
  }

  getTargetWordsInput(targetIndex) {
    var targetFocusedNode = this.getFocusedNode(targetIndex);
    return targetFocusedNode.querySelector(
      "." + FILTERING_TARGET_WORDS + " input");
  }

  /*
   * Toggles the class name "end_of_block" on a target node of the specified
   * index, and splits or joins the filtering block at the next of it.
   */
  toggleTargetEndOfBlock(targetIndex) {
    var targetNode = this.getNode(targetIndex);
    if (targetNode.classList.toggle(FILTERING_TARGET_END_OF_BLOCK)) {
      for (const element of targetNode.querySelectorAll("input")) {
        if (element.type == "checkbox") {
          if (! element.classList.contains(FILTERING_TARGET_TERMINATE_BLOCK)) {
            element.checked = false;
          }
        } else { // Element to input filtering words
          element.value = "";
        }
      }
      if (! _isTargetAnyMatched(targetNode)) {
        // Create new block at the next of a target except for the policy.
        this._splitBlockAt(targetIndex + 1);
      }
    } else {
      this._joinBlockAt(targetIndex + 1);
    }
  }

  clear() {
    super.clear();
    // Remove all blocks and create an empty element of ".block".
    var removedBlocks = Array.from(this.pane.filteringBlocks.children);
    for (let i = removedBlocks.length - 1; i >= 0; i--) {
      this.pane.filteringBlocks.removeChild(removedBlocks[i]);
    }
    var emptyBlock = document.createElement("div");
    emptyBlock.className = FILTERING_BLOCK;
    this.pane.filteringBlocks.appendChild(emptyBlock);
  }

  setEventRelativeGroup(eventGroup) {
    super.setEventRelativeGroup(eventGroup);
    eventGroup.addElements(
      Array.of(
        this.pane.filteringCategorySelect,
        this.pane.filteringCategoryTopicsInput));
  }
}
