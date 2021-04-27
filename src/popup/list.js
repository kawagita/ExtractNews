/*
 *  Display the list of news selections opened by the browser action.
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
const _Event = ExtractNews.Event;
const _Popup = ExtractNews.Popup;

/*
 * Returns the message on the browser action.
 */
function getBrowserActionMessage(id) {
  return browser.i18n.getMessage("browserAction" + id);
}

const PAGE_INDEX_STRING_ARRAYS = new Array();
const PAGE_LIST_ITEM_COUNT = 10;
const PAGE_LIST_ITEM_FAVICON_MAP = new Map();
const PAGE_LIST_ITEM_DEFAULT_FAVICON = "../icons/night-40.png";

// The array of news selections displayed to list items on the current page.
var listNewsSelections = new Array();
var listFaviconIds = new Array();

/*
 * Removes news selections for the specified indexes on the list of a page
 * for the specified index from the local storage and return the promise.
 */
function removeNewsSelections(pageIndex, listItemIndexes) {
  var removedIndexStrings = new Array();
  listItemIndexes.forEach((listItemIndex) => {
      removedIndexStrings.push(
        PAGE_INDEX_STRING_ARRAYS[pageIndex][listItemIndex]);
    });
  return _Storage.removeNewsSelections(removedIndexStrings).then(() => {
      Debug.printMessage(
        "Remove the news selection of " + removedIndexStrings.join(", ")
        + ".");

      // Adjust PAGE_INDEX_STRING_ARRAYS by the removed size.
      var lastPageIndex = PAGE_INDEX_STRING_ARRAYS.length - 1;
      var lastPageIndexCount = PAGE_INDEX_STRING_ARRAYS[lastPageIndex].length;
      var removedIndexCount = removedIndexStrings.length;
      if (removedIndexCount >= lastPageIndexCount) {
        // Reduce all index strings for the last page if the removed size
        // is equal to or greater than its.
        removedIndexCount -= lastPageIndexCount;
        PAGE_INDEX_STRING_ARRAYS.splice(lastPageIndex);
        lastPageIndex--;
      }
      // Reduce index strings by the rest count for the current last page.
      if (removedIndexCount > 0) {
        PAGE_INDEX_STRING_ARRAYS[lastPageIndex].splice(- removedIndexCount);
      }
      // No longer reduce index strings by removing the last page.
      return Promise.resolve();
    });
}

// The count of news selections displeyed on pages
var pagesNewsSelectionCount = 0;

// The list to display news selections on the current page
var pageList = document.querySelector("#NewsSelections ol");

function _toggleListItemPointedTarget(listItemIndex) {
  _Event.togglePointedTarget(pageList.children[listItemIndex]);
}

// The index or array of indexes for list items pointed on a page
var listItemPointedIndex = -1;
var listItemMultiPointedIndexes = new Array();
var listItemPointedExpansion = 0;

function _getListItemPointedIndexes() {
  if (listItemMultiPointedIndexes.length > 0) {
    return listItemMultiPointedIndexes;
  } else if (listItemPointedIndex >= 0) {
    return Array.of(listItemPointedIndex);
  }
  throw newUnsupportedOperationException();
}

// The bottom point of list items on a page.
var listBottomPoint = 0;
var listBottomPointEnabled = true;

document.body.addEventListener(_Event.POINTER_UP, (event) => {
    listBottomPointEnabled = true;
  });

document.body.addEventListener(_Event.POINTER_DOWN, (event) => {
    // Open the window to edit new setting if the point below the last item
    // is clicked on the current page without showing the action UI.
    if (! pageListActionUI.isMenuVisible()
      && ! event.ctrlKey && ! event.shiftKey
      && event.clientY > listBottomPoint
      && pagesNewsSelectionCount >= 0
      && pagesNewsSelectionCount < ExtractNews.SELECTION_MAX_COUNT) {
      if (listBottomPointEnabled) {
        _Popup.closeNewsSelectionEditWindow().then(() => {
            return _Popup.openNewsSelectionEditWindow();
          }).catch((error) => {
            Debug.printStackTrace(error);
          }).finally(() => {
            window.close();
          });
      }
    }
  });

const LIST_ITEM_OPEN_IN_PRESENT_TAB = "OpenInPresentTab";
const LIST_ITEM_OPEN_IN_NEW_TAB = "OpenInNewTab";
const LIST_ITEM_EDIT = "Edit";
const LIST_ITEM_REMOVE = "Remove";

