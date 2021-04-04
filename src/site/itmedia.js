/*
 *  Display news topics or media arranged on the site of ITmedia NEWS.
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
 * Returns the string localized for the specified ID on ITmedia NEWS.
 */
function getITmediaNewsString(id) {
  return ExtractNews.getLocalizedString("ITmediaNews" + id);
}

/*
 * Returns the array of strings separated by commas after localizing for
 * the specified ID on ITmedia NEWS.
 */
function splitITmediaNewsString(id) {
  return ExtractNews.splitLocalizedString("ITmediaNews" + id);
}

/*
 * Returns RegExp object created after localizing for the specified ID
 * suffixed with "RegularExpression" on ITmedia NEWS.
 */
function getITmediaNewsRegExp(id) {
  return ExtractNews.getLocalizedRegExp("ITmediaNews" + id);
}

const ITMEDIA_NEWS_ARTICLE_TYPE_ALL = getITmediaNewsString("ArticleTypeAll");

const ITMEDIA_NEWS_COL_BOX_INNER = "colBoxInner";
const ITMEDIA_NEWS_COL_BOX_INDEX = "colBoxIndex";
const ITMEDIA_NEWS_COL_BOX_TITLE = "colBoxTitle";

/*
 * News topics on ITmedia NEWS.
 */
class ITmediaNewsTopics extends NewsDesign {
  constructor(parentSelectors, itemSelected = false) {
    super({
        parentProperties: Array.of({
            selectorsForAll: parentSelectors
          }),
        itemSelected: itemSelected,
        itemProperties: Array.of({
            selectorsForAll: "." + ITMEDIA_NEWS_COL_BOX_INDEX
          }),
        topicProperties: Array.of({
            selectors: "." + ITMEDIA_NEWS_COL_BOX_TITLE
          })
      });
  }
}

/*
 * Top panels of news topics on ITmedia NEWS.
 */
class ITmediaNewsTopPanels extends ITmediaNewsTopics {
  constructor() {
    super(".colBoxTopStories");
  }
}

/*
 * Panels of news topics on ITmedia NEWS.
 */
class ITmediaNewsPanels extends ITmediaNewsTopics {
  constructor(parentSelectors, itemSelected) {
    super(parentSelectors, itemSelected);
  }
}

/*
 * Panels of news topics displayed vertically on ITmedia NEWS.
 */
class ITmediaNewsVeticalPanels extends ITmediaNewsTopics {
  constructor(parentSelectors, itemSelected) {
    super(parentSelectors, itemSelected);
  }

  showNewsItemElement(newsItem) {
    if (newsItem.previousElementSibling != null) {
      newsItem.style.display = "";
    } else {
      newsItem.style.visibility = "visible";
    }
    return true;
  }

  hideNewsItemElement(newsItem) {
    if (newsItem.previousElementSibling != null) {
      newsItem.style.display = "none";
    } else {
      newsItem.style.visibility = "hidden";
    }
    return true;
  }
}

/*
 * Pick up news on ITmedia NEWS.
 */
class ITmediaNewsPickUp extends NewsDesign {
  constructor(parentSelectors) {
    super({
        parentProperties: Array.of({
            selectors: parentSelectors
          }),
        itemSelected: false,
        itemProperties: Array.of({
            selectors: "." + ITMEDIA_NEWS_COL_BOX_INDEX
          }, {
            selectorsForAll: "li"
          }),
        topicProperties: ONESELF_QUERY_PROPERTIES
      });
  }
}

/*
 * The list of news topics on ITmedia NEWS.
 */
class ITmediaNewsList extends ITmediaNewsTopics {
  constructor(parentSelectors) {
    super(parentSelectors, true);
  }
}

/*
 * The list of news topics on ITmedia NEWS, following to the more link button.
 */
class ITmediaNewsListMoreLink extends ITmediaNewsList {
  constructor(parentSelectors) {
    super(parentSelectors);
  }

  _setMoreLinkButtonDisplay(newsParent, display) {
    var nextElementSibling = newsParent.nextElementSibling;
    if (nextElementSibling != null
      && nextElementSibling.classList.contains("moreLink")) {
      nextElementSibling.style.display = display;
    }
  }

  showNewsParentElement(newsParent) {
    if (super.showNewsParentElement(newsParent)) {
      this._setMoreLinkButtonDisplay(newsParent, "");
      return true;
    }
    return false;
  }

  hideNewsParentElement(newsParent) {
    if (super.hideNewsParentElement(newsParent)) {
      this._setMoreLinkButtonDisplay(newsParent, "none");
      return true;
    }
    return false;
  }
}

