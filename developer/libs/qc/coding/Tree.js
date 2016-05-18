define([
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/query",
    "qc/noteData/Tree"
], function (registry, array, declare, domClass, query, Tree) {
    return declare("qc.coding.Tree", [Tree], {
       
        applyFilter: function (filter, selectedVocabs, viewMode) {
            filter = filter || { currentLevel: 'visible', excludeNonEntered: true, excludeNegatives: true, hideEmptyRows: true, hideEmptyCols: true };
    
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
    
            var vLen = selectedVocabs.length;
            var v = 0;
    
            //var excludeNonEntered = (filter.currentLevel == 'visible' && viewMode == 'concise') ? true : filter.excludeNonEntered;
            var node = this;
            while (node) {
                if (node.isNoteFinding()) {
                    switch (filter.currentLevel) {
                        case 'all':
                            node.visible = true;
                            break;
                        case 'visible':
                            node.visible = !domClass.contains(node.refWidget.domNode, 'listHide');
                            break;
                        case 'highlight':
                            node.visible = domClass.contains(node.refWidget.domNode, 'highlight');
                            break;
                        case 'selected':
                            node.visible = domClass.contains(node.refWidget.domNode, 'selected') || anyParentVisible(node.parent);
                            break;
                    };
                    if (node.visible && filter.excludeNonEntered) {
                        node.visible = domClass.contains(node.refWidget.domNode, 'entry');
                    };
                    if (node.visible && filter.excludeNegatives) {
                        node.visible = (node.refWidget.get('result') != 'N')
                    };
                    if (node.visible && filter.hideEmptyRows) {
                        node.visible = false;
                        if (node.refWidget.codingInfo && vLen > 0) {
                            v = 0;
                            while (v < vLen && !node.visible) {
                                if (node.refWidget.codingInfo[selectedVocabs[v]] && node.refWidget.codingInfo[selectedVocabs[v]].length > 0) {
                                    node.visible = true;
                                }
                                else {
                                    v++;
                                };
                            };
                        };
                    };
                }
                else {
                    if (filter.currentLevel == 'selected') {
                        node.visible = node.refWidget && node.refWidget.domNode && domClass.contains(node.refWidget.domNode, 'selected') ? true : null;
                    }
                    else {
                        node.visible = null;
                    }
                };
                node = node.nextNode();
            };
        },
    
        synchNoteFindings: function (note) {
            if (!note) {
                return false;
            };
    
            var changed = false;
    
            var compare = function (a, b) {
                if (a.medcinId == b.medcinId) {
                	if (a.prefix == b.prefix) {
		                if (a.parentSectionId == b.parentSectionId) {
			                return 0;
		                }

		                else if (a.parentSectionId < b.parentSectionId) {
			                return -1;
		                }

		                else {
			                return 1;
		                }
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
            	return { medcinId: parseInt(widget.get('medcinId'), 10) || 0, prefix: widget.get('prefix') || '', widget: widget, matched: false, parentSectionId: domClass.contains(widget.domNode, 'finding') && widget.getContainingPart().groupKeys ? widget.getContainingPart().groupKeys[0]: '', result: widget.get('result') || '', modifier: widget.get('modifier') || '' };
            }) || []).sort(compare);
    
            //sorted list of all findings in the tree
            var treeFindings = (array.map(this.find(function (node) { return (node && node.medcinId) }), function (tNode) {
                return { medcinId: parseInt(tNode.medcinId, 10) || 0, prefix: tNode.prefix || '', matched: false, node: tNode, parentSectionId: tNode.parentSectionId || '', result: tNode.result || '', modifier: tNode.modifier || '' };
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
                    if (treeFindings[t].node.refWidget) {
                        if (!treeFindings[t].node.refWidget.codingInfo) {
	                        changed = true;
                        }

                        else {
	                        if (treeFindings[t].modifier != noteFindings[n].modifier || treeFindings[t].result != noteFindings[n].result) {
		                        treeFindings[t].node.result = noteFindings[n].result;
								treeFindings[t].node.modifier = noteFindings[n].modifier;

		                        for (var v in noteFindings[n].widget.codingInfo) {
			                        if (!(noteFindings[n].widget.codingInfo[v] instanceof Array)) {
				                        continue;
			                        }

									if (noteFindings[n].widget.codingInfo[v].isQualified) {
										changed = true;
										break;
									}
		                        }
	                        }
                        }
                    }
                    else {
                        treeFindings[t].node.refWidget = noteFindings[n].widget;
                        changed = true;
                    }
                    t++;
                };
                n++;
            };
    
            //remove any unmatched tree nodes
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
});