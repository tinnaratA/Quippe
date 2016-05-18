define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/dom-geometry",
    "dojo/keys",
    "dojo/on",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "qc/_core",
    "dojo/text!qc/templates/RangeSlider.htm"
], function (declare, array, lang, domStyle, domGeometry, keys, on, _WidgetBase, _TemplatedMixin, core, templateText) {
    var typeDef = declare('qc.RangeSlider', [_WidgetBase, _TemplatedMixin], {
        templateString: templateText,
        min: -100,
        max: 100,
        leftValue: -50,
        rightValue: 50,
        width: 300,
        continuousUpdate: false,

        startup: function() {
            if (!this._started) {
                this.inherited(arguments);
                this._render();
                on(this.domNode, 'dblclick', lang.hitch(this, function () {
                    this.leftValue = this.min;
                    this.rightValue = this.max;
                    this._render();
                    this.onChange();
                }))
            };
        },

        _pixelToValue: function(x) {
            var range = this.max - this.min;
            var scale = this.width / range;
            return (x / scale) + this.min;
        },

        _valueToPixel: function (v) {
            var range = this.max - this.min;
            var scale = this.width / range;
            return (v - this.min) * scale;
        },

        _setWidthAttr: function (value) {
            value = value || 300;
            this.width = value;
            domStyle.set(this.rangeNode, { width: this.width + 'px' });
            this._render();
        },

        _setMinAttr: function(value) {
            this.min = value;
            this.minLabel.innerHTML = value;
        },

        _setMaxAttr: function(value) {
            this.max = value;
            this.maxLabel.innerHTML = value;
        },

        _setLeftValueAttr: function (value) {
            value = value < this.min ? this.min : value > this.rightValue ? this.rightValue : value;
            if (value != this.leftValue) {
                this.leftValue = value;
                this._render();
            };
        },

        _setRightValueAttr: function (value) {
            value = value > this.max ? this.max : value < this.leftValue ? this.leftValue : value;
            if (value != this.rightValue) {
                this.rightValue = value;
                this._render();
            };
        },

        _render: function () {
            if (!this.domNode) {
                return;
            };

            var l = this._valueToPixel(this.leftValue);
            var r = this._valueToPixel(this.rightValue);
            l = Math.min(l, r - 16);
            r = Math.max(r, l + 16);

            domStyle.set(this.leftNode, { left: (l-1) + 'px' });
            domStyle.set(this.rightNode, { left: (r - 7) + 'px' });
            domStyle.set(this.midNode, { left: (l + 7) + 'px', width: (r - l - 14) + 'px' });

            this.leftLabel.innerHTML = Math.round(this.leftValue);
            domStyle.set(this.leftLabel, { left: (l - 20) + 'px', display: (l < 20 ? 'none' : 'inline-block') });

            this.rightLabel.innerHTML = Math.round(this.rightValue);
            domStyle.set(this.rightLabel, { left: (r + 4) + 'px', display: (r < this.width - 20) ? 'inline-block' : 'none' });

        },

        onLeftDown: function (evt) {
            var hMove = on(document, 'mousemove', lang.hitch(this, function (evt) {
                evt.preventDefault();
                evt.stopPropagation();
                var px = evt.clientX - domGeometry.position(this.domNode).x;
                var vx = this._pixelToValue(px);
                if (vx >= this.min && vx < this.rightValue) {
                    this.set('leftValue', vx);
                    if (this.continuousUpdate) {
                        this.onChange();
                    }
                };
            }));
            var hUp = on(document, 'mouseup', lang.hitch(this, function (evt) {
                evt.preventDefault();
                evt.stopPropagation();
                hMove.remove();
                hUp.remove();
                this._render();
                this.onChange();
            }));
        },

        onRightDown: function(evt) {
            var hMove = on(document, 'mousemove', lang.hitch(this, function (evt) {
                evt.preventDefault();
                evt.stopPropagation();
                var px = evt.clientX - domGeometry.position(this.domNode).x;
                var vx = this._pixelToValue(px);
                if (vx <= this.max && vx > this.leftValue) {
                    this.set('rightValue', vx);
                    if (this.continuousUpdate) {
                        this.onChange();
                    }
                };
            }));
            var hUp = on(document, 'mouseup', lang.hitch(this, function (evt) {
                evt.preventDefault();
                evt.stopPropagation();
                hMove.remove();
                hUp.remove();
                this._render();
                this.onChange();
            }));
        },

        onMidDown: function (evt) {
            var startValue = this._pixelToValue(evt.clientX - domGeometry.position(this.domNode).x);
            var startL = this.leftValue;
            var startR = this.rightValue;
            var hMove = on(document, 'mousemove', lang.hitch(this, function (evt) {
                evt.preventDefault();
                evt.stopPropagation();
                var value = this._pixelToValue(evt.clientX - domGeometry.position(this.domNode).x);
                var dx = value - startValue;
                if (dx != 0) {
                    this.set('leftValue', startL + dx);
                    this.set('rightValue', startR + dx);
                }
                if (this.continuousUpdate) {
                    this.onChange();
                }
            }));
            var hUp = on(document, 'mouseup', lang.hitch(this, function (evt) {
                evt.preventDefault();
                evt.stopPropagation();
                hMove.remove();
                hUp.remove();
                this._render();
                this.onChange();
            }));
        },

        //onKeyDown: function(evt) {
        //    var code = evt.charCode || evt.keyCode;
        //    switch (code) {
        //        case keys.ENTER:
        //            this.leftValue = this.min;
        //            this.rightValue = this.max;
        //            this._render();
        //            this.onChange();
        //        case keys.LEFT_ARROW:
        //            this.leftValue = Math.max(this.min, this.leftValue - 1);
        //            this._render();
        //            if (this.continuousUpdate) {
        //                this.onChange();
        //            };
        //        case keys.RIGHT_ARROW:
        //            this.rightValue = Math.min(this.max, this.rightValue + 1);
        //            this._render();
        //            if (this.continuousUpdate) {
        //                this.onChange();
        //            };
        //    }
        //},

        onChange: function () {
        }
       

    });

    return typeDef;
});