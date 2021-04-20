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

const PATH_DIRECTORY_REGEXP = new RegExp(/^\/(?:index.html?)?$/);
const PATH_HTML_DOCUMENT_REGEXP = new RegExp(/[^/]+\.html?$/);

/*
 * The object to parse the URL into a host server, path, and query
 * sequentially for a news site.
 */
class NewsSiteUrlParser {
  constructor(site, url) {
    if (site == undefined) {
      throw newNullPointerException("site");
    } else if (url == undefined) {
      throw newNullPointerException("url");
    } else if ((typeof url) != "string") {
      throw newIllegalArgumentException("url");
    }
    this.site = site;
    this.url = url;
    this.urlPathParsed = false;
    this.urlParams = { path: "" };
  }

  /*
   * Parses the host name on this site in the current position of URL.
   */
  parseHostName() {
    if (this.urlParams.hostServer == undefined) {
      var hostPath;
      var hostServer = "";
      var relativePath = undefined;
      if (this.url.startsWith(URL_HTTPS_SCHEME)) {
        hostPath = this.url.substring(URL_HTTPS_SCHEME.length);
      } else if (this.url.startsWith("//")) {
        hostPath = this.url.substring(2);
      } else if (this.url.startsWith("/")) {
        var domainIndex = document.URL.indexOf(this.site.domain);
        if (domainIndex > 1) {
          hostServer =
            document.URL.substring(URL_HTTPS_SCHEME.length, domainIndex - 1);
        }
        relativePath = this.url;
      } else {
        return false;
      }
      if (relativePath == undefined) {
        if (hostPath.startsWith(this.site.domain)) {
          relativePath = hostPath.substring(this.site.domain.length);
        } else {
          var domainIndex = hostPath.indexOf(".") + 1;
          var domainPath = hostPath.substring(domainIndex);
          if (! domainPath.startsWith(this.site.domain)) {
            return false;
          }
          hostServer = hostPath.substring(0, domainIndex - 1);
          relativePath = domainPath.substring(this.site.domain.length);
        }
      }
      if (relativePath == "" || relativePath.startsWith("/")) {
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
        this.urlParams.hostServer = hostServer;
        this.urlParams.relativePath = relativePath;
        if (this.site.rootDirectoryPath == "") {
          this.urlPathParsed = true;
        }
        return true;
      }
    }
    return false;
  }

  _parsePath(path) {
    var relativePath = this.urlParams.relativePath.substring(path.length);
    if (relativePath == "" || relativePath.startsWith("/")) {
      this.urlParams.path += path;
      this.urlParams.relativePath = relativePath;
      return true;
    }
    return false;
  }

  /*
   * Parses the root directory on this site in the current position of URL.
   */
  parseRootDirectory() {
    if (this.urlParams.relativePath != undefined
      && this.urlParams.relativePath.startsWith(this.site.rootDirectoryPath)) {
      if (this._parsePath(this.site.rootDirectoryPath)) {
        this.urlPathParsed = true;
        return true;
      }
    }
    return false;
  }

  /*
   * Parses the specified path in the current position of URL.
   */
  parse(path) {
    if (path == undefined) {
      throw newNullPointerException("path");
    } else if ((typeof path) != "string") {
      throw newIllegalArgumentException("path");
    } else if (path == "/") {
      throw newInvalidParameterException(path);
    } else if (path != "" && this.urlPathParsed) {
      if (path.endsWith("/")) {
        path = path.substring(0, path.length - 1);
      }
      if (this.urlParams.relativePath.startsWith(path)) {
        return this._parsePath(path);
      }
    }
    return false;
  }

  /*
   * Parses a path from the specified array in the current position of URL.
   */
  parseFrom(paths) {
    if (! Array.isArray(paths)) {
      throw newIllegalArgumentException("paths");
    }
    for (let i = 0; i < paths.length; i++) {
      if (this.parse(paths[i])) {
        return true;
      }
    }
    return false;
  }

  /*
   * Parses the directory in the current position of URL.
   */
  parseDirectory() {
    if (this.urlPathParsed) {
      var directoryMatch =
        this.urlParams.relativePath.match(PATH_DIRECTORY_REGEXP);
      if (directoryMatch != null) {
        return this._parsePath(directoryMatch[0]);
      }
    }
    return false;
  }

  /*
   * Parses the directory hierarchy in the current position of URL.
   */
  parseDirectoryHierarchy() {
    if (this.urlPathParsed) {
      var lastPathIndex = this.urlParams.relativePath.lastIndexOf("/");
      if (lastPathIndex >= 0) {
        return this._parsePath(
          this.urlParams.relativePath.substring(0, lastPathIndex));
      }
    }
    return false;
  }

  /*
   * Parses the path to the last from the current position of URL.
   */
  parseAll() {
    if (this.urlPathParsed) {
      return this._parsePath(this.urlParams.relativePath);
    }
    return false;
  }

  /*
   * Returns the array into which String.match() stores the result
   * of matching the path in the current position of URL against
   * the specified regular expression.
   */
  match(pathRegexp) {
    if (pathRegexp == undefined) {
      throw newNullPointerException("pathRegexp");
    }
    if (this.urlPathParsed) {
      return this.urlParams.relativePath.match(pathRegexp);
    }
    return null;
  }

  /*
   * Returns the array into which String.match() stores the result
   * of matching the path in the current position of URL against
   * /[^/]+\.html?$/.
   */
  matchHtmlDocument() {
    return this.match(PATH_HTML_DOCUMENT_REGEXP);
  }

  /*
   * Parses the key and value of query parameters in the URL.
   */
  parseQuery() {
    var queryIndex = this.url.indexOf("?");
    if (queryIndex >= 0) {
      var query = this.url.substring(queryIndex);
      var queryMap = new Map();
      (new URLSearchParams(query)).forEach((queryValue, queryKey) => {
          queryMap.set(queryKey, queryValue);
        });
      this.urlParams.queryMap = queryMap;
      return true;
    }
    return false;
  }

  isCompleted() {
    return this.urlPathParsed && this.urlParams.relativePath == "";
  }

  get hostServer() {
    return this.urlParams.hostServer;
  }

  get path() {
    return this.urlParams.path;
  }

  getQueryValue(queryKey) {
    if (this.urlParams.queryMap != undefined) {
      return this.urlParams.queryMap.get(queryKey);
    }
    return undefined;
  }

  /*
   * Returns the string parsed to the current position of URL.
   */
  toString(queryKeys) {
    if (this.path != "" && this.path != this.site.rootDirectoryPath) {
      var url = URL_HTTPS_SCHEME;
      if (this.hostServer != "") {
        url += this.hostServer + ".";
      }
      url += this.site.domain;
      if (this.path != "/") {
        url += this.path;
        if (! this.path.endsWith("/")
          && this.urlParams.relativePath != "") {
          // Append a slash to the end of directory path.
          url += "/";
        }
      //} else {
      // Never appended a slash to only the host name.
      }
      if (queryKeys != undefined && this.urlParams.queryMap != undefined) {
        var query = "";
        queryKeys.forEach((queryKey) => {
            var queryValue = this.urlParams.queryMap.get(queryKey);
            if (queryValue != undefined) {
              if (query != "") {
                query += "&";
              } else {
                if (this.path == "/") {
                  // Append a slash to only the host name, see above.
                  query = "/";
                }
                query += "?";
              }
              query += queryKey + "=" + queryValue;
            }
          });
        url += query;
      }
      return url;
    }
    return undefined;
  }
}
