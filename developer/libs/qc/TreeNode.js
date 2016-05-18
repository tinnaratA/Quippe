define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/text!qc/templates/TreeNode.htm",
    "dojo/when",
    "qc/_core"
], function (_TemplatedMixin, _WidgetBase, registry, array, declare, domClass, domConstruct, query, TreeNodeTemplate, when, core) {
    return declare("qc.TreeNode", [_WidgetBase, _TemplatedMixin], {
        isTreeNode: true,
        label: 'TreeNode',
        icon: null,
        lazyLoading: false,
        expanded: false,
        data: null,
        parentNode: null,
        childCount: 0,
        tree: null,
        reserveIconSpace: true,
    
        templateString: TreeNodeTemplate,
    
        startup: function () {
            if (!this._started) {
                if (this.icon) {
                    domClass.add(this.iconNode, this.icon);
                }
                else if (!this.reserveIconSpace) {
                    domClass.add(this.iconNode, 'noIcon');
                }
    
                domClass.add(this.expanderNode, this.lazyLoading ? 'collapsed' : 'leaf');
    
                this.labelNode.innerHTML = this.label;
                this.expanded = false;
                this.childCount = 0;
                core.setSelectable(this.domNode, false);
    
                this.inherited(arguments);
            }
        },
    
        _getLabelAttr: function () {
            return this.labelNode.innerHTML;
        },
        _setLabelAttr: function (value) {
            this.labelNode.innerHTML = value;
        },
    
        _getExpandedAttr: function () {
            return this.expanded;
        },
        _setExpandedAttr: function (value) {
            if (value) {
                this.expand();
            }
            else {
                this.collapse();
            };
        },
    
        createPlaceholder: function () {
            this.placeHolder = new this.constructor({ label: 'Loading...', lazyLoading: false, reserveIconSpace: false });
            domClass.add(this.placeHolder.labelNode, "placeHolder");
            this.addChild(this.placeHolder);
        },
    
        addChild: function (child) {
            return this.insertChild(child);
            //            child.parentNode = this;
            //            child.tree = this.tree;
            //            child.placeAt(this.contentNode);
            //            child.startup();
            //            this.childCount += 1;
            //            if (this.childCount == 1) {
            //                domClass.remove(this.expanderNode, 'leaf');
            //                this.expanded ? this.expand() : this.collapse();
            //            }
            //            return child;
        },
    
        insertChild: function (child, position, relativeNode) {
            var domNode = relativeNode ? relativeNode.domNode : this.contentNode;
            position = position || 'last';
    
            child.parentNode = this;
            child.tree = this.tree;
            child.placeAt(domNode, position);
            child.startup();
            this.childCount += 1;
            if (this.childCount == 1) {
                domClass.remove(this.expanderNode, 'leaf');
                this.expanded ? this.expand() : this.collapse();
            }
            return child;
        },
    
        removeChild: function (child) {
            if (!child) {
                return;
            }
    
            child.destroyRecursive();
            this.childCount -= 1;
            if (this.childCount <= 0) {
                this.childCount = 0;
                this.collapse();
                domClass.remove(this.expanderNode, "collapsed");
                domClass.add(this.expanderNode, "leaf");
            }
    
        },
    
        getChildren: function () {
            //return registry.findWidgets(this.contentNode);
            return query("> .qcTreeNode", this.contentNode).map(registry.byNode);
        },
    
        hasChildren: function () {
            return (this.childCount > 0);
        },
    
        addItem: function (item) {
            return this.addChild(this.nodeFromItem(item));
        },
    
        expand: function () {
            if (this.childCount > 0) {
                domClass.remove(this.expanderNode, "collapsed");
                domClass.remove(this.contentNode, "collapsed");
                domClass.add(this.expanderNode, "expanded");
                domClass.add(this.contentNode, "expanded");
                this.expanded = true;
                return true;
            }
            else if (this.lazyLoading && !domClass.contains(this.expanderNode, "loading")) {
                domClass.remove(this.expanderNode, "collapsed");
                domClass.add(this.expanderNode, "loading");
                var self = this;
                return when(this.resolveChildren(), function (items) {
	                if (self.expanderNode) {
		                self.lazyLoading = false;
		                domClass.remove(self.expanderNode, "loading");
		                if (items && items.length > 0) {
			                for (var n = 0, len = items.length; n < len; n++) {
				                self.addItem(items[n]);
			                }
			                return self.expand();
		                } else {
			                domClass.add(self.expanderNode, "leaf");
			                return true;
		                }
	                }

	                return true;
                });
            }
            else {
                domClass.add(this.expanderNode, "leaf");
                return true;
            }
        },
    
        loadItems: function (items) {
            domConstruct.empty(this.contentNode);
            var count = 0;
            var self = this;
            array.forEach(items, function (item) {
                self.addItem(item);
                count += 1;
            });
            this.childCount = count;
            if (count == 0) {
                domClass.add(this.expanderNode, "leaf");
            };
        },
    
        invalidate: function () {
            this.collapse();
            domConstruct.empty(this.contentNode);
            this.lazyLoading = true;
            this.childCount = 0;
        },
    
        collapse: function () {
            if (this.childCount > 0) {
                domClass.remove(this.expanderNode, "expanded");
                domClass.remove(this.contentNode, "expanded");
                domClass.add(this.expanderNode, "collapsed");
                domClass.add(this.contentNode, "collapsed");
                this.expanded = false;
            };
        },
    
        toggleExpansion: function () {
            return this.expanded ? this.collapse() : this.expand();
        },
    
        resolveChildren: function () {
            if (this.tree) {
                return this.tree.resolveChildren(this);
            }
            else {
                return [];
            }
        },
    
        nodeFromItem: function (item) {
            if (this.tree) {
                return this.tree.nodeFromItem(item);
            }
            else {
                return new this.constructor({ label: item.text, icon: item.icon || core.getItemIcon(item), data: item });
            }
        },
    
        notify: function (node, eventName, evt) {
            if (this.tree) {
                var fName = "onNode" + eventName;
                if (core.isFunction(this.tree[fName])) {
                    return this.tree[fName](node, evt);
                }
            }
            else if (this.parentNode) {
                return this.parentNode.notify(this, eventName, evt);
            };
        },
    
        getItem: function (node) {
            var item = this.data || this;
            item.sourceOwner = this.owner;
            return item;
        },
    
        getDropAction: function (source, evt) {
            return this.tree ? this.tree.getDropAction(source, evt, this) : null;
        },
    
        doDrop: function (source, evt, treeNode) {
            return this.tree ? this.tree.doDrop(source, evt, this) : null;
        },
    
        findChild: function (predicate) {
            var children = this.getChildren();
            for (var n = 0, len = children.length; n < len; n++) {
                if (predicate(children[n])) {
                    return children[n];
                };
            };
            return null;
        }
    });
});