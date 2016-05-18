define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/query",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "dijit/form/TextBox",
    "dijit/form/CheckBox",
    "dijit/form/ComboBox",
    "dijit/layout/ContentPane",
    "qc/CheckList",
    "qc/Dialog",
    "qc/SettingsEnumStore",
    "qc/Label",
    "qc/FilteringSelect",
    "qc/StringUtil",
    "qc/_core",
    "dojo/text!qc/taskbar/templates/TaskPaneEditorDialog.htm"
], function (declare, array, lang, aspect, domClass, domConstruct, domStyle, query, _WidgetsInTemplateMixin, registry, TextBox, CheckBox, ComboBox, ContentPane, CheckList, Dialog, SettingsEnumStore, Label, FilteringSelect, StringUtil, core, templateText) {
    var typeDef = declare('qc.taskbar.TaskPaneEditorDialog', [Dialog, _WidgetsInTemplateMixin], {
        templateString: templateText,
        currentItem: null,
        title: 'Task Panes',
        groupStore: null,

        startup: function() {
            if (!this._started) {
                aspect.after(this.listView, 'onSelectionChanged', lang.hitch(this, this.onSelectedItemChanged));
                this.groupStore = new SettingsEnumStore(lang.hitch(this, this.getGroups));
                this.groupStore.isItemLoaded = function () { return false };
                this.cmbGroups.set('searchAttr', 'text');
                this.cmbGroups.set('store', this.groupStore);
                this.inherited(arguments);
            }
        },

        loadTaskPanes: function (panes, selectedName) {
            this.listView.clear();
            
            var liToSelect = null;

            var list = panes.slice(0).sort(function (a, b) { return StringUtil.compare(a.name, b.name) });
            if (panes.length > 0) {
                array.forEach(list, function (pane) {
                    var item = {
                        id: pane.name,
                        name: pane.name,
                        text: pane.name,
                        description: pane.description || '',
                        group: pane.group
                    };
                    var customSettings = pane.getUserSettings ? pane.getUserSettings() || [] : [];
                    if (customSettings) {
                        item.customSettings = customSettings;
                        item.customSettings.forEach(function (s) {
                            item[s.name] = pane.get(s.name);
                        });
                    }
                    var li = this.listView.addItem(item);
                    if (selectedName && item.id == selectedName) {
                        liToSelect = li;
                    };
                }, this);

                if (liToSelect) {
                    this.listView.setSelectedItem(liToSelect);
                }
                else {
                    this.listView.setSelectedItem(this.listView.getChildren()[0]);
                };
            };
            this.panes = panes;
        },

        getSettings: function() {
            this.applyChanges();
            return this.listView.getChildren().map(function (x) { return x.data });
        },

        getGroups: function() {
            return this.listView.getChildren()
                .map(function (li) { return li.data.group || '' })
                .sort()
                .filter(function (v, i, a) { return i == 0 ? v : v != a[i - 1] })
                .map(function (x) { return { id: x, text: x } });
        },

        getDataFields: function() {
            return query('.dataField', this.domNode).map(function (x) {
                var widget = registry.getEnclosingWidget(x)
                return {
                    name: widget.propertyName,
                    widget: widget,
                    dataType: widget.dataType
                };
            });
        },

        showItem: function(item) {
            this.applyChanges();
            this.clearEntries();            
            if (item) {
                this.renderCustomFields(item);
                this.nameNode.innerHTML = item.data.name || '';
                this.descriptionNode.innerHTML = item.data.description || '';
                this.getDataFields().forEach(function (field) {
                    field.widget.set('value', item.data[field.name]);
                });
                domStyle.set(this.detailNodeContent, { display: 'block' });
            }
            else {
                domStyle.set(this.detailNodeContent, { display: 'none' });
            }
            this.currentItem = item;
        },

        renderCustomFields: function (item) {
            var settings = item && item.data ? item.data.customSettings : null;
            if (!settings) {
                return;
            };

            var table = this.settingsTable;
            var row = null;
            var c1 = null;
            var c2 = null;
            var ctl = null;
            var lbl = null;
            var labelText = '';
            settings.forEach(function(s) {
                row = table.insertRow(-1);
                domClass.add(row, 'userSetting');
                c1 = row.insertCell(-1);
                c2 = row.insertCell(-1);
                domStyle.set(c1, { verticalAlign: 'top' });
                lbl = domConstruct.create('div');
                labelText = (s.caption || StringUtil.makeCaption(s.name));
                if (s.multipleChoice) {
                    c1.innerHTML = labelText + ':';
                    ctl = new CheckList();
                    ctl.load(s.options);
                    domStyle.set(ctl.domNode, { maxHeight: '8em', border: '1px #999999 solid' });
                    ctl.startup();
                    ctl.placeAt(c2);
                    domClass.add(ctl.domNode, 'ckl');
                    ctl.dataType = 'stringList';
                }
                else if (s.options) {
                    c1.innerHTML = labelText + ':';
                    ctl = new FilteringSelect({ searchAttr: 'text', store: new SettingsEnumStore(s.options), maxHeight: 300 });
                    ctl.placeAt(c2);
                }
                else if (s.type == 'boolean') {
                    ctl = new CheckBox();
                    ctl.placeAt(c2);
                    domClass.add(ctl.domNode, 'chk');
                    domConstruct.place('<label for="' + ctl.id + '">' + labelText + '</label>', c2)
                }
                else {
                    c1.innerHTML = labelText + ':';
                    ctl = new TextBox();
                    ctl.placeAt(c2);
                    domClass.add(ctl.domNode, 'txt');

                };
                domClass.add(ctl.domNode, 'dataField');
                ctl.propertyName = s.name;
                ctl.dataType = ctl.dataType || s.type || 'string';
            });
        },

        clearEntries: function () {
            this.nameNode.innerHTML = '';
            this.descriptionNode.innerHTML = '';
            var table = this.settingsTable;
            var r = table.rows.length - 1;
            while (r > 0) {
                if (domClass.contains(table.rows[r], 'userSetting')) {
                    table.deleteRow(r);
                };
                r--;
            };
            this.getDataFields().forEach(function (field) {
                field.widget.set('value', '');
            });
            this.currentItem = null;
        },

        applyChanges: function () {
            var item = this.currentItem;
            if (!item) {
                return;
            };
            this.getDataFields().forEach(function (field) {
                if (field.dataType == 'boolean') {
                    item.data[field.name] = field.widget.get('value') == 'on';
                }
                else if (field.dataType == 'stringList') {
                    item.data[field.name] = core.forceArray(field.widget.get('value')).join(',');
                }
                else {
                    item.data[field.name] = field.widget.get('value');
                }
            });
        },

        onSelectedItemChanged: function () {
            this.showItem(this.listView.getSelectedItem());
        },

        onOKClick: function () {
            this.applyChanges();
            this.inherited(arguments);
        }
    });

    return typeDef;
});