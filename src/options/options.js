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

const _Text = ExtractNews.Text;
const _Regexp = ExtractNews.Regexp;
const _Alert = ExtractNews.Alert;
const _Event = ExtractNews.Event;
const _Popup = ExtractNews.Popup;

const OPTION_PAGE_WIDTH =
  Math.floor(document.body.getBoundingClientRect().width);
if (OPTION_PAGE_WIDTH < 560) {
  document.body.className = "narrow";
} else if (OPTION_PAGE_WIDTH < 800) {
  document.body.className = "compact";
}

/*
 * Returns the message on the option page.
 */
function getOptionMessage(id) {
  return browser.i18n.getMessage("option" + id);
}

/*
 * Returns the element for the specified ID or the first element for
 * the specified tag name in its element on this option page.
 */
function getOptionElement(id, tagName) {
  var element = document.getElementById(id);
  var label = element.querySelector("h3, label");
  if (label != null) {
    label.textContent = getOptionMessage(id);
  }
  if (tagName != undefined) {
    element = element.querySelector(tagName);
  }
  return element;
}

/*
 * Returns the button element on this option page.
 */
function getOptionButton(id) {
  var button = document.getElementById(id);
  button.textContent = getOptionMessage(id);
  return button;
}

const ON_OPTION_TAB = " on Option Tab";

/*
 * Sends the specified warning message on this option page to the background.
 */
function sendOpitonWarningMessage(warning) {
  callAsynchronousAPI(browser.tabs.getCurrent).then((tab) => {
      return ExtractNews.sendRuntimeMessage({
          command: ExtractNews.COMMAND_DIALOG_OPEN,
          tabId: tab.id,
          warning: warning.toObject()
        }, ON_OPTION_TAB + " " + tab.id);
    }).catch((error) => {
      Debug.printStackTrace(error);
    });
}

// Creates and displays elements on the general setting firstly.

var optionPointedGroup = new _Event.PointedGroup();

{
  var enablingSiteDiv = getOptionElement("EnablingSite", "div");
  var enablingSiteInputs = new Array();
  var advancedHeading = getOptionElement("Advanced");
  var disableFilteringInput = getOptionElement("DisableFiltering", "input");
  var debugInput = getOptionElement("DebugExtension", "input");

  ExtractNews.getNewsSitePages().forEach((newsSitePage) => {
      var siteDiv = document.createElement("div");
      var siteInput = document.createElement("input");
      var siteLabel = document.createElement("label");
      siteDiv.className = "checked_option";
      siteInput.type = "checkbox";
      siteInput.value = newsSitePage.getSiteId();
      siteInput.addEventListener("input", (event) => {
          var siteId = event.target.value;
          ExtractNews.setEnabledSite(siteId, event.target.checked).then(() => {
              return ExtractNews.sendRuntimeMessage({
                  command: ExtractNews.COMMAND_SETTING_UPDATE,
                  siteId: siteId
                }, ON_OPTION_TAB);
            }).catch((error) => {
              Debug.printStackTrace(error);
            });
        });
      optionPointedGroup.addElement(siteInput);
      siteLabel.textContent =
        ExtractNews.getLocalizedString(siteInput.value + "Name");
      siteDiv.appendChild(siteInput);
      siteDiv.appendChild(siteLabel);
      enablingSiteDiv.appendChild(siteDiv);
      enablingSiteInputs.push(siteInput);
    });

  const displayingPromises = new Array();

  displayingPromises.push(
    ExtractNews.getEnabledSites().then((enabledSiteIdSet) => {
        // Set checkboxes to each state whether the news site is enabled.
        enablingSiteInputs.forEach((siteInput) => {
            if (enabledSiteIdSet.has(siteInput.value)) {
              siteInput.checked = true;
            }
          });
      }),
    ExtractNews.getFilteringDisabled().then((filteringDisabled) => {
        // Set the checkbox to the state whether word filterings are disabled
        // and register the listener to it.
        disableFilteringInput.checked = filteringDisabled;
        disableFilteringInput.addEventListener("input", (event) => {
            ExtractNews.setFilteringDisabled(event.target.checked).then(() => {
                return ExtractNews.sendRuntimeMessage({
                    command: ExtractNews.COMMAND_SETTING_UPDATE,
                    filteringDisabled: event.target.checked
                  }, ON_OPTION_TAB);
              }).catch((error) => {
                Debug.printStackTrace(error);
              });
          });
        optionPointedGroup.addElement(disableFilteringInput);
        return ;
      }),
    ExtractNews.getDebugMode().then((debugOn) => {
        // Set the checkbox to the state whether the debug mode is turned on
        // and register the listener to it.
        debugInput.checked = debugOn;
        debugInput.addEventListener("input", (event) => {
            ExtractNews.setDebugMode(event.target.checked).then(() => {
                return ExtractNews.sendRuntimeMessage({
                    command: ExtractNews.COMMAND_SETTING_UPDATE,
                    debugOn: event.target.checked
                  }, ON_OPTION_TAB);
              }).catch((error) => {
                Debug.printStackTrace(error);
              });
          });
        optionPointedGroup.addElement(debugInput);
      }));
  Promise.all(displayingPromises).catch((error) => {
      Debug.printStackTrace(error);
    });
}

// Variables to localize or operate a filtering target or news selection.

const OPERATION_INSERT = "insert";
const OPERATION_APPEND = "append";

const OPERATION_LOCALIZE = "localize";
const OPERATION_MOVE_UP = "up";
const OPERATION_MOVE_DOWN = "down";
const OPERATION_EDIT = "edit";
const OPERATION_REMOVE = "remove";

const OPERATIONS = [ "Up", "Down", "Edit", "Remove" ];

/*
 * Creates the div element to insert a filtering target or news selection.
 */
function createInsertionDiv(appended = false) {
  var insertDiv = document.createElement("div");
  var insertHr = document.createElement("hr");
  var insertButton = document.createElement("button");
  insertDiv.className = "insertion";
  if (! appended) {
    insertButton.className = OPERATION_INSERT;
    insertButton.textContent = getOptionMessage("Insert");
  } else {
    insertButton.className = OPERATION_APPEND;
    insertButton.textContent = getOptionMessage("Append");
  }
  insertButton.disabled = true;
  insertDiv.appendChild(insertHr);
  insertDiv.appendChild(insertButton);
  return insertDiv;
}

/*
 * Creates the div element to move up or down, or remove a filtering target
 * or news selection.
 */
function createOperationDiv(operations = OPERATIONS) {
  var operationDiv = document.createElement("div");
  var operationButtonDiv = document.createElement("div");
  operationDiv.className = "operation";
  for (let i = 0; i < operations.length; i++) {
    var operationButton = document.createElement("button");
    operationButton.className = operations[i].toLowerCase();
    operationButton.textContent = getOptionMessage(operations[i]);
    operationButton.disabled = true;
    operationButtonDiv.appendChild(operationButton);
  }
  operationDiv.appendChild(operationButtonDiv);
  return operationDiv;
}

// Returns the message of a filtering target.

function _getTargetMessage(id) {
  return getOptionMessage("Target" + id);
}

const FILTERING_TARGET_TERMINATE_BLOCK = "terminate_block";
const FILTERING_TARGET_NAME_MAP = new Map();

ExtractNews.TARGET_NAME_SET.forEach((targetName) => {
    var targetNameId =
      targetName.substring(0, 1).toUpperCase()
      + targetName.substring(1).toLowerCase();
    FILTERING_TARGET_NAME_MAP.set(targetName, _getTargetMessage(targetNameId));
  });

/*
 * Creates the select element created and set with option elements
 * for target names.
 */
function createTargetNameDiv(name, blorkTerminated, policyTargetCreated) {
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
    terminateBlockDivInput.checked = blorkTerminated;
    terminateBlockDivLabel.textContent = _getTargetMessage("TerminateBlock");
    terminateBlockDiv.appendChild(terminateBlockDivInput);
    terminateBlockDiv.appendChild(terminateBlockDivLabel);
    targetNameDiv.appendChild(terminateBlockDiv);
  }
  return targetNameDiv;
}

const FILTERING_TARGET_WORDS_NEGATIVE = "target_words_negative";

/*
 * Creates the div element created and set with a span and checkbox element
 * for negative words.
 */
function createTargetWordsNegativeDiv(negative) {
  var targetWordsNegativeDiv = document.createElement("div");
  var targetWordsNegativeInput = document.createElement("input");
  var targetWordsNegativeLabel = document.createElement("label");
  targetWordsNegativeDiv.className =
    FILTERING_TARGET_WORDS_NEGATIVE + " checked_option";
  targetWordsNegativeInput.type = "checkbox";
  targetWordsNegativeInput.checked = negative;
  targetWordsNegativeInput.value = ExtractNews.TARGET_WORD_NEGATIVE;
  targetWordsNegativeInput.title = _getTargetMessage("WordNegative");
  targetWordsNegativeLabel.textContent = String.fromCodePoint(0x2757);
  targetWordsNegativeDiv.appendChild(targetWordsNegativeInput);
  targetWordsNegativeDiv.appendChild(targetWordsNegativeLabel);
  return targetWordsNegativeDiv;
}

function _changeTargetWordsNegativeLabel(targetDiv, negativeCleared = false) {
  var targetWordsNegativeLabel =
    targetDiv.querySelector("." + FILTERING_TARGET_WORDS_NEGATIVE + " label");
  if (targetWordsNegativeLabel != null) {
    if (negativeCleared) {
      targetWordsNegativeLabel.className = "";
    } else {
      targetWordsNegativeLabel.classList.toggle("negative");
    }
  }
}

