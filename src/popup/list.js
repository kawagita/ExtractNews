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
const PAGE_LIST_ITEM_FAVICON_DATA_MAP = new Map();
const PAGE_LIST_ITEM_DEFAULT_FAVICON_PNG = "../icons/night-40.png";

const PAGE_TO_PREVIOUS_BLACK_PNG = "../icons/to_previous_black.png";
const PAGE_TO_PREVIOUS_WHITE_PNG = "../icons/to_previous_white.png";
const PAGE_TO_NEXT_BLACK_PNG = "../icons/to_next_black.png";
const PAGE_TO_NEXT_WHITE_PNG = "../icons/to_next_white.png";

// The array of news selections displayed to list items on the current page.
var listNewsSelections = new Array();
var listNewsSelectionSiteIds = new Array();

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
  return _Storage.removeSelections(removedIndexStrings).then(() => {
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
    });
}

// The count of news selections displeyed on pages
var pagesNewsSelectionCount = 0;

// The manager of the index and size of pages on which the list of news
// selections is displayed.
var pageManager;

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
        _Popup.openSelectionEditWindow().catch((error) => {
            Debug.printStackTrace(error);
          }).finally(() => {
            window.close();
          });
      }
    }
  });

/*
 * The close button on the user interface to act a news selection.
 */
class PageListActionUICloseButton extends _Event.PointedGroup {
  constructor(actionUI, closeButtonElement) {
    super();
    this.actionUI = actionUI;
    this.addElement(closeButtonElement);
    closeButtonElement.addEventListener(_Event.POINTER_DOWN, (event) => {
        this.actionUI.closeMenu(event);
      });
  }

  setFocusedTarget(event) {
    super.setFocusedTarget(event);
    this.actionUI.clearPointedMenuItem();
  }
}

const LIST_ITEM_OPEN_IN_PRESENT_TAB = "OpenInPresentTab";
const LIST_ITEM_OPEN_IN_NEW_TAB = "OpenInNewTab";
const LIST_ITEM_EDIT = "Edit";
const LIST_ITEM_REMOVE = "Remove";

/*
 * The user interface to act a news selection set into the list item.
 */