/*
 * The user interface to act a news selection set into the list item.
 */
class PageListActionUI {
  constructor() {
    var actionUI = document.getElementById("NewsSelectionAction");
    var actionHeader = document.querySelector(".action_header");
    var actionTitle = actionHeader.firstElementChild;
    var actionUICloseButton = actionHeader.lastElementChild;
    actionTitle.textContent = getBrowserActionMessage("HowToAct");
    actionUICloseButton.tabIndex = -1;
    actionUICloseButton.addEventListener(_Event.POINTER_DOWN, (event) => {
        this.closeMenu(event);
      });
    actionUICloseButton.addEventListener("focus", (event) => {
        if (this.actionMenuPointedIndex >= 0) {
          this._toggleActionMenuItem(this.actionMenuPointedIndex);
          this.actionMenuPointedIndex = -1;
        }
        this.actionUICloseButtonFocus = true;
      });
    actionUICloseButton.addEventListener("blur", (event) => {
        this.actionUICloseButtonFocus = false;
      });
    this.actionUI = actionUI;
    this.actionUICloseButton = actionUICloseButton;
    this.actionMenuItems = Array.from(actionUI.querySelectorAll("li"));
    for (let i = 0; i < this.actionMenuItems.length; i++) {
      this.actionMenuItems[i].value = String(i);
    }
    this.actionMenuCount = 0;
    this.actionMenuPointedIndex = -1;
    this.actionMenuDisabled = new Array();
    this.fireMenuItemEvents = new Array();
    this.openInPresentTabMenuIndex = -1;
    this.openInNewTabMenuIndex = -1;
    this.editMenuIndex = -1;
  }

  addMenuItem(actionName, fireMenuItemEvent) {
    if (this.actionMenuCount >= this.actionMenuItems.length) {
      throw newIndexOutOfBoundsException(
        "action menu items", this.actionMenuCount);
    }
    if (actionName != undefined) {
      var actionMenuIndex = this.actionMenuCount;
      var actionMenuItem = this.actionMenuItems[actionMenuIndex];
      var actionMenuLabel = actionMenuItem.firstElementChild;
      actionMenuLabel.textContent = getBrowserActionMessage(actionName);
      actionMenuItem.addEventListener(_Event.POINTER_MOVE, (event) => {
          var target = _Event.getEventTarget(event, "LI");
          if (target != null) {
            var menuIndex = Number(target.value);
            if (! this.actionMenuDisabled[menuIndex]
                && menuIndex != this.actionMenuPointedIndex) {
              if (this.actionMenuPointedIndex >= 0) {
                this._toggleActionMenuItem(this.actionMenuPointedIndex);
              }
              _Event.togglePointedTarget(target);
              this.actionMenuPointedIndex = menuIndex;
            }
            this.actionUICloseButton.blur();
          }
        });
      actionMenuItem.addEventListener(_Event.POINTER_LEAVE, (event) => {
          var target = _Event.getEventTarget(event, "LI");
          if (target != null) {
            if (this.actionMenuPointedIndex == Number(target.value)) {
              _Event.togglePointedTarget(target);
              this.actionMenuPointedIndex = -1;
            }
          }
        });
      actionMenuItem.addEventListener(_Event.POINTER_DOWN, (event) => {
          var target = _Event.getEventTarget(event, "LI");
          if (target != null) {
            var menuIndex = Number(target.value);
            if (! this.actionMenuDisabled[menuIndex]) {
              fireMenuItemEvent(event);
            }
          }
        });
      this.actionMenuDisabled.push(false);
      this.fireMenuItemEvents.push(fireMenuItemEvent);
      switch (actionName) {
      case LIST_ITEM_OPEN_IN_PRESENT_TAB:
        this.openInPresentTabMenuIndex = actionMenuIndex;
        break;
      case LIST_ITEM_OPEN_IN_NEW_TAB:
        this.openInNewTabMenuIndex = actionMenuIndex;
        break;
      case LIST_ITEM_EDIT:
        this.editMenuIndex = actionMenuIndex;
        break;
      }
    } else {
      this.actionMenuDisabled.push(true);
      this.fireMenuItemEvents.push(undefined);
    }
    this.actionMenuCount++;
  }

  _toggleActionMenuItem(menuItemIndex) {
    _Event.togglePointedTarget(this.actionMenuItems[menuItemIndex]);
  }

