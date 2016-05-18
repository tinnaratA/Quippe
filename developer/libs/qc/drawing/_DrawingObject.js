define([
    "dojo/_base/declare"
], function (declare) {
    return declare("qc.drawing._DrawingObject", [], {
        drawingStyle: null,
        savedStyle: null,
    
        setStyle: function (styleObject) {
            if (!this.drawingStyle) {
                this.drawingStyle = {};
            };
            for (var p in styleObject) {
                this.drawingStyle[p] = styleObject[p];
            };
        },
    
        pushStyle: function (context) {
            if (this.drawingStyle) {
                this.savedStyle = {};
                for (var p in this.drawingStyle) {
                    if (context[p] != this.drawingStyle[p]) {
                        this.savedStyle[p] = context[p];
                        context[p] = this.drawingStyle[p];
                    }
                }
            }
        },
    
        popStyle: function (context) {
            if (this.savedStyle) {
                for (var p in this.savedStyle) {
                    context[p] = this.savedStyle[p];
                }
            }
        },
    
        normRect: function (x1, y1, x2, y2) {
            return {
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                w: Math.abs(x2 - x1),
                h: Math.abs(y2 - y1),
                x2: Math.max(x1, x2),
                y2: Math.max(y1, y2)
            };
        },
    
        rectFromXYWH: function (x, y, w, h) {
            return { x: x, y: y, w: w, h: h };
        },
    
        rectFromLTRB: function (l, t, r, b) {
            return this.normRect(l, t, r, b);
        },
    
        drawArrow: function (context, x1, y1, x2, y2) {
            var saveFillStyle = context.fillStyle;
            context.fillStyle = context.strokeStyle;
            var par = context.lineWidth + 10.0;
            var slopy = Math.atan2((y1 - y2), (x1 - x2));
            var cosy = Math.cos(slopy);
            var siny = Math.sin(slopy);
    
            context.beginPath();
            context.moveTo(x1, y1);
            context.lineTo(x1 + (-par * cosy - (par / 2.0 * siny)), y1 + (-par * siny + (par / 2.0 * cosy)));
            context.lineTo(x1 + (-par * cosy + (par / 2.0 * siny)), y1 - (par * siny + (par / 2.0 * cosy)));
            context.lineTo(x1, y1);
            context.closePath();
            context.stroke();
            context.fill();
            if (saveFillStyle) {
                context.fillStyle = saveFillStyle;
            }
        },
    
        intersects: function (r1, r2) {
            return this.rectContainsPoint(r2, r1.x, r1.y)
                || this.rectContainsPoint(r2, r1.x, r1.y + r1.h)
                || this.rectContainsPoint(r2, r1.x + r1.w, r1.y)
                || this.rectContainsPoint(r2, r1.x + r1.w, r1.y + r1.h)
                || this.rectContainsPoint(r1, r2.x, r2.y);
        },
    
        rectContainsPoint: function (r, x, y) {
            if (r && r.x <= x && r.y <= y && r.x + r.w >= x && r.y + r.h >= y) {
                return true;
            }
            else {
                return false;
            }
        },
    
        getEventPoint: function (evt) {
            if (evt.offsetX == undefined) {
                return { x: evt.layerX, y: evt.layerY };
            }
            else {
                return { x: evt.offsetX, y: evt.offsetY };
            };
        }
    });
});