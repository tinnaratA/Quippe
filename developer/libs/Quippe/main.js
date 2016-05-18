//define([
//    "dojo/_base/declare",
//    "dijit/_WidgetBase",
//    "dijit/_TemplatedMixin",
//    "dijit/_Container",
//    "qc/_core",
//    "dojo/_base/array",
//    "dojo/dom",
//    "dojo/dom-class",
//    "dojo/dom-construct",
//    "dojo/_base/kernel",
//    "dojo/_base/lang",
//    "dojo/on",
//    "dojo/query",
//    "dojo/ready",
//    "dijit/registry",
//    "dojo/request",
//    "dojo/topic",
//    "dojo/when",
//    // "dojo/_base/window",
//    "dijit/layout/BorderContainer",
//    "dijit/layout/ContentPane",
//    "dijit/Toolbar",
//    "dijit/ToolbarSeparator",
//    "qc/Workspace",
//    "qc/TaskBar",
//    "qc/PatientTaskPane",
//    "qc/SourcesPane", 
//    "qc/OrdersPane", 
//    "qc/Coding/CodingTaskPaneICD10", 
//    "qc/FavoritesPane", 
//    "qc/drawing/Toolbox", 
//    "qc/design/Toolbox", 
//    "qc/design/ElementInspector",
//    "qc/DndManager",
//    "qc/ContextMenu",
//    "qc/BrowsePopup",
//    "qc/MenuItem",
//    "dijit/Menu",
//    "qc/CheckedMenuItem",
//    "qc/SearchBox",
//    "dijit/MenuSeparator",
//    "dijit/PopupMenuItem",
//    "dijit/form/DropDownButton",
//    "dijit/form/ComboButton",
//    "qc/Dialog",
//    "qc/_EnumManager",
//	"qc/CollapsibleSplitter"
//], function (declare, _WidgetBase, _TemplatedMixin, _Container, core, array, dom, domClass, domConstruct, kernel, lang, on, query, ready, registry, request, topic, when, /* window, */ BorderContainer, ContentPane, Toolbar, ToolbarSeparator, Workspace, TaskBar, PatientTaskPane, SourcesPane, OrdersPane, CodingTaskPaneICD10, FavoritesPane, DrawingToolbox, DesignToolbox, ElementInspector, DndManager, ContextMenu, BrowsePopup, MenuItem, Menu, CheckedMenuItem, SearchBox, MenuSeparator, PopupMenuItem, DropDownButton, ComboButton, Dialog, EnumManager, CollapsibleSplitter) {
//    return declare("Quippe.main", [_WidgetBase, _TemplatedMixin, _Container], {

//        templateString: '<div class="quippeApp qcContextMenuContainer"></div>',

//        toolbar: null,
//        workspace: null,
//        contextMenu: null,
//        themes: ['standard', 'plain', 'inlineGroups'],
//        defaultTheme: 'standard',
//        loginPage: "login.aspx",
//        dialogs: null,
//        simulateTouchPad: false,

//        init: function () {
//            this.startup();
//            core.app = this;
//            var self = this;

//            return when(self._loadAppSettings(), function (settings) {
//                self._initSettings(settings);
//                self._initIcons();
//                self._initPageLayout(self.domNode);

//                self._initDragAndDrop()
//                self._initSubscriptions();
//                self._initContextMenus()
//                self._initDialogs()
//                self._initEnums();

//                if (core.util.isTouchDevice()) {
//                    domClass.add(self.domNode, 'tablet');
//                    on(window, 'orientationchange', self, self.onOrientationChange);
//                    self.onOrientationChange();
//                };

//                return true;
//            });

//        },

//        onOrientationChange: function () {
//            window.scrollTo(0, 0);
//            var showLabel = window.orientation == 0 || window.orientation == 180 ? false : true;
//            var width = window.innerWidth;
//            array.forEach(this.toolbar.getChildren(), function (tool) {
//                if (tool.minWidthForLabel) {
//                    tool.set('showLabel', tool.minWidthForLabel <= width);
//                };
//            });
//        },

//        _loadAppSettings: function (baseSettings) {
//            var self = this;
//            var settings = baseSettings || {};

//            return when(self._getUserSettings(), function (userSettings) {
//                for (var p in userSettings) {
//                    if (!settings[p]) {
//                        settings[p] = userSettings[p];
//                    };
//                };
//                return when(self._getServices(), function (services) {
//                    settings.services = services;
//                    return when(self._getRoles(settings.userRoles), function (roles) {
//                        settings.userRoles = roles;
//                        return when(self._loadExtensions(settings), function () {
//                            return settings;
//                        });
//                    });
//                });
//            });
//        },

//        _initSettings: function (settings) {
//            var userSettings = settings || {};

//            core.settings.culture = kernel.locale.length == 5 ? kernel.locale.substr(0, 3) + kernel.locale.substr(3, 2).toUpperCase() : userSettings.culture || 'en-US';

//            core.settings.listSize = userSettings.defaultListSize || 2;
//            core.settings.dictationStyle = 2;
//            core.settings.defaultNoteTemplate = userSettings.defaultNoteTemplate || "shared:CLINITALKDEFAULT";

//            core.settings.features.drawing = core.util.supportsCanvas();
//            core.settings.features.touchPad = core.settings.features.drawing && core.util.isTouchDevice();
//            core.settings.features.simulateTouchPad = userSettings.simulateTouchPad || false;
//            core.settings.selectBeforeDrag = userSettings.selectBeforeDrag || core.util.isIOS7();

//            for (var p in userSettings) {
//                core.settings[p] = userSettings[p];
//            };

//            //TODO: Check server licensing for features
//            core.settings.features.Nursing = true;
//            core.settings.features.EM = true;
//            core.settings.features.Flowsheet = true;
//            core.settings.features.Coding = core.settings.codingServiceEnabled || false;


