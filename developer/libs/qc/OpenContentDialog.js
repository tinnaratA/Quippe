define([
    "qc/ContentLibraryTree",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/text!qc/templates/OpenContentDialog.htm",
    "dojo/dom-style",
    "dojo/request",
    "dojo/topic",
    "dojo/when",
    "dojo/window",
    "qc/_core",
    "qc/Dialog",
    "qc/LibraryManagerSearchResultList",
    "qc/ResizableDialogMixin",
    "qc/SearchBox"
], function (ContentLibraryTree, _WidgetsInTemplateMixin, Button, BorderContainer, ContentPane, array, declare, lang, aspect, OpenContentDialogTemplate, domStyle, request, topic, when, win, core, Dialog, LibraryManagerSearchResultList, ResizableDialogMixin, SearchBox) {
    return declare("qc.OpenContentDialog", [Dialog, _WidgetsInTemplateMixin, ResizableDialogMixin], {
        title: 'Open',
        templateString: OpenContentDialogTemplate,
        searchResultList: new LibraryManagerSearchResultList(),
        searchResultsClickTimer: null,
        treeView: null,

        startup: function() {
            if (!this._started) {

                this.inherited(arguments);

                this.resizer.minWidth = 360;
                this.resizer.minHeight = 320;

                this.events = [
                    aspect.after(this.searchResultList, "onItemClick", lang.hitch(this, this.onSearchItemClicked), true)
                ];

                this.subscriptions = [
                    topic.subscribe('/qc/ContentLibrary/Changed', lang.hitch(this, this.onLibraryChanged))
                ];
            }
        },

        destroyRecursive: function () {
            if (this.searchResultsClickTimer) {
                clearTimeout(this.searchResultsClickTimer);
                this.searchResultsClickTimer = null;
            };

            if (this.events) {
                this.events.forEach(function(x) {x.remove()});
                this.events = null;
            };

            if (this.subscriptions) {
                this.subscriptions.forEach(function(x) {x.remove()});
                this.subscriptions = null;
            };

            this.inherited(arguments);
        },

        onLibraryChanged: function() {
            this.treeView.clear();
            this.treeView.rootNode = null;
            this.treeView.initTree();
        },

        typeFilter: [],
    
        _getTypeFilter: function () {
            return this.treeView.get('typeFilter');
        },
        _setTypeFilterAttr: function (value) {
            value = value || [];
            this.treeView.set('typeFilter', value);
            this.searchResultList.typeFilter = value;
        },
    
        _getAttributeFilterAttr: function () {
            return this.treeView.get('attributeFilter');
        },
        _setAttributeFilterAttr: function (value) {
            this.treeView.set('attributeFilter', value);
            this.searchResultList.attributeFilter = value;
        },
    
        onTreeSelectionChanged: function () {
            this.checkState();
        },

        onTreeNodeDoubleClick: function() {
            var item = this.get('item');
            if (item && item.type != 'folder') {
                this.onOKClick();
            };
        },
    
        _getPathAttr: function () {
            return this.treeView ? this.treeView.getLocation() : '';
        },
    
        _getItemAttr: function () {
            var doubleClickedSearchItem = this._doubleClickedSearchItem;
            this._doubleClickedSearchItem = null;

            return doubleClickedSearchItem || (this.treeView ? this.treeView.getSelectedItem() : null);
        },

        _getSelectedItemIdAttr: function() {
            var item = this.get('item');
            return item ? item.id : '';
        },
        _setSelectedItemIdAttr: function (value) {
            if (value) {
                this.onSearchItemClicked({ data: { id: value, parentId: 'UNKNOWN' } });
            }
        },

        _getValueAttr: function () {
            return this.get('selectedItemId');
        },
    
        checkState: function () {
            var item = this.get('item');
            if (item && item.type != 'folder') {
                this.cmdOK.set('disabled', false);
            }
            else {
                this.cmdOK.set('disabled', true);
            };
        },

        onResizerUpdate: function (width, height) {
            domStyle.set(this.containerNode, "width", width + "px");
            domStyle.set(this.containerNode, "height", height + "px");

            this.mainPanel.resize({
                w: width,
                h: height - 28
            });
        },

        onSearchItemDoubleClicked: function (item) {
            if (item.data.type != 'folder') {
                this._doubleClickedSearchItem = item.data;
                this.onOKClick();
            }
        },

        onSearchItemClicked: function (item) {
            if (this.searchResultsClickTimer && item.data.type != 'folder') {
                clearTimeout(this.searchResultsClickTimer);
                this.searchResultsClickTimer = null;
                this._doubleClickedSearchItem = item.data;
                this.onOKClick();
            }

            else if (!this.searchResultsClickTimer) {
                this.searchResultsClickTimer = setTimeout(lang.hitch(this, function () {
                    this.searchResultsClickTimer = null;

                    var itemNode = this.treeView.findNode(function(x) {
                        return x.data.id == item.data.id;
                    });

                    var highlightNode = lang.hitch(this, function(nodeToHighlight) {
                        nodeToHighlight.expand();

                        var parent = nodeToHighlight.parentNode;

                        while (parent) {
                            parent.expand();
                            parent = parent.parentNode;
                        }

                        this.treeView.select(nodeToHighlight);
                        win.scrollIntoView(nodeToHighlight.domNode);

                        this.filterBox.closePopup();
                    });

                    var needsFullPathLookup = false;

                    if (itemNode) {
                        highlightNode(itemNode);
                    }

                    else {
                        itemNode = this.treeView.findNode(lang.hitch(this, function(x) {
                            return x.data.id == item.data.parentId;
                        }));

                        if (itemNode) {
                            when(itemNode.expand(), lang.hitch(this, function() {
                                itemNode = this.treeView.findNode(lang.hitch(this, function(x) {
                                    return x.data.id == item.data.id;
                                }));

                                highlightNode(itemNode);
                            }));
                        }

                        else {
                            needsFullPathLookup = true;
                        }
                    }

                    if (needsFullPathLookup) {
                        request(core.serviceURL('Quippe/ContentLibrary/Info?DataFormat=JSON'), {
                            query: { id: item.data.id, IncludeAncestorIds: true },
                            handleAs: 'json',
                            method: 'GET'
                        }).then(lang.hitch(this, function(data) {
                            if (data.error) {
                                core.showError(data.error.message);
                            }

                            var expandNodes = null;

                            for (var i = data.item.ancestors.length - 1; i >= 0; i--) {
                                itemNode = this.treeView.findNode(lang.hitch(this, function(x) {
                                    return x.data.id == data.item.ancestors[i].id;
                                }));

                                if (itemNode) {
                                    expandNodes = data.item.ancestors.slice(i + 1);
                                    break;
                                }
                            }

                            var createCallback = lang.hitch(this, function(childNodes) {
                                return lang.hitch(this, function() {
                                    if (childNodes.length == 0) {
                                        itemNode = this.treeView.findNode(lang.hitch(this, function(x) {
                                            return x.data.id == item.data.id;
                                        }));

                                        highlightNode(itemNode);
                                        return null;
                                    }

                                    else {
                                        itemNode = this.treeView.findNode(lang.hitch(this, function(x) {
                                            return x.data.id == childNodes[0].id;
                                        }));

                                        return itemNode.expand().then(createCallback(childNodes.slice(1)));
                                    }
                                });
                            });

                            return itemNode.expand().then(createCallback(expandNodes));
                        }), function(err) {
                            core.showError(err);
                        });
                    }
                }), 200);
            }
        }
    });
});