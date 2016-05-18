define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
	"dojo/json",
    "qc/_core",
	"qc/XmlUtil",
	"qc/design/DesignerDialog",
	"qc/StringUtil",
	"qc/XmlWriter"
], function (array, declare, lang, domClass, json, core, XmlUtil, DesignerDialog, StringUtil, XmlWriter) {
    return declare("qc.note.ComponentSettingsMixin", [], {
        defaultComponentSettings: {
            label: { name: 'label', propertyName: 'label', entryType: 'separator', visible: 0, sequence: 0 },
            result: { name: 'result', propertyName: 'result', entryType: 'doubleCheck', styleClass: 'square', visible: 0, sequence: 1, togglePhrasing: false },
            text: { name: 'text', propertyName: 'text', entryType: 'label', visible: -1, showColors: true, toggleResult: true, showLookback: true, sequence: 2 },
            value: { name: 'value', propertyName: 'value', entryType: 'textBox', visible: 0, setsResult: true, sequence: 3 },
            unit: { name: 'unit', propertyName: 'unit', entryType: 'dropDown', visible: 0, sequence: 4 },
            onset: { name: 'onset', propertyName: 'onset', entryType: 'dateTimeDropDown', visible: 0, setsResult: true, sequence: 5, timeDropDownMinorIncrement: 15, timeDropDownMajorIncrement: 60, timeDropDownMaxHeight: 250 },
            duration: { name: 'duration', propertyName: 'duration', entryType: 'textBox', visible: 0, setsResult: true, sequence: 6 },
            episode: { name: 'episode', propertyName: 'episode', entryType: 'textBox', visible: 0, setsResult: true, sequence: 7 },
            timing: { name: 'timing', propertyName: 'timing', entryType: 'timingPopup', visible: 0, sequence: 8 },
            notation: { name: 'notation', propertyName: 'notation', entryType: 'textBox', visible: 0, setsResult: true, sequence: 9 },
            termChooser: { name: 'termChooser', propertyName: 'medcinId', entryType: 'termChooser', styleClass: 'plain', visible: 0, setsResult: false, sequence: 10 },
            actionButton: { name: 'actionButton', propertyName: 'actionButton', entryType: 'actionButton', visible: 0, setsResult: false, sequence: 11 },
            postSep: { name: 'postSep', propertyName: 'postSep', entryType: 'separator', visible: -1, showColors: true, sequence: 12 }
        },

        settingsName: 'inherited',
        componentSettings: null,

        _getSettingsNameAttr: function () {
            return this.settingsName;
        },

        _setSettingsNameAttr: function (value) {
            var presets = core.settings['componentSettingPresets'] ? json.parse(core.settings['componentSettingPresets']) : {};

            if (presets[value]) {
                this.set('componentSettings', lang.clone(presets[value]));
            }

            else {
                this.settingsName = value;
            }

            if (!this.getViewMode || this.getViewMode() == 'design') {
                this.renderComponents();
            }
        },

        _getComponentSettingsAttr: function () {
            if (this._cachedComponentSettings) {
                return this._cachedComponentSettings;
            };

            var parent = this.getParentNoteElement();

            if (parent) {
                if (this.settingsName == 'inherited' || !this.settingsName) {
                    return parent.get('componentSettings');
                }
                else {
                    this._cachedComponentSettings = core.applyObjectOverrides(this.defaultComponentSettings, this.getDerivedProperty('componentSettings'));
                    return this._cachedComponentSettings;
                }
            }

            else {
                return core.applyObjectOverrides(this.defaultComponentSettings, this.componentSettings);
            }
        },

        _setComponentSettingsAttr: function (value) {
            this._cachedComponentSettings = null;
            if (typeof value == 'undefined' || value == null) {
                this.settingsName = 'inherited';
                this.componentSettings = null;
            }
            else if (typeof value == 'string') {
                switch (value) {
                    case 'auto':
                        throw ("Auto Component Settings Not Implemented Yet");
                        break;
                    case 'inherited':
                    case '':
                        this.settingsName = 'inherited';
                        this.componentSettings = null;
                        break;
                    case 'custom':
                    case '[object Object]':
                        return;
                    default:
                        var presets = core.settings['componentSettingPresets'] ? json.parse(core.settings['componentSettingPresets']) : {};

                        if (presets[value]) {
                            this.settingsName = 'custom';
                            this.componentSettings = lang.clone(presets[value]);
                        }

                        else {
                            var tempValue = {}
                            array.forEach(value.split(' '), function (name) {
                                tempValue[name] = { visible: -1 };
                            });
                            this.settingsName = 'custom';
                            this.setDerivedProperty('componentSettings', tempValue);
                        }

                        break;
                };
            }

            else {
                this.settingsName = 'custom';
                this.setDerivedProperty('componentSettings', value);
            }

            this.renderComponents();
        },

        renderComponents: function () {
            this.updateDisplay();
        },

        writeComponentSettings: function (writer, mode) {
            var settings = this.serializeAllSettings ? this.get('componentSettings') : this.componentSettings;
            if (settings) {
                writer.writeObject('EntryComponents', settings);
            };
        },

        writeCustomAttributes: function (writer, mode) {
            this.inherited(arguments);
        },

        parseComponentSettings: function (xmlNode) {
            var xSettings = XmlUtil.selectChildElement(xmlNode, 'EntryComponents');

            if (xSettings) {
                var oSettings = XmlUtil.elementToObject(xSettings);

                if (oSettings) {
                    if (oSettings.preSep && !oSettings.label) {
                        oSettings.label = oSettings.preSep;

                        if (oSettings.label.name == "preSep") {
                            oSettings.label.name = "label";
                        }

                        if (oSettings.label.propertyName == "preSep") {
                            oSettings.label.propertyName = "label";
                        }

                        if (oSettings.label.defaultValue) {
                            oSettings.label.value = oSettings.label.defaultValue;
                            delete oSettings.label.defaultValue;
                        }

                        delete oSettings.preSep;
                    }

                    else if (oSettings.label) {
                        if (oSettings.label.name == "Label") {
                            oSettings.label.name = "label";
                        }

                        if (oSettings.label.propertyName == "Label") {
                            oSettings.label.propertyName = "label";
                        }
                    }

                    //this.set('componentSettings', oSettings);
                    this.componentSettings = oSettings;
                    //this.setDerivedProperty('componentSettings', oSettings);
                    this.settingsName = 'custom';
                }

                xmlNode.removeChild(xSettings);
            }
        },

        _pgPropDef_settingsName: function () {
            return {
                name: 'settingsName',
                caption: 'Components',
                options: lang.hitch(this, function () {
                    var presets = [];

                    for (var preset in (core.settings['componentSettingPresets'] ? json.parse(core.settings['componentSettingPresets']) : {})) {
                        presets.push({ text: preset, id: preset });
                    }

                    presets = presets.sort(function (a, b) {
                        return StringUtil.compare(a["text"], b["text"], true);
                    });

                    presets.splice(0, 0, { text: 'inherited', id: 'inherited' }, { text: 'custom', id: 'custom' });

                    return presets;
                }),
                setter: lang.hitch(this, function (value) {
                    switch (value) {
                        case 'auto':
                        case 'inherited':
                            this.set('componentSettings', null);
                            break;
                    }

                    this.set('settingsName', value);
                }),
                reloadOnChange: true,
                group: 'Components',
                description: core.getI18n('tooltipComponents'),
                defaultValue: 'inherited'
            }
        },

        _pgPropDef_componentSettings: function () {
            if (this.get('settingsName') == 'custom') {
                return {
                    name: 'componentSettings',
                    caption: 'Component Settings',
                    group: 'Components',
                    editorCallback: lang.hitch(this, this.onEditComponents),
                    formatter: function (value) {
                        return '';
                    },
                    description: core.getI18n('tooltipComponentSettings'),
                    setter: lang.hitch(this, function (value) {
                        if (value != this.settingsName) {
                            var presets = core.settings['componentSettingPresets'] ? json.parse(core.settings['componentSettingPresets']) : {};

                            if (presets[value]) {
                                this.set('componentSettings', lang.clone(presets[value]));
                            }

                            switch (value) {
                                case 'auto':
                                case 'inherited':
                                    this.set('componentSettings', null);
                                    break;
                                default:
                                    value = 'custom';
                                    break;
                            };
                            this.settingsName = value;
                            return true;
                        };
                        return false;
                    })
                }
            }
            else {
                return null;
            };
        },

        onEditComponents: function () {
            var modelWidget = null;
            if (domClass.contains(this.domNode, 'qcFindingEntry')) {
                modelWidget = this;
            }
            else {
                modelWidget = core.createFindingEntry({ text: 'finding text' });
                modelWidget.componentSettings = this.get('componentSettings');
            };
            var parentElement = this.getParentNoteElement();
            var parentSettings = parentElement ? parentElement.get('componentSettings') : this.defaultComponentSettings;

            core.doDialog(DesignerDialog, { modelWidget: modelWidget, parentSettings: parentSettings, parentElement: parentElement, localSettings: this.componentSettings }, function (dlg) {
                this.set('componentSettings', dlg.getComponentSettings());
            }, null, this);
        }
    });
});