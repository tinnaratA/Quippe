define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "qc/_core",
    "qc/XmlWriter",
    "qc/DateUtil"
], function (array, declare, event, lang, query, domClass, domConstruct, domStyle, on,  core, XmlWriter, DateUtil) {
    return declare("qc.PDFGen", [], {

        execute: function(noteEditor, settings) {
            if (!noteEditor) {
                return;
            };

            settings = settings || noteEditor.getPrintSettings() || {};
            var printNode = noteEditor.getPrintable();
            domClass.add(printNode, 'printable');

            //remove old-style PatientBanner
            query('.patientBanner', printNode).forEach(function (node) { node.parentNode.removeChild(node) });

            var form = domConstruct.create('form')
            form.setAttribute('method', 'post');
            form.setAttribute('action', core.serviceURL("Quippe/Printing/PDF"));
            form.setAttribute('target', 'QuippePDFView');

            var addParm = function (name, value) {
                var input = domConstruct.create('input')
                input.setAttribute('type', 'hidden');
                input.setAttribute('name', name)
                input.setAttribute('value', value)
                form.appendChild(input);
            };

            addParm('Title', document.title);
            addParm('Debug', core.settings.printingDebug);
            addParm('NoteHTML', this.resolveHTML(printNode));
            addParm('PrintData', this.getPrintData(noteEditor.noteViewer ? noteEditor.noteViewer.note : noteEditor.note) || '');
            if (settings) {
                for (var p in settings) {
                    addParm(p, settings[p]);
                }
            };

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            return true;
        },

        resolveHTML: function (targetNode) {
            if (targetNode.nodeName.toLowerCase() == "html") {
                return targetNode.outerHTML;
            }

            var writer = new XmlWriter();
            writer.raw('<!DOCTYPE html>');
            writer.beginElement('html');
            writer.beginElement('head');
            writer.beginElement('base')
            writer.attribute('href', this.getBaseURL());
            writer.endElement();
            writer.beginElement('title');
            writer.text(document.title)
            writer.endElement();
            query('link').forEach(function (link) {
                writer.beginElement('link');
                array.forEach(link.attributes, function (a) { writer.attribute(a.name, a.value) });
                writer.endElement();
            });
            query('style').forEach(function (style) {
                writer.beginElement('style');
                array.forEach(style.attributes, function (a) { writer.attribute(a.name, a.value) });
                writer.raw(style.textContent);
                writer.endElement();
            });
            writer.endElement();
            writer.beginElement('body');
            array.forEach(document.body.attributes, function (a) {
                writer.attribute(a.name, a.value);
            });

            writer.raw(targetNode.outerHTML);

            writer.endElement();
            writer.endElement();
            var res = writer.toString();
            return res;
        },

        getPrintData: function (noteWidget) {
            var writer = new XmlWriter();
            writer.beginElement('PrintData');
            writer.writeObject('Patient', noteWidget && noteWidget.Patient ? noteWidget.Patient : core.Patient, true);
            writer.writeObject('Encounter', noteWidget && noteWidget.Encounter ? noteWidget.Encounter : core.Encounter, true);
            writer.writeObject('Provider', noteWidget && noteWidget.Provider ? noteWidget.Provider : core.Provider, true);
            writer.beginElement('Print');
            writer.attribute('Time', DateUtil.formatISODate(new Date()));
            writer.endElement();

            if (noteWidget) {
                writer.beginElement('Document')
                noteWidget.writeNoteAttributes(writer, 'template');
                writer.endElement();
            };

            writer.endElement();
            var res = writer.toString();
            return res;
        },

        getBaseURL: function () {
            var parts = window.location.pathname.split("/");
            parts.pop();
            var url = window.location.protocol + '//' + window.location.host + parts.join("/") + "/"
            return url;
        }
    }
    );
});