const FILTERING_TARGET_WORDS = "target_words";
const FILTERING_TARGET_WORDS_INPUT = "target_words_input";
const FILTERING_TARGET_WORDS_MATCH_TYPES = [
    ExtractNews.TARGET_WORD_BEGINNING,
    ExtractNews.TARGET_WORD_END
  ];
const FILTERING_TARGET_WORDS_MATCH_LABEL_TEXTS = [
    _getTargetMessage("MatchWordBeginning"),
    _getTargetMessage("MatchWordEnd")
  ];

/*
 * Creates the div element created and set with a text input and checkbox
 * elements for target words.
 */
function createTargetWordsDiv(wordsString, wordsMatches, wordNegative) {
  var targetWordsDiv = document.createElement("div");
  var targetWordsInput = document.createElement("input");
  var targetWordsMatch = document.createElement("div");
  targetWordsDiv.className = FILTERING_TARGET_WORDS;
  targetWordsInput.placeholder = getOptionMessage("InputTargetWords");
  targetWordsInput.className = FILTERING_TARGET_WORDS_INPUT;
  targetWordsInput.value = wordsString;
  targetWordsMatch.className = "checked_option";
  for (let i = 0; i < FILTERING_TARGET_WORDS_MATCH_TYPES.length; i++) {
    var targetWordsMatchCheckbox = document.createElement("input");
    var targetWordsMatchLabel = document.createElement("label");
    targetWordsMatchCheckbox.type = "checkbox";
    targetWordsMatchCheckbox.checked = wordsMatches[i];
    targetWordsMatchCheckbox.value = FILTERING_TARGET_WORDS_MATCH_TYPES[i];
    targetWordsMatchLabel.textContent =
      FILTERING_TARGET_WORDS_MATCH_LABEL_TEXTS[i];
    targetWordsMatch.appendChild(targetWordsMatchCheckbox);
    targetWordsMatch.appendChild(targetWordsMatchLabel);
  }
  targetWordsDiv.appendChild(createTargetWordsNegativeDiv(wordNegative));
  targetWordsDiv.appendChild(targetWordsInput);
  targetWordsDiv.appendChild(targetWordsMatch);
  return targetWordsDiv;
}

// Returns the node of a filtering target on which the specified event occurs.

const FILTERING_TARGET = "target";

function _getEventTargetDiv(event) {
  var target = event.target;
  do {
    target = target.parentNode;
  } while (! target.classList.contains(FILTERING_TARGET));
  return target;
}

const FILTERING_TARGET_END_OF_BLOCK = "end_of_block";
const FILTERING_TARGET_OPERATIONS = [ "Up", "Down", "Remove" ];

/*
 * Creates the div element to set a filtering target and insert the previous.
 */
function createTargetDiv(targetData, policyTargetCreated = false) {
  var targetDiv = document.createElement("div");
  var targetAnyDiv = document.createElement("div");
  var targetAnySpan = document.createElement("span");
  var targetDataDiv = document.createElement("div");
  targetDiv.className = FILTERING_TARGET;
  targetAnyDiv.className = "target_any";
  targetAnySpan.textContent = _getTargetMessage("AnyWordMatched");
  targetAnyDiv.appendChild(targetAnySpan);
  targetDataDiv.appendChild(
    createTargetNameDiv(
      targetData.name, targetData.blorkTerminated, policyTargetCreated));
  targetDataDiv.appendChild(targetAnyDiv);
  if (! policyTargetCreated) {
    var targetOperationDiv = createOperationDiv(FILTERING_TARGET_OPERATIONS);
    if (browser.i18n.getUILanguage().startsWith("ja")) {
      var targetLocalizeButton = document.createElement("button");
      targetLocalizeButton.className = OPERATION_LOCALIZE;
      targetLocalizeButton.textContent = getOptionMessage("Localize");
      targetOperationDiv.insertBefore(
        targetLocalizeButton, targetOperationDiv.firstElementChild);
    }
    targetDataDiv.appendChild(
      createTargetWordsDiv(targetData.wordsString,
        Array.of(targetData.wordBeginningMatched, targetData.wordEndMatched),
        targetData.wordNegative));
    targetDataDiv.appendChild(targetOperationDiv);
  }
  targetDiv.appendChild(createInsertionDiv());
  targetDiv.appendChild(targetDataDiv);
  return targetDiv;
}

function _toggleTargetDivEndOfBlock(targetDiv) {
  if (targetDiv.classList.toggle(FILTERING_TARGET_END_OF_BLOCK)) {
    for (const input of targetDiv.querySelectorAll("input")) {
      switch (input.type) {
      case "checkbox":
        if (! input.classList.contains(FILTERING_TARGET_TERMINATE_BLOCK)) {
          input.checked = false;
        }
        break;
      default: // Element to input words
        input.value = "";
      }
    }
  }
}

// Returns the node of a news selection on which the specified event occurs.

const SELECTION_SETTING = "setting";

function _getEventSelectionDiv(event) {
  var target = event.target;
  do {
    target = target.parentNode;
  } while (! target.classList.contains(SELECTION_SETTING));
  return target;
}

/*
 * Creates the div element to set a news selection and insert the previous.
 */
function createSelectionDiv(selectionData) {
  var selectionDiv = document.createElement("div");
  var selectionDataDiv = document.createElement("div");
  var selectionAppended = true;
  selectionDiv.className = SELECTION_SETTING;
  if (selectionData != undefined) {
    var selectionCheckbox = document.createElement("input");
    var selectionLabel = document.createElement("label");
    var selectionImg = document.createElement("img");
    var selectionFavicon =
      OPTION_SELECTION_FAVICON_MAP.get(selectionData.faviconId);
    if (selectionFavicon == undefined) {
      selectionFavicon = OPTION_SELECTION_DEFAULT_FAVICON;
    }
    selectionCheckbox.type = "checkbox";
    selectionLabel.className = "setting_name";
    selectionLabel.textContent = selectionData.settingName;
    selectionImg.className = "favicon";
    selectionImg.src = selectionFavicon;
    selectionDataDiv.appendChild(selectionCheckbox);
    selectionDataDiv.appendChild(selectionLabel);
    selectionDataDiv.appendChild(selectionImg);
    selectionDataDiv.appendChild(createOperationDiv());
    selectionAppended = false;
  }
  selectionDiv.appendChild(createInsertionDiv(selectionAppended));
  selectionDiv.appendChild(selectionDataDiv);
  return selectionDiv;
}

/*
 * Updates the specified div element by the specified data of a news selection.
 */
function updateSelectionDiv(selectionDiv, selectionData) {
  var selectionLabel = selectionDiv.querySelector("label");
  var selectionImg = selectionDiv.querySelector("img");
  var selectionFavicon =
      OPTION_SELECTION_FAVICON_MAP.get(selectionData.faviconId);
  if (selectionFavicon == undefined) {
    selectionFavicon = OPTION_SELECTION_DEFAULT_FAVICON;
  }
  selectionLabel.textContent = selectionData.settingName;
  selectionImg.src = selectionFavicon;
}

// Enables buttons on the specified div element of a filtering target
// or news selection.

function _setButtonsEnabled(
  targetDiv, movedUpButtonEnabled = true, movedDownButtonEnabled = true) {
  for (const button of targetDiv.querySelectorAll("button")) {
    if (button.className == OPERATION_MOVE_UP) {
      button.disabled = ! movedUpButtonEnabled;
    } else if (button.className == OPERATION_MOVE_DOWN) {
      button.disabled = ! movedDownButtonEnabled;
    } else {
      button.disabled = false;
    }
  }
}

function _setButtonEnabled(targetDiv, enabledOperation) {
  targetDiv.querySelector("." + enabledOperation).disabled = false;
}

function _setButtonDisabled(targetDiv, disabledOperation) {
  targetDiv.querySelector("." + disabledOperation).disabled = true;
}

function _focusButton(targetDiv, focusedOperation) {
  targetDiv.querySelector("." + focusedOperation).focus();
}

var optionMenuManager;
var optionMenuItems = Array.from(document.querySelectorAll("#OptionMenu li"));
var optionSection = document.getElementById("Options");
var optionDataUpdateParagraph = optionSection.querySelector("#DataUpdate p");
var optionDataReplacementCheckbox =
  getOptionElement("DataReplacement", "input");
var optionDataReplacementCheckedMap = new Map();

const OPTION_GENERAL = "general";
const OPTION_FILTERING = "filtering";
const OPTION_SELECTION = "selection";

const OPTION_DATA_DESCRIPTION = getOptionMessage("DataDescription");

var optionImportButton = getOptionButton("Import");
var optionExportButton = getOptionButton("Export");
var optionSaveButton = getOptionButton("Save");
var optionSaveDisabledMap = new Map();

optionImportButton.disabled = true;
optionExportButton.disabled = true;
optionSaveButton.disabled = true;

optionPointedGroup.addElements(
  optionDataReplacementCheckbox, optionImportButton,
  optionExportButton, optionSaveButton);

var optionFiltering = new OptionFiltering();
var optionFilteringDiv = document.getElementById("FilteringOption");
var optionFilteringTargetNodes = new Array();
var optionFilteringPointedGroup = new _Event.PointedGroup();

optionPointedGroup.setEventRelation(optionFilteringPointedGroup);

// Returns data of a filtering target for the select, input, or button element
// on which the specified event occurs.

function _getEventTargetData(event) {
  var targetDiv = _getEventTargetDiv(event);
  var targetIndex = optionFilteringTargetNodes.indexOf(targetDiv);
  return optionFiltering.getTargetData(targetIndex);
}

const FILTERING_BLOCK = "block";

/*
 * Split the block at the specified index of a filtering target.
 */
