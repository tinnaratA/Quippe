define([
    "qc/_core",
    "dojo/_base/lang",
    "qc/drawing/LineTool",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/dom-style",
    "dojo/dom-construct",
    "qc/drawing/ImageTransformer",
    "dojo/_base/declare",
    "qc/drawing/drawingSettings"
], function (_core, lang, LineTool, array, dom, domStyle, domConstruct, ImageTransformer, declare, drawingSettings) {

    function AllPoint(point, self) {
        this.top = point.y - self.y1;
        this.right = self.x2 - point.x;
        this.bottom = self.y2 - point.y;
        this.left = point.x - self.x1;
    }

    function isBetween(number, min, max) {
        return (number + drawingSettings.grabTolerance >= min)
            && (number - drawingSettings.grabTolerance <= max);
    }

    function closeTo(number, target) {
        return (number >= target - _core.drawingSettings.grabTolerance)
            && (number <= target + _core.drawingSettings.grabTolerance);
    }

    return declare("qc.drawing.CropTool", [LineTool], {

        _allPoint: null,

        drawingStyle: { strokeStyle: '3px dashed rgba(222,60,80,1)', fillStyle: 'rgba(219,195,253,.4)' },
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        
        isTweaking: false,

        setStyle: function () {
            //don't override style
        },

        _btnCrop: null,
        _divCrop: null,

        _findWhatPointTheyGot: function (point, setAllPointIfAppropriate) {
            var whatTheyGot = "";
            if (isBetween(point.x, this.x1, this.x2) && closeTo(point.y, this.y1)) {
                whatTheyGot = "Top";
            }
            if (isBetween(point.x, this.x1, this.x2) && closeTo(point.y, this.y2)) {
                whatTheyGot = "Bottom";
            }
            if (isBetween(point.y, this.y1, this.y2) && closeTo(point.x, this.x1)) {
                whatTheyGot = whatTheyGot + "Left";
            }
            if (isBetween(point.y, this.y1, this.y2) && closeTo(point.x, this.x2)) {
                whatTheyGot = whatTheyGot + "Right";
            }
            if (!whatTheyGot && isBetween(point.x, this.x1, this.x2)
                && (isBetween(point.y, this.y1, this.y2))) {
                whatTheyGot = 'All';
                if (setAllPointIfAppropriate) {
                    this._allPoint = new AllPoint(point, this);
                }
            }
            return whatTheyGot;
        },

        _drawTheBox: function (editor, context) {
            this.clearContext(editor, context);
            context.fillRect(0, 0, editor.width, editor.height);
            context.setLineDash([6, 12]);
            context.strokeRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
            context.clearRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);

            var top = "" + ((this.x1 * 2 + this.x2) / 3 - 30).toString().split(".")[0] + "px";
            var left = "" + ((this.y1 * 2 + this.y2) / 3 - 5).toString().split(".")[0] + "px";
            domStyle.set(this._divCrop, "left", top);
            domStyle.set(this._divCrop, "top", "" + left);
        },

        constructor: function (editor) {

        },

        onSelected: function (editor, context) {
            
            if (!this.x1 && !this.y1 && !this.x2 && !this.y2) {
                this.x1 = editor.width * .12;
                this.y1 = editor.height * .12;
                this.x2 = editor.width * .88;
                this.y2 = editor.height * .88;
            }

            this.pushStyle(context);

            editor.clearShapeSelection();

            context.save();
            this.needsContextRestore = true;

            editor.renderShapes();

            this._divCrop = this._divCrop || domConstruct.place("<div id='divCropToSquare' style='position: absolute; left:2px; top:2px; z-index:200000; width:60px'><input id='btnCropToSquare' type='button' value='Crop to selection' /></div>"
                , editor.owner.domNode);
            this._btnCrop = dom.byId("btnCropToSquare");
            var self = this;
            this._btnCrop.onclick = function (evt) {
                var dx = Math.abs(self.x2 - self.x1) || 0;
                var dy = Math.abs(self.y2 - self.y1) || 0;
                if (dx > 6 || dy > 6) {
                    editor.editorStateManager.addToStateHistory("crop");
                    var box = self.rectFromLTRB(self.x1, self.y1, self.x2, self.y2);
                    box.w = box.w + 1;
                    box.h = box.h + 1;
                    editor.getBackgroundImageTransformer().cropTo(box);

                    editor.clearShapeSelection();
                    if (self.needsContextRestore) {
                        context.restore();
                        self.needsContextRestore = false;
                    }
                    domConstruct.destroy(self._divCrop);
                    self._divCrop = null;
                    self._btnCrop = null;
                    domStyle.set(editor.owner.domNode, { cursor: "" });
                    self.whichIsMoving = null;
                    self.x1 = 0;
                    self.y1 = 0;
                    self.x2 = 0;
                    self.y2 = 0;
                    editor.DoChromeResizeHackJiggle();
                }
            }

            this._drawTheBox(editor, context);
        },

        onMouseDown: function (editor, context, evt) {
            var point = this.getEventPoint(evt);
            this.whichIsMoving = this._findWhatPointTheyGot(point, true);
        },

        onMouseHover: function (editor, context, evt) {

            var point = this.getEventPoint(evt);
            if (!this.whichIsMoving) {
                if (point.x === 0 || point.x === editor.width - 1
                    || point.y === 0 || point.y === editor.height - 1) {
                    domStyle.set(editor.owner.domNode, { cursor: "" });
                } else {
                    switch (this._findWhatPointTheyGot(point)) {
                        case "Left": case "Right":
                            domStyle.set(editor.owner.domNode, { cursor: "w-resize" });
                            break;
                        case "Top": case "Bottom":
                            domStyle.set(editor.owner.domNode, { cursor: "s-resize" });
                            break;
                        case "TopRight": case "BottomLeft":
                            domStyle.set(editor.owner.domNode, { cursor: "sw-resize" });
                            break;
                        case "TopLeft": case "BottomRight":
                            domStyle.set(editor.owner.domNode, { cursor: "se-resize" });
                            break;
                        case "All":
                            domStyle.set(editor.owner.domNode, { cursor: "move" });
                            break;
                        default:
                            domStyle.set(editor.owner.domNode, { cursor: "" });
                    }
                }
            }
        },

        onMouseMove: function (editor, context, evt) {
            var point = this.getEventPoint(evt);

            var snapToEdgeTolerance = drawingSettings.cropSnapToEdgeTolerance;

            if (this.whichIsMoving) {
                if (this.whichIsMoving.indexOf("Top") > -1) {
                    if (point.y < snapToEdgeTolerance) point.y = 0;
                    this.y1 = point.y;
                } else if (this.whichIsMoving.indexOf("Bottom") > -1) {
                    if (point.y > editor.height - snapToEdgeTolerance) point.y = editor.height;
                    this.y2 = point.y;
                }
                if (this.whichIsMoving.indexOf("Left") > -1) {
                    if (point.x < snapToEdgeTolerance) point.x = 0;
                    this.x1 = point.x;
                } else if (this.whichIsMoving.indexOf("Right") > -1) {
                    if (point.x > editor.width - snapToEdgeTolerance) point.x = editor.width;
                    this.x2 = point.x;
                }
                var currentlyInAProperSpotForMoving = this._findWhatPointTheyGot(point);
                if ((this.whichIsMoving.indexOf("All") > -1) && currentlyInAProperSpotForMoving) {
                    if (point.x < this._allPoint.left) {
                        this._allPoint.right = this._allPoint.right + this._allPoint.left - point.x;
                        this._allPoint.left = point.x;
                    }
                    if (point.y < this._allPoint.top) {
                        this._allPoint.bottom = this._allPoint.bottom + this._allPoint.top - point.y;
                        this._allPoint.top = point.y;
                    }
                    if (point.x > editor.width - this._allPoint.right) {
                        this._allPoint.left = point.x - this.x1;
                        this._allPoint.right = editor.width - point.x;
                    }
                    if (point.y > editor.height - this._allPoint.bottom) {
                        this._allPoint.top = point.y - this.y1;
                        this._allPoint.bottom = editor.height - point.y;
                    }
                    this.x1 = point.x - this._allPoint.left;
                    this.x2 = point.x + this._allPoint.right;
                    this.y1 = point.y - this._allPoint.top;
                    this.y2 = point.y + this._allPoint.bottom;
                }
                this._drawTheBox(editor, context);
            }

        },

        onMouseUp: function (editor, context, evt) {
            this.whichIsMoving = null;
        },

        cancel: function (editor, context) {
            this.whichIsMoving = null;
            domStyle.set(editor.owner.domNode, { cursor: "" });
            this.clearContext(editor, context);
            context.restore();
            context.canvas.width = context.canvas.width;
            this.needsContextRestore = false;
            domConstruct.destroy(this._divCrop);
            this._divCrop = null;
            this._btnCrop = null;
        }

    });
});