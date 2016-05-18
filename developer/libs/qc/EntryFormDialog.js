define([
	"dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/when",
    "dojo/request",
    "dojo/query",
    "dojo/topic",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dijit/registry",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "qc/NoteViewer",
    "qc/NoteEditor",
    "qc/Note",
    "qc/Dialog",
    "qc/XmlUtil",
    "qc/XmlWriter",
    "qc/StringUtil",
	"qc/_core",
    "dojo/text!qc/templates/EntryFormDialog.htm"
], function (declare, array, lang, when, request, query, topic, domClass, domConstruct, domStyle, registry, _WidgetBase, _TemplatedMixin, ContentPane, Button, NoteViewer, NoteEditor, Note, Dialog, XmlUtil, XmlWriter, StringUtil, core, templateText) {
    return declare("qc.EntryFormDialog", Dialog, {
        templateString: templateText,
        title: 'Form',
        contentId: '',
        contentXML: null,
        width: 500,
        height: 300,
        note: null,
        hostEditor: null,
        finalizeBehavior: 'addEntries',

        _setContentIdAttr: function (value) {
            this.contentId = value || '';
            if (this.contentId) {
                this._loadContentFromId(this.contentId);
            };
        },

        _setContentXMLAttr: function (value) {
            this.contentXML = value || null;
            if (this.contentXML) {
                return this.loadContentFromXML(this.contentXML);
            }
        },

        _setWidthAttr: function (value) {
            var nValue = parseInt(value, 10);
            if (!isNaN(nValue)) {
                this.width = nValue;
                domStyle.set(this.viewPort, 'width', nValue + 'px');
            };
        },

        _setHeightAttr: function (value) {
            var nValue = parseInt(value, 10);
            if (!isNaN(nValue)) {
                this.height = nValue;
                domStyle.set(this.viewPort, 'height', nValue + 'px');
            };
        },

        _loadContentFromId: function (id) {
            if (!id) {
                return;
            }
            this.contentId = id;
            var self = this;
            return request(core.serviceURL("Quippe/NoteBuilder/DocumentTemplate"), {
                query: { "id": id, "Culture": core.settings.culture, "PatientId": (core.Patient ? core.Patient.id : '') },
                handleAs: "xml",
                preventCache: true
            }).then(function (data) {
                return self.loadContentFromXML(data);
            }, function (err) {
                core.showError(err)
            });
        },

        loadContentFromXML: function (xml) {
            var self = this;
            var xDoc = this.ensureFormContent(xml);
            var xRoot = xDoc.documentElement;

            var settings = XmlUtil.attributesToObject(xRoot);
            array.forEach(['title', 'width', 'height', 'finalizeBehavior'], function (name) {
                if (settings[name]) {
                    self.set(name, settings[name]);
                }
            });

            

            return when(Note.parseXml(xDoc), function (note) {
                if (note) {
                    self.clear();
                    domClass.add(note.domNode, 'nameContainer');
                    note.placeAt(self.viewPort);
                    topic.publish('/qc/ContentLoaded');
                    self.note = note;
                    self.synchHostToForm();
                    note.updateDisplay();
                };
            });
        },

        ensureFormContent: function(xml) {
            var xDoc = typeof xml == 'string' ? XmlUtil.createDocument(xml) : xml;
            var xRoot = xDoc.documentElement;
            if (!xRoot) {
                return null;
            };

            switch (xRoot.tagName.toLowerCase()) {
                case 'form':
                    break;
                case 'document':
                    xDoc = XmlUtil.createDocument('<Form>' + xDoc.documentElement.innerHTML + '</Form>');
                    xRoot = xDoc.documentElement;
                    break;
                case 'content':
                    xDoc = XmlUtil.createDocument('<Form>' + xDoc.documentElement.innerHTML + '</Form>');
                    xRoot = xDoc.documentElement;
                    break;
                default:
                    var writer = new XmlWriter();
                    writer.beginElement('Form');
                    writer.copyElement(xRoot);
                    writer.endElement();
                    xDoc = XmlUtil.createDocument(writer.toString());
                    xRoot = xDoc.documentElement;
                    break;
            };

            if (!xRoot.getAttribute('width')) {
                xRoot.setAttribute('width', 500);
            };
            if (!xRoot.getAttribute('height')) {
                xRoot.setAttribute('height', 300);
            };
            if (!xRoot.getAttribute('finalizeBehavior')) {
                xRoot.setAttribute('finalizeBehavior', 'addEntries');
            };
            return xDoc;
        },

        clear: function () {
            if (this.note) {
                this.note.deleteSelf();
            };
        },

        onExecute: function () {
            switch (this.finalizeBehavior) {
                case "addEntries":
                    this.synchFormToHost();
                    break;
            };
            this.inherited(arguments);
        },


        synchHostToForm: function () {
            var formNote = this.note;
            var hostNote = this.hostEditor ? this.hostEditor.note : null;
            if (!formNote || !hostNote) {
                return;
            };
            var className = 'lst' + core.createClassName(this.contentId);
            query('.' + className, hostNote.domNode).map(registry.byNode).forEach(function (hostWidget) {
                if (hostWidget.formSource) {
                    var formWidget = formNote.getElementByName(hostWidget.formSource);
                    if (formWidget) {
                        formWidget.mergeFinding(hostWidget, true);
                    };
                };
            });
        },

        synchFormToHost: function () {
            var hostEditor = this.hostEditor;
            var formNote = this.note;
            var hostNote = hostEditor ? hostEditor.note : null;
            if (!formNote || !hostNote) {
                return;
            };
            var className = 'lst' + core.createClassName(this.contentId);
            var formWidgets = query('.finding', formNote.domNode).map(registry.byNode).filter(function (x) { return x.name && x.get('result') ? true : false }).sort(function (a, b) { return StringUtil.compare(a.name, b.name) });
            var hostWidgets = query('.' + className, hostNote.domNode).map(registry.byNode).sort(function (a, b) { return StringUtil.compare(a.formSource, b.formSource) });
            var f = 0, fLen = formWidgets.length;
            var h = 0, hLen = hostWidgets.length;

            var addFromForm = function (x) {
                var finding = formWidgets[x].toFinding();
                finding.type = 'term';
                when(hostEditor.addToNote(finding), function (targetFindingWidget) {
                    domClass.add(targetFindingWidget.domNode, className);
                    if (formWidgets[x].get('name')) {
                        targetFindingWidget.formSource = formWidgets[x].get('name');
                    };
                });
            };

            var removeFromHost = function (y) {
                var classes = ' ' + hostWidgets[y].domNode.getAttribute('class').replace(className, '');
                if (!classes.match('\slst')) {
                    hostWidgets[y].dropDelete();
                };
            };

            var mergeFromForm = function (x, y) {
                hostWidgets[y].mergeFinding(formWidgets[x], true);
            };

            var c = 0;
            while (f < fLen && h < hLen) {
                c = StringUtil.compare(formWidgets[f].name, hostWidgets[h].formSource);
                if (c < 0) {
                    addFromForm(f);
                    f++;
                }
                else if (c == 0) {
                    mergeFromForm(f, h);
                    f++;
                    h++;
                }
                else {
                    removeFromHost(h);
                    h++;
                }
            };
            while (f < fLen) {
                addFromForm(f);
                f++;
            };
            while (h < hLen) {
                removeFromHost(h);
                h++;
            };

        }
    });
});