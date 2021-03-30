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

const PAGE_LIST_INDEX_STRING_ARRAYS = new Array();
const PAGE_LIST_ITEM_COUNT = 10;
const PAGE_LIST_ITEM_FAVICON_MAP = new Map();
const PAGE_LIST_ITEM_DEFAULT_FAVICON = "../icons/night-40.png";

// The array of news selections displayed to list items on the current page.
var pageListNewsSelections = new Array();
var pageListFaviconIds = new Array();

/*
 * Removes news selections for the specified indexes on the list of a page
 * for the specified index from the local storage and return the promise.
 */
function removeNewsSelections(pageIndex, listItemIndexes) {
  var removedIndexStrings = new Array();
  listItemIndexes.forEach((listItemIndex) => {
      removedIndexStrings.push(
        PAGE_LIST_INDEX_STRING_ARRAYS[pageIndex][listItemIndex]);
    });
  return _Storage.removeNewsSelections(removedIndexStrings).then(() => {
      Debug.printMessage(
        "Remove the news selection of " + removedIndexStrings.join(", ")
        + ".");

      // Adjust PAGE_LIST_INDEX_STRING_ARRAYS by the removed size.
      var lastPageIndex = PAGE_LIST_INDEX_STRING_ARRAYS.length - 1;
      var lastPageListItemCount =
        PAGE_LIST_INDEX_STRING_ARRAYS[lastPageIndex].length;
      var removedListItemCount = removedIndexStrings.length;
      if (removedListItemCount >= lastPageListItemCount) {
        // Reduce all index strings for the last page if the removed size
        // is equal to or greater than its.
        removedListItemCount -= lastPageListItemCount;
        PAGE_LIST_INDEX_STRING_ARRAYS.splice(lastPageIndex);
        lastPageIndex--;
      }
      // Reduce index strings by the rest count for the current last page.
      if (removedListItemCount > 0) {
        var reducedSize = - removedListItemCount;
        PAGE_LIST_INDEX_STRING_ARRAYS[lastPageIndex].splice(reducedSize);
      }
      // No longer reduce index strings by removing the last page.
      return Promise.resolve();
    });
}

// The count of news selections displeyed on pages
var pageListNewsSelectionCount = 0;

// The list to display news selections on the current page
var pageList = document.querySelector("#NewsSelections ol");

function _togglePageListItemPointedTarget(listItemIndex) {
  _Event.togglePointedTarget(pageList.children[listItemIndex]);
}

// The index or array of indexes for list items pointed on a page
var pageListItemPointedIndex = -1;
var pageListItemMultiPointedIndexes = new Array();
var pageListItemPointedExpansion = 0;

function _getPageListItemPointedIndexes() {
  if (pageListItemMultiPointedIndexes.length > 0) {
    return pageListItemMultiPointedIndexes;
  } else if (pageListItemPointedIndex >= 0) {
    return Array.of(pageListItemPointedIndex);
  }
  throw newUnsupportedOperationException();
}

// The bottom point of list items on a page.
var pageListBottomPoint = 0;
var pageListBottomPointEnabled = true;

document.body.addEventListener(_Event.POINTER_UP, (event) => {
    pageListBottomPointEnabled = true;
  });

