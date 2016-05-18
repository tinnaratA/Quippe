define([
    "qc/DataSheet",
    "qc/lang/qscript/Binding",
    "qc/lang/qscript/Compiler",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "qc/_core",
    "qc/design/LayoutBuilder",
    "qc/design/StandardDialog"
], function (DataSheet, Binding, Compiler, array, declare, lang, aspect, domClass, domConstruct, on, core, LayoutBuilder, StandardDialog) {
    return declare("qc.design.PropertyBindingDialog", [StandardDialog], {
        title: 'Property Bindings',
        table: null,
        targetWidget: null,
        bindingType: 'property', // property | styleClass
    
        typeInfo: {
            property: { colHeadings: ['Property Name', 'Formula'] },
            styleClass: { colHeadings: ['Style Class', 'Condition'] }
        },
    
        columns: [
            { caption: 'Property Name', styleClass: 'bindToCell', propertyName: 'bindTo', defaultValue: '' },
            { caption: 'Formula', styleClass: 'expressionCell', propertyName: 'expression', defaultValue: '', multiLine: false }
        ],
    
        expressions: null,
    
        startup: function () {
            if (!this._started) {
                domClass.add(this.domNode, 'qcPropertyBindingDialog');
    
                this.dataPanel = domConstruct.place('<div class="dataPanel"></div>', this.contentArea.domNode);
                this.messagePanel = domConstruct.place('<div class="messagePanel"></div>', this.contentArea.domNode);
    
                this.dataSheet = new DataSheet();
                this.dataSheet.placeAt(this.dataPanel);
                this.dataSheet.startup();
    
                this.events = [
                    aspect.after(this.dataSheet, "onCellValueChanged", lang.hitch(this, this.onCellValueChanged), true),
                    aspect.after(this.dataSheet, "onSelectedRowChanged", lang.hitch(this, this.onSelectedRowChanged), true)
                ];
    
                domClass.add(this.messagePanel, 'messagePanel');
                domConstruct.place(this.messagePanel, this.contentArea.domNode);
    
                this.inherited(arguments);
            };
        },
    
        _setTargetWidgetAttr: function (value) {
            this.targetWidget = value;
            this.renderData();
        },
    
        _setBindingTypeAttr: function (value) {
            if (value != this.bindingType) {
                this.bindingType = value;
                this.renderData();
            };
        },
    
        renderData: function () {
            if (!this._started) {
                this.startup();
            };
    
            if (!this.targetWidget) {
                return;
            };
    
            if (!this.bindingType) {
                return;
            };
    
            var cols = this.columns.slice(0);
    
            array.forEach(this.typeInfo[this.bindingType].colHeadings, function (heading, i) {
                cols[i].caption = heading;
            });
    
            var expressions = array.filter(this.targetWidget.bindings || [], function (binding) {
                return binding.bindingType == this.bindingType
            }, this);
    
            this.dataSheet.load(cols, expressions);
        },
    
        writeBindings: function () {
            var owner = this.targetWidget;
    
            var targetBindings = [];
            var nonTargetBindings = [];
            var bindingType = this.bindingType;
            var bindTo = '';
            var expression = '';
    
            array.forEach(owner.bindings || [], function (x) {
                if (x.bindingType == bindingType) {
                    targetBindings.push(x);
                }
                else {
                    nonTargetBindings.push(x);
                }
            });
    
            array.forEach(targetBindings, function(x) {
				if (bindingType == "styleClass") {
					x.applyResult(false);
				}

            	x.destroy();
            });
            targetBindings = [];
    
            var setTranscriptionOverride = false;

            array.forEach(this.dataSheet.getData(), function (item) {
                bindTo = (item.bindTo || '').toString().trim();
                expression = (item.expression || '').toString().trim();
                if (bindTo && expression) {
                    var binding = new Binding({ owner: owner, bindingType: bindingType, bindTo: bindTo, expression: expression });
                    if (bindingType == 'property' && bindTo == 'text') {
                        setTranscriptionOverride = true;
                    };
                    targetBindings.push(binding);
                    binding.execute();
                };
            });
    
            owner.bindings = nonTargetBindings.concat(targetBindings);
            if (setTranscriptionOverride) {
                owner.overrideTranscription = true;
            };
        },
    
        onCellValueChanged: function (cellInfo, value) {
            if (cellInfo.colDef.propertyName == 'expression') {
                if (value) {
                    var res = Compiler.parse(value);
                    if (res.success) {
                        this.dataSheet.clearRowError(cellInfo.r);
                        this.messagePanel.innerHTML = '';
                    }
                    else {
                        this.dataSheet.setRowError(cellInfo.r, res.error);
                        this.messagePanel.innerHTML = res.error.replace(/Parse error on line \d+/i, 'Syntax error');
                    }
                };
            };
        },
    
        onSelectedRowChanged: function (row) {
            if (row && row.error) {
                this.messagePanel.innerHTML = row.error;
            }
            else {
                this.messagePanel.innerHTML = '';
            }
        },
    
        onOKClick: function () {
            if (this.dataSheet.hasErrors()) {
                return;
            };
    
            this.writeBindings();
            this.onExecute();
        }
    });
});