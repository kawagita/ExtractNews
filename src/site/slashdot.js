/*
 *  Display news topics or media arranged on the site of Slashdot and Srad.
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
 * Returns the string localized for the specified ID on Slashdot and Srad.
 */
function getSlashdotString(id, language = ExtractNews.SITE_ENGLISH) {
  return ExtractNews.getLocalizedString(
    (language == ExtractNews.SITE_ENGLISH ? "Slashdot": "Srad") + id);
}

/*
 * Returns the array of strings separated by commas after localizing for
 * the specified ID on Slashdot and Srad.
 */
function splitSlashdotString(id, language = ExtractNews.SITE_ENGLISH) {
  return ExtractNews.splitLocalizedString(
    (language == ExtractNews.SITE_ENGLISH ? "Slashdot": "Srad") + id);
}

/*
 * Returns RegExp object created after localizing for the specified ID
 * suffixed with "RegularExpression" on Slashdot and Srad.
 */
function getSlashdotRegExp(id, language = ExtractNews.SITE_ENGLISH) {
  return ExtractNews.getLocalizedRegExp(
    (language == ExtractNews.SITE_ENGLISH ? "Slashdot": "Srad") + id);
}

const SLASHDOT_STORY_TOPIC_REGEXP =
  getSlashdotRegExp("StoryTopic", Site.LANGUAGE);
const SLASHDOT_STORY_SOURCE_ENCLOSING_START =
  getSlashdotString("StorySourceEnclosingStart");
const SLASHDOT_STORY_SOURCE_ENCLOSING_END =
  getSlashdotString("StorySourceEnclosingEnd");
const SLASHDOT_STORY_LINK_ARROW_REGEXP = getSlashdotRegExp("StoryLinkArrow");
const SLASHDOT_STORY_CLICKGEN = "clickgen";

const SLASHDOT_STORY_BOX_NAME_SET =
  new Set(splitSlashdotString("StoryBoxNames", Site.LANGUAGE));
const SLASHDOT_STORY_BOX_TITLE_FOR_COMMENTS =
  getSlashdotString("StoryBoxTitleForComments");

const SLASHDOT_STORY_ARCHIVE_OPTION_SET =
  new Set(splitSlashdotString("StoryArchiveOptions"));
const SLASHDOT_STORY_ARCHIVE_YEAR_REGEXP =
  getSlashdotRegExp("StoryArchiveYear");
const SLASHDOT_STORY_ARCHIVE_TITLE_REGEXP =
  getSlashdotRegExp("StoryArchiveTitle");

const SPACES_REGEXP = new RegExp(/\s+/, "g");

function _squeezeTextSpaces(textString) {
  return textString.trim().replace(SPACES_REGEXP, " ");
}

/*
 * Stories on Slashdot and Srad.
 */
class SlashdotStories extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: "#firehoselist"
          }),
        keepDisplaying: true,
        itemSelected: true,
        itemProperties: Array.of({
            selectorsForAll: "article"
          }),
        topicProperties: Array.of({
            selectors: "h2",
            setNewsElement: (element, newsTopics) => {
                var storyTopicElement = element.previousElementSibling;
                if (storyTopicElement.id.startsWith("topic-")) {
                  newsTopics.push(element);
                }
              }
          }),
        itemTextProperty: {
            topicSearchProperties: Array.of({
                idPrefix: "title"
              }, {
                tagName: "a"
              }),
            topicSearchFirst: true,
            senderFollowing: Site.LANGUAGE == ExtractNews.SITE_ENGLISH
          },
        observedProperties: Site.LANGUAGE == ExtractNews.SITE_ENGLISH ?
          undefined : ONESELF_QUERY_PROPERTIES,
        observedItemProperties: ONESELF_QUERY_PROPERTIES
      });
  }

  getNewsSenderText(newsSenderTextNode) {
    if (newsSenderTextNode != null) {
      // Cut the string from a news sender enclosing with "(" and ")".
      var senderText = newsSenderTextNode.textContent.trim();
      var senderStartIndex =
        senderText.lastIndexOf(SLASHDOT_STORY_SOURCE_ENCLOSING_START) + 1;
      var senderEndIndex =
        senderText.lastIndexOf(SLASHDOT_STORY_SOURCE_ENCLOSING_END);
      if (senderStartIndex > 0 && senderStartIndex < senderEndIndex) {
        return senderText.substring(senderStartIndex, senderEndIndex);
      }
    }
    return undefined;
  }

  isObservedNewsItemsCleared(removedNodes) {
    // Clear the cache of news items when the start date is changed on Srad.
    return true;
  }
}

/*
 * The story on Slashdot and Srad.
 */