function splitFilteringBlockAt(targetIndex) {
  var splitBlockDiv = document.createElement("div");
  var splitBlockNextDiv = null;
  if (targetIndex < optionFilteringTargetNodes.length) {
    var targetDiv = optionFilteringTargetNodes[targetIndex];
    var splitBlockPreviousDiv = targetDiv.parentNode;
    splitBlockNextDiv = splitBlockPreviousDiv.nextElementSibling;
    do {
      var targetNextDiv = targetDiv.nextElementSibling;
      splitBlockPreviousDiv.removeChild(targetDiv);
      splitBlockDiv.appendChild(targetDiv);
      targetDiv = targetNextDiv;
    } while (targetDiv != null);
  }
  splitBlockDiv.className = FILTERING_BLOCK;
  optionFilteringDiv.insertBefore(splitBlockDiv, splitBlockNextDiv);
}

/*
 * Joins the block at the specified index of a filtering target.
 */
function joinFilteringBlockAt(targetIndex) {
  if (targetIndex < optionFilteringTargetNodes.length) {
    var targetDiv = optionFilteringTargetNodes[targetIndex];
    var joinedBlockDiv = targetDiv.parentNode;
    var joinedBlockPreviousDiv = joinedBlockDiv.previousElementSibling;
    if (joinedBlockPreviousDiv != null) {
      do {
        var targetNextDiv = targetDiv.nextElementSibling;
        joinedBlockDiv.removeChild(targetDiv);
        joinedBlockPreviousDiv.appendChild(targetDiv);
        targetDiv = targetNextDiv;
      } while (targetDiv != null);
      optionFilteringDiv.removeChild(joinedBlockDiv);
    }
  }
}

/*
 * Adds the node of the specified filtering target to this option page.
 */
function addFilteringTargetNode(targetData, policyTargetAdded = false) {
  insertFilteringTargetNode(
    optionFilteringTargetNodes.length, targetData, policyTargetAdded);
}

function _fireFilteringTargetMoveEvent(event, targetMovedUp) {
  var targetDiv = _getEventTargetDiv(event);
  var movedUpDiv = targetDiv;
  var movedUpIndex = optionFilteringTargetNodes.indexOf(targetDiv);
  var movedDownDiv = movedUpDiv;
  var movedDownIndex = movedUpIndex;
  if (targetMovedUp) {
    // Set the lock of "Up" button pressed on the filtering target.
    _setButtonDisabled(movedUpDiv, OPERATION_MOVE_UP);
    movedDownIndex--;
    movedDownDiv = optionFilteringTargetNodes[movedDownIndex];
  } else {
    // Set the lock of "Down" button pressed on the filtering target.
    _setButtonDisabled(movedDownDiv, OPERATION_MOVE_DOWN);
    movedUpIndex++;
    movedUpDiv = optionFilteringTargetNodes[movedUpIndex];
  }
  optionFiltering.insertTargetData(
    movedDownIndex, optionFiltering.removeTargetData(movedUpIndex));
  optionFilteringTargetNodes.splice(movedUpIndex, 1);
  optionFilteringTargetNodes.splice(movedDownIndex, 0, movedUpDiv);
  var movedDownBlockDiv = movedDownDiv.parentNode;
  if (movedUpDiv.classList.contains(FILTERING_TARGET_END_OF_BLOCK)) {
    var movedDownBlockNextDiv = movedDownBlockDiv.nextElementSibling;
    if (movedDownDiv.classList.contains(FILTERING_TARGET_END_OF_BLOCK)) {
      // Swap the last and first target on two adjacent blocks. The next block
      // contains only "movedUpDiv" as the end of block.
      movedDownBlockNextDiv.removeChild(movedUpDiv);
      movedDownBlockDiv.insertBefore(movedUpDiv, movedDownDiv);
    //} else {
    // Drop a target before the last target to the next block.
    }
    movedDownBlockDiv.removeChild(movedDownDiv);
    movedDownBlockNextDiv.insertBefore(
      movedDownDiv, movedDownBlockNextDiv.firstElementChild)
  } else {
    // Inserts the first target of the next block before the last target,
    // or swap two targets on the same block which are not the last.
    movedUpDiv.parentNode.removeChild(movedUpDiv);
    movedDownBlockDiv.insertBefore(movedUpDiv, movedDownDiv);
  }
  if (movedDownIndex <= 0) {
    // The lower fitering target is moved up to the top of filtering targets.
    if (! targetMovedUp) {
      // Disable "Up" button of a filtering target moved up instead
      // of the target on which the specified event occurs.
      _setButtonDisabled(movedUpDiv, OPERATION_MOVE_UP);
    } else {
      _focusButton(movedUpDiv, OPERATION_MOVE_DOWN);
    }
    _setButtonEnabled(movedDownDiv, OPERATION_MOVE_UP);
  } else if (targetMovedUp) {
    // Release the lock of "Up" button pressed on a filtering target
    // and focus it if not moved up to the top.
    _setButtonEnabled(movedUpDiv, OPERATION_MOVE_UP);
    _focusButton(movedUpDiv, OPERATION_MOVE_UP);
  }
  if (movedUpIndex >= optionFilteringTargetNodes.length - 2) {
    // The upper fitering target is moved down to the bottom except for
    // the policy target.
    if (targetMovedUp) {
      // Disable "Down" button of a filtering target moved down instead
      // of the target on which the specified event occurs.
      _setButtonDisabled(movedDownDiv, OPERATION_MOVE_DOWN);
    } else {
      _focusButton(movedDownDiv, OPERATION_MOVE_UP);
    }
    _setButtonEnabled(movedUpDiv, OPERATION_MOVE_DOWN);
  } else if (! targetMovedUp) {
    // Release the lock of "Down" button pressed on a filtering target
    // and focus it if not moved down to the bottom except for the policy
    // target.
    _setButtonEnabled(movedDownDiv, OPERATION_MOVE_DOWN);
    _focusButton(movedDownDiv, OPERATION_MOVE_DOWN);
  }
  optionSaveButton.disabled = false;
}

/*
 * Inserts the node of the specified filtering target at the specified index
 * into this option page.
 */
