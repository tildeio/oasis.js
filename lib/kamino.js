/*! Kamino v0.0.1 | http://github.com/Cyril-sf/kamino.js | Copyright 2012, Kit Cambridge | http://kit.mit-license.org */
(function(window) {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;

  Kamino = {};
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Kamino;
    }
    exports.Kamino = Kamino;
  } else {
    window['Kamino'] = Kamino;
  }

  Kamino.VERSION = '0.1.0';

  KaminoException = function() {
    this.name = "KaminoException";
    this.number = 25;
    this.message = "Uncaught Error: DATA_CLONE_ERR: Kamino Exception 25";
  };

  // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
  var isExtended = new Date(-3509827334573292);
  try {
    // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
    // results for certain dates in Opera >= 10.53.
    isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() == 1 &&
      // Safari < 2.0.2 stores the internal millisecond time value correctly,
      // but clips the values returned by the date methods to the range of
      // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
      isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
  } catch (exception) {}

  // IE <= 7 doesn't support accessing string characters using square
  // bracket notation. IE 8 only supports this for primitives.
  var charIndexBuggy = "A"[0] != "A";

  // Define additional utility methods if the `Date` methods are buggy.
  if (!isExtended) {
    var floor = Math.floor;
    // A mapping between the months of the year and the number of days between
    // January 1st and the first of the respective month.
    var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    // Internal: Calculates the number of days between the Unix epoch and the
    // first day of the given month.
    var getDay = function (year, month) {
      return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
    };
  }

  // Internal: Determines if a property is a direct property of the given
  // object. Delegates to the native `Object#hasOwnProperty` method.
  if (!(isProperty = {}.hasOwnProperty)) {
    isProperty = function (property) {
      var members = {}, constructor;
      if ((members.__proto__ = null, members.__proto__ = {
        // The *proto* property cannot be set multiple times in recent
        // versions of Firefox and SeaMonkey.
        "toString": 1
      }, members).toString != getClass) {
        // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
        // supports the mutable *proto* property.
        isProperty = function (property) {
          // Capture and break the object's prototype chain (see section 8.6.2
          // of the ES 5.1 spec). The parenthesized expression prevents an
          // unsafe transformation by the Closure Compiler.
          var original = this.__proto__, result = property in (this.__proto__ = null, this);
          // Restore the original prototype chain.
          this.__proto__ = original;
          return result;
        };
      } else {
        // Capture a reference to the top-level `Object` constructor.
        constructor = members.constructor;
        // Use the `constructor` property to simulate `Object#hasOwnProperty` in
        // other environments.
        isProperty = function (property) {
          var parent = (this.constructor || constructor).prototype;
          return property in this && !(property in parent && this[property] === parent[property]);
        };
      }
      members = null;
      return isProperty.call(this, property);
    };
  }

  // Internal: Normalizes the `for...in` iteration algorithm across
  // environments. Each enumerated key is yielded to a `callback` function.
  forEach = function (object, callback) {
    var size = 0, Properties, members, property, forEach;

    // Tests for bugs in the current environment's `for...in` algorithm. The
    // `valueOf` property inherits the non-enumerable flag from
    // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
    (Properties = function () {
      this.valueOf = 0;
    }).prototype.valueOf = 0;

    // Iterate over a new instance of the `Properties` class.
    members = new Properties();
    for (property in members) {
      // Ignore all properties inherited from `Object.prototype`.
      if (isProperty.call(members, property)) {
        size++;
      }
    }
    Properties = members = null;

    // Normalize the iteration algorithm.
    if (!size) {
      // A list of non-enumerable properties inherited from `Object.prototype`.
      members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
      // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
      // properties.
      forEach = function (object, callback) {
        var isFunction = getClass.call(object) == "[object Function]", property, length;
        for (property in object) {
          // Gecko <= 1.0 enumerates the `prototype` property of functions under
          // certain conditions; IE does not.
          if (!(isFunction && property == "prototype") && isProperty.call(object, property)) {
            callback(property);
          }
        }
        // Manually invoke the callback for each non-enumerable property.
        for (length = members.length; property = members[--length]; isProperty.call(object, property) && callback(property));
      };
    } else if (size == 2) {
      // Safari <= 2.0.4 enumerates shadowed properties twice.
      forEach = function (object, callback) {
        // Create a set of iterated properties.
        var members = {}, isFunction = getClass.call(object) == "[object Function]", property;
        for (property in object) {
          // Store each property name to prevent double enumeration. The
          // `prototype` property of functions is not enumerated due to cross-
          // environment inconsistencies.
          if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
            callback(property);
          }
        }
      };
    } else {
      // No bugs detected; use the standard `for...in` algorithm.
      forEach = function (object, callback) {
        var isFunction = getClass.call(object) == "[object Function]", property, isConstructor;
        for (property in object) {
          if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
            callback(property);
          }
        }
        // Manually invoke the callback for the `constructor` property due to
        // cross-environment inconsistencies.
        if (isConstructor || isProperty.call(object, (property = "constructor"))) {
          callback(property);
        }
      };
    }
    return forEach(object, callback);
  };

  // Public: Serializes a JavaScript `value` as a string. The optional
  // `filter` argument may specify either a function that alters how object and
  // array members are serialized, or an array of strings and numbers that
  // indicates which properties should be serialized. The optional `width`
  // argument may be either a string or number that specifies the indentation
  // level of the output.

  // Internal: A map of control characters and their escaped equivalents.
  var Escapes = {
    "\\": "\\\\",
    '"': '\\"',
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t"
  };

  // Internal: Converts `value` into a zero-padded string such that its
  // length is at least equal to `width`. The `width` must be <= 6.
  var toPaddedString = function (width, value) {
    // The `|| 0` expression is necessary to work around a bug in
    // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
    return ("000000" + (value || 0)).slice(-width);
  };

  // Internal: Double-quotes a string `value`, replacing all ASCII control
  // characters (characters with code unit values between 0 and 31) with
  // their escaped equivalents. This is an implementation of the
  // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
  var quote = function (value) {
    var result = '"', index = 0, symbol;
    for (; symbol = value.charAt(index); index++) {
      // Escape the reverse solidus, double quote, backspace, form feed, line
      // feed, carriage return, and tab characters.
      result += '\\"\b\f\n\r\t'.indexOf(symbol) > -1 ? Escapes[symbol] :
        // If the character is a control character, append its Unicode escape
        // sequence; otherwise, append the character as-is.
        (Escapes[symbol] = symbol < " " ? "\\u00" + toPaddedString(2, symbol.charCodeAt(0).toString(16)) : symbol);
    }
    return result + '"';
  };

  // Internal: detects if an object is a DOM element.
  // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
  var isElement = function(o) {
    return (
      typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
      o && typeof o === "object" && o.nodeType === 1 && typeof o.nodeName==="string"
    );
  };

  // Internal: Recursively serializes an object. Implements the
  // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
  var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
    var value = object[property], originalClassName, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, any, result,
        regExpSource, regExpModifiers = "";
    if( value instanceof Error || value instanceof Function) {
      throw new KaminoException();
    }
    if( isElement( value ) ) {
      throw new KaminoException();
    }
    if (typeof value == "object" && value) {
      originalClassName = getClass.call(value);
      if (originalClassName == "[object Date]" && !isProperty.call(value, "toJSON")) {
        if (value > -1 / 0 && value < 1 / 0) {
          value = value.toUTCString().replace("GMT", "UTC");
        } else {
          value = null;
        }
      } else if (typeof value.toJSON == "function" && ((originalClassName != "[object Number]" && originalClassName != "[object String]" && originalClassName != "[object Array]") || isProperty.call(value, "toJSON"))) {
        // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
        // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
        // ignores all `toJSON` methods on these objects unless they are
        // defined directly on an instance.
        value = value.toJSON(property);
      }
    }
    if (callback) {
      // If a replacement function was provided, call it to obtain the value
      // for serialization.
      value = callback.call(object, property, value);
    }
    if (value === null) {
      return "null";
    }
    if (value === undefined) {
      return undefined;
    }
    className = getClass.call(value);
    if (className == "[object Boolean]") {
      // Booleans are represented literally.
      return "" + value;
    } else if (className == "[object Number]") {
      // Kamino numbers must be finite. `Infinity` and `NaN` are serialized as
      // `"null"`.
      if( value === Number.POSITIVE_INFINITY ) {
        return "Infinity";
      } else if( value === Number.NEGATIVE_INFINITY ) {
        return "NInfinity";
      } else if( isNaN( value ) ) {
        return "NaN";
      }
      return "" + value;
    } else if (className == "[object RegExp]") {
      // Strings are double-quoted and escaped.
      regExpSource = value.source;
      regExpModifiers += value.ignoreCase ? "i" : "";
      regExpModifiers += value.global ? "g" : "";
      regExpModifiers += value.multiline ? "m" : "";

      regExpSource = quote(charIndexBuggy ? regExpSource.split("") : regExpSource);
      regExpModifiers = quote(charIndexBuggy ? regExpModifiers.split("") : regExpModifiers);

      // Adds the RegExp prefix.
      value = '^' + regExpSource + regExpModifiers;

      return value;
    } else if (className == "[object String]") {
      // Strings are double-quoted and escaped.
      value = quote(charIndexBuggy ? value.split("") : value);

      if( originalClassName == "[object Date]") {
        // Adds the Date prefix.
        value = '%' + value;
      }

      return value;
    }
    // Recursively serialize objects and arrays.
    if (typeof value == "object") {
      // Check for cyclic structures. This is a linear search; performance
      // is inversely proportional to the number of unique nested objects.
      for (length = stack.length; length--;) {
        if (stack[length] === value) {
          return "&" + length;
        }
      }
      // Add the object to the stack of traversed objects.
      stack.push(value);
      results = [];
      // Save the current indentation level and indent one additional level.
      prefix = indentation;
      indentation += whitespace;
      if (className == "[object Array]") {
        // Recursively serialize array elements.
        for (index = 0, length = value.length; index < length; any || (any = true), index++) {
          element = serialize(index, value, callback, properties, whitespace, indentation, stack);
          results.push(element === undef ? "null" : element);
        }
        result = any ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
      } else {
        // Recursively serialize object members. Members are selected from
        // either a user-specified list of property names, or the object
        // itself.
        forEach(properties || value, function (property) {
          var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
          if (element !== undef) {
            // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
            // is not the empty string, let `member` {quote(property) + ":"}
            // be the concatenation of `member` and the `space` character."
            // The "`space` character" refers to the literal space
            // character, not the `space` {width} argument provided to
            // `JSON.stringify`.
            results.push(quote(charIndexBuggy ? property.split("") : property) + ":" + (whitespace ? " " : "") + element);
          }
          any || (any = true);
        });
        result = any ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
      }
      return result;
    }
  };

  // Public: `Kamino.stringify`. See ES 5.1 section 15.12.3.
  Kamino.stringify = function (source, filter, width) {
    var whitespace, callback, properties;
    if (typeof filter == "function" || typeof filter == "object" && filter) {
      if (getClass.call(filter) == "[object Function]") {
        callback = filter;
      } else if (getClass.call(filter) == "[object Array]") {
        // Convert the property names array into a makeshift set.
        properties = {};
        for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((getClass.call(value) == "[object String]" || getClass.call(value) == "[object Number]") && (properties[value] = 1)));
      }
    }
    if (width) {
      if (getClass.call(width) == "[object Number]") {
        // Convert the `width` to an integer and create a string containing
        // `width` number of space characters.
        if ((width -= width % 1) > 0) {
          for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
        }
      } else if (getClass.call(width) == "[object String]") {
        whitespace = width.length <= 10 ? width : width.slice(0, 10);
      }
    }
    // Opera <= 7.54u2 discards the values associated with empty string keys
    // (`""`) only if they are used directly within an object member list
    // (e.g., `!("" in { "": 1})`).
    return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
  };

  // Public: Parses a source string.
  var fromCharCode = String.fromCharCode;

  // Internal: A map of escaped control characters and their unescaped
  // equivalents.
  var Unescapes = {
    "\\": "\\",
    '"': '"',
    "/": "/",
    "b": "\b",
    "t": "\t",
    "n": "\n",
    "f": "\f",
    "r": "\r"
  };

  // Internal: Stores the parser state.
  var Index, Source, stack;

  // Internal: Resets the parser state and throws a `SyntaxError`.
  var abort = function() {
    Index = Source = null;
    throw SyntaxError();
  };

  var parseString = function(prefix) {
    prefix = prefix || "";
    var source = Source, length = source.length, value, symbol, begin, position;
    // Advance to the next character and parse a Kamino string at the
    // current position. String tokens are prefixed with the sentinel
    // `@` character to distinguish them from punctuators.
    for (value = prefix, Index++; Index < length;) {
      symbol = source[Index];
      if (symbol < " ") {
        // Unescaped ASCII control characters are not permitted.
        abort();
      } else if (symbol == "\\") {
        // Parse escaped Kamino control characters, `"`, `\`, `/`, and
        // Unicode escape sequences.
        symbol = source[++Index];
        if ('\\"/btnfr'.indexOf(symbol) > -1) {
          // Revive escaped control characters.
          value += Unescapes[symbol];
          Index++;
        } else if (symbol == "u") {
          // Advance to the first character of the escape sequence.
          begin = ++Index;
          // Validate the Unicode escape sequence.
          for (position = Index + 4; Index < position; Index++) {
            symbol = source[Index];
            // A valid sequence comprises four hexdigits that form a
            // single hexadecimal value.
            if (!(symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F")) {
              // Invalid Unicode escape sequence.
              abort();
            }
          }
          // Revive the escaped character.
          value += fromCharCode("0x" + source.slice(begin, Index));
        } else {
          // Invalid escape sequence.
          abort();
        }
      } else {
        if (symbol == '"') {
          // An unescaped double-quote character marks the end of the
          // string.
          break;
        }
        // Append the original character as-is.
        value += symbol;
        Index++;
      }
    }
    if (source[Index] == '"') {
      Index++;
      // Return the revived string.
      return value;
    }
    // Unterminated string.
    abort();
  };

  // Internal: Returns the next token, or `"$"` if the parser has reached
  // the end of the source string. A token may be a string, number, `null`
  // literal, `NaN` literal or Boolean literal.
  var lex = function () {
    var source = Source, length = source.length, symbol, value, begin, position, sign,
        dateString, regExpSource, regExpModifiers;
    while (Index < length) {
      symbol = source[Index];
      if ("\t\r\n ".indexOf(symbol) > -1) {
        // Skip whitespace tokens, including tabs, carriage returns, line
        // feeds, and space characters.
        Index++;
      } else if ("{}[]:,".indexOf(symbol) > -1) {
        // Parse a punctuator token at the current position.
        Index++;
        return symbol;
      } else if (symbol == '"') {
        // Parse strings.
        return parseString("@");
      } else if (symbol == '%') {
        // Parse dates.
        Index++;
        symbol = source[Index];
        if(symbol == '"') {
          dateString = parseString();
          return new Date( dateString );
        }
        abort();
      } else if (symbol == '^') {
        // Parse regular expressions.
        Index++;
        symbol = source[Index];
        if(symbol == '"') {
          regExpSource = parseString();

          symbol = source[Index];
          if(symbol == '"') {
            regExpModifiers = parseString();

            return new RegExp( regExpSource, regExpModifiers );
          }
        }
        abort();
      } else if (symbol == '&') {
        // Parse object references.
        Index++;
        symbol = source[Index];
        if (symbol >= "0" && symbol <= "9") {
          Index++;
          return stack[symbol];
        }
        abort();
      } else {
        // Parse numbers and literals.
        begin = Index;
        // Advance the scanner's position past the sign, if one is
        // specified.
        if (symbol == "-") {
          sign = true;
          symbol = source[++Index];
        }
        // Parse an integer or floating-point value.
        if (symbol >= "0" && symbol <= "9") {
          // Leading zeroes are interpreted as octal literals.
          if (symbol == "0" && (symbol = source[Index + 1], symbol >= "0" && symbol <= "9")) {
            // Illegal octal literal.
            abort();
          }
          sign = false;
          // Parse the integer component.
          for (; Index < length && (symbol = source[Index], symbol >= "0" && symbol <= "9"); Index++);
          // Floats cannot contain a leading decimal point; however, this
          // case is already accounted for by the parser.
          if (source[Index] == ".") {
            position = ++Index;
            // Parse the decimal component.
            for (; position < length && (symbol = source[position], symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              // Illegal trailing decimal.
              abort();
            }
            Index = position;
          }
          // Parse exponents.
          symbol = source[Index];
          if (symbol == "e" || symbol == "E") {
            // Skip past the sign following the exponent, if one is
            // specified.
            symbol = source[++Index];
            if (symbol == "+" || symbol == "-") {
              Index++;
            }
            // Parse the exponential component.
            for (position = Index; position < length && (symbol = source[position], symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              // Illegal empty exponent.
              abort();
            }
            Index = position;
          }
          // Coerce the parsed value to a JavaScript number.
          return +source.slice(begin, Index);
        }
        // A negative sign may only precede numbers.
        if (sign) {
          abort();
        }
        // `true`, `false`, `Infinity`, `-Infinity`, `NaN` and `null` literals.
        if (source.slice(Index, Index + 4) == "true") {
          Index += 4;
          return true;
        } else if (source.slice(Index, Index + 5) == "false") {
          Index += 5;
          return false;
        } else if (source.slice(Index, Index + 8) == "Infinity") {
          Index += 8;
          return Infinity;
        } else if (source.slice(Index, Index + 9) == "NInfinity") {
          Index += 9;
          return -Infinity;
        } else if (source.slice(Index, Index + 3) == "NaN") {
          Index += 3;
          return NaN;
        } else if (source.slice(Index, Index + 4) == "null") {
          Index += 4;
          return null;
        }
        // Unrecognized token.
        abort();
      }
    }
    // Return the sentinel `$` character if the parser has reached the end
    // of the source string.
    return "$";
  };

  // Internal: Parses a Kamino `value` token.
  var get = function (value) {
    var results, any, key;
    if (value == "$") {
      // Unexpected end of input.
      abort();
    }
    if (typeof value == "string") {
      if (value[0] == "@") {
        // Remove the sentinel `@` character.
        return value.slice(1);
      }
      // Parse object and array literals.
      if (value == "[") {
        // Parses a Kamino array, returning a new JavaScript array.
        results = [];
        stack[stack.length] = results;
        for (;; any || (any = true)) {
          value = lex();
          // A closing square bracket marks the end of the array literal.
          if (value == "]") {
            break;
          }
          // If the array literal contains elements, the current token
          // should be a comma separating the previous element from the
          // next.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "]") {
                // Unexpected trailing `,` in array literal.
                abort();
              }
            } else {
              // A `,` must separate each array element.
              abort();
            }
          }
          // Elisions and leading commas are not permitted.
          if (value == ",") {
            abort();
          }
          results.push(get(typeof value == "string" && charIndexBuggy ? value.split("") : value));
        }
        return results;
      } else if (value == "{") {
        // Parses a Kamino object, returning a new JavaScript object.
        results = {};
        stack[stack.length] = results;
        for (;; any || (any = true)) {
          value = lex();
          // A closing curly brace marks the end of the object literal.
          if (value == "}") {
            break;
          }
          // If the object literal contains members, the current token
          // should be a comma separator.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "}") {
                // Unexpected trailing `,` in object literal.
                abort();
              }
            } else {
              // A `,` must separate each object member.
              abort();
            }
          }
          // Leading commas are not permitted, object property names must be
          // double-quoted strings, and a `:` must separate each property
          // name and value.
          if (value == "," || typeof value != "string" || value[0] != "@" || lex() != ":") {
            abort();
          }
          var result = lex();
          results[value.slice(1)] = get(typeof result == "string" && charIndexBuggy ? result.split("") : result);
        }
        return results;
      }
      // Unexpected token encountered.
      abort();
    }
    return value;
  };

  // Internal: Updates a traversed object member.
  var update = function(source, property, callback) {
    var element = walk(source, property, callback);
    if (element === undef) {
      delete source[property];
    } else {
      source[property] = element;
    }
  };

  // Internal: Recursively traverses a parsed Kamino object, invoking the
  // `callback` function for each value. This is an implementation of the
  // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
  var walk = function (source, property, callback) {
    var value = source[property], length;
    if (typeof value == "object" && value) {
      if (getClass.call(value) == "[object Array]") {
        for (length = value.length; length--;) {
          update(value, length, callback);
        }
      } else {
        // `forEach` can't be used to traverse an array in Opera <= 8.54,
        // as `Object#hasOwnProperty` returns `false` for array indices
        // (e.g., `![1, 2, 3].hasOwnProperty("0")`).
        forEach(value, function (property) {
          update(value, property, callback);
        });
      }
    }
    return callback.call(source, property, value);
  };

  // Public: `Kamino.parse`. See ES 5.1 section 15.12.2.
  Kamino.parse = function (source, callback) {
    var result, value;
    Index = 0;
    Source = "" + source;
    stack = [];
    if (charIndexBuggy) {
      Source = source.split("");
    }
    result = get(lex());
    // If a Kamino string contains multiple tokens, it is invalid.
    if (lex() != "$") {
      abort();
    }
    // Reset the parser state.
    Index = Source = null;
    return callback && getClass.call(callback) == "[object Function]" ? walk((value = {}, value[""] = result, value), "", callback) : result;
  };

  Kamino.clone = function(source) {
    return Kamino.parse( Kamino.stringify(source) );
  };
})(this);
