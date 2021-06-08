/*
 *  Define the class to parse the URL sequentially for a news site.
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
 * Returns the data of the specified URL if on the specified news site,
 * otherwise, undefined;
 */
function getNewsSiteUrlData(site, url) {
  var urlData = {
      hostServer: "",
      hostDomain: site.hostDomain,
      path: ""
    };
  var urlHostPath;
  if (url.startsWith(URL_HTTPS_SCHEME)) {
    urlHostPath = url.substring(URL_HTTPS_SCHEME.length);
  } else if (url.startsWith("//")) {
    urlHostPath = url.substring(2);
  } else if (url.startsWith(URL_PATH_SEPARATOR)) {
    urlData.hostServer = site.hostServer;
    urlData.path = url;
    return urlData;
  } else {
    return undefined;
  }
  if (urlHostPath.startsWith(site.hostDomain)) {
    urlData.path = urlHostPath.substring(site.hostDomain.length);
  } else {
    var urlHostDomainIndex =
      urlHostPath.indexOf(URL_DOMAIN_LABEL_SEPARATOR) + 1;
    var urlHostDomainPath = urlHostPath.substring(urlHostDomainIndex);
    if (! urlHostDomainPath.startsWith(site.hostDomain)) {
      return undefined;
    }
    urlData.hostServer = urlHostPath.substring(0, urlHostDomainIndex - 1);
    urlData.path = urlHostDomainPath.substring(site.hostDomain.length);
  }
  if (urlData.path == "" || urlData.path.startsWith(URL_PATH_SEPARATOR)) {
    return urlData;
  }
  return undefined;
}

const PATH_DIRECTORY_REGEXP = new RegExp(/^\/(?:index.html?)?$/);

/*
 * The object to parse the URL into the path and query sequentially.
 * for a news site.
 */
class NewsSiteUrlParser {
  constructor(urlData) {
    if (urlData == undefined) {
      throw newNullPointerException("urlData");
    }
    this.urlData = urlData;
    var relativePath = urlData.path;
    if (relativePath != "") {
      var fragmentIndex = relativePath.indexOf("#");
      if (fragmentIndex >= 0) {
        relativePath = relativePath.substring(0, fragmentIndex);
      }
      var queryIndex = relativePath.indexOf("?");
      if (queryIndex >= 0) {
        relativePath = relativePath.substring(0, queryIndex);
      }
    }
    this.relativePath = relativePath;
    this.path = "";
  }

  /*
   * Returns true if this parser is completed for the url data.
   */
  isCompleted() {
    return this.relativePath == "";
  }

  /*
   * Returns the path string for the specified ID.
   */
  getPathString(pathId) {
    throw newUnsupportedOperationException();
  }

  /*
   * Returns the path regular expression for the specified ID.
   */
  getPathRegExp(pathId) {
    throw newUnsupportedOperationException();
  }

  /*
   * Returns true if the parsed path ends with the path for the specified ID.
   */
  endsWith(pathId) {
    if (pathId == undefined) {
      throw newNullPointerException("pathId");
    } else if ((typeof pathId) != "string") {
      throw newIllegalArgumentException("pathId");
    }
    return this.path.endsWith(this.getPathString(pathId));
  }

  _parsePath(path) {
    var relativePath = this.relativePath.substring(path.length);
    if (relativePath == "" || relativePath.startsWith(URL_PATH_SEPARATOR)) {
      this.path += path;
      this.relativePath = relativePath;
      return true;
    }
    return false;
  }

  /*
   * Parses the specified path in the current position of URL.
   */
  parsePath(path) {
    if (path == undefined) {
      throw newNullPointerException("path");
    } else if ((typeof path) != "string") {
      throw newIllegalArgumentException("path");
    } else if (path == URL_PATH_SEPARATOR) {
      throw newInvalidParameterException(path);
    } else if (path != "") {
      if (path.endsWith(URL_PATH_SEPARATOR)) {
        path = path.substring(0, path.length - 1);
      }
      if (this.relativePath.startsWith(path)) {
        return this._parsePath(path);
      }
    }
    return false;
  }

