define([
    "qc/CheckedMenuItem",
    "qc/MenuItem",
    "qc/note/_Element",
    "qc/note/FindingLabel",
    "qc/note/FindingGroup",
    "dijit/Menu",
    "dijit/MenuItem",
    "dijit/MenuSeparator",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "qc/_core",
    "qc/StringUtil",
    "qc/DateUtil",
	"dijit/popup",
    "qc/note/PropertyBindingMixin"
], function (CheckedMenuItem, MenuItem, _Element, FindingLabel, FindingGroup, Menu, dijitMenuItem, MenuSeparator, array, declare, lang, domClass, domConstruct, core, StringUtil, DateUtil, popup, PropertyBindingMixin) {
    var MacroField = declare("qc.note.MacroField", [_Element, PropertyBindingMixin], {
        templateString: '<div class="macroField" tabIndex="1"></div>',
        elementName: 'MacroField',
    
        fieldType: 'text',      // text | finding
        valueType: 'string',    // string | integer | float | boolean | date | time | dateTime
        choiceType: 'none',     // none | single | multiple
    
        findingName: '',
        findingProperty: '',    // medcinId | prefix | result ...
        listName: '',
    
        caption: '',
        placeHolder: '',
    
        value: null,
    
        _setNameAttr: function (value) {
            if (value) {
                this.name = value;
                this.domNode.setAttribute('data-name', value);
            }
            else {
                this.domNode.removeAttribute('data-name');
                this.name = '';
            }
        },
    
        _getTextAttr: function () {
            return this.domNode.innerHTML;
        },
        _setTextAttr: function (value) {
            this.domNode.innerHTML = value || this.placeHolder || this.name;
        },
    
        _setValueAttr: function (value) {
            this.setValue(value);
        },
    
        getFieldCaption: function () {
            return this.caption || this.name;
        },
    
        _setFieldTypeAttr: function (value) {
            if (this.fieldType) {
                domClass.remove(this.domNode, 'fieldType_' + this.fieldType);
            };
            if (value == 'finding') {
    
                //only single choice on finding properties for now
                if (this.choiceType == 'multiple') {
                    this.choiceType = 'single';
                };
    
                if (!this.findingProperty) {
                    this.findingProperty = 'value';
                }
                else if (this.findingProperty == 'medcinId') {
                    this.valueType = 'integer';
                };
    
                this.fieldType = 'finding';
            }
            else if (value == 'label') {
                this.fieldType = 'label';
            }
            else {
                this.fieldType = 'text';
            };
            domClass.add(this.domNode, 'fieldType_' + this.fieldType);
        },
    
        _setChoiceTypeAttr: function (value) {
            if (value == 'multiple' && this.fieldType == 'finding') {
                value = 'single';
            };
            this.choiceType = value;
        },

        _setPlaceholderAttr: function(value) {
            this.placeHolder = value;
        },
    
        getOptionList: function () {
            var options = this.fieldContainer && this.listName ? this.fieldContainer.getOptionList(this.listName) : null;
            if (options && this.choiceType == 'single') {
                if (this.placeHolder && (options.list.length == 0 || options.list[0].text != '')) {
                    options.list.unshift({ id: '', text: '' });
                };
            };
            return options;
        },
    
        getFinding: function () {
            return this.fieldContainer && this.findingName ? this.fieldContainer.getFinding(this.findingName) : null;
        },
    
        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            this.parseBindings(xmlNode);
            var text = (xmlNode.textContent || xmlNode.text || xmlNode.innerText || xmlNode.innerHTML || '').trim();
            this.set('text', text);
        },
    
        writeNoteAttributes: function (writer, mode) {
            array.forEach(['name', 'fieldType', 'valueType', 'choiceType', 'findingName', 'findingProperty', 'listName', 'caption', 'placeHolder'], function (name) {
                writer.attribute(StringUtil.toCamelUpper(name), this[name] || '', '');
            }, this);
    
            if (this.value) {
                if (this.choiceType == 'multiple') {
                    writer.attribute(core.forceArray(this.value).join('|'));
                }
                else {
                    writer.attribute('value', this.value.toString());
                };
            };
        },
    
        writeNoteChildren: function (writer, mode) {
            this.writeBindings(writer, mode);
            writer.text(this.get('text') || this.placeHolder || this.name);
        },
    
        findOption: function (value) {
            var options = (this.getOptionList() || {}).list || [];
            var nTextMatch = -1;
            if (options && options.length > 0) {
                for (var n = 0; n < options.length; n++) {
                    if (options[n].id == value) {
                        return options[n];
                    }
                    else if (StringUtil.compare(options[n].text, value, true) == 0) {
                        nTextMatch = n;
                    };
                };
            };
            if (nTextMatch >= 0) {
                return options[nTextMatch];
            }
            else {
                return null;
            };
        },
    
        findSelectedOptions: function (value) {
            var list = [];
            var item = null;
            array.forEach(core.forceArray(value), function (id) {
                item = this.findOption(id);
                if (item) {
                    list.push(item);
                };
            }, this);
            return list;
        },
    
    
        setValueFromInnerText: function () {
            if (this.findingName && this.findingProperty) {
                var finding = this.getFinding();
                if (finding) {
                    var text = this.get('text');
                    finding.set(this.findingProperty, this.castValue(text));
                };
            };
        },
    
        setValue: function (input) {
            var value = null;
            var finding = null;
    
            switch (this.choiceType) {
                case 'multiple':
                    value = this.findSelectedOptions(input);
                    if (this.fieldType == 'finding') {
                        if (this.findingProperty == 'medcinId') {
                            this.updateFindingGroup(value)
                        }
                        else {
                            //no multiple choice for a single finding property
                        }
                    }
                    else {
                        this.value = array.map(value, function (x) { return x.id });
                        this.set('text', StringUtil.joinPhrases(array.map(value, function (x) { return x.text || x.id })));
                    }
                    break;
    
                case 'single':
                    value = this.findOption(input) || { id: '', text: '' };
                    this.value = this.castValue(value.id);
                    this.set('text', value.text);
                    if (this.fieldType == 'finding' && this.findingName && this.findingProperty) {
                        finding = this.getFinding();
                        if (finding) {
                            finding.set(this.findingProperty, this.value);
                            if (this.findingProperty == 'medcinId') {
                                finding.set('text', value.text);
                                finding.overrideTranscription = true;
                            };
                        };
                    };
                    break;
    
                default:
                    value = input;
                    this.value = this.castValue(value);
                    if (this.fieldType == 'finding' && this.findingName && this.findingProperty) {
                        finding = this.getFinding();
                        if (finding) {
                            finding.set(this.findingProperty, this.value);
                        };
                    };
                    this.set('text', value);
                    break;
            };
    
        },
    
        updateFindingGroup: function (itemList) {
            var findingGroup = this.getFinding();
            if (!findingGroup) {
                return;
            };

            if (!domClass.contains(findingGroup.domNode, 'findingGroup')) {
                var singleFinding = findingGroup;
                findingGroup = new FindingGroup();
                findingGroup.startup();
                findingGroup.placeAt(this.fieldContainer.dataArea);
                findingGroup.addFinding(singleFinding);
                findingGroup.set('name', singleFinding.get('name'));
            };
    
            findingGroup.clear();
    
            var value = [];
            if (itemList.length > 0) {
                array.forEach(itemList, function (item) {
	                var finding = core.createFindingEntry();
                    finding.medcinId = parseInt(item.id, 10);
                    finding.overrideTranscription = true;
                    finding.phrasing = {};
                    finding.phrasing['ip'] = item.text;
                    finding.phrasing['in'] = item.text;
                    finding.phrasing['dp'] = item.text;
                    finding.phrasing['dn'] = item.text;
                    finding.set('text', item.text);
                    findingGroup.addFinding(finding);
                    value.push(finding.medcinId);
                });
                findingGroup.set('result', 'A');
                findingGroup.transcribe();
                this.set('text', findingGroup.get('text'));
                this.value = value;
            }
            else {
                findingGroup.set('result', '');
                this.set('text', '');
                this.value = [];
            };
        },
    
        castValue: function (value, valueType) {
            valueType = valueType || this.valueType || 'string';
            switch (valueType) {
                case 'string':
                    return value.toString();
                case 'integer':
                    return parseInt(value, 10);
                case 'float':
                    return parseFloat(value);
                case 'boolean':
                    return value ? true : false;
                case 'date':
                case 'time':
                case 'datetime':
                    return DateUtil.toDate(value);
                default:
                    return value;
            };
        },
    
        getOptionMenu: function () {
            switch (this.choiceType) {
                case 'multiple':
                    return this.getOptionMenu_MultiChoice();
                case 'single':
                    return this.getOptionMenu_SingleChoice();
                default:
                    return null;
            };
        },
    
        getOptionMenu_SingleChoice: function () {
            var options = this.getOptionList();
            if (!options) {
                return null;
            };

            var menu = new Menu();
            domClass.add(menu.domNode, 'ic16');
            var mi = null;
            var fnClick = null;
    
            array.forEach(options.list || [], function (item) {
                fnClick = lang.hitch(this, function () {
                    this.set('value', (item.id || item.text));
                    domConstruct.destroy(menu);
                });
    
                mi = new MenuItem({
                    label: item.text || item.id,
                    onClick: fnClick
                });
    
                menu.addChild(mi);
            }, this);

			menu.onExecute = function() {
				popup.close(menu);
			}

			menu._onBlur = lang.hitch(menu, function () {
				this.inherited('_onBlur', arguments);
				popup.close(this);
			});
    
            return menu;
        },
    
        getOptionMenu_MultiChoice: function () {
            var options = this.getOptionList();
            if (!options) {
                return null;
            };
    
            var menu = new Menu();
            domClass.add(menu.domNode, 'ic16');
            var mi = null;
            var fnClick = null;
    
            var currentItems = array.map(core.forceArray(this.value), function (x) { return x.toString() });
            array.forEach(options.list || [], function (item, i) {
                mi = new CheckedMenuItem({
                    label: item.text,
                    checked: currentItems.indexOf(item.id) >= 0 ? true : false,
                    suppressClickOnCheck: true
                });
                mi.option = item;
                menu.addChild(mi);
            }, this);
    
            fnClick = lang.hitch(this, function () {
                var selectedItems = [];
                array.forEach(menu.getChildren(), function (mi) {
                    if (mi.option) {
                        mi.option.selected = mi.get('checked') || false;
                        if (mi.option.selected) {
                            selectedItems.push(mi.option.id || mi.option.text);
                        };
                    };
                });
                this.set('value', selectedItems);
	            popup.close(menu);
            });
    
            menu.addChild(new MenuSeparator());
            menu.addChild(new dijitMenuItem({
                label: 'Close',
                iconClass: 'delete',
                onClick: fnClick
            }));

            menu.onExecute = function () {
            }

            menu._onBlur = lang.hitch(menu, function () {
            	this.inherited('_onBlur', arguments);
	            fnClick();
            });
    
            return menu;
        },

        _pgPropDef_caption: function () {
            return { name: 'caption', type: 'string', group: 'Data Entry' , description: 'The caption to use on data entry form.  If blank the field name will be used'};
        },

        _pgPropDef_fieldType: function () {
            return { name: 'fieldType', options: '[text=Text;finding=Finding;label=Label]', group: 'Data Entry' };
        },

        _pgPropDef_choiceType: function () {
            switch (this.get('fieldType')) {
                case 'finding':
                    return { name: 'choiceType', caption: 'Entry Type', options: '[none=Text Box;single=Drop Down List]', group: 'Data Entry' };
                case 'text':
                    return { name: 'choiceType', caption: 'Entry Type', options: '[none=Text Box;single=Drop Down List;multiple=Multiple Choice Drop Down]', group: 'Data Entry' };
                default:
                    return null;
            };
        },

        _pgPropDef_findingName: function () {
            if (this.get('fieldType') == 'finding') {
                return {
                    name: 'findingName',
                    caption: 'Finding',
                    options: lang.hitch(this, function () {
                        return this.fieldContainer.getFindings().map(function (x) { return { id: x.name, text: x.name } }).concat([{ id: 'newFinding', text: '(new finding)' }])
                    }),
                    group: 'Data',
                    description: 'The underlying MEDCIN finding bound to this field'
                };

            };
        },

        _pgPropDef_findingProperty: function () {
            if (this.get('fieldType') == 'finding') {
                return {
                    name: 'findingProperty',
                    caption: 'Finding Property',
                    options: '[medcinId;result;prefix;status;modifier;onset;duration;notation;value;unit]',
                    reloadOnChange: true,
                    group: 'Data',
                    description: 'The property of the MEDCIN finding bound to this field'
                }
            };
        },

        _pgPropDef_placeHolder: function () {
            if ((this.choiceType || 'none') != 'none') {
                return { name: 'placeHolder', group: 'Data Entry', description: 'Text to display when no option is selected' };
            };
        },

        _pgPropDef_listName: function () {
            if ((this.choiceType || 'none') != 'none') {
                return {
                    name: 'listName',
                    caption: 'Option List',
                    options: lang.hitch(this, function () {
                        if (this.get('fieldType') == 'finding') {
                            return this.getOptionLists().filter(function (x) { return x.listType == 'finding' }).map(function (y) { return { id: y.name, text: y.name } }).concat([{ id: 'newFindingList', text: '(new finding list)' }]);
                        }
                        else {
                            return this.getOptionLists().filter(function (x) { return x.listType != 'finding' }).map(function (y) { return { id: y.name, text: y.name } }).concat([{ id: 'newTextList', text: '(new option list)' }]);
                        };
                    }),
                    group: 'Data Entry',
                    description: 'The list of choices for this field'
                }
            };
        },

        getOptionLists: function() {
            return this.fieldContainer ? this.fieldContainer.getOptionLists() : [];
        }


    });

    core.settings.noteElementClasses["qc/note/MacroField"] = MacroField;
    core.settings.noteElementClasses["qc/note/macrofield"] = MacroField;

	return MacroField;
});