/*
 * Burst news on ITmedia NEWS.
 */
class ITmediaNewsBursts extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectorsForAll: ".colBoxToday"
          }),
        itemSelected: true,
        topicProperties: ONESELF_QUERY_PROPERTIES
      });
  }
}

/*
 * The feed of news topics on ITmedia NEWS.
 */
class ITmediaNewsFeed extends ITmediaNewsList {
  constructor() {
    super(".colBoxNewArticle, .colBoxBtmArticle");
  }

  keepNewsParentDisplaying(newsParent) {
    return true;
  }

  getObserverOptions(newsParent) {
    if (newsParent.parentNode.tagName != "SECTION" && newsParent.id != "") {
      return SUBTREE_OBSERVER_OPTIONS;
    }
    return CHILD_OBSERVER_OPTIONS;
  }

  getObservedNodes(newsParent) {
    if (newsParent.parentNode.tagName == "SECTION") { // Studio
      return Array.of(newsParent);
    } else if (newsParent.id != "") { // AI+
      return Array.of(newsParent.querySelector(".colBoxOuter"));
    } else if (newsParent.parentNode.id == "newArticle") { // Life style "b"
      return Array.of(
        newsParent.querySelector("." + ITMEDIA_NEWS_COL_BOX_INNER));
    }
    return EMPTY_NEWS_ELEMENTS;
  }

  getObservedNewsItemElements(addedNode) {
    if (addedNode.classList.contains(ITMEDIA_NEWS_COL_BOX_INDEX)) {
      return Array.of(addedNode);
    }
    return addedNode.querySelectorAll("." + ITMEDIA_NEWS_COL_BOX_INDEX);
  }
}

/*
 * The link to related articles or sites on ITmedia NEWS.
 */
class ITmediaNewsRelatedLink extends NewsDesign {
  constructor(parentSelectors, setNewsBlocks) {
    super({
        parentProperties: Array.of({
            selectors: parentSelectors,
            setNewsElement: setNewsBlocks
          }),
        itemSelected: setNewsBlocks != undefined,
        itemUnfixed: setNewsBlocks != undefined,
        topicProperties: Array.of({
            selectors: "a"
          })
      });
  }

  _setLinkHeadingDisplay(newsParent, display) {
    var articlesHeading = newsParent.previousElementSibling;
    if (articlesHeading != undefined) {
      articlesHeading.style.display = display;
    }
  }

  showNewsParentElement(newsParent) {
    if (super.showNewsParentElement(newsParent)) {
      this._setLinkHeadingDisplay(newsParent, "");
      return true;
    }
    return false;
  }

  hideNewsParentElement(newsParent) {
    if (super.hideNewsParentElement(newsParent)) {
      this._setLinkHeadingDisplay(newsParent, "none");
      return true;
    }
    return false;
  }
}

/*
 * The back number of news topics on ITmedia NEWS.
 */
class ITmediaNewsBackNumber extends ITmediaNewsRelatedLink {
  constructor() {
    super(".colBoxBacknumber", (element, newsParents) => {
        var newsBlocks =
          element.querySelectorAll("." + ITMEDIA_NEWS_COL_BOX_INDEX);
        if (newsBlocks.length > 0) {
          Array.from(newsBlocks).forEach((newsBlock) => {
              newsParents.push(newsBlock);
            });
        }
      });
    this.articleType = ITMEDIA_NEWS_ARTICLE_TYPE_ALL;
  }

  getNewsItemElements(newsParent) {
    var newsItems = new Array();
    newsParent.querySelectorAll("li").forEach((newsItem) => {
        var articleTypeElement = newsItem.querySelector(".colBoxArticletype");
        if (articleTypeElement != null
          && (this.articleType == ITMEDIA_NEWS_ARTICLE_TYPE_ALL
            || this.articleType == articleTypeElement.textContent.trim())) {
          newsItems.push(newsItem);
        }
      });
    return newsItems;
  }

  keepNewsParentDisplaying(newsParent) {
    return this.articleType != ITMEDIA_NEWS_ARTICLE_TYPE_ALL;
  }

  getNewsSenderProperties(newsItem) {
    return Array.of({
        selectors: ".colBoxArticlewriter"
      });
  }

  getNewsSenderText(newsSenderTextNode) {
    if (newsSenderTextNode != null) {
      var newsSenderText = newsSenderTextNode.textContent.trim();
      return newsSenderText.substring(1, newsSenderText.length - 1);
    }
    return undefined;
  }