function insertFilteringTargetNode(
  targetIndex, targetData, policyTargetAdded = false) {
  var movedDownEnabledTarget = null;
  var movedUpEnabledTarget = null;
  var addedBlockDiv = optionFilteringDiv.lastElementChild;
  var addedTargetDiv = createTargetDiv(targetData, policyTargetAdded);
  var addedTargetNextDiv = null;
  if (targetIndex < optionFilteringTargetNodes.length) {
    // Enable the inserted and removed button if not initial addition,
    // and the moved up or down button if not the first or last target.
    var movedUpButtonEnabled = true;
    var movedDownButtonEnabled = true;
    if (targetIndex <= 0) {
      if (optionFilteringTargetNodes.length > 1) {
        movedUpEnabledTarget = optionFilteringTargetNodes[0];
      }
      movedUpButtonEnabled = false;
    }
    if (targetIndex >= optionFilteringTargetNodes.length - 1) {
      if (optionFilteringTargetNodes.length > 1) {
        movedDownEnabledTarget =
          optionFilteringTargetNodes[optionFilteringTargetNodes.length - 2];
      }
      movedDownButtonEnabled = false;
    }
    _setButtonsEnabled(addedTargetDiv,
      movedUpButtonEnabled, movedDownButtonEnabled);
    addedBlockDiv = optionFilteringTargetNodes[targetIndex].parentNode;
  }
  var addedTargetTypeSelect = addedTargetDiv.querySelector("select");
  addedTargetTypeSelect.addEventListener("change", (event) => {
      _getEventTargetData(event).name = event.target.value;
      optionSaveButton.disabled = false;
    });
  addedTargetTypeSelect.addEventListener("focus", (event) => {
      optionPointedGroup.clearEventTarget();
      optionFilteringPointedGroup.clearEventTarget();
    });
  for (const input of addedTargetDiv.querySelectorAll("input")) {
    if (input.className != FILTERING_TARGET_TERMINATE_BLOCK) {
      switch (input.value) {
      case ExtractNews.TARGET_WORD_BEGINNING:
        input.addEventListener("input", (event) => {
            var inputData = _getEventTargetData(event);
            inputData.wordBeginningMatched = event.target.checked;
            if (inputData.wordsString != "") {
              optionSaveButton.disabled = false;
            }
          });
        optionFilteringPointedGroup.addElement(input);
        break;
      case ExtractNews.TARGET_WORD_END:
        input.addEventListener("input", (event) => {
            var inputData = _getEventTargetData(event);
            inputData.wordEndMatched = event.target.checked;
            if (inputData.wordsString != "") {
              optionSaveButton.disabled = false;
            }
          });
        optionFilteringPointedGroup.addElement(input);
        break;
      case ExtractNews.TARGET_WORD_NEGATIVE:
        input.addEventListener("input", (event) => {
            var inputData = _getEventTargetData(event);
            inputData.wordNegative = event.target.checked;
            if (inputData.wordsString != "") {
              optionSaveButton.disabled = false;
            }
            _changeTargetWordsNegativeLabel(_getEventTargetDiv(event));
          });
        if (targetData.wordNegative) {
          _changeTargetWordsNegativeLabel(addedTargetDiv);
        }
        optionFilteringPointedGroup.addElement(input);
        break;
      default: // Words input
        input.addEventListener("input", (event) => {
            var inputData = _getEventTargetData(event);
            inputData.wordsString = event.target.value;
            inputData.localizedWordSet = undefined;
            optionSaveButton.disabled = false;
          });
        input.addEventListener("focus", (event) => {
            optionPointedGroup.clearEventTarget();
            optionFilteringPointedGroup.clearEventTarget();
          });
      }
    } else { // Terminate block checkbox
      input.addEventListener("input", (event) => {
          var targetDiv = _getEventTargetDiv(event);
          var inputIndex = optionFilteringTargetNodes.indexOf(targetDiv);
          var inputData = optionFiltering.getTargetData(inputIndex);
          inputData.blorkTerminated = event.target.checked;
          if (inputData.blorkTerminated) {
            inputData.wordsString = "";
            inputData.localizedWordSet = undefined;
            inputData.wordBeginningMatched = false;
            inputData.wordEndMatched = false;
            inputData.wordNegative = false;
            splitFilteringBlockAt(inputIndex + 1);
            _changeTargetWordsNegativeLabel(targetDiv, true);
          } else {
            joinFilteringBlockAt(inputIndex + 1);
          }
          _toggleTargetDivEndOfBlock(targetDiv);
          optionSaveButton.disabled = false;
        });
      optionFilteringPointedGroup.addElement(input);
    }
  }
  for (const button of addedTargetDiv.querySelectorAll("button")) {
    switch (button.className) {
    case OPERATION_INSERT:
      button.addEventListener(_Event.CLICK, (event) => {
          var focusedOperation = OPERATION_INSERT;
          var targetDiv = _getEventTargetDiv(event);
          var insertedIndex = optionFilteringTargetNodes.indexOf(targetDiv);
          _setButtonDisabled(targetDiv, OPERATION_INSERT);
          var emptyData = createTargetData();
          optionFiltering.insertTargetData(insertedIndex, emptyData);
          insertFilteringTargetNode(insertedIndex, emptyData);
          if (optionFilteringTargetNodes.length
            >= _Alert.FILTERING_TARGET_MAX_COUNT) {
            // Disable to insert new selection on all div elements.
            optionFilteringTargetNodes.forEach((targetDiv) => {
                _setButtonDisabled(targetDiv, OPERATION_INSERT);
              });
            focusedOperation = OPERATION_REMOVE;
          } else {
            _setButtonEnabled(targetDiv, OPERATION_INSERT);
          }
          _focusButton(
            optionFilteringTargetNodes[insertedIndex], focusedOperation);
          optionSaveButton.disabled = false;
        });
      // Focus the insert button on the div element of the previous or next
      // filtering target by the event of an arrow up or down key.
      button.addEventListener("keydown", (event) => {
          var focusedIndex = 0;
          if (event.code == "ArrowUp") {
            focusedIndex--;
          } else if (event.code == "ArrowDown") {
            focusedIndex++;
          } else {
            return;
          }
          focusedIndex +=
            optionFilteringTargetNodes.indexOf(_getEventTargetDiv(event));
          if (focusedIndex >= 0
            && focusedIndex < optionFilteringTargetNodes.length) {
            _focusButton(
              optionFilteringTargetNodes[focusedIndex], OPERATION_INSERT);
          }
        });
      break;
    case OPERATION_LOCALIZE:
      button.addEventListener(_Event.CLICK, (event) => {
          var targetDiv = _getEventTargetDiv(event);
          var targetWordSet = new Set();
          var targetWordsInput =
            targetDiv.querySelector("." + FILTERING_TARGET_WORDS_INPUT);
          var localizedIndex = optionFilteringTargetNodes.indexOf(targetDiv);
          var localizedData = optionFiltering.getTargetData(localizedIndex);
          if (localizedData.wordsString != "") {
            localizedData.wordsString.split(",").forEach((word) => {
                var targetWord =
                  _Text.trimText(_Text.removeTextZeroWidthSpaces(word));
                if (targetWord != "") {
                  var localizedContext = _Text.getLocalizedContext(targetWord);
                  targetWordSet.add(localizedContext.halfwidthText.textString);
                  if (localizedContext.hasDifferentWidth()) {
                    targetWordSet.add(
                      localizedContext.fullwidthText.textString);
                  }
                }
              });
            localizedData.wordsString = Array.from(targetWordSet).join(",");
            localizedData.localizedWordSet = targetWordSet;
            targetWordsInput.value = localizedData.wordsString;
            optionSaveButton.disabled = false;
          }
        });
      break;
    case OPERATION_MOVE_UP:
      button.addEventListener(_Event.CLICK, (event) => {
          _fireFilteringTargetMoveEvent(event, true);
       });
      break;
    case OPERATION_MOVE_DOWN:
      button.addEventListener(_Event.CLICK, (event) => {
          _fireFilteringTargetMoveEvent(event, false);
        });
      break;
    case OPERATION_REMOVE:
      button.addEventListener(_Event.CLICK, (event) => {
          var focusedOperation = OPERATION_REMOVE;
          var targetDiv = _getEventTargetDiv(event);
          var targetNodeLength = optionFilteringTargetNodes.length;
          var removedIndex = optionFilteringTargetNodes.indexOf(targetDiv);
          _setButtonDisabled(targetDiv, OPERATION_REMOVE);
          optionFiltering.removeTargetData(removedIndex);
          removeFilteringTargetNode(removedIndex);
          if (targetNodeLength >= _Alert.FILTERING_TARGET_MAX_COUNT) {
            // Enable to insert new selection on all div elements.
            optionFilteringTargetNodes.forEach((targetDiv) => {
                _setButtonEnabled(targetDiv, OPERATION_INSERT);
              });
          }
          if (removedIndex >= optionFilteringTargetNodes.length - 1) {
            focusedOperation = OPERATION_INSERT;
          }
          _focusButton(
            optionFilteringTargetNodes[removedIndex], focusedOperation);
          optionSaveButton.disabled = false;
        });
      break;
    }
    optionFilteringPointedGroup.addElement(button);
  }
  if (targetData.blorkTerminated) {
    if (! policyTargetAdded) {
      // Split and create new block before "addedTargetDiv" is appended.
      splitFilteringBlockAt(targetIndex);
    }
    _toggleTargetDivEndOfBlock(addedTargetDiv);
  } else {
    addedTargetNextDiv = optionFilteringTargetNodes[targetIndex];
  }
  optionFilteringTargetNodes.splice(targetIndex, 0, addedTargetDiv);
  addedBlockDiv.insertBefore(addedTargetDiv, addedTargetNextDiv);
  if (movedDownEnabledTarget != null) {
    _setButtonEnabled(movedDownEnabledTarget, OPERATION_MOVE_DOWN);
  }
  if (movedUpEnabledTarget != null) {
    _setButtonEnabled(movedUpEnabledTarget, OPERATION_MOVE_UP);
  }
}

/*
 * Removes the node of a filtering target for the specified index from this
 * option page.
 */
function removeFilteringTargetNode(targetIndex) {
  var targetDiv = optionFilteringTargetNodes.splice(targetIndex, 1)[0];
  targetDiv.parentNode.removeChild(targetDiv);
  // Merge the block just after the removed target if the end of a block
  // and not the default filtering target.
  if (targetDiv.classList.contains(FILTERING_TARGET_END_OF_BLOCK)) {
    joinFilteringBlockAt(targetIndex);
  }
  if (optionFilteringTargetNodes.length > 1) {
    // Disable the moved up and down button of the first and last target
    // except for the default filtering target.
    if (targetIndex <= 0) {
      _setButtonDisabled(
        optionFilteringTargetNodes[0], OPERATION_MOVE_UP);
    }
    if (targetIndex >= optionFilteringTargetNodes.length - 2) {
      _setButtonDisabled(
        optionFilteringTargetNodes[optionFilteringTargetNodes.length - 2],
        OPERATION_MOVE_DOWN);
    }
  }
  optionFilteringPointedGroup.removeElement(targetDiv.querySelector("select"));
  for (const button of targetDiv.querySelectorAll("input, button")) {
    optionFilteringPointedGroup.removeElement(button);
  }
}

/*
 * Removes all nodes of filtering targets from this option page.
 */
function clearFilteringTargetNodes() {
  // Remove all blocks and create an empty div element of "block".
  var removedBlockDivs =
    optionFilteringDiv.querySelectorAll("." + FILTERING_BLOCK);
  for (let i = removedBlockDivs.length - 1; i >= 0; i--) {
    optionFilteringDiv.removeChild(removedBlockDivs[i]);
  }
  var emptyBlockDiv = document.createElement("div");
  emptyBlockDiv.className = FILTERING_BLOCK;
  optionFilteringDiv.appendChild(emptyBlockDiv);
  optionFilteringPointedGroup.removeElementAll();
  optionFilteringTargetNodes = new Array();
}

// Creates and displays elements for the filtering category.

var optionFilteringCategorySelect =
  getOptionElement("FilteringCategoryName", "select");
var optionFilteringCategoryTopicsInput =
  getOptionElement("FilteringCategoryTopics", "input");

optionFilteringCategorySelect.addEventListener("focus", (event) => {
    optionPointedGroup.clearEventTarget();
    optionFilteringPointedGroup.clearEventTarget();
  });
optionFilteringCategoryTopicsInput.addEventListener("focus", (event) => {
    optionPointedGroup.clearEventTarget();
    optionFilteringPointedGroup.clearEventTarget();
  });
optionFilteringCategoryTopicsInput.placeholder =
  getOptionMessage("InputFilteringCategoryTopics");

/*
 * Sets category names read to the array of filtering data in the select element
 * on this option page when it's loaded firstly or imported.
 */
function setOptionFilteringCategoryNames() {
  if (optionFilteringCategorySelect.children.length > 0) {
    var filteringCategoryOptions =
      Array.from(optionFilteringCategorySelect.children);
    for (let i = 0; i < filteringCategoryOptions.length; i++) {
      optionFilteringCategorySelect.removeChild(filteringCategoryOptions[i]);
    }
  }
  optionFiltering.forEachData((filteringId, filteringCategoryName) => {
      var filteringCategoryOption = document.createElement("option");
      filteringCategoryOption.value = filteringId;
      filteringCategoryOption.text = filteringCategoryName;
      optionFilteringCategorySelect.appendChild(filteringCategoryOption);
    });
}

