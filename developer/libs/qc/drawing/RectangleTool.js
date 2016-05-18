//This class not currently used
//define([
//    "qc/drawing/LineTool",
//    "qc/drawing/RectangleShape",
//    "dojo/_base/declare"
//], function (LineTool, RectangleShape, declare) {
//    return declare("qc.drawing.RectangleTool", [LineTool], {
//        createShape: function (x1, y1, x2, y2) {
//            var r = this.normRect(x1, y1, x2, y2);
//            var shape = new RectangleShape();
//            shape.x = r.x;
//            shape.y = r.y;
//            shape.w = r.w;
//            shape.h = r.h;
//            shape.setStyle(this.drawingStyle);
//            return shape;
//        },
    
//        onMouseMove: function (editor, context, evt) {
//            if (this.isDrawing) {
//                this.clearContext(editor, context);
//                var point = this.getEventPoint(evt);
//                context.beginPath();
//                context.strokeRect(this.px, this.py, point.x - this.px, point.y - this.py);
//                context.fillRect(this.px, this.py, point.x - this.px, point.y - this.py);
//            }
//        }
//    });
//});