class PageListActionUI {
  constructor() {
    var actionNode = document.getElementById("NewsSelectionAction");
    var actionHeader = document.querySelector(".action_header");
    var actionTitle = actionHeader.firstElementChild;
    var actionUICloseButton =
      new PageListActionUICloseButton(this, actionHeader.lastElementChild);
    actionTitle.textContent = getBrowserActionMessage("HowToAct");
    this.actionNode = actionNode;
    this.actionUICloseButton = actionUICloseButton;
    this.actionMenuItems = Array.from(actionNode.querySelectorAll("li"));
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
    this.actionUnlocked = true;
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
                _Event.togglePointedTarget(
                  this.actionMenuItems[this.actionMenuPointedIndex]);
              }
              _Event.togglePointedTarget(target);
              this.actionMenuPointedIndex = menuIndex;
            }
            this.actionUICloseButton.clearFocusedTarget(event);
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
          if (this.actionUnlocked) {
            // Lock the action until this action UI is closed and opened again.
            this.actionUnlocked = false;
            var target = _Event.getEventTarget(event, "LI");
            if (target != null) {
              var menuIndex = Number(target.value);
              if (! this.actionMenuDisabled[menuIndex]) {
                this.fireMenuItemEvents[menuIndex](event);
              }
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

  isMenuVisible() {
    return this.actionNode.style.visibility == "visible";
  }

  hasCloseButtonFocused() {
    return this.actionUICloseButton.isFocused();
  }

  openMenu(event) {
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
      openInNewTabMenuDisabled =
        listNewsSelections[listItemPointedIndex].openedUrl == URL_ABOUT_BLANK;
    }
    if (openInNewTabMenuDisabled) {
      this.actionMenuItems[this.openInNewTabMenuIndex].className = "disabled";
      this.actionMenuDisabled[this.openInNewTabMenuIndex] = true;
    }
    this.actionMenuItems[this.editMenuIndex].className = editMenuClassName;
    this.actionMenuDisabled[this.editMenuIndex] = editMenuDisabled;
    this.actionNode.style.visibility = "visible";
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
    this.clearPointedMenuItem();
    this.actionUICloseButton.clearFocusedTarget(event);
    this.actionMenuItems[this.openInNewTabMenuIndex].className = "";
    this.actionMenuItems[this.editMenuIndex].className = "";
    this.actionMenuDisabled[this.openInNewTabMenuIndex] = false;
    this.actionMenuDisabled[this.editMenuIndex] = false;
    this.actionNode.style.visibility = "hidden";
  }

  unlockMenu() {
    this.actionUnlocked = true;
  }

  firePointedMenuItemEvent(event) {
    if (this.actionUnlocked && this.actionMenuPointedIndex >= 0) {
      // Lock the action until this action UI is closed and opened again.
      this.actionUnlocked = false;
      this.fireMenuItemEvents[this.actionMenuPointedIndex](event);
    }
  }

  fireOpenInPresentTabMenuItemEvent(event) {
    this.actionMenuPointedIndex = this.openInPresentTabMenuIndex;
    this.firePointedMenuItemEvent(event);
  }

  movePointedMenuItemUp(event) {
    if (this.actionMenuPointedIndex > 0
      && this.actionMenuPointedIndex < this.actionMenuItems.length) {
      if (this.actionMenuPointedIndex >= 0) {
        _Event.togglePointedTarget(
          this.actionMenuItems[this.actionMenuPointedIndex]);
      }
      this.actionMenuPointedIndex--;
      while (this.actionMenuDisabled[this.actionMenuPointedIndex]) {
        this.actionMenuPointedIndex--;
      }
      _Event.togglePointedTarget(
        this.actionMenuItems[this.actionMenuPointedIndex]);
      this.actionUICloseButton.clearFocusedTarget(event);
    }
  }

  movePointedMenuItemDown(event) {
    if (this.actionMenuPointedIndex >= -1
      && this.actionMenuPointedIndex < this.actionMenuItems.length - 1) {
      if (this.actionMenuPointedIndex >= 0) {
        _Event.togglePointedTarget(
          this.actionMenuItems[this.actionMenuPointedIndex]);
      }
      this.actionMenuPointedIndex++;
      while (this.actionMenuDisabled[this.actionMenuPointedIndex]) {
        this.actionMenuPointedIndex++;
      }
      _Event.togglePointedTarget(
        this.actionMenuItems[this.actionMenuPointedIndex]);
      this.actionUICloseButton.clearFocusedTarget(event);
    }
  }

  clearPointedMenuItem() {
    if (this.actionMenuPointedIndex >= 0) {
      _Event.togglePointedTarget(
        this.actionMenuItems[this.actionMenuPointedIndex]);
      this.actionMenuPointedIndex = -1;
    }
  }
}

var pageListActionUI = new PageListActionUI();

// Sets menus to open, edit, and remove the news selection into the action UI
// displayed when the list item is pointed down on the current page.

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
          + " in present tab on Page " + String(pageManager.pageIndex + 1)
          + ".");
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
        if (newsSelection.openedUrl != URL_ABOUT_BLANK) {
          applyingPromises.push(
            _Popup.openNewsSelectionsInTab(true, Array.of(newsSelection)));
          listItemIndexStrings.push(String(listItemIndex));
        }
      });
    Promise.all(applyingPromises).then(() => {
        Debug.printMessage(
          "Open the list item of " + listItemIndexStrings.join(", ")
          + " in new tab on Page " + String(pageManager.pageIndex + 1) + ".");
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
    _Popup.openSelectionEditWindow(editIndexStrings).then(() => {
        Debug.printMessage(
          "Edit the news selection of " + editIndexStrings.join(", ") + ".");
      }).catch((error) => {
        Debug.printStackTrace(error);
      }).finally(() => {
        pageListActionUI.closeMenu(event);
        window.close();
      });
  });
