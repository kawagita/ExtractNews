/*
 *  Display news topics or media arranged on the site of Yahoo!.
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
 * Returns the string localized for the specified ID on Yahoo!.
 */
function getYahooString(id) {
  return ExtractNews.getLocalizedString("Yahoo" + id);
}

/*
 * Returns the array of strings separated by commas after localizing for
 * the specified ID on Yahoo!.
 */
function splitYahooString(id) {
  return ExtractNews.splitLocalizedString("Yahoo" + id);
}

/*
 * Returns RegExp object created after localizing for the specified ID
 * suffixed with "RegularExpression" on Yahoo!.
 */
function getYahooRegExp(id) {
  return ExtractNews.getLocalizedRegExp("Yahoo" + id);
}

const YAHOO_CATEGORY_LABELS = new Set(splitYahooString("CategoryLabels"));
const YAHOO_ADVERTISING_LABELS =
  new Set(splitYahooString("AdvertisingLabels"));

const YAHOO_TOP_PANELS_ITEM_0 = "item-0";

const YAHOO_ARTICLE_CLUSTER_BOUNDARY = "article-cluster-boundary";

const YAHOO_STREAM = "stream";
const YAHOO_STREAM_ITEMS = "stream-items";
const YAHOO_STREAM_RELATED_ITEM = "stream-related-item";

const YAHOO_JS_STREAM_CONTENT = "js-stream-content";

const YAHOO_ARTICLE_REGEXP = new RegExp("Article");
const YAHOO_CAAS_SIDEKICK = "caas-sidekick";
const YAHOO_CAAS_LIST = "caas-list";

const YAHOO_SIMPLE_LIST = "simple-list";

const YAHOO_NAVIGAGION = "YDC-Nav";

/*
 * A big panel and filmstrip displayed in the top on Yahoo!.
 */
class YahooTopPanels extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: "#" + YAHOO_TOP_PANELS_ITEM_0 + ", .ntk-lead",
            setNewsElement: (element, newsParents) => {
                newsParents.push(element.parentNode);
              }
          }),
        topicProperties: ONESELF_QUERY_PROPERTIES
      });
  }

  getNewsItemElements(newsParent) {
    var newsItems = new Array();
    var newsFirstItem = newsParent.firstElementChild;
    if (newsFirstItem.id == YAHOO_TOP_PANELS_ITEM_0) {
      newsFirstItem = newsFirstItem.firstElementChild;
    }
    newsItems.push(newsFirstItem);
    Array.from(newsParent.querySelectorAll("li")).forEach((newsItem) => {
        newsItems.push(newsItem);
      });
    return newsItems;
  }

  showNewsItemElement(newsItem) {
    if (newsItem.tagName != "LI") { // Only a big panel
      newsItem.style.display = "";
    } else {
      newsItem.style.visibility = "visible";
    }
    return true;
  }

  hideNewsItemElement(newsItem) {
    if (newsItem.tagName != "LI") { // Only a big panel
      newsItem.style.display = "none";
    } else {
      newsItem.style.visibility = "hidden";
    }
    return true;
  }
}

/*
 * The top panels displayed and other panels observed on Yahoo! Life.
 */
class YahooLifePanels extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: "#top-stories-hero"
          }, {
            // News parent to which news items are appended by the observer
            selectorsForAll: "#Page > section"
          }),
        itemProperties: Array.of({
            selectorsForAll: ".lead-item, .simple-list-item",
            setNewsElement: (element, newsItems) => {
                if (element.tagName != "LI") {
                  element = element.parentNode;
                }
                newsItems.push(element);
              }
          }),
        senderProperties: ONESELF_QUERY_PROPERTIES,
        itemTextProperty: {
            senderSearchFirst: true,
            topicFollowing: true,
            topicFollowingTagName: "div"
          },
        observedProperties: ONESELF_QUERY_PROPERTIES,
        observedItemProperties: Array.of({
            setNewsElement: (element, newsItems) => {
                element.querySelectorAll("li").forEach((newsItem) => {
                    newsItems.push(newsItem);
                  });
              }
          })
      });
  }

  getObservedNodes(newsParent) {
    if (newsParent.tagName == "SECTION") {
      return Array.of(newsParent);
    }
    return EMPTY_NEWS_ELEMENTS;
  }
}

