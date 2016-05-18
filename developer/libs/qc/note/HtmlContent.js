define([
    "qc/note/_Element",
    "qc/XmlUtil",
    "dijit/layout/ContentPane",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/query",
    "qc/_core"
], function (_Element, XmlUtil, ContentPane, registry, array, declare, domConstruct, query, core) {
    var HtmlContent = declare("qc.note.HtmlContent", [_Element], {
        elementName: 'HtmlContent',
        templateString: '<div class="qcHtmlContent qcddSource sealed"></div>',
        isContainer: true,
    
        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            this.parseContent(this.domNode, xmlNode);
        },
    
        writeNoteChildren: function (writer, mode) {
            array.forEach(this.domNode.childNodes, function (child) {
                this.writeNode(child, writer, mode);
            }, this);
        },
    
        writeNode: function (node, writer, mode) {
            if (node.nodeType == 1) {
                if (node.getAttribute('widgetid')) {
                    var widget = registry.byNode(node);
                    if (widget && widget.writeNoteElement) {
                        widget.writeNoteElement(writer, mode);
                    }
                    else {
                        this.writeDomElement(node, writer, mode);
                    }
                }
                else {
                    this.writeDomElement(node, writer, mode);
                };
            }
            else if (node.nodeType == 3) {
                var text = (node.nodeValue || '').trim();
                if (text) {
                    writer.text(text);
                };
            };
        },
    
        writeDomElement: function (node, writer, mode) {
            writer.beginElement(node.tagName.toLowerCase());
            array.forEach(node.attributes, function (attr) {
                writer.attribute(attr.name, attr.value);
            });
            array.forEach(node.childNodes, function (child) {
                this.writeNode(child, writer, mode);
            }, this);
            writer.endElement();
        },
    
        getChildNoteElements: function () {
            var thisId = this.id;
            var list = query(".noteElement", this.domNode).map(registry.byNode).filter(function (widget) {
                if (widget.id != thisId) {
                    var parentWidget = core.ancestorWidgetByClass(widget.domNode, 'noteElement');
                    if (parentWidget && parentWidget.id == thisId) {
                        return widget;
                    };
                };
            });
            return list;
        },
    
        getItem: function (node) {
            var item = { type: 'noteElement', text: 'HTML Content' };
            item.node = this.domNode;
            return item;
        },
    
        parseContent: function (parent, xmlNode) {
            var htmNode = null;
            var widgetType = null;
            var widget = null;
    
            array.forEach(xmlNode.childNodes, function (xChild) {
                switch (xChild.nodeType) {
                    case XmlUtil.nodeTypeEnum.Element:
                        widgetType = this.typeFromNode(xChild);
                        if (widgetType) {
                            widget = this.parseXml(xChild);
                            if (widget) {
                                widget.placeAt(parent);
                            };
                        }
                        else {
                            htmNode = domConstruct.create(xChild.tagName);
                            array.forEach(xChild.attributes, function (a) {
                                htmNode.setAttribute(a.name, a.value);
                            });
                            domConstruct.place(htmNode, parent);
                            this.parseContent(htmNode, xChild);
                        };
                        break;
                    case XmlUtil.nodeTypeEnum.Text:
                        htmNode = document.createTextNode(xChild.nodeValue);
                        parent.appendChild(htmNode);
                        break;
                    default:
                        break;
                };
            }, this);
        },
    
        getDropAction: function (source, evt) {
            return null;
        },
    
        doDrop: function (source) {
            return null;
        }
    
    });
    core.settings.noteElementClasses["qc/note/HtmlContent"] = HtmlContent;
    return HtmlContent;
});