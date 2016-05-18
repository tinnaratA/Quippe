define([
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/text!qc/templates/OpenUserContentDialog.htm",
    "dojo/dom-style",
    "dojo/request",
    "dojo/topic",
    "dojo/when",
    "dojo/window",
    "qc/_core",
    "qc/Dialog",
    "qc/ListView",
    "qc/ResizableDialogMixin"
], function (_WidgetsInTemplateMixin, Button, TextBox, BorderContainer, ContentPane, array, declare, lang, aspect, OpenUserContentDialogTemplate, domStyle, request, topic, when, win, core, Dialog, ListView, ResizableDialogMixin) {
    return declare("qc.OpenUserContentDialog", [Dialog, _WidgetsInTemplateMixin, ResizableDialogMixin], {
        title: 'Open',
        templateString: OpenUserContentDialogTemplate,
        typeFilter: 'udf',

        startup: function () {
            if (!this._started) {

                this.inherited(arguments);

                this.resizer.minWidth = 360;
                this.resizer.minHeight = 320;

                this.onLoad('');
            }
        },

        _getItemAttr: function () {
            var doubleClickedItem = this._doubleClickedItem;
            this._doubleClickedItem = null;

            return doubleClickedItem || (this.listView ? this.listView.getSelectedItem().data : null);
        },

        onItemDoubleClicked: function (item) {
            this._doubleClickedItem = item.data;
            this.onOKClick();
        },

        onLoad: function (search) {
            this.listView.clear();
            var self = this;
            return request(core.serviceURL('Quippe/KB/Extension/Search'), {
                query: { 'DataFormat': 'JSON', TypeName: 'udf', KeyWords: search },
                preventCache: true,
                handleAs: 'json'
            }).then(function (data) {
                array.forEach(data.items, function (item) {
                    self.listView.addItem({ text: item.name, description: item.name, data: item });
                })
             }, function (err) {
            });
        },

        onSelectionChange: function (evt) {
            var item = this.listView.getSelectedItem();
            if (item != null) {
                this.cmdOK.set('disabled', false);
            }
            else {
                this.cmdOK.set('disabled', true);
            }
        },

        onOkClick: function (evt) {
            var item = this.listView.getSelectedItem();
            if (item != null) {
                return item;
            }
        },

        onCancelClick: function (evt) {
            this.inherited(arguments);
        },

        onSearchChange: function (evt) {
            var s = this.txtSearch.get("value") || '';
            this.cmdSearch.set("disabled", s.length > 0 ? false : true);
        },

        onSearchClick: function(evt) {
            this.onLoad(this.txtSearch.get("value") || '');
        },

        onResizerUpdate: function (width, height) {
            domStyle.set(this.containerNode, "width", width + "px");
            domStyle.set(this.containerNode, "height", height + "px");

            this.mainPanel.resize({
                w: width,
                h: height - 28
            });
        }
    })
});