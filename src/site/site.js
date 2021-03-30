/*
 *  Define classes to display news topics or senders arranged on a site.
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
 * The selector whether to show or hide news topics or senders on the site.
 */
class NewsSelector {
  constructor() {
  }

  getNewsTopicRegexp() {
    return undefined;
  }

  getNewsSenderRegexp() {
    return undefined;
  }

  getNewsExcludedRegexp() {
    return undefined;
  }

  drop(newsTopicString) {
    return false;
  }

  select(newsTopicString, newsSenderString) {
    var newsTopicRegexp = this.getNewsTopicRegexp();
    if (newsTopicRegexp != undefined
      && ! newsTopicRegexp.test(newsTopicString)) {
      return false;
    }
    if (newsSenderString != undefined) {
      var newsSenderRegexp = this.getNewsSenderRegexp();
      if (newsSenderRegexp != undefined
        && ! newsSenderRegexp.test(newsSenderString)) {
        return false;
      }
    }
    return true;
  }

  exclude(newsTopicString) {
    var newsExcludedRegexp = this.getNewsExcludedRegexp();
    return newsExcludedRegexp != undefined
      && newsExcludedRegexp.test(newsTopicString);
  }
}

// Regular expression to match a text in the list of news topics
const NEWS_RANKING_NUMBER_REGEXP = new RegExp(/^[1-9][0-9]*\.?$/);
const NEWS_VIDEO_TIME_REGEXP = new RegExp(/^[0-9][0-9]? *: *[0-9][0-9]/);

const EMPTY_PROPERTY = { };
const EMPTY_NEWS_ELEMENTS = [ ];

function _queryNewsElement(property, element, newsElements) {
  // Parameters of a query property
  //
  // selectors        String of selectors with which the first element is
  //                  returned by querySelector().
  // selectorsForAll  String of selectors with which the list of nodes is
  //                  returned by querySelectorAll().
  // setNewsElement   Function to set the news parent, item, topic, sender,
  //                  or comment for an element gotten by selectors into
  //                  the specified array.
  var selectorElements = EMPTY_NEWS_ELEMENTS;
  if (property.selectors != undefined) {
    var selectorElement = element.querySelector(property.selectors);
    if (selectorElement != null) {
      selectorElements = Array.of(selectorElement);
    }
  } else if (property.selectorsForAll != undefined) {
    selectorElements = element.querySelectorAll(property.selectorsForAll);
  } else if (element != document) {
    selectorElements = Array.of(element);
  }
  selectorElements.forEach((selectorElement) => {
      if (property.setNewsElement != undefined) {
        property.setNewsElement(selectorElement, newsElements, element);
      } else {
        newsElements.push(selectorElement);
      }
    });
}

function _containsClassNamePrefix(element, classNamePrefix) {
  for (var value of element.classList.values()) {
    if (value.startsWith(classNamePrefix)) {
      return true;
    }
  }
  return false;
}

function _containsClassNameSuffix(element, classNameSuffix) {
  for (var value of element.classList.values()) {
    if (value.endsWith(classNameSuffix)) {
      return true;
    }
  }
  return false;
}

// Query properties to get li elements contained in the news element
const LI_ELEMENTS_QUERY_PROPERTY = {
    selectorsForAll: "li"
  };
const LI_ELEMENTS_QUERY_PROPERTIES = [ LI_ELEMENTS_QUERY_PROPERTY ];
// Query properties to get the news element for oneself
const ONESELF_QUERY_PROPERTY = EMPTY_PROPERTY;
const ONESELF_QUERY_PROPERTIES = [ ONESELF_QUERY_PROPERTY ];

// Properties to search the first text node
const FIRST_TEXT_SEARCH_PROPERTIES = [ EMPTY_PROPERTY ];

// Property to search the first text node from a news topic and sender
const ITEM_FIRST_TEXT_PROPERTY = {
    topicSearchFirst: false,
    topicSearchFromLast: false,
    senderSearchFirst: false,
    senderSearchFromLast: false
  };

const CHILD_OBSERVER_OPTIONS = { childList: true };
const SUBTREE_OBSERVER_OPTIONS = { childList: true, subtree: true };

const OBSERVED_TAG_NAME_SET = new Set([
  "LI", "UL", "OL", "DIV", "ARTICLE", "ASIDE", "SECTION"
]);

const SEARCH_TAG_NAME_SET = new Set([
  "A", "DIV", "IMG", "P", "SPAN", "HEADER", "H1", "H2", "H3", "H4", "H5", "H6",
  "FOOTER", "TR", "TD", "TH", "DL", "DT", "DD", "FIGURE", "FIGCAPTION", "ABBR",
  "B", "BLOCKQUOTE", "EM", "I", "Q", "S", "SMALL", "STRONG", "INS", "DEL"
]);

/*
 * The design of news panels or lists arranged and displayed on a web page.
 */
class NewsDesign {
  constructor(designProperty = { }) {
    // Parameters of designProperty
    //
    // parentProperties     Array of query properties by which the news parent
    //                      is gotten from the document.
    // keepDisplaying       Flag whether the news parent is displayed when any
    //                      news item are not displayed. Instead, a subclass
    //                      implements keepNewsParentDisplaying().
    // itemLayoutUnchanged  Flag whether the layout of news items is unchanged
    //                      when those are unselected or excluded.
    // itemSelected         Flag whether the news selection is applied to
    //                      all news items. Instead, a subclass implements
    //                      isNewsItemSelected().
    // itemUnfixed          Flag whether news items are unfixed by the addition
    //                      or rearrangement in this design.
    // itemProperties       Array of query properties by which the news item
    //                      is gotten form the news parent. Instead, a subclass
    //                      implements getNewsItemProperties().
    // topicProperties      Array of query properties by which the news topic
    //                      is gotten from the news item. Instead, a subclass
    //                      implements getNewsTopicProperties().
    // senderProperties     Array of query properties by which the news sender
    //                      is gotten from the news item. Instead, a subclass
    //                      implements getNewsSenderProperties().
    // itemTextProperty     Property by which the text node is searched from
    //                      the news topic or sender. Instead, a subclass
    //                      implements getNewsItemTextProperty().
    // observerOptions      Object providing options to observe nodes returned
    //                      by getObservedNodes(). Instead, a subclass
    //                      implements getObserverOptions().
    // observedProperties   Array of query properties by which the observed
    //                      node is gotten from the news parent.
    // observedItemProperties  Array of query properties by which the news item
    //                         for a node added to the observed node is gotten.
    //                         Instead, a subclass implements
    //                         getObservedNewsItemProperties().
    // commentProperties    Array of query properties by which the comment
    //                      node is gotten.
    this.designProperty = designProperty;
    this.arrangementObservers = undefined;
    this.arrangedNewsParents = undefined;
    this.arrangedNewsItemsMap = new Map();
    this.arrangedNewsItemParamsMap = new Map();
  }

  /*
   * Returns the element array (not HTMLCollection or NodeList) of news parents
   * contained in this news design.
   */
  getNewsParentElements() {
    if (this.designProperty.parentProperties != undefined) {
      var newsParents = new Array();
      this.designProperty.parentProperties.forEach((parentProperty) => {
          _queryNewsElement(parentProperty, document, newsParents);
        });
      return newsParents;
    }
    return EMPTY_NEWS_ELEMENTS;
  }

  _isNewsParentDisplaying(newsParent) {
    return newsParent.style.display != "none";
  }

  showNewsParentElement(newsParent) {
    newsParent.style.display = "";
    return true;
  }

  hideNewsParentElement(newsParent) {
    newsParent.style.display = "none";
    return true;
  }

