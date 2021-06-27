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

ExtractNews.readUrlSite(document.URL).then((urlSite) => {
    if (urlSite == undefined || ! urlSite.isEnabled()) {
      Site.displayNewsDesigns();
      return;
    }

    /*
     * Returns the string localized for the specified ID on Yahoo!.
     */
    function getYahooString(id) {
      return getLocalizedString("Yahoo" + id);
    }

    /*
     * Returns the array of strings separated by commas after localizing for
     * the specified ID on Yahoo!.
     */
    function splitYahooString(id) {
      return splitLocalizedString("Yahoo" + id);
    }

    /*
     * Returns RegExp object created after localizing for the specified ID
     * suffixed with "RegularExpression" on Yahoo!.
     */
    function getYahooRegExp(id) {
      return getLocalizedRegExp("Yahoo" + id);
    }

    const CATEGORY_LABELS = new Set(splitYahooString("CategoryLabels"));
    const ADVERTISING_LABEL_SET =
      new Set(splitYahooString("AdvertisingLabels"));

    const TOP_PANELS_ITEM_0 = "item-0";

    const ARTICLE_CLUSTER_BOUNDARY = "article-cluster-boundary";

    const STREAM = "stream";
    const STREAM_ITEMS = "stream-items";
    const STREAM_RELATED_ITEM = "stream-related-item";

    const JS_STREAM_CONTENT = "js-stream-content";

    const SIMPLE_LIST = "simple-list";

    /*
     * A big panel and filmstrip displayed in the top on Yahoo!.
     */
    class YahooTopPanels extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectors: "#" + TOP_PANELS_ITEM_0 + ", .ntk-lead",
                setNewsElement: (element, newsParents) => {
                    newsParents.push(element.parentNode);
                  }
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
          });
      }

      getNewsItemElements(newsParent) {
        var newsItems = new Array();
        var newsFirstItem = newsParent.firstElementChild;
        if (newsFirstItem.id == TOP_PANELS_ITEM_0) {
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
    class YahooLifePanels extends Design.NewsDesign {
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
            senderProperties: Design.ONESELF_QUERY_PROPERTIES,
            itemTextProperty: {
                senderSearchFirst: true,
                topicFollowing: true,
                topicFollowingTagName: "div"
              },
            observedProperties: Design.ONESELF_QUERY_PROPERTIES,
            observedItemProperties: Array.of({
                setNewsElement: (element, newsItems) => {
                    element.querySelectorAll("li").forEach((newsItem) => {
                        newsItems.push(newsItem);
                      });
                  }
              }),
            observedItemAddedAtOnce: true
          });
      }

      getObservedNodes(newsParent) {
        var newsObservedNodes = new Array();
        if (newsParent.tagName == "SECTION") {
          newsObservedNodes.push(newsParent);
        }
        return newsObservedNodes;
      }
    }

    /*
     * Articles defined by the class name "article-cluster-boundary" on Yahoo!.
     */
    class YahooArticleClusters extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectorsForAll: "." + ARTICLE_CLUSTER_BOUNDARY,
                setNewsElement: (element, newsParents) => {
                    if (element.tagName == "UL") { // 2nd and 5th element
                      newsParents.push(element.parentNode);
                    } else if (element.firstElementChild.tagName == "A") {
                      // 1st element
                      newsParents.push(element);
                    } else { // 3rd element
                      var classList = element.firstElementChild.classList;
                      if (! classList.contains(ARTICLE_CLUSTER_BOUNDARY)) {
                        for (const newsParent of element.children) {
                          newsParents.push(newsParent);
                        }
                      //} else { // 4th element
                      // The child has the class "article-cluster-boundary".
                      }
                    }
                  }
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES,
            itemTextProperty: {
                topicSearchProperties: Array.of({
                    skippedTextRegExp: Design.NEWS_VIDEO_TIME_REGEXP
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
    class YahooStream extends Design.NewsDesign {
      constructor(id) {
        super({
            parentProperties: Array.of({
                selectors: id != undefined ? "#" + id : "." + STREAM_ITEMS,
                setNewsElement: (element, newsParents) => {
                    if (! element.classList.contains(STREAM_ITEMS)) {
                      element = element.firstElementChild;
                    }
                    newsParents.push(element);
                  }
              }),
            keepDisplaying: true,
            itemSelected: true,
            itemUnfixed: true,
            itemProperties: Array.of({
                selectorsForAll: "." + JS_STREAM_CONTENT,
                setNewsElement: (element, newsItems) => {
                    var firstNewsItem = element.firstElementChild;
                    if (firstNewsItem.id != TOP_PANELS_ITEM_0
                      && ! firstNewsItem.classList.contains("author-bio")) {
                      newsItems.push(element);
                      element.querySelectorAll("li").forEach((newsItem) => {
                          newsItems.push(newsItem);
                        });
                    }
                  }
              }),
            senderProperties: Design.ONESELF_QUERY_PROPERTIES,
            observerOptions: Design.SUBTREE_OBSERVER_OPTIONS,
            observedProperties: Design.ONESELF_QUERY_PROPERTIES,
            observedItemProperties: Array.of({
                setNewsElement: (element, newsItems) => {
                    if (element.classList.contains(JS_STREAM_CONTENT)) {
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
                        element.querySelectorAll("." + STREAM_RELATED_ITEM);
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
        if (newsItem.classList.contains(JS_STREAM_CONTENT)) {
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
        if (newsItem.classList.contains(JS_STREAM_CONTENT)) {
          // Start searching from the h3 element of a news topic upward.
          return {
              topicSearchFirst: true,
              topicSearchFromLast: true,
              senderFollowing: true,
              senderFollowingTagName: "h3",
              senderSearchProperties: Array.of({
                  advertisingTextSet: ADVERTISING_LABEL_SET
                })
            };
        } else if (! newsItem.classList.contains(STREAM_RELATED_ITEM)) {
          // Search in order of topic, sender in the specified news item.
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
        // Start searching from the last node of a news sender upward.
        return {
            senderSearchFirst: true,
            senderSearchFromLast: true,
            topicFollowing: true,
            senderSearchProperties: Array.of({
                tagName: "a"
              }, {
                advertisingTextSet: ADVERTISING_LABEL_SET
              })
          };
      }
    }

    // Returns true if the specified item is the element of an article which is
    // appended under the main article for the link clicked on the stream.

    function _isClusterArticle(newsItem) {
      return newsItem.id.startsWith("clusterArticle");
    }

    const ARTICLE_REGEXP = new RegExp("Article");
    const CAAS_SIDEKICK = "caas-sidekick";
    const CAAS_LIST = "caas-list";

    /*
     * The content viewer of some articles with the list of panels displayed in
     * the side or bottom when a news item is clicked on Yahoo!.
     */
    class YahooContentViewer extends Design.NewsDesign {
      constructor() {
        super({
            itemUnfixed: true,
            topicProperties: Design.ONESELF_QUERY_PROPERTIES,
            observerOptions: Design.SUBTREE_OBSERVER_OPTIONS,
            observedProperties: Design.ONESELF_QUERY_PROPERTIES
          });
        this.articleIds = new Array();
      }

      getNewsParentElements() {
        var newsParents = new Array();
        var contentViewer = document.getElementById("content-viewer");
        if (contentViewer != null) {
          newsParents.push(contentViewer);
          this.articleIds.forEach((articleId) => {
              // Add the element of an article if has already been opened yet.
              var articleElement = document.getElementById(articleId);
              newsParents.push(articleElement);
              var caasList = articleElement.querySelector("." + CAAS_LIST);
              if (caasList != null) {
                newsParents.push(caasList);
              }
            });
        }
        return newsParents;
      }

      getNewsItemElements(newsParent) {
        if (_isClusterArticle(newsParent)) {
          return Array.of(newsParent);
        } else if (newsParent.classList.contains(CAAS_LIST)) {
          return newsParent.querySelectorAll("li");
        }
        var newsItems = new Array();
        var newsPanelsLists =
          newsParent.querySelectorAll(
            "." + CAAS_SIDEKICK + ", ." + SIMPLE_LIST);
        for (let i = 0; i < newsPanelsLists.length; i++) {
          for (const newsItem of newsPanelsLists[i].querySelectorAll("li")) {
            newsItems.push(newsItem);
          }
        }
        // No observed node of ".simple-list" arranged by YahooSimpleList.
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
        } else if (newsItem.classList.contains(JS_STREAM_CONTENT)) {
          return Array.of({
              selectors: ".provider-logo"
            });
        }
        return null;
      }

      getNewsItemTextProperty(newsItem) {
        if (_isClusterArticle(newsItem)
          || newsItem.classList.contains(JS_STREAM_CONTENT)) {
          return {
              senderSearchFirst: true,
              topicFollowing: true,
              topicFollowingTagName: "div",
              senderSearchProperties: Array.of({
                  altTextUsed: true,
                  advertisingTextSet: ADVERTISING_LABEL_SET
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
                advertisingTextSet: ADVERTISING_LABEL_SET
              })
          };
      }

      _setArticleCommentDisplay(newsItem, display) {
        if (_isClusterArticle(newsItem)) {
          var articleCommentId =
            newsItem.id.replace(ARTICLE_REGEXP, "$&Id") + "Comments";
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
            if (! addedNode.classList.contains(CAAS_SIDEKICK)) {
              var addedList = addedNode.querySelector("ul");
              if (addedList == null
                || ! addedList.classList.contains(SIMPLE_LIST)) {
                return new Array();
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
          var caasList = articleElement.querySelector("." + CAAS_LIST);
          if (caasList != null) {
            for (const newsItem of caasList.querySelectorAll("li")) {
              newsItems.push(newsItem);
            }
          }
          return newsItems;
        }
        return new Array();
      }

      isObservedNewsItemsCleared(removedNodes) {
        for (const removedNode of removedNodes) {
          if (removedNode.id == "homepage-viewer") {
            // Clears the array of article IDs because the ancestor is removed.
            this.articleIds = new Array();
            return true;
          }
        }
        return false;
      }
    }

    // Returns true if the specified element of a news parent or item is
    // contained in a stream.

    function _isStreamContained(newsElement) {
      var parentNode = newsElement.parentNode;
      do {
        if (parentNode.classList.contains(STREAM)) {
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
     * The simple list of news topics on Yahoo!, titled as "TRENDING",
     * "POPULAR", and "Recomended Stories" displayed in the side or bottom
     * of articles, and the list of panels like Yahoo! Life categories.
     */
    class YahooSimpleList extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectorsForAll: "." + SIMPLE_LIST
              }),
            observedItemProperties: Design.ONESELF_QUERY_PROPERTIES
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
        return undefined;
      }

      getObservedNodes(newsParent) {
        var newsObservedNodes = new Array();
        if (_isStreamContained(newsParent)) {
          var nextElementSibling = newsParent.nextElementSibling;
          if (nextElementSibling == null
            || ! nextElementSibling.classList.contains(SIMPLE_LIST)) {
            // Observe the last of simple lists on the bottom of a news page.
            newsObservedNodes.push(newsParent);
          }
        }
        return newsObservedNodes;
      }
    }

    const YDC_NAV = "YDC-Nav";

    const NEWS_CATEGORY_SERVER = getYahooString("NewsCategoryServer");
    const FINANCE_CATEGORY_SERVER = getYahooString("FinanceCategoryServer");
    const MONEY_CATEGORY_SERVER = getYahooString("MoneyCategoryServer");
    const SPORTS_CATEGORY_SERVER = getYahooString("SportsCategoryServer");

    /*
     * The navigation of news topics displayed in the header on Yahoo!.
     */
    class YahooNavigation extends Design.NewsDesign {
      constructor(parentId) {
        super({
            parentProperties:  Array.of({
                selectors: "#" + parentId
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
          });
      }

      getNewsItemElements(newsParent) {
        var newsItems = Array.from(newsParent.querySelectorAll("li"));
        if (newsItems.length > 0) {
          if (newsParent.id != YDC_NAV) {
            // Remove the element of the current site or page from news items.
            newsItems.shift();
          }
          for (let i = newsItems.length - 1; i >= 0; i--) {
            var navTopicElement = newsItems[i].querySelector("a");
            if (navTopicElement != null) {
              var navTopicUrlData =
                getUrlData(urlSite.data, navTopicElement.href);
              if (navTopicUrlData == undefined
                || (navTopicUrlData.hostServer != URL_DEFAULT_HOST_SERVER
                  && navTopicUrlData.hostServer != NEWS_CATEGORY_SERVER
                  && navTopicUrlData.hostServer != FINANCE_CATEGORY_SERVER
                  && navTopicUrlData.hostServer != MONEY_CATEGORY_SERVER
                  && navTopicUrlData.hostServer != SPORTS_CATEGORY_SERVER)) {
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

    // Display news designs arranged by a selector which selects and excludes
    // topics or senders, waiting the settings from the background script.

    const SITE_CATEGORIES = splitYahooString("SiteCategories");
    const SITE_CATEGORY_HOME = SITE_CATEGORIES[0];
    const SITE_CATEGORY_TOPIC_WORDS =
      splitYahooString("SiteCategoryTopicWords");

    var urlData = getUrlData(urlSite.data, document.URL);
    var siteCategory = urlData.hostServer;

    class YahooUrlParser extends UrlParser {
      constructor() {
        super(urlData);
      }
      getPathString(pathId) {
        return getYahooString(pathId);
      }
      getPathRegExp(pathId) {
        return getYahooRegExp(pathId);
      }
    }

    var urlParser = new YahooUrlParser();

    if (urlParser.parseByRegExp("Article")) { // Standalone article
      Site.setNewsDesign(new YahooSimpleList());
      siteCategory = SITE_CATEGORY_HOME;
    } else { // Pages opened by the menu list in the top of Yahoo! site
      const LIFE_CATEGORY_PATH = "LifeCategoryPath";
      if (urlParser.parseDirectory()
        || urlData.hostServer != URL_DEFAULT_HOST_SERVER
        || ! urlParser.parse(LIFE_CATEGORY_PATH)) {
        const ENTERTAINMENT_CATEGORY_PATH = "EntertainmentCategoryPath";
        Site.setNewsDesign(
          new YahooTopPanels(),
          new YahooStream("YDC-Stream"),
          new Design.NewsDesign({
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
        if (urlData.hostServer != URL_DEFAULT_HOST_SERVER
          || ! urlParser.parse(ENTERTAINMENT_CATEGORY_PATH)) {
          switch(urlData.hostServer) {
          case NEWS_CATEGORY_SERVER: // Yahoo! News
            Site.setNewsDesign(
              new YahooNavigation(YDC_NAV),
              new Design.NewsDesign({
                  parentProperties: Array.of({
                      selectors: ".news-tabs-RR"
                    }),
                  itemProperties: Design.ONESELF_QUERY_PROPERTIES,
                  topicProperties: Design.ONESELF_QUERY_PROPERTIES
                }));
            break;
          case FINANCE_CATEGORY_SERVER: // Yahoo! Finance
            Site.setNewsDesign(
              new YahooNavigation(YDC_NAV),
              new YahooNavigation("YDC-SecondaryNav"),
              new YahooArticleClusters(),
              new YahooStream("slingstoneStream-0-Stream"),
              new YahooStream("Fin-Stream"),
              new YahooStream("Col1-1-Stream"),
              new YahooStream("Col1-2-Stream"),
              new Design.NewsDesign({
                  parentProperties: Array.of({
                      selectors: "#Col2-2-Stream",
                    }),
                  topicProperties: Design.ONESELF_QUERY_PROPERTIES,
                  itemTextProperty: {
                      topicSearchFirst: true,
                      senderFollowing: true,
                      senderFollowingTagName: "h3",
                      senderSearchProperties: Array.of({
                          advertisingTextSet: ADVERTISING_LABEL_SET
                        })
                    }
                }));
            break;
          case MONEY_CATEGORY_SERVER: // Yahoo! Money
            Site.setNewsDesign(
              new YahooNavigation(YDC_NAV),
              new YahooStream("homeStream-0-Stream"));
            break;
          case SPORTS_CATEGORY_SERVER: // Yahoo! Sports
            Site.setNewsDesign(
              new YahooNavigation(YDC_NAV),
              new YahooNavigation("YDC-SecondaryNav"),
              new YahooArticleClusters(),
              new YahooStream("Col1-3-SportsStream"),
              new Design.NewsDesign({
                  parentProperties: Array.of({
                      selectors: ".photo-galleries",
                    }),
                  itemProperties: Array.of({
                      selectorsForAll: "a",
                    }),
                  topicProperties: Design.ONESELF_QUERY_PROPERTIES
                }),
              new YahooStream("Col1-1-SportsStream"),
              new YahooStream("Col1-2-SportsStream"));
            break;
          default: // Yahoo!
            Site.setNewsDesign(
              new YahooNavigation("ybar-navigation"),
              new YahooStream(),
              new Design.NewsDesign({
                parentProperties: Array.of({
                    selectors: ".trending-list",
                  }),
                topicProperties: Design.ONESELF_QUERY_PROPERTIES,
                itemTextProperty: {
                    topicSearchProperties: Array.of({
                        skippedTextRegExp: Design.NEWS_RANKING_NUMBER_REGEXP
                      })
                  }
              }),
              new Design.NewsDesign({
                  parentProperties: Array.of({
                      selectors: "#Col2-1-Channels",
                    }),
                  itemProperties: Design.ONESELF_QUERY_PROPERTIES,
                  senderProperies: Design.ONESELF_QUERY_PROPERTIES,
                  itemTextProperty: {
                      senderSearchFirst: true,
                      senderSearchFromLast: true,
                      topicFollowing: true
                    }
                }));
            if (urlParser.parse("FinanceAuthorPath")) {
              siteCategory = FINANCE_CATEGORY_SERVER;
            } else {
              siteCategory = SITE_CATEGORY_HOME;
            }
            break;
          }
        } else { // Yahoo! Entertainment
          Site.setNewsDesign(new YahooNavigation(YDC_NAV));
          siteCategory =
            getYahooString(ENTERTAINMENT_CATEGORY_PATH).substring(1);
        }
      } else { // Yahoo! Life
        Site.setNewsDesign(
          new YahooNavigation("ybar-navigation"),
          // Article pane added when its link is clicked
          new YahooContentViewer());
        if (urlParser.parseDirectory()) {
          Site.setNewsDesign(new YahooLifePanels());
        } else {
          Site.setNewsDesign(new YahooSimpleList());
        }
        siteCategory = getYahooString(LIFE_CATEGORY_PATH).substring(1);
      }
      urlParser.parseAll();
      Site.setNewsOpenedUrl(urlParser.toString());
    }

    for (let i = 0; i < SITE_CATEGORY_TOPIC_WORDS.length; i++) {
      if (siteCategory == SITE_CATEGORIES[i]) {
        Site.addNewsTopicWords(SITE_CATEGORY_TOPIC_WORDS[i].split(" "));
        break;
      }
    }

    Site.setNewsSelector(new Selector(urlSite.language));
    Site.displayNewsDesigns(new Set([ "complete" ]));
  }).catch((error) => {
    Debug.printStackTrace(error);
  });
