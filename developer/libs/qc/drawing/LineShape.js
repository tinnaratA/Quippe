define([
    "qc/drawing/_Shape",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/drawing/drawingSettings"
], function (_Shape, declare, lang, drawingSettings) {
    return declare("qc.drawing.LineShape", [_Shape], {
        shapeName: 'Line',
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        arrowBegin: false,
        arrowEnd: false,
        //hitSize: 8,
        shapeAttributes: [
            { name: 'x1', type: 'integer' },
            { name: 'y1', type: 'integer' },
            { name: 'x2', type: 'integer' },
            { name: 'y2', type: 'integer' },
            { name: 'arrowBegin', type: 'boolean' },
            { name: 'arrowEnd', type: 'boolean' }
        ],
    
        getBounds: function () {
            return this.normRect(this.x1, this.y1, this.x2, this.y2);
        },
    
        containsPoint: function (x, y) {
            var r = this.getBounds();
            if (x >= r.x && x <= r.x2 && y >= r.y && y <= r.y2) {
                return this.pointDistance(x, y) <= 2;
            }
            return false;
        },
    
        pointDistance: function (x, y) {
            var dy = this.y2 - this.y1;
            var dx = this.x2 - this.x1;
    
            var a = -1 * dy;
            var b = dx;
            var c = (dy * this.x1) - (dx * this.y1);
    
            var d = Math.abs(a * x + b * y + c) / Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
            return d;
        },
    
        onRender: function (editor, context) {
            context.beginPath();
            context.moveTo(this.x1, this.y1);
            context.lineTo(this.x2, this.y2);
            context.stroke();
            context.closePath();
            if (this.arrowBegin) {
                this.drawArrow(context, this.x1, this.y1, this.x2, this.y2);
            }
            if (this.arrowEnd) {
                this.drawArrow(context, this.x2, this.y2, this.x1, this.y1);
            }
        },
    
        onRenderSelected: function (editor, context) {
            var saveStrokeStyle = context.strokeStyle;
            var saveFillStyle = context.fillStyle;
            var saveLineWidth = context.lineWidth;
    
            context.strokeStyle = "#00ff00";
            context.fillStyle = "rgba(0,255,0,.5)";
            var h1 = drawingSettings.grabTolerance;
            var h2 = h1 * 2;
            var cx = (this.x1 < this.x2) ? this.x1 + (this.x2 - this.x1) / 2 : this.x2 + (this.x1 - this.x2) / 2;
            var cy = (this.y1 < this.y2) ? this.y1 + (this.y2 - this.y1) / 2 : this.y2 + (this.y1 - this.y2) / 2;
            context.beginPath();
            context.arc(cx, cy, h1, 0, Math.PI * 2, false);
            context.closePath();
            context.fill();
    
            context.beginPath();
            context.arc(this.x1, this.y1, h1, 0, Math.PI * 2, false);
            context.closePath();
            context.fill();
    
            context.beginPath();
            context.arc(this.x2, this.y2, h1, 0, Math.PI * 2, false);
            context.closePath();
            context.fill();
    
            context.strokeStyle = saveStrokeStyle;
            context.fillStyle = saveFillStyle;
            context.lineWidth = saveLineWidth;
        },
    
        hitTest: function (x, y) {
            var h1 = drawingSettings.grabTolerance;
            var h2 = h1 * 2;
            var cx = (this.x1 < this.x2) ? this.x1 + (this.x2 - this.x1) / 2 : this.x2 + (this.x1 - this.x2) / 2;
            var cy = (this.y1 < this.y2) ? this.y1 + (this.y2 - this.y1) / 2 : this.y2 + (this.y1 - this.y2) / 2;
    
            if (this.rectContainsPoint(this.rectFromXYWH(this.x1 - h1, this.y1 - h1, h2, h2), x, y)) {
                return 'moveStart';
            }
            else if (this.rectContainsPoint(this.rectFromXYWH(this.x2 - h1, this.y2 - h1, h2, h2), x, y)) {
                return 'moveEnd';
            }
            else if (this.rectContainsPoint(this.rectFromXYWH(cx - h1, cy - h1, h2, h2), x, y)) {
                return 'move';
            }
            else if (this.containsPoint(x, y)) {
                return 'move';
            }
            else {
                return null;
            }
        },
    
        move: function (action, dx, dy) {
            switch (action) {
                case 'moveStart':
                    this.x1 += dx;
                    this.y1 += dy;
                    break;
                case 'moveEnd':
                    this.x2 += dx;
                    this.y2 += dy;
                    break;
                case 'move':
                    this.x1 += dx;
                    this.y1 += dy;
                    this.x2 += dx;
                    this.y2 += dy;
                    break;
                default:
                    break;
            }
        },
    
        //returns 1 if moving from p0 -> p1 -> p2 is clockwise, -1 for counter clockwise
        getClockness: function (p1, p2, p3) {
            //return ((p2.x - p1.x) * (p3.x - p1.x)) <= ((p2.y - p1.y) * (p3.y - p1.y)) ? 1 : -1;
            return (((p2.x - p1.x) * (p3.y - p1.y)) - ((p3.x - p1.x) * (p2.y - p1.y))) < 0 ? -1 : 1;
    
        },
    
        linesIntersect: function (p1, p2, p3, p4) {
            var c = lang.hitch(this, this.getClockness);
            return (c(p1, p2, p3) != c(p1, p2, p4) && (c(p3, p4, p1) != c(p3, p4, p2)));
        },
    
        intersectsRect: function (r) {
            if (this.rectContainsPoint(r, this.x1, this.y1)) {
                return true;
            }
            else if (this.rectContainsPoint(r, this.x2, this.y2)) {
                return true;
            }
            else {
                var li = lang.hitch(this, this.linesIntersect);
                var p1 = { x: this.x1, y: this.y1 };
                var p2 = { x: this.x2, y: this.y2 };
                var r1 = { x: r.x, y: r.y };
                var r2 = { x: r.x + r.w, y: r.y };
                var r3 = { x: r.x + r.w, y: r.y + r.h };
                var r4 = { x: r.x, y: r.y + r.h };
                return li(p1, p2, r1, r2)
                    || li(p1, p2, r2, r3)
                    || li(p1, p2, r3, r4)
                    || li(p1, p2, r4, r1);
            }
        }
    
    });
});