  /*
   * Returns true if the specified element of a news parent keeps displaying
   * on the site even if all news items are hidden.
   */
  keepNewsParentDisplaying(newsParent) {
    if (this.designProperty.keepDisplaying) {
      return true;
    }
    return false;
  }

  /*
   * Returns the array of properties to get news items contained in
   * the specified element of a news parent, or undefined if not exist.
   */
  getNewsItemProperties(newsParent) {
    return undefined;
  }

  /*
   * Returns the element array (not HTMLCollection or NodeList) of news items
   * contained in the specified element of a news parent, which is gotten by
   * "itemProperties" specified by the constructor or returend by
   * this.getNewsItemProperties(newsParent) if not undefined, otherwise,
   * LI_ELEMENTS_QUERY_PROPERTIES.
   */
  getNewsItemElements(newsParent) {
    var newsItems = new Array();
    var itemProperties = this.getNewsItemProperties(newsParent);
    if (itemProperties == undefined) {
      if (this.designProperty.itemProperties != undefined) {
        itemProperties = this.designProperty.itemProperties;
      } else {
        itemProperties = LI_ELEMENTS_QUERY_PROPERTIES;
      }
    }
    itemProperties.forEach((itemProperty) => {
        _queryNewsElement(itemProperty, newsParent, newsItems);
      });
    return newsItems;
  }

  /*
   * Returns true if news selections are applied to the specified element
   * of a news item. The ranking or recommendation looked over on the news
   * site is unsuitable for narrowing down.
   */
  isNewsItemSelected(newsItem) {
    if (this.designProperty.itemSelected) {
      return true;
    }
    return false;
  }

  /*
   * Returns true if the specified news item is displaying in this design.
   */
  isNewsItemDisplaying(newsItem) {
    return ! newsItem.style.display.startsWith("none")
      && ! newsItem.style.visibility.startsWith("hidden");
  }

  showNewsItemElement(newsItem) {
    if (this.designProperty.itemLayoutUnchanged) {
      newsItem.style.visibility = "visible";
    } else {
      newsItem.style.display = "";
    }
    return true;
  }

  hideNewsItemElement(newsItem) {
    if (this.designProperty.itemLayoutUnchanged) {
      newsItem.style.visibility = "hidden";
    } else {
      newsItem.style.display = "none";
    }
    return true;
  }

  _searchNewsItemTextNode(searchParams) {
    // Parameters of searchProperties
    //
    // altTextUsed        Flag whether the alt attribute of a img element is
    //                    used as the text.
    // advertisingTexts   Set of advertising texts. If a text in this array is
    //                    found, its news topic is ignored as the adverting.
    // skippedTexts       Set of texts skipped in searching the text node.
    // skippedTextRegexp  Regular expression matched and skipped in searching
    //                    the text node.
    // idPrefix           String prefixed with ID of a node which is found in
    //                    searching the text node but not returned.
    // idSuffix           String suffixed with ID of a node which is found in
    //                    searching the text node but not returned.
    // className          Class name of a node which is found in searching
    //                    the text node but not returned.
    // classNamePrefix    Class name prefix of a node which is found in
    //                    searching the text node but not returned.
    // classNameSuffix    Class name suffix of a node which is found in
    //                    searching the text node but not returned.
    // tagName            Tag name of a node which is found in searching
    //                    the text node but not returned.
    if (searchParams.element != null) {
      var searchNode = {
          element: searchParams.element,
          currentIndex: 0
        };
      var searchIncremenCount = 1;
      var searchNodes = new Array();
      var searchFoundElements = new Array();
      var searchProperties = searchParams.properties;
      if (searchProperties == undefined) { // Search for the first text node
        searchProperties = FIRST_TEXT_SEARCH_PROPERTIES;
      }
      var searchPropertyIndex = 0;
      var searchProperty = searchProperties[0];
      var searchTagName = undefined;
      if (searchProperty.tagName != undefined) {
        searchTagName = searchProperty.tagName.toUpperCase();
      }
      if (searchParams.fromLast) {
        searchNode.currentIndex = searchNode.element.childNodes.length - 1;
        searchIncremenCount = -1;
      }

      // Search the text node in the specified news item recursively.
      do {
        while (searchNode.currentIndex >= 0
          && searchNode.currentIndex < searchNode.element.childNodes.length) {
          var node = searchNode.element.childNodes[searchNode.currentIndex];
          var altTextFound =
            searchProperty.altTextUsed && node.tagName == "IMG";
          searchNode.currentIndex += searchIncremenCount;
          if (altTextFound || node.nodeType == Node.TEXT_NODE) {
            var textContent = node.textContent;
            if (altTextFound) {
              textContent = node.alt;
            }
            textContent = textContent.trim();
            if (textContent != "") {
              // Return the first text node except for the skipped texts
              // or matching the skipped regular expression if no longer
              // search property exist.
              if (searchProperty.advertisingTexts != undefined
                && searchProperty.advertisingTexts.has(textContent)) {
                // Display any advertisings including the specified text.
                searchParams.advertisingFound = true;
                return;
              } else if ((searchProperty.skippedTexts == undefined
                  || ! searchProperty.skippedTexts.has(textContent))
                && (searchProperty.skippedTextRegexp == undefined
                  || ! searchProperty.skippedTextRegexp.test(textContent))) {
                if (searchProperty.idPrefix == undefined
                  && searchProperty.idSuffix == undefined
                  && searchProperty.className == undefined
                  && searchProperty.classNamePrefix == undefined
                  && searchProperty.classNameSuffix == undefined
                  && searchTagName == undefined) {
                  searchParams.element = node.parentNode;
                  searchParams.textNode = node;
                  return;
                }
              }
            }
          } else if (node.nodeType == Node.ELEMENT_NODE
            && SEARCH_TAG_NAME_SET.has(node.tagName)) {
            if ((searchProperty.idPrefix != undefined
                && node.id.startsWith(searchProperty.idPrefix))
              || (searchProperty.idSuffix != undefined
                && node.id.endsWith(searchProperty.idSuffix))
              || (searchProperty.className != undefined
                && node.classList.contains(searchProperty.className))
              || (searchProperty.classNamePrefix != undefined
                && _containsClassNamePrefix(
                  node, searchProperty.classNamePrefix))
              || (searchProperty.classNameSuffix != undefined
                && _containsClassNameSuffix(
                  node, searchProperty.classNameSuffix))
              || (searchTagName != undefined
                && searchTagName == node.tagName)) {
              if (++searchPropertyIndex >= searchProperties.length) {
                // Finish element searching by the id prefix, class or tag name
                // of the specified property.
                searchProperty = FIRST_TEXT_SEARCH_PROPERTIES;
              } else {
                searchProperty = searchProperties[searchPropertyIndex];
              }
              searchTagName = undefined;
              if (searchProperty.tagName != undefined) {
                searchTagName = searchProperty.tagName.toUpperCase();
              }
              // Push the element found from child elements.
              searchFoundElements.push(node);
            }

            // Check child nodes ahead of other nodes in the same parent.
            var nodeChildCount = node.childNodes.length;
            if (nodeChildCount > 0) {
              searchNodes.push(searchNode);
              searchNode = {
                  element: node,
                  currentIndex: 0
                };
              if (searchParams.fromLast) {
                searchNode.currentIndex = nodeChildCount - 1;
              }
            //} else { // No text node, even a child node
            }
          }
        }
        if (searchNodes.length <= 0) {
          break;
        }

        var searchNode = searchNodes.pop();
        if (searchFoundElements.length > 0
          && searchNode.element
            == searchFoundElements[searchFoundElements.length - 1]) {
          if (searchPropertyIndex >= searchProperties.length) {
            break;
          }
          // Pop the last found element if the next searching node is not found
          // from its child elements.
          searchFoundElements.pop();
          searchPropertyIndex--;
          searchProperty = searchProperties[searchPropertyIndex];
          if (searchProperty.tagName != undefined) {
            searchTagName = searchProperty.tagName.toUpperCase();
          } else {
            searchTagName = undefined;
          }
        }
      } while (true);
    }
  }

