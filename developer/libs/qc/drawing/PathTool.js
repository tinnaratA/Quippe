define([
    "qc/drawing/_DrawingTool",
    "qc/drawing/PathShape",
    "dojo/_base/declare"
], function (_DrawingTool, PathShape, declare) {
    return declare("qc.drawing.PathTool", [_DrawingTool], {
        name: 'Line',
        iconClass: 'pencil',
        weHaveMadeAtLeastSomeLine: false,

        createShape: function () {
            if (this.points.length > 1) {
                var shape = new PathShape();
                shape.points = this.points.slice(0);
                shape.setStyle(this.drawingStyle);
                return shape;
            }
            else {
                return null;
            }
        },
    
        onMouseDown: function (editor, context, evt) {
            this.weHaveMadeAtLeastSomeLine = false;
            this.clearContext(editor, context);
            this.pushStyle(context);
            this.points = [];
            this.points.push(this.getEventPoint(evt));
            this.isDrawing = true;
        },
    
        onMouseMove: function (editor, context, evt) {
            if (this.isDrawing && this.points && this.points.length > 0) {
                var p1 = this.points[this.points.length - 1];
                var p2 = this.getEventPoint(evt);
                context.beginPath();
                context.moveTo(p1.x, p1.y);
                context.lineTo(p2.x, p2.y);
                context.stroke();
                this.points.push(p2);
                if (p1.x !== p2.x || p1.y !== p2.y) {
                    this.weHaveMadeAtLeastSomeLine = true;
                }
            }
        },
    
        onMouseUp: function (editor, context, evt) {
            if (this.isDrawing && this.points.length > 1 && this.weHaveMadeAtLeastSomeLine) {
                editor.editorStateManager.addToStateHistory("path");
                this.clearContext(editor, context);
                this.popStyle(context);
                editor.addShape(this.createShape());
            };
            this.isDrawing = false;
        }
    
    });
});