//            if (array.indexOf(settings.services, 'Quippe.IPatientHistoryService') < 0) {
//                core.settings.features.Flowsheet = false;
//            };

//            if (array.indexOf(settings.services, 'Quippe.IPhraseEditorService') < 0) {
//                core.settings.phrasingAllowEdit = false;
//            };

//            if (core.settings.features.Coding && array.indexOf(settings.services, 'Quippe.Coding.ICodeMappingService') >= 0) {
//	            require(["qc/coding/CodingManager"], function (CodingManager) {
//                    CodingManager.startup();
//                });
                
//            }
//            else {
//                core.settings.features.Coding = false;
//            };

//            if (this.pageSettings) {
//                for (var p in this.pageSettings) {
//                    core.settings[p] = this.pageSettings[p];
//                };
//            };
//            // customFindingAttributes is a list of additional attribtues
//            // that will be serialized for each finding when saving the encounter xml
//            // The following example will look for an "orderId" attribute on any finding
//            // and write it to the <Finding> element as an @OrderId attribute.  If tagName
//            // is not specified, the name field will be converted to UpperCamelCase and used
//            // Null values or values that match the specified defaultValue will not be serialized.
//            //
//            //  this.customFindingAttributes = [
//            //      {name: 'orderId', type: 'integer', tagName: 'OrderId', defaultValue: null}
//            //  ];
//        },


//        _initIcons: function () {
//            this.iconMap = {
//                'app': 'quippe',
//                'container': 'folder',
//                'edit': 'pencil',
//                'element': 'document_into',
//                'favorites': 'star_yellow_add',
//                'folder': 'folder',
//                'guideline': 'document',
//                'image': 'pencil',
//                'library': 'book_blue',
//                'list': 'document_preferences',
//                'list_prompt': 'view',
//                'list_rnprompt': 'rnprompt',
//                'list_taggedtext': 'signal_flag_red',
//                'list_template': 'document_preferences',
//                'macro': 'document',
//                'mouse': 'mouse',
//                'note': 'document',
//                'pen': 'ballpen_blue',
//                'reference': 'document',
//                'template': 'document',
//                'theme': 'document',
//                'viewmode': 'photographic_filter'
//            };
//        },

//        _initPageLayout: function (rootNode) {
//            var mainFrame = new BorderContainer({ design: "headline", gutters: false, liveSplitters: false });
//            domClass.add(mainFrame.domNode, "mainFrame");
//            mainFrame.placeAt(rootNode);
//            core.setSelectable(mainFrame.domNode, false);

//            var toolbarPane = new ContentPane({ splitter: false, region: "top" });
//            domClass.add(toolbarPane.domNode, "toolBarPane");
//            mainFrame.addChild(toolbarPane);

//            this.toolbar = new Toolbar();
//            this.toolbar.placeAt(toolbarPane.domNode);
//            this._initToolbar();

//            //TODO: need to look in BorderContainer at _splitterClass and refactor this...
//            var splitterClass = core.settings.taskBarCollapsible ? CollapsibleSplitter : BorderContainer._Splitter;
//            var mainContent = new BorderContainer({ design: "sidebar", gutters: false, liveSplitters: true, region: "center", _splitterClass: splitterClass });
//            domClass.add(mainContent.domNode, "mainContent");
//            mainContent.placeAt(mainFrame.domNode);
//            core.setSelectable(mainContent.domNode, false);;

//            this.workspace = new Workspace({ region: "center", splitter: "false" });
//            this.workspace.placeAt(mainContent.domNode);
//            this.workspace.startup();

//            var taskPane = new TaskBar({ splitter: true, region: "right" });
//            domClass.add(taskPane.domNode, "taskPane");
//            mainContent.addChild(taskPane);

//            var tpPatient = new PatientTaskPane();
//            tpPatient.keepOpen = true;
//            taskPane.addChild(tpPatient);

//            var tpSources = new SourcesPane();
//            taskPane.addChild(tpSources);

//            var tpOrders = new OrdersPane();
//            taskPane.addChild(tpOrders);

//            if (core.settings.features.Coding) {
//                var tpICD10 = new CodingTaskPaneICD10();
//                taskPane.addChild(tpICD10);
//            };

//            var tpFavorites = new FavoritesPane();
//            taskPane.addChild(tpFavorites);

//            var tpDrawingToolbox = new DrawingToolbox();
//            taskPane.addChild(tpDrawingToolbox);

//            if (core.settings.enableDesignView) {
//                taskPane.addChild(core.createDesignToolbox());
//                taskPane.addChild(core.createElementInspector());
//            };

//            mainFrame.startup();
//        },

//        _initDragAndDrop: function () {
//            var dndManager = new DndManager();
//            dndManager.container = document.body;
//            dndManager.selectBeforeDrag = core.settings.selectBeforeDrag;
//            dndManager.startup();
//        },

//        _initSubscriptions: function () {
//            topic.subscribe("/qc/ShowDialog", lang.hitch(this, this.showDialog));
//            topic.subscribe("/qc/SetSkin", lang.hitch(this, this.setSkin));
//            topic.subscribe("/qc/SetTheme", lang.hitch(this, this.setTheme));
//            topic.subscribe("/qc/NotImplemented", lang.hitch(this, this.showNotImplemented));
//            topic.subscribe("/qc/SetListSize", lang.hitch(this, this.setListSize));
//            topic.subscribe("/qc/LogOff", lang.hitch(this, this.logOff));
//            topic.subscribe("/qc/ViewChanged", lang.hitch(this, this.onViewChanged));
//            topic.subscribe("/qc/InputModeChanged", lang.hitch(this, this.onInputModeChanged));
//            topic.subscribe("/qc/ProcessOrders", lang.hitch(this, this.processOrders));
//            topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onNoteEditorSelectionChanged));
//            topic.subscribe("/qc/ShowMedcinViewer", lang.hitch(this, this.showMedcinViewer));
//        },