/*
 * Reflects filtering data appended with targets after the specified index on
 * this option page when it's loaded firstly or imported, or other filtering
 * name is selected.
 */
function reflectOptionFilteringData(targetIndex = 0) {
  var filteringCategoryOptions = optionFilteringCategorySelect.children;
  for (let i = 0; i < filteringCategoryOptions.length; i++) {
    if (filteringCategoryOptions[i].value == optionFiltering.id) {
      filteringCategoryOptions[i].selected = true;
      break;
    }
  }
  if (optionFiltering.id != ExtractNews.FILTERING_FOR_ALL) {
    optionFilteringCategoryTopicsInput.value =
      optionFiltering.categoryTopicsString;
    optionFilteringCategoryTopicsInput.disabled = false;
  } else {
    optionFilteringCategoryTopicsInput.value = "";
    optionFilteringCategoryTopicsInput.disabled = true;
  }
  var addedTargetData = optionFiltering.getTargetData(targetIndex);
  for (let i = targetIndex + 1; i < optionFiltering.targetDataSize(); i++) {
    addFilteringTargetNode(addedTargetData);
    addedTargetData = optionFiltering.getTargetData(i);
  }
  addFilteringTargetNode(addedTargetData, true);
  Debug.printMessage(
    "Display filtering targets of " + optionFiltering.id + " from "
    + String(targetIndex) + ".");
  // Enable to insert, move up or down, and remove the filtering target
  // after all target nodes are appended to the option page.
  for (let i = targetIndex; i < optionFilteringTargetNodes.length; i++) {
    _setButtonsEnabled(optionFilteringTargetNodes[i],
      i > 0, i < optionFilteringTargetNodes.length - 2);
  }
  if (optionFilteringTargetNodes.length >= _Alert.FILTERING_TARGET_MAX_COUNT) {
    // Disable to insert new selection on all div elements.
    optionFilteringTargetNodes.forEach((targetDiv) => {
        _setButtonDisabled(targetDiv, OPERATION_INSERT);
      });
  }
}

var optionSelection = new OptionSelection();
var optionSelectionDiv = document.getElementById("SelectionOption");
var optionSelectionList = document.getElementById("SelectionList");
var optionSelectionNodes = new Array();
var optionSelectionPageManager;
var optionSelectionPointedGroup = new _Event.PointedGroup();
var optionSelectionDeleteCheckbox =
  optionSelectionDiv.querySelector(".page_header input");
var optionSelectionDeleteButton = getOptionButton("Delete");
var optionSelectionEditPane = _Popup.getNewsSelectionEditPane();
var optionSelectionEditing = {
    titleElement: optionSelectionDiv.querySelector(".edit_header span"),
    dataIndex: -1,
    dataOperation: ""
  };
var optionSelectionEditPointedGroup = new _Event.PointedGroup();

optionSelectionEditPane.nameInput.addEventListener("focus", (event) => {
    optionPointedGroup.clearEventTarget();
    optionSelectionEditPointedGroup.clearEventTarget();
  });
optionSelectionEditPane.regexps.forEach((editRegexp) => {
    editRegexp.textarea.addEventListener("focus", (event) => {
        optionPointedGroup.clearEventTarget();
        optionSelectionEditPointedGroup.clearEventTarget();
      });
  });
optionSelectionEditPane.urlSelect.addEventListener("focus", (event) => {
    optionPointedGroup.clearEventTarget();
    optionSelectionEditPointedGroup.clearEventTarget();
  });

// Sets buttons to localize the regular expression of a news selection.

optionSelectionEditPane.localizedButtons.forEach((localizedButton) => {
    localizedButton.addEventListener(_Event.CLICK, (event) => {
        var editRegexp =
          optionSelectionEditPane.regexps[Number(event.target.value)];
        var regexpString =
          _Text.trimText(
            _Text.replaceTextLineBreaksToSpace(
              _Text.removeTextZeroWidthSpaces(editRegexp.textarea.value)));
        var regexpResult =
          _Regexp.checkRegularExpression(regexpString, { localized: true });
        if (regexpResult.errorCode >= 0) {
          sendOpitonWarningMessage(
            _Regexp.getErrorWarning(editRegexp.name, regexpResult));
        } else {
          regexpString = regexpResult.localizedText.textString;
          if (regexpString.length > _Alert.REGEXP_MAX_UTF16_CHARACTER_LENGTH) {
            sendOpitonWarningMessage(
              _Alert.WARNING_REGEXP_MAX_UTF16_CHARACTER_LENGTH_EXCEEDED);
          } else {
            // Set localized string into text area and checked flag to true.
            editRegexp.textarea.value = regexpString;
            editRegexp.errorChecked = true;
          }
        }
      });
    optionSelectionEditPointedGroup.addElement(localizedButton);
  });

optionSelectionDeleteButton.disabled = true;

optionPointedGroup.addElements(
  optionSelectionDeleteCheckbox, optionSelectionDeleteButton);
optionPointedGroup.setEventRelation(optionSelectionPointedGroup);
optionPointedGroup.setEventRelation(optionSelectionEditPointedGroup);

// Title of editing a news selection to which the number string is following
var SELECTION_EDIT_NUMBER_SUFFIX = "#";
var SELECTION_EDIT_TITLE = getOptionMessage("NewsSelection");

function _getSelectionDeleteCheckbox(selectionDiv) {
  return selectionDiv.querySelector("input");
}

/*
 * Enables or disables the checkbox and button to delete news selections at
 * once on this option page.
 */
function setSelectionDeletedCheck() {
  var deleteChecked = false;
  for (let i = 0; i < optionSelectionNodes.length; i++) {
    var deleteCheckbox = _getSelectionDeleteCheckbox(optionSelectionNodes[i]);
    if (deleteCheckbox != null && deleteCheckbox.checked) {
      deleteChecked = true;
      break;
    }
  }
  optionSelectionDeleteCheckbox.checked = deleteChecked;
  optionSelectionDeleteButton.disabled = ! deleteChecked;
}

/*
 * Sets the pane to edit the specified news selection at the specified index
 * into this option page.
 */
function setSelectionEditPane(selectionDataIndex, selectionDataOperation) {
  var selectionOpenedUrl = undefined;
  optionSelectionEditing.titleElement.textContent =
    SELECTION_EDIT_TITLE + " " + SELECTION_EDIT_NUMBER_SUFFIX
    + String(selectionDataIndex + 1);
  optionSelectionEditing.dataIndex = selectionDataIndex;
  optionSelectionEditing.dataOperation = selectionDataOperation;
  if (selectionDataOperation == OPERATION_EDIT) {
    var selectionData = optionSelection.getData(selectionDataIndex);
    var regexpStrings =
      Array.of(
        selectionData.topicRegularExpression,
        selectionData.senderRegularExpression);
    optionSelectionEditPane.nameInput.value = selectionData.settingName;
    for (let i = 0; i < optionSelectionEditPane.regexps.length; i++) {
      optionSelectionEditPane.regexps[i].textarea.value = regexpStrings[i];
    }
    selectionOpenedUrl = selectionData.openedUrl;
  }
  _Popup.setNewsSelectionEditUrlSelect(
    optionSelectionEditPane, selectionOpenedUrl);
  optionSelectionDiv.classList.toggle(OPERATION_EDIT);
}

/*
 * Clears the pane to edit the news selection on this option page.
 */
function clearSelectionEditPane() {
  if (optionSelectionEditing.dataIndex >= 0) {
    var selectionFocusedOperation = optionSelectionEditing.dataOperation;
    var selectionDiv =
      optionSelectionNodes[
        optionSelectionEditing.dataIndex % OPTION_SELECTION_NODE_SIZE];
    optionSelectionEditing.titleElement.textContent = "";
    optionSelectionEditing.dataIndex = -1;
    optionSelectionEditing.dataOperation = "";
    optionSelectionEditPane.nameInput.value = "";
    for (let i = 0; i < optionSelectionEditPane.regexps.length; i++) {
      optionSelectionEditPane.regexps[i].textarea.value = "";
    }
    _Popup.clearNewsSelectionEditUrlSelect(optionSelectionEditPane);
    optionSelectionDiv.classList.toggle(OPERATION_EDIT);
    window.scroll(0, selectionDiv.getBoundingClientRect().top);
    _focusButton(selectionDiv, selectionFocusedOperation);
  }
}

/*
 * Adds the node of the specified news election to this option page.
 */
function addSelectionNode(selectionData) {
  insertSelectionNode(optionSelectionNodes.length, selectionData);
}

