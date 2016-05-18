define([
    "qc/ContentLibraryTree",
    "qc/Dialog",
    "qc/FilteringSelect",
    "qc/SettingsEnumStore",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/ComboBox",
    "dijit/form/TextBox",
    "dijit/form/ValidationTextBox",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/query",
    "dojo/request",
    "dojo/text!qc/templates/SaveContentDialog.htm",
    "dojo/topic",
    "dojo/when",
    "qc/_core"
], function (ContentLibraryTree, Dialog, FilteringSelect, SettingsEnumStore, Button, CheckBox, ComboBox, TextBox, ValidationTextBox, registry, array, declare, lang, aspect, domClass, domConstruct, on, query, request, SaveContentDialogTemplate, topic, when, core) {
    return declare("qc.SaveContentDialog", [Dialog], {
        templateString: SaveContentDialogTemplate,
        widgetsInTemplate: true,
        location: '',
        name: '',
        keywords: '',
        type: '',
        defaultType: 'list',
        autoReset: true,
        callback: null,
        callbackContext: null,
    
        types: [
            {
                name: 'template',
                caption: 'Template',
                options: [
                    { name: 'makeDefault', caption: 'Make this my default template' }
                ]
            },
            {
                name: 'list',
                caption: 'List',
                options: [
                    { name: 'includeDetails', caption: 'Include entry details' },
                    { name: 'includeGrouping', caption: 'Include section/group placement' }
                ]
            }
        ],
    
        startup: function () {
            if (!this._started) {
            	on(this.cmdOK, "Click", lang.hitch(this, this.onOK));
            	on(this.cmdCancel, "Click", lang.hitch(this, this.onCancel));
            	aspect.after(this.treeView, "onNodeClick", lang.hitch(this, this.onNodeClick), true);
            	aspect.after(this.treeView, "onSelectionChanged", lang.hitch(this, this.onTreeSelectionChanged), true);
            	on(this.cmbType, "Change", lang.hitch(this, this.onTypeOptionChanged));
            	on(this.txtName, "KeyUp", lang.hitch(this, this.checkState));
            	on(this.txtName, "Change", lang.hitch(this, this.onNameChanged));
    
                this.lblLocationCaption.innerHTML = core.getI18n("location");
                this.lblName.innerHTML = core.getI18n("name");
                this.lblKeywords.innerHTML = core.getI18n("keywords");
                this.lblType.innerHTML = core.getI18n("type");
    
                this.cmdOK.set("label", core.getI18n("cmdOK"));
                this.cmdCancel.set("label", core.getI18n("cmdCancel"));
    
                this.set("title", core.getI18n("savecontent"));
                //this.set('name', '');
                //this.set('keywords', '');
    
                if (!this.treeView.initialized) {
                    this.setLocation(core.settings.defaultContentSaveLocation);
                };
    
    
                this.renderTypeList();
                this.inherited(arguments);
            }
        },
    
        show: function () {
            if (this.autoReset) {
                this.reset();
            };
            this.inherited(arguments);
        },
    
        reset: function () {
            if (this.treeView.rootNode) {
                this.treeView.rootNode.invalidate();
                this.treeView.rootNode.expand();
                this.txtKeywords.set('value', '');
                this.txtName.reset();
                this.txtLocation.reset();
                this.renderTypeList();
                this.cmbType.set('value', this.defaultType ? this.defaultType : core.getI18n("list"));
                this.cmdOK.set('disabled', true);
            };
        },
    
    
        _getNameAttr: function () {
            return this.txtName.get('value');
        },
        _setNameAttr: function (value) {
            this.txtName.set('value', value);
        },
    
        _getKeywordsAttr: function () {
            return this.txtKeywords.get('value');
        },
        _setKeywordsAttr: function (value) {
            this.txtKeywords.set('value', value);
        },
    
        _getTypesAttr: function () {
            return this.types;
        },
        _setTypesAttr: function (value) {
            this.types = value || [];
            this.renderTypeList();
        },
    
        _getTypeAttr: function () {
            return this.cmbType.get('value');
        },
        _setTypeAttr: function (value) {
            this.cmbType.set('value', value);
        },
    
        _getLocationAttr: function () {
            return this.treeView.getLocation();
        },
        _setLocationAttr: function (value) {
            this.setLocation(value);
        },
    
        renderTypeList: function () {
            var list = array.map(this.types || [], function (item) {
                return {
                    id: item.name,
                    text: item.caption || item.name
                }
            });
            var store = new SettingsEnumStore()
            store.list = list;
            this.cmbType.set('store', store);
            if (this.defaultType) {
                this.cmbType.set('value', this.defaultType);
            };
        },
    
        renderTypeOption: function () {
            var typeName = this.get('type');
            if (!typeName) {
                return;
            };
    
            var info = this.getTypeInfo(typeName);
            if (!info) {
                return;
            };
    
            var saveOptions = this.saveOptions;
            domConstruct.empty(saveOptions);
    
            var line = null;
            var chk = null;
            var lbl = null;
    
            array.forEach(info.options, function (item) {
                line = domConstruct.place('<div class="optionLine"></div>', saveOptions);
    
                chk = new CheckBox();
                chk.set('value', item.value || false);
                domClass.add(chk.domNode, 'saveOptionCheckbox');
                chk.optionName = item.name;
                chk.startup();
                chk.placeAt(line);
    
                lbl = domConstruct.place('<label for="' + chk.focusNode.id + '">' + (item.caption || item.name) + '</label>', line);
            });
    
        },
    
        getTypeInfo: function (typeName) {
            for (var n = 0; n < this.types.length; n++) {
                if (this.types[n].name == typeName) {
                    return this.types[n];
                };
            };
            return null;
        },
    
        onNodeClick: function (treeNode) {
            if (treeNode.data.type == 'folder') {
                this.txtLocation.set('value', this.treeView.getLocation());
            }
            else {
                this.txtLocation.set('value', this.treeView.getLocation());
                this.txtName.set('value', treeNode.labelNode.innerHTML);
                this.txtKeywords.set('value', treeNode.data.keyWords || '');
                this.cmbType.set('value', treeNode.data.type);
            }
            this.checkState();
        },
    
        onTypeOptionChanged: function () {
            this.renderTypeOption();
            this.checkState();
        },
    
        onTreeSelectionChanged: function () {
            this.checkState();
        },
    
        onNameChanged: function () {
            this.checkState();
        },
    
        checkState: function () {
            if (this.treeView.getLocation() && this.txtName.get('value') && this.cmbType.get('value')) {
                this.cmdOK.set('disabled', false);
            }
            else {
                this.cmdOK.set('disabled', true);
            };
        },
    
        setLocation: function (value) {
            if (value) {
                var self = this;
                if (!self.initDef) {
                    self.initDef = self.treeView.initTree();
                };
                when(self.initDef, function () {
                    self.treeView.selectPath(core.settings.defaultContentSaveLocation || 'Personal Content');
                });
            };
        },
    
        onOK: function (evt) {
            var folderNode = this.treeView.getCurrentFolder();
            var node = this.treeView.selectedNode;
            if (!node || !folderNode) {
                return;
            }
    
            var parms = {};
            if (node.data.type != 'folder' && node.labelNode.innerHTML == this.txtName.get('value')) {
                parms.id = node.data.id;
            }
            else {
                parms.id = "";
            }
    
            parms.name = this.txtName.get('value');
            parms.parentId = folderNode.data.id;
            parms.type = this.cmbType.get('value').toLowerCase();
            parms.keyWords = this.txtKeywords.get('value');
    
            if (!(parms.name && parms.type)) {
                return;
            }
    
    
            query('.saveOptionCheckbox', this.domNode).map(registry.byNode).forEach(function (checkbox) {
                if (checkbox.optionName) {
                    parms[checkbox.optionName] = checkbox.get('value');
                };
            });

            var doCallback = lang.hitch(this, function() {
                var info = this.getTypeInfo(parms.type);
                if (info && info.callback) {
                    info.callback.call(info.callbackContext || this, parms);
                }
                else if (this.callback) {
                    this.callback.call(this.callbackContext || this, parms);
                }
                else {
                    topic.publish("/qc/SaveContent", parms);
                };
                this.onExecute();
            });

            if (parms.id != '') {
                doCallback();
            }

            else {
                request(core.serviceURL('Quippe/ContentLibrary/Info'), {
                    query: { parentId: parms.parentId, name: parms.name, dataFormat: 'JSON' },
                    handleAs: 'json',
                    preventCache: true
                }).then(function(data) {
                    if (data.item && data.item.id) {
                        core.confirm({
                            title: 'Save Content',
                            message: 'An item with the name "' + parms.name + '" already exists in the content library. Do you want to replace it?',
                            yesCallback: lang.hitch(self, function () {
                                parms.id = data.item.id;
                                doCallback();
                            })
                        });
                    }
                    else {
                        doCallback();
                    }

                });
            }

        },
    
        onCancel: function (evt) {
            this.inherited(arguments);
        }
    
    });
});