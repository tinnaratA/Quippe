define([
    "qc/drawing/_Shape",
    "dojo/_base/array",
    "dojo/_base/declare"
], function (_Shape, array, declare) {
    return declare("qc.drawing.PathShape", [_Shape], {
        shapeName: 'Path',
        points: null,
        shapeAttributes: [
            { name: 'points', type: 'pointList' }
        ],
    
        getBounds: function () {
            if (!this.bounds) {
                var x1 = null;
                var x2 = null;
                var y1 = null;
                var y2 = null;
                array.forEach(this.points, function (p) {
                    if (x1 == null || p.x < x1) {
                        x1 = p.x;
                    }
                    if (y1 == null || p.y < y1) {
                        y1 = p.y;
                    }
                    if (x2 == null || p.x > x2) {
                        x2 = p.x;
                    }
                    if (y2 == null || p.y > y2) {
                        y2 = p.y;
                    }
                });
                this.bounds = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
            };
            return this.bounds;
        },
    
        onRender: function (editor, context) {
            if (!this.points || this.points.length == 0) {
                return;
            }
            context.beginPath();
            context.moveTo(this.points[0].x, this.points[0].y);
            for (var n = 1; n < this.points.length; n++) {
                context.lineTo(this.points[n].x, this.points[n].y);
            };
            context.stroke();
        },
    
        onRenderSelected: function (editor, context) {
            var saveStyle = context.strokeStyle;
            var saveWidth = context.lineWidth;
            context.strokeStyle = "#00ff00";
            context.lineWidth = 1.0;
            var r = this.getBounds();
            context.strokeRect(r.x, r.y, r.w, r.h);
            context.strokeStyle = saveStyle;
            context.lineWidth = saveWidth;
        },
    
        move: function (action, dx, dy) {
            array.forEach(this.points, function (p) {
                p.x += dx;
                p.y += dy;
            });
            this.bounds = null;
        },
    
        hitTest: function (x, y) {
            return this.containsPoint(x, y) ? 'move' : null;
        }
    });
});