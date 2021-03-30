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

const IMPRESS_WATCH_ITEM_PROPERTIES = Array.of({ selectorsForAll: ".item" });
const IMPRESS_WATCH_TITLE_PROPERTIES = Array.of({ selectors: ".title" });

const IMPRESS_WATCH_GROUP = "group";

/*
 * Panels of the top news on Impress Watch.
 */
class ImpressWatchTopNewsPanels extends NewsDesign {
  constructor(className) {
    super({
        parentProperties: Array.of({
            selectors: "." + className
          }),
        itemSelected: false,
        itemLayoutUnchanged: true,
        topicProperties: IMPRESS_WATCH_TITLE_PROPERTIES
      });
  }
}

/*
 * News topics displayed in the main area on Impress Watch.
 */
class ImpressWatchMainTopics extends NewsDesign {
  constructor(parentSelectors, setNewsParent, itemSelected = false) {
    super({
        parentProperties: Array.of({
            selectorsForAll: "#main " + parentSelectors,
            setNewsElement: setNewsParent
          }),
        itemSelected: itemSelected,
        itemProperties: IMPRESS_WATCH_ITEM_PROPERTIES,
        topicProperties: IMPRESS_WATCH_TITLE_PROPERTIES
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
 * Lists of news topics on Impress Watch top and categorized on Impress sites.
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
      if (newsParent.classList.contains(IMPRESS_WATCH_GROUP)) {
        for (let i = 0; i < newsParent.children.length; i++) {
          if (newsParent.children[i].style.display != display) {
            return;
          }
        }
        var newsGroup = newsParent.parentNode;
        do {
          if (newsGroup.classList.contains(IMPRESS_WATCH_GROUP)) {
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
          element = element.querySelector("." + IMPRESS_WATCH_GROUP);
        }
        newsParents.push(element);
      });
  }

  getObservedNodes(newsParent) {
    if (newsParent.classList.contains(IMPRESS_WATCH_GROUP)) {
      return Array.of(newsParent.querySelector("ul"));
    }
    return EMPTY_NEWS_ELEMENTS;
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
class ImpressWatchKodomoItList extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: "#main section"
          }),
        keepDisplaying: true,
        itemSelected: true,
        itemProperties: IMPRESS_WATCH_ITEM_PROPERTIES,
        topicProperties: IMPRESS_WATCH_TITLE_PROPERTIES,
        observerOptions: SUBTREE_OBSERVER_OPTIONS,
        observedProperties: ONESELF_QUERY_PROPERTIES
      });
  }

  getObservedNewsItemElements(addedNode) {
    if (addedNode.tagName == "LI") {
      return Array.of(addedNode);
    }
    return EMPTY_NEWS_ELEMENTS;
  }
}

/*
 * Links of topics by which the news list is categorized on Impress sites.
 */
class ImpressWatchCategoryLinks extends NewsDesign {
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
        topicProperties: ONESELF_QUERY_PROPERTIES
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
 * The list of recommended topics in the main area or side on Impress sites.
 */
class ImpressWatchRecommendedList extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectorsForAll: "aside #recommend-1",
            setNewsElement: (element, newsParents) => {
                newsParents.push(element.parentNode);
              }
          }),
        itemProperties: IMPRESS_WATCH_ITEM_PROPERTIES,
        topicProperties: IMPRESS_WATCH_TITLE_PROPERTIES
      });
  }
}

/*
 * The ranking of news topics on Impress Watch.
 */
class ImpressWatchRanking extends NewsDesign {
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
        topicProperties: ONESELF_QUERY_PROPERTIES,
        itemTextProperty: {
            topicSearchProperties: Array.of({
                skippedTextRegexp: NEWS_RANKING_NUMBER_REGEXP
              })
          },
        observedProperties: Array.of({
            selectors: "ul"
          }),
        observedItemProperties: ONESELF_QUERY_PROPERTIES
      });
  }
}

/*
 * News topics observed in the main area on Impress Watch.
 */
