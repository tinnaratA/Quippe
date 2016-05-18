define([
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/query",
    "qc/_core",
	"qc/StyleUtil",
    "qc/design/_PropertyGridSupport",
	"qc/note/FindingTable/_CellWidgets"
], function (_WidgetBase, registry, array, declare, lang, domClass, domStyle, query, core, StyleUtil, _PropertyGridSupport, _CellWidgets) {
    return declare("qc.note.FindingTable._SelectionRange", [_WidgetBase, _PropertyGridSupport], {
        owner: null,
    
        getSelectedNodes: function () {
            return query('.rangeSelection', this.owner.domNode);
        },
    
        getSelectedNode: function () {
            return this.getSelectedNodes()[0] || null;
        },
    
        getSelectionType: function () {
            var nodes = this.getSelectedNodes();
            if (nodes.length > 1) {
                return 'range';
            }
            else if (nodes.length == 1) {
                return { 'table': 'table', 'tr': 'row', 'col': 'col', 'td': 'cell'}[nodes[0].tagName.toLowerCase()] || '';
            }
            else {
                return '';
            };
        },
    
        isVectorType: function () {
            return array.indexOf(['row', 'col', 'table'], this.getSelectionType()) >= 0;
        },
    
        getTargetCells: function () {
            var cells = null;
            switch (this.getSelectionType()) {
                case 'cell':
                    cells = this.getSelectedNodes();
                    break;
                case 'range':
                    cells = this.getSelectedNodes();
                    break;
                case 'table':
                    cells = query('td', this.owner.table).filter(function (node) { return node.dataRow > 0 && node.dataCol > 0 });
                    break;
                case 'row':
                    var rowNode = this.getSelectedNode();
                    cells = query('td', rowNode).filter(function (node) { return node.dataRow > 0 && node.dataCol > 0 });
                    break;
                case 'col':
                    var colNode = this.getSelectedNode();
                    var c = colNode.dataCol;
                    cells = query('td', this.owner.table).filter(function (cell) { return cell.dataRow > 0 && cell.dataCol == c });
                    break;
                default:
                    cells = [];
            };
            return cells;
        },
    
        getTargetRows: function () {
            switch (this.getSelectionType()) {
                case 'row':
                    return [this.getSelectedNode()];
                case 'table':
                    return array.filter(this.owner.table.rows, function (row) { return row.dataRow > 0 });
                case 'range':
                    return array.filter(this.owner.table.rows, function (row) { return row.dataRow > 0 && domClass.contains(row, 'rangeSelection') });
                default:
                    return [];
            };
        },
    
    
        getTargetCols: function () {
            switch (this.getSelectionType()) {
                case 'col':
                    return [this.getSelectedNode()];
                case 'table':
                    return array.filter(this.owner.colGroup.childNodes, function (col) { return col.dataCol > 0 });
                case 'range':
                    return array.filter(this.owner.colGroup.childNodes, function (col) { return col.dataCol > 0 && domClass.contains(col, 'rangeSelection') });
                default:
                    return [];
            };
        },
    
        getBounds: function () {
            switch (this.getSelectionType()) {
                case 'cell':
                    return this.getTargetBounds();
                case 'range':
                    return this.getTargetBounds();
                case 'row':
                    var rowNode = this.getSelectedNode();
                    return this.owner.bounds(rowNode.dataRow, 1, rowNode.dataRow, -1);
                case 'col':
                    var colNode = this.getSelectedNode();
                    return this.owner.bounds(1, colNode.dataCol, -1, colNode.dataCol);
                case 'table':
                    return this.owner.bounds();
                default:
                    return null;
            };
        },
    
        getTargetBounds: function () {
            var r0 = null;
            var c0 = null;
            var r1 = null;
            var c1 = null;
            array.forEach(this.getTargetCells(), function (cell) {
                if (r0 == null || cell.dataRow < r0) {
                    r0 = cell.dataRow;
                };
                if (c0 == null || cell.dataCol < c0) {
                    c0 = cell.dataCol;
                };
                if (r1 == null || cell.dataRow > r1) {
                    r1 = cell.dataRow;
                };
                if (c1 == null || cell.dataCol > c1) {
                    c1 = cell.dataCol;
                };
            });
            return this.owner.bounds(r0, c0, r1, c1);
        },
    
        getTargetWidgets: function () {
            var widgets = [];
            var cells = this.getTargetCells();
            array.forEach(cells, function (cell) {
                if (cell.childNodes.length > 0) {
                    var widget = registry.byNode(cell.childNodes[0]);
                    if (widget) {
                        widgets.push(widget);
                    };
                };
            });
            return widgets;
        },
    
        _pgGetProperties: function () {
            var list = [];
            var appliesToNode = false;
    
            var selType = this.getSelectionType();
            if (selType == 'table') {
                array.forEach(this.owner._pgGetProperties(), function (prop) {
                    prop.appliesToOwner = true;
                    list.push(prop);
                });
            };
    
            switch (selType) {
                case 'table':
                    list.push({ name: 'tableStyle', caption: 'Table Style', group: 'Style', description: core.getI18n('tooltipTableStyle'), appliesToNode: true });
                    list.push({ name: 'rowStyle', caption: 'Row Style', group: 'Style', description: core.getI18n('tooltipRowStyle'), appliesToNode: true });
                    list.push({ name: 'colStyle', caption: 'Column Style', group: 'Style', description: core.getI18n('tooltipColumnStyle'), appliesToNode: true });
                    break;
                case 'row':
                    if (this._pgGetPropertyValue({ name: 'rowType' }) == 'template') {
                        list.push({ name: 'rowType', readOnly: true, description: core.getI18n('tooltipRowType'), appliesToNode: true });
                    }
                    else {
                        list.push({ name: 'rowType', options: '[=data;header=header;footer=footer;hidden=hidden]', appliesToNode: true, readOnly: false, description: core.getI18n('tooltipRowType') });
                    }
                    list.push({ name: 'rowStyle', caption: 'Row Style', group: 'Style', description: core.getI18n('tooltipRowStyle'), appliesToNode: true });
                    //appliesToNode = true;
                    break;
                case 'col':
                    if (this._pgGetPropertyValue({ name: 'colType' }) == 'template') {
                        list.push({ name: 'colType', readOnly: 'true', description: core.getI18n('tooltipColType'), appliesToNode: true });
                    }
                    else {
                        list.push({ name: 'colType', options: '[=data;header=header;footer=footer;hidden=hidden]', appliesToNode: true, readOnly: false, description: core.getI18n('tooltipColType') });
                    }
                    list.push({ name: 'colStyle', caption: 'Column Style', group: 'Style', description: core.getI18n('tooltipColumnStyle'), appliesToNode: true });
                    //appliesToNode = true;
                    break;
                default:
                    break;
            };
            list.push({ name: 'cellStyle', caption: '', group: 'Style', appliesToNode: true, description: core.getI18n('tooltipCellStyle'), appliesToNode: true });
    
    
            var nodeProps = list.map(function (x) { return x.name });
            var widgetProps = {};
            var targets = this.getTargetWidgets();
            array.forEach(this.getTargetWidgets(), function (widget, i) {
                array.forEach(widget._pgGetProperties(), function (info) {
                    if (nodeProps.indexOf(info.name) < 0) {
                        if (widgetProps[info.name]) {
                            widgetProps[info.name].count++;
                        }
                        else {
                            widgetProps[info.name] = info;
                            widgetProps[info.name].count = 1;
                            widgetProps[info.name].appliesToWidget = true;
                            widgetProps[info.name].appliesToNode = false; //appliesToNode;
                        }
                    };
                });
            });
            for (var p in widgetProps) {
                if (widgetProps[p].count == targets.length) {
                    list.push(widgetProps[p]);
                };
            };
    
            var entryTypes = '[;' + _CellWidgets.getWidgetTypes().join(';') + ']';
            list.push({ name: 'entryType', group: 'Data Entry', appliesToNode: true, options: entryTypes, reloadOnChange: true, allowAnyValue: true, description: core.getI18n('tooltipEntryType') });
            return list;
        },
    
        _pgGetPropertyValue: function (propInfo) {
            var getterName = '_pgGet_' + propInfo.name;
            if (this[getterName]) {
                return this[getterName]();
            };
    
            if (propInfo.appliesToOwner) {
                return this.owner.get(propInfo.name);
            };
    
            var value = null;
            if (propInfo.appliesToWidget) {
                var widgets = this.getTargetWidgets();
                value = widgets.length > 0 ? widgets[0].get(propInfo.name) : null;
                if (array.every(widgets, function (x) { return x.get(propInfo.name) == value })) {
                    return value;
                }
                else {
                    return null;
                }
            }
            else if (propInfo.appliesToNode) {
                var nodes = this.getSelectedNodes();
                value = nodes.length > 0 && nodes[0].data ? nodes[0].data[propInfo.name] : null;
                if (array.every(nodes, function (x) { return x.data && x.data[propInfo.name] == value })) {
                    return value;
                }
                else {
                    return null;
                }
            };
    
        },
    
        _pgSetPropertyValue: function (propInfo, value) {
            var setterName = '_pgSet_' + propInfo.name;
            if (this[setterName]) {
                this[setterName](value);
                return true;
            };
    
            if (propInfo.appliesToOwner) {
                return this.owner.set(propInfo.name, value);
            };
    
            if (propInfo.name == 'entryType') {
                var convert = lang.hitch(this.owner, this.owner.convertCellWidget);
                array.forEach(this.getTargetCells(), function (cell) {
                    convert(cell, value);
                });
            };
    
            if (propInfo.appliesToNode) {
                array.forEach(this.getSelectedNodes(), function (node) {
                    if (!node.data) {
                        node.data = {};
                    };
                    node.data[propInfo.name] = value;
                });
            };
    
            if (propInfo.appliesToWidget) {
                array.forEach(this.getTargetWidgets(), function (widget) {
                    widget.set(propInfo.name, value);
                });
            };
    
            if (propInfo.isCellStyleProp) {
                var sValue = (value || '').toString();
                if (propInfo.defaultUnit && sValue.match(/^\d+$/)) {
                    sValue = sValue + propInfo.defaultUnit;
                };
                array.forEach(this.getTargetCells(), function (cell) {
                    domStyle.set(cell, StyleUtil.toJsonName(propInfo.name), sValue);
                });
            };
    
    
            return true;
        },
    
        getNavigatorLabel: function () {
            var node = this.getSelectedNode();
            switch (this.getSelectionType()) {
                case 'table':
                    return 'Table';
                case 'row':
                    return 'Row ' + this.getSelectedNode().dataRow;
                case 'col':
                    return 'Column ' + this.owner.toBase26(node.dataCol);
                case 'cell':
                    return 'Cell ' + this.owner.rcToAddr(node.dataRow, node.dataCol);
                case 'range':
                    return 'Range';
                default:
                    return '';
            };
        },
        
        selectionCallback: function () {
            this.owner.setSelected(true, true);
            return this;
        },

        getDesigner: function() {
            return this;
        },

        getDesignerParent: function () {
            var wrapper = this.owner;
            wrapper.selectionCallback = lang.hitch(this, function () { this.owner.selectTable() });
            return wrapper;
        },

        getDesignableChildren: function() {
            return [];
        },

        isContiguous: function () {
            var bounds = this.getTargetBounds();
            var contains = function (cell) {
                return cell.dataRow >= bounds.r0 && cell.dataCol >= bounds.c0 && cell.dataRow <= bounds.r1 && cell.dataCol <= bounds.c1;
            };
            var selected = function (cell) {
                return domClass.contains(cell, 'rangeSelection');
            };
            var allCells = query('td', this.owner.table);
            var notContig = array.some(allCells, function (cell) {
                return (contains(cell) && !selected(cell)) || (!contains(cell) && selected(cell));
            });
            return !notContig;
        },
    
        containsMergedCells: function () {
            return array.some(this.getTargetCells(), function (cell) {
                return cell.getAttribute('colSpan') > 1 || cell.getAttribute('rowSpan') > 1;
            });
        },
    
        _pgGet_tableStyle: function () {
            return this.owner.table.getAttribute('style') || '';
        },
        _pgSet_tableStyle: function (value) {
            this.toggleAttribute(this.owner.table, 'style', value);
        },
    
    
    
        _pgGet_rowStyle: function () {
            return this.getSharedValue(this.getSelectedNodes(), function (node) { return node.data ? node.data.rowStyle : '' });
        },
        _pgSet_rowStyle: function (value) {
            array.forEach(this.getSelectedNodes(), function (node) {
                this.setNodeData(node, 'rowStyle', value);
            }, this);
            this.owner.updateRowStyles();
            return true;
        },
    
        _pgGet_colStyle: function () {
            return this.getSharedValue(this.getSelectedNodes(), function (node) { return node.data ? node.data.colStyle : '' });
        },
        _pgSet_colStyle: function (value) {
            array.forEach(this.getSelectedNodes(), function (node) {
                this.setNodeData(node, 'colStyle', value);
            }, this);
            this.owner.updateColStyles();
            return true;
        },
    
        _pgGet_cellStyle: function (value) {
            return this.getSharedValue(this.getSelectedNodes(), function (node) { return node.data ? node.data.cellStyle : '' });
        },
    
        _pgSet_cellStyle: function (value) {
            array.forEach(this.getSelectedNodes(), function (node) {
                this.setNodeData(node, 'cellStyle', value);
            }, this);
            this.owner.updateCellStyles();
        },
    
    
        getSharedValue: function (list, getter) {
            if (!list || list.length == 0) {
                return null;
            };
            var firstValue = getter(list[0]);
            for (i = 1, len = list.length; i < len; i++) {
                if (getter(list[i]) != firstValue) {
                    return null;
                };
            };
            return firstValue;
        },
    
        toggleAttribute: function (nodes, name, value) {
            array.forEach(core.forceArray(nodes), function (node) {
                if (value) {
                    node.setAttribute(name, value);
                }
                else {
                    node.removeAttribute(name);
                };
            });
        },
    
        _pgGet_rowType: function () {
            return this.getNodeData(this.getSelectedNode(), 'rowType');
        },
        _pgSet_rowType: function (value) {
            value = value || '';
            var node = this.getSelectedNode();
            var currentValue = this.getNodeData(node, 'rowType') || '';
            
            if (value != currentValue) {
                if (currentValue) {
                    domClass.remove(node, currentValue);
                };
                this.setNodeData(node, 'rowType', value);
                if (value) {
                    domClass.add(node, value);
                };
            };

        },
    
        _pgGet_colType: function () {
            return this.getNodeData(this.getSelectedNode(), 'colType');
        },
        _pgSet_colType: function (value) {
            value = value || '';
            var node = this.getSelectedNode();
            var currentValue = this.getNodeData(node, 'colType') || '';

            if (value != currentValue) {
                if (currentValue) {
                    domClass.remove(node, currentValue);
                };
                this.setNodeData(node, 'colType', value);
                if (value) {
                    domClass.add(node, value);
                };
                this.owner.forEachCell(this.owner.bounds(0, node.dataCol, this.owner.dataRows - 1, node.dataCol), function (cell) {
                    domClass.remove(cell, currentValue);
                    domClass.add(cell, value);
                });
            };
        },
    
        getNodeData: function (node, name) {
            return node && node.data ? node.data[name] : null;
        },
        setNodeData: function (node, name, value) {
            if (!node.data) {
                node.data = {};
            };
            node.data[name] = value;
        }

        
    
    });
});