  isMenuVisible() {
    return this.actionUI.style.visibility == "visible";
  }

  hasCloseButtonFocus() {
    return this.actionUICloseButtonFocus;
  }

  execute(event) {
    var editMenuClassName = "";
    var editMenuDisabled = false;
    var openInNewTabMenuDisabled = true;
    if (listItemMultiPointedIndexes.length > 0) {
      if (listItemMultiPointedIndexes.length > 1
        && pagesNewsSelectionCount >= ExtractNews.SELECTION_MAX_COUNT) {
        // Disable the menu item to edit the news selection by concatenating
        // regular expressions newly if not saved by the maximum.
        editMenuClassName = "disabled";
        editMenuDisabled = true;
      }
      for (const listItemIndex of listItemMultiPointedIndexes) {
        if (listNewsSelections[listItemIndex].openedUrl != URL_ABOUT_BLANK) {
          openInNewTabMenuDisabled = false;
          break;
        }
      }
    } else {
      if (event.button == 0 || event.code == "Enter") {
        // Open news selection's URL in the present tab by Left click or Enter.
        this.fireMenuItemEvents[this.openInPresentTabMenuIndex](event);
        return;
      }
      openInNewTabMenuDisabled =
        listNewsSelections[listItemPointedIndex].openedUrl == URL_ABOUT_BLANK;
    }
    if (openInNewTabMenuDisabled) {
      this.actionMenuItems[this.openInNewTabMenuIndex].className = "disabled";
      this.actionMenuDisabled[this.openInNewTabMenuIndex] = true;
    }
    this.actionMenuItems[this.editMenuIndex].className = editMenuClassName;
    this.actionMenuDisabled[this.editMenuIndex] = editMenuDisabled;
    this.actionUICloseButton.tabIndex = 1;
    this.actionUICloseButtonFocus = false;
    this.actionUI.style.visibility = "visible";
  }

  closeMenu(event) {
    if (event.type == _Event.POINTER_DOWN) {
      // Never open the edit window by a pointer down to close this action UI.
      listBottomPointEnabled = false;
    }
    if (listItemPointedIndex >= 0) {
      _toggleListItemPointedTarget(listItemPointedIndex);
      listItemPointedIndex = -1;
    }
    listItemMultiPointedIndexes.forEach(_toggleListItemPointedTarget);
    listItemMultiPointedIndexes = new Array();
    listItemPointedExpansion = 0;
    if (this.actionMenuPointedIndex >= 0) {
      this._toggleActionMenuItem(this.actionMenuPointedIndex);
      this.actionMenuPointedIndex = -1;
    }
    this.actionMenuItems[this.openInNewTabMenuIndex].className = "";
    this.actionMenuItems[this.editMenuIndex].className = "";
    this.actionMenuDisabled[this.openInNewTabMenuIndex] = false;
    this.actionMenuDisabled[this.editMenuIndex] = false;
    this.actionUI.style.visibility = "hidden";
    this.actionUICloseButton.tabIndex = -1;
  }

  selectMenuItem(event) {
    if (this.actionMenuPointedIndex >= 0) {
      this.fireMenuItemEvents[this.actionMenuPointedIndex](event);
    }
  }

  movePointedMenuItemUp(event) {
    if (this.actionMenuPointedIndex > 0
      && this.actionMenuPointedIndex < this.actionMenuItems.length) {
      if (this.actionMenuPointedIndex >= 0) {
        this._toggleActionMenuItem(this.actionMenuPointedIndex);
      }
      this.actionMenuPointedIndex--;
      while (this.actionMenuDisabled[this.actionMenuPointedIndex]) {
        this.actionMenuPointedIndex--;
      }
      this._toggleActionMenuItem(this.actionMenuPointedIndex);
      this.actionUICloseButton.blur();
    }
  }

  movePointedMenuItemDown(event) {
    if (this.actionMenuPointedIndex >= -1
      && this.actionMenuPointedIndex < this.actionMenuItems.length - 1) {
      if (this.actionMenuPointedIndex >= 0) {
        this._toggleActionMenuItem(this.actionMenuPointedIndex);
      }
      this.actionMenuPointedIndex++;
      while (this.actionMenuDisabled[this.actionMenuPointedIndex]) {
        this.actionMenuPointedIndex++;
      }
      this._toggleActionMenuItem(this.actionMenuPointedIndex);
      this.actionUICloseButton.blur();
    }
  }
}

var pageListActionUI = new PageListActionUI();