//        _initContextMenus: function () {
//            this.contextMenu = new ContextMenu();
//            this.contextMenu.startup();
//        },


//        /* TODO: *dap* I think this should be refactored beyond what I'm about to do...*/
//        _initDialogs: function () {
//            var self = this;
//            require([
//                "qc/NewEncounterDialog2", 
//                "qc/LibraryManagerDialog", 
//                "qc/SaveContentDialog", 
//                "qc/OpenEncounterDialog", 
//                "qc/UserSettingsDialog", 
//                "qc/UserAccountDialog", 
//                "qc/MultiFindingDetailDialog", 
//                "qc/design/MacroEditorDialog", 
//                "qc/PatientEditorDialog"], 
//                function(NewEncounterDialog, LibraryManagerDialog, SaveContentDialog, OpenEncounterDialog, UserSettingsDialog, UserAccountDialog, MultiFindingDetailDialog, MacroEditorDialog, PatientEditorDialog){
//                    self.dialogs = {
//                        newEncounter: { type: NewEncounterDialog },
//                        libraryManager: { type: LibraryManagerDialog },
//                        saveContent: { type: SaveContentDialog },
//                        openEncounter: { type: OpenEncounterDialog },
//                        userSettings: { type: UserSettingsDialog },
//                        userAccount: { type: UserAccountDialog },
//                        multiFindingDetail: { type: MultiFindingDetailDialog },
//                        textMacroEditor: { type: MacroEditorDialog },
//                        patientEditor: { type: PatientEditorDialog }
//            };
//                });

//            this.findingDetailDialogTabs = {};

//            require([
//                "qc/FindingDetailTab",
//                "qc/FindingPhrasingTab"
//            ],
//            function (FindingDetailTab, FindingPhrasingTab) {
//                self.findingDetailDialogTabs.details = { title: core.getI18n('details'), type: FindingDetailTab };
//                self.findingDetailDialogTabs.phrasing = { title: core.getI18n('phrasing'), type: FindingPhrasingTab };
//            });

//            if (core.settings.features.Coding) {
//                require(["qc/coding/FindingCodingTab"], function(FindingCodingTab) { 
//                    self.findingDetailDialogTabs.coding = { title: 'Coding', type: FindingCodingTab };  /* TODO: *dap* this needs i18N */
//                })
//            };
//        },

//        _initToolbar: function () {
//            domClass.add(this.toolbar.domNode, "ic24");
//            var n = 0;
//            var s = null;
//            var label = '';
//            var fn = null;

//            var browseBox = new BrowsePopup();
//            browseBox.startup();

//            var sepStyleMenu = new Menu();
//            sepStyleMenu.addChild(new MenuItem({ label: core.getI18n("none"), onClick: function () { topic.publish("/qc/SetSepStyle", "none") } }));
//            sepStyleMenu.addChild(new MenuItem({ label: core.getI18n("bulletsbefore"), onClick: function () { topic.publish("/qc/SetSepStyle", "bullet") } }));
//            sepStyleMenu.addChild(new MenuItem({ label: core.getI18n("semicolonsafter"), onClick: function () { topic.publish("/qc/SetSepStyle", "semicolon") } }));

//            var toolsMenu = new Menu();
//            toolsMenu.addChild(new MenuItem({
//                label: core.getI18n("contentlibrarymanager"),
//                iconClass: "book_blue",
//                showLabel: true,
//                onClick: function () { topic.publish("/qc/ShowDialog", "libraryManager") }
//            }));

//            var self = this;
//            if (core.settings.features.EM) {
//                toolsMenu.addChild(new MenuItem({
//                    label: core.getI18n("emcalculator"),
//                    iconClass: "calculator",
//                    showLabel: true,
//                    onClick: function () { topic.publish("/qc/ChartReview/OpenView", { id: 'EMAnalysis', title: core.getI18n('emanalysis'), typeName: 'Quippe/EMAnalysis', instanceParms: null, instance: null }) }
//                }));
//            };

//            if (core.settings.enableTextMacros && !core.settings.features.touchPad) {
//                toolsMenu.addChild(new MenuItem({
//                    label: 'Text Macro Editor',
//                    iconClass: 'document',
//                    showLabel: true,
//                    onClick: function () { topic.publish("/qc/ShowDialog", "textMacroEditor", { newMacro: true }) }
//                }));
//            };

//            toolsMenu.addChild(new MenuItem({
//                label: core.getI18n("account"),
//                iconClass: "",
//                showLabel: true,
//                onClick: function () { topic.publish("/qc/ShowDialog", "userAccount") }
//            }));

//            toolsMenu.addChild(new MenuItem({
//                label: core.getI18n("options"),
//                iconClass: "preferences",
//                showLabel: true,
//                onClick: function () { topic.publish("/qc/ShowDialog", "userSettings") }
//            }));

//            if (array.indexOf(core.settings.services, 'Quippe.IPatientEditorService') >= 0) {
//                toolsMenu.addChild(new MenuItem({
//                    label: 'Demo Patient Editor',
//                    iconClass: "form_blue",
//                    showLabel: true,
//                    onClick: function () { topic.publish("/qc/ShowDialog", "patientEditor") }
//                }));
//            };

//            if (array.indexOf(core.settings.userRoles, 'Admin') >= 0) {
//                toolsMenu.addChild(new MenuSeparator());
//                toolsMenu.addChild(new MenuItem({
//                    label: core.getI18n("adminconsole"),
//                    iconClass: "",
//                    showLabel: true,
//                    onClick: function () { window.open('admin', 'QuippeAdminTools'); }
//                }));
//            };

