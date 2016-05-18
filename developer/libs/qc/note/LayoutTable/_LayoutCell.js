define([
    "dojo/_base/declare",
    "qc/note/_Element"
], function (declare, _Element) {
    return declare("qc.note.LayoutTable._LayoutCell", [_Element], {

        table: null,
        row: null,
        templateString: '<div class="cell" />'

    });
});
