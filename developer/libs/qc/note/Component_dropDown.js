define([
    "qc/MenuItem",
    "dijit/Menu",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "qc/_core",
	"qc/design/OptionListEditorDialog",
	"qc/StringUtil",
    "qc/note/Component"
], function (MenuItem, Menu, array, declare, lang, domAttr, domClass, domConstruct, on, core, OptionListEditorDialog, StringUtil, Component) {
    return declare("qc.note.Component_dropDown", [Component], {
        entryClass: 'cmb',
        placeholder: '',
    
        createNode: function () {
            var domNode = this.inherited(arguments);
            domClass.add(domNode, 'qcddPrevent');
    
            var table = domConstruct.place('<div class="cbTbl"></div>', domNode);
            var row = domConstruct.place('<div class="cbRow"></div>', table);
    
            var cell1 = domConstruct.place('<div class="cbCell"></div>', row);
    
            this.textbox = domConstruct.place('<input type="text" class="textBox"' + (this.placeholder ? ' placeholder="' + this.placeholder + '"' : '') + ' />', cell1);
            this.events.push(on(this.textbox, "change", lang.hitch(this, this.onTextBoxChanged)));
    
            var cell2 = domConstruct.place('<div class="cbCell arrowCell"></div>', row);
            this.button = domConstruct.place('<div class="arrow"></div>', cell2);
    
            this.domNode = domNode;
            return domNode;
        },
    
        getPropertyDefs: function () {
            return [
                { name: 'valueList', group: 'Data', editorCallback: lang.hitch(this, this.onEditValueList) },
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum , nullable: true},
                { name: 'enabled', group: 'Behavior', type: 'integer', options: this.resultFlagEnum , nullable: true},
                { name: 'required', group: 'Behavior', type: 'integer', options: this.resultFlagEnum , nullable: true},
                { name: 'styleClass', group: 'Style', type: 'string' },
                { name: 'elementStyle', group: 'Style', type: 'string' },
                { name: 'placeholder', group: 'General' }
            ];
        },
    
        getValue: function () {
            return this.value;
        },
    
        getText: function () {
            return this.textbox ? this.textbox.value : this.value || '';
        },
    
        setValue: function (value) {
            this.value = value;
            if (this.textbox) {
                var option = this.lookupOption(value);
                if (option) {
                    this.textbox.value = option.text || option.id;
                }
                else {
                    this.textbox.value = value;
                };
            };
        },
    
        lookupOption: function (value) {
            var item = array.filter(this.getOptions() || [], function (item) { return item.id == value })[0];
            if (!item) {
                item = array.filter(this.getOptions() || [], function (item) { return item.text == value })[0];
            };
            return item;
        },
    
        getOptions: function () {
            if (this.options) {
                return this.options;
            };
    
            if (this.valueList) {
                this.options = StringUtil.parseCodedList(this.valueList);
                return this.options;
            };
    
            return [];
        },
    
        onClick: function (evt) {
            if (this.isDisabled) {
                return;
            };
    
            if (core.ancestorNodeByClass(evt.target, 'arrowCell', true)) {
                this.showDropDown();
            }
        },
    
        showDropDown: function () {
            var options = this.getOptions();
            if (!options || options.length == 0) {
                return;
            };
            var propertyName = this.propertyName;
    
            var menu = new Menu();
            var mi = null;
            var fnClick = null;
            var owner = this.getOwner();
    
            array.forEach(options || [], function (item) {
                fnClick = lang.hitch(this, function () {
                    var value = item.id == undefined ? item.text || '' : item.id;
                    owner.set(propertyName, value);
                    this.notifyValueChanged(this, value);
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
    
        onEditValueList: function (targetObject, propertyInfo) {
            var listObject = {
                listName: '',
                listType: '',
                list: this.getOptions()
            };
    
            core.doDialog(OptionListEditorDialog, { list: listObject, listNameRequired: false, showListName: false }, lang.hitch(this, function (dlg) {
                this.options = dlg.get('list').list.slice(0);
                this.valueList = StringUtil.formatCodedList(this.options);
                targetObject._pgSetPropertyValue(propertyInfo, this.valueList);
            }));
        },

        onTextBoxChanged: function (evt) {
            this.value = this.textbox.value;
            this.notifyValueChanged(this, this.textbox.value);
        },

        setDisabled: function (value) {
            this.inherited(arguments);

            if (this.isDisabled) {
                domAttr.set(this.textbox, "disabled", "disabled");
            }

            else {
                domAttr.remove(this.textbox, "disabled");
            }
        }
    });
});