/*
 *  Display news topics or media arranged on the site except for news sites.
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
    if (urlSite != undefined && urlSite.isEnabled()) {
      var urlParser = new UrlParser(getUrlData(urlSite.data, document.URL));

      Site.setNewsOpenedUrl(urlParser.toString());
      Site.setNewsSelector(new Selector(urlSite.language));
    }
    Site.displayNewsDesigns();
  }).catch((error) => {
    Debug.printStackTrace(error);
  });
