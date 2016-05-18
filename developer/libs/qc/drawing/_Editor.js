define([
    "qc/_core",
    "qc/drawing/_DrawingObject",
    "qc/drawing/_DrawingTool",
    "qc/drawing/_Shape",
    "qc/drawing/LineShape",
    "qc/drawing/LineTool",
    "qc/drawing/PathShape",
    "qc/drawing/PathTool",
    "qc/drawing/SelectionTool",
    "qc/drawing/TextShape",
    "qc/drawing/TextTool",
    "qc/drawing/RotateFlipTool",
    "qc/drawing/CropTool",
    "qc/drawing/ImageTransformer",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/ColorPalette",
    "dijit/form/Button",
    "dijit/form/DropDownButton",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/Toolbar",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/on",
    "dojo/topic",
    "dojo/when",
	"dojo/sniff", // has("ie") has("mozilla") has("opera") has("safari") has("webkit")
    "dojo/Deferred",
    "qc/Resizer",
    "qc/drawing/EditorStateManager"
], function (_core, _DrawingObject, _DrawingTool, _Shape, LineShape, LineTool, PathShape, PathTool, SelectionTool, TextShape, TextTool, RotateFlipTool, CropTool, ImageTransformer, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, ColorPalette, Button, DropDownButton, BorderContainer, ContentPane, Toolbar, array, declare, event, lang, domClass, domGeometry, domStyle, on, topic, when, has, Deferred, Resizer, EditorStateManager) {

    // Whenever the color and line thickness settings are updated, the "defaultStyle" is updated so
    // that new images will initialize with the same style values.
    var defaultStyle = {
                strokeStyle: '#000000',
                fillStyle: '#000000',
                lineWidth: 1.5,
                font: '16px sans-serif',
                textBaseline: 'top',
                textAlign: 'start'    
            }
    function setGlobalDefaultStyle (styleObject) {
        for (var p in styleObject) {
            defaultStyle[p] = styleObject[p];
        };
    }
    topic.subscribe('/qc/drawing/setStyle', setGlobalDefaultStyle);  // easiest to keep this subscription active for all drawings to sync with style dropdowns

    return declare("qc.drawing._Editor", [_WidgetBase, _TemplatedMixin, _DrawingObject, _WidgetsInTemplateMixin], {
        templateString: '<div class="qcDrawingEditor view">'
                      + '  <div data-dojo-attach-point="canvasContainer" class="canvasContainer">'
                      + '    <img data-dojo-attach-point="backgroundImage" class="backgroundImage" />'
                      + '    <img data-dojo-attach-point="finalImage" class="finalImage" />'
                      + '    <canvas data-dojo-attach-point="surface" class="surface"></canvas>'
                      + '    <canvas data-dojo-attach-point="image" class="image"></canvas>'
                      + '  </div>'
                      + '</div>',
            imagePadding: 5,
            viewMode: 'view',
            canvasWidth: 788,
            canvasHeight: 407,
            defaultWidth: 788,
            defaultHeight: 407,
            minWidth: 30,
            minHeight: 30,
            backgroundImageId: '',
            selectedTool: null,
            selectedShape: null,
            owner: null,
            idNum: 0,
            hDown: null,
            hMove: null,
            hUp: null,

            writeXml: function (writer) {
                this.endEdit();
                this.setStyle(defaultStyle);
                if (this.shapes) {
                    writer.beginElement('Shapes');
                    array.forEach(this.shapes, function (s) {
                        s.writeXml(writer, this);
                    }, this);
                    writer.endElement();
                }
            },

            readXml: function (node) {
                array.forEach(node.childNodes, function (child) {
                    if (child.nodeType === 1) {
                        switch (child.tagName.toLowerCase()) {
                            case 'shapes':
                                this.loadShapes(child);
                                break;
                            case 'imagedata':
                                var data = (child.textContent || child.text || child.innerText || child.innerHTML || '').trim();
                                this.set('imageData', data);
                                break;
                            default:
                                break;
                        };
                    };
                }, this);
                this.renderShapes();
                this.endEdit();
            },

            loadShapes: function (node) {
                array.forEach(node.childNodes, function (child) {
                    if (child.nodeType == 1) {
                        var shape = this.shapeFromXml(child);
                        if (shape) {
                            this.addShape(shape);
                        };
                    };
                }, this);
            },

            shapeFromXml: function (node) {
                var typeName = node.getAttribute('Type');
                if (!typeName) {
                    typeName = 'qc/drawing/' + node.tagName + 'Shape';
                };

                var shape = null;

                try {
                    shape = new require(typeName)();
                }

                catch (e) {
                }

                if (!shape) {
                    return null;
                };

                shape.readXml(node);
                return shape;
            },

            postCreate: function() {
                this.imageContext = this.image.getContext("2d");
                this.surfaceContext = this.surface.getContext("2d");
            },

            startup: function () {
                if (!this._started) {
                    this.idNum = 0;

                    this.resizeWholeDrawingStack();

                    this.tools = {};
    
                    this.tools.path = new PathTool();
                    this.tools.line0 = new LineTool();
    
                    this.tools.line1 = new LineTool();
                    this.tools.line1.arrowEnd = true;
    
                    this.tools.line2 = new LineTool();
                    this.tools.line2.arrowBegin = true;
                    this.tools.line2.arrowEnd = true;
    
                    this.tools.text = new TextTool();

                    this.tools.flipHorizontal = new RotateFlipTool();
                    this.tools.flipHorizontal.mode = "flipHorizontal";

                    this.tools.flipVertical = new RotateFlipTool();
                    this.tools.flipVertical.mode = "flipVertical";

                    this.tools.rotateLeft = new RotateFlipTool();
                    this.tools.rotateLeft.mode = "rotateLeft";

                    this.tools.rotateRight = new RotateFlipTool();
                    this.tools.rotateRight.mode = "rotateRight";

                    this.tools.crop = new CropTool();

                    this.tools.selection = new SelectionTool();
    
                    this.shapes = [];
                    on(this.domNode, "click", lang.hitch(this, this.onContainerClick));
        
                    this.setStyle(defaultStyle);
                    this.pushStyle(this.imageContext);
                    this.pushStyle(this.surfaceContext);
    
                    this.resizer = new Resizer({
                        ownerNode: this.domNode, resizeCallback: lang.hitch(this, this.resizeFromResizer)
                        , onUpCallback: lang.hitch(this, this.onResizerFinished)
                        , enabled: false, minWidth: this.minWidth, minHeight: this.minHeight
                    });
                    this.inherited(arguments);

                    this.editorStateManager = new EditorStateManager(this);

                    topic.subscribe('/qc/drawing/setStyle', lang.hitch(this, this.setStyle));  // easiest to keep this subscription active for all drawings to sync with style dropdowns
                };
            },            
        
            _setViewModeAttr: function (value) {
                this.viewMode = value;
                switch (value) {
                    case 'view':
                        if (domClass.contains(this.domNode, 'edit')) {
                            this.endEdit();
                        };
                        break;

                    case 'edit':
                        this.startEdit();
                        break;

                    case 'design':
                        break;

                    default:
                        break;
                };
            },

            _getImageDataAttr: function () {
                return this.backgroundImage.src;
            },

            _setBackgroundImageIdAttr: function (value) {
                this.setBackgroundImageFromServer(value);
            },

            setBackgroundImageFromServer: function (imageId) {
                if (imageId) {
                    this.backgroundImage.src = _core.serviceURL('Quippe/Drawing/Image/Data?id=' + imageId);
                };
            },

            _setImageDataAttr: function (value) {
                // delay for utilizing results of .src set needed for ff and safari.
                var self = this;
                var thisEvent = on(this.backgroundImage, 'load', function () {
                    self.resizeWholeDrawingStack(self.backgroundImage.width, self.backgroundImage.height);
                    self.resizer.setConstrainedRatio(self.backgroundImage.width, self.backgroundImage.height);
                    thisEvent.remove();
                });
                this.backgroundImage.src = value;
            },

            setBackgroundImageDirectly: function (imageData) {

                this.backgroundImage.width = imageData.width;
                this.backgroundImage.height = imageData.height;
                this.backgroundImage.setAttribute("naturalWidth", imageData.naturalWidth || imageData.width); // imageData.naturalWidth || imageData.width;
                this.backgroundImage.setAttribute("naturalHeight", imageData.naturalHeight || imageData.height);

                this.resizeWholeDrawingStack(imageData.width, imageData.height);
                this.resizer.setConstrainedRatio(imageData.width, imageData.height);

                this.backgroundImage.removeAttribute('src');

                if (imageData.isImageTransformer) {
                    this.backgroundImage.src = imageData.newImageData;
                } else {
                    // it's should be an image element or something else with a src property.
                    this.backgroundImage.src = imageData.src;
                }

            },

            resizeFromResizer: function (width, height) {
                this._setCanvassesSizes(parseInt(width), parseInt(height));
                this.DoChromeResizeHackJiggle(width, height);
            },

            resizeWholeDrawingStack: function (width, height) {
                this._setCanvassesSizes(width, height);
            },

            //scaleBackground: function () {
            //    var naturalWidth = this.backgroundImage.naturalWidth;
            //    var naturalHeight = this.backgroundImage.naturalHeight;
            //    var maxWidth = Math.min(this.canvasWidth, 1000);
            //    var maxHeight = Math.min(this.canvasHeight, 1000);

            //    if (!naturalWidth || !naturalHeight || !maxWidth || !maxHeight) {
            //        return;
            //    };

            //    var scaledWidth = naturalWidth;
            //    var scaledHeight = naturalHeight;
            //    var style = null;
            //    if (naturalWidth > maxWidth) {
            //        style = { width: maxWidth + 'px', height: Math.floor(naturalHeight * (maxWidth / naturalWidth)) + 'px' };
            //    }
            //    else if (naturalHeight > maxHeight) {
            //        style = { height: maxHeight + 'px', width: Math.floor(naturalWidth * (maxHeight / naturalHeight)) + 'px' };
            //    };
            //    if (style) {
            //        domStyle.set(this.backgroundImage, style);
            //        //domStyle.set(this.finalImage, style);
            //    };

            //},

            _setCanvassesSizes: function (width, height) {

                width = width || this.canvasWidth || this.defaultWidth;
                height = height || this.canvasHeight || this.defaultHeight;

                var style = { width: "" + parseInt(width) + "px", height: "" + parseInt(height) + "px" };
                if (this.owner && this.owner.domNode) {
                    domStyle.set(this.owner.domNode, style);
                };
                domStyle.set(this.domNode, style);
                domStyle.set(this.canvasContainer, style);
                domStyle.set(this.finalImage, style);

                this.image.setAttribute("width", width);
                this.image.setAttribute("height", height);

                this.surface.setAttribute("width", width);
                this.surface.setAttribute("height", height);

                this.canvasWidth = width;
                this.canvasHeight = height;

                this.width = width;
                this.height = height;

                this.renderShapes();

            },

            _resizeJustTheBackgroundImage: function (w, h) {
                if (w > 6 || h > 6) {
                    this.editorStateManager.addToStateHistory("resize");
                    var box = this.rectFromLTRB(0, 0, w + 1, h + 1);
                    this.backgroundImage.width = box.w;
                    this.backgroundImage.height = box.h;
                }
            },

            onResizerFinished: function (width, height) {
                this._resizeJustTheBackgroundImage(width, height);
            },

            getBackgroundImageTransformer: function () {
                var newImageTransformer = new ImageTransformer(this.backgroundImage, lang.hitch(this, this.setBackgroundImageDirectly));
                return newImageTransformer;
            },

            getCopyOfShapes: function () {

                var copyOfCurrentShapes = [];
                var currentShape;
                var copy;

                for (var i = 0; i < this.shapes.length; i++) {
                    currentShape = this.shapes[i];
                    switch (currentShape.shapeName) {
                        case "Path":
                            copy = new PathShape();
                            copy.points = [];
                            array.forEach(currentShape.points, function (point, i) {
                                copy.points[i] = {
                                    x: point.x,
                                    y: point.y
                                }
                            });
                            copy.setStyle(currentShape.drawingStyle);
                            break;
                        case "Line":
                            copy = new LineShape();
                            copy.x1 = currentShape.x1;
                            copy.y1 = currentShape.y1;
                            copy.x2 = currentShape.x2;
                            copy.y2 = currentShape.y2;
                            copy.arrowBegin = currentShape.arrowBegin;
                            copy.arrowEnd = currentShape.arrowEnd;
                            copy.setStyle(currentShape.drawingStyle);
                            break;
                        case "Text":
                            copy = new TextShape();
                            copy.x = currentShape.x;
                            copy.y = currentShape.y;
                            copy.w = currentShape.w;
                            copy.h = currentShape.h;
                            copy.lineHeight = currentShape.lineHeight;
                            copy.minHeight = currentShape.minHeight;
                            copy.hidden = currentShape.hidden;
                            copy.text = currentShape.text;
                            copy.setStyle(currentShape.drawingStyle);
                            break;
                        default:
                            copy = null;
                    }
                    copyOfCurrentShapes[i] = copy;
                }

                return copyOfCurrentShapes;
            },
    
            startEdit: function () {
	            topic.publish('/qc/drawing/endEdit');

	            domClass.remove(this.domNode, ['view', 'design']);
	            domClass.add(this.domNode, 'edit');

                if (!this.subscriptions || this.subscriptions.length == 0) {
                    this.subscriptions = [
                        topic.subscribe('/qc/drawing/new', lang.hitch(this, this.clear)),
                        topic.subscribe('/qc/drawing/selectTool', lang.hitch(this, this.selectTool)),
//                        topic.subscribe('/qc/drawing/setStyle', lang.hitch(this, this.setStyle)),
//                        topic.subscribe('/qc/drawing/setBackgroundImage', lang.hitch(this, this.setBackgroundImage)), This did not seem to ever be used, seems to have been put in with future in mind, but OBTE.
//                        topic.subscribe('/qc/drawing/deleteSelection', lang.hitch(this, this.deleteSelection)), This did not seem to ever be used, seems to have been put in with future in mind, but OBTE.
//                        topic.subscribe('/qc/drawing/selectAll', lang.hitch(this, this.selectAll)),
                        topic.subscribe('/qc/drawing/endEdit', lang.hitch(this, this.endEdit)),
                        //topic.subscribe('/qc/SetView', lang.hitch(this, this.noteViewModeChanged))
                        topic.subscribe('/qc/ViewChanged', lang.hitch(this, this.noteViewModeChanged))
                ];
                };

                //if (this.viewMode == 'design') {
                //    return;
                //}


                if (!this.hDocumentClick) {
                    this.hDocumentClick = on(document.body, "click", lang.hitch(this, this.onDocumentClick));
                };
    
                if (!this.hDown) {
                    if (window.PointerEvent) {
                        this.hDown = on(this.surface, "pointerdown", lang.hitch(this, this.onCanvasPointerDown));
                    }
                    else if (window.MSPointerEvent) {
                        this.hDown = on(this.surface, "mspointerdown", lang.hitch(this, this.onCanvasMSPointerDown));
                    }
                    else if (_core.settings.features.touchPad) {
                        this.hDown = on(this.surface, "touchstart", lang.hitch(this, this.onCanvasTouchStart));
                    }
                    else {
                        this.hDown = on(this.surface, "mousedown", lang.hitch(this, this.onCanvasMouseDown));
                    };
                };

                if (!this.hHover) {
                    this.hHover = on(this.surface, "mousemove", lang.hitch(this, this.onCanvasMouseHover));
                }

                if (this.hasSourceData) {
                    this.imageContext.drawImage(this.finalImage, 0, 0);
                };
        
                this.selectTool(this.selectedTool || 'path');
    
                this.resizer.set('enabled', true);
                topic.publish('/qc/drawing/editStarted', this);
                this.editorStateManager.updateUndoButtonWithLastAction();  // matters when they switched to hear from another image.

            },
    
            endEdit: function () {
                if (this.selectedTool) {
                    this.tools[this.selectedTool].cancel(this, this.surfaceContext);
                };

                this.clearShapeSelection();
    
                array.forEach(this.events, _core.disconnect);
                array.forEach(this.subscriptions, _core.unsubscribe);
    
                if (this.hDocumentClick) {
                    _core.disconnect(this.hDocumentClick);
                    this.hDocumentClick = null;
                };
    
                this.events = [];
                this.subscriptions = [];

                if (this.finalImage) {
                    var deferred = new Deferred();
                    this.finalImage.src = ''; // necessary for safari or else it's onload event never fires.
                    var thisEvent = on(this.finalImage, 'load', function () {
                        deferred.resolve();
                        thisEvent.remove();
                    });
                    this.finalImage.src = this.image.toDataURL('image/png');
                }

		        domClass.remove(this.domNode, 'edit');
                domClass.add(this.domNode, 'view');
                this.viewMode = 'view';
                this.resizer.set('enabled', false);
                topic.publish('/qc/drawing/editFinished', this);

                return deferred.promise;  // promise returned in case the calling process needs to wait for the Image src to be loaded (especially in firefox).
            },
    
            finalizeDrawing: function () {
                var finalImagePromise = this.endEdit();
                var self = this;
                var finishTheImage = function () {
                    self.imageContext.drawImage(self.backgroundImage, 0, 0, self.width, self.height);
                    self.imageContext.drawImage(self.finalImage, 0, 0);
                    self.backgroundImageId = '';
                    self.backgroundImage.src = self.image.toDataURL('image/png');
                    self.clear(true);
                }
                if (has("ff") || has("safari")) { // it's firefox, which needs more time for .finalImage's src to be loaded
                    return when(finalImagePromise, finishTheImage);
                } else {
                    finishTheImage();
                    return;
                }
            },
    
            clear: function (leaveBackgroundImageThere) {
                if (!leaveBackgroundImageThere) {
                    this.backgroundImage.src = "";
                }
                this.finalImage.src = "";
                this.surfaceContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                this.imageContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                this.shapes = [];
                this.renderShapes();
            },
    
            setStyle: function (styleObject) {
                this.inherited(arguments);
                if (this.selectedTool) {
                    this.tools[this.selectedTool].setStyle(styleObject);
                };
                var weHaveNotUpdatedAShapeYet = true;
                var that = this;
                array.forEach(this.shapes, function (shape) {
                    if (shape.selected) {
                        var somethingHasChanged = (styleObject.strokeStyle && shape.drawingStyle.strokeStyle !== styleObject.strokeStyle)
                            || styleObject.lineWidth && shape.drawingStyle.lineWidth !== styleObject.lineWidth;
                        if (weHaveNotUpdatedAShapeYet && somethingHasChanged) {
                            that.editorStateManager.addToStateHistory("shapeStyleChange");
                            weHaveNotUpdatedAShapeYet = false;
                        }
                        shape.setStyle(styleObject);
                    };
                });
                this.renderShapes();
            },
    
            selectAll: function () {
                array.forEach(this.shapes, function (shape) { shape.selected = true; });
                this.renderShapes();
            },

            undo: function() {
                this.editorStateManager.undoLastAction(this);
            },
    
            nextId: function () {
                this.idNum++;
                return "S" + this.idNum;
            },
    
            addShape: function (shape) {
                if (shape) {
                    shape.id = this.nextId();
                    this.shapes.push(shape);
                    this.renderShapes();
                };
            },
    
            indexOfShape: function (shapeId) {
                for (var n = 0, len = this.shapes.length; n < len; n++) {
                    if (this.shapes[n].id === shapeId) {
                        return n;
                    }
                };
                return -1;
            },
    
            removeShape: function (shapeId) {
                var n = this.indexOfShape(shapeId);
                if (n >= 0) {
                    this.shapes.splice(n, 1);
                }
            },
    
            deleteSelection: function () {
                var n = this.getFirstSelectedShapeIndex();
                if (n >= 0) {
                    this.editorStateManager.addToStateHistory("deleteShapes");
                }
                while (n >= 0) {
                    this.shapes.splice(n, 1);
                    n = this.getFirstSelectedShapeIndex();
                };
                this.renderShapes();
            },
    
            deleteImage: function () {
                var message = "Image will be permanently removed from Note.  Continue?";
                _core.confirm({
                    title: 'Delete Image From Note', message: message,
                    yesCallback: lang.hitch(this, function () {
                        this.endEdit();
                        topic.publish("/qc/DeleteFinding", this.owner);
                    })
                });
            },

            getShapeAtPoint: function (x, y) {
                for (var n = this.shapes.length - 1; n >= 0; n--) {
                    if (this.shapes[n].hitTest(x, y)) {
                        return this.shapes[n];
                    };
                }
                return null;
            },
        
            renderShapes: function () {
                this.imageContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                if (this.shapes) {
                    for (var n = 0; n < this.shapes.length; n++) {
                        this.shapes[n].render(this, this.imageContext);
                    };
                }
            },
    
            selectTool: function (toolName) {
                var previousSelectedTool = this.selectedTool;
                var newSelectedTool = toolName; //might be overridden below
                if (previousSelectedTool === "crop" || previousSelectedTool === "resize") {
                    this.tools[previousSelectedTool].cancel(this, this.surfaceContext);
                }
                var methodTools = ["undo", "selectAll", "deleteSelection", "deleteImage"];
                if (array.indexOf(methodTools, toolName) > -1) {
                    lang.hitch(this, this[toolName]);
                    newSelectedTool = previousSelectedTool || "path";
                    this[toolName]();
                } else if (this.tools[toolName]) {
                    //if (newSelectedTool != previousSelectedTool) {
                        this.tools[toolName].onSelected(this, this.surfaceContext);
                    //}
                    switch (toolName) {
                        case "flipHorizontal":
                        case "flipVertical":
                        case "rotateLeft":
                        case "rotateRight":
                            newSelectedTool = previousSelectedTool || "path";
                            break;
                    }                    
                }
                else {
                    return false;
                }

                if (newSelectedTool !== toolName) {
                    topic.publish("/qc/drawing/setSelectedTool", toolName);
                    var self = this;
                    window.setTimeout(function () {
                        self.tools[newSelectedTool].setStyle(self.drawingStyle);
                        self.selectedTool = newSelectedTool;
                        topic.publish("/qc/drawing/setSelectedTool", newSelectedTool);
                    }, 200);
                } else {
                    if (newSelectedTool != previousSelectedTool) {
                        this.tools[newSelectedTool].setStyle(this.drawingStyle);
                        this.selectedTool = newSelectedTool;
                    }
                    topic.publish("/qc/drawing/setSelectedTool", newSelectedTool);
                }

                return true;
            },
    
            clearShapeSelection: function () {
                array.forEach(this.shapes, function (shape) {
                    shape.selected = false;
                });
                this.renderShapes();
            },
    
            getFirstSelectedShapeIndex: function () {
                for (var n = this.shapes.length - 1; n >= 0; n--) {
                    if (this.shapes[n].selected) {
                        return n;
                    }
                };
                return -1;
            },
    
            getSelectedShapes: function () {
                var selected = [];
                for (var n = this.shapes.length - 1; n >= 0; n--) {
                    if (this.shapes[n].selected) {
                        selected.push(this.shapes[n]);
                    }
                };
                return selected;
            },

            disconnectEvents: function () {
                if (this.hMove) {
                    _core.disconnect(this.hMove);
                    this.hMove = null;
                };
                if (this.hUp) {
                    _core.disconnect(this.hUp);
                    this.hUp = null;
                };
            },

            _touchToMouseEvent: function (e) {
                if (e.touches.length > 1 || e.targetTouches > 1 || e.changedTouches > 1) {
                    return null;
                };

                if (e.changedTouches && e.changedTouches.length == 1) {
                    event.stop(e);
                    var evt = {};
                    evt.clientX = e.changedTouches[0].clientX;
                    evt.clientY = e.changedTouches[0].clientY;
                    evt.screenX = e.changedTouches[0].screenX;
                    evt.screenY = e.changedTouches[0].screenY;
                    evt.pageX = e.changedTouches[0].pageX;
                    evt.pageY = e.changedTouches[0].pageY;
                    this.ox = this.tOX; // +this.scrollNode.scrollLeft;
                    this.oy = this.tOY; // +this.scrollNode.scrollTop;
                    evt.layerX = evt.pageX + this.ox;
                    evt.layerY = evt.pageY + this.oy;

                    evt.preventDefault = function () { return true };
                    evt.stopPropagation = function () { return true };

                    if (e.changedTouches[0].target) {
                        if (e.changedTouches[0].target.nodeType == 1) {
                            evt.target = e.changedTouches[0].target;
                        }
                        else {
                            evt.target = e.changedTouches[0].target.parentNode;
                        };
                    }
                    else {
                        evt.target = e.target;
                    }
                    return evt;
                }
                else {
                    return null;
                };
            },

            noteViewModeChanged: function (viewMode) {
                if (this.viewMode == 'edit') {
                    this.endEdit();
                }
            },
    
            onContainerClick: function (evt) {
                if (this.owner && this.owner.get('disabled')) {
                    return;
                };

                if (_core.getNoteEditor().viewMode == "design") {
                    //this.set('viewMode', 'design');
                    return;
                }
                //this.set('viewMode', 'edit');

                switch (this.viewMode) {
                    case 'edit':
                    case 'design':
                        break;
                    default:
                        this.set('viewMode', 'edit');
                };
            },
    
            onDocumentClick: function (evt) {
                var container = _core.ancestorNodeByClass(evt.target, 'qcDrawingEditor', true);
                if (!container) {
                    var editor = _core.ancestorNodeByClass(evt.target, 'qcNoteEditor', true);
                    if (editor) {
                        this.endEdit();
                    };
                };
            },
    
            onCanvasMouseDown: function (evt) {
                event.stop(evt);
                if (this.selectedTool) {
                    this.hMove = on(this.surface, "mousemove", lang.hitch(this, this.onCanvasMouseMove));
                    this.hUp = on(this.surface, "mouseup", lang.hitch(this, this.onCanvasMouseUp));
                    this.tools[this.selectedTool].onMouseDown(this, this.surfaceContext, evt);
                };
            },
    
            onCanvasMouseMove: function (evt) {
                event.stop(evt);
                if (this.selectedTool) {
                    this.tools[this.selectedTool].onMouseMove(this, this.surfaceContext, evt);
                };
            },
    
            onCanvasMouseUp: function (evt) {
                event.stop(evt);
                this.disconnectEvents();
                if (this.selectedTool) {
                    this.tools[this.selectedTool].onMouseUp(this, this.surfaceContext, evt);
                };
            },
    
            onCanvasMSPointerDown: function (evt) {
                event.stop(evt);
                if (this.selectedTool) {
                    this.hMove = on(this.surface, 'mspointermove', lang.hitch(this, this.onCanvasMSPointerMove));
                    this.hUp = on(this.surface, 'mspointerup', lang.hitch(this, this.onCanvasMSPointerUp));
                    this.tools[this.selectedTool].onMouseDown(this, this.surfaceContext, evt);
                };
            },
    
            onCanvasMSPointerMove: function (evt) {
                event.stop(evt);
                if (this.selectedTool) {
                    this.tools[this.selectedTool].onMouseMove(this, this.surfaceContext, evt);
                };
            },
    
            onCanvasMSPointerUp: function (evt) {
                event.stop(evt);
                this.disconnectEvents();
                if (this.selectedTool) {
                    this.tools[this.selectedTool].onMouseUp(this, this.surfaceContext, evt);
                };
            },
    
    
            onCanvasPointerDown: function (evt) {
                event.stop(evt);
                if (this.selectedTool) {
                    this.hMove = on(this.surface, 'pointermove', lang.hitch(this, this.onCanvasPointerMove));
                    this.hUp = on(this.surface, 'pointerup', lang.hitch(this, this.onCanvasPointerUp));
                    this.tools[this.selectedTool].onMouseDown(this, this.surfaceContext, evt);
                };
            },
    
            onCanvasPointerMove: function (evt) {
                event.stop(evt);
                if (this.selectedTool) {
                    this.tools[this.selectedTool].onMouseMove(this, this.surfaceContext, evt);
                };
            },
    
            onCanvasPointerUp: function (evt) {
                event.stop(evt);
                this.disconnectEvents();
                if (this.selectedTool) {
                    this.tools[this.selectedTool].onMouseUp(this, this.surfaceContext, evt);
                };
            },
    
            onCanvasTouchStart: function (evt) {
                var pos = domGeometry.position(this.domNode);
                this.tOX = -1 * pos.x;
                this.tOY = -1 * pos.y;
                var e = this._touchToMouseEvent(evt);
                if (e && this.selectedTool) {
                    this.hMove = on(this.surface, "touchmove", lang.hitch(this, this.onCanvasTouchMove));
                    this.hUp = on(this.surface, "touchend", lang.hitch(this, this.onCanvasTouchEnd));
                    this.tools[this.selectedTool].onMouseDown(this, this.surfaceContext, e);
                };
            },
    
            onCanvasTouchMove: function (evt) {
                var e = this._touchToMouseEvent(evt);
                if (e && this.selectedTool) {
                    this.tools[this.selectedTool].onMouseMove(this, this.surfaceContext, e);
                };
            },
    
            onCanvasTouchEnd: function (evt) {
                this.disconnectEvents();
                var e = this._touchToMouseEvent(evt);
                if (e && this.selectedTool) {
                    this.tools[this.selectedTool].onMouseUp(this, this.surfaceContext, e);
                };
            },

            onCanvasMouseHover: function(evt) {
                if (evt && this.selectedTool) {
                    this.tools[this.selectedTool].onMouseHover(this, this.surfaceContext, evt);
                };
            },
    
            DoChromeResizeHackJiggle: function (width, height) {
                if (has("chrome")) {
                    width = width || this.backgroundImage.width || this.width;
                    height = height || this.backgroundImage.height || this.height;
                    var fakeStyle = {
                        width: "" + (parseInt(width) + 1) + "px",
                        height: "" + (parseInt(height) + 1) + "px",
                        visibility: "hidden"
                    };
                    var style = {
                        width: "" + parseInt(width) + "px",
                        height: "" + parseInt(height) + "px",
                        visibility: "visible"
                    };
                    // Below actions are taken from a variety solutions people have used to get around this bug in Chrome the
                    // past 5 years.  Toggling width and visibility, with offsetHeight property access in the middle, was all
                    // necessary to get rid of the resizing problem we have 40% of the time in Chrome when the dimensions change.
                    domStyle.set(this.domNode, fakeStyle);
                    domStyle.set(this.owner.domNode, fakeStyle);
                    var variableNecessaryToStopABuildWarning = this.domNode.offsetHeight;
                    domStyle.set(this.domNode, style);
                    domStyle.set(this.owner.domNode, style);
                }

            },

            destroyRecursive: function () {
                array.forEach(this.events, _core.disconnect);
                array.forEach(this.subscriptions, _core.unsubscribe);
                this.inherited(arguments);
            }


        }
    );
});