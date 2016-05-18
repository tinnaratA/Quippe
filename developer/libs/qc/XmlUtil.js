define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/date/stamp",
	"qc/_core",
    "qc/XmlWriter",
	"qc/StringUtil"
], function (array, declare, lang, stamp, core, XmlWriter, StringUtil) {
    var XmlUtil = declare("qc.XmlUtil", [], {
        _boolPattern: /^[true|false]$/,
        _intPattern: /^-?[1-9]\d*$/,
        _isoDatePattern: /^\d{4}-\d{2}-\d{2}/,
        _arrayPattern: /^\[.*\]$/,
    
        nodeTypeEnum: {
            Element: 1,
            Attribute: 2,
            Text: 3,
            CDATA: 4,
            EntityReference: 5,
            Entity: 6,
            ProcessingInstruction: 7,
            Comment: 8,
            Document: 9,
            DocumentType: 10,
            Fragment: 11,
            Notation: 12
        },
    
        parseAttributeValue: function (value) {
            if (value == undefined || value == null) {
                return null;
            };
    
            if (core.XmlUtil._intPattern.test(value)) {
                return parseInt(value, 10);
            };
    
            if (value === 'true') {
                return true;
            };
            if (value === 'false') {
                return false;
            };
    
            if (core.XmlUtil._isoDatePattern.test(value)) {
                return stamp.fromISOString(value);
            };
    
    //        if (core.XmlUtil._arrayPattern.test(value)) {
    //            return StringUtil.parseCodedList(value);
    //        };
    
            return value;
    
        },
    
        elementToObject: function (element) {
        	var res = {};
            array.forEach(element.attributes, function (attr) {
                res[StringUtil.toCamelLower(attr.name)] = core.XmlUtil.parseAttributeValue(attr.value);
            });
            array.forEach(element.childNodes, function (child) {
                if (child.nodeType == 1) {
	                var propName = StringUtil.toCamelLower(child.tagName);
                    var childObject = core.XmlUtil.elementToObject(child);
                    if (res[propName]) {
                        if (res[propName] instanceof Array) {
                            res[propName].push(childObject);
                        }
                        else {
                            res[propName] = [res[propName], childObject];
                        }
                    }
                    else {
                        res[propName] = childObject;
                    }
                }
                else if (child.nodeType == 3) {
                    var text = child.textContent.trim();
                    if (text) {
                        res._text = child.textContent;
                    };
                }
            });
            return res;
        },

        attributesToObject: function(element) {
            var res = {};
            array.forEach(element.attributes, function (attr) {
                res[StringUtil.toCamelLower(attr.name)] = core.XmlUtil.parseAttributeValue(attr.value);
            });
            return res;
        },
    
        outerXml: function (node) {
            var writer = new XmlWriter();
            core.XmlUtil._writeXml(node, writer);
            return writer.toString();
        },
    
        innerXml: function (node) {
            var buf = [];
            array.forEach(node.childNodes, function (child) {
                buf.push(core.XmlUtil.outerXml(child))
            });
            return buf.join('');
        },
    
        selectChildElement: function (parentNode, tagName) {
            var list = parentNode ? parentNode.childNodes || [] : [];
            var tag = tagName ? tagName.toLowerCase() : '*';
            for (var n = 0, len = list.length; n < len; n++) {
                if (list[n].nodeType == 1 && (tag == '*' || list[n].tagName.toLowerCase() == tag)) {
                    return list[n];
                };
            };
            return null;
        },
    
        selectChildElements: function (parentNode, tagName) {
            var result = [];
            var list = parentNode ? parentNode.childNodes || [] : [];
            var tag = tagName ? tagName.toLowerCase() : '*';
            for (var n = 0, len = list.length; n < len; n++) {
                if (list[n].nodeType == 1 && (tag == '*' || list[n].tagName.toLowerCase() == tag)) {
                    result.push(list[n]);
                };
            };
            return result;
        },
    
        _writeXml: function (node, writer) {
            switch (node.nodeType) {
                case core.XmlUtil.nodeTypeEnum.Element:
                    writer.beginElement(node.tagName);
                    array.forEach(node.attributes, function (a) { writer.attribute(a.name, a.value) });
                    array.forEach(node.childNodes, function (child) { core.XmlUtil._writeXml(child, writer) });
                    writer.endElement();
                    break;
            	case core.XmlUtil.nodeTypeEnum.Attribute:
                    writer.attribute(node.tagName, node.nodeValue);
                    break;
            	case core.XmlUtil.nodeTypeEnum.Text:
                    writer.text(node.nodeValue);
                    break;
            	case core.XmlUtil.nodeTypeEnum.Document:
            		core.XmlUtil._writeXml(node.documentElement, writer);
                default:
                    break;
            }
        },
    
        createDocument: function (xmlText) {
            if (!xmlText) {
                return null;
            };
            if (window.DOMParser) {
                var parser = new DOMParser();
                return parser.parseFromString(xmlText, "text/xml");
            }
            else // Internet Explorer
            {
                var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = "false";
                xmlDoc.loadXML(xmlText);
                return xmlDoc;
            }
        },

        transform: function (xmlDocument, xslTransform) {
            if (!xmlDocument) {
                return null;
            };
            if (!xslTransform) {
                return xmlDocument;
            };

            if (xmlDocument.transformNode) {    // IE
                return xmlDocument.transformNode(xslTransform);
            };

            if (XSLTProcessor == undefined) {
                console.error("XSL transformation not supported in this environment");
                return null;
            };

            var xsl = new XSLTProcessor();
            xsl.importStylesheet(xslTransform);
            var ownerDocument = document.implementation.createDocument("", "", null);
            var res = xsl.transformToFragment(xmlDocument, ownerDocument);
            return res;
        }
    });

    core.XmlUtil = new XmlUtil();

    lang.setObject("qc.XmlUtil", core.XmlUtil);

	return core.XmlUtil;
});