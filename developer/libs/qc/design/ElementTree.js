define([
    "dijit/registry",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/query",
	"qc/StringUtil",
    "qc/TreeNode",
    "qc/TreeView"
], function (registry, declare, domClass, query, StringUtil, TreeNode, TreeView) {
    return declare("qc.design.ElementTree", [TreeView], {
        editor: null,
    
            startup: function () {
                if (!this._started) {
                    domClass.add(this.domNode, 'qcElementTree');
                    this.inherited(arguments);
                };
            },
    
            attach: function (editor) {
                this.clear();
                this.editor = editor;
                this.addItem(this.editor.note);
            },
    
            detach: function () {
                this.editor = null;
                this.clear();
            },
    
            nodeFromItem: function (item) {
                if (!item) {
                    return null;
                }
    
                item.text = this.getElementLabel(item);
    
                var lazyLoading = item.containerNode ? query('>.noteElement', item.containerNode).length > 0 : false;
    
                return new TreeNode({
                    label: item.text,
                    icon: '',
                    lazyLoading: lazyLoading,
                    reserveIconSpace: false,
                    data: item
                });
            },
    
            resolveChildren: function (node) {
                if (!(node && node.data)) {
                    return [];
                };
    
                var c = node.data.containerNode || node.data.domNode;
                return c ? query('>.noteElement', c).map(registry.byNode) : null;
            },
    
            getElementLabel: function (element) {
                return (element.get('text') || StringUtil.toCamelUpper(element.partType) || element.elementName || 'Element').substr(0, 30);
    //            var text = element.get('text');
    //            if (element.partType) {
    //                return element.partType + (text ? ':' + text : '');
    //            }
    //            else {
    //                return element.id + (text ? ' (' + text + ')' : '');
    //            }
            },
    
            expandToElement: function (element) {
                this.clear();
                this.domNode.scrollTop = 0;
    
                var path = this.getDomPath(element);
                if (path.length == 0) {
                    return;
                };
    
                var current = this.addItem(path[0]);
                var childNode = null;
                var nextChild = null;
                for (var n = 1; n < path.length; n++) {
                    var children = this.resolveChildren(current);
                    nextChild = null;
                    for (var c = 0; c < children.length; c++) {
                        childNode = current.addItem(children[c]);
                        if (childNode.data.id == path[n].id) {
                            nextChild = childNode;
                        }
                    };
                    if (current) {
                        current.expand();
                        current = nextChild;
                    };
                };
                if (current) {
                    this.select(current);
                };
            },
    
            getDomPath: function (element) {
                var path = [];
                path.push(element);
                var parent = element.domNode.parentNode;
                while (parent && parent.nodeType == 1) {
                    if (domClass.contains(parent, 'noteElement')) {
                        path.push(registry.byNode(parent))
                    };
                    parent = parent.parentNode;
                };
                path.reverse();
                return path;
            }
        }
    );
});