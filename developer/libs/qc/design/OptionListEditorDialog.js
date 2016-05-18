define([
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/text!qc/design/templates/OptionListEditorDialog.htm",
    "qc/_core",
    "qc/Dialog",
	"qc/StringUtil"
], function (_WidgetsInTemplateMixin, array, declare, lang, domClass, domStyle, OptionListEditorDialogTemplate, core, Dialog, StringUtil) {
    return declare("qc.design.OptionListEditorDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: 'Option List Editor',
        templateString: OptionListEditorDialogTemplate,
        
        showListName: true,
        listName: '',
        listType: '',
        listNameRequired: true,
        showColumnHeaders: true,
        keepEmptyFirstLine: true,
        initialLines: 5,
    
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
                    if ((id || text) || (this.keepEmptyFirstLine && items.length == 0)) {
                        items.push({ id: id, text: text || id });
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
    
        _getValueAttr: function () {
            var listObject = this.get('list');
            return listObject.list;
        },
    
        _setValueAttr: function (value) {
            if (typeof value == 'string') {
                this.set('list', {
                    listName: '',
                    listType: '',
                    list: StringUtil.parseCodedList(value)
                })
            }
            else if (value instanceof Array) {
                this.set('list', {
                    listName: '',
                    listType: '',
                    list: value
                })
            }
            else {
                this.set('list', value);
            }
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
    
        hasList: function () {
            var table = this.table;
            var id = '';
            var text = '';
            for (var n = 0; n < table.rows.length; n++) {
                var row = table.rows[n];
                if (domClass.contains(row, 'data')) {
                    id = this.cellValue(row.cells[0]);
                    text = this.cellValue(row.cells[1]);
                    if (id || text) {
                        return true;
                    };
                };
            };
            return false;
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
                this.addRow('Code', 'Description', 'header');
            };
    
            var rowCount = 0;
            array.forEach(list || [], function (item) {
                this.addRow(item.id, item.text, 'data');
                rowCount++;
            }, this);

            while (rowCount < this.initialLines || 0) {
                this.addRow();
                rowCount++;
            }
    
            this.ensureBlankRow();
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
                idCell.childNodes[0].setAttribute('contentEditable', true);
                idCell.childNodes[0].setAttribute('role', 'textbox');
                idCell.childNodes[0].setAttribute('tabIndex', 1);
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
            this.ensureBlankRow();
            return row;
        },
    
        cellValue: function (cell) {
            var node = cell && cell.childNodes[0] ? cell.childNodes[0] : null;
            if (!node) {
                return '';
            };
    
            var text = (node.textContent || node.text || node.innerHTML).trim();
            if (text == '<br>' || text == '<br />') {
                return '';
            }
            else {
                return text;
            }
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
    
        checkState: function () {
            if (this.hasList() && (this.txtListName.get('value') || !this.listNameRequired)) {
                this.cmdOK.set('disabled', false);
            }
            else {
                this.cmdOK.set('disabled', true);
            }
        },
    
        _onChange: function () {
            this.checkState();
        },
    
        onTableKeyDown: function (evt) {
            this.ensureBlankRow();
            this._onChange();
        },
    
        onTableClick: function (evt) {
            if (domClass.contains(evt.target, 'cellData')) {
                if (evt.target.innerHTML == '&nbsp;') {
                    window.getSelection().selectAllChildren(evt.target);
                };
            };
        },
    
        onOKClick: function () {
            this.onExecute();
        },
    
        onCancelClick: function () {
            this.onCancel();
        }
    
    
    });
});