// The manager of the index and size of pages on which the list of news
// selections is displayed.
var pageManager;

// Enable or disable to change background colors of an item by pointer moving
// and show the action UI when a control key is up or down.

document.body.addEventListener("keyup", (event) => {
    switch (event.code) {
    case "ControlLeft":
    case "ControlRight":
    case "ShiftLeft":
    case "ShiftRight":
      // Show the action UI if items are selected with a control on the list.
      if (! pageListActionUI.isMenuVisible()
          && ! event.ctrlKey && ! event.shiftKey
          && listItemMultiPointedIndexes.length > 0) {
        pageListActionUI.execute(event);
      }
      break;
    }
  });

document.body.addEventListener("keydown", (event) => {
    switch (event.code) {
    case "Enter":
      if (pageListActionUI.isMenuVisible()) {
        // Close the menu of the action UI if the close button has focus,
        // otherwise, select a menu item and execute the action for its.
        if (pageListActionUI.hasCloseButtonFocus()) {
          pageListActionUI.closeMenu(event);
        } else {
          pageListActionUI.selectMenuItem(event);
        }
      } else if (listItemPointedIndex >= 0) {
        // Show the action UI immediately if an item is selected on the list.
        pageListActionUI.execute(event);
      } else if (! event.ctrlKey && ! event.shiftKey
        && pagesNewsSelectionCount < ExtractNews.SELECTION_MAX_COUNT) {
        _Popup.closeNewsSelectionEditWindow().then(() => {
            return _Popup.openNewsSelectionEditWindow();
          }).catch((error) => {
            Debug.printStackTrace(error);
          }).finally(() => {
            window.close();
          });
      }
      break;
    case "ArrowUp":
      if (pageListActionUI.isMenuVisible()) {
        // Move the index of a pointed menu item up on the action UI.
        pageListActionUI.movePointedMenuItemUp(event);
      } else if (! event.ctrlKey && listNewsSelections.length > 0) {
        var lastListItemIndex =
          PAGE_INDEX_STRING_ARRAYS[pageManager.pageIndex].length - 1;
        if (event.shiftKey) { // Expansion of pointed items with a shift key
          if (listItemMultiPointedIndexes.length > 0) {
            if (listItemPointedExpansion <= 0) {
              // Expand pointed items upward on the list.
              var listItemIndex = listItemMultiPointedIndexes[0]
                + listItemPointedExpansion - 1;
              if (listItemIndex >= 0) {
                listItemMultiPointedIndexes.push(listItemIndex);
                listItemPointedExpansion--;
                _toggleListItemPointedTarget(listItemIndex);
              }
            } else {
              // Reduce the expansion from the bottom of pointed items.
              _toggleListItemPointedTarget(
                listItemMultiPointedIndexes.pop());
              listItemPointedExpansion--;
            }
          } else { // The bottom item pointed on the list
            listItemMultiPointedIndexes.push(lastListItemIndex);
            _toggleListItemPointedTarget(lastListItemIndex);
          }
        } else if (listItemPointedIndex >= -1
          && listItemPointedIndex <= lastListItemIndex) {
          // Move the index of a pointed item up on the list.
          if (listItemPointedIndex >= 0) {
            // Turn off if an item has already been pointed on the list.
            _toggleListItemPointedTarget(listItemPointedIndex);
          }
          if (listItemPointedIndex != 0) {
            if (listItemPointedIndex < 0) {
              // Appear a pointed item from the bottom of the list.
              listItemPointedIndex = lastListItemIndex;
            } else {
              listItemPointedIndex--;
            }
            _toggleListItemPointedTarget(listItemPointedIndex);
          } else {
            // Hide a pointed item to the top of the list.
            listItemPointedIndex = -1;
          }
        }
      }
      break;
    case "ArrowDown":
      if (pageListActionUI.isMenuVisible()) {
        // Move the index of a pointed item down on the action UI.
        pageListActionUI.movePointedMenuItemDown(event);
      } else if (! event.ctrlKey && listNewsSelections.length > 0) {
        var lastListItemIndex =
          PAGE_INDEX_STRING_ARRAYS[pageManager.pageIndex].length - 1;
        if (event.shiftKey) { // Expansion of pointed items with a shift key
          if (listItemMultiPointedIndexes.length > 0) {
            if (listItemPointedExpansion >= 0) {
              // Expand pointed items downward on the list.
              var listItemIndex = listItemMultiPointedIndexes[0]
                + listItemPointedExpansion + 1;
              if (listItemIndex <= lastListItemIndex) {
                listItemMultiPointedIndexes.push(listItemIndex);
                listItemPointedExpansion++;
                _toggleListItemPointedTarget(listItemIndex);
              }
            } else {
              // Reduce the expansion from the top of pointed items.
              _toggleListItemPointedTarget(
                listItemMultiPointedIndexes.pop());
              listItemPointedExpansion++;
            }
          } else { // The top item pointed on the list
            listItemMultiPointedIndexes.push(0);
            _toggleListItemPointedTarget(0);
          }
        } else if (listItemPointedIndex >= -1
          && listItemPointedIndex <= lastListItemIndex) {
          // Move the index of a pointed item down on the list.
          if (listItemPointedIndex >= 0) {
            // Turn off if an item has already been pointed on the list.
            _toggleListItemPointedTarget(listItemPointedIndex);
          }
          if (listItemPointedIndex < lastListItemIndex) {
            listItemPointedIndex++;
            _toggleListItemPointedTarget(listItemPointedIndex);
          } else {
            // Hide a pointed item to the bottom of the list.
            listItemPointedIndex = -1;
          }
        }
      }
      break;
    case "ArrowLeft":
      if (! pageManager.isFirstPageKeeping()
          && ! event.ctrlKey && ! event.shiftKey) {
        pageManager.movePage(_Event.PAGE_MOVE_BACK_EVENT);
      }
      break;
    case "ArrowRight":
      if (! pageManager.isLastPageKeeping()
          && ! event.ctrlKey && ! event.shiftKey) {
        pageManager.movePage(_Event.PAGE_MOVE_FORWARD_EVENT);
      }
      break;
    case "ControlLeft":
    case "ControlRight":
      // Clear changing the background color of a pointed item on the list.
      if (! event.shiftKey && listItemPointedIndex >= 0) {
        _toggleListItemPointedTarget(listItemPointedIndex);
        listItemPointedIndex = -1;
      }
      break;
    case "ShiftLeft":
    case "ShiftRight":
      // Add the origin of a range to the array of pointed items.
      if (! event.ctrlKey && listItemPointedIndex >= 0) {
        listItemMultiPointedIndexes.push(listItemPointedIndex);
        listItemPointedIndex = -1;
      }
      break;
    }
  });

