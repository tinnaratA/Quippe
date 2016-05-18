define([
    "qc/_ContextMenuContainer",
    "qc/BrowseTree",
    "dijit/_Container",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/registry",
    "dijit/Toolbar",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/NodeList-traverse",
    "dojo/on",
    "dojo/query",
    "dojo/text!qc/templates/BrowsePopup.htm",
    "dojo/topic",
    "qc/_core"
], function (_ContextMenuContainer, BrowseTree, _Container, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Button, BorderContainer, ContentPane, registry, Toolbar, array, declare, lang, aspect, NodeListTraverse, on, query, BrowsePopupTemplate, topic, core) {
    return declare("qc.BrowsePopup", [_WidgetBase, _TemplatedMixin, _Container, _ContextMenuContainer, _WidgetsInTemplateMixin], {
        CAN_MERGE_ATTR: 128,
        templateString: BrowsePopupTemplate,
        isPinned: false,

        startup: function () {
            if (!this._started) {
                this.tree.startup();
                this.toolbar.addChild(new Button({
                    label: core.getI18n("addtonote"),
                    iconClass: "document_add",
                    onClick: lang.hitch(this, this.onAddToNote),
                    showLabel: true
                }));

                this.toolbar.addChild(new Button({
                    label: core.getI18n("mergeprompt"),
                    iconClass: "view",
                    onClick: lang.hitch(this, this.onMergePrompt),
                    showLabel: true
                }));

                this.toolbar.addChild(new Button({
                    label: core.getI18n("addtofavorites"),
                    iconClass: "star_yellow_add",
                    onClick: lang.hitch(this, this.onAddToFavorites),
                    showLabel: true
                }));

                this.pinButton = new Button({
                    lable: "Pin",
                    showLabel: false,
                    iconClass: "pin2_red",
                    onClick: lang.hitch(this, this.onPinButtonClicked)
                });
                this.toolbar.addChild(this.pinButton);

                //on(this.tree, "DblClick", lang.hitch(this, this.onDoubleClick));
                aspect.after(this.tree, "onNodeDoubleClick", lang.hitch(this, this.onNodeDoubleClick), true);
                topic.subscribe("/qc/DragDropComplete", lang.hitch(this, this.onDndComplete));

                this.inherited(arguments);
            };
        },

        _onExecute: function () {
            if (!this.isPinned) {
                this.onExecute();
            };
        },

        _getPinnedAttr: function () {
            return this.isPinned;
        },
        _setPinnedAttr: function (value) {
            this.isPinned = value;
            this.pinButton.set('iconClass', value ? 'xdel' : 'pin2_red');
        },

        onExecute: function () { },

        getSelectedItem: function (mergeableOnly) {
            var item = this.tree.selectedNode ? this.tree.selectedNode.data || null : null;
            if (!item) {
                return null;
            };

            if (mergeableOnly) {
                return item.type == 'term' || (item.attributes & this.CAN_MERGE_ATTR) ? item : null
            }
            else {
                return item;
            };
        },

        onAddToNote: function (evt) {
            this.addItemToNote(this.getSelectedItem(true));
            //this.addItemToNote(this.getSelectedItem(["term", "list", "element"]));
        },

        onMergePrompt: function (evt) {
            var item = this.getSelectedItem(true);
            if (item) {
                topic.publish("/qc/MergePrompt", item, -1);
                this._onExecute();
            };
        },

        onAddToFavorites: function (evt) {
            var item = this.getSelectedItem(true);
            if (item) {
                topic.publish("/qc/AddToFavorites", item);
                this._onExecute();
            };
        },

        onNodeDoubleClick: function (tNode, evt) {
            if (!tNode || !tNode.data) {
                return;
            };

            if (tNode.data.type == 'folder') {
                tNode.toggleExpansion();
            }
            else if (tNode.data.type == 'term' && tNode.data.medcinId == 0) {
                tNode.toggleExpansion();
            }
            else {
                this.addItemToNote(tNode.data);
            }
        },

        addItemToNote: function (item) {
            if (item) {
                if (item.type == 'term') {
                    item.styleClass = 'lstBrowse';
                };
                var suppressSelection = this.isPinned ? true : false;
                if (this.selectedFinding && this.selectedFinding.domNode) {
                    item.prefix = this.selectedFinding.get('prefix') || '';
                    item.result = this.selectedFinding.get('result') || '';
                    topic.publish("/qc/AddToNote", item, this.selectedFinding.domNode, 'after', suppressSelection);
                }
                else {
                    topic.publish("/qc/AddToNote", item, null, null, suppressSelection);
                };
                this._onExecute();
            };
        },

        //onDoubleClick: function (evt) {
        //    this.onAddToNote(evt);
        //},

        onDndComplete: function () {
            this._onExecute();
        },

        onShow: function () {
            this.isShowing = true;
            this.selectedFinding = query(".qcNoteEditor .selected.finding").map(registry.byNode)[0] || null;
            if (this.selectedFinding) {
                this.tree.expandToTerm(this.selectedFinding);
            }
            else {
                this.tree.collapseAll();
            };
        },

        onPinButtonClicked: function () {
            if (this.isPinned) {
                this.isPinned = false;
                this.pinButton.set('iconClass', 'pin2_red');
                this.onExecute();
            }
            else {
                this.isPinned = true;
                this.pinButton.set('iconClass', 'xdel');
            };
        }
    }
    );
});