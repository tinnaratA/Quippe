define([
    "dojo/_base/declare",
    "qc/note/_Element",
    "dojo/query",
    "dojo/dom-construct",
    "dijit/registry",
    "qc/note/LayoutTable/_LayoutRow"
], function (declare, _Element, query, domConstruct, registry, _LayoutRow) {
    return declare("qc.note.LayoutTable._LayoutTable", [_Element], {

        templateString: '<div class="qcNoteLayoutTable qcddTarget qcddSource" />',

        rows: 3,
        cols: 3,

        _getRowsAttr: function () {
            return this.rows;
        },
        _setRowsAttr: function (value) {
            if (value < 0) {
                return;
            };

            var row = null;
            var currentRows = query('>.row', this.domNode);
            var len = currentRows.length;
            if (len < value) {
                while (len < value) {
                    row = new _LayoutRow({ table: this, cols: this.cols });
                    domConstruct.place(row.domNode, this.domNode, 'last');
                    len++;
                }
            }
            else if (len > value) {
                while (len > value) {
                    row = currentRows.pop();
                    domConstruct.destroy(row);
                    len--;
                }
            };
        },

        _getColsAttr: function () {
            return this.cols;
        },

        _setColsAttr: function (value) {
            query('>.row', this.domNode).map(registry.byNode).forEach(function (row) {
                row.set('cols', value);
            });
            this.cols = value;
        }
    });
});