/*
 * Articles defined by the class name "article-cluster-boundary" on Yahoo!.
 */
class YahooArticleClusters extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectorsForAll: "." + YAHOO_ARTICLE_CLUSTER_BOUNDARY,
            setNewsElement: (element, newsParents) => {
                if (element.tagName == "UL") { // 2nd and 5th
                  newsParents.push(element.parentNode);
                } else if (element.firstElementChild.tagName == "A") { // 1st
                  newsParents.push(element);
                } else { // 3rd
                  var classList = element.firstElementChild.classList;
                  if (! classList.contains(YAHOO_ARTICLE_CLUSTER_BOUNDARY)) {
                    for (const newsParent of element.children) {
                      newsParents.push(newsParent);
                    }
                  //} else { // 4th
                  // The child has the class name "article-cluster-boundary".
                  }
                }
              }
          }),
        topicProperties: ONESELF_QUERY_PROPERTIES,
        itemTextProperty: {
            topicSearchProperties: Array.of({
                skippedTextRegexp: NEWS_VIDEO_TIME_REGEXP
              })
          }
      });
  }

  getNewsItemElements(newsParent) {
    for (const newsParentChild of newsParent.children) {
      if (newsParentChild.tagName == "UL") {
        return super.getNewsItemElements(newsParentChild);
      }
    }
    var newsItems = new Array();
    if (newsParent.firstElementChild.tagName == "A") {
      Array.from(newsParent.querySelectorAll("a")).forEach((newsItem) => {
          if (newsItem.textContent.trim() != "") {
            newsItems.push(newsItem);
          }
        });
    } else {
      newsItems.push(newsParent.firstElementChild);
    }
    return newsItems;
  }

  getNewsItemTextProperty(newsItem) {
    if (newsItem.classList.contains("VideoPlayer")) {
      return {
          topicSearchProperties: Array.of({
              classNameSuffix: "item-title"
            })
        };
    }
    return undefined;
  }
}

/*
 * The stream of news topics with the category and media name on Yahoo!.
 */
class YahooStream extends NewsDesign {
  constructor(id) {
    super({
        parentProperties: Array.of({
            selectors: id != undefined ? "#" + id : "." + YAHOO_STREAM_ITEMS,
            setNewsElement: (element, newsParents) => {
                if (! element.classList.contains(YAHOO_STREAM_ITEMS)) {
                  element = element.firstElementChild;
                }
                newsParents.push(element);
              }
          }),
        keepDisplaying: true,
        itemSelected: true,
        itemUnfixed: true,
        itemProperties: Array.of({
            selectorsForAll: "." + YAHOO_JS_STREAM_CONTENT,
            setNewsElement: (element, newsItems) => {
                var firstNewsItem = element.firstElementChild;
                if (firstNewsItem.id != YAHOO_TOP_PANELS_ITEM_0
                  && ! firstNewsItem.classList.contains("author-bio")) {
                  newsItems.push(element);
                  element.querySelectorAll("li").forEach((newsItem) => {
                      newsItems.push(newsItem);
                    });
                }
              }
          }),
        senderProperties: ONESELF_QUERY_PROPERTIES,
        observerOptions: SUBTREE_OBSERVER_OPTIONS,
        observedProperties: ONESELF_QUERY_PROPERTIES,
        observedItemProperties: Array.of({
            setNewsElement: (element, newsItems) => {
                if (element.classList.contains(YAHOO_JS_STREAM_CONTENT)) {
                  newsItems.push(element);
                  element.querySelectorAll("li").forEach((newsItem) => {
                      newsItems.push(newsItem);
                    });
                } else if (element.classList.contains("streamHeroImage")) {
                  newsItems.push(element);
                } else if (element.tagName == "DIV") {
                  // Arrange nodes added to the bottom on the stream item
                  // when an article is closed.
                  var streamRelatedItems =
                    element.querySelectorAll("." + YAHOO_STREAM_RELATED_ITEM);
                  streamRelatedItems.forEach((streamRelatedItem) => {
                      newsItems.push(streamRelatedItem);
                    });
                }
              }
          }),
      });
    this.YahooHomeDesigned = id == undefined;
  }

