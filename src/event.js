/*
 *  Define variables, functions, and classes for key, mouse, or pointer events.
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
 * Event functions and constant variables.
 */
ExtractNews.Event = (() => {
    const _Event = {
        POINTER_DOWN: "pointerdown",
        POINTER_UP: "pointerup",
        POINTER_MOVE: "pointermove",
        POINTER_LEAVE: "pointerleave",

        KEYDOWN: "keydown",
        KEYUP: "keyup",

        CLICK: "click",
        DBLCLICK: "dblclick",

        // Event type to update the current index of a page manager occurred
        // by increase or decrease list items, or moving its back or forward.
        PAGE_UPDATE: "pageupdate",
        PAGE_MOVE_BACK: "pagemoveback",
        PAGE_MOVE_FORWARD: "pagemoveforward"
      };

    const TARGET_POINTED = "pointed";
    const TARGET_SELECTED = "selected";
    const TARGET_HIDDEN = "hidden";

    const TARGET_FOCUSED_IN = "focused_in";
    const TARGET_FOCUSED_OUT = "focused_out";

    const PAGE_UPDATE_EVENT = new Event(_Event.PAGE_UPDATE);
    const PAGE_MOVE_BACK_EVENT = new Event(_Event.PAGE_MOVE_BACK);
    const PAGE_MOVE_FORWARD_EVENT = new Event(_Event.PAGE_MOVE_FORWARD);

    _Event.PAGE_MOVE_BACK_EVENT = PAGE_MOVE_BACK_EVENT;
    _Event.PAGE_MOVE_FORWARD_EVENT = PAGE_MOVE_FORWARD_EVENT;

    /*
     * Returns the target of the specified tag name within which the specified
     * event occurs if exists, otherwise, null.
     */
    function getEventTarget(event, tagName) {
      var target = event.target;
      if (target.tagName != tagName) {
        if (event.type == _Event.POINTER_LEAVE) {
          return null;
        }
        do {
          target = target.parentNode;
        } while (target != null && target.tagName != tagName);
      }
      return target;
    }

    /*
     * Removes or adds the class name "pointed" from or to the specified target
     * pointed by an event if exists or not, and returns true if contained.
     */
    function togglePointedTarget(target) {
      if (target != null) {
        return target.classList.toggle(TARGET_POINTED);
      }
      return false;
    }

    _Event.getEventTarget = getEventTarget;
    _Event.togglePointedTarget = togglePointedTarget;

    /*
     * Returns the target marked as "focused_in" or "focused_out" by a bubbling
     * event in the specified element (which must be contained in its target)
     * if exists, otherwise, null.
     */
    function getBubblingFocusedTarget(element, focusIn = false) {
      if (element != undefined) {
        var focusedType = TARGET_FOCUSED_IN;
        var targetType = TARGET_FOCUSED_OUT;
        if (! focusIn) {
          focusedType = TARGET_FOCUSED_OUT;
          targetType = TARGET_FOCUSED_IN;
        }
        while (! element.classList.contains(focusedType)) {
          if (element.classList.contains(targetType)) {
            return element;
          }
          element = element.parentNode;
        }
      }
      return null;
    }

    _Event.getBubblingFocusedTarget = getBubblingFocusedTarget;

    /*
     * The group of elements pointed by "pointermove" or "pointerleave".
     */
    class PointedGroup {
      constructor() {
        this.elementPointedIndex = -1;
        this.elementFocusedIndex = -1;
        this.elements = new Array();
        this.eventGroupSet = new Set();
      }

      addElement(element) {
        if (element == undefined) {
          throw newNullPointerException("element");
        }
        element.addEventListener("focus", (event) => {
            this.eventGroupSet.forEach((group) => {
                group.clearFocusedTarget(event);
              });
            this.clearFocusedTarget(event);
            togglePointedTarget(event.target);
            this.elementPointedIndex = this.elements.indexOf(event.target);
            this.setFocusedTarget(event);
          });
        element.addEventListener("blur", (event) => {
            var elementIndex = this.elements.indexOf(event.target);
            if (elementIndex == this.elementPointedIndex) {
              this.clearPointedTarget(event);
            }
            // Clear this target when the one of other targets is focused.
            //this.clearFocusedTarget(event);
          });
        if (element.tagName == "LI" || element.tagName == "BUTTON"
          || element.tagName == "IMG" || (element.tagName == "INPUT"
            && (element.type == "checkbox" || element.type == "image"))) {
          element.addEventListener(_Event.POINTER_MOVE, (event) => {
              if (! event.target.disabled) {
                var elementIndex = this.elements.indexOf(event.target);
                if (elementIndex != this.elementPointedIndex) {
                  this.eventGroupSet.forEach((group) => {
                      group.clearPointedTarget(event);
                    });
                  this.clearPointedTarget(event);
                  togglePointedTarget(event.target);
                  this.elementPointedIndex = elementIndex;
                }
              }
            });
          element.addEventListener(_Event.POINTER_LEAVE, (event) => {
              if (! event.target.disabled) {
                var elementIndex = this.elements.indexOf(event.target);
                if (elementIndex == this.elementPointedIndex) {
                  this.clearPointedTarget(event);
                }
              }
            });
        }
        this.elements.push(element);
      }

      addElements(elements) {
        if (! Array.isArray(elements)) {
          throw newIllegalArgumentException("elements");
        }
        elements.forEach((element) => {
            this.addElement(element);
          });
      }

      removeElement(element) {
        if (element == undefined) {
          throw newNullPointerException("element");
        }
        var elementIndex = this.elements.indexOf(element);
        if (elementIndex >= 0) {
          if (this.elementFocusedIndex >= 0) {
            if (elementIndex == this.elementFocusedIndex) {
              this.elementFocusedIndex = -1;
            } else if (elementIndex < this.elementFocusedIndex) {
              this.elementFocusedIndex--;
            }
          }
          if (this.elementPointedIndex >= 0) {
            if (elementIndex == this.elementPointedIndex) {
              this.elementPointedIndex = -1;
            } else if (elementIndex < this.elementPointedIndex) {
              this.elementPointedIndex--;
            }
          }
          this.elements.splice(elementIndex, 1);
        }
        return element;
      }

      removeElementAll() {
        this.elementPointedIndex = -1;
        this.elementFocusedIndex = -1;
        this.elements = new Array();
      }

      isFocused() {
        return this.elementFocusedIndex >= 0;
      }

      setFocusedTarget(event) {
        this.elementFocusedIndex = this.elementPointedIndex;
      }

      clearFocusedTarget(event) {
        var target = undefined;
        this.clearPointedTarget(event);
        if (this.elementFocusedIndex >= 0) {
          target = this.elements[this.elementFocusedIndex];
          this.elementFocusedIndex = -1;
        }
        return target;
      }

      clearPointedTarget(event) {
        var target = undefined;
        if (this.elementPointedIndex >= 0) {
          target = this.elements[this.elementPointedIndex];
          togglePointedTarget(target);
          this.elementPointedIndex = -1;
        }
        return target;
      }

      setEventRelation(group) {
        if (group == undefined) {
          throw newNullPointerException("group");
        } else if (! this.eventGroupSet.has(group)) {
          this.eventGroupSet.add(group);
          group.setEventRelation(this);
        }
      }
    }

    /*
     * The group of elements which are focused or whose children are focused
     * by a bubbling event, which marked as "focused_in" or "focused_out".
     */
    class BubblingFocusedGroup extends PointedGroup {
      constructor() {
        super();
      }

      addElement(element) {
        super.addElement(element);
        if (element.classList != null) {
          do {
            if (element.classList.contains(TARGET_FOCUSED_OUT)) {
              return;
            }
            element = element.parentNode;
          } while (element != null && element.classList != null);
        }
        throw newIllegalArgumentException("element");
      }

      addFocusedElement(element) {
        super.addElement(element);
        if (element.classList.contains(TARGET_FOCUSED_OUT)) {
          throw newInvalidParameterException(JSON.stringify(element));
        }
        element.classList.toggle(TARGET_FOCUSED_OUT);
      }

      setFocusedTarget(event) {
        super.setFocusedTarget(event);
        var element = getBubblingFocusedTarget(event.target, true);
        if (element != null) {
          element.classList.toggle(TARGET_FOCUSED_OUT);
          element.classList.toggle(TARGET_FOCUSED_IN);
        }
      }

      clearFocusedTarget(event) {
        var target = super.clearFocusedTarget(event);
        if (target != undefined) {
          var element = getBubblingFocusedTarget(target);
          if (element != null) {
            element.classList.toggle(TARGET_FOCUSED_IN);
            element.classList.toggle(TARGET_FOCUSED_OUT);
          }
        }
        return target;
      }
    }

    _Event.PointedGroup = PointedGroup;
    _Event.BubblingFocusedGroup = BubblingFocusedGroup;

    /*
     * The manager of pages moved and updated by events.
     */
    class PageManager {
      constructor(firePageUpdateEvent) {
        if (firePageUpdateEvent == undefined) {
          throw newNullPointerException("firePageUpdateEvent");
        }
        this._pageIndex = -1;
        this._pageSize = 0;
        this.firePageUpdateEvent = firePageUpdateEvent;
      }

      get pageIndex() {
        return this._pageIndex;
      }

      get pageSize() {
        return this._pageSize;
      }

      capacity() {
        return Number.MAX_SAFE_INTEGER;
      }

      isFirstPageKeeping() {
        return this.pageIndex <= 0;
      }

      isLastPageKeeping() {
        return this.pageIndex == this.pageSize - 1;
      }

      setPageSize(pageSize) {
        if (! Number.isInteger(pageSize)) {
          throw newIllegalArgumentException("pageSize");
        } else if (pageSize < 0 || pageSize > this.capacity()) {
          throw newInvalidParameterException(pageSize);
        }
        var previousPageIndex = this.pageIndex;
        this._pageSize = pageSize;
        if (pageSize > 0) {
          if (this.pageIndex < 0) {
            this._pageIndex = 0;
          } else if (this.pageIndex >= pageSize) {
            this._pageIndex = pageSize - 1;
          }
        } else {
          this._pageIndex = -1;
        }
        this.firePageUpdateEvent(
          PAGE_UPDATE_EVENT, this.pageIndex, previousPageIndex);
      }

      getEventTargetIndex(target) {
        return -1;
      }

      setEventTarget(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.pageSize) {
          throw newIndexOutOfBoundsException("event target", targetIndex);
        }
        this._pageIndex = targetIndex;
      }

      movePage(event) {
        var previousPageIndex = this.pageIndex;
        switch (event.type) {
        case _Event.PAGE_MOVE_BACK:
          if (this.pageIndex <= 0) {
            throw newUnsupportedOperationException();
          }
          this.setEventTarget(this.pageIndex - 1);
          break;
        case _Event.PAGE_MOVE_FORWARD:
          if (this.pageIndex >= this.pageSize - 1) {
            throw newUnsupportedOperationException();
          }
          this.setEventTarget(this.pageIndex + 1);
          break;
        default:
          this.setEventTarget(this.getEventTargetIndex(event.target));
          break;
        }
        this.firePageUpdateEvent(event, this.pageIndex, previousPageIndex);
      }
    }

    /*
     * The manager of pages linked to the previous or next page by events.
     */
    class LinkedPageManager extends PageManager {
      constructor(
        firePageUpdateEvent, pageMovedBackNode, pageMovedForwardNode) {
        super(firePageUpdateEvent);
        if (pageMovedBackNode == undefined) {
          throw newNullPointerException("pageMovedBackNode");
        } else if (pageMovedForwardNode == undefined) {
          throw newNullPointerException("pageMovedForwardNode");
        }
        pageMovedBackNode.addEventListener(_Event.POINTER_DOWN, (event) => {
            this.movePage(_Event.PAGE_MOVE_BACK_EVENT);
          });
        pageMovedForwardNode.addEventListener(_Event.POINTER_DOWN, (event) => {
            this.movePage(_Event.PAGE_MOVE_FORWARD_EVENT);
          });
        this.pageMovedBackNode = pageMovedBackNode;
        this.pageMovedForwardNode = pageMovedForwardNode;
      }

      setPageSize(pageSize) {
        super.setPageSize(pageSize);
        if (this.pageIndex < this.pageSize - 1) {
          this.pageMovedForwardNode.style.visibility = "visible";
        } else if (this.pageIndex <= 0) {
            this.pageMovedBackNode.style.visibility = "hidden";
        } else {
          this.pageMovedForwardNode.style.visibility = "hidden";
        }
      }

      movePage(event) {
        super.movePage(event);
        switch (event.type) {
        case _Event.PAGE_MOVE_BACK:
          if (this.pageIndex <= 0) {
            this.pageMovedBackNode.style.visibility = "hidden";
          }
          this.pageMovedForwardNode.style.visibility = "visible";
          break;
        case _Event.PAGE_MOVE_FORWARD:
          if (this.pageIndex >= this.pageSize - 1) {
            this.pageMovedForwardNode.style.visibility = "hidden";
          }
          this.pageMovedBackNode.style.visibility = "visible";
          break;
        }
      }
    }

    /*
     * The manager of pages arranged on the list.
     */
    class PageListManager extends PageManager {
      constructor(firePageUpdateEvent, pageEventTargets) {
        super(firePageUpdateEvent);
        if (pageEventTargets == undefined) {
          throw newNullPointerException("pageEventTargets");
        } else if (! Array.isArray(pageEventTargets)) {
          throw newIllegalArgumentException("pageEventTargets");
        }
        pageEventTargets.forEach((target) => {
            target.addEventListener(_Event.POINTER_DOWN, (event) => {
                this.movePage(event);
              });
            target.addEventListener(_Event.KEYDOWN, (event) => {
                if (event.code == "Enter") {
                  this.movePage(event);
                }
              });
            if (! target.classList.contains(TARGET_HIDDEN)) {
              target.classList.toggle(TARGET_HIDDEN);
            }
          });
        this.pageEventTargets = pageEventTargets;
        this.pageSelectedIndex = 0;
      }

      capacity() {
        return this.pageEventTargets.length;
      }

      setPageSize(pageSize) {
        if (this.pageIndex < 0) {
          this.pageEventTargets[0].classList.toggle(TARGET_SELECTED);
        }
        var pageOut = this.pageSize;
        super.setPageSize(pageSize);
        if (pageOut < pageSize) {
          do {
            this.pageEventTargets[pageOut].classList.toggle(TARGET_HIDDEN);
            pageOut++;
          } while (pageOut < pageSize);
        } else if (pageOut > pageSize) {
          do {
            pageOut--;
            this.pageEventTargets[pageOut].classList.toggle(TARGET_HIDDEN);
          } while (pageOut > pageSize);
        }
      }

      getEventTarget(targetIndex = this.pageSelectedIndex) {
        if (targetIndex < 0 || targetIndex >= this.pageEventTargets.length) {
          throw newIndexOutOfBoundsException("event target", targetIndex);
        }
        return this.pageEventTargets[targetIndex];
      }

      getEventTargetIndex(target) {
        for (let i = 0; i < this.pageEventTargets.length; i++) {
          if (target == this.pageEventTargets[i]) {
            return i;
          }
        }
        return -1;
      }

      setEventTarget(targetIndex) {
        super.setEventTarget(targetIndex);
        var pageSelectedEventTarget = this.pageEventTargets[targetIndex];
        var pageUnselectedEventTarget =
          this.pageEventTargets[this.pageSelectedIndex];
        pageUnselectedEventTarget.classList.toggle(TARGET_SELECTED);
        pageSelectedEventTarget.classList.toggle(TARGET_SELECTED);
        pageSelectedEventTarget.focus();
        this.pageSelectedIndex = targetIndex;
      }
    }

    _Event.PageManager = PageManager;
    _Event.LinkedPageManager = LinkedPageManager;
    _Event.PageListManager = PageListManager;

    return _Event;
  })();
