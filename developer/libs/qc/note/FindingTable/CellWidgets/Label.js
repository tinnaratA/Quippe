define([
    "dojo/_base/declare",
    "qc/note/FindingTable/CellWidgets/_Base"
], function (declare, _Base) {
    return declare("qc.note.FindingTable.CellWidgets.Label", [_Base], {
        templateString: '<div class="cellWidget label" data-dojo-attach-event="onclick:onLabelClick"><div class="labelNode" data-dojo-attach-point="labelNode"></div></div>',
        toggleResult: false,
    
    
        updateDisplay: function () {
            var currentValue = this.getFormattedValue();

            if (currentValue == null) {
                currentValue = '';
            }

            this.labelNode.innerHTML = currentValue;
        },
    
    
        hasValue: function () {
            if (this.formula && this.getFormattedValue() !== '') {
                return true;
            }
            else if (this.findingRef) {
                var finding = this.getFinding();
                return finding && finding.result ? true : false
            }
            else {
                return false;
            };
            //return this.getFormattedValue() ? true : false;
        },
    
        onLabelClick: function (evt) {
            if (this.toggleResult && !this.isDesignMode()) {
                var finding = this.getFinding();
                if (finding) {
                    finding.toggleResult();
                    this.onCellValueChanged();
                };
            }
        },
    
        _pgPropDef_toggleResult: function () {
            return { name: 'toggleResult', type: 'boolean', group:'Data Entry', description: core.getI18n('tooltipToggleResult') };
        }
    
    });
});