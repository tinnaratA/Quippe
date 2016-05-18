define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "qc/note/Component_dropDown"
], function (declare, domClass, dropDown) {
    return declare("qc.note.Component_dropDown", [dropDown], {
        entryClass: 'cmb',
    
        createNode: function () {
            this.inherited(arguments);
            domClass.add(this.domNode, 'dropDownList');
            this.textbox.setAttribute('readonly', true);
        },

        onClick: function (evt) {
            if (this.isDisabled) {
                return;
            };
            this.showDropDown();
        }
    });
});