pageListActionUI.addMenuItem(); // Separator as a menu item
pageListActionUI.addMenuItem(LIST_ITEM_REMOVE, (event) => {
    var listItemIndexes = _getListItemPointedIndexes();
    removeNewsSelections(pageManager.pageIndex, listItemIndexes).then(() => {
        Debug.printMessage(
          "Remove the list item of " + listItemIndexes.join(", ")
          + " on Page " + String(pageManager.pageIndex + 1) + ".");
        pagesNewsSelectionCount -= listItemIndexes.length;
        pageManager.setPageSize(PAGE_INDEX_STRING_ARRAYS.length);
      }).catch((error) => {
        Debug.printStackTrace(error);
      });
  });

// Enable or disable to change background colors of an item by pointer moving
// and show the action UI when a control key is up or down.

document.body.addEventListener(_Event.KEYUP, (event) => {
    switch (event.code) {
    case "ControlLeft":
    case "ControlRight":
    case "ShiftLeft":
    case "ShiftRight":
      // Show the action UI if items are selected with a control on the list.
      if (! pageListActionUI.isMenuVisible()
          && ! event.ctrlKey && ! event.shiftKey
          && listItemMultiPointedIndexes.length > 0) {
        pageListActionUI.openMenu(event);
      }
      break;
    }
  });

