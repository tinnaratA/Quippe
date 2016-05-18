define([
    "dijit/_HasDropDown",
    "dijit/form/TextBox",
    "dijit/form/ValidationTextBox",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/text!qc/templates/DropDownTextBox.htm"
], function (_HasDropDown, TextBox, ValidationTextBox, declare, lang, DropDownTextBoxTemplate) {
    return declare("qc.DropDownTextBox", [ValidationTextBox, _HasDropDown], {
        templateString: DropDownTextBoxTemplate,
        destroyOnClose: false,
        allowTextEdit: true,
        _isLoaded: false,
    
        isLoaded: function () {
            return this.dropDown && this._isLoaded;
        },
    
        loadDropDown: function (loadCallback) {
            if (!this.dropDown) {
                this.dropDown = this.createDropDown(this);
            };
            this.inherited(arguments);
        },
    
        createDropDown: function (self) {
            if (this.dropDownType) {
            	var Type = typeof this.dropDownType == 'string' ? require(this.dropDownType.replace(/\./g, "/")) : this.dropDownType;
                var widget = new Type(this.dropDownSettings || {})
                return widget;
            }
            else {
                return null;
            }
        },
    
        _setAllowTextEditAttr: function (value) {
            if (value) {
                this.textbox.removeAttribute('readonly');
            }
            else {
                this.textbox.setAttribute('readonly', true);
            };
            this.allowTextEdit = value
        },
    
        closeDropDown: function () {
            this.inherited(arguments);
            if (this.dropDown && this.destroyOnClose) {
                this.dropDown.destroy();
                this.dropDown = null;
            }
        }
    });
});