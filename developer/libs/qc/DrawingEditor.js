define([
    "qc/drawing/_Editor",
    "dojo/_base/declare"
], function (_Editor, declare) {
    return declare("qc.DrawingEditor", [_Editor], {
        startup: function () {
            this.inherited(arguments);
        }

    }
    );
});