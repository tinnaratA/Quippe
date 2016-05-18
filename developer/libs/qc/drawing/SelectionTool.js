define([
    "qc/drawing/LineTool",
    "dojo/_base/array",
    "dojo/_base/declare"
], function (LineTool, array, declare) {
    return declare("qc.drawing.SelectionTool", [LineTool], {
        drawingStyle: { strokeStyle: 'rgba(0,128,0,1.0)', fillStyle: 'rgba(195,253,219,0.5)' },
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
    
        setStyle: function () {
            //don't override style
        },
    
        onMouseDown: function (editor, context, evt) {
            var point = this.getEventPoint(evt);
            var x = point.x;
            var y = point.y;
    
            this.px = x;
            this.py = y;
            this.startX = x;
            this.startY = y;
            this.endX = x;
            this.endY = y;
    
            this.clearContext(editor, context);
            this.pushStyle(context);
    
            var shape = editor.getShapeAtPoint(x, y);
            if (shape) {
                if (!shape.selected) {
                    editor.clearShapeSelection();
                    shape.selected = true;
                }
            }
            else {
                editor.clearShapeSelection();
            }
    
            var shapes = editor.getSelectedShapes();
            if (shapes && shapes.length > 0) {
                if (shapes.length == 1) {
                    this.action = shapes[0].hitTest(x, y);
                }
                else {
                    this.action = 'move';
                }
                this.hasSelectionAndIsReadyForMove = true;
                this.isMoving = true;
                this.shapeStateThatWeMightSaveAfterMove = editor.getCopyOfShapes();
            }
            else {
                this.isSelecting = true;
            }
    
            editor.renderShapes();
        },
    
        onMouseMove: function (editor, context, evt) {
            var point = this.getEventPoint(evt);
            var x = point.x;
            var y = point.y;
    
            this.endX = x;
            this.endY = y;
    
            if (this.isSelecting) {
                this.clearContext(editor, context);
                context.strokeRect(this.px, this.py, x - this.px, y - this.py);
                context.fillRect(this.px, this.py, x - this.px, y - this.py);
            }
            else if (this.hasSelectionAndIsReadyForMove && this.isMoving) {
                var dx = x - this.px;
                var dy = y - this.py;
                var action = this.action;
                if (dx || dy) {
                    this.hasMovedAtLeastALittle = true;
                    array.forEach(editor.getSelectedShapes(), function (shape) {
                        shape.move(action, dx, dy, x, y);
                    });
                }
                this.px = x;
                this.py = y;
                editor.renderShapes();
            };
        },
    
        onMouseUp: function (editor, context, evt) {
            this.isDrawing = false;
            this.clearContext(editor, context);
    
            if (this.isSelecting) {
                this.isSelecting = false;
                var dx = Math.abs(this.endX - this.startX) || 0;
                var dy = Math.abs(this.endY - this.startY) || 0;
                if (dx > 6 || dy > 6) {
                    editor.clearShapeSelection();

                    var box = this.rectFromLTRB(this.startX, this.startY, this.endX, this.endY);
                    for (var n = editor.shapes.length - 1; n >= 0; n--) {
                        if (editor.shapes[n].intersectsRect(box)) {
                            editor.shapes[n].selected = true;
                        }
                    };
                }
            } else if (this.hasMovedAtLeastALittle) {
                this.hasSelectionAndIsReadyForMove = false;
                this.hasMovedAtLeastALittle = false;
                editor.editorStateManager.addToStateHistory("moveShapes", {
                    shapes: this.shapeStateThatWeMightSaveAfterMove
                });                
            }
    
            this.isMoving = false;

            editor.renderShapes();
        }
    });
});