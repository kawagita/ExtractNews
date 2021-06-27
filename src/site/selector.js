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

function _newRegExp(regexpString) {
  if (regexpString != undefined) {
    if ((typeof regexpString) != "string") {
      throw newIllegalArgumentException("regexpString");
    } else if (regexpString != "") {
      return new RegExp(regexpString);
    }
  }
  return undefined;
}

const CODE_POINT_SMALL_A = 0x61;
const CODE_POINT_SMALL_Z = 0x7A;

const SMALL_WORD_SET = new Set([
    "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "nor",
    "of", "on", "onto", "or", "over", "the", "to" 
  ]);

/*
 * The selector which settles to show or hide news topics and/or senders by
 * arranging news items on a news site.
 */
class Selector {
  constructor(language) {
    this.wordSeparatorSet = new Set();
    var wordSeparators = getLocalizedString(language + "WordSeparators");
    for (let i = 0; i < wordSeparators.length; i++) {
      var codePoint = wordSeparators.codePointAt(i);
      if (codePoint > 0xFFFF) {
        i++;
      }
      this.wordSeparatorSet.add(codePoint);
    }
    this.wordSuffixes = splitLocalizedString(language + "WordSuffixes");
    this.newsFilteringTargets = undefined;
    this.newsTopicRegExp = undefined;
    this.newsSenderRegExp = undefined;
    this.newsExcludedRegExp = undefined;
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
            + newsFilteringTarget.words.join(WORD_SEPARATOR));
        }
      });
  }

  setNewsSelection(
    topicRegexpString, senderRegexpString, excludedRegexpString) {
    this.newsTopicRegExp = _newRegExp(topicRegexpString);
    this.newsSenderRegExp = _newRegExp(senderRegexpString);
    this.newsExcludedRegExp = _newRegExp(excludedRegexpString);
  }

  _capitalizeWordParts(wordParts, startIndex, endIndex = wordParts.length) {
    var capitalized = false;
    for (let i = startIndex; i < endIndex; i++) {
      // Capitalize the part of a word started from a small alphabet.
      var wordPart = wordParts[i];
      var firstCodePoint = wordPart.codePointAt(0);
      if (firstCodePoint >= CODE_POINT_SMALL_A
        && firstCodePoint <= CODE_POINT_SMALL_Z
        && ! SMALL_WORD_SET.has(wordPart)) {
        wordParts[i] = getCapitalizedString(wordPart);
        capitalized = true;
      }
    }
    return capitalized;
  }

  // Returns true if the specified parts of a word like "dog" or "dog+and+cat"
  // is matching with the specified topic string.

  _matchWord(topic, wordParts, wordBeginningMatched) {
    var firstWordCapital = false;
    var followedWordsCapital = false;
    do {
      topic.wordSearchIndex = topic.string.indexOf(wordParts[0]);
      if (topic.wordSearchIndex >= 0) {
        var wordPartIndex = topic.wordSearchIndex;
        var wordPrecedingLength = 0;
        if (wordBeginningMatched) {
          wordPrecedingLength = wordPartIndex;
        }
        var wordPartEndIndex;
        let i = 0;
        do {
          wordPartEndIndex = wordPartIndex + wordParts[i].length;
          while (wordPrecedingLength > 0) {
            // Check whether characters just before the word of a part are
            // the separator like spaces or symbols, and particles by which its
            // part is concatenated to the preceding word or part.
            wordPartIndex--;
            var precedingCodePoint = topic.string.codePointAt(wordPartIndex);
            if (precedingCodePoint >= 0xDC00 && precedingCodePoint <= 0xDFFF) {
              if (wordPrecedingLength > 0) {
                wordPartIndex--;
                precedingCodePoint = topic.string.codePointAt(wordPartIndex);
                wordPrecedingLength--;
              } else {
                precedingCodePoint = -1;
              }
            }
            if (! this.wordSeparatorSet.has(precedingCodePoint)) {
              // Restart to check the target word form an end of the previous
              // checked part because considered that "dog ... dog and" or
              // "dog and ... dog and cat" if the first part is not checked.
              if (i > 0) {
                wordPartEndIndex = topic.wordSearchIndex;
              }
              wordPrecedingLength = 0;
              i = -1;
              break;
            } else if (i <= 0) {
              // Check only a separator just before the target word.
              break;
            }
            wordPrecedingLength--;
          }
          // Set the index to search the next part to an end of the checked part
          // which has already found before the above loop.
          topic.wordSearchIndex = wordPartEndIndex;
          i++;
          if (i >= wordParts.length) {
            return true;
          }
          wordPartIndex = topic.string.indexOf(wordParts[i], wordPartEndIndex);
          if (i > 0 || wordBeginningMatched) {
            wordPrecedingLength = wordPartIndex - wordPartEndIndex;
          }
        } while (wordPartIndex >= 0);
      }
      // Restart to check the target word in which each part is capitalized.
      if (! firstWordCapital) {
        firstWordCapital = true;
        if (wordBeginningMatched
          && this._capitalizeWordParts(wordParts, 0, 1)) {
          continue;
        }
      } else if (followedWordsCapital) {
        return false;
      }
      followedWordsCapital = true;
      if (! this._capitalizeWordParts(wordParts, 1)) {
        return false;
      }
    } while (true);
  }

  _testTargetWords(target, topicString) {
    var targetMatching = ! target.isWordsExcluded();
    if (target.words.length > 0) {
      var topic = {
          string: topicString,
          wordSearchIndex: 0
        };
      let i = 0;
      do {
        var wordParts = target.words[i].split(WORD_ADDITION);
        var wordBeginningMatched = target.isWordBeginningMatched();
        if (this._matchWord(topic, wordParts, wordBeginningMatched)) {
          if (! target.isWordEndMatched()) {
            Debug.printProperty("Match filtering word", target.words[i]);
            return targetMatching;
          }
          for (const wordSuffix of this.wordSuffixes) {
            // Skip "-shi" or "-san" just after the target word.
            if (topicString.startsWith(wordSuffix, topic.wordSearchIndex)) {
              topic.wordSearchIndex += wordSuffix.length;
              break;
            }
          }
          if (topic.wordSearchIndex >= topicString.length
            || this.wordSeparatorSet.has(
              topicString.codePointAt(topic.wordSearchIndex))) {
            Debug.printProperty("Match filtering word", target.words[i]);
            return targetMatching;
          }
        }
        i++;
      } while (i < target.words.length);
      return ! targetMatching;
    }
    return targetMatching;
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
          if (target.name != ExtractNews.TARGET_BREAK) {
            return target.name == ExtractNews.TARGET_DROP;
          }
          targetBlockSkipped = true;
        }
      }
      // Returns false for the final "BREAK" which is the same as "ACCEPT".
    }
    return false;
  }

  select(topicString, senderString) {
    if (this.newsTopicRegExp != undefined
      && ! this.newsTopicRegExp.test(topicString)) {
      return false;
    }
    if (senderString != undefined
      && this.newsSenderRegExp != undefined
      && ! this.newsSenderRegExp.test(senderString)) {
      return false;
    }
    return true;
  }

  exclude(topicString) {
    return this.newsExcludedRegExp != undefined
      && this.newsExcludedRegExp.test(topicString);
  }
}
