define([
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/layout/ContentPane",
    "dojo/_base/declare",
    "dojo/text!qc/design/templates/StandardDialog.htm",
    "qc/Dialog"
], function (_WidgetsInTemplateMixin, Button, ContentPane, declare, StandardDialogTemplate, Dialog) {
    return declare("qc.design.StandardDialog", [Dialog, _WidgetsInTemplateMixin], {
        templateString: StandardDialogTemplate,
        
    
        _getContentAttr: function () {
            return this.contentArea.get('content');
        },
        _setContentAttr: function (value) {
            this.contentArea.set('content', value);
        }
    });
});