  getNewsTopicElement(newsItem) {
    if (newsItem.classList.contains(YAHOO_JS_STREAM_CONTENT)) {
      var newsHeadings = newsItem.querySelectorAll("h3");
      if (newsHeadings.length > 0) {
        if (newsHeadings[0].id.startsWith("stream_item_title")) {
          return newsHeadings[0];
        }
        // Return the h3 element which is not a video but text.
        return newsHeadings[newsHeadings.length - 1];
      }
    }
    return newsItem;
  }

  getNewsItemTextProperty(newsItem) {
    if (newsItem.classList.contains(YAHOO_JS_STREAM_CONTENT)) {
      // Start searching the text from the h3 element of a news topic upward.
      return {
          topicSearchFirst: true,
          topicSearchFromLast: true,
          senderFollowing: true,
          senderFollowingTagName: "h3",
          senderSearchProperties: Array.of({
              advertisingTexts: YAHOO_ADVERTISING_LABELS
            })
        };
    } else if (! newsItem.classList.contains(YAHOO_STREAM_RELATED_ITEM)) {
      // Search the text in order of topic, sender in the specified news item.
      var itemTextProperty = {
          topicSearchFirst: true,
          senderFollowing: true
        };
      if (this.YahooHomeDesigned) {
        // Start searching the text from the last node upward.
        itemTextProperty.topicSearchFromLast = true;
      }
      return itemTextProperty;
    }
    // Start searching the text from the last node of a news sender upward.
    return {
        senderSearchFirst: true,
        senderSearchFromLast: true,
        topicFollowing: true,
        senderSearchProperties: Array.of({
            tagName: "a"
          }, {
            advertisingTexts: YAHOO_ADVERTISING_LABELS
          })
      };
  }
}

// Returns true if the specified item is the element of an article which is
// appended under the main article for the link clicked on the stream.

function _isClusterArticle(newsItem) {
  return newsItem.id.startsWith("clusterArticle");
}

/*
 * The content viewer of some articles with the list of panels displayed in
 * the side or bottom when a news item is clicked on Yahoo!.
 */
class YahooContentViewer extends NewsDesign {
  constructor() {
    super({
        itemUnfixed: true,
        topicProperties: ONESELF_QUERY_PROPERTIES,
        observerOptions: SUBTREE_OBSERVER_OPTIONS,
        observedProperties: ONESELF_QUERY_PROPERTIES
      });
    this.articleIds = new Array();
  }

  getNewsParentElements() {
    var contentViewer = document.getElementById("content-viewer");
    if (contentViewer != null) {
      var newsParents = new Array();
      newsParents.push(contentViewer);
      this.articleIds.forEach((articleId) => {
          // Add the element of an article if has already been opened yet.
          var articleElement = document.getElementById(articleId);
          newsParents.push(articleElement);
          var caasList = articleElement.querySelector("." + YAHOO_CAAS_LIST);
          if (caasList != null) {
            newsParents.push(caasList);
          }
        });
      return newsParents;
    }
    return EMPTY_NEWS_ELEMENTS;
  }

