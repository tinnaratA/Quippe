define([
    "qc/note/_EditableTextMixin",
    "qc/note/_Element",
    "qc/note/_FindingContainerMixin",
    "qc/note/_SelectableMixin",
	"qc/SaveContentDialog",
    "qc/XmlWriter",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/query",
    "dojo/request",
    "dojo/topic",
    "qc/_core",
    "qc/StringUtil",
	"qc/note/ComponentSettingsMixin",
	"qc/note/PropertyBindingMixin",
    "qc/lang/qscript/Compiler",
    "qc/lang/qscript/Host"
], function (_EditableTextMixin, _Element, _FindingContainerMixin, _SelectableMixin, SaveContentDialog, XmlWriter, registry, array, declare, lang, domClass, domConstruct, domGeometry, domStyle, query, request, topic, core, StringUtil, ComponentSettingsMixin, PropertyBindingMixin, ScriptCompiler, ScriptHost) {
	return declare("qc.note._Group", [_Element, _SelectableMixin, _FindingContainerMixin, _EditableTextMixin, ComponentSettingsMixin, PropertyBindingMixin], {
        text: '',
        showHeader: true,
        showEmpty: false,
        contentHidingDisabled: false,
        partType: '',
        partLevel: 0,
        medcinId: 0,
        findingPlacement: null,
        itemEntryClass: null,
        freeTextMedcinId: 0,
        //forcePrefix: null,
        //applyPrefix: null,
        layoutColumns: 0,
        impliedPrefixes: '',
        groupingRule: '',
        anchor: '',
        placementId: '',
        position: '',
        formMergePlacement: '',
        autoPopulate: false,

        problemMedcinId: 0,
        problemGroupingBehavior: '',
        contextMedcinId: 0,
        contextNodeKey: '',

        _isDeferred: false,
	    _allowDeferredChildren: true,
    
        constructor: function () {
            this.groupKeys = [];
        },
    
        destroyRecursive: function() {
            var ruleChange = this.groupingRule || (this.groupKeys && this.groupKeys.length > 0);
            this.inherited(arguments);
            if (ruleChange) {
                topic.publish('/qc/OnGroupingRulesChanged');
            }

        },

        templateString: '<div class="part ${partType} qcddTarget qcddSource">'
                          + '  <div class="${partType}Header hyperlinkParent" data-dojo-attach-point="header">'
                          + '    <span data-dojo-attach-point="expander" class="expander"></span>'
                          + '    <span data-dojo-attach-point="innerLabel" class="innerLabel editableText"></span>'
                          + '  </div>'
                          + '  <div class="${partType}Content" data-dojo-attach-point="containerNode"></div>'
                          + '</div>',
    

        prefixAction: 0, //0 = inherit, 1 = none, 2 = apply, 3 = force, 4 = remove, 5 = custom rule
        prefixValue: '',


        _getPrefixActionOwnValueAttr: function() {
            return this.prefixAction || 0;
        },
        _setPrefixActionOwnValueAttr: function(value) {
            this.set('prefixAction', value);
        },

        _getPrefixActionAttr: function() {
            return this.getInheritedProperty('prefixAction', 0);
        },
        _setPrefixActionAttr: function(value) {
            var nValue = parseInt(value, 10);
            if (nValue >= 1 && nValue <= 5) {
                this.prefixAction = nValue;
                //reset the prefix value if the action is not "custom rule" and the value is not a valid prefix
                if (nValue != 5 && !/^[A-Z\?\+]{1,2}$/.test(this.prefixValue)) {
                    this.prefixValue = '';
                };
            }
            else {
                this.prefixAction = null;
                this.prefixValue = null;
            };
        },

        _getPrefixValueAttr: function () {
            return this.getInheritedProperty('prefixValue', '');
        },
        _setPrefixValueAttr: function (value) {
            this.prefixValue = value || '';
            this.prefixRuleFn = null;
        },
        
	    // summary:
        //   Deprecated.  Use prefixAction/prefixValue instead
        _getApplyPrefixAttr: function () {
            //return this.getInheritedProperty('applyPrefix', '');
            return this.get('prefixAction') == 2 ? this.get('prefixValue') : '';
        },
        _setApplyPrefixAttr: function (value) {
            //this.applyPrefix = value;
            if (value && this.get('prefixAction') != 3) {
                this.set('prefixAction', 2);
                this.set('prefixValue', value);
            }
        },
    
	    // summary:
	    //   Deprecated.  Use prefixAction/prefixValue instead
        _getForcePrefixAttr: function () {
            //return this.getInheritedProperty('forcePrefix', '');
            return this.get('prefixAction') == 3 ? this.get('prefixValue') : '';
        },
        _setForcePrefixAttr: function (value) {
            //this.forcePrefix = value;
            if (value) {
                this.set('prefixAction', 3);
                this.set('prefixValue', value);
            }
        },
    
        _getFindingPlacementAttr: function () {
            return this.getInheritedProperty('findingPlacement', 0);
        },
        _setFindingPlacementAttr: function (value) {
            this.findingPlacement = value;
            this.getChildNoteElements().forEach(function (x) { this.placeElement(x) }, this);
            this.transcribe();
            this.updateDisplay();
        },
    
        _getItemEntryClassAttr: function () {
            return this.itemEntryClass;
        },
        _setItemEntryClassAttr: function (value) {
            this.itemEntryClass = value;
        },
    
        _getContentHidingDisabledAttr: function () {
            return this.contentHidingDisabled;
        },
        _setContentHidingDisabledAttr: function (value) {
            this.contentHidingDisabled = value;
            if (value) {
                array.forEach(this.getChildNoteElements(), function (element) {
                    domClass.add(element.domNode, 'alwaysShow');
                });
            }
            else {
                array.forEach(this.getChildNoteElements(), function (element) {
                    domClass.remove(element.domNode, 'alwaysShow');
                });
            };
        },
    
        _getEntryStyleAttr: function () {
            return this.getInheritedProperty('entryStyle', '');
        },
        _setEntryStyleAttr: function (value) {
            this.entryStyle = value;
            array.forEach(this.getChildNoteElements(), function (element) {
                element.set('entryStyle', value);
            });
        },
    
        _getLayoutColumnsAttr: function () {
            return this.layoutColumns;
        },
        _setLayoutColumnsAttr: function (value) {
            var nValue = parseInt(value, 10);
            if (isNaN(nValue) || nValue < 0 || nValue > 16000) {
                nValue = 0;
            };
            if (nValue !== this.layoutColumns) {
                this.layoutColumns = nValue;
                this.clearGridLayout();
                this.updateLayout();
            };
        },

        _getFormMergePlacementAttr: function () {
            return this.getInheritedProperty('formMergePlacement', '');
        },
        _setFormMergePlacementAttr: function (value) {
            this.formMergePlacement = value || '';
        },
    
        getChildNoteElements: function () {
            if (this.layoutColumns) {
                return query('> .row > .cell > .noteElement', this.containerNode).concat(query('> .noteElement', this.containerNode)).map(registry.byNode);
            }
            else {
                return query('> .noteElement', this.containerNode).map(registry.byNode);
            };
        },
    
        addElement: function (element, relativeTo, position, suspendUpdate, sourceClass) {
            var e = array.filter(this.getChildren(), function (child) { return child.isEquivalentElement(element) }, this)[0] || null;
            if (e) {
                e.merge(element, sourceClass);
            }
            else {
                e = this.placeElement(element, relativeTo, position);
                if (!suspendUpdate && e) {
                    this.updateLayout();
                };
            };
            if (sourceClass) {
                domClass.add(e.domNode, sourceClass);
            };
            return e;
        },
    
        containsFinding: function (findingOrMedcinId, prefix) {
            var medcinId = -1
            if (typeof findingOrMedcinId == 'number') {
                medcinId = findingOrMedcinId;
                prefix = prefix || '';
            }
            else {
                medcinId = findingOrMedcinId.medcinId || -1;
                prefix = findingOrMedcinId.prefix || '';
            }
            return this.getChildren().some(function (x) { return x.medcinId == medcinId && (x.prefix || '') == prefix });
        },
    
        resolvePrefix: function(item) {
            switch (this.get('prefixAction')) {
                case 1: // none
                    return null;
                case 2: //apply
                    var currentPrefix = item ? item.get ? item.get('prefix') : item.prefix || '' : '';
                    var proposedPrefix = this.get('prefixValue');
                    return currentPrefix ? currentPrefix : core.MedcinInfo.isValidPrefix(proposedPrefix, item.termType || item.nodeKey) ? proposedPrefix : null;
                case 3: //force
                    return this.get('prefixValue');
                case 4: //remove
                    return '';
                case 5: //custom rule
                    var srcItem = item || { prefix: '' };
                    var fn = this.getPrefixRuleFn();
                    var p = fn ? fn(item) : null;
                    return p;
                default:
                    return null;
            };
        },

        getPrefixRuleFn: function () {
            if (this.prefixAction == 5) {
                if (this.prefixRuleFn) {
                    return this.prefixRuleFn;
                };

                var expr = '';
                if (!this.prefixValue) {
                    expr = 'empty'
                }
                else if (/^[A-Z\?\+]{1,2}$/.test(this.prefixValue)) {
                    expr = '"' + this.prefixValue + '"';
                }
                else {
                    expr = this.prefixValue;
                };

                var res = ScriptCompiler.compile(expr);
                if (!res.success) {
                    return null;
                };

                var getByName = lang.hitch(this, this.getElementByName);

                this.prefixRuleFn = function (item) {
                    var context = {
                        'Owner': item,
                        'Item': item,
                        getObject: function (name, property) {
                            var target = this[name] || getByName(name);
                            return target ? property ? target.get ? target.get(property) : target[property] : target : null;
                        }
                    };
                    return res.targetFunction.call(ScriptHost, context);
                };

                return this.prefixRuleFn;
            }
            else {
                var part = this.getContainingPart();
                return part ? part.getPrefixRuleFn() : null;
            };
        },

        applyPrefixRule: function(finding) {
            var prefix = this.resolvePrefix(finding);
            if (prefix !== null) {
                finding.setPrefixFromRule(prefix);
            };
            return prefix;
        },

        placeElement: function (element, relativeTo, position) {
            //var forcePrefix = null;
            //var applyPrefix = null;
            //var placement = 0;
            //var nodeKey = '';
            //var target = null;
    
            if (!element.domNode) {
                return null;
            };
    
            if (domClass.contains(element.domNode, 'finding')) {
                //forcePrefix = this.get('forcePrefix');
                //if (forcePrefix) {
                //    element.setPrefixFromRule(forcePrefix);
                //}
                //else if (!element.get('prefix')) {
                //    applyPrefix = this.get('applyPrefix');
                //    if (applyPrefix && core.MedcinInfo.isValidPrefix(applyPrefix, element.get('termType') || element.get('nodeKey'))) {
                //        element.setPrefixFromRule(applyPrefix);
                //    };
                //};
                this.applyPrefixRule(element);
                element.set('entryStyle', this.get('entryStyle'));
            };
    
            if (this.contentHidingDisabled) {
                domClass.add(element.domNode, 'alwaysShow');
            }
            else {
                domClass.remove(element.domNode, 'alwaysShow');
            };
    
            if (relativeTo == 'self') {
                relativeTo = this.containerNode;
            };
    
            if (relativeTo) {
                domConstruct.place(element.domNode, relativeTo, position || 'last');
                return element;
            };
    
            if (domClass.contains(element.domNode, 'freeText')) {
                domConstruct.place(element.domNode, this.containerNode, position || 'first');
                return element;
            };
    
            var placed = false;
            var placementFunction = this['_placeElement_' + (this.get('findingPlacement') || "0")];
            if (placementFunction) {
                placed = placementFunction.call(this, element);
            };
    
            if (!placed) {
                domConstruct.place(element.domNode, this.containerNode, position || 'last');
            };
    
            return element;
    
    
    
            //            placement = this.get('findingPlacement');
            //            nodeKey = element.get('nodeKey');
    
            //            //1 = AsEntered
            //            if (placement == 1 || !nodeKey) {
            //                domConstruct.place(element.domNode, this.containerNode, 'last');
            //                return element;
            //            };
    
            //            //default = Medcin NodeKey Order
            //            array.forEach(this.getChildren(), function (child) {
            //                if (!target && child.get('nodeKey') > nodeKey && !domClass.contains(child.domNode, 'freeText')) {
            //                    target = child;
            //                }
            //            });
    
            //            if (target) {
            //                domConstruct.place(element.domNode, target.domNode, 'before');
            //            }
            //            else {
            //                domConstruct.place(element.domNode, this.containerNode, 'last');
            //            }
    
            //            return element;
        },
    
        //By Hierarchy
        _placeElement_0: function (element) {
            var nodeKey = element.nodeKey || '';
            if (!nodeKey) {
                return false;
            };
    
            return array.filter(this.getChildren(), function (x) { return x.nodeKey && !domClass.contains(x.domNode, 'freeText') }).some(function (y) {
                if (y.nodeKey > nodeKey) {
                    domConstruct.place(element.domNode, y.domNode, 'before');
                    return true;
                };
            });
        },
    
        //As Entered
        _placeElement_1: function (element) {
            domConstruct.place(element.domNode, this.containerNode, 'last');
            return true;
        },
    
        //Alphabetical
        _placeElement_2: function (element) {
            var normPhrase = function (item) {
                var text = item.phrasing && item.phrasing.ip ? item.phrasing.ip : item.text || '';
                return StringUtil.stripTildeCodes(text);
            };
    
            var text = normPhrase(element);
            if (!text) {
                return false;
            };
    
            var compare = function (a, b) { return StringUtil.compare(a, b, true) };
    
            return array.filter(this.getChildren(), function (x) { return x.nodeKey && !domClass.contains(x.domNode, 'freeText') }).some(function (y) {
                if (compare(normPhrase(y), text) > 0) {
                    domConstruct.place(element.domNode, y.domNode, 'before');
                    return true;
                };
            });
        },
    
        //Alpha with context
        _placeElement_3: function (element) {
            domConstruct.place(element.domNode, this.containerNode, 'last');
    
            var normPhrase = function (item) {
                var text = item.phrasing && item.phrasing.ip ? item.phrasing.ip : item.text || '';
                return StringUtil.stripTildeCodes(text);
            };
    
            var stringCompare = function (a, b) { return StringUtil.compare(a, b, true) };
            var sortFunction = function (a, b) { return stringCompare(a.text, b.text) };
    
            var list = array.filter(this.getChildren(), function (x) { return x.nodeKey && !domClass.contains(x.domNode, 'freeText') }).sort(function (a, b) { return stringCompare(a.nodeKey, b.nodeKey) });
    
            var currentContext = function () {
                return stack.length > 0 ? stack[stack.length - 1].nodeKey : '';
            };
    
            var itemContext = '';
    
            var nodes = [];
            var stack = [];
    
            array.forEach(list, function (item) {
                var node = { item: item, nodeKey: item.nodeKey, context: item.phrasing ? item.phrasing.ctnk || '' : '', text: normPhrase(item), children: [] };
                while (stack.length > 0 && node.context != currentContext()) {
                    stack.pop();
                };
    
                if (stack.length > 0) {
                    stack[stack.length - 1].children.push(node);
                }
                else {
                    nodes.push(node);
                }
    
                stack.push(node);
            });
    
            var container = this.containerNode;
            var placeNodes = function (nodeList) {
                nodeList.sort(sortFunction);
                array.forEach(nodeList, function (node) {
                    domConstruct.place(node.item.domNode, container, 'last');
                    placeNodes(node.children);
                });
            };
    
            placeNodes(nodes);
    
            return true;
        },
    
        handlesGroup: function (groupKey) {
            return array.indexOf(this.getGroupKeyList(), groupKey) >= 0
        },
    
        updateDisplay: function (viewMode) {
            viewMode = viewMode || this.getViewMode();
    
            var shouldDisplay = false;
    
            if (viewMode == 'concise') {
                shouldDisplay = this.hasEntries();
            }
            else if (viewMode == 'listfocus') {
                shouldDisplay = (query('.listShow', this.domNode).length > 0);
            }
            else if (viewMode == 'design') {
                shouldDisplay = true;
            }
            else if (core.ancestorNodeByClass(this.domNode, 'hideWhenOnlyDefaultContent', true)) {
                var rxNonDefault = /\blst(?!DocumentTemplate)/;
                shouldDisplay = query('.noteElement', this.domNode).some(function (x) {
                    return rxNonDefault.test(x.className);
                });
            }
            else {
                shouldDisplay = this.showEmpty || this.hasFindings() || (query('.qcHtmlContent', this.domNode).length > 0)
            };
    
            if (shouldDisplay) {
                domClass.remove(this.domNode, 'listHide');
                domStyle.set(this.domNode, "display", "");
                this._updateChildDisplay(viewMode);
                this.updateLayout(viewMode);

                //if (this.autoRollupThreshold > 0) {
                //    if (query('.finding', this.containerNode).length < this.autoRollupThreshold) {
                //        domClass.add(this.domNode, 'autoRollup');
                //    }
                //    else {
                //        domClass.remove(this.domNode, 'autoRollup');
                //    }
                //}

            }
            else {
                domStyle.set(this.domNode, "display", "none");
            };
    
            if (domClass.contains(this.domNode, 'autoExpand') && !this.userCollapsed) {
                if (this.hasFindings()) {
                    this.expand();
                }
                else {
                    this.collapse();
                };
            };
        },
    
    
        updateLayout: function (viewMode) {
			viewMode = viewMode || this.getViewMode();

            if ((this.layoutColumns || 0) <= 0) {
                if (domClass.contains(this.containerNode, 'grid')) {
                    this.clearGridLayout();
                };
            }
            else {
                this.updateGridLayout(viewMode);
            };
        },
    
       	updateGridLayout: function (viewMode) {
			viewMode = viewMode || this.getViewMode();

            var container = this.containerNode;
    
            var nCols = this.layoutColumns;
            var nRows = 0;
    
            var gridRows = [];
            var content = [];
    
            var visibleCount = 0;
    
            var r = 0;
            var c = 0;
            var row = null;
            var cell = null;
            var item = null;
            var allHidden = false;
    
            var storeContent = function (node) {
                var hidden = core.isHiddenNode(node, true);
                if (!hidden) {
                    visibleCount++;
                };
                content.push({ node: node, hidden: hidden });
            };
    
            domClass.add(container, 'grid');
    
            visibleCount = 0;
            array.forEach(core.childElementNodes(container), function (rowNode) {
                if (domClass.contains(rowNode, 'row')) {
                    var rowInfo = { node: rowNode, cells: [] };
                    gridRows.push(rowInfo);
                    array.forEach(core.childElementNodes(rowNode), function (cellNode) {
                        if (domClass.contains(cellNode, 'cell')) {
                            rowInfo.cells.push(cellNode);
                            array.forEach(core.childElementNodes(cellNode), function (childNode) {
                                storeContent(childNode);
                            });
                        }
                        else {
                            storeContent(cellNode);
                        }
                    });
                }
                else {
                    storeContent(rowNode);
                }
            });
    
            if (visibleCount == 0 && viewMode != 'design') {
                domStyle.set(container, 'display', 'none');
            }
    
            else {
		        domStyle.set(container, 'display', '');
	        }

            domClass.add(container, 'grid');
    
            nRows = Math.ceil(visibleCount / nCols);
            while (nRows > gridRows.length) {
                row = domConstruct.place('<div class="row"></div>', container);
                gridRows.push({ node: row, cells: [] });
            };
            while (nRows < gridRows.length) {
                row = gridRows.pop().node;
                row.parentNode.removeChild(row);
            };
            for (r = 0; r < nRows; r++) {
                while (nCols > gridRows[r].cells.length) {
                    cell = domConstruct.place('<div class="cell"></div>', gridRows[r].node);
                    gridRows[r].cells.push(cell);
                };
                while (nCols < gridRows[r].cells.length) {
                    cell = gridRows[r].cells.pop();
                    cell.parentNode.removeChild(cell);
                };
                for (c = 0; c < nCols; c++) {
                    allHidden = true;
                    item = content.shift();
                    while (item) {
                        gridRows[r].cells[c].appendChild(item.node);
                        if (item.hidden) {
                            item = content.shift();
                        }
                        else {
                            item = null;
                            allHidden = false;
                        }
                    };
                    domStyle.set(gridRows[r].cells[c], 'display', allHidden && viewMode != 'design' ? 'none' : '');
                };
            };
            while (content.length > 0) {
                domConstruct.place(content.shift().node, container);
            };
        },
    
        updateGridLayout_OLD: function () {
            var nCols = this.layoutColumns;
            var container = this.containerNode;
            var queue = [];
            var empty = [];
            var cellContents = [];
            var row = null;
            var cell = null;
            var item = null;
            var r = -1;
            var c = -1;
    
            if (!domClass.contains(container, 'grid')) {
                domClass.add(container, 'grid');
            };
        
            array.forEach(core.childElementNodes(container), function (rowNode) {
                if (domClass.contains(rowNode, 'row')) {
                    row = rowNode;
                    r++;
                    c = 0;
                    array.forEach(core.childElementNodes(rowNode), function (cellNode) {
                        if (domClass.contains(cellNode, 'cell')) {
                            cell = cellNode;
                            c++;
                            cellContents = core.childElementNodes(cellNode);
    
                            //queue -> empty
                            while (queue.length > 0 && empty.length > 0) {
                                empty.shift().appendChild(queue.shift());
                            };
    
                            //cell -> empty
                            while (empty.length > 0 && cellContents.length > 0) {
                                empty.shift().appendChild(cellContents.shift());
                            };
    
                            //queue -> cell
                            if (queue.length > 0) {
                                while (cellContents.length > 0) {
                                    queue.push(cellContents.shift());
                                };
                                cellNode.appendChild(queue.shift());
                            }
                            else {
                                if (cellContents.length == 0) {
                                    empty.push(cellNode);
                                }
                                else {
                                    cellContents.shift();
                                    while (cellContents.length > 0) {
                                        queue.push(cellContents.shift());
                                    };
                                }
                            };
                        }
                        else {
                            queue.push(cellNode);
                        };
                    });
                }
                else {
                    queue.push(rowNode);
                };
            });
    
            while (queue.length > 0 && empty.length > 0) {
                empty.shift().appendChild(queue.shift());
            };
    
            while (queue.length) {
                item = queue.shift();
                if (!row || c < 0 || c > nCols - 1) {
                    row = domConstruct.place('<div class="row"></div>', container);
                    c = 0;
                };
                cell = domConstruct.place('<div class="cell"></div>', row);
                cell.appendChild(item);
                c++;
            };
        },
    
        clearGridLayout: function () {
            var container = this.containerNode;
            query('>.row', container).forEach(function (row) {
                query('>.cell', row).forEach(function (cell) {
                    array.forEach(cell.childNodes, function (node) {
                        if (node.nodeType == 1) {
                            container.appendChild(node);
                        };
                    });
                    row.removeChild(cell);
                });
                container.removeChild(row);
            });
            domClass.remove(container, 'grid');
        },
    
    
        getFinding: function (item) {
            if (item && item.medcinId) {
                var medcinId = item.medcinId;
                var prefix = item.prefix || '';
                return query('.finding', this.containerNode).map(registry.byNode).filter(function (x) { return medcinId == x.medcinId && prefix == (x.prefix || '') })[0] || null;
            }
            return null;
        },
    
        getGroup: function (key) {
            return query('.part', this.containerNode).map(registry.byNode).filter(function (x) { return x.handlesGroup(key) })[0] || null;
        },
    
        toggleAutoNegate: function () {
            if (this.isAutoNegated) {
                this.undoAutoNegate();
            }
            else {
                this.autoNegate();
            };
        },
    
        autoNegate: function () {
            if (core.ancestorNodeByClass(this.domNode, 'disableOtherwiseNormal', true)) {
                return;
            };
            var haveDisableClass = query('.disableOtherwiseNormal', this.domNode).length > 0;

            var candidates = [];
            var entries = [];
            var isVisible = function (f) { return !core.isHiddenNode(f.domNode) }; // function (f) { return !domClass.contains(f.domNode, 'listHide') && !core.ancestorNodeByClass(f.domNode, 'hidden', true) };
            var isEntered = function (f) { return (f.get('result') || '' != '') };
            var canNegate = function (f) { return haveDisableClass && core.ancestorNodeByClass(f.domNode, 'disableOtherwiseNormal', true) ? false : true };
            var hasAncestor = function (s, f) {
                var n = s.length - 1;
                while (n >= 0) {
                    if (core.MedcinInfo.isAncestor(s[n], f)) {
                        return true;
                    }
                    else {
                        n -= 1;
                    }
                }
            };
    
            var clearCandidates = function (f) {
                while (candidates.length > 0 && core.MedcinInfo.isAncestor(candidates[candidates.length - 1], f)) {
                    entries.push(candidates.pop());
                };
            };
    
            query('.finding', this.containerNode).map(registry.byNode).sort(core.MedcinInfo.nodeKeyComparer).forEach(function (finding) {
                if (isEntered(finding)) {
                    entries.push(finding);
                    clearCandidates(finding);
                }
                else if (hasAncestor(entries, finding)) {
                    entries.push(finding);
                }
                else if (hasAncestor(candidates, finding)) {
                    //skip
                }
                else {
                    candidates.push(finding);
                };
            });
    
            array.forEach(candidates, function (item) {
                if (isVisible(item) && canNegate(item)) {
                    item.set('result', 'N');
                    item.autoNegated = true;
                };
            });
    
            this.transcribe();
        },
    
        undoAutoNegate: function () {
            this.isAutoNegated = false;
            query('.finding', this.containerNode).map(registry.byNode).forEach(function (item) {
                if (item.autoNegated == true && item.get('result') == 'N') {
                    item.set('result', '');
                    item.autoNegated = false;
                };
            });
            this.transcribe();
        },
    
        enterDefaults: function () {
            var candidates = [];
            var entries = [];
            var isVisible = function (f) { return !core.isHiddenNode(f.domNode) }; //function (f) { return !domClass.contains(f.domNode, 'listHide') && !core.ancestorNodeByClass(f.domNode, 'hidden', true) };
            var isNormal = function (f) { return (f.get('result') || '' == 'N') };
            var hasAncestor = function (s, f) {
                var n = s.length - 1;
                while (n >= 0) {
                    if (core.MedcinInfo.isAncestor(s[n], f)) {
                        return true;
                    }
                    else {
                        n -= 1;
                    }
                }
            };
    
            var clearCandidates = function (f) {
                while (candidates.length > 0 && core.MedcinInfo.isAncestor(candidates[candidates.length - 1], f)) {
                    entries.push(candidates.pop());
                };
            };
    
            candidates = query('.defaultSelection', this.containerNode).map(registry.byNode);
    
            query('.neg', this.containerNode).map(registry.byNode).sort(core.MedcinInfo.nodeKeyComparer).forEach(function (finding) {
                entries.push(finding);
            });
    
            array.forEach(candidates, function (item) {
                if (isVisible(item)) {
                    item.set('result', 'A');
                    topic.publish("/qc/FindingClick", item);
                };
            });
    
            this.transcribe();
        },
    
    
        _setPartTypeAttr: function (value) {
            if (this.partType && value != this.partType) {
                domClass.remove(this.domNode, this.partType);
            };
            domClass.add(this.domNode, value);
            this.partType = value;
        },
    
        _setGroupKeysAttr: function (value) {
            if (value instanceof Array) {
                this.groupKeys = value;
            }
            else if (value) {
                this.groupKeys = StringUtil.parseStringList(value, true, ",");
            }
            else {
                this.groupKeys = null;
            }
        },
    
        getGroupKeyList: function () {
            var list = [];
            if (this.name) {
                list.push(this.name);
            };
            if (this.groupKeys) {
                list = list.concat(this.groupKeys);
            };
            return list;
        },
    
        _getTextAttr: function () {
            return this.innerLabel ? this.innerLabel.innerHTML : null;
        },
        _setTextAttr: function (value) {
            this.innerLabel.innerHTML = value;
        },
    
        _setShowHeaderAttr: function (value) {
            if (value) {
                domClass.remove(this.header, "hidden");
            }
            else {
                domClass.add(this.header, "hidden");
            };
        },
    
        writeNoteElement: function (writer, mode) {
            if (this._isDeferred) {
                if (mode == 'template') {
                    writer.copyElement(this.sourceXmlNode);
                    return 1;
                }
                else {
                    // not writing anything for deferred content in document mode
                    return 0;
                };
            };

            var writeContent = false;

            if (mode == 'template') {
                this.optimizeTemplate();
                writeContent = true;
            }
            else if (this.hasEntries()) {
                writeContent = true;
            };
            
            if (writeContent) {
                var tagName = this.partType.charAt(0).toUpperCase() + this.partType.substr(1);
                writer.beginElement(tagName);
                this.writeAllAttributes(writer, mode);
                this.writeBindings(writer, mode);
                this.writeComponentSettings(writer, mode);
                var count = this.writeNoteChildren(writer, mode);
                writer.endElement();
                return count + 1;
            };

            return 0;
        },
    
        writeNoteAttributes: function (writer, mode) {
            var heading = (this.get('text') || '').toLowerCase().replace(':', '');
    
            writer.attribute('id', this.elementId || '', '');
            writer.attribute('Name', this.name || '', '');
            writer.attribute('Text', this.get('text') || '', '');
            writer.attribute('GroupKeys', this.groupKeys && this.groupKeys.length > 0 ? this.groupKeys.join(',') : '', '');
    
            writer.attribute('ImpliedPrefixes', this.impliedPrefixes || '', '');
            writer.attribute('ImpliedWords', this.impliedWords || '', '');
            writer.attribute('ShowEmpty', this.get('showEmpty') || 'false', 'false');
            writer.attribute('Anchor', this.get('anchor') || '', '');
            writer.attribute('GroupingRule', this.get('groupingRule') || '', '');
            writer.attribute('FreeTextMedcinId', this.get('freeTextMedcinId') || 0, 0);
            writer.attribute('StyleClass', this.get('styleClass') || '', '');
    
            // applyPrefix and forcePrefix are deprecated and will be removed in a future version
            writer.attribute('ApplyPrefix', this.get('applyPrefix') || '', '');
            writer.attribute('ForcePrefix', this.get('forcePrefix') || '', '');

            writer.attribute('PrefixAction', this.haveOwnProperty('prefixAction') ? this.prefixAction : 0, 0);
            writer.attribute('PrefixValue', this.haveOwnProperty('prefixValue') ? this.prefixValue : '', '');

            writer.attribute('FindingPlacement', this.haveOwnProperty('findingPlacement') ? this.findingPlacement : '', '');
            writer.attribute('ItemEntryClass', this.itemEntryClass || '', '');
            writer.attribute('LayoutColumns', this.layoutColumns || 0, 0);
            writer.attribute('EntryStyle', this.entryStyle || '', '');
            writer.attribute('ContentHidingDisabled', this.contentHidingDisabled || 'false', 'false');

            writer.attribute('PlacementId', this.placementId || '', '');
            writer.attribute('Position', this.position || '', '');
            writer.attribute('AutoPrompt', this.haveOwnProperty('autoPrompt') ? this.autoPrompt : 'none', 'none');

            writer.attribute('FormMergePlacement', this.haveOwnProperty('formMergePlacement') ? this.formMergePlacement : '', '');

            writer.attribute('DeferLoad', this.deferLoad, false);
            writer.attribute('ProblemGroupingBehavior', this.get('problemGroupingBehavior') || 'none', 'none');

            if (this.problemMedcinId) {
                writer.attribute('ProblemMedcinId', this.problemMedcinId || 0, 0);
                writer.attribute('ProblemText', this.problemText || '', '');
            };

            writer.attribute('AutoPopulate', this.autoPopulate, false);

            writer.attribute('ContextMedcinId', this.contextMedcinId || 0, 0);

            //writer.attribute('AutoRollupThreshold', this.autoRollupThreshold || 0, 0);
        },
    
        getClosestPart: function (partType) {
            return partType == this.partType ? this : this.inherited(arguments);
        },
    
        getItem: function () {
            var selection = this.getEditorSelection();
            if (selection && selection.containsWidget(this) && selection.getItemCount() > 1) {
                return selection;
            }
            else {
                return { type: this.get('partType'), text: this.get('text'), node: this.domNode, level: this.partLevel };
            };
        },
    
        getDropAction: function (source, evt) {
            switch (source.type || 'unknown') {
                case "finding":
                    return source.node ? 'move' : null;
    
                case "chapter":
                case "section":
                case "group":
                case "noteElement":
                case "selection":
                case "findingGroup":
                    return 'move';
    
                case "list":
                case "term":
                case "element":
                case "image":
                case "macro":
                    return 'add';
                default:
                    return null;
            };
        },
    
        isPartHeader: function (targetNode) {
            return targetNode && (domClass.contains(targetNode, this.partType + 'Header') || (targetNode.parentNode && targetNode.parentNode.nodeType == 1 && domClass.contains(targetNode.parentNode, this.partType + 'Header')));
        },
    
        getDropPlacement: function (evt) {
            if (this.isPartHeader(evt.target)) {
                return { node: this.containerNode, pos: "first" };
            }
    
            var p = { x: evt.clientX, y: evt.clientY };
            var list = query(".noteElement", this.containerNode);
            var sealedBlock = null;
            var n = 0;
            var len = list.length;
            var targetNode = null;
            var targetPos = '';
            var r = null;
            var h = 0;
            while (n < len && !targetPos) {
                targetNode = list[n];
                r = domGeometry.position(targetNode);
                if (p.y < r.y - 2) {
                    targetPos = 'before';
                }
                else if (p.y >= r.y && p.y <= r.y + r.h) {
                    if (p.x < r.x + (r.w / 2)) {
                        targetPos = 'before';
                    }
                    else if (p.x < r.x + r.w) {
                        targetPos = 'after'
                    }
                    else {
                        n++;
                    }
                }
                else {
                    n++;
                };
            };
            if (targetPos) {
                targetNode = core.ancestorNodeByClass(list[n], 'sealed', true) || list[n];
                return { node: targetNode, pos: targetPos };
            }
            else {
                return { node: this.containerNode, pos: "last" };
            };

    
            //for (var n = 0; n < list.length; n++) {
            //    var rect = domGeometry.position(list[n]);
            //    var res = {};
            //    if ((p.x < rect.x && p.y >= rect.y && p.y <= rect.y + rect.h) || (p.y < rect.y - 2)) {
            //        sealedBlock = core.ancestorNodeByClass(list[n], 'sealed', true);
            //        if (sealedBlock) {
            //            return { node: sealedBlock, pos: "before" };
            //        }
            //        else {
            //            return { node: list[n], pos: "before" };
            //        }
            //    };
            //}
    
            //return { node: this.containerNode, pos: "last" };
        },
    
        getPartPlacement: function (source, evt) {
            var targetLevel = this.partLevel || 0;
            var sourceLevel = source.level || targetLevel + 1;
    
            var placement = { node: this.domNode, pos: 'last' };
    
            if (sourceLevel < targetLevel) {
                var parent = core.ancestorWidgetByClass(this.domNode, 'part');
                if (parent) {
                    placement = parent.getPartPlacement(source, evt);
                }
                else {
                    placement.node = this.domNode;
                    placement.pos = 'before';
                };
            }
            else if (sourceLevel == targetLevel) {
                placement.node = this.domNode;
                placement.pos = this.isPartHeader(evt.target) ? 'before' : 'after';
            }
            else {
                placement.node = this.containerNode;
                if (this.partType == 'document') {
                    var box = domGeometry.position(this.domNode);
                    placement.pos = evt.clientY <= box.y + box.h / 2 ? 'first' : 'last';
                }
                else {
                    placement.pos = this.isPartHeader(evt.target) ? 'first' : 'last';
                }
            };
    
            return placement;
        },
    
        dropDelete: function (source) {
            if (this.getViewMode() == 'design') {
                this.destroyRecursive();
            }
            else if (domClass.contains(this.domNode, 'problemSection')) {
                this.destroyRecursive();
                topic.publish('/qc/NoteChanged');
            }
            else if (!domClass.contains(this.domNode, 'lstDocumentTemplate')) {
                this.destroyRecursive();
            }
            else {
                this.getChildNoteElements().forEach(function (child) {
                    child.dropDelete();
                });
                //this.clearFindings();
            };
        },
    
        doDrop: function (source, evt) {
            var p = null;
            var mySection = null;
            switch (source.type || 'unknown') {
                case "finding":
                case "findingGroup":
                    p = this.getDropPlacement(evt);
                    var sourceFinding = registry.byNode(source.node);
                    sourceFinding.moveTo(p.node, p.pos);
                    break;
    
                case "noteElement":
                    if (source.inline) {
                        p = this.getDropPlacement(evt);
                        registry.byNode(source.node).moveTo(p.node, p.pos);
                    }
                    else if (domClass.contains(evt.target, 'groupHeader') || domClass.contains(evt.target, 'innerLabel')) {
                        domConstruct.place(source.node, this.containerNode, "first");
                    }
                    else {
                        domConstruct.place(source.node, this.containerNode, "last");
                    };
                    break;
    
                case "term":
                case "element":
                case "image":
                case "macro":
                    p = this.getDropPlacement(evt);
                    topic.publish("/qc/AddToNote", source, p.node, p.pos);
                    break;
    
                case "chapter":
                case "section":
                case "group":
                    p = this.getPartPlacement(source, evt);
                    domConstruct.place(source.node, p.node, p.pos);
                    topic.publish("/qc/NoteChanged");
                    var anchorWidget = registry.byNode(source.node);
                    if (anchorWidget && anchorWidget.get('anchor')) {
                        topic.publish("/noteEditor/AnchorsChanged");
                    };
                    break;
    
                case "list":
                    topic.publish("/qc/AddToNote", source);
                    break;
    
                case "selection":
                    var level = source.getHighestPartLevel();
                    if (level >= 0) {
                        source.level = level;
                        p = this.getPartPlacement(source, evt);
                    }
                    else {
                        p = this.getDropPlacement(evt);
                    };
                    source.moveTo(p.node, p.pos);
                    break;
    
                default:
                    return;
            };
        },
    
        createTranscriptionContext: function (currentContext) {
            if (!currentContext || currentContext.empty) {
                var parent = this.getParentNoteElement();
                if (parent) {
                    currentContext = parent.createTranscriptionContext();
                }
                else {
                    currentContext = {};
                }
            };
    
            var myPrefixList = this.impliedPrefixes ? StringUtil.parseStringList(this.impliedPrefixes) : [];
            var myWordList = this.impliedWords ? StringUtil.parseStringList(this.impliedWords) : [];
            var context = {
                impliedPrefixes: myPrefixList.concat(currentContext.impliedPrefixes || []),
                impliedWords: myWordList.concat(currentContext.impliedWords || []),
                termContext: currentContext.termContext || [],
                lastTerm: currentContext.lastTerm || ''
            };

            if (this.contextNodeKey) {
                context.termContext.push({ medcinId: this.contextMedcinId, nodeKey: this.contextNodeKey, domNode: this.domNode });
            };
    
            return context;
        },
    
        expand: function () {
            domClass.remove(this.domNode, 'collapsed');
        },
    
        collapse: function () {
            domClass.add(this.domNode, 'collapsed');
        },
    
        toggleExpansion: function () {
            if (domClass.contains(this.domNode, 'collapsed')) {
                this.expand();
            }
            else {
                this.collapse();
                this.userCollapsed = true;
            };
        },
    
        merge: function (other, sourceClass) {
            if (other.partType == this.partType) {
                array.forEach(other.getChildren(), function (child) {
                    this.addElement(child, 'self', child.sourceXmlNode ? child.sourceXmlNode.getAttribute('Position') || 'last' : 'last', true, sourceClass);
                }, this);
            };
            return this;
        },
    
        saveContent: function () {
            var onSave = lang.hitch(this, function (parms) {
                switch (parms.type) {
                    case 'list':
                        parms.data = this.toFindingList(parms);
                        break;
                    case 'element':
                        var writer = new XmlWriter({ parms: parms });
                        writer.beginElement('Content');
                        this.writeNoteElement(writer, 'template');
                        writer.endElement();
                        parms.data = writer.toString();
                        break;
                    default:
                        return false;
                }
    
    
                parms.mimeType = 'text/xml';

                request(core.serviceURL('Quippe/ContentLibrary/Save?DataFormat=JSON'), {
                    data: parms,
                    handleAs: 'json',
					method: 'POST'
                }).then(function(data){
                    if (data.error) {
                        core.showError(data.error.message);
                    }
                    else {
                        topic.publish('/qc/ContentLibrary/Changed');
                    }
                }, function(err){ core.showError(err) });

            });
    
            var types = [];
            types.push({
                name: 'element',
                caption: 'Note Content',
                options: [
                    { name: 'includeGrouping', caption: 'Include section/group placement', value: true }
                ]
            });
            if (query('.finding', this.containerNode).length > 0) {
                types.push({
                    name: 'list',
                    caption: 'Finding List',
                    options: [
                    { name: 'includeDetails', caption: 'Include entry details' },
                    { name: 'includeGrouping', caption: 'Include section/group placement' }
                ]
                });
            };
    
            core.doDialog(SaveContentDialog, { types: types, defaultType: 'element', callback: onSave });
        },
    
        toFindingList: function (parms) {
            parms = parms || {};
            var finding = null;
            var w = new XmlWriter();
            w.beginElement("List");
    
            query(".finding", this.containerNode)
                .map(registry.byNode)
                .forEach(function (findingWidget) {
                    finding = findingWidget.toFinding();
    
                    if (domClass.contains(findingWidget.domNode, 'freeText')) {
                        finding.text = (findingWidget.get('text') || '').trim();
                        if (!finding.text || core.MedcinInfo.isPlaceholderFreeText(finding.text)) {
                            finding = null;
                        }
                        else {
                            finding.overrideTranscription = true;
                        };
                    };
    
                    if (finding) {
                        w.beginElement('Item');
                        w.attribute('MedcinId', finding.medcinId || 0, '0');
                        w.attribute('Prefix', finding.prefix || '', '');
                        if (parms.includeDetails) {
                            w.attribute('Name', findingWidget.get('name') || '', '');
                            w.attribute('Result', finding.result || '', '');
                            w.attribute('Modifier', finding.modifier || '', '');
                            w.attribute('Status', finding.status || '', '');
                            w.attribute('Value', finding.value || '', '');
                            w.attribute('Unit', finding.unit || '', '');
                            w.attribute('Onset', finding.onset || '', '');
                            w.attribute('Duration', finding.duration || '', '');
                            w.attribute('Episode', finding.episode || '', '');
                            w.attribute('Timing', finding.timing || '', '');
                            w.attribute('Notation', finding.notation || '', '');
                        };
                        if (parms.includeGrouping) {
                            var keys = findingWidget.getContainerGroupKeys();
                            w.attribute('SectionId', keys.sectionId, '');
                            w.attribute('GroupId', keys.groupId, '');
                            w.attribute('PlacementId', keys.placementId, '');
                        };
                        if (finding.overrideTranscription && finding.text) {
                            w.attribute('Text', finding.text || '', '');
                            w.attribute('OverrideTranscription', 'true');
                        };
                        w.endElement();
                    };
                }
            );
            w.endElement();
    
            return w.toString();
        },
    
        toggleSelection: function (evt) {
            if (core.ancestorNodeByClass(evt.target, 'innerLabel', true)) {
                this.inherited(arguments);
            };
        },

		_getAutoPromptAttr: function () {
            return this.getInheritedProperty('autoPrompt', '');
        },
        _setAutoPromptAttr: function (value) {
            this.autoPrompt = value == 'inherited' ? '' : value;
        },

        parseXmlChildElements: function (widget, xmlNode, sourceClass, r) {
            if (this._isDeferred) {
                return;
            };

            this.parseBindings(xmlNode);
            var logName = this.name || this.get('text') || this.id;

            if (this._canDefer()) {
                this._isDeferred = true;
                domClass.add(this.domNode, 'deferredContent');
                domClass.add(this.domNode, 'hidden');
                topic.publish('/qc/ContentDeferred', this);
                this._resolveDeferredContent = lang.hitch(this, function (suppressNotify) {
                    this.deferLoad = false;
                    this._isDeferred = false;
                    domClass.remove(this.domNode, 'deferredContent');

                    this.parseXmlChildElements(widget, xmlNode, sourceClass, true);

                    if (!suppressNotify) {
                        topic.publish('/qc/DeferredContentResolved', this);
                        topic.publish('/qc/ContentLoaded', this);
                    };

                    this._onDeferredContentResolved();
                    delete this._resolveDeferredContent;

                    var part = this.getContainingPart();
                    if (part && part.updateDisplay) {
                        part.updateDisplay();
                    }
                    else {
                        this.updateDisplay();
                    };
                });
                return;
            };

    		this.parseComponentSettings(xmlNode);
    		this.inherited(arguments);
        },

        _onDeferredContentResolved: function () {
        },

        _canDefer: function () {
            return this.deferLoad && core.settings.enableDeferredContent;
        },
    
        _pgGetPropertiesX: function (propertyGrid) {
            var list = this.inherited(arguments);
            list.push({ name: 'autoPrompt', options: '[RN;DX]', group: 'Behavior', isShareable: true, description: core.getI18n('tooltipAutoPrompt') });
            list.push(this._pgPropDef_conditionalStyles());
            list.push(this._pgPropDef_propertyBindings());

            if (this.isFormElement()) {
                list.push({ name: 'formMergePlacement', caption: 'Note Placement', isAdvanced: true, isShareable: true, group: 'Behavior', description: core.getI18n('tooltipPlaceAt') });
            };

            //list.push({ name: 'prefixSettings', type: 'object', editorCallback: lang.hitch(this, this.editPrefixSettings), readOnly: true, showAsJson: true, group: 'Behavior' });

            return list;
        },

        optimizeTemplate: function () {
            this.deferLoad = this.canDeferLoad();
        },

        canDeferLoad: function () {
            // determine if we can defer the loading of this group...
            //   is not contained within a deferred group
            //   must have a single conditional style binding to the "hidden" class
            //   style rule must execute, meaning all references are resolved
            //   must be initially in the "hidden" state
            //   style rule cannot be self referencing or refer to any child items of this group

            var parent = this.getContainingPart();
            while (parent) {
                if (parent.deferLoad) {
                    return false;
                }
                else if (!parent._allowDeferredChildren) {
                    return false;
                }
                else {
                    parent = parent.getContainingPart();
                }
            };

            if (core.ancestorNodeByClass(this.domNode, 'noDeferredLoading', true)) {
                return false;
            }

            if ((this.get("groupKeys") && this.get("groupKeys").length > 0) || this.get("groupingRule")) {
                return false;
            }

            var bindings = (this.bindings || []).filter(function (x) { return x.bindingType == 'styleClass' && x.bindTo == 'hidden' });
            if (bindings.length != 1) {
                return false;
            };

            var binding = bindings[0];
            if (!binding.execute()) {
                return false;
            };

            if (!domClass.contains(this.domNode, 'hidden')) {
                return false;
            };

            var ignoreRefs = /^(Patient|Encounter|Provider)$/
            var refName = '';
            var refTarget = null;
            for (refName in binding.references) {
                if (refName == 'Owner' || refName == this.name) {
                    return false;
                };

                if (!ignoreRefs.test(refName)) {
                    refTarget = binding.references[refName].target;

                    if (!refTarget) {
                        return false;
                    };

                    if (refTarget.isContainedBy && refTarget.isContainedBy(this)) {
                        return false;
                    };
                };
            };

            return true;

        },

	    // === property definitions === 
        _pgPropDef_name: function () {
            var def = this.inherited(arguments);
            def.setter = lang.hitch(this, function (value) {
                this.set('name', value);
                topic.publish('/qc/OnGroupingRulesChanged');
            });
            return def;
        },

        _pgPropDef_text: function () {
            return {
                name: 'text',
                caption: 'Heading',
                description: core.getI18n('tooltipHeading'),
                isShareable: true
            };
        },

	    _pgPropDef_level: function() {
	        return {
	            name: 'level',
	            group: 'Style',
	            description: core.getI18n('tooltipLevel'),
	            options: '[chapter=Chapter;section=Section;group=Group]',
	            defaultValue: this.partType || '',
	            getter: lang.hitch(this, function() {
	                return this.partType;
	            }),
	            setter: lang.hitch(this, function (value) {
	                if (value) {
	                    var oldPart = this.partType;
	                    domClass.remove(this.domNode, oldPart);
	                    domClass.remove(this.header, oldPart + 'Header');
	                    domClass.remove(this.containerNode, oldPart + 'Content');

	                    var newPart = value.toLowerCase();
	                    domClass.add(this.domNode, newPart);
	                    domClass.add(this.header, newPart + 'Header');
	                    domClass.add(this.containerNode, newPart + 'Content');
	                    this.partType = newPart;

	                    if (oldPart != newPart) {
	                        var partClass = require('qc/note/' + value.substring(0, 1).toUpperCase() + value.substring(1));
	                        this.partLevel = new partClass().partLevel;
	                    }
	                };
	            })
	        };
	    },

	    _pgPropDef_anchor: function () {
	        return {
	            name: 'anchor',
                caption: 'Nav Link',
	            group: 'Behavior',
	            description: core.getI18n('tooltipNavLink'),
	            setter: lang.hitch(this, function (value) {
	                this.set('anchor', value);
	                topic.publish("/noteEditor/AnchorsChanged");
	            })
	        };
	    },

	    _pgPropDef_showEmpty: function () {
	        return {
	            name: 'showEmpty',
	            group: 'Behavior',
	            description: core.getI18n('tooltipShowEmpty'),
                type: 'boolean',
                isShareable: true,
                defaultValue: false
	        };
	    },

	    _pgPropDef_freeTextMedcinId: function () {
	        return {
	            name: 'freeTextMedcinId',
	            group: 'Behavior',
	            description: core.getI18n('tooltipFreeTextMedcinId'),
	            type: 'integer',
	            isShareable: true,
                isAdvanced: true,
	            defaultValue: 0
	        };
	    },

	    _pgPropDef_impliedPrefixes: function () {
	        return {
	            name: 'impliedPrefixes',
	            group: 'Text',
	            description: core.getI18n('tooltipImpliedPrefixes'),
	            isShareable: true,
	            isAdvanced: true
	        };
	    },

	    _pgPropDef_contextMedcinId: function() {
	        return {
	            name: 'contextMedcinId',
	            group: 'Text',
	            type: 'integer',
	            editorDialogType: 'qc/design/FindingChooserDialog',
	            editorDialogSettings: {
	                showFindingName: false,
                    findingNameRequired: false
	            },
	            description: core.getI18n('tooltipContextMedcinId'),
	            isShareable: true,
	            isAdvanced: true,
	            parser: function(termInfo) {
	                if (typeof termInfo == 'string') {
	                    var medcinId = parseInt(termInfo, 10);
	                    if (isNaN(medcinId)) {
	                        return 0;
	                    }
	                    else {
	                        return medcinId;
	                    }
	                }
	                else {
	                    return termInfo;
	                }
	            },
	            formatter: function (termInfo) {
	                if (!termInfo) {
                        return 0
	                }
	                else if (typeof termInfo == 'number') {
	                    return termInfo;
	                }
	                else if (termInfo.medcinId) {
                        return termInfo.medcinId
	                }
	                else {
	                    return 0;
	                }
	            },
	            setter: lang.hitch(this, function (value) {
	                var medcinId = value ? typeof value == 'number' ? value : value.medcinId || 0 : 0;
	                if (medcinId != this.contextMedcinId) {
	                    if (medcinId == 0) {
	                        this.contextMedcinId = 0;
	                        this.contextNodeKey = '';
	                    }
	                    else {
	                        this.contextMedcinId = medcinId;
	                        var self = this;
	                        request.get(core.serviceURL('Quippe/NoteBuilder/Resolve'), {
	                            query: { medcinId: medcinId, dataFormat: 'JSON' },
	                            handleAs: 'json'
	                        }).then(function (data) {
	                            if (data.term && data.term.nodeKey) {
	                                self.contextNodeKey = data.term.nodeKey;
	                                self.transcribe();
	                            }
	                        });
	                    }
	                }
	                
	            })
	        };
	    },

	    _pgPropDef_groupKeys: function () {
	        return {
	            name: 'groupKeys',
	            group: 'Content Placement',
	            description: core.getI18n('tooltipGroupKeys'),
	            isAdvanced: true,
	            setter: lang.hitch(this, function (value) {
	                if (this.get('groupKeys') != value) {
	                    this.set('groupKeys', ((value || '').toString().trim()));
	                    topic.publish('/qc/OnGroupingRulesChanged');
	                };
	            })
	        };
	    },

	    _pgPropDef_groupingRule: function () {
	        return {
	            name: 'groupingRule',
	            group: 'Content Placement',
	            description: core.getI18n('tooltipGroupingRule'),
	            isAdvanced: true,
	            setter: lang.hitch(this, function (value) {
	                if (this.get('groupingRule') != value) {
	                    this.set('groupingRule', ((value || '').toString().trim()));
	                    topic.publish('/qc/OnGroupingRulesChanged');
	                };
	            }),
	            validator: function (value, propDef) {
	                if (!value) {
	                    return { isValid: true };
	                };
	                var editor = core.getNoteEditor();
	                if (editor) {
	                    var result = editor.compileGroupingRule(value, true);
	                    if (result.success) {
	                        return { isValid: true };
	                    }
	                    else {
	                        return { isValid: false, message: 'Syntax error in grouping rule' };
	                    }
	                }
	            }
	        };
	    },

	    _pgPropDef_findingPlacement: function () {
	        return {
	            name: 'findingPlacement',
	            caption: 'Place Findings',
	            group: 'Content Placement',
	            description: core.getI18n('tooltipFindingPlacement'),
	            type: 'integer',
	            options: '[0=By Hierarchy;1=As Entered;2=Alphabetically;3=Alphabetically within Context]',
                isShareable: true,
                isAdvanced: true,
                defaultValue: 0
	        };
	    },

	    _pgPropDef_layoutColumns: function () {
	        return {
	            name: 'layoutColumns',
	            caption: 'Columns',
	            group: 'Style',
	            description: core.getI18n('tooltipColumns'),
	            type: 'integer',
	            isShareable: true,
	            isAdvanced: true,
                defaultValue: 0
	        };
	    },

	    _pgPropDef_placementId: function () {
	        var container = this.getContainingPart();
	        if (container && container.partType == 'document') {
	            return {
	                name: 'placementId',
	                caption: 'Place At',
	                group: 'Behavior',
	                description: core.getI18n('tooltipPlaceAt'),
	                isShareable: true,
	                isAdvanced: true,
	                reloadOnChange: true,
	                setter: lang.hitch(this, function (value) {
	                    var placementId = value || '';
	                    this.set('placementId', placementId);
	                    if (!placementId) {
	                        this.set('position', '');
	                    }
	                })
	            }
	        };
	    },

	    _pgPropDef_position: function () {
	        if (this._pgPropDef_placementId() && this.get('placementId')) {
	            return {
	                name: 'position',
	                group: 'Behavior',
	                description: core.getI18n('tooltipPosition'),
	                options: '[;first;last;before;after]',
	                isShareable: true,
	                isAdvanced: true
	            }
	        };
	    },

	    _pgPropDef_prefixActionOwnValue: function () {
	        return {
	            name: 'prefixActionOwnValue',
	            caption: 'Prefix Action',
	            group: 'Behavior',
	            description: core.getI18n('tooltipPrefixAction'),
	            type: 'integer',
	            options: '[0=inherited;1=none;2=add if needed;3=overwrite;4=remove;5=custom rule]',
	            isShareable: true,
	            isAdvanced: true,
	            reloadOnChange: true,
                defaultValue: 0
	        }
	    },

	    _pgPropDef_prefixValue: function () {
	        var def = {
	            name: 'prefixValue',
                group: 'Behavior',
	            isShareable: true,
	            isAdvanced: true
	        }
	        var prefixAction = this.get('prefixActionOwnValue');
	        if (prefixAction == 2 || prefixAction == 3) {
	            def.caption = 'Prefix Value';
	            def.description = core.getI18n('tooltipPrefixValue');
	            return def;
	        }
	        else if (prefixAction == 5) {
	            def.caption = 'Prefix Rule';
	            def.description = core.getI18n('tooltipPrefixRule');
	            return def;
	        }
	        else {
	            return null;
	        }
	    },

	    _pgPropDef_autoPrompt: function () {
	        return {
	            name: 'autoPrompt',
	            group: 'Behavior',
	            description: core.getI18n('tooltipAutoPrompt'),
	            options: '[;RN=RN;DX=DX;none=None]',
	            isShareable: true,
                isAdvanced: true
	        }
	    },

	    //_pgPropDef_autoRollupThreshold: function () {
	    //    return {
	    //        name: 'autoRollupThreshold',
	    //        group: 'Behavior',
	    //        isShareable: true,
	    //        isAdvanced: true,
        //        defaultValue: 0
	    //    }
	    //},

	    _pgPropDef_formMergePlacement: function() {
	        if (this.isFormElement()) {
	            return {
	                name: 'formMergePlacement',
	                caption: 'Note Placement',
	                isAdvanced: true,
	                isShareable: true,
	                group: 'Behavior',
	                description: core.getI18n('tooltipPlaceAt')
	            };
	        }
	        else {
	            return null;
	        }
	    },

	    _pgPropDef_problemGroupingBehavior: function () {
	        return {
	            name: 'problemGroupingBehavior',
                caption: 'Problem Grouping',
	            group: 'Behavior',
	            description: 'Controls the participation of this container in the problem grouping workflow',
	            options: '[none=None;controller=Problem Source;copy=Copy Findings;copyAll=Copy Findings and Subgroups;placeholder=Target Location]',
	            isShareable: true,
	            isAdvanced: true,
	            defaultValue: 'none'
	        }
	    },

	    _pgPropDef_autoPopulate: function() {
	        return {
	            name: 'autoPopulate',
	            isAdvanced: true,
	            isShareable: true,
	            group: 'Behavior',
	            description: 'Indicates whether we should attempt to prefill data for the patient into this section when the encounter is first created',
	            defaultValue: false,
                type: 'boolean'
	        };
	    },

	    _getProblemGroupingBehaviorAttr: function () {
	        if (this.domNode) {
	            if (domClass.contains(this.domNode, 'problemSectionSubgroup')) {
	                if (domClass.contains(this.domNode, 'problemSectionDisableRollup')) {
	                    return 'copyAll';
	                }
	                else {
	                    return 'copy';
	                }
	            }
	            else if (domClass.contains(this.domNode, 'problemSectionController')) {
	                return 'controller';
	            }
	            else if (domClass.contains(this.domNode, 'problemSectionPlaceholder')) {
	                return 'placeholder';
	            }
	            else {
	                return 'none';
	            }
	        }
	        else {
	            return this.problemGroupingBehavior || '';
	        };
	    },

	    _setProblemGroupingBehaviorAttr: function (value) {
	        value = value || '';
	        var rxClassNames = /\bproblemSection(Controller|Subgroup|DisableRollup|Placeholder)\b/;
	        domClass.remove(this.domNode, this.domNode.className.split(' ').filter(function (x) { return rxClassNames.test(x) }));
	        switch (value) {
	            case 'controller':
	                domClass.add(this.domNode, 'problemSectionController');
	                break;
	            case 'copy':
	                domClass.add(this.domNode, 'problemSectionSubgroup');
	                break;
	            case 'copyAll':
	                domClass.add(this.domNode, 'problemSectionSubgroup');
	                domClass.add(this.domNode, 'problemSectionDisableRollup');
	                break;
	            case 'placeholder':
	                domClass.add(this.domNode, 'problemSectionPlaceholder');
	                break;
	            default:
	                value = '';
	                break;
	        };
	        this.problemGroupingBehavior = value;
	    }
    });
});