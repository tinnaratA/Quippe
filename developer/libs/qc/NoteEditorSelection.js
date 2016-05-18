define([
    "qc/note/FindingGroup",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-geometry",
    "dojo/query",
    "dojo/topic",
    "qc/_core"
], function (FindingGroup, registry, array, declare, lang, domClass, domGeometry, query, topic, core) {
    return declare("qc.NoteEditorSelection", [], {
        editor: null,
        type: 'selection',
        owner: null,
        text: 'Multiple Items',
        savedSelection: null,

        constructor: function (editor) {
            this.editor = editor;
            this.owner = this;
            topic.subscribe('/qc/NoteEditor/Selection/Delete', lang.hitch(this, this.doDelete));
            topic.subscribe('/qc/NoteEditor/Selection/Group', lang.hitch(this, this.doGroup));
            topic.subscribe('/qc/NoteEditor/Selection/SelectAllFindings', lang.hitch(this, this.selectAllFindings));
            topic.subscribe('/qc/NoteEditor/Selection/CopyToSection', lang.hitch(this, this.copyToSection));
            topic.subscribe('/qc/NoteEditor/Selection/MoveToSection', lang.hitch(this, this.moveToSection));
            this.sourceOwner = this;
        },


        getItemCount: function () {
            return query('.selected', this.editor.domNode).length;
        },

        getItemCountsByClass: function (classNames) {
            classNames = core.forceArray(classNames);
            var counts = {};

            array.forEach(classNames, function (name) {
                counts[name] = 0;
            });

            array.forEach(this.getSelectedWidgets(), function (widget) {
                array.forEach(classNames, function (name) {
                    counts[name] += domClass.contains(widget.domNode, name) ? 1 : 0;
                });
            });

            return counts;
        },

        getSelectedWidgets: function () {
            return query('.selected', this.editor.domNode).map(registry.byNode);
        },

        getSelectedWidget: function() {
            return this.getSelectedWidgets()[0] || null;
        },

        getHighestPartLevel: function () {
            var level = -1;
            array.forEach(this.getSelectedWidgets(), function (widget) {
                if (widget.partLevel != undefined && widget.partLevel > level) {
                    level = widget.partLevel;
                };
            });
            return level;
        },

        getFindings: function () {
            var list = [];
            array.forEach(this.getSelectedWidgets(), function (widget) {
                if (domClass.contains(widget.domNode, 'finding')) {
                    list.push(widget);
                }
                else if (core.isFunction(widget.getFindings)) {
                    list = list.concat(widget.getFindings());
                }
            });
            return list;
        },

        isAllFindings: function () {
            return array.every(this.getSelectedWidgets(), function (widget) { return domClass.contains(widget.domNode, 'finding') });
        },

        canGroup: function () {
            var commonResult = '';
            var list = this.getSelectedWidgets();
            var result = '';
            var widget = null;

            for (var n = 0, len = list.length; n < len; n++) {
                widget = list[n];
                if (domClass.contains(widget.domNode, 'finding') || domClass.contains(widget.domNode, 'findingGroup')) {
                    result = widget.get('result');
                    if (result) {
                        if (commonResult) {
                            if (result != commonResult) {
                                return false;
                            }
                        }
                        else {
                            commonResult = result;
                        }
                    };
                }
                else {
                    return false;
                }
            };

            return true;
        },

        containsWidget: function (widget) {
            return domClass.contains(widget.domNode, 'selected') && core.ancestorWidgetByClass(widget.domNode, 'qcNoteEditor') == this.editor;
        },

        getContextActions: function (item, widget, targetNode) {
            var actions = [];
            var list = this.getSelectedWidgets();
            var listLength = list.length;
            var firstPart = null;
            var partCount = 0;
            var findingCount = 0;
            var posCount = 0;
            var negCount = 0;

            array.forEach(list, function (widget) {
                if (domClass.contains(widget.domNode, 'part')) {
                    partCount += 1;
                    if (!firstPart) {
                        firstPart = widget;
                    };
                }
                else if (domClass.contains(widget.domNode, 'finding')) {
                    findingCount += 1;
                    switch (widget.get('result')) {
                        case 'A':
                            posCount += 1;
                            break;
                        case 'N':
                            negCount += 1;
                            break;
                        default:
                            break;
                    };
                };
            });

            if (partCount == 0 && findingCount > 1) { //all findings
                actions.push({ label: core.getI18n("details") + '...', icon: 'form_blue', topic: '/qc/ShowDialog', item: ['multiFindingDetail', item] });
            };

            var canMerge = (partCount == 0) && (findingCount > 1) && ((posCount >= 0 && negCount == 0) || (negCount >= 0 && posCount == 0));
            if (canMerge) {
                actions.push({ label: 'Merge Findings', icon: '', topic: '/qc/NoteEditor/Selection/Group' });
            };


            var canCopyToSection = (partCount == 1) && (findingCount > 0);
            if (canCopyToSection) {
                for (var n = 0; n < listLength; n++) {
                    if (list[n].id != firstPart.id) {
                        if (list[n].isContainedBy(firstPart)) {
                            canCopyToSection = false;
                            break;
                        };
                    };
                };

                if (canCopyToSection) {
                    actions.push({ label: 'Copy to ' + firstPart.get('text'), icon: '', topic: '/qc/NoteEditor/Selection/CopyToSection', item: firstPart });
                    actions.push({ label: 'Move to ' + firstPart.get('text'), icon: '', topic: '/qc/NoteEditor/Selection/MoveToSection', item: firstPart });
                };
            };

            actions.push({ label: core.getI18n('deleteItem'), icon: 'delete', topic: '/qc/NoteEditor/Selection/Delete', beginGroup: (actions.length > 0) });

            return actions;
        },

        moveTo: function (targetNode, position) {
            var prevWidget = null;
            array.forEach(this.getSelectedWidgets(), function (widget) {
                if (prevWidget) {
                    widget.moveTo(prevWidget.domNode, 'after');
                }
                else {
                    widget.moveTo(targetNode, position);
                    prevWidget = widget;
                };
            });
        },

        dropDelete: function () {
            this.doDelete();
        },

        doDelete: function () {
            array.forEach(this.getSelectedWidgets(), function (widget) {
                widget.dropDelete();
            });
        },

        doGroup: function () {
            if (!this.canGroup()) {
                return;
            };

            var list = [];
            array.forEach(this.getSelectedWidgets(), function (w) {
                if (domClass.contains(w.domNode, 'findingGroup')) {
                    list = list.concat(w.unmerge());
                }
                else if (domClass.contains(w.domNode, 'finding')) {
                    list.push(w);
                };
            });

            if (list.length < 2) {
                return;
            };


            var firstFinding = list[0];
            var part = firstFinding.getParentNoteElement();
            var group = new FindingGroup();
            part.addElement(group, firstFinding.domNode, 'before');
            group.startup();

            var result = '';
            array.forEach(list, function (item) {
                if (!result) {
                    result = item.get('result');
                };
                group.addElement(item);
            });

            array.forEach(group.sharedProperties, function (propertyName) {
                group.set(propertyName, firstFinding.get(propertyName));
            });
            group.set('result', result)

            part.updateDisplay();
            group.updateTranscription();
            this.editor.select(group);
            topic.publish('/noteEditor/findingAdded');
            return group;
        },

        selectAllFindings: function (section) {
            if (!section || !section.domNode) {
                return;
            };
            query(".selected", this.editor.domNode).removeClass("selected");
            query('.finding', section.containerNode).forEach(function (item) {
                if (domClass.contains(item, 'freeText')) {
                    //skip free text blocks
                }
                else if (core.ancestorNodeByClass(item, 'finding')) {
                    //skip findings embedded in another finding (i.e. finding groups and free text macros)
                }
                else {
                    domClass.add(item, 'selected');
                }
            });
            topic.publish("/noteEditor/SelectionChanged");
        },

        copyToSection: function (part) {
            domClass.remove(part.domNode, 'selected');
            var list = this.getSelectedWidgets();
            this.editor.clearSelection();
            var clone = null;
            var placementNode = part.containerNode;
            var position = 'last';
            array.forEach(list, function (item) {
                clone = this.editor.duplicateFinding(item, true);
                clone.prefix = item.originalPrefix;
                clone.moveTo(placementNode, position);
                placementNode = clone.domNode;
                position = 'after';
                domClass.add(placementNode, 'selected');
            }, this);
            part.updateTranscription();
        },

        moveToSection: function (part) {
            domClass.remove(part.domNode, 'selected');
            this.moveTo(part.containerNode, 'last');
            part.updateTranscription();
        },

        copy: function() {
            this.savedSelection = query('.selected', this.editor.domNode).map(registry.byNode);
            return this.savedSelection.length > 0;
        },

        cut: function () {
            var rulesChanged = false;
            this.savedSelection = query('.selected', this.editor.domNode).map(registry.byNode);
            this.savedSelection.forEach(function (x) {
                x.domNode.parentNode.removeChild(x.domNode);
                if (x.groupingRule || (x.groupKeys && x.groupKeys.length > 0)) {
                    rulesChanged = true;
                }
            });
            if (rulesChanged) {
                topic.publish('/qc/OnGroupingRulesChanged');
            }
            return this.savedSelection.length > 0;
        },

        paste: function (targetWidget, evt) {
            if (!this.savedSelection) {
                return false;
            };

            targetWidget = targetWidget || this.getSelectedWidget();            
            if (!targetWidget) {
                return false;
            };
            
            if (!evt) {
                var pos = domGeometry.position(targetWidget.domNode);
                evt = {
                    target: targetWidget.domNode,
                    clientX: pos.x + pos.w - 4,
                    clientY: pos.y + 4
                };
            };

            this.savedSelection.forEach(function (x, i) {
                var newElement = core.Note.cloneElement(x);
                newElement.set('name', newElement.getUniqueName(x.get('name')));
                var dropInfo = newElement.getItem(targetWidget.domNode);
                if (dropInfo) {
                    targetWidget.doDrop(dropInfo, evt);
                    if (newElement.setSelected) {
                        newElement.setSelected(true, i == 0);
                    }
                }
            });
        },

        selectNext: function () {
            var list = query('.noteElement .selectable');
            var useNext = this.getSelectedWidgets().length == 0;
            var node = null;
            for (var i = 0, len = list.length; i < len; i++) {
                node = list[i];
                if (!core.isHiddenNode(node)) {
                    if (useNext) {
                        if (domClass.contains(node, 'selected')) {
                            domClass.remove(node, 'selected')
                        }
                        else {
                            domClass.add(node, 'selected');
                            this.editor.ensureVisible(node);
                            topic.publish("/noteEditor/SelectionChanged");
                            return true;
                        }
                    }
                    else {
                        if (domClass.contains(node, 'selected')) {
                            domClass.remove(node, 'selected');
                            useNext = true;
                        }
                    }
                }
            };
        },

        selectPrevious: function () {
            var list = query('.noteElement .selectable');
            var useNext = this.getSelectedWidgets().length == 0;
            var node = null;
            for (var i = list.length - 1; i >= 0; i--) {
                node = list[i];
                if (!core.isHiddenNode(node)) {
                    if (useNext) {
                        if (domClass.contains(node, 'selected')) {
                            domClass.remove(node, 'selected')
                        }
                        else {
                            domClass.add(node, 'selected');
                            this.editor.ensureVisible(node);
                            topic.publish("/noteEditor/SelectionChanged");
                            return true;
                        }
                    }
                    else {
                        if (domClass.contains(node, 'selected')) {
                            domClass.remove(node, 'selected');
                            useNext = true;
                        }
                    }
                }
            };
        }

    });
});