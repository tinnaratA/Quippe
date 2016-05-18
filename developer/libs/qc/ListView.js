// dojo.require("dojo.NodeList-traverse"); *dap* - not sure what this was for

define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_Container",
    "qc/_core",
    "qc/ListViewItem",
    "qc/ListViewGroup",
    "dojo/on",
    "dojo/dom-attr",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/_base/array",
    "dojo/dom-geometry", 	
    "dojo/query",
    "dojo/dom-class",
    "dijit/registry",
    "dijit/InlineEditBox",
    "dojo/_base/lang",
	"dojo/_base/event"
], function (declare, _WidgetBase, _TemplatedMixin, _Container, core, ListViewItem, ListViewGroup, on, domAttr, domConstruct, domStyle, array, domGeometry, query, domClass, registry, InlineEditBox, lang, event) {
    return declare("qc.ListView", [_WidgetBase, _TemplatedMixin, _Container], {

        multiSelect: false,
        // detail and largeIcon view modes no longer supported
        //viewModes: ["list", "tile", "simple", "detail", "largeIcon"],
        viewModes: ["list", "tile", "simple"],
        viewMode: "list",

        templateString: '<div class="qcListView"><table class="containerNode" data-dojo-attach-point="containerNode"></table></div>',
        showGroups: false,
        groups: {},
        preserveGroupOrder: false,
        allowLabelEdit: false,
        inLabelEdit: false,

        startup: function () {
            if (!this._started) {
                this.setViewMode(this.viewMode);
                if (core.settings.features.touchPad) {
                    on(this.domNode, 'touchstart', lang.hitch(this, this._onTouchStart));
                    on(this.domNode, 'touchmove', lang.hitch(this, this._onTouchMove));
                    on(this.domNode, 'touchend', lang.hitch(this, this._onTouchEnd));
                    this.touchCount = 0;
                }
                else {
	                on(this.domNode, 'click', lang.hitch(this, this._onClick));
	                on(this.domNode, 'dblclick', lang.hitch(this, this._onDoubleClick));
                };
                this.inherited(arguments);
            };
        },

        addItem: function (item) {
            return this.addChild(this.createListViewItem(item))
        },

        removeItem: function (item) {
            var child = this.getItem(item.id);
            if (child) {
                this.removeChild(child);
            }
        },

        createListViewItem: function (item) {
            if (!item) {
                return null;
            };
            return new ListViewItem({
                caption: item.text || "",
                icon: item.icon || core.getItemIcon(item),
                description: item.description || "",
                data: item
            });
        },

        addChild: function (child) {
            child.owner = this;
            child.startup();
            if (this.showGroups && child.group) {
                this._addChildToGroup(child, child.group);
            }
            else {
                domConstruct.place(child.domNode, this.containerNode, "last");
            }
            return child;
        },

        addChildAt: function (child, index) {
            child.owner = this;
            child.startup();
            if (this.showGroups && child.group) {
                this._addChildToGroup(child, child.group);
            }
            else {
                var children = this.getChildren();

                if (index == 0) {
                    domConstruct.place(child.domNode, this.containerNode, "first");
                }

                else if (index > children.length - 1) {
                    domConstruct.place(child.domNode, this.containerNode, "last");
                }

                else {
                    domConstruct.place(child.domNode, children[index].domNode, "before");
                }
            }
            return child;
        },

        addChildFirst: function (child) {
            child.owner = this;
            child.startup();
            if (this.showGroups && child.group) {
                this._addChildToGroup(child, child.group);
            }
            else {
                domConstruct.place(child.domNode, this.containerNode, "first");
            }
            return child;
        },

        initAllGroups: function () {
            if (this.groups) {
                for (var g in this.groups) {
                    this.addGroup(g, "none");
                }
            }
        },

        addGroup: function (key, initialDisplay) {
            var item = new ListViewGroup({ key: key, caption: this.groups[key] });
            item.startup();
            if (initialDisplay) {
                domStyle.set(item.domNode, "display", initialDisplay);
            }
            domConstruct.place(item.domNode, this.containerNode, "last");
            return item;
        },

        _addChildToGroup: function (child, groupKey) {
            child.group = groupKey;
            var targetGroup = null;
            var nextGroup = null;
            var groups = query(".qcListViewGroup", this.containerNode);
            for (var g = 0; g < groups.length; g++) {
                var group = registry.byId(groups[g].id);
                if (group.key == groupKey) {
                    targetGroup = group;
                    nextGroup = groups[g + 1];
                }
            };
            if (!targetGroup) {
                targetGroup = this.addGroup(groupKey);
                nextGroup = null;
            }
            else {
                this.showGroup(groupKey);
            }

            if (nextGroup) {
                domConstruct.place(child.domNode, nextGroup, "before");
            }
            else {
                domConstruct.place(child.domNode, this.containerNode, "last");
            }

        },

        toggleGroupDisplay: function (groupKey, createIfMissing) {
            this._setGroupDisplay(groupKey, "toggle", createIfMissing);
        },

        showGroup: function (groupKey, createIfMissing) {
            this._setGroupDisplay(groupKey, "table-row", createIfMissing);
        },

        hideGroup: function (groupKey, createIfMissing) {
            this._setGroupDisplay(groupKey, "none", createIfMissing);
        },

        _setGroupDisplay: function (groupKey, display, createIfMissing) {
            var c = this.getChildren();
            var inGroup = false;
            var found = false;
            for (var n = 0; n < c.length; n++) {
				// DojoConvertIgnore
                if (c[n].declaredClass == 'qc.ListViewGroup') {
                    if (c[n].key == groupKey) {
                        inGroup = true;
                        found = true;
                        if (display == "toggle") {
                            display = domStyle.get(c[n].domNode, "display") == "none" ? "table-row" : "none";
                        }
                    }
                    else {
                        inGroup = false;
                    }
                }
                if (inGroup) {
                    domStyle.set(c[n].domNode, "display", display);
                }
            };

            if (!found && createIfMissing) {
                var g = this.addGroup(groupKey);
                if (display == "none") {
                    domStyle.set(g.domNode, "display", "none");
                }
            };
        },

        find: function (key, value) {
            return array.filter(this.getChildren(), function (item, i) { return item[key] == value });
        },

        findByData: function (key, value) {
            return array.filter(this.getChildren(), function (item, i) { return item.data[key] == value });
        },

        itemAtPoint: function (x, y) {
            var list = this.getChildren();
            for (var n = 0; n < list.length; n++) {
                var box = domGeometry.position(list[n].domNode);
                if (box.x <= x && x <= box.x + box.w && box.y <= y && y <= box.y + box.h) {
                    return list[n];
                }
            };
            return null;
        },

        getInsertRelative: function (x, y) {
            var list = this.getChildren();
            for (var n = 0; n < list.length; n++) {
                var box = domGeometry.position(list[n].domNode);
                if (box.y + box.h < y) {
                }
                else if (box.y > y) {
                    return { item: list[n], pos: "before" };
                }
                else if (box.y + box.h / 2 < y) {
                    return { item: list[n], pos: "after" };
                }
                else {
                    return { item: list[n], pos: "before" };
                }
            }
            return null;
        },

        findFirst: function (key, value) {
            return this.find(key, value)[0] || null;
        },

        contains: function (key, value) {
            return array.some(this.getChildren(), function (item, i) { return item[key] == value });
        },

        containsItem: function (id) {
            return array.some(this.getChildren(), function (item, i) { return (item.data && item.data.id == id) });
        },

        remove: function (key, value) {
            var li = this.findFirst(key, value);
            if (li) {
                this.removeChild(li);
            }
        },

        clear: function () {
            domConstruct.empty(this.containerNode);
            this.onSelectionChanged();
        },

        clearSelected: function () {
            query(".qcListViewItem", this.containerNode).removeClass("selected");
            this.onSelectionChanged();
        },

        getItem: function (itemId) {
            return array.filter(this.getChildren(), function (item, i) { return item.data && item.data.id === itemId })[0];
        },

        getItemIndex: function (itemId) {
            var list = this.getChildren();
            for (var n = 0; n < list.length; n++) {
                if (list[n].data.id == itemId) {
                    return n;
                };
            };
            return -1;
        },

        getItemCount: function () {
            return this.getChildren().length;
        },

        getSelectedItems: function () {
            return array.filter(this.getChildren(), function (item, i) { return domClass.contains(item.domNode, "selected") });
        },

        getSelectedItem: function () {
            var items = this.getSelectedItems();
            if (items && items.length > 0) {
                return items[0];
            }
            else {
                return null;
            }
        },

        setSelectedItem: function (item) {
            this.clearSelected();
            domClass.add(item.domNode, "selected");
            return this.onSelectionChanged();
        },

        onSelectionChanged: function () { return true },
        onItemClick: function (item) { return true },
        onItemDoubleClick: function (item) { return true },

        updateSelection: function (item, evt) {
            if (!item) {
                return;
            };

            if (this.multiSelect && core.util.isMultiSelectEvent(evt)) {
                domClass.toggle(item, "selected");
            }
            else {
                if (domClass.contains(item, "selected")) {
                    query(".qcListViewItem", this.containerNode).removeClass("selected");
                }
                else {
                    query(".qcListViewItem", this.containerNode).removeClass("selected");
                    domClass.add(item, "selected");
                }
            }

            this.onSelectionChanged();
        },

        _onClick: function (evt) {
            if (evt.button == 2) { return evt };

            var item = core.ancestorNodeByClass(evt.target, 'qcListViewItem', true);
            if (item) {
                this.updateSelection(item, evt);
                return this.onItemClick(registry.byId(item.id));
            };
        },

        _onDoubleClick: function (evt) {
            if (evt.button == 2) { return evt };

            var item = core.ancestorNodeByClass(evt.target, 'qcListViewItem', true);
            if (item) {
                return this.onItemDoubleClick(registry.byId(item.id));
            };
        },

        _getViewModeAttr: function() {
            return this.viewMode;
        },
        _setViewModeAttr: function (value) {
            value = value || 'list';
            domClass.remove(this.domNode, "list tile simple ic16 ic32");
            domClass.add(this.domNode, value);
            switch (value) {
                case "tile":
                    domClass.add(this.domNode, "ic32");
                default:
                    domClass.add(this.domNode, "ic16");
            };
            this.viewMode = value;
        },

        //deprecated: use set('viewMode')
        setViewMode: function (value) {
            this.set('viewMode', value);
            //domClass.remove(this.domNode, "list tile simple ic16 ic32");
            //domClass.add(this.domNode, value);
            //switch (value) {
            //    case "tile":
            //    case "largeIcon":
            //        domClass.add(this.domNode, "ic32");
            //    default:
            //        domClass.add(this.domNode, "ic16");
            //};
        },

        startLabelEdit: function () {
            if (!this.allowLabelEdit) {
                return;
            };

            var nodeWidget = this.getSelectedItem();
            this.inLabelEdit = true;

            var labelNode = nodeWidget.captionNode;
            var pos = domGeometry.position(labelNode);
            var editSpan = document.createElement('span');
            domClass.add(editSpan, "caption");
            var oldValue = labelNode.innerHTML;
            editSpan.innerHTML = labelNode.innerHTML;
            labelNode.innerHTML = "";
            labelNode.appendChild(editSpan);
            var editor = new InlineEditBox({
                node: nodeWidget,
                listView: this,
                labelNode: labelNode,
                oldValue: oldValue,
                autoSave: true,
                onCancel: function () {
                    this.listView.inLabelEdit = false;
                    this.node.captionNode.innerHTML = oldValue;
                    this.destroyRecursive();
                    this.listView.setSelectedItem(this.node);
                },
                onChange: function (newValue) {
                    this.listView.inLabelEdit = false;
                    this.node.captionNode.innerHTML = newValue;
                    this.destroyRecursive();
                    this.listView.setSelectedItem(this.node);
                    this.listView.onLabelChanged(this.node, newValue);
                },
                width: (pos.w > 100 ? pos.w : 100) + 'px'
            }, editSpan);
            editor.startup();
            editor.edit();

        },

        onLabelChanged: function (listItem, newValue) {
        },

        _onTouchStart: function (evt) {
            if (evt.touches.length > 1) {
                this.touchData = null;
                return;
            };

            if (this.touchData && (new Date().getTime() - this.touchData.initialTime) < 700) {
                this.touchData.count++;
            }
            else {
                var item = core.ancestorWidgetByClass(evt.target, 'qcListViewItem', true);
                if (item) {
                    this.touchData = { initialTime: new Date().getTime(), x:evt.touches[0].pageX, y:evt.touches[0].pageY, initialEvent: evt, item: item, count: 1 };
                }
                else {
                    this.touchData = null;
                }
            };
        },

        _onTouchMove: function (evt) {
            if (this.touchData) {
                var dx = Math.abs(evt.touches[0].pageX - this.touchData.x);
                if (dx > 5) {
                    this.touchData = null;
                    return;
                };
                
                var dy = Math.abs(evt.touches[0].pageY - this.touchData.y);
                if (dy > 5) {
                    this.touchData = null;
                    return;
                };
            };
        },

        _onTouchEnd: function (evt) {
            if (this.touchData) {
                event.stop(evt);
                if (this.touchData.count == 1) {
                    this.updateSelection(this.touchData.item.domNode, this.touchData.initialEvent);
                    this.onItemClick(this.touchData.item);
                }
                else if (this.touchData.count == 2) {
                    this.onItemDoubleClick(this.touchData.item);
                    this.touchData = null;
                }
                else {
                    this.touchData = null;
                };
            };
        },

        

        //_onTouchStart: function (evt) {
        //    this.touchData = evt;
        //    this.touchCount += 1;
        //    if (!this.touchEvents || this.touchEvents.length == 0) {
        //        this.touchEvents = [
        //            on(this.domNode, 'touchmove', lang.hitch(this, this._onTouchMove)),
        //            on(this.domNode, 'touchend', lang.hitch(this, this._onTouchEnd)),
        //            on(this.domNode, 'touchcancel', lang.hitch(this, this._onTouchCancel))
        //        ];

        //        // With the pinch-zoom gesture enabled, two fingered scrolling in tree view elements is next to impossible because the initial tap is
        //        // incorrectly interpreted as a scaling gesture.  So, when a touch on this element starts, we temporarily disable the pinch-zoom gesture
        //        // at the document level and then re-enable it once the touch tracking ends.
        //        if (core.settings.features.touchPad) {
        //            var viewportNode = query('meta[name=viewport]');

        //            if (viewportNode && viewportNode.length > 0) {
        //                viewportNode = viewportNode[0];
        //                var viewportContent = domAttr.get(viewportNode, 'content');
        //                var minimumScale = new RegExp('minimum-scale=([0-9.]+)(\\,\\s*){0,1}', 'i');
        //                var maximumScale = new RegExp('maximum-scale=([0-9.]+)(\\,\\s*){0,1}', 'i');

        //                this.oldMinimumScale = minimumScale.test(viewportContent) ? minimumScale.exec(viewportContent)[1] : null;
        //                this.oldMaximumScale = maximumScale.test(viewportContent) ? maximumScale.exec(viewportContent)[1] : null;

        //                viewportContent = viewportContent.replace(minimumScale, '').replace(maximumScale, '') + ', minimum-scale=1.0, maximum-scale=1.0';

        //                domAttr.set(viewportNode, 'content', viewportContent);
        //            }
        //        }
        //    };
        //    this.touchTimer = setTimeout(lang.hitch(this, this._onTouchTimeout), 333);
        //    //evt.preventDefault();
        //},

        //_onTouchMove: function (evt) {
        //    //evt.preventDefault();
        //    this.cancelTouchTracking();
        //},

        //_onTouchEnd: function (evt) {
        //    event.stop(evt);
        //    //this._onTouchCancel();
        //},

        //_onTouchCancel: function (evt) {
        //},

        //cancelTouchTracking: function () {
        //    if (this.touchTimer) {
        //        clearTimeout(this.touchTimer);
        //    };
        //    if (this.touchEvents) {
        //    	array.forEach(this.touchEvents, core.disconnect);
        //    };
        //    this.touchData = null;
        //    this.touchEvents = [];
        //    this.touchCount = 0;

        //    if (core.settings.features.touchPad) {
        //        var viewportNode = query('meta[name=viewport]');

        //        if (viewportNode && viewportNode.length > 0) {
        //            viewportNode = viewportNode[0];
        //            var viewportContent = domAttr.get(viewportNode, 'content');
        //            var minimumScale = new RegExp('minimum-scale=1\\.0(\\,\\s*){0,1}', 'i');
        //            var maximumScale = new RegExp('maximum-scale=1\\.0(\\,\\s*){0,1}', 'i');
        //            var trailingComma = new RegExp('\\,\\s*$', 'i');

        //            viewportContent = viewportContent.replace(minimumScale, '').replace(maximumScale, '').replace(trailingComma, '');

        //            if (this.oldMinimumScale) {
        //                viewportContent += ", minimum-scale=" + this.oldMinimumScale;
        //                this.oldMinimumScale = null;
        //            }

        //            if (this.oldMaximumScale) {
        //                viewportContent += ", maximum-scale=" + this.oldMaximumScale;
        //                this.oldMaximumScale = null;
        //            }

        //            domAttr.set(viewportNode, 'content', viewportContent);
        //        }
        //    }
        //},

        //_onTouchTimeout: function () {
        //    var evt = this.touchData;
        //    var count = this.touchCount;
        //    this.cancelTouchTracking();

        //    if (evt && count > 0) {
        //        if (count == 1) {
        //            this._onClick(evt);
        //        }
        //        else {
        //            this._onDoubleClick(evt);
        //        }
        //    };
        //},

        moveUp: function (listItem) {
            listItem = listItem || this.getSelectedItem();
            if (!listItem) {
                return;
            };
            var i = this.getItemIndex(listItem.data.id);
            if (i > 0) {
                var prev = this.getChildren()[i - 1];;
                if (prev) {
                    listItem.placeAt(prev.domNode, 'before');
                }
            };
        },

        moveDown: function (listItem) {
            listItem = listItem || this.getSelectedItem();
            if (!listItem) {
                return;
            };
            var i = this.getItemIndex(listItem.data.id);
            var list = this.getChildren();
            if (i < list.length - 1) {
                var nextItem = list[i + 1];
                listItem.placeAt(nextItem.domNode, 'after');
            };
        },

        removeSelected: function () {
            var listItem = this.getSelectedItem();
            if (listItem) {
                this.removeChild(listItem)
            };
        }

    })
});