function _fireSelectionMoveEvent(event, selectionMovedUp) {
  var selectionDiv = _getEventSelectionDiv(event);
  var selectionPageFirstDataIndex =
    OPTION_SELECTION_NODE_SIZE * optionSelectionPageManager.pageIndex;
  var movedUpDiv = selectionDiv;
  var movedUpIndex = optionSelectionNodes.indexOf(selectionDiv);
  var movedDownDiv = movedUpDiv;
  var movedDownIndex = movedUpIndex;
  if (selectionMovedUp) {
    // Set the lock of "Up" button pressed on a news selection.
    _setButtonDisabled(movedUpDiv, OPERATION_MOVE_UP);
    movedDownIndex--;
    movedDownDiv = optionSelectionNodes[movedDownIndex];
  } else {
    // Set the lock of "Down" button pressed on a news selection.
    _setButtonDisabled(movedDownDiv, OPERATION_MOVE_DOWN);
    movedUpIndex++;
    movedUpDiv = optionSelectionNodes[movedUpIndex];
  }
  optionSelection.insertData(
    selectionPageFirstDataIndex + movedDownIndex,
    optionSelection.removeData(selectionPageFirstDataIndex + movedUpIndex));
  if (movedDownIndex < 0) {
    // Move the page back with moving the top of a news selection up.
    optionSelectionPageManager.movePage(_Event.PAGE_MOVE_BACK_EVENT);
    _focusButton(
      optionSelectionNodes[OPTION_SELECTION_NODE_SIZE - 1],
      OPERATION_MOVE_UP);
  } else if (movedUpIndex >= OPTION_SELECTION_NODE_SIZE) {
    // Move the page forward with moving the bottom of a news selection down.
    optionSelectionPageManager.movePage(_Event.PAGE_MOVE_FORWARD_EVENT);
    _focusButton(optionSelectionNodes[0], OPERATION_MOVE_DOWN);
  } else {
    // Swaps the lower and upper data in two news selections.
    optionSelectionList.removeChild(movedUpDiv);
    optionSelectionList.insertBefore(movedUpDiv, movedDownDiv);
    optionSelectionNodes.splice(movedUpIndex, 1);
    optionSelectionNodes.splice(movedDownIndex, 0, movedUpDiv);
    if (movedDownIndex <= 0
      && optionSelectionPageManager.isFirstPageKeeping()) {
      // The lower news selection is moved up to the top of the current page.
      if (! selectionMovedUp) {
        // Disable "Up" button of a news selection moved up instead
        // of the selection on which the specified event occurs.
        _setButtonDisabled(movedUpDiv, OPERATION_MOVE_UP);
      } else {
        _focusButton(movedUpDiv, OPERATION_MOVE_DOWN);
      }
      _setButtonEnabled(movedDownDiv, OPERATION_MOVE_UP);
    } else if (selectionMovedUp) {
      // Release the lock of "Up" button pressed on a news selection
      // and focus it if not moved up to the top.
      _setButtonEnabled(movedUpDiv, OPERATION_MOVE_UP);
      _focusButton(movedUpDiv, OPERATION_MOVE_UP);
    }
    var movedUpBottomIndex = optionSelectionNodes.length - 2;
    if (optionSelection.dataSize() >= ExtractNews.SELECTION_MAX_COUNT) {
      movedUpBottomIndex++;
    }
    if (movedUpIndex >= movedUpBottomIndex
      && optionSelectionPageManager.isLastPageKeeping()) {
      // The upper news selection is moved down to the bottom of the current
      // page except for the div element to append new selection.
      if (selectionMovedUp) {
        // Disable "Down" button of a news selection moved down instead
        // of the selection on which the specified event occurs.
        _setButtonDisabled(movedDownDiv, OPERATION_MOVE_DOWN);
      } else {
        _focusButton(movedDownDiv, OPERATION_MOVE_UP);
      }
      _setButtonEnabled(movedUpDiv, OPERATION_MOVE_DOWN);
    } else if (! selectionMovedUp) {
      // Release the lock of "Down" button pressed on a news selection
      // and focus it if not moved down to the bottom except for the div
      // element to append new selection.
      _setButtonEnabled(movedDownDiv, OPERATION_MOVE_DOWN);
      _focusButton(movedDownDiv, OPERATION_MOVE_DOWN);
    }
  }
  optionSaveButton.disabled = false;
}

/*
 * Inserts the node of the specified news election at the specified index
 * into this option page.
 */
function insertSelectionNode(selectionIndex, selectionData) {
  var movedDownEnabledSelection = null;
  var movedUpEnabledSelection = null;
  var addedSelectionDiv = createSelectionDiv(selectionData);
  var addedSelectionNextDiv = null;
  if (selectionIndex < optionSelectionNodes.length) {
    // Enable the inserted, edited, and removed button if not initial addition,
    // and the moved up or down button if not the first or last selection.
    var movedUpButtonEnabled = true;
    var movedDownButtonEnabled = true;
    if (selectionIndex <= 0
      && optionSelectionPageManager.isFirstPageKeeping()) {
      if (optionSelectionNodes.length > 1) {
        movedUpEnabledSelection = optionSelectionNodes[0];
      }
      movedUpButtonEnabled = false;
    }
    if (selectionIndex >= optionSelectionNodes.length - 1
      && optionSelectionPageManager.isLastPageKeeping()) {
      if (optionSelectionNodes.length > 1) {
        movedDownEnabledSelection =
          optionSelectionNodes[optionSelectionNodes.length - 2];
      }
      movedDownButtonEnabled = false;
    }
    _setButtonsEnabled(addedSelectionDiv,
      movedUpButtonEnabled, movedDownButtonEnabled);
    if (optionSelection.dataSize() >= ExtractNews.SELECTION_MAX_COUNT) {
      _setButtonDisabled(addedSelectionDiv, OPERATION_INSERT);
    }
    addedSelectionNextDiv = optionSelectionNodes[selectionIndex];
  }
  var selectionDeleteCheckbox = _getSelectionDeleteCheckbox(addedSelectionDiv);
  if (selectionDeleteCheckbox != null) {
    selectionDeleteCheckbox.addEventListener("input", (event) => {
        if (event.target.checked) {
          optionSelectionDeleteCheckbox.checked = true;
          optionSelectionDeleteButton.disabled = false;
        } else {
          setSelectionDeletedCheck();
        }
      });
    optionSelectionPointedGroup.addElement(selectionDeleteCheckbox);
  }
  for (const button of addedSelectionDiv.querySelectorAll("button")) {
    switch (button.className) {
    case OPERATION_INSERT:
    case OPERATION_APPEND:
      button.addEventListener(_Event.CLICK, (event) => {
          var selectionDataOperation = OPERATION_INSERT;
          if (event.target.classList.contains(OPERATION_APPEND)) {
            selectionDataOperation = OPERATION_APPEND
          }
          setSelectionEditPane(
            optionSelectionPageManager.pageIndex * OPTION_SELECTION_NODE_SIZE
              + optionSelectionNodes.indexOf(_getEventSelectionDiv(event)),
            selectionDataOperation);
        });
      // Focus the insert button on the div element of the previous or next
      // filtering target by the event of an arrow up or down key.
      button.addEventListener("keydown", (event) => {
          var focusedIndex = 0;
          if (event.code == "ArrowUp") {
            focusedIndex--;
          } else if (event.code == "ArrowDown") {
            focusedIndex++;
          } else {
            return;
          }
          focusedIndex +=
            optionSelectionNodes.indexOf(_getEventSelectionDiv(event));
          if (focusedIndex >= 0
            && focusedIndex < optionSelectionNodes.length) {
            var focusedOperation = OPERATION_INSERT;
            if (focusedIndex >= optionSelectionNodes.length - 1
              && optionSelection.dataSize() < ExtractNews.SELECTION_MAX_COUNT
              && optionSelectionPageManager.isLastPageKeeping()) {
              focusedOperation = OPERATION_APPEND;
            }
            _focusButton(optionSelectionNodes[focusedIndex], focusedOperation);
          }
        });
      break;
    case OPERATION_MOVE_UP:
      button.addEventListener(_Event.CLICK, (event) => {
          _fireSelectionMoveEvent(event, true);
       });
      break;
    case OPERATION_MOVE_DOWN:
      button.addEventListener(_Event.CLICK, (event) => {
          _fireSelectionMoveEvent(event, false);
        });
      break;
    case OPERATION_EDIT:
      button.addEventListener(_Event.CLICK, (event) => {
          var selectionDiv = _getEventSelectionDiv(event);
          var selectionDataIndex =
            optionSelectionPageManager.pageIndex * OPTION_SELECTION_NODE_SIZE
            + optionSelectionNodes.indexOf(selectionDiv);
          setSelectionEditPane(selectionDataIndex, OPERATION_EDIT);
        });
      break;
    case OPERATION_REMOVE:
      button.addEventListener(_Event.CLICK, (event) => {
          var focusedOperation = OPERATION_REMOVE;
          var selectionDiv = _getEventSelectionDiv(event);
          var selectionNodeTotal = optionSelection.dataSize();
          var selectionNodeLength = optionSelectionNodes.length;
          var removedIndex = optionSelectionNodes.indexOf(selectionDiv);
          _setButtonDisabled(selectionDiv, OPERATION_REMOVE);
          optionSelection.removeData(
            OPTION_SELECTION_NODE_SIZE * optionSelectionPageManager.pageIndex
            + removedIndex);
          removeSelectionNode(removedIndex);

          // Index    A       B       C
          // 16     Insert  Insert  Insert
          // 17     Insert  Insert  Insert
          // 18     Insert  Insert  Append
          // 19     Insert  Append
          //
          // The state B or C is appeared on only the last page. If a news
          // selection of the index 18 or 19 (optionSelectionNodes.length - 2)
          // is removed, "Append" button is focused, otherwise, "Insert".
          // Any deletion on the last page don't reduce the total of pages.
          //
          // If a news selection of the state A and index 19 is removed on
          // the page which is changed to the last page after the deletion,
          // "Append" button is focused, otherwise, "Insert".
          if (selectionNodeTotal < ExtractNews.SELECTION_MAX_COUNT
            && optionSelectionPageManager.isLastPageKeeping()) {
            if (removedIndex >= selectionNodeLength - 2) {
              focusedOperation = OPERATION_APPEND;
            }
          } else if (selectionNodeLength >= OPTION_SELECTION_NODE_SIZE) {
            if (selectionNodeTotal >= ExtractNews.SELECTION_MAX_COUNT) {
              // Enable to insert a news selection on each div element.
              optionSelectionNodes.forEach((selectionDiv) => {
                  if (_getSelectionDeleteCheckbox(selectionDiv) != null) {
                    _setButtonEnabled(selectionDiv, OPERATION_INSERT);
                  } else {
                    _setButtonEnabled(selectionDiv, OPERATION_APPEND);
                  }
                });
            }
            optionSelectionPageManager.setPageSize(
              Math.ceil(selectionNodeTotal / OPTION_SELECTION_NODE_SIZE));
            if (removedIndex >= OPTION_SELECTION_NODE_SIZE - 1
              && optionSelectionPageManager.isLastPageKeeping()) {
              focusedOperation = OPERATION_APPEND;
            }
            // Add the div element for the top news selection on the next page
            // or to append new selection following to the last data.
            var selectionData = undefined;
            var selectionDataIndex =
              (optionSelectionPageManager.pageIndex + 1)
              * OPTION_SELECTION_NODE_SIZE;
            if (selectionDataIndex < optionSelection.dataSize()) {
              selectionData = optionSelection.getData(selectionDataIndex);
            }
            addSelectionNode(selectionData);
            _setButtonsEnabled(
              optionSelectionNodes[OPTION_SELECTION_NODE_SIZE - 1]);
          }
          if (_getSelectionDeleteCheckbox(selectionDiv).checked) {
            // Clear the checkbox to delete news selections if not checked all.
            setSelectionDeletedCheck();
          }
          _focusButton(optionSelectionNodes[removedIndex], focusedOperation);
          optionSaveButton.disabled = false;
        });
      break;
    }
    optionSelectionPointedGroup.addElement(button);
  }
  // Remove the div element over the size of nodes displayed on a page.
  if (optionSelectionNodes.length >= OPTION_SELECTION_NODE_SIZE) {
    var removedSelectionDiv = optionSelectionNodes.pop();
    if (removedSelectionDiv == addedSelectionNextDiv) {
      addedSelectionNextDiv = null;
    }
    optionSelectionList.removeChild(removedSelectionDiv);
  }

  optionSelectionNodes.splice(selectionIndex, 0, addedSelectionDiv);
  optionSelectionList.insertBefore(addedSelectionDiv, addedSelectionNextDiv);
  if (movedDownEnabledSelection != null) {
    _setButtonEnabled(movedDownEnabledSelection, OPERATION_MOVE_DOWN);
  }
  if (movedUpEnabledSelection != null) {
    _setButtonEnabled(movedUpEnabledSelection, OPERATION_MOVE_UP);
  }
}

