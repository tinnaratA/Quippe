define([
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/query",
    "qc/_core",
    "qc/noteData/Tree",
    "qc/Transcriber"
], function (registry, array, declare, lang, domClass, domStyle, query, core, Tree, Transcriber) {
    return declare("qc.flowsheet.Tree", [Tree], {
        noteEditor: null,
    
        applyFilter: function (filterSettings, viewMode) {
            var filter = filterSettings ? lang.clone(filterSettings) : { visible: true, related: true };
            var tempGroupSelection = null;

            if (filter.currentLevel == 'auto') {
                var sel = this.noteEditor.selection.getSelectedWidgets();

                filter.visible = true;

                if (sel.length > 0) {
                    filter.selected = true;
                    if (sel.length == 1 && domClass.contains(sel[0].domNode, 'finding')) {
                        tempGroupSelection = sel[0].getContainingPart();
                    };
                }
                else {
                    filter.selected = false;
                };

                filter.highlighted = query('.highlight', this.noteEditor.note.domNode).length > 0;
                filter.haveHistory = true;
                filter.entered = false;
                filter.historyLevel = 'related';
            };

            var node = this;
            var prevFindingNode = null;

            var currentFindingList = [];

            var isRelated = function (node) {
                for (var n = currentFindingList.length - 1; n >= 0; n--) {
                    if (node.nodeKey.substr(0, currentFindingList[n].length) == currentFindingList[n]) {
                        return true;
                    };
                };
                return false;
            };

            var anyParentVisible = function (node) {
                while (node) {
                    if (node.visible) {
                        return true;
                    }
                    else {
                        node = node.parent;
                    }
                };
                return false;
            };

            var groupHidden = function (node) {
                while (node) {
                    if (node.displayNone) {
                        return true;
                    }
                    else {
                        node = node.parent;
                    }
                };
                return false;
            };

            var inSelectedGroup = function (node) {
                while (node) {
                    if (node.selectedGroup) {
                        return true;
                    }
                    else {
                        node = node.parent;
                    }
                };
                return false;
            };

            var hasClass = function (node, className) {
                return node.refWidget && node.refWidget.domNode && domClass.contains(node.refWidget.domNode, className);
            };

            var isEntered = function (node) {
                return hasClass(node, 'entry');
            };

            var isVisible = function (node) {
                return !hasClass(node, 'listHide') && !hasClass(node, 'hidden') && !groupHidden(node);
            };

            var isHighlighted = function (node) {
                return hasClass(node, 'highlight');
            };

            var isSelected = function (node) {
                return hasClass(node, 'selected') || anyParentVisible(node.parent);
            };

            var hasHistory = function (node) {
                return node.hasHistory || filter.historyLevel == 'all';
            };

            var combine= function(currentFn, flag, testFn) {
                if (flag) {
                    if (currentFn) {
                        return function (node) {
                            return currentFn(node) === false ? false : testFn(node);
                        };
                    }
                    else {
                        return testFn;
                    }
                }
                else {
                    return currentFn;
                }
            };

            var showCurrent = function (node) { return null };
            showCurrent = combine(showCurrent, filter.entered, isEntered);
            showCurrent = combine(showCurrent, filter.visible, isVisible);
            showCurrent = combine(showCurrent, filter.highlighted, isHighlighted);
            showCurrent = combine(showCurrent, filter.selected, isSelected);
            showCurrent = combine(showCurrent, filter.haveHistory, hasHistory);

            var v = false;
            var haveGroupSelection = false;
            while (node) {
                if (node.isNoteFinding()) {
                    v =  filter.currentLevel == 'all' ? true : showCurrent(node);
                   
                    if (v) {
                        currentFindingList.push(node.nodeKey);
                    };
                }
                else if (node.isFinding()) {
                    if (filter.historyLevel == 'all') {
                        v = true;
                    }
                    else if (filter.historyLevel == 'matching') {
                        v = false;
                    }
                    else {
                        if (filter.selected && !filter.highlighted) {
                            v = inSelectedGroup(node);
                        }
                        else {
                            v = isRelated(node);
                        };
                        if (v && filter.havePositiveHistory) {
                            v = node.hasAbnormalHistory;
                        };
                    }
                }
                else {
                    node.selectedGroup = tempGroupSelection && node.refWidget == tempGroupSelection || hasClass(node, 'selected') ? true : null;
                    if (filter.selected) {
                        v = node.selectedGroup;
                        haveGroupSelection = true;
                    }
                    else {
                        v = null;
                    };
                    node.displayNone = node.refWidget && node.refWidget.domNode ? domStyle.get(node.refWidget.domNode, 'display') == 'none' : true;
                    currentFindingList = [];
                };

                node.visible = v;
                node = node.nextNode();
            };
            return filter;
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
    
            //remove any unmatched tree node that also does not have history
            for (t = tLen - 1; t >= 0; t--) {
                if (!treeFindings[t].matched) {
                    if (treeFindings[t].node.hasHistory) {
                        treeFindings[t].node.refWidget = null;
                    }
                    else {
                        treeFindings[t].node.parent.removeChild(treeFindings[t].node);
                    }
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
        },
    
        synchHistoryFindings: function (noteEditor, pool) {
            var partNode = null;
            var part = null;
            var transcriber = new Transcriber();
            var termIndex = {};
            var groupIndex = {};
    
            this.forEach(function (node) {
                switch (node.nodeType) {
                    case 'finding':
                        if (node.medcinId) {
                            if (!termIndex[node.medcinId]) {
                                termIndex[node.medcinId] = {};
                            };
                            termIndex[node.medcinId][node.prefix || '0'] = node;
                        };
                        break;
                    case 'group':
                        if (node.refWidget && node.refWidget.id) {
                            groupIndex[node.refWidget.id] = node;
                        };
                        break;
                    default:
                        break;
                };
            });
    
            array.forEach(pool.findings, function (finding) {
                var numericValues = 0;

                core.forEachProperty(finding.entries, function (name, value) {
                    if (typeof value.value == 'number') {
                        numericValues++;
                    }
                });

                var term = termIndex[finding.medcinId] ? termIndex[finding.medcinId][finding.prefix || '0'] || null : null;
                if (term) {
                    if (numericValues > 1) {
                        term.text = '<span class="graphIcon" title="Display graph"></span>' + term.text;
                    }

                    term.hasHistory = true;
                    term.hasAbnormalHistory = finding.hasAbnormalHistory;
                }
                else {
                    part = noteEditor.getGroup(finding);
                    partNode = part ? groupIndex[part.id] || this : this;
                    partNode.addInSequence({
                        nodeType: 'finding',
                        medcinId: finding.medcinId,
                        prefix: finding.prefix || '',
                        nodeKey: finding.nodeKey,
                        text: (numericValues > 1 ? '<span class="graphIcon" title="Display graph"></span>' : '') + transcriber.transcribeItem(finding, true),
                        hasHistory: true,
                        hasAbnormalHistory: finding.hasAbnormalHistory
                    });
                }
            }, this);
        }
    });
});