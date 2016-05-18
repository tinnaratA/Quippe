define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/_base/lang",
    "dojo/on",
    "qc/DateUtil",
    "qc/note/FindingTable/CellWidgets/_Base"
], function (declare, domConstruct, lang, on, DateUtil, _Base) {
    return declare("qc.note.FindingTable.CellWidgets.TextBox", [_Base], {
        templateString: '<div class="cellWidget textBox qcddPrevent" data-dojo-attach-point="textContainer"><input type="text" class="textBoxNode" data-dojo-attach-point="textBoxNode" data-dojo-attach-event="change:onTextBoxChanged"/></div>',
        valueType: '',
        multiLine: false,

        _getMultiLineAttr: function () {
            return this.multiLine;
        },
        _setMultiLineAttr: function (value) {
            if (value) {
                this.renderTextArea();
            }
            else {
                this.renderInputBox();
            };
        },

        renderInputBox: function () {
            if (this.textBoxNode && this.textBoxNode.tagName.toLowerCase() == 'input') {
                return this.textBoxNode;
            };
            var text = '';
            if (this.textBoxNode) {
                text = this.textBoxNode.value;
                domConstruct.destroy(this.textBoxNode);
            };
            this.textBoxNode = domConstruct.place('<input type="text" class="textBoxNode" />', this.textContainer, 'first');
            on(this.textBoxNode, 'change', lang.hitch(this, this.onTextBoxChanged));
            this.textBoxNode.value = text;
            this.multiLine = false;
            return this.textBoxNode;
        },

        renderTextArea: function () {
            if (this.textBoxNode && this.textBoxNode.tagName.toLowerCase() == 'textarea') {
                return this.textBoxNode;
            };
            var text = '';
            if (this.textBoxNode) {
                text = this.textBoxNode.value;
                domConstruct.destroy(this.textBoxNode);
            };
            this.textBoxNode = domConstruct.place('<textarea class="textBoxNode" style="width:100%;height:100%;resize:none"></textarea>', this.textContainer, 'first');
            this.textBoxNode.value = text;
            on(this.textBoxNode, 'change', lang.hitch(this, this.onTextBoxChanged));
            this.multiLine = true;
            return this.textBoxNode;
        },

    
        hasValue: function () {
            return this.textBoxNode.value ? true : false;
        },
    
        updateDisplay: function () {
            var value = this.getFormattedValue();

            if (value == null) {
                value = '';
            }

            this.textBoxNode.value = value;
        },
    
        onTextBoxChanged: function () {
            var textValue = this.parseValue(this.textBoxNode.value || '');
            if (textValue != (this.value || '')) {
                this.set('value', textValue);
            };
        },
    
        parseValue: function (value) {
            switch ((this.valueType||'').toLowerCase()) {
                case 'integer':
                    var iValue = parseInt(value, 10);
                    return isNaN(iValue) ? 0 : !isFinite(iValue) ? 0 : iValue;
                case 'decimal':
                    var fValue = parseFloat(value);
                    return isNaN(fValue) ? 0 : !isFinite(fValue) ? 0 : fValue;
                case 'date':
                    return DateUtil.toDate(value, null);
                case 'datetime':
                    return DateUtil.toDate(value, null);
                case 'time':
                    return DateUtil.toTimeString(value);
                default:
                    return value;
            };
        },

        //_pgGetProperties: function () {
        //    var list = this.inherited(arguments);
        //    list.push({ name: 'multiLine', caption: 'Multiline', type: 'boolean', group: 'Data Entry', description: core.getI18n('tooltipMultiline') });
        //    return list;
        //},

        _pgPropDef_multiLine: function () {
            return { name: 'multiLine', caption: 'Multiline', type: 'boolean', group: 'Data Entry', description: core.getI18n('tooltipMultiline') };
        }
    
    });
});