class SlashdotStory extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: "#firehose",
            setNewsElement: (element, newsParents) => {
                var storyHeader = element.querySelector("header");
                for (let i = 0; i < storyHeader.children.length; i++) {
                  var headerElement = storyHeader.children[i];
                  if (headerElement.id.startsWith("topic-")) {
                    // Add the alt text of story topic images to the array
                    // of category words.
                    headerElement.querySelectorAll("img").forEach((image) => {
                        var storyTopicMatch =
                          image.alt.match(SLASHDOT_STORY_TOPIC_REGEXP);
                        if (storyTopicMatch[2] != undefined) { // XXX (YYY)
                          Site.addNewsTopicWord(storyTopicMatch[2]);
                        }
                        Site.addNewsTopicWord(storyTopicMatch[1]);
                      });
                    break;
                  }
                }
                var storyFooter;
                if (Site.LANGUAGE == ExtractNews.SITE_ENGLISH) {
                  storyFooter = element.querySelector("#newa2footerv2");
                } else {
                  storyFooter = element.parentNode.querySelector("#a2footer");
                  if (storyFooter != null) {
                    storyFooter = storyFooter.parentNode;
                  }
                }
                newsParents.push(storyFooter);
              }
          }),
        itemLayoutUnchanged: true,
        itemProperties: Array.of({
            selectorsForAll: "a",
            setNewsElement: (element, newsItems) => {
                var storyTitle = element.textContent.trim();
                if (! SLASHDOT_STORY_LINK_ARROW_REGEXP.test(storyTitle)) {
                  newsItems.push(element);
                }
              }
          }),
        topicProperties: ONESELF_QUERY_PROPERTIES
      });
  }

  showNewsItemElement(newsItem) {
    if (newsItem.parentNode.tagName != "SPAN") {
      newsItem.style.display = "";
      return true;
    }
    return super.showNewsItemElement(newsItem);
  }

  hideNewsItemElement(newsItem) {
    if (newsItem.parentNode.tagName != "SPAN") {
      newsItem.style.display = "none";
      return true;
    }
    return super.hideNewsItemElement(newsItem);
  }

  getNewsItemTextProperty(newsItem) {
    return undefined;
  }
}

/*
 * Comments with related stories on Slashdot or Srad.
 */
class SlashdotComments extends NewsDesign {
  constructor() {
    super({
        parentProperties: Site.LANGUAGE == ExtractNews.SITE_ENGLISH ?
          Array.of({
              selectors: "#" + SLASHDOT_STORY_CLICKGEN,
              setNewsElement: (element, newsParents) => {
                  if (element != null && element.children.length > 0) {
                    var storyRelatedLink = element.firstElementChild;
                    newsParents.push(storyRelatedLink);
                    if (storyRelatedLink.nextElementSibling != null) {
                      newsParents.push(storyRelatedLink.nextElementSibling);
                    }
                  }
                }
            }) : undefined,
        keepDisplaying: true,
        itemUnfixed: true,
        observedItemProperties: Array.of({
              setNewsElement: (element, newsItems) => {
                  if (element.tagName == "LI") {
                    newsItems.push(element);
                  }
                }
            }),
        commentProperties: Site.LANGUAGE == ExtractNews.SITE_ENGLISH ?
          Array.of({
              selectors: "#" + SLASHDOT_STORY_CLICKGEN,
              setNewsElement: (element, commentNodes) => {
                  commentNodes.push(element.previousElementSibling);
                }
            }) : Array.of({ selectors: "#comments" })
      });
  }

  getNewsItemElements(newsParent) {
    if (newsParent.tagName == "SECTION") { // Related Links
      return super.getNewsItemElements(newsParent);
    }
    return Array.from(newsParent.querySelectorAll("section"));
  }

  getNewsTopicProperties(newsItem) {
    return Array.of({
        selectors: newsItem.tagName == "LI" ? "a" : "p"
      });
  }

  getObservedNodes(newsParent) {
    if (newsParent.tagName == "SECTION") { // Related Links
      return Array.of(newsParent.querySelector("ul"));
    }
    return EMPTY_NEWS_ELEMENTS;
  }
}

/*
 * Story boxes displayed in the side on Slashdot and Srad.
 */
