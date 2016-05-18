define([
    "qc/StringUtil",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/_core"
], function (StringUtil, array, declare, lang, core) {

    core.WordUtil = {

        makeAdverb: function (modifier, text) {
            var advModifiers = ['C', 'EP', 'M', 'MI', 'MK', 'MM', 'SE', 'SM', 'SV', 'TR'];
            if (array.indexOf(advModifiers, modifier) >= 0) {
                return text + 'ly';
            }
            else {
                return text;
            };
        },

        split: function (str) {
            return (str || '').toString().split(/\s+/);
        },

        calcLCSMatrix: function (s1, s2) {
            var d = [];
            var i = 0;
            var j = 0;

            for (i = 0; i <= s1.length; i++) {
                d[i] = [];
                for (j = 0; j <= s2.length; j++) {
                    d[i][j] = 0;
                }
            }

            for (i = 1; i <= s1.length; i++) {
                for (j = 1; j <= s2.length; j++) {
                    if (s1[i - 1] === s2[j - 1]) {
                        d[i][j] = d[i - 1][j - 1] + 1;
                    }
                    else {
                        d[i][j] = Math.max(d[i][j - 1], d[i - 1][j]);
                    }
                }
            }

            return d;
        },

        lcsDiff: function (d, s1, s2, i, j) {
            if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
                return this.lcsDiff(d, s1, s2, i - 1, j - 1) + ' .';
            }
            else if (j > 0 && (i == 0 || d[i][j - 1] >= d[i - 1][j])) {
                return this.lcsDiff(d, s1, s2, i, j - 1) + ' +' + s2[j - 1];
            }
            else if (i > 0 && (j == 0 || d[i][j - 1] < d[i - 1][j])) {
                return this.lcsDiff(d, s1, s2, i - 1, j) + ' -' + s1[i - 1];
            }
            else {
                return '';
            }
        },



        getInsertedSuffix: function (diff) {
            var w = this.split(diff);
            var s = '';
            var first = false;
            for (var n = 0; n < w.length; n++) {
                if (w[n][0] === '+') {
                    if (!first) {
                        s += ' ';
                    }
                    s += w[n].substr(1);
                }
            };
            return s.trim();
        },

        normalizeDiff: function (diff) {
            var m = diff.match(/^((\s\-\w+)+)((\s\+\w+)+)+$/);
            if (m) {
                return this.getInsertedSuffix(diff);
            }

            m = diff.match(/^((\s\.)+)((\s\+\w+)+)+$/);
            if (m) {
                return ('~>' + core.WordUtil.getInsertedSuffix(diff));
            }

            var skip = 0;
            var del = 0;
            var s = "";
            var d = this.split(core.StringUtil.normalizeWhitespace(diff));
            for (var n = 0; n < d.length; n++) {
                switch (d[n][0]) {
                    case '+':
                        if (skip > 0 || del > 0) {
                            s += ("~" + skip + "." + del + ' ');
                            s += (d[n].substr(1) + ' ');
                            skip = 0;
                            del = 0;

                        }
                        else if (n == 0) {
                            s += '~< ';
                            s += (d[n].substr(1) + ' ');
                        }
                        else {
                            s += (d[n].substr(1) + ' ');
                        }
                        break;

                    case '-':
                        del += 1;
                        break;

                    case '.':
                        if (del > 0) {
                            s += ("~" + skip + "." + del + ' ');
                            skip = 0;
                            del = 0;
                        }
                        skip += 1;
                        break;

                    default:
                        break;
                }
            }

            if (del > 0) {
                s += ("~" + skip + "." + del);
            };

            return s.trim();

        },

        diffChars: function (s1, s2) {
            var d = this.calcLCSMatrix(s1, s2);
            return this.lcsDiff(d, s1, s2, s1.length, s2.length);
        },

        diff_LCS: function (s1, s2) {
            var a1 = this.split(s1);
            var a2 = this.split(s2);
            var d = this.calcLCSMatrix(a1, a2);
            return this.lcsDiff(d, a1, a2, a1.length, a2.length);
        },

        diff: function (s1, s2) {
            var a1 = this.split(s1);
            var a2 = this.split(s2);
            var d = this.calcLCSMatrix(a1, a2);
            var lcs = this.lcsDiff(d, a1, a2, a1.length, a2.length);
            return this.normalizeDiff(lcs);
        },

        apply: function (input, diff) {
            if (!diff || diff === '') {
                return input;
            }

            if (diff.indexOf('~') < 0) {
                return diff;
            }

            var iWord = this.split(input);
            var dWord = this.split(diff);
            var output = '';
            var d = 0;
            var i = 0;

            while (d < dWord.length) {
                if (dWord[d][0] === '~') {
                    if (dWord[d][1] === '<') {
                        //skip
                    }
                    else if (dWord[d][1] === '>') {
                        while (i < iWord.length) {
                            output += (iWord[i] + ' ');
                            i += 1;
                        }
                    }
                    else {
                        var m = dWord[d].match(/~(\d+)\.(\d+)/);
                        if (m) {
                            var nCopy = parseInt(m[1], 10);
                            while (nCopy > 0 && i < iWord.length) {
                                output += (iWord[i] + ' ');
                                i += 1;
                                nCopy -= 1;
                            }

                            var nSkip = parseInt(m[2], 10);
                            while (nSkip > 0 && i < iWord.length) {
                                nSkip -= 1;
                                i += 1;
                            }
                        }
                        else {
                            output += (dWord[d] + ' ');
                        }
                    }
                }
                else {
                    output += (dWord[d] + ' ');
                }
                d += 1;
            };

            while (i < iWord.length) {
                output += (iWord[i] + ' ');
                i += 1;
            }

            return output.trim();
        },

        isMatch: function (input, pattern, options) {
            return new RegExp(pattern, options || 'i').test(input);
        },

        autoNegate: function (phrase, defaultPrefix) {
            if (!phrase) {
                return '';
            };

            defaultPrefix = defaultPrefix || 'no';
            var w = this.split(phrase.trim());
            var i = -1;
            var wordCount = w.length;

            var findWord = function (word) {
                for (var n = 0; n < wordCount; n++) {
                    if (w[n].toLowerCase() == word) {
                        return n;
                    };
                };
                return -1;
            };

            var findAny = function (words) {
                for (var n = 0; n < wordCount; n++) {
                    if (array.indexOf(words, w[n].toLowerCase()) >= 0) {
                        return n;
                    };
                };
                return -1;
            };

            var isMatch = this.isMatch;

            var firstWord = function (words) {
                return array.indexOf(core.forceArray(words), w[0]) >= 0;
            };

            // "no" or "not"
            if (firstWord(['no', 'not'])) {
                w.shift();
                return w.join(' ');
            };

            i = findWord('not'); 

            //not better with rest --> better with rest
            if (i == 0) {
                w.shift();
                return w.join(' ');
            };

            //fundus not visualized --> fundus visualized
            if (i > 0) {
                w.splice(i, 1);
                return w.join(' ');
            };

            //a tooth was lost --> no tooth was lost
            if (firstWord(['a', 'an'])) { // "a" or "an"
                w[0] = 'no';
                return w.join(' ');
            };

            //on the left --> not on the left
            if (firstWord(['of', 'in', 'to', 'for', 'on', 'by', 'at', 'from', 'as', 'into', 'about', 'like', 'after', 'between', 'over', 'during', 'around', 'because', 'under', 'before', 'upon', 'with', 'made', 'worse', 'above', 'when', 'while', 'better', 'along', 'all'])) {
                w.unshift('not');
                return w.join(' ');
            };

            //unable to swallow --> able to swallow
            if (firstWord('unable')) {
                w[0] = 'able';
                return w.join(' ');
            };

            //negative --> positive
            i = findWord('negative');
            if (i >= 0) {
                w[i] = 'positive';
                return w.join(' ');
            };

            //positive --> negative
            i = findWord('positive');
            if (i >= 0) {
                w[i] = 'negative';
                return w.join(' ');
            };

            //size of the head is abnormal --> size of the head is normal
            i = findWord('abnormal');
            if (i >= 0) {
                w[i] = 'normal';
                return w.join(' ');
            };

            //family history of  --> no family history of
            if (firstWord('family')) {
                w.unshift('no');
                return w.join(' ');
            };

            //feverish --> not feverish
            if (wordCount == 1 && isMatch(w[0], '\w+(t|d|ish|ic|ing|ed|ar|al|te|ous|y|ive)$')) {
                w.unshift('not');
                return w.join(' ');
            };

            //relapses --> not relapsing
            if (isMatch(w[0], '\w+ses$')) {
                w[0] = w[0].substr(0, w[0].length - 2) + 'ing';
                w.unshift('not');
                return w.join(' ');
            };

            //initiates coughing --> does not initiate coughing 
            if (isMatch(w[0], '\w+tes$')) {
                w[0] = w[0].substr(0, w[0].length - 1);
                w.unshift('does not');
                return w.join(' ');
            };

            if (isMatch(w[0], '(ed|ly)$')) {
                w.unshift('not');
                return w.join(' ');
            };

            i = findAny(['is', 'are', 'were', 'was', 'have', 'has', 'had']);
            if (i >= 0) {
                w.splice(i + 1, 0, 'not');
                return w.join(' ');
            };

            // headache starts suddenly --> headache does not start suddenly
            i = findAny(['starts', 'stops', 'comes', 'feels', 'begins', 'ends', 'occurs']);
            if (i >= 0) {
                w[i] = w[i].substr(0, w[i].length - 1);
                w.splice(i, 0, 'does not');
                return w.join(' ');
            };

            // legs feel weak --> legs do not feel weak
            i = findAny(['start', 'stop', 'come', 'feel', 'begin', 'end', 'occur']);
            if (i >= 0) {
                w.splice(i, 0, 'do not');
                return w.join(' ');
            };

            //left leg --> not left leg
            if (wordCount == 2 && firstWord(['left', 'right', 'both', 'bilateral'])) {
                w.unshift('not');
                return w.join(' ');
            };

            //left vision --> not left vision
            if (isMatch(phrase, '^(left|right|upper|lower|temporal|central|nasal)\svision')) {
                w.unshift('not');
                return w.join(' ');
            };

            w.unshift(defaultPrefix);
            return w.join(' ');
        }
    };

    lang.setObject("qc.WordUtil", core.WordUtil);

    return core.WordUtil;

});