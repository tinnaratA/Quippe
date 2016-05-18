define([
    "dijit/_HasDropDown",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/declare",
    "dojo/text!qc/design/templates/DropDownPropertyEditor.htm"
], function (_HasDropDown, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, declare, DropDownPropertyEditorTemplate) {
    return declare("qc.design.DropDownPropertyEditor", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: DropDownPropertyEditorTemplate,
        
    
        _setDropDownAttr: function (value) {
            this.dropDown = value;
            this.dropDownButton.dropDown = value;
        },
    
        openDropDown: function () {
            this.dropDown.set('value', this.textBox.get('value'));
            this.inherited(arguments);
        },
    
        closeDropDown: function () {
            this.inherited(arguments);
            var value = this.dropDown.get('value') || '';
            this.textBox.set('value', value.toString());
        }
    
    });
});