/*
 * Displays the list of news selections on a page for the specified index
 * and returns the promise.
 */
function displayPageList(pageIndex) {
  return _Storage.readNewsSelections(
    PAGE_INDEX_STRING_ARRAYS[pageIndex]).then((newsSelections) => {
      const readingPromises = new Array();
      newsSelections.forEach((newsSelection) => {
          var faviconId = undefined;
          if (newsSelection.openedUrl != URL_ABOUT_BLANK) {
            var newsSite = ExtractNews.getNewsSite(newsSelection.openedUrl);
            if (newsSite != undefined) {
              faviconId =
                ExtractNews.getNewsSiteFaviconId(
                  newsSite.id, newsSelection.openedUrl);
            }
          }
          if (faviconId != undefined) {
            if (listFaviconIds.indexOf(faviconId) < 0
              && ! PAGE_LIST_ITEM_FAVICON_MAP.has(faviconId)) {
              // Read the favicon string from the local storage if not exist
              // in the current list and buffered map.
              readingPromises.push(
                _Storage.readFavicon(faviconId).then((favicon) => {
                    if (favicon != "") {
                      PAGE_LIST_ITEM_FAVICON_MAP.set(faviconId, favicon);
                    }
                    return Promise.resolve();
                  }));
            }
          } else { // No page opened by news selection
            faviconId = "";
          }
          listNewsSelections.push(newsSelection);
          listFaviconIds.push(faviconId);
        });
      return Promise.all(readingPromises);
    }).then(() => {
      for (let i = 0; i < listNewsSelections.length; i++) {
        var newsSelection = listNewsSelections[i];
        var listItem = document.createElement("li");
        var listItemTitle = document.createElement("span");
        var listItemFavicon = document.createElement("img");
        var favicon = PAGE_LIST_ITEM_FAVICON_MAP.get(listFaviconIds[i]);
        if (favicon != undefined) {
          listItemFavicon.src = favicon;
        } else {
          listItemFavicon.src = PAGE_LIST_ITEM_DEFAULT_FAVICON;
        }
        listItemTitle.textContent = newsSelection.settingName;
        listItem.value = String(i);
        listItem.addEventListener(_Event.POINTER_DOWN, (event) => {
            var target = _Event.getEventTarget(event, "LI");
            if (target != null && ! pageListActionUI.isMenuVisible()) {
              var listItemIndex = Number(target.value);
              if (event.ctrlKey) {
                // Add or remove the index of an item to or from the array
                // of pointed items if selected or not.
                if (_Event.togglePointedTarget(target)) {
                  listItemMultiPointedIndexes.push(listItemIndex);
                } else {
                  listItemMultiPointedIndexes.splice(
                    listItemMultiPointedIndexes.indexOf(listItemIndex), 1);
                }
              } else if (! event.shiftKey) {
                // Select an item and immediately show the action UI.
                if (listItemPointedIndex < 0) {
                  _Event.togglePointedTarget(target);
                  listItemPointedIndex = listItemIndex;
                }
                pageListActionUI.execute(event);
              }
            }
          });
        listItem.addEventListener(_Event.POINTER_MOVE, (event) => {
            var target = _Event.getEventTarget(event, "LI");
            if (target != null && ! pageListActionUI.isMenuVisible()
              && ! event.ctrlKey && ! event.shiftKey) {
              var listItemIndex = Number(target.value);
              if (listItemIndex != listItemPointedIndex) {
                if (listItemPointedIndex >= 0) {
                  _toggleListItemPointedTarget(listItemPointedIndex);
                }
                _Event.togglePointedTarget(target);
                listItemPointedIndex = listItemIndex;
              }
            }
          });
        listItem.addEventListener(_Event.POINTER_LEAVE, (event) => {
            var target = _Event.getEventTarget(event, "LI");
            if (target != null && ! pageListActionUI.isMenuVisible()
              && listItemPointedIndex == Number(target.value)) {
              _Event.togglePointedTarget(target);
              listItemPointedIndex = -1;
            }
          });
        listItem.appendChild(listItemTitle);
        listItem.appendChild(listItemFavicon);
        pageList.appendChild(listItem);
      }
      listBottomPoint =
        pageList.lastElementChild.getBoundingClientRect().bottom;
    }).catch((error) => {
      Debug.printStackTrace(error);
    });
}

