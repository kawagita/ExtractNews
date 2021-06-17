/*
 *  Define functions and constant variables for the general option.
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

const _Storage = ExtractNews.Storage;
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
  var label = element.querySelector("h3, label, span");
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

/*
 * Sends the specified warning on the option page to the background script.
 */
function sendOpitonWarningMessage(warning) {
  callAsynchronousAPI(browser.tabs.getCurrent).then((tab) => {
      ExtractNews.sendRuntimeMessage({
          command: ExtractNews.COMMAND_DIALOG_OPEN,
          tabId: tab.id,
          warning: warning.toObject()
        }, " on Option Page Tab " + tab.id);
    }).catch((error) => {
      Debug.printStackTrace(error);
    });
}

/*
 * Sends the updated data of the specified object to the background script.
 */
function sendOpitonUpdateMessage(updatedObject = { }) {
  callAsynchronousAPI(browser.tabs.getCurrent).then((tab) => {
      ExtractNews.sendRuntimeMessage(Object.assign({
          command: ExtractNews.COMMAND_SETTING_UPDATE,
          filteringUpdated: false
        }, updatedObject), " on Option Page Tab " + tab.id);
    });
}

// Class name of the element grayed out on the option page
const OPTION_GRAYED_OUT = "grayed_out";

const OPTION_TRUE = "true";
const OPTION_FALSE = "false";

/*
 * The settings of option data.
 */
class OptionSettings {
  constructor(generalDataMap, filteringData, selectionData) {
    this.settings = {
        generalDataMap: generalDataMap,
        generalDataUpdated: false,
        filteringData: filteringData,
        filteringDataUpdated: false,
        selectionData: selectionData,
        selectionDataUpdated: false
      };
  }

  get generalDataMap() {
    return this.settings.generalDataMap;
  }

  isGeneralDataUpdated() {
    return this.settings.generalDataUpdated;
  }

  setGeneralDataUpdated() {
    this.settings.generalDataUpdated = true;
  }

  get filteringData() {
    return this.settings.filteringData;
  }

  isFilteringDataUpdated() {
    return this.settings.filteringDataUpdated;
  }

  setFilteringDataUpdated() {
    this.settings.filteringDataUpdated = true;
  }

  get selectionData() {
    return this.settings.selectionData;
  }

  isSelectionDataUpdated() {
    return this.settings.selectionDataUpdated;
  }

  setSelectionDataUpdated() {
    this.settings.selectionDataUpdated = true;
  }

  clearDataUpdated() {
    this.settings.generalDataUpdated = false;
    this.settings.filteringDataUpdated = false;
    this.settings.selectionDataUpdated = false;
  }
}

/*
 * The option to change a value for the node.
 */
class OptionData {
  constructor(optionNode, readValue, writeValue, updatedPropertyName) {
    if (optionNode == undefined) {
      throw newNullPointerException("optionData");
    } else if (readValue == undefined) {
      throw newNullPointerException("readValue");
    } else if (writeValue == undefined) {
      throw newNullPointerException("writeValue");
    } else if (updatedPropertyName == undefined) {
      throw newNullPointerException("updatedPropertyName");
    } else if ((typeof updatedPropertyName) != "string") {
      throw newIllegalArgumentException("updatedPropertyName");
    }
    this.optionNode = optionNode;
    this.optionChecked = false;
    if (optionNode.tagName == "INPUT") {
      switch (optionNode.type) {
      case "checkbox":
        this.optionChecked = true;
        break;
      }
    }
    this.readValue = readValue;
    this.writeValue = writeValue;
    this.updatedPropertyName = updatedPropertyName;
  }

  get id() {
    return this.optionNode.id;
  }

  getValue() {
    if (this.optionChecked) {
      return this.optionNode.checked;
    }
    return "";
  }

  setValue(value) {
    if (this.optionChecked) {
      this.optionNode.checked = value;
    }
  }

  isAdvanced() {
    return false;
  }

  isValueStringAcceptable(valueString) {
    if (this.optionChecked) {
      valueString = valueString.toLowerCase();
      return valueString == OPTION_TRUE || valueString == OPTION_FALSE;
    }
    return false;
  }

  setValueString(valueString) {
    if (valueString == undefined) {
      throw newNullPointerException("valueString");
    } else if ((typeof valueString) != "string") {
      throw newIllegalArgumentException("valueString");
    }
    if (this.optionChecked) {
      this.setValue(valueString == OPTION_TRUE);
    }
  }

