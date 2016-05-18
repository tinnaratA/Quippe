define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "qc/note/FindingTable/CellWidgets/_CheckBox"
], function (declare, domClass, _CheckBox) {
    return declare("qc.note.FindingTable.CellWidgets.DoubleCheck", [_CheckBox], {
        templateString: '<div class="cellWidget cmpTbl doubleCheck qcddPrevent" data-dojo-attach-event="onclick:onClick">'
                      + '  <div class="cmpRow">'
                      + '    <div class="cmpCell boxCell">'
                      + '      <div class="box y"></div>'
                      + '    </div>'
                      + '    <div class="cmpCell boxCell">'
                      + '      <div class="box n"></div>'
                      + '    </div>'
                      + '    <div class="cmpCell labelCell">'
                      + '      <div class="labelNode" data-dojo-attach-point="labelNode"></div>'
                      + '    </div>'
                      + '  </div>'
                      + '</div>',
    
        checkStyle: 'yn',
    
        onClick: function (evt) {
            if (this.owner && !this.isDesignMode()) {
                var finding = this.getFinding();
                if (finding) {
                    if (domClass.contains(evt.target, 'y')) {
                        finding.set('result', finding.get('result') == 'A' ? '' : 'A');
                    }
                    else if (domClass.contains(evt.target, 'n')) {
                        finding.set('result', finding.get('result') == 'N' ? '' : 'N');
                    }
                    else {
                        finding.toggleResult();
                    };
                    this.onCellValueChanged();
                    this.updateDisplay();
                };
            };
        }
    });
});