  getRearrangementObservedNode() {
    return document.querySelector(".colBoxButtons ul");
  }

  isRearrangedBy(changedNode) {
    if (changedNode.classList.contains("active")) {
      this.articleType = changedNode.textContent.trim();
      return true;
    }
    return false;
  }

  rearrangeNewsParent(newsParent) {
    if (newsParent.style.display == "none") {
      newsParent.style.display = "";
    }
  }
}

/*
 * The ranking of news topics named with "Ninki Kiji Ranking" on ITmedia NEWS.
 */
class ITmediaNewsRanking extends NewsDesign {
  constructor(parentSelectors) {
    super({
        parentProperties: Array.of({
            selectors: parentSelectors
          }),
        topicProperties: ONESELF_QUERY_PROPERTIES,
        itemTextProperty: {
            topicSearchProperties: Array.of({
                skippedTextRegexp: NEWS_RANKING_NUMBER_REGEXP
              })
          }
      });
  }
}


const CATEGORY_ROOT_PATH = getITmediaNewsString("CategoryRootPath");
const CATEGORY_PATHS = splitITmediaNewsString("CategoryPaths");
const CATEGORY_IDS = splitITmediaNewsString("CategoryIds");

function _getPankuzuCategoryId() {
  for (const pankuzuTopic of document.querySelectorAll("#localPankuzu a")) {
    var pankuzuUrlParser = new Site.OpenedUrlParser(pankuzuTopic.href);
    if (pankuzuUrlParser.parseHostName()
      && pankuzuUrlParser.parseRootDirectory()
      && pankuzuUrlParser.parse(CATEGORY_ROOT_PATH)) {
      for (let i = 0; i < CATEGORY_PATHS.length; i++) {
        if (pankuzuUrlParser.parse(CATEGORY_PATHS[i])) {
          return CATEGORY_IDS[i];
        }
      }
    }
  }
  return "";
}

// Displays news designs arranged by a selector which selects and excludes news
// topics or senders, waiting regular expressions from the background script.

