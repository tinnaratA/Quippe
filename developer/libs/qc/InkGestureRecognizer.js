define([
    "dojo/_base/declare"
], function (declare) {
    return declare("qc.InkGestureRecognizer", [], {
        gestures: [
                    {
                        name: 'check',
                        test: function (data) {
                            return data.aspect >= 0.75 && data.hSegs.match(/^R$|^L$/) && data.vSegs.match(/^DU$/);
                        },
                        getHotPoint: function (data) {
                            return { x: data.bounds.l + data.bounds.w / 2, y: data.bounds.t + (2 * data.bounds.h / 3) };
                        }
                    },
                    {
                        name: 'strike',
                        test: function (data) {
                            return data.aspect <= 0.1 && data.hSegs.match(/^R$|^L$/) && data.vSegs.match(/^.?$/);
                        },
                        getHotPoint: function (data) {
                            return { x: data.bounds.l + data.bounds.w / 2, y: data.bounds.t + data.bounds.h / 2 };
                        }
                    },
                    {
                        name: 'erase',
                        test: function (data) {
                            return data.aspect <= 0.5 && data.hSegs.match(/^RLRL|^LRLR/);
                        },
                        getHotPoint: function (data) {
                            return { x: data.bounds.l + data.bounds.w / 2, y: data.bounds.t + data.bounds.h / 2 };
                        }
                    },
                    {
                        name: 'enter',
                        test: function (data) {
                            return data.hSegs.match(/^R?L$/) && data.vSegs.match(/^D$/);
                        },
                        getHotPoint: function (data) {
                            var p = data.reducedStroke[data.reducedStroke.length - 1];
                            return { x: p.x, y: p.y };
                        }
                    }
                ],
    
            recognize: function (stroke, allowedGestures) {
                var res = {};
                var data = this.calculate(stroke);
                var gesture = this.match(data, allowedGestures);
                if (gesture) {
                    res.gesture = gesture.name;
                    res.hotPoint = gesture.getHotPoint(data);
                };
                return res;
            },
    
            debug: function (stroke, allowedGestures) {
                var data = this.calculate(stroke);
                var gesture = this.match(data, allowedGestures);
                if (gesture) {
                    data.gesture = gesture.name;
                    data.hotPoint = gesture.getHotPoint(data);
                };
                return data;
            },
    
            match: function (data, allowedGestures) {
                allowedGestures = allowedGestures || '.';
                for (var n = 0; n < this.gestures.length; n++) {
                    var g = this.gestures[n];
                    if (g.name.match(allowedGestures)) {
                        if (g.test(data)) {
                            return g;
                        }
                    }
                };
                return null;
            },
    
            calculate: function (stroke) {
                if (!(stroke && stroke.length > 1)) {
                    return null;
                }
    
                var dx = 0;
                var dy = 0;
                var tx = 3;
                var ty = 3;
                var hSegs = [];
                var vSegs = [];
                var sOut = [];
                var p = stroke[0];
                var minX = p.x;
                var minY = p.y;
                var maxX = p.x;
                var maxY = p.y;
                var lastH = '';
                var lastV = '';
    
                sOut.push(p);
    
                for (var n = 1, last = stroke.length - 1; n <= last; n++) {
                    dx = stroke[n].x - p.x;
                    dy = stroke[n].y - p.y;
                    if ((Math.abs(dx) >= tx) || (Math.abs(dy) >= ty) || n == last) {
                        p = stroke[n];
                        sOut.push(p);
                        if (p.x < minX) {
                            minX = p.x;
                        };
                        if (p.y < minY) {
                            minY = p.y;
                        };
                        if (p.x > maxX) {
                            maxX = p.x;
                        };
                        if (p.y > maxY) {
                            maxY = p.y;
                        };
    
                        if (dx >= tx && lastH != 'R') {
                            hSegs.push('R');
                            lastH = 'R';
                        }
                        else if (dx <= -tx && lastH != 'L') {
                            hSegs.push('L');
                            lastH = 'L';
                        };
    
                        if (dy >= ty && lastV != 'D') {
                            vSegs.push('D');
                            lastV = 'D';
                        }
                        else if (dy <= -ty && lastV != 'U') {
                            vSegs.push('U');
                            lastV = 'U';
                        }
                    }
                };
    
                var bounds = { l: minX, t: minY, r: maxX, b: maxY, w: Math.abs(maxX - minX), h: Math.abs(maxY - minY) };
                var aspect = bounds.h / (bounds.w || 0.00000001);
    
                return {
                    bounds: bounds,
                    aspect: aspect,
                    hSegs: hSegs.join(''),
                    vSegs: vSegs.join(''),
                    reducedStroke: sOut
                };
            }
        }
    );
});