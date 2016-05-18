define([
    "dijit/CheckedMenuItem",
    "dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/lang",
    "dojo/on",
    "qc/_core"
], function (CheckedMenuItem, declare, event, lang, on, core) {
    return declare("qc.CheckedMenuItem", [CheckedMenuItem], {
        suppressClickOnCheck: false,

        postCreate: function () {
        	if (core.util.isTouchDevice) {
        		on(this.domNode, "touchend", lang.hitch(this, this._onTouchEnd));
        	};
        	this.inherited(arguments);
        },

        _onTouchEnd: function (evt) {
        	this._set("active", false);
	        event.stop(evt);
		},

        _onClick: function (/*Event*/e) {
			if (!this.disabled) {
                this.set("checked", !this.checked);
                this.onChange(this.checked);
            }
            if (!this.suppressClickOnCheck) {
                this.inherited(arguments);
            }
        }


    });
});