  getNewsItemElements(newsParent) {
    if (_isClusterArticle(newsParent)) {
      return Array.of(newsParent);
    } else if (newsParent.classList.contains(YAHOO_CAAS_LIST)) {
      return newsParent.querySelectorAll("li");
    }
    var newsItems = new Array();
    var newsPanelsLists =
      newsParent.querySelectorAll(
        "." + YAHOO_CAAS_SIDEKICK + ", ." + YAHOO_SIMPLE_LIST);
    for (let i = 0; i < newsPanelsLists.length; i++) {
      for (const newsItem of newsPanelsLists[i].querySelectorAll("li")) {
        newsItems.push(newsItem);
      }
    }
    // No observed node of ".simple-list" arranged by YahooSimpleList class.
    return newsItems;
  }

  isNewsItemSelected(newsItem) {
    return _isClusterArticle(newsItem);
  }

  getNewsSenderProperties(newsItem) {
    if (_isClusterArticle(newsItem)) {
      return Array.of({
          selectors: ".caas-logo"
        });
    } else if (newsItem.classList.contains(YAHOO_JS_STREAM_CONTENT)) {
      return Array.of({
          selectors: ".provider-logo"
        });
    }
    return null;
  }

  getNewsItemTextProperty(newsItem) {
    if (_isClusterArticle(newsItem)
      || newsItem.classList.contains(YAHOO_JS_STREAM_CONTENT)) {
      return {
          senderSearchFirst: true,
          topicFollowing: true,
          topicFollowingTagName: "div",
          senderSearchProperties: Array.of({
              altTextUsed: true,
              advertisingTexts: YAHOO_ADVERTISING_LABELS
            })
        };
    }
    // Need the text of a news topic because news items are not selected
    // on the side panels or bottom list.
    return {
        topicSearchFromLast: true,
        topicSearchProperties: Array.of({
            tagName: "a"
          }, {
            advertisingTexts: YAHOO_ADVERTISING_LABELS
          })
      };
  }

  _setArticleCommentDisplay(newsItem, display) {
    if (_isClusterArticle(newsItem)) {
      var articleCommentId =
        newsItem.id.replace(YAHOO_ARTICLE_REGEXP, "$&Id") + "Comments";
      var articleComment = document.getElementById(articleCommentId);
      if (articleComment != null) {
        articleComment.style.display = display;
      }
    }
  }

  showNewsItemElement(newsItem) {
    if (super.showNewsItemElement(newsItem)) {
      this._setArticleCommentDisplay(newsItem, "");
      return true;
    }
    return false;
  }

  hideNewsItemElement(newsItem) {
    if (super.hideNewsItemElement(newsItem)) {
      this._setArticleCommentDisplay(newsItem, "none");
      return true;
    }
    return false;
  }

  getObservedNewsItemElements(addedNode) {
    if (addedNode.tagName == "DIV") {
      if (! addedNode.id.startsWith("caas-art")) { // No article
        var newsParent = addedNode;
        if (! addedNode.classList.contains(YAHOO_CAAS_SIDEKICK)) {
          var addedList = addedNode.querySelector("ul");
          if (addedList == null
            || ! addedList.classList.contains(YAHOO_SIMPLE_LIST)) {
            return EMPTY_NEWS_ELEMENTS;
          }
          newsParent = addedList;
        }
        return Array.from(newsParent.querySelectorAll("li"));
      }
      var newsItems = new Array();
      var articleElement = addedNode.parentNode;
      var articleId = articleElement.id;
      if (articleId != "mainArticle") {
        // Add the element's ID to the array if not an opened article.
        this.articleIds.push(articleId);
        newsItems.push(articleElement);
      }
      var caasList = articleElement.querySelector("." + YAHOO_CAAS_LIST);
      if (caasList != null) {
        for (const newsItem of caasList.querySelectorAll("li")) {
          newsItems.push(newsItem);
        }
      }
      return newsItems;
    }
    return EMPTY_NEWS_ELEMENTS
  }

  isObservedNewsItemsCleared(removedNodes) {
    for (const removedNode of removedNodes) {
      if (removedNode.id == "homepage-viewer") {
        // Clears the array of article IDs if the specified node contains its.
        this.articleIds = new Array();
        return true;
      }
    }
    return false;
  }
}

