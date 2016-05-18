define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/event",
    "dojo/_base/fx",
    "dojo/_base/kernel",
    "dojo/_base/lang",
    "dojo/i18n",
    "dojo/aspect",
    "dojo/date/locale",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/fx",
    "dojo/io-query",
    "dojo/on",
    "dojo/promise/all",
    "dojo/query",
    "dojo/request",
    "dojo/store/Memory",
    "dojo/text!ClinicalLens/templates/Application.htm",
    "dojo/topic",
    "dojo/when",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/HorizontalSlider",
    "dijit/layout/ContentPane",
    "dijit/MenuSeparator",
    "dijit/registry",
    "dijit/TitlePane",
    "ClinicalLens/OpenPatientDialog",
    "ClinicalLens/Flowsheet",
    "qc/DateUtil",
    "qc/design/LayoutBuilder",
    "qc/design/ToolbarBuilder",
    "qc/ListView",
    "qc/ListViewItem",
    "qc/MenuItem",
    "qc/NewEncounterDialog2",
    "qc/_core",
    "qc/_EnumManager",
    "qc/coding/CodingManager",
    "qc/CollapsibleSplitter",
    "qc/ContextMenu",
    "qc/FilteringSelect",
    "qc/flowsheet/HistoryPool",
    "qc/HistoryNoteViewer",
    "qc/NoteEditor",
    "qc/PatientEditorDialog",
    "qc/SearchBox",
    "qc/SearchResultTree",
    "qc/StringUtil",
    "qc/TimingTranscriber",
    "qc/Transcriber",
    "qc/UserSettingsDialog",
    "qc/Workspace",
    "qc/XmlUtil",
    "qc/XmlWriter",
    "Quippe/Application",
    "dojo/text!ClinicalLens/templates/XmlFormatter.xslt"
], function (declare, array, event, baseFx, kernel, lang, i18n, aspect, dateLocale, domAttr, domClass, domConstruct, domGeometry, domStyle, fx, ioQuery, on, all, query, request, Memory, ApplicationTemplate, topic, when, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, HorizontalSlider, ContentPane, MenuSeparator, registry, TitlePane, OpenPatientDialog, Flowsheet, DateUtil, LayoutBuilder, ToolbarBuilder, ListView, ListViewItem, MenuItem, NewEncounterDialog2, core, EnumManager, CodingManager, CollapsibleSplitter, ContextMenu, FilteringSelect, HistoryPool, HistoryNoteViewer, NoteEditor, PatientEditorDialog, SearchBox, SearchResultTree, StringUtil, TimingTranscriber, Transcriber, UserSettingsDialog, Workspace, XmlUtil, XmlWriter, Application, XmlFormatterTransform) {
    window.CollapsibleSplitter = CollapsibleSplitter;
    window.BlankFunction = function() {
    };

    if (core.util.isIOS()) {
        var ipadCss = domConstruct.create('link', {
            type: 'text/css',
            href: 'libs/ClinicalLens/themes/iPad.css'
        });

        domAttr.set(ipadCss, 'rel', 'stylesheet');
        query('head').append(ipadCss);
    }

    var originalLoadXML = HistoryNoteViewer.prototype.loadXML;
    var originalSetPatient = Workspace.prototype.setPatient;
    var defaultNoteTemplate = 'shared:QUIPPESTANDARD';
    var entries;

    lang.extend(NewEncounterDialog2, {
        loadPatients: function () {
            this.selectedPatientId = core.Patient.id;
        }
    });

    lang.extend(HistoryNoteViewer, {
        loadXML: function (encounterXml) {
            if (encounterXml.documentElement.nodeName != 'ImportedChartEncounter') {
                return originalLoadXML.apply(this, arguments);
            }

            var noteEditor = new NoteEditor();
            var self = this;

            return noteEditor.loadDocumentTemplate(defaultNoteTemplate).then(function () {
                array.forEach(entries, function (item) {
                    if (item.encounterId == self.encounterId) {
                        var target = noteEditor.getGroup(item);
                        var itemClass = target.get('itemEntryClass') ?
                            require(target.get('itemEntryClass')) :
                            core.settings.noteElementClasses['qc/note/FindingLabel'];
                        var finding = new itemClass(item);

                        finding.set('result', item.resultCode);
                        target.addElement(finding, null, null, true);
                    }
                });

                noteEditor.transcribe();
                noteEditor.updateDisplay();

                var writer = new XmlWriter();
                noteEditor.note.writeNoteElement(writer, 'template');

                return originalLoadXML.call(self, XmlUtil.createDocument(writer.toString()));
            });
        }
    });

    lang.extend(Workspace, {
        setPatient: function(patientId) {
            if (patientId == core.Patient.id) {
                return;
            }

            return originalSetPatient.apply(this, arguments);
        }
    });

    var typeDef = declare('ClinicalLens.Application', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: ApplicationTemplate,

        xmlDocument: null,
        xsltXmlFormatter: null,
        fieldSets: {},
        promptsCompleted: {},
        dashboardColumns: 4,
        findingCategoryPanes: {},
        findingCategories: [],
        encounters: {},
        noteStarted: false,
        medicationsRootNodeKey: null,
        imagingStudiesRootNodeKey: null,

        startup: function () {
            if (!this._started) {
                this.inherited(arguments);

                this.initLayout();

                this.xsltXmlFormatter = XmlUtil.createDocument(XmlFormatterTransform);

                this.contextMenu = new ContextMenu();
                this.contextMenu.startup();

                this.previouslySelectedTab = this.mostRecentPane;

                request.get(core.serviceURL('Medcin/Term/75135'), {
                    query: {
                        DataFormat: 'JSON'
                    },
                    handleAs: 'json'
                }).then(lang.hitch(this, function(data) {
                    this.medicationsRootNodeKey = '-' + data.term.nodekey.replace(/ /gi, '-');
                }));

                request.get(core.serviceURL('Medcin/Term/24890'), {
                    query: {
                        DataFormat: 'JSON'
                    },
                    handleAs: 'json'
                }).then(lang.hitch(this, function (data) {
                    this.imagingStudiesRootNodeKey = '-' + data.term.nodekey.replace(/ /gi, '-');
                }));
            }
        },

        init: function () {
            core.clinicalLensApp = this;

            this.initSubscriptions();

            return when(this._loadAppSettings(), lang.hitch(this, function (settings) {
                this._initSettings(settings);

                if (core.settings.showContextMenuButtonInToolbar || core.util.isIOS()) {
                    domStyle.set(this.actionsMenuButton.domNode, 'display', '');
                }
            })).then(function () {
                return EnumManager.loadLists(['sex', 'prefix', 'modifier', 'status', 'result'], null, 'lower', function (listName, item) {
                    var capitalization = listName == 'sex' ? 'title' : 'lower';
                    return {
                        code: item.code,
                        description: item.description ? StringUtil.capitalize(item.description, capitalization) : item.code,
                        flags: item.flags || 0
                    };
                });
            }).then(lang.hitch(this, this._getUserRoles));
        },

        _getUserRoles: function() {
            return request.get(core.serviceURL('Quippe/UserSettings/Roles'), {
                query: {
                    DataFormat: 'JSON'
                },
                handleAs: 'json'
            }).then(function (data) {
                core.settings.userRoles = data.roles;
                return core.settings.userRoles;
            }, function () {
                core.settings.userRoles =[];
                return core.settings.userRoles;
            });
        },

        _getUserSettings: function () {
            return request(core.serviceURL('Quippe/UserSettings'), {
                query: {
                    DataFormat: 'JSON'
                },
                handleAs: 'json',
                preventCache: true
            }).then(function(data) {
                var settings = data.settings || {};

                if (data.settings && data.settings.defaultNoteTemplate) { 
                    defaultNoteTemplate = data.settings.defaultNoteTemplate;
                }

                return settings;
            }, function() {
                return {};
            });
        },

        _getServices: function () {
            return request(core.serviceURL('Quippe/ServiceInfo/Services'), {
                query: {
                    DataFormat: 'JSON'
                },
                handleAs: 'json'
            }).then(function (data) {
                var list = [];

                array.forEach(core.forceArray(data.services), function (s) {
                    list.push(s.contract);
                });

                return list;
            }, function() {
                return [];
            });
        },

        _loadAppSettings: function (baseSettings) {
            var self = this;
            var settings = baseSettings || {};

            return when(self._getUserSettings(), function (userSettings) {
                for (var p in userSettings) {
                    if (!settings[p]) {
                        settings[p] = userSettings[p];
                    }
                }

                return when(self._getServices(), function (services) {
                    settings.services = services;
                    return settings;
                });
            });
        },

        _initSettings: function (settings) {
            var userSettings = settings || {};

            core.settings.culture = kernel.locale.length == 5 ? kernel.locale.substr(0, 3) + kernel.locale.substr(3, 2).toUpperCase() : userSettings.culture || 'en-US';

            userSettings.defaultDateFormat = userSettings.defaultDateFormat || DateUtil.getSystemDateFormat() || (core.settings.culture == "en-US" ? "MM/dd/yyyy": "dd/MM/yyyy");
			userSettings.defaultTimeFormat = userSettings.defaultTimeFormat || DateUtil.getSystemTimeFormat() || (core.settings.culture == "en-US" ? "hh:mm a": "HH:mm");
			i18n.cache["quippe/nls/gregorian/" + core.settings.culture.toLowerCase()] = {
			    "dateFormat-user": userSettings.defaultDateFormat,
			    "timeFormat-user": userSettings.defaultTimeFormat,
			    "dateTimeFormat-user": "{1}, {0}",
			    "dateFormat-yyyyMMdd": dateLocale._getGregorianBundle(core.settings.culture.toLowerCase())['dateFormatItem-yMd'].replace(/[M]+/, 'MM').replace(/[d]+/, 'dd').replace(/[y]+/, 'yyyy')
            };
			dateLocale.addCustomFormats("quippe", "gregorian");

            core.settings.listSize = userSettings.defaultListSize || 2;
            core.settings.dictationStyle = 2;
            core.settings.defaultNoteTemplate = userSettings.defaultNoteTemplate || core.settings.defaultNoteTemplate;

            core.settings.features.drawing = core.util.supportsCanvas();
            core.settings.features.touchPad = core.settings.features.drawing && core.util.isTouchDevice();
            core.settings.features.simulateTouchPad = userSettings.simulateTouchPad || false;
            core.settings.selectBeforeDrag = userSettings.selectBeforeDrag || core.util.isIOS();

            for (var p in userSettings) {
                core.settings[p] = userSettings[p];
            };

            //TODO: Check server licensing for features
            core.settings.features.Nursing = true;
            core.settings.features.EM = true;
            core.settings.features.Flowsheet = true;
            core.settings.features.Coding = core.settings.codingServiceEnabled || false;

            // DojoConvertIgnore
            if (array.indexOf(settings.services, 'Quippe.IPatientHistoryService') < 0) {
                core.settings.features.Flowsheet = false;
            };

            // DojoConvertIgnore
            if (array.indexOf(settings.services, 'Quippe.IPhraseEditorService') < 0) {
                core.settings.phrasingAllowEdit = false;
            };

            // DojoConvertIgnore
            if (core.settings.features.Coding && array.indexOf(settings.services, 'Quippe.Coding.ICodeMappingService') >= 0) {
                require(["qc/coding/CodingManager"], function (CodingManager) {
                    CodingManager.startup();
                });
            }
            else {
                core.settings.features.Coding = false;
            };

            if (array.indexOf(settings.services, 'Quippe.IPDFService') < 0) {
                core.settings.printingUsePDF = false;
            };

            if (core.settings.enableQualityMeasureReview && array.indexOf(settings.services, 'Quippe.Coding.Cqm.ICqmService') < 0) {
                core.settings.enableQualityMeasureReview = false;
            };

            if (this.pageSettings) {
                for (var p in this.pageSettings) {
                    core.settings[p] = this.pageSettings[p];
                };
            };
        },

        addFindingCategory: function (categoryTitle) {
            this.findingCategories.push(categoryTitle);

            var entireChartPane = new TitlePane({
                title: categoryTitle,
                toggleable: true
            });

            var mostRecentPane = new TitlePane({
                title: categoryTitle == 'Problems' ? 'Active Problems' : categoryTitle,
                toggleable: true
            });

            this.findingCategoryPanes[categoryTitle] = {
                entireChart: entireChartPane,
                mostRecent: mostRecentPane
            };

            if (!this.entireChartTable.rows || this.entireChartTable.rows.length == 0) {
                this.entireChartTable.insertRow();
            }

            var targetRow = this.entireChartTable.rows[this.entireChartTable.rows.length - 1];

            if (targetRow.cells.length == this.dashboardColumns) {
                targetRow = this.entireChartTable.insertRow();
            }

            var targetCell = targetRow.insertCell();
            entireChartPane.placeAt(targetCell);

            if (!core.settings.persistChartOnImport) {
                var selectEntriesIcon = domConstruct.create('div', {
                    className: 'checkboxListIcon'
                }, entireChartPane.focusNode);

                var selectAllEntriesCheckbox = domConstruct.create('div', {
                    className: 'selectAllEntriesCheckbox'
                }, entireChartPane.focusNode);

                domStyle.set(selectEntriesIcon, 'display', 'none');

                var chartPaneClickHandle;

                on(selectEntriesIcon, 'click', function(evt) {
                    event.stop(evt);
                    domClass.toggle(entireChartPane.domNode, 'selectMode');

                    if (domClass.contains(entireChartPane.domNode, 'selectMode')) {
                        chartPaneClickHandle = on(entireChartPane.domNode, 'click', function(evt) {
                            if (domClass.contains(evt.target, 'codedFinding')) {
                                domClass.toggle(evt.target, 'selected');

                                if (query('.codedFinding.selected', entireChartPane.domNode).length == 0) {
                                    domClass.remove(selectAllEntriesCheckbox, 'selected');
                                    domClass.remove(selectAllEntriesCheckbox, 'partiallySelected');
                                }

                                else if (query('.codedFinding:not(.selected)', entireChartPane.domNode).length == 0) {
                                    domClass.add(selectAllEntriesCheckbox, 'selected');
                                    domClass.remove(selectAllEntriesCheckbox, 'partiallySelected');
                                }

                                else {
                                    domClass.remove(selectAllEntriesCheckbox, 'selected');
                                    domClass.add(selectAllEntriesCheckbox, 'partiallySelected');
                                }
                            }
                        });
                    }

                    else {
                        core.disconnect(chartPaneClickHandle);
                    }
                });

                on(selectAllEntriesCheckbox, 'click', function(evt) {
                    event.stop(evt);
                    
                    if (domClass.contains(selectAllEntriesCheckbox, 'selected') || domClass.contains(selectAllEntriesCheckbox, 'partiallySelected')) {
                        query('.codedFinding.selected', entireChartPane.domNode).removeClass('selected');
                        domClass.remove(selectAllEntriesCheckbox, 'selected');
                        domClass.remove(selectAllEntriesCheckbox, 'partiallySelected');
                    }

                    else {
                        query('.codedFinding', entireChartPane.domNode).addClass('selected');
                        domClass.add(selectAllEntriesCheckbox, 'selected');
                    }
                });
            }

            if (!this.mostRecentTable.rows || this.mostRecentTable.rows.length == 0) {
                this.mostRecentTable.insertRow();
            }

            targetRow = this.mostRecentTable.rows[this.mostRecentTable.rows.length - 1];

            if (targetRow.cells.length == this.dashboardColumns) {
                targetRow = this.mostRecentTable.insertRow();
            }

            targetCell = targetRow.insertCell();
            mostRecentPane.placeAt(targetCell);

            return this.findingCategoryPanes[categoryTitle];
        },

        addFindingCategories: function() {
            this.addFindingCategory('Problems');
            this.addFindingCategory('Medications');
            this.addFindingCategory('Lab & Imaging Results');
            this.addFindingCategory('Procedures & Therapies');
            this.addFindingCategory('Orders');
            this.addFindingCategory('History');
            this.addFindingCategory('ROS & Exam');

            var unmappedFindingsCategoryPanes = this.addFindingCategory('Unmapped Findings');

            domStyle.set(unmappedFindingsCategoryPanes.entireChart.domNode, 'display', 'none');
            domStyle.set(unmappedFindingsCategoryPanes.mostRecent.domNode, 'display', 'none');
        },

        setFindingCategoryHeight: function() {
            core.forEachProperty(this.findingCategoryPanes, lang.hitch(this, function (categoryName, categoryPanes) {
                var titlePaneHeight = domGeometry.getContentBox(categoryPanes.mostRecent.domNode.parentNode).h - domGeometry.getContentBox(categoryPanes.mostRecent.titleBarNode).h - 30;

                domStyle.set(categoryPanes.mostRecent.containerNode, 'height', (titlePaneHeight + 20) + 'px');
                domStyle.set(categoryPanes.entireChart.containerNode, 'height', (titlePaneHeight + 20) + 'px');
            }));
        },

        getFindingCategory: function(finding) {
            if (finding.medcinId == 0) {
                return 'Unmapped Findings';
            }

            else if (finding.termType == 7 && finding.nodeKey.substring(0, this.medicationsRootNodeKey.length) == this.medicationsRootNodeKey) {
                return 'Medications';
            }

            else if (finding.prefix == 'O') {
                return 'Orders';
            }

            else if (finding.termType == 3 && !finding.prefix) {
                return 'Lab & Imaging Results';
            }

            else if (finding.termType == 6 && !finding.prefix) {
                return 'Problems';
            }
            else if (finding.prefix == 'H' || finding.prefix == 'F' || finding.prefix == 'F0' || finding.prefix == 'F1' || finding.prefix == 'F2' || finding.prefix == 'F3' || finding.prefix == 'F4' || finding.prefix == 'F5' || finding.prefix == 'F6' || finding.prefix == 'F7' || finding.prefix == 'F8' || finding.prefix == 'F9' || finding.prefix == 'FJ' || finding.prefix == 'FK' || finding.prefix == 'FL' || finding.prefix == 'FM' || finding.prefix == 'FC' || finding.prefix == 'FB' || finding.termType == 5) {
                return 'History';
            }

            else if (finding.prefix == 'PD' || finding.termType == 7) {
                return 'Procedures & Therapies';
            }

            else if (finding.termType == 1 || finding.termType == 2) {
                return 'ROS & Exam';
            }

            else {
                return 'Unmapped Findings';
            }
        },

        onFocusListSizeSliderChange: function() {
            var selectedActiveProblems = this.activeProblemsListView.getSelectedItems();

            if (selectedActiveProblems.length > 0) {
                this.onDiagnosisSelectionChanged(this.activeProblemsListView, true);
            }

            var selectedScreenings = this.screeningListView.getSelectedItems();

            if (selectedScreenings.length > 0) {
                this.onDiagnosisSelectionChanged(this.screeningListView, true);
            }

            array.forEach(this.activeProblemsListView.getChildren(), lang.hitch(this, function (child) {
                if (domClass.contains(child.domNode, 'listShow')) {
                    this.onDiagnosisDoubleClicked(child, true);
                }
            }));

            array.forEach(this.screeningListView.getChildren(), lang.hitch(this, function (child) {
                if (domClass.contains(child.domNode, 'listShow')) {
                    this.onDiagnosisDoubleClicked(child, true);
                }
            }));
        },

        initLayout: function () {
            if (core.util.isTouchDevice()) {
                domClass.add(this.domNode, 'tablet');
            }

            else {
                domClass.add(document.body, 'supportsHover');
            }

            var queryStringValues = document.location.search ? ioQuery.queryToObject(document.location.search.substring(1)) : {};

            if (!queryStringValues.ShowXML) {
                this.chartTabs.removeChild(this.rawPane);
            }

            domStyle.set(this.patientPanel, 'display', 'none');

            this.addFindingCategories();
            this.setFindingCategoryHeight();

            domStyle.set(this.chartTabs.tablist.pane2button(this.warningsPane.id).domNode, 'display', 'none');

            this.encountersStore = new Memory({
                data: [
                {
                    id: '',
                    name: ''
                }]
            });

            this.encountersSelect.store = this.encountersStore;

            aspect.after(this.activeProblemsListView, 'onSelectionChanged', lang.hitch(this, function () {
                query('.qcListViewItem', this.screeningListView.domNode).removeClass('selected');
                this.onDiagnosisSelectionChanged(this.activeProblemsListView);
            }), true);

            aspect.after(this.activeProblemsListView, 'onItemDoubleClick', lang.hitch(this, this.onDiagnosisDoubleClicked), true);

            this.addScreeningsSearchBox();

            this.screeningPane.getContextActions = lang.hitch(this, this.getDiagnosisContextActions);
            this.activeProblemsPane.getContextActions = lang.hitch(this, this.getDiagnosisContextActions);

            aspect.after(this.screeningListView, 'onSelectionChanged', lang.hitch(this, function () {
                query('.qcListViewItem', this.activeProblemsListView.domNode).removeClass('selected');
                this.onDiagnosisSelectionChanged(this.screeningListView);
            }), true);

            aspect.after(this.screeningListView, 'onItemDoubleClick', lang.hitch(this, this.onDiagnosisDoubleClicked), true);

            aspect.after(this.specialtiesListView, 'onSelectionChanged', lang.hitch(this, this.onSpecialtySelectionChanged), true);
            aspect.after(this.specialtiesListView, 'onItemDoubleClick', lang.hitch(this, this.onSpecialtyDoubleClicked), true);

            request.get(core.serviceURL('Quippe/Enum/specialty'), {
                query: {
                    orderBy: 2,
                    dataFormat: 'JSON'
                },
                handleAs: 'json'
            }).then(lang.hitch(this, function (data) {
                var items = data['enum'] ? data['enum'].item : [];

                items.forEach(lang.hitch(this, function (item) {
                    if (/^[1456LM\*]$/.test(item.code)) {
                        return;
                    }

                    this.specialtiesListView.addItem({
                        id: item.code,
                        text: item.description,
                        test: function (finding) {
                            return finding && (finding.specialty || '').indexOf(item.code) >= 0;
                        },
                        showTest: function () {
                            if (query('.specialty' + item.code).length == 0) {
                                return false;
                            }

                            if (/^[FG]$/.test(item.code) && core.Patient.sex == 'M') {
                                return false;
                            }

                            if (item.code == '7' && DateUtil.calculateAge(core.Patient.birthDate, new Date()).years < 65) {
                                return false;
                            }

                            if (item.code == 'Y' && DateUtil.calculateAge(core.Patient.birthDate, new Date()).years > 21) {
                                return false;
                            }

                            return true;
                        }
                    });
                }));
            }));
        },

        initSubscriptions: function() {
            topic.subscribe('chartTabs-selectChild', lang.hitch(this, this.onChartTabsSelectChild));
            topic.subscribe('/ClinicalLens/OpenPatient', lang.hitch(this, this.openPatient));
            topic.subscribe('/qc/NewEncounter', lang.hitch(this, this.newEncounter));
        },

        newEncounter: function(settings) {
            core.HistoryPool.encounterTime = settings.encounter.encounterTime;
        },

        getContextActions: function () {
            return [];
        },

        addEntryToDashboard: function (entry) {
            var encounter = this.encounters[entry.encounterId];
            var findingElement = core.createFindingEntry(entry);

            if (entry.isFreeText) {
                findingElement.set('text', entry.notation);
            }

            findingElement.set('result', entry.resultCode);

            if (entry.category == 'Medications' || entry.category == 'Procedures & Therapies') {
                findingElement.set('prefix', '');
            }

            var categoryPanes = this.findingCategoryPanes[entry.category];

            if (!this.fieldSets[categoryPanes.entireChart]) {
                this.fieldSets[categoryPanes.entireChart] = {};
            }

            if (!this.fieldSets[categoryPanes.entireChart][encounter.id]) {
                this.fieldSets[categoryPanes.entireChart][encounter.id] = domConstruct.create('div', {
                    className: 'encounter' + encounter.id + ' encounterContainer groupContainer'
                }, categoryPanes.entireChart.containerNode);

                domConstruct.create('div', {
                    innerHTML: encounter.baseDate.getFullYear() == 1 ? "Unspecified Encounter" : DateUtil.formatDate(encounter.baseDate, {
                        selector: 'date',
                        formatLength: 'yyyyMMdd'
                    }),
                    className: 'dateHeader'
                }, this.fieldSets[categoryPanes.entireChart][encounter.id]);
            }

            this.addEntryToContainer(entry, findingElement, this.fieldSets[categoryPanes.entireChart][encounter.id], 'nodeKey');

            if (entry.category != 'Unmapped Findings') {
                var existingMostRecentFinding = query('.medcinId' + entry.medcinId, categoryPanes.mostRecent.containerNode);

                if (existingMostRecentFinding.length == 0 && (entry.category != 'Problems' || entry.isActiveProblem)) {
                    var mostRecentItem = this.addEntryToContainer(entry, findingElement, categoryPanes.mostRecent.containerNode, 'encounterTimeNodeKey');

                    if (encounter.baseDate.getFullYear() > 1) {
                        mostRecentItem.innerHTML += '<span class="entryDate">' + DateUtil.formatDate(encounter.baseDate, {
                            selector: 'date',
                            formatLength: 'yyyyMMdd'
                        }) + '</span>';
                    }
                }
            }

            else {
                domStyle.set(categoryPanes.entireChart.domNode, 'display', 'block');
            }

            if (entry.category == 'Problems' && entry.resultCode == 'A' && entry.isActiveProblem && this.activeProblemsListView.getItemIndex(entry.medcinId) == -1) {
                findingElement.transcribe({
                    suppress: {
                        prefix: entry.prefix == 'H' || entry.prefix == 'O'
                    }
                });

                var caption = findingElement.get('text');
                var insertIndex = 0;
                var listViewItems = this.activeProblemsListView.getChildren();

                for (; insertIndex < listViewItems.length; insertIndex++) {
                    if (caption < listViewItems[insertIndex].caption) {
                        break;
                    }
                }
                
                this.activeProblemsListView.addChildAt(new ListViewItem({
                    caption: caption,
                    icon: null,
                    listId: entry.medcinId,
                    description: '',
                    data: {
                        id: entry.medcinId
                    }
                }), insertIndex);
            }
        },

        getSubContainerForEntry: function (entry, container) {
            var actualContainer = container;

            if (entry.category == 'ROS & Exam') {
                if (entry.groupId) {
                    actualContainer = query('.groupContainer[data-group-id=' + entry.groupId + ']', container);
                }

                else {
                    actualContainer = query('.groupContainer[data-section-id=' + entry.sectionId + ']', container);
                }

                if (actualContainer.length > 0) {
                    actualContainer = actualContainer[0];
                }

                else {
                    actualContainer = domConstruct.create('div', {
                        innerHTML: '<div class="groupHeader">' + (entry.groupName || entry.sectionName) + '</div>',
                        className: 'groupContainer'
                    });

                    domAttr.set(actualContainer, 'data-section-id', entry.sectionId);
                    domAttr.set(actualContainer, 'data-group-id', entry.groupId || '');
                    domAttr.set(actualContainer, 'data-group-node-key', entry.groupNodeKey || '');

                    var containerGroups = query('.groupContainer', container);
                    var referenceGroup = null;

                    for (var z = 0; z < containerGroups.length; z++) {
                        if (!entry.groupId && (domAttr.get(containerGroups[z], 'data-group-node-key') || domAttr.get(containerGroups[z], 'data-section-id') > entry.sectionId)) {
                            referenceGroup = containerGroups[z];
                            break;
                        }

                        if (domAttr.get(containerGroups[z], 'data-group-node-key') && domAttr.get(containerGroups[z], 'data-group-node-key') > entry.groupNodeKey) {
                            referenceGroup = containerGroups[z];
                            break;
                        }
                    }

                    if (referenceGroup) {
                        domConstruct.place(actualContainer, referenceGroup, 'before');
                    }

                    else {
                        domConstruct.place(actualContainer, container, 'last');
                    }
                }
            }

            else if (entry.category == 'Lab & Imaging Results') {
                if (entry.nodeKey.substring(0, this.imagingStudiesRootNodeKey.length) == this.imagingStudiesRootNodeKey) {
                    actualContainer = query('.imagingResultsContainer', container);

                    if (actualContainer.length > 0) {
                        actualContainer = actualContainer[0];
                    }

                    else {
                        actualContainer = domConstruct.create('div', {
                            innerHTML: '<div class="groupHeader">Imaging</div>',
                            className: 'imagingResultsContainer groupContainer'
                        });

                        domConstruct.place(actualContainer, container, 'last');
                    }
                }

                else {
                    actualContainer = query('.labResultsContainer', container);

                    if (actualContainer.length > 0) {
                        actualContainer = actualContainer[0];
                    }

                    else {
                        actualContainer = domConstruct.create('div', {
                            innerHTML: '<div class="groupHeader">Labs</div>',
                            className: 'labResultsContainer groupContainer'
                        });

                        if (container.firstChild && domClass.contains(container.firstChild, 'dateHeader')) {
                            domConstruct.place(actualContainer, container.firstChild, 'after');
                        }

                        else {
                            domConstruct.place(actualContainer, container, 'first');
                        }
                    }
                }
            }

            return actualContainer;
        },

        addEntryToContainer: function (entry, findingElement, container, sortType) {
            if (entry.category == 'Lab & Imaging Results' && findingElement.phrasing) {
                findingElement.phrasing['dn'] = 'X';
                findingElement.phrasing['in'] = 'X';
            }

            findingElement.transcribe({
                suppress: {
                    prefix: entry.prefix == 'H' || entry.prefix == 'O',
                    result: entry.category == 'Lab & Imaging Results'
                }
            });

            var actualContainer = this.getSubContainerForEntry(entry, container);
            var findingListItem = domConstruct.create('div', {
                innerHTML: '<span class="entryText">' + (entry.medcinId == 0 || (entry.text && entry.category == 'Medications') ? entry.text : findingElement.get('text')) + '</span>',
                className: 'codedFinding medcinId' + entry.medcinId
            });

            domAttr.set(findingListItem, 'data-node-key', entry.nodeKey);
            domAttr.set(findingListItem, 'data-encounter-time', entry.encounterTime.toISOString());

            if (entry.id) {
                domAttr.set(findingListItem, 'data-entry-id', entry.id);
            }

            if (entry.codes && entry.codes.length > 0) {
                var title = '';

                for (var y = 0; y < entry.codes.length; y++) {
                    if (y > 0) {
                        title += ', ';
                    }

                    title += CodingManager.vocab(entry.codes[y].vocab).caption + ' ' + entry.codes[y].code;

                    if (entry.codes[y].description) {
                        title += ' (' + entry.codes[y].description + ')';
                    }
                }

                domAttr.set(findingListItem, 'title', title);
            }

            this.placeEntryInContainer(findingListItem, entry, actualContainer, sortType);

            if (entry.specialty) {
                for (var i = 0; i < entry.specialty.length; i++) {
                    domClass.add(findingListItem, 'specialty' + entry.specialty.substr(i, 1));
                }
            }

            return findingListItem;
        },

        placeEntryInContainer: function(findingListItem, entry, actualContainer, sortType) {
            var containerChildren = query('.codedFinding', actualContainer);
            var referenceFindingListItem = null;

            for (var x = 0; x < containerChildren.length; x++) {
                if (sortType == 'nodeKey' && domAttr.get(containerChildren[x], 'data-node-key') > entry.nodeKey) {
                    referenceFindingListItem = containerChildren[x];
                    break;
                }

                else if (sortType == 'encounterTime' && domAttr.get(containerChildren[x], 'data-encounter-time') < entry.encounterTime.toISOString()) {
                    referenceFindingListItem = containerChildren[x];
                    break;
                }

                else if (sortType == 'encounterTimeNodeKey' && (domAttr.get(containerChildren[x], 'data-encounter-time') < entry.encounterTime.toISOString() || (domAttr.get(containerChildren[x], 'data-encounter-time') == entry.encounterTime.toISOString() && domAttr.get(containerChildren[x], 'data-node-key') > entry.nodeKey))) {
                    referenceFindingListItem = containerChildren[x];
                    break;
                }
            }

            if (referenceFindingListItem) {
                domConstruct.place(findingListItem, referenceFindingListItem, 'before');
            }

            else {
                domConstruct.place(findingListItem, actualContainer, 'last');
            }
        },

        patientOpened: function (patientChart) {
            var chart = patientChart;

            domStyle.set(this.newEncounterMenuItem.domNode, 'display', '');
            domStyle.set(this.newEncounterSeparator.domNode, 'display', '');
            domStyle.set(this.patientPanel, 'display', 'block');

            this.patientStats.innerHTML = EnumManager.getTextSynch('sex', core.Patient.sex) + ', DoB: ' + DateUtil.formatDate(core.Patient.birthDate) + ', Age: ' + DateUtil.calculateAge(core.Patient.birthDate, new Date()).years;
            this.patientName.innerHTML = core.Patient.firstName + ' ' + core.Patient.lastName;

            if (chart.markedUpChart && chart.markedUpChart.xml) {
                this.xmlDocument = XmlUtil.createDocument(chart.markedUpChart.xml);
                this.renderDocument();
            }

            if (!chart.encounters) {
                this.openPatientDialog.destroy();
            }

            entries = [];

            array.forEach(chart.encounters, lang.hitch(this, function (encounter) {
                encounter.encounterTime = DateUtil.dateFromJSON(encounter.encounterTime);
                encounter.baseDate = encounter.encounterTime;

                this.encounters[encounter.id] = encounter;
            }));

            chart.encounters.sort(function (a, b) {
                if (a.encounterTime < b.encounterTime) {
                    return 1;
                }

                else if (a.encounterTime > b.encounterTime) {
                    return -1;
                }

                return 0;
            });

            array.forEach(chart.encounters, lang.hitch(this, function (encounter) {
                this.encountersStore.data.push({
                    id: encounter.id,
                    name: DateUtil.formatDateTime(encounter.encounterTime)
                });
            }));


            array.forEach(chart.findings, lang.hitch(this, function (finding) {
                var findingElement = core.createFindingEntry(finding);

                finding.category = this.getFindingCategory(finding);
                findingElement.transcribe({
                    suppress: {
                        prefix: finding.prefix == 'H' || finding.prefix == 'O'
                    }
                });
                finding.label = findingElement.get('text');

                array.forEach(finding.entries, lang.hitch(this, function (findingEntry) {
                    var encounter = this.encounters[findingEntry.encounterId];
                    var entry = {
                        medcinId: finding.medcinId,
                        prefix: finding.prefix,
                        nodeKey: finding.nodeKey,
                        sectionId: finding.sectionId,
                        groupId: finding.groupId,
                        phrasing: finding.phrasing,
                        encounterId: findingEntry.encounterId,
                        encounterTime: encounter.encounterTime,
                        resultCode: findingEntry.result,
                        value: findingEntry.value,
                        unit: findingEntry.unit,
                        termType: finding.termType,
                        specialty: finding.specialty,
                        text: findingEntry.text || finding.text,
                        category: finding.category,
                        isFreeText: finding.isFreeText,
                        notation: findingEntry.note,
                        groupName: finding.groupName,
                        groupNodeKey: finding.groupNodeKey,
                        sectionName: finding.sectionName,
                        flag: finding.flag,
                        isActiveProblem: finding.isActiveProblem,
                        codes: finding.codes,
                        prescription: findingEntry.prescription
                    };

                    if (findingEntry.prescription && findingEntry.prescription.sIGs) {
                        if (!entry.text) {
                            entry.text = finding.label;
                        }

                        if (findingEntry.prescription.sIGs.length == 1 && findingEntry.prescription.sIGs[0].length == 1) {
                            findingEntry.prescription.sIGs[0] = {
                                timing: findingEntry.prescription.sIGs[0][0]
                            };
                        }

                        entry.text += '; ' + array.map(findingEntry.prescription.sIGs, function (sig, index) {
                            var timingText = index > 0 ? ', then ' : '';

                            if (typeof sig.quantity != 'undefined') {
                                timingText += sig.quantity + ' ' + sig.unit;
                            }

                            if (sig.timing) {
                                timingText += ' ' + TimingTranscriber.transcribe([sig.timing]);
                            }

                            return timingText;
                        }).join('');
                    }

                    if (!this.shouldIgnoreEntry(entry)) {
                        entries.push(entry);
                    }
                }));
            }));

            entries.sort(function (a, b) {
                if (a.encounterTime < b.encounterTime) {
                    return 1;
                }

                else if (a.encounterTime > b.encounterTime) {
                    return -1;
                }

                return 0;
            });

            array.forEach(entries, lang.hitch(this, this.addEntryToDashboard));
            this.flowsheet.loadChart(chart, this.findingCategories);

            this.noteStarted = false;

            if (this.newNoteTab) {
                this.chartTabs.removeChild(this.newNoteTab);
            }

            if (chart.warningMessages) {
                this.warningsPane.set('title', 'Warnings (' + chart.warningMessages.length + ')');
                domStyle.set(this.chartTabs.tablist.pane2button(this.warningsPane.id).domNode, 'display', null);

                domConstruct.empty(this.warningsContentPane.containerNode);

                array.forEach(chart.warningMessages, lang.hitch(this, function(warningMessage) {
                    this.addWarningMessage(warningMessage.message);
                }));
            }

            if (!core.settings.persistChartOnImport && this.openPatientDialog.openType == 'import') {
                domClass.add(this.entireChartPane.domNode, 'entriesSelectable');
                query('.checkboxListIcon', this.entireChartPane.domNode).style('display', '');
            }

            else {
                domClass.remove(this.entireChartPane.domNode, 'entriesSelectable');
            }

            this.openPatientDialog.destroy();
            this.openType = this.openPatientDialog.openType;

            array.forEach(this.specialtiesListView.getChildren(), function(specialty) {
                if (specialty.data.showTest()) {
                    domStyle.set(specialty.domNode, 'display', '');
                }

                else {
                    domStyle.set(specialty.domNode, 'display', 'none');
                }
            });

            var historyPool = new HistoryPool();

            historyPool._populateData(chart);
            historyPool.patientId = core.Patient.id;

            core.HistoryPool = historyPool;
        },

        addWarningMessage: function(message) {
            var warningElement = domConstruct.create('div', {
                className: 'warning',
                innerHTML: message
            }, this.warningsContentPane.containerNode);

            query('.diagnosis', warningElement).on('click', lang.hitch(this, function (e) {
                var medcinId = domAttr.get(e.target, 'data-medcin-id');
                var text = e.target.innerText;

                var problemItem = new ListViewItem({
                    caption: text,
                    icon: null,
                    listId: medcinId,
                    description: '',
                    data: {
                        id: medcinId
                    }
                });

                var listItem = this.screeningListView.addChildFirst(problemItem);

                if (query('.sidebar .qcListViewItem.listShow').length > 0) {
                    domClass.add(listItem.domNode, 'listHide');
                }

                this.screeningListView.setSelectedItem(problemItem);
                this.chartTabs.selectChild(this.chartTabs.getChildren()[0]);
            }));

            return warningElement;
        },

        openPatient: function (openType, patientId) {
            this.openPatientDialog = new OpenPatientDialog({
                openType: openType
            });

            this.openPatientDialog.patientOpening = lang.hitch(this, this.patientOpening);
            this.openPatientDialog.patientOpened = lang.hitch(this, this.patientOpened);

            if (!patientId) {
                this.openPatientDialog.show();
            }

            else {
                return this.openPatientDialog.openPatient(patientId);
            }
        },

        patientOpening: function () {
            query('.checkboxListIcon', this.entireChartPane.domNode).style('display', 'none');
            query('.selectAllEntriesCheckbox', this.entireChartPane.domNode).style('display', 'none').removeClass('selected').removeClass('partiallySelected');
            query('.selectMode', this.entireChartPane.domNode).removeClass('selectMode');

            domConstruct.empty(this.patientName);
            domConstruct.empty(this.patientStats);

            this.encountersStore.data = [
                {
                    id: '',
                    name: ''
                }
            ];

            this.activeProblemsListView.clear();
            this.screeningListView.clear();

            for (var category in this.findingCategoryPanes) {
                if (!this.findingCategoryPanes.hasOwnProperty(category)) {
                    continue;
                }

                domConstruct.empty(this.findingCategoryPanes[category].entireChart.containerNode);
                domConstruct.empty(this.findingCategoryPanes[category].mostRecent.containerNode);

                if (category == 'Unmapped Findings') {
                    domStyle.set(this.findingCategoryPanes[category].entireChart.domNode, 'display', 'none');
                    domStyle.set(this.findingCategoryPanes[category].mostRecent.domNode, 'display', 'none');
                }
            }

            this.chartTabs.selectChild(core.settings.persistChartOnImport || this.openPatientDialog.openType != 'import' ? this.mostRecentPane : this.entireChartPane);
            domStyle.set(this.chartTabs.tablist.pane2button(this.warningsPane.id).domNode, 'display', 'none');

            this.fieldSets = {};
            this.promptsCompleted = {};
            this.encounters = {};

            this.quickDataButton.set('checked', false);

            if (this.flowsheet) {
                this.flowsheet.hide();
            }

            if (this.flowsheet && this.flowsheet.graphWidget) {
                this.flowsheet.graphWidget.close();
            }
        },

        onLogOffClicked: function() {
            request(core.serviceURL('Quippe/Security/Logout'), {
                query: {
                    DataFormat: 'JSON'
                },
                handleAs: 'json',
                preventCache: true
            }).then(function (data) {
                if (data.result.cookieName) {
                    cookie(data.result.cookieName, data.result.cookieValue, {
                        path: data.result.cookiePath,
                        expires: data.result.cookieExpires
                    });
                }

                if (data.result && data.result.redirectUrl) {
                    window.location.href = data.result.redirectUrl;
                }
            }, function (errors) {
                core.showError(errors);
            });
        },

        onOpenPatientClicked: function () {
            this.openPatient('open');
        },

        onImportPatientClicked: function () {
            this.openPatient('import');
        },

        onPatientEditorClicked: function() {
            var editorDialog = new PatientEditorDialog();
            editorDialog.startup();

            editorDialog.show();
        },

        onOptionsClicked: function() {
            var optionsDialog = new UserSettingsDialog();
            optionsDialog.startup();

            optionsDialog.show();
        },

        onMedcinViewerClicked: function() {
            window.open('MedcinViewer.htm', 'MedcinViewer');
        },

        onWebServiceTesterClicked: function() {
            window.open('ServiceTester.htm', 'ServiceTester');
        },

        onEncounterSelectionChanged: function () {
            var encounterId = this.encountersSelect.get('value');

            if (!encounterId) {
                query('.encounterContainer').removeClass('encountersHidden');
            }

            else {
                query('.encounterContainer.encounter' + encounterId).removeClass('encountersHidden');
                query('.encounterContainer:not(.encounter' + encounterId + ')').addClass('encountersHidden');
            }
        },

        onSpecialtySelectionChanged: function () {
            this.specialtyChangedTimer = setTimeout(lang.hitch(this, function () {
                var selectedItems = this.specialtiesListView.getSelectedItems();

                query('.specialtyHighlight').removeClass('specialtyHighlight');

                if (selectedItems.length > 0 && !domClass.contains(selectedItems[0].domNode, 'listShow')) {
                    query('.specialty' + selectedItems[0].data.id + ':not(.findingContainer)').addClass('specialtyHighlight');
                }

                this.selectionChangedTimer = null;
            }), 250);
        },

        onSpecialtyDoubleClicked: function (item) {
            if (this.specialtyChangedTimer) {
                clearTimeout(this.specialtyChangedTimer);
                this.specialtyChangedTimer = null;
            }

            var node;

            if (!domClass.contains(item.domNode, 'listShow')) {
                query('.listShow', this.specialtiesListView.domNode).removeClass('listShow');
                query('.listHide', this.specialtiesListView.domNode).removeClass('listHide');

                query('.specialtyHighlight').removeClass('specialtyHighlight');
                query('.specialtiesHidden').removeClass('specialtiesHidden');
                query('.codedFinding:not(.specialty' + item.data.id + ')').addClass('specialtiesHidden');
                query('.findingContainer:not(.specialty' + item.data.id + ')').addClass('specialtiesHidden');

                var hiddenGroups = query('.groupContainer.groupHidden');
                var notHiddenGroups = query('.groupContainer:not(.groupHidden)');

                notHiddenGroups.forEach(function (container) {
                    if (query('.codedFinding:not(.specialtiesHidden):not(.activeProblemsHidden)', container).length == 0) {
                        domClass.add(container, 'groupHidden');
                    }
                });

                hiddenGroups.forEach(function(container) {
                    if (query('.codedFinding:not(.specialtiesHidden):not(.activeProblemsHidden)', container).length > 0) {
                        domClass.remove(container, 'groupHidden');
                    }
                });

                domClass.add(item.domNode, 'listShow');

                array.forEach(this.specialtiesListView.getChildren(), function (child) {
                    if (!domClass.contains(child.domNode, 'listShow')) {
                        domClass.add(child.domNode, 'listHide');
                    }
                });

                node = this.flowsheet.tree;

                while (node) {
                    if (!node.isGroup()) {
                        node.specialtyVisible = node.specialty && node.specialty.toString().indexOf(item.data.id) != -1;
                        node.visible = node.specialtyVisible && node.diagnosisVisible && node.dataVisible;
                    }

                    node = node.nextNode();
                }

                this.flowsheet.updateNeeded = true;
                this.flowsheet.updateDataTable();
                this.flowsheet.updateDisplay();
            }

            else {
                query('.specialtiesHidden').removeClass('specialtiesHidden');
                domClass.remove(item.domNode, 'listShow');
                query('.listHide', this.specialtiesListView.domNode).removeClass('listHide');

                query('.groupContainer.groupHidden').forEach(function(container) {
                    if (query('.codedFinding:not(.specialtiesHidden):not(.activeProblemsHidden)', container).length > 0) {
                        domClass.remove(container, 'groupHidden');
                    }
                });

                node = this.flowsheet.tree;

                while (node) {
                    if (!node.isGroup()) {
                        node.specialtyVisible = true;
                        node.visible = node.specialtyVisible && node.diagnosisVisible && node.dataVisible;
                    }

                    node = node.nextNode();
                }

                this.flowsheet.updateNeeded = true;
                this.flowsheet.updateDataTable();
                this.flowsheet.updateDisplay();
            }

            this.specialtiesListView.clearSelected();
        },

        onDiagnosisSelectionChanged: function (diagnosisListView, noDelay) {
            var doWork = lang.hitch(this, function () {
                var selectedItems = diagnosisListView.getSelectedItems();

                if (selectedItems.length == 0) {
                    query('.diagnosisHighlight').removeClass('diagnosisHighlight');
                }

                else {
                    when(this.doPrompt(selectedItems[0]), lang.hitch(this, function () {
                        query('.diagnosisHighlight').removeClass('diagnosisHighlight');

                        if (!domClass.contains(selectedItems[0].domNode, 'listShow')) {
                            query('.diagnosis' + selectedItems[0].data.id + 'Level' + this.focusListSizeSlider.get('value') + ':not(.findingContainer)').addClass('diagnosisHighlight');
                        }
                    }));
                }

                this.refreshActionsMenu(selectedItems.length == 0 ? null : selectedItems[0]);
                this.selectionChangedTimer = null;
            });

            if (noDelay) {
                doWork();
            }

            else {
                this.selectionChangedTimer = setTimeout(doWork, 250);
            }
        },

        doPrompt: function (listItem) {
            if (this.promptsCompleted[listItem.data.id.toString()] && this.promptsCompleted[listItem.data.id.toString()][this.focusListSizeSlider.get('value').toString()]) {
                return null;
            }

            listItem.showLoading();

            return request.get(core.serviceURL('Quippe/ContentLibrary/ContentPrompt'), {
                query: {
                    PromptType: 'LENS' + this.focusListSizeSlider.get('value') + '_',
                    DataFormat: 'JSON',
                    MedcinId: listItem.data.id,
                    ListSize: this.focusListSizeSlider.get('value') == 3 ? 2 : this.focusListSizeSlider.get('value'),
                    PatientId: core.Patient.id,
                    EncounterTime: DateUtil.formatISODate(new Date()),
                    Fallback: true
                },
                handleAs: 'json'
            }).then(lang.hitch(this, function(data) {
                var subPrompt = null;
                var doSubPrompt = false;
                var subPromptIds = '';

                data.list.item = core.forceArray(data.list.item);

                for (var i = 0; i < data.list.item.length; i++) {
                    query('.codedFinding[data-node-key^="' + data.list.item[i].nodeKey + '"]').addClass('diagnosis' + listItem.data.id + 'Level' + this.focusListSizeSlider.get('value'));
                    query('.medcinId' + data.list.item[i].medcinId).addClass('diagnosis' + listItem.data.id + 'Level' + this.focusListSizeSlider.get('value'));

                    if (this.focusListSizeSlider.get('value') == 3 && data.list.listType == 'Prompt' && data.list.item[i].termType == 6 && !data.list.item[i].prefix && data.list.item[i].medcinId != listItem.data.id) {
                        subPromptIds += (subPromptIds == '' ? '' : ',') + data.list.item[i].medcinId;
                        doSubPrompt = true;
                    }
                }

                if (doSubPrompt) {
                    subPrompt = request.get(core.serviceURL('Quippe/NoteBuilder/MultiQuickPrompt'), {
                        query: {
                            MedcinIds: subPromptIds,
                            DataFormat: 'JSON',
                            ListSize: 1,
                            PatientId: core.Patient.id
                        },
                        handleAs: 'json'
                    }).then(lang.hitch(this, function(subPromptData) {
                        for (var j = 0; j < subPromptData.list.item.length; j++) {
                            query('.codedFinding[data-node-key^="' + subPromptData.list.item[j].nodeKey + '"]').addClass('diagnosis' + listItem.data.id + 'Level' + this.focusListSizeSlider.get('value'));
                            query('.medcinId' + subPromptData.list.item[j].medcinId).addClass('diagnosis' + listItem.data.id + 'Level' + this.focusListSizeSlider.get('value'));
                        }
                    }));
                }

                return when(subPrompt, lang.hitch(this, function() {
                    if (!this.promptsCompleted[listItem.data.id.toString()]) {
                        this.promptsCompleted[listItem.data.id.toString()] = {};
                    }

                    this.promptsCompleted[listItem.data.id.toString()][this.focusListSizeSlider.get('value').toString()] = true;

                    listItem.doneLoading();
                }));
            }));
        },

        onDiagnosisDoubleClicked: function (item, refreshOnly) {
            if (this.selectionChangedTimer) {
                clearTimeout(this.selectionChangedTimer);
                this.selectionChangedTimer = null;
            }

            when(this.doPrompt(item), lang.hitch(this, function () {
                var node;

                if (!domClass.contains(item.domNode, 'listShow') || refreshOnly) {
                    query('.listShow', this.activeProblemsListView.domNode).removeClass('listShow');
                    query('.listHide', this.activeProblemsListView.domNode).removeClass('listHide');

                    query('.listShow', this.screeningListView.domNode).removeClass('listShow');
                    query('.listHide', this.screeningListView.domNode).removeClass('listHide');

                    if (!refreshOnly) {
                        query('.diagnosisHighlight').removeClass('diagnosisHighlight');
                    }

                    query('.activeProblemsHidden').removeClass('activeProblemsHidden');
                    query('.codedFinding:not(.diagnosis' + item.data.id + 'Level' + this.focusListSizeSlider.get('value') + ')').addClass('activeProblemsHidden');
                    query('.findingContainer:not(.diagnosis' + item.data.id + 'Level' + this.focusListSizeSlider.get('value') + ')').addClass('activeProblemsHidden');

                    var hiddenGroups = query('.groupContainer.groupHidden');
                    var notHiddenGroups = query('.groupContainer:not(.groupHidden)');

                    notHiddenGroups.forEach(function(container) { 
                        if (query('.codedFinding:not(.specialtiesHidden):not(.activeProblemsHidden)', container).length == 0) {
                            domClass.add(container, 'groupHidden');
                        }
                    });

                    hiddenGroups.forEach(function(container) { 
                        if (query('.codedFinding:not(.specialtiesHidden):not(.activeProblemsHidden)', container).length > 0) {
                            domClass.remove(container, 'groupHidden');
                        }
                    });

                    domClass.add(item.domNode, 'listShow');

                    array.forEach(this.activeProblemsListView.getChildren(), function (child) {
                        if (!domClass.contains(child.domNode, 'listShow')) {
                            domClass.add(child.domNode, 'listHide');
                        }
                    });

                    array.forEach(this.screeningListView.getChildren(), function (child) {
                        if (!domClass.contains(child.domNode, 'listShow')) {
                            domClass.add(child.domNode, 'listHide');
                        }
                    });

                    node = this.flowsheet.tree;

                    while (node) {
                        if (!node.isGroup()) {
                            node.diagnosisVisible = query('.medcinId' + node.medcinId + '.diagnosis' + item.data.id + 'Level' + this.focusListSizeSlider.get('value')).length > 0;
                            node.visible = node.specialtyVisible && node.diagnosisVisible && node.dataVisible;
                        }

                        node = node.nextNode();
                    }

                    this.flowsheet.updateNeeded = true;
                    this.flowsheet.updateDataTable();
                    this.flowsheet.updateDisplay();
                }

                else {
                    query('.activeProblemsHidden').removeClass('activeProblemsHidden');
                    domClass.remove(item.domNode, 'listShow');

                    query('.groupContainer.groupHidden').forEach(function(container) {
                        if (query('.codedFinding:not(.specialtiesHidden):not(.activeProblemsHidden)', container).length > 0) {
                            domClass.remove(container, 'groupHidden');
                        }
                    });

                    query('.listHide', this.activeProblemsListView.domNode).removeClass('listHide');
                    query('.listHide', this.screeningListView.domNode).removeClass('listHide');

                    node = this.flowsheet.tree;

                    while (node) {
                        if (!node.isGroup()) {
                            node.diagnosisVisible = true;
                            node.visible = node.specialtyVisible && node.diagnosisVisible && node.dataVisible;
                        }

                        node = node.nextNode();
                    }

                    this.flowsheet.updateNeeded = true;
                    this.flowsheet.updateDataTable();
                    this.flowsheet.updateDisplay();
                }

                this.activeProblemsListView.clearSelected();
                this.screeningListView.clearSelected();
            }));
        },

        renderDocument: function () {
            var rawHTML = XmlUtil.transform(this.xmlDocument, this.xsltXmlFormatter);
            this.rawPane.set('content', rawHTML);
        },

        onRawPaneClick: function (evt) {
            if (domClass.contains(evt.target, 'expander')) {
                var element = core.ancestorNodeByClass(evt.target, 'elem');
                if (!element) {
                    return;
                };

                if (domClass.contains(element, 'collapsed')) {
                    domClass.remove(element, 'collapsed');
                    evt.target.innerHTML = '-';
                }
                else {
                    domClass.add(element, 'collapsed');
                    evt.target.innerHTML = '+';
                }
                return;
            };
        },

        addScreeningsSearchBox: function() {
            var searchResults = new SearchResultTree({
                searchCommand: 'dx'
            });

            domStyle.set(searchResults.toolbar.domNode, 'display', 'none');

            searchResults.oNodeDoubleClick = lang.hitch(this, function (item) {
                this.screeningsSearchBox.closePopup();

                if (core.settings.features.touchPad) {
                    this.screeningsSearchBox.textbox.blur();
                }

                var problemItem;

                if (this.screeningListView.getItemIndex(item.data.medcinId || item.data.id) != - 1) {
                    problemItem = this.screeningListView.getItem(item.data.medcinId || item.data.id);

                    this.screeningListView.setSelectedItem(problemItem);
                    this.screeningsSearchBox.onClearQuery();
                }

                else {
                    request.get(core.serviceURL('Quippe/NoteBuilder/Resolve'), {
                        query: {
                            MedcinId: item.data.medcinId || item.data.id,
                            Prefix: item.data.prefix,
                            DataFormat: 'JSON',
                            PatientId: core.Patient.id
                        },
                        handleAs: 'json'
                    }).then(lang.hitch(this, function(result) {
                        problemItem = new ListViewItem({
                            caption: Transcriber.transcribeItem(result.term),
                            icon: null,
                            listId: item.data.medcinId || item.data.id,
                            description: '',
                            data: {
                                id: item.data.medcinId || item.data.id
                            }
                        });

                        var listItem = this.screeningListView.addChildFirst(problemItem);

                        if (query('.sidebar .diagnosisListView .qcListViewItem.listShow').length > 0) {
                            domClass.add(listItem.domNode, 'listHide');
                        }

                        this.screeningListView.setSelectedItem(problemItem);
                        this.screeningsSearchBox.onClearQuery();
                    }));
                }
            });

            this.screeningsSearchBox = new SearchBox({
                _searchControl: searchResults
            });

            this.screeningsSearchBox.placeAt(this.screeningSearchBoxContainer);
            domClass.add(this.screeningsSearchBox.domNode, 'qcSearchBox');
        },

        onAddToNoteClicked: function (item, widget) {
            if (!this.noteStarted) {
                when(this.getOrCreateQuippeInstance(), function() {
                    var resetSubscription = topic.subscribe('/qc/DocumentLoaded', function() {
                        resetSubscription.remove();
                        topic.publish('/qc/MergePrompt', {
                            type: 'term',
                            medcinId: item.id
                        });
                    });

                    topic.publish('/qc/NewEncounter', {
                        patientId: core.Patient.id,
                        encounter: {
                            id: '',
                            encounterTime: new Date()
                        },
                        noteTemplate: defaultNoteTemplate
                    });
                });
            }

            else {
                when(this.getOrCreateQuippeInstance(), function() {
                    topic.publish('/qc/MergePrompt', {
                        type: 'term',
                        medcinId: item.id
                    });
                });
            }

            this.refreshActionsMenu(widget);
        },

        refreshActionsMenu: function(widget) {
            this.currentActionsMenuWidget = widget;

            if (!widget) {
                this.actionsMenuButton.set('disabled', true);
            }

            else {
                var info = this.contextMenu.getMenuInfo(widget.domNode);

                if (!info || !info.actions || info.actions.length == 0) {
                    this.actionsMenuButton.disableMenu();
                };

                this.actionsMenuButton.createMenu(info.item, info.actions);
                this.actionsMenuButton.set('disabled', false);
            }
        },

        getDiagnosisContextActions: function (item, widget, targetNode) {
            var actions = [];

            if (!item.id) {
                return actions;
            }

            actions.push({
                label: !this.noteStarted ? 'Create New Note' : 'Merge Into New Note',
                icon: 'document_add',
                onClick: lang.hitch(this, function() {
                    this.onAddToNoteClicked(item, widget);
                })
            }, {
                label: 'MEDCIN Viewer',
                icon: 'view',
                onClick: lang.hitch(this, function () {
                    var medcinViewer = window.open(document.location.origin + '/MedcinViewer.htm#' + item.id, '_blank');
                    medcinViewer.focus();
                })
            });

            if (item.sourceOwner == this.screeningListView) {
                actions.push({
                    label: 'Delete',
                    icon: 'delete',
                    onClick: lang.hitch(this, function () {
                        if (this.screeningListView.getSelectedItem() == widget) {
                            this.screeningListView.clearSelected();
                        }

                        else if (domClass.contains(widget.domNode, 'listShow')) {
                            this.onDiagnosisDoubleClicked(widget, true);
                        }

                        this.screeningListView.removeChild(widget);
                    })
                });
            }

            return actions;
        },

        restoreSidebar: function(newSidebarContainer, newBorderContainer) {
            if (domStyle.get(this.sidebarContainer.parentNode, 'display') == 'none') {
                newSidebarContainer._splitterWidget.collapse();
                newSidebarContainer._splitterWidget.savedSize = registry.byNode(this.sidebarContainer.parentNode)._splitterWidget.savedSize;
            }

            else {
                if (domStyle.get(newSidebarContainer.domNode, 'display') == 'none') {
                    newSidebarContainer._splitterWidget.expand();
                }

                if (this.sidebarContainer.parentNode.style.width) {
                    var sidebarWidth = parseInt(this.sidebarContainer.parentNode.style.width, 10) + 17;
                    newBorderContainer._layoutChildren(newSidebarContainer.id, sidebarWidth);
                }
            }

            domConstruct.place(this.sidebarContainer, newSidebarContainer.containerNode);
        },

        restoreToolbar: function(newToolbarContainer) {
            this.toolbar.placeAt(newToolbarContainer.containerNode);
            domStyle.set(this.quickDataButton.domNode, 'display', newToolbarContainer == this.flowsheetToolbarPane ? '' : 'none');
        },

        onChartTabsSelectChild: function (page) {
            if (page == this.entireChartPane) {
                this.restoreSidebar(this.entireChartSidebar, this.entireChartBorderContainer);
                this.restoreToolbar(this.entireChartToolbarPane);
            }

            else if (page == this.mostRecentPane) {
                this.restoreSidebar(this.mostRecentSidebar, this.mostRecentBorderContainer);
                this.restoreToolbar(this.mostRecentToolbarPane);
            }

            else if (page == this.flowsheetPane) {
                this.restoreSidebar(this.flowsheetSidebar, this.flowsheetBorderContainer);
                this.restoreToolbar(this.flowsheetToolbarPane);
            }

            else if (page == this.warningsPane) {
                this.restoreSidebar(this.warningsSidebar, this.warningsBorderContainer);
                this.restoreToolbar(this.warningsToolbarPane);
            }

            this.previouslySelectedTab = page;
        },

        shouldIgnoreEntry: function(entry) {
            if (entry.medcinId == 283159 || entry.medcinId == 34847 || entry.medcinId == 34845) {
                return true;
            }

            if (entry.isFreeText && (entry.notation == '' || entry.notation == null || typeof entry.notation == 'undefined')) {
                return true;
            }

            return false;
        },

        onQuickDataClicked: function () {
            var node = this.flowsheet.tree;

            while (node) {
                if (!node.isGroup()) {
                    node.dataVisible = !this.quickDataButton.get('checked') || node.hasValue;
                    node.visible = node.specialtyVisible && node.diagnosisVisible && node.dataVisible;
                }

                node = node.nextNode();
            }

            this.flowsheet.updateNeeded = true;
            this.flowsheet.updateDataTable();
            this.flowsheet.updateDisplay();
        },

        getOrCreateQuippeInstance: function () {
            if (this.noteStarted) {
                this.chartTabs.selectChild(this.newNoteTab);
                return;
            }

            this.noteStarted = true;

            if (!this.newNoteTab) {
                this.newNoteTab = new ContentPane({
                    title: 'New Note for ' + core.Patient.firstName + ' ' + core.Patient.lastName,
                    'class': 'noteContainer'
                });

                this.chartTabs.addChild(this.newNoteTab);
                this.newNoteTab.startup();

                var app = new Application();
                app.placeAt(this.newNoteTab.containerNode);

                this.chartTabs.selectChild(this.newNoteTab);

                return when(app.init(), lang.hitch(this, function () {
                    var resetSubscription = topic.subscribe('/qc/DocumentLoaded', lang.hitch(this, function() {
                        resetSubscription.remove();

                        var appMenuItem = app.toolbar.getChildren()[0];

                        appMenuItem.dropDown.addChild(new MenuSeparator(), appMenuItem.dropDown.getChildren().length -2);
                        appMenuItem.dropDown.addChild(new MenuItem({
                            label: 'Discard Encounter',
                            iconClass: 'delete',
                            showLabel: true,
                            onClick: lang.hitch(this, function() {
                                this.chartTabs.removeChild(this.newNoteTab);
                                this.chartTabs.selectChild(this.chartTabs.getChildren()[0]);
                                this.noteStarted = false;
                                this.refreshActionsMenu(this.currentActionsMenuWidget);
                            })
                        }), appMenuItem.dropDown.getChildren().length - 2);

                        var toolsButton = array.filter(app.toolbar.getChildren(), function (x) { return x.get('label') == 'Tools' })[0];

                        if (toolsButton && toolsButton.dropDown) {
                            toolsButton.dropDown.addChild(new MenuSeparator());

                            var menuItem = new MenuItem({
                                label: 'Download Chart...',
                                showLabel: true,
                                onClick: lang.hitch(this, this.onDownloadChartClicked)
                            });

                            toolsButton.dropDown.addChild(menuItem);
                        };
                    }));
                }));
            }

            else {
                this.newNoteTab.set('title', 'New Note for ' + core.Patient.firstName + ' ' + core.Patient.lastName);
                this.chartTabs.addChild(this.newNoteTab);
                this.chartTabs.selectChild(this.newNoteTab);
            }
        },

        onNewEncounterClicked: function() {
            when(this.getOrCreateQuippeInstance(), function() {
                var patient = core.Patient;

                core.app.workspace.resetPatient();
                core.app.workspace.resetAll();
                core.Patient = patient;

                topic.publish('/qc/ShowDialog', 'newEncounter', {
                    selectedPatientId: core.Patient.id
                });
            });
        },

        onDownloadChartClicked: function() {
            window.open(core.serviceURL('HL7/FHIR/ExportChart?PatientId=' + core.Patient.id + '&CheckData=True&Download=True'), '_blank');
        }
    });

    return typeDef;
});