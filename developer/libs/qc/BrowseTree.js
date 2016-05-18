define([
    "qc/TreeNode",
    "qc/TreeView",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-geometry",
    "dojo/topic",
    "qc/_core"
], function (TreeNode, TreeView, array, declare, lang, domGeometry, topic, core) {
    return declare("qc.BrowseTree", [TreeView], {
        startup: function () {
            if (!this._started) {
                this.conceptRoot = this.addItem({ text: core.getI18n("concepts"), medcinId: 0, type: "term", icon: "book_blue", subs: "+", nodeKey: "" });
                this.contentRoot = this.addItem({ text: core.getI18n("samplecustomcontent"), type: "folder", icon: "book_blue", subs: "+", id: "" });
                topic.subscribe('/qc/ContentLibrary/Changed', lang.hitch(this, this.onLibraryChanged));
                this.inherited(arguments);
            };
        },

        nodeFromItem: function (item) {
            if (!item.type && item.medcinId != undefined) {
                item.type = 'term';
            };

            if (!item.text) {
                item.text = item.name;
            };
            var text = "";

            if (text == "") { text = item.text; }
            return new TreeNode({
                label: text, 
                icon: item.icon || core.getItemIcon(item, true),
                lazyLoading: item.subs ? true : false,
                reserveIconSpace: false,
                data: item
            });
        },

        convertTerm: function (term) {
            return {
                medcinId: term.m,
                nodeKey: term.n,
                termType: core.TermTypeInfo.fromNodeKey(term.n).termType,
                subs: term.s,
                text: term.t
            };
        },

        resolveChildren: function (node) {
            if (!(node && node.data)) {
                return [];
            };

            if (node.data.type == 'term') {
                return this.resolveTerm(node);
            }
            else {
                return this.resolveContent(node);
            };
        },

        resolveTerm: function (tNode) {
            var converter = this.convertTerm;

            return core.xhrGet({
                url: core.serviceURL("Quippe/Browse/Subs"),
                content: { MedcinId: tNode.data.medcinId, DataFormat: "JSON", Culture: core.settings.culture },
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
        
        resolveContent: function (tNode) {
            return core.xhrGet({
                url: core.serviceURL("Quippe/ContentLibrary/List"),
                content: { ParentId: tNode.data.id, Attributes: 0x90, DataFormat: "JSON", Culture: core.settings.culture },
                handleAs: "json",
                preventCache: true,
                error: core.showError,
                load: function (data, ioArgs) {
                    return data.items || [];
                }
            });
        },

        onLibraryChanged: function () {
            if (this.contentRoot) {
                this.contentRoot.invalidate();
            };
        },

        findChildTerm: function (parentNode, childNodeKey) {
            if (!childNodeKey) {
                return this.conceptRoot;
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
            var current = this.conceptRoot;
            var lvl = 1;
            while (lvl <= nodeKey.length / 2) {
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

        //        showNode: function (node) {
        //            if (!node) {
        //                return;
        //            };

        //            this.viewPort.scrollTop = 0;
        //            this.expandToNode(node);
        //            var posDocument = domGeometry.position(this.domNode);
        //            var posNode = domGeometry.position(node.domNode);
        //            this.viewPort.scrollTop = posNode.y - posDocument.y - 24;
        //        },

        expandToTerm: function (finding) {
            if (finding.get('medcinId')) {
                if (finding.get('nodeKey')) {
                    return this._expandToTerm(finding);
                }
                else {
                    var exp = lang.hitch(this, this._expandToTerm);
                    return core.xhrGet({
                        url: core.serviceURL('Quippe/Browse/Term'),
                        content: { MedcinId: finding.get('medcinId'), DataFormat: 'JSON' , culture: core.settings.culture},
                        handleAs: 'json',
                        error: null,
                        load: function (data, ioArgs) {
                            if (data.term && data.term.nodeKey) {
                                finding.nodeKey = data.term.nodeKey;
                                return exp(finding);
                            };
                        }
                    });
                };
            };
        },

        _expandToTerm: function (finding) {
            var medcinId = finding.get('medcinId');
            var nodeKey = finding.get('nodeKey');
            if (!(medcinId && nodeKey)) {
                return;
            };

            var sNode = this.findClosestAncestorOrSelf(nodeKey);
            if (!sNode) {
                return;
            };

            if (sNode.data.nodeKey == nodeKey) {
                sNode.expand();
                this.showNode(sNode);
                this.select(sNode);
                return;
            };

            var self = this;

            core.xhrGet({
                url: core.serviceURL('Quippe/Browse/TreeData'),
                content: { MedcinId: medcinId, FromNodeKey: sNode.data.nodeKey || '', DataFormat: 'JSON', Culture: core.settings.culture },
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
                    };
                }
            });
        }


    }
    );
});