/*
 * Clears the list of news selections diplayed on a page.
 */
function clearPageList() {
  var listItems = Array.from(pageList.children);
  for (let i = 0; i < listItems.length; i++) {
    pageList.removeChild(listItems[i]);
  }
  listNewsSelections = new Array();
  listFaviconIds = new Array();
  listItemPointedIndex = -1;
  listItemMultiPointedIndexes = new Array();
  listItemPointedExpansion = 0;
  listBottomPoint = pageList.getBoundingClientRect().top;
}

/*
 * Displays the messege about the news selection instead of list items.
 */
function displayNewsSelectionMessage(pageMessageId) {
  var pageMessageElement = document.getElementById("NewsSelectionMessage");
  var pageMessageLabel = pageMessageElement.firstElementChild;
  pageMessageLabel.textContent = getBrowserActionMessage(pageMessageId);
  pageMessageElement.style.visibility = "visible";
}

// Displays the page header and title with the manager of page links.

{
  var pageHeader = document.querySelector(".page_header");
  var pageTitle = pageHeader.querySelector(".page_title");

  pageTitle.textContent = getBrowserActionMessage("NewsSelection");
  pageManager = new _Event.LinkedPageManager((event, pageIndex) => {
      pageListActionUI.closeMenu(event);
      clearPageList();
      if (pageIndex >= 0) {
        // Display the list of retained news selections on the same page
        // if all list items are not removed on the last page, otherwise,
        // the previous.
        displayPageList(pageIndex);
      } else {
        displayNewsSelectionMessage("NewsSelectionNotExist");
      }
    }, pageHeader.firstElementChild, pageHeader.lastElementChild);
}

// Sets the text label and event listener to the page header or action UI,
// and lastly call displayPageList() if a news selection exist.

