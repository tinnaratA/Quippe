define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/query",
    "dojo/topic",
    "qc/_core",
    "qc/design/OptionListManagerMixin",
    "qc/note/_Element",
    "qc/note/_SelectableMixin",
	"qc/StringUtil",
    "qc/StyleUtil",
    "qc/XmlUtil",
    "qc/note/FindingTable/_CellWidgets",
    "qc/note/FindingTable/_FindingList",
    "qc/note/FindingTable/_SelectionRange",
    "qc/note/ComponentSettingsMixin",
    "qc/note/PropertyBindingMixin"
], function (_TemplatedMixin, _WidgetBase, registry, array, declare, lang, domClass, domConstruct, domGeometry, domStyle, query, topic, core, OptionListManagerMixin, _Element, _SelectableMixin, StringUtil, StyleUtil, XmlUtil, _CellWidgets, _FindingList, _SelectionRange, ComponentSettingsMixin, PropertyBindingMixin) {
    var FindingTable = declare("qc.note.FindingTable", [_WidgetBase, _TemplatedMixin, OptionListManagerMixin, _Element, _SelectableMixin, PropertyBindingMixin], {
	    templateString: '<div class="qcFindingTable qxFindingTable designable qcddSource qcContextMenuContainer hiddenFindingContainer"></div>',
		elementName: 'FindingTable',

		idSeq: 0,
		dataRows: 4,
		dataCols: 4,
		minRows: 1,
		minCols: 1,
		groupKeys: '',
		groupingRule: '',
		findingVector: '',
		entryVector: '',
		deleteEmptyRows: false,
		deleteEmptyCols: false,
		componentSettings: null,
        isContainer: true,

		constructor: function () {
			this.selectionRange = new _SelectionRange({ owner: this });
		},


		postCreate: function () {
			domClass.add(this.domNode, 'qcddTarget');
			domClass.add(this.domNode, 'part');

			this.table = domConstruct.place('<table></table>', this.domNode);
			this.colGroup = domConstruct.place('<colgroup></colgroup>', this.table);
			this.tBody = domConstruct.place('<tbody></tbody>', this.table);

			this.findingList = new _FindingList();
			this.findingList.placeAt(this.domNode);
			this.inherited(arguments);
		},

		newId: function () {
			this.idSeq++;
			return 'C' + this.idSeq;
		},

        _getAutoPromptAttr: function() {
            return this.getInheritedProperty('autoPrompt', '');
        },

		_getTextAttr: function () {
			return this.name ? this.name + ' Table' : 'Table';
		},

		_getRowsAttr: function () {
			return this.dataRows - 1;
		},
		_setRowsAttr: function (value) {
			var newValue = Math.max(value + 1, this.minRows);
			if (this.table && this.table.rows.length > 0) {
				while (this.dataRows < newValue) {
					this.addRow()
				};
				while (this.dataRows > newValue) {
					this.deleteRow(this.dataRows - 1);
				};
			}
			else {
				this.dataRows = newValue;
			}
		},

		_getColsAttr: function () {
			return this.dataCols - 1;
		},
		_setColsAttr: function (value) {
			var newValue = Math.max(value + 1, this.minCols);
			if (this.colGroup && this.colGroup.childNodes.length > 0) {
				while (this.dataCols < newValue) {
					this.addCol();
				};
				while (this.dataCols > newValue) {
					this.deleteCol(this.dataCols - 1);
				};
			}
			else {
				this.dataCols = newValue;
			};
		},

		_setDeleteEmptyRowsAttr: function (value) {
			this.deleteEmptyRows = value || false;
			this.updateDisplay();
		},

		_setDeleteEmptyColsAttr: function (value) {
			this.deleteEmptyCols = value || false;
			this.updateDisplay();
		},

		_setEntryVectorAttr: function (value) {
			this.entryVector = value;
			this.updateDisplay();
		},

		_getDesignerViewAttr: function () {
			return this.designerView;
		},

		_setDesignerViewAttr: function (value) {
			if (this.designerView) {
				domClass.remove(this.domNode, this.designerView);
			};
			this.designerView = value || '';
			if (this.designerView) {
				domClass.add(this.domNode, this.designerView);
			};
		},

		_getElementStyleAttr: function () {
			return this.domNode.getAttribute('style');
		},
		_setElementStyleAttr: function (value) {
			if (value) {
				this.domNode.setAttribute('style', value);
			}
			else {
				this.domNode.removeAttribute(value);
			};
		},

		_getTableStyleAttr: function () {
			return this.table.getAttribute('style') || '';
		},
		_setTableStyleAttr: function (value) {
			if (value) {
				this.table.setAttribute('style', value);
			}
			else {
				this.table.removeAttribute(value);
			};
		},

		updateDisplay: function (viewMode) {
		    viewMode = viewMode || this.getViewMode();
		    if (viewMode == 'listfocus' && domClass.contains(this.domNode, 'listHide')) {
		        if (query('.listShow', this.domNode).length > 0) {
		            domClass.remove(this.domNode, 'listHide');
		        };
		    };
			this.removeEmptyReferences();
			this.findingList.updateDisplay(viewMode);
			this.updateTableDisplay(null, viewMode);
		},

		updateTableDisplay: function (bounds, viewMode) {
			if (this.deleteEmptyRows) {
				this.removeEmptyRows();
			};
			if (this.deleteEmptyCols) {
				this.removeEmptyCols();
			};

            // hide empty rows/cols in
			if (viewMode == 'concise') {
			    if (domClass.contains(this.domNode, 'hideEmptyRows')) {
			        for (var r = 1; r < this.dataRows; r++) {
			            if ((this.table.rows[r].data.rowType || 'data') == 'data') {
			                if (this.isEmptyRow(r)) {
			                    domClass.add(this.table.rows[r], 'conciseEmptyHidden');
			                }
			            }
			        }
			    };
			    if (domClass.contains(this.domNode, 'hideEmptyCols')) {
			        for (var c = 1; c < this.dataCols; c++) {
			            if ((this.colGroup.childNodes[c].data.colType || 'data') == 'data') {
			                if (this.isEmptyCol(c)) {
			                    domClass.add(this.colGroup.childNodes[c], 'conciseEmptyHidden');
			                    this.forCellInCol(c, function (cell) { domClass.add(cell, 'conciseEmptyHidden')});
			                };
			            }
			        }
			    }
			}
			else {
			    query('.conciseEmptyHidden', this.domNode).removeClass('conciseEmptyHidden');
			};

			//temp:
			query('td', this.table).forEach(function (cellNode) {
				if (cellNode.dataRow > 0 && cellNode.dataCol > 0) {
					var widget = this.getCellWidget(cellNode);
					if (widget) {
						widget.updateDisplay();
					};
				};
			}, this);

			var disabled = this.get('disabled');
			if (disabled && !this.prevDisabledValue) {
			    query('input', this.table).forEach(function (x) {
			        x.setAttribute('readonly', true);
			    });
			    query('textarea', this.table).forEach(function (x) {
			        x.setAttribute('readonly', true);
			    });
			    this.prevDisabledValue = true;
			}
			else if (!disabled && this.prevDisabledValue) {
			    query('input', this.table).filter(function(y) {return !core.ancestorNodeByClass(y, 'noEdit')}).forEach(function (x) {
			        x.setAttribute('readonly', true);
			    });
			    query('textarea', this.table).forEach(function (x) {
			        x.setAttribute('readonly', true);
			    });
			};

			//if (disabled !== this.prevDisabledValue) {
			//    if (disabled) {
			//        query('input', this.table).forEach(function (x) {
			//            x.setAttribute('readonly', true);
			//        });
			//        query('textarea', this.table).forEach(function (x) {
			//            x.setAttribute('readonly', true);
			//        });
			//    }
			//    else {
			//        query('input', this.table).forEach(function (x) {
			//            x.removeAttribute('readonly');
			//        });
			//        query('textarea', this.table).forEach(function (x) {
			//            x.removeAttribute('readonly');
			//        });
			//    };
			//    this.prevDisabledValue = disabled;
			//};
			

			if (this.entryVector) {
				this.ensureTemplateLine();
				if (viewMode != 'design') {
					this.ensureEntryLine();
				};
			};
		},

		updateAddresses: function () {
			var counts = [];
			var rows = this.dataRows;
			var cols = this.dataCols;
			var table = this.table;
			var colGroup = this.colGroup;
			var cs = 0;
			var rs = 0;
			for (var rx = 0; rx <= rows; rx++) {
				counts.push([]);
				for (var cx = 0; cx <= this.dataCols; cx++) {
					counts[rx].push(1);
				};
			};

			for (var rn = 1; rn < rows; rn++) {
				table.rows[rn].cells[0].innerHTML = table.rows[rn].data.rowType == 'template' ? '*' : rn;
				table.rows[rn].dataRow = rn;
			};
			for (var cn = 1; cn < cols; cn++) {
				table.rows[0].cells[cn].innerHTML = colGroup.childNodes[cn].data.colType == 'template' ? '*' : this.toBase26(cn);
				colGroup.childNodes[cn].dataCol = cn;
			};

			array.forEach(this.table.rows, function (row, r) {
				var c = 0;
				array.forEach(row.cells, function (cell) {
					while (c < cols && counts[r][c] == 0) {
						c++;
					};
					cell.dataRow = r;
					cell.dataCol = c;

					var colSpan = parseInt(cell.getAttribute('colSpan'), 10) || 1;
					var rowSpan = parseInt(cell.getAttribute('rowSpan'), 10) || 1;
					for (rs = r; rs < r + rowSpan; rs++) {
						for (cs = c; cs < c + colSpan; cs++) {
							counts[rs][cs] = 0;
						};
					};
				});
				r++;
			});
		},

		updateStyles: function () {
			this.updateRowStyles();
			this.updateColStyles();
			this.updateCellStyles();
		},

		updateCellStyles: function () {
			var toObj = function (node) {
				return node.data && node.data.cellStyle ? StyleUtil.styleToObject(node.data.cellStyle) : null;
			};
			var toStr = function (objs) {
				var target = null;
				while (objs.length > 0) {
					target = core.applyObjectOverrides(objs.shift(), target);
				};
				return StyleUtil.objectToStyle(target);
			};

			var tableCellStyle = toObj(this.table);
			var cols = this.colGroup.childNodes;
			var colCellStyle = array.map(cols, toObj);

			array.forEach(this.table.rows, function (rowNode, r) {
				if (r > 0) {
					var rowCellStyle = toObj(rowNode);
					array.forEach(rowNode.cells, function (cellNode) {
						if (cellNode.dataCol > 0) {
							var cellCellStyle = toObj(cellNode);
							var style = toStr([cellCellStyle, colCellStyle[cellNode.dataCol], rowCellStyle, tableCellStyle]);
							if (style) {
								cellNode.setAttribute('style', style);
							}
							else {
								cellNode.removeAttribute('style');
							};
							if (rowNode.data.rowType == 'template' || cols[cellNode.dataCol].data.colType == 'template') {
								domClass.add(cellNode, 'template');
							};
						};
					});
				};
			});
		},

		updateRowStyles: function () {
			var toObj = function (node) {
				return node.data && node.data.rowStyle ? StyleUtil.styleToObject(node.data.rowStyle) : null;
			};
			var toStr = function (objs) {
				var target = null;
				while (objs.length > 0) {
					target = core.applyObjectOverrides(objs.shift(), target);
				};
				return StyleUtil.objectToStyle(target);
			};

			var tableRowStyle = toObj(this.table);
			array.forEach(this.table.rows, function (rowNode, i) {
			    if (i > 0) {
			        var rowRowStyle = toObj(rowNode);
			        var style = toStr([rowRowStyle, tableRowStyle]);
			        if (style) {
			            rowNode.setAttribute('style', style);
			        }
			        else {
			            rowNode.removeAttribute('style');
			        };
			    };
			});
		},

		updateColStyles: function () {
			var toObj = function (node) {
				return node.data && node.data.colStyle ? StyleUtil.styleToObject(node.data.colStyle) : null;
			};
			var toStr = function (objs) {
				var target = null;
				while (objs.length > 0) {
					target = core.applyObjectOverrides(objs.shift(), target);
				};
				return StyleUtil.objectToStyle(target);
			};

			var tableColStyle = toObj(this.table);
			array.forEach(this.colGroup.childNodes, function (colNode, i) {
			    if (i > 0) {
			        var colColStyle = toObj(colNode);
			        var style = toStr([colColStyle, tableColStyle]);
			        if (style) {
			            colNode.setAttribute('style', style);
			        }
			        else {
			            colNode.removeAttribute('style');
			        };
			    };
			});
		},

		ensureTemplateLine: function () {
			if (!this.table || !this.table.rows || this.table.rows.length < 1) {
				return;
			};
			if (this.entryVector == 'row') {
				if (this.templateCol) {
					this.deleteCol(this.templateCol.dataCol);
					this.templateCol = null;
				};
				if (!this.templateRow) {
					this.createTemplateRow();
				};
			}
			else if (this.entryVector == 'col') {
				if (this.templateRow) {
					this.deleteRow(this.templateRow.dataRow);
					this.templateRow = null;
				};
				if (!this.templateCol) {
					this.createTemplateCol();
				};
			};
		},

		ensureEntryLine: function () {
			if (this.entryVector == 'row') {
				this.ensureEntryRow();
			}
			else if (this.entryVector == 'col') {
				this.ensureEntryCol();
			};
		},


		createTemplateRow: function () {
			var rows = this.table.rows;
			var r = this.dataRows - 1;
			while (r > 0 && rows[r].data.rowType == 'footer') {
				r--;
			};
			if (r > 0 && rows[r].data.rowType == 'template') {
				this.templateRow = rows[r];
			}
			else {
				var line = this.insertRow(r + 1);
				line.data.rowType = 'template';
				domClass.add(line, 'template');
				line.cells[0].innerHTML = '*';
				for (var c = 1; c < this.dataCols; c++) {
					domClass.add(line.cells[c], 'template');
				};
				this.templateRow = line;
			};
			return this.templateRow;
		},

		deleteTemplateRow: function () {
			var rows = this.table.rows;
			var r = this.dataRows - 1;
			while (r > 0) {
				if (rows[r].data.rowType == 'template') {
					this.deleteRow(r);
				};
				r--;
			};
		},

		createTemplateCol: function () {
			var cols = this.colGroup.childNodes;
			var table = this.table;
			var c = this.dataCols - 1;
			while (c > 0 && cols[c].data.colType == 'footer') {
				c--;
			};
			if (c > 0 && cols[c].data.colType == 'template') {
				this.templateCol = cols[c];
			}
			else {
				var line = this.insertCol(c + 1);
				line.data.colType = 'template';
				domClass.add(line, 'template');
				table.rows[0].cells[c + 1].innerHTML = '*';
				for (var r = 1; r < this.dataRows; r++) {
					domClass.add(table.rows[r].cells[c + 1], 'template');
				};
				this.templateCol = line;
			};
			return this.templateCol;
		},

		deleteTemplateCol: function () {
			var cols = this.colGroup.childNodes;
			var c = this.dataCols - 1;
			while (c > 0) {
			    if (cols[c].data.colType == 'template') {
					this.deleteCol(c);
				};
				c--;
			};
		},

		ensureEntryRow: function () {
			if (!this.templateRow) {
				return;
			};

			var r = this.templateRow.dataRow - 1;
			if (r > 0 && this.table.rows[r].data.isEntryRow && this.isEmptyRow(r)) {
				return this.table.rows[r];
			};

			var entryRow = this.insertRow(this.templateRow.dataRow);
			var findingMap = {};
			var templateCell = null;
			var templateWidget = null;
			var entryCell = null;
			var entryWidget = null;
			var templateFinding = null;
			var entryFinding = null;

			entryRow.data.isEntryRow = true;
			entryRow.data.isAutoExp = true;

            if (this.templateRow.data.rowStyle) {
                entryRow.data.rowStyle = this.templateRow.data.rowStyle;
            }

            if (this.templateRow.data.cellStyle) {
                entryRow.data.cellStyle = this.templateRow.data.cellStyle;
            }

			for (var c = 1; c < entryRow.cells.length; c++) {
				templateCell = this.templateRow.cells[c];
				entryCell = entryRow.cells[c];
				templateWidget = this.getCellWidget(templateCell);
				entryWidget = this.convertCellWidget(entryCell, templateCell.data.entryType);
				if (templateWidget.findingRef) {
					if (!findingMap[templateWidget.findingRef]) {
						templateFinding = this.findingList.getFinding(templateWidget.findingRef);
						if (templateFinding) {
							entryFinding = templateFinding.duplicate();
						    domClass.add(entryFinding.domNode, 'autoExp')
						    entryFinding.autoExpRow = entryRow;
							entryFinding.placeAt(this.findingList.containerNode, 'last');
							findingMap[templateWidget.findingRef] = entryFinding.name;
						};
					};
					entryWidget.set('findingRef', findingMap[templateWidget.findingRef]);
				};

				array.forEach(templateWidget._pgGetProperties(), function (prop) {
					switch (prop.name) {
						case 'entryType':
							break;
						case 'findingRef':
							break;
						case 'value':
							break;
						default:
							entryWidget.set(prop.name, templateWidget.get(prop.name));
							break;
					};

				});

				if (templateCell.data.cellStyle) {
				    entryCell.data.cellStyle = templateCell.data.cellStyle;
                }
			};

		    this.updateStyles();

			return entryRow;
		},

		ensureEntryCol: function () {
			if (!this.templateCol) {
				return;
			};

			var c = this.templateCol.dataCol - 1;
			var cols = this.colGroup.childNodes;
			if (c > 0 && cols[c].data.isEntryCol && this.isEmptyCol(c)) {
				return cols[c];
			};

			var entryCol = this.insertCol(this.templateCol.dataCol);
			var findingMap = {};
			var templateCell = null;
			var templateWidget = null;
			var entryCell = null;
			var entryWidget = null;
			var templateFinding = null;
			var entryFinding = null;

			entryCol.data.isEntryCol = true;
			entryCol.data.isAutoExp = true;
			var tc = this.templateCol.dataCol;
			var ec = entryCol.dataCol;
			var row = null;

			for (var r = 1; r < this.dataRows; r++) {
				row = this.table.rows[r];
				templateCell = this.getCellForCol(row, tc);
				entryCell = this.getCellForCol(row, ec);
				templateWidget = this.getCellWidget(templateCell);
				entryWidget = this.convertCellWidget(entryCell, templateCell.data.entryType);
				if (templateWidget.findingRef) {
					if (!findingMap[templateWidget.findingRef]) {
						templateFinding = this.findingList.getFinding(templateWidget.findingRef);
						if (templateFinding) {
							entryFinding = templateFinding.duplicate();
						    domClass.add(entryFinding.domNode, 'autoExp')
						    entryFinding.autoExpCol = entryCol;
							entryFinding.placeAt(this.findingList.containerNode, 'last');
							findingMap[templateWidget.findingRef] = entryFinding.name;
						};
					};
					entryWidget.set('findingRef', findingMap[templateWidget.findingRef]);
				};

				array.forEach(templateWidget._pgGetProperties(), function (prop) {
					switch (prop.name) {
						case 'entryType':
							break;
						case 'findingRef':
							break;
						case 'value':
							break;
						default:
							entryWidget.set(prop.name, templateWidget.get(prop.name));
							break;
					};

				});
			};

			return entryCol;
		},

		ensureEntryCol_ORIG: function () {
			var c = this.dataCols - 1;
			var cols = this.colGroup.childNodes;
			var haveLine = false;
			var newCol = null;
			var table = this.table;

			var isEmptyCell = lang.hitch(this, this.isEmptyCell);
			var isEmptyCol = lang.hitch(this, function (col) {
				var empty = true;
				this.forCellInCol(col.dataCol, function (cell) {
					empty = empty && this.isEmptyCell(cell);
				});
				return empty;
			});

			while (c > 1 && !haveLine) {
				switch (cols[c].data.colType) {
					case 'footer':
						break;
					case 'template':
						if (isEmptyCol(cols[c])) {
							haveLine = true;
						}
						else {
							cols[c].data.colType = '';
							newCol = this.insertCol(c + 1);
							newCol.data.colType = 'template';
							table.rows[0].cells[c + 1].innerHTML = '*';
							haveLine = true;
						};
						break;
					case 'header':
						break;
					default:
						if (isEmptyCol(cols[c])) {
							cols[c].data.colType = 'template'
							table.rows[0].cells[c].innerHTML = '*';
							haveLine = true;
						};
						break;
				};
				c--;
			};
			if (!haveLine) {
				newCol = this.insertCol(-1);
				newCol.data.colType = 'template';
				table.rows[0].cells[this.dataCols - 1].innerHTML = '*';
			};
		},

		/* === begin: Rendering === */
		renderTable: function (cellData) {
			cellData = cellData || this.createCellData();

			var table = this.table;
			var colGroup = this.colGroup;
			var tBody = this.tBody;

			var row = null;
			var cell = null;
			var col = null;
			var r = 0;
			var c = 0;
			var region = 0;
			var data = null;

			var rowSpan = 0;
			var colSpan = 0;
			var skipCols = 0;
			var skipRowCols = [];

			var rows = Math.max(this.dataRows, this.minRows, 1);
			var cols = Math.max(this.dataCols, this.minCols, 1);
			var colNodes = [];
			var mergedData = null;
			var typeName = '';
			var widgetType = null;
			var widget = null;


			table.data = cellData[0][0];

			for (c = 0; c < cols; c++) {
				col = domConstruct.place('<col></col>', colGroup);
				col.dataCol = c;
				col.data = cellData[0][c];
				if (c == 0) {
					col.data.colType = 'selector';
					domClass.add(col, 'rowSelector');
				};
				if (col.data.colType == 'hidden') {
				    domClass.add(col, 'hidden');
				};
				domClass.add(col, col.data.colType);

				colNodes.push(col);
				skipRowCols.push(0);
			};

			for (r = 0; r < rows; r++) {
				row = table.insertRow(-1);
				row.dataRow = r;
				row.data = cellData[r][0];
				if (r == 0) {
					row.data.rowType = 'selector';
				};
				if (row.data.rowType == 'hidden') {
				    domClass.add(row, 'hidden');
				};
				domClass.add(row, row.data.rowType);
				skipCols = 0;
				for (c = 0; c < cols; c++) {
					region = (r == 0 ? 0 : 2) + (c == 0 ? 0 : 1);
					switch (region) {
						case 0:     //table
							cell = row.insertCell(-1);
							domClass.add(cell, 'selector');
							cell.colType = 'selector';
							cell.dataRow = r;
							cell.dataCol = c;
							break;
						case 1:     //col selector
							cell = row.insertCell(-1);
							domClass.add(cell, 'selector colSelector');
							domClass.add(row, 'selector');
							cell.dataRow = r;
							cell.dataCol = c;
							cell.innerHTML = colNodes[c].data.colType == 'template' ? '*' : this.toBase26(c);
							break;
						case 2:     //row selector
							cell = row.insertCell(-1);
							domClass.add(cell, 'selector rowSelector');
							cell.dataRow = r;
							cell.dataCol = c;
							cell.innerHTML = row.data.rowType == 'template' ? '*' : r;
							break;
						case 3:     //data area
							if (skipCols > 0) {
								skipCols--;
							}
							else if (skipRowCols[c] > 0) {
								skipRowCols[c]--;
							}
							else {
								cell = row.insertCell(-1);
								cell.data = cellData[r][c];
								cell.dataRow = r;
								cell.dataCol = c;

								colSpan = cell.data.colSpan || 1;
								if (colSpan > 1) {
									cell.setAttribute('colspan', colSpan);
									skipCols = colSpan - 1;
								}
								else {
									skipCols = 0;
								};

								rowSpan = cell.data.rowSpan || 1;
								if (rowSpan > 1) {
								    cell.setAttribute('rowspan', rowSpan);

								    for (var i = 0; i < colSpan && (c + i) < cols; i++) {
								        skipRowCols[c + i] = rowSpan - 1;
								    }
								}
								else {
									skipRowCols[c] = 0;
								};

								this.renderCellContent(row, colNodes[c], cell, cellData[r][c], true);

								if (row.data.rowType == 'hidden' || colNodes[c].data.colType == 'hidden') {
								    domClass.add(cell, 'hidden');
								};
							};
							break;
					};


				};
				domConstruct.place(table, this.domNode);
				this.table = table;
				this.colGroup = colGroup;
				this.tBody = tBody;

				this.updateStyles();
			};
		},

		renderCellContent: function (rowNode, colNode, cellNode, cellData, rendering) {
			var mergedData = this.mergeObjects(cellData, colNode.data, rowNode.data, this.table.data);

			var widget = null;
			try {
				widget = _CellWidgets.createNew(mergedData.entryType || 'Empty');
			}
			catch (ex) {
				console.error('Invalid EntryType ' + mergedData.entryType + ' in table ' + (this.get('name') || this.domNode.id) + ', row ' + cellData.row + ', col ' + cellData.col);
				widget = _CellWidgets.createNew('Empty');
			}

			widget.owner = this;
			widget.rowNode = rowNode;
			widget.colNode = colNode;
			widget.cellNode = cellNode;

			if (mergedData.cellStyle) {
				cellNode.setAttribute('style', mergedData.cellStyle);
			};
			array.forEach(widget._pgGetProperties(), function (prop) {
				if (mergedData[prop.name] != undefined) {
					if (rendering && prop.name == 'formula') {
						widget[prop.name] = mergedData[prop.name];
					}
					else {
						widget._pgSetPropertyValue(prop, mergedData[prop.name]);
					};
				};
			}, this);
			widget.placeAt(cellNode);
			cellNode.cellId = this.newId();
			return widget;
		},

		convertCellWidget: function (cellNode, entryType) {

			if (!cellNode.data) {
				cellNode.data = {};
			};

			var rowNode = this.table.rows[cellNode.dataRow];
			var colNode = this.colGroup.childNodes[cellNode.dataCol];
			var value = '';

			var current = this.getCellWidget(cellNode);
			if (current) {
				if (current.declaredClass == 'qc/note/FindingTable/CellWidgets/' + entryType) {
					return current;
				}
				else {
					array.forEach(current._pgGetProperties(), function (prop) {
						if (current.get(prop.name)) {
							cellNode.data[prop.name] = current.get(prop.name);
						};
					});
				};
				value = current.get('value');
				current.destroyRecursive();
				domConstruct.empty(cellNode);
			};

			cellNode.data.entryType = entryType || '';
			var newWidget = this.renderCellContent(rowNode, colNode, cellNode, cellNode.data);
			newWidget.set('value', value);
			return newWidget;
		},

		getCellWidget: function (cellNode) {
			if (cellNode && cellNode.childNodes.length > 0 && cellNode.childNodes[0].nodeType == 1) {
				return registry.byNode(cellNode.childNodes[0]) || null;
			}
			else {
				return null;
			};
		},

		getCellAt: function (r, c) {
			var row = this.table.rows[r];
			if (!row) {
				return null;
			};
			for (var cx = 0; cx < row.cells.length; cx++) {
				if (row.cells[cx].dataCol == c) {
					return row.cells[cx];
				};
			};
			return null;
		},

		getCellChain: function (cell) {
			return [
                cell,
                this.table.rows[cell.dataRow],
                this.colGroup.childNodes[cell.dataCol],
                this.table
			];
		},

		getCellAtAddress: function (addr) {
			var rc = this.addrToRc(addr);
			return this.getCellAt(rc.r, rc.c);
		},

		getCellForCol: function (row, c) {
			for (var cx = 1; cx < row.cells.length; cx++) {
				if (row.cells[cx].dataCol == c) {
					return row.cells[cx];
				};
			};
			return null;
		},

		/* === end: Rendering === */

		addRow: function () {
			var row = this.table.insertRow(-1);
			if (this.table.data.rowStyle) {
				row.setAttribute('style', this.table.data.rowStyle);
			};
			row.data = {};
			var col = null;
			var cell = row.insertCell(-1);
			cell.data = {};
			var colGroup = this.colGroup;
			domClass.add(cell, 'selector rowSelector');
			for (c = 1; c < this.dataCols; c++) {
				cell = row.insertCell(-1);
				cell.data = {};
				col = colGroup.childNodes[c];
				this.renderCellContent(row, col, cell, {});
			};
			this.dataRows++;
			this.updateAddresses();
			this.updateStyles();
			return row;
		},

		insertRow: function (index) {
			if (index == 0) {
				return null;
			};

			if (index < 0 || index >= this.dataRows) {
				return this.addRow();
			};

			var r = 0;
			var c = 0;
			var row = null;
			var col = null;
			var cell = null;
			var skipCols = [];
			var colNodes = this.colGroup.childNodes;

			for (r = index - 1; r >= 1; r--) {
				row = this.table.rows[r];
				array.forEach(row.cells, function (cell) {
					var rowSpan = parseInt(cell.getAttribute('rowSpan'), 10) || 1;
					if ((r + rowSpan - 1) >= index) {
						cell.setAttribute('rowSpan', rowSpan + 1);
						skipCols[cell.dataCol] = true;
						var colSpan = parseInt(cell.getAttribute('colSpan'), 10) || 1;
						while (colSpan > 1) {
							skipCols[cell.dataCol + colSpan] = true;
							colSpan--;
						};
					};
				});
			};

			row = this.table.insertRow(index);
			row.data = {};
			if (this.table.data.rowStyle) {
				row.setAttribute('style', this.table.data.rowStyle);
			};
			cell = row.insertCell(-1);
			cell.data = {};
			domClass.add(cell, 'selector rowSelector');

			for (c = 1; c < this.dataCols; c++) {
				if (!skipCols[c]) {
					cell = row.insertCell(-1);
					cell.dataRow = r;
					cell.dataCol = c;
					cell.data = {};
					this.renderCellContent(row, colNodes[c], cell, {});
				};
			};

			this.dataRows++;
			this.updateAddresses();
			this.updateStyles();
			return row;
		},

		addCol: function () {
			var col = domConstruct.place('<col></col>', this.colGroup, 'last');
			col.data = {};
			if (this.table.data.colStyle) {
				col.setAttribute('style', this.table.data.colStyle);
			};

			array.forEach(this.table.rows, function (row, r) {
				var cell = row.insertCell(-1);
				cell.data = {};
				if (r == 0) {
					domClass.add(cell, 'selector colSelector');
				}
				else {
					this.renderCellContent(row, col, cell, {});
				};
			}, this);
			this.dataCols++;
			this.updateAddresses();
			this.updateStyles();
			return col;
		},

		insertCol: function (index) {
			if (index == 0) {
				return null;
			};
			if (index < 0 || index >= this.dataCols) {
				return this.addCol();
			};

			var col = domConstruct.place('<col></col>', this.colGroup.childNodes[index], 'before');
			col.data = {};
			if (this.table.data.colStyle) {
				col.setAttribute('style', this.table.data.colStyle);
			};

			var row = null;
			var cell = null;
			var r = 0;
			var c = 0;
			var cx = 0;
			var done = false;
			var current = null;
			var rowSpan = 0;
			var colSpan = 0;
			row = this.table.rows[0];
			cell = row.insertCell(index);
			cell.data = {};
			cell.colType = 'selector';
			domClass.add(cell, 'selector colSelector');

			for (r = 1; r < this.dataRows; r++) {
				row = this.table.rows[r];
				c = 1;
				done = false;
				cell = null;
				while (c < row.cells.length && !done) {
					current = row.cells[c];
					if (current.dataCol < index) {
						colSpan = parseInt(current.getAttribute('colSpan'), 10) || 1;
						if (colSpan > 1) {
							if ((current.dataCol + colSpan) >= index) {
								current.setAttribute('colSpan', colSpan + 1);
								done = true;
							}
						};
					}
					else if (current.dataCol == index) {
						cell = row.insertCell(c);
						cell.data = {};
						colSpan = parseInt(current.getAttribute('colSpan'), 10) || 1;
						if (colSpan > 1) {
							cell.setAttribute('colspan', colSpan + 1);
							current.removeAttribute('colspan');
							rowSpan = parseInt(current.getAttribute('rowSpan'), 10) || 1;
							if (rowSpan > 1) {
								cell.setAttribute('rowSpan', rowSpan);
								current.removeAttribute('rowSpan');
							};
						};
						done = true;
					}
					else {
						done = true;
					};
					c++;
				};
				if (cell != null) {
					this.renderCellContent(row, col, cell, {});
				};
			};
			this.dataCols++;
			this.updateAddresses();
			this.updateStyles();
			return col;
		},

		deleteRow: function (index) {
			if (index <= 0 || index > this.dataRows) {
				return false;
			};

			var r = 0;
			var row = null;
			for (r = index - 1; r >= 1; r--) {
				row = this.table.rows[r];

				array.forEach(row.cells, function (cell) {
					var rowSpan = parseInt(cell.getAttribute('rowSpan'), 10) || 1;
					if ((r + rowSpan - 1) >= index) {
						cell.setAttribute('rowSpan', rowSpan - 1);
					};
				});
			};

			row = this.table.rows[index];

			if (row.data && row.data.isAutoExp) {
			    this.getFindings().forEach(function (x) {
			        if (x && x.domNode && x.autoExpRow == row) {
			            x.destroyRecursive();
			        }
			    })
			};

			array.forEach(row.cells, function (cell) {
				this.deleteCell(cell);
			}, this);
			this.table.deleteRow(index);

			this.dataRows--;
			this.updateAddresses();
			return true;
		},

		deleteCol: function (index) {
			if (index <= 0 || index > this.dataCols) {
				return false;
			};

			var col = this.colGroup.childNodes[index];

			if (col.data && col.data.isAutoExp) {
			    this.getFindings().forEach(function (x) {
			        if (x && x.domNode && x.autoExpCol == col) {
			            x.destroyRecursive();
			        }
			    })
			};

			this.colGroup.removeChild(col);

			var r = 0;
			var c = 0;
			var colSpan = 0;
			var cell = null;
			var done = false;

			array.forEach(this.table.rows, function (row) {
				c = 1;
				done = false;
				cell = null;
				colSpan = 0;

				while (c < row.cells.length && !done) {
					cell = row.cells[c];
					if (cell.dataCol < index) {
						colSpan = parseInt(cell.getAttribute('colSpan'), 10) || 1;
						if ((c + colSpan - 1) >= index) {
							cell.setAttribute('colSpan', colSpan - 1);
							done = true;
						}
					}
					else if (cell.dataCol == index) {
						this.deleteCell(cell);
						done = true;
					}
					else {
						done = true;
					}
					c++;
				};
			}, this);

			this.dataCols--;
			this.updateAddresses();
			return true;
		},

		insertCell: function (r, c) {
			var row = this.table.rows[r];
			var col = this.colGroup.childNodes[c];
			var cell = null;
			for (var cx = 0; cx < row.cells.length; cx++) {
				if (row.cells[cx].dataCol >= c) {
					cell = domConstruct.place('<td></td>', row.cells[cx], 'before');
					row.cells[cx].dataCol++;
					break;
				};
			};
			if (!cell) {
				cell = row.insertCell(-1);
			};
			cell.data = {};
			cell.dataRow = r;
			cell.dataCol = c;
			this.renderCellContent(row, col, cell, {});
			return cell;
		},

		deleteCell: function (cell) {
			if (!cell) {
				return;
			};

			var widget = this.getCellWidget(cell);
			if (widget) {
				widget.destroyRecursive();
			};
			domConstruct.empty(cell);
			cell.parentNode.removeChild(cell);
			return true;
		},

		mergeCells: function (bounds) {
			var rootCell = this.getCellAt(bounds.r0, bounds.c0);
			if (!rootCell) {
				return;
			};

			var r = 0;
			var c = 0;
			var row = null;
			var cell = null;
			var toDelete = [];
			var rowSpan = bounds.r1 - bounds.r0 + 1;
			var colSpan = bounds.c1 - bounds.c0 + 1;

			for (r = bounds.r0; r <= bounds.r1; r++) {
				row = this.table.rows[r];
				array.forEach(row.cells, function (cell) {
					if (!(cell.dataRow == bounds.r0 && cell.dataCol == bounds.c0)) {
						if ((cell.dataRow >= bounds.r0 && cell.dataCol >= bounds.c0 && cell.dataRow <= bounds.r1 && cell.dataCol <= bounds.c1)) {
							toDelete.push(cell);
						};
					};
				}, this);
			};

			while (toDelete.length > 0) {
				this.deleteCell(toDelete.pop());
			};

			if (rowSpan > 1) {
				rootCell.setAttribute('rowSpan', rowSpan);
			};
			if (colSpan > 1) {
				rootCell.setAttribute('colSpan', colSpan);
			};

			this.updateAddresses();
			return true;
		},

		unmergeCell: function (cell) {
			var rowSpan = parseInt(cell.getAttribute('rowSpan'), 10) || 1;
			var colSpan = parseInt(cell.getAttribute('colSpan'), 10) || 1;
			var r = cell.dataRow;
			var c = cell.dataCol;
			var cx = c + 1;
			while (cx < c + colSpan) {
				this.insertCell(r, cx);
				cx++;
			};
			var rx = r + 1;
			while (rx < r + rowSpan) {
				cx = c;
				while (cx < c + colSpan) {
					this.insertCell(rx, cx);
					cx++;
				};
				rx++;
			};
			cell.removeAttribute('rowSpan');
			cell.data.rowSpan = 0;
			cell.removeAttribute('colSpan');
			cell.data.colSpan = 0;
			this.updateAddresses();
			return true;
		},

		removeEmptyRows: function () {
			var isEmpty = false;
			var r = this.dataRows - 1;
			var c = 0;

			while (r > 0 && this.dataRows > this.minRows) {
				var row = this.table.rows[r];
				if (!row.data.rowType || row.data.rowType == 'data') {
					if (!row.data.findingRef) {
						isEmpty = true;
						c = 1;
						while (c < row.cells.length && isEmpty) {
							var widget = this.getCellWidget(row.cells[c]);
							if (widget) {
								isEmpty = widget.isEmpty();
							};
							c++;
						};
						if (isEmpty) {
							this.deleteRow(r);
						};
					};
				};
				r--;
			};
		},

		removeEmptyCols: function () {
			var isEmpty = false;
			var r = 0;
			var c = this.dataCols - 1;
			while (c > 0 && this.dataCols > this.minCols) {
				var col = this.colGroup.childNodes[c];
				if (!col.data.colType || col.data.colType == 'data') {
					if (!col.data.findingRef) {
						isEmpty = true;
						this.forWidgetInCol(c, function (widget) {
							if (widget.value || widget.findingRef) {
								isEmpty = isEmpty && widget.isEmpty();
							};
						});
						if (isEmpty) {
							this.deleteCol(c);
						};
					};
				};
				c--;
			};
		},


		mergeObjects: function (/*target, source1, source2, ... */) {
			var args = Array.prototype.slice.apply(arguments);
			var target = args.shift() || {};
			var source = args.shift();
			while (source) {
				for (var p in source) {
					if (target[p] == undefined) {
						target[p] = source[p];
					};
				};
				source = args.shift();
			};
			return target;
		},

		createCellData: function () {
			var r = 0;
			var c = 0;
			var cellData = [];
			for (r = 0; r < this.dataRows; r++) {
				cellData.push([]);
				for (c = 0; c < this.dataCols; c++) {
					cellData[r].push({});
				};
			};
			return cellData;
		},

		/* === begin: Serialization === */

		parseXmlChildElements: function (widget, xmlNode, sourceClass) {
			this.parseFindings(xmlNode);
			this.parseSettings(xmlNode);
			this.parseOptionLists(xmlNode);
			this.parseBindings(xmlNode);

			this.recalc();
			//this.updateDisplay();
		},

		parseFindings: function (xmlNode) {
			var findingList = this.findingList;
			var xFindings = XmlUtil.selectChildElement(xmlNode, 'Findings');
			if (xFindings) {
			    array.forEach(XmlUtil.selectChildElements(xFindings, 'Finding'), function (xFinding) {
			        xFinding.removeAttribute('IsFreeText');
					var widget = this.parseXml(xFinding);
					if (widget) {
						widget.startup();
						widget.placeAt(findingList.containerNode);
					};
				}, this);
			};
		},

		parseSettings: function (xmlNode) {
			var cellData = this.createCellData();

			var xSettings = XmlUtil.selectChildElement(xmlNode, 'TableSettings');
			if (xSettings) {
				cellData[0][0] = XmlUtil.elementToObject(xSettings);
			};

			xSettings = XmlUtil.selectChildElement(xmlNode, 'ColumnSettings');
			if (xSettings) {
				array.forEach(XmlUtil.selectChildElements(xSettings, 'Column'), function (xSetting) {
				    var data = XmlUtil.elementToObject(xSetting);
					if (data.index > 0 && data.index < this.dataCols) {
						cellData[0][data.index] = data;
					};
				}, this);
			};

			var xSettings = null;
			xSettings = XmlUtil.selectChildElement(xmlNode, 'RowSettings');
			if (xSettings) {
				array.forEach(XmlUtil.selectChildElements(xSettings, 'Row'), function (xSetting) {
					var data = XmlUtil.elementToObject(xSetting);
					if (data.index > 0 && data.index < this.dataRows) {
						cellData[data.index][0] = data;
					};
				}, this);
			};

			xSettings = XmlUtil.selectChildElement(xmlNode, 'CellSettings');
			var mergedData = null;
			if (xSettings) {
				array.forEach(XmlUtil.selectChildElements(xSettings, 'Cell'), function (xSetting) {
				    var data = XmlUtil.elementToObject(xSetting);

				    if (data.valueType == 'text' && data.value != null && typeof (data.value) != "undefined") {
				        data.value = data.value.toString();
				    }

					if (data.row > 0 && data.row < this.dataRows && data.col > 0 && data.col < this.dataCols) {
						cellData[data.row][data.col] = data;
					};
				}, this);
			};

			this.renderTable(cellData);
		},

		writeNoteElement: function (writer, mode) {
			writer.beginElement('Element');
			this.writeAllAttributes(writer, mode);
			this.writeNoteChildren(writer, mode);
			writer.endElement();
		},

		writeNoteAttributes: function (writer, mode) {
			writer.attribute('Type', this.declaredClass);
			array.forEach(this._pgGetProperties(), function (propInfo) {
				writer.attribute(StringUtil.toCamelUpper(propInfo.name), this.get(propInfo.name), '');
			}, this);
		},

		writeNoteChildren: function (writer, mode) {
			this.writeSettings(writer, mode);
			this.writeFindings(writer, mode);
			this.writeOptionLists(writer, mode);
			this.writeBindings(writer, mode);
		},

		writeFindings: function (writer, mode) {
			var findings = this.findingList.getFindings();
			if (findings.length > 0) {
				writer.beginElement('Findings');
				array.forEach(findings, function (finding) {
					finding.writeNoteElement(writer, mode);
				});
				writer.endElement();
			};
		},

		writeSettings: function (writer, mode) {
			var defaultValues = { rowType: 'data', colType: 'data' };

			var empty = function (x) {
			    return x === undefined || x === null;
			};

			var getUniqueProperties = function () {
				var args = Array.prototype.slice.call(arguments, 0);
				var target = args.shift();
				var result = null;
				var name = '';
				var pLen = args.length;
				var isUnique = false;
				for (name in target) {
					if (target[name]) {
						isUnique = true;
						p = 0;
						while (p < pLen) {
						    if (empty(args[p]) || empty(args[p][name])) {
						        p++;
						    }
						    else if (args[p][name] === target[name]) {
						        isUnique = false;
						        p += pLen;
						    }
						    else {
						        isUnique = true;
						        p += pLen;
						    };
						};
						if (isUnique) {
							if (!result) {
								result = {};
							};
							result[name] = target[name];
						};
					};
				};
				return result;
			};

			var self = this;
			var widgetTemplates = {};
			array.forEach(_CellWidgets.getWidgetTypes(), function (typeName) {
				widgetTemplates[typeName] = {};
				var widget = _CellWidgets.createNew(typeName, { owner: self });
				array.forEach(widget._pgGetProperties(), function (prop) {
					widgetTemplates[typeName][prop.name] = widget.get(prop.name);
				});
				widget.destroyRecursive();
			});

			var started = false;
			var tableData = getUniqueProperties(this.table.data, defaultValues);
			if (tableData) {
				writer.writeObject('TableSettings', tableData);
			};

			started = false;
			var rowData = array.map(this.table.rows, function (node) { return getUniqueProperties(node.data, tableData, defaultValues) });
			array.forEach(rowData, function (data, i) {
				if (i > 0 && data) {
					if (!started) {
						writer.beginElement('RowSettings');
						started = true;
					};
					writer.beginElement('Row');
					writer.attribute('Index', i);
					writer.writeObjectAttributes(data);
					writer.endElement();
				};
			});
			if (started) {
				writer.endElement();
			};

			started = false;
			var colData = array.map(this.colGroup.childNodes, function (node) { return getUniqueProperties(node.data, tableData, defaultValues) });
			array.forEach(colData, function (data, i) {
				if (i > 0 && data) {
					if (!started) {
						writer.beginElement('ColumnSettings');
						started = true;
					};
					writer.beginElement('Column');
					writer.attribute('Index', i);
					writer.writeObjectAttributes(data);
					writer.endElement();
				};
			});
			if (started) {
				writer.endElement();
			};

			started = false;
			this.forEachCell(null, function (node) {
			    var cellData = node.data || {};

				var widget = this.getCellWidget(node);
				if (widget) {
					array.forEach(widget._pgGetProperties(), function (prop) {
						cellData[prop.name] = widget.get(prop.name);
					});
				};
				if (node.rowSpan > 1) {
					cellData.rowSpan = node.rowSpan;
				};
				if (node.colSpan > 1) {
					cellData.colSpan = node.colSpan;
				};

			    cellData = lang.clone(cellData);

			    delete cellData.rowStyle;
			    delete cellData.colStyle;

				var data = getUniqueProperties(cellData, colData[node.dataCol], rowData[node.dataRow], tableData, defaultValues);
				if (data) {
					if (!started) {
						writer.beginElement('CellSettings');
						started = true;
					};
					writer.beginElement('Cell');
					writer.attribute('Row', node.dataRow);
					writer.attribute('Col', node.dataCol);
					writer.writeObjectAttributes(data);
					writer.endElement();
				};
			});
			if (started) {
				writer.endElement();
			};


		},


		/* === end: Serialization === */

		/* === begin: Addressing === */
		rcToAddr: function (row, col) {
			return this.toBase26(col) + row.toString();
		},

		addrToRc: function (addr) {
			if (!addr) {
				return null;
			};
			var rs = '';
			var cs = '';
			var a = 0;
			addr = addr.toUpperCase();
			for (var n = 0; n < addr.length; n++) {
				a = addr.charCodeAt(n);
				if (48 <= a && a <= 57) {
					rs += addr.charAt(n);
				}
				else if (65 <= a && a <= 90) {
					cs += addr.charAt(n);
				}
			};
			var row = rs == '' ? null : parseInt(rs, 10);
			var col = cs == '' ? null : this.fromBase26(cs);
			return { r: row, c: col };
		},

		toBase26: function (col) {
			if (col == 0) {
				return "0";
			};
			var cs = [];
			var mod = 0;
			while (col > 0) {
				mod = (col - 1) % 26;
				cs.unshift(String.fromCharCode(65 + mod));
				col = Math.floor((col - mod) / 26);
			};
			return cs.join('');
		},

		fromBase26: function (col) {
			var n = 0;
			var v = 0;
			for (var i = col.length - 1; i >= 0; i--) {
				v += Math.min(Math.max(col.charCodeAt(i) - 64, 0), 26) * Math.pow(26, n);
				n++;
			};
			return v;
		},

		getRangeBounds: function (rangeAddr) {
			var a = array.map(rangeAddr.split(':'), function (x) {
				return this.addrToRc(x)
			}, this);

			if (a.length > 1) {
				return this.bounds(a[0].r, a[0].c, a[1].r, a[1].c);
			}
			else {
				return this.bounds(a[0].r, a[0].c);
			};
		},

		getRangeCellAddresses: function (rangeAddr) {
			var bounds = this.getRangeBounds(rangeAddr);
			var list = [];
			this.forEachCell(bounds, function (cell) {
				list.push(this.rcToAddr(cell.dataRow, cell.dataCol));
			});
			return list;
		},

		/* === end: Addressing === */

		/* === begin: Designer Functions === */
		getDesigner: function () {
			return this.selectionRange.getSelectionType() ? this.selectionRange : this;
		},

		getDesignableChildren: function () {
		    //return [];
		    var selType = this.selectionRange.getSelectionType();
		    return !selType || selType == 'table' ? [] : [this.selectionRange];
		},

		_pgPropDef_rows: function() {
		    return { name: 'rows', caption: 'Rows', type: 'integer', group: 'Layout', description: core.getI18n('tooltipRows') };
		},

		_pgPropDef_cols: function() {
		    return { name: 'cols', caption: 'Columns', type: 'integer', group: 'Layout', description: core.getI18n('tooltipCols') };
		},

		_pgPropDef_entryVector: function() {
		    return { name: 'entryVector', caption: 'Auto-expand by', options: '[=;row=Row;col=Column]', group: 'Layout', changesLayout: true, description: core.getI18n('tooltipAutoExpandBy') };
		},

		_pgPropDef_groupKeys: function() {
		    return { name: 'groupKeys', group: 'Content Placement', description: core.getI18n('tooltipGroupKeys') };
		},

		_pgPropDef_groupingRule: function() {
		    return { name: 'groupingRule', group: 'Content Placement', description: core.getI18n('tooltipGroupingRule') };
		},

		_pgPropDef_findingVector: function() {
		    return { name: 'findingVector', caption: 'Add Findings by', options: '[=;row=Row;col=Column]', group: 'Content Placement', description: core.getI18n('tooltipAddFindingsBy') };
		},

		_pgPropDef_placementId: function() {
		    return { name: 'placementId', caption: 'Place At', isAdvanced: true, isShareable: true, group: 'Behavior', description: core.getI18n('tooltipPlaceAt') };
		},

		_pgPropDef_position: function() {
		    return { name: 'position', caption: 'Postion', isAdvanced: true, isShareable: true, group: 'Behavior', options: '[;first;last;before;after]', description: core.getI18n('tooltipPosition') };
		},

		_pgPropDef_formMergePlacement: function () {
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

		_pgGetPropertyValue: function (propInfo) {
			if (propInfo.source == 'table') {
				return this.table.data ? this.table.data[propInfo.name] : '';
			}
			else {
				return this.get(propInfo.name);
			};
		},

		_pgSetPropertyValue: function (propInfo, value) {
			if (propInfo.source == 'table') {
				if (!this.table.data) {
					this.table.data = {};
				};
				this.table.data[propInfo.name] = value;
			}
			else {
				this.set(propInfo.name, value);
			};


			if (propInfo.name == 'name' || propInfo.name == 'groupKeys' || propInfo.name == 'groupingRule') {
				topic.publish('/qc/OnGroupingRulesChanged');
			};

			return true;
		},

		getNavigatorLabel: function () {
			return this.name || 'Table';
		},
		/* === end: Designer Functions === */

		/* === begin: Selection Methods === */
		getSelection: function () {
			return this.selectionRange;
		},

		clearRangeSelection: function () {
			query('.rangeSelection', this.domNode).removeClass('rangeSelection');
		},

		toggleSelection: function (evt) {
			//        if (this.getViewMode() != 'design') {
			//            this.clearRangeSelection();
			//            this.setSelected(!this.isSelected());
			//            return;
			//        };

			if (this.designerView == 'dataView') {
				this.clearRangeSelection();
				this.setSelected(!this.isSelected());
				return;
			};

			var cellNode = core.ancestorNodeByTagName(evt.target, 'td', true);
			if (!cellNode) {
				this.selectTable();
				return;
			};

			var r = cellNode.dataRow;
			var c = cellNode.dataCol;

			var region = (r == 0 ? 0 : 2) + (c == 0 ? 0 : 1);
			switch (region) {
				case 0: //table selector
					this.selectTable();
					break;
				case 1: //col selector
					this.selectCol(c);
					break;
				case 2: //row selector
					this.selectRow(r);
					break;
				case 3: //cell
					if (core.util.isMultiSelectEvent(evt)) {
						if (domClass.contains(cellNode, 'rangeSelection')) {
							domClass.remove(cellNode, 'rangeSelection');
						}
						else {
							domClass.add(cellNode, 'rangeSelection');
						}
					}
					else {
						this.clearRangeSelection();
						domClass.add(cellNode, 'rangeSelection');
					};

					if (this.getViewMode() == 'design') {
						if (!domClass.contains(this.domNode, 'selected')) {
							this.setSelected(true, true);
						};
					}
					else {
						var cellWidget = this.getCellWidget(cellNode);
						var finding = cellWidget ? cellWidget.getFinding() : null;
						if (finding) {
							if (!domClass.contains(finding.domNode, 'selected')) {
								finding.setSelected(true, true);
							};
						}
						else {
							if (!domClass.contains(this.domNode, 'selected')) {
								this.setSelected(true, true);
							};
						}
					};

					break;
			};
		},

		selectTable: function () {
			this.clearRangeSelection();
			domClass.add(this.table, 'rangeSelection');
			this.setSelected(true, true);
		},

		selectRow: function (r) {
			if (r > 0 && r < this.dataRows) {
				var rowNode = this.table.rows[r];
				if (rowNode) {
					this.clearRangeSelection();
					domClass.add(rowNode, 'rangeSelection');
					this.setSelected(true, true);
				};
			};
		},

		selectCol: function (c) {
			if (c > 0 && c < this.dataCols) {
				var colNode = this.colGroup.childNodes[c];
				if (colNode) {
					this.clearRangeSelection();
					domClass.add(colNode, 'rangeSelection');
					this.setSelected(true, true);
				};
			};
		},

		selectRowDataCells: function (r) {
			var row = this.table.rows[r];
			var cols = this.colGroup.childNodes;
			array.forEach(row.cells, function (cell) {
				if (cols[cell.dataCol] && !cols[cell.dataCol].data.colType) {
					domClass.add(cell, 'rangeSelection');
				};
			});
		},

		selectColDataCells: function (c) {
			array.forEach(this.table.rows, function (row, r) {
				if (!row.data.rowType) {
					array.forEach(row.cells, function (cell) {
						if (cell.dataCol == c) {
							domClass.add(cell, 'rangeSelection');
						};
					});
				};
			});
		},

		/* === end: Selection Methods === */

		bounds: function (r0, c0, r1, c1) {
			r0 = r0 == null ? 1 : r0;
			c0 = c0 == null ? 1 : c0;
			r1 = r1 == undefined ? r0 : r1 < 0 ? this.dataRows - 1 : r1;
			c1 = c1 == undefined ? c0 : c1 < 0 ? this.dataCols - 1 : c1;
			var tmp = null;
			if (r1 < r0) {
				tmp = r1;
				r1 = r0;
				r0 = tmp;
			};
			if (c1 < c0) {
				tmp = c1;
				c1 = c0;
				c0 = tmp;
			};
			return {
				r0: r0,
				c0: c0,
				r1: r1,
				c1: c1,
				rs: r1 - r0,
				cs: c1 - c0,
				contains: function (r, c) {
					return r >= this.r0 && c >= this.c0 && r <= this.r1 && c <= this.c1;
				},
				containsCell: function (cell) {
					return this.contains(cell.dataRow, cell.dataCol);
				}
			};
		},

		/* === begin: Commands === */
		getContextActions: function (item, widget, targetNode) {
			var list = [];

			if (this.getViewMode() == 'design') {
				if (this.designerView == 'dataView') {
					return [{ label: 'Show Layout', onClick: lang.hitch(this, this._cmdShowLayout) }];
				};

				if (domClass.contains(targetNode, 'selector')) {
					this.toggleSelection({ target: targetNode });
				}
				else if (!core.ancestorNodeByClass(targetNode, 'rangeSelection', true)  && targetNode != this.domNode) {
					this.toggleSelection({ target: targetNode });
				};

				var sel = this.getSelection();
				var selType = sel.getSelectionType();

				if (selType == 'row') {
					list.push({ label: 'Insert Before', onClick: lang.hitch(this, this._cmdInsertBefore) });
					list.push({ label: 'Insert After', onClick: lang.hitch(this, this._cmdInsertAfter) });
					list.push({ label: 'Delete Row', onClick: lang.hitch(this, this._cmdDeleteSelection), beginGroup: true });
				}
				else if (selType == 'col') {
					list.push({ label: 'Insert Before', onClick: lang.hitch(this, this._cmdInsertBefore) });
					list.push({ label: 'Insert After', onClick: lang.hitch(this, this._cmdInsertAfter) });
					list.push({ label: 'Delete Column', onClick: lang.hitch(this, this._cmdDeleteSelection), beginGroup: true });
				}
				else if (selType == 'range') {
					if (sel.isContiguous() && !sel.containsMergedCells()) {
						list.push({ label: 'Merge Cells', onClick: lang.hitch(this, this._cmdMergeSelection) });
					};
				}
				else if (selType == 'cell') {
					var cellNode = sel.getSelectedNode();
					if (cellNode.getAttribute('rowSpan') > 1 || cellNode.getAttribute('colSpan') > 1) {
						list.push({ label: 'Unmerge Cells', onClick: lang.hitch(this, this._cmdUnmergeSelection) });
					};
				}


				list.push({ label: 'Show Findings', onClick: lang.hitch(this, this._cmdShowData), beginGroup: list.length > 0 });
			};

			//list.push({ label: 'Delete Table', onClick: lang.hitch(this, this.dropDelete), beginGroup: list.length > 0 });

			return list;
		},

		_cmdInsertBefore: function () {
			var sel = this.getSelection();
			var selType = sel.getSelectionType();
			var bounds = sel.getBounds();
			if (selType == 'row' && bounds.r0 > 0) {
				this.insertRow(bounds.r0);
				this.selectRow(bounds.r0);
			}
			else if (selType == 'col' && bounds.c0 > 0) {
				this.insertCol(bounds.c0);
				this.selectCol(bounds.c0);
			};
		},

		_cmdInsertAfter: function () {
			var sel = this.getSelection();
			var selType = sel.getSelectionType();
			var bounds = sel.getBounds();
			if (selType == 'row') {
				this.insertRow(bounds.r0 + 1);
				this.selectRow(bounds.r0 + 1);
			}
			else if (selType == 'col') {
				this.insertCol(bounds.c0 + 1);
				this.selectCol(bounds.c0 + 1);
			};
		},

		_cmdDeleteSelection: function () {
			var sel = this.getSelection();
			var selType = sel.getSelectionType();
			var bounds = sel.getBounds();
			if (selType == 'row' && bounds.r0 > 0) {
				this.deleteRow(bounds.r0);
			}
			else if (selType == 'col' && bounds.c0 > 0) {
				this.deleteCol(bounds.c0);
			};
		},

		_cmdMergeSelection: function () {
			if (this.selectionRange.getSelectionType() == 'range') {
				this.mergeCells(this.selectionRange.getBounds());
			}
		},

		_cmdUnmergeSelection: function () {
			var cellNode = this.selectionRange.getSelectedNode();
			if (cellNode && (cellNode.getAttribute('rowSpan') || cellNode.getAttribute('colSpan'))) {
				this.unmergeCell(cellNode);
			};
		},

		_cmdShowData: function () {
			var pos = domGeometry.position(this.table);
			if (pos.w >= 100) {
				domStyle.set(this.findingList.domNode, { width: pos.w + 'px' });
			}
			else {
				domStyle.set(this.findingList.domNode, { width: 'auto' });
			};
			this.findingList.updateDisplay();
			this.set('designerView', 'dataView');
		},

		_cmdShowLayout: function () {
			this.setSelected(true, true);
			this.set('designerView', 'layoutView');
		},

		/* === end Commands === */

		/* === begin: Formulas === */
		recalcAll: function () {
			array.forEach(this.table.rows, function (row) {
				array.forEach(row.cells, function (cell) {
					var widget = this.getCellWidget(cell);
					if (widget && widget.formula) {
						widget.calculate();
					};
				}, this);
			}, this);
		},

		recalc: function (bounds) {
			this.forEachCell(bounds, function (cell) {
				var widget = this.getCellWidget(cell);
				if (widget && widget.formula) {
					widget.calculate();
				};
			});
		},

		onCellValueChanged: function (cell, value) {
			var cellWidget = this.getCellWidget(cell);
			this.forEachCell(null, function (x) {
				var widget = this.getCellWidget(x);
				if (widget && widget.dependsOn(cell)) {
					widget.calculate();
				};
			});
			if (this.getViewMode() != 'design') {
				this.ensureEntryLine();
			};
		},


		//begin =========== Add/Remove Findings ============
		getFindings: function () {
			return this.findingList.getFindings();
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

		getDropAction: function (source, evt) {
		    if (this.getViewMode() != 'design') {
		        return null;
		    };
			switch (source.type || 'unknown') {
				case "finding":
					return source.node ? 'move' : null;
				case "term":
					return 'add';
				default:
					return null;
			};
		},

		doDrop: function (source, evt) {
		    if (this.getViewMode() != 'design') {
		        return null;
		    };
			var dropCell = core.ancestorNodeByTagName(evt.target, 'td', true) || this.table;
			if (source.type == 'term') {
				topic.publish("/qc/AddToNote", source, dropCell, 'last')
			}
			else if (source.type == 'finding') {
			    var sourceWidget = registry.byNode(source.node)
			    var existing = this.getFindings().filter(function (x) { return x.isEquivalentElement(sourceWidget) })[0] || null;
				if (existing) {
					var targetFinding = core.ancestorWidgetByClass(evt.target, 'finding');
					if (targetFinding && targetFinding.id != sourceWidget.id) {
						sourceWidget.placeAt(targetFinding.domNode, 'before');
					}
				}
				else {
					this.addElement(sourceWidget, dropCell);
				}
			};
		},

		addElement: function (element, relativeTo, position, suspendUpdate, sourceClass) {
			if (!element || !element.domNode || !domClass.contains(element.domNode, 'finding')) {
				return null;
			};

			var existing = this.getFindings().filter(function (x) { return x.isEquivalentElement(element) })[0] || null;
			if (existing) {
			    if (sourceClass) {
			        domClass.add(existing.domNode, sourceClass);
			    };
				return existing.merge(element);
			};

			var name = this.findingList.getUniqueName(element.get('name') || 'M' + element.medcinId)
			element.set('name', name);
			element.placeAt(this.findingList.containerNode);
			element.updateTranscription();

			if (relativeTo && relativeTo.tagName && relativeTo.tagName.toLowerCase() == 'td') {
				var region = relativeTo ? ((relativeTo.dataRow || 0) == 0 ? 0 : 2) + ((relativeTo.dataCol || 0) == 0 ? 0 : 1) : 0;
				switch (region) {
					case 0:
						this.addFindingToTable(name);
						break;
					case 1:
						var col = this.colGroup.childNodes[relativeTo.dataCol];
						if (col && (col.data.colType || 'data') == 'data' && !col.data.findingRef) {
							this.addFindingByCol(name, col);
						};
						break;
					case 2:
						var row = this.table.rows[relativeTo.dataRow];
						if (row && (row.data.rowType || 'data') == 'data' && !row.data.findingRef) {
							this.addFindingByRow(name, row);
						};
						break;
					case 3:
						var widget = this.getCellWidget(relativeTo);
						if (!widget || widget.isEmpty()) {
							widget.set('findingRef', name);
						};
						break;
				};
			}
			else {
				this.addFindingToTable(name);
			};

			if (!suspendUpdate) {
				this.updateDisplay();
			};
            
			if (sourceClass) {
			    domClass.add(element.domNode, sourceClass);
			};

			return element;
		},

		addFindingToTable: function (name) {
			switch (this.findingVector) {
				case 'row':
					this.addFindingByRow(name);
					break;
				case 'col':
					this.addFindingByCol(name);
					break;
				case 'cellV':
					this.addFindingByCellV(name);
					break;
				case 'cellH':
					this.addFindingByCellH(name);
					break;
			};
		},

		addFindingByRow: function (name, targetRow) {
			var table = this.table;
			var rowType = '';
			var r = 1;
			if (!targetRow) {
				while (r < this.dataRows && !targetRow) {
					switch (table.rows[r].data.rowType) {
						case 'header':
							break;
						case 'footer':
							targetRow = this.insertRow(r);
							break;
						case 'template':
							targetRow = this.insertRow(r);
							break;
						default:
							if (!table.rows[r].data.findingRef) {
								targetRow = table.rows[r];
							};
							break;;
					};
					r++;
				};
				if (!targetRow) {
					targetRow = this.insertRow(-1);
				};
			};
			targetRow.data.findingRef = name;
			this.forWidgetInRow(targetRow.dataRow, function (widget, cell) {
				if (widget && !widget.get('findingRef')) {
					widget.set('findingRef', name);
				};
			});
			return targetRow;
		},

		addFindingByCol: function (name, targetCol) {
			var colGroup = this.colGroup;
			var colType = '';
			var c = 1;
			if (!targetCol) {
				while (c < this.dataCols && !targetCol) {
					switch (colGroup.childNodes[c].data.colType) {
						case 'header':
							break;
						case 'footer':
							targetRow = this.insertCol(c);
							break;
						case 'template':
							targetRow = this.insertCol(c);
							break;
						default:
							if (!colGroup.childNodes[c].data.findingRef) {
								targetCol = colGroup.childNodes[c];
							};
							break;;
					};
					c++;
				};
				if (!targetCol) {
					targetCol = this.insertCol(-1);
				};
			};
			targetCol.data.findingRef = name;
			this.forWidgetInCol(targetCol.dataCol, function (widget, cell) {
				if (widget && !widget.get('findingRef')) {
					widget.set('findingRef', name);
				};
			});
			return targetCol;
		},

		addFindingByCellV: function (name) {
			var colGroup = this.colGroup;
			var targetWidget = null;
			for (var c = 1; c < this.dataCols; c++) {
				if ((colGroup.childNodes[c].data.colType || 'data') == 'data') {
					this.forCellInCol(c, function (cellNode) {
						if (!targetWidget) {
							var widget = this.getCellWidget(cellNode);
							if (widget && widget.isEmpty()) {
								targetWidget = widget;
							};
						};
					});
				};
			};
			if (!targetWidget) {
				col = this.insertCol(-1);
				this.forCellInCol(col.dataCol, function (cellNode) {
					if (!targetWidget) {
						var widget = this.getCellWidget(cellNode);
						if (widget && widget.isEmpty()) {
							targetWidget = widget;
						};
					};
				});
			};
			if (targetWidget) {
				targetWidget.set('findingRef', name);
				return targetWidget;
			}
			else {
				return null;
			};
		},

		addFindingByCellH: function (name) {
			var table = this.table;
			var targetWidget = null;
			for (var r = 1; r < this.dataRows; r++) {
				if ((table.rows[r].data.colType || 'data') == 'data') {
					this.forCellInRow(r, function (cellNode) {
						if (!targetWidget) {
							var widget = this.getCellWidget(cellNode);
							if (widget && widget.isEmpty()) {
								targetWidget = widget;
							};
						};
					});
				};
			};
			if (!targetWidget) {
				var row = this.insertRow(-1);
				this.forCellInRow(row.dataRow, function (cellNode) {
					if (!targetWidget) {
						var widget = this.getCellWidget(cellNode);
						if (widget && widget.isEmpty()) {
							targetWidget = widget;
						};
					};
				});
			};
			if (targetWidget) {
				targetWidget.set('findingRef', name);
				return targetWidget;
			}
			else {
				return null;
			};
		},

		removeEmptyReferences: function () {
			var r = 0;
			var c = 0;
			var refName = '';
			var currentFindings = array.map(this.findingList.getFindings(), function (x) { return x.get('name') }).sort();

			this.forEachWidget(null, function (widget, cell) {
				var refName = widget.get('findingRef');
				if (refName && array.indexOf(currentFindings, refName) < 0) {
					widget.unbind();
					if (cell.data) {
						cell.data.findingRef = ''
					};
					if (widget.rowNode && widget.rowNode.data && widget.rowNode.data.findingRef == refName) {
						widget.rowNode.data.findingRef = '';
					};
					if (widget.colNode && widget.colNode.data && widget.colNode.data.findingRef == refName) {
						widget.colNode.data.findingRef = '';
					};
				};
			});

			this.forEachRow(function (node) {
				if (node.data && node.data.findingRef && array.indexOf(currentFindings, node.data.findingRef) < 0) {
					node.data.findingRef = '';
				};
			});

			this.forEachCol(function (node) {
				if (node.data && node.data.findingRef && array.indexOf(currentFindings, node.data.findingRef) < 0) {
					node.data.findingRef = '';
				};
			});

			this.forEachCell(null, function (node) {
				if (node.data && node.data.findingRef && array.indexOf(currentFindings, node.data.findingRef) < 0) {
					node.data.findingRef = '';
				};
			});

		},

		/* === begin: Navigation === */

		forEachCell: function (bounds, fn) {
			if (!bounds) {
				bounds = this.bounds(1, 1, this.dataRows - 1, this.dataCols - 1);
			};

			var self = this;
			array.forEach(this.table.rows, function (row) {
				array.forEach(row.cells, function (cell) {
					if (bounds.containsCell(cell)) {
						fn.call(self, cell);
					};
				});
			});
		},

		forEachWidget: function (bounds, fn) {
			if (!bounds) {
				bounds = this.bounds(1, 1, this.dataRows - 1, this.dataCols - 1);
			};

			var self = this;
			array.forEach(this.table.rows, function (row) {
				array.forEach(row.cells, function (cell) {
					if (bounds.containsCell(cell)) {
						var widget = self.getCellWidget(cell);
						if (widget) {
							fn.call(self, widget, cell);
						}
					};
				});
			});
		},

		forCellInRow: function (r, fn) {
			this.forEachCell(this.bounds(r, 1, r, this.dataCols - 1), fn);
		},

		forWidgetInRow: function (r, fn) {
			this.forEachWidget(this.bounds(r, 1, r, this.dataCols - 1), fn);
		},

		forCellInCol: function (c, fn) {
			this.forEachCell(this.bounds(1, c, this.dataRows - 1, c), fn);
		},

		forWidgetInCol: function (c, fn) {
			this.forEachWidget(this.bounds(1, c, this.dataRows - 1, c), fn);
		},

		forEachRow: function (fn) {
			var self = this;
			array.forEach(this.table.rows, function (row) {
				fn.call(self, row);
			});
		},

		forEachCol: function (fn) {
			var self = this;
			array.forEach(this.colGroup.childNodes, function (col) {
				fn.call(self, col);
			});
		},

		isEmptyCell: function (cell) {
			var widget = this.getCellWidget(cell);
			return !widget || !widget.hasValue();
		},

		isEmptyRow: function (r) {
			var row = this.table.rows[r];
			if (!row) {
				return false;
			};
			for (var c = 1; c < row.cells.length; c++) {
				if (!this.isEmptyCell(row.cells[c])) {
					return false;
				};
			};
			return true;
		},

		isEmptyCol: function (c) {
			var cx = 0;
			for (var r = 1; r < this.dataRows; r++) {
				if (!this.table.rows[r].data.rowType) {
					for (cx = 1; cx < this.table.rows[r].cells.length; cx++) {
						if (this.table.rows[r].cells[cx].dataCol == c) {
							if (!this.isEmptyCell(this.table.rows[r].cells[cx])) {
								return false;
							};
						};
					};
				};
			};
			return true;
		},
		/* === end: Navigation === */

		getChildNoteElements: function () {
			return this.findingList.getFindings();
		},

		_getComponentSettingsAttr: function () {
			if (!this.componentSettings) {
				var mixin = new ComponentSettingsMixin();
				this.componentSettings = lang.clone(mixin.defaultComponentSettings);
			};
			return this.componentSettings;
		},
		_setComponentSettingsAttr: function (value) {
			this.componentSettings = value;
		},

		clearFindings: function (keepEntries, suspendUpdate) {
		    //overridden to prevent clearing table findings in entry mode
		    if (this.getViewMode() == 'design') {
		        this.findingList.getFindings().forEach(function (child) {
		            if (!keepEntries || !child.get('result')) {
		                child.destroyRecursive();
		            };
		        });
		    };
		},

		finalizeNote: function () {
            //overridden to prevent deleting any unentered findings from the table
		}
	});

	core.settings.noteElementClasses["qc/note/FindingTable"] = FindingTable;
	core.settings.noteElementClasses["qx/FindingTable"] = FindingTable;

	return FindingTable;
});