define([
    "dojo/_base/array",
    "dojo/_base/declare",
	"dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/json",
    "qc/_core"
], function (array, declare, lang, domClass, domStyle, json, core) {

    var StyleUtil = declare("qc.StyleUtil", [], {

        // borderLeftStyle --> border-left-style
        toCssName: function (name) {
            return name.replace(/([A-Z])/g, '-$1').toLowerCase();
        },

        // border-left-style --> borderLeftStyle
        toJsonName: function (name) {
            return array.map(name.split('-'), function (part, i) { return i > 0 && part.length > 0 ? part.substr(0, 1).toUpperCase() + part.substr(1) : part }).join('');
        },

        styleToObject: function (input) {
            return this.styleToObject_aggressive(input);
        },

        styleToObject_aggressive: function (input) {
            if (!input) {
                return {};
            };

            var reQuote = /['"]/g;
            var buf = [];
            buf.push('{');
        	// DojoConvertIgnore
            array.forEach(input.split(/[;,]/g), function (item, i, items) {
                if (item) {
                    var nv = item.split(':');
                    var name = this.toJsonName((nv[0] || '').trim());
                    var value = (nv[1] || '').replace(reQuote, '').trim()
                    if (name && value) {
                    	if (i > 0) {
                    		buf.push(',');
                    	}
                        buf.push("\"" + name + "\":\"" + value + "\"");
                    };
                };
            }, this);
            buf.push('}');
            var obj = null;
            try {
                obj = json.parse(buf.join(''));
                return obj;
            }
            catch (ex) {
                core.showError('Error parsing style string: "' + input + '" - ' + ex);
                return null;
            };
        },

        styleToObject_standard: function (input) {
            if (!input) {
                return {};
            };

            var buf = [];
            buf.push('{');
            array.forEach(input.split(/;/g), function (item, i) {
                if (item) {
                    var nv = item.split(':');
                    if (i > 0) {
                        buf.push(',');
                    };
                    buf.push(this.toJsonName(nv[0]));
                    buf.push(":'");
                    buf.push((nv[1] || '').trim());
                    buf.push("'");
                };
            }, this);
            buf.push('}');
            var obj = null;
            try {
                obj = json.parse(buf.join(''));
                return obj;
            }
            catch (ex) {
                core.showError('Error parsing style string: "' + input + '" - ' + ex);
                return null;
            };
        },

        objectToStyle: function (input) {
            if (!input) {
                return '';
            };
            var buf = [];
            for (var prop in input) {
                buf.push(this.toCssName(prop) + ':' + input[prop]);
            };
            return buf.join(';');
        },

        getCssStyleProperty: function (styleString, propertyName) {
            return this.styleToObject(styleString)[this.toJsonName(propertyName)] || '';
        },

        isHiddenNode: function (node, skipContainerCheck) {
            return core.isHiddenNode(node, skipContainerCheck);
        },

        mergeStyles: function (styleStringList) {
            var args = core.forceArray(styleStringList);
            if (args.length == 0) {
                return '';
            };
            var target = this.styleToObject(args.shift());
            var source = null;
            var p = '';
            while (args.length > 0) {
                source = this.styleToObject(args.shift());
                for (p in source) {
                    if (target[p] == undefined) {
                        target[p] = source[p];
                    };
                };
            };
            return this.objectToStyle(target);
        },

        reduceStyles: function (styleStringList) {
            var args = core.forceArray(styleStringList);
            if (args.length == 0) {
                return '';
            };
            var target = this.styleToObject(args.shift());
            var source = null;
            var p = '';
            while (args.length > 0) {
                source = this.styleToObject(args.shift());
                for (p in target) {
                    if (target[p] == source[p]) {
                        delete target[p];
                    };
                };
            };
            return this.objectToStyle(target);
        }
    });

    core.StyleUtil = new StyleUtil();

    lang.setObject("qc.StyleUtil", core.StyleUtil);

    return core.StyleUtil;
});