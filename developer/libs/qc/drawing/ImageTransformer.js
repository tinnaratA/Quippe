define([
    "dojo/dom",
    "dojo/dom-construct",
    "dojo/_base/declare"
], function (dom, domConstruct, declare) {

    return declare("qc.drawing.ImageTransformer", [], {

        _afterTransformCallbackFunction: null,

        _doImageAction: function (fn, fnAfterNewImageInPlace) {
            var canvas = domConstruct.create("canvas", { width: this.naturalWidth, height: this.naturalHeight});
            var context = canvas.getContext("2d");
            fn.call(this, canvas, context);
            this.newImageData = canvas.toDataURL('image/png');
            if (fnAfterNewImageInPlace) {
                fnAfterNewImageInPlace.call(this, canvas, context);
            }
            if (_afterTransformCallbackFunction) {
                _afterTransformCallbackFunction(this);
            }
            return this;
        },

        _rotate: function (rotation, widthChange, heightChange) {
            return this._doImageAction(function (canvas, context) {
                canvas.width = this.naturalHeight;
                canvas.height = this.naturalWidth;
                context.rotate(Math.PI / rotation);
                context.drawImage(this.HTMLImageElement, widthChange, heightChange);
            }, function(canvas, context) {
                var tempHeight = this.height;
                this.height = this.width;
                this.width = tempHeight;
                tempHeight = this.naturalHeight;
                this.naturalHeight = this.naturalWidth;
                this.naturalWidth = tempHeight;
            });
        },
        
        constructor: function (image64BitOrElement, optionalCallbackFunction) {
            this.HTMLImageElement = image64BitOrElement;
            this.width = image64BitOrElement.width;
            this.height = image64BitOrElement.height;
            this.naturalWidth = image64BitOrElement.naturalWidth;
            this.naturalHeight = image64BitOrElement.naturalHeight;
            _afterTransformCallbackFunction = optionalCallbackFunction;
        },

        isImageTransformer: true,

        // if newHeight is not passed, we'll figure it out from existing dimensions
        resampleTo: function(newWidth, newHeight) {

            if (newWidth === undefined) {
                newWidth = this.width;
            }
            return this._doImageAction(function (canvas, context) {
                if (newHeight === undefined) {
                    newHeight = Math.round(this.height * newWidth / this.width);
                }
                canvas.width = newWidth;
                canvas.height = newHeight;
                context.drawImage(this.HTMLImageElement, 0, 0, newWidth, newHeight);
            }, function(canvas, context) {
                this.width = newWidth;
                this.height = newHeight;
                this.naturalWidth = newWidth;
                this.naturalHeight = newHeight;
            });

        },

        flipHorizontal: function() {
            return this._doImageAction(function (canvas, context) {
                canvas.width = this.naturalWidth || this.width;
                canvas.height = this.naturalHeight || this.height;
                context.scale(-1, 1);
                context.drawImage(this.HTMLImageElement, -1 * this.naturalWidth || this.width, 0);
            });
        },

        flipVertical: function() {
            return this._doImageAction(function (canvas, context) {
                canvas.width = this.naturalWidth || this.width;
                canvas.height = this.naturalHeight || this.height;
                context.scale(1, -1);
                context.drawImage(this.HTMLImageElement, 0, -1 * this.naturalHeight || this.height);
            });

        },

        rotateRight: function () {
            this._rotate(2, 0, -1 * this.naturalHeight);
            return this;
        },

        rotateLeft: function() {
            this._rotate(-2, -1 * this.naturalWidth, 0);
            return this;
        },

        cropTo: function(box) {
            return this._doImageAction(function (canvas, context) {
                var canvasWidth = box.w;
                var canvasHeight = box.h;
                var canvasStartingXPoint = -box.x;
                var canvasStartingYPoint = -box.y;
                if (this.HTMLImageElement.width !== this.HTMLImageElement.naturalWidth) {
                    canvasWidth = box.w * this.HTMLImageElement.naturalWidth / this.HTMLImageElement.width;
                    canvasHeight = box.h * this.HTMLImageElement.naturalHeight / this.HTMLImageElement.height;
                    canvasStartingXPoint = -box.x * this.HTMLImageElement.naturalWidth / this.HTMLImageElement.width;
                    canvasStartingYPoint = -box.y * this.HTMLImageElement.naturalHeight / this.HTMLImageElement.height;
                    this.width = box.w;
                    this.height = box.h;
                } else {
                    this.width = canvasWidth;
                    this.height = canvasHeight;
                }
                this.naturalWidth = canvasWidth;
                this.naturalHeight = canvasHeight;
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                context.drawImage(this.HTMLImageElement, canvasStartingXPoint, canvasStartingYPoint);
            });
        }

    });
});