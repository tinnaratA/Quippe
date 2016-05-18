define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/_core"
], function (declare, lang, core) {
    return declare("qc._PropertyBinder", [], {
        srcObject: null,
        srcProperty: '',
        srcWatchHandle: null,
        srcTransform: null,

        tgtObject: null,
        tgtProperty: '',
        tgtWatchHandle: null,
        tgtTransform: null,


        constructor: function (srcObject, srcProperty, srcTransform, tgtObject, tgtProperty, tgtTransform) {
            this.srcObject = srcObject;
            this.srcProperty = srcProperty ? srcProperty.toString() : '';
            if (core.isFunction(srcTransform)) {
                this.srcTransform = srcTransform;
            }
            else {
                this.srcTransform = function (s) { return s };
            }

            this.tgtObject = tgtObject;
            this.tgtProperty = tgtProperty ? tgtProperty.toString() : '';
            if (core.isFunction(tgtTransform)) {
                this.tgtTransform = tgtTransform;
            }
            else {
                this.tgtTransform = function (t) { return t };
            }
            this.resumeWatch();
        },

        srcChanged: function (propertyName, oldValue, newValue) {
            this.suspendWatch();
            var transformedValue = this.srcTransform(newValue);
            if (transformedValue != undefined) {
                this.tgtObject.set(this.tgtProperty, transformedValue);
            };
            this.resumeWatch();
        },

        tgtChanged: function (propertyName, oldValue, newValue) {
            this.suspendWatch();
            var transformedValue = this.tgtTransform(newValue);
            if (transformedValue != undefined) {
                if (core.isFunction(this.srcObject.set)) {
                    this.srcObject.set(this.srcProperty, transformedValue);
                }
                else {
                    this.srcObject[this.srcProperty] = transformedValue;
                }
            };
            this.resumeWatch();
        },

        suspendWatch: function () {
            if (this.tgtWatchHandle) {
                this.tgtWatchHandle.unwatch();
                this.tgtWatchHandle = null;
            };
            if (this.srcWatchHandle) {
                this.srcWatchHandle.unwatch();
                this.srcWatchHandle = null;
            };
        },

        resumeWatch: function () {
            if (this.srcObject && this.srcProperty && this.tgtObject && this.tgtProperty) {
                if (!this.tgtWatchHandle && core.isFunction(this.tgtObject.watch) && !core.isNativeCode(this.tgtObject.watch)) {
                    this.tgtWatchHandle = this.tgtObject.watch(this.tgtProperty, lang.hitch(this, this.tgtChanged));
                };
                if (!this.srcWatchHandle && core.isFunction(this.srcObject.watch) && !core.isNativeCode(this.srcObject.watch)) {
                    this.srcWatchHandle = this.srcObject.watch(this.srcProperty, lang.hitch(this, this.srcChanged));
                };
            }
        },

        destroy: function () {
            this.suspendWatch();
            this.srcObject = null;
            this.srcProperty = null;
            this.srcWatchHandle = null;
            this.tgtObject = null;
            this.tgtProperty = null;
            this.tgtWatchHandle = null;
        }

    });
});