document.body.addEventListener(_Event.POINTER_DOWN, (event) => {
    // Open the window to edit new setting if the point below the last item
    // is clicked on the current page without showing the action UI.
    if (! pageListActionUI.isMenuVisible()
      && ! event.ctrlKey && ! event.shiftKey
      && event.clientY > pageListBottomPoint
      && pageListNewsSelectionCount >= 0
      && pageListNewsSelectionCount < ExtractNews.SELECTION_MAX_COUNT) {
      if (pageListBottomPointEnabled) {
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

const PAGE_LIST_ACTION_ID_OPEN_IN_PRESENT_TAB = "OpenInPresentTab";
const PAGE_LIST_ACTION_ID_OPEN_IN_NEW_TAB = "OpenInNewTab";
const PAGE_LIST_ACTION_ID_EDIT = "Edit";
const PAGE_LIST_ACTION_ID_REMOVE = "Remove";

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
      this.actionMenuItems[i].value = i;
    }
    this.actionMenuCount = 0;
    this.actionMenuPointedIndex = -1;
    this.actionMenuDisabled = new Array();
    this.fireMenuItemEvents = new Array();
    this.openInPresentTabMenuIndex = -1;
    this.openInNewTabMenuIndex = -1;
    this.editMenuIndex = -1;
  }

  addMenuItem(actionId, fireMenuItemEvent) {
    if (this.actionMenuCount >= this.actionMenuItems.length) {
      throw newIndexOutOfBoundsException(
        "action menu items", this.actionMenuCount);
    }
    if (actionId != "") {
      var actionMenuIndex = this.actionMenuCount;
      var actionMenuItem = this.actionMenuItems[actionMenuIndex];
      var actionMenuLabel = actionMenuItem.firstElementChild;
      actionMenuLabel.textContent = getBrowserActionMessage(actionId);
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
      switch (actionId) {
      case PAGE_LIST_ACTION_ID_OPEN_IN_PRESENT_TAB:
        this.openInPresentTabMenuIndex = actionMenuIndex;
        break;
      case PAGE_LIST_ACTION_ID_OPEN_IN_NEW_TAB:
        this.openInNewTabMenuIndex = actionMenuIndex;
        break;
      case PAGE_LIST_ACTION_ID_EDIT:
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
    var actionNewsSelection;
    var editMenuClassName = "";
    var editMenuDisabled = false;
    if (pageListItemMultiPointedIndexes.length > 0) {
      if (pageListItemMultiPointedIndexes.length > 1
        && pageListNewsSelectionCount >= ExtractNews.SELECTION_MAX_COUNT) {
        // Disable the menu item to edit the news selection by concatenating
        // regular expressions newly if not saved by the maximum.
        editMenuClassName = "disabled";
        editMenuDisabled = true;
      }
      actionNewsSelection =
        pageListNewsSelections[pageListItemMultiPointedIndexes[0]];
    } else {
      if (event.button == 0 || event.code == "Enter") {
        // Open news selection's URL in the present tab by Left click or Enter.
        this.fireMenuItemEvents[this.openInPresentTabMenuIndex](event);
        return;
      }
      actionNewsSelection = pageListNewsSelections[pageListItemPointedIndex];
    }
    if (actionNewsSelection.openedUrl == URL_ABOUT_BLANK) {
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
      pageListBottomPointEnabled = false;
    }
    if (pageListItemPointedIndex >= 0) {
      _togglePageListItemPointedTarget(pageListItemPointedIndex);
      pageListItemPointedIndex = -1;
    }
    pageListItemMultiPointedIndexes.forEach(_togglePageListItemPointedTarget);
    pageListItemMultiPointedIndexes = new Array();
    pageListItemPointedExpansion = 0;
    if (this.actionMenuPointedIndex >= 0) {
      this._toggleActionMenuItem(this.actionMenuPointedIndex);
      this.actionMenuPointedIndex = -1;
    }
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
          && pageListItemMultiPointedIndexes.length > 0) {
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
      } else if (pageListItemPointedIndex >= 0) {
        // Show the action UI immediately if an item is selected on the list.
        pageListActionUI.execute(event);
      } else if (! event.ctrlKey && ! event.shiftKey
        && pageListNewsSelectionCount < ExtractNews.SELECTION_MAX_COUNT) {
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
      } else if (! event.ctrlKey && pageListNewsSelections.length > 0) {
        var lastListItemIndex =
          PAGE_LIST_INDEX_STRING_ARRAYS[pageManager.pageIndex].length - 1;
        if (event.shiftKey) { // Expansion of pointed items with a shift key
          if (pageListItemMultiPointedIndexes.length > 0) {
            if (pageListItemPointedExpansion <= 0) {
              // Expand pointed items upward on the list.
              var listItemIndex = pageListItemMultiPointedIndexes[0]
                + pageListItemPointedExpansion - 1;
              if (listItemIndex >= 0) {
                pageListItemMultiPointedIndexes.push(listItemIndex);
                pageListItemPointedExpansion--;
                _togglePageListItemPointedTarget(listItemIndex);
              }
            } else {
              // Reduce the expansion from the bottom of pointed items.
              _togglePageListItemPointedTarget(
                pageListItemMultiPointedIndexes.pop());
              pageListItemPointedExpansion--;
            }
          } else { // The bottom item pointed on the list
            pageListItemMultiPointedIndexes.push(lastListItemIndex);
            _togglePageListItemPointedTarget(lastListItemIndex);
          }
        } else if (pageListItemPointedIndex >= -1
          && pageListItemPointedIndex <= lastListItemIndex) {
          // Move the index of a pointed item up on the list.
          if (pageListItemPointedIndex >= 0) {
            // Turn off if an item has already been pointed on the list.
            _togglePageListItemPointedTarget(pageListItemPointedIndex);
          }
          if (pageListItemPointedIndex != 0) {
            if (pageListItemPointedIndex < 0) {
              // Appear a pointed item from the bottom of the list.
              pageListItemPointedIndex = lastListItemIndex;
            } else {
              pageListItemPointedIndex--;
            }
            _togglePageListItemPointedTarget(pageListItemPointedIndex);
          } else {
            // Hide a pointed item to the top of the list.
            pageListItemPointedIndex = -1;
          }
        }
      }
      break;
    case "ArrowDown":
      if (pageListActionUI.isMenuVisible()) {
        // Move the index of a pointed item down on the action UI.
        pageListActionUI.movePointedMenuItemDown(event);
      } else if (! event.ctrlKey && pageListNewsSelections.length > 0) {
        var lastListItemIndex =
          PAGE_LIST_INDEX_STRING_ARRAYS[pageManager.pageIndex].length - 1;
        if (event.shiftKey) { // Expansion of pointed items with a shift key
          if (pageListItemMultiPointedIndexes.length > 0) {
            if (pageListItemPointedExpansion >= 0) {
              // Expand pointed items downward on the list.
              var listItemIndex = pageListItemMultiPointedIndexes[0]
                + pageListItemPointedExpansion + 1;
              if (listItemIndex <= lastListItemIndex) {
                pageListItemMultiPointedIndexes.push(listItemIndex);
                pageListItemPointedExpansion++;
                _togglePageListItemPointedTarget(listItemIndex);
              }
            } else {
              // Reduce the expansion from the top of pointed items.
              _togglePageListItemPointedTarget(
                pageListItemMultiPointedIndexes.pop());
              pageListItemPointedExpansion++;
            }
          } else { // The top item pointed on the list
            pageListItemMultiPointedIndexes.push(0);
            _togglePageListItemPointedTarget(0);
          }
        } else if (pageListItemPointedIndex >= -1
          && pageListItemPointedIndex <= lastListItemIndex) {
          // Move the index of a pointed item down on the list.
          if (pageListItemPointedIndex >= 0) {
            // Turn off if an item has already been pointed on the list.
            _togglePageListItemPointedTarget(pageListItemPointedIndex);
          }
          if (pageListItemPointedIndex < lastListItemIndex) {
            pageListItemPointedIndex++;
            _togglePageListItemPointedTarget(pageListItemPointedIndex);
          } else {
            // Hide a pointed item to the bottom of the list.
            pageListItemPointedIndex = -1;
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
      if (! event.shiftKey && pageListItemPointedIndex >= 0) {
        _togglePageListItemPointedTarget(pageListItemPointedIndex);
        pageListItemPointedIndex = -1;
      }
      break;
    case "ShiftLeft":
    case "ShiftRight":
      // Add the origin of a range to the array of pointed items.
      if (! event.ctrlKey && pageListItemPointedIndex >= 0) {
        pageListItemMultiPointedIndexes.push(pageListItemPointedIndex);
        pageListItemPointedIndex = -1;
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
    PAGE_LIST_INDEX_STRING_ARRAYS[pageIndex]).then((newsSelections) => {
      const readingPromises = new Array();
      newsSelections.forEach((newsSelection) => {
          var faviconId = undefined;
          if (newsSelection.openedUrl != URL_ABOUT_BLANK) {
            var newsSitePage =
              ExtractNews.getNewsSitePage(newsSelection.openedUrl);
            if (newsSitePage != undefined) {
              faviconId =
                ExtractNews.getNewsSiteFaviconId(
                  newsSitePage.getSiteId(), newsSelection.openedUrl);
            }
          }
          if (faviconId != undefined) {
            if (pageListFaviconIds.indexOf(faviconId) < 0
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
          pageListNewsSelections.push(newsSelection);
          pageListFaviconIds.push(faviconId);
        });
      return Promise.all(readingPromises);
    }).then(() => {
      for (let i = 0; i < pageListNewsSelections.length; i++) {
        var newsSelection = pageListNewsSelections[i];
        var listItem = document.createElement("li");
        var listItemTitle = document.createElement("span");
        var listItemFavicon = document.createElement("img");
        var favicon = PAGE_LIST_ITEM_FAVICON_MAP.get(pageListFaviconIds[i]);
        if (favicon != undefined) {
          listItemFavicon.src = favicon;
        } else {
          listItemFavicon.src = PAGE_LIST_ITEM_DEFAULT_FAVICON;
        }
        listItemTitle.textContent = newsSelection.settingName;
        listItem.value = ExtractNews.SELECTION_INDEX_STRINGS[i];
        listItem.addEventListener(_Event.POINTER_DOWN, (event) => {
            var target = _Event.getEventTarget(event, "LI");
            if (target != null && ! pageListActionUI.isMenuVisible()) {
              var listItemIndex = Number(target.value);
              if (event.ctrlKey) {
                // Add or remove the index of an item to or from the array
                // of pointed items if selected or not.
                if (_Event.togglePointedTarget(target)) {
                  pageListItemMultiPointedIndexes.push(listItemIndex);
                } else {
                  pageListItemMultiPointedIndexes.splice(
                    pageListItemMultiPointedIndexes.indexOf(listItemIndex), 1);
                }
              } else if (! event.shiftKey) {
                // Select an item and immediately show the action UI.
                if (pageListItemPointedIndex < 0) {
                  _Event.togglePointedTarget(target);
                  pageListItemPointedIndex = listItemIndex;
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
              if (listItemIndex != pageListItemPointedIndex) {
                if (pageListItemPointedIndex >= 0) {
                  _togglePageListItemPointedTarget(pageListItemPointedIndex);
                }
                _Event.togglePointedTarget(target);
                pageListItemPointedIndex = listItemIndex;
              }
            }
          });
        listItem.addEventListener(_Event.POINTER_LEAVE, (event) => {
            var target = _Event.getEventTarget(event, "LI");
            if (target != null && ! pageListActionUI.isMenuVisible()
              && pageListItemPointedIndex == Number(target.value)) {
              _Event.togglePointedTarget(target);
              pageListItemPointedIndex = -1;
            }
          });
        listItem.appendChild(listItemTitle);
        listItem.appendChild(listItemFavicon);
        pageList.appendChild(listItem);
      }
      pageListBottomPoint =
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
  pageListNewsSelections = new Array();
  pageListFaviconIds = new Array();
  pageListItemPointedIndex = -1;
  pageListItemMultiPointedIndexes = new Array();
  pageListItemPointedExpansion = 0;
  pageListBottomPoint = pageList.getBoundingClientRect().top;
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

ExtractNews.getEnabledSites().then(() => {
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
        var indexString = ExtractNews.SELECTION_INDEX_STRINGS[i];
        if (i % PAGE_LIST_ITEM_COUNT == 0) {
          PAGE_LIST_INDEX_STRING_ARRAYS.push(new Array());
          pageSize++;
        }
        PAGE_LIST_INDEX_STRING_ARRAYS[pageSize - 1].push(indexString);
      }

      // Set menus to open, edit, or remove a new selection into the action UI
      // displayed when a list item is pointed down on the page.
      pageListActionUI.addMenuItem(
        PAGE_LIST_ACTION_ID_OPEN_IN_PRESENT_TAB, (event) => {
          var newsSelections = new Array();
          var listItemIndexes = _getPageListItemPointedIndexes();
          listItemIndexes.forEach((listItemIndex) => {
              newsSelections.push(pageListNewsSelections[listItemIndex]);
            });
          _Popup.openNewsSelectionsInTab(false, newsSelections).then(() => {
              Debug.printMessage(
                "Open the list item of " + listItemIndexes.join(", ")
                + " in present tab on Page "
                + String(pageManager.pageIndex + 1) + ".");
            }).finally(() => {
              pageListActionUI.closeMenu(event);
              window.close();
            });
        });
      pageListActionUI.addMenuItem(
        PAGE_LIST_ACTION_ID_OPEN_IN_NEW_TAB, (event) => {
          const applyingPromises = new Array();
          var listItemIndexes = _getPageListItemPointedIndexes();
          listItemIndexes.forEach((listItemIndex) => {
              applyingPromises.push(
                _Popup.openNewsSelectionsInTab(
                  true, Array.of(pageListNewsSelections[listItemIndex])));
            });
          Promise.all(applyingPromises).then(() => {
              Debug.printMessage(
                "Open the list item of " + listItemIndexes.join(", ")
                + " in new tab on Page "
                + String(pageManager.pageIndex + 1) + ".");
            }).catch((error) => {
              Debug.printStackTrace(error);
            }).finally(() => {
              pageListActionUI.closeMenu(event);
              window.close();
            });
        });
      pageListActionUI.addMenuItem(""); // Separator as a menu item
      pageListActionUI.addMenuItem(PAGE_LIST_ACTION_ID_EDIT, (event) => {
          var editIndexStrings = new Array();
          var pageIndex = pageManager.pageIndex;
          _getPageListItemPointedIndexes().forEach((listItemIndex) => {
              editIndexStrings.push(
                PAGE_LIST_INDEX_STRING_ARRAYS[pageIndex][listItemIndex]);
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
      pageListActionUI.addMenuItem(""); // Separator as a menu item
      pageListActionUI.addMenuItem(PAGE_LIST_ACTION_ID_REMOVE, (event) => {
          var removedListItemIndexes = _getPageListItemPointedIndexes();
          removeNewsSelections(
            pageManager.pageIndex, removedListItemIndexes).then(() => {
              Debug.printMessage(
                "Remove the list item of " + removedListItemIndexes.join(", ")
                + " on Page " + String(pageManager.pageIndex + 1) + ".");
              pageListNewsSelectionCount -= removedListItemIndexes.length;
              pageManager.setPageSize(PAGE_LIST_INDEX_STRING_ARRAYS.length);
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
    pageListNewsSelectionCount = newsSelectionCount;

    return ExtractNews.getDebugMode();
  }).catch((error) => {
    Debug.printStackTrace(error);
  });

document.body.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
