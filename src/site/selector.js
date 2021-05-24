/*
 *  Define the class to select news topics and/or senders on a news site.
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

function _newRegexp(regexpString) {
  if (regexpString != undefined) {
    if ((typeof regexpString) != "string") {
      throw newIllegalArgumentException("regexpString");
    } else if (regexpString != "") {
      return new RegExp(regexpString);
    }
  }
  return undefined;
}

/*
 * The selector which settles to show or hide news topics and/or senders by
 * arranging news items on a news site.
 */
class NewsSelector {
  constructor(language) {
    this.wordSeparatorSet = new Set();
    var wordSeparators =
      ExtractNews.getLocalizedString(language + "WordSeparators");
    for (let i = 0; i < wordSeparators.length; i++) {
      var codePoint = wordSeparators.codePointAt(i);
      if (codePoint > 0xFFFF) {
        i++;
      }
      this.wordSeparatorSet.add(codePoint);
    }
    this.wordSuffixes =
      ExtractNews.splitLocalizedString(language + "WordSuffixes");
    this.newsFilteringTargets = undefined;
    this.newsTopicRegexp = undefined;
    this.newsSenderRegexp = undefined;
    this.newsExcludedRegexp = undefined;
  }

  setNewsFilterings(filteringTargetObjects = new Array()) {
    if (! Array.isArray(filteringTargetObjects)) {
      throw newIllegalArgumentException("filteringTargetObjects");
    }
    this.newsFilteringTargets = new Array();
    filteringTargetObjects.forEach((filteringTargetObject) => {
        var newsFilteringTarget =
          new ExtractNews.FilteringTarget(filteringTargetObject);
        this.newsFilteringTargets.push(newsFilteringTarget);
        if (Debug.isLoggingOn()) {
          Debug.dump("\t", newsFilteringTarget.name,
            (newsFilteringTarget.isWordsExcluded() ? "! " : "  ")
            + newsFilteringTarget.words.join(","));
        }
      });
  }

  setNewsSelection(
    topicRegexpString, senderRegexpString, excludedRegexpString) {
    this.newsTopicRegexp = _newRegexp(topicRegexpString);
    this.newsSenderRegexp = _newRegexp(senderRegexpString);
    this.newsExcludedRegexp = _newRegexp(excludedRegexpString);
  }

  _testTargetWords(target, topicString) {
    var targetMatched = ! target.isWordsExcluded();
    if (target.words.length > 0) {
      let i = 0;
      do {
        var targetWord = target.words[i];
        var wordSearchIndex = topicString.indexOf(targetWord);
        if (wordSearchIndex >= 0) {
          do {
            var wordMatched = true;
            if (target.isWordBeginningMatched() && wordSearchIndex >= 1) {
              // Check whether the character just before the target word is
              // a separator like spaces or symbols, and particles by which
              // the preceding noun is suffixed.
              var wordPrecedingCodePoint =
                topicString.codePointAt(wordSearchIndex - 1);
              if (wordPrecedingCodePoint >= 0xDC00
                && wordPrecedingCodePoint <= 0xDFFF
                && wordSearchIndex >= 2) {
                wordPrecedingCodePoint =
                  topicString.codePointAt(wordSearchIndex - 2);
              }
              wordMatched = this.wordSeparatorSet.has(wordPrecedingCodePoint);
            }
            wordSearchIndex += targetWord.length;
            if (wordMatched) {
              if (! target.isWordEndMatched()) {
                Debug.printProperty("Match filtering word", targetWord);
                return targetMatched;
              }
              for (const wordSuffix of this.wordSuffixes) {
                // Skip "-shi" or "-san" just after the target word.
                if (topicString.startsWith(wordSuffix, wordSearchIndex)) {
                  wordSearchIndex += wordSuffix.length;
                  break;
                }
              }
              if (wordSearchIndex >= topicString.length
                || this.wordSeparatorSet.has(
                  topicString.codePointAt(wordSearchIndex))) {
                Debug.printProperty("Match filtering word", targetWord);
                return targetMatched;
              }
            }
            wordSearchIndex = topicString.indexOf(targetWord, wordSearchIndex);
          } while (wordSearchIndex >= 0);
        }
        i++;
      } while (i < target.words.length);
      return ! targetMatched;
    }
    return targetMatched;
  }

  drop(topicString) {
    if (this.newsFilteringTargets != undefined) {
      var targetBlockSkipped = false;
      for (let i = 0; i < this.newsFilteringTargets.length; i++) {
        var target = this.newsFilteringTargets[i];
        if (targetBlockSkipped) {
          targetBlockSkipped = ! target.terminatesBlock();
          continue;
        } else if (this._testTargetWords(target, topicString)) {
          if (target.name != ExtractNews.TARGET_RETURN) {
            return target.name == ExtractNews.TARGET_DROP;
          }
          targetBlockSkipped = true;
        }
      }
      // Returns false for the final "RETURN" which is the same as "ACCEPT".
    }
    return false;
  }

  select(topicString, senderString) {
    if (this.newsTopicRegexp != undefined
      && ! this.newsTopicRegexp.test(topicString)) {
      return false;
    }
    if (senderString != undefined
      && this.newsSenderRegexp != undefined
      && ! this.newsSenderRegexp.test(senderString)) {
      return false;
    }
    return true;
  }

  exclude(topicString) {
    return this.newsExcludedRegexp != undefined
      && this.newsExcludedRegexp.test(topicString);
  }
}
