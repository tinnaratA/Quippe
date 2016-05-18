define([
    "dijit/MenuItem",
    "dojo/_base/declare",
	"dojo/_base/event",
    "dojo/_base/lang",
    "dojo/on",
    "qc/_core"
], function (MenuItem, declare, event, lang, on, core) {
	return declare("qc.MenuItem", [MenuItem], {
		postCreate: function () {
			if (core.util.isTouchDevice) {
				on(this.domNode, "touchend", lang.hitch(this, this._onTouchEnd));
			};
			this.inherited(arguments);
		},

		_onTouchEnd: function (evt) {
			this._set("active", false);
			event.stop(evt);
		}
    });
});