//            if (core.settings.showDeveloperTools) {
//                toolsMenu.addChild(new MenuItem({
//                    label: core.getI18n("medcinviewer"),
//                    iconClass: "",
//                    showLabel: true,
//                    onClick: function () { topic.publish("/qc/ShowMedcinViewer") }
//                }));

//                toolsMenu.addChild(new MenuItem({
//                    label: core.getI18n("webservicetester"),
//                    iconClass: "",
//                    showLabel: true,
//                    onClick: function () { window.open('ServiceTester.htm', 'ServiceTester'); }
//                }));
//            };

//            if (core.settings.enableQuippeDesigner) {
//                toolsMenu.addChild(new MenuItem({
//                    label: 'Quippe Designer',
//                    iconClass: "",
//                    showLabel: true,
//                    onClick: function () { window.open('Designer.htm', 'QuippeDesigner') }
//                }));
//            };

//            toolsMenu.addChild(new MenuSeparator());
//            toolsMenu.addChild(new MenuItem({
//                label: core.getI18n("quippeusersguide"),
//                iconClass: "help2",
//                showLabel: true,
//                onClick: function () { window.open('docs/Quippe User Guide.pdf', 'UserGuide'); }
//            }));

//            toolsMenu.addChild(new MenuItem({
//                label: core.getI18n("aboutquippe"),
//                iconClass: "",
//                showLabel: true,
//                onClick: lang.hitch(this, this.showAboutDialog)
//            }));

//            domClass.add(toolsMenu.domNode, "ic16");

//            var promptMenu = new Menu();
//            promptMenu.addChild(new MenuItem({
//                label: "1: " + core.getI18n("small"),
//                iconClass: "view",
//                showLabel: true,
//                onClick: function (evt) {
//                    if (evt.ctrlKey) {
//                        topic.publish("/qc/SetListSize", [1]);
//                    }
//                    else {
//                        topic.publish("/qc/ChartPrompt", 'IP', 1, true);
//                    };
//                }
//            }));
//            promptMenu.addChild(new MenuItem({
//                label: "2: " + core.getI18n("medium"),
//                iconClass: "view",
//                showLabel: true,
//                onClick: function (evt) {
//                    if (evt.ctrlKey) {
//                        topic.publish("/qc/SetListSize", 2);
//                    }
//                    else {
//                        topic.publish("/qc/ChartPrompt", 'IP', 2, true);
//                    };
//                }
//            }));
//            promptMenu.addChild(new MenuItem({
//                label: "3: " + core.getI18n("large"),
//                iconClass: "view",
//                showLabel: true,
//                onClick: function (evt) {
//                    if (evt.ctrlKey) {
//                        topic.publish("/qc/SetListSize", [3]);
//                    }
//                    else {
//                        topic.publish("/qc/ChartPrompt", ['IP', 3, true]);
//                    };
//                }
//            }));

//            promptMenu.addChild(new MenuSeparator());

//            this.tbDxPrompt = new MenuItem({
//                label: core.getI18n("dxprompt"),
//                iconClass: "view",
//                disabled: true,
//                showLabel: true,
//                onClick: function () {
//                    topic.publish("/qc/ChartPrompt", ['DX', null, false]);
//                }
//            });
//            promptMenu.addChild(this.tbDxPrompt);

//            if (core.settings.enableFollowUpPrompt) {
//                this.tbFuPrompt = new MenuItem({
//                    label: core.getI18n("fuprompt"),
//                    iconClass: "view",
//                    disabled: true,
//                    showLabel: true,
//                    onClick: function () {
//                        topic.publish("/qc/ChartPrompt", 'FU', null, false);
//                    }
//                });
//                promptMenu.addChild(this.tbFuPrompt);
//            };

//            if (core.settings.nursingFeaturesEnabled) {
//                this.tbRnPrompt = new MenuItem({
//                    label: core.getI18n("nursingprompt"),
//                    iconClass: "rnprompt",
//                    disabled: true,
//                    showLabel: true,
//                    onClick: function () {
//                        topic.publish("/qc/ChartPrompt", 'RN', null, false);
//                    }
//                });
//                promptMenu.addChild(this.tbRnPrompt);
//            };

//            domClass.add(promptMenu.domNode, "ic24");

//            this.viewMenu = new Menu();
//            this.viewMenu.addChild(new CheckedMenuItem({
//                label: core.getI18n("concise"),
//                showLabel: true,
//                checked: false,
//                viewMode: 'concise',
//                onClick: lang.hitch(this, this.onViewMenuClicked)
//            }));
//            this.viewMenu.addChild(new CheckedMenuItem({
//                label: core.getI18n("expanded"),
//                showLabel: true,
//                checked: false,
//                viewMode: 'expanded',
//                onClick: lang.hitch(this, this.onViewMenuClicked)
//            }));
//            this.viewMenu.addChild(new CheckedMenuItem({
//                label: core.getI18n("outline"),
//                showLabel: true,
//                checked: false,
//                viewMode: 'outline',
//                onClick: lang.hitch(this, this.onViewMenuClicked)
//            }));

//            if (core.settings.enableDesignView) {
//                this.viewMenu.addChild(new CheckedMenuItem({
//                    label: core.getI18n("design"),
//                    showLabel: true,
//                    checked: false,
//                    viewMode: 'design',
//                    onClick: lang.hitch(this, this.onViewMenuClicked)
//                }));
//            };

//            if (core.settings.features.Flowsheet) {
//                this.viewMenu.addChild(new MenuSeparator());
//                this.viewMenu.addChild(new MenuItem({
//                    label: core.getI18n("flowsheet"),
//                    iconClass: "flowsheet",
//                    showLabel: true,
//                    onClick: function () { topic.publish("/qc/ChartReview/OpenView", { id: 'Flowsheet', typeName: 'Quippe/Flowsheet', instanceParms: null, instance: null }) }
//                }));
//            };

