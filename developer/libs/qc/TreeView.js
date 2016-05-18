define([
    "qc/TreeNode",
    "dijit/_Container",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/InlineEditBox",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
	"dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
	"dojo/keys",
    "dojo/on",
    "dojo/query",
    "dojo/text!qc/templates/TreeView.htm",
    "qc/_core"
], function (TreeNode, _Container, _TemplatedMixin, _WidgetBase, InlineEditBox, registry, array, declare, event, lang, domAttr, domClass, domConstruct, domGeometry, keys, on, query, TreeViewTemplate, core) {
    return declare("qc.TreeView", [_WidgetBase, _TemplatedMixin], {
        selectedNode: null,
            allowLabelEdit: false,
            expandOnClick: false,
            expandOnDoubleClick: true,
            inLabelEdit: false,
            hideRoot: false,
            templateString: TreeViewTemplate,
            events: [],
            keyMap: [],
            scrollViewPort: false,
    
            startup: function () {
                if (!this._started) {
                    if (core.settings.features.touchPad) {
                        this.events = [
                            on(this.domNode, "touchstart", lang.hitch(this, this._onTouchStart))
                        ];
                        this.touchCount = 0;
                        this.expandOnClick = true;
                        this.expandOnDoubleClick = false;
                    }
                    else {
                        this.events = [
                            on(this.domNode, "keydown", lang.hitch(this, this._onKeyPress)),
                            on(this.domNode, "click", lang.hitch(this, this._onClick)),
                            on(this.domNode, "dblclick", lang.hitch(this, this._onDoubleClick))
                        ];
                    };
    
                    this.keyMap = []
                    this.keyMap[keys.F2] = this.startLabelEdit;
                    this.inherited(arguments);
                };
            },
    
            addChild: function (child) {
                child.placeAt(this.containerNode);
                child.tree = this;
                child.startup();
                if (this.hideRoot) {
                    domClass.add(child.headerNode, "hiddenRoot");
                    domClass.add(child.contentNode, "hiddenRoot");
                };
                return child;
            },
    
            addItem: function (item) {
                return this.addChild(this.nodeFromItem(item));
            },
    
            nodeFromItem: function (item) {
                return new TreeNode({ label: item.text, icon: item.icon || core.getItemIcon(item), data: item });
            },
    
            resolveChildren: function (node) {
                return [];
            },
    
            clearSelection: function () {
                this.selectedNode = null;
                query(".selected", this.domNode).removeClass("selected");
                this.onSelectionChanged();
            },
    
            clear: function () {
                domConstruct.empty(this.containerNode);
            },
    
            select: function (node) {
                if (!node) {
                    return;
                };
    
                if (this.selectedNode) {
                    if (this.selectedNode == node) {
                        return;
                    }
                    else {
                        if (this.selectedNode.domNode) {
                            domClass.remove(this.selectedNode.headerNode, "selected");
                        };
                        this.selectedNode = null;
                    }
                }
                this.selectedNode = node;
                domClass.add(this.selectedNode.headerNode, "selected");
                try {
                    this.selectedNode.domNode.focus();
                }
                catch (ex) {
                };
                this.onSelectionChanged(this.selectedNode);
                return this.selectedNode;
            },
    
            selectNode: function (nodeOrPredicate) {
                if (!nodeOrPredicate) {
                    return;
                };
    
                if (typeof nodeOrPredicate == 'object' && nodeOrPredicate.isTreeNode) {
                    return this.select(nodeOrPredicate);
                }
                else if (typeof nodeOrPredicate == 'function') {
                    return this.select(this.findNode(nodeOrPredicate));
                }
                else {
                    return null;
                }
            },
    
            startLabelEdit: function () {
                if (!this.allowLabelEdit) {
                    return;
                };
    
                var nodeWidget = this.selectedNode;
                if (!nodeWidget || !nodeWidget.isTreeNode) {
                    return;
                };
    
                this.inLabelEdit = true;
                var labelNode = this.selectedNode.labelNode;
                var pos = domGeometry.position(labelNode) || { w: 100 };
                var editSpan = document.createElement('span');
                editSpan.innerHTML = labelNode.innerHTML;
                labelNode.innerHTML = "";
                labelNode.appendChild(editSpan);
                var editor = new InlineEditBox({
                    node: nodeWidget,
                    tree: this,
                    autoSave: true,
                    onCancel: function (oldValue) {
                        this.tree.inLabelEdit = false;
                        this.node.labelNode.innerHTML = this.value;
                        this.destroyRecursive();
                        this.tree.select(this.node);
                    },
                    onChange: function (newValue) {
                        this.tree.inLabelEdit = false;
                        this.node.set("label", newValue);
                        this.tree.onLabelChanged(this.node, newValue);
                        this.destroyRecursive();
                        this.tree.select(this.node);
                    },
                    width: (pos.w > 100 ? pos.w : 100) + "px"
                }, editSpan);
                editor.startup();
                editor.edit();
    
            },
    
            toggleExpansion: function (tNode) {
                var node = tNode || this.selectedNode;
                if (node) {
                    node.toggleExpansion();
                };
            },
    
            expand: function (tNode) {
                var node = tNode || this.selectedNode;
                if (node) {
                    node.expand();
                };
            },
    
            collapse: function (tNode) {
                var node = tNode || this.selectedNode;
                if (node) {
                    node.collapse();
                };
            },
    
            collapseAll: function (startNode) {
                query('.qcTreeNode', startNode ? startNode.domNode : this.domNode).map(registry.byNode).forEach(function (node) {
                    if (node.expanded) {
                        node.collapse();
                    }
                });
            },
    
            expandToNode: function (node) {
                var parent = node.parentNode;
                while (parent && parent.isTreeNode) {
                    parent.expand();
                    parent = parent.parentNode;
                };
            },
    
            showNode: function (node) {
                if (!node) {
                    return;
                };
    
                var scrollNode = this.scrollViewPort ? this.viewPort : this.domNode;
                scrollNode.scrollTop = 0;
                this.expandToNode(node);
    
                var posData = domGeometry.position(this.containerNode);
                var posNode = domGeometry.position(node.domNode);
    
                var dy = (posNode.y - posData.y - 24);
    
                scrollNode.scrollTop = dy;
    
            },
    
            getTreeNode: function (domNode) {
                return domNode ? registry.byNode(domNode) : null;
            },
    
            getParentNode: function (tNode) {
                return tNode ? tNode.parentNode : null;
            },
    
            getFirstChild: function (tNode) {
                return tNode ? tNode.getChildren()[0] || null : null;
            },
    
            getPath: function (targetNode) {
                var path = [];
                targetNode = targetNode || this.selectedNode || null;
                while (targetNode) {
                    path.push(targetNode);
                    targetNode = targetNode.parentNode;
                };
                path.reverse();
                return path;
            },
    
            getNextSibling: function (tNode) {
                if (tNode && tNode.domNode && tNode.domNode.nextElementSibling) {
                    return registry.byNode(tNode.domNode.nextElementSibling);
                }
                else {
                    return null;
                };
            },
    
            getPreviousSibling: function (tNode) {
                if (tNode && tNode.domNode && tNode.domNode.previousElementSibling) {
                    return registry.byNode(tNode.domNode.previousElementSibling);
                }
                else {
                    return null;
                };
            },
    
            findNodes: function (predicate) {
                return query('.qcTreeNode', this.domNode).map(registry.byNode).filter(predicate);
            },
    
            findNode: function (predicate) {
                return this.findNodes(predicate)[0] || null;
            },
    
            getSelectedItem: function () {
                return this.selectedNode ? this.selectedNode.data : null;
            },
    
            _onClick: function (evt) {
                var tNode = registry.getEnclosingWidget(evt.target);
                if (!tNode) {
                    return;
                };
    
                //            if (tNode.isTreeNode) {
                //                event.stop(evt);
                //                this.select(tNode);
                //                tNode.toggleExpansion();
                //                this.onNodeClick(tNode, evt);
                //            }
                //            else {
                //                this.clearSelection();
                //            };
    
    
                event.stop(evt);
    
                if (tNode.isTreeNode) {
                    if (domClass.contains(evt.target, "expander")) {
                        tNode.toggleExpansion();
                    }
                    else {
                        this.select(tNode);
                        if (this.expandOnClick) {
                            tNode.toggleExpansion();
                        };
                        this.onNodeClick(tNode, evt);
                    }
                }
                else {
                    this.clearSelection();
                };
            },
    
            _onDoubleClick: function (evt) {
                var tNode = registry.getEnclosingWidget(evt.target);
                if (tNode && tNode.isTreeNode) {
                    if (this.expandOnDoubleClick) {
                        tNode.toggleExpansion();
                    }
                    this.onNodeDoubleClick(tNode, evt);
                };
            },
    
            _onKeyPress: function (evt) {
                if (this.inLabelEdit) {
                    return;
                };
    
                var fn = this.keyMap[evt.keyCode];
                if (core.isFunction(fn)) {
                    event.stop(evt);
                    fn.call(this);
                };
            },
    
            onNodeClick: function (node, evt) {
            },
    
            onNodeDoubleClick: function (node, evt) {
            },
    
            onLabelChanged: function (tNode, newValue) {
            },
    
            onSelectionChanged: function (selectedNode) {
            },
    
            // ========= touch event handling =============
    
            _onTouchStart: function (evt) {
                this.touchData = evt;
                this.touchCount += 1;

                if (!this.touchEvents || this.touchEvents.length == 0) {
                    this.touchEvents = [
                        on(this.domNode, "touchmove", lang.hitch(this, this._onTouchMove)),
                        on(this.domNode, "touchend", lang.hitch(this, this._onTouchEnd)),
                        on(this.domNode, "touchcancel", lang.hitch(this, this._onTouchCancel))
                    ];

                	// With the pinch-zoom gesture enabled, two fingered scrolling in tree view elements is next to impossible because the initial tap is
                	// incorrectly interpreted as a scaling gesture.  So, when a touch on this element starts, we temporarily disable the pinch-zoom gesture
					// at the document level and then re-enable it once the touch tracking ends.
                    if (core.settings.features.touchPad) {
	                    var viewportNode = query('meta[name=viewport]');

	                    if (viewportNode && viewportNode.length > 0) {
	                    	viewportNode = viewportNode[0];
	                    	var viewportContent = domAttr.get(viewportNode, 'content');
		                    var minimumScale = new RegExp('minimum-scale=([0-9.]+)(\\,\\s*){0,1}', 'i');
		                    var maximumScale = new RegExp('maximum-scale=([0-9.]+)(\\,\\s*){0,1}', 'i');

		                    this.oldMinimumScale = minimumScale.test(viewportContent) ? minimumScale.exec(viewportContent)[1] : null;
		                    this.oldMaximumScale = maximumScale.test(viewportContent) ? maximumScale.exec(viewportContent)[1] : null;

		                    viewportContent = viewportContent.replace(minimumScale, '').replace(maximumScale, '') + ', minimum-scale=1.0, maximum-scale=1.0';

		                    domAttr.set(viewportNode, 'content', viewportContent);
	                    }
                    }
                };
                this.touchTimer = setTimeout(lang.hitch(this, this._onTouchTimeout), 333);
            },
    
            _onTouchMove: function (evt) {
                this.cancelTouchTracking();
            },
    
            _onTouchEnd: function (evt) {
                event.stop(evt);
            },
    
            _onTouchCancel: function (evt) {
            },
    
            cancelTouchTracking: function () {
                if (this.touchTimer) {
                    clearTimeout(this.touchTimer);
                };
                if (this.touchEvents) {
                    array.forEach(this.touchEvents, core.disconnect);
                };
                this.touchData = null;
                this.touchEvents = [];
                this.touchCount = 0;

                if (core.settings.features.touchPad) {
                	var viewportNode = query('meta[name=viewport]');

                	if (viewportNode && viewportNode.length > 0) {
                		viewportNode = viewportNode[0];
                		var viewportContent = domAttr.get(viewportNode, 'content');
                		var minimumScale = new RegExp('minimum-scale=1\\.0(\\,\\s*){0,1}', 'i');
                		var maximumScale = new RegExp('maximum-scale=1\\.0(\\,\\s*){0,1}', 'i');
	                    var trailingComma = new RegExp('\\,\\s*$', 'i');

	                    viewportContent = viewportContent.replace(minimumScale, '').replace(maximumScale, '').replace(trailingComma, '');

						if (this.oldMinimumScale) {
							viewportContent += ", minimum-scale=" + this.oldMinimumScale;
							this.oldMinimumScale = null;
						}

						if (this.oldMaximumScale) {
							viewportContent += ", maximum-scale=" + this.oldMaximumScale;
							this.oldMaximumScale = null;
						}

                		domAttr.set(viewportNode, 'content', viewportContent);
                	}
                }
            },
    
            _onTouchTimeout: function () {
                var evt = this.touchData;
                var count = this.touchCount;
                this.cancelTouchTracking();
    
                if (evt && count > 0) {
                    if (count == 1) {
                        this._onClick(evt);
                    }
                    else {
                        this._onDoubleClick(evt);
                    }
                };
            },
    
            getDropAction: function (source, evt) {
                return null;
            },
    
            doDrop: function (source, evt, treeNode) {
                return null;
            }
        }
    );
});