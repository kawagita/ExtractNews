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

const YAHOO_JAPAN_NEWS_FLASH_NEWS_TITLE =
  getYahooJapanNewsString("FlashNewsTitle");
const YAHOO_JAPAN_NEWS_LIVE_MOVIE_TITLE =
  getYahooJapanNewsString("LiveMovieTitle");

const YAHOO_JAPAN_NEWS_CATEGORIES = splitYahooJapanNewsString("Categories");
const YAHOO_JAPAN_NEWS_TOPIC_WORDS_MAP = new Map();

{
  const TOPIC_WORDS = splitYahooJapanNewsString("CategoryTopicWords");
  TOPIC_WORDS.forEach((topicWords, index) => {
      YAHOO_JAPAN_NEWS_TOPIC_WORDS_MAP.set(
        YAHOO_JAPAN_NEWS_CATEGORIES[index], topicWords.split(" "));
    });
}

const YAHOO_JAPAN_NEWS_TOPIC_SET = new Set(YAHOO_JAPAN_NEWS_CATEGORIES);
const YAHOO_JAPAN_NEWS_HEADING_TOPIC_REGEXP =
  getYahooJapanNewsRegExp("HeadingTopic");

const YAHOO_JAPAN_NEWS_PAID_NEWS = getYahooJapanNewsString("PaidNews");

const YAHOO_JAPAN_NEWS_FEED_LIST = "newsFeed_list";
const YAHOO_JAPAN_NEWS_FEED_ITEM = "newsFeed_item";
const YAHOO_JAPAN_NEWS_FEED_ITEM_TITLE = "newsFeed_item_title";
const YAHOO_JAPAN_NEWS_FEED_ITEM_MEDIA = "newsFeed_item_media";

const YAHOO_JAPAN_NEWS_CONTENTS_WRAP = "contentsWrap";

const YAHOO_JAPAN_NEWS_VIEWABLE_COMMENT = "viewable_comment";

/*
 * The list of news topics displayed in the category top on Yahoo! JAPAN News.
 */
class YahooJapanNewsCategoryTopics extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: ".topics"
          }),
        topicProperties: ONESELF_QUERY_PROPERTIES
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

/*
 * Summaries of news topics displayed in the top on Yahoo! JAPAN News Flash.
 */
