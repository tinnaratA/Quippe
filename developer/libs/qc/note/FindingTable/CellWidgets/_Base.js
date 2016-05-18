define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/number",
    "qc/_core",
    "qc/DateUtil",
    "qc/design/_PropertyGridSupport",
    "qc/lang/qscript/Compiler",
	"qc/lang/qscript/Host",
    "qc/Transcriber"
], function (_TemplatedMixin, _WidgetBase, array, declare, lang, number, core, DateUtil, _PropertyGridSupport, Compiler, Host, Transcriber) {
    return declare("qc.note.FindingTable.CellWidgets._Base", [_WidgetBase, _TemplatedMixin, _PropertyGridSupport], {
        templateString: '<div class="cellWidget"></div>',
    
        owner: null,
        rowNode: null,
        colNode: null,
        finding: null,
        findingRef: '',
        findingProperty: '',
        findingRange: '',
        value: null,
        formula: '',
        valueType: '',
        format: '',
        compiledFormula: null,
        references: null,
        watchHandle: null,
    
        destroyRecursive: function () {
            if (this.watchHandle) {
                this.watchHandle.unwatch();
                this.watchHandle = null;
            };
            this.owner = null;
            this.rowNode = null;
            this.colNode = null;
            this.finding = null;
            this.value = null;
            this.compiledFormula = null;
            this.references = null;
            this.inherited(arguments);
        },
    
        hasValue: function () {
            return this.value ? true : false;
        },
    
        isEmpty: function () {
            if (this.findingRef || this.value) {
                return false;
            };
    
            if (this.formula) {
                if (this.references) {
                    var refCell = null;
                    var refWidget = null;
                    for (var name in this.references) {
                        refCell = this.references[name];
                        if (refCell) {
                            refWidget = this.owner.getWidget(refCell);
                            if (refWidget) {
                                if (!refWidget.isEmpty()) {
                                    return false;
                                };
                            };
                        };
                    };
                }
            }
            else if (this.value) {
                return false;
            };
    
            return true;
        },
    
        _getValueAttr: function () {
            return this.value == null ? this.getBoundValue() : this.value;
        },
        _setValueAttr: function (value) {
            if (value && typeof value == 'string' && value.charAt(0) == '=') {
                this.set('formula', value.substr(1));
            }
            else {
                if (value !== this.value) {
                    this.value = value;
                    this.setBoundValue(value);
                    this.onCellValueChanged(value);
                    this.updateDisplay();
                }
            };
        },
    
        _getFormulaAttr: function () {
            return this.formula;
        },
        _setFormulaAttr: function (value) {
            this.formula = (value || '').toString().trim();
            if (this.compile()) {
                this.calculate();
            };
        },
    
        _setValueTypeAttr: function (value) {
            this.valueType = value;
            this.updateDisplay();
        },
    
        _setFormatAttr: function (value) {
            this.format = value;
            this.updateDisplay();
        },
    
        _getFindingRefAttr: function () {
            return this.findingRef;
        },
        _setFindingRefAttr: function (value) {
            this.unbind();
            this.findingRef = value;
            this.bind();
        },
    
        _getFindingPropertyAttr: function () {
            return this.findingProperty;
        },
        _setFindingPropertyAttr: function (value) {
            this.findingProperty = value;
            this.bind();
        },
    
        _getFindingRangeAttr: function () {
            return this.findingRange;
        },
        _setFindingRangeAttr: function (value) {
            this.findingRange = (value || '').toString().replace('..', ':');
        },
    
        isDesignMode: function () {
            return this.owner && this.owner.getViewMode() == 'design';
        },
    
        getFormattedValue: function () {
            if (!this.format) {
                return this.value;
            };
    
            var formatOptions = {};
            var formatOptions = {
                selector: 'date',
                locale: this.locale || core.settings.culture
            };
            switch (this.valueType) {
                case 'date':
                    formatOptions.selector = 'date';
                    formatOptions.locale = core.settings.culture;
                    formatOptions.datePattern = this.format;
                    return DateUtil.globalFormat(this.getTypedValue(), formatOptions);
                case 'time':
                    formatOptions.selector = 'time';
                    formatOptions.locale = core.settings.culture;
                    formatOptions.timePattern = this.format;
                    return DateUtil.globalFormat(this.getTypedValue(), formatOptions);
                case 'dateTime':
                    formatOptions.selector = 'date';
                    formatOptions.locale = core.settings.culture;
                    formatOptions.datePattern = this.format;
                    return DateUtil.globalFormat(this.getTypedValue(), formatOptions);
                case 'number':
                    return number.format(this.getTypedValue(), { pattern: this.format });
                default:
                    return this.value;
            };
        },
    
        getTypedValue: function () {
            return this.value || this.getEmptyValue();
        },
    
        updateDisplay: function () {
            this.domNode.innerHTML = this.getFormattedValue() || '';
        },
    
        getFinding: function () {
            if (!this.finding) {
                if (this.findingRef && this.owner) {
                    this.finding = this.owner.findingList.getFinding(this.findingRef);
                };
            };
            return this.finding;
        },
    
    
        getBoundValue: function () {
            if (this.findingProperty) {
                var finding = this.getFinding();
                if (finding) {
                    return finding.get(this.findingProperty);
                };
            };
            return null;
        },
    
        setBoundValue: function (value) {
            if (this.findingProperty) {
                var finding = this.getFinding();
                if (finding) {
                    if (this.findingProperty == 'medcinId' && typeof value == 'object') {
                        for (var p in value) {
                            if (p != 'id') {
                                finding.set(p, value[p]);
                            };
                        };
                    }
                    else {
                        finding.set(this.findingProperty, value);
                    };
                };
    
                var range = this.findingRange;
                if (range) {
                    var owner = this.owner;
                    var propName = this.findingProperty;
    
                    if (range.toLowerCase() == 'row') {
                        range = 'A' + this.rowNode.dataRow + ':' + this.owner.toBase26(this.owner.dataCols) + this.rowNode.dataRow;
                    }
                    else if (range.toLowerCase() == 'col') {
                        range = this.owner.toBase26(this.colNode.dataCol) + '1' + ':' + this.owner.toBase26(this.colNode.dataCol) + this.owner.dataRows;
                    };
    
                    array.forEach(owner.getRangeCellAddresses(range), function (addr) {
                        var cell = owner.getCellAtAddress(addr);
                        if (cell) {
                            var widget = owner.getCellWidget(cell);
                            if (widget && widget.findingRef) {
                                finding = widget.getFinding();
                                if (finding) {
                                    finding.set(propName, value);
                                };
                            };
                        };
                    });
                };
            };
        },
    
        unbind: function () {
            if (this.finding && this.findingProperty) {
                this.value = null;
            };
            if (this.watchHandle) {
                this.watchHandle.unwatch();
            };
            this.finding = null;
            this.findingRef = '';
        },
    
        bind: function () {
            if (this.findingRef && this.findingProperty) {
                var finding = this.getFinding();
                if (finding) {
                    this.value = finding.get(this.findingProperty);
                    if (finding.watch) {
                        if (this.findingProperty == 'description') {
                            this.onBoundPropertyChanged('description', this.value, Transcriber.transcribeItem(finding, false));
                        }

                        else {
                            this.watchHandle = finding.watch(this.findingProperty, lang.hitch(this, this.onBoundPropertyChanged));
                        }
                    };
                };
            };
            this.updateDisplay();
        },
    
        onBoundPropertyChanged: function (name, oldValue, newValue) {
            if (name == this.findingProperty && newValue != this.value) {
                this.value = newValue;
                this.onCellValueChanged(newValue);
                this.updateDisplay();
            };
        },

        _pgPropDef_findingRef: function() {
            return { name: 'findingRef', group: 'Data', options: lang.hitch(this.owner.findingList, this.owner.findingList.getEnumList), description: core.getI18n('tooltipFindingRef') };
        },

        _pgPropDef_findingProperty: function() {
            return { name: 'findingProperty', options: '[;medcinId;text;result;value;unit;onset;duration;episode;timing;prefix;status;modifier;notation;description]', group: 'Data', description: core.getI18n('tooltipFindingProperty') }
        },

        _pgPropDef_findingRange: function() {
            return { name: 'findingRange', group: 'Data', description: core.getI18n('tooltipFindingRange') };
        },

        _pgPropDef_value: function() {
            return { name: 'value', group: 'Data', description: core.getI18n('tooltipCellValue') };
        },
        
        _pgPropDef_valueType: function() {
            return { name: 'valueType', group: 'Data', options: '[;text;number;date;time;dateTime]', reloadOnChange: true, description: core.getI18n('tooltipValueType') };
        },

        _pgPropDef_formula: function() {
            return { name: 'formula', group: 'Data', description: core.getI18n('tooltipFormula') };
        },

        _pgPropDef_format: function() {
            return { name: 'format', group: 'Data', description: core.getI18n('tooltipFormat') };
        },
    
        clearExpression: function () {
            this.references = null;
            this.compiledFormula = null;
        },
    
        compile: function () {
            this.clearExpression();
            var formula = (this.formula || '').trim();
            if (!formula) {
                return true;
            };
    
            //this.translatedFormula = this.translateToRelative(this.formula);
    
            var res = Compiler.compile(formula, { supportsRanges: true });
            if (!res.success) {
                core.showError(res.error);
                return false;
            };
    
            var references = {};
            var refName = '';
            for (refName in res.references) {
                references[refName] = null;
            };
            array.forEach(res.ranges, function (rangeName) {
                array.forEach(this.owner.getRangeCellAddresses(rangeName), function (name) {
                    references[name] = null;
                }, this);
            }, this);
    
            var myAddress = this.getCurrentAddress();
            var cell = null;
            for (refName in references) {
                if (refName == myAddress) {
                    core.showError('Formula contains a circular reference');
                    return false;
                };
                cell = this.owner.getCellAtAddress(refName);
                if (!cell) {
                    core.showError('Invalid cell reference: ' + refName);
                    return false;
                }
                references[refName] = cell;
            };
            this.compiledFormula = res.targetFunction;
            this.references = references;
            return true;
        },
    
        translateToRelative: function (input) {
            var cr = this.cellNode.dataRow;
            var cc = this.cellNode.dataCol;
            var re = new RegExp(/[A-Z]+\d+/g);
            var output = '';
            var last = 0;
            var match = null;
            var rcRef = null;
            while ((match = re.exec(input)) != null) {
                output += input.substr(last, match.index - last);
                rcRef = this.owner.addrToRc(match[0]);
                output += ((rcRef.r - cr) <= 0 ? 'M' : 'P') + Math.abs(rcRef.r - cr);
                output += ((rcRef.c - cc) <= 0 ? 'M' : 'P') + Math.abs(rcRef.c - cc);
                last = re.lastIndex;
            };
            return input;
        },
    
        calculate: function () {
            if (!this.compiledFormula) {
                if (this.formula) {
                    if (!this.compile()) {
                        return;
                    };
                };
            };
    
            if (this.compiledFormula) {
                var currentValue = this.get('value');
                var newValue = this.compiledFormula.call(Host, this);
                if (newValue !== currentValue) {
                    this.set('value', newValue);
                };
            };
        },
    
        dependsOn: function (cell) {
            if (!this.references) {
                return false;
            };
            for (var refName in this.references) {
                if (this.references[refName].cellId == cell.cellId) {
                    return true;
                };
            };
            return false;
        },
    
        getParentCell: function () {
            return this.owner ? core.ancestorNodeByTagName(this.domNode, 'td') : null;
        },
    
        getCurrentAddress: function () {
            var cell = this.getParentCell();
            return cell ? this.owner.rcToAddr(cell.dataRow, cell.dataCol) : '';
        },
    
        onCellValueChanged: function (value) {
            if (this.findingProperty && this.findingProperty != 'result' && this.findingProperty != 'text') {
                var finding = this.getFinding();
                if (finding) {
                    if (value) {
                        if (!finding.get('result')) {
                            finding.set('result', 'A');
                            finding.resultAutoSet = true;
                        };
                    }
                    else {
                        //2014-11-22 - always clearing the result if no other detail property set - shouldn't matter whether result was auto-set or not.
                        // this does mean that you cannot pre-populate finding result in a table
                        //if (finding.resultAutoSet && !finding.anyDetailPropertySet()) {
                        //    finding.set('result', '');
                        //};
                        if (!finding.anyDetailPropertySet()) {
                            finding.set('result', '');
                        };
                    }
                };
            };

            var cell = this.getParentCell();
            if (cell) {
                this.owner.onCellValueChanged(cell, value);
            };
        },
    
        /* === Host Functions === */
        getRange: function (rangeAddr) {
            return array.map(this.owner.getRangeCellAddresses(rangeAddr), function (addr) {
                return this.getObject(addr);
            }, this);
        },
    
        getObject: function (name, property) {
            var cell = this.references ? this.references[name] : null;
            if (cell) {
                var widget = this.owner.getCellWidget(cell);
                return widget ? widget.get('value') : null;
                //            if (widget) {
                //                var finding = widget.getFinding();
                //                if (finding) {
                //                    return property ? finding.get(property) : finding;
                //                }
                //                else {
                //                    return widget.get('value');
                //                }
                //            };
            };
            return null;
        },
    
        setObject: function (name, property, value) {
            var cell = this.references ? this.references[name] : null;
            if (cell) {
                var widget = this.owner.getCellWidget(cell);
                if (widget) {
                    widget.get('value', value);
                };
            };
            return null;
        },
    
        getEmptyValue: function () {
            if (this.valueType) {
                if (this.valueType == 'text') {
                    return '';
                }
                else if (this.valueType == 'number') {
                    return 0;
                }
                else {
                    return null;
                }
            }
            else {
                if (this.findingProperty == 'medcinId') {
                    return 0;
                }
                else {
                    return '';
                }
            };
        }
    
    });
});