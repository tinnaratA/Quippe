define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "qc/_core",
    "qc/noteData/TreeNode"
], function (declare, array, lang, core, TreeNode) {
    var typeDef = declare('qc.noteData.Tree', [TreeNode], {
        nodeSeq: 0,

        createNode: function (args) {
            var node = null;
            if (args.isTreeNode) {
                node = args;
            }
            else {
                node = new TreeNode();
                for (var p in args) {
                    node[p] = args[p];
                };
            }
            node.tree = this;
            if (!node.id) {
                node.id = this.newId();
            };
            return node;
        },

        createChildNode: function (args) {
            var node = this.createNode(args);
            node.parent = this;
            node.level = this.level + 1;
            return node;
        },

        newId: function () {
            this.nodeSeq++;
            return 'N' + this.nodeSeq;
        },

        reset: function () {
            this.clear();
            this.nodeSeq = 0;
            this.id = 'N0';
        },

        findTerm: function (medcinId, prefix) {
            if (!medcinId) {
                return null;
            };
            prefix = prefix || '';
            return this.findFirst(function (node) { return node.medcinId === medcinId && (node.prefix || '') === prefix });
        },

        loadDocument: function (note) {
            this.reset();

            if (!note) {
                return;
            };
            this.nodeType = 'document';
            this.refWidget = note;
            this.loadNoteElements();
        },

        synchNoteFindings: function (note) {
            if (!note) {
                return false;
            };

            var changed = false;

            var compare = function (a, b) {
                if (a.medcinId == b.medcinId) {
                    if (a.prefix == b.prefix) {
                        return 0;
                    }
                    else if (a.prefix < b.prefix) {
                        return -1;
                    }
                    else {
                        return 1;
                    }
                }
                else if (a.medcinId < b.medcinId) {
                    return -1;
                }
                else {
                    return 1;
                }
            };

            //sorted list of all findings in the note
            var noteFindings = (query('.finding:not(.freeText)').map(registry.byNode).filter(function (x) { return x && x != undefined }).map(function (widget) {
                return { medcinId: parseInt(widget.get('medcinId'), 10) || 0, prefix: widget.get('prefix') || '', widget: widget, matched: false };
            }) || []).sort(compare);

            //sorted list of all findings in the tree
            var treeFindings = (array.map(this.find(function (node) { return (node && node.medcinId) }), function (tNode) {
                return { medcinId: parseInt(tNode.medcinId, 10) || 0, prefix: tNode.prefix || '', matched: false, node: tNode };
            }) || []).sort(compare);

            //match up note+tree findings
            var n = 0
            var nLen = noteFindings.length;
            var t = 0
            var tLen = treeFindings.length;
            while (n < nLen && t < tLen) {
                while (t < tLen && compare(noteFindings[n], treeFindings[t]) > 0) {
                    t++;
                };
                if (t < tLen && compare(noteFindings[n], treeFindings[t]) == 0) {
                    noteFindings[n].matched = true;
                    treeFindings[t].matched = true;
                    if (!treeFindings[t].node.refWidget) {
                        treeFindings[t].node.refWidget = noteFindings[n].widget;
                        changed = true;
                    };
                    t++;
                };
                n++;
            };

            //remove any unmatched tree node
            for (t = tLen - 1; t >= 0; t--) {
                if (!treeFindings[t].matched) {
                    treeFindings[t].node.parent.removeChild(treeFindings[t].node);
                    changed = true;
                };
            };

            //add any unmatched note findings
            for (n = 0; n < nLen; n++) {
                if (!noteFindings[n].matched) {
                    this.placeFindingElement(noteFindings[n].widget);
                    changed = true;
                };
            };

            return changed;
        }
    });

    return typeDef;
});