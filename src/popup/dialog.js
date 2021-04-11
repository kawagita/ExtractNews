/*
 *  Create the message dialog on a window for the current tab or edit window.
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

const _Event = ExtractNews.Event;
const _Popup = ExtractNews.Popup;

var dialogMessageBox = document.getElementById("DialogMessageBox");
var dialogMessageLabel = dialogMessageBox.querySelector("label");
var dialogButtonOK = document.querySelector("#DialogButtonGroup button");

browser.runtime.onMessage.addListener((message) => {
    if (message.command == ExtractNews.COMMAND_DIALOG_ALERT) {
      for (const paragraph of dialogMessageBox.querySelectorAll("p")) {
        dialogMessageBox.removeChild(paragraph);
      }
      var dialogMessage = message.message;
      var dialogMessageBreakIndex = dialogMessage.indexOf("\n");
      var dialogMessageNodes = dialogMessageLabel.childNodes;
      for (let i = dialogMessageNodes.length - 1; i >= 0; i--) {
        dialogMessageLabel.removeChild(dialogMessageNodes[i]);
      }
      if (dialogMessageBreakIndex >= 0) {
        // Insert a br element to the message instead of "\n".
        dialogMessageLabel.appendChild(
          document.createTextNode(
            dialogMessage.substring(0, dialogMessageBreakIndex)));
        dialogMessageLabel.appendChild(document.createElement("br"));
        dialogMessage = dialogMessage.substring(dialogMessageBreakIndex + 1);
      }
      dialogMessageLabel.appendChild(document.createTextNode(dialogMessage));
      if (message.description != "") {
        // Set the text content of a paragraph to the specified description
        // and emphasis by the specified regular expression.
        var dialogParagraph = document.createElement("p");
        if (message.emphasisRegularExpression != "") {
          var description = message.description;
          var descriptionIndex = 0;
          var emphasisRegexp =
            new RegExp(message.emphasisRegularExpression, "g");
          var emphasis;
          while ((emphasis = emphasisRegexp.exec(description)) != null) {
            var dialogParagraphEmphasis = document.createElement("span");
            dialogParagraphEmphasis.textContent = emphasis[1];
            dialogParagraph.appendChild(
              document.createTextNode(
                description.substring(descriptionIndex, emphasis.index)));
            dialogParagraph.appendChild(dialogParagraphEmphasis);
            descriptionIndex = emphasis.index + emphasis[1].length;
          }
          dialogParagraph.appendChild(
            document.createTextNode(description.substring(descriptionIndex)));
        } else { // No emphasis of a description
          dialogParagraph.textContent = message.description;
        }
        dialogMessageBox.appendChild(dialogParagraph);
      }
      callAsynchronousAPI(browser.windows.getCurrent).then((window) => {
          return callAsynchronousAPI(browser.windows.update, window.id, {
            height:
              Math.floor(document.body.getBoundingClientRect().bottom + 40),
            width: window.width
          });
        }).catch((error) => {
          Debug.printStackTrace(error);
        });
    }
  });

const DIALOG_OPENER_TAB_ID =
  _Popup.getQueryMap(document.URL).get(_Popup.QUERY_OPENER_TAB_ID);

const ON_DIALOG_TAB = " on Dialog Tab" + DIALOG_OPENER_TAB_ID;

ExtractNews.sendRuntimeMessage({
    command: ExtractNews.COMMAND_DIALOG_STANDBY,
    tabId: DIALOG_OPENER_TAB_ID
  }, ON_DIALOG_TAB).catch((error) => {
    Debug.printStackTrace(error);
  });

dialogButtonOK.addEventListener(_Event.CLICK, (event) => {
    (new Promise((resolve) => {
        setTimeout(() => { resolve(); }, 100);
      }));
    ExtractNews.sendRuntimeMessage({
        command: ExtractNews.COMMAND_DIALOG_CLOSE,
        tabId: DIALOG_OPENER_TAB_ID
      }, ON_DIALOG_TAB).catch((error) => {
        Debug.printStackTrace(error);
      });
  });

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