  read() {
    return this.readValue().then((value) => {
        this.optionNode.addEventListener("input", (event) => {
            var changedValue = this.getValue();
            this.writeValue(changedValue).then((preventUpdate) => {
                if (! preventUpdate) {
                  sendOpitonUpdateMessage(this.getUpdatedObject());
                }
              }).catch((error) => {
                Debug.printStackTrace(error);
              });
            this.setValue(changedValue);
          });
        this.setValue(value);
      });
  }

  write() {
    return this.writeValue(this.getValue());
  }

  getUpdatedPropertyData() {
    return undefined;
  }

  getUpdatedObject(updatedObject = { }) {
    var updatedData = this.getUpdatedPropertyData();
    if (updatedData != undefined) {
      if (updatedObject[this.updatedPropertyName] == undefined) {
        updatedObject[this.updatedPropertyName] = new Array();
      }
      updatedObject[this.updatedPropertyName].push(updatedData);
    } else if (this.optionChecked) {
      updatedObject[this.updatedPropertyName] = this.optionNode.checked;
    }
    return updatedObject;
  }

  toString() {
    if (this.optionChecked) {
      return this.optionNode.checked ? OPTION_TRUE : OPTION_FALSE;
    }
    return "";
  }
}

function _createCheckedOptionDiv(optionId, optionText) {
  var checkedOptionDiv = document.createElement("div");
  var checkedOptionInput = document.createElement("input");
  var checkedOptionLabel = document.createElement("label");
  checkedOptionDiv.className = "checked_option";
  checkedOptionInput.type = "checkbox";
  checkedOptionInput.id = optionId;
  checkedOptionLabel.textContent = optionText;
  checkedOptionDiv.appendChild(checkedOptionInput);
  checkedOptionDiv.appendChild(checkedOptionLabel);
  return checkedOptionDiv;
}

class _EnablingSiteData extends OptionData {
  constructor(optionSettings, domainCheckbox, domainData) {
    super(domainCheckbox, () => {
        return Promise.resolve(ExtractNews.isDomainEnabled(domainData.id));
      }, (value) => {
        // Not write any value to the storage until "Apply" button is pressed.
        optionSettings.setGeneralDataUpdated();
        return Promise.resolve(true);
      }, "domainDataObjects");
    this.domainData = domainData;
  }
  setValue(value) {
    super.setValue(value);
    var domainDataObject = this.domainData.toObject();
    domainDataObject.enabled = value;
    ExtractNews.setDomain(domainDataObject);
  }
  write() {
    var domainEnabledKey = this.domainData.id + ExtractNews.ENABLED_KEY;
    return writeStorage({
        [domainEnabledKey]: ExtractNews.isDomainEnabled(this.domainData.id)
      });
  }
  getUpdatedPropertyData() {
    return this.domainData.toObject();
  }
}

class _AdvancedOption extends OptionData {
  constructor(optionNode, read, write, updatedPropertyName) {
    super(optionNode, read, write, updatedPropertyName);
  }
  isAdvanced() {
    return true;
  }
}

const OPTION_DISABLE_FILTERING = "DisableFiltering";
const OPTION_DEBUG_EXTENSIONS  = "DebugExtension";

/*
 * The pane of genral settings on this option page.
 */
class GeneralPane {
  constructor(optionSettings) {
    this.pane = {
        optionDataArray: new Array(),
        optionNodeGroup: new _Event.PointedGroup()
      };
    var enablingSiteNode = getOptionElement("EnablingSite", "div");
    ExtractNews.forEachDomain((domainData) => {
        var domainCheckedOptionDiv =
          _createCheckedOptionDiv(domainData.id, domainData.name);
        enablingSiteNode.appendChild(domainCheckedOptionDiv);
        this.pane.optionDataArray.push(
          new _EnablingSiteData(
            optionSettings, domainCheckedOptionDiv.querySelector("input"),
            domainData));
      });
    var advancedOptionsNode = getOptionElement("Advanced", "div");
    var disableFilteringOptionDiv =
      _createCheckedOptionDiv(
        OPTION_DISABLE_FILTERING, getOptionMessage(OPTION_DISABLE_FILTERING));
    var debugExtensionOptionDiv =
      _createCheckedOptionDiv(
        OPTION_DEBUG_EXTENSIONS, getOptionMessage(OPTION_DEBUG_EXTENSIONS));
    advancedOptionsNode.appendChild(disableFilteringOptionDiv);
    advancedOptionsNode.appendChild(debugExtensionOptionDiv);
    this.pane.optionDataArray.push(
      new _AdvancedOption(
        disableFilteringOptionDiv.querySelector("input"),
        _Storage.readFilteringDisabled, _Storage.writeFilteringDisabled,
        "filteringDisabled"),
      new _AdvancedOption(
        debugExtensionOptionDiv.querySelector("input"),
        ExtractNews.readDebugMode, ExtractNews.writeDebugMode, "debugOn"));
  }

