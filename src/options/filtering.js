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
    targetData.wordsString = filteringTarget.words.join(",");
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
    categoryData.topicsString = filtering.categoryTopics.join(",");
  }
  filtering.targets.forEach((filteringTarget) => {
      categoryData.targetDataArray.push(
        createFilteringTargetData(filteringTarget));
    });
  categoryData.targetDataArray.push(
    createFilteringTargetData(filtering.policyTarget));
  return categoryData;
}

function _newFilteringTarget(targetData) {
  if (targetData.blockTerminated) {
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
    if (callback != undefined) {
      for (let i = 0; i < this.categoryIds.length; i++) {
        callback(this.categoryIds[i], this.categoryDataArray[i]);
      }
    }
  }

  /*
   * Reads filtering data from the local storage and return the promise.
   */
  read() {
    return _Storage.readFilteringIds().then((filteringIds) => {
        this.categoryIds = filteringIds;
        this.categoryDataArray = new Array();
        return _Storage.readFilterings(filteringIds);
      }).then((filteringMap) => {
        Debug.printMessage(
          "Read filterings for " + this.categoryIds.join(", ") + ".");
        this._targetDataTotal = 0;
        this.categoryIds.forEach((filteringId) => {
            var filtering = filteringMap.get(filteringId);
            var categoryData = createFilteringCategoryData(filtering);
            Debug.printJSON(filtering);
            this.categoryDataArray.push(categoryData);
            this._targetDataTotal += categoryData.targetDataArray.length;
          });
        this.categorySelectedIndex = 0;
        return Promise.resolve();
      });
  }

  /*
   * Imports filtering data from a file and return the promise fulfilled with
   * the index of filtering targets appended to the option page.
   */
  import(dataReplaced = false) {
    var filteringTargetAppendedIndex = 0;
    var filteringTargetTotal = 0;
    if (! dataReplaced) {
      filteringTargetTotal = this._targetDataTotal;
    }
    const importPromise = new Promise((resolve) => {
        _File.importNewsFilterings(
          filteringTargetTotal, (filteringIds, filteringMap) => {
            if (dataReplaced) {
              // Replace the category name or topics, and targets of all
              // filterings with file's data.
              this.categoryIds.forEach((categoryId) => {
                  // Remove these filterings from the local storage when
                  // new filterings are saved on the option page.
                  if (this.removedCategoryIds.indexOf(categoryId) < 0) {
                    this.removedCategoryIds.push(categoryId);
                  }
                });
              this.categoryIds = new Array();
              this.categoryDataArray = new Array();
              this.categorySelectedIndex = 0;
              this._targetDataTotal = 0;
            } else {
              filteringTargetAppendedIndex =
                this._getCategorySelectedData().targetDataArray.length - 1;
            }
            if (filteringIds.length > 0) {
              Debug.printMessage(
                "Import filterings for " + filteringIds.join(", ") + ".");
              filteringIds.forEach((filteringId) => {
                  var filtering = filteringMap.get(filteringId);
                  Debug.printJSON(filtering);
                  for (let i = 0; i < this.categoryDataArray.length; i++) {
                    if (filteringId == this.categoryIds[i]) {
                      // Insert targets before the policy target in filtering
                      // data if has already been existed.
                      var categoryData = this.categoryDataArray[i];
                      var targetDataArray = categoryData.targetDataArray;
                      if (filteringId != ExtractNews.FILTERING_FOR_ALL) {
                        categoryData.categoryTopicsString =
                          filtering.categoryTopics.join(",");
                      }
                      categoryData.name = filtering.categoryName;
                      filtering.targets.forEach((filteringTarget) => {
                          targetDataArray.push(
                            createFilteringTargetData(filteringTarget));
                        });
                      targetDataArray.push(
                        createFilteringTargetData(filtering.policyTarget));
                      this._targetDataTotal += targetDataArray.length;
                      return;
                    }
                  }
                  // Add new filtering data of imported targets to the array.
                  var categoryData = createFilteringCategoryData(filtering);
                  this.categoryDataArray.push(categoryData);
                  this.categoryIds.push(filteringId);
                  this._targetDataTotal += categoryData.targetDataArray.length;
                });
            }
            // Always put the category for all topics to the last position.
            var categoryIndexforAll =
              this.categoryIds.indexOf(ExtractNews.FILTERING_FOR_ALL);
            if (categoryIndexforAll < 0) { // No category for all topics
              var filtering = ExtractNews.newFiltering();
              filtering.setCategoryName(
                ExtractNews.getLocalizedString("AllFilteringCategoryName"));
              filtering.setPolicyTarget(ExtractNews.TARGET_ACCEPT);
              this.categoryDataArray.push(
                createFilteringCategoryData(filtering));
              this._targetDataTotal++;
            } else {
              if (categoryIndexforAll < this.categoryIds.length - 1) {
                this.categoryDataArray.push(
                  this.categoryDataArray.splice(categoryIndexforAll, 1)[0]);
              }
              this.categoryIds.splice(categoryIndexforAll, 1);
            }
            this.categoryIds.push(ExtractNews.FILTERING_FOR_ALL);
            resolve();
          });
      });
    return importPromise.then(() => {
        return Promise.resolve(filteringTargetAppendedIndex);
      });
  }

  _write(callback) {
    var filteringMap = new Map();
    this.forEachCategory((categoryId, categoryData) => {
        var filtering = ExtractNews.newFiltering();
        filtering.setCategoryName(categoryData.name);
        if (categoryId != ExtractNews.FILTERING_FOR_ALL) {
          filtering.setCategoryTopics(
            categoryData.topicsString.split(","));
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
    return callback(this.categoryIds, filteringMap);
  }

  /*
   * Exports filtering data to a file.
   */
  export() {
    this._write((filteringIds, filteringMap) => {
        _File.exportNewsFilterings(filteringIds, filteringMap);
        Debug.printMessage(
          "Export filterings for " + filteringIds.join(", ") + ".");
      });
  }

  /*
   * Saves filtering data to the local storage and return the promise.
   */
  save() {
    return this._write((filteringIds, filteringMap) => {
        return _Storage.removeFilterings(this.removedCategoryIds).then(() => {
            this.removedCategoryIds = new Array();
            return _Storage.writeFilteringIds(filteringIds);
          }).then(() => {
            return _Storage.writeFilterings(filteringMap);
          }).then(() => {
            Debug.printMessage(
              "Save filterings for " + filteringIds.join(", ") + ".");
            return Promise.resolve();
          });
      });
  }
}

function _getTargetMessage(id) {
  return getOptionMessage("Target" + id);
}

// Variables and functions for the node of filtering targets.

const FILTERING_CATEGORY_FOR_ALL = "for_all";

const FILTERING_BLOCK = "block";

const FILTERING_TARGET_END_OF_BLOCK = "end_of_block";
const FILTERING_TARGET_TERMINATE_BLOCK = "terminate_block";
const FILTERING_TARGET_NAME_MAP = new Map();

ExtractNews.TARGET_NAME_SET.forEach((targetName) => {
    var targetNameId =
      targetName.substring(0, 1).toUpperCase()
      + targetName.substring(1).toLowerCase();
    FILTERING_TARGET_NAME_MAP.set(targetName, _getTargetMessage(targetNameId));
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
    var terminateBlockDivInput = document.createElement("input");
    var terminateBlockDivLabel = document.createElement("label");
    terminateBlockDiv.className = "checked_option";
    terminateBlockDivInput.className = FILTERING_TARGET_TERMINATE_BLOCK;
    terminateBlockDivInput.type = "checkbox";
    terminateBlockDivInput.checked = blockTerminated;
    terminateBlockDivLabel.textContent = _getTargetMessage("TerminateBlock");
    terminateBlockDiv.appendChild(terminateBlockDivInput);
    terminateBlockDiv.appendChild(terminateBlockDivLabel);
    targetNameDiv.appendChild(terminateBlockDiv);
  }
  return targetNameDiv;
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

/*
 * Creates the element to set a filtering target and insert the previous.
 */
function createTargetNode(targetData, policyTargetCreated = false) {
  var targetNode = document.createElement("div");
  var targetAnyDiv = document.createElement("div");
  var targetAnySpan = document.createElement("span");
  var targetDataDiv = document.createElement("div");
  targetNode.className = "target";
  targetAnyDiv.className = "target_any";
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
    if (browser.i18n.getUILanguage().startsWith("ja")) { // Zenhankaku button
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

/*
 * The pane of filterings on this option page.
 */
class FilteringPane extends OptionPane {
  constructor(focusedNodeGroup) {
    super("Filtering", focusedNodeGroup);
    this.filtering = {
        category: document.getElementById("FilteringCategory"),
        categorySelect: getOptionElement("FilteringCategoryName", "select"),
        categoryTopicsInput:
          getOptionElement("FilteringCategoryTopics", "input"),
        blocks: document.getElementById("FilteringBlocks")
      };
    this.filtering.categoryTopicsInput.placeholder =
      getOptionMessage("SeparateFilteringCategoryTopicsByCommas");
    getOptionElement("FilteringCategoryAlways");
  }

  changeCategory(categoryId) {
    var categoryOptions = this.filtering.categorySelect.children;
    for (let i = 0; i < categoryOptions.length; i++) {
      if (categoryId == categoryOptions[i].value) {
        categoryOptions[i].selected = true;
        break;
      }
    }
  }

  setCategoryNames(filteringData) {
    if (this.filtering.categorySelect.children.length > 0) {
      var categoryOptions = Array.from(this.filtering.categorySelect.children);
      for (let i = 0; i < categoryOptions.length; i++) {
        this.filtering.categorySelect.removeChild(categoryOptions[i]);
      }
    }
    filteringData.forEachCategory((categoryId, categoryData) => {
        var categoryOption = document.createElement("option");
        categoryOption.value = categoryId;
        categoryOption.text = categoryData.name;
        this.filtering.categorySelect.appendChild(categoryOption);
      });
  }

  addCategorySelectChangeEventListener(callback) {
    this.filtering.categorySelect.addEventListener("change", callback);
  }

  setCategoryTopics(categoryTopicsString) {
    this.filtering.categoryTopicsInput.value = categoryTopicsString;
    this.filtering.category.className = "";
  }

  clearCategoryTopics() {
    this.filtering.categoryTopicsInput.value = "";
    this.filtering.category.className = FILTERING_CATEGORY_FOR_ALL;
  }

  addCategoryTopicsInputEventListener(callback) {
    this.filtering.categoryTopicsInput.addEventListener("input", callback);
  }

  containsBlockElement(element) {
    return this.filtering.blocks.contains(element);
  }

  /*
   * Creates new block at the specified index to which filtering targets from
   * the its position to the end of block are moved from the previous block.
   */
  splitBlockAt(targetIndex) {
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
    this.filtering.blocks.insertBefore(splitBlock, nextBlock);
  }

  /*
   * Removes the block at the specified index from which filtering targets from
   * the its position to the end of block are moved to the previous block.
   */
  joinBlockAt(targetIndex) {
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
        this.filtering.blocks.removeChild(joinedBlock);
      }
    }
  }

  getFocusedNode(targetIndex) {
    return _getTargetFocusedNode(this.getNode(targetIndex));
  }

  insertTargetNode(
    targetIndex, targetNode, fireTargetNodeInsertEvent,
    fireTargetNodeMoveEvent, fireTargetNodeRemoveEvent,
    fireTargetNameChangeEvent, fireTargetDataInputEvent,
    fireTargetWordsLocalizeEvent) {
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
    // Append the specified target node to the block at the specified index.
    if (targetIndex < this.nodeSize - 1) {
      var nextTargetNode = this.getNode(targetIndex + 1);
      nextTargetNode.parentNode.insertBefore(targetNode, nextTargetNode);
    } else {
      this.filtering.blocks.lastElementChild.appendChild(targetNode);
    }
  }

  removeTargetNode(targetIndex) {
    var targetNode = this.removeNode(targetIndex);
    // Merge the block just after the removed target if the end of a block
    // and not the policy target.
    if (targetNode.classList.contains(FILTERING_TARGET_END_OF_BLOCK)) {
      this.joinBlockAt(targetIndex);
    }
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
      // Inserts the first target of the next block before the last target,
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
   * Toggle the class name "end_of_block" on the specified target node.
   */
  toggleTargetEndOfBlock(targetIndex) {
    var targetNode = this.getNode(targetIndex);
    if (targetNode.classList.toggle(FILTERING_TARGET_END_OF_BLOCK)) {
      for (const element of targetNode.querySelectorAll("input")) {
        switch (element.type) {
        case "checkbox":
          if (! element.classList.contains(FILTERING_TARGET_TERMINATE_BLOCK)) {
            element.checked = false;
          }
          break;
        default: // Element to input words
          element.value = "";
        }
      }
    }
  }

  clear() {
    super.clear();
    // Remove all blocks and create an empty element of ".block".
    var removedBlocks = Array.from(this.filtering.blocks.children);
    for (let i = removedBlocks.length - 1; i >= 0; i--) {
      this.filtering.blocks.removeChild(removedBlocks[i]);
    }
    var emptyBlock = document.createElement("div");
    emptyBlock.className = FILTERING_BLOCK;
    this.filtering.blocks.appendChild(emptyBlock);
  }

  setEventRelation(eventGroup) {
    super.setEventRelation(eventGroup);
    eventGroup.addElements(
      Array.of(
        this.filtering.categorySelect, this.filtering.categoryTopicsInput));
  }
}