  /*
   * Returns the array of properties to get a news topic contained in
   * the specified element of a news item, or undefined if not exist.
   */
  getNewsTopicProperties(newsItem) {
    return undefined;
  }

  /*
   * Returns the element of a news topic contained in the specified element
   * of a news item, which is gotten by "topicProperties" specified by
   * the constructor or returend by this.getNewsTopicProperties(newsItem)
   * if not undefined, otherwise, null.
   */
  getNewsTopicElement(newsItem) {
    var topicProperties = this.getNewsTopicProperties(newsItem);
    if (topicProperties == undefined) {
      topicProperties = this.designProperty.topicProperties;
    }
    if (topicProperties != undefined) {
      var newsTopics = new Array();
      for (let i = 0; i < topicProperties.length; i++) {
        _queryNewsElement(topicProperties[i], newsItem, newsTopics);
        if (newsTopics.length > 0) {
          return newsTopics[0];
        }
      }
    }
    return null;
  }

  getNewsTopicText(newsTopicTextNode) {
    if (newsTopicTextNode != null) {
      var textContent = newsTopicTextNode.textContent;
      if (newsTopicTextNode.tagName == "IMG") {
        return textContent = newsTopicTextNode.alt;
      }
      return textContent.trim();
    }
    return "";
  }

  /*
   * Returns the array of properties to get a news sender contained in
   * the specified element of a news item, or undefined if not exist.
   */
  getNewsSenderProperties(newsItem) {
    return undefined;
  }

  /*
   * Returns the element of a news sender contained in the specified element
   * of a news item, which is gotten by "senderProperties" specified by
   * the constructor or returend by this.getNewsSenderProperties(newsItem)
   * if not undefined, otherwise, null.
   */
  getNewsSenderElement(newsItem) {
    var senderProperties = this.getNewsSenderProperties(newsItem);
    if (senderProperties == undefined) {
      senderProperties = this.designProperty.senderProperties;
    }
    if (senderProperties != undefined) {
      var newsSenders = new Array();
      for (let i = 0; i < senderProperties.length; i++) {
        _queryNewsElement(senderProperties[i], newsItem, newsSenders);
        if (newsSenders.length > 0) {
          return newsSenders[0];
        }
      }
    }
    return null;
  }

  getNewsSenderText(newsSenderTextNode) {
    if (newsSenderTextNode != null) {
      var textContent = newsSenderTextNode.textContent;
      if (newsSenderTextNode.tagName == "IMG") {
        return textContent = newsSenderTextNode.alt;
      }
      return textContent.trim();
    }
    return undefined;
  }

  /*
   * Returns the property to get the text node of a news topic or sender
   * contained in the specified element of a news item, or undefined if not
   * exists.
   */
  getNewsItemTextProperty(newsItem) {
    return undefined;
  }

  _setNewsItemDisplaying(newsItem, newsSelector, newsDisplayOptions) {
    // Parameters of itemTextProperty
    //
    // topicSearchFirst       Flag whether a news topic is searched firstly.
    // topicSearchFromLast    Flag whether the text node of a news topic is
    //                        searched from the last to the first element.
    // senderSearchFirst      Flag whether a news sender is searched firstly.
    // senderSearchFromLast   Flag whether the text node of a news sender is
    //                        searched from the last to the first element.
    // topicFollowing         Flag whether the element of a news sender is
    //                        followed by a news topic when searched firstly.
    // topicFollowingTagName  Tag name of an element followed by a news topic.
    // senderFollowing        Flag whether the element of a news topic is
    //                        followed by a news sender when searched firstly.
    // senderFollowingTagName Tag name of an element followed by a news sender.
    // topicSearchProperties  Array of properties used by searching the text
    //                        node of a news topic.
    // senderSearchProperties Array of properties used by searching the text
    //                        node of a news sender.
    var newsItemDisplaying = true;
    var newsItemParams = this.arrangedNewsItemParamsMap.get(newsItem);
    if (newsItemParams == undefined) {
      var itemTextProperty = this.getNewsItemTextProperty(newsItem);
      if (itemTextProperty == undefined) {
        if (this.designProperty.itemTextProperty != undefined) {
          itemTextProperty = this.designProperty.itemTextProperty;
        } else {
          itemTextProperty = ITEM_FIRST_TEXT_PROPERTY;
        }
      }
      var topicSearchParams = {
          element:
            itemTextProperty.senderSearchFirst ?
            null : this.getNewsTopicElement(newsItem),
          textNode: null,
          properties: itemTextProperty.topicSearchProperties,
          fromLast: itemTextProperty.topicSearchFromLast,
          advertisingFound: false
        };
      var senderSearchParams = {
          element:
            itemTextProperty.topicSearchFirst ?
            null : this.getNewsSenderElement(newsItem),
          textNode: null,
          properties: itemTextProperty.senderSearchProperties,
          fromLast: itemTextProperty.senderSearchFromLast,
          advertisingFound: false
        };

      if (itemTextProperty.topicSearchFirst) {
        // Search the text node from the element of a news topic firstly,
        // gotten by "topicProperties" returned by getNewsTopicProperties()
        // or specified by the constructor.
        this._searchNewsItemTextNode(topicSearchParams);
        if (itemTextProperty.senderFollowing
          && topicSearchParams.element != null) {
          var topicAncestorNode = topicSearchParams.element;
          if (itemTextProperty.senderFollowingTagName != undefined) {
            // Move back from the element of a news topic to the first ancestor
            // node of the specified tag name.
            var senderFollowingTagName =
              itemTextProperty.senderFollowingTagName.toUpperCase();
            while (topicAncestorNode.tagName != senderFollowingTagName
              && topicAncestorNode.parentNode != null) {
              topicAncestorNode = topicAncestorNode.parentNode;
            }
          }
          if (itemTextProperty.topicSearchFromLast) {
            senderSearchParams.element =
              topicAncestorNode.previousElementSibling;
          } else {
            senderSearchParams.element = topicAncestorNode.nextElementSibling;
          }
          this._searchNewsItemTextNode(senderSearchParams);
        }
      } else if (itemTextProperty.senderSearchFirst) {
        // Search the text node from the element of a news sender firstly,
        // gotten by "senderProperties" returned by getNewsSenderProperties()
        // or specified by the constructor.
        this._searchNewsItemTextNode(senderSearchParams);
        if (itemTextProperty.topicFollowing
          && senderSearchParams.element != null) {
          var senderAncestorNode = senderSearchParams.element;
          if (itemTextProperty.topicFollowingTagName != undefined) {
            // Move back from the element of a news sender to the first
            // ancestor node of the specified tag name.
            var topicFollowingTagName =
              itemTextProperty.topicFollowingTagName.toUpperCase();
            while (senderAncestorNode.tagName != topicFollowingTagName
              && senderAncestorNode.parentNode != null) {
              senderAncestorNode = senderAncestorNode.parentNode;
            }
          }
          if (itemTextProperty.senderSearchFromLast) {
            topicSearchParams.element =
              senderAncestorNode.previousElementSibling;
          } else {
            topicSearchParams.element = senderAncestorNode.nextElementSibling;
          }
          this._searchNewsItemTextNode(topicSearchParams);
        }
      } else {
        // Search the text node from the element of a news topic and sender
        // gotten by "topicProperties" and "senderProperties" returned by
        // getNewsTopicProperties() and getNewsSenderProperties() or specified
        // by the constructor.
        this._searchNewsItemTextNode(topicSearchParams);
        this._searchNewsItemTextNode(senderSearchParams);
      }

      newsItemParams = {
          arranged:
            (topicSearchParams.textNode != null
              || senderSearchParams.textNode != null)
            && ! topicSearchParams.advertisingFound
            && ! senderSearchParams.advertisingFound,
          topicDropped: undefined,
          topicTextNode: topicSearchParams.textNode,
          senderTextNode: senderSearchParams.textNode
        };
      this.arrangedNewsItemParamsMap.set(newsItem, newsItemParams);
    }

    if (newsSelector != undefined && newsItemParams.arranged) {
      var topicDropped = false;
      var topicString = this.getNewsTopicText(newsItemParams.topicTextNode);
      if (! newsDisplayOptions.newsFilteringDisabled) {
        if (newsItemParams.topicDropped == undefined) {
          newsItemParams.topicDropped = newsSelector.drop(topicString);
        }
        topicDropped = newsItemParams.topicDropped;
      }
      var senderString = this.getNewsSenderText(newsItemParams.senderTextNode);

      var newsItemSelected = false;
      if (! newsDisplayOptions.newsSelectionDisabled) {
        newsItemSelected = this.isNewsItemSelected(newsItem);
      }
      newsItemDisplaying = this.isNewsItemDisplaying(newsItem);

      // Display the news item in which the news topic is not dropped by word
      // filterings and don't match the excluded regular expression and then
      // the news topic and/or sender match selected regular expressions.
      if (! topicDropped && ! newsSelector.exclude(topicString)
        && (! newsItemSelected
          || newsSelector.select(topicString, senderString))) {
        if (! newsItemDisplaying && this.showNewsItemElement(newsItem)) {
          if (senderString != undefined) {
            topicString += " (" + senderString + ")";
          }
          Debug.printProperty("Show news topic", topicString);
          newsItemDisplaying = true;
        }
      } else if (newsItemDisplaying && this.hideNewsItemElement(newsItem)) {
        if (senderString != undefined) {
          topicString += " (" + senderString + ")";
        }
        Debug.printProperty("Hide news topic", topicString);
        newsItemDisplaying = false;
      }
    }

    return newsItemDisplaying;
  }

