define([
"qc/Dialog",
"dojo/_base/array",
"dojo/_base/declare",
"dojo/_base/event",
"dojo/_base/lang",
"dojo/aspect",
"dojo/dom-class",
"dojo/keys",
"dojo/on",
"dojo/query",
"dojo/request",
"dojo/when",
"dojo/topic",
"dijit/_TemplatedMixin",
"dijit/_WidgetsInTemplateMixin",
"dijit/_WidgetBase",
"dijit/form/Button",
"dijit/form/TextBox",
"dijit/layout/ContentPane",
"dijit/Toolbar",
"qc/DateUtil",
"qc/design/LayoutBuilder",
"qc/design/ToolbarBuilder",
"qc/Label",
"dojo/text!qc/templates/MedcinTreeDialog.htm",
"qc/MedcinTree",
"qc/_core"
], function (qcDialog, array, declare, event, lang, aspect, domClass, keys, on, query, request, when, topic, _TemplatedMixin, _WidgetsInTemplateMixin, _WidgetBase, Button, TextBox, ContentPane, Toolbar, DateUtil, LayoutBuilder, ToolbarBuilder, Label, TreeDialogTemplate, MedcinTree, core) {
    return declare("qc.MedcinTreeDialog", [qcDialog, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        //templateString: '<div class="qcMedcinTreeDialog"></div>',
        templateString: TreeDialogTemplate,
        title: 'Medcin Tree Dialog',
        clear: 0,

        startup: function () {
            if (!this._started) {
                this.inherited(arguments);
                    this.events = [
                        aspect.after(this.navTree, "onSelectionChanged", lang.hitch(this, this.onTreeNodeSelected), true)
                    ];
                this.mainPanel.startup();
            };
            if (this.clear) {
                this.clear = 0;
                this.browse();
            }
        },

        onOKClick: function () {
            var term = this.navTree.getSelectedItem();
            this.hide();
            //if (term && term.medcinId != 0 && term.text) {
                topic.publish("/qc/TreeDialogSelection", { id: term && term.medcinId != 0 && term.text ? term.medcinId : 0});
            //}
        },

        onCancelClick: function () {
            this.hide();
            topic.publish("/qc/TreeDialogSelection", { id: 0 });
        },

        onSearchKeyUp: function (evt) {
            if (evt.keyCode == keys.ENTER) {
                event.stop(evt);
                this.onSearchClick();
            };
        },

        onSearchClick: function () {
            this.search(this.txtSearch.get('value'));
        },

        browse: function () {
            var item = this.navTree.resMode == 'search' ? this.navTree.getSelectedItem() : null;
            this.navTree.resMode = 'browse';
            if (item) {
                this.navTree.browseToTerm(item);
            }
            else {
                this.navTree.browse();
                this.showTerm(null);
            };
        },

        search: function (query) {
            if (query) {
                this.navTree.resMode = "search";
                this.navTree.search(query);
            };
        },

        onTreeNodeSelected: function () {
            this.showTerm(this.navTree.getSelectedItem());
        },

        getSelectedTerm: function () {
            var term = this.navTree.getSelectedItem();
            if (!term) {
                return null;
            }
            else {
                return term;
            };
        },
        showTerm: function (term) {
            //if (term && term.medcinId != 0 && term.text) {
            //    topic.publish("/qc/TreeDialogSelection", { id: term.medcinId });
            //}
        }
    });
});