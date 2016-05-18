define([
    "qc/MenuItem",
    "dijit/Menu",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "qc/_core",
	"qc/design/FindingListEditorDialog",
	"qc/StringUtil",
    "qc/note/Component"
], function (MenuItem, Menu, array, declare, lang, domConstruct, core, FindingListEditorDialog, StringUtil, Component) {
    return declare("qc.note.Component_termChooser", [Component], {
        entryClass: 'termChooser',
        propertyName: 'medcinId',
    
        createNode: function () {
            var domNode = this.inherited(arguments);
            this.button = domConstruct.place('<div class="arrow"></div>', domNode);
            this.domNode = domNode;
            return domNode;
        },
    
        getPropertyDefs: function () {
            return [
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'valueList', group: 'Data', editorCallback: lang.hitch(this, this.onEditValueList) },
                { name: 'styleClass', group: 'Style', type: 'string', options: '[;plain;box]', nullable: true , allowAnyValue: true},
                { name: 'elementStyle', group: 'Style', type: 'string' }
            ];
        },
    
        getText: function () {
            var option = this.lookupOption(value);
            return option ? option.text || '' : '';
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
    
            this.showDropDown();
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
                    if (item.text) {
                        owner.set('text', item.text);
                        //owner.set('overrideTranscription', true);
                    };
                    owner.resolveTerm(parseInt(item.id, 10));
                    this.setValue(item.id);
                    this.notifyValueChanged(this, item.id);
                    domConstruct.destroy(menu);
                });
    
                mi = new MenuItem({
                    label: item.text || item.id,
                    onClick: fnClick
                });
    
                menu.addChild(mi);
            }, this);
    
            menu.startup();
            menu.bindDomNode(owner.domNode);
            menu._openMyself({ target: owner.domNode });
        },
    
        onEditValueList: function (targetObject, propertyInfo) {
            var listObject = {
                listName: '',
                listType: '',
                list: this.getOptions()
            };
    
            core.doDialog(FindingListEditorDialog, { list: listObject, listNameRequired: false, showListName: false }, lang.hitch(this, function (dlg) {
                this.options = dlg.get('list').list.slice(0);
                this.valueList = StringUtil.formatCodedList(this.options);
                targetObject._pgSetPropertyValue(propertyInfo, this.valueList);
            }));
        }
    
    
    });
});