//            if (core.settings.features.Coding) {
//                this.viewMenu.addChild(new MenuItem({
//                    label: "Code Review",
//                    iconClass: "",
//                    showLabel: true,
//                    onClick: function () { topic.publish("/qc/ChartReview/OpenView", { id: 'CodeReview', title: 'Coding Review', typeName: 'qc/coding/CodeReview', instanceParms: null, instance: null }) }
//                }));
//            };

//            var appMenu = new Menu();
//            domClass.add(appMenu.domNode, "ic24");

//            appMenu.addChild(new MenuItem({
//                label: core.getI18n("newencounter") + "...",
//                iconClass: "document_new",
//                showLabel: false,
//                onClick: function () { topic.publish("/qc/ShowDialog", "newEncounter") }
//            }));

//            appMenu.addChild(new MenuItem({
//                label: core.getI18n("openencounter") + "...",
//                iconClass: "folder_document",
//                showLabel: false,
//                onClick: function () { topic.publish("/qc/ShowDialog", "openEncounter") }
//            }));

//            appMenu.addChild(new MenuSeparator());

//            var appSaveMenu = new Menu();
//            appSaveMenu.addChild(new MenuItem({
//                label: core.getI18n("savedraft"),
//                disabled: (core.settings.demoMode ? true : false),
//                showLabel: false,
//                onClick: function () { topic.publish("/qc/SaveEncounter", false) }
//            }));
//            appSaveMenu.addChild(new MenuItem({
//                label: core.getI18n("savefinalnote"),
//                disabled: (core.settings.demoMode ? true : false),
//                showLabel: false,
//                onClick: function () { topic.publish("/qc/SaveEncounter", true) }
//            }));

//            appMenu.addChild(new PopupMenuItem({
//                label: core.getI18n("saveencounter"),
//                iconClass: "floppy_disk",
//                disabled: (core.settings.demoMode ? true : false),
//                showLabel: true,
//                popup: appSaveMenu
//            }));

//            //appMenu.addChild(new MenuItem({
//            //    label: "Save Encounter",
//            //    iconClass: "floppy_disk",
//            //    disabled: (core.settings.demoMode ? true : false),
//            //    showLabel: false,
//            //    onClick: function () { topic.publish("/qc/SaveEncounter", [true]) }
//            //}));

//            appMenu.addChild(new MenuItem({
//                label: core.getI18n("savecontent") + "...",
//                iconClass: "",
//                disabled: (core.settings.demoMode ? true : false),
//                showLabel: false,
//                //onClick: function () { topic.publish("/qc/ShowDialog", ["saveContent"]) }
//                onClick: lang.hitch(this, this.onSaveContent)
//            }));

//            appMenu.addChild(new MenuSeparator());

//            appMenu.addChild(new MenuItem({
//                label: core.getI18n("printableview"),
//                iconClass: "printer2",
//                showLabel: false,
//                onClick: function () { topic.publish("/qc/Print") }
//            }));

//            appMenu.addChild(new MenuSeparator());

//            appMenu.addChild(new MenuItem({
//                label: core.getI18n("logoff"),
//                iconClass: "",
//                showLabel: false,
//                onClick: function () { topic.publish("/qc/LogOff") }
//            }));

//            var appButton = new DropDownButton({
//                label: core.getI18n("applicationmenu"),
//                iconClass: "quippe",
//                showLabel: false,
//                dropDown: appMenu
//            });
//            this.toolbar.addChild(appButton);

//            this.toolbar.addChild(core.createSearchBox({ placeHolder: core.getI18n("search") }));

//            var browseButton = new DropDownButton({
//                label: core.getI18n("browse"),
//                iconClass: "text_tree",
//                showLabel: true,
//                dropDown: browseBox,
//                minWidthForLabel: 400
//            });
//            browseBox.toolbarButton = browseButton;
//            on(browseButton, 'openDropDown', lang.hitch(browseBox, browseBox.onShow));
//            this.toolbar.addChild(browseButton);

//            this.toolbar.addChild(new ComboButton({
//                id: "ChartPromptButton",
//                label: core.getI18n("prompt") + " <sub>" + (core.settings.listSize || '') + "</sub>",
//                iconClass: "view",
//                showLabel: true,
//                dropDown: promptMenu,
//                onClick: function () { topic.publish("/qc/ChartPrompt") },
//                minWidthForLabel: 400
//            }));

//            this.toolbar.addChild(new ToolbarSeparator());

//            var viewMenuButton = new DropDownButton({
//                id: "ViewModeButton",
//                label: core.getI18n("view"),
//                iconClass: "photographic_filter",
//                showLabel: true,
//                nextMode: 'concise',
//                dropDown: this.viewMenu,
//                minWidthForLabel: 400
//            });
//            this.toolbar.addChild(viewMenuButton);

//            this.toolsButton = new DropDownButton({
//                label: core.getI18n("tools"),
//                iconClass: "window_dialog",
//                showLabel: true,
//                dropDown: toolsMenu,
//                minWidthForLabel: 800
//            });
//            this.toolbar.addChild(this.toolsButton);

//            if (core.util.isIOS7()) {
//                require(["qc/ContextMenuButton"], function (ContextMenuButton) {
//                    this.actionButton = new ContextMenuButton({
//                        label: 'Actions',
//                        iconClass: 'form_blue',
//                        showLabel: true,
//                        minWidthForLabel: 800
//                    });
//                    this.toolbar.addChild(this.actionButton);
//                });
//            };

//            this.toolbar.startup();
//        },


