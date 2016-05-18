//this class not currently used
//define([
//    "qc/drawing/_DrawingTool",
//    "dojo/_base/declare"
//], function (_DrawingTool, declare) {
//    return declare("qc.drawing.PointerTool", [_DrawingTool], {
//        isMoving: false,
    
//        drawingStyle: { strokeStyle: 'rgba(128,192,255,1.0)', lineWidth: 1.5, fillStyle: 'rgba(128,192,255,.5)'},
    
//        setStyle: function (styleObject) {
//            //ignore;
//        },
    
//        onMouseDown: function (editor, context, evt) {
//            this.clearContext(editor, context);
//            this.pushStyle(context);
    
//            var point = this.getEventPoint(evt);
//            var x = point.x;
//            var y = point.y;
    
//            editor.clearShapeSelection();
//            this.selectedShape = null;
//            this.action = null;
//            this.px = 0;
//            this.py = 0;
    
//            for (var n = editor.shapes.length - 1; n >= 0; n--) {
//                var action = editor.shapes[n].hitTest(x, y);
//                if (action) {
//                    editor.shapes[n].selected = true;
//                    if (editor.shapes[n].canMove) {
//                        this.isMoving = true;
//                        this.selectedShape = editor.shapes[n];
//                        this.px = x;
//                        this.py = y;
//                        this.action = action;
//                    }
//                    editor.renderShapes();
//                    break;
//                }
//            };
//        },
    
//        onMouseMove: function (editor, context, evt) {
//            if (this.isMoving && this.selectedShape) {
//                var point = this.getEventPoint(evt);
//                var dx = point.x - this.px;
//                var dy = point.y - this.py;
//                this.selectedShape.move(this.action, dx, dy, point.x, point.y);
//                this.px = point.x;
//                this.py = point.y;
//                editor.renderShapes();
//            }
//        },
    
//        onMouseUp: function (editor, context, evt) {
//            this.isMoving = false;
//        }
    
//    });
//});