  /*
   * Parses the path(s) for the specified ID in the current position of URL.
   */
  parse(pathId) {
    if (pathId == undefined) {
      throw newNullPointerException("pathId");
    } else if ((typeof pathId) != "string") {
      throw newIllegalArgumentException("pathId");
    }
    if (pathId.endsWith("Paths")) {
      for (let path of this.getPathString(pathId).split(",")) {
        if (this.parsePath(path)) {
          return true;
        }
      }
      return false;
    }
    return this.parsePath(this.getPathString(pathId));
  }

  /*
   * Parses the path by the regular expression for the specified ID
   * in the current position of URL.
   */
  parseByRegExp(pathId) {
    if (pathId == undefined) {
      throw newNullPointerException("pathId");
    } else if ((typeof pathId) != "string") {
      throw newIllegalArgumentException("pathId");
    }
    var pathMatch = this.relativePath.match(this.getPathRegExp(pathId));
    if (pathMatch != null) {
      var path = pathMatch[0];
      if (path.endsWith(URL_PATH_SEPARATOR)) {
        path = path.substring(0, path.length - 1);
      }
      return this._parsePath(path);
    }
    return false;
  }

  /*
   * Parses the directory in the current position of URL.
   */
  parseDirectory() {
    var directoryMatch = this.relativePath.match(PATH_DIRECTORY_REGEXP);
    if (directoryMatch != null) {
      return this._parsePath(directoryMatch[0]);
    }
    return false;
  }

  /*
   * Parses the directory hierarchy in the current position of URL.
   */
  parseDirectoryHierarchy() {
    var lastPathIndex = this.relativePath.lastIndexOf(URL_PATH_SEPARATOR);
    if (lastPathIndex >= 0) {
      return this._parsePath(this.relativePath.substring(0, lastPathIndex));
    }
    return false;
  }

  /*
   * Parses the path to the last from the current position of URL.
   */
  parseAll() {
    return this._parsePath(this.relativePath);
  }

  /*
   * Parses the key and value of query parameters in the URL.
   */
  parseQuery() {
    var queryIndex = this.urlData.path.indexOf("?");
    if (queryIndex >= 0) {
      var query = this.urlData.path.substring(queryIndex);
      var queryMap = new Map();
      (new URLSearchParams(query)).forEach((queryValue, queryKey) => {
          queryMap.set(queryKey, queryValue);
        });
      this.queryMap = queryMap;
      return true;
    }
    return false;
  }

  /*
   * Returns the query value parsed for the specified key.
   */
  getQueryValue(queryKey) {
    if (queryKey != undefined && this.queryMap != undefined) {
      return this.queryMap.get(queryKey);
    }
    return undefined;
  }

  /*
   * Returns the string parsed to the current position of URL.
   */
  toString(...queryKeys) {
    var url = URL_HTTPS_SCHEME;
    if (this.urlData.hostServer != "") {
      url += this.urlData.hostServer + URL_DOMAIN_LABEL_SEPARATOR;
    }
    url += this.urlData.hostDomain;
    if (this.path != "") {
      if (this.path != URL_PATH_SEPARATOR) {
        url += this.path;
        if (! this.path.endsWith(URL_PATH_SEPARATOR)
          && this.relativePath != "") {
          // Append a slash to the end of directory path.
          url += URL_PATH_SEPARATOR;
        }
      //} else {
      // Never appended a slash to only the host name.
      }
      if (queryKeys != undefined && this.queryMap != undefined) {
        var query = "";
        queryKeys.forEach((queryKey) => {
            var queryValue = this.queryMap.get(queryKey);
            if (queryValue != undefined) {
              if (query != "") {
                query += "&";
              } else {
                if (this.path == URL_PATH_SEPARATOR) {
                  // Append a slash to only the host name, see above.
                  query = URL_PATH_SEPARATOR;
                }
                query += "?";
              }
              query += queryKey + "=" + queryValue;
            }
          });
        url += query;
      }
    }
    return url;
  }
}
