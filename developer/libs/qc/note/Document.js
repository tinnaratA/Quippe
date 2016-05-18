define([
    "qc/note/_Group",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/has",
    "dojo/query",
	"dojo/request",
    "dojo/string",
    "dojo/topic",
    "dojo/json",
    "qc/XmlUtil",
    "qc/StringUtil",
    "qc/design/PrintSettingsEditor",
    "qc/design/StandardDialog",
    "qc/_core",
	"qc/design/StyleEditorDialog",
    "qc/DateUtil",
    "qc/lang/qscript/Compiler"
], function (_Group, registry, array, declare, lang, dom, domClass, domConstruct, has, query, request, string, topic, json, XmlUtil, StringUtil, PrintSettingsEditor, StandardDialog, core, StyleEditorDialog, DateUtil, ScriptCompiler) {
    var Document = declare("qc.note.Document", [_Group], {
	    partType: 'document',
	    partLevel: 1,
	    showHeader: false,
	    sepStyle: 'semicolon',
	    providerRole: 0,
	    finalized: false,
	    printSettings: null,
	    title: '',
        name: 'Document',

	    constructor: function() {
	        this.componentSettings = lang.clone(this.defaultComponentSettings);
	    }, 

	    postCreate: function() {
		    domClass.add(this.domNode, "note");
		    domClass.add(this.domNode, "hasFindings");
		    domClass.add(this.domNode, "hasEntries");
		    domClass.add(this.domNode, "nameContainer");
		    this.inherited(arguments);
	    },

	    _setThemeAttr: function(value) {
		    var styleNode = dom.byId('DocumentTheme');

		    this.theme = value == 'none' ? '' : value || '';
		    var themeId = this.theme || core.settings.defaultDocumentTheme || '';
		    var self = this;
		    if (themeId) {
		        if (themeId != this.currentTheme) {
		            this.currentTheme = themeId;
		            core.xhrGet({
		                url: core.serviceURL('Quippe/ContentLibrary/Data'),
		                content: { "id": themeId },
		                error: function () {
		                },
		                load: function (data, ioArgs) {
		                    if (!styleNode) {
		                        styleNode = domConstruct.create('style');
		                        styleNode.setAttribute('type', 'text/css');
		                        styleNode.setAttribute('id', 'DocumentTheme');
		                        var targetNode = dom.byId('DocumentStyleSheet') || dom.byId('OverrideTheme');
		                        if (targetNode) {
		                            domConstruct.place(styleNode, targetNode, 'before');
		                        }
		                        else {
		                            domConstruct.place(styleNode, query("head")[0]);
		                        };
		                    }
		                    styleNode.innerHTML = data;
		                }
		            });
		        }
		    }
		    else {
		        if (styleNode) {
		            domConstruct.destroy(styleNode);
		        }
		    };
	    },

	    _setSepStyleAttr: function(value) {
		    if (value != this.sepStyle) {
			    if (this.sepStyle != null) {
				    domClass.remove(this.domNode, 'sepStyle_' + this.sepStyle);
			    };
			    domClass.add(this.domNode, 'sepStyle_' + this.sepStyle);
			    this.transcribe();
		    };
		    core.settings.sepStyle = value;
		    this.sepStyle = value;
	    },

	    _getProviderRoleAttr: function() {
		    return this.providerRole || 0;
	    },

	    _setProviderRoleAttr: function(value) {
		    if (typeof value == 'number') {
			    this.providerRole = value;
		    }
		    else if (typeof value == 'string') {
			    switch (value.toLowerCase()) {
				    case '0':
					    this.providerRole = 0;
					    break;
				    case '1':
				    case 'doctor':
					    this.providerRole = 1;
					    break;
				    case '2':
				    case 'nurse':
					    this.providerRole = 2;
					    break;
				    default:
					    this.providerRole = 0;
					    break;
			    }
		    }
		    else {
			    this.providerRole = 0;
		    };
	    },

	    _getPrintSettingsAttr: function() {
		    var settings = this.printSettings;
		    if (!settings) {
			    settings = { useDefault: true };
		    };
		    array.forEach(['pageSize', 'orientation', 'margins', 'pageWidth', 'pageHeight', 'pageHeaderId', 'pageFooterId'], function(name) {
			    if (!settings[name]) {
				    settings[name] = core.settings['printing' + StringUtil.toCamelUpper(name)] || '';
			    };
		    });
		    settings.toString = function() {
			    return StringUtil.simpleObjectDescription(this, 50)
		    };
		    return settings;
	    },
	    _setPrintSettingsAttr: function(value) {
		    if (value) {
			    this.printSettings = value;
		    };
	    },

	    updateDisplay: function (viewMode) {
	    	this.renumberProblemSections();
		    this._updateChildDisplay(viewMode);
	    },

	    renumberProblemSections: function () {
	        query('.problemSection', this.domNode).map(registry.byNode).forEach(function (section, i) {
	            section.problemNumber = i + 1;
	            section.set('text', ScriptCompiler.exec(section, core.settings.problemSectionTitle || '"Problem " & problemNumber'));
	        });
	    },

	    getItem: function() {
		    return null;
	    },

	    setFromXmlAttribute: function(name, value) {
		    switch (name.toLowerCase()) {
			    case "id":
				    this.templateId = value;
				    break;
			    case "showinfoindicator":
				    core.settings.showInfoIndicator = (value == 'true' ? true : false);
				    break;
			    default:
				    this.inherited(arguments);
		    };
	    },

	    parseXmlChildElements: function(widget, xmlNode, sourceClass) {
		    this.parseComponentSettings(xmlNode);
		    this.parseBindings(xmlNode);
		    this.parseComponentPresets(xmlNode);

		    var child = null;
		    array.forEach(xmlNode.childNodes, function(xmlChild) {
			    if (xmlChild.nodeType === 1) {
				    switch (xmlChild.tagName.toLowerCase()) {
					    case 'styles':
						    this.createDocumentStylesheet(xmlChild);
						    break;
					    case 'sources':
						    break;
					    case 'printsettings':
						    this.printSettings = XmlUtil.elementToObject(xmlChild);
						    break;
					    default:
						    child = this.parseXml(xmlChild, sourceClass);
						    if (child) {
						        widget.addElement(child, null, null, true);
						        if (sourceClass) {
						            domClass.add(child.domNode, sourceClass);
						        };
						    };
				    };
			    };
		    }, this);
	    },

		parseComponentPresets: function (xmlNode) {
			var xComponentPresets = XmlUtil.selectChildElement(xmlNode, 'ComponentPresets');

			if (xComponentPresets) {
				xmlNode.removeChild(xComponentPresets);
			};
		},

	    createDocumentStylesheet: function(node) {
		    var tempSheet = dom.byId('DocumentStyleSheet');
		    if (tempSheet) {
			    domConstruct.destroy(tempSheet);
		    }
		    var htm = '';
		    htm += '<style type="text/css" id="DocumentStyleSheet">';
		    htm += node.textContent || node.text || node.innerText || node.innerHTML || '';
		    htm += '</style>';

		    var overrideNode = dom.byId('OverrideTheme');
		    if (overrideNode) {
		        domConstruct.place(htm, overrideNode, 'before');
		    }
		    else {
		        domConstruct.place(htm, document.getElementsByTagName('head')[0]);
		    };
	    },

	    writeNoteAttributes: function (writer, mode) {
	        //if (mode == 'document') {
	        //    writer.attribute('Theme', this.currentTheme || '', '');
	        //}
	        //else {
	        //    writer.attribute('Theme', this.theme || '', '');
	        //};

	        //writer.attribute('SepStyle', this.sepStyle || '0', '0');

		    writer.attribute('ProviderRole', this.providerRole || '0', '0');
		    writer.attribute('StyleClass', this.get('styleClass') || '', '');
		    writer.attribute('Title', this.get('title') || '', '');

		    if (this.finalized) {
			    writer.attribute('Finalized', true);
		    }

		    if (this.findingPlacement) {
			    writer.attribute('FindingPlacement', this.findingPlacement);
		    }

		    writer.attribute('RuleSet', this.ruleSet || '', '');

		    if (writer.parms.encounterDocument) {
		        writer.attribute('TemplateId', this.templateId || '', '');
		        writer.attribute('TemplateName', this.templateName || '', '');
	            writer.attribute('Theme', this.currentTheme || '', '');
            }
            else {
	            writer.attribute('Theme', this.theme || '', '');
            };
	    },

	    writeNoteChildren: function(writer, mode) {
		    this.writeCustomStyles(writer, mode);

		    writer.parms = writer.parms || {};

		    if (writer.parms.saveSources && writer.parms.editor && writer.parms.editor.lists) {
		        var lists = writer.parms.editor.lists;
		        writer.beginElement('Sources');
		        for (var listId in lists) {
		            writer.beginElement('Source');
		            writer.attribute('id', listId, '');
		            writer.attribute('Text', lists[listId].text || '', '');
		            writer.attribute('Type', lists[listId].type || '', '');
		            writer.attribute('ListType', lists[listId].listType || '', '');
		            writer.endElement();
		        };
		        writer.endElement();
		    };

		    if (writer.parms.includeEncounterContext) {
		        writer.parms.includePatient = true;
		        writer.parms.includeEncounter = true;
		        writer.parms.includeProvider = true;
		    };

		    if (writer.parms.includePatient && core.Patient) {
		        writer.writeObject('Patient', core.Patient, true);
            };

		    if (writer.parms.includeEncounter && core.Encounter) {
		        writer.writeObject('Encounter', core.Encounter);
		    };

		    if (writer.parms.includeProvider && core.Provider) {
		        writer.writeObject('Provider', core.Provider);
		    };

		    if (this.printSettings && !this.printSettings.useDefault) {
		        writer.writeObject('PrintSettings', this.printSettings);
		    };

		    return this.inherited(arguments);
	    },

	    writeCustomStyles: function (writer, mode) {
		    var styleText = '';
		    var domNode = document.getElementById('DocumentStyleSheet');
		    if (domNode) {
			    styleText = (domNode.textContent || domNode.innerHTML || '').trim();
			    if (styleText) {
				    writer.element('Styles', null, styleText);
				    return;
			    }
		    };
	        // Current DOM stylesheet is the always the source.  Restoring the sourceXml CSS prevents
	        // the user from deleting their custom styles
            //
		    //if (this.sourceXmlNode) {
			//    var xmlNode = XmlUtil.selectChildElement(this.sourceXmlNode, 'Styles');
			//    if (xmlNode) {
			//	    writer.copyElement(xmlNode);
			//	    return;
			//    };
		    //};
	    },

	    getDropAction: function(source, evt) {
		    switch (source.type || 'unknown') {
			    case "finding":
			    case "chapter":
			    case "section":
			    case "group":
			    case "noteElement":
				    return source.node ? 'move' : null;

			    case "list":
			    case "term":
			    case "element":
		        case "image":
                case "macro":
				    return 'add';
			    default:
				    return null;
		    };
	    },

	    editPrintSettings: function() {
		    var settings = this.get('printSettings');
		    var editor = new PrintSettingsEditor();
		    editor.startup();
		    editor.set('value', settings);
		    var dialog = new StandardDialog({ title: 'Print Settings' });
		    dialog.set('content', editor);

		    hExec = dialog.on('execute', lang.hitch(this, function() {
			    hExec.remove();
			    hCancel.remove();
			    this.set('printSettings', editor.get('value'));
			    topic.publish('/pg/Refresh');
		    }));

		    hCancel = dialog.on('cancel', lang.hitch(this, function() {
			    hExec.remove();
			    hCancel.remove();
		    }));

		    dialog.show();
	    },

	    finalizeNote: function() {
		    this.finalized = true;
		    return this.inherited(arguments);
	    },

	    ruleSet: '',

	    //componentSettings: {
		//    label: { name: 'label', propertyName: 'label', entryType: 'separator', visible: 0, sequence: 0 },
		//    result: { name: 'result', propertyName: 'result', entryType: 'doubleCheck', styleClass: 'square', visible: 0, sequence: 1 },
		//    text: { name: 'text', propertyName: 'text', entryType: 'label', visible: -1, showColors: true, toggleResult: true, showLookback: true, sequence: 2 },
		//    value: { name: 'value', propertyName: 'value', entryType: 'textBox', visible: 0, setsResult: true, sequence: 3 },
		//    unit: { name: 'unit', propertyName: 'unit', entryType: 'dropDown', visible: 0, sequence: 4 },
		//    onset: { name: 'onset', propertyName: 'onset', entryType: 'dateTimeDropDown', visible: 0, setsResult: true, sequence: 5 },
		//    duration: { name: 'duration', propertyName: 'duration', entryType: 'textBox', visible: 0, setsResult: true, sequence: 6 },
		//    episode: { name: 'episode', propertyName: 'episode', entryType: 'textBox', visible: 0, setsResult: true, sequence: 7 },
		//    timing: { name: 'timing', propertyName: 'timing', entryType: 'timingPopup', visible: 0, sequence: 8 },
		//    notation: { name: 'notation', propertyName: 'notation', entryType: 'textBox', visible: 0, setsResult: true, sequence: 9 },
		//    termChooser: { name: 'termChooser', propertyName: 'medcinId', entryType: 'termChooser', styleClass: 'plain', visible: 0, setsResult: false, sequence: 10 },
		//    postSep: { name: 'postSep', propertyName: 'postSep', entryType: 'separator', visible: -1, showColors: true, sequence: 11 }
	    //},f

	    _getComponentSettingsAttr: function() {
	    	if (!this._cachedComponentSettings) {
				this._cachedComponentSettings = core.applyObjectOverrides(this.defaultComponentSettings, this.componentSettings);
	    	}

		    return this._cachedComponentSettings;
	    },
	    _setComponentSettingsAttr: function(value) {
		    this._cachedComponentSettings = null;
		    this.inherited(arguments);
	    },

	    writeComponentSettings: function(writer, mode) {
		    var customSettings = core.getObjectOverrides(this.defaultComponentSettings, this.componentSettings);
		    if (customSettings) {
		        writer.writeObject('EntryComponents', customSettings);
		    };
	    },

        // === property definitions === 
	    _pgPropDef_name: function() {
	        var def = this.inherited(arguments);
	        def.readOnly = true;
	        def.defaultValue = 'Document';
	        return def;
	    },

	    _pgPropDef_anchor: function () { return null },
	    _pgPropDef_text: function () { return null },
	    _pgPropDef_level: function () { return null },
	    _pgPropDef_showEmpty: function () { return null },
	    _pgPropDef_freeTextMedcinId: function () { return null },
	    _pgPropDef_impliedPrefixes: function () { return null },
	    _pgPropDef_groupKeys: function () { return null },
	    _pgPropDef_groupingRule: function () { return null },
	    _pgPropDef_placementId: function () { return null },
	    _pgPropDef_position: function () { return null },
	    _pgPropDef_prefixActionOwnValue: function () { return null },
	    _pgPropDef_prefixValue: function () { return null },


	    _pgPropDef_providerRole: function() {
	        return { name: 'providerRole', type: 'integer', enumSource: '[0=None;1=Doctor;2=Nurse]', group: 'Behavior', description: core.getI18n('tooltipProviderRole'), defaultValue:0 };
	    },

	    _pgPropDef_theme: function() {
	        return { name: 'theme', group: 'Style', enumSource: lang.hitch(this, this.onGetThemes), description: core.getI18n('tooltipTheme') };
	    },

	    _pgPropDef_documentStyles: function () {
	        return { name: 'documentStyles', group: 'Style', editorCallback: lang.hitch(this, this.onEditStyles), description: core.getI18n('tooltipDocumentStyles') };
	    },

	    _pgPropDef_printSettings: function() {
	        return {
	            name: 'printSettings',
	            type: 'object',
	            editorCallback: lang.hitch(this, this.editPrintSettings),
	            readOnly: true,
	            showAsJson: true,
	            group: 'Style',
	            isDefaultValue: function (value) { return value && value.useDefault },
                reloadOnChange: true
	        };
	    },

	    _pgPropDef_title: function() {
	        return { name: 'title', group: 'Information' };
	    },

	    _pgPropDef_ruleSet: function() {
	        if (has('quippe-bh-extensions')) {
	            return { name: 'ruleSet', group: 'Behavior' };
	        }
	        else {
	            return null;
	        }
	    },

	    onEditStyles: function() {
		    core.doDialog(StyleEditorDialog);
	    },

	    onGetThemes: function() {
		    if (!this._cachedThemes) {
			    this._cachedThemes = request(core.serviceURL('Quippe/ContentLibrary/Search'), {
				    query: { typeName: 'theme', dataFormat: 'JSON' },
				    handleAs: 'json'
			    }).then(function(data) {
				    return data && data.items ? data.items : [];
			    }, function(err) {
				    core.showError(err);
			    });
		    };
		    return this._cachedThemes;
	    }
    });

	core.settings.noteElementClasses["qc/note/Document"] = Document;

	return Document;
});