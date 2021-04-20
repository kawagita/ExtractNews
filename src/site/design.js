/*
 *  Define the class of news design displayed and arranged on a site.
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
 * The design displayed and arranged on a news site.
 */
ExtractNews.Design = (() => {
    const _Design = {
        // Regular expression to match the text of news topics
        NEWS_RANKING_NUMBER_REGEXP: new RegExp(/^[1-9][0-9]*\.?$/),
        NEWS_VIDEO_TIME_REGEXP: new RegExp(/^[0-9][0-9]? *: *[0-9][0-9]/)
      };

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

    const EMPTY_PROPERTY = { };

    // Query properties to get the news element for oneself
    _Design.ONESELF_QUERY_PROPERTY = EMPTY_PROPERTY;
    _Design.ONESELF_QUERY_PROPERTIES = [ _Design.ONESELF_QUERY_PROPERTY ];

    // Query properties to get li elements contained in the news element
    const LI_ELEMENTS_QUERY_PROPERTY = {
        selectorsForAll: "li"
      };
    const LI_ELEMENTS_QUERY_PROPERTIES = [ LI_ELEMENTS_QUERY_PROPERTY ];

    // Properties to search the first text node
    const FIRST_TEXT_SEARCH_PROPERTIES = [ EMPTY_PROPERTY ];

    // Property to search the first text node from a news topic and sender
    const ITEM_FIRST_TEXT_PROPERTY = {
        topicSearchFirst: false,
        topicSearchFromLast: false,
        senderSearchFirst: false,
        senderSearchFromLast: false
      };

    // Options to observe children or the sub tree for a node
    _Design.CHILD_OBSERVER_OPTIONS = { childList: true };
    _Design.SUBTREE_OBSERVER_OPTIONS = { childList: true, subtree: true };

    const OBSERVED_TAG_NAME_SET = new Set([
        "LI", "UL", "OL", "DIV", "ARTICLE", "ASIDE", "SECTION"
      ]);

    const SEARCH_TAG_NAME_SET = new Set([
        "A", "DIV", "IMG", "P", "SPAN", "HEADER", "H1", "H2", "H3", "H4", "H5",
        "H6", "FOOTER", "TR", "TD", "TH", "DL", "DT", "DD", "FIGURE",
        "FIGCAPTION", "ABBR", "B", "BLOCKQUOTE", "EM", "I", "Q", "S", "SMALL",
        "STRONG", "INS", "DEL"
      ]);

    /*
     * The design of news panels or lists displayed and arranged on a site.
     */
    class NewsDesign {
      // Parameters of designProperty
      //
      // parentProperties     Array of query properties by which news parents
      //                      are gotten from the document.
      // keepDisplaying       Flag whether the news parent is displayed when
      //                      all news item are hidden. Instead, a subclass
      //                      implements keepNewsParentDisplaying().
      // itemLayoutUnchanged  Flag whether the layout of news items is
      //                      unchanged when those are hidden.
      // itemSelected         Flag whether the news selection is applied to
      //                      all news items. Instead, a subclass implements
      //                      isNewsItemSelected().
      // itemUnfixed          Flag whether news items are unfixed within this
      //                      design by the addition or rearrangement.
      // itemProperties       Array of query properties by which news items
      //                      are gotten form a news parent. Instead,
      //                      a subclass implements getNewsItemProperties().
      // topicProperties      Array of query properties by which a news topic
      //                      is gotten from a news item. Instead, a subclass
      //                      implements getNewsTopicProperties().
      // senderProperties     Array of query properties by which a news sender
      //                      is gotten from a news item. Instead, a subclass
      //                      implements getNewsSenderProperties().
      // itemTextProperty     Property by which a text node is searched from
      //                      the news topic or sender. Instead, a subclass
      //                      implements getNewsItemTextProperty().
      // observerOptions      Object providing options to observe nodes
      //                      returned by getObservedNodes(). Instead,
      //                      a subclass implements getObserverOptions().
      // observedProperties   Array of query properties by which the observed
      //                      node is gotten from the news parent.
      // observedItemProperties  Array of query properties by which the news
      //                         item for a node added to the observed node
      //                         is gotten. Instead, a subclass implements
      //                         getObservedNewsItemProperties().
      // commentProperties    Array of query properties by which the comment
      //                      node is gotten.
      constructor(designProperty = { }) {
        this.designProperty = designProperty;
        this.arrangementObservers = undefined;
        this.arrangedNewsParents = undefined;
        this.arrangedNewsItemsMap = new Map();
        this.arrangedNewsItemParamsMap = new Map();
      }

      /*
       * Returns the element array (not HTMLCollection or NodeList) of news
       * parents contained in this news design.
       */
      getNewsParentElements() {
        if (this.designProperty.parentProperties != undefined) {
          var newsParents = new Array();
          this.designProperty.parentProperties.forEach((property) => {
              _queryNewsElement(property, document, newsParents);
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
       * Returns true if the specified element of a news parent keeps
       * displaying on the site even if all news items are hidden.
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
       * Returns the element array (not HTMLCollection or NodeList) of news
       * items contained in the specified element of a news parent, which is
       * gotten by "itemProperties" specified by the constructor or returend by
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
        itemProperties.forEach((property) => {
            _queryNewsElement(property, newsParent, newsItems);
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

      // Parameters of searchProperties
      //
      // altTextUsed         Flag whether the alt attribute of a img element
      //                     is used as the text.
      // advertisingTextSet  Set of advertising texts. If a text in this array
      //                     is found, news topic is skipped as the adverting.
      // skippedTextSet      Set of texts skipped in searching the text node.
      // skippedTextRegexp   Regular expression matched and skipped in
      //                     searching the text node.
      // idPrefix            String prefixed with ID of a node which is found
      //                     in searching the text node but not returned.
      // idSuffix            String suffixed with ID of a node which is found
      //                     in searching the text node but not returned.
      // className           Class name of a node which is found in searching
      //                     the text node but not returned.
      // classNamePrefix     Class name prefix of a node which is found in
      //                     searching the text node but not returned.
      // classNameSuffix     Class name suffix of a node which is found in
      //                     searching the text node but not returned.
      // tagName             Tag name of a node which is found in searching
      //                     the text node but not returned.
      _searchNewsItemTextNode(searchParams) {
        if (searchParams.element != null) {
          var nodeSearch = {
              element: searchParams.element,
              index: 0
            };
          var nodeSearches = new Array();
          var nodeIncremenCount = 1;
          var searchFoundElements = new Array();
          var searchProperties = searchParams.properties;
          if (searchProperties == undefined) {
            searchProperties = FIRST_TEXT_SEARCH_PROPERTIES;
          }
          var searchPropertyIndex = 0;
          var searchProperty = searchProperties[0];
          var searchTagName = undefined;
          if (searchProperty.tagName != undefined) {
            searchTagName = searchProperty.tagName.toUpperCase();
          }
          if (searchParams.fromLast) {
            nodeSearch.index = nodeSearch.element.childNodes.length - 1;
            nodeIncremenCount = -1;
          }

          // Search the text node in the specified news item recursively.
          do {
            while (nodeSearch.index >= 0
              && nodeSearch.index < nodeSearch.element.childNodes.length) {
              var node = nodeSearch.element.childNodes[nodeSearch.index];
              var altTextFound =
                searchProperty.altTextUsed && node.tagName == "IMG";
              nodeSearch.index += nodeIncremenCount;
              if (altTextFound || node.nodeType == Node.TEXT_NODE) {
                var nodeText = node.textContent;
                if (altTextFound) {
                  nodeText = node.alt;
                }
                nodeText = nodeText.trim();
                if (nodeText != "") {
                  // Return the first text node except for the skipped texts
                  // or matching the skipped regular expression if no longer
                  // search property exist.
                  if (searchProperty.advertisingTextSet != undefined
                    && searchProperty.advertisingTextSet.has(nodeText)) {
                    // Display any advertisings including the specified text.
                    searchParams.advertisingFound = true;
                    return;
                  } else if ((searchProperty.skippedTextSet == undefined
                      || ! searchProperty.skippedTextSet.has(nodeText))
                    && (searchProperty.skippedTextRegexp == undefined
                      || ! searchProperty.skippedTextRegexp.test(nodeText))) {
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
                    // Finish element searching by the id prefix, class or tag
                    // name of the specified property.
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
                  nodeSearches.push(nodeSearch);
                  nodeSearch = {
                      element: node,
                      index: 0
                    };
                  if (searchParams.fromLast) {
                    nodeSearch.index = nodeChildCount - 1;
                  }
                //} else { // No text node, even a child node
                }
              }
            }
            if (nodeSearches.length <= 0) {
              break;
            }

            var nodeSearch = nodeSearches.pop();
            if (searchFoundElements.length > 0
              && nodeSearch.element
                == searchFoundElements[searchFoundElements.length - 1]) {
              if (searchPropertyIndex >= searchProperties.length) {
                break;
              }
              // Pop the last found element if the next searching node is not
              // found from its child elements.
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
       * Returns the element of a news sender contained in the specified
       * element of a news item, which is gotten by "senderProperties"
       * specified by the constructor or returend by
       * this.getNewsSenderProperties(newsItem) if not undefined, otherwise,
       * null.
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
      // topicFollowingTagName  Tag name of the element followed by a news
      //                        topic.
      // senderFollowing        Flag whether the element of a news topic is
      //                        followed by a news sender when searched
      //                        firstly.
      // senderFollowingTagName Tag name of an element followed by a news
      //                        sender.
      // topicSearchProperties  Array of properties used by searching
      //                        the text node of a news topic.
      // senderSearchProperties Array of properties used by searching
      //                        the text node of a news sender.
      _setNewsItemDisplaying(newsItem, newsSelector, newsDisplayOptions) {
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
                // Move back from the element of a news topic to the first
                // ancestor node of the specified tag name.
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
                senderSearchParams.element =
                  topicAncestorNode.nextElementSibling;
              }
              this._searchNewsItemTextNode(senderSearchParams);
            }
          } else if (itemTextProperty.senderSearchFirst) {
            // Search the text node from the element of a news sender firstly,
            // gotten by "senderProperties" returned by
            // getNewsSenderProperties() or specified by the constructor.
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
                topicSearchParams.element =
                  senderAncestorNode.nextElementSibling;
              }
              this._searchNewsItemTextNode(topicSearchParams);
            }
          } else {
            // Search the text node from the element of a news topic and sender
            // gotten by "topicProperties" and "senderProperties" returned by
            // getNewsTopicProperties() and getNewsSenderProperties() or
            // specified by the constructor.
            this._searchNewsItemTextNode(topicSearchParams);
            this._searchNewsItemTextNode(senderSearchParams);
          }

          newsItemParams = {
              arrangeable:
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

        if (newsSelector != undefined && newsItemParams.arrangeable) {
          var topicString =
            this.getNewsTopicText(newsItemParams.topicTextNode);
          var topicDropped = false;
          if (! newsDisplayOptions.newsFilteringDisabled) {
            if (newsItemParams.topicDropped == undefined) {
              newsItemParams.topicDropped = newsSelector.drop(topicString);
            }
            topicDropped = newsItemParams.topicDropped;
          }
          var senderString =
            this.getNewsSenderText(newsItemParams.senderTextNode);

          var newsItemSelected = false;
          if (! newsDisplayOptions.newsSelectionDisabled) {
            newsItemSelected = this.isNewsItemSelected(newsItem);
          }
          newsItemDisplaying = this.isNewsItemDisplaying(newsItem);

          // Display the news item in which the news topic is not dropped by
          // word filterings and don't match the excluded regular expression
          // and the news topic or sender match selected regular expressions.
          if (! topicDropped && ! newsSelector.exclude(topicString)
            && (! newsItemSelected
              || newsSelector.select(topicString, senderString))) {
            if (! newsItemDisplaying && this.showNewsItemElement(newsItem)) {
              if (senderString != undefined) {
                topicString += " (" + senderString + ")";
              }
              Debug.printProperty("Show the news topic", topicString);
              newsItemDisplaying = true;
            }
          } else if (newsItemDisplaying
            && this.hideNewsItemElement(newsItem)) {
            if (senderString != undefined) {
              topicString += " (" + senderString + ")";
            }
            Debug.printProperty("Hide the news topic", topicString);
            newsItemDisplaying = false;
          }
        }

        return newsItemDisplaying;
      }

      getObserverOptions(newsParent) {
        if (this.designProperty.observerOptions != undefined) {
          return this.designProperty.observerOptions;
        }
        return _Design.CHILD_OBSERVER_OPTIONS;
      }

      /*
       * Returns the element array of observed nodes for the specified element
       * of a news parent, which is gotten by "observedProperties" specified by
       * the constructor if not undefined, otherwise, EMPTY_NEWS_ELEMENTS.
       */
      getObservedNodes(newsParent) {
        if (this.designProperty.observedProperties != undefined) {
          var newsObservedNodes = new Array();
          this.designProperty.observedProperties.forEach((property) => {
              _queryNewsElement(property, newsParent, newsObservedNodes);
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
       * is added to the observed node, which is gotten by
       * "observedItemProperties" specified by the constructor or returend by
       * this.getObservedNewsItemProperties(addedNode) if not undefined,
       * otherwise, EMPTY_NEWS_ELEMENTS.
       */
      getObservedNewsItemElements(addedNode) {
        var observedItemProperties =
          this.getObservedNewsItemProperties(addedNode);
        if (observedItemProperties == undefined) {
          observedItemProperties = this.designProperty.observedItemProperties;
        }
        if (observedItemProperties != undefined) {
          var newsItems = new Array();
          observedItemProperties.forEach((property) => {
              _queryNewsElement(property, addedNode, newsItems);
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
       * Returns true if news items rearranged by the changed node in
       * the specified array are cleared in this design.
       */
      isRearrangementNewsItemsCleared(changedNodes) {
        return false;
      }

      /*
       * Returns the observed node to rearrange news items in this design
       * by changing attributes.
       */
      getRearrangementObservedNode() {
        return null;
      }

      /*
       * Returns true if this design is rearranged when element attributes
       * for the specified node is changed.
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
          this.designProperty.commentProperties.forEach((property) => {
              _queryNewsElement(property, document, commentNodes);
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
          if (newsSelector != undefined) {
            newsItems = this.getNewsItemElements(newsParent);
          } else {
            newsItems = EMPTY_NEWS_ELEMENTS;
          }
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
              // All news items contained in the element of a news parent are
              // not only displayed but also its parent is hidden together.
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
          } else {
            Debug.printMessage("Display the news parent.");
          }
          Debug.printNodes(newsParent);
        } else if (newsSelector == undefined) {
          // Print the message for no news item only when displayed firstly.
          Debug.printMessage("Display no news item.");
          Debug.printMessage("Display the news parent.");
          Debug.printNodes(newsParent);
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
                      var newsItems =
                        this.getObservedNewsItemElements(addedNode);
                      if (newsItems.length > 0) {
                        newsItems.forEach((newsItem) => {
                            arrangedNewsItems.push(newsItem);
                          });
                        if (removedNodeSet.has(addedNode)) {
                          // Exclude the removed node if added just after.
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
                    var newsItemsMap = this.arrangedNewsItemsMap;
                    // Cache added news items for each parent if not unfixed.
                    arrangedNewsItems.forEach((arrangedNewsItem) => {
                        for (const newsParent of this.arrangedNewsParents) {
                          if (newsParent.contains(arrangedNewsItem)) {
                            var newsItems = newsItemsMap.get(newsParent);
                            if (newsItems == undefined) {
                              newsItems = new Array();
                              newsItemsMap.set(newsParent, newsItems);
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
              if (newsItems.length > 0) {
                this.arrangedNewsItemsMap.set(newsParent, newsItems);
                displayingPromises.push(this._arrangeNewsItems(newsParent));
              }
            });
          this.arrangedNewsParents = newsParents;
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
                  var rearrangementObserver =
                    new MutationObserver((mutations) => {
                      var changedNode = null;
                      var changedNodes = new Array();
                      mutations.forEach((mutation) => {
                          if (mutation.type == "attributes") {
                            var target = mutation.target;
                            if (target.nodeType == Node.ELEMENT_NODE
                              && OBSERVED_TAG_NAME_SET.has(target.tagName)) {
                              if (this.isRearrangedBy(target)) {
                                changedNode = target;
                              }
                              changedNodes.push(target);
                            }
                          }
                        });
                      if (this.isRearrangementNewsItemsCleared(changedNodes)) {
                        this.arrangedNewsItemsMap.clear();
                        this.arrangedNewsItemParamsMap.clear();
                      }
                      if (changedNode != null) {
                        const rearrangingPromises = new Array();
                        this.getNewsParentElements().forEach((newsParent) => {
                            this.rearrangeNewsParent(newsParent);
                            rearrangingPromises.push(
                              this._arrangeNewsItems(
                                newsParent, newsSelector, newsDisplayOptions));
                          });
                        Promise.all(rearrangingPromises).then(() => {
                            Debug.printMessage("Arrange by the changed node.");
                            Debug.printNodes(changedNode);
                          }).catch((error) => {
                            Debug.printStackTrace(error);
                          });
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

      reset() {
        this.arrangedNewsItemParamsMap.forEach((newsItemParams) => {
            newsItemParams.topicDropped = undefined;
          });
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

      clear() {
        this.arrangedNewsParents = undefined;
        this.arrangedNewsItemsMap.clear();
        this.arrangedNewsItemParamsMap.clear();
        this.reset();
      }
    }

    _Design.NewsDesign = NewsDesign;

    return _Design;
  })();

const Design = ExtractNews.Design;
