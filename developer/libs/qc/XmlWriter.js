define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/Stateful",
    "qc/_core",
	"qc/DateUtil",
    "qc/StringUtil"
], function (array, declare, Stateful, core, DateUtil, StringUtil) {
    return declare("qc.XmlWriter", [Stateful], {
        includeXmlDeclaration: false,
        indent: true,
        indentString: '  ',
        inElement: false,
        elements: [],
        buffer: '',
        lines: [],
        attributeNames: null,
        parms: {},
    
        constructor: function () {
            this.elements = [];
            this.buffer = '';
            this.lines = [];
            this.attributeNames = null;
            this.inElement = false;
        },
    
        _setIndentAttr: function (value) {
            this.indent = value;
            this.indentString = value ? '  ' : '';
        },
    
        element: function (tagName, attrs, text) {
            this.beginElement(tagName, attrs);
            if (text) {
                this.text(text);
            }
            this.endElement();
        },
    
        simpleElement: function (tagName, text) {
            if (this.inElement) {
                this.writeLine(">");
                this.inElement = false;
            }
            this.writeIndent();
            this.write('<');
            this.write(tagName);
            this.write('>');
            this.write(text);
            this.write('</');
            this.write(tagName);
            this.writeLine('>');
            this.attributeNames = null;
        },
    
        beginElement: function (tagName, attrs) {
            if (this.inElement) {
                this.writeLine(">");
                this.inElement = false;
            }
            this.writeIndent();
            this.write('<');
            this.write(tagName);
            this.elements.push(tagName);
            this.inElement = true;
            this.attributeNames = null;
            this.attributes(attrs);
        },
    
        endElement: function (noShortcut) {
            if (this.elements.length === 0) {
                return;
            }
    
            var tagName = this.elements.pop();
            if (this.inElement) {
                if (noShortcut) {
                    this.writeLine('>');
                    this.writeIndent();
                    this.writeLine('</' + tagName + '>');
                }
                else {
                    this.writeLine(' />');
                }
                this.inElement = false;
            }
            else {
                this.writeIndent();
                this.writeLine('</' + tagName + '>');
            }
            this.attributeNames = null;
        },
    
        attribute: function (name, value, impliedValue) {
            if (this.inElement && name && (value != undefined) && (value != null) && (value != impliedValue) && !this.alreadyWroteAttribute(name)) {
                this.write(' ' + name + '="' + this.escape(value) + '"');
                this.wroteAttribute(name);
            }
        },
    
        escape: function (value) {
            if (value == undefined || value == null) {
                return '';
            };
    
            if (DateUtil.isDate(value)) {
                return DateUtil.formatISODate(value);
            };
    
            var s = value.toString();
            var len = s.length;
            var out = [];
            var c = '';
            for (var n = 0; n < len; n++) {
                c = s.charAt(n);
                switch (c) {
                    case '"':
                        out.push("&quot;");
                        break;
                    case "<":
                        out.push("&lt;");
                        break;
                    case ">":
                        out.push("&gt;");
                        break;
                    case "&":
                        out.push("&amp;");
                        break;
                    default:
                        out.push(c)
                        break;
                };
            };
            return out.join('');
        },
    
        attributes: function (attrObj) {
            if (this.inElement && attrObj != null) {
                for (var name in attrObj) {
                    this.attribute(name, attrObj[name], null);
                }
            }
        },
    
        text: function (value) {
            if (this.inElement) {
                this.writeLine('>');
                this.inElement = false;
            }
            this.writeIndent();
            this.writeLine(this.escape(value));
        },
    
        cData: function (value) {
            if (this.inElement) {
                this.writeLine('>');
                this.inElement = false;
            }
            this.writeIndent();
            this.writeLine('<![CDATA[');
            this.writeLine(value || '');
            this.writeLine(']]>');
        },
    
        raw: function (value) {
            if (this.inElement) {
                this.writeLine('>');
                this.inElement = false;
            }
            this.writeLine(value || '');
        },
    
        copyElement: function (xmlNode) {
            var n = 0;
    
            if (!xmlNode) {
                return;
            };
            this.beginElement(xmlNode.tagName);
            for (n = 0; n < xmlNode.attributes.length; n++) {
                this.attribute(xmlNode.attributes[n].name, xmlNode.attributes[n].value);
            }
    
            var child = xmlNode.childNodes;
            for (n = 0; n < child.length; n++) {
                switch (child[n].nodeType) {
                    case 1:
                        this.copyElement(child[n]);
                        break;
                    case 3:
                        var textContent = (child[n].nodeValue || '').trim();
                        if (textContent) {
                            this.text(textContent);
                        };
                        break;
                    default:
                        break;
                };
            }
            this.endElement();
        },
    
        mergeCopyElement: function (xmlNode, attributeCallback, childNodeCallback) {
            if (!xmlNode) {
                return;
            };
    
            var self = this;
            self.beginElement(xmlNode.tagName);
    
            array.forEach(attributeCallback ? attributeCallback(xmlNode) : xmlNode.attributes, function (attr) {
                self.attribute(attr.name, attr.value);
            });
    
            array.forEach(childNodeCallback ? childNodeCallback(xmlNode) : xmlNode.childNodes, function (child) {
                switch (child.nodeType) {
                    case 1:
                        self.mergeCopyElement(child, attributeCallback, childNodeCallback);
                        break;
                    case 3:
                        self.text(child.nodeValue || '');
                        break;
                    default:
                        break;
                };
            });
    
            self.endElement();
        },
    
        writeList: function(listName, elementName, list, shallow, nameMapper) {
            this.beginElement(listName);
            array.forEach(list, function (item) {
                this.writeObject(elementName, item, shallow, nameMapper);
            }, this);
            this.endElement();
        },

        writeObject: function (elementName, obj, shallow, nameMapper) {
            this.beginElement(elementName);

            var mapName = nameMapper || function (name) {
                return name == 'id' ? name : StringUtil.toCamelUpper(name);
            };

            core.forEachProperty(obj, function (name, value) {
                if (value != null) {
                    switch (typeof value) {
                        case 'string':
                            this.attribute(mapName(name), value, '');
                            break;
                        case 'number':
                            this.attribute(mapName(name), value);
                            break;
                        case 'boolean':
                            this.attribute(mapName(name), value);
                            break;
                        case 'function':
                            break;
                        case 'object':
                            if (DateUtil.isDate(value)) {
                                this.attribute(mapName(name), DateUtil.formatISODate(value));
                            }
                            else {
                                if (!shallow) {
                                    this.writeObject(mapName(name), value);
                                };
                            };
                            break;
                        default:
                            break;
                    };
                };
            }, this);
            this.endElement();
        },
    
        writeObjectAttributes: function (obj, nameMapper) {
            var mapName = nameMapper || function (name) {
                return name == 'id' ? name : StringUtil.toCamelUpper(name);
            };

            if (this.inElement && obj) {
                core.forEachProperty(obj, function (name, value) {
                    if (value != null) {
                        switch (typeof value) {
                            case 'string':
                                this.attribute(mapName(name), value, '');
                                break;
                            case 'number':
                                this.attribute(mapName(name), value);
                                break;
                            case 'boolean':
                                this.attribute(mapName(name), value);
                                break;
                            case 'function':
                                break;
                            case 'object':
                                if (DateUtil.isDate(value)) {
                                    this.attribute(mapName(name), DateUtil.formatISODate(value));
                                }
                                else {
                                    this.attribute(mapName(name), value.toString());
                                };
                                break;
                            default:
                                break;
                        };
                    };
                }, this);
            };
        },
    
        writeIndent: function () {
            if (this.indent) {
                for (var n = 0; n < this.elements.length; n++) {
                    this.buffer += this.indentString;
                }
            }
        },
    
        write: function (value) {
            this.buffer += value || "";
        },
    
        writeLine: function (value) {
            this.buffer += value || "";
            this.lines.push(this.buffer);
            this.buffer = "";
        },
    
        alreadyWroteAttribute: function (name) {
            return (name && this.attributeNames && array.indexOf(this.attributeNames, name.toLowerCase()) >= 0);
        },
    
        wroteAttribute: function (name) {
            if (!this.attributeNames) {
                this.attributeNames = [];
            };
            this.attributeNames.push(name.toLowerCase());
        },
    
        toDocument: function () {
            if (window.DOMParser) {
                var parser = new DOMParser();
                return parser.parseFromString(this.toString(), "text/xml");
            }
            else // Internet Explorer
            {
                var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = "false";
                xmlDoc.loadXML(this.toString());
                return xmlDoc;
            }
        },
    
        toString: function () {
            return (this.includeXmlDeclaration ? '<?xml version="1.0" ?>' + "\n" : "") + (this.indent ? this.lines.join("\n") : this.lines.join(''));
        }
    });
});