  getObserverOptions(newsParent) {
    if (this.designProperty.observerOptions != undefined) {
      return this.designProperty.observerOptions;
    }
    return CHILD_OBSERVER_OPTIONS;
  }

  /*
   * Returns the element array of observed nodes for the specified element
   * of a news parent, which is gotten by "observedProperties" specified by
   * the constructor if not undefined, otherwise, EMPTY_NEWS_ELEMENTS.
   */
  getObservedNodes(newsParent) {
    if (this.designProperty.observedProperties != undefined) {
      var newsObservedNodes = new Array();
      this.designProperty.observedProperties.forEach((observedProperty) => {
          _queryNewsElement(observedProperty, newsParent, newsObservedNodes);
        });
      return newsObservedNodes;
    }
    return EMPTY_NEWS_ELEMENTS;
  }

  /*
   * Returns the array of properties to get news items contained in
   * the specified node which is added to the observed node, or undefined
   * if not exist.
   */
  getObservedNewsItemProperties(addedNode) {
    return undefined;
  }

  /*
   * Returns the array of news items contained in the specified node which
   * is added to the observed node, which is gotten by "observedItemProperties"
   * specified by the constructor or returend by
   * this.getObservedNewsItemProperties(addedNode) if not undefined, otherwise,
   * EMPTY_NEWS_ELEMENTS.
   */
  getObservedNewsItemElements(addedNode) {
    var observedItemProperties = this.getObservedNewsItemProperties(addedNode);
    if (observedItemProperties == undefined) {
      observedItemProperties = this.designProperty.observedItemProperties;
    }
    if (observedItemProperties != undefined) {
      var newsItems = new Array();
      observedItemProperties.forEach((observedItemProperty) => {
          _queryNewsElement(observedItemProperty, addedNode, newsItems);
        });
      return newsItems;
    }
    return EMPTY_NEWS_ELEMENTS;
  }

  /*
   * Returns true if news items for the removed node in the specified array
   * are cleared in this design.
   */
  isObservedNewsItemsCleared(removedNodes) {
    return false;
  }

  /*
   * Returns true if news items rearranged by the changed node in the specified
   * array are cleared in this design.
   */
  isRearrangementNewsItemsCleared(changedNodes) {
    return false;
  }

  /*
   * Returns the observed node to rearrange news items by changing attributes.
   */
  getRearrangementObservedNode() {
    return null;
  }

  /*
   * Returns true if this design is rearranged when element attributes for
   * the specified node is changed.
   */
  isRearrangedBy(changedNode) {
    return false;
  }

  /*
   * Rearranges the specified element of a news parent.
   */
  rearrangeNewsParent(newsParent) {
  }

  hasComments() {
    return this.designProperty.commentProperties != undefined;
  }

  getCommentNodes() {
    if (this.designProperty.commentProperties != undefined) {
      var commentNodes = new Array();
      this.designProperty.commentProperties.forEach((commentProperty) => {
          _queryNewsElement(commentProperty, document, commentNodes);
        });
      return commentNodes;
    }
    return EMPTY_NEWS_ELEMENTS;
  }

  showComment(commentNode) {
    commentNode.style.display = "";
  }

  hideComment(commentNode) {
    commentNode.style.display = "none";
  }

  async _arrangeNewsItems(newsParent, newsSelector, newsDisplayOptions) {
    var newsItems = this.arrangedNewsItemsMap.get(newsParent);
    if (newsItems == undefined) {
      newsItems = this.getNewsItemElements(newsParent);
    }
    if (newsItems.length > 0) {
      var newsItemDisplayingCount = 0;

      // Display and arrange news items by the specified selector.
      newsItems.forEach((newsItem) => {
          if (this._setNewsItemDisplaying(
            newsItem, newsSelector, newsDisplayOptions)) {
            newsItemDisplayingCount++;
          }
        });
      Debug.printMessage(
        "Display " + newsItems.length + " news item"
        + (newsItems.length > 1 ? "s" : "") + ".");

      if (newsSelector != undefined) {
        if (! this.keepNewsParentDisplaying(newsParent)) {
          // All news items contained in the element of a news parent are not
          // only displayed but also the news parent is hidden together.
          if (newsItemDisplayingCount > 0) {
            // Show the news parent of displayed news items again.
            if (! this._isNewsParentDisplaying(newsParent)
              && this.showNewsParentElement(newsParent)) {
              Debug.printMessage("Show the news parent.");
              Debug.printNodes(newsParent);
              return Promise.resolve();
            }
          } else if (this._isNewsParentDisplaying(newsParent)
            && this.hideNewsParentElement(newsParent)) {
            Debug.printMessage("Hide the news parent.");
            Debug.printNodes(newsParent);
            return Promise.resolve();
          }
        }
        Debug.printMessage("Arrange the news parent.");
        Debug.printNodes(newsParent);
      }
    } else if (newsSelector == undefined) {
      Debug.printMessage("Display no news item.");
    }
    return Promise.resolve();
  }