if (Site.isLocalized()) {
  const ARTICLES_REGEXP = getITmediaNewsRegExp("Articles");
  const BURSTS_CATEGORY_PATH = getITmediaNewsString("BurstsCategoryPath");
  const INDUSTRY_CATEGORY_PATH = getITmediaNewsString("IndustryCategoryPath");
  const STUDIO_CATEGORY_PATH = getITmediaNewsString("StudioCategoryPath");
  const LIFESTYLE_CATEGORY_PATH =
    getITmediaNewsString("LifestyleCategoryPath");
  const ARCHIVE_CATEGORY_PATH = getITmediaNewsString("ArchiveCategoryPath");
  const AIPLUS_CATEGORY_PATH = getITmediaNewsString("AiplusCategoryPath");
  const CLOUDUSER_CATEGORY_PATH =
    getITmediaNewsString("ClouduserCategoryPath");
  const QUANTUM_CATEGORY_PATH = getITmediaNewsString("QuantumCategoryPath");

  var newsTitle = Site.NAME;
  var newsCategoryId = "";
  var newsOpenedUrlParser = new Site.OpenedUrlParser(document.URL);
  newsOpenedUrlParser.parseHostName();
  newsOpenedUrlParser.parseRootDirectory();

  Site.addNewsTopicWords(splitITmediaNewsString("CommonTopicWords"));

  if (newsOpenedUrlParser.match(ARTICLES_REGEXP) != null) { // Articles
    newsCategoryId = _getPankuzuCategoryId();
    Site.addNewsDesigns(
      new ITmediaNewsRelatedLink("#art"),
      new ITmediaNewsRelatedLink("#lnk"));
  } else if (newsOpenedUrlParser.parseDirectory()) { // ITmedia NEWS top
    Site.addNewsDesigns(
      new ITmediaNewsTopPanels(),
      new ITmediaNewsList(".colBoxNewArt"),
      new ITmediaNewsList(".colBoxHotTopic"),
      new ITmediaNewsListMoreLink(".colBoxLifestyle"),
      new ITmediaNewsList(".colBoxAttention"));
  } else if (newsOpenedUrlParser.parse(CATEGORY_ROOT_PATH)) {
    if (newsOpenedUrlParser.parse(BURSTS_CATEGORY_PATH)) { // Bursts
      Site.addNewsDesign(new ITmediaNewsBursts());
    } else if (newsOpenedUrlParser.parse(STUDIO_CATEGORY_PATH)) { // STUDIO
      newsCategoryId = "Studio";
      Site.addNewsDesigns(
        new ITmediaNewsTopPanels(),
        new ITmediaNewsPanels(".colBoxTopArticle", true),
        new ITmediaNewsList(".colBoxSpecialFuture"),
        new ITmediaNewsFeed(),
        new ITmediaNewsRanking(".colBoxRanking"));
    } else if (newsOpenedUrlParser.parse(LIFESTYLE_CATEGORY_PATH)) { // Life
      newsCategoryId = "Lifestyle";
      Site.addNewsDesigns(
        new ITmediaNewsFeed(),
        new ITmediaNewsTopics(".colBoxRcCategory"));
    } else if (newsOpenedUrlParser.parse(ARCHIVE_CATEGORY_PATH)) { // Archive
      Site.addNewsDesign(new ITmediaNewsBackNumber());
    } else if (newsOpenedUrlParser.parse(AIPLUS_CATEGORY_PATH)) { // AI+
      newsCategoryId = "Aiplus";
      Site.addNewsDesigns(
        new ITmediaNewsTopPanels(),
        new ITmediaNewsVeticalPanels(".colBoxIndustry", true),
        new ITmediaNewsFeed(),
        new ITmediaNewsTopics(".colBoxReco"),
        new ITmediaNewsRanking(".colBoxaiplusRanking"));
    } else if (newsOpenedUrlParser.parse(CLOUDUSER_CATEGORY_PATH)) { // Cloud
      newsCategoryId = "Clouduser";
      Site.addNewsDesigns(
        new ITmediaNewsTopPanels(),
        new ITmediaNewsList(".colBoxAlist"),
        new ITmediaNewsTopics(".colBoxRcCategory"));
    } else if (newsOpenedUrlParser.parse(QUANTUM_CATEGORY_PATH)) { // Quantum
      newsCategoryId = "Quantum";
      Site.addNewsDesigns(
        new ITmediaNewsPickUp(".colBoxFeaturesIndex240UrllistRelated"),
        new ITmediaNewsTopics(".colBoxFeatures2index120Urllist"),
        new ITmediaNewsList(".colBoxFeaturesIndex120Urllist"),
        new ITmediaNewsList(".colBoxFeaturesIndex240Urllist"));
    } else { // Other categories
      for (let i = 0; i < CATEGORY_PATHS.length; i++) {
        if (newsOpenedUrlParser.parse(CATEGORY_PATHS[i])) {
          newsCategoryId = CATEGORY_IDS[i];
          Site.addNewsDesigns(
            new ITmediaNewsList(".colBox" + newsCategoryId + "New"),
            new ITmediaNewsList(".colBox" + newsCategoryId + "Newtopic"));
          break;
        }
      }
      if (newsOpenedUrlParser.path.endsWith(INDUSTRY_CATEGORY_PATH)) {
        Site.addNewsDesign(new ITmediaNewsList(".colBoxProductsNewtopic"));
      }
    }
  }
  Site.addNewsDesign(new ITmediaNewsTopics(".colBoxTopRanking"));

  // Add topics for a category of this page to the array of topic words.
  var newsCategoryTopicWordsString = "";
  if (newsCategoryId != "") {
    newsCategoryTopicWordsString =
      getITmediaNewsString(newsCategoryId + "CategoryTopicWords");
  }
  if (newsCategoryTopicWordsString != "") {
    Site.addNewsTopicWords(newsCategoryTopicWordsString.split(","));
  } else { // Top page or Burst or Archive category
    for (let i = 0; i < CATEGORY_IDS.length; i++) {
      // Add topics for all categories to the array of topic words.
      Site.addNewsTopicWords(
        splitITmediaNewsString(CATEGORY_IDS[i] + "CategoryTopicWords"));
    }
  }

  if (newsOpenedUrlParser.path != "/") { // Except for ITmedia NEWS top
    newsTitle += Site.NAME_CONCATENATION;
    // Adds the part of a page title to "ITmedia NEWS".
    var titleText = document.querySelector("title").textContent.trim();
    var titleMatch = titleText.match(getITmediaNewsRegExp("TitleSuffix"));
    if (titleMatch != null) { // " - ITmedia NEWS" or " | ITmedia NEWS"
      newsTitle += titleText.substring(0, titleMatch.index);
    } else {
      newsTitle += titleText;
    }
  }

  Site.displayNewsDesigns(newsTitle, newsOpenedUrlParser.toString());
}
