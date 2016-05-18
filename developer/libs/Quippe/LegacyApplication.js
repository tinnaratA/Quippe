dojo.provide("Quippe.LegacyApplication");

dojo.require("dojo.parser");

dojo.require("dijit._WidgetBase");
dojo.require("dijit._TemplatedMixin");
dojo.require("dijit._Container");

dojo.require("dijit.TitlePane");
dojo.require("dijit.Toolbar");
dojo.require("dijit.Dialog");
dojo.require("dijit.Menu");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.TabContainer");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.CheckBox");

dojo.require("dijit.popup");

dojo.require("qc._core");
dojo.require("qc.DateUtil");
dojo.require("qc.SourcesPane");
dojo.require("qc.BrowsePopup");
dojo.require("qc.FavoritesPane");
dojo.require("qc.TaskPane");
dojo.require("qc.PatientTaskPane");
dojo.require("qc.Workspace");
dojo.require("qc.TaskBar");
dojo.require("qc.DndManager");
dojo.require("qc.ContextMenu");
dojo.require("qc.SearchBox");
dojo.require("qc.LibraryManagerDialog");
dojo.require("qc.NewEncounterDialog2");
dojo.require("qc.OpenEncounterDialog");
dojo.require("qc.ContentLibraryTree");
dojo.require("qc.FindingDetailDialog");
dojo.require("qc.UserSettingsDialog");
dojo.require("qc.UserAccountDialog");
dojo.require("qc.NavBar");
dojo.require("qc.Dialog");
dojo.require("qc.MenuItem");
dojo.require("qc.CheckedMenuItem");
dojo.require("qc.OrdersPane");
dojo.require("qc.drawing.Toolbox");
dojo.require("qc.FindingDetailTab");
dojo.require("qc.FindingPhrasingTab");

dojo.require("qc.coding.CodingTaskPaneICD10");
dojo.require("qc.coding.FindingCodingTab");
dojo.require("qc.coding.CodeReview");
dojo.require("qc.SaveContentDialog");

//dojo.require("qc.design.TemplateDesigner");
dojo.require("qc.FilteringSelect");
dojo.require("qc.MultiFindingDetailDialog");

dojo.require("qc.design.MacroEditorDialog");
dojo.require("qc.PatientEditorDialog");

dojo.require('qc.CollapsibleSplitter');
dojo.require('qc.lang.qscript.Binding');
dojo.require('qc.ContextMenuButton');

dojo.require("dojo.i18n");
dojo.requireLocalization("qc", "strings");

