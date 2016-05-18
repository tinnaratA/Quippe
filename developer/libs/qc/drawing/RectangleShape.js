// this class not currently used
//define([
//    "qc/drawing/_Shape",
//    "dojo/_base/declare"
//], function (_Shape, declare) {
//    return declare("qc.drawing.RectangleShape", [_Shape], {
//        shapeName: 'Rectangle',
//        x: 0,
//        y: 0,
//        w: 0,
//        h: 0,
//        shapeAttributes: [
//            { name: 'x', type: 'integer' },
//            { name: 'y', type: 'integer' },
//            { name: 'w', type: 'integer' },
//            { name: 'h', type: 'integer' }
//        ],
    
//        getBounds: function () {
//            return { x: this.x, y: this.y, w: this.w, h: this.h };
//        },
    
//        onRender: function (editor, context) {
//            context.strokeRect(this.x, this.y, this.w, this.h);
//            context.fillRect(this.x, this.y, this.w, this.h);
//        },
    
//        move: function (action, dx, dy) {
//            this.x += dx;
//            this.y += dy;
//        }
//    });
//});