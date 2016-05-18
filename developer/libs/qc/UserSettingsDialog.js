define([
    "qc/Dialog",
    "qc/FilteringSelect",
    "qc/SettingsEnumStore",
    "dijit/_Container",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/Select",
    "dijit/form/TextBox",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
	"dojo/request",
    "dojo/text!qc/templates/UserSettingsDialog.htm",
    "dojo/topic",
    "dojo/when",
    "dojo/on",
    "qc/_core",
    "qc/StringUtil",
    "qc/CheckList"
], function (Dialog, FilteringSelect, SettingsEnumStore, _Container, _WidgetBase, _WidgetsInTemplateMixin, Button, CheckBox, Select, TextBox, ContentPane, TabContainer, registry, array, declare, lang, domClass, domConstruct, query, request, UserSettingsDialogTemplate, topic, when, on, core, StringUtil, CheckList) {
    return declare("qc.UserSettingsDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: "Options",

        templateString: UserSettingsDialogTemplate,
        schema: null,
        origSettings: null,
        pagesBuilt: false,

        startup: function () {
            if (!this.started) {
                this.cmdOK.set("label", core.getI18n("cmdOK"));
                this.cmdCancel.set("label", core.getI18n("cmdCancel"));

                this.inherited(arguments);
            }
        },

        show: function () {
            //this.inherited(arguments);
            var self = this;
            this.inherited(arguments);
            when(self.getSchema(), function (schema) {
                self.buildPages.call(self, schema);
                when(self.loadSettings(), function (settings) {
                    return true;
                });
            });
        },

        getSchema: function () {
            return this.schema || request(core.serviceURL('Quippe/UserSettings/Schema'), {
                query: { "DataFormat": "JSON" },
                handleAs: 'json'
            }).then(function (data) {
                return data;
            }, function (err) {
                core.showError(err);
            });
        },

        buildPages: function (schema) {
            if (this.pagesBuilt) {
                return;
            };

            var tbc = this.tabControl;
            var lbl = null;
            var box = null;
            var ctl = null;

            var shouldShow = function (item) {
                if (!item) {
                    return false;
                };

                if (item.hidden) {
                    return false;
                };

                if (item.dependsOnService) {
                    return array.indexOf(core.settings.services, item.dependsOnService) >= 0;
                };

                return true;
            };

            var self = this;

            array.forEach(core.forceArray(schema.settings.section), function (section) {
                var sectionContent = domConstruct.create('div');
                domClass.add(sectionContent, 'sectionContent');
                if (shouldShow(section)) {
                    array.forEach(core.forceArray(section.group), function (group) {
                        if (shouldShow(group)) {
                            domConstruct.place('<div class="groupHeading">' + (group.caption || '') + '</div>', sectionContent);
                            var groupContent = domConstruct.create('div');
                            domClass.add(groupContent, 'groupContent');
                            array.forEach(core.forceArray(group.item), function (item) {
                                if (shouldShow(item)) {
                                    var itemContent = domConstruct.create('div');
                                    domClass.add(itemContent, 'item');
                                    lbl = domConstruct.create('div');
                                    domClass.add(lbl, 'itemLabel');
                                    lbl.innerHTML = (item.caption || StringUtil.makeCaption(item.id)) + ':';
                                    if (item.description) {
                                        lbl.setAttribute('title', item.description);
                                    };
                                    domConstruct.place(lbl, itemContent);

                                    box = domConstruct.create('div')
                                    domClass.add(box, 'itemValueBox');
                                    domConstruct.place(box, itemContent);

                                    if (item.enumSource) {
                                        if (item.multipleChoice) {
                                            ctl = new CheckList({ style: { maxHeight: '8em', border: '1px #999999 solid' , width:'300px'} });
                                            ctl.loadEnumSource(item.enumSource);
                                        }
                                        else {
                                            var store = new SettingsEnumStore(item.enumSource, item.allowEmpty);
                                            ctl = new FilteringSelect({ searchAttr: 'text', store: store, maxHeight: 300 });
                                        }
                                    }
                                    else {
                                        switch (item.type) {
                                            case 'boolean':
                                                ctl = new CheckBox();
                                                break;
                                            default:
                                                ctl = new TextBox();
                                                break;
                                        };
                                    };

                                    domClass.add(ctl.domNode, 'itemValue');
                                    ctl.itemId = item.id;
                                    ctl.info = item;
                                    domConstruct.place(ctl.domNode, box);
                                    ctl.startup();
                                    domConstruct.place(itemContent, groupContent);
                                };
                            });
                            domConstruct.place(groupContent, sectionContent);
                        };
                    });
                    if (section.name == 'Advanced' && core.settings.enabledSettingsReset) {
                        var resetLink = domConstruct.place('<div style="margin-top:12px;color:#0000ff;cursor:pointer;">Restore Defaults...</div>', sectionContent);
                        on(resetLink, 'click', lang.hitch(self, self.onResetClick));
                    };
                    var tab = new ContentPane({ title: section.name, content: sectionContent });
                    tbc.addChild(tab);
                };
            });

            this.pagesBuilt = true;
            return true;
        },

        loadSettings: function () {
            var self = this;
            var controls = query('.itemValue', this.tabControl.domNode).map(registry.byNode);
            return request(core.serviceURL('Quippe/UserSettings/Data'), {
                query: { "DataFormat": "JSON" },
                handleAs: 'json',
                preventCache: true
            }).then(function(data) {
                self.origSettings = {};
                array.forEach(core.forceArray(data.settings), function (item) {
                    self.origSettings[item.id] = item.value;
                    var ctl = array.filter(controls, function (x) { return x.itemId == item.id })[0] || null;
                    if (ctl) {
                        ctl.set('value', item.value);
                    };
                });
                return data;
            }, function(err) {
                core.showError(err);
            });
        },

        saveSettings: function () {
            var restartRequired = false;
            var data = null;
            var newValue = null;
            var origSettings = this.origSettings;
            var changedSettings = {};
            var changeCount = 0;

            var fnGetValue = function (w) {
                var value = w.get('value');
                if (w.info) {
                    if (w.info.multipleChoice) {
                        return value instanceof Array ? value.join(',') : value;
                    };

                    switch (w.info.type) {
                        case 'integer':
                            return parseInt(value, 10) || 0;
                        case 'float':
                            return parseFloat(value) || 0;
                        case 'boolean':
                            return (value == 'on') ? true : false;
                        default:
                            return value || '';
                    };
                }
                else {
                    return value;
                };
            };

            var fixName = function (x) {
                return x.charAt(0).toLowerCase() + x.substr(1);
            };

            query('.itemValue', this.containerNode).map(registry.byNode).forEach(function (widget) {
                var id = widget.itemId;
                if (id) {
                    newValue = fnGetValue(widget);
                    //console.log(origSettings[id]);
                    if(typeof origSettings[id] != "undefined") {
                        if (newValue.toString() !== origSettings[id].toString()) {
                            if (!data) {
                                data = {};
                            }
                            data[id] = newValue;
                            if (widget.info && widget.info.requiresRestart) {
                                restartRequired = true;
                            }
                            else {
                                changedSettings[fixName(id)] = newValue;
                                core.settings[fixName(id)] = newValue;
                                changeCount++;
                            }
                        }
                    }
                }
            });
            if (data) {
                request.post(core.serviceURL('Quippe/UserSettings/Data'), {
                    data: data
                }).then(function(data) {
                    if (restartRequired) {
                        core.alert({ title: core.getI18n('restartRequiredTitle'), message: core.getI18n('restartRequiredMessage') });
                    };
                    if (changeCount > 0) {
                        topic.publish('/qc/SettingsChanged', changedSettings);
                    };
                }, function(err) {
                    core.showError(err);
                });
            };
        },

        onResetClick: function () {
            var self = this;
            core.confirm({
                title: 'Restore Defaults',
                message: '<div style="width:350px">This action will restore all of your user settings to the system defaults.  You will need to reload the application for the changes to take effect.  Are you sure you want to restore your user settings?</div>',
                yesCallback: function () { 
                    request.post(core.serviceURL('Quippe/UserSettings/Reset?DataFormat=JSON'), {handleAs:'json'}).then(function (data) {
                        if (data.result && data.result.status == 'OK') {
                            self.hide();
                            core.alert({ title: core.getI18n('restartRequiredTitle'), message: core.getI18n('restartRequiredMessage') });
                        }
                        else {
                            core.showError((data.result.message || data.message || 'Error resetting your user settings'));
                        };
                    })
                }
            });
        },

        onOKClick: function () {
            this.saveSettings();
            this.hide();
        },

        onCancelClick: function () {
            this.hide();
        }

    }
    );
});