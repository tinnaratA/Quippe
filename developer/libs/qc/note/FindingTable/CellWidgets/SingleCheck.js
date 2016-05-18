define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "qc/note/FindingTable/CellWidgets/_CheckBox"
], function (declare, domClass, _CheckBox) {
    return declare("qc.note.FindingTable.CellWidgets.SingleCheck", [_CheckBox], {
        templateString: '<div class="cellWidget cmpTbl singleCheck qcddPrevent" data-dojo-attach-event="onclick:onClick">'
                      + '  <div class="cmpRow">'
                      + '    <div class="cmpCell boxCell">'
                      + '      <div class="box"></div>'
                      + '    </div>'
                      + '    <div class="cmpCell labelCell">'
                      + '      <div class="labelNode" data-dojo-attach-point="labelNode"></div>'
                      + '    </div>'
                      + '  </div>'
                      + '</div>',
    
        checkStyle: 'x',
        checkedValue: 'A',
        optionGroup: '',
    
        onClick: function (evt) {
            if (this.owner && !this.isDesignMode()) {
                var finding = this.getFinding();
                if (finding) {
                    if (this.isDualState()) {
                        finding.set('result', finding.get('result') == this.checkedValue ? '' : this.checkedValue);
                    }
                    else {
                        finding.toggleResult();
                    };
                    this.onCellValueChanged();
                    if (this.optionGroup) {
                        var g = this.optionGroup;
                        var id = this.id;
                        this.owner.forEachWidget(null, function (x) {
                            if (x.optionGroup == g && x.id != id) {
                                x.set('value', '');
                            }
                        });
                    };
                };
    
            };
        },
    
        isDualState: function () {
            return this.checkStyle == 'x' || this.checkStyle == 'check';
        },

        _setCheckedValueAttr: function(value) {
            this.checkedValue = value;

            if (this.checkedValue == 'N') {
                domClass.add(this.domNode, 'reverseColors');
            }

            else {
                domClass.remove(this.domNode, 'reverseColors');
            }
        },
    
        updateDisplay: function () {
            if (this.isDualState()) {
                domClass.toggle(this.domNode, 'pos', this.value == this.checkedValue);
            }
            else {
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
            };
            if (!this.hideLabel && !this.get('label')) {
                var finding = this.getFinding();
                if (finding) {
                    this.set('label', finding.get('text'));
                };
            };
        },
        
        _pgPropDef_checkedValue: function () {
            return { name: 'checkedValue', group: 'Data Entry', options: '[A;N]', description: core.getI18n('tooltipCheckedValue') };
        },

        _pgPropDef_optionGroup: function () {
            return { name: 'optionGroup', group: 'Data Entry', description: core.getI18n('tooltipOptionGroup') };
        }

    });
});