define([
    "qc/drawing/_Shape",
    "dojo/_base/declare",
    "qc/drawing/drawingSettings"
], function (_Shape, declare, drawingSettings) {
    return declare("qc.drawing.TextShape", [_Shape], {
        shapeName: 'Text',
        text: '',
        x: 0,
        y: 0,
        w: 200,
        h: 20,
        lineHeight: 20,
        minHeight: 20,
        minWidth: 50,
        hidden: false,
    
        shapeAttributes: [
            { name: 'x', type: 'integer' },
            { name: 'y', type: 'integer' },
            { name: 'w', type: 'integer' },
            { name: 'h', type: 'integer' },
            { name: 'text', type: 'string' }
        ],
        
        getBounds: function () {
            return { x: this.x, y: this.y, w: this.w, h: this.h };
        },
    
        onRender: function (editor, context) {
            if (this.hidden || !this.text) {
                return;
            };



            var x = this.x;
            var y = this.y;
            var w = this.w;
            var lineHeight = this.lineHeight;

            var saveFillStyle = context.fillStyle;

            context.fillStyle = "#ffffff";
            context.fillRect(this.x, this.y, this.w, this.h);

            context.fillStyle = context.strokeStyle;
            var words = this.text.split(' ');
            var line = words.shift();
            while (words.length > 0) {
                if (context.measureText(line + ' ' + words[0]).width > w) {
                    context.fillText(line, x, y, w);
                    line = words.shift();
                    y += lineHeight;;
                }
                else {
                    line += (' ' + words.shift());
                };
            };

            if (line) {
                context.fillText(line, x, y, w);
                line = words.shift();
                y += lineHeight;
            };

            this.minHeight = y - this.y;
            if (this.h < this.minHeight) {
                this.h = this.minHeight;
            };


            context.fillStyle = saveFillStyle;

        },
    
        onRenderSelected: function (editor, context) {
            this.onRender(editor, context);
    
            var saveStrokeStyle = context.strokeStyle;
            var saveLineWidth = context.lineWidth;
            var saveFillStyle = context.fillStyle;

            context.strokeStyle = '#00ff00';
            context.lineWidth = 0.5;
            context.strokeRect(this.x - .5, this.y - .5, this.w + 1, this.h);
            context.fillStyle = "rgba(0,255,0,.5)";
            context.fillRect(this.x + this.w - 8, this.y + this.h - 8, 8, 8);

            context.strokeStyle = saveStrokeStyle;
            context.lineWidth = saveLineWidth;
            context.fillStyle = saveFillStyle;
        },
    
        move: function (action, dx, dy, px, py) {
            if (action == 'moveEnd') {
                if ((px - this.x) > this.minWidth) {
                    this.w = px - this.x;
                };
                if ((py - this.y) > this.minHeight) {
                    this.h = py - this.y;
                };
            }
            else if (action = 'moveStart') {
                this.x += dx;
                this.y += dy;
            };
        },
    
        measure: function (context) {
            this.pushStyle(context);
            var metrics = context.measureText(this.text);
            this.w = metrics.width;
            this.popStyle(context);
        },
    
        hitTest: function (x, y) {
            var d = drawingSettings.extraGrabSpaceForTextBoxResize;
            var sizeBox = this.rectFromXYWH(this.x + this.w - 8 - d, this.y + this.h - 8 - d, 8 + d * 2, 8 + d * 2);

            if (this.rectContainsPoint(sizeBox, x, y)) {
                return 'moveEnd';
            }
            if (this.containsPoint(x, y)) {
                return 'moveStart';
            }
            else {
                return null;
            }
        },
    
        hEdit: null,
        editNode: null,
        isEditing: false,
    
        startEdit: function (editor) {
        },
    
        endEdit: function (evt) {
        }
    });
});