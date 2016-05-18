define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/request",
    "dojo/topic",
    "qc/XmlUtil",
    "dijit/form/Button",
    "qc/Dialog",
    "dojo/text!qc/design/templates/NewContentDialog.htm",
    "dojo/text!qc/design/templates/ContentTemplates.xml"
], function (declare, array, lang, aspect, request, topic, XmlUtil, Button, Dialog, templateText, ContentTemplatesXML) {
    return declare('qc.design/NewContentDialog', [Dialog], {
        title: 'New Content Item',

        templateString: templateText,

        startup: function() {
            this.loadItemTypes();

            aspect.after(this.listView, "onSelectionChanged", lang.hitch(this, this.onSelectionChanged), true);
            aspect.after(this.listView, "onItemDoubleClick", lang.hitch(this, this.onItemDoubleClick), true);

            this.inherited(arguments);
        },

        loadItemTypes: function () {
            var lv = this.listView;
            lv.clear();
            var xDoc = XmlUtil.createDocument(ContentTemplatesXML);
            array.forEach(XmlUtil.selectChildElements(xDoc.documentElement), function (node) {
                var item = XmlUtil.attributesToObject(node);
                item.text = item.name;
                item.sourceNode = node;
                lv.addItem(item);
            });
        },

        _getSettingsAttr: function() {
            var item = this.listView.getSelectedItem();
            return item ? item.data : {};
        },

        onSelectionChanged: function() {
            var item = this.listView.getSelectedItem();
            if (item) {
                this.cmdOK.set('disabled', false);
            }
            else {
                this.cmdOK.set('disabled', true);
            }
        },

        onItemDoubleClick: function (item) {
            this.listView.setSelectedItem(item);
            this.onOKClick();
        }
    });
});