/*
 * Removes the node of a news selection for the specified index from this
 * option page.
 */
function removeSelectionNode(selectionIndex) {
  var selectionDiv = optionSelectionNodes.splice(selectionIndex, 1)[0];
  selectionDiv.parentNode.removeChild(selectionDiv);
  if (optionSelectionNodes.length > 1) {
    // Disable the moved up and down button of the first and last selection.
    if (selectionIndex <= 0
      && optionSelectionPageManager.isFirstPageKeeping()) {
      _setButtonDisabled(optionSelectionNodes[0], OPERATION_MOVE_UP);
    }
    if (selectionIndex >= optionSelectionNodes.length - 2
      && optionSelectionPageManager.isLastPageKeeping()) {
      var movedDownButtonDisabledIndex = optionSelectionNodes.length - 2;
      if (selectionIndex >= OPTION_SELECTION_NODE_SIZE - 1) {
        movedDownButtonDisabledIndex++;
      }
      _setButtonDisabled(
        optionSelectionNodes[movedDownButtonDisabledIndex],
        OPERATION_MOVE_DOWN);
    }
  }
    for (const button of selectionDiv.querySelectorAll("input, button")) {
    optionSelectionPointedGroup.removeElement(button);
  }
}

/*
 * Removes the node of all news selections from this option page.
 */
function clearSelectionNodes() {
  for (let i = optionSelectionNodes.length - 1; i >= 0; i--) {
    optionSelectionList.removeChild(optionSelectionNodes[i]);
  }
  optionSelectionPointedGroup.removeElementAll();
  optionSelectionNodes = new Array();
  optionSelectionDeleteCheckbox.checked = false;
  optionSelectionDeleteButton.disabled = true;
}

/*
 * Reflects selection data appended after the specified index on this option
 * page when it's loaded firstly or imported.
 */
function reflectOptionSelectionData(selectionIndex = 0) {
  var selectionDataIndex =
    optionSelectionPageManager.pageIndex * OPTION_SELECTION_NODE_SIZE
    + selectionIndex;
  var selectionDataSize = optionSelection.dataSize();
  var addedSelectionCount = 0;
  var addedSelectionDataCount = selectionDataSize - selectionDataIndex;
  if (addedSelectionDataCount > 0) {
    addedSelectionCount = OPTION_SELECTION_NODE_SIZE;
    if (optionSelectionNodes.length > 0) {
      var bottomSelectionDiv =
        optionSelectionNodes[optionSelectionNodes.length - 1];
      if (_getSelectionDeleteCheckbox(bottomSelectionDiv) == null) {
        // Count the node to append new selection following to the last data.
        addedSelectionCount++;
      }
      addedSelectionCount -= optionSelectionNodes.length;
    }
    if (addedSelectionCount > addedSelectionDataCount) {
      addedSelectionCount = addedSelectionDataCount;
    }
    for (let i = 0; i < addedSelectionCount; i++) {
      insertSelectionNode(
        selectionIndex + i, optionSelection.getData(selectionDataIndex + i));
    }
    Debug.printMessage(
      "Display news selections from " + String(selectionIndex)
      + " on Page " + String(optionSelectionPageManager.pageIndex + 1) + ".");
    // Enable to insert, move up or down, edit, and remove the news selection
    // after all selection nodes are appended to the option page.
    for (let i = 0; i < addedSelectionCount; i++) {
      _setButtonsEnabled(optionSelectionNodes[selectionIndex + i],
        selectionDataIndex > 0, selectionDataIndex < selectionDataSize - 1);
      selectionDataIndex++;
    }
    if (selectionDataSize >= ExtractNews.SELECTION_MAX_COUNT) {
      // Disable to insert new selection on all div elements.
      optionSelectionNodes.forEach((selectionDiv) => {
          _setButtonDisabled(selectionDiv, OPERATION_INSERT);
        });
    }
  }
  if (selectionIndex + addedSelectionCount >= optionSelectionNodes.length
    && optionSelectionNodes.length < OPTION_SELECTION_NODE_SIZE) {
    // Add the append button of news selection if has not existed on this page.
    addSelectionNode();
    _setButtonsEnabled(
      optionSelectionNodes[optionSelectionNodes.length - 1], false, false);
  }
}

// Reads filtering targets and news selections and sets buttons by which
// its are imported, exported, or saved.

optionFiltering.read().then(() => {
    optionFilteringCategorySelect.addEventListener("change", (event) => {
        clearFilteringTargetNodes();
        optionFiltering.selectData(event.target.value);
        reflectOptionFilteringData();
      });
    optionFilteringCategoryTopicsInput.addEventListener("input", (event) => {
        optionFiltering.categoryTopicsString = event.target.value;
        optionSaveButton.disabled = false;
      });
    setOptionFilteringCategoryNames();
    reflectOptionFilteringData();

    return optionSelection.read();
  }).then(() => {
    var selectionEditCloseButton = optionSelectionDiv.querySelector(".close");
    var selectionEditApplyButton = getOptionButton("Apply");
    selectionEditCloseButton.addEventListener(_Event.CLICK, (event) => {
        clearSelectionEditPane();
      });
    selectionEditCloseButton.addEventListener("keydown", (event) => {
        if (event.code == "Enter") {
          clearSelectionEditPane();
        }
      });
    selectionEditApplyButton.addEventListener(_Event.CLICK, (event) => {
        var newsSelection = ExtractNews.newSelection();
        var regexpStrings = new Array();
        var settingName =
          _Text.trimText(
            _Text.removeTextZeroWidthSpaces(
              optionSelectionEditPane.nameInput.value));
        optionSelectionEditPane.nameInput.value = settingName;
        if (_Text.getTextWidth(settingName) > _Alert.SETTING_NAME_MAX_WIDTH) {
          sendOpitonWarningMessage(
            _Alert.WARNING_SETTING_NAME_MAX_WITDH_EXCEEDED);
          return;
        }
        newsSelection.settingName = settingName;
        // Check whether a regular expression of text area is valid.
        for (let i = 0; i < optionSelectionEditPane.regexps.length; i++) {
          var editRegexp = optionSelectionEditPane.regexps[i];
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
            sendOpitonWarningMessage(
              _Regexp.getErrorWarning(editRegexp.name, regexpResult));
            return;
          }
          // Set checked string into text area and checked flag to true.
          regexpStrings.push(regexpString);
          editRegexp.textarea.value = regexpString;
          editRegexp.errorChecked = true;
        }
        newsSelection.topicRegularExpression = regexpStrings[0];
        newsSelection.senderRegularExpression = regexpStrings[1];
        newsSelection.openedUrl = optionSelectionEditPane.urlSelect.value;

        var selectionData = createSelectionData(newsSelection);
        var selectionDataIndex = optionSelectionEditing.dataIndex;
        var selectionIndex = selectionDataIndex % OPTION_SELECTION_NODE_SIZE;
        if (optionSelectionEditing.dataOperation != OPERATION_EDIT) {
          // Insert selection data and the div element into the option page
          // for an edited news selection.
          optionSelection.insertData(selectionDataIndex, selectionData);
          var selectionNodeTotal = optionSelection.dataSize();
          if (selectionNodeTotal >= ExtractNews.SELECTION_MAX_COUNT) {
            // Disable to insert new selection on all div elements.
            optionSelectionNodes.forEach((selectionDiv) => {
                if (_getSelectionDeleteCheckbox(selectionDiv) != null) {
                  _setButtonDisabled(selectionDiv, OPERATION_INSERT);
                }
              });
            optionSelectionEditing.dataOperation = OPERATION_REMOVE;
          } else {
            // Count the node to append new selection following to the last
            // data.
            selectionNodeTotal++;
            optionSelectionEditing.dataOperation = OPERATION_INSERT;
          }
          insertSelectionNode(selectionIndex, selectionData);
          optionSelectionPageManager.setPageSize(
            Math.ceil(selectionNodeTotal / OPTION_SELECTION_NODE_SIZE));
        } else {
          // Replace selection data and update the div element on the option
          // page for an edited news selection.
          optionSelection.setData(selectionDataIndex, selectionData);
          updateSelectionDiv(
            optionSelectionNodes[selectionIndex], selectionData);
        }
        clearSelectionEditPane();
        optionSaveButton.disabled = false;
      });
    optionSelectionEditPointedGroup.addElements(
      selectionEditCloseButton, selectionEditApplyButton);

    // Set the index number of pages to the header on the list of selections.
    var selectionNodeTotal = optionSelection.dataSize();
    if (selectionNodeTotal < ExtractNews.SELECTION_MAX_COUNT) {
      // Count the node to append new selection following to the last data.
      selectionNodeTotal++;
    }
    var selectionPageList = document.getElementById("SelectionPageList");
    var selectionPageListTabIndex = optionSelectionDeleteButton.tabIndex + 1;
    for (let i = 0; i < OPTION_SELECTION_PAGE_SIZE; i++) {
      var selectionPageLi = document.createElement("li");
      selectionPageLi.textContent = String(i + 1);
      selectionPageLi.tabIndex = selectionPageListTabIndex;
      selectionPageListTabIndex++;
      selectionPageList.appendChild(selectionPageLi);
      optionPointedGroup.addElement(selectionPageLi);
    }
    optionSelectionPageManager =
      new _Event.PageListManager((event, pageIndex, previousPageIndex) => {
        if (pageIndex != previousPageIndex) {
          optionSelectionPageManager.setEventTarget(pageIndex);
          clearSelectionNodes();
          reflectOptionSelectionData();
        }
      }, Array.from(selectionPageList.children));
    optionSelectionPageManager.setPageSize(
      Math.ceil(selectionNodeTotal / OPTION_SELECTION_NODE_SIZE));

    optionImportButton.disabled = false;
    optionExportButton.disabled = false;
    return Promise.resolve();
  }).catch((error) => {
    Debug.printStackTrace(error);
  });