  forEachOptionData(callback) {
    this.pane.optionDataArray.forEach(callback);
  }

  setEventRelation(eventGroup) {
    eventGroup.setEventRelation(this.pane.optionNodeGroup);
  }
}

// Variables and functions to operate a filtering target or news selection.

const OPERATION_INSERT = "insert";
const OPERATION_APPEND = "append";

const OPERATION_EDIT = "edit";

const OPERATION_LOCALIZE = "localize";

const OPERATION_UP = "up";
const OPERATION_DOWN = "down";
const OPERATION_REMOVE = "remove";

const OPERATIONS = [ "Up", "Down", "Remove" ];

/*
 * Creates the element to insert a filtering target or news selection.
 */
function createInsertionNode(appended = false) {
  var insertNode = document.createElement("div");
  var insertHr = document.createElement("hr");
  var insertButton = document.createElement("button");
  insertNode.className = "insertion";
  if (! appended) {
    insertButton.className = OPERATION_INSERT;
    insertButton.textContent = getOptionMessage("Insert");
  } else {
    insertButton.className = OPERATION_APPEND;
    insertButton.textContent = getOptionMessage("Append");
  }
  insertButton.disabled = true;
  insertNode.appendChild(insertHr);
  insertNode.appendChild(insertButton);
  return insertNode;
}

/*
 * Creates the element to operate a filtering target or news selection.
 */
function createOperationNode() {
  var operationNode = document.createElement("div");
  var operationButtonGroupDiv = document.createElement("div");
  operationNode.className = "operation";
  for (let i = 0; i < OPERATIONS.length; i++) {
    var operationButton = document.createElement("button");
    operationButton.className = OPERATIONS[i].toLowerCase();
    operationButton.textContent = getOptionMessage(OPERATIONS[i]);
    operationButton.disabled = true;
    operationButtonGroupDiv.appendChild(operationButton);
  }
  operationNode.appendChild(document.createElement("div"));
  operationNode.appendChild(operationButtonGroupDiv);
  return operationNode;
}

function _setButtonEnabled(node, enabledOperation, enabled) {
  var element = node.querySelector("." + enabledOperation);
  if (element != null) {
    element.disabled = ! enabled;
    return true;
  }
  return false;
}

/*
 * The pane of elements focused on this option page.
 */
class FocusedOptionPane {
  constructor(focusedNodeGroup) {
    if (focusedNodeGroup == undefined) {
      throw newNullPointerException("focusedNodeGroup");
    }
    this.nodes = new Array();
    this.focusedNodeGroup = focusedNodeGroup;
    this.insertButtonGroup = new _Event.PointedGroup();
    this.insertButtonGroup.setEventRelation(focusedNodeGroup);
  }

  get nodeSize() {
    return this.nodes.length;
  }

  /*
   * Returns the index of the filtering target or news selection node
   * on which the event occurs.
   */
  getEventNodeIndex(event) {
    for (let i = 0; i < this.nodeSize; i++) {
      if (this.nodes[i].contains(event.target)) {
        return i;
      }
    }
    return -1;
  }

  getNode(nodeIndex) {
    if (nodeIndex < 0 || nodeIndex >= this.nodeSize) {
      throw newIndexOutOfBoundsException("focused nodes", nodeIndex);
    }
    return this.nodes[nodeIndex];
  }

  getFocusedNode(nodeIndex) {
    throw newUnsupportedOperationException();
  }

  addNode(
    node, fireNodeInsertEvent, fireDataInputEvent, fireWordsLocalizeEvent,
    fireNodeMoveEvent, fireNodeRemoveEvent) {
    this.insertNode(
      this.nodeSize, node, fireNodeInsertEvent, fireDataInputEvent,
      fireInputLocalizeEvent, fireNodeMoveEvent, fireNodeRemoveEvent);
  }

