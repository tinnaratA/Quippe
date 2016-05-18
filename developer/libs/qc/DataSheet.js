define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/NodeList-dom",
    "dojo/on",
    "dojo/query",
    "qc/_core",
    "dojo/keys"
], function (_TemplatedMixin, _WidgetBase, registry, array, declare, lang, domAttr, domClass, domConstruct, domStyle, nodeListDom, on, query, core, keys) {
    return declare("qc.DataSheet", [_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="qcDataSheet qcContextMenuContainer"><table data-dojo-attach-point="table"></table></div>',

        showColumnHeaders: true,
        showRowSelectors: true,
        minRows: 1,
        tableEvents: null,
        reWhitespace: /(^\s+$|\<br\s*\/?\>|\<p\s*\/?\>)/gi,
        hasMultiLineColumns: false,
        hasDeleteRowIndicator: false,
        fullRowSelect: false,
        sortColumnIndex: -1,

        defaultColumns: [{ width: '100%', caption: '', readOnly: false, styleClass: '', style: null, propertyName: '', defaultValue: '', multiLine: false, widgetType: '', constructor: null, settings: {}, deleteRowIndicator: false }],
        columns: null,

        destroyRecursive: function () {
            this.clearTable();
            domConstruct.empty(this.domNode);
            this.inherited(arguments);
        },

        clearTable: function () {
            var table = this.table;
            while (table.rows.length > 0) {
                table.deleteRow(table.rows.length - 1);
            };
            if (this.tableEvents) {
                array.forEach(this.tableEvents, core.disconnect);
                this.tableEvents = null;
            };
        },

        renderTable: function () {
            this.clearTable();
            if (this.showColumnHeaders) {
                this.addRow(array.map(this.columns, function (def) { return def.caption || '' }), 'header');
            };
            this.hasMultiLineColumns = array.some(this.columns, function (def) { return def.muliLine });
            this.hasDeleteRowIndicator = array.some(this.columns, function (def) { return def.deleteRowIndicator });
            this.tableEvents = [
                on(this.table, "click", lang.hitch(this, this.onTableClick)),
                on(this.table, "keydown", lang.hitch(this, this.onTableKeyDown)),
                on(this.table, "keypress", lang.hitch(this, this.onTableKeyPress)),
                on(this.table, "keyup", lang.hitch(this, this.onTableKeyUp))
            ];
        },

        getData: function () {
            var list = [];
            var rStart = this.showColumnHeaders ? 1 : 0;
            var rEnd = this.table.rows.length;
            var r = 0;
            var c = 0;
            var cellNum = 0;
            var value = null;
            var isEmpty = false;

            for (r = rStart; r < rEnd; r++) {
                var item = {};
                isEmpty = true;
                for (c = 0; c < this.columns.length; c++) {
                    cellNum = this.showRowSelectors ? c + 1 : c;
                    if (this.columns[c].propertyName) {
                        value = this.cellValue(this.table.rows[r].cells[cellNum]) || this.columns[c].defaultValue || '';
                        if (value) {
                            item[this.columns[c].propertyName] = value;
                            isEmpty = false;
                        }
                    };
                };
                if (!isEmpty) {
                    list.push(item);
                };
            };

            return list;
        },

        load: function (columns, data) {
            this.columns = columns || this.defaultColumns;
            data = data || [];
            this.renderTable();
            array.forEach(data, function (item) {
                var row = this.addRow(item);
                if (this.hasDeleteRowIndicator) {
                    this.setDeleteRowIndicatorCell(row);
                }
            }, this);
            this.updateTable();
            this.sortColumnIndex = -1;
            this.sortDirection = null;
        },

        updateTable: function () {
            var table = this.table;

            var lastRow = table.rows.length - 1;

            var r = table.rows.length - 1;
            while (r > 0 && this.isEmptyRow(table.rows[r])) {
                r--;
            };

            var emptyCount = lastRow - r;
            while (emptyCount < 1) {
                this.addRow();
                emptyCount++;
            };
            while (emptyCount > 1) {
                this.deleteRow(table.rows.length - 1);
                emptyCount--;
            };
        },

        isEmptyRow: function (row) {
            for (var n = 0; n < row.cells.length; n++) {
                if (this.cellValue(row.cells[n]) != '') {
                    return false;
                };
            };
            return true;
        },

        getCellWidget: function (cellNode) {
            if (cellNode && cellNode.childNodes.length > 0 && cellNode.childNodes[0].nodeType == 1) {
                return registry.byNode(cellNode.childNodes[0]) || null;
            }
            else {
                return null;
            };
        },

        cellValue: function (cell) {
            var widget = this.getCellWidget(cell);
            if (widget) return widget.get('value');
            var valueNode = cell.childNodes[0];
            return valueNode ? (valueNode.value != undefined ? valueNode.value : '' ) : '';
        },

        setCellValue: function(cell, value) {
            var widget = this.getCellWidget(cell);
            if (widget) widget.set('value', value);
            var valueNode = cell.childNodes[0];
            valueNode.value = value;
        },

        exchange: function (i, j) {
            if (i === j + 1) {
                this.table.tBodies[0].insertBefore(this.table.rows[i], this.table.rows[j]);
            }

            else if (j === i +1) {
                this.table.tBodies[0].insertBefore(this.table.rows[j], this.table.rows[i]);
            }

            else {
                var tempNode = this.table.tBodies[0].replaceChild(this.table.rows[i], this.table.rows[j]);

                if (!this.table.rows[i]) {
                    this.table.tBodies[0].appendChild(tempNode);
                }

                else {
                    this.table.tBodies[0].insertBefore(tempNode, this.table.rows[i]);
                }
            }

            if (this.onSortExchange) {
                this.onSortExchange(i, j);
            }
        },

        quicksort: function(startIndex, stopIndex, compareValues, getValue) {
            var i, j, pivot;

            if (stopIndex <= startIndex + 1) {
                return;
            }
             
            if (stopIndex - startIndex === 2 ) {
                if (compareValues(getValue(stopIndex - 1), getValue(startIndex)) < 0) {
                    this.exchange(stopIndex - 1, startIndex);   
                }

                return;
            }
            
            i = startIndex + 1;
            j = stopIndex - 1;
            
            if (compareValues(getValue(startIndex), getValue(i)) < 0) {
                this.exchange(i, startIndex);
            }

            if (compareValues(getValue(j), getValue(startIndex)) < 0) {
                this.exchange(startIndex, j);
            }

            if (compareValues(getValue(startIndex), getValue(i)) < 0) {
                this.exchange(i, startIndex);
            }
            
            pivot = getValue(startIndex);
            
            while(true) {
                j--;

                while (compareValues(pivot, getValue(j)) < 0) {
                    j--;
                }

                i++;

                while (compareValues(getValue(i), pivot) < 0) {
                    i++;
                }

                if (j <= i) {
                    break;
                }

                this.exchange(i, j);
            }

            this.exchange(startIndex, j);
            
            if ((j - startIndex) < (stopIndex - j)) {
                this.quicksort(startIndex, j, compareValues, getValue);
                this.quicksort(j + 1, stopIndex, compareValues, getValue);
            }

            else {
                this.quicksort(j + 1, stopIndex, compareValues, getValue);
                this.quicksort(startIndex, j, compareValues, getValue);
            }
        },

        reSort: function() {
            if (this.sortColumnIndex == -1) {
                return;
            }

            this.sort(this.sortColumnIndex, this.sortDirection);
        },

        sort: function (columnIndex, direction) {
            var row = this.table.rows[0];
            var cell = row.cells[columnIndex + 1];
            var def = this.columns[columnIndex];

            if (!direction) {
                direction = query('.sort-arrow-up.active', cell).length > 0 ? "desc" : "asc";
            }

            if (direction == "desc") {
                query('.sort-arrow-up.active', row).removeClass('active');
                query('.sort-arrow-down.active', row).removeClass('active');
                query('.sort-arrow-down', cell).addClass('active');

                this.quicksort(1, this.table.rows.length - 1, function (a, b) {
                    if (a == b) {
                        return 0;
                    }

                    else if (a < b) {
                        return 1;
                    }

                    return -1;
                }, (def.getCellValue || lang.hitch(this, function (index) {
                    return this.table.rows[index].cells[columnIndex + 1].childNodes[0].value.toLowerCase();
                })));

                this.sortDirection = "desc";
            }

            else {
                query('.sort-arrow-up.active', row).removeClass('active');
                query('.sort-arrow-down.active', row).removeClass('active');
                query('.sort-arrow-up', cell).addClass('active');

                this.quicksort(1, this.table.rows.length - 1, function (a, b) {
                    if (a == b) {
                        return 0;
                    }

                    else if (a < b) {
                        return -1;
                    }

                    return 1;
                }, (def.getCellValue || lang.hitch(this, function (index) {
                    return this.table.rows[index].cells[columnIndex + 1].childNodes[0].value.toLowerCase();
                })));

                this.sortDirection = "asc";
            }

            this.sortColumnIndex = columnIndex;
        },

        addRow: function (data, rowClass, rowIndex) {
            data = data || {};
            rowClass = rowClass || 'data';
            if (rowIndex == undefined) {
                rowIndex = -1;
            };
            var row = this.table.insertRow(rowIndex);
            domClass.add(row, rowClass);
            if (this.showRowSelectors) {
                var cSelector = row.insertCell(-1);
                domClass.add(cSelector, 'rowSelector');
            };

            var lastCol = this.columns.length - 1;

            array.forEach(this.columns, function (def, i) {
                var cell = row.insertCell(-1);
                if (def.styleClass) {
                    domClass.add(cell, def.styleClass);
                };
                if (def.style) {
                    domStyle.set(cell, def.style);
                };
                if (def.width) {
                    domStyle.set(cell, 'width', def.width);
                };

                if (i == lastCol) {
                    domStyle.set(cell, 'borderRight', '0px');
                }

                if (rowClass == 'header') {
                    cell.innerHTML = (def.caption || '') + (def.sortable ? '<div class="sort-arrow-container">&nbsp;<span class="sort-arrow-up">&#x25B4;</span><span class="sort-arrow-down">&#x25BE;</span></div>' : '');

                    if (def.sortable) {
                        domClass.add(cell, "sortable");

                        on(cell, "click", lang.hitch(this, function () {
                            this.sort(i);
                        }));
                    }
                }
                else if (def.deleteRowIndicator) {
                    domConstruct.place('<div class="deleteRowIndicator"></div>', cell);
                }
                else if (def.widgetType) {
                    var widget = require(def.widgetType);
                    var ctl;
                    if (def.constructor != null) {
                        def.settings.columnDef = def;
                        ctl = def.constructor(widget,def.settings,data);
                    }
                    else {
                        ctl = this.onWidgitCreate(def,i);
                    }
                    if (ctl) {
                        ctl.placeAt(cell);
                        domClass.add(ctl, 'value');
                        ctl.parentNode = cell;
                        ctl.set('value', (def.propertyName ? data[def.propertyName] : def.defaultValue) || def.defaultValue || '');
                    }
                }
                else {
                    var editor = domConstruct.create(def.multiLine ? 'textarea' : 'input');

                    if (def.readOnly) {
                        if (def.multiLine) {
                            domAttr.set(editor, "disabled", "disabled");
                        }

                        else {
                            domAttr.set(editor, "readonly", "readonly");
                        }
                    }

                    domClass.add(editor, 'value');
                    editor.value = (def.propertyName ? data[def.propertyName] : def.defaultValue) || def.defaultValue || '';
                    domConstruct.place(editor, cell);
                    editor.hEvents = [
                        on(editor, "change", lang.hitch(this, this.onEditChanged)),
                        on(editor, "keyup", lang.hitch(this, this.onEditKeyUp))
                    ]
                };
            }, this);

            return row;
        },

        selectRow: function (r) {
            var row = typeof r == 'number' ? this.table.rows[r] : r;
            if (domClass.contains(row, 'selected')) {
                query('.selected', this.table).removeClass('selected');
                this.onSelectedRowChanged(null);
            }
            else {
                query('.selected', this.table).removeClass('selected');
                domClass.add(row, 'selected');
                this.onSelectedRowChanged(row);
            };
        },

        deleteRow: function (r) {
            var editor = null;
            var table = this.table;
            if (r > 0 && r < table.rows.length) {
                var cStart = this.showRowSelectors ? 1 : 0;
                var row = table.rows[r];
                for (var c = cStart; c < row.cells.length; c++) {
                    var cell = row.cells[c];
                    editor = cell.childNodes[0];
                    //editor = row.cells[c].childNodes[0];
                    if (editor) {
                        if (editor.hEvents) {
                            array.forEach(editor.hEvents, core.disconnect);
                        };
                    }
                    var colDef = this.showRowSelectors ? this.columns[cell.cellIndex - 1] : this.columns[cell.cellIndex]
                    if (colDef.widgetType != '') {
                        var widget = this.getCellWidget(cell);
                        if (widget && widget.hSignals) {
                            array.forEach(widget.hSignals, function (x) { x.remove() });
                            widget.hSignals = [];
                        }
                    };
                };
                table.deleteRow(r);
                this.updateTable();
                this.onRowDeleted(this.table);
            };
        },

        insertRow: function (r) {
            this.addRow(null, null, r);
        },

        /*
         *  function called when we delete a row so the parent container can hook into it
         */
        onRowDeleted: function (evt) {

        },

        onTableKeyDown: function (evt) {
            if (this.hasMultiLineColumns) {
                switch (evt.keyCode) {
                    case keys.ENTER:
                        var info = this.getCellInfo(evt.target);
                        if (info && info.colDef.multiLine) {
                            this.autoSizeCell(info, '\n');
                        };
                        break;
                    case keys.BACKSPACE:
                    case keys.DELETE:
                        var info = this.getCellInfo(evt.target);
                        if (info && info.colDef.multiLine) {
                            this.autoSizeCell(info);
                        };
                        break;
                    default:
                        break;
                };
            };
        },

        onTableKeyPress: function (evt) {
            if (this.hasMultiLineColumns) {
                if (evt.charCode) {
                    var info = this.getCellInfo(evt.target);
                    if (info && info.colDef.multiLine) {
                        this.autoSizeCell(info, String.fromCharCode(evt.charCode));
                    };
                };
            };
        },

        onTableKeyUp: function(evt) {
            this.updateTable();
        },

        onTableClick: function (evt) {
            var cell = core.ancestorNodeByTagName(evt.target, 'td', true);
            if (cell) {
                var row = cell.parentNode;
                var isHeader = domClass.contains(row, 'header');
                var colDef = this.showRowSelectors ? this.columns[cell.cellIndex - 1] : this.columns[cell.cellIndex];
                if (!isHeader && colDef && colDef.deleteRowIndicator && !this.isEmptyRow(row)) {
                    this.deleteRow(row.rowIndex);
                    return;
                }
                if ((this.fullRowSelect || domClass.contains(cell, 'rowSelector')) && !isHeader) {
                    if (domClass.contains(row, 'selected')) return; // don't reselect a selected row
                    this.selectRow(row);
                };
            }
        },

        onEditChanged: function (evt) {
            var info = this.getCellInfo(evt.target);
            if (info && info.cell) {
                var value = this.cellValue(info.cell);
                this.onCellValueChanged(info, value);
            };
        },

        onEditKeyUp: function (evt) {

        },

        /*
         *  This function is called on adding a cell if the cell is a widget
         * and the columnDef does not contain a constructor. The parent can
         *  hook into this event. With a constructor, we just do the callback.
         */
        onWidgitCreate: function (def,col) {

        },

        clearErrors: function () {
            query('.error', this.table).removeClass('error');
        },

        hasErrors: function () {
            return query('.error', this.table).length > 0;
        },

        setRowError: function (rowIndex, error) {
            if (rowIndex >= 0 && rowIndex < this.table.rows.length) {
                domClass.add(this.table.rows[rowIndex], 'error');
                this.table.rows[rowIndex].error = error;
                if (this.showRowSelectors) {
                    this.table.rows[rowIndex].cells[0].innerHTML = '!';
                };
            };
        },

        clearRowError: function (rowIndex, error) {
            if (rowIndex >= 0 && rowIndex < this.table.rows.length) {
                domClass.remove(this.table.rows[rowIndex], 'error');
                this.table.rows[rowIndex].error = null;
                if (this.showRowSelectors) {
                    this.table.rows[rowIndex].cells[0].innerHTML = '';
                };
            };
        },

        /*
         *  This function will show or hide the deleteRowIndicator if the row is nmot empty
         */
        setDeleteRowIndicatorCell: function (row) {
            var hasData = false;
            var deleteCell = null;
            var c = this.showRowSelectors ? 1 : 0;
            for (var n = c; n < row.cells.length; n++) {
                var info = this.getCellInfo(row.cells[n]);
                if (info && info.colDef.deleteRowIndicator) {
                    deleteCell = row.cells[n]
                }
                if (this.cellValue(row.cells[n]) != '') {
                    hasData = true;
                };
            };
            if (deleteCell) {
                if (hasData) {
                    if (domClass.contains(deleteCell, 'hasData')) return;
                    domClass.add(deleteCell, 'hasData');
                }
                else {
                    if (domClass.contains(deleteCell, 'hasData')) {
                        deleteCell.removeClass('hasData');
                    };
                }
            }
        },

        onCellValueChanged: function (cellInfo, value) {
            if (this.hasDeleteRowIndicator) {
                this.setDeleteRowIndicatorCell(cellInfo.row);
            }
        },

        onSelectedRowChanged: function (row) {
        },

        autoSizeCell: function (cellInfo, extraText) {
            if (!this.sizeBox) {
                this.sizeBox = domConstruct.place('<div class="sizeBox"></div>', this.domNode);
            };
            var textArea = cellInfo.cell.childNodes[0];
            var width = domStyle.get(textArea, 'width');
            var fontFamily = domStyle.get(textArea, 'fontFamily');
            var fontSize = domStyle.get(textArea, 'fontSize');
            domStyle.set(this.sizeBox, { width: width + 'px', fontFamily: fontFamily, fontSize: fontSize });
            this.sizeBox.innerHTML = textArea.value + (extraText || '') + ' M'; // (textArea.value + (evt.keyCode == keys.ENTER ? '<br/>' : '') + " MMM");
            var height = Math.max(domStyle.get(this.sizeBox, 'height'), 22);
            domStyle.set(textArea, 'height', height + 'px');
        },


        focusCell: function (r, c) {
            if (r >= 0 && r < this.table.rows.length) {
                if (c >= 0 && c < this.table.rows[r].cells.length) {
                    this.table.rows[r].cells[c].childNodes[0].focus();
                };
            }
        },

        focusPrevCell: function (fromCell) {
            var firstRow = this.showColumnHeaders ? 1 : 0;
            var lastRow = this.table.rows.length - 1;
            var firstCell = this.showRowSelectors ? 1 : 0;
            var lastCell = firstCell + this.columns.length - 1;

            var info = this.getCellInfo(fromCell);
            if (info && info.c > firstCell) {
                this.focusCell(info.r, info.c - 1);
            }
            else if (info && info.r > firstRow) {
                this.focusCell(info.r - 1, lastCell);
            }
            else {
                this.focusCell(firstRow, firstCell);
            };
        },

        focusNextCell: function (fromCell) {
            var firstRow = this.showColumnHeaders ? 1 : 0;
            var lastRow = this.table.rows.length - 1;
            var firstCell = this.showRowSelectors ? 1 : 0;
            var lastCell = firstCell + this.columns.length - 1;

            var info = this.getCellInfo(fromCell);
            if (info && info.c < lastCell) {
                this.focusCell(info.r, info.c + 1);
            }
            else if (info && info.r < lastRow) {
                this.focusCell(info.r + 1, firstCell);
            }
            else {
                this.focusCell(lastRow, lastCell);
            };
        },

        /*
         *  This function will return an array that contains the cellInfo
         *  for each non-header row of the given column.
         */
        getColumnCellInfo: function (column) {
            var info = [];
            var rStart = this.showColumnHeaders ? 1 : 0;
            var rEnd = this.table.rows.length;
            var r = 0;
            var c = this.showRowSelectors ? column + 1 : column;
            if (c > this.columns.length) return info;
            for (r = rStart; r < rEnd; r++) {
                info.push(this.getCellInfo(this.table.rows[r].cells[c]));
            }
            return info;
        },

        getCellInfo: function (targetNode) {
            var cell = core.ancestorNodeByTagName(targetNode, 'td', true);
            if (!cell) {
                return null;
            };

            var row = core.ancestorNodeByTagName(cell, 'tr', true);
            if (!row) {
                return null;
            };

            return {
                row: row,
                cell: cell,
                r: row.rowIndex,
                c: cell.cellIndex,
                isHeader: domClass.contains(row, 'header'),
                isSelector: domClass.contains(cell, 'rowSelector'),
                colDef: this.showRowSelectors ? this.columns[cell.cellIndex - 1] : this.columns[cell.cellIndex]
            };
        },

        getContextActions: function (item, widget, targetNode) {
            var info = this.getCellInfo(targetNode);
            if (!info) {
                return [];
            };

            if (info && !info.isHeader) {
                this.selectRow(info.r);
                return [
                    { label: 'Insert Row', icon: 'add', onClick: lang.hitch(this, function () { this.insertRow(info.r) }) },
                    { label: 'Delete Row', icon: 'delete', onClick: lang.hitch(this, function () { this.deleteRow(info.r) }) }
                ];
            };
        },

        /*
         *  This function will return the row number of the currently selected row.
         *  Returns -1 if no row is selected.
         */
        getSelectedRow: function () {
            var rStart = this.showColumnHeaders ? 1 : 0;
            var rEnd = this.table.rows.length;
            for (r = rStart; r < rEnd; r++) {
                var row = this.table.rows[r];
                if (domClass.contains(row, 'selected')) return r;
            }
            return -1;
        }
    });
});