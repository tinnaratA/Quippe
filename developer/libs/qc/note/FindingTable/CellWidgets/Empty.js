define([
    "dojo/_base/declare",
    "qc/note/FindingTable/CellWidgets/_Base"
], function (declare, _Base) {
    return declare("qc.note.FindingTable.CellWidgets.Empty", [_Base], {
        templateString: '<div class="cellWidget"></div>',
    
    
        hasValue: function () {
            return false;
        }
    });
});