// Returns true if the specified element of a news parent or item is contained
// in a stream.

function _isStreamContained(newsElement) {
  var parentNode = newsElement.parentNode;
  do {
    if (parentNode.classList.contains(YAHOO_STREAM)) {
      return true;
    }
    parentNode = parentNode.parentNode;
  } while (parentNode != null && parentNode.classList != undefined);
  return false;
}

// Returns true if the specified news item has the provider logo.

function _hasProviderLogo(newsItem) {
  return ! newsItem.classList.contains("list-item-lite")
    && ! newsItem.classList.contains("simple-list-item-v2");
}

/*
 * The simple list of news topics on Yahoo!, titled as "TRENDING", "POPULAR",
 * and "Recomended Stories" displayed in the side or bottom of articles, and
 * the list of panels like Yahoo! Life categories.
 */
class YahooSimpleList extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectorsForAll: "." + YAHOO_SIMPLE_LIST
          }),
        observedItemProperties: ONESELF_QUERY_PROPERTIES
      });
  }

  keepNewsParentDisplaying(newsParent) {
    return _isStreamContained(newsParent);
  }

  isNewsItemSelected(newsItem) {
    return _isStreamContained(newsItem);
  }

  getNewsTopicProperties(newsItem) {
    if (! _hasProviderLogo(newsItem)) {
      return Array.of({
          selectors: "h4"
        });
    }
    return undefined;
  }

  getNewsSenderProperties(newsItem) {
    if (_hasProviderLogo(newsItem)) {
      return Array.of({
          selectors: ".provider-logo"
        });
    }
    return undefined;
  }

  getNewsItemTextProperty(newsItem) {
    if (_hasProviderLogo(newsItem)) {
      return {
          senderSearchFirst: true,
          topicFollowing: true,
          topicFollowingTagName: "div",
          senderSearchProperties: Array.of({
              altTextUsed: true
            })
        };
    }
    return ITEM_FIRST_TEXT_PROPERTY;
  }

  getObservedNodes(newsParent) {
    if (_isStreamContained(newsParent)) {
      var nextElementSibling = newsParent.nextElementSibling;
      if (nextElementSibling == null
        || ! nextElementSibling.classList.contains(YAHOO_SIMPLE_LIST)) {
        // Observe the last of simple lists on the bottom of a news page.
        return Array.of(newsParent);
      }
    }
    return EMPTY_NEWS_ELEMENTS;
  }
}

const YAHOO_NEWS_HOST_SERVER = getYahooString("NewsHostServer");
const YAHOO_FINANCE_HOST_SERVER = getYahooString("FinanceHostServer");
const YAHOO_MONEY_HOST_SERVER = getYahooString("MoneyHostServer");
const YAHOO_SPORTS_HOST_SERVER = getYahooString("SportsHostServer");

/*
 * The navigation of news topics displayed in the header on Yahoo!.
 */
class YahooNavigation extends NewsDesign {
  constructor(parentId) {
    super({
        parentProperties:  Array.of({
            selectors: "#" + parentId
          }),
        topicProperties: ONESELF_QUERY_PROPERTIES
      });
  }

  getNewsItemElements(newsParent) {
    var newsItems = Array.from(newsParent.querySelectorAll("li"));
    if (newsItems.length > 0) {
      if (newsParent.id != YAHOO_NAVIGAGION) {
        // Remove the element of the current site or page from news items.
        newsItems.shift();
      }
      for (let i = newsItems.length - 1; i >= 0; i--) {
        var topicElement = newsItems[i].querySelector("a");
        if (topicElement != null) {
          var topicUrlParser = new Site.OpenedUrlParser(topicElement.href);
          if (! topicUrlParser.parseHostName()
            || (topicUrlParser.hostServer != URL_DEFAULT_HOST_SERVER
              && topicUrlParser.hostServer != YAHOO_NEWS_HOST_SERVER
              && topicUrlParser.hostServer != YAHOO_FINANCE_HOST_SERVER
              && topicUrlParser.hostServer != YAHOO_MONEY_HOST_SERVER
              && topicUrlParser.hostServer != YAHOO_SPORTS_HOST_SERVER)) {
            // Remove the element for no news site from news items.
            newsItems.splice(i, 1);
          }
        } else { // No navigation topic
          newsItems.splice(i, 1);
        }
      }
    }
    return newsItems;
  }
}


