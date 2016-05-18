define([
    "dojo/_base/declare",
    "qc/_core",
    "qc/note/_Element",
    "qc/note/Chapter",
    "qc/note/ContentPane",
    "qc/note/Document",
    "qc/note/Drawing",
    "qc/note/External",
    "qc/note/FindingGroup",
    "qc/note/FindingLabel",
    "qc/note/FindingTable",
    "qc/note/FreeText",
    "qc/note/Group",
    "qc/note/HtmlContent",
    "qc/note/Label",
    "qc/note/LayoutTable",
    "qc/note/PatientBanner",
    "qc/note/Section",
    "qc/note/Form",
    "qc/note/Wizard",
    "qc/note/TabbedDialog",
    "qc/note/Hyperlink",
    "qc/note/StateButton",
    "qc/XmlUtil",
    "qc/XmlWriter"
], function (declare, core, _Element, Chapter, ContentPane, Document, Drawing, External, FindingGroup, FindingLabel, FindingTable, FreeText, Group, HtmlContent, Label, LayoutTable, PatientBanner, Section, Form, Wizard, TabbedDialog, Hyperlink, CheckedLabel, XmlUtil, XmlWriter) {
    var TypeDef = declare("qc.Note", [], {
		constructor: function () {
            this.baseElement = new _Element();
        },

		parseXml: function (xmlNode, sourceClass) {
		    // summary:
		    //  Deserializes Quippe Note XML into a NoteElement object.
		    // xmlNode: Object
		    //  An XML Document, XML Element, or string of XML text to parse
		    // sourceClass: string
            //  A CSS class name to be applied recursively to the resulting note elements
		    if (!xmlNode) {
		        return null;
		    }
		    else if (typeof xmlNode == 'string') {
		        return this.parseXml(XmlUtil.createDocument(xmlNode), sourceClass);
		    }
		    else if (xmlNode.nodeType == XmlUtil.nodeTypeEnum.Document) {
		        return this.parseXml(xmlNode.documentElement, sourceClass);
		    }
		    else if (xmlNode.nodeType == XmlUtil.nodeTypeEnum.Element) {
		        return this.baseElement.parseXml(xmlNode, sourceClass);
		    }
		    else {
		        return null;
		    };
        },

		writeXml: function(element, asRoot) {
		    // summary:
		    //  Serializes the given note element to XML
		    // element: Object
		    //  The NoteElement widget to serialize
		    // asRoot: Boolean
		    //   When true will treat the element as the root of a new document - i.e. all inherited component
		    //   settings will be resolved to the element level
		    if (!element || !element.writeNoteElement) {
		        return null;
		    };
		    var writer = new XmlWriter();
		    if (asRoot) {
		        element.serializeAllSettings = true;
		    };
		    element.writeNoteElement(writer, 'template');
		    if (asRoot) {
		        element.serializeAllSettings = false;
		    };
		    return writer.toString();
		},

        cloneElement: function (element, asRoot) {
            // summary: 
            //   Creates a cloned copy of the given element by serializing/deserializing the element.
            //   This avoids issues with javascript's clone method which can't handle self-referencing objects.
            // element: Object
            //   The NoteElement widget to clone
            // asRoot: Boolean
            //   When true will treat the element as the root of a new document - i.e. all inherited component
            //   settings will be resolved to the element level
            var xml = this.writeXml(element, asRoot);
            var newElement = this.parseXml(xml);
            return newElement;
        }
    });

    core.Note = new TypeDef();

    return core.Note;
});