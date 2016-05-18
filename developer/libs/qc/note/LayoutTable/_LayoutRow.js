define([
    "dojo/_base/declare",
    "qc/note/_Element",
	"qc/note/LayoutTable/_LayoutCell",
    "dojo/query",
    "dojo/dom-construct"
], function (declare, _Element, _LayoutCell,  query, domConstruct) {
    return declare("qc.note.LayoutTable._LayoutRow", [_Element], {

        table: null,
        cols: -1,
        templateString: '<div class="row" />',

        _getColsAttr: function () {
            return this.cols;
        },
        _setColsAttr: function (value) {
            if (value < 0) {
                return;
            }
            var col = null;
            var currentCols = query('>.cell', this.domNode);
            var len = currentCols.length;
            if (len < value) {
                while (len < value) {
                    col = new _LayoutCell({ table: this.table, row: this });
                    domConstruct.place(col.domNode, this.domNode, 'last');
                    len++;
                };
            }
            else if (len > value) {
                while (len > value) {
                    col = currentCols.pop();
                    domConstruct.destroy(col);
                    len--;
                };
            }
            this.cols = value;
        }
    });
});
