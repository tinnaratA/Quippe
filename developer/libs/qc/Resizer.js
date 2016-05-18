define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/dom-geometry",
    "dojo/on",
    "dojo/query",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/registry",
    "qc/_core"
], function (declare, array, lang, domClass, domConstruct, domStyle, domGeometry, on, query, _WidgetBase, _TemplatedMixin, registry, core) {
    var typeDef = declare('qc.Resizer', [_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="qcResizer"></div>',

        ownerNode: null,
        resizeCallback: null,
        onUpCallback: null,
        sizeNode: null,
        enabled: true,
        sizeEvents: null,
        hUp: null,
        posOwner: null,
        minWidth: 0,
        maxWidth: 10000,
        minHeight: 0,
        maxHeight: 10000,

        setConstrainedRatio: function(w, h) {
            if (this._constrainedX !== w && this._constrainedY !== h) {
                this._constrainedX = w;
                this._constrainedY = h;
                var t = w + h;
                this._heightPercentage = h / t;
                this._widthPercentage = w / t;
            }
            
        },

        _getRatioPoints: function (w, h) {
            var t = w + h;
            var d = Math.abs(w / t - this._widthPercentage) + Math.abs(h / t - this._heightPercentage);
            t = t * (1 + .7 * d);
            return {
                x: t * this._widthPercentage,
                y: t * this._heightPercentage
            };
        },

        _setEnabledAttr: function(value) {
            if (value) {
                if (this.hDown) {
                    this.hDown.remove();
                    this.hDown = null;
                };

                if (window.PointerEvent) {
                    this.hDown = on(this.domNode, 'pointerdown', lang.hitch(this, this.onPointerDown));
                }
                else if (window.MSPointerEvent) {
                    this.hDown = on(this.domNode, 'mspointerdown', lang.hitch(this, this.onMSPointerDown));
                }
                else if (core.settings.features.touchPad) {
                    this.hDown = on(this.domNode, 'touchstart', lang.hitch(this, this.onTouchStart));
                }
                else {
                    this.hDown = on(this.domNode, 'mousedown', lang.hitch(this, this.onMouseDown));
                };

                domStyle.set(this.domNode, { display: 'block' });
            }
            else {
                if (this.hDown) {
                    this.hDown.remove();
                    this.hDown = null;
                };
                domStyle.set(this.domNode, { display: 'none' });
            };
            this.enabled = value;
        },

        _setOwnerNodeAttr: function(value) {
            this.ownerNode =value;
            switch (domStyle.get(this.ownerNode, 'position')) {
                case 'absolute':
                    break;
                case 'relative':
                    break;
                default:
                    domStyle.set(this.ownerNode, { position: 'relative' });
            };
            this.placeAt(this.ownerNode, 'first');
        },

        onDown: function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            this.reset();
            this.posOwner = domGeometry.position(this.ownerNode);
            this.overlay = domConstruct.place('<div class="qcResizerOverlay"></div>', document.body, 'first');
        },

        onMouseDown: function(evt) {
            this.onDown(evt);
            this.sizeEvents = [
                on(this.overlay, 'mousedown', lang.hitch(this, this.reset)),
                on(this.overlay, 'mousemove', lang.hitch(this, this.onMove)),
                on(this.overlay, 'mouseup', lang.hitch(this, this.onUp))
            ];
        },

        onPointerDown: function(evt) {
            this.onDown(evt);
            this.sizeEvents = [
                on(this.overlay, 'pointerdown', lang.hitch(this, this.reset)),
                on(this.overlay, 'pointermove', lang.hitch(this, this.onMove)),
                on(this.overlay, 'pointerup', lang.hitch(this, this.onUp))
            ];
        },

        onMSPointerDown: function (evt) {
            this.onDown(evt);
            this.sizeEvents = [
                on(this.overlay, 'mspointerdown', lang.hitch(this, this.reset)),
                on(this.overlay, 'mspointermove', lang.hitch(this, this.onMove)),
                on(this.overlay, 'mspointerup', lang.hitch(this, this.onUp))
            ];
        },

        onTouchStart: function (evt) {
            this.onDown(evt);
            this.sizeEvents = [
                on(this.overlay, 'touchstart', lang.hitch(this, this.reset)),
                on(this.domNode, 'touchmove', lang.hitch(this, this.onMove)),
                on(this.domNode, 'touchend', lang.hitch(this, this.onUp))
            ];
        },

        onMove: function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var w = evt.clientX - this.posOwner.x;
            var h = evt.clientY - this.posOwner.y;
            this.doResize(w, h);
        },

        onTouchMove: function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            if (evt.touches && evt.touches.length == 1) {
                var w = evt.touches[0].clientX - this.posOwner.x;
                var h = evt.touches[0].clientY - this.posOwner.y;
                this.doResize(w, h);
            }
            else {
                this.reset();
            };
        },

        onUp: function (evt) {
            if (this.onUpCallback) {
                var w = evt.clientX - this.posOwner.x;
                var h = evt.clientY - this.posOwner.y;

                w = Math.min(Math.max(w, this.minWidth), this.maxWidth);
                h = Math.min(Math.max(h, this.minHeight), this.maxHeight);
                if (this._constrainedX) {
                    var newPoints = this._getRatioPoints(w, h);
                    w = newPoints.x;
                    h = newPoints.y;
                }
                this.onUpCallback(w, h);
            };


            evt.preventDefault();
            evt.stopPropagation();
            this.reset();
        },

        reset: function () {
            if (this.sizeEvents) {
                array.forEach(this.sizeEvents, function (e) { e.remove() });
                this.sizeEvents = null;
            };
            if (this.overlay) {
                domConstruct.destroy(this.overlay);
            }
        },

        doResize: function (w, h) {
            w = Math.min(Math.max(w, this.minWidth), this.maxWidth);
            h = Math.min(Math.max(h, this.minHeight), this.maxHeight);
            if (this._constrainedX) {
                var newPoints = this._getRatioPoints(w, h);
                w = newPoints.x;
                h = newPoints.y;
            }

            if (this.resizeCallback) {
                this.resizeCallback(w, h);
                return;
            };

            if (!this.ownerNode) {
                return;
            };


            if (!this.sizeNode) {
                this.sizeNode = domClass.contains(this.ownerNode, 'sizeNode') ? this.ownerNode : query('.sizeNode', this.ownerNode)[0];
            };

            if (this.sizeNode) {
                domStyle.set(this.sizeNode, { width: w + 'px', height: h + 'px' });
                this._sizeChangedFromHandle(w, h);
            }
        },

        _sizeChangedFromHandle: function (w, h) {
        }
    });

    return typeDef;
});