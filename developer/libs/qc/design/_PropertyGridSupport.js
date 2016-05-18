define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/_core"
], function (declare, lang, core) {
    return declare("qc.design._PropertyGridSupport", [], {
        // summary:
        //      An interface mixin for objects to support the property grid widget
        _hasPropertyGridSupport: true,
    
        // summary:
        //      An example of the propertyInfo object that the property grid expects.
        propertyInfo: {
            name: '',
            type: 'string',
            caption: '',
            description: '',
            options: null,
            section: '',
            group: ''
        },


        // summary:
        //   returns a list of propertyInfo objects for this object
        _pgGetProperties: function (propertyGrid) {
            var props = this._pgGetPropDefs(propertyGrid);
            return props.length > 0 ? props : this.__pgGetSimplePropertyList();
        },

        _pgGetPropDefs: function(propertyGrid) {
            var props = [];
            var propDefExp = /^_pgPropDef/;
            var res = null;
            for (var p in this) {
                if (propDefExp.test(p) && typeof this[p] == 'function') {
                    res = this[p]();
                    if (res) {
                        if (!res.name) {
                            res.name = p.substr(11);
                        }
                        props.push(res);
                    }
                }
            };
            return props;
        },
    
        // summary:
        //   returns the current value for the given property
        _pgGetPropertyValue: function (propertyInfo) {
            if (propertyInfo.getter) {
                return propertyInfo.getter();
            }
            else if (this.get) {
                return this.get(propertyInfo.name);
            }
            else {
                return this[propertyInfo.name];
            };
        },
    
        // summary:
        //   called by the property grid to set the property's value
        _pgSetPropertyValue: function (propertyInfo, value) {
            var currentValue = this._pgGetPropertyValue(propertyInfo);
            if (currentValue === value) {
                return false;
            };

            if (propertyInfo.setter) {
                propertyInfo.setter(value);
            }
            else if (this.set) {
                this.set(propertyInfo.name, value);
            }
            else {
                this[propertyInfo.name] = value;
            };

            return true;
        },
    
        // summary:
        //   returns a generic list of settable properties for an object
        __pgGetSimplePropertyList: function () {
            var list = [];
            for (var p in this) {
                var t = typeof this[p];
                switch (t) {
                    case 'object':
                    case 'function':
                        break;
                    default:
                        list.push({ name: p, type: t });
                }
            };
            return list;
        },
    
        // summary:
        //   returns an object that implements _PropertyGridSupport for the requested object
        _pgGetWrapper: function (obj) {
            var pg = new this.constructor();
    
            var wrapper = {
                target: obj,
                _pgGetProperties: lang.hitch(obj, pg.__pgGetSimplePropertyList),
                _pgGetPropertyValue: lang.hitch(obj, pg._pgGetPropertyValue),
                _pgSetPropertyValue: lang.hitch(obj, pg._pgSetPropertyValue),
                _hasPropertyGridSupport: true
            };
    
            return wrapper;
        },
    
        _pgGetElementName: function (obj) {
            obj = obj || this;
            return obj.toString();
        }
    });
});