/*
 *  Define the context menu creation and handling on the background script.
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
 * Functions and constant variables to create the context menu.
 */
ExtractNews.Menus = (() => {
    /*
     * Returns the message on the context menu.
     */
    function getContextMenuMessage(id) {
      return browser.i18n.getMessage("contextMenu" + id);
    }

    const _Menus = { };

    const ID_EXTRACT_NEWS_SETTINGS = "ExtractNewsSettings";

    const ID_SELECT_NEWS_TOPIC = "SelectNewsTopic";
    const ID_SELECT_NEWS_TOPIC_ADDITIONALLY = "SelectNewsTopicAdditionally";
    const ID_SELECT_NEWS_SENDER = "SelectNewsSender";
    const ID_SELECT_NEWS_SENDER_ADDITIONALLY = "SelectNewsSenderAdditionally";
    const ID_EXCLUDE_NEWS_TOPIC = "ExcludeNewsTopic";
    const ID_EXCLUDE_NEWS_TOPIC_ADDITIONALLY = "ExcludeNewsTopicAdditionally";

    const ID_DISABLE_TAB_LINK = "DisableTabLink";
    const ID_DISABLE_TAB_NEWS_SELECTION = "DisableTabNewsSelection";

    const ID_SAVE_TAB_NEWS_SELECTION = "SaveTabNewsSelection";
    const ID_CLEAR_TAB_SELECTED_TOPIC = "ClearTabSelectedTopic";
    const ID_CLEAR_TAB_SELECTED_SENDER = "ClearTabSelectedSender";
    const ID_CLEAR_TAB_NEWS_EXCLUSION = "ClearTabNewsExclusion";

    const ID_HIDE_COMMENT = "HideComment";

    _Menus.ID_SELECT_NEWS_TOPIC = ID_SELECT_NEWS_TOPIC;
    _Menus.ID_SELECT_NEWS_TOPIC_ADDITIONALLY =
      ID_SELECT_NEWS_TOPIC_ADDITIONALLY;
    _Menus.ID_SELECT_NEWS_SENDER = ID_SELECT_NEWS_SENDER;
    _Menus.ID_SELECT_NEWS_SENDER_ADDITIONALLY =
      ID_SELECT_NEWS_SENDER_ADDITIONALLY;
    _Menus.ID_EXCLUDE_NEWS_TOPIC = ID_EXCLUDE_NEWS_TOPIC;
    _Menus.ID_EXCLUDE_NEWS_TOPIC_ADDITIONALLY =
      ID_EXCLUDE_NEWS_TOPIC_ADDITIONALLY;

    _Menus.ID_DISABLE_TAB_LINK = ID_DISABLE_TAB_LINK;
    _Menus.ID_DISABLE_TAB_NEWS_SELECTION = ID_DISABLE_TAB_NEWS_SELECTION;
    _Menus.ID_SAVE_TAB_NEWS_SELECTION = ID_SAVE_TAB_NEWS_SELECTION;
    _Menus.ID_CLEAR_TAB_SELECTED_TOPIC = ID_CLEAR_TAB_SELECTED_TOPIC;
    _Menus.ID_CLEAR_TAB_SELECTED_SENDER = ID_CLEAR_TAB_SELECTED_SENDER;
    _Menus.ID_CLEAR_TAB_NEWS_EXCLUSION = ID_CLEAR_TAB_NEWS_EXCLUSION;
    _Menus.ID_HIDE_COMMENT = ID_HIDE_COMMENT;

    const ID_SEPARATOR = "Separator";
    const ID_HIDE_COMMENT_SEPARATOR = "HideCommentSeparator";

    var menuIconMap = new Map();

    menuIconMap.set(ID_SELECT_NEWS_TOPIC, "select_news_topic");
    menuIconMap.set(
      ID_SELECT_NEWS_TOPIC_ADDITIONALLY, "select_news_topic_additionally");
    menuIconMap.set(ID_SELECT_NEWS_SENDER, "select_news_sender");
    menuIconMap.set(
      ID_SELECT_NEWS_SENDER_ADDITIONALLY, "select_news_sender_additionally");
    menuIconMap.set(ID_EXCLUDE_NEWS_TOPIC, "exclude_news_topic");
    menuIconMap.set(
      ID_EXCLUDE_NEWS_TOPIC_ADDITIONALLY, "exclude_news_topic_additionally");
    menuIconMap.set(ID_SAVE_TAB_NEWS_SELECTION, "save_tab_news_selection");
    menuIconMap.set(ID_CLEAR_TAB_SELECTED_TOPIC, "clear_tab_selected_topic");
    menuIconMap.set(ID_CLEAR_TAB_SELECTED_SENDER, "clear_tab_selected_sender");
    menuIconMap.set(ID_CLEAR_TAB_NEWS_EXCLUSION, "clear_tab_news_exclusion");

    const DISABLED_ICON_SUFFIX = "_disabled";

    function _menuIcons(iconName) {
      if (iconName != undefined) {
        return {
            "16": "icons/" + iconName + "-16.png",
            "32": "icons/" + iconName + "-32.png"
          };
      }
      return undefined;
    }

    // The context menu applied to a selection text which is excluded
    // or selected on news site
    const NEWS_SELECTION_MENUS = [
        ID_SELECT_NEWS_TOPIC,
        ID_SELECT_NEWS_TOPIC_ADDITIONALLY,
        ID_SELECT_NEWS_SENDER,
        ID_SELECT_NEWS_SENDER_ADDITIONALLY,
        ID_SEPARATOR,
        ID_EXCLUDE_NEWS_TOPIC,
        ID_EXCLUDE_NEWS_TOPIC_ADDITIONALLY
      ];

    // The context menu applied to the element of news sites which are not
    // including a textarea, nested iframe, image, link, selection text, and
    // audio or video element.
    const NEWS_SITE_MENUS = [
        ID_DISABLE_TAB_LINK,
        ID_DISABLE_TAB_NEWS_SELECTION,
        ID_SEPARATOR,
        ID_SAVE_TAB_NEWS_SELECTION,
        ID_CLEAR_TAB_SELECTED_TOPIC,
        ID_CLEAR_TAB_SELECTED_SENDER,
        ID_CLEAR_TAB_NEWS_EXCLUSION,
        ID_HIDE_COMMENT_SEPARATOR,
        ID_HIDE_COMMENT
      ];

    /*
     * Removes and creates the context menu applied on only enabled news sites
     * and returns the promise.
     */
    function createContextMenus() {
      var enabledSiteUrlPatterns = ExtractNews.getEnabledNewsSiteUrlPatterns();
      var enabledCommentSiteUrlPatterns =
        ExtractNews.getEnabledCommentSiteUrlPatterns();
      var separatorCount = 0;

      return callAsynchronousAPI(browser.contextMenus.removeAll).then(() => {
          browser.contextMenus.create({
              id: ID_EXTRACT_NEWS_SETTINGS,
              title: getContextMenuMessage(ID_EXTRACT_NEWS_SETTINGS),
              contexts: [ "page", "selection" ],
              documentUrlPatterns: enabledSiteUrlPatterns
            });

          NEWS_SELECTION_MENUS.forEach((menuId) => {
              var menuTitle = undefined;
              var menuType = "normal";
              switch (menuId) {
              case ID_SEPARATOR:
                separatorCount++;
                menuId += String(separatorCount);
                menuType = "separator";
                break;
              default:
                menuTitle = getContextMenuMessage(menuId);
                break;
              }
              var createProperties = {
                  parentId: ID_EXTRACT_NEWS_SETTINGS,
                  id: menuId,
                  title: menuTitle,
                  type: menuType,
                  contexts: [ "selection" ],
                  documentUrlPatterns: enabledSiteUrlPatterns
                };
              if (browser.contextMenus.refresh != undefined) {
                createProperties.icons = _menuIcons(menuIconMap.get(menuId));
              }
              browser.contextMenus.create(createProperties);
            });

          NEWS_SITE_MENUS.forEach((menuId) => {
              var menuTitle = undefined;
              var menuType = "normal";
              var menuEnabled = true;
              var menuChecked = undefined;
              var menuUrlPatterns = enabledSiteUrlPatterns;
              var menuIconName = menuIconMap.get(menuId);
              switch (menuId) {
              case ID_HIDE_COMMENT_SEPARATOR:
                menuUrlPatterns = enabledCommentSiteUrlPatterns;
              case ID_SEPARATOR:
                separatorCount++;
                menuId += String(separatorCount);
                menuType = "separator";
                break;
              case ID_HIDE_COMMENT:
                menuUrlPatterns = enabledCommentSiteUrlPatterns;
              case ID_DISABLE_TAB_LINK:
              case ID_DISABLE_TAB_NEWS_SELECTION:
                menuType = "checkbox";
              default:
                if (menuIconName != undefined) {
                  menuEnabled = false;
                  menuIconName += DISABLED_ICON_SUFFIX;
                }
                menuTitle = getContextMenuMessage(menuId);
                break;
              }
              var createProperties = {
                  parentId: ID_EXTRACT_NEWS_SETTINGS,
                  id: menuId,
                  title: menuTitle,
                  type: menuType,
                  enabled: menuEnabled,
                  checked: menuChecked,
                  contexts: [ "page" ],
                  documentUrlPatterns: menuUrlPatterns
                };
              if (browser.contextMenus.refresh != undefined) {
                createProperties.icons = _menuIcons(menuIconName);
              }
              browser.contextMenus.create(createProperties);
            });
        });
    }

    _Menus.createContextMenus = createContextMenus;

    // Enable or disable the menu of the specified ID on a tab
    // and sets light or dark icon.

    function _updateTabNewsSettingMenuDisabled(menuId, menuDisabled) {
      var menuUpdateProperty = {
          enabled: ! menuDisabled
        };
      if (browser.contextMenus.refresh != undefined) {
        var menuIconSuffix = "";
        if (menuDisabled) {
          menuIconSuffix = DISABLED_ICON_SUFFIX;
        }
        menuUpdateProperty.icons =
          _menuIcons(menuIconMap.get(menuId) + menuIconSuffix);
      }
      return callAsynchronousAPI(
        browser.contextMenus.update, menuId, menuUpdateProperty);
    }

    function _updateTabNewsSettingMenus(tabSetting) {
      if (tabSetting == undefined) {
        throw newNullPointerException("tabSetting");
      }
      return Promise.all(
        Array.of(
          _updateTabNewsSettingMenuDisabled(
            ID_SAVE_TAB_NEWS_SELECTION,
            tabSetting.newsSelectedTopicRegularExpression == ""
              && tabSetting.newsSelectedSenderRegularExpression == ""),
          _updateTabNewsSettingMenuDisabled(
            ID_CLEAR_TAB_SELECTED_TOPIC,
            tabSetting.newsSelectedTopicRegularExpression == ""),
          _updateTabNewsSettingMenuDisabled(
            ID_CLEAR_TAB_SELECTED_SENDER,
            tabSetting.newsSelectedSenderRegularExpression == ""),
          _updateTabNewsSettingMenuDisabled(
            ID_CLEAR_TAB_NEWS_EXCLUSION,
            tabSetting.newsExcludedRegularExpression == "")
        ));
    }

    /*
     * Updates the context menu to save news selection and clear selected
     * or excluded topics and/or senders for the specified setting on a tab
     * and returns the promise.
     */
    function updateTabNewsSettingContextMenus(tabSetting) {
      return _updateTabNewsSettingMenus(tabSetting).then(() => {
          if (browser.contextMenus.refresh != undefined) {
            browser.contextMenus.refresh();
          }
        });
    }

    function _updateMenuChecked(menuId, checked) {
      return callAsynchronousAPI(browser.contextMenus.update, menuId, {
          checked: checked
        });
    }

    /*
     * Updates the context menu applied to a tab for the specified setting
     * and returns the promise.
     */
    function updateContextMenus(tabSetting) {
      return Promise.all(
        Array.of(
          _updateTabNewsSettingMenus(tabSetting),
          _updateMenuChecked(ID_DISABLE_TAB_LINK, tabSetting.linkDisabled),
          _updateMenuChecked(
            ID_DISABLE_TAB_NEWS_SELECTION, tabSetting.newsSelectionDisabled),
          _updateMenuChecked(ID_HIDE_COMMENT, tabSetting.newsCommentHidden)
        )).then(() => {
          if (browser.contextMenus.refresh != undefined) {
            browser.contextMenus.refresh();
          }
        });
    }

    _Menus.updateTabNewsSettingContextMenus = updateTabNewsSettingContextMenus;
    _Menus.updateContextMenus = updateContextMenus;

    return _Menus;
  })();
