define([
	"dijit/form/Button",
	"dijit/form/FilteringSelect",
	"dijit/layout/BorderContainer",
	"dijit/layout/ContentPane",
    "qc/design/_PropertyGridSupport",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom-construct",
    "dojo/dom-style",
	"dojo/json",
    "dojo/on",
	"dojo/query",
	"dojo/topic",
    "dojo/when",
    "qc/_core",
    "qc/design/LayoutBuilder",
    "qc/design/PropertyGrid",
    "qc/design/StandardDialog",
    "qc/design/ToolbarBuilder",
    "qc/ListView",
	"qc/StringUtil",
	"qc/SettingsEnumStore",
	"qc/design/SavePresetDialog"
], function (Button, FilteringSelect, BorderContainer, ContentPane, _PropertyGridSupport, array, declare, lang, aspect, domConstruct, domStyle, json, on, query, topic, when, core, LayoutBuilder, PropertyGrid, StandardDialog, ToolbarBuilder, ListView, StringUtil, SettingsEnumStore, SavePresetDialog) {
    return declare("qc.design.DesignerDialog", [StandardDialog, _PropertyGridSupport], {
    	title: 'Entry Component Designer',
        entryWidget: null,
        modelWidget: null,
        modelSettings: null,
        componentSettings: null,
        localSettings: null,
        parentSettings: null,
        presets: null,
        editingPresets: false,
        height: '425px',
		width: '620px',

	    startup: function () {
            if (!this._started) {
    
                this.toolbar = ToolbarBuilder.buildToolbar({
                    moveUp: { label: 'Move Up', icon: 'arrow_up_green', onClick: lang.hitch(this, this.onMoveUp), showLabel: true },
                    moveDown: { label: 'Move Down', icon: 'arrow_down_green', onClick: lang.hitch(this, this.onMoveDown), showLabel: true },
                    separator1: {},
                    selectPreset: { label: 'Preset:', disabled: true },
                    presetsComboBox: {
                    	widget: new FilteringSelect({
		                    searchAttr: 'text',
		                    store: new SettingsEnumStore(lang.hitch(this, function() {
			                    var list = [];

			                    for (var preset in this.presets) {
				                    list.push({
					                    text: preset,
					                    id: preset
				                    });
			                    }

			                    list.sort(function(a, b) {
				                    return StringUtil.compare(a["text"], b["text"], true);
			                    });

			                    return list;
		                    }), false, "text"),
		                    required: false,
		                    onChange: lang.hitch(this, this.onPresetChanged),
		                    style: 'margin-right: 10px; width: 170px'
	                    })
                    },
                    savePreset: { label: 'Save', icon: 'floppy_disk', onClick: lang.hitch(this, this.onSavePreset), showLabel:true, disabled: true },
                    savePresetAs: { label: 'Save As...', icon: 'floppy_disk', onClick: lang.hitch(this, this.onSavePresetAs), showLabel: true }
                }, null, 16);

                query('.dijitButtonText', this.toolbar.tools.selectPreset.domNode).style('color', 'black');
    
                this.lv = new ListView({ viewMode: 'simple' });
                this.pg = new PropertyGrid({ propertyManager: this, sortProperties: false, defaultGroup: 'Misc' });
                this.previewNode = domConstruct.create('div');
                domStyle.set(this.previewNode, { width: '100%', height: '100%' });
                domConstruct.place('<div style="font-style:italic;margin-bottom:6px;margin-left:12px;">Preview:</div>', this.previewNode);
    
                this.previewContainer = domConstruct.place('<div style="position:relative;display:block;margin-left:20px"></div>', this.previewNode);
                this.entryWidget = core.createFindingEntry({ text: 'finding text', designMode: true });
                this.entryWidget.placeAt(this.previewContainer);
                this.entryWidget.startup();
                this.entryWidget.getViewMode = function () { return 'expanded' };

                this.componentSettings = lang.clone(this.entryWidget.get('componentSettings'));

	            if (!this.presets) {
					this.presets = core.settings['componentSettingPresets'] ? json.parse(core.settings['componentSettingPresets']) : {};
				}

			    for (var preset in this.presets) {
				    this.presets[preset] = core.applyObjectOverrides(this.modelWidget.get('componentSettings'), this.presets[preset]);
			    }

				if (this.selectedPreset) {
					this.toolbar.tools.presetsComboBox.set('value', this.selectedPreset);
				}

	            var layoutTemplate = {
					margin: '0px',
					padding: '0px',
					top: [
			            { height: '28px', splitter: false, padding: '0px', content: this.toolbar }
					],
					center: {
						left: { width: '150px', splitter: true, content: this.lv, padding: '0px', style: { overflow: 'auto' } },
						center: { content: this.pg, padding: '0px' }
					},
					bottom: { height: '60px', content: this.previewNode }
				};

	            this.layoutPanel = LayoutBuilder.buildLayout(layoutTemplate);
    
                domStyle.set(this.layoutPanel.domNode, { width: this.width, height: this.height, margin: '0px', padding: '0px' });
                domStyle.set(this.containerNode, { padding: '2px' });
                this.contentArea.set('content', this.layoutPanel);
    
                this.applyModelProperties(this.modelWidget);
                this.loadComponentList();
    
                aspect.after(this.lv, "onItemClick", lang.hitch(this, this.onListItemClick), true);
                this.checkState();
                this.renderPreview();

                this.inherited(arguments);
            };
	    },

	    onPresetChanged: function(value) {
	    	if (this.presets[value]) {
	    		var previouslySelectedComponent = this.lv.getSelectedItem();
	    		this.componentSettings = lang.clone(this.presets[value]);

	    		this.loadComponentList();

	    		if (previouslySelectedComponent) {
	    			this.lv.setSelectedItem(this.lv.getItem(previouslySelectedComponent.data.id));
	    			this.onListItemClick(this.lv.getSelectedItem());
	    		}

	    		this.checkState();
	    		this.renderPreview();
	    		this.pg.refresh();

	    		this.selectedPreset = value;

	    		if (value != '' && value != null) {
				    this.toolbar.tools.savePreset.set("disabled", false);
			    }
	    	}
	    },

        onMoveUp: function () {
            var item = this.lv.getSelectedItem();
            if (!item) {
                return;
            };
    
            var items = this.lv.getChildren();
            var targetIndex = this.lv.getItemIndex(item.data.id);
            if (targetIndex > 0) {
                domConstruct.place(items[targetIndex].domNode, items[targetIndex - 1].domNode, 'before');
            };
            this.updateComponentSequence();
            this.checkState();
        },
    
        onMoveDown: function () {
            var item = this.lv.getSelectedItem();
            if (!item) {
                return;
            };
    
            var items = this.lv.getChildren();
            var targetIndex = this.lv.getItemIndex(item.data.id);
            if (targetIndex >= 0 && targetIndex < items.length - 1) {
                domConstruct.place(items[targetIndex].domNode, items[targetIndex + 1].domNode, 'after');
            };
            this.updateComponentSequence();
            this.checkState();
        },
    
        checkState: function () {
            var item = this.lv.getSelectedItem();
            if (!item) {
                this.toolbar.tools.moveUp.set('disabled', true);
                this.toolbar.tools.moveDown.set('disabled', true);
                return;
            };
    
            var index = this.lv.getItemIndex(item.data.id);
            var count = this.lv.getItemCount();
    
            this.toolbar.tools.moveUp.set('disabled', (index <= 0));
            this.toolbar.tools.moveDown.set('disabled', (index >= count - 1));
        },
    
        updateComponentSequence: function () {
            var comp = this.componentSettings || {};
            array.forEach(this.lv.getChildren(), function (item, i) {
                comp[item.data.id].sequence = i;
            });
            this.renderPreview();
        },
    
        applyModelProperties: function (modelWidget) {
            if (modelWidget && this.entryWidget && this.componentSettings) {
                array.forEach(this.modelWidget.detailProperties, function (propName) {
                    this.entryWidget.set(propName, this.modelWidget.get(propName));
                }, this);
    
                array.forEach(['text', 'label', 'postSep'], function (propName) {
                    if (this.modelWidget.get(propName)) {
                        this.entryWidget.set(propName, this.modelWidget.get(propName));
                    };
                }, this);
    
                this.componentSettings = core.applyObjectOverrides(this.componentSettings, this.modelWidget.get('componentSettings'));
                this.renderPreview();
            };
        },
    
        loadComponentList: function () {
            var list = [];
            core.forEachProperty(this.componentSettings, function (name, value) {
                if (!value.name) {
                    value.name = name;
                };
                if (!value.propertyName) {
                    value.propertyName = name;
                };
                if (value.sequence == undefined) {
                    value.sequence = 10;
                };
                list.push(value);
            });
    
            list.sort(function (a, b) { return a.sequence - b.sequence });
    
            this.lv.clear();
            array.forEach(list, function (item) {
                this.lv.addItem({ id: item.name, text: StringUtil.makeCaption(item.name) });
            }, this);
        },
    
        onListItemClick: function (item) {
            this.pg.set('selectedObject', this.componentSettings[item.data.id]);
            this.checkState();
        },
    
        renderPreview: function () {
            //this.entryWidget.set('componentSettings', lang.clone(this.componentSettings));
            this.entryWidget.renderComponents(this.componentSettings);
            this.entryWidget.updateComponentDisplay();
            this.entryWidget.updateTranscription();
        },
    
        _pgGetWrapper: function (obj) {
            return this;
        },
    
        _pgGetProperties: function (propertyGrid) {
            var compName = this.pg.selectedObject.name;
            var entryTypes = '';
            switch (compName) {
                case 'result':
                    entryTypes = '[singleCheck;doubleCheck]';
                    break;
                case 'text':
                    entryTypes = '[label]';
                    break;
                case 'value':
                    entryTypes = '[textBox;dropDown;dropDownList;label]';
                    break;
                case 'unit':
                    entryTypes = '[textBox;dropDown;dropDownList;label]';
                    break;
                case 'onset':
                    entryTypes = '[textBox;dateDropDown;dateTimeDropDown;dropDown;dropDownList;label]';
                    break;
                case 'duration':
                    entryTypes = '[textBox;dropDown;dropDownList;label]';
                    break;
                case 'timing':
                    entryTypes = '[timingPopup;label]';
                    break;
                case 'episode':
                    entryTypes = '[textBox;dropDown;dropDownList;label]';
                    break;
                case 'notation':
                    entryTypes = '[textBox;dropDown;dropDownList;label]';
                    break;
                default:
                    entryTypes = '';
                    break;
            };
    
            var list = [];
            if (entryTypes) {
                list.push({ name: 'entryType', options: entryTypes, group: 'General', reloadOnChange: true, defaultValue: (this.parentSettings && this.parentSettings[compName] ? this.parentSettings[compName].entryType : undefined) });
            };

            var componentProperties = this.entryWidget.components[compName]._pgGetProperties(propertyGrid);
            var self = this;

            array.forEach(componentProperties, function(property) {
                if (property.defaultValue == undefined && self.parentSettings && self.parentSettings[compName]) {
                    property.defaultValue = self.parentSettings[compName][property.name];
                }
            });

            list = list.concat(componentProperties);
    
            return list;
        },
    
        _pgGetPropertyValue: function (propertyInfo) {
            var comp = this.pg.selectedObject;
            if (!comp) {
                return;
            };
            //return comp[propertyInfo.name];
            var value = comp[propertyInfo.name];
            return value;
        },
    
        _pgSetPropertyValue: function (propertyInfo, value) {
            var comp = this.pg.selectedObject;
            if (comp && comp[propertyInfo.name] != value) {
    
                if (propertyInfo.name == 'entryType' && typeof value == 'string') {
                    var typeName = value.indexOf('/') >= 0 ? value : 'qc/note/Component_' + value;
	                var type = require(typeName);
                    if (!type) {
                        core.showError("Invalid entry type");
                        return false;
                    };
                };
    
                comp[propertyInfo.name] = value;
                if (propertyInfo.name == 'value' && comp.propertyName) {
                    this.entryWidget.set(comp.propertyName, value);
                };

                if (comp.name == 'unit' && propertyInfo.name == 'visible' && value == -1 && !comp['valueList'] && this.modelWidget.medcinId && comp['entryType'] == 'dropDown') {
                    var unitsEnumStore = new SettingsEnumStore('Medcin/Enums/Units?MedcinId=' + this.modelWidget.medcinId);

                    when(unitsEnumStore.loadData(), lang.hitch(this, function (units) {
                        if (units.length == 0) {
                            return;
                        }

                        var valueList = "[";

                        for (var i = 0; i < units.length; i++) {
                            if (i > 0) {
                                valueList += ";";
                            }

                            valueList += units[i].id + "=" + units[i].text;
                        }

                        valueList += "]";

                        this._pgSetPropertyValue({
                            name: 'valueList'
                        }, valueList);
                    }));
                }

                this.renderPreview();
                this.pg.refresh();
                return true;
            }
            else {
                return false;
            };
        },
    
        isInherited: function (comp, propertyName) {
            var localValue = comp[propertyName];
            if (localValue == undefined) {
                return false;
            };
    
            var parentValue = this.parentSettings && this.parentSettings[comp.name] ? this.parentSettings[comp.name][propertyName] : undefined;
            if (parentValue == undefined) {
                return false;
            };
    
            return localValue === parentValue;
        },
    
        getComponentSettings: function () {
            return lang.clone(this.componentSettings);
        },
    
		getComponentPresets: function() {
			if (this.presets && !core.isEmpty(this.presets)) {
				return lang.clone(this.presets);
			}

			return null;
		},

		getSelectedPreset: function() {
			return this.selectedPreset;
		},

		onSavePresetAs: function() {
			var createDialog = new SavePresetDialog();

			createDialog.presets = this.presets;
			createDialog.set("presetName", this.toolbar.tools.presetsComboBox.get("value"));
			createDialog.show();

			on(createDialog, "execute", lang.hitch(this, function () {
				this.presets[createDialog.get("presetName")] = this.getComponentSettings();
				this.toolbar.tools.presetsComboBox.set("value", createDialog.get("presetName"));
				this.persistPresets();
			}));
		},

		onSavePreset: function() {
			this.presets[this.toolbar.tools.presetsComboBox.get("value")] = this.getComponentSettings();
			this.persistPresets();
		},

		persistPresets: function() {
			var settings = {};

			settings['ComponentSettingPresets'] = json.stringify(this.presets);
			core.settings['componentSettingPresets'] = json.stringify(this.presets);

			core.xhrPost({
				url: core.serviceURL('Quippe/UserSettings/Data'),
				content: settings,
				error: core.showError,
				load: function () {
					topic.publish('/qc/SettingsChanged', settings);
					return true;
				}
			});
		}
    });
});