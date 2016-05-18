define([
    "qc/TreeNode",
    "qc/TreeView",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-geometry",
    "dojo/when",
    "qc/_core"
], function (TreeNode, TreeView, array, declare, domGeometry, when, core) {
    return declare("qc.MedcinTree", [TreeView], {
        root: null,
        hideRoot: true,
        includeFullText: false,
        searchVersion: 1,
    
        _getRootAttr: function () {
            return this.root;
        },
        _setRootAttr: function (item) {
            if (item == null || item == undefined) {
                return;
            };
    
            if (typeof item == 'number') {
                if (item === 0) {
                    return this.browse();
                }
                else {
                    var self = this;
                    return when(this.resolveTerm(item), function (term) {
                        return self.setRoot(term);
                    });
                }
            }
            else {
                return this.setRoot(item);
            };
    
    
        },
    
        convertTerm: function (term) {
            return {
                medcinId: term.m,
                nodeKey: term.n,
                termType: core.TermTypeInfo.fromNodeKey(term.n).termType,
                subs: term.s,
                text: term.t,
                fullText: term.fullText || term.t
            };
        },
    
        browse: function () {
            this.clear();
            var root = this.setRoot({ medcinId: 0, text: 'Medcin', subs: '+', isMedcinRoot: true });
            this.root = root;
            return when(root.expand(), function () {
                return root;
            });
        },
    
        search: function (query) {
            if (this.searchVersion > 1) {
                return this.search2(query);
            };

            if (query && query.charAt(0) == '!') {
                var medcinId = parseInt(query.substr(1), 10) || 0;
                if (medcinId) {
                    return this.expandToMedcinId(medcinId);
                };
            };
    
            var self = this;
            return core.xhrGet({
                url: core.serviceURL('Medcin/Search'),
                content: { Query: query, DataFormat: 'JSON' },
                handleAs: 'json',
                error: core.showError,
                load: function (data, ioArgs) {
                    var root = self.setRoot({ text: 'Search Results', isMedcinRoot: false });
                    array.forEach(core.forceArray(data.termList), function (term) {
                        root.addItem(term);
                    });
                    root.expand();
                    self.clearSelection();
                    return root;
                }
            });
        },
    
        search2: function (query) {
            if (query && query.charAt(0) == '!') {
                var medcinId = parseInt(query.substr(1), 10) || 0;
                if (medcinId) {
                    return this.expandToMedcinId(medcinId);
                };
            };

            var self = this;
            return core.xhrGet({
                url: core.serviceURL('Quippe/Search'),
                content: { Query: query, TermRoot: 0, SearchVersion: 2, DataFormat: 'JSON' },
                handleAs: 'json',
                error: core.showError,
                load: function (data, ioArgs) {
                    var res = data.searchResults;
                    if (res.suggestion) {
                        return self.search2(res.suggestion);
                    };
                    if (res.item) {
                        var root = self.setRoot({ text: 'Search Results', isMedcinRoot: false });
                        core.forceArray(res.item).forEach(function (item) {
                            var term = {
                                medcinId: item.id,
                                nodeKey: item.nodeKey,
                                text: item.text,
                                termType: item.termType,
                                subs: item.subs || ''
                            };
                            root.addItem(term);
                        });
                    };
                    root.expand();
                    self.clearSelection();
                    return root;
                }
            });
        },

        setRoot: function (term) {
            this.clear();
            this.root = this.addItem(term);
            return this.root;
        },
    
    
        nodeFromItem: function (item) {
            if (!item.type) {
                item.type = 'term';
            };
            return new TreeNode({
                label: item.text,
                icon: item.icon || core.getItemIcon(item, false),
                lazyLoading: item.subs ? true : false,
                reserveIconSpace: false,
                data: item
            });
        },
    
        resolveTerm: function (medcinId) {
            return core.xhrGet({
                url: core.serviceURL("Medcin/Term/" + medcinId),
                content: { DataFormat: "JSON", culture: core.settings.culture },
                handleAs: 'json',
                error: core.showError,
                load: function (data, ioArgs) {
                    return data.term || null;
                }
            });
        },
    
        resolveChildren: function (tNode) {
            if (!tNode.data) {
                return [];
            };
    
            var converter = this.convertTerm;
    
            return core.xhrGet({
                //url: core.serviceURL("Medcin/Term/" + tNode.data.medcinId + '/Subs'),
                url: core.serviceURL('Quippe/Browse/Subs'),
                content: { MedcinId: tNode.data.medcinId, DataFormat: "JSON", IncludeFullText: this.includeFullText, culture: core.settings.culture },
                handleAs: "json",
                error: core.showError,
                load: function (data, ioArgs) {
                    if (data && data.termList && data.termList.term) {
                        return array.map(core.forceArray(data.termList.term), converter);
                    }
                    else {
                        return [];
                    }
                }
            });
        },
    
        findChildTerm: function (parentNode, childNodeKey) {
            if (!childNodeKey) {
                return this.root || null;
            };
    
            var list = parentNode.getChildren();
            if (list && list.length) {
                for (var n = 0, len = list.length; n < len; n++) {
                    if (list[n].data.nodeKey == childNodeKey) {
                        return list[n];
                    }
                };
            }
            return null;
        },
    
        findClosestAncestorOrSelf: function (nodeKey) {
            var current = this.root;
            var lvl = 1;
            while (current && lvl <= nodeKey.length / 2) {
                var nextTerm = this.findChildTerm(current, nodeKey.substr(0, lvl * 2));
                if (nextTerm) {
                    lvl += 1;
                    current = nextTerm;
                }
                else {
                    return current;
                }
            };
            return current;
        },
    
        showNode: function (node) {
            if (!node) {
                return;
            };
    
            this.domNode.scrollTop = 0;
            this.expandToNode(node);
    
            var posData = domGeometry.position(this.containerNode);
            var posNode = domGeometry.position(node.domNode);
    
            var dy = (posNode.y - posData.y - 24);
    
            this.viewPort.scrollTop = dy;
    
        },
    
        expandToMedcinId: function (medcinId) {
            if (!medcinId) {
                return null;
            };
    
            var self = this;
            return core.xhrGet({
                url: core.serviceURL('Quippe/NoteBuilder/Resolve'),
                content: { MedcinId: medcinId, DataFormat: 'JSON' },
                handleAs: 'json',
                error: core.showError,
                load: function (data, ioArgs) {
                    return self.browseToTerm(data.term);
                }
            });
        },
    
        browseToTerm: function (term) {
            if (this.root && this.root.data && this.root.data.isMedcinRoot) {
                return this.expandToTerm(term);
            }
            else {
                var self = this;
                return when(this.browse(), function () {
                    return self.expandToTerm(term);
                });
            };
        },
    
        expandToTerm: function (finding) {
            var medcinId = 0;
            var nodeKey = '';
    
            if (core.isFunction(finding.get)) {
                medcinId = finding.get('medcinId');
                nodeKey = finding.get('nodeKey');
            }
            else {
                medcinId = finding.medcinId;
                nodeKey = finding.nodeKey;
            };
    
            if (!(medcinId && nodeKey)) {
                return null;
            };
    
            var sNode = this.findClosestAncestorOrSelf(nodeKey);
            if (!sNode) {
                return null;
            };
    
            if (sNode.data.nodeKey == nodeKey) {
                sNode.expand();
                this.showNode(sNode);
                this.select(sNode);
                return sNode;
            };
    
            var self = this;
    
            return core.xhrGet({
                url: core.serviceURL('Quippe/Browse/TreeData'),
                content: { MedcinId: medcinId, FromNodeKey: sNode.data.nodeKey || '', DataFormat: 'JSON' },
                handleAs: 'json',
                onError: core.showError,
                load: function (data, ioArgs) {
                    self.collapseAll();
                    if (data && data.treeData && data.treeData.terms) {
                        var termData = core.forceArray(data.treeData.terms);
                        for (var n = 0, len = termData.length; n < len; n++) {
                            if (sNode) {
                                sNode.loadItems(array.map(core.forceArray(termData[n].term), self.convertTerm));
                                sNode.expand();
                                if (n < len - 1) {
                                    sNode = self.findChildTerm(sNode, termData[n + 1].n);
                                }
                            };
                        };
                    };
                    if (sNode) {
                        self.showNode(sNode);
                        self.select(sNode);
                        return sNode;
                    }
                    else {
                        return null;
                    }
                }
            });
        }
    
    
    });
});