class ImpressWatchMainObservedTopics extends NewsDesign {
  constructor(parentSelectors, keepDisplaying = true) {
    super({
        parentProperties: Array.of({
            selectors: "#main " + parentSelectors
          }),
        keepDisplaying: keepDisplaying,
        itemProperties: IMPRESS_WATCH_ITEM_PROPERTIES,
        topicProperties: IMPRESS_WATCH_TITLE_PROPERTIES,
        observerOptions: SUBTREE_OBSERVER_OPTIONS,
        observedProperties: ONESELF_QUERY_PROPERTIES
      });
  }

  getObservedNewsItemElements(addedNode) {
    if (addedNode.tagName == "LI") {
      return Array.of(addedNode);
    }
    return Array.from(addedNode.querySelectorAll("li"));
  }
}


// Displays news designs arranged by a selector which selects and excludes news
// topics or senders, waiting regular expressions from the background script.

if (Site.isLocalized()) {
  const SITE_HOST_SERVERS = splitImpressWatchString("SiteHostServers");
  const SITE_NAMES = splitImpressWatchString("SiteNames");
  const SITE_TOPICS = splitImpressWatchString("SiteTopics");

  const DOCUMENTS_REGEXP = getImpressWatchRegExp("Documents");
  const KODOMO_IT_PATH = getImpressWatchString("KodomoItPath");
  const BACK_NUMBER_PATH = getImpressWatchString("BackNumberPath");
  const ACCESS_RANKING_PATH = getImpressWatchString("AccessRankingPath");
  const LIFE_AT_HOME_PATH = getImpressWatchString("LifeAtHomePath");
  const HEADLINE_PATH = getImpressWatchString("HeadlinePath");
  const TRENDING_PATH = getImpressWatchString("TrendingPath");
  const CATEGORIZED_PATH = getImpressWatchString("CategorizedPath");

  var newsTitle = Site.NAME;
  var newsSiteIndex = -1;
  var newsOpenedUrlParser = new Site.OpenedUrlParser(document.URL);
  newsOpenedUrlParser.parseHostName();
  newsSiteIndex = SITE_HOST_SERVERS.indexOf(newsOpenedUrlParser.hostServer);
  if (newsSiteIndex >= 0) { // INTERNET Watch, PC Watch, ..., and Watch Video
    Site.addNewsTopicWords(SITE_TOPICS[newsSiteIndex].split(" "));
  } else { // Impress Watch
    Site.addNewsTopicWords(splitImpressWatchString("Topics"));
  }

  if (newsOpenedUrlParser.match(DOCUMENTS_REGEXP) != null) { // Articles
    Site.addNewsDesigns(
      // Links to the previous or next article
      new NewsDesign({
          parentProperties: Array.of({
              selectors: ".corner",
            }),
          keepDisplaying: true,
          topicProperties: IMPRESS_WATCH_TITLE_PROPERTIES
        }),
      // Links to outer articles
      new NewsDesign({
          parentProperties: Array.of({
              selectorsForAll: ".outer"
            }),
          topicProperties: ONESELF_QUERY_PROPERTIES
        }),
      // Links to related articles
      new NewsDesign({
          parentProperties: Array.of({
              selectorsForAll: ".related"
            }),
          topicProperties: IMPRESS_WATCH_TITLE_PROPERTIES
        }),
      // TRENDING
      new ImpressWatchMainObservedTopics("#chartbeat_recommend", false));
  } else if (newsOpenedUrlParser.parseDirectory()) { // Impress site's top
    if (newsSiteIndex >= 0) { // INTERNET Watch, PC Watch, ..., and Watch Video
      Site.addNewsDesigns(
        new ImpressWatchTopNewsPanels("top-news"),
        new ImpressWatchDailyBlocks(),
        // HOT TOPICS, Rensai, and Market Johou
        new ImpressWatchMainTopics("li.type-1"));
      newsTitle = SITE_NAMES[newsSiteIndex];
    } else { // Impress Watch
      Site.addNewsDesigns(
        new ImpressWatchTopNewsPanels("top-news2"),
        new ImpressWatchNewsLists());
    }
  } else if (newsOpenedUrlParser.parse(KODOMO_IT_PATH)) { // Kodomo IT
    Site.addNewsDesign(new ImpressWatchKodomoItList());
    Site.addNewsTopicWords(splitImpressWatchString("KodomoItTopics"));
  } else if (newsOpenedUrlParser.parse(BACK_NUMBER_PATH)) { // Back number
    if (newsOpenedUrlParser.parse(
      getImpressWatchString("BackNumberTopPath"))) {
      if (newsSiteIndex >= 0) {
        Site.addNewsDesign(new ImpressWatchNewsBlocks());
        newsTitle = SITE_NAMES[newsSiteIndex];
      } else { // "Kongetsu No Kiji" linked from the bottom of Impress Watch
        Site.addNewsDesign(new ImpressWatchNewsLists());
      }
    } else { // Chuko PC Hotline!
      Site.addNewsDesign(new ImpressWatchNewsLists());
      newsOpenedUrlParser.parseDirectoryHierarchy();
    }
  } else if (newsOpenedUrlParser.parse(ACCESS_RANKING_PATH)) { // Ranking
    newsOpenedUrlParser.parseDirectory();
    Site.addNewsDesign(new ImpressWatchRanking("ranking-list"));
  } else if (newsOpenedUrlParser.parse(HEADLINE_PATH)) { // News Headline
    Site.addNewsDesigns(
      new ImpressWatchMainObservedTopics("article"),
      // TRENDING
      new ImpressWatchMainObservedTopics("#chartbeat_recommend", false));
  } else if (newsOpenedUrlParser.parse(TRENDING_PATH)) { // Trending
    Site.addNewsDesign(new ImpressWatchMainObservedTopics("section.list"));
  } else if (newsOpenedUrlParser.parse(LIFE_AT_HOME_PATH)) { // Zaitaku Work
    Site.addNewsDesign(new ImpressWatchMainObservedTopics("#article_list"));
  } else if (newsOpenedUrlParser.parse(CATEGORIZED_PATH)) {
    if (newsOpenedUrlParser.parse(
      getImpressWatchString("CategoryListHtml"))) { // Category Links
      Site.addNewsDesign(new ImpressWatchCategoryLinks());
    } else { // Impress site's news lists categorized by a topic
      if (newsSiteIndex >= 0) {
        Site.addNewsDesign(
          new NewsDesign({
              parentProperties: Array.of({
                  selectors: ".category-selector" // Shiborikomu
                }),
              topicProperties: ONESELF_QUERY_PROPERTIES
            }));
        newsTitle = SITE_NAMES[newsSiteIndex];
      }
      Site.addNewsDesign(new ImpressWatchNewsLists());
      newsOpenedUrlParser.parseDirectoryHierarchy();
    }
  } else { // Impress site's news lists which is not categorized by a topic
    Site.addNewsDesign(new ImpressWatchNewsBlocks());
    newsOpenedUrlParser.parseAll();
  }
  Site.addNewsDesigns(
    // Osusume Kiji
    new ImpressWatchRecommendedList(),
    // Saishin Kiji
    new NewsDesign({
        parentProperties: Array.of({
            selectors: ".latest"
          }),
        topicProperties: IMPRESS_WATCH_TITLE_PROPERTIES
      }),
    new ImpressWatchRanking("ranking"),
    new ImpressWatchRanking("all-ranking"));

  if (newsOpenedUrlParser.path != "/") { // Except for Impress site's top
    newsTitle += Site.NAME_CONCATENATION;
    // Adds the part of a page title to the name of an Impress site.
    var titleText = document.querySelector("title").textContent.trim();
    var titleMatch = titleText.match(getImpressWatchRegExp("TitleSuffix"));
    if (titleMatch != null) { // " - Impress Watch" or " | Impress Watch"
      newsTitle += titleText.substring(0, titleMatch.index);
    } else {
      newsTitle += titleText;
    }
    newsTitle =
      newsTitle.replace(
        getImpressWatchRegExp("DocumentsDurationTitle"),
        getImpressWatchString("DocumentsTitle"));
  }

  Site.displayNewsDesigns(newsTitle, newsOpenedUrlParser.toString());
}