// Displays news designs arranged by a selector which selects and excludes news
// topics or senders, waiting regular expressions from the background script.

{
  const SITE_NAMES = splitYahooString("SiteNames");
  const SITE_CATEGORIES = splitYahooString("SiteCategories");
  const SITE_CATEGORY_TOPICS = splitYahooString("SiteCategoryTopics");

  const ENTERTAINMENT_PATH = getYahooString("EntertainmentPath");
  const LIFE_PATH = getYahooString("LifePath");

  var newsTitle = Site.NAME;
  var newsOpenedUrlParser = new Site.OpenedUrlParser(document.URL);
  var newsSiteHomeOpened =
    newsOpenedUrlParser.parseHostName()
    && newsOpenedUrlParser.parseDirectory();
  var newsSiteCategory = "";

  if (newsOpenedUrlParser.matchHtmlDocument() != null) { // Articles
    Site.addNewsDesigns(new YahooSimpleList());
  } else {
    if (newsSiteHomeOpened
      || newsOpenedUrlParser.hostServer != URL_DEFAULT_HOST_SERVER
      || ! newsOpenedUrlParser.parse(LIFE_PATH)) {
      Site.addNewsDesigns(
        new YahooTopPanels(),
        new YahooStream("YDC-Stream"),
        new NewsDesign({
            parentProperties: Array.of({
                selectorsForAll: ".vp-playlist-strip"
              }),
            topicProperties: Array.of({
                selectors: ".vp-pl-title"
              })
          }),
        // Article pane added when its link is clicked
        new YahooContentViewer(),
        // The list of panels like Yahoo! Life categories
        new YahooSimpleList());
      if (newsOpenedUrlParser.hostServer != URL_DEFAULT_HOST_SERVER
        || ! newsOpenedUrlParser.parse(ENTERTAINMENT_PATH)) {
        switch(newsOpenedUrlParser.hostServer) {
        case YAHOO_NEWS_HOST_SERVER: // Yahoo! News
          Site.addNewsDesigns(
            new YahooNavigation(YAHOO_NAVIGAGION),
            new NewsDesign({
                parentProperties: Array.of({
                    selectors: ".news-tabs-RR"
                  }),
                itemProperties: ONESELF_QUERY_PROPERTIES,
                topicProperties: ONESELF_QUERY_PROPERTIES
              }));
          newsSiteCategory = "News";
          break;
        case YAHOO_FINANCE_HOST_SERVER: // Yahoo! Finance
          Site.addNewsDesigns(
            new YahooNavigation(YAHOO_NAVIGAGION),
            new YahooNavigation("YDC-SecondaryNav"),
            new YahooArticleClusters(),
            new YahooStream("slingstoneStream-0-Stream"),
            new YahooStream("Fin-Stream"),
            new YahooStream("Col1-1-Stream"),
            new YahooStream("Col1-2-Stream"),
            new NewsDesign({
                parentProperties: Array.of({
                    selectors: "#Col2-2-Stream",
                  }),
                topicProperties: ONESELF_QUERY_PROPERTIES,
                itemTextProperty: {
                    topicSearchFirst: true,
                    senderFollowing: true,
                    senderFollowingTagName: "h3",
                    senderSearchProperties: Array.of({
                        advertisingTexts: YAHOO_ADVERTISING_LABELS
                      })
                  }
              }));
          newsSiteCategory = "Finance";
          break;
        case YAHOO_MONEY_HOST_SERVER: // Yahoo! Money
          Site.addNewsDesigns(
            new YahooNavigation(YAHOO_NAVIGAGION),
            new YahooStream("homeStream-0-Stream"));
          newsSiteCategory = "Money";
          break;
        case YAHOO_SPORTS_HOST_SERVER: // Yahoo! Sports
          Site.addNewsDesigns(
            new YahooNavigation(YAHOO_NAVIGAGION),
            new YahooNavigation("YDC-SecondaryNav"),
            new YahooArticleClusters(),
            new YahooStream("Col1-3-SportsStream"),
            new NewsDesign({
                parentProperties: Array.of({
                    selectors: ".photo-galleries",
                  }),
                itemProperties: Array.of({
                    selectorsForAll: "a",
                  }),
                topicProperties: ONESELF_QUERY_PROPERTIES
              }),
            new YahooStream("Col1-1-SportsStream"),
            new YahooStream("Col1-2-SportsStream"));
          newsSiteCategory = "Sports";
          break;
        default: // Yahoo!
          Site.addNewsDesigns(
            new YahooNavigation("ybar-navigation"),
            new YahooStream(),
            new NewsDesign({
              parentProperties: Array.of({
                  selectors: ".trending-list",
                }),
              topicProperties: ONESELF_QUERY_PROPERTIES,
              itemTextProperty: {
                  topicSearchProperties: Array.of({
                      skippedTextRegexp: NEWS_RANKING_NUMBER_REGEXP
                    })
                }
            }),
            new NewsDesign({
                parentProperties: Array.of({
                    selectors: "#Col2-1-Channels",
                  }),
                itemProperties: ONESELF_QUERY_PROPERTIES,
                senderProperies: ONESELF_QUERY_PROPERTIES,
                itemTextProperty: {
                    senderSearchFirst: true,
                    senderSearchFromLast: true,
                    topicFollowing: true
                  }
              }));
          if (newsOpenedUrlParser.parse(
            getYahooString("FinanceAuthorPath"))) {
            newsSiteCategory = "Finance";
          }
          break;
        }
      } else { // Yahoo! Entertainment
        Site.addNewsDesign(new YahooNavigation(YAHOO_NAVIGAGION));
        newsSiteHomeOpened = newsOpenedUrlParser.parseDirectory();
        newsSiteCategory = "Entertainment";
      }
    } else { // Yahoo! Life
      Site.addNewsDesigns(
        new YahooNavigation("ybar-navigation"),
        // Article pane added when its link is clicked
        new YahooContentViewer());
      if (newsOpenedUrlParser.parseDirectory()) {
        Site.addNewsDesign(new YahooLifePanels());
        newsSiteHomeOpened = true;
      } else {
        Site.addNewsDesign(new YahooSimpleList());
      }
      newsSiteCategory = "Life";
    }
    newsOpenedUrlParser.parseAll();
  }

  SITE_CATEGORY_TOPICS.forEach((categoryTopics, index) => {
      if (newsSiteCategory == SITE_CATEGORIES[index]) {
        newsTitle = SITE_NAMES[index];
        Site.addNewsTopicWords(categoryTopics.split(" "));
      }
    });

  if (! newsSiteHomeOpened) {
    newsTitle += Site.NAME_CONCATENATION;
    // Adds the part of a page title to the name of a home or category home.
    var titleText = document.querySelector("title").textContent.trim();
    var titleMatch = titleText.match(getYahooRegExp("TitleSuffix"));
    if (titleMatch != null) { // Before " - Yahoo", " | Yahoo", or " for Yahoo"
      newsTitle += titleText.substring(0, titleMatch.index);
    } else {
      titleMatch = titleText.match(getYahooRegExp("TitlePrefix"));
      if (titleMatch != null) { // After "Yahoo - " or  "Yahoo XXX - "
        newsTitle += titleText.substring(titleMatch[0].length);
      } else { // Whole text
        newsTitle += titleText;
      }
    }
  }

  Site.displayNewsDesigns(newsTitle, newsOpenedUrlParser.toString());
}
