define([
    "qc/drawing/_DrawingTool",
    "qc/drawing/LineShape",
    "dojo/_base/declare"
], function (_DrawingTool, LineShape, declare) {
    return declare("qc.drawing.LineTool", [_DrawingTool], {
        name: 'Line',
        iconClass: 'pencil',
        weHaveMadeAtLeastSomeLine: false,
        arrowBegin: false,
        arrowEnd: false,
    
        createShape: function (x1, y1, x2, y2) {
            var shape = new LineShape();
            shape.x1 = x1;
            shape.y1 = y1;
            shape.x2 = x2;
            shape.y2 = y2;
            shape.arrowBegin = this.arrowBegin;
            shape.arrowEnd = this.arrowEnd;
            shape.setStyle(this.drawingStyle);
            return shape;
        },
    
        onMouseDown: function (editor, context, evt) {
            this.clearContext(editor, context);
            this.pushStyle(context);
            var point = this.getEventPoint(evt);
            this.px = point.x;
            this.py = point.y;
            this.isDrawing = true;
        },
    
        onMouseMove: function (editor, context, evt) {
            if (this.isDrawing) {
                var point = this.getEventPoint(evt);
                this.clearContext(editor, context);
                context.beginPath();
                context.moveTo(this.px, this.py);
                context.lineTo(point.x, point.y);
                context.stroke();
                context.closePath();
                if (this.arrowBegin) {
                    this.drawArrow(context, this.px, this.py, point.x, point.y);
                }
                if (this.arrowEnd) {
                    this.drawArrow(context, point.x, point.y, this.px, this.py);
                }
                if (this.px !== point.x || this.py !== point.y) {
                    this.weHaveMadeAtLeastSomeLine = true;
                }
            }
        },
    
        onMouseUp: function (editor, context, evt) {
            if (this.isDrawing && this.weHaveMadeAtLeastSomeLine) {
                editor.editorStateManager.addToStateHistory("line");
                var point = this.getEventPoint(evt);
                this.clearContext(editor, context);
                this.popStyle(context);
                editor.addShape(this.createShape(this.px, this.py, point.x, point.y));
            };
            this.isDrawing = false;
        }
    
    });
});