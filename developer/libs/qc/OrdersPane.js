define([
    "qc/_ContextMenuContainer",
    "qc/ListView",
    "qc/ListViewItem",
    "qc/TaskPane",
    "dijit/_Container",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dijit/TitlePane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/NodeList-traverse",
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    "qc/_core"
], function (_ContextMenuContainer, ListView, ListViewItem, TaskPane, _Container, _TemplatedMixin, _WidgetBase, registry, TitlePane, array, declare, event, lang, domClass, domConstruct, domStyle, NodeListTraverse, on, query, topic, core) {
    return declare("qc.OrdersPane", [TaskPane], {
        name: "Orders",
        title: "Orders",
        ordersList: null,
        actionButton: null,
        itemCount: 0,

        startup: function () {
            if (!this._started) {
                domClass.add(this.domNode, "qcOrdersPane");
                domClass.add(this.domNode, "qcddTarget");
                this.set("title", core.getI18n("orders"));
                this.ordersList = new ListView();
                domConstruct.place(this.ordersList.domNode, this.containerNode);
                this.ordersList.startup();
                this.ordersList.multiSelect = false;
                this.ordersList.setViewMode("list");
                this.ordersList.dropDelete = lang.hitch(this, this.removeOrder);

                var btn = '<span class="titlebarActionButton form_blue" style="display:none;"></span>';
                this.actionButton = domConstruct.place(btn, this.titleBarNode, "first");
                this.set("open", false);
                on(this.actionButton, "click", lang.hitch(this, this.onActionButtonClick));

                this.inherited(arguments);
            };
        },

        _onEnabled: function () {
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/qc/FindingClick", lang.hitch(this, this.onFindingClick)),
                    topic.subscribe("/noteEditor/findingAdded", lang.hitch(this, this.onFindingClick)),
                    topic.subscribe("/noteEditor/findingRemoved", lang.hitch(this, this.removeOrder)),
                    topic.subscribe("/qc/AddOrder", lang.hitch(this, this.addOrder)),
                    topic.subscribe("/qc/RemoveOrder", lang.hitch(this, this.removeOrder)),
                    topic.subscribe("/qc/ClearOrders", lang.hitch(this, this.clearOrders)),
                    topic.subscribe("/qc/WorkspaceReset", lang.hitch(this, this.clearOrders)),
                    topic.subscribe("/qc/ContentLoaded", lang.hitch(this, this.onContentLoaded)),
                    topic.subscribe("/noteEditor/listAdded", lang.hitch(this, this.onContentLoaded))
                ];
            };
            this.set('open', this.itemCount > 0);
        },

        onContentLoaded: function() {
            query(".qcNoteEditor .entry.pos").map(registry.byNode).forEach(lang.hitch(this, this.onFindingClick));
        },

        _onDisabled: function () {
            this.clearOrders();
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            }
        },

        onFindingClick: function (element) {
            if (!element) {
                return;
            };

            var item = element.toFinding();
            item.sourceFinding = element;

            if (this.itemCount > 0 && item.result != "A") {
                return this.removeOrder(item);
            };

            if (item.result == 'A' && item.prefix === "O") {
                return this.addOrder(item);
            };
        },

        clearOrders: function () {
            this.ordersList.clear();
            domStyle.set(this.actionButton, "display", "none");
            this.set("open", false);
            this.itemCount = 0;
        },

        addOrder: function (item) {
            if (!this.ordersList.containsItem(item.id)) {
                if (item.node && !item.sourceFinding && domClass.contains(item.node, "finding")) {
                    item.sourceFinding = registry.byNode(item.node);
                };
                var li = new ListViewItem({
                    caption: item.text,
                    icon: item.icon || core.getItemIcon(item, false) || "",
                    itemId: item.id,
                    description: "",
                    data: item,
                    action: { icon: "xdel", onClick: function () { topic.publish("/qc/RemoveOrder", item); } }
                });
                this.ordersList.addChild(li);
                domStyle.set(this.actionButton, "display", "inline");
                this.set("open", true);

                if (item.sourceFinding) {
                    item.sourceFinding.set("result", "A");
                };

                this.itemCount++;
            };
        },

        removeOrder: function (item) {
            var listItem = this.ordersList.getItem(item.id);
            if (listItem) {
                this.ordersList.removeChild(listItem);
                if (listItem.data && listItem.data.sourceFinding && listItem.data.sourceFinding.domNode) {
                    listItem.data.sourceFinding.set("result", "");
                };
                this.itemCount--;
                if (this.itemCount <= 0) {
                    domStyle.set(this.actionButton, "display", "none");
                    this.set("open", false);
                    this.itemCount = 0;
                }
            };
        },

        getDropAction: function (source, evt) {
            switch (source.type || 'unknown') {
                case 'finding':
                case 'term':
                    return 'add';
                default:
                    return null;
            }
        },

        doDrop: function (source, evt) {
            switch (source.type || 'unknown') {
                case 'finding':
                    this.addOrder(source);
                    break;
                case 'term':
                    source.result = 'A';
                    topic.publish('/qc/AddToNote', source);
                    break;
                default:
                    break;
            };
        },

        onActionButtonClick: function (evt) {
            event.stop(evt);
            var items = array.map(this.ordersList.getChildren(), function (child) { return child.data });
            if (items.length > 0) {
                topic.publish('/qc/ProcessOrders', items);
            };
        },

        getContextActions: function (item, widget, targetNode) {
            switch (item.type) {
                case 'finding':
                case 'term':
                    return [
                        { label: 'Add to Favorites', icon: 'star_yellow_add', topic: '/qc/AddToFavorites' },
                        { label: 'Delete', icon: 'delete', topic: '/qc/RemoveOrder', beginGroup: true }
                    ];
                default:
                    return [];
            };
        }

    }
    );
});