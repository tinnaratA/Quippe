define([
    "dojo/_base/declare",
    "dijit/layout/BorderContainer",
    "qc/_core",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/query",
    "dijit/registry",
    "dojo/request",
    "dojo/topic",
    "dojo/when",
    "dojo/_base/window",
    "dijit/layout/TabContainer",
    "qc/NavBar",
    "qc/ReviewBar",
    "qc/NoteEditor",
    "dijit/layout/ContentPane",
    "qc/XmlWriter",
    "qc/HistoryNoteViewer",
    "qc/DocumentView",
    "qc/PrintPreview",
    "qc/_EnumManager",
    "qc/DateUtil",
	"dojo/aspect",
    "qc/PDFGen"
], function (declare, BorderContainer, core, array, dom, domClass, domStyle, domConstruct, lang, on, query, registry, request, topic, when, window, TabContainer, NavBar, ReviewBar, NoteEditor, ContentPane, XmlWriter, HistoryNoteViewer, DocumentView, PrintPreview, EnumManager, DateUtil, aspect, PDFGen) {
    return declare("qc.Workspace", [BorderContainer], {
        _historyDef: null,
        _lookbackKey: null,
        _historyTabs: [],
        _loadedHistoryKey: null,

        tabControl: null,
        tabs: {},
        previewControl: null,

        postCreate: function () {
            domClass.add(this.domNode, 'qcWorkspace');

            var topPane = new BorderContainer({ region: 'center' });
            domClass.add(topPane.domNode, 'topPane');
            this.addChild(topPane);

            this.tabControl = new TabContainer({ showTitle: true, tabStrip: true, tabPosition: 'bottom', region: 'center' });
            domClass.add(this.tabControl.domNode, 'tabControl');
            topPane.addChild(this.tabControl);

            this.navBar = new NavBar({ region: 'bottom' });
            topPane.addChild(this.navBar);

            this.reviewBar = new ReviewBar({ region: 'bottom', splitter: true });
            this.addChild(this.reviewBar);

            var editor = new NoteEditor({});

            var editorTab = new ContentPane({ title: core.getI18n("currentencounter"), content: editor });
            this.tabControl.addChild(editorTab);
            domClass.add(editorTab.domNode, 'qcNoteEditorTab');
            this.tabs["noteEditor"] = { tabPage: editorTab, rootControl: editor };
            editor.startup();
	        domClass.add(editorTab.domNode, "dijitVisible");

            aspect.after(this.tabControl, "selectChild", lang.hitch(this, this.onTabSelected), true);
            this._initSubscriptions();
        },


        _initSubscriptions: function () {
            topic.subscribe("/qc/NewEncounter", lang.hitch(this, this.newEncounter));
            topic.subscribe("/qc/OpenEncounter", lang.hitch(this, this.openEncounter));
            topic.subscribe("/qc/SaveEncounter", lang.hitch(this, this.saveEncounter));
            topic.subscribe("/qc/CloseNote", lang.hitch(this, this.closeNote));
            topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onNoteEditorSelectionChanged));
            topic.subscribe("/qc/Print", lang.hitch(this, this.onPrint));
            topic.subscribe("/qc/CreatePDF", lang.hitch(this, this.createPDF))
        },

        setPatient: function (id) {
            if (id == null) {
                return this.resetPatient();
            }

            return request(core.serviceURL("Quippe/PatientData/Patient"),{
                query: { "id": id, IncludeActiveFindings: true },
                preventCache: true,
                handleAs: "xml"
            }).then( function (data) {
                var xRoot = data.documentElement;
                core.Patient = {};
                core.Patient.id = xRoot.getAttribute("id");
                core.Patient.lastName = xRoot.getAttribute("LastName");
                core.Patient.firstName = xRoot.getAttribute("FirstName");
                core.Patient.sex = xRoot.getAttribute("Sex");
                var birthDateString = xRoot.getAttribute("BirthDate");
                if (birthDateString) {
                    core.Patient.birthDate = new Date(birthDateString);
                }
                core.Patient.ActiveItems = [];

                if (core.Patient.sex) {
                	core.Patient.sexLabel = EnumManager.getTextSynch('sex', core.Patient.sex);
                };

                if (core.Patient.birthDate && core.Encounter.encounterTime) {
                    var age = DateUtil.calculateAge(core.Patient.birthDate, core.Encounter.encounterTime);
                    if (age) {
                        core.Patient.ageInMinutes = age.totalMinutes;
                        core.Patient.ageLabel = age.label;
                        core.Patient.age = age;
                    }
                };

                core.Patient.fullName = core.Patient.lastName;
                if (core.Patient.firstName) {
                    core.Patient.fullName += ', ' + core.Patient.firstName;
                }

                window.doc.title = core.Patient.fullName;

                query("ActiveFindings", data).forEach(function (x1) {
                    query("Item", x1).forEach(function (xItem) {
                        var item = core.nodeToItem(xItem);
                        item.categoryId = xItem.getAttribute("CategoryId");
                        item.sequence = xItem.getAttribute("Sequence");
                        core.Patient.ActiveItems.push(item);
                    })
                });
                topic.publish("/qc/PatientChanged");
                return core.Patient;
            }, function(err) {
                core.showError(err)
            });
        },

        resetAll: function () {
            this.resetHistoryTabs();
            this.setEditorTabTitle();
            var tempSheet = dom.byId('DocumentStyleSheet');
            if (tempSheet) {
                domConstruct.destroy(tempSheet);
            }
            topic.publish("/qc/WorkspaceReset");
        },

        resetPatient: function () {
            core.Patient = null;
            window.doc.title = core.settings.appTitle;
            topic.publish("/qc/PatientChanged");
            return {};
        },

        openEncounter: function (settings) {
            this.resetAll();
            core.Encounter = settings.encounter;
            this.setPatient(settings.patientId);
            var editor = this.ensureEditor();
            editor.clear();

            var dateLabel = core.getI18n("currentencounter");
            if (core.Encounter.encounterTime) {
                if (Math.abs((new Date() - core.Encounter.encounterTime) / (24 * 60 * 60 * 1000)) > 1) {
                    if (core.settings.historyTabLabels == 'encdatetime') {
                        dateLabel = DateUtil.formatDate(core.Encounter.encounterTime) + ' ' + DateUtil.formatTime(core.Encounter.encounterTime);
                    }
                    else {
                        dateLabel = DateUtil.formatDate(core.Encounter.encounterTime);
                    }
                }
            };
            this.setEditorTabTitle(dateLabel);

            return request(core.serviceURL('Quippe/PatientData/Encounter'),{
                query: { EncounterId: core.Encounter.id },
                handleAs: 'xml',
                preventCache: true
            }).then(function (xmlData) {
                
                switch (xmlData.documentElement.tagName) {
                    case 'Error':
                        core.showError(xmlData.documentElement.getAttribute('Message'));
                        return false;

                    case 'Findings':
                        var templateId = xmlData.documentElement.getAttribute('TemplateId') || settings.noteTemplate || core.settings.defaultNoteTemplate;
                        return when(editor.loadDocumentTemplate(templateId), function () {
                            editor.mergeXmlFindings(xmlData.documentElement);
                            editor.setView('expanded', true);
                        });
                    default:
                        editor.loadXml(xmlData);
                        editor.setView('expanded', true);
                        return true;
                };

            }, function (err) { core.showError(err) });
        },

        newEncounter: function (settings) {
            var self = this;
            this.resetAll();
            core.Encounter = settings.encounter;
            return when(this.setPatient(settings.patientId), function () {
                return self.newNote(settings.noteTemplate);
            });
        },

        newNote: function (templateId) {
            var editor = this.ensureEditor();

            editor.clear();
	        editor.setView('expanded', true);

	        templateId = templateId || core.settings.defaultNoteTemplate || "";

	        this.tabControl.selectChild(this.tabs["noteEditor"].tabPage);

	        return request.get(core.serviceURL('Quippe/ContentLibrary/TemplateInfo'), {
	            query: { TemplateId: templateId, DataFormat: 'JSON' }, handleAs: 'json'
	        }).then(function (data) {
	            var templateInfo = data.item || { id: templateId };

	            return when(editor.loadDocumentTemplate(templateId), function () {
	                editor.note.templateId = templateInfo.id || '';
	                editor.note.templateName = templateInfo.text || '';
	                editor.note.transcribe();
	                if (templateInfo.text) {
	                    if (query('.finding', editor.note.domNode).some(function(x) {return !domClass.contains(x, 'freeText')})) {
	                        topic.publish("/noteEditor/listAdded", {
	                            id: 'lstDocumentTemplate',
	                            icon: 'document',
	                            text: templateInfo.text,
	                            listType: 'documentTemplate',
	                            className: 'lstDocumentTemplate',
                                canDelete: false
	                        });
	                    };
	                }
	            });
	        });
        },

        saveEncounter: function (finalize) {
            var editor = this.tabs["noteEditor"] ? this.tabs["noteEditor"].rootControl : null;
            if (!editor && editor.note) {
                return;
            };

            if (!(core.Patient && core.Encounter)) {
                return;
            };

            if (finalize && !editor.note.hasEntries()) {
                finalize = false;
            };

            if (finalize) {
                var self = this;
                return when(editor.note.finalizeNote(), function () {
                    editor.note.updateDisplay();
                    return self._saveEncounter(true, editor);
                });
            } else {
                return this._saveEncounter(false, editor);
            }

        },

        _saveEncounter: function(finalize, editor) {
            editor.ensureEntryIds();

            var writer = new XmlWriter();

            writer.parms = {
                documentType: 'note',
                mode: finalize ? 'document' : 'template',
                saveSources: false,
                encounterDocument: true,
                editor: editor
            };

            switch (core.settings.saveNoteSources) {
                case 'draft':
                    writer.parms.saveSources = finalize ? false : true;
                    break;
                case 'yes':
                    writer.parms.saveSources = true;
                    break;
                case 'no':
                default:
                    writer.parms.saveSources = false;
                    break;
            };

            writer.beginElement("Encounter");

            editor.note.writeNoteElement(writer, writer.parms.mode);

            writer.endElement();

            var data = writer.toString();

            return request.post(core.serviceURL('Quippe/PatientData/Encounter?DataFormat=JSON'), {
                data: {
                    EncounterId: core.Encounter.id || '',
                    PatientId: core.Patient.id,
                    EncounterTime: DateUtil.formatISODate(core.Encounter.encounterTime) || '',
                    EncounterCode: core.Encounter.code || '',
                    ProviderId: core.Provider ? core.Provider.id || '' : '',
                    SerializeFreeText: core.settings.serializeFreeText || 0,
                    Data: data
                },
                handleAs: "json"
            }).then(function (data, ioArgs) {
                if (data.error) {
                    core.showError(data.error.message);

                    topic.publish('/qc/EncounterSaveFailed', data.error.message);
                    return false;
                }
                else if (data.response && data.response.encounterId) {
                    core.Encounter.id = data.response.encounterId;
                    topic.publish('/qc/EncounterSaved');

                    return true;
                }

                topic.publish('/qc/EncounterSaved');
            }, function(err) {
                core.showError(err);
                topic.publish('/qc/EncounterSaveFailed', err);
            });

        },

        ensureEditor: function () {
            if (!this.tabs["noteEditor"]) {
                var editor = new NoteEditor({});
                editor.startup();
                var editorTab = new ContentPane({ title: core.getI18n("currentencounter"), content: editor });                
                this.tabControl.addChild(editorTab, 0);
                this.tabs["noteEditor"] = { tabPage: editorTab, rootControl: editor };
                domClass.add(editorTab.domNode, 'qcNoteEditorTab');
            }
            return this.tabs["noteEditor"].rootControl;
        },

        closeNote: function () {
            //TODO: Prompt to save
            if (this.tabs["noteEditor"]) {
                this.tabControl.removeChild(this.tabs["noteEditor"].tabPage);
                this.tabs["noteEditor"].rootControl.destroyRecursive();
                this.tabs["noteEditor"].tabPage.destroyRecursive();
                this.tabs["noteEditor"] = null;
            };
            this.resetAll();
        },

        openNote: function (noteId) {
            //TODO: 
            core.showError("Not implemented");
        },

        saveNote: function () {
            //TODO: 
            core.showError("Not implemented");
        },

        resize: function () {
            this.tabControl.resize();
            this.inherited(arguments);
        },

        resetHistoryTabs: function () {
            this.closeHistoryTabs();
            var tc = this.tabControl;
            array.forEach(this._historyTabs, function (tab) {
                tc.removeChild(tab);
                tab.destroyRecursive();
            });
            this._historyTabs = [];
        },

        closeHistoryTabs: function () {
            var tc = this.tabControl;
            var tabButton = null;
            this._loadedHistoryKey = '';
            array.forEach(this._historyTabs, function (tab) {
                tabButton = registry.byId(tc.id + '_tablist_' + tab.id);
                if (tabButton) {
                    domClass.add(tabButton.domNode, "hidden");
                };
            });
        },

        loadHistoryTabs: function (hKey, maxTabs) {
            if (!hKey) {
                return this.closeHistoryTabs();
            };

            //if (hKey == this._loadedHistoryKey) {
            //    return;
            //};

            var history = core.Patient.historyData || {};
            var entry = history[hKey].findingHistory;
            var list = entry ? core.forceArray(entry.finding) : [];
            var caption = "";
            var tc = this.tabControl;
            var hTabs = this._historyTabs;
            var tab = null;
            var tabIdPrefix = tc.id + '_tablist_';
            var histLen = list.length;
            var tabButton = null;
            var tabButtonNode = null;
            var item = null;
            var n = 0;
            var eTime = null;
            maxTabs = maxTabs || histLen;
            var limit = Math.min(histLen, maxTabs);

            for (n = 0; n < limit; n++) {
                item = list[n];
                eTime = DateUtil.toDate(item.encounterTime);
                switch (core.settings.historyTabLabels) {
                    case 'relative':
                        caption = DateUtil.getLookbackTimespan(eTime, core.Encounter.encounterTime) + ' ago';
                        break;
                    case 'age':
                        var age = DateUtil.calculateAge(core.Patient.birthDate, eTime);
                        caption = age ? age.label + ' old' : DateUtil.formatDate(eTime);
                        break;
                    case 'encdate':
                        caption = DateUtil.formatDate(eTime);
                        break;
                    case 'enctime':
                        caption = DateUtil.formatTime(eTime);
                        break;
                    case 'encdatetime':
                        caption = DateUtil.formatDate(eTime) + ' ' + DateUtil.formatTime(eTime);
                        break;
                    default:
                        caption = DateUtil.formatDate(eTime);
                        break;
                };

                //if (core.settings.historyTabLabels == 'relative' && core.Encounter.encounterTime) {
                //    caption = DateUtil.getLookbackTimespan(item.encounterTime, core.Encounter.encounterTime, item.value) || DateUtil.formatJSONDate(item.encounterTime);
                //}
                //else {
                //    caption = DateUtil.formatJSONDate(item.encounterTime);
                //};

                if (item.value) {
                    caption += ': ';
                    caption += item.value;
                    caption += (item.unit ? ' ' + item.unit : '');
                }

                tab = this.getHistoryTab(n);
                tab.set("title", caption || 'NO CAPTION');
                if (tab.encounterId != item.encounterId) {
                    tab.encounterId = item.encounterId;
                    tab.encounterTime = DateUtil.dateFromJSON(item.encounterTime);
                    tab.historyLoaded = false;
                    domConstruct.empty(tab.domNode);
                    tab.historyState = 2;
                }
                else if (tab.historyState != 3) {
                    tab.historyState = 2;
                }

                tabButton = registry.byId(tabIdPrefix + tab.id);
                domClass.remove(tabButton.domNode, ["pos", "neg", "hidden", "moreData"]);
                domClass.add(tabButton.domNode, (item.result == 'X' ? '' : item.result == 'N' ? 'neg' : 'pos'));
                tabButtonNode = dom.byId(tabIdPrefix + hTabs[n].id);
                domClass.remove(tabButtonNode, "hidden");
                if (hKey != this._lookbackKey) {
                    return;
                };
            };

            if (entry.partial || (maxTabs < histLen)) {
                tab = this.getHistoryTab(n);
                tab.set("title", core.getI18n("more") + "...");
                tab.historyState = 4;
                tab.hKey = hKey;
                tabButton = registry.byId(tabIdPrefix + tab.id);
                domClass.remove(tabButton.domNode, ["pos", "neg", "hidden", "moreData"]);
                domClass.add(tabButton.domNode, "moreData");
                n += 1;
            };

            while (n < hTabs.length) {
                tabButtonNode = dom.byId(tabIdPrefix + hTabs[n].id);
                domClass.add(tabButtonNode, "hidden");
                hTabs[n].historyState = 5;
                n += 1;
            };

            this._loadedHistoryKey = hKey;
        },

        getHistoryTab: function (index) {
            if (!this._historyTabs) {
                this._historyTabs = [];
            };

            var tab = null;
            if (index >= this._historyTabs.length) {
                tab = new ContentPane({ title: '...', content: '<div/>' });
                domStyle.set(tab.domNode, { padding: '8px 0px 8px 8px' });
                tab.startup();
                tab.historyState = 1;
                this.tabControl.addChild(tab, index + 1);
                this._historyTabs.push(tab);
            }
            else {
                tab = this._historyTabs[index];
            };
            tab.hKey = null;
            return tab;
        },

        getEncounterNoteType: function (encounterId) {
            if (!encounterId && encounterId != 0) {
                return null;
            };

            return request.get(core.serviceURL('Quippe/PatientData/Patient/History/NoteType'), {
                query: { EncounterId: encounterId, DataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                return data.encounter ? data.encounter.contentType || 'none' : 'none';
            }, function (err) {
                core.showError(err)
            });
        },

        loadPastEncounter: function (tab) {
            if (tab.historyState != 2 || tab.historyLoaded) {
                return;
            }

            tab.historyLoaded = true;
            // var url = core.serviceURL("Quippe/PatientData/Patient/History/Note") + ("?EncounterId=" + tab.encounterId)
            when(this.getEncounterNoteType(tab.encounterId), function (noteType) {
                switch (noteType || 'none') {
                    case 'application/vnd.medicomp.quippe.note+xml':
                    case 'Document.Note':
                        var noteView = new HistoryNoteViewer();
                        domConstruct.place(noteView.domNode, tab.domNode, "first");
                        noteView.startup();
                        noteView.loadEncounter(tab.encounterId, tab.encounterTime);
                        //request.get(core.serviceURL("Quippe/PatientData/Patient/History/Note"),{
                        //    query: { EncounterId: tab.encounterId },
                        //    handleAs: 'xml'
                        //}).then(function (data) {
                        //    noteView.loadXml(data)
                        //}, function (err) {
                        //    core.showError(err);
                        //});
                        break;
                    default:
                        var url = core.serviceURL("Quippe/PatientData/Patient/History/Note") + ("?EncounterId=" + tab.encounterId)
                        var docView = new DocumentView();
                        domConstruct.place(docView.domNode, tab.domNode, "first");
                        docView.show(url);
                        break;
                };
            });

        },



        checkForLookback: function (medcinId, prefix, fullHistory) {
            var self = this;
            var hKey = medcinId + (prefix || '');

            if (hKey != this._lookbackKey) {
                return null;
            };

            if (core.Patient.historyData && core.Patient.historyData[hKey]) {
                if (core.Patient.historyData[hKey].findingHistory.partial) {
                    if (!fullHistory) {
                        return hKey;
                    }
                }
                else {
                    return hKey;
                }
            };

            if (self._historyDef) {
                self._historyDef.cancel();
            };

            var max = fullHistory ? -1 : 5;

            self._historyDef = request.get(core.serviceURL('Quippe/PatientData/Patient/FindingHistory'),{
                query: { "PatientId": core.Patient.id, "MedcinId": medcinId, "Prefix": (prefix || ''), "StartDate": DateUtil.formatISODate(core.Encounter.encounterTime), "DataFormat": "JSON", MaxRecords: max },
                handleAs: "json"
            }).then(function(data){
                if (!core.Patient.historyData) {
                    core.Patient.historyData = {};
                }
                core.Patient.historyData[hKey] = data;
                if (hKey == self._lookbackKey) {
                    return hKey;
                }
                else {
                    return null;
                }
            });

            return self._historyDef;

        },

        onNoteEditorSelectionChanged: function () {
            if (this.selectionTimer) {
                clearTimeout(this.selectionTimer);
                this.selectionTimer = null;
            };
            this.selectionTimer = setTimeout(lang.hitch(this, this._onNoteEditorSelectionChanged), 50);
        },

        _onNoteEditorSelectionChanged: function () {
            if (this._historyDef) {
                this._historyDef.cancel();
            };

            this.closeHistoryTabs();
            this._lookbackKey = '';

            if (!(core.Patient && core.Patient.id)) {
                return;
            };

            var editor = this.ensureEditor();
            if (!editor) {
                return;
            };

            var medcinId = 0;
            var prefix = '';

            var widget = editor.selection.getSelectedWidgets()[0] || null;
            if (widget) {
                if (widget.get('medcinId')) {
                    if (widget.get('hasHistory')) {
                        medcinId = widget.get('medcinId');
                        prefix = widget.getOriginalPrefix ? widget.getOriginalPrefix() : widget.get('prefix') || '';
                    }
                }
            }
            else {
                if (core.settings.showDocumentLookback) {
                    medcinId = -1;
                    prefix = '';
                }
            };


            if (medcinId != 0) {
                var hKey = medcinId + prefix;
                if (hKey == this._lookbackKey || hKey == this._loadedHistoryKey) {
                    return;
                };

                var self = this;
                this._lookbackKey = hKey;
                when(this.checkForLookback(medcinId, prefix, false), function (x) { self.loadHistoryTabs(x, 5) });
            };

        },

        onTabSelected: function (tab) {
            if (tab.historyState == 4 && tab.hKey) {
                var tab0 = this.tabControl.getChildren()[0];
                this.tabControl.selectChild(tab0);
                var tabButton = registry.byId(this.tabControl.id + '_tablist_' + tab.id);
                tab.set("title", core.getI18n("loading") + "...");
                var data = core.Patient.historyData[tab.hKey];
                var medcinId = data.findingHistory.medcinId;
                var prefix = data.findingHistory.prefix || '';
                var self = this;
                when(this.checkForLookback(medcinId, prefix, true), function (x) {
                    domClass.add(tabButton.domNode, "hidden");
                    self.loadHistoryTabs(x)
                });
            }
            else if (tab.historyState == 2) {
                this.loadPastEncounter(tab);
            };
        },

        getDropAction: function (source, evt) {
            switch (source.type || 'unknown') {
                case "list":
                case "term":
                    return 'add';
                default:
                    return null;
            }
        },

        doDrop: function (source, evt) {
            switch (source.type || 'unknown') {
                case "list":
                case "term":
                    topic.publish("/qc/AddToNote", source);
                    break;

                default:
                    return false;
            }
        },

        onPrint: function () {
            var tab = this.tabControl.selectedChildWidget;
            if (!tab) {
                return;
            };

            var contents = tab.domNode.firstChild;
            if (!contents) {
                return;
            };

            var widget = registry.byNode(contents);
            if (!widget) {
                return;
            };

            if (typeof widget.print == "function") {
                return widget.print();
            };
            
            if (!this.previewControl) {
                this.previewControl = new PrintPreview();
                domConstruct.place(this.previewControl.domNode, window.doc.body);
            };

            var settings = widget.getPrintSettings ? widget.getPrintSettings() : null;

            return this.previewControl.showWidget(widget, settings);
        },

        createPDF: function () {
            var tab = this.tabControl.selectedChildWidget;
            if (!tab) {
                return;
            };

            var contents = tab.domNode.firstChild;
            if (!contents) {
                return;
            };

            var widget = registry.byNode(contents);
            if (!widget) {
                return;
            };

            var pdfGen = new PDFGen();
            pdfGen.execute(widget);
        },

        setEditorTabTitle: function (title) {
            title = title || core.getI18n('currentencounter');
            if (this.tabs && this.tabs["noteEditor"]) {
                this.tabs["noteEditor"].tabPage.set('title', title);
            };
        }

    });
});