//        _initEnums: function () {
//            var culture = core.settings.culture || 'en-US';
//            var defs = [
//                EnumManager.loadList('sex', 'Quippe/Enum/Sex', culture),
//                EnumManager.loadList('prefix', 'Quippe/Enum/Prefix', culture, 'Lower'),
//                EnumManager.loadList('modifier', 'Quippe/Enum/Modifier', culture, 'Lower'),
//                EnumManager.loadList('status', 'Quippe/Enum/Status', culture, 'Lower'),
//                EnumManager.loadList('result', 'Quippe/Enum/Result', culture, 'Lower')
//            ];
//        },

//        setSkin: function (skin) {
//            var haveCSS = false;
//            var re = new RegExp("libs/dijit/themes");
//            var cssURL = "libs/dijit/themes/" + skin + "/" + skin + ".css";
//            query("link").forEach(function (item, i) {
//                var url = item.getAttribute("href");
//                if (url == cssURL) {
//                    haveCSS = true;
//                }
//                else if (re.test(url)) {
//                    domConstruct.destroy(item);
//                }
//            });
//            if (!haveCSS) {
//                var link = domConstruct.create("link");
//                link.setAttribute("rel", "stylesheet");
//                link.setAttribute("type", "text/css");
//                link.setAttribute("href", cssURL);
//                domConstruct.place(link, domConstruct.query("head")[0]);
//            }
//            ready(function () {
//                domClass.remove(document.body);
//                domClass.add(document.body, skin);
//            });
//        },

//        onInputModeChanged: function (view) {
//            var btn = registry.byId("InputModeButton");
//            var lView = view.toLowerCase();
//            if (btn) {
//                btn.set('iconClass', core.getIcon(lView));
//                switch (lView) {
//                    case 'mouse':
//                        btn.set('onClick', function () { topic.publish("/qc/SetInputMode", "Pen") });
//                        break;
//                    default:
//                        btn.set('onClick', function () { topic.publish("/qc/SetInputMode", "Mouse") });
//                        break;
//                };
//            };
//        },

//        onNoteEditorSelectionChanged: function (element) {
//            var finding = element && domClass.contains(element.domNode, 'finding') ? element : null;
//            if (finding && !domClass.contains(finding.domNode, 'freeText')) {
//                if (this.tbDxPrompt) {
//                    this.tbDxPrompt.set('label', 'D:' + finding.get('text'));
//                    this.tbDxPrompt.set('disabled', false);
//                };

//                if (this.tbFuPrompt) {
//                    this.tbFuPrompt.set('label', 'F:' + finding.get('text'));
//                    this.tbFuPrompt.set('disabled', false);
//                };

//                if (this.tbRnPrompt) {
//                    this.tbRnPrompt.set('label', 'N:' + finding.get('text'));
//                    this.tbRnPrompt.set('disabled', false);
//                };
//            }
//            else {
//                if (this.tbDxPrompt) {
//                    this.tbDxPrompt.set('label', core.getI18n("dxprompt"));
//                    this.tbDxPrompt.set('disabled', true);
//                };

//                if (this.tbFuPrompt) {
//                    this.tbFuPrompt.set('label', core.getI18n("fuprompt"));
//                    this.tbFuPrompt.set('disabled', true);
//                };

//                if (this.tbRnPrompt) {
//                    this.tbRnPrompt.set('label', core.getI18n("nursingprompt"));
//                    this.tbRnPrompt.set('disabled', true);
//                };
//            };
//        },

//        getContextActions: function (item, widget, targetNode) {
//            if (item == null || item == undefined) {
//                return null;
//            };

//            if (domClass.contains(widget.domNode, 'freeText')) {
//                return [{ label: 'Delete Free Text', icon: 'delete', topic: '/qc/DeleteFinding' }];
//            };

//            var actions = [];

//            switch (item.type || 'unknown') {
//                case 'finding':
//                    actions.push({ label: core.getI18n("details") + '...', icon: 'form_blue', topic: '/qc/EditFindingDetails', isDefault: false });
//                    actions.push({ label: core.getI18n("duplicate"), topic: '/qc/DuplicateFinding', item: widget });
//                    actions.push({ label: core.getI18n("prompt"), icon: 'view', topic: '/qc/MergePrompt', item: [item, 1], beginGroup: true });
//                    if (core.settings.enableFollowUpPrompt) {
//                        actions.push({ label: core.getI18n("fuprompt"), icon: 'view', topic: '/qc/FollowUpPrompt' });
//                    };
//                    if (core.settings.nursingFeaturesEnabled) {
//                        actions.push({ label: core.getI18n("nursingprompt"), icon: 'rnprompt', topic: '/qc/NursingPrompt' });
//                    };
                
//                    if (!core.closestNode(widget.domNode, '.qcFavoritesList')) {
//                        actions.push({ label: core.getI18n('addtofavorites'), icon: 'star_yellow_add', topic: '/qc/AddToFavorites', beginGroup: true });
//                    };
//                    actions.push({ label: core.getI18n("medcinviewer"), icon: '', topic: '/qc/ShowMedcinViewer' });
//                    actions.push({ label: core.getI18n('deleteItem'), icon: 'delete', topic: '/qc/DeleteFinding', beginGroup: true });
//                    break;

//                case 'term':
//                    actions.push({ label: core.getI18n('addtonote'), icon: '', topic: '/qc/AddToNote' });
//                    actions.push({ label: core.getI18n('prompt'), icon: 'view', topic: '/qc/MergePrompt', item: [item, 1], beginGroup: true });
//                    if (core.settings.enableFollowUpPrompt) {
//                        actions.push({ label: core.getI18n("fuprompt"), icon: 'view', topic: '/qc/FollowUpPrompt' });
//                    };
//                    if (core.settings.nursingFeaturesEnabled) {
//                        actions.push({ label: core.getI18n('nursingPrompt'), icon: 'rnprompt', topic: '/qc/NursingPrompt' });
//                    };
//                    if (!core.closestNode(widget.domNode, '.qcFavoritesList')) {
//                        actions.push({ label: core.getI18n('addtofavorites'), icon: 'star_yellow_add', topic: '/qc/AddToFavorites' });
//                    };
//                    break;

