define([
    "qc/_core",
    "dojo/_base/array",
	"dojo/_base/lang",
    "dojo/date",
    "dojo/date/locale"
], function (core, array, lang, dojoDate, dateLocale) {

    core.DateUtil = {
        calendars: {
            gregorian: {
                locale: dateLocale,
                dateClass: Date
            }
        },

        dateUnits: {
            'y': 'year',
            'm': 'month',
            'w': 'week',
            'd': 'day',
            'h': 'hour',
            'n': 'minute',
            's': 'second',
            'i': 'millisecond'
        },

        multipliers: {
            'i': 1,
            's': 1000,
            'n': 1000 * 60,
            'h': 1000 * 60 * 60,
            'd': 1000 * 60 * 60 * 24,
            'w': 1000 * 60 * 60 * 24 * 7,
            'm': 1000 * 60 * 60 * 24 * 30.5,
            'y': 1000 * 60 * 60 * 24 * 365.25
        },

        patterns: {
            sign: /^[\+|\-]/,
            allDigits: /^[^0]\d+$/,
            jsonDate: /\/Date/,
            monthDay: /^\d\d?\/\d\d?$/,
            monthYear: /^\d\d?\/\d\d\d\d$/,
            onsetAgo: /^0\d+$/,
            atAge: /^\s*(at\sage|age|at)\s+/i,
            old: /\sold$/i,
            ago: /\sago$/i,
            timeString: /(^\d+(?:\.\d+)?)\s*(year|month|week|day|hour|minute|second|yr|mon|mnth|wk|hr|min|sec|y|m|w|d|h|n|s|i)s?$/i
        },


        dateFromJSON: function (value) {
            return value ? new Date(parseInt(value.replace(/\/Date\((-?\d+)\)\//, '$1'))) : null;
        },

        formatDateTime: function (value) {
            var res = core.DateUtil.formatDate(value);
            if (core.DateUtil.hasTime(value)) {
                res += ' ';
                res += core.DateUtil.formatTime(value);
            };
            return res;
        },

        installedCalendars: function () {
            var list = [];
            for (var name in this.calendars) {
                list.push(name);
            };
            list.sort();
            return list;
        },

        globalFormat: function (dateValue, options, calendar) {
            if (!this.isDate(dateValue)) {
                return '';
            };

            if (!calendar || calendar == 'gregorian') {
                try {
                    return dateLocale.format(dateValue, options);
                }
                catch (ex) {
                    console.error(ex);
                    return 'INVALID DATE FORMAT';
                }
            };

            if (!this.calendars[calendar]) {
                throw "Error: The " + calendar + " calendar is not installed";
            };

            var DateClass = this.calendars[calendar].dateClass;
            var convertedDate = new DateClass(dateValue);

            try {
                return this.calendars[calendar].locale.format(convertedDate, options);
            }
            catch (ex) {
                console.error(ex);
                return 'INVALID DATE FORMAT';
            }
            
        },

        globalParse: function (text, calendar) {
            if (!calendar || calendar == 'gregorian') {
                return this.toDate(text);
            };

            var cal = this.calendars[calendar];
            if (!cal) {
                throw "Error: The " + calendar + " calendar is not installed";
            };

            if (!cal.locale || !cal.locale.parse) {
                throw "No parser available for " + calendar + " dates";
            };

            return cal.locale.parse(text) || null;
        },

        formatDate: function (value, options) {
            //return dateLocale.format(value, options || { selector: "date", formatLength: "user", fullYear: true, locale: core.settings.culture });
            return this.format(value, options || { selector: 'date', formatLength: 'user' });
        },

        formatTime: function (value, options) {
            //return dateLocale.format(value, options || { selector: "time", formatLength: "user", locale: core.settings.culture });
            return this.format(value, options || { selector: 'time', formatLength: 'user' });
        },

        format: function (value, formatOrOptions) {
            var opts = this.getFormatOptions(formatOrOptions);
            try {
                return dateLocale.format(value, opts);
            }
            catch (ex) {
                console.error(ex);
                return 'INVALID DATE FORMAT';
            }
        },

        getFormatOptions: function(format) {
            var opts = null;
            if (typeof format == 'string') {
                switch (format.toLowerCase()) {
                    case 'date':
                        opts = { selector: "date", formatLength: "user", locale: core.settings.culture };
                        break;
                    case 'shortdate':
                        opts = { selector: "date", formatLength: "short", locale: core.settings.culture };
                        break;
                    case 'longdate':
                        opts = { selector: "date", formatLength: "long", locale: core.settings.culture };
                        break;
                    case 'time':
                        opts = { selector: "time", formatLength: "user", locale: core.settings.culture };
                        break;
                    case 'shorttime':
                        opts = { selector: "time", formatLength: "short", locale: core.settings.culture };
                        break;
                    case 'longtime':
                        opts = { selector: "time", formatLength: "long", locale: core.settings.culture };
                        break;
                    case 'datetime':
                        opts = { selector: "datetime", formatLength: "user", locale: core.settings.culture };
                        break;
                    case 'shortdatetime':
                    case 'short':
                        opts = { selector: "datetime", formatLength: "short", locale: core.settings.culture };
                        break;
                    case 'longdatetime':
                    case 'long':
                        opts = { selector: "datetime", formatLength: "long", locale: core.settings.culture };
                        break;
                    default:
                        opts = { selector: 'date', datePattern: format };
                        break;
                };
            }
            else {
                opts = format || { selector: "date", formatLength: "user", locale: core.settings.culture };
            }
            if (!opts.locale) {
                opts.locale = core.settings.culture;
            };
            return opts;
        },

        formatJSONDate: function (value, options) {
            return core.DateUtil.formatDate(core.DateUtil.dateFromJSON(value), options);
        },

        formatISODate: function (value) {
            var date = new Date(value);
            var s = '';
            s += dateLocale.format(date, { selector: "date", datePattern: "yyyy-MM-dd" });
            s += 'T';
            s += dateLocale.format(date, { selector: "time", timePattern: "HH:mm:ss" });
            return s;
        },

        hasTime: function (dateValue) {
            if (!dateValue || !dateValue.getHours) {
                return false;
            };

            return !(dateValue.getHours() == 0 && dateValue.getMinutes() == 0 && dateValue.getSeconds() == 0 && dateValue.getMilliseconds() == 0);
        },

        julianDay: function (date) {
            if (!date) {
                return 0;
            }

            var days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (dojoDate.isLeapYear(date)) {
                days[2] += 1;
            }
            var total = 0;
            var m = date.getMonth();
            for (var n = 0; n < m; n++) {
                total += days[n];
            };

            total += date.getDate();
            return total;
        },

        julianDate: function (date) {
            return (date.getYear() * 1000) + core.DateUtil.julianDay(date);
        },

        isLeapYear: function (date) {
            var y = date.getFullYear();
            return (y % 400 == 0) ? true : (y % 100 == 0) ? false : (y % 4 == 0) ? true : false;
        },

        daysInYear: function (date) {
            return core.DateUtil.isLeapYear(date) ? 366 : 365;
        },

        minutesToAgeLabel: function (minutes) {
            if (minutes) {
                var d1 = new Date();
                var d2 = new Date(d1.getTime() + (minutes * 60000));
                return this.calculateAge(d1, d2).label;
            }
            else {
                return '';
            };
        },

        calculateAge: function (birthDate, currentDate) {
            var age = {
                totalMinutes: Math.round((currentDate - birthDate) / 60000),
                years: currentDate.getFullYear() - birthDate.getFullYear(),
                months: currentDate.getMonth() - birthDate.getMonth(),
                days: currentDate.getDate() - birthDate.getDate()
            };

            if (age.totalMinutes < 0) {
                age.totalMinutes = 0;
                age.years = 0;
                age.months = 0;
                age.days = 0;
                age.label = '';
                age.shortLabel = '';
                return age;
            };

            if (age.days < 0) {
                age.days += dojoDate.getDaysInMonth(currentDate);
                age.months -= 1;
            };

            if (age.months < 0) {
                age.months += 12;
                age.years -= 1;
            };

            if (age.years > 2) {
                age.label = age.years + ' ' + core.getI18n("years");
                age.shortLabel = age.years;
                return age;
            };

            age.months += (age.years * 12);
            age.years = 0;
            if (age.months > 2) {
                age.label = age.months + ' ' + core.getI18n("months");
                age.shortLabel = age.months + 'm';
                return age;
            };

            var jCurrent = core.DateUtil.julianDay(currentDate);
            var jBirth = core.DateUtil.julianDay(birthDate);
            if (jCurrent < jBirth) {
                jCurrent += core.DateUtil.daysInYear(birthDate);
            };
            var totalDays = jCurrent - jBirth;
            var weeks = Math.floor(totalDays / 7);
            if (weeks > 2) {
                age.label = weeks + ' ' + core.getI18n("weeks");
                age.shortLabel = weeks + 'w';
            }
            else {
                age.label = totalDays + ' ' + core.getI18n("day") + (totalDays == 1 ? '' : 's'); //TODO: internationalized plural
                age.shortLabel = totalDays + 'd';
            };

            return age;
        },

        isDate: function (value) {
            return value && typeof value == "object" && typeof value.getDate == "function" && !isNaN(value.getDate());
        },

        toDate: function (value, defaultValue) {
            if (!value) {
                return defaultValue || null;
            };

            if (core.DateUtil.isDate(value)) {
                return value;
            };

            var dateValue = null;

            if (typeof value == 'string') {
                if (value.match(/^\d\d?\-\d\d?\-\d\d(?:\d\d)?$/)) {
                    dateValue = core.DateUtil.toDate(new Date(value.replace(/\-/g, '/')), defaultValue);
                }
                else if (value.match(/^\d\d\d\d$/)) {
                    dateValue = core.DateUtil.toDate("1/1/" + value);
                }
                else if (value.match('\/Date')) {
                    dateValue = core.DateUtil.dateFromJSON(value);
                }
                else {
                    dateValue = core.DateUtil.toDate(new Date(value), defaultValue);
                };
            }
            else if (typeof value == 'number') {
                dateValue = core.DateUtil.toDate(new Date(value), defaultValue);
            };

            return core.DateUtil.isDate(dateValue) ? dateValue : defaultValue;
        },

        toTimeString: function (value) {
            if (value == undefined || value == null) {
                return '';
            }
            else if (this.isDate(value)) {
                this.formatTime(value);
            }
            else {
                var n = parseInt(value, 10);
                if (!isNaN(n) && n >= 0 && n < 24) {
                    return this.formatTime(new Date(1970, 0, 1, n, 0, 0));
                };
            }
            return '';
        },

        getLookbackTimespan: function (date1, date2, shortUnits) {
            var t1 = core.DateUtil.toDate(date1);
            var t2 = core.DateUtil.toDate(date2);
            if (!t1 || !t2) {
                return null;
            };

            var units = ['s', 'n', 'h', 'd', 'w', 'm', 'y'];
            var labels = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
            var multipliers = [
                1000,
                60 * 1000,
                60 * 60 * 1000,
                24 * 60 * 60 * 1000,
                7 * 24 * 60 * 60 * 1000,
                30.5 * 24 * 60 * 60 * 1000,
                365.25 * 24 * 60 * 60 * 1000
            ];

            var ts = Math.abs(t2 - t1);
            var sign = (t2 - t1) < 0 ? -1 : 1;

            var n = 0;
            while (n < units.length - 1 && (ts / multipliers[n + 1]) > 2) {
                n++;
            };

            //bug#345 - changed floor to round
            //var value = sign * Math.floor(ts / multipliers[n]);
            var value = sign * Math.round(ts / multipliers[n]);
            if (shortUnits) {
                return value + units[n];
            }
            else {
                return value + ' ' + labels[n] + ((value == 1) ? '' : 's');
            };
        },

        normalizeTimeString: function (value) {
            var res = core.DateUtil.parseTimeString(value);
            if (!res) {
                return '';
            };

            if (res.type == 'absolute') {
                return res.label;
            }
            else {
                return res.value + res.unit;
            };
        },

        parseTimeString: function (value) {
            if (!value) {
                return null;
            };

            var sValue = value.toString().trim();

            var res = {
                originalValue: sValue
            };

            var re = core.DateUtil.patterns;
            var m = null;

            if (re.sign.test(sValue)) {
                res.sign = sValue.charAt(0);
                sValue = sValue.substr(1);
            };

            //value can be parsed as a date
            var dateValue = null;


            if (re.allDigits.test(sValue)) {
                var iValue = parseInt(sValue, 10);
                if (iValue < 100) {             //workaround for Chrome which will parse a small integer, i.e. 5 as 5/1/2001
                    sValue += 'd';
                }
                else if (iValue > 86400000) {      // handle the case of an actual epoch date value being passed
                    dateValue = new Date(iValue);
                }
            }
            else if (re.jsonDate.test(sValue)) {
                dateValue = core.DateUtil.dateFromJSON(sValue);
            }
            else {
                dateValue = new Date(sValue);
            };

            if (core.DateUtil.isDate(dateValue)) {
                res.type = 'absolute';
                res.label = core.DateUtil.formatDateTime(dateValue);
                res.value = dateValue;
                res.ms = dateValue.getTime();
                return res;
            };

            if (re.monthDay.test(sValue)) {
                return core.DateUtil.parseTimeString(sValue + '/' + new Date().getFullYear());
            };

            if (re.monthYear.test(sValue)) {
                dateValue = new Date(parseInt(sValue.substr(sValue.length - 4), 10), parseInt(sValue.substr(0, sValue.length - 2), 10) - 1, 1, 0, 0, 0);
                res.type = 'absolute';
                res.label = core.DateUtil.formatDate(dateValue);
                res.value = dateValue;
                res.ms = dateValue.getTime();
            };

            //value is a in medcin 'onset period ago' format
            if (re.onsetAgo.test(sValue)) {
                res.value = parseInt(sValue, 10);
                res.type = 'relative';
                switch (sValue.length) {
                    case 4:
                        res.unit = 'y';
                        break;
                    case 6:
                        res.unit = 'm';
                        break;
                    case 7:
                        res.unit = 'w';
                        break;
                    case 8:
                        res.unit = 'd';
                        break;
                    case 10:
                        res.unit = 'h';
                        break;
                    case 12:
                        res.unit = 'n';
                        break;
                    case 14:
                        res.unit = 's';
                        break;
                    default:
                        res.unit = '';
                        break;
                };
                if (res.unit && core.DateUtil.dateUnits[res.unit]) {
                    res.label = res.value + ' ' + core.DateUtil.dateUnits[res.unit] + (res.value == 1 ? '' : 's');
                }
                else {
                    res.label = sValue;
                };
                return res;
            }

            m = re.atAge.exec(sValue);
            if (m) {
                res.type = 'age';
                sValue = sValue.substr(m[0].length);
            };
            m = re.old.exec(sValue);
            if (m) {
                res.type = 'age';
                sValue = sValue.substr(0, sValue.length - m[0].length);
            };
            m = re.ago.exec(sValue);
            if (m) {
                sValue = sValue.substr(0, sValue.length - m[0].length);
            };

            m = re.timeString.exec(sValue);
            if (m) {
                res.type = res.type || 'relative';
                res.value = parseFloat(m[1]);
                var unitLabel = (m[2] || '').toLowerCase();
                var firstChar = unitLabel ? unitLabel.substr(0, 1) : '';
                if (array.indexOf(['y', 'w', 'd', 'h', 's', 'n', 'i'], firstChar) >= 0) {
                    res.unit = firstChar;
                }
                else if (array.indexOf(['minute', 'min'], unitLabel) >= 0) {
                    res.unit = 'n';
                }
                else if (array.indexOf(['millisecond', 'milli', 'mil', 'ms'], unitLabel) >= 0) {
                    res.unit = 'i';
                }
                else if (array.indexOf(['month', 'mon', 'mnth', 'm'], unitLabel) >= 0) {
                    res.unit = 'm';
                };

                if (res.unit && core.DateUtil.dateUnits[res.unit]) {
                    res.label = res.value + ' ' + core.DateUtil.dateUnits[res.unit] + (res.value == 1 ? '' : 's');
                }
                else {
                    res.label = sValue;
                };
                return res;
            };

            return res;
        },

        toMinutes: function(value) {
            if (typeof value == 'number') {
                return value;
            }
            else if (typeof value == 'string') {
                var info = this.parseTimeString(value);
                if (info.type == 'absolute') {
                    return info.value.getTime() / 60000;
                }
                else if (info.type == 'relative') {
                    return info.value * this.multipliers[info.unit] / 60000;
                }
                else {
                    return 0;
                }
            }
            else if (this.isDate(value)) {
                return this.toDate(value).getTime() / 60000;
            }
            else {
                return 0;
            }

        },

        formatEpisodeString: function (value) {
            if (!value) {
                return '';
            };

            var sValue = value.toString();

            if (!sValue.match(/^[F|I]\|/)) {
                return value;
            };

            var s = '';
            var e = {};
            var parts = sValue.split("|");
            e.exp = parts[0];
            e.freqFrom = core.DateUtil.parseTimeString(parts[1]);
            e.freqTo = core.DateUtil.parseTimeString(parts[2]);
            e.durFrom = core.DateUtil.parseTimeString(parts[3]);
            e.durTo = core.DateUtil.parseTimeString(parts[4]);

            if (parts[0] == 'I') {
                if (e.freqFrom) {
                    s += ' every '
                    if (e.freqTo && (!(e.freqFrom.value == e.freqTo.value && e.freqFrom.unit == e.freqTo.unit))) {
                        if (e.freqFrom.unit == e.freqTo.unit) {
                            s += e.freqFrom.value;
                            s += '-';
                            s += e.freqTo.label;
                        }
                        else {
                            s += e.freqFrom.label;
                            s += ' to ';
                            s += e.freqTo.label;
                        }
                    }
                    else {
                        s += e.freqFrom.label;
                    };
                };
            }
            else {
                if (e.freqFrom) {
                    if (e.freqTo && (!(e.freqFrom.value == e.freqTo.value && e.freqFrom.unit == e.freqTo.unit))) {
                        if (e.freqFrom.unit == e.freqTo.unit) {
                            s += e.freqFrom.value;
                            s += '-';
                            s += e.freqTo.value;
                            s += ' times per ';
                            s += core.DateUtil.dateUnits[e.freqTo.unit];
                        }
                        else {
                            s += e.freqFrom.value;
                            s += '/';
                            s += core.DateUtil.dateUnits[e.freqFrom.unit];
                            s += ' to ';
                            s += e.freqTo.value;
                            s += '/';
                            s += core.DateUtil.dateUnits[e.freqTo.unit];
                        }
                    }
                    else {
                        s += e.freqFrom.value;
                        s += ' times per ';
                        s += core.DateUtil.dateUnits[e.freqFrom.unit];
                    }
                };
            };

            if (e.durFrom) {
                s += ' lasting ';
                if (e.durTo && (!(e.durFrom.value == e.durTo.value && e.durFrom.unit == e.durTo.unit))) {
                    if (e.durFrom.unit == e.durTo.unit) {
                        s += e.durFrom.value;
                        s += '-';
                        s += e.durTo.label;
                    }
                    else {
                        s += e.durFrom.label;
                        s += ' to ';
                        s += e.durTo.label;
                    }
                }
                else {
                    s += e.durFrom.label;
                }
            };

            return s.trim();
        },

        getOnsetAge: function (onsetString, birthDate, currentTime) {
            if (!(onsetString && birthDate && currentTime)) {
                return 0;
            };

            var info = this.parseTimeString(onsetString);
            if (!info) {
                return 0;
            };

            var msPerMin = 60000;


            if (info.type == 'absolute') {
                return (info.value.getTime() - birthDate.getTime()) / msPerMin;
            };


            if (!info.value || !info.unit) {
                return 0;
            };

            var ms = info.value * this.multipliers[info.unit];

            if (info.type == 'age') {
                return ms / msPerMin;
            };

            if (info.type == 'relative') {
                var onsetTime = ms * (info.sign == '+' ? 1 : -1);
                return (birthDate.getTime() + currentTime.getTime() + onsetTime) / msPerMin;
            };

            return 0;
        },

        serializeTimeString: function (value) {
            var res = core.DateUtil.parseTimeString(value);
            if (!res) {
                return '';
            };

            if (res.type == 'absolute') {
                return this.formatISODate(res.value);
            }
            else if (res.type == 'relative') {
                if (res.value && res.unit) {
                    return (res.sign || '') + res.value + res.unit;
                }
            }
            else {
                return '';
            };
        },

        parseTimingString: function (input) {

            var strInput = (input || '').toString().toUpperCase().trim();
            if (!strInput) {
                return null;
            };

            if (strInput.match(/^hl7\:/i)) {
                return this.parseHL7TimingString(input.substr(4));
            }
            else if (strInput.match(/^\^/)) {
                return this.parseHL7TimingString(input);
            }
            else {
                //TEMP: will need to parse other timing formats
                //return this.parseHL7TimingString(input);
                return null;
            };
        },

        parseHL7TimingString: function (input) {
            var toUpper = function (value) {
                return (value || '').toString().toUpperCase();
            };

            var toInt = function (value) {
                var i = parseInt(value, 10);
                return !isNaN(i) ? i : null;
            };

            var translateUnit = function (value) {
                var unitMap = {
                    'S': 'S',
                    'M': 'N',
                    'H': 'H',
                    'D': 'D',
                    'W': 'W',
                    'L': 'M'
                };
                return value ? unitMap[toUpper(value)] : '';
            };


            //        1            2    3               4     5        6     7     8        9        10    11       12    13    14    15     16               17        18         19
            var re = /(PRN)?(?:(?:Q(\d+)([SMHDWL]))|(?:Q(\d+)J([1-7]))|(BID)|(TID)|(QID)|(?:(\d+)ID)|(QAM)|(QSHIFT)|(QOD)|(QHS)|(QPM)|(ONCE)|([API]C[MDV])|(?:([SMHDWL])(\d+))|(?:X(\d+)))?/;
            var settings = [
                {},                                                     //  0 = whole match
                { asNeeded: true },                                      //  1 = PRN
                { interval: '.', _transform: toInt },                    //  2 = Q<interval><unit> - interval
                { intervalUnit: '.', _transform: translateUnit },        //  3 = Q<interval><unit> - unit
                { interval: '.', _transform: toInt },                    //  4 = Q<interval>J<day> - interval
                { dayOfWeek: '.', _transform: toInt },                   //  5 = Q<interval>J<day> - day
                { occurrence: 2, interval: 1, intervalUnit: 'D' },       //  6 = BID
                { occurrence: 3, interval: 1, intervalUnit: 'D' },       //  7 = TID
                { occurrence: 4, interval: 1, intervalUnit: 'D' },       //  8 = QID
                { occurrence: '.', interval: 1, intervalUnit: 'D' },     //  9 = 5ID
                { interval: 1, intervalUnit: 'D', timeOfDay: 'AM' },     // 10 = QAM
                { interval: 1, intervalUnit: 'F' },                      // 11 = QSHIFT
                { interval: 2, intervalUnit: 'D' },                      // 12 = QOD
                { interval: 1, intervalUnit: 'D', timeOfDay: 'NIGHT' },  // 13 = QHS
                { interval: 1, intervalUnit: 'D', timeOfDay: 'PM' },     // 14 = QPM
                { occurrence: 1 },                                       // 15 = once
                { timeOfDay: '.', _transForm: toUpper },                 // 16 = meal timing
                { durationUnit: '.', _transform: translateUnit },        // 17 = H2 --> H
                { duration: '.', _transform: toInt },                    // 18 = H2 --> 2
                { repeat: '.', _transform: toInt }                        // 19 = X4
            ];

            var strInput = (input || '').toString().toUpperCase().trim();
            if (!strInput) {
                return null;
            };

            var timing = [];
            var timingComponent = null;
            array.forEach(strInput.split('~'), function (segment) {
                timingComponent = {};
                var empty = true;
                array.forEach(segment.split(/[\s|\^]/), function (comp) {
                    var m = re.exec(comp);
                    for (var n = 1; n < m.length; n++) {
                        if (m[n]) {
                            var s = settings[n];
                            if (s) {
                                for (var p in s) {
                                    if (p.charAt(0) != '_') {
                                        timingComponent[p] = s[p] == '.' ? s._transform ? s._transform(m[n]) : m[n] : s[p];
                                        empty = false;
                                    };
                                };
                            };
                        };
                    };
                });
                if (!empty) {
                    timing.push(timingComponent);
                };
            });
            return timing;
        },

        // summary: 
        //   Parses a string that represents a date range, i.e. 01/10/2011 to 05/01/2012.
        //   The string is split by either " to " or " - ", then the two components are
        //   parsed as regular date strings under current localization rules.
        //   
        //   If successful, the return value will be an object of the form:
        //      {start: date, end: date}
        //
        //   If only one date found, the defaultStart and defaultEnd dates will be used.
        //
        //   If both defaultStart and defaultEnd are undefined, an unsuccessful parse
        //   will return null.
        //
        // input: string
        //   The string to parse
        // defaultStart:
        //   The value to use when no start date found
        // defaultEnd
        //   The value to use when no end date found
        parseDateRangeString: function (input, defaultStart, defaultEnd) {
            var re = /\s+(to|\-)\s+/i;
            var parts = input ? input.toString().split(re) : [];
            var range = {
                start: this.toDate(parts[0], defaultStart),
                end: this.toDate(parts[2], defaultEnd)
            };
            if (range.start == undefined && range.end == undefined) {
                return null;
            }
            else {
                return range;
            };
        },

        //returns a best guess at the browser's configured date format
        getSystemDateFormat: function() {
            var d = new Date(2011, 2, 4, 5, 6, 7, 8);
            var s = d.toLocaleDateString();
            var dateFormat = s.replace(/2011/, 'yyyy').replace(/04/, 'dd').replace(/4/, 'd').replace(/03/, 'MM').replace(/3/, 'M').replace(/March/, 'MMMM').replace(/Mar/, 'MMM');
            return dateFormat;
        },

        //returns a best guess at the browser's configured time format
        getSystemTimeFormat: function() {
            var t1 = new Date(2011, 9, 9, 6, 15, 19, 19);
            var t2 = new Date(2011, 9, 9, 14, 15, 19, 19);
            var s1 = t1.toLocaleTimeString();
            var s2 = t2.toLocaleTimeString();

            if (/2/.test(s2)) {
                if (/02/.test(s2)) {
                    return 'hh:mm a';
                }
                else {
                    return 'h:mm a';
                }
            }
            else {
                if (/06/.test(s1)) {
                    return 'HH:mm';
                }
                else {
                    return 'H:mm';
                }
            }
        }
    };

	lang.setObject("qc.DateUtil", core.DateUtil);

    return core.DateUtil;

});
