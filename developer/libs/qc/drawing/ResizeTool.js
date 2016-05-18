// deprecated.  Resizing no longer happens with this tool.
//define([
//    "qc/_core",
//    "dojo/_base/lang",
//    "qc/drawing/LineTool",
//    "dojo/_base/array",
//    "qc/drawing/ImageTransformer",
//    "dojo/_base/declare"
//], function (_core, lang, LineTool, array, ImageTransformer, declare) {

//    var theMargin = 0; // 5;  // temporarily, must match value in _Editor.setPaddingForBackgroundImage
//    var backgroundImage;
//    var heightToWidthRatio = NaN;
//    var heightPercentage = NaN;
//    var widthPercentage = NaN;

//    function setImageRatioIfNecessary (editor) {
//        if (isNaN(heightToWidthRatio)) {
//            backgroundImage = editor.backgroundImage;
//            var t = backgroundImage.height + backgroundImage.width;
//            heightPercentage = backgroundImage.height / t;
//            widthPercentage = backgroundImage.width / t;
//        }
        
//    }

//    function getRatioPoints(xPoint, yPoint) {
//        var w = xPoint - theMargin;
//        var h = yPoint - theMargin; 
//        var t = w + h;
//        return {
//            x: t * widthPercentage + theMargin,
//            y: t * heightPercentage + theMargin
//        };
//    }

//    function adjustPointsForMargins(backgroundImage) {
//        this.startX = Math.max(1, this.startX - theMargin);
//        this.startY = Math.max(1, this.startY - theMargin);
//        this.endX =  this.endX - theMargin;
//        this.endY = this.endY - theMargin;
//    };

//    return declare("qc.drawing.CropTool", [LineTool], {
//        drawingStyle: { strokeStyle: '2px dashed rgba(222,60,80,.9)', fillStyle: 'rgba(219,253,195,0.2)' },
//        startX: 0,
//        startY: 0,
//        endX: 0,
//        endY: 0,

//        setStyle: function () {
//            //don't override style
//        },

//        constructor: function (correspondingBackgroundImage) {
//            //backgroundImage = correspondingBackgroundImage;
//            //heightToWidthRatio = backgroundImage.height / backgroundImage.width;
//        },

//        onMouseDown: function (editor, context, evt) {
//            var point = this.getEventPoint(evt);

//            setImageRatioIfNecessary(editor);
//            var ratioedPoints = getRatioPoints.call(this, point.x, point.y);
//            this.px = ratioedPoints.x;
//            this.py = ratioedPoints.y;
//            this.startX = theMargin;
//            this.startY = theMargin;
//            this.endX = ratioedPoints.x;
//            this.endY = ratioedPoints.y;

//            this.clearContext(editor, context);
//            this.pushStyle(context);

//            editor.clearShapeSelection();
//            this.isSelecting = true;

//            context.setLineDash([6, 12]);
//            context.strokeRect(this.startX, this.startY, this.endX - this.startX, this.endY - this.startY);
//            context.fillRect(this.startX, this.startY, this.endX - this.startX, this.endY - this.startY);

//            context.save();
//            this.needsContextRestore = true;

//            editor.renderShapes();
//        },

//        onMouseMove: function (editor, context, evt) {
//            var point = this.getEventPoint(evt);
//            var ratioedPoints = getRatioPoints.call(this, point.x, point.y);
//            var x = ratioedPoints.x;
//            var y = ratioedPoints.y;

//            this.endX = x;
//            this.endY = y;

//            if (this.isSelecting) {
//                this.clearContext(editor, context);
//                context.setLineDash([6, 12]);
//                var w = x - this.px;
//                var h = y - this.py;
//                context.strokeRect(this.startX, this.startY, this.endX - this.startX, this.endY - this.startY);
//                context.fillRect(this.startX, this.startY, this.endX - this.startX, this.endY - this.startY);
//            }

//        },

//        onMouseUp: function (editor, context, evt) {
//            this.isMoving = false;
//            this.clearContext(editor, context);

//            if (this.isSelecting) {
//                this.isSelecting = false;
//                var dx = Math.abs(this.endX - this.startX + 1) || 0;
//                var dy = Math.abs(this.endY - this.startY + 1) || 0;
//                if (dx > 6 || dy > 6) {

//                    adjustPointsForMargins.call(this, editor.backgroundImage);
//                    var box = this.rectFromLTRB(this.startX, this.startY, this.endX, this.endY);
//                    box.w = box.w + 1;
//                    box.h = box.h + 1;
//                    var message = "Resize image to this size?";
//                    var resample = false;

//                    if (dx > editor.backgroundImage.naturalWidth - 1) {
//                        if (editor.backgroundImage.width === editor.backgroundImage.naturalWidth) {
//                            message = "You are expanding the image beyond natural size.  Some quality degradation might occur.\r\n\r\n"
//                                + message;
//                            resample = true;
//                        } else {
//                            message = "The size you selected is larger than the information we have for this image. \r\n\r\n" +
//                                "Some quality degradation might occur.  We will resize the image to it's natural size. \r\n\r\n" +
//                                "Then if you wish to make it bigger, resize.\r\n\r\n\r\n\r\n" + message;
//                            box.w = editor.backgroundImage.naturalWidth;
//                            box.h = editor.backgroundImage.naturalHeight;
//                        }
//                    }

//                    _core.confirm({
//                        title: 'Resize Image', message: message,
//                        yesCallback: lang.hitch(this, function () {
//                            editor.editorStateManager.addToStateHistory("resize");
//                            if (resample) {
//                                editor.getBackgroundImageTransformer().resampleTo(box.w, box.h);
//                            } else {
//                                editor.backgroundImage.width = box.w;
//                                editor.backgroundImage.height = box.h;
////                                editor.setPaddingForBackgroundImage(true);
//                            }
//                        })
//                    });
//                    editor.clearShapeSelection();
//                    if (this.needsContextRestore) {
//                        context.restore();
//                        context.canvas.width = context.canvas.width;
//                        this.needsContextRestore = false;
//                    }
//                }
//            };

//            editor.renderShapes();
//        },

//        cancel: function (editor, context) {
//            this.clearContext(editor, context);
//            this.isSelecting = false;
//            if (this.needsContextRestore) {
//                context.restore();
//                context.canvas.width = context.canvas.width;
//                this.needsContextRestore = false;
//            }
//        }

//    });
//});