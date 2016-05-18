define([
    "qc/drawing/_Editor",
    "qc/note/_Element",
    "qc/note/_SelectableMixin",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
	"qc/_core"
], function (_Editor, _Element, _SelectableMixin, array, declare, lang, domStyle, core) {
    var Drawing = declare("qc.note.Drawing", [_Element, _SelectableMixin], {

            templateString: '<div class="qcDrawing externalEntry qcddSource qcContextMenuContainer" data-dojo-attach-point="containerNode"></div>',
            elementName: 'Drawing',
            fromImage: false,
    
            parseXmlAttributes: function (widget, xmlNode) {
    
                this.inherited(arguments);
    
                var pad = 24;
                var maxHeight = 1000;
                var maxWidth = 1000;
    
    
                this.drawingEditor = new _Editor();
                this.drawingEditor.owner = this;
                var imageWidth = parseInt(xmlNode.getAttribute("Width"), 10);
                var imageHeight = parseInt(xmlNode.getAttribute("Height"), 10);

                //var w = Math.min(imageWidth * 1.6 + pad * 2, maxWidth);
                //var h = Math.min(imageHeight + pad * 2, maxHeight);

                var w = 0;
                var h = 0;
                if (imageWidth > maxWidth) {
                    w = maxWidth;
                    h = imageHeight * (maxWidth / imageWidth);
                }
                else if (imageHeight > maxHeight) {
                    h = maxHeight;
                    w = imageWidth * (maxHeight / imageHeight);
                }
                else {
                    w = imageWidth;
                    h = imageHeight;
                };
    
                this.drawingEditor.canvasWidth = w;
                this.drawingEditor.canvasHeight = h;
                domStyle.set(this.domNode, { width: w + "px", height: h + "px" });
                domStyle.set(this.drawingEditor.domNode, { width: w + "px", height: h + "px" });
                this.drawingEditor.placeAt(this.containerNode);
                var imageId = xmlNode.getAttribute("ImageId") || 0;
                if (imageId) {
                    this.drawingEditor.setBackgroundImageFromServer(imageId);
                }
                this.drawingEditor.startup();
    
                this.drawingEditor.readXml(xmlNode);
//                this.drawingEditor.setPaddingForBackgroundImage(true);
            },
    
            parseXmlChildElements: function (widget, xmlNode, sourceClass) {
                return 0;
            },
    
            finalizeNote: function () {
                if (this.drawingEditor) {
                    return this.drawingEditor.finalizeDrawing();
                };
            },
    
            updateDisplay: function () {
                this.inherited(arguments);
                if (this.drawingEditor) {
                    this.drawingEditor.renderShapes();
                };
            },
    
            writeNoteElement: function (writer, mode) {
                if (mode == 'template') {
                    writer.beginElement(this.sourceXmlNode.tagName);
                    array.forEach(this.sourceXmlNode.attributes, function (a) {
                        switch (a.name) {
                            case 'Width':
                                break;
                            case 'Height':
                                break;
                            default:
                                writer.attribute(a.name, a.value);
                                break;
                                break;
                        };
                    }, this);
                    writer.attribute("Width", this.drawingEditor.width);
                    writer.attribute("Height", this.drawingEditor.height);
                    this.drawingEditor.writeXml(writer);
                    //if (this.fromImage) {
                        var imageData = this.drawingEditor.get('imageData');
                        if (imageData) {
                            writer.simpleElement("ImageData", imageData);
                        };
                    //}
                    writer.endElement();
                }
                else {
                    writer.beginElement('Drawing');
                    writer.attribute("Width", this.drawingEditor.width);
                    writer.attribute("Height", this.drawingEditor.height);
                    var imageData = this.drawingEditor.get('imageData');
                    if (imageData) {
                        writer.simpleElement("ImageData", imageData);
                    };
                    writer.endElement();
                };
            },
    
            getItem: function (node) {
                return { type: 'noteElement', node: this.domNode, text: 'Drawing' };
            },
    
    
            getContextActions: function (item, widget, targetNode) {
                return [
                    { label: 'Delete Drawing', icon: 'delete', onClick: lang.hitch(this, this.dropDelete) }
                ];
            }
    
    
        }
    );

    core.settings.noteElementClasses["qc/note/Drawing"] = Drawing;

	return Drawing;
});