class YahooJapanNewsFlashSummaries extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: "." + YAHOO_JAPAN_NEWS_CONTENTS_WRAP + " h2",
            setNewsElement: (element, newsParents) => {
                var headingText = element.textContent.trim();
                if (headingText == YAHOO_JAPAN_NEWS_FLASH_NEWS_TITLE) {
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

/*
 * Panels of news movies on Yahoo! JAPAN News Live.
 */
class YahooJapanNewsLiveMoviePanels extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: "." + YAHOO_JAPAN_NEWS_CONTENTS_WRAP + " h2",
            setNewsElement: (element, newsParents) => {
                var headingText = element.textContent.trim();
                if (headingText == YAHOO_JAPAN_NEWS_LIVE_MOVIE_TITLE) {
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

const FEED_ITEM_PAY_SELECTORS = ".newsFeed_item_pay";

/*
 * The main pain displayed in the left side on Yahoo! JAPAN News.
 */
class YahooJapanNewsMainPane extends NewsDesign {
  constructor(designProperty) {
    super(designProperty);
  }

  keepNewsParentDisplaying(newsParent) {
    return newsParent.classList.contains(YAHOO_JAPAN_NEWS_FEED_LIST);
  }

  getNewsItemElements(newsParent) {
    if (! newsParent.classList.contains(YAHOO_JAPAN_NEWS_CONTENTS_WRAP)) {
      var newsItems = Array.from(newsParent.querySelectorAll("li"));
      if (newsParent.tagName != "NAV") {
        for (let i = newsItems.length - 1; i >= 0; i--) {
          if (newsItems[i].querySelector(FEED_ITEM_PAY_SELECTORS) != null) {
            newsItems.splice(i, 1);
          }
        }
      } else {
        // Remove the element of new arrival topic from news items.
        newsItems.shift();
      }
      return newsItems;
    }
    return EMPTY_NEWS_ELEMENTS;
  }

  isNewsItemSelected(newsItem) {
    return newsItem.classList.contains(YAHOO_JAPAN_NEWS_FEED_ITEM);
  }

  getNewsTopicProperties(newsItem) {
    if (newsItem.classList.contains(YAHOO_JAPAN_NEWS_FEED_ITEM)) {
      return Array.of({
          selectors: "." + YAHOO_JAPAN_NEWS_FEED_ITEM_TITLE
        });
    }
    return ONESELF_QUERY_PROPERTIES;
  }

  getNewsSenderProperties(newsItem) {
    if (newsItem.classList.contains(YAHOO_JAPAN_NEWS_FEED_ITEM)) {
      return Array.of({
          selectors: "." + YAHOO_JAPAN_NEWS_FEED_ITEM_MEDIA
        });
    }
    return undefined;
  }
}

const NAVIGATION_SELECTORS = "." + YAHOO_JAPAN_NEWS_CONTENTS_WRAP + " nav";

/*
 * The news feed displayed in the bottom on Yahoo! JAPAN News.
 */
class YahooJapanNewsFeed extends YahooJapanNewsMainPane {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: "." + YAHOO_JAPAN_NEWS_FEED_LIST
          }, {
            selectors: "." + YAHOO_JAPAN_NEWS_FEED_ITEM,
            setNewsElement: (element, newsParents) => {
                var newsFeed = element.parentNode;
                var newsFeedClassList = newsFeed.classList;
                if (! newsFeedClassList.contains(YAHOO_JAPAN_NEWS_FEED_LIST)) {
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
            selectors: NAVIGATION_SELECTORS
          }),
        observedItemProperties: Array.of({
            setNewsElement: (element, newsItems) => {
                if (element.querySelector(FEED_ITEM_PAY_SELECTORS) == null) {
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
    return EMPTY_NEWS_ELEMENTS;
  }

  isRearrangementNewsItemsCleared(changedNodes) {
    // Clear the cache of news items when a subcategory is clicked.
    return true;
  }

  getRearrangementObservedNode() {
    return document.querySelector(NAVIGATION_SELECTORS);
  }
}

/*
 * The pane for an article on Yahoo! JAPAN News.
 */
class YahooJapanNewsArticlePane extends YahooJapanNewsMainPane {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: "." + YAHOO_JAPAN_NEWS_CONTENTS_WRAP
          }, {
            selectorsForAll: "." + YAHOO_JAPAN_NEWS_CONTENTS_WRAP + " ol"
          }, {
            selectorsForAll: "." + YAHOO_JAPAN_NEWS_CONTENTS_WRAP + " ul",
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
                skippedTextRegexp: NEWS_VIDEO_TIME_REGEXP
              })
          },
        observerOptions: SUBTREE_OBSERVER_OPTIONS,
        commentProperties: Array.of({
            selectorsForAll: "#" + YAHOO_JAPAN_NEWS_VIEWABLE_COMMENT,
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
    if (newsParent.classList.contains(YAHOO_JAPAN_NEWS_CONTENTS_WRAP)) {
      return Array.of(newsParent);
    }
    return EMPTY_NEWS_ELEMENTS;
  }

  getObservedNewsItemElements(addedNode) {
    if(addedNode.tagName == "LI") {
      return Array.of(addedNode);
    } else if (addedNode.id == "uamods-also_read" || addedNode.id == "newsFeed") {
      return Array.from(addedNode.querySelectorAll("li"));
    }
    return EMPTY_NEWS_ELEMENTS;
  }

  hasComments() {
    return document.getElementById(YAHOO_JAPAN_NEWS_VIEWABLE_COMMENT) != null;
  }
}

/*
 * Lists of news topics displayed in the side on Yahoo! JAPAN News.
 */
class YahooJapanNewsSideLists extends NewsDesign {
  constructor(setNewsParentElement) {
    super({
        parentProperties: Array.of({
            selectorsForAll: ".yjnSub_list section",
            setNewsElement: setNewsParentElement
          }),
        topicProperties: ONESELF_QUERY_PROPERTIES,
        itemTextProperty: {
            topicSearchProperties: Array.of({
                skippedTextRegexp: getYahooJapanNewsRegExp("CommentCount")
              })
          }
    });
  }
}


const NEWS_MAIN_CATEGORY_SET = new Set([ YAHOO_JAPAN_NEWS_CATEGORIES[0] ]);

function _parseNewsCategory(newsOpenedUrlParser) {
  const CATEGORY_PATHS = splitYahooJapanNewsString("CategoryPaths");
  for (let i = 0; i < CATEGORY_PATHS.length; i++) {
    if (newsOpenedUrlParser.parse(CATEGORY_PATHS[i])) {
      var categorySet = new Set();
      categorySet.add(YAHOO_JAPAN_NEWS_CATEGORIES[i]);
      return categorySet;
    }
  }
  if (newsOpenedUrlParser.parse(
    getYahooJapanNewsString("ITScienceCategoryPath"))) {
    return Site.getNewsWordSet(
      getYahooJapanNewsString("ITScienceCategory"));
  }
  return NEWS_MAIN_CATEGORY_SET;
}

// Displays news designs arranged by a selector which selects and excludes news
// topics or senders, waiting regular expressions from the background script.

if (Site.isLocalized()) {
  const CATEGORY_ROOT_PATH = getYahooJapanNewsString("CategoryRootPath");
  const FLASH_PATH = getYahooJapanNewsString("FlashPath");
  const LIVE_PATH = getYahooJapanNewsString("LivePath");
  const ARTICLE_PATHS = splitYahooJapanNewsString("ArticlePaths");
  const TOPICS_PATH = getYahooJapanNewsString("TopicsPath");
  const RANKING_ROOT_PATH = getYahooJapanNewsString("RankingRootPath");
  const RANKING_PATHS = splitYahooJapanNewsString("RankingPaths");

  var newsTitle = Site.NAME;
  var newsOpenedUrl = "";
  var newsOpenedUrlParser = new Site.OpenedUrlParser(document.URL);
  newsOpenedUrlParser.parseHostName();

  if (newsOpenedUrlParser.parseFrom(ARTICLE_PATHS)) { // Articles
    Site.addNewsDesigns(
      new YahooJapanNewsArticlePane(),
      new YahooJapanNewsSideLists((element, newsParents) => {
          var headingElement = element.querySelector("h2");
          if (headingElement != null) {
            var headingText = headingElement.textContent.trim();
            if (headingText.indexOf(YAHOO_JAPAN_NEWS_PAID_NEWS) >= 0) {
              return;
            }
            // Add topics for categories enclosed by "(" and ")" in the heading
            // text to the array of topic words.
            var headingTopicMatch =
              headingText.match(YAHOO_JAPAN_NEWS_HEADING_TOPIC_REGEXP);
            if (headingTopicMatch != null) {
              var headingTopicSet = Site.getNewsWordSet(headingTopicMatch[1]);
              headingTopicSet.forEach((headingTopic) => {
                  for (const category of YAHOO_JAPAN_NEWS_CATEGORIES) {
                    if (category == headingTopic) {
                      Site.addNewsTopicWords(
                        YAHOO_JAPAN_NEWS_TOPIC_WORDS_MAP.get(category));
                      break;
                    }
                  }
                });
            }
          }
          newsParents.push(element);
        }));
  } else { // Paths except for articles started from "/articles" or "/pickup"
    var newsCategorySet = NEWS_MAIN_CATEGORY_SET;
    if (newsOpenedUrlParser.parseDirectory()) { // Top
      Site.addNewsDesign(new YahooJapanNewsCategoryTopics());
    } else if (newsOpenedUrlParser.parse(CATEGORY_ROOT_PATH)) { // Categories
      newsCategorySet = _parseNewsCategory(newsOpenedUrlParser);
      Site.addNewsDesign(new YahooJapanNewsCategoryTopics());
    } else if (newsOpenedUrlParser.parse(FLASH_PATH)) { // Flash
      Site.addNewsDesign(new YahooJapanNewsFlashSummaries());
    } else if (newsOpenedUrlParser.parse(LIVE_PATH)) { // Live
      Site.addNewsDesign(new YahooJapanNewsLiveMoviePanels());
    } else if (newsOpenedUrlParser.parse(TOPICS_PATH)) {
      if (newsOpenedUrlParser.isCompleted()) { // All Topics
        Site.addNewsDesign(
          new NewsDesign({
            parentProperties: Array.of({
                selectorsForAll: "." + YAHOO_JAPAN_NEWS_CONTENTS_WRAP + " ul",
                setNewsElement: (element, newsParents) => {
                    var previousNode = element.previousElementSibling;
                    if (previousNode != null && previousNode.tagName == "P") {
                      var previousText = previousNode.textContent.trim();
                      if (YAHOO_JAPAN_NEWS_TOPIC_SET.has(previousText)) {
                        newsParents.push(element);
                      }
                    }
                  }
              }),
            topicProperties: ONESELF_QUERY_PROPERTIES
          }));
      } else { // Each category's topics
        newsCategorySet = _parseNewsCategory(newsOpenedUrlParser);
      }
    } else if (newsOpenedUrlParser.parse(RANKING_ROOT_PATH)
      && newsOpenedUrlParser.parseFrom(RANKING_PATHS)) { // Ranking
      newsCategorySet = _parseNewsCategory(newsOpenedUrlParser);
    }
    Site.addNewsDesigns(
      new YahooJapanNewsFeed(),
      new YahooJapanNewsSideLists((element, newsParents) => {
          var headingElement = element.querySelector("h2");
          if (headingElement != null) {
            var headingText = headingElement.textContent.trim();
            if (headingText.indexOf(YAHOO_JAPAN_NEWS_PAID_NEWS) >= 0) {
              return;
            }
          }
          newsParents.push(element);
        }));
    // Add topics for categories of this page to the array of topic words.
    newsCategorySet.forEach((newsCategory) => {
        Site.addNewsTopicWords(
          YAHOO_JAPAN_NEWS_TOPIC_WORDS_MAP.get(newsCategory));
      });
    newsOpenedUrl = newsOpenedUrlParser.toString();
  }

  // Adds the part of a page title before " - Yahoo!" to "Yahoo! JAPAN News".
  var titleText = document.querySelector("title").textContent.trim();
  var titleSuffixIndex =
    titleText.indexOf(getYahooJapanNewsString("TitleSuffix"));
  if (titleSuffixIndex >= 0) {
    newsTitle +=
      Site.NAME_CONCATENATION + titleText.substring(0, titleSuffixIndex);
  }

  Site.displayNewsDesigns(newsTitle, newsOpenedUrl);
}
