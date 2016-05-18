define([
    "dojo/_base/array",
    "dojo/_base/declare",
	"dojo/_base/lang",
    "dojo/dom-class",
    "qc/_core",
    "qc/DateUtil",
	"qc/StringUtil"
], function (array, declare, lang, domClass, core, DateUtil, StringUtil) {
    var Host = declare("qc.lang.qscript.Host", [], {
        getType: function (x) {
            if (x == undefined || x == null) {
                return 'null';
            };
    
            var t = typeof x;
    
            if (t == 'object') {
                if (this.isNoteElement(x)) {
                    if (this.isFinding(x)) {
                        return 'finding';
                    }
                    else if (this.isGroup(x)) {
                        return 'group';
                    }
                    else {
                        return 'noteElement';
                    }
                }
                else if (core.isFunction(x.getFullYear)) {
                    return 'date';
                };
            };
    
            return t;
        },
    
        filter: function (list, cond) {
            return cond ? array.filter(list, cond, this) : list;
        },
    
        map: function (list, callback) {
            return array.map(list, callback, this);
        },
    
        forEach: function (list, callback) {
            return array.forEach(list, callback, this);
        },
    
        reduce: function (list, callback, initialValue) {
            var a = initialValue;
            for (var n = 0, len = list.length; n < len; n++) {
                a = callback(a, list[n], n, list);
            };
            return a;
        },
    
        nvStrict: function (x) {
            switch (this.getType(x)) {
                case 'number':
                    return x;
                case 'finding':
                    return this.nvStrict(x.get('value'));
                case 'string':
                    return this.nvStrict(parseFloat(x));
                case 'boolean':
                    return x ? 1 : 0;
                case 'noteElement':
                    return x._getExpressionValue('number', 0);
                default:
                    return NaN;
            }
        },
    
        nv: function (x) {
            switch (this.getType(x)) {
                case 'number':
                    return isNaN(x) || !isFinite(x) ? 0 : x;
                case 'finding':
                    return this.nv(x.get('value'));
                case 'string':
                    return this.nv(parseFloat(x));
                case 'boolean':
                    return x ? 1 : 0;
                case 'date':
                    return x.getTime() / 60000;
                case 'noteElement':
                    return x._getExpressionValue('number', 0);
                default:
                    return 0;
            }
        },
    
        bv: function (x) {
            switch (this.getType(x)) {
                case 'number':
                    return x != 0;
                case 'finding':
                    return this.pos(x);
                case 'string':
                    return x && x != 'N' && x != 'false';
                case 'boolean':
                    return x;
                case 'noteElement':
                    return x._getExpressionValue('boolean', false);
                default:
                    return false;
            }
        },
    
        sv: function (x) {
            switch (this.getType(x)) {
                case 'finding':
                    return x.get('text');
                case 'group':
                    return x.get('heading');
                case 'noteElement':
                    return x._getExpressionValue('string', '');
                case 'null':
                    return '';
                default:
                    return x.toString();
            };
        },
    
        dv: function (x) {
            switch (this.getType(x)) {
                case 'date':
                    return x;
                case 'finding':
                    return dv(x.get('value'));
                case 'number':
                    return new Date(x * 60000);
                case 'string':
                    var res = DateUtil.parseTimeString(x);
                    return res && res.type == 'absolute' ? res.value : null;
                case 'noteElement':
                    return x._getExpressionValue('date', 0);
                default:
                    return null;
            };
        },
    
        lv: function (x) {
            if (x === undefined || x === null) {
                return [];
            }
            else if (x instanceof Array) {
                return x;
            }
            else {
                return [x];
            }
        },
    
        isNoteElement: function (x) {
            return x && x.domNode && domClass.contains(x.domNode, 'noteElement');
        },
    
        isFinding: function (x) {
            return x && x.domNode && domClass.contains(x.domNode, 'finding');
        },
    
        isGroup: function (x) {
            return x && x.domNode && domClass.contains(x.domNode, 'part');
        },
    
        pos: function (x) {
            switch (this.getType(x)) {
                case 'finding':
                    return x.get('result') == 'A';
                case 'boolean':
                    return x === true;
                case 'string':
                    return x == 'A';
                case 'number':
                    return x > 0;
                default:
                    return false;
            };
        },
    
        neg: function (x) {
            switch (this.getType(x)) {
                case 'finding':
                    return x.get('result') == 'N';
                case 'boolean':
                    return x === false;
                case 'string':
                    return x == 'N';
                case 'number':
                    return x < 0;
                default:
                    return false;
            };
        },
    
        ent: function (x) {
            return !this.unent(x);
        },
    
        unent: function (x) {
            switch (this.getType(x)) {
                case 'finding':
                    return !x.get('result');
                case 'boolean':
                    return false;
                case 'string':
                    return !x;
                case 'number':
                    return x == 0 || isNaN(x) || !isFinite(x);
                default:
                    return false;
            };
        },
    
        compare: function (a, b) {
            var aType = this.getType(a);
            var bType = this.getType(b);
            switch (aType) {
                case 'null':
                    return bType == 'null' ? 0 : -1;
    
                case 'finding':
                    switch (bType) {
                        case 'null':
                            return 1;
                        case 'finding':
                            return this.compare(a.id, b.id);
                        case 'number':
                            return this.compare(this.nv(a), b);
                        case 'string':
                            return this.compare(this.sv(a), b);
                        case 'boolean':
                            return this.compare(this.bv(a), b);
                        default:
                            return -1;
                    };
                    break;
    
                case 'number':
                    switch (bType) {
                        case 'null':
                            return 1;
                        case 'number':
                            return a - b;
                        default:
                            return this.compare(a, this.nv(b));
                    };
                case 'string':
                    switch (bType) {
                        case 'null':
                            return 1;
                        case 'string':
                            return StringUtil.compare(a, b, true);
                        default:
                            return this.compare(a, this.sv(b));
                    };
                case 'boolean':
                    switch (bType) {
                        case 'null':
                            return 1;
                        case 'boolean':
                            return a == b ? 0 : a ? 1 : -1;
                        default:
                            return this.compare(a, this.bv(b));
                    };
                default:
                    return -1;
            };
        },
    
        lt: function (a, b) {
            return this.compare(a, b) < 0;
        },
    
        le: function (a, b) {
            return this.compare(a, b) <= 0;
        },
    
        eq: function (a, b) {
            return this.compare(a, b) == 0;
        },
    
        ge: function (a, b) {
            return this.compare(a, b) >= 0;
        },
    
        gt: function (a, b) {
            return this.compare(a, b) > 0;
        },
    
        ne: function (a, b) {
            return this.compare(a, b) != 0;
        },
    
        any: function (list, cond) {
            return array.some(list, cond, this);
        },
    
        all: function (list, cond) {
            return array.every(list, cond, this);
        },
    
        no: function (list, cond) {
            return !this.any(list, cond)
        },
    
        and: function (a, b) {
            return this.bv(a) && this.bv(b)
        },
    
        or: function (a, b) {
            return this.bv(a) || this.bv(b)
        },
    
        not: function (a) {
            return !this.bv(a)
        },
    
        nvlist: function (list, cond) { return this.filter(this.map(this.filter(list, cond), this.nvStrict), isFinite); },
    
        count: function (list, cond) {
            return this.filter(list, cond).length;
        },
    
        sum: function (list, cond) {
            return this.reduce(this.nvlist(list, cond), function (a, b) { return a + b }, 0)
        },
    
        prod: function (list, cond) {
            return this.reduce(this.nvlist(list, cond), function (a, b) { return a * b }, 1)
        },
    
        min: function (list, cond) {
            return this.reduce(this.nvlist(list, cond), function (a, b, i) { return i == 0 ? b : b < a ? b : a }, null);
        },
    
        max: function (list, cond) {
            return this.reduce(this.nvlist(list, cond), function (a, b, i) { return i == 0 ? b : b > a ? b : a }, null);
        },
    
        avg: function (list, cond) {
            var nList = this.nvlist(list, cond)
            if (nList.length > 0) {
                return this.reduce(nList, function (a, b) { return a + b }, 0) / nList.length;
            }
            else {
                return 0;
            }
        },
    
        first: function (list, cond) {
            return this.filter(list, cond)[0] || null;
        },
    
        last: function (list, cond) {
            var fList = this.filter(list, cond);
            return fList[fList.length - 1] || null;
        },
    
        add: function (a, b) { return this.nv(a) + this.nv(b) },
        sub: function (a, b) { return this.nv(a) - this.nv(b) },
        mul: function (a, b) { return this.nv(a) * this.nv(b) },
        div: function (a, b) { return this.nv(a) / this.nv(b) },
        mod: function (a, b) { return this.nv(a) % this.nv(b) },
    
        ceil: function (x) { return Math.ceil(this.nv(x)) },
        floor: function (x) { return Math.floor(this.nv(x)) },
        round: function (x, y) { return this.nv(x).toFixed(this.nv(y)) },
    
        abs: function (x) { return Math.abs(this.nv(x)) },
    
        pow: function (x, y) { return Math.pow(this.nv(x), this.nv(y)) },
        sqrt: function (x) { return Math.sqrt(this.nv(x)) },
    
        acos: function (x) { return Math.acos(this.nv(x)) },
        asin: function (x) { return Math.asin(this.nv(x)) },
        atan: function (x) { return Math.atan(this.nv(x)) },
        atan2: function (x, y) { return Math.atan(this.nv(x), this.nv(y)) },
        cos: function (x) { return Math.cos(this.nv(x)) },
        sin: function (x) { return Math.sin(this.nv(x)) },
        tan: function (x) { return Math.tan(this.nv(x)) },
    
        ln: function (x) { return Math.log(this.nv(x)) },
        log: function (x) { return Math.log(this.nv(x)) / Math.LN10 },
        exp: function (x) { return Math.exp(this.nv(x)) },
        inv: function (x) { return -1 & this.nv(x) },
    
        concat: function (a, b) { return this.sv(a) + this.sv(b) },
    
        iif: function (cond, onTrue, onFalse) {
            return cond ? onTrue : onFalse;
        },
    
        addTime: function (date, minutes) {
            var nMinutes = DateUtil.toMinutes(minutes);
            return date && date.getTime && minutes ? new Date(date.getTime() + (nMinutes * 60000)) : null;
        },

        now: function () {
            return new Date();
        },

        empty: function () {
            return "";
        },
    
        getNodeKey: function(x) {
            switch (this.getType(x)) {
                case 'finding':
                    return x.get('nodeKey') || '';
                case 'group':
                    return x.get('nodeKey') || '';
                case 'noteElement':
                    return x.get('nodeKey') || '';
                case 'string':
                    return x;
                case 'object':
                    return x.nodeKey || '';
                default:
                    return '';
            };
        },

        getMedcinId: function(x) {
            switch (this.getType(x)) {
                case 'finding':
                    return x.get('medcinId') || 0;
                case 'group':
                    return x.get('medcinId') || 0;
                case 'noteElement':
                    return x.get('medcinId') || 0;
                case 'string':
                    return parseInt(x, 10);
                case 'number':
                    return x;
                case 'object':
                    return this.getMedcinId(x.medcinId);
                default:
                    return 0;
            };
        },

        ancestorOf: function (reference, target) {
            return this.descendantOf(target, reference);
        },

        descendantOf: function(reference, target) {
            var rKey = this.getNodeKey(reference);
            var tKey = this.getNodeKey(target);
            return tKey.length > 0 && rKey.length > 0 && tKey.length > rKey.length && tKey.substr(0, rKey.length) == rKey;
        },

        childOf: function(reference, target) {
            var rKey = this.getNodeKey(reference);
            var tKey = this.getNodeKey(target);
            return tKey.length > 0 && rKey.length > 0 && tKey.length == rKey.length + 2 && tKey.substr(0, rKey.length) == rKey;
        },

        medcinIdList: function(list, finding) {
            var medcinId = finding ? finding.medcinId || 0 : 0;
            if (medcinId) {
                var idList = this.map(list, this.getMedcinId);
                for (var n = 0, len = idList.length; n < len; n++) {
                    if (idList[n] == medcinId) {
                        return true;
                    };
                };
            };
            return false;
        },

        nodeKeyMatch: function (reference, target) {
            var rKey = this.getNodeKey(reference);
            var tKey = this.getNodeKey(target);
            return rKey && tKey && rKey == tKey || this.descendantOf(reference, target);
        },

        match: function (pattern, input, caseSensitive) {
            return new RegExp(pattern || '', caseSensitive ? "" : "i").test(input || '');
        },

        format: function (input, pattern) {
            pattern = pattern || '';
            
            if (/^(lower|upper|title|sentence)case$/i.test(pattern)) {
                return StringUtil.capitalize(this.sv(input), pattern.substr(0, pattern.length - 4).toLowerCase());
            };

            if (/[09#]/.test(pattern)) {
                return StringUtil.formatNumber(this.nv(input), pattern);
            };

            if (/^age/i.test(pattern)) {
                var d1 = new Date();
                var d2 = new Date(d1.getTime() + (this.nv(input) * 60000));
                var age = DateUtil.calculateAge(d1, d2);
                switch (pattern.substr(pattern.length - 1, 1)) {
                    case '1':
                        return age.label;
                    case '2':
                        return /s$/.test(age.label) ? age.label.substr(0, age.label.length - 1) : age.label;
                    case '3':
                        return age.shortLabel;
                    case '4':
                        return age.label.toLowerCase();
                    case '5':
                        return (/s$/.test(age.label) ? age.label.substr(0, age.label.length - 1) : age.label).toLowerCase();
                    default:
                        return age.label;
                }
            };

            if (/(date|time)/i.test(pattern)) {
                return DateUtil.format(this.dv(input) || new Date(), pattern);
            };

            if (/[adefghkmsuwyz]/i.test(pattern)) {
                return DateUtil.format(this.dv(input) || new Date(), pattern);
            };

            return input;
        },

        replace: function(input, pattern, replacement, caseSensitive) {
            return (input || '').replace(new RegExp(pattern, 'g' + (caseSensitive ? '' : 'i')), replacement);
        },
        
        
        getObject: function (context, name, property) {
            return function (name, property) {
                var target = typeof name == 'object' ? name : context[name];
                var parts = property ? property.split('.') : [];
                var prop = '';
                while (target && parts.length > 0) {
                    prop = parts.shift();
                    if (typeof target[prop] == 'function') {
                        target = target[prop]();
                    }
                    else if (typeof target.get == 'function') {
                        target = target.get(prop);
                    }
                    else {
                        target = target[prop];
                    }
                }
                return target;

                //if (target) {
                //    if (property) {
                //        return target.get ? target.get(property) : target[property];
                //    }
                //    else {
                //        return target;
                //    }
                //};
            };
        },
    
        setObject: function (context, name, property, value) {
            return function (name, property, value) {
                if (property) {
                    var target = context[name];
                    if (target) {
                        if (target.set) {
                            target.set(property, value);
                        }
                        else {
                            target[property] = value;
                        }
                    }
                    else {
                        context[name] = {};
                        context[name][property] = value;
                    }
                }
                else {
                    context[name] = value;
                };
                return value;
            };
        },

		hitch: lang.hitch
    });

	return new Host();
});