  async _observeNewsItems(
    observedNode, observerOptions, newsSelector, newsDisplayOptions) {
    var arrangementObserver = new MutationObserver((mutations) => {
        var arrangedNodes = new Array();
        var arrangedNewsItems = new Array();
        var removedNodeSet = new Set();
        mutations.forEach((mutation) => {
            if (mutation.type == "childList") {
              for (const removedNode of mutation.removedNodes) {
                if (removedNode.nodeType == Node.ELEMENT_NODE
                  && OBSERVED_TAG_NAME_SET.has(removedNode.tagName)) {
                  removedNodeSet.add(removedNode);
                }
              }
              for (const addedNode of mutation.addedNodes) {
                if (addedNode.nodeType == Node.ELEMENT_NODE
                  && OBSERVED_TAG_NAME_SET.has(addedNode.tagName)) {
                  var newsItems = this.getObservedNewsItemElements(addedNode);
                  if (newsItems.length > 0) {
                    newsItems.forEach((newsItem) => {
                        arrangedNewsItems.push(newsItem);
                      });
                    if (removedNodeSet.has(addedNode)) {
                      // Exclude the removed node from the set if added later.
                      removedNodeSet.delete(addedNode);
                    }
                    arrangedNodes.push(addedNode);
                  }
                }
              }
            }
          });
        if (arrangedNewsItems.length > 0) {
          // Arrange added news items without reloading the whole.
          (new Promise((resolve) => {
              arrangedNewsItems.forEach((arrangedNewsItem) => {
                  this._setNewsItemDisplaying(
                    arrangedNewsItem, newsSelector, newsDisplayOptions);
                });
              resolve();
            })).then(() => {
              if (! this.designProperty.itemUnfixed) {
                // Store added news items to the cached array for each parent.
                arrangedNewsItems.forEach((arrangedNewsItem) => {
                    for (const newsParent of this.arrangedNewsParents) {
                      if (newsParent.contains(arrangedNewsItem)) {
                        var newsItems =
                          this.arrangedNewsItemsMap.get(newsParent);
                        if (newsItems == undefined) {
                          newsItems = new Array();
                          this.arrangedNewsItemsMap.set(newsParent, newsItems);
                        }
                        newsItems.push(arrangedNewsItem);
                        break;
                      }
                    }
                  });
              }
              Debug.printMessage(
                "Display " + arrangedNewsItems.length + " news item"
                + (arrangedNewsItems.length > 1 ? "s" : "") + ".");
              Debug.printMessage("Arrange added nodes.");
              Debug.printNodes(arrangedNodes);
            }).catch((error) => {
              Debug.printStackTrace(error);
            });
        }
        if (removedNodeSet.size > 0
          && this.isObservedNewsItemsCleared(Array.from(removedNodeSet))) {
          this.arrangedNewsItemsMap.clear();
          this.arrangedNewsItemParamsMap.clear();
        }
      });
    arrangementObserver.observe(observedNode, observerOptions);
    this.arrangementObservers.push(arrangementObserver);
    return Promise.resolve();
  }

  async display() {
    const displayingPromises = new Array();
    if (! this.designProperty.itemUnfixed) {
      var newsParents = this.getNewsParentElements();
      newsParents.forEach((newsParent) => {
          var newsItems = this.getNewsItemElements(newsParent);
          if (newsItems == EMPTY_NEWS_ELEMENTS) {
            newsItems = new Array();
          }
          this.arrangedNewsItemsMap.set(newsParent, newsItems);
          displayingPromises.push(this._arrangeNewsItems(newsParent));
        });
      this.arrangedNewsParents = newsParents;
      Debug.printMessage(
        "Display " + newsParents.length + " news parent"
        + (newsParents.length > 1 ? "s" : "") + ".");
      Debug.printNodes(this.arrangedNewsParents);
    }
    return Promise.all(displayingPromises);
  }

  async arrange(newsSelector, newsDisplayOptions) {
    if (newsSelector == undefined) {
      throw newUnsupportedOperationException();
    }
    const arrangingPromises = new Array();
    var arrangedNewsParents = this.arrangedNewsParents;
    if (arrangedNewsParents == undefined) {
      arrangedNewsParents = this.getNewsParentElements();
    }
    arrangedNewsParents.forEach((newsParent) => {
        arrangingPromises.push(
          this._arrangeNewsItems(
            newsParent, newsSelector, newsDisplayOptions));
      });
    if (this.arrangementObservers == undefined) {
      this.arrangementObservers = new Array();
      arrangedNewsParents.forEach((newsParent) => {
          var observedNodes = this.getObservedNodes(newsParent);
          if (observedNodes.length > 0) {
            observedNodes.forEach((observedNode) => {
                arrangingPromises.push(
                  this._observeNewsItems(
                    observedNode, this.getObserverOptions(newsParent),
                    newsSelector, newsDisplayOptions));
              });
            Debug.printMessage("Set the observed nodes.");
            Debug.printNodes(observedNodes);
          }
        });
      // Set the observer to rearrange news items by changing attributes.
      var rearrangementObservedNode = this.getRearrangementObservedNode();
      if (rearrangementObservedNode != null) {
        arrangingPromises.push(
          new Promise((resolve) => {
              var rearrangementObserver = new MutationObserver((mutations) => {
                  var rearrangementChangedNode = null;
                  var changedNodes = new Array();
                  mutations.forEach((mutation) => {
                      if (mutation.type == "attributes") {
                        var changedNode = mutation.target;
                        if (changedNode.nodeType == Node.ELEMENT_NODE
                          && OBSERVED_TAG_NAME_SET.has(changedNode.tagName)) {
                          if (this.isRearrangedBy(changedNode)) {
                            rearrangementChangedNode = changedNode;
                          }
                          changedNodes.push(changedNode);
                        }
                      }
                    });
                  if (changedNodes.length > 0) {
                    if (this.isRearrangementNewsItemsCleared(changedNodes)) {
                      this.arrangedNewsItemsMap.clear();
                      this.arrangedNewsItemParamsMap.clear();
                    }
                    if (rearrangementChangedNode != null) {
                      const rearrangingPromises = new Array();
                      this.getNewsParentElements().forEach((newsParent) => {
                          this.rearrangeNewsParent(newsParent);
                          rearrangingPromises.push(
                            this._arrangeNewsItems(
                              newsParent, newsSelector, newsDisplayOptions));
                        });
                      Promise.all(rearrangingPromises).then(() => {
                          Debug.printMessage("Rearrange by changed node.");
                          Debug.printNodes(rearrangementChangedNode);
                        }).catch((error) => {
                          Debug.printStackTrace(error);
                        });
                    }
                  }
                });
              rearrangementObserver.observe(rearrangementObservedNode, {
                  attributes: true,
                  subtree: true
                });
              this.arrangementObservers.push(rearrangementObserver);
              resolve();
            }));
        Debug.printMessage("Set the rearrangement observed node.");
        Debug.printNodes(rearrangementObservedNode);
      }
    }
    return Promise.all(arrangingPromises);
  }

  reset(disposed = false) {
    if (disposed) {
      this.arrangedNewsParents = undefined;
      this.arrangedNewsItemsMap.clear();
      this.arrangedNewsItemParamsMap.clear();
    } else {
      this.arrangedNewsItemParamsMap.forEach((newsItemParams) => {
          newsItemParams.topicDropped = undefined;
        });
    }
    if (this.arrangementObservers != undefined) {
      var arrangementObservers = this.arrangementObservers.length;
      if (arrangementObservers.length > 0) {
        arrangementObservers.forEach((arrangementObserver) => {
          arrangementObserver.disconnect();
        });
        Debug.printMessage(
          "Clear " + arrangementObservers.length + " observed node"
          (arrangementObservers.length > 1 ? "s" : "") + ".");
      }
      this.arrangementObservers = undefined;
    }
  }
}


