define([
        "dojo/_base/declare",
        "qc/note/HtmlContent",
        "qc/_core",
        "qc/CheckList",
        "qc/design/StandardDialog",
        "qc/note/MacroField",
        "qc/SettingsEnumStore",
        "qc/XmlWriter",
        "qc/XmlUtil",
        "dijit/form/Button",
        "dijit/form/FilteringSelect",
        "dijit/form/TextBox",
        "dijit/registry",
        "dojo/_base/array",
        "dojo/_base/event",
        "dojo/_base/lang",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dojo/dom-style",
        "dojo/on",
        "dojo/query",
        "dojo/request",
        "dojo/topic",
		"qc/note/_SelectableMixin",
		"dijit/popup",
	    "qc/DateUtil",
        "qc/note/PropertyBindingMixin"
], function (declare, HtmlContent, core, CheckList, Dialog, MacroField, SettingsEnumStore, XmlWriter, XmlUtil, Button, FilteringSelect, TextBox, registry, array, event, lang, domClass, domConstruct, domStyle, on, query, request, topic, _SelectableMixin, popup, DateUtil, PropertyBindingMixin) {
    var FreeText = declare("qc.note.FreeText", [HtmlContent, _SelectableMixin, PropertyBindingMixin], {
        elementName: 'FreeText',
        templateString: '<div class="freeText finding qcddPrevent sealed qcContextMenuContainer hiddenFindingContainer macroFieldContainer" tabIndex="1">'
                      + '  <div class="data" data-dojo-attach-point="dataArea"></div>'
                      + '  <div class="editArea" data-dojo-attach-point="editArea" contentEditable="true" role="textbox" tabIndex="1" spellcheck="false"></div>'
                      + '</div>',
    
        showFieldDropDowns: true,
        allowFieldEntryDialog: true,
    
        medcinId: 0,
        prefix: '',
        emLevel: 1,
        result: '',
        macroDialogTitle: '',
        inMacroDesign: false,
    
        postCreate: function () {
            this.inherited(arguments);
            core.setSelectable(this.domNode, true);
            core.setSelectable(this.editArea, true);
	        this.events = [
		        on(this.domNode, "click", lang.hitch(this, this.onClick)),
		        on(this.editArea, "blur", lang.hitch(this, this.onBlur)),
                on(this.editArea, "paste", lang.hitch(this, this.onPaste))
	        ];
        },
    
        _getTextAttr: function (value) {
            return this.editArea.innerHTML || '';
        },
    
        _setTextAttr: function (value) {
            if (core.MedcinInfo.isPlaceholderFreeText(value)) {
                return;
            };
            this.editArea.innerHTML = '';
            if (value) {
                this.parseText(value);
                domClass.add(this.domNode, 'entry');
            }
            else {
                domClass.remove(this.domNode, 'entry');
            };
        },
    
        _getNotationAttr: function() {
            return this.get('text');
        },
        _setNotationAttr: function (value) {
            this.set('text', value);
        },

        _getNoteAttr: function() {
            return this.get('text');
        },
        _setNoteAttr: function (value) {
            this.set('text', value);
        },
    
        _getResultAttr: function () {
            return (this.get('text').trim().replace(/\<br\>/gi, '').replace(/\<br\/\>/gi, '') !== '' ? 'A' : '');
        },
    
        clear: function () {
            this.editArea.innerHTML = '';
        },
    
        hasFindings: function () {
            return (query(".finding", this.dataArea).length > 0);
        },
    
        setPrefixFromRule: function (newPrefix) {
            if (!this.originalPrefix) {
                this.originalPrefix = this.prefix || '';
            };
            this.prefix = newPrefix;
        },
    
        getOriginalPrefix: function () {
            return this.originalPrefix == undefined ? this.prefix || '' : this.originalPrefix;
        },
    
        mergeOtherFreeText: function (other) {
            this.macroDialogTitle = this.macroDialogTitle || other.get('macroDialogTitle') || '';
            var clone = core.Note.cloneElement(other);
            if (clone.sourceXmlNode) {
                this.parseXmlChildElements(this, clone.sourceXmlNode);
                return true;
            };
        },
    
        mergeTermData: function (data) {
        },
    
        mergeFinding: function (other) {
            this.appendText(other.get('notation') || '');   // Added 20150928 RS
        },
    
        toFinding: function () {
            return {
                id: this.get('medcinId'),
                medcinId: this.get('medcinId'),
                prefix: this.get('prefix') || '',
                result: this.get('result') || '',
                value: this.get('value') || '',
                entryId: this.get('entryId') || ''
            };
        },
    
        setDetails: function (item) {
            if (item) {
                array.forEach(['prefix', 'value', 'emLevel', 'overrideTranscription'], function (propName) {
                    if (item[propName] && !this.get(propName)) {
                        this.set(propName, item[propName]);
                    }
                }, this);
            };
            var text = item.text || item.notation || '';
            if (text) {
                this.appendText(text);
            };
        },
    
        appendText: function (value) {
            this.endEdit();
            var normValue = value != null && value != undefined ? value.toString().trim() : '';
            if (normValue) {
                if (this.hasContent()) {
                    this.set('text', this.get('text') + ' ' + normValue);
                }
                else {
                    this.set('text', normValue);
                }
            };
        },
    
        writeNoteElement: function (writer, mode) {
            writer.beginElement('FreeText');
    
            this.writeAllAttributes(writer, mode);
    
            var findings = this.getFindings();
            if (findings && findings.length > 0) {
                writer.beginElement("Data")
                array.forEach(findings, function (findings) {
                    findings.writeNoteElement(writer, mode);
                });
                writer.endElement()
            };
    
            var lists = this.getOptionLists();
            if (lists && lists.length > 0) {
                writer.beginElement("OptionLists")
                array.forEach(lists, function (list) {
                    writer.beginElement("OptionList");
                    writer.attribute("Name", list.name);
                    writer.attribute("ListType", list.listType, '');
                    array.forEach(list.list, function (listItem) {
                        writer.beginElement("Option");
                        writer.attribute("id", listItem.id || '', '');
                        writer.attribute("Text", listItem.text || '', '');
                        writer.endElement();
                    });
                    writer.endElement();
                });
                writer.endElement()
            };
    
            var tempWriter = new XmlWriter({ includeXmlDeclaration: false, indent: false });
            var child = this.editArea.firstChild;
            while (child) {
                if (!child.nextSibling && child.nodeType == 1 && child.tagName.toLowerCase() == 'br') {
                    //noop - skip the final <br /> tag
                }
                else {
                    this.writeContent(tempWriter, child, mode);
                };
                child = child.nextSibling;
            };
            var text = tempWriter.toString().trim();
            writer.beginElement('Text');
            writer.raw(text);
            writer.endElement();

            this.writeBindings(writer, mode);
    
            writer.endElement();
        },
    
        writeNoteAttributes: function (writer, mode) {
            writer.attribute('id', this.elementId || '', '');
            writer.attribute('Name', this.name || '', '');
            writer.attribute('MedcinId', this.get('medcinId'), 0);
            writer.attribute('Prefix', this.get('prefix'), '');
            writer.attribute('Result', this.get('result'), '');
            writer.attribute('Value', this.get('value'), '');
            writer.attribute('EntryId', this.get('entryId'), '');
            writer.attribute('StyleClass', this.get('styleClass') || '', '');
            writer.attribute('SectionId', this.get('sectionId') || '', '');
            writer.attribute('GroupId', this.get('groupId') || '', '');
            writer.attribute('MacroDialogTitle', this.get('macroDialogTitle') || '', '');
        },
    
        writeContent: function (writer, node, mode) {
            switch (node.nodeType) {
                case 1:
                    var widget = registry.byNode(node);
                    if (widget) {
                        if (domClass.contains(node, 'noteElement')) {
                            widget.writeNoteElement(writer, 'template');
                        }
                        else {
                            this.serializeWidget(writer, widget);
                        }
                    }
                    else {
                        writer.beginElement(node.tagName.toLowerCase());
                        for (n = 0; n < node.attributes.length; n++) {
                            writer.attribute(node.attributes[n].name, node.attributes[n].value);
                        };
                        var child = node.firstChild;
                        while (child) {
                            this.writeContent(writer, child);
                            child = child.nextSibling;
                        };
                        writer.endElement();
                    };
                    break;
                case 3:
                    writer.text(node.nodeValue || '');
                    break;
                default:
                    break;
            };
        },
    
        startEdit: function () {
            if (this.getViewMode() == 'design') {
                this.endEdit();
                return;
            };
            this.editArea.focus();
        },
    
        endEdit: function () {
            if (this.hasContent()) {
                domClass.add(this.domNode, 'entry');
            }
            else {
                domClass.remove(this.domNode, 'entry');
            };
    
			if (this.getViewMode() == 'design' && this.editArea) {
                this.editArea.removeAttribute('contentEditable');
                core.setSelectable(this.domNode, false);
                core.setSelectable(this.editArea, false);
            };
        },
    
        toggleResultFromEvent: function () {
        },
    
    
        hasContent: function () {
            return (this.editArea && this.editArea.innerHTML.trim() != '')
        },
    
        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            this.parseBindings(xmlNode);
            //This check put in place to make sure notes saved prior to 2.0.20131.80 will still render text properly
            var xText = XmlUtil.selectChildElement(xmlNode, 'Text');
            if (xText) {
                this.parseDataElement(xmlNode);
                this.parseOptionListsElement(xmlNode);
                this.parseTextElement(xmlNode);
            }
            else {
                this.parseContent(this.editArea, xmlNode);
            };
        },
    
        parseDataElement: function (parentNode) {
            var xData = XmlUtil.selectChildElement(parentNode, 'Data');
            if (xData) {
                array.forEach(XmlUtil.selectChildElements(xData), function (xItem) {
                    var widget = this.parseXml(xItem);
                    if (widget) {
                        widget.placeAt(this.dataArea);
                    };
                }, this);
            };
        },
    
        parseOptionListsElement: function (parentNode) {
            this.optionLists = this.optionLists || [];
            var xOptionLists = XmlUtil.selectChildElement(parentNode, 'OptionLists');
            if (xOptionLists) {
                array.forEach(XmlUtil.selectChildElements(xOptionLists), function (xList) {
                    var name = xList.getAttribute('Name');
                    var listType = xList.getAttribute('ListType');
                    var list = [];
                    array.forEach(XmlUtil.selectChildElements(xList), function (xListItem) {
                        list.push({
                            id: xListItem.getAttribute('id') || '',
                            text: xListItem.getAttribute('Text') || ''
                        });
                    }, this);
                    this.optionLists.push({ name: name, listType: listType, list: list, isOptionList: true });
                }, this);
            };
        },
    
        parseTextElement: function (parentNode) {
            var xText = XmlUtil.selectChildElement(parentNode, 'Text');
            if (xText) {
                this.parseContent(this.editArea, xText);
            };
        },
    
        parseText: function (value) {
            if (!value) {
                return;
            };
            var div = domConstruct.create('div');
            div.innerHTML = value;
            this.parseContent(this.editArea, div);
        },
    
        parseContent: function (containerNode, sourceNode) {
            this.inherited(arguments);
            array.forEach(this.getFields(), function (field) {
                field.fieldContainer = this;
            }, this);
            this.endEdit();
        },
    
        serializeWidget: function (writer, widget) {
            writer.beginElement('div');
            writer.attribute('dojoType', widget.declaredClass);
    
            var widgetType = require(widget.declaredClass.replace(/\./g, "/"));
            if (widgetType) {
                var baseWidget = new widgetType();
                array.forEach(widget._getSetterAttributes(), function (attrName) {
                    var attrValue = widget.get(attrName);
                    switch (typeof attrValue) {
                        case 'string':
                            writer.attribute(attrName, attrValue, baseWidget.get(attrName));
                        case 'number':
                            if (!isNaN(attrValue)) {
                                writer.attribute(attrName, attrValue, baseWidget.get(attrName));
                            };
                        case 'object':
                            //skipping object serialization for now
                            break;
                        case 'function':
                            break;
                        case 'undefined':
                            break;
                        default:
                            break;
    
                    };
                    if (widget.get(attrName) != baseWidget.get(attrName)) {
                        writer.attribute(attrName, widget.get(attrName));
                    };
                });
            };
    
            writer.endElement();
        },
    
        getContextActions: function (item, widget, targetNode) {
            var actions = [];
    
        	// DojoConvertIgnore
            if (array.indexOf(core.settings.services, 'Quippe.TextRecognition.ITextRecognitionService') >= 0) {
                actions.push({ label: 'Tag Text', icon: 'signal_flag_red', onClick: lang.hitch(this, this.onTagText) });
            };

            if (this.allowFieldEntryDialog && this.getFields().length > 0) {
                actions.push({ label: 'Data Field Entry', icon: 'form_blue', onClick: lang.hitch(this, this.onShowFieldEntry) });
            };
            if (core.settings.enableTextMacros) {
                actions.push({ label: 'Create Text Macro', icon: 'document', onClick: lang.hitch(this, this.onShowMacroEditor) });
            };
            actions.push({ label: 'Delete Free Text Block', icon: 'delete', topic: '/qc/DeleteFinding', beginGroup: actions.length > 0 ? true : false });
    
            return actions;
        },
    
        getPlainText: function (maxLength, addElipsis) {
            var text = this.editArea.textContent || this.editArea.innerText;
            if (maxLength && text.length > maxLength) {
                text = text.substr(0, maxLength);
                if (addElipsis) {
                    text += '...';
                }
            };
            return text;
        },
    
        getFields: function () {
            return query('.macroField', this.editArea).map(registry.byNode);
        },
    
        getField: function (name) {
            return array.filter(this.getFields(), function (x) { return x.name == name })[0] || null;
        },
    
        getFindings: function () {
            return query('> .finding', this.dataArea).map(registry.byNode);
        },
    
        getFinding: function (name) {
            return array.filter(this.getFindings(), function (x) { return x.get('name') == name })[0] || null;
        },
    
        getOptionLists: function () {
            if (!this.optionLists) {
                this.optionLists = [];
            };
            return this.optionLists;
        },
    
        getOptionList: function (name) {
            return array.filter(this.getOptionLists(), function (x) { return x.name == name })[0] || null;
        },
    
        onBlur: function () {
            this.endEdit();
        },
    
        onClick: function (evt) {
            event.stop(evt);
    
            var editor = this.getEditor();
            if (editor) {
                editor.select(this);
            };
    
            if (this.getViewMode() == 'design') {
                return;
            };
    
            if (!this.showFieldDropDowns) {
                return;
            };
    
            var field = core.ancestorWidgetByClass(evt.target, 'macroField', true);
    
            if (!field) {
                return this.startEdit();
            };
    
            var menu = field.getOptionMenu();
            if (menu) {
                popup.open({
	            	popup: menu,
	            	around: evt.target,
	            	orient: ['below', 'above'],
					onExecute: menu.onExecute
	            });

	            menu.focus();
            }
            else {
                var selObj = window.getSelection();
                selObj.removeAllRanges();
                if (field.fieldType != 'label') {
                    var range = document.createRange();
                    range.selectNodeContents(field.domNode);
                    selObj.addRange(range);
                    var data = this.data;
                    var hBlur = on(field.domNode, "blur", function () {
                        field.setValueFromInnerText();
                        core.disconnect(hBlur);
                    });
                }
            };
        },
    
        // ====== Data Entry Form =====
        onShowFieldEntry: function() {
            var form = this.createEntryForm();
            if (!form) {
                return;
            };

            var dlg = new Dialog({ title: this.macroDialogTitle || 'Data Fields' , content: form});
            domClass.add(dlg.domNode, 'qcFieldDialog');
            core.showDialog(dlg, lang.hitch(this, function () {
                query('.editControl', form.domNode).map(registry.byNode).forEach(function (editControl) {
                    var fieldName = editControl.domNode.getAttribute('data-field-name');
                    var field = this.getField(fieldName);
                    field.set('value', editControl.get('value'));
                }, this);
            }));
        },

        createEntryForm: function () {
            var fields = this.getFields().filter(function (x) { return x.fieldType != 'label' });

            if (!fields || fields.length == 0) {
                return null;
            };

            var table = null;
            var row = null;
            var labelCell = null;
            var editCell = null;
            var field = null;
            var editControl = null;
            var button = null;
            var store = null;
            var textValue = '';
            var reUnderscores = new RegExp('^_+$');
    
            table = domConstruct.create('table');
            domStyle.set(table, { margin: '12px' });
            var optionList = null;
    
            array.forEach(fields, function (field) {
                switch (field.choiceType) {
                    case 'multiple':
                        optionList = field.getOptionList();
                        editControl = new CheckList();
                        editControl.load(optionList ? optionList.list : []);
                        editControl.set('value', field.get('value'));
                        break;
                    case 'single':
                        optionList = field.getOptionList();
                        store = new SettingsEnumStore(optionList ? optionList.list : [], false);
                        editControl = new FilteringSelect({ searchAttr: 'text', store: store });
                        editControl.set('value', field.get('value'));
                        editControl.textbox.setAttribute('readonly', 'readonly');
                        break;
                    default:
                        textValue = reUnderscores.test(field.get('text')) ? '' : field.get('text');
                        editControl = new TextBox();
                        editControl.set('value', textValue);
                        break;
                };
                domClass.add(editControl.domNode, 'editControl');
                editControl.startup();
                editControl.domNode.setAttribute('data-field-name', field.name);
    
                row = table.insertRow(-1);
    
                labelCell = row.insertCell(-1);
                labelCell.innerHTML = field.getFieldCaption() + ':';
    
                editCell = row.insertCell(-1);
                editControl.placeAt(editCell);
            }, this);
            return table;
        },
    
        onShowMacroEditor: function () {
            var writer = new XmlWriter();
            var data = this.writeNoteElement(writer, 'template');
            var xDoc = writer.toDocument();
            topic.publish('/qc/ShowDialog', 'textMacroEditor', { macroDocument: xDoc});
        },
    
        isEquivalentElement: function (other) {
            return (other.name && other.name == this.name) || (other.medcinId && (other.medcinId == this.medcinId) && ((other.prefix || '') == (this.prefix || '')));
        },
    
        merge: function (other) {
            if (other.domNode && domClass.contains(other.domNode, 'freeText')) {
                this.mergeOtherFreeText(other);
            };
            return this;
        },
    
        getItem: function (node) {
            return { type: 'noteElement', node: this.domNode, text: 'Free Text Block' };
        },
    
        updateDisplay: function (viewMode) {
            this.inherited(arguments);
            if (viewMode == 'design' || this.get('disabled')) {
                this.editArea.removeAttribute('contentEditable');
                core.setSelectable(this.domNode, false);
                core.setSelectable(this.editArea, false);
                domClass.add(this.domNode, 'qcddSource');
                domClass.remove(this.domNode, 'qcddPrevent');
            }
            else {
                this.editArea.setAttribute('contentEditable', true);
                core.setSelectable(this.domNode, true);
                core.setSelectable(this.editArea, true);
                domClass.remove(this.domNode, 'qcddSource');
                domClass.add(this.domNode, 'qcddPrevent');
            };

            if (viewMode == 'concise' && !this.hasContent() && (!domClass.contains(this.domNode, 'alwaysShow'))) {
                domClass.add(this.domNode, 'viewHide');
            }
            else {
                domClass.remove(this.domNode, 'viewHide');
            };
        },
    
	    // === property definitions === 
        _pgPropDef_medcinId: function() {
            return { name: 'medcinId', group: 'Data', type: 'integer', description: core.getI18n('tooltipMedcinId'), defaultValue: 0, reloadOnChange: true };
        },

        _pgPropDef_prefix: function() {
            return { name: 'prefix', group:'Data', isShareable: true, description: core.getI18n('tooltipPrefix') };
        },

        _pgPropDef_emLevel: function () {
            if (this.medcinId == core.MedcinInfo.knownMedcinIds.HPIFreeText) {
                return { name: 'emLevel', group: 'Data', caption: 'E&M Level', isShareable: true, description: core.getI18n('tooltipFreeTextEMLevel'), defaultValue: 1, type: 'integer', options: '[0=;1=Brief;2=Extended]' };
            }
            else {
                return null;
            }
        },

        onTagText: function () {
            var text = (this.get('text') || '').toString().trim();
            if (!text) {
                return;
            };

            var keys = this.getContainerGroupKeys();
            var sectionId = keys ? keys.sectionid || keys.groupId || '' : '';
            var self = this;

            return request(core.serviceURL("Quippe/TextRecognition/Recognize"), {
                query: {
                    "Text": text,
                    "Culture": core.settings.culture,
                    "PatientId": (core.Patient ? core.Patient.id : ''),
                    "EncounterTime": DateUtil.formatISODate(core.Encounter && core.Encounter.encounterTime ? core.Encounter.encounterTime : new Date()),
                    "DocumentType": "QuippeNote",
                    "DocumentSection": sectionId,
                    "DataFormat": "JSON"
                },
                handleAs: "json"
            }).then(function (data) {
                var newText = [];
                var lastIndex = 0;
                if (data.taggedText && data.taggedText.text && data.taggedText.results) {
                    text = data.taggedText.text;
                    array.forEach(data.taggedText.results, function (res) {
                        if (res.index >= lastIndex) {
                            newText.push(text.substr(lastIndex, res.index - lastIndex));
                            newText.push('<span class="taggedFinding ');
                            newText.push(res.result == 'N' ? 'neg' : 'pos');
                            newText.push('">');
                            newText.push(text.substr(res.index, res.length));
                            newText.push('</span>');
                            lastIndex = res.index + res.length;
                        };
                        res.type = "term";
                        topic.publish('/qc/AddToNote', res);
                    });
                };
                if (lastIndex < text.length) {
                    newText.push(text.substr(lastIndex, text.length - lastIndex));
                };
                self.clear();
                self.editArea.innerHTML = newText.join('');
            }, core.showError);
        },

        cleanHTML: function(htm) {
            if (!htm) {
                return '';
            };
            var div = domConstruct.create('div');
            div.innerHTML = htm;
            query('*', div).forEach(function (node) {
                if (domClass.contains(node, 'macroField')) {
                    var macroText = (node.textContent || '').trim() + ' ';
                    if (macroText) {
                        node.parentNode.insertBefore(document.createTextNode(macroText), node);
                    }
                    node.parentNode.removeChild(node);
                }
                else {
                    node.removeAttribute('id');
                    node.removeAttribute('widgetid');
                    node.removeAttribute('data-name');
                    domClass.remove(node, ['noteElement', 'finding', 'freeText']);
                };
            });
            return div.innerHTML;
        },

        onPaste: function (evt) {
            var freeTextPaste = core.settings.freeTextPaste || 'fmt';
            if (freeTextPaste == 'none') {
                event.stop(evt);
                return;
            };

            if (evt.clipboardData) {
                var htm = freeTextPaste == 'fmt' ? this.cleanHTML(evt.clipboardData.getData('text/html')) : evt.clipboardData.getData('text/plain');
                if (htm) {
                    evt.preventDefault();
                    document.execCommand('insertHTML', false, htm);
                };
            }
            else if (window.clipboardData && window.getSelection) {
                evt.preventDefault();
                var text = window.clipboardData.getData('Text');
                window.getSelection().getRangeAt(0).insertNode(document.createTextNode(text));
            };
        },

        getViewMode: function () {
            if (this.inMacroDesign) {
                return 'expanded';
            }
            else {
                return this.inherited(arguments);
            };
        }

	});

	core.settings.noteElementClasses["qc/note/FreeText"] = FreeText;

	return FreeText;
});