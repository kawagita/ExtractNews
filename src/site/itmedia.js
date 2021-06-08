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

ExtractNews.readEnabledNewsSite(document.URL).then((newsSite) => {
    if (newsSite == undefined) {
      Site.displayNewsDesigns();
      return;
    }

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

    const COL_BOX_INNER = "colBoxInner";
    const COL_BOX_INDEX = "colBoxIndex";

    /*
     * News topics on ITmedia NEWS.
     */
    class ITmediaNewsTopics extends Design.NewsDesign {
      constructor(parentSelectors, itemSelected = false) {
        super({
            parentProperties: Array.of({
                selectorsForAll: parentSelectors
              }),
            itemSelected: itemSelected,
            itemProperties: Array.of({
                selectorsForAll: "." + COL_BOX_INDEX
              }),
            topicProperties: Array.of({
                selectors: ".colBoxTitle"
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
    class ITmediaNewsPickUp extends Design.NewsDesign {
      constructor(parentSelectors) {
        super({
            parentProperties: Array.of({
                selectors: parentSelectors
              }),
            itemSelected: false,
            itemProperties: Array.of({
                selectors: "." + COL_BOX_INDEX
              }, {
                selectorsForAll: "li"
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
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
    class ITmediaNewsBursts extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectorsForAll: ".colBoxToday"
              }),
            itemSelected: true,
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
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
        if (newsParent.parentNode.tagName != "SECTION"
          && newsParent.id != "") { // Life style "b"
          return Design.SUBTREE_OBSERVER_OPTIONS;
        }
        return Design.CHILD_OBSERVER_OPTIONS;
      }

      getObservedNodes(newsParent) {
        if (newsParent.parentNode.tagName == "SECTION") { // Studio
          return Array.of(newsParent);
        } else if (newsParent.id != "") { // AI+
          return Array.of(newsParent.querySelector(".colBoxOuter"));
        } else if (newsParent.parentNode.id == "newArticle") { // Lifestyle "b"
          return Array.of(newsParent.querySelector("." + COL_BOX_INNER));
        }
        return new Array();
      }

      getObservedNewsItemElements(addedNode) {
        if (addedNode.classList.contains(COL_BOX_INDEX)) {
          return Array.of(addedNode);
        }
        return addedNode.querySelectorAll("." + COL_BOX_INDEX);
      }
    }

    /*
     * The link to related articles or sites on ITmedia NEWS.
     */
    class ITmediaNewsRelatedLink extends Design.NewsDesign {
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

    const ARTICLE_TYPE_ALL = getITmediaNewsString("ArticleTypeAll");

    /*
     * The back number of news topics on ITmedia NEWS.
     */
    class ITmediaNewsBackNumber extends ITmediaNewsRelatedLink {
      constructor() {
        super(".colBoxBacknumber", (element, newsParents) => {
            var newsBlocks =
              element.querySelectorAll("." + COL_BOX_INDEX);
            if (newsBlocks.length > 0) {
              Array.from(newsBlocks).forEach((newsBlock) => {
                  newsParents.push(newsBlock);
                });
            }
          });
        this.articleType = ARTICLE_TYPE_ALL;
      }

      getNewsItemElements(newsParent) {
        var newsItems = new Array();
        newsParent.querySelectorAll("li").forEach((newsItem) => {
            var articleTypeSpan = newsItem.querySelector(".colBoxArticletype");
            if (articleTypeSpan != null
              && (this.articleType == ARTICLE_TYPE_ALL
                || this.articleType == articleTypeSpan.textContent.trim())) {
              newsItems.push(newsItem);
            }
          });
        return newsItems;
      }

      keepNewsParentDisplaying(newsParent) {
        return this.articleType != ARTICLE_TYPE_ALL;
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
     * The ranking of news topics "Ninki Kiji Ranking" on ITmedia NEWS.
     */
    class ITmediaNewsRanking extends Design.NewsDesign {
      constructor(parentSelectors) {
        super({
            parentProperties: Array.of({
                selectors: parentSelectors
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES,
            itemTextProperty: {
                topicSearchProperties: Array.of({
                    skippedTextRegexp: Design.NEWS_RANKING_NUMBER_REGEXP
                  })
              }
          });
      }
    }

    const CATEGORY_ROOT_PATH = getITmediaNewsString("CategoryRootPath");
    const CATEGORY_PATHS = splitITmediaNewsString("CategoryPaths");
    const CATEGORY_IDS = splitITmediaNewsString("CategoryIds");

    function _addCategoryTopicWords(categoryId = "") {
      var categoryTopicWordsString = "";
      if (categoryId != "") {
        categoryTopicWordsString =
          getITmediaNewsString(categoryId + "CategoryTopicWords");
      }
      Site.addNewsTopicWords(splitITmediaNewsString("CommonTopicWords"));
      if (categoryTopicWordsString != "") {
        Site.addNewsTopicWords(categoryTopicWordsString.split(","));
      } else {
        // Add topics for all categories on the top page, burst, or archive.
        for (let i = 0; i < CATEGORY_IDS.length; i++) {
          Site.addNewsTopicWords(
            splitITmediaNewsString(CATEGORY_IDS[i] + "CategoryTopicWords"));
        }
      }
    }

    // Display news designs arranged by a selector which selects and excludes
    // topics or senders, waiting the settings from the background script.

    class ITMediaUrlParser extends NewsSiteUrlParser {
      constructor() {
        super(getNewsSiteUrlData(newsSite, document.URL));
        this.parsePath(newsSite.path);
      }
      getPathString(pathId) {
        return getITmediaNewsString(pathId);
      }
      getPathRegExp(pathId) {
        return getITmediaNewsRegExp(pathId);
      }
    }

    var newsSiteUrlParser = new ITMediaUrlParser();
    if (newsSiteUrlParser.parseByRegExp("Articles")) { // Articles
      Site.setNewsDesigns(
        // News design to get topics for the category displayed on the pankuzu
        // list of an article, which never include news topics
        new Design.NewsDesign({
            parentProperties: Array.of({
                selectors: "#localPankuzu",
                setNewsElement: (element, newsParents) => {
                    newsParents.push(element);
                    for (const pankuzu of element.querySelectorAll("a")) {
                      var urlData = getNewsSiteUrlData(newsSite, pankuzu.href);
                      if (urlData != undefined) {
                        var urlParser = new NewsSiteUrlParser(urlData);
                        if (urlParser.parsePath(newsSite.path)
                          && urlParser.parsePath(CATEGORY_ROOT_PATH)) {
                          for (let i = 0; i < CATEGORY_PATHS.length; i++) {
                            if (urlParser.parsePath(CATEGORY_PATHS[i])) {
                              _addCategoryTopicWords(CATEGORY_IDS[i]);
                              return;
                            }
                          }
                        }
                      }
                    }
                  }
              })
          }),
        // Kanren kiji
        new ITmediaNewsRelatedLink("#art"),
        // Kanren link
        new ITmediaNewsRelatedLink("#lnk"));
    } else {
      var newsCategoryId = undefined;
      if (newsSiteUrlParser.parseDirectory()) { // ITmedia NEWS top
        Site.setNewsDesigns(
          new ITmediaNewsTopPanels(),
          new ITmediaNewsList(".colBoxNewArt"),
          new ITmediaNewsList(".colBoxHotTopic"),
          new ITmediaNewsListMoreLink(".colBoxLifestyle"),
          new ITmediaNewsList(".colBoxAttention"));
      } else if (newsSiteUrlParser.parsePath(CATEGORY_ROOT_PATH)) {
        if (newsSiteUrlParser.parse("BurstsCategoryPath")) { // Bursts
          Site.setNewsDesign(new ITmediaNewsBursts());
        } else if (newsSiteUrlParser.parse("StudioCategoryPath")) { // STUDIO
          newsCategoryId = "Studio";
          Site.setNewsDesigns(
            new ITmediaNewsTopPanels(),
            new ITmediaNewsPanels(".colBoxTopArticle", true),
            new ITmediaNewsList(".colBoxSpecialFuture"),
            // Shinchaku Kiji listed in the bottom of STUDIO
            new ITmediaNewsFeed(),
            new ITmediaNewsRanking(".colBoxRanking"));
        } else if (newsSiteUrlParser.parse("LifestyleCategoryPath")) { // Life
          newsCategoryId = "Lifestyle";
          Site.setNewsDesigns(
            new ITmediaNewsFeed(),
            new ITmediaNewsTopics(".colBoxRcCategory"));
        } else if (newsSiteUrlParser.parse("ArchiveCategoryPath")) { // Archive
          Site.setNewsDesign(new ITmediaNewsBackNumber());
        } else if (newsSiteUrlParser.parse("AiplusCategoryPath")) { // AI+
          newsCategoryId = "Aiplus";
          Site.setNewsDesigns(
            new ITmediaNewsTopPanels(),
            new ITmediaNewsVeticalPanels(".colBoxIndustry", true),
            // Shinchaku Kiji listed in the middle of AI+
            new ITmediaNewsFeed(),
            new ITmediaNewsTopics(".colBoxReco"),
            new ITmediaNewsRanking(".colBoxaiplusRanking"));
        } else if (newsSiteUrlParser.parse("ClouduserCategoryPath")) { // Cloud
          newsCategoryId = "Clouduser";
          Site.setNewsDesigns(
            new ITmediaNewsTopPanels(),
            new ITmediaNewsList(".colBoxAlist"),
            new ITmediaNewsTopics(".colBoxRcCategory"));
        } else if (newsSiteUrlParser.parse("QuantumCategoryPath")) { // Quantum
          newsCategoryId = "Quantum";
          Site.setNewsDesigns(
            new ITmediaNewsPickUp(".colBoxFeaturesIndex240UrllistRelated"),
            new ITmediaNewsTopics(".colBoxFeatures2index120Urllist"),
            new ITmediaNewsList(".colBoxFeaturesIndex120Urllist"),
            new ITmediaNewsList(".colBoxFeaturesIndex240Urllist"));
        } else { // Other categories
          for (let i = 0; i < CATEGORY_PATHS.length; i++) {
            if (newsSiteUrlParser.parsePath(CATEGORY_PATHS[i])) {
              newsCategoryId = CATEGORY_IDS[i];
              Site.setNewsDesigns(
                // Few news topics listed in the top of each category
                new ITmediaNewsList(".colBox" + newsCategoryId + "New"),
                // The rest of news topics listed in each category
                new ITmediaNewsList(".colBox" + newsCategoryId + "Newtopic"));
              break;
            }
          }
          if (newsSiteUrlParser.endsWith("IndustryCategoryPath")) {
            Site.setNewsDesign(new ITmediaNewsList(".colBoxProductsNewtopic"));
          }
        }
      }
      _addCategoryTopicWords(newsCategoryId);
      Site.setNewsOpenedUrl(newsSiteUrlParser.toString());
    }
    Site.setNewsDesign(new ITmediaNewsTopics(".colBoxTopRanking"));

    Site.setNewsSelector(
      new NewsSelector(ExtractNews.getDomainLanguage(newsSite.domainId)));
    Site.displayNewsDesigns(new Set([ "interactive" , "complete" ]));
  }).catch((error) => {
    Debug.printStackTrace(error);
  });
