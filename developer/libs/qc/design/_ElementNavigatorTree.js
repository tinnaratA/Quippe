define([
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-class",
    "qc/_core",
    "qc/TreeNode",
    "qc/TreeView"
], function (registry, array, declare, domClass, core, TreeNode, TreeView) {
    return declare("qc.design._ElementNavigatorTree", [TreeView], {
        elementClass: 'noteElement',
        editor: null,

        _getSelectedObjectAttr: function () {
            var node = this.getSelectedNode();
            return node && node.data ? node.data : null;
        },
        _setSelectedObjectAttr: function (value) {
            this.buildTree(value);
        },
    
        buildTree: function(item) {
            this.clear();

            if (!item || !this.editor || !this.editor.note) {
                return;
            };
            
            var path = [item];
            var parent = item.getDesignerParent(item);
            while (parent) {
                path.push(parent);
                parent = parent.getDesignerParent(parent);
            };

            var dNode = path.pop();
            var tNode = this.addItem(dNode);
            tNode.expand();

            var tChild = null;
            while (path.length > 0) {
                tNode.expand();
                dNode = path.pop();
                tChild = tNode.findChild(function (x) { return x.data.id == dNode.id });
                if (tChild) {
                    tNode = tChild;
                    tNode.expand();
                }
            };
            
            this.showNode(tNode);
            this.select(tNode);
        },

        resolveChildren: function (node) {
            return node && node.data ? node.data.getDesignableChildren(node.data) : [];
        },

        nodeFromItem: function (item) {
            if (!item) {
                return null;
            }

            return new TreeNode({
                label: this.getLabel(item),
                icon: '',
                lazyLoading: true,
                reserveIconSpace: false,
                data: item
            });
        },

        getLabel: function (item) {
            return item ? item.name || item.toString() : 'Element';
        }       
    });
});