//                case 'list':
//                    actions.push({ label: core.getI18n('merge'), icon: '', topic: '/qc/AddToNote' });
//                    if (!core.closestNode(widget.domNode, '.qcFavoritesList')) {
//                        actions.push({ label: core.getI18n('addtofavorites'), icon: 'star_yellow_add', topic: '/qc/AddToFavorites' });
//                    };
//                    break;

//                case 'group':
//                case 'section':
//                case 'chapter':
//                    actions.push({ label: core.getI18n('otherwisenormal'), icon: '', topic: '/qc/AutoNegate' });
//                    actions.push({ label: core.getI18n('undootherwisenormal'), icon: '', topic: '/qc/UndoAutoNegate' });

//                    if (domClass.contains(widget.domNode, 'problemSection')) {
//                        actions.push({ label: 'Remove Problem Section', icon: '', topic: '/qc/UndoProblemSection', item: widget });
//                    };

//                    if (query('.defaultSelection', widget.domNode).length > 0) {
//                        actions.push({ label: 'Enter Defaults', icon: '', topic: '/qc/EnterDefaults' });
//                    };


//                    actions.push({ label: 'Select All Findings', icon: '', topic: '/qc/NoteEditor/Selection/SelectAllFindings', item: widget, beginGroup: true });
//                    actions.push({ label: core.getI18n('clearnonentered'), icon: '', topic: '/qc/ClearNonEntered' });
//                    actions.push({ label: core.getI18n('clearall'), icon: '', topic: '/qc/ClearFindings' });
//                    if (widget.get('freeTextMedcinId')) {
//                        if (query('.freeText', widget.domNode).length == 0) {
//                            actions.push({ label: core.getI18n('addfreetext'), icon: '', topic: '/qc/AddFreeTextToGroup', beginGroup: true });
//                        }
//                    };
//                    break;

//                case 'selection':
//                    actions = item.getContextActions(item, widget, targetNode);
//                    break;

//                case 'findingGroup':
//                    actions.push({ label: 'Split Findings', icon: '', onClick: lang.hitch(item, item.unmerge) });
//                    actions.push({ label: core.getI18n("details") + '...', icon: 'form_blue', topic: '/qc/ShowDialog', item: ['multiFindingDetail', item] });
//                    actions.push({ label: core.getI18n('deleteItem'), icon: 'delete', onClick: lang.hitch(item, item.dropDelete), beginGroup: true });
//                    break;

//                default:
//                    break;
//            };

//            if (!core.settings.features.touchPad) { //Inline text editing not available on touch pads
//                if (targetNode && widget && domClass.contains(targetNode, 'editableText') && widget._editableText_CanEdit) {
//                    if (widget._editableText_CanEdit()) {
//                        actions.push({ label: 'Edit Text', icon: 'pencil', onClick: lang.hitch(widget, widget._editableText_StartEdit), beginGroup: true });
//                    };
//                };
//            };

//            if (widget && core.settings.enableSaveElement && widget.saveContent) {
//                actions.push({ label: 'Save Content', icon: 'floppy_disk', onClick: lang.hitch(widget, widget.saveContent) });
//            };

//            return actions;
//        },












//        setListSize: function (size) {
//            core.settings.listSize = size || 2;
//            var btn = registry.byId("ChartPromptButton");
//            if (btn) {
//                btn.set("label", core.getI18n("prompt") + " <sub>" + core.settings.listSize + "</sub>");
//            }
//        },

//        onViewMenuClicked: function (evt) {
//            var menuItem = registry.getEnclosingWidget(evt.target);
//            if (menuItem && menuItem.viewMode) {
//                topic.publish('/qc/SetView', menuItem.viewMode);
//            };
//        },


//        onViewChanged: function (viewMode) {
//            array.forEach(this.viewMenu.getChildren(), function (item) {
//                if (item.viewMode) {
//                    item.set('checked', (item.viewMode == viewMode));
//                };
//            });
//        },

//        onSaveContent: function () {
//            var types = [];

//            types.push({
//                name: 'template',
//                caption: 'Document Template',
//                options: [{ name: 'makeDefault', caption: 'Make this my default template' }]
//            });

//            types.push({
//                name: 'list',
//                caption: 'Finding List',
//                options: [
//                    { name: 'includeDetails', caption: 'Include entry details' },
//                    { name: 'includeGrouping', caption: 'Include section/group placement' }
//                ]
//            });

//            if (core.settings.enableSaveElement) {
//                types.push({ name: 'element', caption: 'Note Content' });
//            };

//            core.doDialog(core.SaveContentDialog, {
//                types: types,
//                type: 'list'
//            });
//        },

//        showDialog: function (name /*, additionalArgs*/) {
//            if (this.dialogs[name]) {
//                var instance = this.dialogs[name].instance;
//                if (!instance) {
//                    instance = new this.dialogs[name].type();
//                    instance.startup();
//                    if (!this.dialogs[name].singleUse) {
//                        this.dialogs[name].instance = instance;
//                    }
//                };

//                if (arguments.length > 1 && typeof instance.setData == "function") {
//                    var args = Array.prototype.slice.call(arguments);
//                    args.shift();
//                    instance.setData.apply(instance, args);
//                };

//                instance.show();

//                if (core.settings.features.TouchPad || core.settings.features.simulateTouchPad) {
//                    instance._relativePosition = new Object();
//                }
//            };
//        },

//        logOff: function () {
//            //TODO: Prompt to save current note
//            window.location = "logout.aspx";
//        },

