define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom-geometry",
    "qc/Resizer"
], function(declare, lang, aspect, domGeometry, Resizer) {
    return declare("qc.ResizableDialogMixin", [], {
        startup: function() {
            if (!this._started) {
                this.resizer = new Resizer({ ownerNode: this.domNode, sizeNode: this.domNode });
                aspect.after(this.resizer, '_sizeChangedFromHandle', lang.hitch(this, this.onResizerUpdate), true);

                this.inherited(arguments);
            }
        },

        _onResizerUpdate: function (width, height) {
            this.onResizerUpdate(width, height - this.get("titlebarHeight"));
        },

        onResizerUpdate: function(width, height) {
            
        },

        _getTitlebarHeightAttr: function () {
            if (typeof this._titlebarHeight == "undefined") {
                if (!this.titlebar && !this.titleBar) {
                    this._titlebarHeight = 0;
                }

                else {
                    this._titlebarHeight = domGeometry.position(this.titlebar || this.titleBar).h;
                }
            }

            return this._titlebarHeight;
        }
    });
});