class SlashdotStoryBoxes extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectorsForAll: "#slashboxes header",
            setNewsElement: (element, newsParents) => {
                var storyBoxTitle = _squeezeTextSpaces(element.textContent);
                var storyBoxNameLength = element.id.indexOf("-title");
                if (storyBoxNameLength > 0
                  && SLASHDOT_STORY_BOX_NAME_SET.has(
                    element.id.substring(0, storyBoxNameLength))
                  && storyBoxTitle != SLASHDOT_STORY_BOX_TITLE_FOR_COMMENTS) {
                  newsParents.push(element.parentNode);
                }
              }
          }),
        topicProperties: Array.of({
            selectors: "a"
          }),
        commentProperties: Site.LANGUAGE == ExtractNews.SITE_ENGLISH ?
          Array.of({
            selectorsForAll: "#slashboxes header",
            setNewsElement: (element, newsParents) => {
                var storyBoxTitle = _squeezeTextSpaces(element.textContent);
                if (storyBoxTitle == SLASHDOT_STORY_BOX_TITLE_FOR_COMMENTS) {
                  commentNodes.push(element.parentNode);
                }
              }
          }) : Array.of({ selectors: "#topcomments" })
      });
  }

  getNewsItemElements(newsParent) {
    var newsItemTagName = "li";
    if (newsParent.id == "thisday") {
      newsItemTagName = "tr";
    }
    return Array.from(newsParent.querySelectorAll(newsItemTagName));
  }
}

/*
 * The story archive on Slashdot.
 */
class SlashdotStoryArchive extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectorsForAll: "h1",
            setNewsElement: (element, newsParents) => {
                // Add the heading title of a story archive to the array
                // of category words.
                var storyArchiveTitleMatch =
                  _squeezeTextSpaces(element.textContent).match(
                    SLASHDOT_STORY_ARCHIVE_TITLE_REGEXP);
                if (storyArchiveTitleMatch != null) {
                  newsParents.push(element.parentNode);
                }
              }
          }),
        keepDisplaying: true,
        itemSelected: true,
        itemProperties: Array.of({
            selectorsForAll: "a",
            setNewsElement: (element, newsItems) => {
                var anchorText = element.textContent.trim();
                if (! SLASHDOT_STORY_ARCHIVE_OPTION_SET.has(anchorText)
                  && ! SLASHDOT_STORY_ARCHIVE_YEAR_REGEXP.test(anchorText)
                  && ! SLASHDOT_STORY_LINK_ARROW_REGEXP.test(anchorText)) {
                  newsItems.push(element);
                }
              }
          }),
        topicProperties: ONESELF_QUERY_PROPERTIES
      });
  }

  _setStoryArchiveInfomation(newsItem, display) {
    if (newsItem.previousElementSibling.tagName == "B") { // Medal
      newsItem.previousElementSibling.style.display = display;
    }
    var nextElement = newsItem.nextElementSibling;
    while (nextElement != null
      && nextElement.tagName != "A" && nextElement.tagName != "B") {
      nextElement.style.display = display;
      if (nextElement.tagName == "SPAN") { // Comment count
        nextElement.classList.toggle("cmntcnt");
      } else if (nextElement.tagName == "BR") {
        break;
      }
      nextElement = nextElement.nextElementSibling;
    }
  }

  showNewsItemElement(newsItem) {
    if (super.showNewsItemElement(newsItem)) {
      this._setStoryArchiveInfomation(newsItem, "");
      return true;
    }
    return false;
  }

  hideNewsItemElement(newsItem) {
    if (super.hideNewsItemElement(newsItem)) {
      this._setStoryArchiveInfomation(newsItem, "none");
      return true;
    }
    return false;
  }
}

/*
 * Tagged stories on Slashdot and Srad.
 */
class SlashdotTaggedStories extends NewsDesign {
  constructor() {
    super({
        parentProperties: Array.of({
            selectors: ".data"
          }),
        itemSelected: true,
        itemProperties: Array.of({
            selectorsForAll: "tr",
            setNewsElement: (element, newsItems) => {
                if (element.firstElementChild.tagName == "TD") {
                  newsItems.push(element);
                }
              }
          }),
        topicProperties: Array.of({
            selectors: "a"
          })
      });
  }
}


const STORY_TOPICS = splitSlashdotString("StoryTopics", Site.LANGUAGE);
const STORY_TOPIC_KEYWORDS =
  splitSlashdotString("StoryTopicKeywords", Site.LANGUAGE);

function _getStoryTopic(storyTopicKeyword) {
  var storyTopicIndex = STORY_TOPIC_KEYWORDS.indexOf(storyTopicKeyword);
  if (storyTopicIndex >= 0) {
    var storyTopicMatch =
      STORY_TOPICS[storyTopicIndex].match(SLASHDOT_STORY_TOPIC_REGEXP);
    if (storyTopicMatch[2] != undefined) { // XXX (YYY)
      Site.addNewsTopicWord(storyTopicMatch[2]);
    }
    Site.addNewsTopicWord(storyTopicMatch[1]);
    return STORY_TOPICS[storyTopicIndex];
  }
  storyTopicKeyword =
    storyTopicKeyword.substring(0, 1).toUpperCase()
    + storyTopicKeyword.substring(1);
  Site.addNewsTopicWord(storyTopicKeyword);
  return storyTopicKeyword;
}

