/*
 *  Define functions and constant variables for the text or regular expression.
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
 * Text functions and constant variables.
 */
ExtractNews.Text = (() => {
    const EMPTY_STRING = "";

    const _Text = {
      EMPTY_STRING: EMPTY_STRING,
      COLON: ":"
    };

    // Halfwidth and fullwidth strings used by the localization.
    const HALFWIDTH_CODE_POINTS = new Array();
    const FULLWIDTH_CODE_POINTS = new Array();

    var fullwidthChars = getLocalizedString("FullwidthCharacters");
    for (let i = 0; i < fullwidthChars.length; i++) {
      var codePoint = fullwidthChars.codePointAt(i);
      if (codePoint > 0xFFFF) {
        i++;
      }
      FULLWIDTH_CODE_POINTS.push(codePoint);
    }
    var halfwidthChars = getLocalizedString("HalfwidthCharacters");
    halfwidthChars.split("").forEach((halfwidthChar) => {
        var halfwidthCodePoint = halfwidthChar.codePointAt(0);
        if (halfwidthCodePoint == 0x3A) {
          _Text.COLON = String.fromCodePoint(
            FULLWIDTH_CODE_POINTS[HALFWIDTH_CODE_POINTS.length]);
        }
        HALFWIDTH_CODE_POINTS.push(halfwidthCodePoint);
      });

    // Unicode code points of line-breaks
    //
    // 000A..000D  LINE FEED, LINE TABULATION, FORM FEED, CARRIAGE RETURN
    // 0085        NEXT LINE
    // 2028..2029  LINE SEPARATOR, PARAGRAPH SEPARATOR
    const LINE_BREAKS = "\u000A\u000B\u000C\u000D\u0085\u2028\u2029";

    // Unicode code points of space characters
    //
    // 0009        CHARACTER TABULATION
    // 0020        SPACE
    // 00A0        NO-BREAK SPACE
    // 1680        OGHAM SPACE MARK
    // 2000..200A  EN/EM QUAD, EN/EM/THREE-PER-EM/FOUR-PER-EM/SIX-PER-EM SPACE,
    //             FIGURE SPACE, PUNCTUATION SPACE, THIN SPACE, HAIR SPACE
    // 202F        NARROW NO-BREAK SPACE
    // 205F        MEDIUM MATHEMATICAL SPACE
    // 3000        IDEOGRAPHIC SPACE
    const LINE_BREAK_SPACES = "\u0009\u0020\u1680\u2000\u2001\u2002\u2003"
      + "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u3000";
    const NO_BREAK_SPACES = "\u00A0\u205F";
    const SPACES = LINE_BREAK_SPACES + NO_BREAK_SPACES;

    // Unicode code points categorized as fullwidth characters (Ambiguous/Wide)
    // considering East Asian Width of Unicode Standard Annex #11 referened by
    // http://www.unicode.org/reports/tr11/
    //
    // Many characters are divided by "Neutral" or "Ambiguous" which uncertain
    // about its reason, so that latin letters treat as halfwidth and symbles
    // or marks treat as fullwidth characters.
    //
    // 00A7..00A8  Latin-1 Supplement (SECTION SIGN..DIAERESIS,
    // 00A9..00AE   COPYRIGHT SIGN (emoji), REGISTERED SIGN (emoji)
    // 00B0..00B1   DEGREE SIGN..PLUS-MINUS SIGN,
    // 00B4         ACUTE ACCENT,
    // 00B6         PILCROW SIGN,
    // 00D7         MULTIPLICATION SIGN,
    // 00F7         DIVISION SIGN)
    // 2010        General Punctuation (HYPHEN,
    // 2014..2016   EM DASH..DOUBLE VERTICAL LINE,
    // 2018..2019   LEFT SINGLE QUOTATION MARK..RIGHT SINGLE QUOTATION MARK,
    // 201C..201D   LEFT DOUBLE QUOTATION MARK..RIGHT DOUBLE QUOTATION MARK,
    // 2020..2021   DAGGER..DOUBLE DAGGER,
    // 2025..2026   TWO DOT LEADER..THREE DOT LEADER,
    // 2030..2033   PER MILLE SIGN, PER TEN THOUSAND SIGN, PRIME, DOUBLE PRIME,
    // 203B..203C   REFERENCE MARK, DOUBLE EXCLAMATION MARK (emoji)
    // 2047..2049   DOUBLE QUESTION MARK, QUESTION EXCLAMATION MARK,
    //              EXCLAMATION QUESTION MARK (emoji))
    // 2100..23FF  Letterlike Symbols (contains emoji), Number Forms,
    //             Arrows (contain emoji), Mathematical Operators,
    //             Miscellaneous Technical (contains emoji)
    // 2460..24FF  Enclosed Alphanumerics (contain emoji)
    // 25A0..27FF  Geometric Shapes, Miscellaneous Symbols (contain emoji),
    //             Dingbats (contain emoji),
    //             Miscellaneous Mathematical Symbols-A, Supplemental Arrows-A
    // 2900..297F  Supplemental Arrows-B (contains emoji)
    // 2B00..2BFF  Miscellaneous Symbols and Arrows (contain emoji)
    // 2E80..A4CF  CJK Radicals Supplement, Kangxi Radicals,
    //             Ideographic Description Characters,
    //             CJK Symbols and Punctuation (contains emoji), Hiragana,
    //             Katakana, Bopomofo, Hangul Compatibility Jamo, Kanbun,
    //             Bopomofo Extended, CJK Strokes,
    //             Katakana Phonetic Extensions,
    //             Enclosed CJK Letters and Months (contain emoji),
    //             CJK Compatibility, CJK Unified Ideographs Extension A,
    //             Yijing Hexagram Symbols, CJK Unified Ideographs,
    //             Yi Syllables/Radicals
    // AC00..D7AF  Hangul Syllables
    // E000..FAFF  Private Use Area, CJK Compatibility Ideographs
    // FF01..FF60  Halfwidth and Fullwidth Forms (FULLWIDTH EXCLAMATION MARK
    //             ..FULLWIDTH RIGHT WHITE PARENTHESIS)
    // FFE0..FFE6  Halfwidth and Fullwidth Forms (FULLWIDTH CENT SIGN
    //             ..FULLWIDTH WON SIGN)
    //
    // 1B000..1B2FF  Kana Supplement, Kana Extended-A, Small Kana Extension,
    //               Nushu
    // 1F000..1F02F  Mahjong Tiles (Wide is only 1F004 defined by emoji)
    // 1F0A0..1F0FF  Playing Cards (Wide is only 1F0CF defined by emoji)
    // 1F100..1F1AD  Enclosed Alphanumeric Supplement (contains emoji
    //               and except for REGIONAL INDICATOR SYMBOL LETTER A..Z)
    // 1F200..1FBFF  Enclosed Ideographic Supplement,
    //               Miscellaneous Symbols and Pictographs (emoji),
    //               Emoticons (emoji), Ornamental Dingbats,
    //               Transport and Map Symbols (contain emoji),
    //               Alchemical Symbols, Geometric Shapes Extended,
    //               Supplemental Arrows-C,
    //               Supplemental Symbols and Pictographs (emoji),
    //               Chess Symbols, Symbols and Pictographs Extended-A (emoji),
    //               Symbols for Legacy Computing
    // 20000..2FFFD  CJK Unified Ideographs Extension B/C/D/E/F, <reserved>
    // 30000..3FFFD  CJK Unified Ideograph Extension G, <reserved>

    function _isCodeFullwidth(codePoint) {
      return (codePoint >= 0xA7 && codePoint <= 0xA9) || codePoint == 0xAE
        || codePoint == 0xB0 || codePoint == 0xB1 || codePoint == 0xB4
        || codePoint == 0xB6 || codePoint == 0xD7 || codePoint == 0xF7
        || codePoint == 0x2010 || (codePoint >= 0x2014 && codePoint <= 0x2016)
        || codePoint == 0x2018 || codePoint == 0x2019 || codePoint == 0x2020
        || codePoint == 0x2021 || codePoint == 0x2025 || codePoint == 0x2026
        || (codePoint >= 0x2030 && codePoint <= 0x2033) || codePoint == 0x203B
        || codePoint == 0x203C || (codePoint >= 0x2047 && codePoint <= 0x2049)
        || (codePoint >= 0x2100 && codePoint <= 0x23FF)
        || (codePoint >= 0x2460 && codePoint <= 0x24FF)
        || (codePoint >= 0x25A0 && codePoint <= 0x27FF)
        || (codePoint >= 0x2900 && codePoint <= 0x297F)
        || (codePoint >= 0x2B00 && codePoint <= 0x2BFF)
        || (codePoint >= 0x2E80 && codePoint <= 0xA4CF)
        || (codePoint >= 0xAC00 && codePoint <= 0xD7AF)
        || (codePoint >= 0xE000 && codePoint <= 0xFAFF)
        || (codePoint >= 0xFF01 && codePoint <= 0xFF60)
        || (codePoint >= 0xFFE0 && codePoint <= 0xFFE6)
        || (codePoint >= 0x1B000 && codePoint <= 0x1B2FF)
        || (codePoint >= 0x1F000 && codePoint <= 0x1F02F)
        || (codePoint >= 0x1F0A0 && codePoint <= 0x1F1AD)
        || (codePoint >= 0x1F200 && codePoint <= 0x1FBFF)
        || (codePoint >= 0x20000 && codePoint <= 0x2FFFD)
        || (codePoint >= 0x30000 && codePoint <= 0x3FFFD);
    }

    // Unicode code points of formatting characters
    //
    // 061C        ARABIC LETTER MARK
    // 200E..200F  LEFT-TO-RIGHT/RIGHT-TO-LEFT MARK
    // 202A..202E  LEFT-TO-RIGHT/RIGHT-TO-LEFT EMBEDDING, POP DIRECTIONAL
    //             FORMATTING, LEFT-TO-RIGHT/RIGHT-TO-LEFT OVERRIDE
    // 2066..2069  LEFT-TO-RIGHT/RIGHT-TO-LEFT ISOLATE, FIRST STRONG ISOLATE,
    //             POP DIRECTIONAL ISOLATE
    // 1D173..1D17A  MUSICAL SYMBOL BEGIN/END BEAM,
    //               MUSICAL SYMBOL BEGIN/END TIE
    //               MUSICAL SYMBOL BEGIN/END SLUR,
    //               MUSICAL SYMBOL BEGIN/END PHRASE

    function _isCodeFormattingCharacters(codePoint) {
      return codePoint == 0x061C || codePoint == 0x200E || codePoint == 0x200F
        || (codePoint >= 0x202A && codePoint <= 0x202E)
        || (codePoint >= 0x2066 && codePoint <= 0x2068)
        || (codePoint >= 0x1D173 && codePoint <= 0x1D17A);
    }

    // Unicode code points of invisible operators
    //
    // 2061..2064  FUNCTION APPLICATION, INVISIBLE TIMES/SEPARATOR/PLUS

    const INVISIBLE_OPERATORS = "\u2061\u2062\u2063\u2064";
    const INVISIBLE_OPERATOR_SET = new Set();

    for (let i = 0; i < INVISIBLE_OPERATORS.length; i++) {
      INVISIBLE_OPERATOR_SET.add(INVISIBLE_OPERATORS.codePointAt(i));
    }

    function _isCodeInvisibleOperator(codePoint) {
      return INVISIBLE_OPERATOR_SET.has(codePoint);
    }

    // Unicode code points of zero width formatting characters
    //
    // 00AD  SOFT HYPHEN
    // 200B  ZERO WIDTH SPACE
    // 2060  WORD JOINER
    // FEFF  ZERO WIDTH NO-BREAK SPACE
    const ZERO_WIDTH_FORMATTING_CHARACTERS = "\u00AD\u200B\u2060\uFEFF";
    const ZERO_WIDTH_FORMATTING_CHARACTER_SET = new Set();

    for (let i = 0; i < ZERO_WIDTH_FORMATTING_CHARACTERS.length; i++) {
      ZERO_WIDTH_FORMATTING_CHARACTER_SET.add(
        ZERO_WIDTH_FORMATTING_CHARACTERS.codePointAt(i));
    }

    function _isCodeZeroWidthFormattingCharacters(codePoint) {
      return ZERO_WIDTH_FORMATTING_CHARACTER_SET.has(codePoint);
    }

    // Unicode code points of zero width characters placed between two
    // characters which are respectively printed
    //
    // 200C  ZERO WIDTH NON JOINER
    const ZERO_WIDTH_NON_JOINER = 0x200C;

    // Unicode code points of zero width characters placed between two
    // characters which are graphically connected
    //
    // 180E  MONGOLIAN VOWEL SEPARATOR
    // 200D  ZERO WIDTH JOINER
    const MONGOLIAN_VOWEL_SEPARATOR = 0x180E;
    const ZERO_WIDTH_JOINER = 0x200D;

    function _isCodeLigature(codePoint) {
      return codePoint == MONGOLIAN_VOWEL_SEPARATOR
        || codePoint == ZERO_WIDTH_JOINER;
    }

    // Unicode code points of characters which has variations
    //
    // 0030        DIGIT ZERO
    // 1800..18AF  Mongolian
    function _hasCodeVariation(codePoint) {
      return codePoint == 0x0030
        || (codePoint == 0x1800 && codePoint <= 0x18AF);
    }

    // Unicode code points to change a character to other variation form by
    // placing a selector at the end of it
    //
    // 180B..180D  MONGOLIAN FREE VARIATION SELECTOR ONE/TWO/THREE
    // FE00..FE0F  Variation Selectors
    // E0100..E01EF  Variation Selectors Supplement

    function _isCodeVariationSelector(codePoint) {
      return (codePoint >= 0x180B && codePoint <= 0x180D)
        || (codePoint >= 0xFE00 && codePoint <= 0xFE0F)
        || (codePoint >= 0xE0100 && codePoint <= 0xE01EF);
    }

    // Unicode code points of emoji sequences considering 1.4.9 EBNF and Regex
    // in UTS #51 referened by https://www.unicode.org/reports/tr51/
    //
    // 20E3          COMBINING ENCLOSING KEYCAP
    // 1F1E6..1F1FF  REGIONAL INDICATOR SYMBOL LETTER A..Z
    // 1F3FB..1F3FF  EMOJI MODIFIER FITZPATRICK TYPE-1-2/3/4/5/6
    // E0001..E007F  Tags (only E0001 is deprecated and E007F is TERM tag)
    const COMBINING_ENCLOSING_KEYCAP = 0x20E3;
    const VARIATION_SELECTOR_16 = 0xFE0F;

    function _isCodeRegionalIndicator(codePoint) {
      return codePoint >= 0x1F1E6 && codePoint <= 0x1F1FF;
    }

    function _isCodeEmojiModifier(codePoint) {
      return codePoint >= 0x1F3FB && codePoint <= 0x1F3FF;
    }

    const CANCEL_TAG = 0xE007F;

    function _isCodeTag(codePoint) {
      return codePoint >= 0xE0020 && codePoint <= 0xE007E;
    }

    // Unicode code point of an escape character
    const ESCAPE_CHARACTER = 0x5C;

    // Iterates each grapheme cluster in the specified Unicode string and calls
    // the specified callback function for it while true is returned, and then
    // returns the position of UTF-16 characters.
    //
    // This implementation expects the sequence of valid Unicode characters
    // so that doesn't check whether the code point followed by ZERO WIDTH
    // JOINER, variation selectors, EMOJI MODIFIER, or tags is valid except
    // for ASCII and characters treated as halfwidth, or above followers.

    function _iterateUnicodeCharacters(charsString, callback) {
      if (charsString == EMPTY_STRING) {
        return;
      }
      var grapheme = undefined;
      var graphemeContinued = false;
      var codeRegionalIndicator = false;
      var codeEmojiModification = false;
      var codeTagModifier = false;
      var codeLigature = false;
      var codeEscapeCharacter = false;
      var charIndex = 0;
      do {
        var codePoint = charsString.codePointAt(charIndex++);
        if (codePoint > 0xFFFF) {
          charIndex++;
        }
        var codeWidth = 1;

        if (_isCodeFullwidth(codePoint)) {
          codeWidth = 2;
        } else if (_isCodeFormattingCharacters(codePoint)
          || _isCodeInvisibleOperator(codePoint)
          || _isCodeZeroWidthFormattingCharacters(codePoint)) {
          codeWidth = 0; // Parse a character of zero width.
        }

        if (! codeLigature && ! codeEscapeCharacter) {
          if (graphemeContinued) {
            if (codeRegionalIndicator) {
              codeRegionalIndicator = false;
              // Parse the flag sequence by two regional indicators, otherwise,
              // the second character is the first of the next grapheme.
              if (_isCodeRegionalIndicator(codePoint)) {
                graphemeContinued = false;
                grapheme.codePoints.push(codePoint);
                grapheme.codeWidth = 2;
                if (! callback(grapheme)) {
                  break;
                }
                continue;
              } else if (! callback(grapheme)) {
                graphemeContinued = false;
                break;
              }
            } else if (codeEmojiModification) {
              codeEmojiModification = false;
              // Parse the end of an emoji modification if U+20E3 exists,
              // or continue to the zwj sequence if U+200D exists, otherwise,
              // use the code point as the first of the next grapheme.
              if (codePoint == COMBINING_ENCLOSING_KEYCAP) {
                grapheme.codePoints.push(codePoint);
                continue;
              } else if (codePoint == ZERO_WIDTH_JOINER) {
                grapheme.codePoints.push(codePoint);
                codeLigature = true;
                continue;
              } else if (! callback(grapheme)) {
                graphemeContinued = false;
                break;
              }
            } else if (codeTagModifier) {
              // Parse the end of a tag modifier if U+E007F exists, or parse
              // the code point into tags from U+E0020 to U+E007E, otherwise,
              // use it as the first of the next grapheme.
              if (codePoint == CANCEL_TAG) {
                graphemeContinued = false;
                grapheme.codePoints.push(codePoint);
                if (! callback(grapheme)) {
                  break;
                }
                codeTagModifier = false;
                continue;
              } else if (_isCodeTag(codePoint)) {
                grapheme.codePoints.push(codePoint);
                continue;
              } else if (! callback(grapheme)) { // Invalid emoji sequence
                graphemeContinued = false;
                break;
              }
            } else if (_isCodeLigature(codePoint)) {
              // Parse the character for a code point connected with
              // the following sequence of characters.
              grapheme.codePoints.push(codePoint);
              codeLigature = true;
              continue;
            } else if (_isCodeEmojiModifier(codePoint)) {
              // Parse the code point into an emoji modifier.
              grapheme.codePoints.push(codePoint);
              continue;
            } else if (_isCodeTag(codePoint)) {
              // Parse the code point as the start of an tag modifier.
              grapheme.codePoints.push(codePoint);
              codeTagModifier = true;
              continue;
            } else if (_isCodeVariationSelector(codePoint)) {
              // Parse the end of a grapheme by variation selectors, otherwise,
              // the code point is the first of the next grapheme.
              grapheme.codePoints.push(codePoint);
              if (codePoint == VARIATION_SELECTOR_16) {
                // Parse U+FE0F into the emoji modification.
                codeEmojiModification = true;
              } else if (! callback(grapheme)) {
                graphemeContinued = false;
                break;
              }
              continue;
            } else if (! callback(grapheme)) {
              graphemeContinued = false;
              break;
            }
          }

          grapheme = {
            codePoints: new Array(),
            codeWidth: codeWidth,
            codeEscaped: false
          };

          if (codePoint == ESCAPE_CHARACTER) {
            // The first backslash is not stored to the array of code points.
            graphemeContinued = true;
            grapheme.codeEscaped = true;
            codeEscapeCharacter = true;
            continue;
          }
        }

        // Parse a code point into the first character of a grapheme cluster
        // or a character preceded by U+200D in a ligarture.
        grapheme.codePoints.push(codePoint);
        graphemeContinued = false;

        if (_isCodeRegionalIndicator(codePoint)) {
          if (! codeLigature) {
            // Start two regional indicators from this code point.
            graphemeContinued = true;
            codeRegionalIndicator = true;
          } else if (! callback(grapheme)) { // Invalid regional indicators
            break;
          }
        } else if ((codeWidth <= 1 && ! _hasCodeVariation(codePoint))
          || codePoint == ZERO_WIDTH_NON_JOINER || _isCodeLigature(codePoint)
          || _isCodeVariationSelector(codePoint) || _isCodeTag(codePoint)) {
          // No variant separator or joiner preceded by these code points.
          if (! callback(grapheme)) {
            break;
          }
        } else {
          graphemeContinued = true;
        }
        codeLigature = false;
        codeEscapeCharacter = false;
      } while (charIndex < charsString.length);

      if (graphemeContinued) {
        if (codeEscapeCharacter) {
          // Treat "\" as an ordinary character if not followed by any one.
          grapheme.codePoints.push(ESCAPE_CHARACTER);
          grapheme.codeEscaped = false;
        }
        callback(grapheme);
      }

      return charIndex;
    }

    function _getUnicodeCharString(grapheme) {
      var charString = EMPTY_STRING;
      if (grapheme.codeEscaped) {
        charString = String.fromCodePoint(ESCAPE_CHARACTER);
      }
      grapheme.codePoints.forEach((codePoint) => {
        charString += String.fromCodePoint(codePoint);
      });
      return charString;
    }

    _Text._iterateUnicodeCharacters = _iterateUnicodeCharacters;
    _Text._getUnicodeCharString = _getUnicodeCharString;

    _Text.ESCAPE_CHARACTER = ESCAPE_CHARACTER;


    // Text string and width functions

    function _checkTextString(textString) {
      if (textString == undefined) {
        throw newNullPointerException("textString");
      } else if ((typeof textString) != "string") {
        throw newIllegalArgumentException("textString");
      }
    }

    function _checkTextWidth(textWidth) {
      if (! Number.isInteger(textWidth)) {
        throw newIllegalArgumentException("textWidth");
      } else if (textWidth < 0) {
        throw newInvalidParameterException(textWidth);
      }
    }

    /*
     * Returns the string removed zero with spaces and invisible operators
     * in the specified text.
     */
    const ZERO_WIDTH_SPACE_REGEXP =
      new RegExp("["
        + ZERO_WIDTH_FORMATTING_CHARACTERS + INVISIBLE_OPERATORS
        + "]", "g");

    function removeTextZeroWidthSpaces(textString) {
      _checkTextString(textString);
      return textString.replace(ZERO_WIDTH_SPACE_REGEXP, EMPTY_STRING);
    }

    /*
     * Returns the string replaced line-breaks with indent spaces to a space
     * in the specified text.
     */
    const LINE_BREAK_WITH_SPACES_REGEXP =
      new RegExp("[" + LINE_BREAKS + "][" + SPACES + "]*", "g");

    function replaceTextLineBreaksToSpace(textString) {
      _checkTextString(textString);
      return textString.replace(LINE_BREAK_WITH_SPACES_REGEXP, " ");
    }

    /*
     * Returns the string removed spaces from both ends in the specified text.
     */
    const SPACES_FROM_BOTH_ENDS_REGEXP =
      new RegExp("^[" + SPACES + "]+|[" + SPACES + "]+$", "g");

    function trimText(textString) {
      _checkTextString(textString);
      return textString.replace(SPACES_FROM_BOTH_ENDS_REGEXP, EMPTY_STRING);
    }

    _Text.removeTextZeroWidthSpaces = removeTextZeroWidthSpaces;
    _Text.replaceTextLineBreaksToSpace = replaceTextLineBreaksToSpace;
    _Text.trimText = trimText;

    /*
     * Returns the width of the specified text.
     */
    function getTextWidth(textString) {
      _checkTextString(textString);
      if (textString == EMPTY_STRING) {
        return 0;
      }
      var textWidth = 0;
      _iterateUnicodeCharacters(textString, (grapheme) => {
        if (grapheme.codeEscaped) {
          textWidth++;
        }
        textWidth += grapheme.codeWidth;
        return true;
      });
      return textWidth;
    }

    /*
     * Returns the substring of the specified text cut by the secified width.
     */
    function getTextSubstring(textString, maxTextWidth) {
      _checkTextString(textString);
      _checkTextWidth(maxTextWidth);
      if (textString.length <= maxTextWidth) {
        return textString;
      }
      var textSubstring = "";
      var textWidth = 0;
      _iterateUnicodeCharacters(textString, (grapheme) => {
        if (grapheme.codeEscaped) {
          textWidth++;
        }
        textWidth += grapheme.codeWidth;
        if (textWidth <= maxTextWidth) {
          textSubstring += _getUnicodeCharString(grapheme);
          return true;
        }
        return false;
      });
      return textSubstring;
    }

    /*
     * Returns the string concatenating texts in the specified array.
     */
    const TEXT_CONCATENATION = getLocalizedString("TextConcatenation");
    const TEXT_CONCATENATION_WIDTH = getTextWidth(TEXT_CONCATENATION);

    function concatTextStrings(textArray, maxTextWidth) {
      if (! Array.isArray(textArray)) {
        throw newIllegalArgumentException("textArray");
      }
      _checkTextWidth(maxTextWidth);
      if (textArray.length > 0) {
        _checkTextString(textArray[0]);
        var textWidth = getTextWidth(textArray[0]);
        if (textWidth > maxTextWidth) {
          return getTextSubstring(textArray[0], maxTextWidth);
        }
        var textString = textArray[0];
        for (let i = 1; i < textArray.length; i++) {
          textWidth += TEXT_CONCATENATION_WIDTH + getTextWidth(textArray[i]);
          if (textWidth > maxTextWidth) {
            break;
          }
          textString += TEXT_CONCATENATION + textArray[i];
        }
        return textString;
      }
      return EMPTY_STRING;
    }

    _Text.getTextWidth = getTextWidth;
    _Text.getTextSubstring = getTextSubstring;
    _Text.concatTextStrings = concatTextStrings;

    /*
     * The object of a text which consists of a string and width.
     */
    class Text {
      constructor(str = "", width = -1) {
        _checkTextString(str);
        this._textString = str;
        if (width >= 0) {
          _checkTextWidth(width);
          this._textWidth = width;
        } else {
          this._textWidth = getTextWidth(str);
        }
      }

      get textString() {
        return this._textString;
      }

      get textWidth() {
        return this._textWidth;
      }

      add(str, width) {
        if (str != EMPTY_STRING) {
          _checkTextString(str);
          _checkTextWidth(width);
          this._textString += str;
          this._textWidth += width;
        }
      }

      append(text) {
        if (text != undefined) {
          this._textString += text.textString;
          this._textWidth += text.textWidth;
        }
        return this;
      }
    }

    _Text.Text = Text;

    // The object of a text which consists of an empty string.
    _Text.EMPTY_TEXT = {
        get textString() {
          return EMPTY_STRING;
        },
        get textWidth() {
          return 0;
        }
      };

    /*
     * The localized context which can have halfwidth and fullwidth strings.
     */
    class LocalizedContext {
      constructor() {
        this._halfwidthText = new Text();
        this._fullwidthText = new Text();
      }

      /*
       * Returns true if this context has halfwidth and fullwidth strings.
       */
      hasDifferentWidth() {
        return this._fullwidthText.textString != EMPTY_STRING;
      }

      /*
       * Returns the text for the halfwidth string and width.
       */
      get halfwidthText() {
        return this._halfwidthText;
      }

      /*
       * Returns the text for the fullwidth string and width.
       */
      get fullwidthText() {
        return this._fullwidthText;
      }

      /*
       * Appends the specified halfwidth or fullwidth strings and widths
       * to this context.
       */
      add(halfwidthText, fullwidthText) {
        if (halfwidthText == undefined) {
          throw newNullPointerException("halfwidthText");
        }
        if (this.hasDifferentWidth()) {
          if (fullwidthText != undefined) {
            this._fullwidthText.append(fullwidthText);
          } else {
            this._fullwidthText.append(halfwidthText);
          }
        } else if (fullwidthText != undefined) {
          this._fullwidthText.append(this.halfwidthText).append(fullwidthText);
        }
        this._halfwidthText.append(halfwidthText);
      }
    }

    // Appends the halfwidth or fullwidth strings and widths of the specified
    // grapheme cluster to the specified localized context.

    function _addLocalizedGrapheme(
      localizedContext, grapheme, matchSpecialCodePoint) {
      if (matchSpecialCodePoint == undefined) {
        matchSpecialCodePoint = (codePoint) => {
            return false;
          };
      }
      var graphemeText =
        new Text(_getUnicodeCharString(grapheme), grapheme.codeWidth);
      var graphemeCodePoint = grapheme.codePoints[0];
      if (grapheme.codeWidth > 1) {
        var fullwidthIndex = -1;
        if (! grapheme.codeEscaped) {
          fullwidthIndex = FULLWIDTH_CODE_POINTS.indexOf(graphemeCodePoint);
        //} else {
        // Ignore an escape of a fullwidth character preceded by "\".
        }
        if (fullwidthIndex >= 0) {
          var halfwidthCodePoint = HALFWIDTH_CODE_POINTS[fullwidthIndex];
          var halfwidthCodeEscaped = false;
          if (matchSpecialCodePoint(halfwidthCodePoint)) {
            // Special characters like "|" or "*" in the regular expression
            // are escaped if the callback function is specified.
            halfwidthCodeEscaped = true;
          }
          var halfwidthText = new Text(
            _getUnicodeCharString({
              codePoints: [ halfwidthCodePoint ],
              codeWidth: 1,
              codeEscaped: halfwidthCodeEscaped
            }), 1);
          localizedContext.add(halfwidthText, graphemeText);
        } else {
          // Appends the fullwidth text as the halfwidth if not corresponding.
          localizedContext.add(graphemeText);
        }
      } else {
        var halfwidthIndex = -1;
        if (matchSpecialCodePoint(graphemeCodePoint) == grapheme.codeEscaped) {
          halfwidthIndex = HALFWIDTH_CODE_POINTS.indexOf(graphemeCodePoint);
        //} else {
        // Never replace an ordinary character preceded by "\" or special
        // characters not preceded by "\".
        }
        if (halfwidthIndex >= 0) {
          var fullwidthText = new Text(
            _getUnicodeCharString({
              codePoints: [ FULLWIDTH_CODE_POINTS[halfwidthIndex] ],
              codeWidth: 2,
              codeEscaped: false
            }), 2);
          localizedContext.add(graphemeText, fullwidthText);
        } else {
          // Appends only the halfwidth text if not corresponding to fullwidth.
          localizedContext.add(graphemeText);
        }
      }
    }

    /*
     * Returns the context localized for the specified text.
     */
    function getLocalizedContext(textString, matchSpecialCodePoint) {
      _checkTextString(textString);
      var localizedContext = new LocalizedContext();
      _iterateUnicodeCharacters(textString, (grapheme) => {
          _addLocalizedGrapheme(
            localizedContext, grapheme, matchSpecialCodePoint);
          return true;
        });
      return localizedContext;
    }

    _Text.LocalizedContext = LocalizedContext;
    _Text._addLocalizedGrapheme = _addLocalizedGrapheme;
    _Text.getLocalizedContext = getLocalizedContext;

    return _Text;
  })();