  insertNode(
    nodeIndex, node, fireNodeInsertEvent, fireNodeMoveEvent,
    fireNodeRemoveEvent, fireDataInputEvent, fireWordsLocalizeEvent) {
    if (nodeIndex < 0 || nodeIndex > this.nodeSize) {
      throw newIndexOutOfBoundsException("section nodes", nodeIndex);
    }
    this.nodes.splice(nodeIndex, 0, node);
    var insertButton = node.querySelector("button." + OPERATION_INSERT);
    if (insertButton == null) {
      insertButton = node.querySelector("button." + OPERATION_APPEND);
    }
    insertButton.addEventListener(_Event.CLICK, fireNodeInsertEvent);
    this.insertButtonGroup.addElement(insertButton);
    var focusedNode = this.getFocusedNode(nodeIndex);
    if (focusedNode != null) {
      if (fireDataInputEvent != undefined) {
        for (const element of focusedNode.querySelectorAll("input")) {
          element.addEventListener("input", fireDataInputEvent);
          this.focusedNodeGroup.addElement(element);
        }
      }
      for (const element of focusedNode.querySelectorAll("button")) {
        switch (element.className) {
        case OPERATION_LOCALIZE:
          element.addEventListener(_Event.CLICK, fireWordsLocalizeEvent);
          break;
        case OPERATION_UP:
        case OPERATION_DOWN:
          element.addEventListener(_Event.CLICK, fireNodeMoveEvent);
          break;
        case OPERATION_REMOVE:
          element.addEventListener(_Event.CLICK, fireNodeRemoveEvent);
          break;
        }
        this.focusedNodeGroup.addElement(element);
      }
    }
  }

  removeNode(nodeIndex) {
    if (nodeIndex < 0 || nodeIndex >= this.nodeSize) {
      throw newIndexOutOfBoundsException("section nodes", nodeIndex);
    }
    var focusedNode = this.getFocusedNode(nodeIndex);
    var node = this.nodes.splice(nodeIndex, 1)[0];
    var insertButton = node.querySelector("button." + OPERATION_INSERT);
    if (insertButton == null) {
      insertButton = node.querySelector("button." + OPERATION_APPEND);
    }
    this.insertButtonGroup.removeElement(insertButton);
    if (focusedNode != null) {
      for (const element of focusedNode.querySelectorAll("input, button")) {
        this.focusedNodeGroup.removeElement(element);
      }
    }
    return node;
  }

  swapNode(movedUpIndex, movedDownIndex) {
    if (movedDownIndex < 0) {
      throw newIndexOutOfBoundsException("section nodes", movedUpIndex);
    } else if (movedDownIndex >= this.nodeSize) {
      throw newIndexOutOfBoundsException("section nodes", movedDownIndex);
    } else if (movedUpIndex <= movedDownIndex) {
      throw newInvalidParameterException(movedUpIndex, movedDownIndex);
    }
    this.nodes.splice(
      movedDownIndex, 0, this.nodes.splice(movedUpIndex, 1)[0]);
  }

  focusNode(nodeIndex, focusedOperation) {
    var node = this.getNode(nodeIndex);
    var focusedElement = null;
    if (focusedOperation != undefined) {
      focusedElement = node.querySelector("." + focusedOperation);
    } else {
      focusedElement = this.getFocusedNode(nodeIndex);
    }
    if (focusedElement != null) {
      focusedElement.focus();
      window.scroll(
        0, node.getBoundingClientRect().top
          - this.nodes[0].getBoundingClientRect().top);
      return true;
    }
    return false;
  }

  enableAllButtons(nodeIndex, upEnabled = true, downEnabled = true) {
    for (const element of this.getNode(nodeIndex).querySelectorAll("button")) {
      if (element.classList.contains(OPERATION_UP)) {
        element.disabled = ! upEnabled;
      } else if (element.classList.contains(OPERATION_DOWN)) {
        element.disabled = ! downEnabled;
      } else {
        element.disabled = false;
      }
    }
  }

  enableButton(nodeIndex, enabledOperation) {
    _setButtonEnabled(this.getNode(nodeIndex), enabledOperation, true);
  }

  disableButton(nodeIndex, disabledOperation) {
    _setButtonEnabled(this.getNode(nodeIndex), disabledOperation, false);
  }

  enableInsertButtonAll() {
    this.nodes.forEach((node) => {
        if (! _setButtonEnabled(node, OPERATION_INSERT, true)) {
          _setButtonEnabled(node, OPERATION_APPEND, true);
        }
      });
  }

  disableInsertButtonAll() {
    this.nodes.forEach((node) => {
        if (! _setButtonEnabled(node, OPERATION_INSERT, false)) {
          _setButtonEnabled(node, OPERATION_APPEND, false);
        }
      });
  }

  clear() {
    this.nodes = new Array();
    this.insertButtonGroup.removeElementAll();
    this.focusedNodeGroup.removeElementAll();
  }

  /*
   * Returns the group of elements included in the node of a filtering target
   * or news selection which is selected when "focus" event occurs on its.
   */
  getFocusedNodeGroup() {
    return this.focusedNodeGroup;
  }

  setEventRelation(eventGroup) {
    eventGroup.setEventRelation(this.insertButtonGroup);
    eventGroup.setEventRelation(this.focusedNodeGroup);
  }
}
