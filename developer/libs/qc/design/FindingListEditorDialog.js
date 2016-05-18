define([
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
	"dojo/keys",
    "dojo/query",
    "dojo/text!qc/design/templates/FindingListEditorDialog.htm",
    "qc/_core",
    "qc/Dialog",
    "qc/MedcinTree"
], function (_WidgetsInTemplateMixin, BorderContainer, ContentPane, array, declare, event, lang, domClass, domConstruct, domStyle, keys, query, FindingListEditorDialogTemplate, core, Dialog, MedcinTree) {
    return declare("qc.design.FindingListEditorDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: 'Finding List Editor',
        templateString: FindingListEditorDialogTemplate,
        
        showListName: true,
        listName: '',
        listType: '',
        listNameRequired: true,
        showColumnHeaders: true,
    
        startup: function () {
            if (!this._started) {
                this.treeView.startup();
                this.treeView.browse();
                this.inherited(arguments);
            };
        },
    
        _getListNameAttr: function () {
            return this.txtListName.get('value');
        },
        _setListNameAttr: function (value) {
            this.txtListName.set('value', value);
        },
    
        _getListAttr: function () {
            var items = [];
            var table = this.table;
            var id = '';
            var text = '';
            for (var n = 0; n < table.rows.length; n++) {
                var row = table.rows[n];
                if (domClass.contains(row, 'data')) {
                    id = this.cellValue(row.cells[0]);
                    text = this.cellValue(row.cells[1]);
                    if (id || text) {
                        items.push({ id: id || text, text: text || id });
                    };
                };
            };
    
            return { name: this.get('listName'), listType: this.get('listType'), list: items, isOptionList: true };
        },
    
        _setListAttr: function (value) {
            if (value) {
                this.set('listName', value.name || '');
                this.set('listType', value.listType || '');
                this.renderTable(value.list || []);
            };
        },
    
        _setShowListNameAttr: function (value) {
            this.showListName = value ? true : false;
            domStyle.set(this.listNameNode, 'display', this.showListName ? 'block' : 'none');
        },
    
        _setListNameRequiredAttr: function (value) {
            this.listNameRequired = value ? true : false;
            if (this.listNameRequired) {
                this.set('showListName', true);
            };
        },
    
        renderTable: function (list) {
            list = list || [];
    
            var table = this.table;
            while (table.rows.length > 0) {
                table.deleteRow(-1);
            };
    
            var row = null;
            var cell = null;
    
            if (this.showColumnHeaders) {
                this.addRow('MedcinId', 'Text', 'header');
            };
    
            var rowCount = 0;
            array.forEach(list || [], function (item) {
                this.addRow(item.id, item.text, 'data');
                rowCount++;
            }, this);
    
            this._onChange();
        },
    
        addRow: function (id, text, rowClass, rowIndex) {
            rowClass = rowClass || 'data';
    
            if (rowIndex == undefined) {
                rowIndex = -1;
            };
            var row = this.table.insertRow(rowIndex);
            domClass.add(row, rowClass);
    
            var idCell = row.insertCell(-1);
            domClass.add(idCell, 'id');
            idCell.innerHTML = '<div class="cellData">' + (id || '&nbsp;') + '</div>';
    
            var textCell = row.insertCell(-1);
            domClass.add(textCell, 'text');
            textCell.innerHTML = '<div class="cellData">' + (text || '&nbsp;') + '</div>';
    
            if (rowClass == 'data') {
                textCell.childNodes[0].setAttribute('contentEditable', true);
                textCell.childNodes[0].setAttribute('role', 'textbox');
                textCell.childNodes[0].setAttribute('tabIndex', 1);
            };
    
            this._onChange();
            return row;
        },
    
        addItem: function (item) {
            var row = this.ensureBlankRow();
            row.cells[0].childNodes[0].innerHTML = (item.id || item.medcinId);
            row.cells[1].childNodes[0].innerHTML = (item.text);
            //this.ensureBlankRow();
            return row;
        },
    
        cellValue: function (cell) {
            var node = cell && cell.childNodes[0] ? cell.childNodes[0] : null;
            if (!node) {
                return '';
            };
    
            return (node.textContent || node.text || node.innerHTML).trim();
        },
    
        ensureBlankRow: function () {
            var table = this.table;
            if (table.rows.length <= 0) {
                return this.addRow();
            };
    
            var row = this.table.rows[this.table.rows.length - 1];
    
            var id = this.cellValue(row.cells[0]);
            var text = this.cellValue(row.cells[1]);
    
            if (id || text) {
                return this.addRow();
            }
            else {
                return row;
            };
        },
    
        getContextActions: function (item, widget, targetNode) {
            var actions = [];
            var row = core.ancestorNodeByClass(targetNode, 'data', true);
            if (row) {
                var rowIndex = row.rowIndex;
                fnInsert = lang.hitch(this, function () {
                    this.addRow('', '', 'data', rowIndex);
                });
                fnDelete = lang.hitch(this, function () {
                    this.table.deleteRow(rowIndex);
                    this.ensureBlankRow();
                    this._onChange();
                });
    
                actions.push({ label: 'Insert Row', onClick: fnInsert });
                actions.push({ label: 'Delete Row', onClick: fnDelete });
            };
            return actions;
        },
    
    
        _onChange: function () {
            this.checkState();
        },
    
        onTableClick: function (evt) {
            var row = core.ancestorNodeByTagName(evt.target, 'tr');
            if (row && domClass.contains(row, 'data')) {
                this.toggleRowSelection(row);
            };
            this.checkState();
        },
    
        onTreeSelectionChanged: function (node) {
            this.checkState();
        },
    
        onTreeNodeDoubleClick: function () {
            this.onAddClick();
        },
    
        checkState: function () {
            var selectedRow = this.getSelectedRow();
            var rowIndex = selectedRow ? selectedRow.rowIndex : -1;
            var rowCount = this.table.rows.length;
    
            var selectedNode = this.treeView.selectedNode;
    
            this.addButton.set('disabled', selectedNode ? false : true);
            this.removeButton.set('disabled', selectedRow ? false : true);
            this.moveUpButton.set('disabled', rowIndex > 1 ? false : true);
            this.moveDownButton.set('disabled', rowIndex > 0 && rowIndex < rowCount - 1 ? false : true);
    
            if (this.table.rows.length > 1 && (this.txtListName.get('value') || !this.listNameRequired)) {
                this.cmdOK.set('disabled', false);
            }
            else {
                this.cmdOK.set('disabled', true);
            }
        },
    
        getSelectedRow: function () {
            return query('.selected', this.table)[0] || null;
        },
    
        clearRowSelection: function () {
            query('.selected', this.table).removeClass('selected');
        },
    
        toggleRowSelection: function (row) {
            if (row) {
                if (domClass.contains(row, 'selected')) {
                    this.clearRowSelection();
                }
                else {
                    this.clearRowSelection();
                    domClass.add(row, 'selected');
                }
            };
        },
    
        selectRow: function (row) {
            if (row && !domClass.contains(row, 'selected')) {
                this.clearRowSelection();
                domClass.add(row, 'selected');
            };
        },
    
        onSearchKeyUp: function (evt) {
            if (evt.keyCode == keys.ENTER) {
                event.stop(evt);
                this.onSearchButtonClick();
            };
        },
    
        onSearchButtonClick: function () {
            var query = this.txtSearch.get('value');
            if (query) {
                this.treeView.search(query);
            };
        },
    
        onBrowseClick: function () {
            this.treeView.browse();
        },
    
        onAddClick: function () {
            var node = this.treeView.selectedNode;
            if (node && node.data && node.data.medcinId) {
                var self = this;
                this.addRow(node.data.medcinId, node.data.fullText || node.data.text || node.label);
                this.checkState();
            };
        },
    
        onRemoveClick: function () {
            var row = this.getSelectedRow();
            if (row && row.rowIndex > 0) {
                this.table.deleteRow(row.rowIndex);
                this.checkState();
            };
        },
    
        onMoveUpClick: function () {
            var row = this.getSelectedRow();
            if (row && row.rowIndex > 1) {
                var prevRow = this.table.rows[row.rowIndex - 1];
                domConstruct.place(row, prevRow, 'before');
                this.checkState();
            };
        },
    
        onMoveDownClick: function () {
            var row = this.getSelectedRow();
            if (row && row.rowIndex < this.table.rows.length - 1) {
                var nextRow = this.table.rows[row.rowIndex + 1];
                domConstruct.place(row, nextRow, 'after');
                this.checkState();
            };
        }
    });
});