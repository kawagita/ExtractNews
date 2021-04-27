/*
 *  Define debug and error handling of this extension.
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

const LOGGING_PREFIX = "[ExtractNews]: ";
const LOGGING_LINE_BREAK_INDENT = "\n" + LOGGING_PREFIX.replace(/./g, " ");

/*
 * The logging object of this extension.
 */
class Logger {
  constructor() {
  }

  /*
   * Returns true if this logging is on.
   */
  isLoggingOn() {
    return false;
  }

  _getLoggingMessage(message) {
    return LOGGING_PREFIX + message.replace("\n", LOGGING_LINE_BREAK_INDENT);
  }

  /*
   * Prints the specified message to the console.
   */
  printMessage(message) {
    if (message == undefined) {
      throw newNullPointerException("message");
    } else if ((typeof message) != "string") {
      throw newIllegalArgumentException("message");
    } else if (this.isLoggingOn()) {
      console.log(this._getLoggingMessage(message));
    }
  }

  /*
   * Prints the specified name and value to the console.
   */
  printProperty(name, value = "undefined") {
    if (name == undefined) {
      throw newNullPointerException("name");
    } else if ((typeof name) != "string") {
      throw newIllegalArgumentException("name");
    } else if (this.isLoggingOn()) {
      console.log(this._getLoggingMessage(name + ": " + value.toString()));
    }
  }

  /*
   * Prints the specified node or nodes in the specified array to the console.
   */
  printNodes(nodes) {
    if (this.isLoggingOn()) {
      if (Array.isArray(nodes)) {
        nodes.forEach((node) => {
            console.log(node);
          });
      } else {
        console.log(nodes);
      }
    }
  }

  /*
   * Prints the specified object by JSON format to the console.
   */
  printJSON(object) {
    if (object == undefined) {
      throw newNullPointerException("object");
    } else if (this.isLoggingOn()) {
      console.log(JSON.parse(JSON.stringify(object)));
    }
  }

  /*
   * Prints the string joined the specified values by the specified separator
   * unconditionally to the console.
   */
  dump(separator, ...values) {
    if (separator == undefined) {
      throw newNullPointerException("separator");
    } else if ((typeof separator) != "string") {
      throw newIllegalArgumentException("separator");
    } else if (! Array.isArray(values)) {
      throw newIllegalArgumentException("values");
    }
    console.log(values.join(separator));
  }

  /*
   * Prints the specified error or backtrace unconditionally to the console.
   */
  printStackTrace(error) {
    if (error.stack != undefined && error.stack.length > 0) {
      console.error(error.stack);
    } else {
      console.error(error.name + ": " + error.message);
    }
  }
}

/*
 * Creates an exception which occurs at run time.
 */
function newRuntimeException(message, exceptionName) {
  if ((typeof message) != "string") {
    throw newIllegalArgumentException("message");
  }
  var exception = new Error(message);
  if (exceptionName != undefined) {
    exception.name = exceptionName;
  } else {
    exception.name = "RuntimeException";
  }
  return exception;
}

/*
 * Creates an exception which occurs by a null pointer at run time.
 */
function newNullPointerException(name) {
  if (name == undefined) {
    throw newNullPointerException("name");
  } else if ((typeof name) != "string") {
    throw newIllegalArgumentException("name");
  }
  return newRuntimeException(name + " is undefined.", "NullPointerException");
}

/*
 * Creates an exception which occurs by an illegal argument at run time.
 */
function newIllegalArgumentException(name) {
  if (name == undefined) {
    throw newNullPointerException("name");
  } else if ((typeof name) != "string") {
    throw newIllegalArgumentException("name");
  }
  return newRuntimeException(
    name + " is an illegal argument.", "IllegalArgumentException");
}

/*
 * Creates an exception which occurs by an invalid parameter at run time.
 */
function newInvalidParameterException(value) {
  if (value == undefined) {
    throw newNullPointerException("value");
  } else if (Array.isArray(value) && value.length == 0) {
    value = "empry array";
  } else if ((typeof value) == "string") {
    if (value == "") {
      value = "empry string";
    }
  }
  return newRuntimeException(
    value.toString() + " is an invalid parameter.",
    "InvalidParameterException");
}

/*
 * Creates an exception which occurs by the specified index is out of a range
 * at run time.
 */
function newIndexOutOfBoundsException(name, index) {
  if (name == undefined) {
    throw newNullPointerException("name");
  } else if ((typeof name) != "string") {
    throw newIllegalArgumentException("name");
  } else if ((typeof index) != "number") {
    throw newIllegalArgumentException("index");
  }
  return newRuntimeException(
    String(index) + " is out of " + name + ".", "IndexOutOfBoundsException");
}

/*
 * Creates an exception which occurs by an empty string at run time.
 */
function newEmptyStringException(name) {
  if (name == undefined) {
    throw newNullPointerException("name");
  } else if ((typeof name) != "string") {
    throw newIllegalArgumentException("name");
  }
  return newRuntimeException(
    name + " is an empty string.", "EmptyStringException");
}

/*
 * Creates an exception which occurs by an unsupported operation at run time.
 */
function newUnsupportedOperationException() {
  return newRuntimeException("", "UnsupportedOperationException");
}
