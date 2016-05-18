define([
    "dijit/form/FilteringSelect",
    "dojo/_base/declare",
    "qc/_core"
], function (FilteringSelect, declare, core) {
    return declare("qc.FilteringSelect", [FilteringSelect], {
        postCreate: function () {
    
            //overrides the default behavior on touchpads to prevent the keyboard from popping up
            if (core.settings.features.touchPad) {
                this.textbox.setAttribute('readonly', true);
                this._buttonNode = this.domNode;
            };
    
            this.inherited(arguments);
        }
    
    });
});