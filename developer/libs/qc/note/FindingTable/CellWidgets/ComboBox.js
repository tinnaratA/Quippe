define([
    "qc/design/OptionListEditorDialog",
    "qc/MenuItem",
    "dijit/Menu",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "qc/_core",
	"qc/StringUtil",
    "qc/note/FindingTable/CellWidgets/_Popup"
], function (OptionListEditorDialog, MenuItem, Menu, array, declare, lang, domConstruct, core, StringUtil, _Popup) {
    return declare("qc.note.FindingTable.CellWidgets.ComboBox", [_Popup], {
        textEditable: true,
        valueList: '',
        options: null,
        value: null,
    
        updateDisplay: function () {
            this.textBoxNode.value = this.getFormattedValue();
        },
    
        lookupOption: function (value) {
            var item = array.filter(this.getOptions() || [], function (item) { return item.id == value })[0];
            if (!item) {
                item = array.filter(this.getOptions() || [], function (item) { return item.text == value })[0];
            };
            return item;
        },
    
        getFormattedValue: function () {
            var item = this.lookupOption(this.value);
            var text = item ? item.text || item.id : this.value;
            return text == null ? '' : text;
            //return this.value ? this.value.text || '' : '';
        },
    
        _getValueAttr: function () {
            return this.value;
            //return this.value ? this.value.id ? this.value.id : this.value : '';
        },
        _setValueAttr: function (value) {
            if (value && typeof value == 'string' && value.charAt(0) == '=') {
                this.set('formula', value.substr(1));
                return;
            };
    
            if (value != this.value) {
                var item = typeof value == 'object' ? value : this.lookupOption(value);
                if (item) {
                    
                    if (this.findingProperty == 'medcinId') {
                        this.setBoundValue(item);
                    }
                    else {
                        this.setBoundValue(item.id);
                    };
                    this.value = item.id;
                    this.textBoxNode.value = item.text;
                    this.onCellValueChanged(item.id);
                }
                else {
                    this.value = value;
                    this.textBoxNode.value = value;
                    this.setBoundValue(value);
                    this.onCellValueChanged(value);
                }
            };
        },
    
        _getValueListAttr: function () {
            return this.valueList;
        },
        _setValueListAttr: function (value) {
            this.valueList = value;
            this.options = null;
    //        if (this.value != null) {
    //            var tempValue = this.value.id != undefined ? this.value.id : this.value;
    //            this.value = null;
    //            this.set('value', tempValue);
    //        };
        },
    
        getOptions: function () {
            if (this.options && this.options.length > 0) {
                return this.options;
            };
    
            if (this.valueList && typeof this.valueList == 'string') {
                if (/^\[/.test(this.valueList)) {
                    this.options = StringUtil.parseCodedList(this.valueList);
                }
                else {
                    this.options = this.owner && this.owner.getOptionList ? this.owner.getOptionList(this.valueList) : [];
                };
    
                return this.options;
            };
    
            return [];
        },
    
        onOptionPicked: function (item) {
            this.set('value', item);
        },
    
        showPopup: function () {
            var options = this.getOptions();
            if (!options || options.length == 0) {
                return;
            };
            var propertyName = this.propertyName;
    
            var menu = new Menu();
            var mi = null;
            var fnClick = null;
            var self = this;
    
            array.forEach(options || [], function (item) {
                fnClick = lang.hitch(this, function () {
                    this.onOptionPicked(item);
                    domConstruct.destroy(menu);
                });
    
                mi = new MenuItem({
                    label: item.text || item.id,
                    onClick: fnClick
                });
    
                menu.addChild(mi);
            }, this);
    
            menu.startup();
            menu.bindDomNode(this.domNode);
            menu._openMyself({ target: this.domNode });
        },
    
        onEditValueList: function (targetObject, propertyInfo, caller) {
            var listObject = {
                listName: '',
                listType: '',
                list: this.getOptions()
            };
    
            core.doDialog(OptionListEditorDialog, { list: listObject, listNameRequired: false, showListName: false }, lang.hitch(this, function (dlg) {
                this.options = dlg.get('list').list.slice(0);
                this.valueList = StringUtil.formatCodedList(this.options);
                targetObject._pgSetPropertyValue(propertyInfo, this.valueList);
                if (caller && caller.propertyGrid) {
                    caller.propertyGrid.refresh();
                }
            }));
        },
    
        _pgPropDef_valueList: function () {
            return { name: 'valueList', group: 'Data', editorCallback: lang.hitch(this, this.onEditValueList), description: core.getI18n('tooltipValueList') };
        }
    
    });
});