/*
 * Regular expression functions and constant variables.
 */
ExtractNews.Regexp = (() => {
    /*
     * Returns the message of regular expressions in this locale.
     */
    function getRegularExpressionMessage(id, substitutions) {
      return browser.i18n.getMessage("regularExpression" + id, substitutions);
    }

    const _Text = ExtractNews.Text;
    const _Regexp = { };

    // Regular expresion of special characters escape
    const SPECIAL_CHAR_ESCAPE_REGEXP = new RegExp(/[.*+\-?^${}()|[\]\\]/, "g");

    /*
     * Returns the string replacing the regular expresion of special characters
     * by forward slash escape for the specified text.
     */
    function escape(textString) {
      if (textString == undefined) {
        throw newNullPointerException("textString");
      } else if ((typeof textString) != "string") {
        throw newIllegalArgumentException("textString");
      }
      return textString.replace(SPECIAL_CHAR_ESCAPE_REGEXP, "\\$&");
    }

    _Regexp.escape = escape;

    // The code point of an end of file by which the pattern of whole regular
    // expression is terminated and other patterns are aborted.
    const REGEXP_EOF = -1;

    const REGEXP_ASTERISK = 0x2A;
    const REGEXP_PLUS = 0x2B;
    const REGEXP_QUESTION = 0x3F;

    function _isRegexpQuantifier(codePoint) {
      return codePoint == REGEXP_ASTERISK
        || codePoint == REGEXP_PLUS
        || codePoint == REGEXP_QUESTION;
    }

    function _isRegexpNonGreedyQuantifier(codePoint) {
      return codePoint == REGEXP_QUESTION;
    }

    const REGEXP_PERIOD = 0x2E;
    const REGEXP_VERTICAL_LINE = 0x7C;
    const REGEXP_CIRCUMFLEX = 0x5E;
    const REGEXP_DOLLAR = 0x24;

    function _isRegexpAltenativeOrBoundary(codePoint) {
      return codePoint == REGEXP_VERTICAL_LINE
        || codePoint == REGEXP_CIRCUMFLEX || codePoint == REGEXP_DOLLAR;
    }

    const REGEXP_SMALL_B = 0x62;
    const REGEXP_B = 0x42;

    function _isRegexpWordBoundaryEscape(codePoint) {
      return codePoint == REGEXP_SMALL_B || codePoint == REGEXP_B;
    }

    function _getRegexpError(errorCode, errorString) {
      return {
          errorCode: errorCode,
          errorString: errorString
        };
    }

    const REGEXP_NO_ERROR = _getRegexpError(REGEXP_EOF);

    /*
     * The pattern of a regular expression.
     */
    class RegexpPattern {
      constructor() {
      }

      isCharacter() {
        return false;
      }

      isQuantifier() {
        return false;
      }

      isEscape() {
        return false;
      }

      isCharacterSet() {
        return false;
      }

      isOccurrence() {
        return false;
      }

      isGroupName() {
        return false;
      }

      isGroup() {
        return false;
      }

      isGroupVariant() {
        return false;
      }

      isControlEscapeInput() {
        return false;
      }

      isHexadecimalEscapeInput() {
        return false;
      }

      isUnicodeEscapeInput() {
        return false;
      }

      isGroupNameEscapeInput() {
        return false;
      }

      isGroupInput() {
        return false;
      }

      /*
       * Returns true if this pattern has any ordinary character and true is
       * returned by the specified function for its code.
       */
      hasOrdinaryCharacter(containsCodePoint) {
        return false;
      }

      /*
       * Returns true if this pattern has any character escaped by "\\" and
       * true is returned by the specified function for its code.
       */
      hasEscapedCharacter(containsCodePoint) {
        return false;
      }

      hasAccepted() {
        return false;
      }

      codePoint() {
        throw newUnsupportedOperationException();
      }

      /*
       * Returns the length of which UTF-16 characters have been input to this
       * pattern, except for escaped character or enclosing start and end.
       */
      inputLength() {
        return 0;
      }

      /*
       * Inputs the specified pattern of a regular expression to this pattern
       * and returns the status which has an error code or string.
       */
      input(pattern) {
        return _getRegexpError(this.codePoint());
      }

      /*
       * Checks whether this pattern is preceded by the specified pattern
       * and returns the status which has an error code or string.
       */
      checkPrecededBy(pattern) {
        if (this.isQuantifier()) {
          if (pattern == undefined
            || (pattern.isQuantifier()
              && ! this.hasOrdinaryCharacter(_isRegexpNonGreedyQuantifier))
            || pattern.hasOrdinaryCharacter(_isRegexpAltenativeOrBoundary)
            || pattern.hasEscapedCharacter(_isRegexpWordBoundaryEscape)) {
            // Quantifiers are not preceded by "|", "^", "$", "\b", or "\B"
            // but only "?" is preceded by other quantifiers.
            return _getRegexpError(REGEXP_ASTERISK, this.getTextString());
          }
        }
        return REGEXP_NO_ERROR;
      }

      getTextString() {
        return _Text.EMPTY_STRING;
      }

      getTextWidth() {
        return 0;
      }

      /*
       * Adds the text localized by this pattern into the specified context.
       */
      receiveLocalizedText(localizedContext, matchSpecialCodePoint) {
        localizedContext.add(
          new _Text.Text(this.getTextString(), this.getTextWidth()));
      }
    }

    const REGEXP_LEFT_PARENTHESIS = 0x28;
    const REGEXP_RIGHT_PARENTHESIS = 0x29;
    const REGEXP_COLON = 0x3A;
    const REGEXP_EQUALS = 0x3D;
    const REGEXP_EXCLAMATION = 0x21;

    const REGEXP_LEFT_ANGLE_BRACKET = 0x3C;
    const REGEXP_RIGHT_ANGLE_BRACKET = 0x3E;
    const REGEXP_UNDERSCORE = 0x5F;

    const REGEXP_LEFT_BRACKET = 0x5B;
    const REGEXP_RIGHT_BRACKET = 0x5D;
    const REGEXP_HYPHEN = 0x2D;

    const REGEXP_LEFT_BRACE = 0x7B;
    const REGEXP_RIGHT_BRACE = 0x7D;
    const REGEXP_MINUS = REGEXP_HYPHEN;
    const REGEXP_COMMA = 0x2C;

    function _isRegexpSpecialCharacters(codePoint) {
      return _isRegexpQuantifier(codePoint)
        || _isRegexpAltenativeOrBoundary(codePoint)
        || codePoint == REGEXP_PERIOD
        || codePoint == REGEXP_LEFT_PARENTHESIS
        || codePoint == REGEXP_RIGHT_PARENTHESIS
        || codePoint == REGEXP_LEFT_BRACKET
        || codePoint == REGEXP_RIGHT_BRACKET
        || codePoint == REGEXP_LEFT_BRACE
        || codePoint == REGEXP_RIGHT_BRACE
        || codePoint == _Text.ESCAPE_CHARACTER;
    }

    /*
     * The pattern of a escape in the regular expression.
     */
    class RegexpEscape extends RegexpPattern {
      constructor() {
        super();
        this._escapeString = "";
        this._escapeWidth = 0;
      }

      isEscape() {
        return true;
      }

      hasEscapedCharacter(containsCodePoint) {
        if (containsCodePoint != undefined) {
          return containsCodePoint(this.escapedCodePoint());
        }
        return true;
      }

      escapedCodePoint() {
        return -1;
      }

      escapeString() {
        return this._escapeString;
      }

      inputLength() {
        return this._escapeString.length;
      }

      input(pattern) {
        if (this.hasAccepted() || ! pattern.isCharacter()) {
          throw newUnsupportedOperationException();
        } else if (pattern.codePoint() == REGEXP_EOF) {
          return _getRegexpError(this.escapedCodePoint());
        }
        this._escapeString += pattern.getTextString();
        this._escapeWidth += pattern.getTextWidth();
        return this.check(pattern);
      }

      check(pattern) {
        return _getRegexpError(
          this.escapedCodePoint(), pattern.getTextString());
      }

      getTextString() {
        return "\\"
          + String.fromCodePoint(this.escapedCodePoint()) + this._escapeString;
      }

      getTextWidth() {
        return this._escapeWidth + 2;
      }
    }

    const REGEXP_SMALL_C = 0x63;
    const REGEXP_SMALL_X = 0x78;
    const REGEXP_SMALL_U = 0x75;
    const REGEXP_SMALL_K = 0x6B;
    const REGEXP_K = 0x4B;
    const REGEXP_SMALL_P = 0x70;
    const REGEXP_P = 0x50;

    const REGEXP_0 = 0x30;
    const REGEXP_9 = 0x39;
    const REGEXP_A = 0x41;
    const REGEXP_SMALL_A = 0x61;
    const REGEXP_F = 0x46;
    const REGEXP_SMALL_F = 0x66;
    const REGEXP_Z = 0x5A;
    const REGEXP_SMALL_Z = 0x7A;

    function _isRegexpAlphabet(codePoint) {
      return (codePoint >= REGEXP_A && codePoint <= REGEXP_Z)
        || (codePoint >= REGEXP_SMALL_A && codePoint <= REGEXP_SMALL_Z);
    }

    function _getRegexpAlphabetValue(codePoint) {
      if (codePoint >= REGEXP_A && codePoint <= REGEXP_Z) {
        return codePoint - REGEXP_A + 1;
      } else if (codePoint >= REGEXP_SMALL_A && codePoint <= REGEXP_SMALL_Z) {
        return codePoint - REGEXP_SMALL_A + 1;
      }
      throw newUnsupportedOperationException();
    }

    /*
     * The pattern of a control escape in the regular expression.
     */
    class RegexpControlEscape extends RegexpEscape {
      constructor() {
        super();
      }

      hasAccepted() {
        return this.inputLength() >= 1;
      }

      codePoint() {
        if (this.hasAccepted()) {
          return _getRegexpAlphabetValue(this.escapeString().codePointAt(0));
        }
        throw newUnsupportedOperationException();
      }

      escapedCodePoint() {
        return REGEXP_SMALL_C;
      }

      check(pattern) {
        if (pattern.hasOrdinaryCharacter(_isRegexpAlphabet)) {
          return REGEXP_NO_ERROR;
        }
        return super.check(pattern);
      }
    }

    function _isRegexpHexDigit(codePoint) {
      return (codePoint >= REGEXP_0 && codePoint <= REGEXP_9)
        || (codePoint >= REGEXP_A && codePoint <= REGEXP_F)
        || (codePoint >= REGEXP_SMALL_A && codePoint <= REGEXP_SMALL_F);
    }

    function _getRegexpHexValue(codePoint) {
      if (codePoint >= REGEXP_0 && codePoint <= REGEXP_9) {
        return codePoint - REGEXP_0;
      } else if (codePoint >= REGEXP_A && codePoint <= REGEXP_F) {
        return codePoint - REGEXP_A + 10;
      } else if (codePoint >= REGEXP_SMALL_A && codePoint <= REGEXP_SMALL_F) {
        return codePoint - REGEXP_SMALL_A + 10;
      }
      throw newUnsupportedOperationException();
    }

    /*
     * The pattern of a hexadecimal escape in the regular expression.
     */
    class RegexpHexadecimalEscape extends RegexpEscape {
      constructor() {
        super();
        this.hexValue = 0;
      }

      hasAccepted() {
        return this.hexValue >= 0
          && this.inputLength() >= this.hexDigitLength();
      }

      hexDigitLength() {
        return 2;
      }

      codePoint() {
        if (this.hasAccepted()) {
          return this.hexValue;
        }
        throw newUnsupportedOperationException();
      }

      escapedCodePoint() {
        return REGEXP_SMALL_X;
      }

      check(pattern) {
        if (pattern.hasOrdinaryCharacter(_isRegexpHexDigit)) {
          this.hexValue =
            (this.hexValue << 4) + _getRegexpHexValue(pattern.codePoint());
          return REGEXP_NO_ERROR;
        }
        this.hexValue = -1;
        return super.check(pattern);
      }
    }

    const REGEXP_UNICODE_ENCLOSING_START = "{";
    const REGEXP_UNICODE_ENCLOSING_END = "}";

    /*
     * The pattern of a unicode escape in the regular expression.
     */
    class RegexpUnicodeEscape extends RegexpHexadecimalEscape {
      constructor() {
        super();
        this.enclosingEndCodePoint = -1;
        this.enclosingTerminated = false;
      }

      hasAccepted() {
        if (this.enclosingEndCodePoint >= 0) {
          return this.enclosingTerminated;
        }
        return super.hasAccepted();
      }

      hexDigitLength() {
        return 4;
      }

      escapedCodePoint() {
        return REGEXP_SMALL_U;
      }

      check(pattern) {
        if (this.enclosingEndCodePoint >= 0) {
          if (! pattern.hasEscapedCharacter()
            && pattern.codePoint() == REGEXP_RIGHT_BRACE) {
            // Terminate a unicode escape with "}" properly for 4 or 5 digits.
            this.enclosingTerminated = true;
            if (this.inputLength() >= 6 && this.inputLength() <= 7) {
              return REGEXP_NO_ERROR; // "{hhhh}" or "{hhhhh}"
            }
            return _getRegexpError(REGEXP_SMALL_U, this.escapeString());
          }
        } else if (this.inputLength() == 1
          && ! pattern.hasEscapedCharacter()
          && pattern.codePoint() == REGEXP_LEFT_BRACE) {
          // Change fixed 4 digits to 4 or 5 digits enclosed with "{" and "}".
          this.enclosingEndCodePoint = REGEXP_RIGHT_BRACE;
          return REGEXP_NO_ERROR;
        }
        // Check whether the specified pattern is the character of a hex digit.
        return super.check(pattern);
      }
    }

    /*
     * The pattern of a group name escape in the regular expression.
     */
    class RegexpGroupNameEscape extends RegexpEscape {
      constructor() {
        super();
        this.groupNameTerminated = false;
      }

      hasAccepted() {
        return this.groupNameTerminated;
      }

      escapedCodePoint() {
        return REGEXP_SMALL_K;
      }

      check(pattern) {
        var codePoint = pattern.codePoint();
        if (this.inputLength() == 1) {
          if (codePoint == REGEXP_LEFT_ANGLE_BRACKET) { // "\k<"
            return REGEXP_NO_ERROR;
          }
          return _getRegexpError(REGEXP_K, pattern.getTextString());
        } else if (this.inputLength() == 2) {
          if (pattern.hasOrdinaryCharacter(_isRegexpAlphabet)) {
            return REGEXP_NO_ERROR;
          } else if (codePoint == REGEXP_RIGHT_ANGLE_BRACKET) { // "\k<>"
            return _getRegexpError(REGEXP_SMALL_K, "");
          }
        } else if (codePoint == REGEXP_RIGHT_ANGLE_BRACKET) { // "\k<Name>"
          this.groupNameTerminated = true;
          return REGEXP_NO_ERROR;
        } else if (pattern.hasOrdinaryCharacter(_isRegexpAlphanumerics)) {
          return REGEXP_NO_ERROR;
        }
        return super.check(pattern);
      }
    }

    /*
     * The pattern of enclosing other patterns in the regular expression.
     */
    class RegexpEnclosing extends RegexpPattern {
      constructor(endCodePoint) {
        super();
        this._inputText = new _Text.Text();
        this._endCodePoint = endCodePoint;
        this._hasAccepted = false;
      }

      isEnclosing() {
        return true;
      }

      hasAccepted() {
        return this._hasAccepted;
      }

      inputStart() {
        return _Text.EMPTY_TEXT;
      }

      inputText() {
        return this._inputText;
      }

      inputLength() {
        return this._inputText.textString.length;
      }

      input(pattern) {
        if (this._hasAccepted) {
          throw newUnsupportedOperationException();
        }
        var status = this.preparse(pattern);
        if (status != undefined) {
          return status;
        }
        if (pattern.isCharacter() && ! pattern.hasEscapedCharacter()) {
          var codePoint = pattern.codePoint();
          if (codePoint == this._endCodePoint) {
            this._hasAccepted = true;
            if (! this.isGroup() && this.inputLength() == 0) {
              // No character enclosed with the start text and end code point
              return _getRegexpError(
                this.inputStart().textString.codePointAt(0), "");
            }
            return this.postparse(pattern);
          } else if (codePoint == REGEXP_EOF) {
            return _getRegexpError(this._endCodePoint);
          }
        }
        this._inputText.add(pattern.getTextString(), pattern.getTextWidth());
        return this.parse(pattern);
      }

      preparse(pattern) {
        return undefined;
      }

      parse(pattern) {
        return _getRegexpError(
          this.inputStart().textString.codePointAt(0),
          pattern.getTextString());
      }

      postparse(pattern) {
        return REGEXP_NO_ERROR;
      }

      getTextString() {
        var str = this.inputStart().textString + this._inputText.textString;
        if (this._hasAccepted && this._endCodePoint >= 0) {
          str += String.fromCodePoint(this._endCodePoint);
        }
        return str;
      }

      getTextWidth() {
        var width = this.inputStart().textWidth + this._inputText.textWidth;
        if (this._hasAccepted && this._endCodePoint >= 0) {
          width++;
        }
        return width;
      }
    }

    function _getRegexpEscapedCodePoint(codePoint) {
      switch (codePoint) {
      case 0x62: // "\b"
        return 0x08;
      case 0x74: // "\t"
        return 0x09;
      case 0x6E: // "\n"
        return 0x0A;
      case 0x76: // "\v"
        return 0x0B;
      case 0x66: // "\f"
        return 0x0C;
      case 0x64: // "\r"
        return 0x0D;
      }
      return codePoint;
    }

    function _getRegexpRangeStartCodePoint(pattern) {
      var codePoint = pattern.codePoint();
      if (pattern.isCharacter() && pattern.hasEscapedCharacter()) {
        switch (codePoint) {
        case 0x57: // "\d"
        case 0x77: // "\D"
          // [0-9]
          return REGEXP_9;
        case 0x57: // "\w"
        case 0x77: // "\W"
          // [0-9A-Z_a-z]
          return REGEXP_SMALL_Z;
        case 0x53: // "\s"
        case 0x73: // "\S"
          // [\t\n\v\f\r
          //  \u\00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
          return 0xfeff;
        default:
          return _getRegexpEscapedCodePoint(codePoint);
        }
      }
      return codePoint;
    }

    function _getRegexpRangeEndCodePoint(pattern) {
      var codePoint = pattern.codePoint();
      if (pattern.isCharacter() && pattern.hasEscapedCharacter()) {
        switch (codePoint) {
        case 0x57: // "\d"
        case 0x77: // "\D"
          // [0-9]
          return REGEXP_0;
        case 0x57: // "\w"
        case 0x77: // "\W"
          // [0-9A-Z_a-z]
          return REGEXP_0;
        case 0x53: // "\s"
        case 0x73: // "\S"
          // [\t\n\v\f\r
          //  \u\00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
          return 0x09;
        default:
          return _getRegexpEscapedCodePoint(codePoint);
        }
      }
      return codePoint;
    }

    const REGEXP_CHARACTER_SET_START = new _Text.Text("[", 1);
    const REGEXP_CHARACTER_SET_END = new _Text.Text("]", 1);

    const REGEXP_COMPLEMENTED_CHARACTER_SET_START = new _Text.Text("[^", 2);

    function _isRegexpCharacterSetComplementation(codePoint) {
      return codePoint == REGEXP_CIRCUMFLEX;
    }

    const REGEXP_CHARACTER_SET_HYPHENATION = new _Text.Text("-", 1);

    function _isRegexpCharacterSetHyphenation(codePoint) {
      return codePoint == REGEXP_HYPHEN;
    }

    function _isRegexpCharacterSetEscapedCharacters(codePoint) {
      return codePoint == REGEXP_RIGHT_BRACKET
        || codePoint == _Text.ESCAPE_CHARACTER;
    }

    /*
     * The pattern of a character set in the regular expression.
     */
    class RegexpCharacterSet extends RegexpEnclosing {
      constructor(localized) {
        super(REGEXP_RIGHT_BRACKET);
        this.precedingPattern = undefined;
        this.characterSetStart = REGEXP_CHARACTER_SET_START;
        this.rangeStartCodePoint = -1;
        this.rangeStartIndex = -1;
        if (localized) {
          this.localizedContext = new _Text.LocalizedContext();
          this.localizedContext.add(REGEXP_CHARACTER_SET_START);
        }
      }

      isCharacterSet() {
        return true;
      }

      isControlEscapeInput() {
        return true;
      }

      isHexadecimalEscapeInput() {
        return true;
      }

      isUnicodeEscapeInput() {
        return true;
      }

      inputStart() {
        return this.characterSetStart;
      }

      preparse(pattern) {
        if (this.inputLength() == 0) {
          if (this.characterSetStart == REGEXP_CHARACTER_SET_START
            && pattern.hasOrdinaryCharacter(
              _isRegexpCharacterSetComplementation)) {
            // Complemented character set is started from "[^".
            this.characterSetStart = REGEXP_COMPLEMENTED_CHARACTER_SET_START;
            if (this.localizedContext != undefined) {
              this.localizedContext = new _Text.LocalizedContext();
              this.localizedContext.add(
                REGEXP_COMPLEMENTED_CHARACTER_SET_START);
            }
            return REGEXP_NO_ERROR;
          }
        }
        if ((this.precedingPattern == undefined
          || ! pattern.hasOrdinaryCharacter(_isRegexpCharacterSetHyphenation))
          && this.rangeStartCodePoint < 0) {
          this.rangeStartIndex = this.inputLength();
        }
        return undefined;
      }

      parse(pattern) {
        if (this.rangeStartCodePoint >= 0) {
          // Compare the start code point followed by "-" with the code point
          // of an ordinary character, "\xhh", "\uhhhh", or "\u{hhhhh}".
          var rangeEndCodePoint = _getRegexpRangeEndCodePoint(pattern);
          if (rangeEndCodePoint < this.rangeStartCodePoint) {
            // Finish if the range start code is greater than the range end.
            return _getRegexpError(REGEXP_HYPHEN,
              this.inputText().textString.substring(this.rangeStartIndex));
          }
          this.precedingPattern = undefined;
          this.rangeStartCodePoint = -1;
          this.rangeStartIndex = -1;
          if (this.localizedContext != undefined) {
            this.localizedContext.add(REGEXP_CHARACTER_SET_HYPHENATION);
            pattern.receiveLocalizedText(
              this.localizedContext, _isRegexpCharacterSetEscapedCharacters);
          }
        } else if (this.precedingPattern != undefined) {
          if (pattern.hasOrdinaryCharacter(_isRegexpCharacterSetHyphenation)) {
            // Set the range start to the code point followed by "-" which not
            // at the head of characters and not preceded by the range end.
            this.rangeStartCodePoint =
              _getRegexpRangeStartCodePoint(this.precedingPattern);
          }
          if (this.localizedContext != undefined) {
            this.precedingPattern.receiveLocalizedText(
              this.localizedContext, _isRegexpCharacterSetEscapedCharacters);
          }
          this.precedingPattern = pattern;
        } else {
          this.precedingPattern = pattern;
        }
        return REGEXP_NO_ERROR;
      }

      postparse(pattern) {
        if (this.localizedContext != undefined) {
          if (this.precedingPattern != undefined) {
            this.precedingPattern.receiveLocalizedText(
              this.localizedContext, _isRegexpCharacterSetEscapedCharacters);
          }
          this.localizedContext.add(REGEXP_CHARACTER_SET_END);
        }
        return REGEXP_NO_ERROR;
      }

      receiveLocalizedText(localizedContext) {
        if (this.localizedContext != undefined) {
          localizedContext.add(
            this.localizedContext.halfwidthText,
            this.localizedContext.fullwidthText);
        }
      }
    }

    function _isRegexpDecimalDigit(codePoint) {
      return (codePoint >= REGEXP_0 && codePoint <= REGEXP_9);
    }

    function _getRegexpDecimalValue(codePoint) {
      if (codePoint >= REGEXP_0 && codePoint <= REGEXP_9) {
        return codePoint - REGEXP_0;
      }
      throw newUnsupportedOperationException();
    }

    const REGEXP_OCURRENCE_START = new _Text.Text("{", 1);
    const REGEXP_OCURRENCE_END = new _Text.Text("}", 1);
    const REGEXP_OCURRENCE_MAX_VALUE = 999999;

    /*
     * The pattern of occurrence number in the regular expression.
     */
    class RegexpOccurrence extends RegexpEnclosing {
      constructor() {
        super(REGEXP_RIGHT_BRACE);
        this.negative = false;
        this.leastValue = -1;
        this.mostValue = -1;
        this.commaIndex = -1;
      }

      isQuantifier() {
        return true;
      }

      isOccurrence() {
        return true;
      }

      inputStart() {
        return REGEXP_OCURRENCE_START;
      }

      preparse(pattern) {
        if (! pattern.isCharacter()) {
          throw newUnsupportedOperationException();
        }
        return undefined;
      }

      parse(pattern) {
        if (! pattern.hasEscapedCharacter()) {
          var codePoint = pattern.codePoint();
          if (this.commaIndex < 0) { // The least occurrence number
            if (this.leastValue >= 0) {
              if (codePoint == REGEXP_COMMA) { // "{n,"
                var errorCode = -1;
                this.commaIndex = this.inputLength() - 1;
                if (this.negative
                  || this.leastValue > REGEXP_OCURRENCE_MAX_VALUE) {
                  return _getRegexpError(REGEXP_0,
                    this.inputText().textString.substring(0, this.commaIndex));
                }
                return REGEXP_NO_ERROR;
              }
            } else if (codePoint == REGEXP_COMMA) {
              return _getRegexpError(REGEXP_LEFT_BRACE, "");
            } else {
              this.leastValue = 0;
              if (codePoint == REGEXP_MINUS) { // "{-"
                this.negative = true;
                return REGEXP_NO_ERROR;
              }
            }
            if (_isRegexpDecimalDigit(codePoint)) { // "{n"
              if (! this.negative
                && this.leastValue <= REGEXP_OCURRENCE_MAX_VALUE) {
                this.leastValue =
                  this.leastValue * 10 + _getRegexpDecimalValue(codePoint);
              }
              return REGEXP_NO_ERROR;
            }
          } else { // The most occurrence number
            if (this.mostValue < 0) {
              this.mostValue = 0;
              if (codePoint == REGEXP_MINUS) { // "{n,-"
                this.negative = true;
                return REGEXP_NO_ERROR;
              }
            }
            if (_isRegexpDecimalDigit(codePoint)) { // "{n,m"
              if (! this.negative
                && this.mostValue <= REGEXP_OCURRENCE_MAX_VALUE) {
                this.mostValue =
                  this.mostValue * 10 + _getRegexpDecimalValue(codePoint);
              }
              return REGEXP_NO_ERROR;
            }
          }
        }
        return super.parse(pattern);
      }

      postparse(pattern) {
        if (this.negative || this.mostValue > REGEXP_OCURRENCE_MAX_VALUE) {
          return _getRegexpError(REGEXP_0,
            this.inputText().textString.substring(this.commaIndex + 1));
        } else if (this.mostValue >= 0 && this.mostValue < this.leastValue) {
          return _getRegexpError(REGEXP_COMMA, this.inputText().textString);
        }
        return REGEXP_NO_ERROR;
      }
    }

    const REGEXP_GROUP_NAME_START = new _Text.Text("<", 1);
    const REGEXP_GROUP_NAME_END = new _Text.Text(">", 1);

    const REGEXP_NAMED_CAPTURING_GROUP_START = new _Text.Text("(?<", 3);

    function _isRegexpAssertionStart(codePoint) {
      return codePoint == REGEXP_EQUALS || codePoint == REGEXP_EXCLAMATION;
    }

    function _isRegexpAlphanumerics(codePoint) {
      return _isRegexpAlphabet(codePoint) || _isRegexpDecimalDigit(codePoint)
        || codePoint == REGEXP_UNDERSCORE;
    }

    /*
     * The pattern of a group name in the regular expression.
     */
    class RegexpGroupName extends RegexpEnclosing {
      constructor() {
        super(REGEXP_RIGHT_ANGLE_BRACKET);
      }

      isGroupName() {
        return true;
      }

      inputStart() {
        return REGEXP_GROUP_NAME_START;
      }

      preparse(pattern) {
        if (! pattern.isCharacter()) {
          throw newUnsupportedOperationException();
        }
        return undefined;
      }

      parse(pattern) {
        if (this.inputLength() == 1) {
          if (pattern.hasOrdinaryCharacter(_isRegexpAssertionStart)) {
            // Lookbehind assersions "<=" or "<!" are unsupported.
            return _getRegexpError(pattern.codePoint(),
              REGEXP_NAMED_CAPTURING_GROUP_START.textString
              + pattern.getTextString());
          } else if (pattern.hasOrdinaryCharacter(_isRegexpAlphabet)) {
            return REGEXP_NO_ERROR;
          }
        } else if (pattern.hasOrdinaryCharacter(_isRegexpAlphanumerics)) {
          return REGEXP_NO_ERROR;
        }
        return super.parse(pattern);
      }
    }

    /*
     * The pattern of a character in the regular expression.
     */
    class RegexpCharacter extends RegexpPattern {
      constructor() {
        super();
      }

      isCharacter() {
        return true;
      }

      hasOrdinaryCharacter(containsCodePoint) {
        if (containsCodePoint != undefined) {
          return containsCodePoint(REGEXP_EOF);
        }
        return true;
      }

      codePoint() {
        return REGEXP_EOF;
      }
    }

    // The pattern by which a regular expression is terminated.
    const REGEXP_END = new RegexpCharacter();

    /*
     * The pattern of a grapheme cluster in the regular expression.
     */
    class RegexpGrapheme extends RegexpCharacter {
      constructor(grapheme) {
        super();
        this.grapheme = grapheme;
      }

      isQuantifier() {
        return ! this.grapheme.codeEscaped
          && this.grapheme.codeWidth == 1
          && _isRegexpQuantifier(this.grapheme.codePoints[0]);
      }

      hasOrdinaryCharacter(containsCodePoint) {
        if (! this.grapheme.codeEscaped) {
          if (containsCodePoint != undefined) {
            return containsCodePoint(this.grapheme.codePoints[0]);
          }
          return true;
        }
        return false;
      }

      hasEscapedCharacter(containsCodePoint) {
        if (this.grapheme.codeEscaped) {
          if (containsCodePoint != undefined) {
            return containsCodePoint(this.grapheme.codePoints[0]);
          }
          return true;
        }
        return false;
      }

      codePoint() {
        var codePoint = this.grapheme.codePoints[0];
        if (this.grapheme.codeEscaped) {
          return _getRegexpEscapedCodePoint(codePoint);
        }
        return codePoint; // Ligutured characters ?
      }

      getTextString() {
        return _Text._getUnicodeCharString(this.grapheme);
      }

      getTextWidth() {
        return this.grapheme.codeWidth;
      }

      receiveLocalizedText(localizedContext, matchSpecialCodePoint) {
        if (matchSpecialCodePoint == undefined) {
          matchSpecialCodePoint = _isRegexpSpecialCharacters;
        }
        _Text._addLocalizedGrapheme(
          localizedContext, this.grapheme, matchSpecialCodePoint);
      }
    }

    const REGEXP_ALTERNATIVE = new _Text.Text("|", 1);

    function _isRegexpAltenative(codePoint) {
      return codePoint == REGEXP_VERTICAL_LINE;
    }

    function _isRegexpGroupAltenative(codePoint) {
      return codePoint == REGEXP_VERTICAL_LINE
        || codePoint == REGEXP_RIGHT_PARENTHESIS || codePoint == REGEXP_EOF;
    }

    /*
     * The pattern of grouping other patterns in the regular expression.
     */
    class RegexpGrouping extends RegexpEnclosing {
      constructor(localized, wordSet, endCodePoint = REGEXP_EOF) {
        super(endCodePoint);
        if (localized) {
          this.localizedContext = new _Text.LocalizedContext();
          this.halfwidthAlternatives = new Array();
          this.fullwidthAlternatives = new Array();
        }
        if (wordSet != undefined) {
          this.wordSet = wordSet;
          this.wordIndex = 0;
          this.lastWord = "";
        }
        this.precedingPattern = undefined;
      }

      isControlEscapeInput() {
        return true;
      }

      isHexadecimalEscapeInput() {
        return true;
      }

      isUnicodeEscapeInput() {
        return true;
      }

      isGroupNameEscapeInput() {
        return true;
      }

      isGroupInput() {
        return true;
      }

      preparse(pattern) {
        if (this.wordSet != undefined
          && ! pattern.isGroup()
          && ! pattern.isQuantifier()
          && (! pattern.isCharacter()
            || (pattern.hasOrdinaryCharacter(_isRegexpSpecialCharacters)
              && pattern.codePoint() != REGEXP_RIGHT_PARENTHESIS
              && ! _isRegexpAltenativeOrBoundary(pattern.codePoint()))
            || pattern.hasEscapedCharacter())) {
          // Append " " to the last word, instead of the character set and
          // escaped or special characters if not ")", "|", "^", or "$".
          this.lastWord = this.getLastWord();
        }
        if (pattern.hasOrdinaryCharacter(_isRegexpGroupAltenative)) {
          if (this.wordSet != undefined) {
            var lastWord = this.getLastWord();
            if (lastWord != "") {
              // Append the word in every alternative if not duplicate.
              this.wordSet.add(lastWord);
              this.lastWord = "";
            }
          }
          if (this.localizedContext != undefined) {
            var halfwidthAlternativeDuplicated = false;
            var halfwidthText = this.localizedContext.halfwidthText;
            for (let i = 0; i < this.halfwidthAlternatives.length; i++) {
              if (halfwidthText.textString
                == this.halfwidthAlternatives[i].textString) {
                halfwidthAlternativeDuplicated = true;
                break;
              }
            }
            if (! halfwidthAlternativeDuplicated) {
              // Set the halfwidth and fullwidth text in every alternatives
              // into the array even if contains an empty string.
              this.halfwidthAlternatives.push(halfwidthText);
              this.fullwidthAlternatives.push(
                this.localizedContext.fullwidthText);
            }
            this.localizedContext = new _Text.LocalizedContext();
          }
        }
        return undefined;
      }

      parse(pattern) {
        var status = pattern.checkPrecededBy(this.precedingPattern);
        if (status.errorCode >= 0) {
          return status;
        }
        var wordString;
        if (this.localizedContext != undefined
          && ! pattern.hasOrdinaryCharacter(_isRegexpAltenative)) {
          pattern.receiveLocalizedText(this.localizedContext);
          wordString = this.localizedContext.halfwidthText.textString;
        } else {
          wordString = this.inputText().textString;
        }
        if (this.wordSet != undefined
          && (! pattern.isCharacter()
            || pattern.hasOrdinaryCharacter(_isRegexpSpecialCharacters)
            || pattern.hasEscapedCharacter())) {
          // Set the index from which the word is started to the position
          // after patterns except for ordinary characters.
          this.wordIndex = wordString.length;
        }
        this.precedingPattern = pattern;
        return REGEXP_NO_ERROR;
      }

      receiveLocalizedText(localizedContext) {
        throw newUnsupportedOperationException();
      }

      getHalfwidthAlternatives() {
        if (this.localizedContext != undefined) {
          return this.halfwidthAlternatives;
        }
        return undefined;
      }

      getFullwidthAlternatives() {
        if (this.localizedContext != undefined) {
          return this.fullwidthAlternatives;
        }
        return undefined;
      }

      getLastWord() {
        if (this.lastWord != undefined) {
          var lastWord = this.lastWord;
          var wordString;
          if (this.localizedContext != undefined) {
            // It's necessary to get the localized context before cleared
            // in preparse().
            wordString = this.localizedContext.halfwidthText.textString;
          } else {
            wordString = this.inputText().textString;
          }
          var word = wordString.substring(this.wordIndex).trim();
          if (word != "") {
            if (lastWord != "") {
              lastWord += " ";
            }
            lastWord += word;
          }
          return lastWord;
        }
        return undefined;
      }
    }

    const REGEXP_GROUP_START = new _Text.Text("(", 1);
    const REGEXP_GROUP_END = new _Text.Text(")", 1);
    const REGEXP_GROUP_VARIANT = new _Text.Text("(?", 2);

    function _isRegexpGroupVariant(codePoint) {
      return codePoint == REGEXP_QUESTION;
    }

    const REGEXP_NON_CAPTURING_GROUP_START = new _Text.Text("(?:", 3);

    function _isRegexpNonCapturingGroup(codePoint) {
      return codePoint == REGEXP_COLON;
    }

    /*
     * The pattern of a group enclosed with "(" and ")" in the regular
     * expression.
     */
    class RegexpGroup extends RegexpGrouping {
      constructor(localized, wordSet) {
        super(localized, wordSet, REGEXP_RIGHT_PARENTHESIS);
        this.groupStart = new _Text.Text().append(REGEXP_GROUP_START);
      }

      isGroup() {
        return true;
      }

      isGroupVariant() {
        return this.groupStart.textWidth >= REGEXP_GROUP_VARIANT.textWidth;
      }

      inputStart() {
        return this.groupStart;
      }

      preparse(pattern) {
        if (this.inputLength() == 0) {
          if (this.groupStart.textString == REGEXP_GROUP_START.textString) {
            if (pattern.hasOrdinaryCharacter(_isRegexpGroupVariant)) { // "(?"
              this.groupStart.add(
                pattern.getTextString(), pattern.getTextWidth());
              return REGEXP_NO_ERROR;
            // } else {
            // Input all patterns preceded by "(" except for "?".
            }
          } else if (
            this.groupStart.textString == REGEXP_GROUP_VARIANT.textString) {
            // Group start "(?" followed by ":" or "<"
            var errorCode = REGEXP_QUESTION;
            this.groupStart.add(
              pattern.getTextString(), pattern.getTextWidth());
            if (pattern.isGroupName()
              || pattern.hasOrdinaryCharacter(_isRegexpNonCapturingGroup)) {
              // Named capturing group "(?<Name>" or non-capturing group "(?:"
              return REGEXP_NO_ERROR;
            } else if (pattern.hasOrdinaryCharacter(_isRegexpAssertionStart)) {
              // Lookahead assersions are unsupported.
              errorCode = pattern.codePoint();
            }
            return _getRegexpError(errorCode, this.groupStart.textString);
          }
        }
        return super.preparse(pattern);
      }

      receiveLocalizedText(localizedContext) {
        var halfwidthAlternatives = this.getHalfwidthAlternatives();
        if (halfwidthAlternatives != undefined) {
          var fullwidthAlternatives = this.getFullwidthAlternatives();
          localizedContext.add(this.groupStart);
          for (let i = 0; i < halfwidthAlternatives.length; i++) {
            var fullwidthRegexpAlternative = REGEXP_ALTERNATIVE;
            var fullwidthText = fullwidthAlternatives[i];
            if (fullwidthText.textString == "") {
              // Empty strings of fullwidth text are not appended, but instead,
              // halfwidth text are appended if a fullwidth string exists.
              fullwidthText = undefined;
              fullwidthRegexpAlternative = undefined;
            }
            if (i > 0) {
              localizedContext.add(
                REGEXP_ALTERNATIVE, fullwidthRegexpAlternative);
            }
            localizedContext.add(halfwidthAlternatives[i], fullwidthText);
          }
          localizedContext.add(REGEXP_GROUP_END);
        }
      }
    }

    /*
     * Checks whether the specified regular expression is vaild, and returns
     * the result of its which contains the valid string and width, localized
     * string, and error code.
     *
     * This implementation does not support Lookahead or Lookbehind assertions,
     * and Unicode property escapes.
     */
    function checkRegularExpression(regexpString, regexpProperty = { }) {
      if (regexpString == undefined) {
        throw newNullPointerException("regexpString");
      } else if ((typeof regexpString) != "string") {
        throw newIllegalArgumentException("regexpString");
      }
      var regexpResult = {
          checkedText: new _Text.Text(),
          localizedText: undefined,
          wordArray: undefined,
          errorCode: -1,
          errorPosition: -1,
          errorString: undefined
        };
      var regexpLocalized = false;
      var regexpWordSet = undefined;
      var regexpPatternStack = new Array();

      if (regexpProperty.wordCaptured != undefined) {
        if ((typeof regexpProperty.wordCaptured) != "boolean") {
          throw newIllegalArgumentException("regexpProperty.wordCaptured");
        } else if (regexpProperty.wordCaptured) {
          regexpResult.wordArray = new Array();
          regexpWordSet = new Set();
        }
      }
      if (regexpProperty.localized != undefined) {
        if ((typeof regexpProperty.localized) != "boolean") {
          throw newIllegalArgumentException("regexpProperty.localized");
        }
        regexpLocalized = regexpProperty.localized;
      }

      var lastPatternResult = REGEXP_NO_ERROR;
      var lastPattern = new RegexpGrouping(regexpLocalized, regexpWordSet);

      _Text._iterateUnicodeCharacters(regexpString, (grapheme) => {
          if (grapheme.codeEscaped) {
            switch (grapheme.codePoints[0]) {
            case REGEXP_SMALL_C:
              if (lastPattern.isControlEscapeInput()) {
                regexpPatternStack.push(lastPattern);
                lastPattern = new RegexpControlEscape();
                return true;
              }
              break;
            case REGEXP_SMALL_X:
              if (lastPattern.isHexadecimalEscapeInput()) {
                regexpPatternStack.push(lastPattern);
                lastPattern = new RegexpHexadecimalEscape();
                return true;
              }
              break;
            case REGEXP_SMALL_U:
              if (lastPattern.isUnicodeEscapeInput()) {
                regexpPatternStack.push(lastPattern);
                lastPattern = new RegexpUnicodeEscape();
                return true;
              }
              break;
            case REGEXP_SMALL_K:
              if (lastPattern.isGroupNameEscapeInput()) {
                regexpPatternStack.push(lastPattern);
                lastPattern = new RegexpGroupNameEscape();
                return true;
              }
              break;
            case REGEXP_SMALL_P:
            case REGEXP_P:
              regexpPatternStack.push(lastPattern);
              lastPattern = new RegexpGrapheme(grapheme);
              lastPatternResult = lastPattern.input(REGEXP_END);
              return false;
            }
          } else if (lastPattern.isGroupInput()) {
            switch (grapheme.codePoints[0]) {
            case REGEXP_LEFT_PARENTHESIS:
              if (regexpWordSet != undefined) {
                var lastWord = lastPattern.getLastWord();
                if (lastWord != "") {
                  regexpWordSet.add(lastWord);
                }
              }
              regexpPatternStack.push(lastPattern);
              lastPattern = new RegexpGroup(regexpLocalized, regexpWordSet);
              return true;
            case REGEXP_LEFT_BRACKET:
              regexpPatternStack.push(lastPattern);
              lastPattern = new RegexpCharacterSet(regexpLocalized);
              return true;
            case REGEXP_LEFT_BRACE:
              regexpPatternStack.push(lastPattern);
              lastPattern = new RegexpOccurrence();
              return true;
            case REGEXP_LEFT_ANGLE_BRACKET:
              if (lastPattern.isGroupVariant()
                && lastPattern.inputLength() == 0) {
                regexpPatternStack.push(lastPattern);
                lastPattern = new RegexpGroupName();
                return true;
              }
              break;
            case _Text.ESCAPE_CHARACTER:
              regexpPatternStack.push(lastPattern);
              lastPattern = new RegexpGrapheme(grapheme);
              lastPatternResult = lastPattern.input(REGEXP_END);
              return false;
            }
          }

          // Append an ordinary character to the last pattern.
          lastPatternResult = lastPattern.input(new RegexpGrapheme(grapheme));
          if (lastPatternResult.errorCode >= 0) {
            return false;
          }
          while (lastPattern.hasAccepted()) {
            var parentPattern = regexpPatternStack.pop();
            lastPatternResult = parentPattern.input(lastPattern);
            lastPattern = parentPattern;
            if (lastPatternResult.errorCode >= 0) {
              return false;
            }
          }
          return true;
        });

      // Conncatenate the string of each pattern in the stack retained by
      // an error or the last pattern which is not terminated.
      regexpPatternStack.forEach((pattern) => {
          regexpResult.checkedText.add(
            pattern.getTextString(), pattern.getTextWidth());
        });

      // EOF is accepted by the initial group, otherwise, an error is returned.
      if (lastPatternResult.errorCode < 0) {
        lastPatternResult = lastPattern.input(REGEXP_END);
      }

      regexpResult.checkedText.add(
        lastPattern.getTextString(), lastPattern.getTextWidth());

      if (lastPatternResult.errorCode >= 0) {
        // Returns an error result with its code, position, and string.
        regexpResult.errorCode = lastPatternResult.errorCode;
        regexpResult.errorPosition =
          regexpResult.checkedText.textString.length;
        if (lastPatternResult.errorString != undefined) {
          regexpResult.errorPosition -= lastPatternResult.errorString.length;
          regexpResult.errorString = lastPatternResult.errorString;
        }
      } else {
        if (regexpLocalized) {
          var halfwidthAlternatives = lastPattern.getHalfwidthAlternatives();
          var fullwidthAlternatives = lastPattern.getFullwidthAlternatives();
          regexpResult.localizedText = new _Text.Text();
          for (let i = 0; i < halfwidthAlternatives.length; i++) {
            if (i > 0) {
              regexpResult.localizedText.append(REGEXP_ALTERNATIVE);
            }
            regexpResult.localizedText.append(halfwidthAlternatives[i]);
            // Don't need embeded halfwidth strings for the root alternative
            // though a fullwidth string exists, different with a group.
            if (fullwidthAlternatives[i].textString != "") {
              regexpResult.localizedText.append(
                REGEXP_ALTERNATIVE).append(fullwidthAlternatives[i]);
            }
          }
        }
        if (regexpWordSet != undefined) {
          regexpResult.wordArray = Array.from(regexpWordSet);
        }
      }

      return regexpResult;
    }

    /*
     * Returns the warning for the specified error result of a checked regular
     * expression.
     */
    function getErrorWarning(regexpName, regexpResult) {
      var regexpMessageId;
      var regexpErrorString = regexpResult.errorString;
      var substitutions = new Array();
      var description = undefined;
      var emphasisRegexpString = undefined;
      if (regexpErrorString != undefined) {
        description =
          regexpName + _Text.COLON + " " + regexpResult.checkedText.textString;
        emphasisRegexpString = "(" + _Regexp.escape(regexpErrorString) + ")";
      }
      switch (regexpResult.errorCode) {
      case REGEXP_SMALL_C:
        if (regexpErrorString != undefined) {
          regexpMessageId = "ControlEscapeNotFollowedByAlphabet";
        } else {
          regexpMessageId = "ControlEscapeNotCompleted";
        }
        break;
      case REGEXP_SMALL_X:
        if (regexpErrorString != undefined) {
          regexpMessageId = "HexadecimalEscapeNotFollowedByHexadecimalDigits";
        } else {
          regexpMessageId = "HexadecimalEscapeNotCompleted";
        }
        break;
      case REGEXP_SMALL_U:
        if (regexpErrorString != undefined) {
          if (regexpErrorString.length > 1) {
            regexpMessageId = "UnicodeValueNotSpecifiedByFourOrFiveHexDigits";
          } else {
            regexpMessageId = "UnicodeEscapeNotFollowedByHexDigits";
          }
        } else {
          regexpMessageId = "UnicodeEscapeNotCompleted";
        }
        break;
      case REGEXP_SMALL_P:
      case REGEXP_P:
        regexpMessageId = "UnicodePropertyEscapesUnsupported";
        break;
      case REGEXP_RIGHT_PARENTHESIS:
        regexpMessageId = "GroupNotCompleted";
        break;
      case REGEXP_QUESTION:
        regexpMessageId =
          "NonCapturingOrNamedCapturingGroupNotStartedCorrectly";
        break;
      case REGEXP_EQUALS:
      case REGEXP_EXCLAMATION:
        regexpMessageId = "AssertionUnsupported";
        break;
      case REGEXP_K:
        regexpMessageId = "GroupNameEscapeNotFollowedByLeftAngleBracket";
        break;
      case REGEXP_SMALL_K:
      case REGEXP_LEFT_ANGLE_BRACKET:
        if (regexpErrorString != undefined) {
          if (regexpErrorString != "") {
            regexpMessageId = "NonAlphanumericGroupNameUnupported";
          } else {
            regexpMessageId = "GroupNameNotSpecified";
            emphasisRegexpString += ">";
          }
        } else {
          regexpMessageId = "GroupNameNotCompleted";
        }
        break;
      case REGEXP_RIGHT_ANGLE_BRACKET:
        regexpMessageId = "GroupNameNotCompleted";
        break;
      case REGEXP_LEFT_BRACKET:
        regexpMessageId = "CharacterSetNotSpecified";
        emphasisRegexpString += "\\]";
        break;
      case REGEXP_HYPHEN:
        regexpMessageId = "CharacterRangeNotHyphenatedFromLessToMoreValue";
        break;
      case REGEXP_RIGHT_BRACKET:
        regexpMessageId = "CharacterSetNotCompleted";
        break;
      case REGEXP_LEFT_BRACE:
        if (regexpErrorString != "") {
          regexpMessageId = "OccurrenceNumberSpecifiedByNumerics";
        } else {
          regexpMessageId = "OccurrenceNumberNotSpecified";
          emphasisRegexpString += "[,}]";
        }
        break;
      case REGEXP_0:
        regexpMessageId = "OccurrenceNumberNotSpecifiedByValueRange";
        substitutions.push("0");
        substitutions.push(String(REGEXP_OCURRENCE_MAX_VALUE));
        emphasisRegexpString += "[,}]";
        break;
      case REGEXP_COMMA:
        regexpMessageId = "OccurrenceNumberNotArrangedFromLessToMoreValue";
        emphasisRegexpString += "\\}";
        break;
      case REGEXP_RIGHT_BRACE:
        regexpMessageId = "OccurrenceNumberNotCompleted";
        break;
      case REGEXP_ASTERISK:
        regexpMessageId = "QuantifierNotPrecededByCharacterOrGroup";
        break;
      case _Text.ESCAPE_CHARACTER:
        regexpMessageId = "EscapeCharacterNotFollowedByCharacter";
        break;
      default:
        throw newInvalidParameterException(regexpResult.errorCode);
      }
      if (emphasisRegexpString != "") {
        emphasisRegexpString += "$";
      }
      return new ExtractNews.Alert.Warning(
        getRegularExpressionMessage(regexpMessageId, substitutions),
        description, emphasisRegexpString);
    }

    _Regexp.checkRegularExpression = checkRegularExpression;
    _Regexp.getErrorWarning = getErrorWarning;

    /*
     * Returns the alternative string for the specified two regular expression.
     */
    function getAlternative(regexpString1, regexpString2) {
      if (regexpString1 != "") {
        if (regexpString2 != "") {
          return regexpString1 + REGEXP_ALTERNATIVE.textString + regexpString2;
        }
        return regexpString1;
      }
      return regexpString2;
    }

    _Regexp.getAlternative = getAlternative;

    return _Regexp;
  })();
