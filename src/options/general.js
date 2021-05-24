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
const _File = ExtractNews.File;
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
 * Sends the specified warning message on this option page to the background.
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
 * Sends data of the specified object with "Update" command to the background.
 */
function sendOpitonUpdateMessage(updateObject = { }) {
  ExtractNews.sendRuntimeMessage(Object.assign({
      command: ExtractNews.COMMAND_SETTING_UPDATE
    }, updateObject), " on Option Page Tab");
}

// Variables and functions to operate a filtering target or news selection.

const OPERATION_INSERT = "insert";
const OPERATION_APPEND = "append";

const OPERATION_LOCALIZE = "localize";
const OPERATION_MOVE_UP = "up";
const OPERATION_MOVE_DOWN = "down";
const OPERATION_EDIT = "edit";
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
 * The pane of filterings or news selections on this option page.
 */
class OptionPane {
  constructor(name, focusedNodeGroup) {
    this.pane = {
        element: document.getElementById(name + "Pane"),
        nodes: new Array(),
        insertButtonGroup: new _Event.PointedGroup(),
        focusedNodeGroup: focusedNodeGroup
      };
    this.pane.insertButtonGroup.setEventRelation(focusedNodeGroup);
  }

  get element() {
    return this.pane.element;
  }

  get nodeSize() {
    return this.pane.nodes.length;
  }

  /*
   * Returns the index of the filtering target or news selection node
   * on which the event occurs.
   */
  getEventNodeIndex(event) {
    for (let i = 0; i < this.nodeSize; i++) {
      if (this.pane.nodes[i].contains(event.target)) {
        return i;
      }
    }
    return -1;
  }

  getNode(nodeIndex) {
    if (nodeIndex < 0 || nodeIndex >= this.nodeSize) {
      throw newIndexOutOfBoundsException("section nodes", nodeIndex);
    }
    return this.pane.nodes[nodeIndex];
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
    this.pane.nodes.splice(nodeIndex, 0, node);
    var insertButton = node.querySelector("button." + OPERATION_INSERT);
    if (insertButton == null) {
      insertButton = node.querySelector("button." + OPERATION_APPEND);
    }
    insertButton.addEventListener(_Event.CLICK, fireNodeInsertEvent);
    this.pane.insertButtonGroup.addElement(insertButton);
    var focusedNode = this.getFocusedNode(nodeIndex);
    if (focusedNode != null) {
      if (fireDataInputEvent != undefined) {
        for (const element of focusedNode.querySelectorAll("input")) {
          element.addEventListener("input", fireDataInputEvent);
          this.pane.focusedNodeGroup.addElement(element);
        }
      }
      for (const element of focusedNode.querySelectorAll("button")) {
        switch (element.className) {
        case OPERATION_LOCALIZE:
          element.addEventListener(_Event.CLICK, fireWordsLocalizeEvent);
          break;
        case OPERATION_MOVE_UP:
        case OPERATION_MOVE_DOWN:
          element.addEventListener(_Event.CLICK, fireNodeMoveEvent);
          break;
        case OPERATION_REMOVE:
          element.addEventListener(_Event.CLICK, fireNodeRemoveEvent);
          break;
        }
        this.pane.focusedNodeGroup.addElement(element);
      }
    }
  }

  removeNode(nodeIndex) {
    if (nodeIndex < 0 || nodeIndex >= this.nodeSize) {
      throw newIndexOutOfBoundsException("section nodes", nodeIndex);
    }
    var focusedNode = this.getFocusedNode(nodeIndex);
    var node = this.pane.nodes.splice(nodeIndex, 1)[0];
    var insertButton = node.querySelector("button." + OPERATION_INSERT);
    if (insertButton == null) {
      insertButton = node.querySelector("button." + OPERATION_APPEND);
    }
    this.pane.insertButtonGroup.removeElement(insertButton);
    if (focusedNode != null) {
      for (const element of focusedNode.querySelectorAll("input, button")) {
        this.pane.focusedNodeGroup.removeElement(element);
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
    this.pane.nodes.splice(
      movedDownIndex, 0, this.pane.nodes.splice(movedUpIndex, 1)[0]);
  }

  _scrollToNodeTop(node) {
    window.scroll(
      0, node.getBoundingClientRect().top
        - this.pane.nodes[0].getBoundingClientRect().top);
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
      this._scrollToNodeTop(node);
      return true;
    }
    return false;
  }

  enableAllButtons(nodeIndex, moveUpEnabled = true, moveDownEnabled = true) {
    for (const element of this.getNode(nodeIndex).querySelectorAll("button")) {
      if (element.classList.contains(OPERATION_MOVE_UP)) {
        element.disabled = ! moveUpEnabled;
      } else if (element.classList.contains(OPERATION_MOVE_DOWN)) {
        element.disabled = ! moveDownEnabled;
      } else {
        element.disabled = false;
      }
    }
  }

  enableButton(nodeIndex, enabledOperation) {
    _setButtonEnabled(this.getNode(nodeIndex), enabledOperation, true);
  }

  disableButton(nodeIndex, disabledOperation) {
    _setButtonEnabled(this.getNode(nodeIndex), disabledOperation, true);
  }

  enableInsertButtonAll() {
    this.pane.nodes.forEach((node) => {
        if (! _setButtonEnabled(node, OPERATION_INSERT, true)) {
          _setButtonEnabled(node, OPERATION_APPEND, true);
        }
      });
  }

  disableInsertButtonAll() {
    this.pane.nodes.forEach((node) => {
        if (! _setButtonEnabled(node, OPERATION_INSERT, false)) {
          _setButtonEnabled(node, OPERATION_APPEND, false);
        }
      });
  }

  clear() {
    this.pane.nodes = new Array();
    this.pane.insertButtonGroup.removeElementAll();
    this.pane.focusedNodeGroup.removeElementAll();
  }

  /*
   * Returns the group of elements included in the node of a filtering target
   * or news selection which is selected when "focus" event occurs on its.
   */
  getFocusedNodeGroup() {
    return this.pane.focusedNodeGroup;
  }

  setEventRelation(eventGroup) {
    eventGroup.setEventRelation(this.pane.insertButtonGroup);
    eventGroup.setEventRelation(this.pane.focusedNodeGroup);
  }
}