document.body.addEventListener(_Event.KEYDOWN, (event) => {
    switch (event.code) {
    case "Enter":
      if (pageListActionUI.isMenuVisible()) {
        // Close the menu of the action UI if the close button has focus,
        // otherwise, execute the action for a pointed menu item.
        if (pageListActionUI.hasCloseButtonFocused()) {
          pageListActionUI.closeMenu(event);
        } else {
          pageListActionUI.firePointedMenuItemEvent(event);
        }
      } else if (listItemPointedIndex >= 0) {
        // Open the news selection of a pointed item in the present tab.
        pageListActionUI.fireOpenInPresentTabMenuItemEvent(event);
      } else if (! event.ctrlKey && ! event.shiftKey
        && pagesNewsSelectionCount < ExtractNews.SELECTION_MAX_COUNT) {
        // Open the edit window for new news selection if no pointed item.
        _Popup.openSelectionEditWindow().catch((error) => {
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
        if (event.shiftKey) { // Expansion of pointed items with the shift key
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
        if (event.shiftKey) { // Expansion of pointed items with the shift key
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
      if (! event.ctrlKey && ! event.shiftKey) {
        if (! pageManager.isFirstPageKeeping()) {
          pageManager.movePage(_Event.PAGE_MOVE_BACK_EVENT);
        } else {
          pageListActionUI.closeMenu(event);
        }
      }
      break;
    case "ArrowRight":
      if (! event.ctrlKey && ! event.shiftKey) {
        if (! pageManager.isLastPageKeeping()) {
          pageManager.movePage(_Event.PAGE_MOVE_FORWARD_EVENT);
        } else {
          pageListActionUI.closeMenu(event);
        }
      }
      break;
    case "ControlLeft":
    case "ControlRight":
      // Clear changing the background color of a pointed item on the list.
      if (! pageListActionUI.isMenuVisible()
        && ! event.shiftKey && listItemPointedIndex >= 0) {
        _toggleListItemPointedTarget(listItemPointedIndex);
        listItemPointedIndex = -1;
      }
      break;
    case "ShiftLeft":
    case "ShiftRight":
      // Add the origin of a range to the array of pointed items.
      if (! pageListActionUI.isMenuVisible()
        && ! event.ctrlKey && listItemPointedIndex >= 0) {
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
  return _Storage.readSelections(
    PAGE_INDEX_STRING_ARRAYS[pageIndex]).then((newsSelections) => {
      const readingPromises = new Array();
      newsSelections.forEach((newsSelection) => {
          var siteId = "";
          if (newsSelection.openedUrl != URL_ABOUT_BLANK) {
            var siteData = ExtractNews.getSite(newsSelection.openedUrl);
            if (siteData != undefined) {
              siteId = siteData.id;
            }
          }
          if (siteId != ""
            && listNewsSelectionSiteIds.indexOf(siteId) < 0
            && ! PAGE_LIST_ITEM_FAVICON_DATA_MAP.has(siteId)) {
            // Read the favicon data from the storage if not exist
            // in the current list and cached map.
            readingPromises.push(
              _Storage.readSiteFavicon(siteId).then((faviconData) => {
                  if (faviconData != "") {
                    PAGE_LIST_ITEM_FAVICON_DATA_MAP.set(siteId, faviconData);
                  }
                }));
          }
          listNewsSelections.push(newsSelection);
          listNewsSelectionSiteIds.push(siteId);
        });
      return Promise.all(readingPromises);
    }).then(() => {
      for (let i = 0; i < listNewsSelections.length; i++) {
        var newsSelection = listNewsSelections[i];
        var listItem = document.createElement("li");
        var listItemTitle = document.createElement("span");
        var listItemFavicon = document.createElement("img");
        var faviconData =
          PAGE_LIST_ITEM_FAVICON_DATA_MAP.get(listNewsSelectionSiteIds[i]);
        if (faviconData == undefined) {
          faviconData = PAGE_LIST_ITEM_DEFAULT_FAVICON_PNG;
        }
        listItemTitle.textContent = newsSelection.settingName;
        listItemFavicon.src = faviconData;
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
                if (listItemPointedIndex < 0) {
                  _Event.togglePointedTarget(target);
                  listItemPointedIndex = listItemIndex;
                }
                // Open the news selection of a pointed item in the present
                // tab by left click, otherwise, show the action UI.
                if (event.button == 0) {
                  pageListActionUI.fireOpenInPresentTabMenuItemEvent(event);
                } else { // Right click
                  pageListActionUI.openMenu(event);
                }
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
  pageListActionUI.unlockMenu();
  listNewsSelections = new Array();
  listNewsSelectionSiteIds = new Array();
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

{
  // Displays the page header and title with the manager of page links.

  var pageHeader = document.querySelector(".page_header");
  var pageTitle = pageHeader.querySelector(".page_title");
  var linkToPreviousPage = pageHeader.firstElementChild;
  var linkToNextPage = pageHeader.lastElementChild;

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
    }, linkToPreviousPage, linkToNextPage);

  // Change the black link "<<" and ">>" into the white by a mouse over.
  linkToPreviousPage.firstElementChild.src = PAGE_TO_PREVIOUS_BLACK_PNG;
  linkToPreviousPage.addEventListener(_Event.POINTER_MOVE, (event) => {
      var target = event.target;
      if (target.tagName == "LI") {
        target = target.firstElementChild;
      }
      target.src = PAGE_TO_PREVIOUS_WHITE_PNG;
    });
  linkToPreviousPage.addEventListener(_Event.POINTER_LEAVE, (event) => {
      if (event.target.tagName == "LI") {
        event.target.firstElementChild.src = PAGE_TO_PREVIOUS_BLACK_PNG;
      }
    });
  linkToNextPage.firstElementChild.src = PAGE_TO_NEXT_BLACK_PNG;
  linkToNextPage.addEventListener(_Event.POINTER_MOVE, (event) => {
      var target = event.target;
      if (target.tagName == "LI") {
        target = target.firstElementChild;
      }
      target.src = PAGE_TO_NEXT_WHITE_PNG;
    });
  linkToNextPage.addEventListener(_Event.POINTER_LEAVE, (event) => {
      if (event.target.tagName == "LI") {
        event.target.firstElementChild.src = PAGE_TO_NEXT_BLACK_PNG;
      }
    });

  // Sets the text label and event listener to the page header or action UI,
  // and lastly call displayPageList() if a news selection exist.

  _Storage.readDomainData(false).then(() => {
      ExtractNews.setDomainSites();
      return _Popup.searchSelectionEditWindow();
    }).then((editWindow) => {
      if (editWindow == undefined) {
        return _Storage.readSelectionCount();
      }
      return Promise.resolve(-1);
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
        // Call updating the list in the page manager, and display the link
        // to the previous or next page and list items on the first page,
        // otherwise, the message of no news selection.
        pageManager.setPageSize(pageSize);
      } else {
        displayNewsSelectionMessage("NewsSelectionNowEditing");
      }
      pagesNewsSelectionCount = newsSelectionCount;
    }).catch((error) => {
      Debug.printStackTrace(error);
    });
}

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
