define([
    "qc/note/FindingLabel",
    "qc/note/FreeText",
    "qc/note/MacroField",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/registry",
    "dijit/Toolbar",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom-class",
    "dojo/on",
    "dojo/query",
    "dojo/text!qc/design/templates/MacroEditorDialog.htm",
    "dojo/when",
    "qc/_core",
    "qc/design/_PropertyGridSupport",
    "qc/design/FindingChooserDialog",
    "qc/design/FindingListEditorDialog",
    "qc/design/OptionListEditorDialog",
    "qc/design/PropertyGrid",
    "qc/Dialog",
    "qc/OpenContentDialog",
    "qc/SaveContentDialog",
    "qc/StringUtil",
    "qc/TreeNode",
    "qc/TreeView",
    "qc/XmlWriter"
], function (FindingLabel, FreeText, MacroField, _WidgetsInTemplateMixin, Button, BorderContainer, registry, Toolbar, array, declare, lang, aspect, domClass, on, query, MacroEditorDialogTemplate, when, core, _PropertyGridSupport, FindingChooserDialog, FindingListEditorDialog, OptionListEditorDialog, PropertyGrid, Dialog, OpenContentDialog, SaveContentDialog, StringUtil, TreeNode, TreeView, XmlWriter) {
    return declare("qc.design.MacroEditorDialog", [Dialog, _WidgetsInTemplateMixin], {
        templateString: MacroEditorDialogTemplate,
        
        title: 'Macro Editor',
        reNewItem: /^\(ne/,
    
        startup: function () {
            if (!this._started) {
                this.editor = new FreeText();
                this.editor.startup();
    
                this.tv = new TreeView(null, this.tvNode);
                this.tv.nodeFromItem = lang.hitch(this, this.treeNodeFromItem);
                this.tv.resolveChildren = lang.hitch(this, this.treeResolveChildren);
    
                this.pg = new PropertyGrid({ sortProperties: false }, this.pgNode);
                this.pg.propertyManager = this;
                this.pg.startup();
    
                this.events = [
                    on(this.editor, "SelectionChanged", lang.hitch(this, this.onEditorSelectionChanged)),
                    aspect.after(this.tv, "onSelectionChanged", lang.hitch(this, this.onTreeSelectionChanged), true)
                ];
    
                this.inherited(arguments);
            };
        },
    
        // ======== Actions ========
    
        fileNew: function () {
            this.reset();
            this.editor.editArea.innerHTML = '&nbsp;';
        },
    
        fileOpen: function () {
            core.doDialog(OpenContentDialog, { title: 'Open Macro', typeFilter: ['macro','element'] }, function (dlg) {
                return this.loadFromContentLibrary(dlg.get('item'));
            }, null, this);
        },
    
        fileSave: function () {
            if (this.saveParms && this.saveParms.id) {
                this.doSave(this.saveParms);
            }
            else {
                this.fileSaveAs();
            }
        },

        fileSaveAs: function () {
            var saveCallback = lang.hitch(this, this.doSave);
            core.doDialog(SaveContentDialog, {
                types: [{
                    name: 'macro',
                    caption: 'Text Macro',
                    callback: saveCallback
                }],
                defaultType: 'macro',
                location: this.contentPath || '',
                name: this.editor.get('name') || ''
            });
        },

        doSave: function (parms) {
            var xml = this.toXml();
            if (!xml) {
                return;
            };
           
            var content = {}
            for (var p in parms) {
                content[p] = parms[p];
            };
            content.data = xml;
            content.mimeType = 'text/xml';

            var self = this;
            self.saveParms = parms;
            return core.xhrPost({
                url: core.serviceURL('Quippe/ContentLibrary/Save?DataFormat=JSON'),
                content: content,
                handleAs: 'json',
                error: core.showError,
                load: function (data, ioArgs) {
                    if (data.error) {
                        core.showError(data.error.message);
                    }
                    else {
                        for (var p in data.item) {
                            self.saveParms[p] = data.item[p];
                        };
                        self.set('title', 'Macro Editor - ' + self.saveParms.name);
                    }
                }
            });

        },
    
        addField: function () {
            var range = this.getTextRange();
            if (!range || range.collapsed) {
                return;
            };
    
            if (!this.trimRange(range)) {
                return;
            };

            if (this.rangeContainsField(range)) {
                return;
            };
    
            var field = new MacroField();
            var name = this.newName(this.getFields(), 'Field');
            field.set('name', name);
            field.set('text', range.cloneContents().textContent);
            field.set('placeHolder', field.get('text'));
            field.fieldContainer = this.editor;
            range.deleteContents()
            //range.insertNode(document.createTextNode(' '));
            range.insertNode(field.domNode);
            //range.insertNode(document.createTextNode(' '));
    
            //add to tree in document order
            var newList = this.getFields();
            var newTreeNode = this.treeNodeFromItem({ nodeType: 'field', name: name, data: field });
            var useNext = false;
            var targetField = null;
            for (var n = 0; n < newList.length; n++) {
                if (newList[n].id == field.id) {
                    break;
                };
                targetField = newList[n];
            };
            var targetTreeNode = targetField ? this.findTreeNode('field', targetField.get('name')) : null;
            if (targetTreeNode) {
                this.tv.fieldsNode.insertChild(newTreeNode, 'after', targetTreeNode);
            }
            else {
                this.tv.fieldsNode.insertChild(newTreeNode, 'first');
            }
    
            this.selectField(field);
            return field;
        },
    
        removeField: function (fieldName) {
            field = fieldName ? this.editor.getField(fieldName) : this.getSelectedField();
    
            if (field) {
                domClass.remove(field.domNode, 'selected');
                var text = field.get('text');
                if (text) {
                    var textNode = document.createTextNode(text);
                    field.domNode.parentNode.insertBefore(textNode, field.domNode);
                };
                field.destroyRecursive();
            };
    
            var fieldNode = this.findTreeNode('field', field.name);
            if (fieldNode) {
                if (fieldNode.domNode) {
                    domClass.remove(fieldNode.domNode, 'selected');
                };
                fieldNode.destroyRecursive();
            };
    
            this.pg.set('selectedObject', null);
    
            this.onEditorSelectionChanged('none', null);
        },
    
        addFinding: function (field) {
            var editor = this.editor;
            var pg = this.pg;
            var tNode = this.tv.findingsNode;
            var findingName = this.newName(this.getFindings(), 'Finding');
            var reNewItem = this.reNewItem;
            core.doDialog(FindingChooserDialog, { title: 'Select Finding', findingNameRequired: true, findingName: findingName },
                function (dlg) {
                    var termData = dlg.get('value')
                    var finding = core.createFindingEntry(termData);
                    finding.placeAt(editor.dataArea);
                    if (field) {
                        field.findingName = finding.name;
                    };
                    tNode.addItem({ nodeType: 'finding', name: finding.name, data: finding });
                    pg.refresh();
                },
                function (dlg) {
                    if (field && field.findingName && reNewItem.test(field.findingName)) {
                        field.findingName = '';
                    };
                    pg.refresh();
                }
            );
        },
    
        removeFinding: function (name) {
            if (!name) {
                return;
            };
    
            var finding = this.editor.getFinding(name);
            if (!finding) {
                return;
            };
    
            array.forEach(this.getFields(), function (field) {
                if (field.findingName == name) {
                    field.findingName = '';
                };
            });
    
            var treeNode = this.findTreeNode('finding', name);
            if (treeNode) {
                if (treeNode.domNode) {
                    domClass.remove(treeNode.domNode, 'selected');
                };
                treeNode.destroyRecursive();
            };
    
            finding.destroyRecursive();
            this.pg.set('selectedObject', null);
        },
    
        addTextOptionList: function (field) {
            var editor = this.editor;
            var pg = this.pg;
            var tNode = this.tv.optionListsNode;
            var listName = this.newName(this.getOptionLists(), 'TextList');
            var reNewItem = this.reNewItem;
            core.doDialog(OptionListEditorDialog, { list: { name: listName, listType: 'text', list: []} },
                function (dlg) {    //OK
                    var list = dlg.get('list');
                    editor.optionLists.push(list);
                    if (field) {
                        field.listName = list.name;
                    };
                    tNode.addItem({ nodeType: 'optionList', name: list.name, data: list });
                    pg.refresh();
                },
                function (dlg) {    //Cancel
                    if (field && field.listName && reNewItem.test(field.listName)) {
                        field.listName = '';
                    };
                    pg.refresh();
                }
            );
    
        },
    
        addFindingOptionList: function (field) {
            var editor = this.editor;
            var pg = this.pg;
            var tNode = this.tv.optionListsNode;
            var listName = this.newName(this.getOptionLists(), 'FindingList');
            var reNewItem = this.reNewItem;
    
            core.doDialog(FindingListEditorDialog, { list: { name: listName, listType: 'finding', list: []} },
                function (dlg) {
                    var list = dlg.get('list');
                    editor.optionLists.push(list);
                    if (field) {
                        field.listName = list.name;
                    };
                    tNode.addItem({ nodeType: 'optionList', name: list.name, data: list });
                    pg.refresh();
                },
                function (dlg) {
                    if (field && field.listName && reNewItem.test(field.listName)) {
                        field.listName = '';
                    };
                    pg.refresh();
                }
            );
        },
    
        removeOptionList: function (name) {
            var optionLists = this.editor.optionLists;
            if (!optionLists) {
                return;
            };
    
            var listIndex = -1;
            for (var n = 0; n < optionLists.length; n++) {
                if (optionLists[n].name = name) {
                    listIndex = n;
                    break;
                };
            };
            if (listIndex < 0) {
                return;
            };
    
            array.forEach(this.editor.getFields(), function (field) {
                if (field.listName == name) {
                    field.listName = '';
                };
            });
    
            var treeNode = this.findTreeNode('optionList', name);
            if (treeNode) {
                if (treeNode.domNode) {
                    domClass.remove(treeNode.domNode, 'selected');
                };
                treeNode.destroyRecursive();
            };
    
            optionLists.splice(listIndex, 1);
            this.pg.set('selectedObject', null);
        },
    
        editOptionList: function (name) {
            var editor = this.editor;
            var optionList = editor.getOptionList(name);
            if (!optionList) {
                return;
            };
    
            var self = this;
            var dialogType = optionList.listType == 'finding' ? FindingListEditorDialog : OptionListEditorDialog;
            var oldName = optionList.name;
    
            core.doDialog(dialogType, { list: optionList }, function (dlg) {
                var newList = dlg.get('list');
                if (newList.name != oldName) {
                    self.renameOptionList(optionList, newList.name);
                };
                optionList.list = newList.list;
                self.pg.refresh();
            });
        },
    
        // ======== Events ========
        onNewClick: function () {
            this.fileNew();
        },
    
        onOpenClick: function () {
            this.fileOpen();
        },
    
        onSaveClick: function () {
            this.fileSave();
        },

        onSaveAsClick: function() {
            this.fileSaveAs();
        },
    
        onAddFieldClick: function () {
            this.addField();
        },
    
        onRemoveFieldClick: function () {
            this.removeField();
        },
    
        onPreviewClick: function () {
            this.editor.onShowFieldEntry();
        },
    
        onEditorMouseUp: function (evt) {
            if (domClass.contains(evt.target, 'macroField')) {
                this.selectField(registry.byNode(evt.target));
            }
            else {
                this.savedRange = null;
                query('.selected', this.editor.editArea).removeClass('selected');
                var range = this.getTextRange();
                this.savedRange = range;
                this.onEditorSelectionChanged('text', range);
            }
        },
    
        onEditorSelectionChanged: function (selectionType, selection) {
            if (selectionType == 'field' && selection) {
                var fieldNode = this.findTreeNode('field', selection.name);
                if (fieldNode) {
                    this.tv.expandToNode(fieldNode);
                    this.tv.selectNode(fieldNode);
                };
            };
            this.checkState();
        },
    
        onTreeSelectionChanged: function (node) {
            if (!node || !node.data) {
                this.pg.set('selectedObject', null);
                return;
            };
    
            if (node.nodeType == 'field') {
                if (node.data.domNode && !domClass.contains(node.data.domNode, 'selected')) {
                    this.selectField(node.data);
                };
            };
    
            var dataObject = node.data;
            if (dataObject) {
                dataObject.treeNode = node;
            };
            this.pg.set('selectedObject', dataObject);
            this.checkState();
        },
    
        checkState: function () {
            var fields = this.getFields();
            var field = this.getSelectedField();
            var range = field ? null : this.getTextRange();
    
            this.addButton.set('disabled', range && !range.collapsed && !this.rangeContainsField(range) ? false : true);
            this.removeButton.set('disabled', field ? false : true);
            this.entryPreviewButton.set('disabled', fields && fields.length > 0 ? false : true);
        },

        rangeContainsField: function(range) {
            return range && query('.macroField', range.cloneContents()).length > 0;
        },
    
        // ======== Data ========
    
        getFields: function (filter) {
            var list = this.editor.getFields();
            return filter ? array.filter(list, filter) : list;
        },
    
        getFindings: function (filter) {
            var list = this.editor.getFindings();
            return filter ? array.filter(list, filter) : list;
        },
    
        getOptionLists: function (filter) {
            var list = this.editor.getOptionLists();
            return filter ? array.filter(list, filter) : list;
        },
    
        newName: function (objectList, namePrefix) {
            var n = 1;
            if (objectList && objectList.length > 0) {
                var nameList = array.map(objectList, function (x) { return x.name });
                while (array.indexOf(nameList, namePrefix + n) >= 0) {
                    n++;
                };
            };
            return namePrefix + n;
        },
    
        // ======== Selection ========
        selectField: function (field) {
            this.clearRanges();
            if (!domClass.contains(field.domNode, 'selected')) {
                query('.selected', this.editor.editArea).removeClass('selected');
                domClass.add(field.domNode, 'selected');
                this.onEditorSelectionChanged('field', field);
            };
            return field;
        },
    
        getSelectionRange: function () {
            var range = null;
            if (window.getSelection) {
                var selObj = window.getSelection();
                range = selObj && selObj.rangeCount > 0 ? selObj.getRangeAt(0) : null;
            }
            else if (document.selection) {
                range = document.selection.createRange();
            };
            return range;
        },
    
        getTextRange: function () {
            var range = this.getSelectionRange();
    
            if (!range || (range.collapsed && this.savedRange) || !this.nodeContainsRange(this.editor.editArea, range)) {
                range = this.restoreRange();
            };
    
            return range;
        },
    
        getTrimOffsets: function (text) {
            if (!text) {
                return null;
            };
    
            var s = 0;
            var e = text.length - 1;
            while (s < e && text.charAt(s) == ' ') {
                s++;
            };
            while (e > s && text.charAt(e) == ' ') {
                e--;
            };
            if (e <= s) {
                return null;
            }
            else {
                return { s: s, e: e };
            }
        },
    
        trimRange: function (range) {
            if (!range) {
                return false;
            };
    
            var text = range.cloneContents().textContent;
            if (!text) {
                return false;
            };
    
            if (range.startContainer && range.startContainer.nodeType == 3) {
                var s = 0;
                for (s = 0; s < text.length; s++) {
                    if (text.charAt(s) != ' ') {
                        break;
                    };
                };
                if (s > 0) {
                    range.setStart(range.startContainer, range.startOffset + s);
                };
            };
    
            if (range.endContainer && range.endContainer.nodeType == 3) {
                for (e = text.length - 1; e > 0; e--) {
                    if (text.charAt(e) != ' ') {
                        break;
                    };
                };
                if (e < text.length - 1) {
                    var newEnd = range.endOffset - (text.length - 1 - e);
                    if (newEnd >= 0) {
                        range.setEnd(range.endContainer, newEnd);
                    }
                };
            };
    
            return true;
    
        },
    
        nodeContainsRange: function (node, range) {
            var rNode = range.startContainer
            while (rNode && rNode != node) {
                rNode = rNode.parentNode;
            };
            return (rNode == node);
        },
    
        getSelectedField: function () {
            return query('.selected', this.editor.editArea).map(registry.byNode)[0] || null;
        },
    
        clearSelection: function () {
            this.clearRanges();
            query('.selected', this.editor.editArea).removeClass('selected');
            this.onEditorSelectionChanged('none', null);
        },
    
        clearRanges: function () {
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            else if (document.selection) {
                document.selection.empty();
            };
            this.savedRange = null;
        },
    
        saveRange: function () {
            var range = this.getSelectionRange();
            if (range && this.nodeContainsRange(this.editor.editArea)) {
                this.savedRange = range;
            };
        },
    
        restoreRange: function () {
            if (this.savedRange) {
                var range = null;
                if (this.savedRange.select) {
                    range = this.savedRange;
                    range.select();
                }
                else {
                    range = document.createRange();
                    range.setStart(this.savedRange.startContainer, this.savedRange.startOffset);
                    range.setEnd(this.savedRange.endContainer, this.savedRange.endOffset);
                };
                return range;
    
            }
            else {
                return null;
            };
        },
    
        // ======== Tree ========
        loadTree: function () {
            this.tv.clear();
            var tRoot = this.tv.addItem({ label: 'Macro', nodeType: 'group', name: 'macro', data: this.editor });
    
            var tFields = tRoot.addItem({ nodeType: 'group', name: 'fields', label: 'Fields', lazy: true, data: {} });
            array.forEach(this.getFields(), function (item) {
                tFields.addItem({ nodeType: 'field', name: item.name, data: item });
            });
    
            var tFindings = tRoot.addItem({ nodeType: 'group', name: 'findings', label: 'Findings', lazy: true, data: {} });
            array.forEach(this.getFindings(), function (item) {
                tFindings.addItem({ nodeType: 'finding', name: item.name, data: item });
            });
    
            var tOptionLists = tRoot.addItem({ nodeType: 'group', name: 'optionLists', label: 'Option Lists', lazy: true, data: {} });
            array.forEach(this.getOptionLists(), function (item) {
                tOptionLists.addItem({ nodeType: 'optionList', name: item.name, data: item });
            });
    
            this.tv.root = tRoot;
            this.tv.fieldsNode = tFields;
            this.tv.findingsNode = tFindings;
            this.tv.optionListsNode = tOptionLists;
    
            tRoot.expand();
            return tRoot;
        },
    
        findTreeNode: function (nodeType, name) {
            return this.tv.findNode(function (node) {
                return node.nodeType == nodeType && node.name == name;
            });
        },
    
        treeNodeFromItem: function (item) {
            var node = new TreeNode({
                label: item.label || item.name,
                reserveIconSpace: false,
                lazyLoading: item.lazy || false
            });
            node.name = item.name;
            node.nodeType = item.nodeType;
            node.data = item.data;
            return node;
        },
    
        treeResolveChildren: function (node) {
            return [];
        },
    
        // ======== Property Grid ========
        _pgGetWrapper: function (obj) {
            return {
                target: obj,
                _pgGetProperties: lang.hitch(this, function () { return this.getProperties(obj) }),
                _pgGetPropertyValue: lang.hitch(this, function (propertyInfo) { return this.getPropertyValue(obj, propertyInfo) }),
                _pgSetPropertyValue: lang.hitch(this, function (propertyInfo, value) { return this.setPropertyValue(obj, propertyInfo, value) }),
                _hasPropertyGridSupport: true
            };
        },
    
        getProperties: function (obj) {
            if (obj.domNode && domClass.contains(obj.domNode, 'noteElement')) {
                if (domClass.contains(obj.domNode, 'freeText')) {
                    return this.getMacroProperties(obj);
                }
                else if (domClass.contains(obj.domNode, 'macroField')) {
                    return this.getFieldProperties(obj);
                }
                else if (domClass.contains(obj.domNode, 'findingGroup')) {
                    return this.getFindingGroupProperties(obj);
                }
                else if (domClass.contains(obj.domNode, 'finding')) {
                    return this.getFindingProperties(obj);
                }
            };
    
            if (obj.isOptionList) {
                return this.getOptionListProperties(obj);
            };
    
            return [];
        },
    
        getFieldProperties: function (field) {
            return field._pgGetProperties();
        },
    
        getFindingProperties: function (finding) {
            var list = [
                { name: 'name', description: core.getI18n('tooltipName') },
                { name: 'medcinId', type: 'integer', editorCallback: lang.hitch(this, this.showTermChooser), group: 'Data', description: core.getI18n('tooltipMedcinId') },
                { name: 'prefix', group: 'Data', isShareable: true, description: core.getI18n('tooltipPrefix') },
                { name: 'status', group: 'Data', isShareable: true, description: core.getI18n('tooltipStatus') },
                { name: 'modifier', group: 'Data', isShareable: true, description: core.getI18n('tooltipModifier') },
                { name: 'result', group: 'Data', isShareable: true, description: core.getI18n('tooltipResult') },
                { name: 'value', group: 'Data', isShareable: true, description: core.getI18n('tooltipValue') },
                { name: 'unit', group: 'Data', isShareable: true, description: core.getI18n('tooltipUnit') },
                { name: 'onset', group: 'Data', isShareable: true, description: core.getI18n('tooltipOnset') },
                { name: 'duration', group: 'Data', isShareable: true, description: core.getI18n('tooltipDuration') },
                { name: 'notation', caption: 'Note', group: 'Data', isShareable: true, description: core.getI18n('tooltipNote') }
            ];
            list.forEach(function (x) { x.propSource = 'finding' });
            return list;
        },
    
        getFindingGroupProperties: function (findingGroup) {
            return [
                { name: 'prefix', group: 'Data', isShareable: true, description: core.getI18n('tooltipPrefix') },
                { name: 'status', group: 'Data', isShareable: true, description: core.getI18n('tooltipStatus') },
                { name: 'modifier', group: 'Data', isShareable: true, description: core.getI18n('tooltipModifier') },
                { name: 'result', group: 'Data', isShareable: true, description: core.getI18n('tooltipResult') },
                { name: 'onset', group: 'Data', isShareable: true, description: core.getI18n('tooltipOnset') },
                { name: 'duration', group: 'Data', isShareable: true, description: core.getI18n('tooltipDuration') }
            ];
        },
    
        getMacroProperties: function (macro) {
            return [
                { name: 'name', description: core.getI18n('tooltipName') },
                { name: 'macroDialogTitle', caption: 'Caption', description: 'Title to use for the data entry form', group: 'Data Entry' },
                { name: 'sectionId', description: 'Identifies sugguested placement for this macro in a document template', group: 'Content Placement' },
                { name: 'groupId', description: 'Identifies sugguested placement for this macro in a document template', group: 'Content Placement' },
                { name: 'medcinId', caption: 'Free Text MedcinId', description: 'The free text MEDCIN id associated with this macro.', group: 'Data' },
                { name: 'emLevel', caption: 'E&M Level', description: 'Level of detail to use for calculating E&M code.', group: 'Data' }
            ];
        },
    
        getOptionListProperties: function (optionList) {
            return [
                { name: 'name' }
            ];
        },
    
        getPropertyValue: function (obj, propertyInfo) {
            return core.isFunction(obj.get) ? obj.get(propertyInfo.name) : obj[propertyInfo.name];
        },
    
        setPropertyValue: function (obj, propertyInfo, value) {
            if (propertyInfo.name == 'findingName' && value == 'newFinding') {
                return this.addFinding(obj);
            };
    
            if (propertyInfo.name == 'listName') {
                if (value == 'newTextList') {
                    return this.addTextOptionList(obj);
                }
                else if (value == 'newFindingList') {
                    return this.addFindingOptionList(obj);
                }
            };
    
            if (propertyInfo.name == 'name') {
                if (obj.domNode && domClass.contains(obj.domNode, 'freeText')) {
                    return obj.set('name', value);
                }
                else if (obj.domNode && domClass.contains(obj.domNode, 'macroField')) {
                    return this.renameField(obj, value);
                }
                else if (obj.domNode && domClass.contains(obj.domNode, 'finding')) {
                    return this.renameFinding(obj, value);
                }
                else if (obj.isOptionList) {
                    return this.renameOptionList(obj, value);
                }
            };
    
            var currentValue = this.getPropertyValue(obj, propertyInfo);
            if (currentValue == value) {
                return false;
            };
    
            if (core.isFunction(this.set)) {
                obj.set(propertyInfo.name, value);
            }
            else {
                obj[propertyInfo.name] = value;
            };
    
            if (obj.domNode && domClass.contains(obj.domNode, 'macroField')) {
                this.pg.refresh();
            };
            return true;
        },
    
        renameFinding: function (finding, newName) {
            if (!finding || !newName) {
                return false;
            };
    
            var oldName = finding.get('name');
            if (oldName == newName) {
                return false;
            };
    
            var existing = array.filter(this.getFindings(), function (x) { return x.get('name') == newName })[0];
            if (existing) {
                return false;
            };
    
            array.forEach(this.getFields(), function (field) {
                if (field.findingName == oldName) {
                    field.findingName = newName;
                };
            });
    
            var tNode = this.findTreeNode('finding', oldName);
            if (tNode) {
                tNode.set('label', newName);
                tNode.name = newName;
            };
    
            finding.set('name', newName);
            return true;
        },
    
        renameOptionList: function (optionList, newName) {
            if (!optionList || !newName) {
                return false;
            };
    
            var oldName = optionList.name;
            if (oldName == newName) {
                return false;
            };
    
            var existing = array.filter(this.getOptionLists(), function (x) { return x.name == newName })[0];
            if (existing) {
                return false;
            };
    
            array.forEach(this.getFields(), function (field) {
                if (field.listName == oldName) {
                    field.listName = newName;
                };
            });
    
            var tNode = this.findTreeNode('optionList', oldName);
            if (tNode) {
                tNode.set('label', newName);
                tNode.name = newName;
            };
    
            optionList.name = newName;
            return true;
    
        },
    
        renameField: function (field, newName) {
            var oldName = field.get('name');
            var tNode = this.findTreeNode('field', oldName);
            if (tNode) {
                tNode.set('label', newName);
                tNode.name = newName;
            };
            field.set('name', newName);
        },
    
        showTermChooser: function (targetObject, propertyInfo) {
            var editor = this.editor;
            var pg = this.pg;
            core.doDialog(FindingChooserDialog, { title: 'Select Finding', value: targetObject.medcinId, findingNameRequired: false, showFindingName: false }, function (dlg) {
                var termData = dlg.get('value')
                targetObject.medcinId = parseInt(termData.medcinId, 10);
                pg.refresh();
            }, null, this);
        },
    
        // ======== IO ========
        loadFromXml: function (nodeOrDeferred) {
            var self = this;
            return when(nodeOrDeferred, function (xmlNode) {
                if (xmlNode && xmlNode.nodeType == 1) {
                    self.resetEditor();
                    self.editor.sourceXmlNode = xmlNode;
                    self.editor.parseXmlAttributes(self.editor, xmlNode);
                    self.editor.parseXmlChildElements(self.editor, xmlNode);

                    core.setSelectable(self.editor.domNode, true);
                    core.setSelectable(self.editor.editArea, true);

                    self.pg.set('selectedObject', null);
                    self.loadTree();
                    return true;
                }
                else {
                    return false;
                }
            });
        },
    
        loadFromContentLibrary: function (item) {
            if (!item || !item.id) {
                return false;
            };
    
            this.contentItem = item;
            this.saveParms = null;
            var saveParms = {
                id: item.id,
                parentId: item.parentId,
                name: item.text,
                type: item.type
            };
            var self = this;

            return this.loadFromXml(core.xhrGet({
                url: core.serviceURL('Quippe/ContentLibrary/Data'),
                content: { id: item.id },
                preventCache: true,
                handleAs: 'xml',
                error: core.showError,
                load: function (data, ioArgs) {
                    self.saveParms = saveParms;
                    self.set('title', 'Macro Editor - ' + saveParms.name);
                    return data.documentElement;
                }
            }));
    
        },
    
        loadFromText: function (text) {
            text = text || '';
            var writer = new XmlWriter();
            writer.beginElement('FreeText');
            writer.beginElement('Text');
            writer.raw(text);
            writer.endElement();
            writer.endElement();
            var doc = writer.toDocument();
            return this.loadFromXml(doc.documentElement);
        },
    
        toXml: function () {
            var writer = new XmlWriter({ includeXmlDeclaration: true });
            this.editor.writeNoteElement(writer, 'template');
            return writer.toString();
        },
    
        reset: function () {
            this.saveParms = null;
            this.set('title', 'Macro Editor');
            this.resetEditor();
    
            //fix for IE8/WinXP, issue #997
            try {
                this.editor.editArea.focus();
            }
            catch (ex) {
            };
    
            this.pg.set('selectedObject', null);
            this.loadTree();
        },
    
        resetEditor: function () {
            if (this.editorHandlers) {
                array.forEach(this.editorHandlers, core.disconnect);
                this.editorHandlers = null;
            };
    
            if (this.editor) {
                this.editor.destroyRecursive();
            };
    
            this.editor = new FreeText({ allowFieldEntryDialog: false, showFieldDropDowns: false, inMacroDesign: true });
            this.editor.placeAt(this.editorNode);
            this.editor.set('tabIndex', 1);
            this.editor.set('medcinId', 1718);
            this.editor.set('sectionId', 'S1');
            this.editor.getContextActions = lang.hitch(this, this.getContextActions);
            this.editor.startup();
    
            this.editorHandlers = [
                on(this.editor.editArea, "mouseup", lang.hitch(this, this.onEditorMouseUp))
            ];
    
        },
    
        getContextActions: function (item, widget, targetNode) {
            if (!widget || !widget.domNode) {
                return;
            };
    
            var actions = [];
    
            if (domClass.contains(widget.domNode, 'macroField')) {
                actions.push({ label: 'Remove Field', icon: 'delete', onClick: lang.hitch(this, function () { this.removeField(widget.name) }) });
            }
            else if (widget.isTreeNode && widget.nodeType == 'field') {
                actions.push({ label: 'Remove Field', icon: 'delete', onClick: lang.hitch(this, function () { this.removeField(widget.name) }) });
            }
            else if (widget.isTreeNode && widget.nodeType == 'finding') {
                actions.push({ label: 'Remove Finding', icon: 'delete', onClick: lang.hitch(this, function () { this.removeFinding(widget.name) }) });
            }
            else if (widget.isTreeNode && widget.nodeType == 'optionList') {
                actions.push({ label: 'Edit List', icon: 'pencil', onClick: lang.hitch(this, function () { this.editOptionList(widget.name) }) });
                actions.push({ label: 'Remove List', icon: 'delete', onClick: lang.hitch(this, function () { this.removeOptionList(widget.name) }) });
            }
            else if (widget.isTreeNode && widget.nodeType == 'group' && widget.name == 'optionLists') {
                actions.push({ label: 'Add Text Option List', icon: '', onClick: lang.hitch(this, function () { this.addTextOptionList() }) });
                actions.push({ label: 'Add Finding Option List', icon: '', onClick: lang.hitch(this, function () { this.addFindingOptionList() }) });
            }
            else if (widget.isTreeNode && widget.nodeType == 'group' && widget.name == 'findings') {
                actions.push({ label: 'Add Finding', icon: '', onClick: lang.hitch(this, function () { this.addFinding() }) });
            }
    
            return actions;
        },
    
        //called from ShowDialog
        setData: function (data) {
            this.reset();
    
            if (!data) {
                return;
            };
    
            if (data.macroDocument) {
                this.loadFromXml(data.macroDocument.documentElement);
            }
            else if (data.contentItem) {
                this.loadFromContentLibrary(data.contentItem);
            }
            else if (data.newMacro) {
                setTimeout(lang.hitch(this, this.onNewClick), 500);
            }
        }
    
    });
});