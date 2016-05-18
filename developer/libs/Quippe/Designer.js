define([
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/on",
    "dojo/query",
	"dojo/request",
    "dojo/topic",
    "dojo/when",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/store/DataStore",
    "qc/_core",
    "qc/BrowsePopup",
    "qc/CheckedMenuItem",
    "qc/DataSheet",
    "qc/design/ElementNavigator",
    "qc/design/LayoutBuilder",
    "qc/design/PropertyGrid",
    "qc/design/ToolbarBuilder",
    "qc/design/NewContentDialog",
    "qc/design/TemplateChecker",
    "qc/EnumDataStore",
    "qc/MenuItem",
    "qc/note/FindingLabel",
	"qc/OpenContentDialog",
	"qc/SaveContentDialog",
    "qc/SettingsEnumStore",
    "qc/StringUtil",
    "qc/XmlUtil",
    "qc/XmlEditorPane",
    "qc/design/TestDataDialog",
    "Quippe/Application"
], function (registry, array, declare, lang, aspect, on, query, request, topic, when, domAttr, domClass, domConstruct, domStyle, DataStore, core, BrowsePopup, CheckedMenuItem, DataSheet, ElementNavigator, LayoutBuilder, PropertyGrid, ToolbarBuilder, NewContentDialog, TemplateChecker, EnumDataStore, MenuItem, FindingLabel, OpenContentDialog, SaveContentDialog, SettingsEnumStore, StringUtil, XmlUtil, XmlEditorPane, TestDataDialog, Application) {

    return declare("Quippe.Designer", [Application], {
        _openContentDialog: null,
        mruList: [],

        _initSettings: function(settings) {
            this.inherited(arguments);
            core.Patient = { id: '', lastName: 'Patient', firstName: 'Generic', sex: '' };
            core.Encounter = { id: '', encounterTime: new Date() };

            this.mruList = [];
            if (settings.designerMRUItems) {
                try {
                    this.mruList = JSON.parse(settings.designerMRUItems) || [];
                }
                catch (ex) {
                    this.mruList = [];
                }
            };
            core.settings.enableDeferredContent = false;
        },

        _initSubscriptions: function() {
            topic.subscribe("/quippe/designer/fileNew", lang.hitch(this, this.onFileNew));
            topic.subscribe("/quippe/designer/fileOpen", lang.hitch(this, this.onFileOpen));
            topic.subscribe("/quippe/designer/fileSave", lang.hitch(this, this.onFileSave));
            topic.subscribe("/quippe/designer/fileSaveAs", lang.hitch(this, this.onFileSaveAs));
            topic.subscribe("/quippe/designer/fileExit", lang.hitch(this, this.onFileExit));
            topic.subscribe("/quippe/designer/mruOpen", lang.hitch(this, this.onMRUOpen));
            topic.subscribe("/quippe/design/EditTestData", lang.hitch(this, this.editTestData));
            this.inherited(arguments);
        },

        _initPageLayout: function() {
            this.inherited(arguments);
            this.editor = this.workspace.ensureEditor();
            this.editor.setView('design', true);
        },

        _initToolbar: function() {
            var iconSize = 16;

            //App Menu
            var appMenu = ToolbarBuilder.buildMenu({
                fileNew: { label: 'New...', icon: 'document_new', topic: '/quippe/designer/fileNew' },
                fileOpen: { label: 'Open...', icon: 'folder', topic: '/quippe/designer/fileOpen' },
                sep1: {},
                fileSave: { label: 'Save', icon: 'floppy_disk', topic: '/quippe/designer/fileSave' },
                fileSaveAs: { label: 'Save As...', icon: '', topic: '/quippe/designer/fileSaveAs' },
                sep2: {},
                recentItems: { label: 'Recent Items', menu: {}, disabled: true },
                sep3: {},
                fileExit: { label: 'Close Window', topic: '/quippe/designer/fileExit' }
            }, null, iconSize);

            //Prompt Menu
            var promptMenu = ToolbarBuilder.buildMenu({
                prompt1: {
                    label: "1: " + core.getI18n("small"),
                    showLabel: true,
                    onClick: function(evt) {
                        if (evt.ctrlKey) {
                            topic.publish("/qc/SetListSize", 1);
                        }
                        else {
                            topic.publish("/qc/ChartPrompt", 'IP', 1, true);
                        };
                    }
                },
                prompt2: {
                    label: "2: " + core.getI18n("medium"),
                    showLabel: true,
                    onClick: function(evt) {
                        if (evt.ctrlKey) {
                            topic.publish("/qc/SetListSize", 2);
                        }
                        else {
                            topic.publish("/qc/ChartPrompt", 'IP', 2, true);
                        };
                    }
                },
                prompt3: {
                    label: "3: " + core.getI18n("large"),
                    showLabel: true,
                    onClick: function(evt) {
                        if (evt.ctrlKey) {
                            topic.publish("/qc/SetListSize", 3);
                        }
                        else {
                            topic.publish("/qc/ChartPrompt", 'IP', 3, true);
                        };
                    }
                }
            }, null, iconSize);

            //View Menu
            var viewMenu = ToolbarBuilder.buildMenu({
                expanded: {
                    type: 'qc/CheckedMenuItem',
                    label: 'Entry',
                    showLabel: true,
                    checked: false,
                    viewMode: 'expanded',
                    onClick: lang.hitch(this, this.onViewMenuClicked)
                },
                concise: {
                    type: 'qc/CheckedMenuItem',
                    label: 'Concise',
                    showLabel: true,
                    checked: false,
                    viewMode: 'concise',
                    onClick: lang.hitch(this, this.onViewMenuClicked)
                },
                outline: {
                    type: 'qc/CheckedMenuItem',
                    label: 'Outline',
                    showLabel: true,
                    checked: false,
                    viewMode: 'outline',
                    onClick: lang.hitch(this, this.onViewMenuClicked)
                },
                design: {
                    type: 'qc/CheckedMenuItem',
                    label: core.getI18n('design'),
                    showLabel: true,
                    checked: false,
                    viewMode: 'design',
                    onClick: lang.hitch(this, this.onViewMenuClicked)
                },
                sep1: {},
                codeReview: {
                    label: "Code Review",
                    iconClass: "",
                    showLabel: true,
                    onClick: function() {
                        topic.publish("/qc/ChartReview/OpenView", { id: 'CodeReview', title: 'Coding Review', typeName: 'qc/coding/CodeReview', instanceParms: null, instance: null })
                    }
                }
            }, null, iconSize);
            this.viewMenu = viewMenu;

            //Tools Menu
            var toolsMenu = ToolbarBuilder.buildMenu({
                contentLibraryManager: {
                    label: core.getI18n("contentlibrarymanager"),
                    iconClass: "book_blue",
                    showLabel: true,
                    onClick: function() {
                        topic.publish("/qc/ShowDialog", "libraryManager")
                    }
                },
                options: {
                    label: core.getI18n("options"),
                    iconClass: "preferences",
                    showLabel: true,
                    onClick: function() {
                        topic.publish("/qc/ShowDialog", "userSettings")
                    }
                },
                macroEditor: {
                    label: 'Text Macro Editor',
                    iconClass: 'document',
                    showLabel: true,
                    onClick: function() {
                        topic.publish("/qc/ShowDialog", "textMacroEditor", { newMacro: true })
                    }
                },
                medcinViewer: {
                    label: core.getI18n("medcinviewer"),
                    iconClass: "",
                    showLabel: true,
                    onClick: function() {
                        topic.publish("/qc/ShowMedcinViewer")
                    }
                },
                webServiceTester: {
                    label: core.getI18n("webservicetester"),
                    iconClass: "",
                    showLabel: true,
                    onClick: function() {
                        window.open('ServiceTester.htm', 'ServiceTester');
                    }
                },
                templateChecker: {
                    label: 'Template Checker',
                    iconClass: '',
                    showLabel: true,
                    onClick: function() {
                        topic.publish("/qc/ChartReview/OpenView", { id: 'TemplateChecker', title: 'Template Checker', typeName: 'qc/design/TemplateChecker', instanceParms: null, instance: null })
                    }
                },
                xmlEditor: {
                    label: 'XML Editor',
                    showLabel: true,
                    onClick: function() {
                        topic.publish("/qc/ChartReview/OpenView", { id: 'XmlEditorPane', title: 'XML Editor', typeName: 'qc/XmlEditorPane', instanceParms: null, instance: null })
                    }
                },
                testDataEditor: {
                    label: 'Test Data',
                    showLabel: true,
                    onClick: function () {
                        topic.publish("/quippe/design/EditTestData");
                    }
                },
                aboutQuippe: {
                    label: core.getI18n("aboutquippe"),
                    iconClass: "",
                    showLabel: true,
                    onClick: lang.hitch(this, this.showAboutDialog)
                }
            }, null, iconSize);
            domClass.add(toolsMenu.tools.xmlEditor.domNode, 'xmlEditorMenuItem');

            var browseBox = new BrowsePopup();
            browseBox.startup();

            //Toolbar Layout
            var toolbarLayout = {
                appButton: {
                    type: 'dijit/form/DropDownButton',
                    label: 'Quippe',
                    iconClass: 'quippe',
                    showLabel: false,
                    dropDown: appMenu
                },

                searchBox: {
                    widget: core.createSearchBox(),
                    placeHolder: core.getI18n("search")
                },

                browseButton: {
                    type: 'dijit/form/DropDownButton',
                    label: core.getI18n("browse"),
                    iconClass: "text_tree",
                    showLabel: true,
                    dropDown: browseBox
                },

                promptButton: {
                    type: 'dijit/form/ComboButton',
                    label: core.getI18n("prompt") + " <sub>" + (core.settings.listSize || '') + "</sub>",
                    iconClass: "view",
                    showLabel: true,
                    dropDown: promptMenu
                },

                sep1: {},

                viewButton: {
                    type: 'dijit/form/DropDownButton',
                    label: core.getI18n("view"),
                    iconClass: "photographic_filter",
                    showLabel: true,
                    dropDown: viewMenu
                },

                toolsButton: {
                    type: 'dijit/form/DropDownButton',
                    label: core.getI18n("tools"),
                    iconClass: "window_dialog",
                    showLabel: true,
                    dropDown: toolsMenu
                }
            };

            var toolbar = ToolbarBuilder.buildToolbar(toolbarLayout, this.toolbar, 24);
            this._mruUpdateMenu();

            aspect.after(toolbar.tools.browseButton, 'openDropDown', lang.hitch(browseBox, browseBox.onShow), true);
            return toolbar;
        },

        reset: function() {
            topic.publish('/qc/ChartReview/Hide');
            if (this.editor) {
                this.editor.clear();
            };
            query('#DocumentStyleSheet').forEach(domConstruct.destroy);
            this.saveParms = null;
        },

        onFileNew: function(settings) {
            if (core.settings.useDesignTemplates) {
                return this.onFileNew_new(settings);
            }
            else {
                return this.onFileNew_old(settings);
            };
        },

        onFileNew_old: function(settings) {
            this.reset();
            settings = settings || {};
            if (settings.templateId) {
                when(this.editor.loadDocumentTemplate(settings.templateId), function() {
                    topic.publish('/qc/SetView', 'design');
                });
            }
            else {
                this.editor.loadXml(XmlUtil.createDocument('<Document></Document>'));
                topic.publish('/qc/SetView', 'design');
            };
        },

        onFileNew_new: function() {
            core.doDialog(NewContentDialog, null, function(dialog) {
                this.doFileNew(dialog.get('settings'));
            }, null, this);
        },

        doFileNew: function(settings) {
            this.reset();

            if (!settings) {
                settings = {
                    name: 'Document Template',
                    typeName: 'template',
                    sourceXML: '<Document></Document>'
                };
            };

            var xml = settings.sourceNode
                ? XmlUtil.selectChildElement(settings.sourceNode)
                : settings.sourceXML
                ? XmlUtil.createDocument(settings.sourceXML)
                : XmlUtil.createDocument('<Document></Document>').documentElement;

            if (settings.typeName) {
                this.saveParms = { type: settings.typeName };
                this.workspace.setEditorTabTitle(StringUtil.toCamelUpper(settings.typeName));
            };

            if (this.dataSheet) {
                this.hideListEditor();
            }

            this.editor.loadXml(xml);

            if (settings.typeName == 'list') {
                this.initializeListEditor();
                this.showListEditor();
            }

            else {
                this.removeListEditor();
            }

            topic.publish('/qc/SetView', 'design');
        },

        initializeListEditor: function() {
            var css = '';
            css += '<style type="text/css" id="DocumentStyleSheet">\n';
            css += '.documentContent>.finding { display: block !important; }\n';
            css += '.documentContent>.finding.contextStart { display: inline-block !important; }\n';
            css += '.documentContent>.finding.inContext { display: inline-block !important; }\n';
            css += '.centered { text-align: center !important }\n';
            css += '.textValue input[readonly=readonly] { color: #757575; background-color: #EFEFEF; }\n';
            css += '.textValue.disabled { background-color: #EFEFEF; }\n';
            css += '.qcDataSheet .dijitComboBox { width: 150px }\n';
            css += '.resultValue .dijitComboBox, .unitValue .dijitComboBox { width: 90px !important }\n';
            css += '</style>\n';

            domConstruct.place(css, document.getElementsByTagName('head')[0]);

            array.forEach(this.viewMenu.getChildren(), function(item) {
                if (item.label && item.label != 'Code Review' && item.label != 'List Items Grid' && item.label != 'List Items') {
                    domStyle.set(item.domNode, 'display', 'none');
                }
            });

            if (!this.listItemsGridItem) {
                this.listItemsGridItem = new CheckedMenuItem({
                    label: "List Items Grid",
                    iconClass: "",
                    showLabel: false,
                    checked: false,
                    onClick: lang.hitch(this, this.showListEditor)
                });

                this.viewMenu.addChild(this.listItemsGridItem, 0);
            }

            if (!this.listItemsItem) {
                this.listItemsItem = new CheckedMenuItem({
                    label: "List Items",
                    iconClass: "",
                    showLabel: false,
                    checked: true,
                    onClick: lang.hitch(this, this.hideListEditor)
                });

                this.viewMenu.addChild(this.listItemsItem, 0);
            }

            this.dataSheet = new DataSheet();
            this.dataSheet.placeAt(this.workspace.tabs["noteEditor"].tabPage.domNode, "first");
            this.dataSheet.startup();
            this.dataSheet.onSortExchange = lang.hitch(this, this.listEditorSortExchange);

            domStyle.set(this.dataSheet.domNode, "display", "none");

            aspect.after(this.dataSheet, "onCellValueChanged", lang.hitch(this, this.listEditorItemValueChanged), true);
            aspect.after(this.dataSheet, "addRow", lang.hitch(this, this.listEditorRowAdded), true);
            aspect.after(this.dataSheet, "deleteRow", lang.hitch(this, this.listEditorRowDeleted), true);

            this.dataSheetGetContextActions = lang.hitch(this.dataSheet, this.dataSheet.getContextActions);
            this.dataSheet.getContextActions = lang.hitch(this, this.listEditorGetContextActions);
        },

        listEditorSortExchange: function(i, j) {
            var iItem = this.listEditorFindingWidgets[i - 1];
            var jItem = this.listEditorFindingWidgets[j - 1];
            var container = iItem.domNode.parentNode;

            this.listEditorFindingWidgets.splice(i - 1, 1, jItem);
            this.listEditorFindingWidgets.splice(j - 1, 1, iItem);

            if (i < j) {
                container.replaceChild(jItem.domNode, iItem.domNode);

                if (j < container.childNodes.length) {
                    container.insertBefore(iItem.domNode, container.childNodes[j - 1]);
                }

                else {
                    container.appendChild(iItem.domNode);
                }
            }

            else {
                container.replaceChild(iItem.domNode, jItem.domNode);

                if (i < container.childNodes.length) {
                    container.insertBefore(jItem.domNode, container.childNodes[i - 1]);
                }

                else {
                    container.appendChild(jItem.domNode);
                }
            }
        },

        listEditorItemValueChanged: function (cellInfo, value) {
            if (!this.listEditorFindingWidgets[cellInfo.r -1]) {
                var newFinding = new FindingLabel();
                core.getNoteEditor().note.addElement(newFinding);
                this.listEditorFindingWidgets.push(newFinding);
            }

            this.listEditorFindingWidgets[cellInfo.r - 1].set(cellInfo.colDef.propertyName, value);

            if (cellInfo.colDef.propertyName == 'medcinId') {
                var self = this;

                when(this.listEditorFindingWidgets[cellInfo.r - 1].resolveTerm(), function() {
                    self.dataSheet.setCellValue(self.dataSheet.table.rows[cellInfo.r].cells[4], self.listEditorFindingWidgets[cellInfo.r - 1].get('text'));
                    self.dataSheet.setCellValue(self.dataSheet.table.rows[cellInfo.r].cells[2], self.listEditorFindingWidgets[cellInfo.r -1].get('nodeKey'));
                });

                this.dataSheet.getCellWidget(self.dataSheet.table.rows[cellInfo.r].cells[5]).store = new DataStore({
                    store: new EnumDataStore('Medcin/Enums/Prefix?OrderBy=2&MedcinId=' + value, true)
                });

                this.dataSheet.getCellWidget(self.dataSheet.table.rows[cellInfo.r].cells[6]).store = new DataStore({
                    store: new EnumDataStore('Medcin/Enums/Modifier?OrderBy=2&MedcinId=' + value, true)
                });

                this.dataSheet.getCellWidget(self.dataSheet.table.rows[cellInfo.r].cells[7]).store = new DataStore({
                    store: new EnumDataStore('Medcin/Enums/Status?OrderBy=2&MedcinId=' + value, true)
                });

                this.dataSheet.getCellWidget(self.dataSheet.table.rows[cellInfo.r].cells[10]).store = new DataStore({
                    store: new EnumDataStore('Medcin/Enums/Units?OrderBy=2&MedcinId=' +value, true)
                    });
            }

            else {
                if (cellInfo.colDef.propertyName == 'overrideTranscription') {
                    if (value) {
                        domAttr.remove(this.dataSheet.table.rows[cellInfo.r].cells[4].childNodes[0], "readonly");
                        domClass.remove(this.dataSheet.table.rows[cellInfo.r].cells[4], "disabled");
                    }

                    else {
                        domAttr.set(this.dataSheet.table.rows[cellInfo.r].cells[4].childNodes[0], "readonly", "readonly");
                        domClass.add(this.dataSheet.table.rows[cellInfo.r].cells[4], "disabled");
                    }
                }

                if (cellInfo.colDef.propertyName == 'unit' && !this.dataSheet.getCellWidget(this.dataSheet.table.rows[cellInfo.r].cells[cellInfo.c]).store) {
                    this.dataSheet.getCellWidget(this.dataSheet.table.rows[cellInfo.r].cells[cellInfo.c]).store = new DataStore({
                        store: new EnumDataStore('Medcin/Enums/Units?OrderBy=2&MedcinId=' + value, true)
                    });
                }

                this.listEditorFindingWidgets[cellInfo.r - 1].updateTranscription();
                this.dataSheet.setCellValue(this.dataSheet.table.rows[cellInfo.r].cells[4], this.listEditorFindingWidgets[cellInfo.r - 1].get('text'));
            }
        },

        listEditorRowAdded: function (data, rowClass, rowIndex) {
            if (data && data.widget) {
                if (rowIndex != undefined) {
                    this.listEditorFindingWidgets.splice(rowIndex, 0, data.widget);
                }

                else {
                    this.listEditorFindingWidgets.push(data.widget);
                }

                if (data.widget.medcinId) {
                    rowIndex = rowIndex || (this.dataSheet.table.rows.length - 1);

                    this.dataSheet.getCellWidget(this.dataSheet.table.rows[rowIndex].cells[5]).store = new DataStore({
                        store: new EnumDataStore('Medcin/Enums/Prefix?OrderBy=2&MedcinId=' + data.widget.medcinId, true)
                    });

                    this.dataSheet.getCellWidget(this.dataSheet.table.rows[rowIndex].cells[6]).store = new DataStore({
                        store: new EnumDataStore('Medcin/Enums/Modifier?OrderBy=2&MedcinId=' + data.widget.medcinId, true)
                    });

                    this.dataSheet.getCellWidget(this.dataSheet.table.rows[rowIndex].cells[7]).store = new DataStore({
                        store: new EnumDataStore('Medcin/Enums/Status?OrderBy=2&MedcinId=' + data.widget.medcinId, true)
                    });

                    this.dataSheet.getCellWidget(this.dataSheet.table.rows[rowIndex].cells[10]).store = new DataStore({
                        store: new EnumDataStore('Medcin/Enums/Units?OrderBy=2&MedcinId=' + data.widget.medcinId, true)
                    });
                }
            }
        },

        listEditorRowDeleted: function (row) {
            var finding = this.listEditorFindingWidgets[row - 1].toFinding();

            finding.node = this.listEditorFindingWidgets[row - 1].domNode;
            topic.publish('/qc/DeleteFinding', finding);

            this.listEditorFindingWidgets.splice(row - 1, 1);
        },

        listEditorGetContextActions: function (item, widget, targetNode) {
            var actions = this.dataSheetGetContextActions(item, widget, targetNode);

            if (actions.length > 0) {
                var info = this.dataSheet.getCellInfo(targetNode);

                actions.push({
                    label: core.getI18n("details") + '...',
                    icon: 'form_blue',
                    onClick: lang.hitch(this, function () {
                        var finding = this.listEditorFindingWidgets[info.r - 1].toFinding();
                        finding.node = this.listEditorFindingWidgets[info.r - 1].domNode;

                        if (this.findingDetailsUpdatedSubscription) {
                            this.findingDetailsUpdatedSubscription.remove();
                            this.findingDetailsUpdatedSubscription = null;
                        }

                        this.findingDetailsUpdatedSubscription = topic.subscribe('/qc/FindingDetailsUpdated', lang.hitch(this, function(updatedFinding) {
                            this.findingDetailsUpdatedSubscription.remove();
                            this.findingDetailsUpdatedSubscription = null;

                            for (var i = 1; i < this.dataSheet.columns.length; i++) {
                                this.dataSheet.setCellValue(this.dataSheet.table.rows[info.r].cells[i + 1], updatedFinding.get(this.dataSheet.columns[i].propertyName));
                            }
                        }));

                        topic.publish('/qc/EditFindingDetails', finding);
                    })
                });
            }

            return actions;
        },

        hideListEditor: function () {
            this.viewMenu.getChildren()[0].set('checked', true);
            this.viewMenu.getChildren()[1].set('checked', false);

            domStyle.set(this.dataSheet.domNode, 'display', 'none');
            domStyle.set(core.getNoteEditor().domNode, 'display', 'block');

            var splitter = query(".mainContent").map(registry.byNode)[0].getSplitter('right');

            if (splitter) {
                splitter.expand();
                domStyle.set(splitter.splitButton, 'display', '');
            }

            core.getNoteEditor().forceSuppressSelection = false;

            if (this.findingAddedSubscription) {
                this.findingAddedSubscription.remove();
                this.findingAddedSubscription = null;
            }

            if (this.listAddedSubscription) {
                this.listAddedSubscription.remove();
                this.listAddedSubscription = null;
            }
        },

        showListEditor: function() {
            this.viewMenu.getChildren()[0].set('checked', false);
            this.viewMenu.getChildren()[1].set('checked', true);

            domStyle.set(this.dataSheet.domNode, 'display', 'block');
            domStyle.set(core.getNoteEditor().domNode, 'display', 'none');

            var splitter = query(".mainContent").map(registry.byNode)[0].getSplitter('right');

            if (splitter) {
                splitter.collapse();
                domStyle.set(splitter.splitButton, 'display', 'none');
            }

            core.getNoteEditor().forceSuppressSelection = true;

            var findingWidgets = query('.finding', this.editor.domNode).map(registry.byNode);
            var findings = [];
            var self = this;

            for (var i = 0; i < findingWidgets.length; i++) {
                if (!findingWidgets[i].get('medcinId')) {
                    findingWidgets[i].set('medcinId', '0');
                }

                var finding = findingWidgets[i].toFinding();
                finding.widget = findingWidgets[i];

                findings.push(finding);
            }

            this.listEditorFindingWidgets = [];

            this.dataSheet.load([
                {
                    caption: 'MEDCIN ID',
                    propertyName: 'medcinId',
                    defaultValue: '',
                    style: {
                        width: "100px"
                    },
                    multiLine: false,
                    sortable: true,
                    getCellValue: lang.hitch(this, function(index) {
                        return this.dataSheet.table.rows[index].cells[1].childNodes[0].value ? parseInt(this.dataSheet.table.rows[index].cells[1].childNodes[0].value) : 0;
                    })
                },
                {
                    caption: 'Node Key',
                    propertyName: 'nodeKey',
                    style: {
                        width: "150px"
                    },
                    multiLine: false,
                    readOnly: true,
                    sortable: true
                },
                {
                    caption: 'Override Transcription',
                    propertyName: 'overrideTranscription',
                    defaultValue: false,
                    styleClass: 'centered',
                    style: {
                        width: "80px"
                    },
                    multiLine: false,
                    widgetType: 'dijit/form/CheckBox',
                    constructor: function(widget, settings) {
                        var widgetInstance = new widget(settings);
                        var originalSetValueAttr = lang.hitch(widgetInstance, widgetInstance._setValueAttr);

                        widgetInstance._setValueAttr = function(newValue, priorityChange) {
                            originalSetValueAttr(newValue == true || newValue == "true", priorityChange);
                        }

                        on(widgetInstance, "change", function(newValue) {
                            var cellInfo = self.dataSheet.getCellInfo(widgetInstance.domNode);

                            if (!self.listEditorFindingWidgets[cellInfo.r - 1]) {
                                return;
                            }

                            self.listEditorFindingWidgets[cellInfo.r - 1].set("overrideTranscription", newValue);
                            self.dataSheet.onCellValueChanged(cellInfo, newValue);
                        });

                        return widgetInstance;
                    },
                    settings: {
                    
                    }
                },
                {
                    caption: 'Text',
                    propertyName: 'text',
                    defaultValue: '',
                    multiLine: false,
                    styleClass: 'textValue disabled',
                    readOnly: true,
                    sortable: true
                },
                {
                    caption: 'Prefix',
                    propertyName: 'prefix',
                    defaultValue: '',
                    style: {
                        width: "150px"
                    },
                    widgetType: 'qc/FilteringSelect',
                    constructor: function(widget, settings) {
                        var widgetInstance = new widget(settings);

                        on(widgetInstance, "change", function(newValue) {
                            var cellInfo = self.dataSheet.getCellInfo(widgetInstance.domNode);

                            if (!self.listEditorFindingWidgets[cellInfo.r -1]) {
                                return;
                            }

                            self.listEditorFindingWidgets[cellInfo.r -1].set("prefix", newValue);
                            self.dataSheet.onCellValueChanged(cellInfo, newValue);
                        });

                        return widgetInstance;
                    },
                    settings: {
                        searchAttr: 'description',
                        intermediateChanges: true,
                        store: new DataStore({
                            store: new EnumDataStore('Medcin/Enums/Prefix?OrderBy=2', true)
                        })
                    }
                },
                {
                    caption: 'Modifier',
                    propertyName: 'modifier',
                    defaultValue: '',
                    style: {
                        width: "150px"
                    },
                    widgetType: 'qc/FilteringSelect',
                        constructor: function(widget, settings) {
                        var widgetInstance = new widget(settings);

                        on(widgetInstance, "change", function(newValue) {
                            var cellInfo = self.dataSheet.getCellInfo(widgetInstance.domNode);

                            if (!self.listEditorFindingWidgets[cellInfo.r -1]) {
                                return;
                            }

                            self.listEditorFindingWidgets[cellInfo.r -1].set("modifier", newValue);
                            self.dataSheet.onCellValueChanged(cellInfo, newValue);
                        });

                        return widgetInstance;
                    },
                    settings: {
                        searchAttr: 'description',
                        intermediateChanges: true,
                        store: new DataStore({
                            store: new EnumDataStore('Medcin/Enums/Modifier?OrderBy=2', true)
                        })
                    }
                },
                {
                    caption: 'Status',
                    propertyName: 'status',
                    defaultValue: '',
                    style: {
                        width: "150px"
                    },
                    widgetType: 'qc/FilteringSelect',
                    constructor: function(widget, settings) {
                        var widgetInstance = new widget(settings);

                        on(widgetInstance, "change", function(newValue) {
                            var cellInfo = self.dataSheet.getCellInfo(widgetInstance.domNode);

                            if (!self.listEditorFindingWidgets[cellInfo.r -1]) {
                                return;
                            }

                            self.listEditorFindingWidgets[cellInfo.r -1].set("status", newValue);
                            self.dataSheet.onCellValueChanged(cellInfo, newValue);
                        });

                        return widgetInstance;
                    },
                    settings: {
                        searchAttr: 'description',
                        intermediateChanges: true,
                        store: new DataStore({
                            store: new EnumDataStore('Medcin/Enums/Status?OrderBy=2', true)
                        })
                    }
                },
                {
                    caption: 'Result',
                    propertyName: 'result',
                    defaultValue: '',
                    styleClass: 'resultValue',
                    style: {
                        width: "90px"
                    },
                    widgetType: 'qc/FilteringSelect',
                    constructor: function (widget, settings) {
                        var widgetInstance = new widget(settings);

                        on(widgetInstance, "change", function (newValue) {
                            var cellInfo = self.dataSheet.getCellInfo(widgetInstance.domNode);

                            if (!self.listEditorFindingWidgets[cellInfo.r - 1]) {
                                return;
                            }

                            self.listEditorFindingWidgets[cellInfo.r - 1].set("result", newValue);
                            self.dataSheet.onCellValueChanged(cellInfo, newValue);
                        });

                        return widgetInstance;
                    },
                    settings: {
                        searchAttr: 'text',
                        intermediateChanges: true,
                        store: new SettingsEnumStore('[;A=abnormal;N=normal]', true)
                    }
                },
                {
                    caption: 'Value',
                    propertyName: 'value',
                    defaultValue: '',
                    style: {
                        width: "80px"
                    },
                    multiLine: false
                },
                {
                    caption: 'Unit',
                    propertyName: 'unit',
                    defaultValue: '',
                    styleClass: 'unitValue',
                    style: {
                        width: "90px"
                    },
                    widgetType: 'dijit/form/ComboBox',
                    constructor: function (widget, settings, data) {
                        settings.store = new SettingsEnumStore("[" + data.unit + "]", true);

                        var widgetInstance = new widget(settings);

                        on(widgetInstance, "change", function (newValue) {
                            var cellInfo = self.dataSheet.getCellInfo(widgetInstance.domNode);

                            if (!self.listEditorFindingWidgets[cellInfo.r - 1]) {
                                return;
                            }

                            self.listEditorFindingWidgets[cellInfo.r - 1].set("unit", newValue);
                            self.dataSheet.onCellValueChanged(cellInfo, newValue);
                        });

                        return widgetInstance;
                    },
                    settings: {
                        searchAttr: 'description',
                        intermediateChanges: true
                    }
                }
            ], findings);

            var originalOnCellValueChanged = this.dataSheet.onCellValueChanged;

            this.dataSheet.onCellValueChanged = function(cellInfo, value) {
                originalOnCellValueChanged(cellInfo, value);

                if (cellInfo.c == 1 && (value == '' || value == '0')) {
                    if (value == '') {
                        self.dataSheet.setCellValue(cellInfo.cell, '0');
                    }

                    self.dataSheet.setCellValue(self.dataSheet.table.rows[cellInfo.r].cells[2], '');
                    self.dataSheet.setCellValue(self.dataSheet.table.rows[cellInfo.r].cells[3], true);
                }
            };

            this.findingAddedSubscription = topic.subscribe('/noteEditor/findingAdded', lang.hitch(this, this.listEditorFindingAdded));
            this.listAddedSubscription = topic.subscribe('/noteEditor/listAdded', lang.hitch(this, this.listEditorListAdded));
        },

        getMatchWidgetCallback: function(item) {
            return function(findingWidget) {
                return item.medcinId == findingWidget.medcinId && ((!item.prefix && !findingWidget.get('prefix')) || item.prefix == findingWidget.get('prefix'));
            }
        },

        listEditorListAdded: function (list) {
            var findingWidgets = query('.' + list.className, this.editor.domNode).map(registry.byNode);
            var scrollToWidget = null;

            array.forEach(list.item, lang.hitch(this, function(item) {
                if (!array.some(this.listEditorFindingWidgets, this.getMatchWidgetCallback(item))) {
                    var findingWidget = array.filter(findingWidgets, this.getMatchWidgetCallback(item))[0];
                    this.listEditorFindingAdded(findingWidget, true, true);

                    if (!scrollToWidget) {
                        scrollToWidget = findingWidget;
                    }
                }
            }));

            this.dataSheet.reSort();
        },

        listEditorFindingAdded: function(findingWidget, suppressScrollTo, suppressSort) {
            var rowIndex = this.dataSheet.table.rows.length -1;
            var finding = findingWidget.toFinding();

            finding.widget = findingWidget;

            while (rowIndex > 0 && this.dataSheet.isEmptyRow(this.dataSheet.table.rows[rowIndex])) {
                rowIndex--;
            }

            this.dataSheet.addRow(finding, null, rowIndex + 1);

            if (!suppressSort) {
                this.dataSheet.reSort();
            }
        },

        removeListEditor: function () {
            if (this.listItemsItem) {
                this.viewMenu.removeChild(this.listItemsItem);
                this.listItemsItem = null;
            }

            if (this.listItemsGridItem) {
                this.viewMenu.removeChild(this.listItemsGridItem);
                this.listItemsGridItem = null;
            }

            if (this.findingAddedSubscription) {
                this.findingAddedSubscription.remove();
                this.findingAddedSubscription = null;
            }

            if (this.listAddedSubscription) {
                this.listAddedSubscription.remove();
                this.listAddedSubscription = null;
            }

            if (this.findingDetailsUpdatedSubscription) {
                this.findingDetailsUpdatedSubscription.remove();
                this.findingDetailsUpdatedSubscription = null;
            }

            core.getNoteEditor().forceSuppressSelection = false;

            if (this.dataSheet) {
                this.dataSheet.destroyRecursive();
                this.dataSheet = null;
            }

            array.forEach(this.viewMenu.getChildren(), function (item) {
                domStyle.set(item.domNode, 'display', null);
            });
        },
    
        onFileOpen: function () {
            var dlg = new OpenContentDialog({
                attributeFilter: -1,
                typeFilter: [
                    'folder',
                    'library',
                    'template',
                    'list',
                    'element',
                    'form'
                ]
            });

            core.showDialog(dlg, function () {
                this.openContentItem(dlg.get('item'));
            }, null, this);            
        },

        onMRUOpen: function (id) {
            var self = this;
            request.get(core.serviceURL('Quippe/ContentLibrary/Info'), { query: { id: id, dataFormat: 'JSON' }, handleAs: 'json' })
                .then(function (data) {
                    if (data.item) {
                        self.openContentItem(data.item);
                    }
                    else {
                        self._mruRemove(id);
                        core.showError('Item not found, it has been removed from the recent items list');
                    }
                }, core.showError);
        },
    
        openContentItem: function (item) {
            if (!item || !item.id) {
                return;
            };
    
            var self = this;

            if (this.dataSheet) {
                this.hideListEditor();
            }

            if (item.type == 'list') {
                this.reset();
                this.initializeListEditor();

                domStyle.set(core.getNoteEditor().domNode, 'display', 'none');

                this.editor.loadXml(XmlUtil.createDocument('<Document FindingPlacement="1"></Document>'));
                this.editor.addToNote(item).then(function() {
                    self.workspace.setEditorTabTitle(item.text || item.type);
                    topic.publish('/qc/SetView', 'design');
                    self.saveParms = { id: item.id, parentId: item.parentId, name: item.text, type: item.type, keywords: item.keywords, includeDetails: true, includeGrouping: true };
                    self.toolbar.tools.appButton.dropDown.tools.fileSave.set("disabled", !(item.attributes & 2));
                    self._mruAdd(item);

                    self.showListEditor();
                });
            }

            else {
                request(core.serviceURL('Quippe/NoteBuilder/DocumentTemplate'), {
                    query: { id: item.id },
                    handleAs: 'xml'
                }).then(function(data, ioArgs) {
                    var root = data ? data.documentElement : null;
                    if (!root) {
                        core.showError('Error loading content item ' + item.id + ' - Invalid XML document');
                        return;
                    };
                    self.reset();
                    if (root.tagName.toLowerCase() != 'document' && !core.settings.noteElementClasses["qc/note/" + root.tagName]) {
                        if (!root.getAttribute('Type')) {
                            root.setAttribute('Type', 'qc/note/Document');
                            root.setAttribute('_isContentWrapper', 'true');
                        };
                    };
                    self.editor.loadXml(data);
                    self.workspace.setEditorTabTitle(item.text || item.type);
                    topic.publish('/qc/SetView', 'design');
                    self.saveParms = { id: item.id, parentId: item.parentId, name: item.text, type: item.type, keywords: item.keywords };
                    self.toolbar.tools.appButton.dropDown.tools.fileSave.set("disabled", !(item.attributes & 2));
                    self._mruAdd(item);
                    self.removeListEditor();
                }, core.showError);
            }
        },
    
        onFileSave: function () {
            var p = this.saveParms;
            if (p && p.id && p.parentId && p.name && p.type) {
                this.doSave(p);
            }
            else {
                this.onFileSaveAs(p);
            }
        },
    
        onFileSaveAs: function (parms) {
            parms = (parms != null && parms.length > 0 ? parms : null) || this.saveParms || {};
    
            if (!this.editor || !this.editor.note) {
                return;
            };

            var types = [];
            var rootTag = this.editor.note.elementName;
            var defaultType = parms.type || 'element';
            var defaultName = this.editor.note.get('title') || parms.name || this.saveParms ? this.saveParms.name : null;
            var defaultKeywords = parms.keywords || this.saveParms ? this.saveParms.keywords : null;

            if (rootTag == 'Form') {
                types.push({ name: 'form', caption: 'Form' });
                defaultType = 'form';
            }
            else {
                types.push({ name: 'element', caption: 'Note Content' });

                types.push({
                    name: 'template',
                    caption: 'Document Template',
                    options: [{ name: 'makeDefault', caption: 'Make this my default template' }]
                });

                types.push({
                    name: 'list',
                    caption: 'Finding List',
                    options: [
                            { name: 'includeDetails', caption: 'Include entry details' },
                            { name: 'includeGrouping', caption: 'Include section/group placement' }
                    ]
                });
            };

    
            core.doDialog(SaveContentDialog, {
                autoReset: false,
                types: types,
                defaultType: defaultType,
                name: defaultName,
                keywords: defaultKeywords,
                callback: lang.hitch(this, this.doSave)
            });
        },
    
        doSave: function (parms) {
            var self = this;
            var def = null;
            switch (parms.type) {
                case "list":
                    def = this.editor.saveList(parms);
                    break;
                case "template":
                    def = this.editor.saveTemplate(parms);
                    break;
                case "form":
                    def = this.editor.saveTemplate(parms);
                    break;
                case "element":
                    def = this.editor.saveAsNoteContent(parms);
                    break;
                default:
                    throw "Unknown content type"
            };
    
            if (def) {
                when(def, function (item) {
                    if (item) {
                        if (!item.name && item.text) {
                            item.name = item.text;
                        };
                        self.saveParms = item;
                        self.toolbar.tools.appButton.dropDown.tools.fileSave.set("disabled", false);
                        self._mruAdd(item);
                        self.workspace.setEditorTabTitle(item.name);
                    };
                });
            };
            //this.saveParms = parms;
        },
    
        onFileExit: function () {
            window.close();
        },

        _mruUpdateMenu: function () {
            if (!this.toolbar) {
                return;
            };

            var recentItemsButton = this.toolbar.tools.appButton.dropDown.tools.recentItems;
            var menu = recentItemsButton.get('popup');
            if (menu) {
                menu.getChildren().forEach(function (child) {
                    menu.removeChild(child);
                    child.destroyRecursive();
                });
            };

            var list = this.mruList || [];
            var menuData = {};
            list.forEach(function (item, i) {
                menuData['Item' + i] = { label: item.text, topic: '/quippe/designer/mruOpen', topicArgs: item.id, icon: core.getItemIcon(item) };
            });

            menu = ToolbarBuilder.buildMenu(menuData, null, 16);
            recentItemsButton.set('popup', menu);
            recentItemsButton.set('disabled', list.length == 0);
        },

        _mruAdd: function (item) {
            if (!item) {
                return;
            };
            this.mruList = this.mruList || [];
            var list = [item].concat(this.mruList.filter(function (x) { return x.id != item.id }));
            var maxLength = core.settings.designerMRUMaxLength || 5;
            while (list.length > maxLength) {
                list.pop();
            };
            this.mruList = list;
            this._mruSave();
        },

        _mruRemove: function (id) {
            this.mruList = (this.mruList || []).filter(function (x) { return x.id != id });
            this._mruSave();
        },
        
        _mruSave: function () {
            var s = this.mruList && this.mruList.length > 0 ? '[' + this.mruList.map(function (x) { return JSON.stringify({ id: x.id, text: x.text, type: x.type }) }).join(',') + ']' : '';
            if (s != core.settings.designerMRUItems) {
                core.settings.designerMRUItems = s;
                request.post(core.serviceURL('Quippe/UserSettings/Data'), { data: { designerMRUItems: s } });
            };
            this._mruUpdateMenu();
        },

        editTestData: function () {
            core.doDialog(TestDataDialog);
        }
    });
});