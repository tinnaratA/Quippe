define([
    "qc/StringUtil",
    "qc/DateUtil",
    "dojo/_base/array",
    "dojo/_base/declare",
	"dojo/_base/lang"
], function (StringUtil, DateUtil, array, declare, lang) {
    var TypeDef = declare("qc.TimingTranscriber", [], {
        enums: {
            sequencing: StringUtil.parseCodedList('[S=Then;P=And]'),
            timeUnits: StringUtil.parseCodedList('[N=minute;H=hour;D=day;W=week;M=month;Y=year;F=shift]'),
            timeOfDay: StringUtil.parseCodedList('[AM=AM;PM=PM;DAY=Day;NIGHT=Night;S1=Shift 1;S2=Shift 2;S3=Shift 3]'),
            priority: StringUtil.parseCodedList('[S=Stat;A=ASAP;R=Routine]')
        },

        getEnum: function (name) {
            return this.enums[name] || [];
        },

        getEnumText: function (name, value) {
            if (this.enums[name]) {
                for (var n = 0; n < this.enums[name].length; n++) {
                    if (this.enums[name][n].id == value) {
                        return this.enums[name][n].text;
                    };
                };
            };
            return '';
        },

        transcribe: function (components) {
            if (!components || components.length == 0) {
                return '';
            };
            var parts = array.map(components, function (component, i) {
                return this.transcribeComponent(component, i);
            }, this);
            return parts.join('');
        },

        transcribeComponent: function (c, index) {
            if (!c) {
                return '';
            };

            var isNum = function (v) {
                //return typeof v == 'number' && !isNaN(v) && isFinite(v);
                var x = parseFloat(v);
                return isFinite(x) && !isNaN(x);
            };

            var buf = [];

            if (c.priority != 'R') {
                buf.push(this.getEnumText('priority', c.priority));
            };

            var once = false;
            if (isNum(c.occurrence)) {
                if (c.occurrence2 && c.occurrence2 != c.occurrence) {
                    buf.push(c.occurrence + '-' + c.occurrence2);
                    buf.push('times');
                }
                else if (c.occurrence > 1) {
                    buf.push(c.occurrence);
                    buf.push('times');
                }
                else {
                    once = true;
                };
            };

            var unit = '';
            if (c.asNeeded) {
                buf.push('as needed');
            };

            if (isNum(c.interval)) {
                unit = this.getEnumText('timeUnits', c.intervalUnit);
                if (c.interval2 && c.interval2 != c.interval) {
                    buf.push('every');
                    buf.push(c.interval + '-' + c.interval2);
                    buf.push(unit + 's');
                }
                else if (c.interval > 1) {
                    buf.push('every');
                    buf.push(c.interval);
                    buf.push(unit + 's');
                }
                else {
                    if (c.occurrence) {
                        if (once) {
                            buf.push('once');
                        }
                        buf.push(unit == 'hour' ? 'an' : 'a');
                    }
                    else {
                        buf.push('every');
                    };
                    buf.push(unit);
                };
            }
            else {
                if (once) {
                    buf.push('once');
                };
            };


            if (c.timeOfDay) {
                if (c.timeOfDay.charAt(0) == 'S') {
                    buf.push('during');
                    buf.push(this.getEnumText('timeOfDay', c.timeOfDay));
                }
                else if (c.timeOfDay == 'DAY') {
                    buf.push('during the day');
                }
                else if (c.timeOfDay == 'NIGHT') {
                    buf.push('at night');
                }
                else if (c.timeOfDay == 'AM' || c.timeOfDay == 'PM') {
                    buf.push('in the');
                    buf.push(this.getEnumText('timeOfDay', c.timeOfDay));
                }
                else {
                    buf.push(this.getEnumText('timeOfDay', c.timeOfDay));
                }
            };

            if (isNum(c.repeat)) {
                if (c.repeat2 && c.repeat2 != c.repeat) {
                    buf.push('repeat');
                    buf.push(c.repeat + '-' + c.repeat2);
                    buf.push('times')
                }
                else {
                    buf.push('x');
                    buf.push(c.repeat);
                }
            };

            if (isNum(c.duration)) {
                buf.push('for');
                if (c.duration2 && c.duration2 != c.duration) {
                    buf.push(c.duration + '-' + c.duration2);
                    buf.push(this.getEnumText('timeUnits', c.durationUnit) + 's');
                }
                else {
                    buf.push(c.duration);
                    buf.push(this.getEnumText('timeUnits', c.durationUnit) + (c.duration == 1 ? '' : 's'));
                }
            };

            if (c.startTime && DateUtil.isDate(c.startTime)) {
                buf.push('starting');
                buf.push(DateUtil.formatDate(c.startTime));
            };

            if (c.endTime && DateUtil.isDate(c.endTime)) {
                buf.push('ending');
                buf.push(DateUtil.formatDate(c.endTime));
            };

            if (c.note) {
                buf.push(c.note);
            };

            var text = buf.join(' ').trim();
            if (!text) {
                text = '<i>timing component ' + (index + 1) + '</i>';
            };

            if (index > 0) {
                return (c.sequencing == 'P' ? ' and ' : ', then ') + text;
            }
            else {
                return text;
            };
        }
    });

    var singleton = new TypeDef();

    lang.setObject("qc.TimingTranscriber", singleton);

    return singleton;


});