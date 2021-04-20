/*
 *  Display news topics or media arranged on the site of Yahoo! JAPAN News.
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
     * Returns the string localized for the specified ID on Yahoo! JAPAN News.
     */
    function getYahooJapanNewsString(id) {
      return ExtractNews.getLocalizedString("YahooJapanNews" + id);
    }

    /*
     * Returns the array of strings separated by commas after localizing for
     * the specified ID on Yahoo! JAPAN News.
     */
    function splitYahooJapanNewsString(id) {
      return ExtractNews.splitLocalizedString("YahooJapanNews" + id);
    }

    /*
     * Returns RegExp object created after localizing for the specified ID
     * suffixed with "RegularExpression" on Yahoo! JAPAN News.
     */
    function getYahooJapanNewsRegExp(id) {
      return ExtractNews.getLocalizedRegExp("YahooJapanNews" + id);
    }

    const NEWS_FEED_LIST = "newsFeed_list";
    const NEWS_FEED_ITEM = "newsFeed_item";
    const NEWS_FEED_ITEM_TITLE = "newsFeed_item_title";
    const NEWS_FEED_ITEM_MEDIA = "newsFeed_item_media";

    const NEWS_FEED_PRICE = "newsFeedPrice";

    const CONTENTS_WRAP = "contentsWrap";

    const VIEWABLE_COMMENT = "viewable_comment";

    /*
     * News topics displayed in the category top on Yahoo! JAPAN News.
     */
    class YahooJapanNewsCategoryTopics extends Design.NewsDesign {
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

    const FLASH_NEWS_TITLE = getYahooJapanNewsString("FlashNewsTitle");

    /*
     * News summaries displayed in the top on Yahoo! JAPAN News Flash.
     */
    class YahooJapanNewsFlashSummaries extends Design.NewsDesign {
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
              LI_ELEMENTS_QUERY_PROPERTY),
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

    const LIVE_MOVIE_TITLE = getYahooJapanNewsString("LiveMovieTitle");

    /*
     * Panels of news movies on Yahoo! JAPAN News Live.
     */
    class YahooJapanNewsLiveMoviePanels extends Design.NewsDesign {
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
     * The main pain displayed in the left side on Yahoo! JAPAN News.
     */
    class YahooJapanNewsMainPane extends Design.NewsDesign {
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
     * The news feed displayed in the bottom on Yahoo! JAPAN News.
     */
    class YahooJapanNewsFeed extends YahooJapanNewsMainPane {
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
        if (newsParent.tagName != "NAV") {
          return Array.of(newsParent);
        }
        return new Array();
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
     * The pane for an article on Yahoo! JAPAN News.
     */
    class YahooJapanNewsArticlePane extends YahooJapanNewsMainPane {
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
                    skippedTextRegexp: Design.NEWS_VIDEO_TIME_REGEXP
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
        if (newsParent.classList.contains(CONTENTS_WRAP)) {
          return Array.of(newsParent);
        }
        return new Array();
      }

      getObservedNewsItemElements(addedNode) {
        if(addedNode.tagName == "LI") {
          return Array.of(addedNode);
        } else if (addedNode.id == "newsFeed"
          || addedNode.id == "uamods-also_read") {
          return Array.from(addedNode.querySelectorAll("li"));
        }
        return new Array();
      }

      hasComments() {
        return document.getElementById(VIEWABLE_COMMENT) != null;
      }
    }

    /*
     * Lists of news topics displayed in the side on Yahoo! JAPAN News.
     */
    class YahooJapanNewsSideLists extends Design.NewsDesign {
      constructor(setNewsParentElement) {
        super({
            parentProperties: Array.of({
                selectorsForAll: ".yjnSub_list section",
                setNewsElement: setNewsParentElement
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES,
            itemTextProperty: {
                topicSearchProperties: Array.of({
                    skippedTextRegexp: getYahooJapanNewsRegExp("CommentCount")
                  })
              }
        });
      }
    }

    const CATEGORIES = splitYahooJapanNewsString("Categories");
    const CATEGORY_TOPIC_WORDS_MAP = new Map();

    {
      const TOPIC_WORDS = splitYahooJapanNewsString("CategoryTopicWords");
      TOPIC_WORDS.forEach((topicWords, index) => {
          CATEGORY_TOPIC_WORDS_MAP.set(
            CATEGORIES[index], topicWords.split(" "));
        });
    }

    // Returns the set of categories gotten by the specified URL parser.

    function _parseNewsCategory(newsSiteUrlParser) {
      var categorySet = new Set();
      const CATEGORY_PATHS = splitYahooJapanNewsString("CategoryPaths");
      for (let i = 0; i < CATEGORY_PATHS.length; i++) {
        if (newsSiteUrlParser.parse(CATEGORY_PATHS[i])) {
          categorySet.add(CATEGORIES[i]);
          return categorySet;
        }
      }
      const IT_SCIENCE_CATEGORY_PATH =
        getYahooJapanNewsString("ITScienceCategoryPath");
      if (newsSiteUrlParser.parse(IT_SCIENCE_CATEGORY_PATH)) {
        const IT_SCIENCE_CATEGORIES =
          splitYahooJapanNewsString("ITScienceCategories");
        IT_SCIENCE_CATEGORIES.forEach((category) => {
            categorySet.add(category);
            return categorySet;
          });
      }
      categorySet.add(CATEGORIES[0]);
      return categorySet;
    }

    // Display news designs arranged by a selector which selects and excludes
    // topics or senders, waiting the settings from the background script.

    const TOPIC_SET = new Set(CATEGORIES);
    const HEADING_TOPIC_REGEXP = getYahooJapanNewsRegExp("HeadingTopic");

    const PAID_NEWS = getYahooJapanNewsString("PaidNews");

    const CATEGORY_ROOT_PATH = getYahooJapanNewsString("CategoryRootPath");
    const FLASH_PATH = getYahooJapanNewsString("FlashPath");
    const LIVE_PATH = getYahooJapanNewsString("LivePath");
    const ARTICLE_PATHS = splitYahooJapanNewsString("ArticlePaths");
    const TOPICS_PATH = getYahooJapanNewsString("TopicsPath");
    const RANKING_ROOT_PATH = getYahooJapanNewsString("RankingRootPath");
    const RANKING_PATHS = splitYahooJapanNewsString("RankingPaths");

    var newsOpenedUrl = "";
    var newsSiteUrlParser = new NewsSiteUrlParser(newsSite, document.URL);
    newsSiteUrlParser.parseHostName();

    if (newsSiteUrlParser.parseFrom(ARTICLE_PATHS)) { // Articles
      Site.setNewsDesigns(
        new YahooJapanNewsArticlePane(),
        new YahooJapanNewsSideLists((element, newsParents) => {
            var headingElement = element.querySelector("h2");
            if (headingElement != null) {
              var headingText = headingElement.textContent.trim();
              if (headingText.indexOf(PAID_NEWS) < 0) {
                // Add topics for categories enclosed by "(" and ")"
                // in the heading text to the array of topic words.
                var headingTopicMatch =
                  headingText.match(HEADING_TOPIC_REGEXP);
                if (headingTopicMatch != null) {
                  var headingTopics = Array.of(headingTopicMatch[1]);
                  if (headingTopicMatch[2] != undefined) {
                    headingTopics.push(headingTopicMatch[2]);
                  }
                  headingTopics.forEach((headingTopic) => {
                      for (const category of CATEGORIES) {
                        if (category == headingTopic) {
                          Site.addNewsTopicWords(
                            CATEGORY_TOPIC_WORDS_MAP.get(category));
                          break;
                        }
                      }
                    });
                }
              }
            }
            newsParents.push(element);
          }));
    } else { // Paths except for articles started from "/articles" or "/pickup"
      var newsCategorySet = undefined;
      if (newsSiteUrlParser.parseDirectory()) { // Top
        Site.setNewsDesign(new YahooJapanNewsCategoryTopics());
      } else if (newsSiteUrlParser.parse(CATEGORY_ROOT_PATH)) { // Categories
        newsCategorySet = _parseNewsCategory(newsSiteUrlParser);
        Site.setNewsDesign(new YahooJapanNewsCategoryTopics());
      } else if (newsSiteUrlParser.parse(FLASH_PATH)) { // Flash
        Site.setNewsDesign(new YahooJapanNewsFlashSummaries());
      } else if (newsSiteUrlParser.parse(LIVE_PATH)) { // Live
        Site.setNewsDesign(new YahooJapanNewsLiveMoviePanels());
      } else if (newsSiteUrlParser.parse(TOPICS_PATH)) {
        if (newsSiteUrlParser.isCompleted()) { // All Topics
          Site.setNewsDesign(
            new Design.NewsDesign({
              parentProperties: Array.of({
                  selectorsForAll: "." + CONTENTS_WRAP + " ul",
                  setNewsElement: (element, newsParents) => {
                      var prevElement = element.previousElementSibling;
                      if (prevElement != null && prevElement.tagName == "P") {
                        var prevElementText = prevElement.textContent.trim();
                        if (TOPIC_SET.has(prevElementText)) {
                          newsParents.push(element);
                        }
                      }
                    }
                }),
              topicProperties: Design.ONESELF_QUERY_PROPERTIES
            }));
        } else { // Each category's topics
          newsCategorySet = _parseNewsCategory(newsSiteUrlParser);
        }
      } else if (newsSiteUrlParser.parse(RANKING_ROOT_PATH)
        && newsSiteUrlParser.parseFrom(RANKING_PATHS)) { // Ranking
        newsCategorySet = _parseNewsCategory(newsSiteUrlParser);
      }
      Site.setNewsDesigns(
        new YahooJapanNewsFeed(),
        new YahooJapanNewsSideLists((element, newsParents) => {
            var headingElement = element.querySelector("h2");
            if (headingElement != null) {
              var headingText = headingElement.textContent.trim();
              if (headingText.indexOf(PAID_NEWS) >= 0) {
                return;
              }
            }
            newsParents.push(element);
          }));
      // Add topics for categories of this page to the array of topic words.
      if (newsCategorySet == undefined) {
        newsCategorySet = new Set();
        newsCategorySet.add(CATEGORIES[0]);
      }
      newsCategorySet.forEach((newsCategory) => {
          Site.addNewsTopicWords(CATEGORY_TOPIC_WORDS_MAP.get(newsCategory));
        });
      newsOpenedUrl = newsSiteUrlParser.toString();
    }

    Site.displayNewsDesigns(
      newsOpenedUrl, new NewsSelector(newsSite.language));
  });