function _newRegexp(regexpString) {
  if (regexpString != undefined) {
    if ((typeof regexpString) != "string") {
      throw newIllegalArgumentException("Regular Expression");
    } else if (regexpString != "") {
      return new RegExp(regexpString, "i");
    }
  }
  return undefined;
}

/*
 * The site on which news topics or senders are displayed by the selector.
 */
ExtractNews.Site = (() => {
    // The information of top page on this news site
    var newsSitePage = undefined;

    {
      var newsSitePages = ExtractNews.getNewsSitePages();
      for (let i = 0; i < newsSitePages.length; i++) {
        if (newsSitePages[i].containsUrl(document.URL)) {
          newsSitePage = newsSitePages[i];
          break;
        }
      }
    }

    const _Site = {
      NAME_CONCATENATION: ": ",
      isLocalized: () => {
          return newsSitePage != undefined;
        }
    };

    if (newsSitePage == undefined) {
      // Never apply the setting if news site is not used by this locale.
      return _Site;
    }

    var newsDesigns = new Array();
    var newsTopicWordSet = new Set();

    const ID = newsSitePage.getSiteId();
    const NAME = ExtractNews.getLocalizedString(ID + "Name");
    const LANGUAGE = ExtractNews.getNewsSiteLanguage(ID);

    _Site.NAME = NAME;
    _Site.LANGUAGE = LANGUAGE;

    const DOMAIN = newsSitePage.getDomain();
    const ROOT_DIRECTORY_PATH =
      ExtractNews.getLocalizedString(ID + "UrlRootDirectoryPath");

    const PATH_DIRECTORY_REGEXP = new RegExp(/^\/(?:index.html?)?$/);
    const PATH_HTML_DOCUMENT_REGEXP = new RegExp(/[^/]+\.html?$/);

    /*
     * The object to parse the URL into a host server, path, and query,
     * opened by news selection on this site.
     */
    class OpenedUrlParser {
      constructor(url) {
        if (url == undefined) {
          throw newNullPointerException("url");
        } else if ((typeof url) != "string") {
          throw newIllegalArgumentException("url");
        }
        this.url = url;
        this.urlPathParsed = false;
        this.urlParams = { path: "" };
      }

      /*
       * Parses the host name on this site in the current position of URL.
       */
      parseHostName() {
        if (this.urlParams.hostServer != undefined) {
          return false;
        }
        var hostPath;
        var hostServer = "";
        var relativePath = undefined;
        if (this.url.startsWith(URL_HTTPS_SCHEME)) {
          hostPath = this.url.substring(URL_HTTPS_SCHEME.length);
        } else if (this.url.startsWith("//")) {
          hostPath = this.url.substring(2);
        } else if (this.url.startsWith("/")) {
          var domainIndex = document.URL.indexOf(DOMAIN);
          if (domainIndex > 1) {
            hostServer =
              document.URL.substring(URL_HTTPS_SCHEME.length, domainIndex - 1);
          }
          relativePath = this.url;
        } else {
          return false;
        }
        if (relativePath == undefined) {
          if (hostPath.startsWith(DOMAIN)) {
            relativePath = hostPath.substring(DOMAIN.length);
          } else {
            var domainIndex = hostPath.indexOf(".") + 1;
            var domainPath = hostPath.substring(domainIndex);
            if (! domainPath.startsWith(DOMAIN)) {
              return false;
            }
            hostServer = hostPath.substring(0, domainIndex - 1);
            relativePath = domainPath.substring(DOMAIN.length);
          }
        }
        if (relativePath == "" || relativePath.startsWith("/")) {
          if (relativePath != "") {
            var fragmentIndex = relativePath.indexOf("#");
            if (fragmentIndex >= 0) {
              relativePath = relativePath.substring(0, fragmentIndex);
            }
            var queryIndex = relativePath.indexOf("?");
            if (queryIndex >= 0) {
              relativePath = relativePath.substring(0, queryIndex);
            }
          }
          this.urlParams.hostServer = hostServer;
          this.urlParams.relativePath = relativePath;
          if (ROOT_DIRECTORY_PATH == "") {
            this.urlPathParsed = true;
          }
          return true;
        }
        return false;
      }

      _parsePath(path) {
        var relativePath = this.urlParams.relativePath.substring(path.length);
        if (relativePath == "" || relativePath.startsWith("/")) {
          this.urlParams.path += path;
          this.urlParams.relativePath = relativePath;
          return true;
        }
        return false;
      }

      /*
       * Parses the root directory on this site in the current position of URL.
       */
      parseRootDirectory() {
        if (this.urlParams.relativePath != undefined
          && this.urlParams.relativePath.startsWith(ROOT_DIRECTORY_PATH)) {
          if (this._parsePath(ROOT_DIRECTORY_PATH)) {
            this.urlPathParsed = true;
            return true;
          }
        }
        return false;
      }

      /*
       * Parses the specified path in the current position of URL.
       */
      parse(path) {
        if (path == undefined) {
          throw newNullPointerException("path");
        } else if ((typeof path) != "string") {
          throw newIllegalArgumentException("path");
        } else if (path == "/") {
          throw newInvalidParameterException(path);
        } else if (path != "" && this.urlPathParsed) {
          if (path.endsWith("/")) {
            path = path.substring(0, path.length - 1);
          }
          if (this.urlParams.relativePath.startsWith(path)) {
            return this._parsePath(path);
          }
        }
        return false;
      }

      /*
       * Parses a path from the specified array in the current position of URL.
       */
      parseFrom(paths) {
        if (! Array.isArray(paths)) {
          throw newIllegalArgumentException("paths");
        }
        for (let i = 0; i < paths.length; i++) {
          if (this.parse(paths[i])) {
            return true;
          }
        }
        return false;
      }

      /*
       * Parses the directory in the current position of URL.
       */
      parseDirectory() {
        if (this.urlPathParsed) {
          var directoryMatch =
            this.urlParams.relativePath.match(PATH_DIRECTORY_REGEXP);
          if (directoryMatch != null) {
            return this._parsePath(directoryMatch[0]);
          }
        }
        return false;
      }

      /*
       * Parses the directory hierarchy in the current position of URL.
       */
      parseDirectoryHierarchy() {
        if (this.urlPathParsed) {
          var lastPathIndex = this.urlParams.relativePath.lastIndexOf("/");
          if (lastPathIndex >= 0) {
            return this._parsePath(
              this.urlParams.relativePath.substring(0, lastPathIndex));
          }
        }
        return false;
      }

      /*
       * Parses the path to the last from the current position of URL.
       */
      parseAll() {
        if (this.urlPathParsed) {
          return this._parsePath(this.urlParams.relativePath);
        }
        return false;
      }

      /*
       * Returns the array into which String.match() stores the result
       * of matching the path in the current position of URL against
       * the specified regular expression.
       */
      match(pathRegexp) {
        if (pathRegexp == undefined) {
          throw newNullPointerException("pathRegexp");
        }
        if (this.urlPathParsed) {
          return this.urlParams.relativePath.match(pathRegexp);
        }
        return null;
      }

      /*
       * Returns the array into which String.match() stores the result
       * of matching the path in the current position of URL against
       * /[^/]+\.html?$/.
       */
      matchHtmlDocument() {
        return this.match(PATH_HTML_DOCUMENT_REGEXP);
      }

      /*
       * Parses the key and value of query parameters in the URL.
       */
      parseQuery() {
        var queryIndex = this.url.indexOf("?");
        if (queryIndex >= 0) {
          var query = this.url.substring(queryIndex);
          var queryMap = new Map();
          (new URLSearchParams(query)).forEach((queryValue, queryKey) => {
              queryMap.set(queryKey, queryValue);
            });
          this.urlParams.queryMap = queryMap;
          return true;
        }
        return false;
      }

      isCompleted() {
        return this.urlPathParsed && this.urlParams.relativePath == "";
      }

      get hostServer() {
        return this.urlParams.hostServer;
      }

      get path() {
        return this.urlParams.path;
      }

      getQueryValue(queryKey) {
        if (this.urlParams.queryMap != undefined) {
          return this.urlParams.queryMap.get(queryKey);
        }
        return undefined;
      }

      /*
       * Returns the string parsed to the current position of URL.
       */
      toString(queryKeys) {
        if (this.path != "" && this.path != ROOT_DIRECTORY_PATH) {
          var url = URL_HTTPS_SCHEME;
          if (this.hostServer != "") {
            url += this.hostServer + ".";
          }
          url += DOMAIN;
          if (this.path != "/") {
            url += this.path;
            if (! this.path.endsWith("/")
              && this.urlParams.relativePath != "") {
              // Append a slash to the end of directory path.
              url += "/";
            }
          //} else {
          // Never appended a slash to only the host name.
          }
          if (queryKeys != undefined && this.urlParams.queryMap != undefined) {
            var query = "";
            queryKeys.forEach((queryKey) => {
                var queryValue = this.urlParams.queryMap.get(queryKey);
                if (queryValue != undefined) {
                  if (query != "") {
                    query += "&";
                  } else {
                    if (this.path == "/") {
                      // Append a slash to only the host name, see above.
                      query = "/";
                    }
                    query += "?";
                  }
                  query += queryKey + "=" + queryValue;
                }
              });
            url += query;
          }
          return url;
        }
        return undefined;
      }
    }

    _Site.OpenedUrlParser = OpenedUrlParser;

    /*
     * Adds the specified news design into this site.
     */
    function addNewsDesign(newsDesign) {
      if (newsDesign == undefined) {
        throw newNullPointerException("newsDesign");
      }
      newsDesigns.push(newsDesign);
    }

    /*
     * Adds news designs of the specified variable into this site.
     */
    function addNewsDesigns(...newsDesigns) {
      if (! Array.isArray(newsDesigns)) {
        throw newIllegalArgumentException("newsDesigns");
      }
      newsDesigns.forEach(addNewsDesign);
    }

    _Site.addNewsDesign = addNewsDesign;
    _Site.addNewsDesigns = addNewsDesigns;

    const TOPIC_TEXT_ENCLOSING_REGEXP = new RegExp(/^(.+) +\((.+)\)$/);
    const TOPIC_WORD_JOINED_REGEXP =
      ExtractNews.getLocalizedRegExp(LANGUAGE + "TopicWordJoined");

    /*
     * Returns the set of news words gotten from the specified text.
     */
    function getNewsWordSet(newsTopicText) {
      var topicWordSet = new Set();
      var topicTexts = new Array();
      var topicTextMatch = newsTopicText.match(TOPIC_TEXT_ENCLOSING_REGEXP);
      if (topicTextMatch != null) {
        topicTexts.push(topicTextMatch[1], topicTextMatch[2]);
      } else {
        topicTexts.push(newsTopicText);
      }
      topicTexts.forEach((topicText) => {
          do {
            var wordJoinedMatch = topicText.match(TOPIC_WORD_JOINED_REGEXP);
            if (wordJoinedMatch == null) {
              topicWordSet.add(topicText);
              break;
            }
            topicWordSet.add(topicText.substring(0, wordJoinedMatch.index));
            topicText =
              topicText.substring(
                wordJoinedMatch.index + wordJoinedMatch[0].length);
          } while (true);
        });
      return topicWordSet;
    }

    _Site.getNewsWordSet = getNewsWordSet;

    /*
     * Adds the specified news topic word into this site.
     */
    function addNewsTopicWord(newsTopicWord) {
      if (newsTopicWord == undefined) {
        throw newNullPointerException("newsTopicWord");
      } else if (newsTopicWord != "") {
        newsTopicWordSet.add(newsTopicWord);
      }
    }

    /*
     * Adds news topic words of the specified array into this site.
     */
    function addNewsTopicWords(newsTopicWords) {
      if (! Array.isArray(newsTopicWords)) {
        throw newIllegalArgumentException("newsTopicWords");
      }
      newsTopicWords.forEach(addNewsTopicWord);
    }

    _Site.addNewsTopicWord = addNewsTopicWord;
    _Site.addNewsTopicWords = addNewsTopicWords;

    const WORD_SEPARATORS = new Set();

    {
      var wordSeparators =
        ExtractNews.getLocalizedString(LANGUAGE + "WordSeparators");
      for (let i = 0; i < wordSeparators.length; i++) {
        var codePoint = wordSeparators.codePointAt(i);
        if (codePoint > 0xFFFF) {
          i++;
        }
        WORD_SEPARATORS.add(codePoint);
      }
    }

    /*
     * The selector whether to show or hide news topics or senders on the site,
     * in which news topics are dropped by filtering targets.
     */
    class NewsFilteringSelector extends NewsSelector {
      constructor(newsFilteringTargetObjects = new Array()) {
        super();
        this.newsFilteringTargets = new Array();
        newsFilteringTargetObjects.forEach((newsFilteringTargetObject) => {
            var newsFilteringTarget =
              new ExtractNews.FilteringTarget(newsFilteringTargetObject);
            this.newsFilteringTargets.push(newsFilteringTarget);
            if (Debug.isLoggingOn()) {
              Debug.dump("\t", newsFilteringTarget.name,
                (newsFilteringTarget.isWordNegative() ? "! " : "  ")
                + newsFilteringTarget.words.join(","));
            }
          });
        this.newsTopicRegexp = undefined;
        this.newsSenderRegexp = undefined;
        this.newsExcludedRegexp = undefined;
      }

      getNewsTopicRegexp() {
        return this.newsTopicRegexp;
      }

      getNewsSenderRegexp() {
        return this.newsSenderRegexp;
      }

      getNewsExcludedRegexp() {
        return this.newsExcludedRegexp;
      }

      setNewsSettingRegexp(
        topicRegexpString, senderRegexpString, excludedRegexpString) {
        this.newsTopicRegexp = _newRegexp(topicRegexpString);
        this.newsSenderRegexp = _newRegexp(senderRegexpString);
        this.newsExcludedRegexp = _newRegexp(excludedRegexpString);
      }

      _testTargetWords(target, newsTopicString) {
        var targetResult = ! target.isWordNegative();
        if (target.words.length > 0) {
          let i = 0;
          do {
            var targetWord = target.words[i];
            var targetWordSearchIndex = newsTopicString.indexOf(targetWord);
            if (targetWordSearchIndex >= 0) {
              do {
                var targetWordMatching = true;
                if (target.isWordBeginningMatched()
                  && targetWordSearchIndex >= 1) {
                  var targetWordPrecedingCodePoint =
                    newsTopicString.codePointAt(targetWordSearchIndex - 1);
                  if (targetWordPrecedingCodePoint >= 0xDC00
                    && targetWordPrecedingCodePoint <= 0xDFFF
                    && targetWordSearchIndex >= 2) {
                    targetWordPrecedingCodePoint =
                      newsTopicString.codePointAt(targetWordSearchIndex - 2);
                  }
                  targetWordMatching =
                    WORD_SEPARATORS.has(targetWordPrecedingCodePoint);
                }
                targetWordSearchIndex += targetWord.length;
                if (targetWordMatching
                  && (! target.isWordEndMatched()
                    || targetWordSearchIndex >= newsTopicString.length
                    || WORD_SEPARATORS.has(
                      newsTopicString.codePointAt(targetWordSearchIndex)))) {
                  Debug.printProperty("Match filtering word", targetWord);
                  return targetResult;
                }
                targetWordSearchIndex =
                  newsTopicString.indexOf(targetWord, targetWordSearchIndex);
              } while (targetWordSearchIndex >= 0);
            }
            i++;
          } while (i < target.words.length);
          targetResult = ! targetResult;
        }
        return targetResult;
      }

      drop(newsTopicString) {
        var targetBlockSkipped = false;
        for (let i = 0; i < this.newsFilteringTargets.length; i++) {
          var target = this.newsFilteringTargets[i];
          if (targetBlockSkipped) {
            targetBlockSkipped = ! target.terminatesBlock();
            continue;
          } else if (this._testTargetWords(target, newsTopicString)) {
            if (target.name != ExtractNews.TARGET_RETURN) {
              return target.name == ExtractNews.TARGET_DROP;
            }
            targetBlockSkipped = true;
          }
        }
        // Returns false for the final "RETURN" which is the same as "ACCEPT".
        return false;
      }
    }

    function _arrangeNewsDesigns(newsSelector, newsDisplayOptions) {
      const arrangingPromises = new Array();
      newsDesigns.forEach((newsDesign) => {
          if (newsDesign.hasComments()) {
            arrangingPromises.push(
              new Promise((resolve) => {
                  var commentNodes = newsDesign.getCommentNodes();
                  if (newsDisplayOptions.newsCommentHidden) {
                    commentNodes.forEach(newsDesign.hideComment);
                    Debug.printMessage("Hide comment nodes.");
                  } else {
                    commentNodes.forEach(newsDesign.showComment);
                    Debug.printMessage("Show comment nodes.");
                  }
                  Debug.printNodes(commentNodes);
                  resolve();
                }));
          }
          arrangingPromises.push(
            newsDesign.arrange(newsSelector, newsDisplayOptions));
        });
      return Promise.all(arrangingPromises);
    }

    function _resetNewsDesigns(disposed = false) {
      newsDesigns.forEach((newsDesign) => {
        newsDesign.reset(disposed);
      });
    }

    /*
     * Displays news designs arranged by the selector on this site.
     */
    function displayNewsDesigns(newsTitle, newsOpenedUrl = "") {
      if (newsTitle == undefined) {
        throw newNullPointerException("newsTitle");
      } else if ((typeof newsTitle) != "string") {
        throw newIllegalArgumentException("newsTitle");
      }
      var newsSelector = undefined;
      var newsDisplayOptions = {
          newsCommentHidden: false,
          newsFilteringDisabled: false,
          newsSelectionDisabled: false
        };

      browser.runtime.onMessage.addListener((message) => {
          Debug.printMessage(
            "Receive the command " + message.command.toUpperCase() + ".");
          switch (message.command) {
          case ExtractNews.COMMAND_SETTING_APPLY:
            if (message.newsFilteringTargetObjects != undefined) {
              newsDisplayOptions.newsCommentHidden = message.newsCommentHidden;
              newsDisplayOptions.newsFilteringDisabled =
                message.newsFilteringDisabled;
              Debug.printProperty(
                "Comment Hidden", String(message.newsCommentHidden));
              Debug.printProperty(
                "Filtering Disabled", String(message.newsFilteringDisabled));
              newsSelector =
                new NewsFilteringSelector(message.newsFilteringTargetObjects);
              _resetNewsDesigns();
            } else if (newsSelector == undefined) {
              throw newUnsupportedOperationException();
            }
            newsSelector.setNewsSettingRegexp(
              message.newsSelectedTopicRegularExpression,
              message.newsSelectedSenderRegularExpression,
              message.newsExcludedRegularExpression);
            Debug.printProperty(
              "Selected Topic", message.newsSelectedTopicRegularExpression);
            Debug.printProperty(
              "Selected Sender", message.newsSelectedSenderRegularExpression);
            Debug.printProperty(
              "Exclusion", message.newsExcludedRegularExpression);
            _arrangeNewsDesigns(
              newsSelector, newsDisplayOptions).catch((error) => {
                Debug.printStackTrace(error);
              });
            break;
          case ExtractNews.COMMAND_SETTING_SWITCH:
            if (newsSelector == undefined) {
              throw newUnsupportedOperationException();
            } else if (message.newsCommentHidden
                == newsDisplayOptions.newsCommentHidden
              && message.newsFilteringDisabled
                == newsDisplayOptions.newsFilteringDisabled
              && message.newsSelectionDisabled
                == newsDisplayOptions.newsSelectionDisabled) {
              Debug.printMessage("Keep the same arrangement.");
              break;
            }
            newsDisplayOptions.newsCommentHidden = message.newsCommentHidden;
            newsDisplayOptions.newsFilteringDisabled =
              message.newsFilteringDisabled;
            newsDisplayOptions.newsSelectionDisabled =
              message.newsSelectionDisabled;
            Debug.printProperty(
              "Comment Hidden", String(message.newsCommentHidden));
            Debug.printProperty(
              "Filtering Disabled", String(message.newsFilteringDisabled));
            Debug.printProperty(
              "Selection Disabled", String(message.newsSelectionDisabled));
            _arrangeNewsDesigns(
              newsSelector, newsDisplayOptions).catch((error) => {
                Debug.printStackTrace(error);
              });
            break;
          case ExtractNews.COMMAND_SETTING_DISPOSE:
            var arrangingPromise = Promise.resolve();
            if (newsSelector != undefined) {
              newsDisplayOptions.newsCommentHidden = false;
              newsDisplayOptions.newsFilteringDisabled = false;
              newsDisplayOptions.newsSelectionDisabled = false;
              newsDisplayOptions.newsDisposed = true;
              newsSelector = undefined;
              arrangingPromise =
                _arrangeNewsDesigns(
                  new NewsFilteringSelector(), newsDisplayOptions);
            }
            arrangingPromise.then(() => {
                _resetNewsDesigns(true);
                Debug.printMessage("Disable this site.");
              }).catch((error) => {
                Debug.printStackTrace(error);
              });
            break;
          }
        });

      window.addEventListener("beforeunload", (event) => {
          _resetNewsDesigns(true);
        });

      ExtractNews.getDebugMode().then(() => {
          const displayingPromises = new Array();
          newsDesigns.forEach((newsDesign) => {
              displayingPromises.push(newsDesign.display());
            });
          return Promise.all(displayingPromises);
        }).then(() => {
          var newsTopicWordsString = Array.from(newsTopicWordSet).join(",");
          Debug.printProperty("Title", newsTitle);
          Debug.printProperty("Opened URL", newsOpenedUrl);
          Debug.printProperty("Topic Words", newsTopicWordsString);
          return ExtractNews.sendRuntimeMessage({
              command: ExtractNews.COMMAND_SETTING_REQUEST,
              title: newsTitle,
              openedUrl: newsOpenedUrl,
              topicWordsString: newsTopicWordsString
            });
        }).catch((error) => {
          Debug.printStackTrace(error);
        });
    }

    _Site.displayNewsDesigns = displayNewsDesigns;

    return _Site;
  })();

const Site = ExtractNews.Site;
