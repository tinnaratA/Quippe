define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/on",
    "dojo/query",
	"dojo/request",
    "dojo/topic",
    "dojo/when",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "qc/_core",
    "qc/NoteEditor",
    "qc/XmlUtil",
    "Quippe/Application"
], function (declare, array, lang, aspect, on, query, request, topic, when, domClass, domConstruct, domStyle, core, NoteEditor, XmlUtil, Application) {
    return declare("Quippe.PrintApp", [Application], {
        init: function () {
            this.startup();
            core.app = this;
            var self = this;

            return dojo.when(self._loadAppSettings(), function (settings) {
                document.body.setAttribute("data-app-status", "1");
                self._initSettings(settings);
                self._initEnums();

                var editor = new NoteEditor();
                editor.startup();
                domStyle.set(editor.domNode, { width: '100%', height: '100%' });
                domClass.add(editor.domNode, 'printable');
                editor.placeAt(self.domNode);
                self.editor = editor;

                document.body.setAttribute("data-app-status", "1");
                return true;
            });

        },

        loadXML: function (xmlDoc) {
            document.body.setAttribute("data-app-status", "2");

            if (typeof xmlDoc == 'string') {
                xmlDoc = XmlUtil.createDocument(xmlDoc);
            };

            var xRoot = xmlDoc.documentElement;

            array.forEach(['Patient', 'Encounter', 'Provider'], function (elementName) {
                var xElement = XmlUtil.selectChildElement(xRoot, elementName);
                if (xElement) {
                    core[elementName] = XmlUtil.elementToObject(xElement);
                };
            });

            var xNote = XmlUtil.selectChildElement(xRoot, "Note");
            if (xNote) {
                var xDoc = XmlUtil.selectChildElement(xNote, "*");
                if (xDoc) {
                    this.editor.loadXml(xDoc);
                    this.editor.setView('concise');
                    //fix text boxes
                    query("input").forEach(function (x) {
                        if (x.getAttribute("type") == "text") {
                            x.setAttribute("value", x.value);
                        };
                    });
                    query("textarea").forEach(function (x) {
                        x.innerHTML = x.value;
                    });
                };
            };
            document.body.setAttribute("data-app-status", "3");
            return true;
        },

        clear: function () {
            document.body.setAttribute("data-app-status", "1");
            core.Patient = null;
            core.Encounter = null;
            core.Provider = null;
            this.editor.clear();
        }

    })
});