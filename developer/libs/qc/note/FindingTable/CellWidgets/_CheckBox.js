define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "qc/note/FindingTable/CellWidgets/_Base"
], function (declare, domClass, _Base) {
    return declare("qc.note.FindingTable.CellWidgets._CheckBox", [_Base], {
        templateString: '<div class="cellWidget checkBox" data-dojo-attach-point="labelNode"></div>',
        findingProperty: 'result',
        checkStyle: '',
        hideLabel: false,
        label: '',
        suppressColors: false,
    
        _getFindingPropertyAttr: function () {
            return this.findingProperty;
        },
        _setFindingPropertyAttr: function (value) {
            //ignore value, always bound to result
        },
    
        hasValue: function () {
            return this.value == 'A' || this.value == 'N';
        },
    
        updateDisplay: function () {
            switch (this.value) {
                case 'A':
                    domClass.remove(this.domNode, 'neg');
                    domClass.add(this.domNode, 'pos');
                    break;
                case 'N':
                    domClass.remove(this.domNode, 'pos');
                    domClass.add(this.domNode, 'neg');
                    break;
                default:
                    domClass.remove(this.domNode, 'pos');
                    domClass.remove(this.domNode, 'neg');
            };
            if (!this.hideLabel && !this.get('label')) {
                var finding = this.getFinding();
                if (finding) {
                    this.set('label', finding.get('text'));
                };
            };
        },
    
        _setCheckStyleAttr: function (value) {
            if (this.checkStyle) {
                domClass.remove(this.domNode, this.checkStyle);
            };
            this.checkStyle = value;
            if (this.checkStyle) {
                domClass.add(this.domNode, this.checkStyle);
            };
        },

        _setSuppressColorsAttr: function(value) {
            this.suppressColors = value;

            if (this.suppressColors) {
                domClass.add(this.domNode, 'noColors');
            }

            else {
                domClass.remove(this.domNode, 'noColors');
            }
        },
    
        _setHideLabelAttr: function (value) {
            this.hideLabel = value;
            if (value) {
                domClass.add(this.domNode, 'hideLabel');
            }
            else {
                domClass.remove(this.domNode, 'hideLabel');
            }
        },
    
        _getLabelAttr: function () {
            return this.labelNode.innerHTML;
        },
        _setLabelAttr: function (value) {
            if (value == null) {
                value = '';
            }

            this.labelNode.innerHTML = value;
        },

        _pgPropDef_checkStyle: function () {
            return { name: 'checkStyle', group: 'Style', options: '[x;check;yn;square;round]', defaultValue: 'x', description: core.getI18n('tooltipCheckStyle') };
        },

        _pgPropDef_hideLabel: function () {
            return { name: 'hideLabel', group: 'Data Entry', type: 'boolean', defaultValue: false, description: core.getI18n('tooltipHideLabel') };
        },

        _pgPropDef_label: function () {
            return { name: 'label', group: 'Data Entry', defaultValue: '', description: core.getI18n('tooltipLabel') };
        },

        _pgPropDef_suppressColors: function () {
            return { name: 'suppressColors', group: 'Style', type: 'boolean', defaultValue: false };
        },

        _pgPropDef_valueType: function () { return null },
        _pgPropDef_format: function () { return null }
    });
});