define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/form/CheckBox",
    "dijit/form/RadioButton",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/query",
    "qc/_core",
    "qc/StringUtil",
    "qc/SettingsEnumStore",
    "dojo/when"
], function (_TemplatedMixin, _WidgetBase, CheckBox, RadioButton, registry, array, declare, lang, domConstruct, on, query, core, StringUtil, SettingsEnumStore, when) {
    return declare("qc.CheckList", [_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="qcCheckList"></div>',
        multipleChoice: true,
        events: null,
        value: null,
    
        _getValueAttr: function () {
            if (this.multipleChoice) {
                return this.getSelectedItems();
            }
            else {
                return this.getSelectedItem();
            }
        },
        _setValueAttr: function (value) {
            var valueList = null;
            if (typeof value == 'string') {
                valueList = StringUtil.parseStringList(value);
            }
            else {
                valueList = core.forceArray(value);
            }
            query('.dijitInline', this.domNode).map(registry.byNode).forEach(function (widget) {
                widget.set('checked', array.indexOf(valueList, widget.value) >= 0 ? true : false);
            });
        },
    
        addItem: function (id, text, checked, subItem, description) {
            var line = domConstruct.place('<div class="qcCheckListItem"></div>', this.domNode);
            if (description) {
                line.setAttribute('title', description);
            };
            var control = null;
            if (this.multipleChoice) {
                control = new CheckBox({ value: id, checked: checked || false , srcId: id});
            }
            else {
                control = new RadioButton({ value: id, checked: checked || false, name: this.id + '_option', srdId: id });
            };
            control.placeAt(line);
            if (!this.events) {
                this.events = [];
            };
    
            this.events.push(on(control, "Change", lang.hitch(this, this._onChange)));
            domConstruct.place('<label for="' + control.id + '">' + (text || id) + '</label>', line);
            if (subItem) {
                var subItemNode = domConstruct.place('<div class="subItem"></div>', line);
                if (subItem.domNode) {
                    subItem.placeAt(subItemNode);
                }
                else {
                    domConstruct.place(subItem, subItemNode);
                }
            };

            return control;
        },
    
        load: function (list) {
            this.clear();
            if (typeof list == 'string') {
                list = StringUtil.parseCodedList(list);
            };
            array.forEach(list || [], function (item) {
                this.addItem(item.id, item.text, item.selected, '', item.description || '');
            }, this);
        },

        loadEnumSource: function(source) {
            var store = new SettingsEnumStore(source);
            var self = this;
            return when(store.loadData(), function (list) {
                self.load(list);
            });
        },

        getItems: function () {
            return query('.dijitCheckBox', this.domNode).map(registry.byNode).map(function (chk) {
                return { id: chk.srcId, checked: chk.get("checked") };
            }) || [];
        },

        getSelectedItems: function () {
            return query('.dijitChecked', this.domNode).map(registry.byNode).map(function (chk) {
                return chk.value;
            }) || [];
        },
    
        getSelectedItem: function () {
            var list = this.getSelectedItems();
            return list && list.length > 0 ? list[0] : null;
        },
    
        clear: function () {
            domConstruct.empty(this.domNode);
            if (this.events) {
                array.forEach(this.events, core.disconnect);
            };
        },
    
        _onChange: function () {
            if (this._watchCallbacks) {
                this._watchCallbacks('value', null, this.get('value'));
            }
            this.onChange();
        },
    
        onChange: function () {
        },
    
        destroyRecursive: function () {
            this.clear();
            this.inherited(arguments);
        }
    
    });
});