// Displays the menu list of general, filtering, and selection options.

for (let i = 0; i < optionMenuItems.length; i++) {
  var settingMenuItem = optionMenuItems[i];
  if (settingMenuItem.id.toLowerCase() != OPTION_GENERAL) {
    optionDataReplacementCheckedMap.set(settingMenuItem.id, false);
    optionSaveDisabledMap.set(settingMenuItem.id, true);
  }
  settingMenuItem.textContent = getOptionMessage(settingMenuItem.id);
  optionPointedGroup.addElement(settingMenuItem);
}

optionMenuManager =
  new _Event.PageListManager((event, pageIndex, previousPageIndex) => {
    var menuId = optionMenuManager.getEventTarget(pageIndex).id;
    var menuOption = menuId.toLowerCase();
    // Reserve the state of checkboxes or buttons for unfocused setting
    // and restore to changed setting.
    if (previousPageIndex >= 0) {
      var previousMenuId =
        optionMenuManager.getEventTarget(previousPageIndex).id;
      optionSaveDisabledMap.set(previousMenuId, optionSaveButton.disabled);
      optionDataReplacementCheckedMap.set(
        previousMenuId, optionDataReplacementCheckbox.checked);
    }
    optionSaveButton.disabled = optionSaveDisabledMap.get(menuId);
    optionDataReplacementCheckbox.checked =
      optionDataReplacementCheckedMap.get(menuId);
    if (menuOption != OPTION_GENERAL) {
      if (menuOption == OPTION_SELECTION
        && optionSelectionDiv.classList.contains(OPERATION_EDIT)) {
        clearSelectionEditPane();
      }
      optionDataUpdateParagraph.textContent =
        getOptionMessage("Data" + menuId) + OPTION_DATA_DESCRIPTION;
    }
    optionSection.className = menuOption;
  }, optionMenuItems);
optionMenuManager.setPageSize(optionMenuItems.length);

// Registers click events to read and write filtering or selection data.

optionImportButton.addEventListener(_Event.CLICK, (event) => {
    var dataReplaced = optionDataReplacementCheckbox.checked;
    switch(optionSection.className) {
    case OPTION_FILTERING:
      optionFiltering.import(dataReplaced).then((targetAppendedIndex) => {
          if (dataReplaced) {
            clearFilteringTargetNodes();
          } else {
            removeFilteringTargetNode(targetAppendedIndex);
          }
          setOptionFilteringCategoryNames();
          reflectOptionFilteringData(targetAppendedIndex);
          optionSaveButton.disabled = false;
          optionSaveButton.focus();
        });
      break;
    case OPTION_SELECTION:
      optionSelection.import(dataReplaced).then((dataAppendedIndex) => {
          var selectionNodeTotal = optionSelection.dataSize();
          if (dataReplaced) {
            clearSelectionNodes();
            reflectOptionSelectionData();
          } else if (optionSelectionPageManager.isLastPageKeeping()) {
            reflectOptionSelectionData(
              dataAppendedIndex % OPTION_SELECTION_NODE_SIZE);
          }
          if (selectionNodeTotal < ExtractNews.SELECTION_MAX_COUNT) {
            // Count the node to append new selection following to
            // the last data.
            selectionNodeTotal++;
          }
          optionSelectionPageManager.setPageSize(
            Math.ceil(selectionNodeTotal / OPTION_SELECTION_NODE_SIZE));
          optionSaveButton.disabled = false;
          optionSaveButton.focus();
        });
      break;
    }
  });
optionExportButton.addEventListener(_Event.CLICK, (event) => {
    switch(optionSection.className) {
    case OPTION_FILTERING:
      optionFiltering.export();
      break;
    case OPTION_SELECTION:
      optionSelection.export();
      break;
    }
  });
optionSaveButton.addEventListener(_Event.CLICK, (event) => {
    var savingPromise = undefined;
    switch(optionSection.className) {
    case OPTION_FILTERING:
      optionSaveButton.disabled = true;
      savingPromise = optionFiltering.save().then(() => {
          return ExtractNews.sendRuntimeMessage({
              command: ExtractNews.COMMAND_SETTING_UPDATE
            }, ON_OPTION_TAB);
        });
      break;
    case OPTION_SELECTION:
      optionSaveButton.disabled = true;
      savingPromise = optionSelection.save();
      break;
    }
    if (savingPromise != undefined) {
      savingPromise.catch((error) => {
          Debug.printStackTrace(error);
        });
      // Focus the menu list because the save button is disabled
      optionMenuManager.getEventTarget().focus();
    }
  });

// Registers events to delete settings on the list of news selections at once.

optionSelectionDeleteCheckbox.addEventListener("input", (event) => {
    for (let i = 0; i < optionSelectionNodes.length; i++) {
      var selectionDeleteCheckbox =
        _getSelectionDeleteCheckbox(optionSelectionNodes[i]);
      if (selectionDeleteCheckbox != null) {
        selectionDeleteCheckbox.checked = event.target.checked;
      }
    }
    optionSelectionDeleteButton.disabled = ! event.target.checked;
  });
optionSelectionDeleteButton.addEventListener(_Event.CLICK, (event) => {
    event.target.disabled = true;
    var selectionPageFirstDataIndex =
      OPTION_SELECTION_NODE_SIZE * optionSelectionPageManager.pageIndex;
    for (let i = optionSelectionNodes.length - 1; i >= 0; i--) {
      var selectionDeleteCheckbox =
        _getSelectionDeleteCheckbox(optionSelectionNodes[i]);
      if (selectionDeleteCheckbox != null && selectionDeleteCheckbox.checked) {
        optionSelection.removeData(selectionPageFirstDataIndex + i);
      }
    }
    var selectionNodeTotal = optionSelection.dataSize();
    if (selectionNodeTotal < ExtractNews.SELECTION_MAX_COUNT) {
      // Count the node to append new selection following to the last data.
      selectionNodeTotal++;
    }
    optionSelectionPageManager.setPageSize(
      Math.ceil(selectionNodeTotal / OPTION_SELECTION_NODE_SIZE));
    optionSelectionPageManager.getEventTarget().focus();
    clearSelectionNodes();
    reflectOptionSelectionData();
    optionSaveButton.disabled = false;
  });

// Registers key events to control the edit pane or pages for news selection.

document.body.addEventListener("keydown", (event) => {
    switch (event.code) {
    case "Escape":
      if (optionSection.className == OPTION_SELECTION
        && optionSelectionDiv.classList.contains(OPERATION_EDIT)) {
        clearSelectionEditPane();
      }
      break;
    case "ArrowLeft":
      if (optionSection.className == OPTION_SELECTION
        && ! optionSelectionDiv.classList.contains(OPERATION_EDIT)
        && ! optionSelectionPageManager.isFirstPageKeeping()) {
        optionSelectionPageManager.movePage(_Event.PAGE_MOVE_BACK_EVENT);
      }
      break;
    case "ArrowRight":
      if (optionSection.className == OPTION_SELECTION
        && ! optionSelectionDiv.classList.contains(OPERATION_EDIT)
        && ! optionSelectionPageManager.isLastPageKeeping()) {
        optionSelectionPageManager.movePage(_Event.PAGE_MOVE_FORWARD_EVENT);
      }
      break;
    }
  });

document.body.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
