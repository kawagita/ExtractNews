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

ExtractNews.readEnabledNewsSite(document.URL).then((newsSite) => {
    if (newsSite == undefined) {
      Site.displayNewsDesigns();
      return;
    }

    /*
     * Returns the string localized for the specified ID on Impress Watch.
     */
    function getImpressWatchString(id) {
      return ExtractNews.getLocalizedString("ImpressWatch" + id);
    }

    /*
     * Returns the array of strings separated by commas after localizing for
     * the specified ID on Impress Watch.
     */
    function splitImpressWatchString(id) {
      return ExtractNews.splitLocalizedString("ImpressWatch" + id);
    }

    /*
     * Returns RegExp object created after localizing for the specified ID
     * suffixed with "RegularExpression" on Impress Watch.
     */
    function getImpressWatchRegExp(id) {
      return ExtractNews.getLocalizedRegExp("ImpressWatch" + id);
    }

    const ITEM_GROUP = "group";

    const ITEM_PROPERTIES = Array.of({ selectorsForAll: ".item" });
    const TITLE_PROPERTIES = Array.of({ selectors: ".title" });

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
            topicProperties: TITLE_PROPERTIES
          });
      }
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
            itemSelected: itemSelected,
            itemProperties: ITEM_PROPERTIES,
            topicProperties: TITLE_PROPERTIES
          });
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
          if (newsParent.classList.contains(ITEM_GROUP)) {
            for (let i = 0; i < newsParent.children.length; i++) {
              if (newsParent.children[i].style.display != display) {
                return;
              }
            }
            var newsGroup = newsParent.parentNode;
            do {
              if (newsGroup.classList.contains(ITEM_GROUP)) {
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
              element = element.querySelector("." + ITEM_GROUP);
            }
            newsParents.push(element);
          });
      }

      getObservedNodes(newsParent) {
        if (newsParent.classList.contains(ITEM_GROUP)) {
          return Array.of(newsParent.querySelector("ul"));
        }
        return new Array();
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
    class ImpressWatchKodomoItList extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectors: "#main section"
              }),
            keepDisplaying: true,
            itemSelected: true,
            itemProperties: ITEM_PROPERTIES,
            topicProperties: TITLE_PROPERTIES,
            observerOptions: Design.SUBTREE_OBSERVER_OPTIONS,
            observedProperties: Design.ONESELF_QUERY_PROPERTIES
          });
      }

      getObservedNewsItemElements(addedNode) {
        if (addedNode.tagName == "LI") {
          return Array.of(addedNode);
        }
        return new Array();
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
            itemProperties: ITEM_PROPERTIES,
            topicProperties: TITLE_PROPERTIES
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
                    skippedTextRegexp: Design.NEWS_RANKING_NUMBER_REGEXP
                  })
              },
            observedProperties: Array.of({
                selectors: "ul"
              }),
            observedItemProperties: Design.ONESELF_QUERY_PROPERTIES
          });
      }
    }

    /*
     * News topics observed in the main area on Impress Watch.
     */
    class ImpressWatchMainObservedTopics extends Design.NewsDesign {
      constructor(parentSelectors, keepDisplaying = true) {
        super({
            parentProperties: Array.of({
                selectors: "#main " + parentSelectors
              }),
            keepDisplaying: keepDisplaying,
            itemProperties: ITEM_PROPERTIES,
            topicProperties: TITLE_PROPERTIES,
            observerOptions: Design.SUBTREE_OBSERVER_OPTIONS,
            observedProperties: Design.ONESELF_QUERY_PROPERTIES
          });
      }

      getObservedNewsItemElements(addedNode) {
        if (addedNode.tagName == "LI") {
          return Array.of(addedNode);
        }
        return Array.from(addedNode.querySelectorAll("li"));
      }
    }

    // Display news designs arranged by a selector which selects and excludes
    // topics or senders, waiting the settings from the background script.

    const DOCUMENTS_REGEXP = getImpressWatchRegExp("Documents");
    const KODOMO_IT_PATH = getImpressWatchString("KodomoItPath");
    const BACK_NUMBER_PATH = getImpressWatchString("BackNumberPath");
    const ACCESS_RANKING_PATH = getImpressWatchString("AccessRankingPath");
    const LIFE_AT_HOME_PATH = getImpressWatchString("LifeAtHomePath");
    const HEADLINE_PATH = getImpressWatchString("HeadlinePath");
    const TRENDING_PATH = getImpressWatchString("TrendingPath");
    const CATEGORY_PATH = getImpressWatchString("CategoryPath");

    var newsSiteUrlParser = new NewsSiteUrlParser(newsSite, document.URL);
    newsSiteUrlParser.parseHostName();

    const SITE_HOST_SERVERS = splitImpressWatchString("SiteHostServers");

    var siteIndex = SITE_HOST_SERVERS.indexOf(newsSiteUrlParser.hostServer);
    if (siteIndex >= 0) { // INTERNET Watch, PC Watch, ..., and Watch Video
      Site.addNewsTopicWords(
        splitImpressWatchString("SiteTopicWords")[siteIndex].split(" "));
    } else { // Impress Watch
      Site.addNewsTopicWords(splitImpressWatchString("TopicWords"));
    }

    if (newsSiteUrlParser.match(DOCUMENTS_REGEXP) != null) { // Articles
      Site.setNewsDesigns(
        // Links to the previous or next article
        new Design.NewsDesign({
            parentProperties: Array.of({
                selectors: ".corner",
              }),
            keepDisplaying: true,
            topicProperties: TITLE_PROPERTIES
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
            topicProperties: TITLE_PROPERTIES
          }),
        // TRENDING
        new ImpressWatchMainObservedTopics("#chartbeat_recommend", false));
    } else if (newsSiteUrlParser.parseDirectory()) { // Impress site's top
      if (siteIndex >= 0) { // INTERNET Watch, PC Watch, ..., and Watch Video
        Site.setNewsDesigns(
          new ImpressWatchTopNewsPanels("top-news"),
          new ImpressWatchDailyBlocks(),
          // HOT TOPICS, Rensai, and Market Johou
          new ImpressWatchMainTopics("li.type-1"));
      } else { // Impress Watch
        Site.setNewsDesigns(
          new ImpressWatchTopNewsPanels("top-news2"),
          new ImpressWatchNewsLists());
      }
    } else if (newsSiteUrlParser.parse(KODOMO_IT_PATH)) { // Kodomo IT
      Site.setNewsDesign(new ImpressWatchKodomoItList());
      Site.addNewsTopicWords(splitImpressWatchString("KodomoItTopicWords"));
    } else if (newsSiteUrlParser.parse(BACK_NUMBER_PATH)) { // Back number
      if (newsSiteUrlParser.parse(
        getImpressWatchString("BackNumberTopPath"))) {
        if (siteIndex >= 0) {
          Site.setNewsDesign(new ImpressWatchNewsBlocks());
        } else { // "Kongetsu No Kiji" linked from the bottom of Impress Watch
          Site.setNewsDesign(new ImpressWatchNewsLists());
        }
      } else { // Chuko PC Hotline!
        Site.setNewsDesign(new ImpressWatchNewsLists());
        newsSiteUrlParser.parseDirectoryHierarchy();
      }
    } else if (newsSiteUrlParser.parse(ACCESS_RANKING_PATH)) { // Ranking
      newsSiteUrlParser.parseDirectory();
      Site.setNewsDesign(new ImpressWatchRanking("ranking-list"));
    } else if (newsSiteUrlParser.parse(HEADLINE_PATH)) { // News Headline
      Site.setNewsDesigns(
        new ImpressWatchMainObservedTopics("article"),
        // TRENDING
        new ImpressWatchMainObservedTopics("#chartbeat_recommend", false));
    } else if (newsSiteUrlParser.parse(TRENDING_PATH)) { // Trending
      Site.setNewsDesign(new ImpressWatchMainObservedTopics("section.list"));
    } else if (newsSiteUrlParser.parse(LIFE_AT_HOME_PATH)) { // Zaitaku Work
      Site.setNewsDesign(new ImpressWatchMainObservedTopics("#article_list"));
    } else if (newsSiteUrlParser.parse(CATEGORY_PATH)) { // Each category
      if (newsSiteUrlParser.parse(
        getImpressWatchString("CategoryListHtml"))) { // Category Links
        Site.setNewsDesign(new ImpressWatchCategoryLinks());
      } else { // Impress site's news lists categorized by a topic
        if (siteIndex >= 0) {
          Site.setNewsDesign(
            new Design.NewsDesign({
                parentProperties: Array.of({
                    selectors: ".category-selector" // Shiborikomu
                  }),
                topicProperties: Design.ONESELF_QUERY_PROPERTIES
              }));
        }
        Site.setNewsDesign(new ImpressWatchNewsLists());
        newsSiteUrlParser.parseDirectoryHierarchy();
      }
    } else { // Impress site's news lists which is not categorized by a topic
      Site.setNewsDesign(new ImpressWatchNewsBlocks());
      newsSiteUrlParser.parseAll();
    }
    Site.setNewsDesigns(
      // Osusume Kiji
      new ImpressWatchRecommendedList(),
      // Saishin Kiji
      new Design.NewsDesign({
          parentProperties: Array.of({
              selectors: ".latest"
            }),
          topicProperties: TITLE_PROPERTIES
        }),
      new ImpressWatchRanking("ranking"),
      new ImpressWatchRanking("all-ranking"));

    Site.displayNewsDesigns(
      newsSiteUrlParser.toString(), new NewsSelector(newsSite.language));
  });