// Displays news designs arranged by a selector which selects and excludes news
// topics or senders, waiting regular expressions from the background script.

if (Site.isLocalized()) {
  const STORIES_PATH_REGEXP = getSlashdotRegExp("StoriesPath", Site.LANGUAGE);
  const STORY_PATH_REGEXP = getSlashdotRegExp("StoryPath");
  const STORY_ARCHIVE_PATH = getSlashdotString("StoryArchivePath");
  const TAGGED_STORIES_PATH = getSlashdotString("TaggedStoriesPath");

  const STORY_VIEW_QUERY_KEY = getSlashdotString("StoryViewQueryKey");
  const STORY_FILTER_QUERY_KEY = getSlashdotString("StoryFilterQueryKey");
  const STORY_OP_QUERY_KEY = getSlashdotString("StoryOpQueryKey");
  const STORY_KEYWORD_QUERY_KEY = getSlashdotString("StoryKeywordQueryKey");

  // Adds "Slashdot" or "Srad" to the array of topic words, firstly.
  Site.addNewsTopicWord(Site.NAME);

  var newsTitle = undefined;
  var newsOpenedUrl = "";
  var newsOpenedUrlParser = new Site.OpenedUrlParser(document.URL);
  newsOpenedUrlParser.parseHostName();
  if (newsOpenedUrlParser.hostServer != "") { // "xxx.slashdot.org"
    newsTitle =
      Site.NAME + Site.NAME_CONCATENATION
      + _getStoryTopic(newsOpenedUrlParser.hostServer);
  }
  if (newsOpenedUrlParser.parseQuery()) {
    var storyFilterValue =
      newsOpenedUrlParser.getQueryValue(STORY_FILTER_QUERY_KEY);
    if (storyFilterValue != undefined) { // "slashdot.org/?hfilter=xxx"
      newsTitle =
        Site.NAME + Site.NAME_CONCATENATION + _getStoryTopic(storyFilterValue);
    }
  }

  if (newsOpenedUrlParser.match(STORY_PATH_REGEXP)) { // A story
    Site.addNewsDesigns(new SlashdotStory(), new SlashdotComments());
    newsTitle = undefined;
  } else if (newsOpenedUrlParser.match(STORIES_PATH_REGEXP)) { // Stories
    Site.addNewsDesign(new SlashdotStories());
    newsOpenedUrlParser.parseAll();
    if (newsTitle == undefined
      && (Site.LANGUAGE == ExtractNews.SITE_ENGLISH
        || ! newsOpenedUrlParser.path.startsWith(
          getSlashdotString("StoryArchivePath", Site.LANGUAGE)))) { // Top page
      newsTitle = Site.NAME;
    }
    newsOpenedUrl =
      newsOpenedUrlParser.toString(
        Array.of(STORY_VIEW_QUERY_KEY, STORY_FILTER_QUERY_KEY));
  } else if (newsOpenedUrlParser.parse(STORY_ARCHIVE_PATH)) { // Story Archive
    Site.addNewsDesign(new SlashdotStoryArchive());
    newsOpenedUrl =
      newsOpenedUrlParser.toString(
        Array.of(STORY_OP_QUERY_KEY, STORY_KEYWORD_QUERY_KEY));
  } else if (newsOpenedUrlParser.parse(TAGGED_STORIES_PATH)) { // Tagged XXX
    Site.addNewsDesign(new SlashdotTaggedStories());
    newsOpenedUrlParser.parseAll();
    newsOpenedUrl = newsOpenedUrlParser.toString();
    newsTitle = undefined;
  }
  if (Site.LANGUAGE != ExtractNews.SITE_ENGLISH) {
    Site.addNewsDesign(
      // Menus including Apple, Microsoft, and Google on Srad
      new NewsDesign({
          parentProperties: Array.of({
              selectors: "#firehose-sections"
            }),
          topicProperties: ONESELF_QUERY_PROPERTIES
        }));
  }
  Site.addNewsDesign(new SlashdotStoryBoxes());

  if (newsTitle == undefined) {
    newsTitle = Site.NAME + Site.NAME_CONCATENATION;
    // Adds the part of a page title to the name of "Slashdot" or "Srad".
    var titleText =
      _squeezeTextSpaces(document.querySelector("title").textContent);
    var titleMatch =
      titleText.match(getSlashdotRegExp("TitleSuffix", Site.LANGUAGE));
    if (titleMatch != null) { // Before " - Slashdot" or " (on|for) Slashdot"
      newsTitle += titleText.substring(0, titleMatch.index);
    } else {
      newsTitle += titleText;
    }
  }

  Site.displayNewsDesigns(newsTitle, newsOpenedUrl);
}
