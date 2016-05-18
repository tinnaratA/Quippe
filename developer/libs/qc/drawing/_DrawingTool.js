define([
    "qc/drawing/_DrawingObject",
    "dojo/_base/declare"
], function (_DrawingObject, declare) {
    return declare("qc.drawing._DrawingTool", [_DrawingObject], {
        name: 'DrawingTool',
        iconClass: '',
        isDrawing: false,
    
        clearContext: function (editor, context) {
            context.clearRect(0, 0, editor.canvasWidth, editor.canvasHeight);
        },
    
        createShape: function () { },
        onSelected: function (editor, context, evt) { },
        onMouseDown: function (editor, context, evt) { },
        onMouseMove: function (editor, context, evt) { },
        onMouseUp: function (editor, context, evt) { },
        onMouseHover: function(editor, context, evt) { },
        cancel: function (editor, context) {
            this.clearContext(editor, context);
            this.isDrawing = false;
        }
    });
});