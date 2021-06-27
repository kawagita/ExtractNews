/*
 *  Display news topics or media arranged on the site of Yahoo! News.
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
     * Returns the string localized for the specified ID on Yahoo! News.
     */
    function getYahooNewsString(id) {
      return getLocalizedString("YahooJapanNews" + id);
    }

    /*
     * Returns the array of strings separated by commas after localizing for
     * the specified ID on Yahoo! News.
     */
    function splitYahooNewsString(id) {
      return splitLocalizedString("YahooJapanNews" + id);
    }

    /*
     * Returns RegExp object created after localizing for the specified ID
     * suffixed with "RegularExpression" on Yahoo! News.
     */
    function getYahooNewsRegExp(id) {
      return getLocalizedRegExp("YahooJapanNews" + id);
    }

    const NEWS_FEED_LIST = "newsFeed_list";
    const NEWS_FEED_ITEM = "newsFeed_item";
    const NEWS_FEED_ITEM_TITLE = "newsFeed_item_title";
    const NEWS_FEED_ITEM_MEDIA = "newsFeed_item_media";
    const NEWS_FEED_PRICE = "newsFeedPrice";

    const CONTENTS_WRAP = "contentsWrap";

    const UAMODS_ALSO_READ = "uamods-also_read";

    const VIEWABLE_COMMENT = "viewable_comment";

    const CATEGORIES = splitYahooNewsString("Categories");
    const CATEGORY_TOPIC_WORDS_MAP = new Map();

    splitYahooNewsString("CategoryTopicWords").forEach((topicWords, index) => {
        CATEGORY_TOPIC_WORDS_MAP.set(CATEGORIES[index], topicWords.split(" "));
      });

    /*
     * News topics displayed in the category top on Yahoo! News.
     */
    class YahooNewsCategoryTopics extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectors: ".topics"
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
          });
        this.pickedTopicClassName = undefined;
      }

      getNewsItemElements(newsParent) {
        var newsItems = super.getNewsItemElements(newsParent);
        if (this.pickedTopicClassName == undefined && newsItems.length > 0) {
          // Find the picked topic which indicates the photo from news topics.
          var minClassNameCount = newsItems.length;
          var classNameCountMap = new Map();
          newsItems.forEach((newsItem) => {
              for (var className of newsItem.classList.values()) {
                var count = 0;
                if (classNameCountMap.has(className)) {
                  count = classNameCountMap.get(className);
                }
                count++;
                classNameCountMap.set(className, count);
              }
            });
          classNameCountMap.forEach((count, className) => {
              if (minClassNameCount > count) {
                minClassNameCount = count;
                this.pickedTopicClassName = className;
              }
            });
        }
        return newsItems;
      }

      _setNewsTopicsPhotoVisibility(newsItem, visibility) {
        if (newsItem.classList.contains(this.pickedTopicClassName)) {
          var parentNode = newsItem.parentNode;
          do {
            if (parentNode.nextElementSibling != null
              && parentNode.nextElementSibling.tagName == "P") {
              var topicPhotoAnchor =
                parentNode.nextElementSibling.firstElementChild;
              topicPhotoAnchor.style.visibility = visibility;
              break;
            }
            parentNode = parentNode.parentNode;
          } while (parentNode != null);
        }
      }

      showNewsItemElement(newsItem) {
        if (super.showNewsItemElement(newsItem)) {
          this._setNewsTopicsPhotoVisibility(newsItem, "visible");
          return true;
        }
        return false;
      }

      hideNewsItemElement(newsItem) {
        if (super.hideNewsItemElement(newsItem)) {
          this._setNewsTopicsPhotoVisibility(newsItem, "hidden");
          return true;
        }
        return false;
      }
    }

    const FLASH_NEWS_TITLE = getYahooNewsString("FlashNewsTitle");

    /*
     * News summaries displayed in the top on Yahoo! News Flash.
     */
    class YahooNewsFlashSummaries extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectors: "." + CONTENTS_WRAP + " h2",
                setNewsElement: (element, newsParents) => {
                    var headingText = element.textContent.trim();
                    if (headingText == FLASH_NEWS_TITLE) {
                      var flashSummary = element.parentNode.nextElementSibling;
                      while (flashSummary != null
                        && flashSummary.tagName == "DIV") {
                        newsParents.push(flashSummary);
                        flashSummary = flashSummary.nextElementSibling;
                      }
                    }
                  }
              }),
            itemProperties: Array.of({
                selectors: ".thumbnail",
                setNewsElement: (element, newsItems) => {
                    var thumbnailElement = element.parentNode;
                    while (thumbnailElement != null
                      && thumbnailElement.tagName != "DIV") {
                      thumbnailElement = thumbnailElement.parentNode;
                    }
                    newsItems.push(
                      thumbnailElement.nextElementSibling.firstElementChild);
                  }
              },
              Design.LI_ELEMENTS_QUERY_PROPERTY),
            topicProperties: Array.of({
                selectors: "p"
              }),
            itemTextProperty: {
                topicSearchFirst: true,
                senderFollowing: true
              }
          });
      }

      _setNewsFlashSummayThumbnailVisibility(newsItem, visibility) {
        if (newsItem.tagName == "DIV") {
          var thumbnailElement = newsItem.parentNode.previousElementSibling;
          if (thumbnailElement != undefined) {
            thumbnailElement.style.visibility = visibility;
          }
        }
      }

      showNewsItemElement(newsItem) {
        if (super.showNewsItemElement(newsItem)) {
          this._setNewsFlashSummayThumbnailVisibility(newsItem, "visible");
          return true;
        }
        return false;
      }

      hideNewsItemElement(newsItem) {
        if (super.hideNewsItemElement(newsItem)) {
          this._setNewsFlashSummayThumbnailVisibility(newsItem, "hidden");
          return true;
        }
        return false;
      }
    }

    const LIVE_MOVIE_TITLE = getYahooNewsString("LiveMovieTitle");

    /*
     * Panels of news movies on Yahoo! News Live.
     */
    class YahooNewsLiveMoviePanels extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectors: "." + CONTENTS_WRAP + " h2",
                setNewsElement: (element, newsParents) => {
                    var headingText = element.textContent.trim();
                    if (headingText == LIVE_MOVIE_TITLE) {
                      var parentNode = element.parentNode;
                      do {
                        if (parentNode.tagName == "SECTION") {
                          newsParents.push(parentNode.querySelector("ol"));
                          break;
                        }
                        parentNode = parentNode.parentNode;
                      } while (parentNode != null);
                    }
                  }
              }),
            topicProperties: Array.of({
                selectors: "p"
              })
          });
      }
    }

    /*
     * The main pain displayed in the left side on Yahoo! News.
     */
    class YahooNewsMainPane extends Design.NewsDesign {
      constructor(designProperty) {
        super(designProperty);
      }

      keepNewsParentDisplaying(newsParent) {
        return newsParent.classList.contains(NEWS_FEED_LIST);
      }

      getNewsItemElements(newsParent) {
        if (! newsParent.classList.contains(CONTENTS_WRAP)) {
          var newsItems = Array.from(newsParent.querySelectorAll("li"));
          if (newsParent.tagName != "NAV") {
            for (let i = newsItems.length - 1; i >= 0; i--) {
              if (newsItems[i].querySelector("." + NEWS_FEED_PRICE) != null) {
                newsItems.splice(i, 1);
              }
            }
          } else {
            // Remove the element of new arrival topic from news items.
            newsItems.shift();
          }
          return newsItems;
        }
        return new Array();
      }

      isNewsItemSelected(newsItem) {
        return newsItem.classList.contains(NEWS_FEED_ITEM);
      }

      getNewsTopicProperties(newsItem) {
        if (newsItem.classList.contains(NEWS_FEED_ITEM)) {
          return Array.of({
              selectors: "." + NEWS_FEED_ITEM_TITLE
            });
        }
        return Design.ONESELF_QUERY_PROPERTIES;
      }

      getNewsSenderProperties(newsItem) {
        if (newsItem.classList.contains(NEWS_FEED_ITEM)) {
          return Array.of({
              selectors: "." + NEWS_FEED_ITEM_MEDIA
            });
        }
        return undefined;
      }
    }

    /*
     * The news feed displayed in the bottom on Yahoo! News.
     */
    class YahooNewsFeed extends YahooNewsMainPane {
      constructor() {
        super({
            parentProperties: Array.of({
                selectors: "." + NEWS_FEED_LIST
              }, {
                selectors: "." + NEWS_FEED_ITEM,
                setNewsElement: (element, newsParents) => {
                    var newsFeed = element.parentNode;
                    var newsFeedClassList = newsFeed.classList;
                    if (! newsFeedClassList.contains(NEWS_FEED_LIST)) {
                      newsParents.push(newsFeed);
                      var newsFeedNextDiv = newsFeed.nextElementSibling;
                      if (newsFeedNextDiv != null) {
                        var newsFeedMore = newsFeedNextDiv.querySelector("ul");
                        if (newsFeedMore != null) {
                          newsParents.push(newsFeedMore);
                        }
                      }
                    }
                  }
              }, {
                selectors: "." + CONTENTS_WRAP + " nav"
              }),
            observedItemProperties: Array.of({
                setNewsElement: (element, newsItems) => {
                    if (element.querySelector("." + NEWS_FEED_PRICE) == null) {
                      newsItems.push(element);
                    }
                  }
              })
          });
      }

      getObservedNodes(newsParent) {
        var newsObservedNodes = new Array();
        if (newsParent.tagName != "NAV") {
          newsObservedNodes.push(newsParent);
        }
        return newsObservedNodes;
      }

      isRearrangementNewsItemsCleared(changedNodes) {
        // Clear the cache of news items when a subcategory is clicked.
        return changedNodes.length > 0;
      }

      getRearrangementObservedNode() {
        return document.querySelector("." + CONTENTS_WRAP + " nav");
      }
    }

    /*
     * The pane for an article on Yahoo! News.
     */
    class YahooNewsArticlePane extends YahooNewsMainPane {
      constructor() {
        super({
            parentProperties: Array.of({
                selectors: "." + CONTENTS_WRAP
              }, {
                selectorsForAll: "." + CONTENTS_WRAP + " ol"
              }, {
                selectorsForAll: "." + CONTENTS_WRAP + " ul",
                setNewsElement: (element, newsParents) => {
                    if (element.tagName == "UL"
                      && element.parentNode.tagName == "SECTION") {
                      element = element.parentNode;
                    }
                    newsParents.push(element);
                  }
              }),
            itemTextProperty: {
                topicSearchProperties: Array.of({
                    skippedTextRegExp: Design.NEWS_VIDEO_TIME_REGEXP
                  })
              },
            observerOptions: Design.SUBTREE_OBSERVER_OPTIONS,
            commentProperties: Array.of({
                selectorsForAll: "#" + VIEWABLE_COMMENT,
                setNewsElement: (element, commentNodes) => {
                    do {
                      commentNodes.push(element);
                      element = element.nextElementSibling;
                    } while (element != null);
                  }
              })
          });
      }

      getObservedNodes(newsParent) {
        var newsObservedNodes = new Array();
        if (newsParent.classList.contains(CONTENTS_WRAP)) {
          newsObservedNodes.push(newsParent);
        }
        return newsObservedNodes;
      }

      getObservedNewsItemElements(addedNode) {
        if (addedNode.id == "newsFeed" || addedNode.id == UAMODS_ALSO_READ) {
          return Array.from(addedNode.querySelectorAll("li"));
        }
        var newsItems = new Array();
        if(addedNode.tagName == "LI") {
          newsItems.push(addedNode);
        }
        return newsItems;
      }

      hasComments() {
        return document.getElementById(VIEWABLE_COMMENT) != null;
      }
    }

    const HEADING_TOPIC_SET = new Set(CATEGORIES);
    const HEADING_TOPIC_REGEXP = getYahooNewsRegExp("HeadingTopic");

    // Adds topics for categories enclosed by "(" and ")" in the specified
    // heading text to the array of topic words.

    function _setSideHeadingTopic(headingText) {
      var headingTopicMatch = headingText.match(HEADING_TOPIC_REGEXP);
      if (headingTopicMatch != null) {
        var headingTopics = Array.of(headingTopicMatch[1]);
        if (headingTopicMatch[2] != undefined) {
          headingTopics.push(headingTopicMatch[2]);
        }
        headingTopics.forEach((headingTopic) => {
            for (const category of CATEGORIES) {
              if (category == headingTopic) {
                Site.addNewsTopicWords(CATEGORY_TOPIC_WORDS_MAP.get(category));
                break;
              }
            }
          });
      }
    }

    const PAID_NEWS = getYahooNewsString("PaidNews");

    /*
     * Lists of news topics displayed in the side on Yahoo! News.
     */
    class YahooNewsSideLists extends Design.NewsDesign {
      constructor(articleSideListed = false, lateSectionObserved = false) {
        super({
            parentProperties: Array.of({
                selectors: "div.yjnSub_list"
              }, {
                selectorsForAll: "div.yjnSub_list section",
                setNewsElement: (element, newsParents) => {
                    var headingElement = element.querySelector("h2");
                    if (headingElement != null) {
                      var headingText = headingElement.textContent.trim();
                      if (headingText.indexOf(PAID_NEWS) >= 0) {
                        return;
                      } else if (articleSideListed) {
                        _setSideHeadingTopic(headingText);
                      }
                    }
                    newsParents.push(element);
                  }
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES,
            itemTextProperty: {
                topicSearchProperties: Array.of({
                    skippedTextRegExp: getYahooNewsRegExp("CommentCount")
                  })
              },
            observedProperties: Design.ONESELF_QUERY_PROPERTIES,
            observedItemAddedAtOnce: true
        });
        this.lateSectionObserved = lateSectionObserved;
      }

      getNewsItemElements(newsParent) {
        if (newsParent.tagName == "SECTION") {
          return Array.from(newsParent.querySelectorAll("li"));
        }
        return new Array();
      }

      getObservedNodes(newsParent) {
        var newsObservedNodes = new Array();
        if (this.lateSectionObserved && newsParent.tagName == "DIV") {
          newsObservedNodes.push(newsParent);
        }
        return newsObservedNodes;
      }

      getObservedNewsItemElements(addedNode) {
        if (addedNode.tagName == "SECTION") {
          var headingElement = addedNode.querySelector("h2");
          if (headingElement != null) {
            var headingText = headingElement.textContent.trim();
            if (headingText.indexOf(PAID_NEWS) < 0) {
              return Array.from(addedNode.querySelectorAll("li"));
            }
          }
        }
        return new Array();
      }
    }

    // Adds categories gotten by the specified URL parser to the specified set.

    function _parseNewsCategory(urlParser, categorySet) {
      const CATEGORY_PATHS = splitYahooNewsString("CategoryPaths");
      for (let i = 0; i < CATEGORY_PATHS.length; i++) {
        if (urlParser.parsePath(CATEGORY_PATHS[i])) {
          categorySet.add(CATEGORIES[i]);
          return;
        }
      }
      if (urlParser.parse("ITScienceCategoryPath")) {
        splitYahooNewsString("ITScienceCategories").forEach((category) => {
            categorySet.add(category);
          });
      } else {
        categorySet.add(CATEGORIES[0]);
      }
    }

    // Display news designs arranged by a selector which selects and excludes
    // topics or senders, waiting the settings from the background script.

    class YahooNewsUrlParser extends UrlParser {
      constructor() {
        super(getUrlData(urlSite.data, document.URL));
      }
      getPathString(pathId) {
        return getYahooNewsString(pathId);
      }
      getPathRegExp(pathId) {
        return getYahooNewsRegExp(pathId);
      }
    }

    var urlParser = new YahooNewsUrlParser();

    if (urlParser.parse("ArticlePaths")) { // An article or its pickup
      var lateSectionObserved = false;
      if (! urlParser.parseByRegExp("ArticleComments")) {
        if (urlParser.endsWith("ArticlePath")) {
          // Set the flag whether the section "Douga Access Ranking" is late
          // in the article side.
          lateSectionObserved = true;
        }
        Site.setNewsDesign(new YahooNewsArticlePane());
      } else { // Comment list for an article
        Site.setNewsDesign(
          new Design.NewsDesign({
              parentProperties: Array.of({
                  selectors: "#" + UAMODS_ALSO_READ
                }),
              topicProperties: Design.ONESELF_QUERY_PROPERTIES
            }));
      }
      Site.setNewsDesign(new YahooNewsSideLists(true, lateSectionObserved));
    } else { // News feed displayed in the bottom of the main pane
      var newsCategorySet = new Set();
      if (urlParser.parseDirectory()
        || urlParser.parse("CategoryRootPath")) { // Category's top
        _parseNewsCategory(urlParser, newsCategorySet);
        Site.setNewsDesign(new YahooNewsCategoryTopics());
      } else if (urlParser.parse("FlashPath")) { // News Flash
        Site.setNewsDesign(new YahooNewsFlashSummaries());
      } else if (urlParser.parse("LivePath")) { // News Live
        Site.setNewsDesign(new YahooNewsLiveMoviePanels());
      } else if (urlParser.parse("TopicsPath")) {
        if (urlParser.isCompleted()) { // Headlines for all categories
          Site.setNewsDesign(
            new Design.NewsDesign({
              parentProperties: Array.of({
                  selectorsForAll: "." + CONTENTS_WRAP + " ul",
                  setNewsElement: (element, newsParents) => {
                      var prevElement = element.previousElementSibling;
                      if (prevElement != null && prevElement.tagName == "P") {
                        var prevElementText = prevElement.textContent.trim();
                        if (HEADING_TOPIC_SET.has(prevElementText)) {
                          newsParents.push(element);
                        }
                      }
                    }
                }),
              topicProperties: Design.ONESELF_QUERY_PROPERTIES
            }));
        } else { // List of each category's topics
          _parseNewsCategory(urlParser, newsCategorySet);
        }
      } else if (urlParser.parse("RankingRootPath")
        && urlParser.parse("RankingPaths")) { // Access ranking
        _parseNewsCategory(urlParser, newsCategorySet);
      }
      Site.setNewsDesign(new YahooNewsFeed(), new YahooNewsSideLists());
      // Add topics for categories of this page to the array of topic words.
      if (newsCategorySet.size <= 0) {
        newsCategorySet.add(CATEGORIES[0]);
      }
      newsCategorySet.forEach((newsCategory) => {
          Site.addNewsTopicWords(CATEGORY_TOPIC_WORDS_MAP.get(newsCategory));
        });
      Site.setNewsOpenedUrl(urlParser.toString());
    }

    Site.setNewsSelector(new Selector(urlSite.language));
    Site.displayNewsDesigns();
  }).catch((error) => {
    Debug.printStackTrace(error);
  });
