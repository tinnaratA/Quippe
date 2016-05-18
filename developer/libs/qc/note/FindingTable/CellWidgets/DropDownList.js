define([
    "dojo/_base/declare",
    "qc/note/FindingTable/CellWidgets/ComboBox"
], function (declare, ComboBox) {
    return declare("qc.note.FindingTable.CellWidgets.DropDownList", [ComboBox], {
        postCreate: function () {
            this.set('textEditable', false);
            this.inherited(arguments);
        }
    });
});