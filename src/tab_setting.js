/*
 *  Define the class of the setting for each tab in the background script.
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
 * The setting of a tab.
 */
class TabSetting {
  constructor() {
  }

  /*
   * Returns true if the setting has the regular expression to select news
   * topics on the tab.
   */
  hasNewsSelectedTopicRegularExpression() {
    return false;
  }

  /*
   * Returns true if the setting has the regular expression to select news
   * senders on the tab.
   */
  hasNewsSelectedSenderRegularExpression() {
    return false;
  }

  /*
   * Returns true if the setting has the regular expression to exclude news
   * topics on the tab.
   */
  hasNewsExcludedTopicRegularExpression() {
    return false;
  }

  /*
   * Returns true if the news selection is disabled on the tab.
   */
  isNewsSelectionDisabled() {
    return false;
  }

  /*
   * Sets the specified flag to disable the news selection into the setting.
   */
  setNewsSelectionDisabled(disabled) {
  }

  /*
   * Returns true if the comment is hidden on the tab of a news site.
   */
  isNewsSiteCommentHidden() {
    return false;
  }

  /*
   * Sets the specified flag to hide the comment on a news site into
   * the setting.
   */
  setNewsSiteCommentHidden(hidden) {
  }

  /*
   * Returns true if the hyperlink is disabled on the tab.
   */
  isLinkDisabled() {
    return false;
  }

  /*
   * Sets the specified flag to disable the hyperlink into the setting.
   */
  setLinkDisabled(disabled) {
  }
}
