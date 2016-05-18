define(["qc/_core", "dojo/_base/array", "dojo/_base/declare", "dojo/_base/lang", "dojo/number"], function (core, array, declare, lang, number) {

    if (!String.prototype.trim) {
        String.prototype.trim = function () {
            return this.replace(/^\s+|\s+$/g, '');
        }
    };

    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function (value, ignoreCase) {
            if (value && this.length >= value.length) {
                if (ignoreCase) {
                    return (this.substr(0, value.length).toLowerCase() === value.toLowerCase());
                }
                else {
                    return (this.substr(0, value.length) === value);
                }
            }
            else {
                return false;
            }
        }
    };


    var TypeDef = declare("qc.StringUtil", [], {

        reWhitespace: /s+/,

        normalizeWhitespace: function (value) {
            return value.replace(/\s+/g, ' ').trim();
        },

        stripTildeCodes: function (value) {
            var re = /~\S+/gi;
            return core.StringUtil.normalizeWhitespace(value.replace(re, ''));
        },

        toCamelLower: function (value) {
            if (!value) {
                return '';
            };

            if (value.length > 1) {
                return value.substr(0, 1).toLowerCase() + value.substr(1);
            }
            else {
                return value.toLowerCase();
            };
        },

        toCamelUpper: function (value) {
            if (!value) {
                return '';
            };

            if (value.length > 1) {
                return value.substr(0, 1).toUpperCase() + value.substr(1);
            }
            else {
                return value.toUpperCase();
            };
        },

        padLeft: function(input, length, padChar) {
            padChar = padChar || '';
            var sInput = input ? input.toString() : '';
            var sOutput = '';
            for (var n = 0; n < length - sInput.length; n++) {
                sOutput += padChar;
            };
            sOutput += sInput;
            return sOutput;
        },

        toJsonStyleName: function (value) {
            var uc = this.toCamelUpper;
            return array.map(value.split('-'), function (x, i) { return i > 0 ? uc(x) : x }).join('');
        },

        toCSSStyleName: function (value) {
            return value.split(/[A-Z]/g).join('-').toLowerCase();
        },

        buildStringList: function (list, skipDuplicates, excludeExp) {
            if (!list || list.length == 0) {
                return '';
            };

            var buf = [];
            array.forEach(list, function (item) {
                if (item && (!excludeExp || !excludeExp.test(item)) && (!skipDuplicates || array.indexOf(buf, item) < 0)) {
                    buf.push(item);
                };
            });
            return buf.join(',');
        },

        parseStringList: function (value, removeDuplicates, delimiter) {
            var list = [];
            var normItem = '';
            delimiter = delimiter || ',';
            if (value) {
                array.forEach(value.toString().split(delimiter), function (item) {
                    normItem = item.trim();
                    if (normItem && (!removeDuplicates || array.indexOf(list, normItem) < 0)) {
                        list.push(normItem);
                    };
                });
            };
            return list;
        },

        parseCodedList: function (input, sortBy, addEmpty, delimiter) {
            if (!input) {
                return [];
            };
            if (typeof input != 'string') {
                return input;
            };
            delimiter = delimiter || ';';
            var haveEmpty = false;
            var list = [];
            var data = input.replace('[', '').replace(']', '').trim().split(delimiter);

            for (var n = 0; n < data.length; n++) {
                var p = data[n].split('=');
                if (p.length < 2) {
                    list.push({ "id": p[0].toString(), "text": p[0].toString() });
                }
                else {
                    list.push({ "id": p[0].toString(), "text": p[1].toString() });
                };
                if (p[0] == '') {
                    haveEmpty = true;
                }
            };

            if (sortBy) {
                list.sort(function (a, b) { return core.StringUtil.compare(a[sortBy], b[sortBy], true) });
            };

            if (addEmpty && !haveEmpty) {
                list.unshift({ "id": "", "text": "" });
            };

            return list;
        },

        formatCodedList: function (list) {
            list = list || [];
            var buf = array.map(list || [], function (item) {
                if (item.id) {
                    if (item.text && item.text != item.id) {
                        return item.id + '=' + item.text;
                    }
                    else {
                        return item.id;
                    }
                }
                else if (item.text) {
                    return '=' + item.text;
                }
                else {
                    return item.id == undefined ? item.toString() : '';
                }
            });
            return '[' + buf.join(';') + ']';
        },

        makeCaption: function (name) {
            if (!name) {
                return '';
            };

            if (name.length < 3) {
                return name;
            };

            var re = new RegExp("[A-Z]");
            var caption = [];
            caption.push(name.charAt(0).toUpperCase());
            for (var n = 1; n < name.length; n++) {
                if (re.test(name.charAt(n))) {
                    caption.push(' ');
                }
                caption.push(name.charAt(n));
            };
            return caption.join('');
        },

        makeName: function (text) {
            if (!text) {
                return '';
            };

            var name = [];
            var w = text.split(' ');
            for (var n = 0; n < w.length; n++) {
                name.push(w.charAt(0).toUpperCase())
                if (w.length > 1) {
                    name.push(w.substr(1));
                };
            };

            return name.join('');
        },

        parseQueryString: function (url) {
            url = url || window.location.search || '';
            var state = 0;
            var i = 0;
            var len = url.length;
            var parmName = '';
            var parmValue = '';
            var c = '';
            var parms = {};
            while (i < len) {
                c = url.charAt(i);
                switch (state) {
                    case 0:
                        if (c == '?') {
                            parmName = '';
                            state = 1;
                        };
                        break;
                    case 1:
                        switch (c) {
                            case '=':
                                parmValue = '';
                                state = 2;
                                break;
                            case '&':
                                parms[parmName] = true;
                                parmName = '';
                                parmValue = '';
                                state = 1;
                                break;
                            default:
                                parmName += c;
                                break;
                        };
                        break;
                    case 2:
                        switch (c) {
                            case '&':
                                parms[parmName] = parmValue;
                                parmName = '';
                                parmValue = '';
                                state = 1;
                                break;
                            default:
                                parmValue += c;
                                break;
                        }
                    default:
                        break;
                }
                i++;
            };
            if (parmName) {
                parms[parmName] = parmValue;
            };
            return parms;
        },

        compare: function (a, b, ignoreCase) {
            var strA = a ? ignoreCase ? a.toString().toLowerCase() : a.toString() : '';
            var strB = b ? ignoreCase ? b.toString().toLowerCase() : b.toString() : '';
            return strA < strB ? -1 : strA > strB ? 1 : 0;
        },

        simpleObjectDescription: function(obj, maxLength) {
            if (!obj) {
                return '';
            };
            var buf = '';
            var count = 0;
            for (var name in obj) {
                if (buf.length >= maxLength) {
                    return (buf.substr(0, maxLength - 3) + '...');
                }
                if (count > 0) {
                    buf += ', ';
                }
                buf += name
                buf += ':'
                buf += obj[name];

                count++;
            };
            return buf;
        },

        //TODO: needs to be part of a culture specific transcriber
        joinPhrases: function (phrases, delimiter, finalDelimiter) {
            delimiter = delimiter || ', ';
            finalDelimiter = finalDelimiter || ' and ';
            var output = '';
            var phraseList = array.filter(core.forceArray(phrases), function (phrase) { return phrase.toString().trim() ? phrase.toString().trim() : null });
            for (var n = 0, len = phraseList.length; n < len; n++) {
                if (n > 0) {
                    if (n == len - 1) {
                        output += ' ';
                        output += finalDelimiter;
                    }
                    else {
                        output += delimiter;
                    }
                    output += ' ';
                }
                output += phraseList[n];
            };
            return output;
        },

        capitalize: function (text, method) {
            if (!method || method == 'none') {
                return text;
            };
            var sText = text == undefined || text == null ? '' : text.toString();
            if (!sText) {
                return ''
            };
            switch (method) {
                case 'lower':
                    return sText.toLowerCase();
                case 'upper':
                    return sText.toUpperCase();
                case 'sentence':
                    return sText.charAt(0).toUpperCase() + sText.substr(1);
                case 'title':
                    var rxDontModify = new RegExp("(?:[a-z].*[A-Z])|(?:^[A-Z0-9\W]+$)|(?:[\[\/\]])|(?:[\)\(])")
                    var rxCommonShortWord = new RegExp("^(?:a|an|as|at|be|by|do|he|if|in|is|it|me|my|of|on|or|so|to|up|all|and|any|are|but|can|did|for|get|got|had|has|her|him|his|how|its|now|our|the|with)$", "i")
                    return sText.split(' ').map(function (word, i) {
                        if (rxDontModify.test(word)) {
                            return word;
                        }
                        else if (i > 0 && rxCommonShortWord.test(word)) {
                            return word.toLowerCase()
                        }
                        else {
                            return word.charAt(0).toUpperCase() + word.substr(1)
                        }
                    }).join(' ');
            };
        },

        formatNumber: function (input, pattern) {
            if (!pattern) {
                return input;
            };
            var nValue = typeof input == 'number' ? input : parseFloat(input);
            return number.format(nValue, { pattern: pattern });
        }

    });

    core.StringUtil = new TypeDef();

    lang.setObject("qc.StringUtil", core.StringUtil);

    return core.StringUtil;

});

