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

ExtractNews.readUrlSite(document.URL).then((urlSite) => {
    if (urlSite == undefined || ! urlSite.isEnabled()) {
      Site.displayNewsDesigns();
      return;
    }

    /*
     * Returns the string localized for the specified ID on Slashdot and Srad.
     */
    function getSlashdotString(id, language = LANGUAGE_ENGLISH) {
      return getLocalizedString(
        (language == LANGUAGE_ENGLISH ? "Slashdot": "Srad") + id);
    }

    /*
     * Returns the array of strings separated by commas after localizing for
     * the specified ID on Slashdot and Srad.
     */
    function splitSlashdotString(id, language = LANGUAGE_ENGLISH) {
      return splitLocalizedString(
        (language == LANGUAGE_ENGLISH ? "Slashdot": "Srad") + id);
    }

    /*
     * Returns RegExp object created after localizing for the specified ID
     * suffixed with "RegularExpression" on Slashdot and Srad.
     */
    function getSlashdotRegExp(id, language = LANGUAGE_ENGLISH) {
      return getLocalizedRegExp(
        (language == LANGUAGE_ENGLISH ? "Slashdot": "Srad") + id);
    }

    const STORY_TOPIC_REGEXP =
      getSlashdotRegExp("StoryTopic", urlSite.language);
    const STORY_SOURCE_ENCLOSING_START =
      getSlashdotString("StorySourceEnclosingStart");
    const STORY_SOURCE_ENCLOSING_END =
      getSlashdotString("StorySourceEnclosingEnd");
    const STORY_LINK_ARROW_REGEXP = getSlashdotRegExp("StoryLinkArrow");
    const STORY_CLICKGEN = "clickgen";

    const STORY_BOX_ID_SET =
      new Set(splitSlashdotString("StoryBoxIds", urlSite.language));
    const STORY_BOX_HOT_COMMENTS = getSlashdotString("StoryBoxHotComments");

    const STORY_ARCHIVE_OPTION_SET =
      new Set(splitSlashdotString("StoryArchiveOptions"));
    const STORY_ARCHIVE_YEAR_REGEXP = getSlashdotRegExp("StoryArchiveYear");
    const STORY_ARCHIVE_TITLE_REGEXP = getSlashdotRegExp("StoryArchiveTitle");

    const SPACES_REGEXP = new RegExp(/\s+/, "g");

    /*
     * Returns the string to which spaces are squeezed in the specified text.
     */
    function squeezeSpaces(textString) {
      return textString.trim().replace(SPACES_REGEXP, " ");
    }

    /*
     * Stories on Slashdot and Srad.
     */
    class SlashdotStories extends Design.NewsDesign {
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
                selectors: "h2"
              }),
            itemTextProperty: {
                topicSearchProperties: Array.of({
                    idPrefix: "title"
                  }, {
                    tagName: "a"
                  }),
                topicSearchFirst: true,
                senderFollowing: urlSite.language == LANGUAGE_ENGLISH
              },
            observedProperties: urlSite.language == LANGUAGE_ENGLISH ?
              undefined : Design.ONESELF_QUERY_PROPERTIES,
            observedItemProperties: Array.of({
                setNewsElement: (element, newsItems) => {
                    if (element.tagName == "ARTICLE") {
                      newsItems.push(element);
                    }
                  }
              })
          });
      }

      getNewsSenderText(newsSenderTextNode) {
        if (newsSenderTextNode != null) {
          // Cut the string from a news sender enclosing with "(" and ")".
          var senderText = newsSenderTextNode.textContent.trim();
          var senderStartIndex =
            senderText.lastIndexOf(STORY_SOURCE_ENCLOSING_START) + 1;
          var senderEndIndex =
            senderText.lastIndexOf(STORY_SOURCE_ENCLOSING_END);
          if (senderStartIndex > 0 && senderStartIndex < senderEndIndex) {
            return senderText.substring(senderStartIndex, senderEndIndex);
          }
        }
        return undefined;
      }

      isObservedNewsItemsCleared(removedNodes) {
        // Clear the cache of news items when the displaying start date is
        // changed and the article element of stories are removed on Srad.
        for (const removedNode of removedNodes) {
          if (removedNode.tagName == "ARTICLE") {
            return true;
          }
        }
        return false;
      }
    }

    function _addStoryTopicWords(storyTopics) {
      for (const topicId of splitSlashdotString("TopicIds")) {
        var topicSet =
          new Set(
            splitSlashdotString(topicId + "StoryTopics", urlSite.language));
        for (const storyTopic of storyTopics) {
          if (topicSet.has(storyTopic)) {
            Site.addNewsTopicWords(
              splitSlashdotString(topicId + "TopicWords", urlSite.language));
            break;
          }
        }
      }
    }

    /*
     * The story on Slashdot and Srad.
     */
    class SlashdotStory extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectors: "#firehose",
                setNewsElement: (element, newsParents) => {
                    var storyTopicSet = new Set();
                    var storyHeader = element.querySelector("header");
                    for (let i = 0; i < storyHeader.children.length; i++) {
                      var headerElement = storyHeader.children[i];
                      if (headerElement.id.startsWith("topic-")) {
                        // Add the alt text of story topic images to the array
                        // of topic words.
                        var storyTopicImages =
                          headerElement.querySelectorAll("img");
                        storyTopicImages.forEach((storyTopicImage) => {
                            var storyTopicMatch =
                              storyTopicImage.alt.match(STORY_TOPIC_REGEXP);
                            storyTopicSet.add(storyTopicMatch[1]);
                            if (storyTopicMatch[2] != undefined) { // XXX (YYY)
                              storyTopicSet.add(storyTopicMatch[2]);
                            }
                          });
                        break;
                      }
                    }
                    _addStoryTopicWords(Array.from(storyTopicSet));
                    var storyFooter;
                    if (urlSite.language == LANGUAGE_ENGLISH) {
                      storyFooter = element.querySelector("#newa2footerv2");
                    } else {
                      storyFooter =
                        element.parentNode.querySelector("#a2footer");
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
                    if (! STORY_LINK_ARROW_REGEXP.test(storyTitle)) {
                      newsItems.push(element);
                    }
                  }
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
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
    class SlashdotComments extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: urlSite.language == LANGUAGE_ENGLISH ?
              Array.of({
                  selectors: "#" + STORY_CLICKGEN,
                  setNewsElement: (element, newsParents) => {
                      if (element != null && element.children.length > 0) {
                        var storyRelatedLink = element.firstElementChild;
                        newsParents.push(storyRelatedLink);
                        if (storyRelatedLink.nextElementSibling != null) {
                          newsParents.push(
                            storyRelatedLink.nextElementSibling);
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
            commentProperties: urlSite.language == LANGUAGE_ENGLISH ?
              Array.of({
                  selectors: "#" + STORY_CLICKGEN,
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
        return new Array();
      }
    }

    function _matchStoryBoxHotComments(headerElement) {
      // Check the titile of a story box displayed at randam is "Hot Comments".
      if (headerElement.firstElementChild != null) {
        var storyBoxTitle =
          squeezeSpaces(headerElement.firstElementChild.textContent);
        return storyBoxTitle == STORY_BOX_HOT_COMMENTS;
      }
      return false;
    }

    /*
     * Story boxes displayed in the side on Slashdot and Srad.
     */
    class SlashdotStoryBoxes extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectorsForAll: "#slashboxes header",
                setNewsElement: (element, newsParents) => {
                    var storyBoxIdLength = element.id.indexOf("-title");
                    if (storyBoxIdLength > 0
                      && STORY_BOX_ID_SET.has(
                        element.id.substring(0, storyBoxIdLength))
                      && (urlSite.language != LANGUAGE_ENGLISH
                        || ! _matchStoryBoxHotComments(element))) {
                      newsParents.push(element.parentNode);
                    }
                  }
              }),
            topicProperties: Array.of({
                selectors: "a"
              }),
            commentProperties: urlSite.language == LANGUAGE_ENGLISH ?
              Array.of({
                selectorsForAll: "#slashboxes header",
                setNewsElement: (element, commentNodes) => {
                    if (_matchStoryBoxHotComments(element)) {
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
    class SlashdotStoryArchive extends Design.NewsDesign {
      constructor() {
        super({
            parentProperties: Array.of({
                selectorsForAll: "h1",
                setNewsElement: (element, newsParents) => {
                    // Add the heading title of a story archive to the array
                    // of category words.
                    var storyArchiveTitle = squeezeSpaces(element.textContent);
                    var storyArchiveTitleMatch =
                      storyArchiveTitle.match(STORY_ARCHIVE_TITLE_REGEXP);
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
                    if (! STORY_ARCHIVE_OPTION_SET.has(anchorText)
                      && ! STORY_ARCHIVE_YEAR_REGEXP.test(anchorText)
                      && ! STORY_LINK_ARROW_REGEXP.test(anchorText)) {
                      newsItems.push(element);
                    }
                  }
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
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
    class SlashdotTaggedStories extends Design.NewsDesign {
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

    // Adds topics for the specified keyword of filtering story topics
    // to the array of topic words.

    function _addStoryTopicKeyword(storyTopicKeyword) {
      const STORY_TOPIC_KEYWORDS =
        splitSlashdotString("StoryTopicKeywords", urlSite.language);
      var storyTopics = new Array();
      var storyTopicIndex = STORY_TOPIC_KEYWORDS.indexOf(storyTopicKeyword);
      if (storyTopicIndex >= 0) {
        const STORY_TOPICS =
          splitSlashdotString("StoryTopics", urlSite.language);
        var storyTopicMatch =
          STORY_TOPICS[storyTopicIndex].match(STORY_TOPIC_REGEXP);
        storyTopics.push(storyTopicMatch[1]);
        if (storyTopicMatch[2] != undefined) { // XXX (YYY)
          storyTopics.push(storyTopicMatch[2]);
        }
      } else {
        storyTopics.push(getCapitalizedString(storyTopicKeyword));
      }
      _addStoryTopicWords(storyTopics);
    }

    // Display news designs arranged by a selector which selects and excludes
    // topics or senders, waiting the settings from the background script.

    const STORY_FILTER_QUERY_KEY = getSlashdotString("StoryFilterQueryKey");

    Site.addNewsTopicWords(
      splitSlashdotString("CommonTopicWords", urlSite.language));

    var urlData = getUrlData(urlSite.data, document.URL);

    if (urlData.hostServer != "") { // "xxx.slashdot.org"
      _addStoryTopicKeyword(urlData.hostServer);
    }

    class SlashdotUrlParser extends UrlParser {
      constructor() {
        super(urlData);
      }
      getPathString(pathId) {
        return getSlashdotString(pathId);
      }
      getPathRegExp(pathId) {
        return getSlashdotRegExp(pathId, urlSite.language);
      }
    }

    var urlParser = new SlashdotUrlParser();

    if (urlParser.parseQuery()) {
      var storyFilterValue = urlParser.getQueryValue(STORY_FILTER_QUERY_KEY);
      if (storyFilterValue != undefined) { // "slashdot.org/?hfilter=xxx"
        _addStoryTopicKeyword(storyFilterValue);
      }
    }

    if (urlParser.parseByRegExp("Story")) { // A story
      Site.setNewsDesign(new SlashdotStory(), new SlashdotComments());
    } else if (urlParser.parseByRegExp("StoriesPath")) { // Story list
      Site.setNewsDesign(new SlashdotStories());
      urlParser.parseAll();
      Site.setNewsOpenedUrl(
        urlParser.toString(
          getSlashdotString("StoryViewQueryKey"), STORY_FILTER_QUERY_KEY));
    } else if (urlParser.parse("StoryArchivePath")) { // Story Archive
      Site.setNewsDesign(new SlashdotStoryArchive());
      Site.setNewsOpenedUrl(
        urlParser.toString(
          getSlashdotString("StoryOpQueryKey"),
          getSlashdotString("StoryKeywordQueryKey")));
    } else if (urlParser.parse("TaggedStoriesPath")) { // Tagged XXX
      Site.setNewsDesign(new SlashdotTaggedStories());
      urlParser.parseAll();
      Site.setNewsOpenedUrl(urlParser.toString());
    }
    if (urlSite.language != LANGUAGE_ENGLISH) {
      Site.setNewsDesign(
        // Menus including Apple, Microsoft, and Google on Srad
        new Design.NewsDesign({
            parentProperties: Array.of({
                selectors: "#firehose-sections"
              }),
            topicProperties: Design.ONESELF_QUERY_PROPERTIES
          }));
    }
    Site.setNewsDesign(new SlashdotStoryBoxes());

    Site.setNewsSelector(new Selector(urlSite.language));
    Site.displayNewsDesigns();
  }).catch((error) => {
    Debug.printStackTrace(error);
  });