dojo.declare("Quippe.LegacyApplication", [dijit._WidgetBase, dijit._TemplatedMixin, dijit._Container], {
	templateString: '<div class="quippeApp qcContextMenuContainer"></div>',

	toolbar: null,
	workspace: null,
	contextMenu: null,
	themes: ['standard', 'plain', 'inlineGroups'],
	defaultTheme: 'standard',
	loginPage: "Login.htm",
	dialogs: null,
	simulateTouchPad: false,

	init: function () {
		this.startup();
		core.app = this;
		var self = this;

		// This seems to be a bug in Dojo:  in dijit.Viewport, it is expecting a global variable, orientation, to be set.  This doesn't appear
		// to happen anywhere in the framework and I believe that they assume it to be an automatic global variable, but iOS does not set it.
		// There is a bug open for this (https://bugs.dojotoolkit.org/ticket/17786), but at this time there does not appear to be any movement
		// on it.
		orientation = window.orientation;

		// This is to correct some shortcomings in the current version of Dojo (1.9.2), so we monkey-patch a corrected version of this method
		// into PopupManager.  Basically, they were using parseInt to get the CSS top property, which works fine if the user is zoomed at 100%,
		// but if the user zooms in or out, those CSS properties start to include decimal values.  So, if the position of items changes slightly
		// (like by introducing a border around an item that previously had none) and you round off those fractional CSS properties prior to 
		// adding the position change to them and do that repeatedly, those errors add up and elements start to float around the screen.  The
		// answer is to use parseFloat instead of parseInt, which maintains the zoomed decimal precision.  I'm submitting this as a bug to the
		// Dojo team and once this is fixed in the official version of Dojo, we can remove this monkey patching.  See case 1326 for a 
		// demonstration of the bug in action.
		dijit.popup._repositionAll = dojo.hitch(dijit.popup, function () {
			// summary:
			//		If screen has been scrolled, reposition all the popups in the stack.
			//		Then set timer to check again later.

			if (this._firstAroundNode) { // guard for when clearTimeout() on IE doesn't work
				var oldPos = this._firstAroundPosition,
					newPos = dojo.position(this._firstAroundNode, true),

					dx = newPos.x - oldPos.x,
					dy = newPos.y - oldPos.y;

				if (dx || dy) {
					this._firstAroundPosition = newPos;
					for (var i = 0; i < this._stack.length; i++) {
						var style = this._stack[i].wrapper.style;
						style.top = (parseFloat(style.top, 10) + dy) + "px";
						if (style.right == "auto") {
							style.left = (parseFloat(style.left, 10) + dx) + "px";
						}
						else {
							style.right = (parseFloat(style.right, 10) - dx) + "px";
						}
					}
				}

				this._aroundMoveListener = setTimeout(dojo.hitch(this, "_repositionAll"), dx || dy ? 10 : 50);
			}
		});

		return dojo.when(self._loadAppSettings(), function (settings) {
			return dojo.when(self._initDefaultTemplate(), function () {
				self._initSettings(settings);
				self._initIcons();
				self._initPageLayout(self.domNode);
				self._initDragAndDrop()
				self._initSubscriptions();
				self._initContextMenus()
				self._initDialogs()
				self._initEnums();

				if (core.util.isTouchDevice()) {
					dojo.addClass(self.domNode, 'tablet');
					dojo.connect(window, 'onorientationchange', self, self.onOrientationChange);
					self.onOrientationChange();
				};

				return true;
			});
		});

	},

	_initDefaultTemplate: function () {
		return core.xhrGet({
			url: core.serviceURL("Quippe/ContentLibrary/Search?TypeName=template"),
			content: { "DataFormat": "JSON" },
			preventCache: true,
			handleAs: "json",
			error: core.showError,
			load: function (data, ioArgs) {
				var defaultTemplate = "shared:QUIPPESTANDARD";

				if (!dojo.some(data.items, function (item) {
					return item.id == "shared:QUIPPESTANDARD";
				}) && dojo.some(data.items, function (item) {
					return item.id == "shared:CLINITALKDEFAULT";
				})) {
					defaultTemplate = "shared:CLINITALKDEFAULT";
				}

				core.settings.defaultNoteTemplate = defaultTemplate;
			}
		});
	},

	onOrientationChange: function () {
		window.scrollTo(0, 0);
		var showLabel = window.orientation == 0 || window.orientation == 180 ? false : true;
		var width = window.innerWidth;
		dojo.forEach(this.toolbar.getChildren(), function (tool) {
			if (tool.minWidthForLabel) {
				tool.set('showLabel', tool.minWidthForLabel <= width);
			};
		});
	},

	_loadAppSettings: function (baseSettings) {
		var self = this;
		var settings = baseSettings || {};

		return dojo.when(self._getUserSettings(), function (userSettings) {
			for (var p in userSettings) {
				if (!settings[p]) {
					settings[p] = userSettings[p];
				};
			};
			return dojo.when(self._getServices(), function (services) {
				settings.services = services;
				return dojo.when(self._getRoles(settings.userRoles), function (roles) {
					settings.userRoles = roles;
					return dojo.when(self._loadExtensions(settings), function () {
						return settings;
					});
				});
			});
		});
	},

	_initSettings: function (settings) {
		var userSettings = settings || {};

		core.settings.culture = dojo.locale.length == 5 ? dojo.locale.substr(0, 3) + dojo.locale.substr(3, 2).toUpperCase() : userSettings.culture || 'en-US';

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


		if (dojo.indexOf(settings.services, 'Quippe.IPatientHistoryService') < 0) {
			core.settings.features.Flowsheet = false;
		};

		if (dojo.indexOf(settings.services, 'Quippe.IPhraseEditorService') < 0) {
			core.settings.phrasingAllowEdit = false;
		};

		if (core.settings.features.Coding && dojo.indexOf(settings.services, 'Quippe.Coding.ICodeMappingService') >= 0) {
			qc.coding.CodingManager.startup();
		}
		else {
			core.settings.features.Coding = false;
		};

		if (this.pageSettings) {
			for (var p in this.pageSettings) {
				core.settings[p] = this.pageSettings[p];
			};
		};
		// customFindingAttributes is a list of additional attribtues
		// that will be serialized for each finding when saving the encounter xml
		// The following example will look for an "orderId" attribute on any finding
		// and write it to the <Finding> element as an @OrderId attribute.  If tagName
		// is not specified, the name field will be converted to UpperCamelCase and used
		// Null values or values that match the specified defaultValue will not be serialized.
		//
		//  this.customFindingAttributes = [
		//      {name: 'orderId', type: 'integer', tagName: 'OrderId', defaultValue: null}
		//  ];
	},

	_initIcons: function () {
		this.iconMap = {
			'app': 'quippe',
			'container': 'folder',
			'edit': 'pencil',
			'element': 'document_into',
			'favorites': 'star_yellow_add',
			'folder': 'folder',
			'guideline': 'document',
			'image': 'pencil',
			'library': 'book_blue',
			'list': 'document_preferences',
			'list_prompt': 'view',
			'list_rnprompt': 'rnprompt',
			'list_taggedtext': 'signal_flag_red',
			'list_template': 'document_preferences',
			'macro': 'document',
			'mouse': 'mouse',
			'note': 'document',
			'pen': 'ballpen_blue',
			'reference': 'document',
			'template': 'document',
			'theme': 'document',
			'viewmode': 'photographic_filter'
		};
	},

	_initPageLayout: function (rootNode) {
		var mainFrame = new dijit.layout.BorderContainer({ design: "headline", gutters: false, liveSplitters: false });
		dojo.addClass(mainFrame.domNode, "mainFrame");
		mainFrame.placeAt(rootNode);
		core.setSelectable(mainFrame.domNode, false);

		var toolbarPane = new dijit.layout.ContentPane({ splitter: false, region: "top" });
		dojo.addClass(toolbarPane.domNode, "toolBarPane");
		mainFrame.addChild(toolbarPane);

		this.toolbar = new dijit.Toolbar();
		this.toolbar.placeAt(toolbarPane.domNode);
		this._initToolbar();

		var splitterClass = core.settings.taskBarCollapsible ? qc.CollapsibleSplitter : dijit.layout.BorderContainer._Splitter;
		var mainContent = new dijit.layout.BorderContainer({ design: "sidebar", gutters: false, liveSplitters: true, region: "center", _splitterClass: splitterClass });
		dojo.addClass(mainContent.domNode, "mainContent");
		mainContent.placeAt(mainFrame.domNode);
		core.setSelectable(mainContent.domNode, false);;

		this.workspace = new qc.Workspace({ region: "center", splitter: "false" });
		this.workspace.placeAt(mainContent.domNode);
		this.workspace.startup();

		var taskPane = new qc.TaskBar({ splitter: true, region: "right" });
		dojo.addClass(taskPane.domNode, "taskPane");
		mainContent.addChild(taskPane);

		var tpPatient = new qc.PatientTaskPane();
		tpPatient.keepOpen = true;
		taskPane.addChild(tpPatient);

		var tpSources = new qc.SourcesPane();
		taskPane.addChild(tpSources);

		var tpOrders = new qc.OrdersPane();
		taskPane.addChild(tpOrders);

		if (core.settings.features.Coding) {
			var tpICD10 = new qc.coding.CodingTaskPaneICD10();
			taskPane.addChild(tpICD10);
		};

		var tpFavorites = new qc.FavoritesPane();
		taskPane.addChild(tpFavorites);

		var tpDrawingToolbox = new qc.drawing.Toolbox();
		taskPane.addChild(tpDrawingToolbox);

		if (core.settings.enableDesignView) {
			taskPane.addChild(new qc.design.Toolbox());
			taskPane.addChild(new qc.design.ElementInspector());
		};

		taskPane.updateDisplay(taskPane.mode);

		mainFrame.startup();
		mainFrame.layout();

		//dojo.place('<div id="copyright">&copy; ' + new Date().getFullYear() + ' Medicomp Systems, Inc., Patents Pending</div>', taskPane.domNode, "after");
	},

	_initDragAndDrop: function () {
		var dndManager = new qc.DndManager();
		dndManager.container = document.body;
		dndManager.selectBeforeDrag = core.settings.selectBeforeDrag;
		dndManager.startup();
	},

	_initSubscriptions: function () {
		dojo.subscribe("/qc/ShowDialog", this, this.showDialog);
		dojo.subscribe("/qc/SetSkin", this, this.setSkin);
		dojo.subscribe("/qc/SetTheme", this, this.setTheme);
		dojo.subscribe("/qc/NotImplemented", this, this.showNotImplemented);
		dojo.subscribe("/qc/SetListSize", this, this.setListSize);
		dojo.subscribe("/qc/LogOff", this, this.logOff);
		dojo.subscribe("/qc/ViewChanged", this, this.onViewChanged);
		dojo.subscribe("/qc/InputModeChanged", this, this.onInputModeChanged);
		dojo.subscribe("/qc/ProcessOrders", this, this.processOrders);
		dojo.subscribe("/noteEditor/SelectionChanged", this, this.onNoteEditorSelectionChanged);
		dojo.subscribe("/qc/ShowMedcinViewer", this, this.showMedcinViewer);
	},

	_initContextMenus: function () {
		this.contextMenu = new qc.ContextMenu();
		this.contextMenu.startup();
	},

	_initDialogs: function () {
		this.dialogs = {
			newEncounter: { type: qc.NewEncounterDialog2 },
			libraryManager: { type: qc.LibraryManagerDialog },
			saveContent: { type: qc.SaveContentDialog },
			openEncounter: { type: qc.OpenEncounterDialog },
			userSettings: { type: qc.UserSettingsDialog },
			userAccount: { type: qc.UserAccountDialog },
			multiFindingDetail: { type: qc.MultiFindingDetailDialog },
			textMacroEditor: { type: qc.design.MacroEditorDialog },
			patientEditor: { type: qc.PatientEditorDialog }
		};

		this.findingDetailDialogTabs = {};
		this.findingDetailDialogTabs.details = { title: core.getI18n('details'), type: qc.FindingDetailTab };
		this.findingDetailDialogTabs.phrasing = { title: core.getI18n('phrasing'), type: qc.FindingPhrasingTab };

		if (core.settings.features.Coding) {
			this.findingDetailDialogTabs.coding = { title: 'Coding', type: qc.coding.FindingCodingTab };
		};
	},

	_initToolbar: function () {
		dojo.addClass(this.toolbar.domNode, "ic24");
		var n = 0;
		var s = null;
		var label = '';
		var fn = null;

		var browseBox = new qc.BrowsePopup();
		browseBox.startup();

		var sepStyleMenu = new dijit.Menu();
		sepStyleMenu.addChild(new dijit.MenuItem({ label: core.getI18n("none"), onClick: function () { dojo.publish("/qc/SetSepStyle", "none") } }));
		sepStyleMenu.addChild(new dijit.MenuItem({ label: core.getI18n("bulletsbefore"), onClick: function () { dojo.publish("/qc/SetSepStyle", "bullet") } }));
		sepStyleMenu.addChild(new dijit.MenuItem({ label: core.getI18n("semicolonsafter"), onClick: function () { dojo.publish("/qc/SetSepStyle", "semicolon") } }));

		var toolsMenu = new dijit.Menu();
		toolsMenu.addChild(new qc.MenuItem({
			label: core.getI18n("contentlibrarymanager"),
			iconClass: "book_blue",
			showLabel: true,
			onClick: function () { dojo.publish("/qc/ShowDialog", "libraryManager") }
		}));

		var self = this;
		if (core.settings.features.EM) {
			toolsMenu.addChild(new qc.MenuItem({
				label: core.getI18n("emcalculator"),
				iconClass: "calculator",
				showLabel: true,
				onClick: function () { dojo.publish("/qc/ChartReview/OpenView", { id: 'EMAnalysis', title: core.getI18n('emanalysis'), typeName: 'Quippe/EMAnalysis', instanceParms: null, instance: null }) }
			}));
		};

		if (core.settings.enableTextMacros && !core.settings.features.touchPad) {
			toolsMenu.addChild(new qc.MenuItem({
				label: 'Text Macro Editor',
				iconClass: 'document',
				showLabel: true,
				onClick: function () { dojo.publish("/qc/ShowDialog", "textMacroEditor", { newMacro: true }) }
			}));
		};

		toolsMenu.addChild(new qc.MenuItem({
			label: core.getI18n("account"),
			iconClass: "",
			showLabel: true,
			onClick: function () { dojo.publish("/qc/ShowDialog", "userAccount") }
		}));

		toolsMenu.addChild(new qc.MenuItem({
			label: core.getI18n("options"),
			iconClass: "preferences",
			showLabel: true,
			onClick: function () { dojo.publish("/qc/ShowDialog", "userSettings") }
		}));

		if (dojo.indexOf(core.settings.services, 'Quippe.IPatientEditorService') >= 0) {
			toolsMenu.addChild(new qc.MenuItem({
				label: 'Demo Patient Editor',
				iconClass: "form_blue",
				showLabel: true,
				onClick: function () { dojo.publish("/qc/ShowDialog", "patientEditor") }
			}));
		};

		if (dojo.indexOf(core.settings.userRoles, 'Admin') >= 0) {
			toolsMenu.addChild(new dijit.MenuSeparator());
			toolsMenu.addChild(new qc.MenuItem({
				label: core.getI18n("adminconsole"),
				iconClass: "",
				showLabel: true,
				onClick: function () { window.open('admin', 'QuippeAdminTools'); }
			}));
		};

		if (core.settings.showDeveloperTools) {
			toolsMenu.addChild(new qc.MenuItem({
				label: core.getI18n("medcinviewer"),
				iconClass: "",
				showLabel: true,
				onClick: function () { dojo.publish("/qc/ShowMedcinViewer") }
			}));

			toolsMenu.addChild(new qc.MenuItem({
				label: core.getI18n("webservicetester"),
				iconClass: "",
				showLabel: true,
				onClick: function () { window.open('ServiceTester.htm', 'ServiceTester'); }
			}));
		};

		if (core.settings.enableQuippeDesigner) {
			toolsMenu.addChild(new qc.MenuItem({
				label: 'Quippe Designer',
				iconClass: "",
				showLabel: true,
				onClick: function () { window.open('Designer.htm', 'QuippeDesigner') }
			}));
		};

		toolsMenu.addChild(new dijit.MenuSeparator());
		toolsMenu.addChild(new qc.MenuItem({
			label: core.getI18n("quippeusersguide"),
			iconClass: "help2",
			showLabel: true,
			onClick: function () { window.open('docs/Quippe User Guide.pdf', 'UserGuide'); }
		}));

		toolsMenu.addChild(new qc.MenuItem({
			label: core.getI18n("aboutquippe"),
			iconClass: "",
			showLabel: true,
			onClick: dojo.hitch(this, this.showAboutDialog)
		}));

		dojo.addClass(toolsMenu.domNode, "ic16");

		var promptMenu = new dijit.Menu();
		promptMenu.addChild(new qc.MenuItem({
			label: "1: " + core.getI18n("small"),
			iconClass: "view",
			showLabel: true,
			onClick: function (evt) {
				if (evt.ctrlKey) {
					dojo.publish("/qc/SetListSize", 1);
				}
				else {
					dojo.publish("/qc/ChartPrompt", 'IP', 1, true);
				};
			}
		}));
		promptMenu.addChild(new qc.MenuItem({
			label: "2: " + core.getI18n("medium"),
			iconClass: "view",
			showLabel: true,
			onClick: function (evt) {
				if (evt.ctrlKey) {
					dojo.publish("/qc/SetListSize", 2);
				}
				else {
					dojo.publish("/qc/ChartPrompt", 'IP', 2, true);
				};
			}
		}));
		promptMenu.addChild(new qc.MenuItem({
			label: "3: " + core.getI18n("large"),
			iconClass: "view",
			showLabel: true,
			onClick: function (evt) {
				if (evt.ctrlKey) {
					dojo.publish("/qc/SetListSize", 3);
				}
				else {
					dojo.publish("/qc/ChartPrompt", 'IP', 3, true);
				};
			}
		}));

		promptMenu.addChild(new dijit.MenuSeparator());

		this.tbDxPrompt = new qc.MenuItem({
			label: core.getI18n("dxprompt"),
			iconClass: "view",
			disabled: true,
			showLabel: true,
			onClick: function () {
				dojo.publish("/qc/ChartPrompt", 'DX', null, false);
			}
		});
		promptMenu.addChild(this.tbDxPrompt);

		if (core.settings.enableFollowUpPrompt) {
			this.tbFuPrompt = new qc.MenuItem({
				label: core.getI18n("fuprompt"),
				iconClass: "view",
				disabled: true,
				showLabel: true,
				onClick: function () {
					dojo.publish("/qc/ChartPrompt", 'FU', null, false);
				}
			});
			promptMenu.addChild(this.tbFuPrompt);
		};

		if (core.settings.nursingFeaturesEnabled) {
			this.tbRnPrompt = new qc.MenuItem({
				label: core.getI18n("nursingprompt"),
				iconClass: "rnprompt",
				disabled: true,
				showLabel: true,
				onClick: function () {
					dojo.publish("/qc/ChartPrompt", 'RN', null, false);
				}
			});
			promptMenu.addChild(this.tbRnPrompt);
		};

		dojo.addClass(promptMenu.domNode, "ic24");

		this.viewMenu = new dijit.Menu();
		this.viewMenu.addChild(new qc.CheckedMenuItem({
			label: core.getI18n("concise"),
			showLabel: true,
			checked: false,
			viewMode: 'concise',
			onClick: dojo.hitch(this, this.onViewMenuClicked)
		}));
		this.viewMenu.addChild(new qc.CheckedMenuItem({
			label: core.getI18n("expanded"),
			showLabel: true,
			checked: false,
			viewMode: 'expanded',
			onClick: dojo.hitch(this, this.onViewMenuClicked)
		}));
		this.viewMenu.addChild(new qc.CheckedMenuItem({
			label: core.getI18n("outline"),
			showLabel: true,
			checked: false,
			viewMode: 'outline',
			onClick: dojo.hitch(this, this.onViewMenuClicked)
		}));

		if (core.settings.enableDesignView) {
			this.viewMenu.addChild(new qc.CheckedMenuItem({
				label: core.getI18n("design"),
				showLabel: true,
				checked: false,
				viewMode: 'design',
				onClick: dojo.hitch(this, this.onViewMenuClicked)
			}));
		};

		if (core.settings.features.Flowsheet) {
			this.viewMenu.addChild(new dijit.MenuSeparator());
			this.viewMenu.addChild(new qc.MenuItem({
				label: core.getI18n("flowsheet"),
				iconClass: "flowsheet",
				showLabel: true,
				//onClick: function () { dojo.publish("/qc/ChartReview/OpenView", { id: 'Flowsheet', typeName: 'core.flowsheet.Flowsheet', instanceParms: null, instance: null}) }
				onClick: function () { dojo.publish("/qc/ChartReview/OpenView", { id: 'Flowsheet', typeName: 'Quippe/Flowsheet', instanceParms: null, instance: null }) }
			}));
		};

		if (core.settings.features.Coding) {
			this.viewMenu.addChild(new qc.MenuItem({
				label: "Code Review",
				iconClass: "",
				showLabel: true,
				onClick: function () { dojo.publish("/qc/ChartReview/OpenView", { id: 'CodeReview', title: 'Coding Review', typeName: 'qc/coding/CodeReview', instanceParms: null, instance: null }) }
			}));
		};

		var appMenu = new dijit.Menu();
		dojo.addClass(appMenu.domNode, "ic24");

		appMenu.addChild(new qc.MenuItem({
			label: core.getI18n("newencounter") + "...",
			iconClass: "document_new",
			showLabel: false,
			onClick: function () { dojo.publish("/qc/ShowDialog", "newEncounter") }
		}));

		appMenu.addChild(new qc.MenuItem({
			label: core.getI18n("openencounter") + "...",
			iconClass: "folder_document",
			showLabel: false,
			onClick: function () { dojo.publish("/qc/ShowDialog", "openEncounter") }
		}));

		appMenu.addChild(new dijit.MenuSeparator());

		var appSaveMenu = new dijit.Menu();
		appSaveMenu.addChild(new qc.MenuItem({
			label: core.getI18n("savedraft"),
			disabled: (core.settings.demoMode ? true : false),
			showLabel: false,
			onClick: function () { dojo.publish("/qc/SaveEncounter", false) }
		}));
		appSaveMenu.addChild(new qc.MenuItem({
			label: core.getI18n("savefinalnote"),
			disabled: (core.settings.demoMode ? true : false),
			showLabel: false,
			onClick: function () { dojo.publish("/qc/SaveEncounter", true) }
		}));

		appMenu.addChild(new dijit.PopupMenuItem({
			label: core.getI18n("saveencounter"),
			iconClass: "floppy_disk",
			disabled: (core.settings.demoMode ? true : false),
			showLabel: true,
			popup: appSaveMenu
		}));

		//appMenu.addChild(new qc.MenuItem({
		//    label: "Save Encounter",
		//    iconClass: "floppy_disk",
		//    disabled: (core.settings.demoMode ? true : false),
		//    showLabel: false,
		//    onClick: function () { dojo.publish("/qc/SaveEncounter", true) }
		//}));

		appMenu.addChild(new qc.MenuItem({
			label: core.getI18n("savecontent") + "...",
			iconClass: "",
			disabled: (core.settings.demoMode ? true : false),
			showLabel: false,
			//onClick: function () { dojo.publish("/qc/ShowDialog", "saveContent") }
			onClick: dojo.hitch(this, this.onSaveContent)
		}));

		appMenu.addChild(new dijit.MenuSeparator());

		appMenu.addChild(new qc.MenuItem({
			label: core.getI18n("printableview"),
			iconClass: "printer2",
			showLabel: false,
			onClick: function () { dojo.publish("/qc/Print") }
		}));

		appMenu.addChild(new dijit.MenuSeparator());

		appMenu.addChild(new dijit.MenuItem({
			label: core.getI18n("logoff"),
			iconClass: "",
			showLabel: false,
			onClick: function () { dojo.publish("/qc/LogOff") }
		}));

		var appButton = new dijit.form.DropDownButton({
			label: core.getI18n("applicationmenu"),
			iconClass: "quippe",
			showLabel: false,
			dropDown: appMenu
		});
		this.toolbar.addChild(appButton);

		this.toolbar.addChild(new qc.SearchBox({ placeHolder: core.getI18n("search") }));

		var browseButton = new dijit.form.DropDownButton({
			label: core.getI18n("browse"),
			iconClass: "text_tree",
			showLabel: true,
			dropDown: browseBox,
			minWidthForLabel: 400
		});
		browseBox.toolbarButton = browseButton;
		dojo.connect(browseButton, 'openDropDown', browseBox, browseBox.onShow);
		this.toolbar.addChild(browseButton);

		this.toolbar.addChild(new dijit.form.ComboButton({
			id: "ChartPromptButton",
			label: core.getI18n("prompt") + " <sub>" + (core.settings.listSize || '') + "</sub>",
			iconClass: "view",
			showLabel: true,
			dropDown: promptMenu,
			onClick: function () { dojo.publish("/qc/ChartPrompt") },
			minWidthForLabel: 400
		}));

		this.toolbar.addChild(new dijit.ToolbarSeparator());

		var viewMenuButton = new dijit.form.DropDownButton({
			id: "ViewModeButton",
			label: core.getI18n("view"),
			iconClass: "photographic_filter",
			showLabel: true,
			nextMode: 'concise',
			dropDown: this.viewMenu,
			minWidthForLabel: 400
		});
		this.toolbar.addChild(viewMenuButton);

		this.toolsButton = new dijit.form.DropDownButton({
			label: core.getI18n("tools"),
			iconClass: "window_dialog",
			showLabel: true,
			dropDown: toolsMenu,
			minWidthForLabel: 800
		});
		this.toolbar.addChild(this.toolsButton);

		if (core.settings.showContextMenuButtonInToolbar || core.util.isIOS()) {
			this.actionButton = new qc.ContextMenuButton({
				label: 'Actions',
				iconClass: 'form_blue',
				showLabel: true,
				minWidthForLabel: 800
			});
			this.toolbar.addChild(this.actionButton);
		};

		this.toolbar.startup();
	},


	_initEnums: function () {
		var culture = core.settings.culture || 'en-US';
		var defs = [
			qc.EnumManager.loadList('sex', 'Quippe/Enum/Sex', culture),
			qc.EnumManager.loadList('prefix', 'Quippe/Enum/Prefix', culture, 'Lower'),
			qc.EnumManager.loadList('modifier', 'Quippe/Enum/Modifier', culture, 'Lower'),
			qc.EnumManager.loadList('status', 'Quippe/Enum/Status', culture, 'Lower'),
			qc.EnumManager.loadList('result', 'Quippe/Enum/Result', culture, 'Lower')
		];
	},

	setSkin: function (skin) {
		var haveCSS = false;
		var re = new RegExp("libs/dijit/themes");
		var cssURL = "libs/dijit/themes/" + skin + "/" + skin + ".css";
		dojo.query("link").forEach(function (item, i) {
			var url = item.getAttribute("href");
			if (url == cssURL) {
				haveCSS = true;
			}
			else if (re.test(url)) {
				dojo.destroy(item);
			}
		});
		if (!haveCSS) {
			var link = dojo.create("link");
			link.setAttribute("rel", "stylesheet");
			link.setAttribute("type", "text/css");
			link.setAttribute("href", cssURL);
			dojo.place(link, dojo.query("head")[0]);
		}
		dojo.addOnLoad(function () {
			dojo.removeClass(document.body);
			dojo.addClass(document.body, skin);
		});
	},

	onInputModeChanged: function (view) {
		var btn = dijit.byId("InputModeButton");
		var lView = view.toLowerCase();
		if (btn) {
			btn.set('iconClass', core.getIcon(lView));
			switch (lView) {
				case 'mouse':
					btn.set('onClick', function () { dojo.publish("/qc/SetInputMode", 'Pen') });
					break;
				default:
					btn.set('onClick', function () { dojo.publish("/qc/SetInputMode", 'Mouse') });
					break;
			};
		};
	},

	onNoteEditorSelectionChanged: function (element) {
		var finding = element && dojo.hasClass(element.domNode, 'finding') ? element : null;
		if (finding && !dojo.hasClass(finding.domNode, 'freeText')) {
			if (this.tbDxPrompt) {
				this.tbDxPrompt.set('label', 'D:' + finding.get('text'));
				this.tbDxPrompt.set('disabled', false);
			};

			if (this.tbFuPrompt) {
				this.tbFuPrompt.set('label', 'F:' + finding.get('text'));
				this.tbFuPrompt.set('disabled', false);
			};

			if (this.tbRnPrompt) {
				this.tbRnPrompt.set('label', 'N:' + finding.get('text'));
				this.tbRnPrompt.set('disabled', false);
			};
		}
		else {
			if (this.tbDxPrompt) {
				this.tbDxPrompt.set('label', core.getI18n("dxprompt"));
				this.tbDxPrompt.set('disabled', true);
			};

			if (this.tbFuPrompt) {
				this.tbFuPrompt.set('label', core.getI18n("fuprompt"));
				this.tbFuPrompt.set('disabled', true);
			};

			if (this.tbRnPrompt) {
				this.tbRnPrompt.set('label', core.getI18n("nursingprompt"));
				this.tbRnPrompt.set('disabled', true);
			};
		};
	},

	getContextActions: function (item, widget, targetNode) {
		if (item == null || item == undefined) {
			return null;
		};

		if (dojo.hasClass(widget.domNode, 'freeText')) {
			return [{ label: 'Delete Free Text', icon: 'delete', topic: '/qc/DeleteFinding' }];
		};

		var actions = [];

		switch (item.type || 'unknown') {
			case 'finding':
				actions.push({ label: core.getI18n("details") + '...', icon: 'form_blue', topic: '/qc/EditFindingDetails', isDefault: false });
				actions.push({ label: core.getI18n("duplicate"), topic: '/qc/DuplicateFinding', item: widget });
				actions.push({ label: core.getI18n("prompt"), icon: 'view', topic: '/qc/MergePrompt', item: [item, 1], beginGroup: true });
				if (core.settings.enableFollowUpPrompt) {
					actions.push({ label: core.getI18n("fuprompt"), icon: 'view', topic: '/qc/FollowUpPrompt' });
				};
				if (core.settings.nursingFeaturesEnabled) {
					actions.push({ label: core.getI18n("nursingprompt"), icon: 'rnprompt', topic: '/qc/NursingPrompt' });
				};
				//if (item.prefix == 'O') {
				//    actions.push({ label: core.getI18n("order"), icon: '', topic: '/qc/AddOrder' });
				//};
				if (!core.closestNode(widget.domNode, '.qcFavoritesList')) {
					actions.push({ label: core.getI18n('addtofavorites'), icon: 'star_yellow_add', topic: '/qc/AddToFavorites', beginGroup: true });
				};
				actions.push({ label: core.getI18n("medcinviewer"), icon: '', topic: '/qc/ShowMedcinViewer' });
				actions.push({ label: core.getI18n('deleteItem'), icon: 'delete', topic: '/qc/DeleteFinding', beginGroup: true });
				break;

			case 'term':
				actions.push({ label: core.getI18n('addtonote'), icon: '', topic: '/qc/AddToNote' });
				actions.push({ label: core.getI18n('prompt'), icon: 'view', topic: '/qc/MergePrompt', item: [item, 1], beginGroup: true });
				if (core.settings.enableFollowUpPrompt) {
					actions.push({ label: core.getI18n("fuprompt"), icon: 'view', topic: '/qc/FollowUpPrompt' });
				};
				if (core.settings.nursingFeaturesEnabled) {
					actions.push({ label: core.getI18n('nursingprompt'), icon: 'rnprompt', topic: '/qc/NursingPrompt' });
				};
				if (!core.closestNode(widget.domNode, '.qcFavoritesList')) {
					actions.push({ label: core.getI18n('addtofavorites'), icon: 'star_yellow_add', topic: '/qc/AddToFavorites' });
				};
				break;

			case 'list':
				actions.push({ label: core.getI18n('merge'), icon: '', topic: '/qc/AddToNote' });
				if (!core.closestNode(widget.domNode, '.qcFavoritesList')) {
					actions.push({ label: core.getI18n('addtofavorites'), icon: 'star_yellow_add', topic: '/qc/AddToFavorites' });
				};
				break;

			case 'group':
			case 'section':
			case 'chapter':
				actions.push({ label: core.getI18n('otherwisenormal'), icon: '', topic: '/qc/AutoNegate' });
				actions.push({ label: core.getI18n('undootherwisenormal'), icon: '', topic: '/qc/UndoAutoNegate' });

				if (dojo.hasClass(widget.domNode, 'problemSection')) {
					actions.push({ label: 'Remove Problem Section', icon: '', topic: '/qc/UndoProblemSection', item: widget });
				};

				if (dojo.query('.defaultSelection', widget.domNode).length > 0) {
					actions.push({ label: 'Enter Defaults', icon: '', topic: '/qc/EnterDefaults' });
				};


				actions.push({ label: 'Select All Findings', icon: '', topic: '/qc/NoteEditor/Selection/SelectAllFindings', item: widget, beginGroup: true });
				actions.push({ label: core.getI18n('clearnonentered'), icon: '', topic: '/qc/ClearNonEntered' });
				actions.push({ label: core.getI18n('clearall'), icon: '', topic: '/qc/ClearFindings' });
				if (widget.get('freeTextMedcinId')) {
					if (dojo.query('.freeText', widget.domNode).length == 0) {
						actions.push({ label: core.getI18n('addfreetext'), icon: '', topic: '/qc/AddFreeTextToGroup', beginGroup: true });
					}
				};
				break;

			case 'selection':
				actions = item.getContextActions(item, widget, targetNode);
				break;

			case 'findingGroup':
				actions.push({ label: 'Split Findings', icon: '', onClick: dojo.hitch(item, item.unmerge) });
				actions.push({ label: core.getI18n("details") + '...', icon: 'form_blue', topic: '/qc/ShowDialog', item: ['multiFindingDetail', item] });
				actions.push({ label: core.getI18n('deleteItem'), icon: 'delete', onClick: dojo.hitch(item, item.dropDelete), beginGroup: true });
				break;

			default:
				break;
		};

		if (!core.settings.features.touchPad && (item.type != 'selection')) { //Inline text editing not available on touch pads or with multi-select
			if (targetNode && widget && dojo.hasClass(targetNode, 'editableText') && widget._editableText_CanEdit) {
				if (widget._editableText_CanEdit()) {
					actions.push({ label: 'Edit Text', icon: 'pencil', onClick: dojo.hitch(widget, widget._editableText_StartEdit), beginGroup: true });
				};
			};
		};

		if (widget && core.settings.enableSaveElement && widget.saveContent) {
			actions.push({ label: 'Save Content', icon: 'floppy_disk', onClick: dojo.hitch(widget, widget.saveContent) });
		};

		return actions;
	},

	setListSize: function (size) {
		core.settings.listSize = size || 2;
		var btn = dijit.byId("ChartPromptButton");
		if (btn) {
			btn.set("label", core.getI18n("prompt") + " <sub>" + core.settings.listSize + "</sub>");
		}
	},

	onViewMenuClicked: function (evt) {
		var menuItem = dijit.getEnclosingWidget(evt.target);
		if (menuItem && menuItem.viewMode) {
			dojo.publish('/qc/SetView', menuItem.viewMode);
		};
	},


	onViewChanged: function (viewMode) {
		dojo.forEach(this.viewMenu.getChildren(), function (item) {
			if (item.viewMode) {
				item.set('checked', (item.viewMode == viewMode));
			};
		});
	},

	onSaveContent: function () {
		var types = [];

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

		if (core.settings.enableSaveElement) {
			types.push({ name: 'element', caption: 'Note Content' });
		};

		core.doDialog(qc.SaveContentDialog, {
			types: types,
			type: 'list'
		});
	},

	showDialog: function (name /*, additionalArgs*/) {
		if (this.dialogs[name]) {
			var instance = this.dialogs[name].instance;
			if (!instance) {
				instance = new this.dialogs[name].type();
				instance.startup();
				if (!this.dialogs[name].singleUse) {
					this.dialogs[name].instance = instance;
				}
			};

			if (arguments.length > 1 && dojo.isFunction(instance.setData)) {
				var args = Array.prototype.slice.call(arguments);
				args.shift();
				instance.setData.apply(instance, args);
			};

			instance.show();

			if (core.settings.features.TouchPad || core.settings.features.simulateTouchPad) {
				instance._relativePosition = new Object();
			}
		};
	},

	logOff: function () {
		return dojo.xhrGet({
			url: core.serviceURL('Quippe/Security/Logout?DataFormat=JSON'),
			handleAs: 'json',
			preventCache: true,
			load: function(data) {
				if (data.result && data.result.redirectUrl) {
					window.location.href = data.result.redirectUrl;
				}
			},
			error: core.showError
		});
	},

	processOrders: function (items) {
		var dlg = this.dialogs['orderProcessor']
		if (!dlg) {
			dlg = new qc.Dialog({ title: core.getI18n('orderprocessor') });
			this.dialogs['orderProcessor'] = dlg;
		}
		var htm = '<div>Call to the host application to process the following orders:</div>';
		htm += '<table style="margin:12px;"><tbody>';
		htm += '<tr><td style="font-weight:bold;">MedcinId</td><td style="font-weight:bold;">Description</td></tr>';
		dojo.forEach(items, function (item) {
			htm += '<tr>';
			htm += '<td>' + item.id + '</td>';
			htm += '<td>' + item.text + '</td>';
			htm += '</tr>';
		});
		htm += '</tbody></table>';
		dlg.set('content', htm);
		dlg.show();
	},

	setPreventCache: function (id) {
		if (id) {
			if (!this.preventCacheIds) {
				this.preventCacheIds = {};
			};
			this.preventCacheIds[id] = true;
		};
	},

	clearPreventCache: function (id) {
		if (id && this.preventCacheIds && this.preventCacheIds[id]) {
			delete this.preventCacheIds[id];
		};
	},

	shouldPreventCache: function (id) {
		return id && this.preventCacheIds ? this.preventCacheIds[id] || false : false;
	},

	showMedcinViewer: function (item) {
		var url = 'MedcinViewer.htm';

		var medcinId = 0;
		if (item) {
			if (typeof item == 'number') {
				medcinId = item;
			}
			else if (item.medcinId) {
				medcinId = item.medcinId;
			}
			else if (dojo.isFunction(item.get)) {
				medcinId = item.get('medcinId');
			}
		};

		if (!medcinId) {
			var finding = dojo.query('.qcNoteEditor .finding.selected').map(dijit.byNode)[0];
			if (finding) {
				medcinId = finding.get('medcinId');
			};
		};

		if (medcinId) {
			url += '#' + medcinId;
		};
		window.open(url, 'MedcinViewer')
	},

	_getUserSettings: function () {
		return dojo.xhrGet({
			url: core.serviceURL('Quippe/UserSettings'),
			content: { DataFormat: 'JSON' },
			handleAs: 'json',
			preventCache: true,
			error: function () { return {} },
			load: function (data, ioArgs) {
				return data.settings || {};
			}
		});
	},

	_getServices: function () {
		return dojo.xhrGet({
			url: core.serviceURL('Quippe/ServiceInfo/Services'),
			content: { DataFormat: 'JSON' },
			handleAs: 'json',
			error: function () { return [] },
			load: function (data, ioArgs) {
				var list = [];
				dojo.forEach(core.forceArray(data.services), function (s) {
					list.push(s.contract);
				});
				return list;
			}
		});
	},

	_getRoles: function (roles) {
		return dojo.isArray(roles) ? roles : dojo.xhrGet({
			url: core.serviceURL('Quippe/UserSettings/Roles'),
			content: { DataFormat: 'JSON' },
			handleAs: 'json',
			error: function () { return [] },
			load: function (data, ioArgs) {
				return data.roles || [];
			}
		});
	},

	_loadExtensions: function (settings) {
		var extensions = [];

		if (settings.systemExtensions) {
			extensions = extensions.concat(settings.systemExtensions.split(','));
		};
		if (settings.extensions) {
			extensions = extensions.concat(settings.extensions.split(','));
		};

		if (extensions.length == 0) {
			return true;
		};

		var def = new dojo.Deferred();
		dojo.forEach(extensions, function (ext) {
			def.then(function () { return require([ext.trim().replace(/\./g, "/")]) });
		});

		return def.resolve(true);
	},

	showAboutDialog: function () {
		var versionInfo = dojo.xhrGet({
			url: core.serviceURL('Help/VersionInfo'),
			content: { DataFormat: 'JSON' },
			handleAs: 'json',
			error: core.showError,
			load: function (data, ioArgs) {
				return data.version || {};
			}
		});

		var title = core.getI18n("aboutquippe");
		var year = new Date().getFullYear();

		dojo.when(versionInfo, function (v) {
			var htm = '';

			htm += '<div style="margin:20px;width:400px;">';
			htm += '<img src="images/logo-quippe.jpg" alt="Quippe Logo" />';
			htm += '<div style="margin-top:12px;font-weight:bold;">Versions:</div>';
			htm += '<table>';
			htm += v.quippe ? '<tr><td>Quippe SDK:</td><td>' + v.quippe + '</td></tr>' : '';
			htm += v.medcinServer ? '<tr><td>Medcin Server:</td><td>' + v.medcinServer + '</td></tr>' : '';
			htm += v.medcinData ? '<tr><td>Medcin Data:</td><td>' + v.medcinData + '</td></tr>' : '';
			htm += v.intSize ? '<tr><td>Platform:</td><td>' + v.intSize + '-bit</td></tr>' : '';
			htm += '</table>';
			htm += '<p style="margin-top:12px;">&copy; ' + year + ' Medicomp Systems, Inc., Patents Pending</p>';
			htm += '<p>Quippe, Medcin, and Intelligent Prompt are trademarks of <a target="medicompSite" href="http://www.medicomp.com">Medicomp Systems, Inc</a></p>';
			htm += '<p>Portions of Quippe have been developed using the dojo toolkit.  License information available at <a target="dojoLicense" href="http://dojotoolkit.org/license">http://dojotoolkit.org/license</a>';
			htm += '</div>';

			var dlg = new qc.Dialog({ title: title, content: htm });
			dlg.show();
		});
	},


	showNotImplemented: function () {
		core.showError("Not implemented yet...");
	}
});
