/*
 *  Display news topics arranged on the site of Impress Watch.
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
     * Returns the string localized for the specified ID on Impress Watch.
     */
    function getImpressWatchString(id) {
      return getLocalizedString("ImpressWatch" + id);
    }

    /*
     * Returns the array of strings separated by commas after localizing for
     * the specified ID on Impress Watch.
     */
    function splitImpressWatchString(id) {
      return splitLocalizedString("ImpressWatch" + id);
    }

    /*
     * Returns RegExp object created after localizing for the specified ID
     * suffixed with "RegularExpression" on Impress Watch.
     */
    function getImpressWatchRegExp(id) {
      return getLocalizedRegExp("ImpressWatch" + id);
    }

    const TOPIC_ITEM = "item";
    const TOPIC_TITLE = "title";
    const TOPIC_PROPERTIES = Array.of({ selectors: "." + TOPIC_TITLE });

    const ADVERTISING = "ad";
    const NATIVE_TIE_UP = "native-tie-up";

    /*
     * Panels of the top news on Impress Watch.
     */
    class ImpressWatchTopNewsPanels extends Design.NewsDesign {
      constructor(className) {
        super({
            parentProperties: Array.of({
                selectors: "." + className
              }),
            itemSelected: false,
            itemLayoutUnchanged: true,
            topicProperties: TOPIC_PROPERTIES
          });
      }
    }

    function _removeBreadcrumbItems(newsItems) {
      for (let i = newsItems.length - 1; i >= 0; i--) {
        var newsParentClassList = newsItems[i].parentNode.classList;
        if (newsParentClassList.contains("breadcrumb")
          || newsParentClassList.contains("list-label")) {
          newsItems.splice(i, 1);
        }
      }
      return newsItems;
    }

    /*
     * News topics displayed in the main area on Impress Watch.
     */
    class ImpressWatchMainTopics extends Design.NewsDesign {
      constructor(parentSelectors, setNewsParent, itemSelected = false) {
        super({
            parentProperties: Array.of({
                selectorsForAll: "#main " + parentSelectors,
                setNewsElement: setNewsParent
              }),
            keepDisplaying: false,
            itemSelected: itemSelected
          });
      }

      getNewsItemElements(newsParent) {
        return _removeBreadcrumbItems(
          Array.from(newsParent.querySelectorAll("." + TOPIC_ITEM)));
      }

      getNewsTopicElement(newsItem) {
        if (! newsItem.classList.contains(ADVERTISING)
          && ! newsItem.classList.contains(NATIVE_TIE_UP)) {
          return newsItem.querySelector("." + TOPIC_TITLE);
        }
        return null;
      }
    }

    /*
     * Lists of news topics displayed in the main area on Impress Watch.
     */
    class ImpressWatchMainLists extends ImpressWatchMainTopics {
      constructor(parentSelectors, setNewsParent) {
        super(parentSelectors, setNewsParent, true);
      }
    }

    /*
     * Lists of news topics on Impress Watch top and category on Impress sites.
     */
    class ImpressWatchNewsLists extends ImpressWatchMainLists {
      constructor() {
        super("div.list", (element, newsParents) => {
            if (element.parentNode.tagName != "ASIDE") {
              newsParents.push(element);
            }
          });
      }
    }

    const BLOCK_ITEM_GROUP = "group";

    /*
     * Blocks of news topics displayed in the main area on Impress Watch.
     */
    class ImpressWatchMainBlocks extends ImpressWatchMainLists {
      constructor(parentSelectors, setNewsParent) {
        super(parentSelectors, setNewsParent);
      }

      _setNewsBlockDateDisplay(newsBlock, display) {
        var newsBlockPreviousElement = newsBlock.previousElementSibling;
        if (newsBlockPreviousElement != undefined
          && newsBlockPreviousElement.tagName == "P") {
          newsBlockPreviousElement.style.display = display;
        }
      }

      showNewsParentElement(newsParent) {
        if (super.showNewsParentElement(newsParent)) {
          this._setNewsBlockDateDisplay(newsParent, "");
          return true;
        }
        return false;
      }

      hideNewsParentElement(newsParent) {
        if (super.hideNewsParentElement(newsParent)) {
          this._setNewsBlockDateDisplay(newsParent, "none");
          return true;
        }
        return false;
      }

      _setGroupDisplay(newsItem, display) {
          var newsParent = newsItem.parentNode;
          if (newsParent.classList.contains(BLOCK_ITEM_GROUP)) {
            for (let i = 0; i < newsParent.children.length; i++) {
              if (newsParent.children[i].style.display != display) {
                return;
              }
            }
            var newsGroup = newsParent.parentNode;
            do {
              if (newsGroup.classList.contains(BLOCK_ITEM_GROUP)) {
                newsGroup.style.display = display;
                return;
              }
              newsGroup = newsGroup.parentNode;
            } while (newsGroup != null);
          }
        }

      showNewsItemElement(newsItem) {
        if (super.showNewsItemElement(newsItem)) {
          this._setGroupDisplay(newsItem, "");
          return true;
        }
        return false;
      }

      hideNewsItemElement(newsItem) {
        if (super.hideNewsItemElement(newsItem)) {
          this._setGroupDisplay(newsItem, "none");
          return true;
        }
        return false;
      }
    }
    /*
     * Blocks of daily news topics on Impress sites except for Impress Watch.
     */
    class ImpressWatchDailyBlocks extends ImpressWatchMainBlocks {
      constructor() {
        super(".daily-block", (element, newsParents) => {
            if (element.id == "summary-block") {
              element = element.querySelector("." + BLOCK_ITEM_GROUP);
            }
            newsParents.push(element);
          });
      }

      getObservedNodes(newsParent) {
        var newsObservedNodes = new Array();
        if (newsParent.classList.contains(BLOCK_ITEM_GROUP)) {
          newsObservedNodes.push(newsParent.querySelector("ul"));
        }
        return newsObservedNodes;
      }

      isObserverNodesAddedAtOnce(observedNode) {
        return true;
      }

      getObservedNewsItemElements(addedNode) {
        return Array.of(addedNode);
      }
    }

    /*
     * Blocks of news topics categorized on Impress sites.
     */
    class ImpressWatchNewsBlocks extends ImpressWatchMainBlocks {
      constructor() {
        super(".block", (element, newsParents) => {
            newsParents.push(element.nextElementSibling);
          });
      }
    }

    /*
     * The list of news topics on Kodomo IT of Impress Watch.
     */
    class ImpressWatchKodomoItLists extends ImpressWatchMainLists {
      constructor() {
        super("section", (element, newsParents) => {
            if (newsParents.length < 1) {
              newsParents.push(element);
            }
          });
      }

      keepNewsParentDisplaying(newsParent) {
        return true;
      }

      getObserverOptions(newsParent) {
        return Design.SUBTREE_OBSERVER_OPTIONS;
      }

      getObservedNodes(newsParent) {
        return Array.of(newsParent);
      }

      getObservedNewsItemElements(addedNode) {
        var newsItems = new Array();
        if (addedNode.tagName == "LI") {
          newsItems.push(addedNode);
        }
        return newsItems;
      }
    }

    /*
     * Links of topics by which the news list is categorized on Impress sites.
     */
    class ImpressWatchCategoryLinks extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectors: "#main article"
              }, {
                selectorsForAll: "#main dd",
                setNewsElement: (element, newsParents) => {
                    var subcategoryLinks = element.querySelector("ul");
                    if (subcategoryLinks != null) {
                      newsParents.push(subcategoryLinks);
                    }
                  }
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
          });
      }

      getNewsItemElements(newsParent) {
        var newsItemTagName = "li";
        if (newsParent.tagName == "ARTICLE") {
          newsItemTagName = "dt"
        }
        return Array.from(newsParent.querySelectorAll(newsItemTagName));
      }

      showNewsParentElement(newsParent) {
        if (newsParent.tagName == "UL"
          && ! this.isNewsItemDisplaying(
            newsParent.parentNode.previousElementSibling)) { // Hidden Category
          return false;
        }
        return super.showNewsParentElement(newsParent);
      }

      isNewsItemDisplaying(newsItem) {
        if (newsItem.tagName == "DT") {
          newsItem = newsItem.firstElementChild;
        }
        return super.isNewsItemDisplaying(newsItem);
      }

      _setSubcategoryLinksDisplay(newsItem, display) {
        var subcategoryLinks = newsItem.nextElementSibling.querySelector("ul");
        if (subcategoryLinks != null) {
          subcategoryLinks.style.display = display;
        }
      }

      showNewsItemElement(newsItem) {
        if (newsItem.tagName == "DT") {
          this._setSubcategoryLinksDisplay(newsItem, "");
          newsItem = newsItem.firstElementChild;
        }
        newsItem.style.display = "";
        return true;
      }

      hideNewsItemElement(newsItem) {
        if (newsItem.tagName == "DT") {
          this._setSubcategoryLinksDisplay(newsItem, "none");
          newsItem = newsItem.firstElementChild;
        }
        newsItem.style.display = "none";
        return true;
      }
    }

    /*
     * The list of recommended news topics on Impress sites.
     */
    class ImpressWatchRecommendedList extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectorsForAll: "aside #recommend-1",
                setNewsElement: (element, newsParents) => {
                    newsParents.push(element.parentNode);
                  }
              }),
            itemProperties: Array.of({
                selectorsForAll: "." + TOPIC_ITEM
              }),
            topicProperties: TOPIC_PROPERTIES
          });
      }
    }

    /*
     * The ranking of news topics on Impress Watch.
     */
    class ImpressWatchRanking extends Design.NewsDesign {
      constructor(name) {
        super({
            parentProperties: Array.of({
                selectors: "#" + name + "-1-list"
              }, {
                selectors: "#" + name + "-24-list"
              }, {
                selectors: "#" + name + "-168-list"
              }, {
                selectors: "#" + name + "-720-list"
              }),
            keepDisplaying: true,
            topicProperties: Design.ONESELF_QUERY_PROPERTIES,
            itemTextProperty: {
                topicSearchProperties: Array.of({
                    skippedTextRegExp: Design.NEWS_RANKING_NUMBER_REGEXP
                  })
              },
            observedProperties: Array.of({
                selectors: "ul"
              }),
            observedItemProperties: Design.ONESELF_QUERY_PROPERTIES,
            observedItemAddedAtOnce: true
          });
      }
    }

    /*
     * News topics displayed later in the main area on Impress Watch.
     */
    class ImpressWatchLateMainTopics extends Design.NewsDesign {
      constructor(parentSelectors, itemMaxCount, keepDisplaying = true) {
        super({
            parentProperties: Array.of({
                selectors: "#main " + parentSelectors
              }),
            keepDisplaying: keepDisplaying,
            itemUnfixed: ! Number.isInteger(itemMaxCount),
            itemProperties: Array.of({
                selectorsForAll: "." + TOPIC_ITEM
              }),
            observerOptions: Design.SUBTREE_OBSERVER_OPTIONS,
            observedProperties: Design.ONESELF_QUERY_PROPERTIES,
            observedItemMaxCount: itemMaxCount
          });
      }

      getNewsTopicElement(newsItem) {
        if (! newsItem.classList.contains(NATIVE_TIE_UP)) {
          return newsItem.querySelector("." + TOPIC_TITLE);
        }
        return null;
      }

      getObservedNewsItemElements(addedNode) {
        if (addedNode.tagName == "LI") {
          return Array.of(addedNode);
        }
        return Array.from(addedNode.querySelectorAll("li.item"));
      }
    }

    const TRENDING_ALL_INITIAL_DISPLAY_COUNT = 10;
    const TRENDING_INITIAL_DISPLAY_COUNT = 3;

    /*
     * The trending of news topics in the main area on Impress Watch.
     */
    class ImpressWatchTrending extends ImpressWatchLateMainTopics {
      constructor() {
        super("section.list");
        this.newsItemInitialDisplaySet = new Set();
      }

      getNewsItemElements(newsParent) {
        var newsItems =
          _removeBreadcrumbItems(super.getNewsItemElements(newsParent));
        newsItems.forEach((newsItem) => {
            if (super.isNewsItemDisplaying(newsItem)) {
              this.newsItemInitialDisplaySet.add(newsItem);
            }
          });
        return newsItems;
      }

      showNewsItemElement(newsItem) {
        var moreButton = newsItem.parentNode.nextElementSibling;
        if (! super.isNewsItemDisplaying(moreButton)
          || this.newsItemInitialDisplaySet.has(newsItem)) {
          return super.showNewsItemElement(newsItem);
        }
        return false;
      }

      getObservedNewsItemElements(addedNode) {
        var newsItems =
          _removeBreadcrumbItems(super.getObservedNewsItemElements(addedNode));
        var newsItemInitialDisplayCount = TRENDING_INITIAL_DISPLAY_COUNT;
        if (addedNode.parentNode.id == "trending_all") {
          newsItemInitialDisplayCount = TRENDING_ALL_INITIAL_DISPLAY_COUNT;
        }
        for (let i = 0; i < newsItemInitialDisplayCount; i++) {
          this.newsItemInitialDisplaySet.add(newsItems[i]);
        }
        return newsItems;
      }

      getRearrangementObservedNode() {
        return super.getNewsParentElements()[0];
      }

      isRearrangedBy(changedNode) {
        if (changedNode.classList.contains("more")) {
          return true;
        }
        return false;
      }
    }

    const ARTICLE_LIST = "article_list";

    /*
     * News topics in the main area on Impress Watch Zaitaku Life Tokushu.
     */
    class ImpressWatchLifeAtHome extends ImpressWatchLateMainTopics {
      constructor() {
        super("#" + ARTICLE_LIST);
      }

      getObservedNewsItemElements(addedNode) {
        if (addedNode.parentNode.id == ARTICLE_LIST) {
          return super.getObservedNewsItemElements(addedNode);
        }
        return new Array();
      }
    }

    // Display news designs arranged by a selector which selects and excludes
    // topics or senders, waiting the settings from the background script.

    var urlData = getUrlData(urlSite.data, document.URL);
    var siteIndex =
      splitImpressWatchString("SiteHostServers").indexOf(urlData.hostServer);

    if (siteIndex >= 0) { // INTERNET Watch, PC Watch, ..., and Watch Video
      Site.addNewsTopicWords(
        splitImpressWatchString("SiteTopicWords")[siteIndex].split(" "));
    } else { // Impress Watch
      Site.addNewsTopicWords(splitImpressWatchString("TopicWords"));
    }

    class ImpressWatchUrlParser extends UrlParser {
      constructor() {
        super(urlData);
      }
      getPathString(pathId) {
        return getImpressWatchString(pathId);
      }
      getPathRegExp(pathId) {
        return getImpressWatchRegExp(pathId);
      }
    }

    var urlParser = new ImpressWatchUrlParser();

    if (urlParser.parseByRegExp("Article")) { // An article
      Site.setNewsDesign(
        // Links to the previous or next article
        new Design.NewsDesign({
            parentProperties: Array.of({
                selectors: ".corner",
              }),
            keepDisplaying: true,
            topicProperties: TOPIC_PROPERTIES
          }),
        // Links to outer articles
        new Design.NewsDesign({
            parentProperties: Array.of({
                selectorsForAll: ".outer"
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
          }),
        // Links to related articles
        new Design.NewsDesign({
            parentProperties: Array.of({
                selectorsForAll: ".related"
              }),
            topicProperties: TOPIC_PROPERTIES
          }),
        // TRENDING
        new ImpressWatchLateMainTopics("#chartbeat_recommend", 3, false));
    } else { // News topics listed in the main pane
      if (urlParser.parseDirectory()) { // Impress site's top
        if (siteIndex >= 0) {
          Site.setNewsDesign(
            new ImpressWatchTopNewsPanels("top-news"),
            new ImpressWatchDailyBlocks(),
            // HOT TOPICS, Rensai, and Market Johou
            new ImpressWatchMainTopics("li.type-1"));
        } else {
          Site.setNewsDesign(
            new ImpressWatchTopNewsPanels("top-news2"),
            new ImpressWatchNewsLists());
        }
      } else if (urlParser.parse("KodomoItPath")) { // Kodomo IT
        Site.setNewsDesign(new ImpressWatchKodomoItLists());
        Site.addNewsTopicWords(splitImpressWatchString("KodomoItTopicWords"));
      } else if (urlParser.parse("BackNumberPath")) { // Back numbers
        if (urlParser.parse("BackNumberTopPath")) {
          if (siteIndex >= 0) {
            Site.setNewsDesign(new ImpressWatchNewsBlocks());
          } else { // "Kongetsu No Kiji" linked from Impress Watch top
            Site.setNewsDesign(new ImpressWatchNewsLists());
          }
        } else { // Chuko PC Hotline!
          Site.setNewsDesign(new ImpressWatchNewsLists());
          urlParser.parseDirectoryHierarchy();
        }
      } else if (urlParser.parse("AccessRankingPath")) { // Ranking
        urlParser.parseDirectory();
        Site.setNewsDesign(new ImpressWatchRanking("ranking-list"));
      } else if (urlParser.parse("HeadlinePath")) { // News Headline
        Site.setNewsDesign(
          new ImpressWatchLateMainTopics("article", 80),
          // TRENDING
          new ImpressWatchLateMainTopics("#chartbeat_recommend", 3, false));
      } else if (urlParser.parse("TrendingPath")) { // Trending
        Site.setNewsDesign(new ImpressWatchTrending());
      } else if (urlParser.parse("LifeAtHomePath")) { // Zaitaku Work
        Site.setNewsDesign(new ImpressWatchLifeAtHome());
      } else if (urlParser.parse("CategoryPath")) {
        if (urlParser.parse("CategoryListHtml")) { // Category links
          Site.setNewsDesign(new ImpressWatchCategoryLinks());
        } else { // Impress site's news lists categorized by a topic
          if (siteIndex >= 0) {
            Site.setNewsDesign(
              // Shiborikomu displayed in the list header
              new Design.NewsDesign({
                  parentProperties: Array.of({
                      selectors: ".category-selector"
                    }),
                  topicProperties: Design.ONESELF_QUERY_PROPERTIES
                }));
          }
          Site.setNewsDesign(new ImpressWatchNewsLists());
          urlParser.parseDirectoryHierarchy();
        }
      } else { // Impress site's news lists which is not categorized by a topic
        Site.setNewsDesign(new ImpressWatchNewsBlocks());
        urlParser.parseAll();
      }
      Site.setNewsOpenedUrl(urlParser.toString());
    }
    Site.setNewsDesign(
      // Osusume Kiji
      new ImpressWatchRecommendedList(),
      // Saishin Kiji
      new Design.NewsDesign({
          parentProperties: Array.of({
              selectors: ".latest"
            }),
          topicProperties: TOPIC_PROPERTIES
        }),
      new ImpressWatchRanking("ranking"),
      new ImpressWatchRanking("all-ranking"));

    Site.setNewsSelector(new Selector(urlSite.language));
    Site.displayNewsDesigns();
  }).catch((error) => {
    Debug.printStackTrace(error);
  });