_Storage.readEnabledNewsSiteIds().then((enabledSiteIds) => {
    ExtractNews.setEnabledNewsSites(enabledSiteIds);
    return _Popup.queryNewsSelectionEditWindow();
  }).then((editWindowTabId) => {
    if (editWindowTabId != browser.tabs.TAB_ID_NONE) {
      return Promise.resolve(-1);
    }
    return _Storage.readNewsSelectionCount();
  }).then((newsSelectionCount) => {
    if (newsSelectionCount >= 0) {
      var pageSize = 0;
      for (let i = 0; i < newsSelectionCount; i++) {
        if (i % PAGE_LIST_ITEM_COUNT == 0) {
          PAGE_INDEX_STRING_ARRAYS.push(new Array());
          pageSize++;
        }
        PAGE_INDEX_STRING_ARRAYS[pageSize - 1].push(String(i));
      }

      // Set menus to open, edit, or remove a new selection into the action UI
      // displayed when a list item is pointed down on the page.
      pageListActionUI.addMenuItem(LIST_ITEM_OPEN_IN_PRESENT_TAB, (event) => {
          var newsSelections = new Array();
          var listItemIndexStrings = new Array();
          _getListItemPointedIndexes().forEach((listItemIndex) => {
              newsSelections.push(listNewsSelections[listItemIndex]);
              listItemIndexStrings.push(String(listItemIndex));
            });
          _Popup.openNewsSelectionsInTab(false, newsSelections).then(() => {
              Debug.printMessage(
                "Open the list item of " + listItemIndexStrings.join(", ")
                + " in present tab on Page "
                + String(pageManager.pageIndex + 1) + ".");
            }).finally(() => {
              pageListActionUI.closeMenu(event);
              window.close();
            });
        });
      pageListActionUI.addMenuItem(LIST_ITEM_OPEN_IN_NEW_TAB, (event) => {
          const applyingPromises = new Array();
          var listItemIndexStrings = new Array();
          _getListItemPointedIndexes().forEach((listItemIndex) => {
              var newsSelection = listNewsSelections[listItemIndex];
              if (newsSelection.openedUrl == URL_ABOUT_BLANK) {
                return;
              }
              applyingPromises.push(
                _Popup.openNewsSelectionsInTab(true, Array.of(newsSelection)));
              listItemIndexStrings.push(String(listItemIndex));
            });
          Promise.all(applyingPromises).then(() => {
              Debug.printMessage(
                "Open the list item of " + listItemIndexStrings.join(", ")
                + " in new tab on Page "
                + String(pageManager.pageIndex + 1) + ".");
            }).catch((error) => {
              Debug.printStackTrace(error);
            }).finally(() => {
              pageListActionUI.closeMenu(event);
              window.close();
            });
        });
      pageListActionUI.addMenuItem(); // Separator as a menu item
      pageListActionUI.addMenuItem(LIST_ITEM_EDIT, (event) => {
          var editIndexStrings = new Array();
          var pageIndex = pageManager.pageIndex;
          _getListItemPointedIndexes().forEach((listItemIndex) => {
              editIndexStrings.push(
                PAGE_INDEX_STRING_ARRAYS[pageIndex][listItemIndex]);
            });
          _Popup.closeNewsSelectionEditWindow().then(() => {
              Debug.printMessage(
                "Edit the news selection of " + editIndexStrings.join(", ")
                + ".");
              return _Popup.openNewsSelectionEditWindow(editIndexStrings);
            }).catch((error) => {
              Debug.printStackTrace(error);
            }).finally(() => {
              pageListActionUI.closeMenu(event);
              window.close();
            });
        });
      pageListActionUI.addMenuItem(); // Separator as a menu item
      pageListActionUI.addMenuItem(LIST_ITEM_REMOVE, (event) => {
          var removedListItemIndexes = _getListItemPointedIndexes();
          removeNewsSelections(
            pageManager.pageIndex, removedListItemIndexes).then(() => {
              Debug.printMessage(
                "Remove the list item of " + removedListItemIndexes.join(", ")
                + " on Page " + String(pageManager.pageIndex + 1) + ".");
              pagesNewsSelectionCount -= removedListItemIndexes.length;
              pageManager.setPageSize(PAGE_INDEX_STRING_ARRAYS.length);
            }).catch((error) => {
              Debug.printStackTrace(error);
            });
        });

      // Call the update function in the page manager, and display the link to
      // the previous or next page and list items on the first page, otherwise,
      // the message of no news selection.
      pageManager.setPageSize(pageSize);
    } else {
      displayNewsSelectionMessage("NewsSelectionNowEditing");
    }
    pagesNewsSelectionCount = newsSelectionCount;

    return ExtractNews.getDebugMode();
  }).catch((error) => {
    Debug.printStackTrace(error);
  });

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
