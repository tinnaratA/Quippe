define([
	"qc/_PropertyBinder",
    "dijit/_WidgetBase",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/_core"
], function (_PropertyBinder, _WidgetBase, array, declare, lang, core) {
    var decl = declare("qc.DataBinder", [], {

        bindProperty: function (srcObject, srcProperty, tgtProperty, srcTransform, tgtTransform) {
            if (srcObject && typeof srcObject == 'string') {
                srcObject = lang.getObject(srcObject, false);
            };
            if (srcObject) {
                srcProperty = srcProperty || 'value';
                tgtProperty = tgtProperty || srcProperty;

                if (!this._propertyBinders) {
                    this._propertyBinders = {};
                };

                this.unbindProperty(tgtProperty);
                if (core.isFunction(srcObject.get)) {
                    this.set(tgtProperty, srcObject.get(srcProperty));
                }
                else {
                    this.set(tgtProperty, srcObject[srcProperty]);
                }

                this._propertyBinders[tgtProperty] = new _PropertyBinder(srcObject, srcProperty, srcTransform, this, tgtProperty, tgtTransform);
            }
        },

        unbindProperty: function (tgtProperty) {
            if (this._propertyBinders && this._propertyBinders[tgtProperty]) {
                this._propertyBinders[tgtProperty].destroy();
                delete this._propertyBinders[tgtProperty];
            };
        },

        unbindAll: function () {
            if (this._propertyBinders) {
                array.forEach(this._PropertyBinders, function (p) { p.destroy(); });
            };
            this._propertyBinders = null;
            delete this._propertyBinders;
        }
    });

    lang.extend(_WidgetBase, new decl());

});