//        processOrders: function (items) {
//            var dlg = this.dialogs['orderProcessor']
//            if (!dlg) {
//                dlg = new Dialog({ title: core.getI18n('orderprocessor') });
//                this.dialogs['orderProcessor'] = dlg;
//            }
//            var htm = '<div>Call to the host application to process the following orders:</div>';
//            htm += '<table style="margin:12px;"><tbody>';
//            htm += '<tr><td style="font-weight:bold;">MedcinId</td><td style="font-weight:bold;">Description</td></tr>';
//            array.forEach(items, function (item) {
//                htm += '<tr>';
//                htm += '<td>' + item.id + '</td>';
//                htm += '<td>' + item.text + '</td>';
//                htm += '</tr>';
//            });
//            htm += '</tbody></table>';
//            dlg.set('content', htm);
//            dlg.show();
//        },

//        setPreventCache: function (id) {
//            if (id) {
//                if (!this.preventCacheIds) {
//                    this.preventCacheIds = {};
//                };
//                this.preventCacheIds[id] = true;
//            };
//        },

//        clearPreventCache: function (id) {
//            if (id && this.preventCacheIds && this.preventCacheIds[id]) {
//                delete this.preventCacheIds[id];
//            };
//        },

//        shouldPreventCache: function (id) {
//            return id && this.preventCacheIds ? this.preventCacheIds[id] || false : false;
//        },

//        showMedcinViewer: function (item) {
//            var url = 'MedcinViewer.htm';

//            var medcinId = 0;
//            if (item) {
//                if (typeof item == 'number') {
//                    medcinId = item;
//                }
//                else if (item.medcinId) {
//                    medcinId = item.medcinId;
//                }
//                else if (typeof item.get == "function") {
//                    medcinId = item.get('medcinId');
//                }
//            };

//            if (!medcinId) {
//                var finding = query('.qcNoteEditor .finding.selected').map(registry.byNode)[0];
//                if (finding) {
//                    medcinId = finding.get('medcinId');
//                };
//            };

//            if (medcinId) {
//                url += '#' + medcinId;
//            };

//            window.open(url, 'MedcinViewer')
//        },

//        _getUserSettings: function () {
//            return request(core.serviceURL('Quippe/UserSettings'), {
//                query: { DataFormat: 'JSON' },
//                handleAs: 'json'
//            }).then(function (data) { return data.settings || {} }, function(err) { return {} });
//        },

//        _getServices: function () {
//            return request(core.serviceURL('Quippe/ServiceInfo/Services'), {
//                query: { DataFormat: 'JSON' },
//                handleAs: 'json'
//            }).then(function (data) { 
//                var list = [];
//                array.forEach(core.forceArray(data.services), function (s) {
//                    list.push(s.contract);
//                });
//                return list;
//            }, function(err) { return [] });
//        },

//        _getRoles: function (roles) {
//            return roles instanceof Array ? roles : request(core.serviceURL('Quippe/UserSettings/Roles'), {
//                query: { DataFormat: 'JSON' },
//                handleAs: 'json'
//            }).then(function (data) { return data.roles || [] }, function (err) { return [] });
//        },

//        _loadExtensions: function (settings) {
//            var extensions = [];

//            if (settings.systemExtensions) {
//                extensions = extensions.concat(settings.systemExtensions.split(','));
//            };
//            if (settings.extensions) {
//                extensions = extensions.concat(settings.extensions.split(','));
//            };

//            if (extensions.length == 0) {
//                return true;
//            };

//            require(["dojo/Deferred"], function (Deferred) {
//                var def = new Deferred();

//                array.forEach(extensions, function (ext) {
//                    def.then(function () { return core.getModule(ext.trim()) });     /*TODO: *dap* does this (or core.getModule) need to be refactored for AMD? Should this be a */
//                });

//                return def.resolve(true);
//            });
//        },

//        showAboutDialog: function () {


//            var versionInfo = request(core.serviceURL('Help/VersionInfo'), {
//                query: { DataFormat: 'JSON' },
//                handleAs: 'json'
//            }).then(function (data) { return data.version || {} }, function (err) { core.showError(err) });

//            var title = core.getI18n("aboutquippe");
//            var year = new Date().getFullYear();

            
//            when(versionInfo, function (v) {
//                var htm = '';

//                htm += '<div style="margin:20px;width:400px;">';
//                htm += '<img src="images/logo-quippe.jpg" alt="Quippe Logo" />';
//                htm += '<div style="margin-top:12px;font-weight:bold;">Versions:</div>';
//                htm += '<table>';
//                htm += v.quippe ? '<tr><td>Quippe SDK:</td><td>' + v.quippe + '</td></tr>' : '';
//                htm += v.medcinServer ? '<tr><td>Medcin Server:</td><td>' + v.medcinServer + '</td></tr>' : '';
//                htm += v.medcinData ? '<tr><td>Medcin Data:</td><td>' + v.medcinData + '</td></tr>' : '';
//                htm += v.intSize ? '<tr><td>Platform:</td><td>' + v.intSize + '-bit</td></tr>' : '';
//                htm += '</table>';
//                htm += '<p style="margin-top:12px;">&copy; ' + year + ' Medicomp Systems, Inc., Patents Pending</p>';
//                htm += '<p>Quippe, Medcin, and Intelligent Prompt are trademarks of <a target="medicompSite" href="http://www.medicomp.com">Medicomp Systems, Inc</a></p>';
//                htm += '<p>Portions of Quippe have been developed using the dojo toolkit.  License information available at <a target="dojoLicense" href="http://dojotoolkit.org/license">http://dojotoolkit.org/license</a>';
//                htm += '</div>';

//                var dlg = new Dialog({ title: title, content: htm });
//                dlg.show();
//            });
//        },


//        showNotImplemented: function () {
//            core.showError("Not implemented yet...");
//        }

//    });
//});