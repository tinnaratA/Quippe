define([
    "qc/drawing/_DrawingObject",
    "qc/StringUtil",
    "dojo/_base/array",
    "dojo/_base/declare"
], function (_DrawingObject, StringUtil, array, declare) {
    return declare("qc.drawing._Shape", [_DrawingObject], {
        shapeName: 'Shape',
        hidden: false,
        canMove: true,
        canSize: false,
        selected: false,
        shapeAttributes: [],
        styleAttributes: [
            { name: 'lineWidth', type: 'float', defaultValue: 1.0 },
            { name: 'lineCap', type: 'string', defaultValue: 'butt' },
            { name: 'lineJoin', type: 'string', defaultValue: 'miter' },
            { name: 'miterLimit', type: 'float', defaultValue: 10 },
            { name: 'strokeStyle', type: 'string', defaultValue: 'black' },
            { name: 'fillStyle', type: 'string', defaultValue: 'black' },
            { name: 'shadowOffsetX', type: 'float', defaultValue: 0.0 },
            { name: 'shadowOffsetY', type: 'float', defaultValue: 0.0 },
            { name: 'shadowBlur', type: 'float', defaultValue: 0.0 },
            { name: 'shadowColor', type: 'string', defaultValue: 'transparent black' },
            { name: 'font', type: 'string', defaultValue: '16px sans-serif' },
            { name: 'textAlign', type: 'string', defaultValue: 'start' },
            { name: 'textBaseline', type: 'string', defaultValue: 'top' }
        ],
    
        containsPoint: function (x, y) {
            var r = this.getBounds();
            if (r && r.x <= x && r.y <= y && r.x + r.w >= x && r.y + r.h >= y) {
                return true;
            }
            else {
                return false;
            }
        },
    
        getBounds: function () {
            return this.normRect(0, 0, 0, 0);
        },
    
        render: function (editor, context) {
            this.pushStyle(context);
            this.onRender(editor, context);
            if (this.selected) {
                this.onRenderSelected(editor, context);
            };
            this.popStyle(context);
        },
    
        move: function (action, dx, dy) {
        },
    
        hitTest: function (x, y) {
            return null;
        },
    
        intersectsRect: function (rect) {
            return this.intersects(this.getBounds(), rect);
        },
    
        startTextEdit: function () {
        },
    
        endTextEdit: function () {
        },
    
        writeXml: function (writer, parentShape) {
            writer.beginElement(this.shapeName);
            this.writeShapeAttributes(writer, parentShape);
            this.writeStyleAttributes(writer, parentShape);
            writer.endElement();
        },
    
        writeShapeAttributes: function (writer, parentShape) {
            var attr = this.shapeAttributes || [];
            array.forEach(this.shapeAttributes || [], function (a) {
                var name = StringUtil.toCamelUpper(a.name);
                var value = this[a.name];
                if (value && (!a.defaultValue || value != a.defaultValue)) {
                    switch (a.type || 'string') {
                        case 'point':
                            writer.attribute(name, value.x + ',' + value.y);
                            break;
                        case 'pointList':
                            var pointList = [];
                            array.forEach(value, function (p) {
                                pointList.push(p.x + ',' + p.y);
                            }, this);
                            writer.attribute(name, pointList.join(';'));
                            break;
                        default:
                            writer.attribute(name, value.toString());
                            break;
                    };
                };
            }, this);
    
        },
    
        writeStyleAttributes: function (writer, parentShape) {
            if (this.drawingStyle) {
                var contextStyle = parentShape ? parentShape.drawingStyle || {} : {};
                for (var p in this.drawingStyle) {
                    if (this.drawingStyle[p] && (!contextStyle[p] || this.drawingStyle[p] != contextStyle[p])) {
                        writer.attribute(StringUtil.toCamelUpper(p), this.drawingStyle[p]);
                    };
                };
            };
        },
    
    
        readXml: function (node) {
            this.readShapeAttributes(node);
            this.readStyleAttributes(node);
        },
    
        readShapeAttributes: function (node) {
            array.forEach(this.shapeAttributes, function (a) {
                var XmlName = StringUtil.toCamelUpper(a.name);
                var sValue = node.getAttribute(XmlName) || '';
                if (sValue) {
                    this[a.name] = this.parseValue(sValue, a.type, a.defaultValue);
                };
            }, this);
        },
    
        readStyleAttributes: function (node) {
            var style = null;
            array.forEach(this.styleAttributes, function (a) {
                var XmlName = StringUtil.toCamelUpper(a.name);
                var sValue = node.getAttribute(XmlName) || '';
                if (sValue) {
                    if (!style) {
                        style = {};
                    };
                    style[a.name] = this.parseValue(sValue, a.type, a.defaultValue);
                };
            }, this);
    
            if (style) {
                this.setStyle(style);
            };
        },
    
        parseValue: function (value, type, defaultValue) {
            defaultValue = defaultValue || '';
            type = type || 'string';
            value = value || '';
    
            switch (type || 'string') {
                case 'integer':
                    return parseInt(value, 10) || defaultValue;
                case 'float':
                    return parseFloat(value) || defaultValue;
                case 'boolean':
                    return (value === 'true');
                case 'point':
                    var p = value.split(',');
                    return { x: parseInt(p[0], 10) || 0, y: parseInt(p[1], 10) || 0 };
                case 'pointList':
                    var points = [];
                    var list = value.split(';');
                    array.forEach(list, function (item) {
                        var p = item.split(',');
                        points.push({ x: parseInt(p[0], 10) || 0, y: parseInt(p[1], 10) || 0 });
                    }, this);
                    return points;
                default:
                    return value || defaultValue;
            };
        },
    
        onRender: function (editor, context) { },
        onRenderSelected: function (editor, context) { }
    
    });
});