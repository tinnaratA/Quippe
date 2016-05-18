define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/when",
    "qc/_core",
    "qc/TreeNode",
    "qc/TreeView"
], function (array, declare, when, core, TreeNode, TreeView) {
    return declare("qc.ContentLibraryTree", [TreeView], {
        allowLabelEdit: false,
            expandOnDoubleClick: true,
            inLabelEdit: false,
            hideRoot: false,
            attributeFilter: -1,
            typeFilter: [],
            initialized: false,
    
            startup: function () {
                if (!this.started) {
                    this.initTree();
                    this.inherited(arguments);
                }
            },
    
            initTree: function () {
                this.initialized = true;
                if (!this.rootNode) {
                    this.rootNode = this.addItem({ text: core.getI18n("contentlibrary"), id: "", type: "folder", icon: "folder", subs: "+" });
                }
                return this.rootNode.expand();
            },
    
            _getAttributeFilterAttr: function() {
                return this.attributeFilter;
            },

            _setAttributeFilterAttr: function(value) {
                this.attributeFilter = value;
            },

            _getTypeFilterAttr: function () {
                return this.typeFilter || [];
            },
            _setTypeFilterAttr: function (value) {
                var list = core.forceArray(value);
                if (list.length > 0) {
                    if (array.indexOf(list, 'folder') < 0) {
                        list.push('folder');
                    };
                };
                this.typeFilter = list;
            },
    
            resolveChildren: function (tNode) {
                if (!(tNode && tNode.data)) {
                    return [];
                };
    
                var typeFilter = this.typeFilter || null;
    
                return core.xhrGet({
                    url: core.serviceURL("Quippe/ContentLibrary/List"),
                    content: { ParentId: tNode.data.id, Attributes: this.attributeFilter, DataFormat: "JSON" },
                    preventCache: true,
                    handleAs: "json",
                    error: function (message) {
                        core.showError(message);
                        return [];
                    },
                    load: function (data, ioArgs) {
                        if (data.error) {
                            core.showError(data.error.message);
                            return [];
                        }
    
                        var list = core.forceArray(data.items);
    
                        if (typeFilter && typeFilter.length > 0) {
                            list = array.filter(list, function (item) {
                                return (array.indexOf(typeFilter, item.type) >= 0);
                            });
                        };
    
                        return list;
                    }
                });
            },
    
            nodeFromItem: function (item) {
                if (!item.text) {
                    item.text = item.name;
                };
                var node = new TreeNode({
                    label: item.text,
                    icon: item.icon || core.getItemIcon(item, true),
                    lazyLoading: item.subs ? true : false,
                    reserveIconSpace: false,
                    data: item
                });
                return node;
            },
    
            getCurrentFolder: function () {
                var node = this.selectedNode || null;
                while (node && node.isTreeNode && node.data.type != 'folder') {
                    node = node.parentNode;
                }
                return node;
            },
    
            getLocation: function () {
                var node = this.selectedNode;
                var path = [];
                while (node && node.isTreeNode) {
                    if (node.data.type == 'folder') {
                        path.push(node.labelNode.innerHTML);
                    }
                    node = node.parentNode;
                };
                if (path.length > 1) {
                    path[path.length - 1] = '';
                }
                return path.reverse().join("/");
            },
    
            selectPath: function (path, parentNode) {
                parentNode = parentNode || this.rootNode || null;
                if (!parentNode) {
                    return;
                };
    
                if (!path) {
                    this.select(parentNode);
                    return parentNode;
                };
    
                var parts = path.split('/');
                var part = parts.shift();
                var self = this
                when(parentNode.expand(), function () {
                    array.forEach(parentNode.getChildren(), function (child) {
                        if (child.data.text == part) {
                            self.select(child);
                            if (parts.length > 0) {
                                return self.selectPath(parts.join('/'), child);
                            };
                        };
                    });
                });
    
            }
    
    
        }
    );
});