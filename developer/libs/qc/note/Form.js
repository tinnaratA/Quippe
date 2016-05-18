define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-geometry",
    "dojo/json",
    "dojo/promise/all",
    "dojo/query",
    "dojo/topic",
    "dojo/when",
    "dijit/layout/ContentPane",
    "dijit/registry",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "qc/_core",
    "qc/design/StyleEditorDialog",
    "qc/Dialog",
    "qc/note/_Element",
    "qc/note/_SelectableMixin",
    "qc/note/_Group",
    "qc/note/Document",
    "qc/StringUtil",
    "qc/XmlUtil",
    "qc/XmlWriter",
    "qc/Resizer",
    "dojo/text!qc/note/templates/Form.htm"
], function (declare, array, lang, aspect, dom, domConstruct, domClass, domStyle, domGeometry, json, all, query, topic, when, ContentPane, registry, _WidgetsInTemplateMixin, Button, core, StyleEditorDialog, Dialog, _Element, _SelectableMixin, _Group, Document, StringUtil, XmlUtil, XmlWriter, Resizer, templateText) {
    var TypeDef = declare("qc.note.Form", [Dialog, _Group, _SelectableMixin, _WidgetsInTemplateMixin], {
        templateString: templateText,
        elementName: 'Form',
        partType: 'form',
        partLevel: 1,
        title: '',
        action: '',
        width: 500,
        height: 300,
        hostEditor: null,
        subscriptions: null,
        showEmpty: true,
        sizeable: false,

        startup: function() {
            if (!this._started) {
                this.ensureNames();
                this.subscriptions = [
                     topic.subscribe('/qc/FindingResultChanged', lang.hitch(this, this.onFindingResultChanged))
                ];
                this.checkState();
                
                this.resizer = new Resizer({ ownerNode: this.domNode, sizeNode: this.domNode, enabled: this.sizeable });
                aspect.after(this.resizer, '_sizeChangedFromHandle', lang.hitch(this, this.onResizerUpdate));
                this.inherited(arguments);
            };
        },

        destroyRecursive: function() {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, function (s) { s.remove() });
                this.subscriptions = null;
            };

            var existingStylesheet = dom.byId(this.get("stylesheetId"));

            if (existingStylesheet) {
                domConstruct.destroy(existingStylesheet);
            }

            this.inherited(arguments);
        },

        _setTitleAttr: function(value) {
            this.title = value || '';
            this.titleNode.innerHTML = value;
        },

        _setShowHeaderAttr: function (value) { 
            //noop 
        },

        _setWidthAttr: function (value) {
            var nValue = parseInt(value, 10);
            if (!isNaN(nValue)) {
                this.width = nValue;
                this._size();
            };
        },

        _setHeightAttr: function (value) {
            var nValue = parseInt(value, 10);
            if (!isNaN(nValue)) {
                this.height = nValue;
                this._size();
            };
        },

        _setSizeableAttr: function (value) {
            this.sizeable = value || false;
            if (this.resizer) {
                this.resizer.set('enabled', this.sizeable || (this.getViewMode() == 'design'));
            };
        },

        _setNameAttr: function(value) {
            var stylesheetNode = dom.byId(this.get("name") + "Stylesheet");

            if (stylesheetNode) {
                stylesheetNode.id = value + "Stylesheet";
            }

            this.inherited(arguments);
        },

        writeNoteAttributes: function (writer, mode) {
            var props = ['name', 'styleClass', 'title', 'width', 'height', 'action', 'sizeable'];
            array.forEach(props, function (prop) {
                var value = this.get(prop);
                if (value) {
                    writer.attribute(StringUtil.toCamelUpper(prop), value);
                };
            }, this);
        },
        
        _pgPropDef_title: function () {
            return { name: 'title', group: 'Text' };
        },

        _pgPropDef_width: function() {
            return { name: 'width', type: 'integer', group: 'Style' };
        },

        _pgPropDef_height: function () {
            return { name: 'height', type: 'integer', group: 'Style' };
        },

        _pgPropDef_sizeable: function() {
            return { name: 'sizeable', type: 'boolean', group: 'Style', defaultValue: false };
        },

        _pgPropDef_formStyles: function() {
            return { name: 'formStyles', group: 'Style', editorCallback: lang.hitch(this, this.onEditStyles) };
        },

        _pgPropDef_action: function() {
            return { name: 'action', options: '[none=None;addEntries=Add All Entries to Note;addResults=Add Form Results to Note]', group: 'Behavior' };
        },

        _pgPropDef_anchor: function () { return null },
        _pgPropDef_text: function () { return null },
        _pgPropDef_level: function () { return null },
        _pgPropDef_showEmpty: function () { return null },
        _pgPropDef_freeTextMedcinId: function () { return null },
        _pgPropDef_impliedPrefixes: function () { return null },
        _pgPropDef_groupKeys: function () { return null },
        _pgPropDef_groupingRule: function () { return null },
        _pgPropDef_placementId: function () { return null },
        _pgPropDef_position: function () { return null },
        _pgPropDef_prefixActionOwnValue: function () { return null },
        _pgPropDef_prefixValue: function () { return null },
        _pgPropDef_autoPrompt: function () { return null },
        _pgPropDef_findingPlacement: function () { return null },
        _pgPropDef_layoutColumns: function () { return null },

        toggleSelection: function (evt) {
            if (this.getViewMode() == 'design' && (core.ancestorNodeByClass(evt.target, 'titleBar', true) || core.ancestorNodeByClass(evt.target, 'buttonArea', true))) {
                this.setSelected(!this.isSelected());
            };
        },

        getContextActions: function() {
            return [];
        },

        onOKClick: function (evt) {
            switch (this.action) {
                case 'addEntries':
                    this.synchFormToHost();
                    break;
                case 'addResults':
                    this.synchFormToHost();
                    break;
                default:
                    break;
            };

            this.onExecute();
        },

        onCancelClick: function (evt) {
            this.onCancel();
        },

        synchHostToForm: function (formPage) {
            var formNote = this;
            var hostNote = this.hostEditor ? this.hostEditor.note : null;
            if (!formNote || !hostNote) {
                return;
            };

            var matched = this.synchHostToForm_byNamedElement(formPage);

            var termCompare = function (a, b) {
                var n = a.medcinId - b.medcinId;
                if (n != 0) {
                    return n;
                };
                n = StringUtil.compare(a.prefix, b.prefix);
                if (n != 0) {
                    return n;
                };
                return 0;
            };

            var rootNode = formPage ? formPage.domNode : formNote.domNode;

            var formFindings = query('.finding', rootNode).map(registry.byNode).filter(function (f) {
                return matched.findIndex(function (h) {
                    return h.formSource == f.name || (h.medcinId == f.medcinId && h.prefix == f.prefix)
                }) < 0;
            }).sort(termCompare);

            if (formFindings.length == 0) {
                return;
            };
            
            var className = this.contentId ? 'lst' + core.createClassName(this.contentId) : '';
            var hostFindings = query('.finding', hostNote.domNode).map(registry.byNode).sort(function (a, b) {
                var n = termCompare(a, b);
                if (n == 0) {
                    if (className) {
                        if (domClass.contains(a.domNode, className)) {
                            if (domClass.contains(b.domNode, className)) {
                                n = 0;
                            }
                            else {
                                n = -1;
                            }
                        }
                        else {
                            if (domClass.contains(b.domNode, className)) {
                                n = 1;
                            }
                            else {
                                n = 0;
                            }
                        }
                    };
                };
                return n;
            });

            

            var f = 0, fLen = formFindings.length;
            var h = 0, hLen = hostFindings.length;
            var c = 0;
            while (f < fLen && h < hLen) {
                c = termCompare(formFindings[f], hostFindings[h]);
                if (c < 0) {
                    f++;
                }
                else if (c == 0) {
                    this.mergeFinding(hostFindings[h], formFindings[f]);
                    //domClass.add(hostFindings[h].domNode, className);
                    f++;
                    h++;
                }
                else {
                    h++;
                };
            };

            this.updateDisplay();
        },

        synchHostToForm_byNamedElement: function (formPage) {
            if (!this.contentId) {
                return;
            };

            var formNote = this;
            var hostNote = this.hostEditor ? this.hostEditor.note : null;
            if (!formNote || !hostNote) {
                return;
            };
            var matched = [];
            var className = 'lst' + core.createClassName(this.contentId);
            query('.' + className, hostNote.domNode).map(registry.byNode).forEach(function (hostWidget) {
                if (hostWidget.formSource) {
                    var formWidget = formNote.getElementByName(hostWidget.formSource, formPage ? formPage.domNode : formNote.domNode);
                    if (formWidget) {
                        this.mergeFinding(hostWidget, formWidget);
                        matched.push(hostWidget);
                    };
                };
            }, this);
            return matched;
        },

        synchFormToHost: function () {
            if (!this.contentId) {
                return;
            };
            var hostEditor = this.hostEditor;
            var formNote = this;
            var hostNote = hostEditor ? hostEditor.note : null;
            if (!formNote || !hostNote) {
                return;
            };
            var namePrefix = core.createClassName(this.contentId);
            var className = 'lst' + namePrefix;
            var contentAdded = false;

            //mark any findings that are contained in a "suppressEntry" group as handled
            var handled = query('.part.suppressEntry .finding').map(registry.byNode).map(function (x) { return x.name });

            //merge any "as is" content and mark its findings as handled
            var fixedContent = query('.mergeAsIs', formNote.domNode).map(registry.byNode);
            array.forEach(fixedContent, function (contentWidget) {
                var contentName = contentWidget.get('name');
                if (contentName) {
                    handled.push(contentName);

                    var targetClass = namePrefix + '_' + contentName;
                    var findings = query('.finding', contentWidget.domNode).map(registry.byNode);
                    var currentWidget = query('.' + targetClass, hostNote.domNode).map(registry.byNode)[0];
                    var targetGroup = null;
                    var targetPlacementId = contentWidget.get('formMergePlacement');
                    if (currentWidget) {
                        targetGroup = currentWidget.getContainingPart();
                    }
                    else if (targetPlacementId) {
                        targetGroup = hostEditor.getGroup({ placementId: targetPlacementId }, true);
                    }
                    else {
                        targetGroup = hostEditor.getGroup(contentWidget, true);
                    };
                    //var targetGroup = currentWidget ? currentWidget.getContainingPart() : hostEditor.getGroup(contentWidget, true);
                    handled = handled.concat(array.map(findings, function (f) { return f.name }));

                    if (currentWidget) {
                        currentWidget.dropDelete();
                    };

                    if (array.some(findings, function (f) { return f.get('result') })) {
                        contentAdded = true;
                        var writer = new XmlWriter();

                        contentWidget.serializeAllSettings = true;
                        contentWidget.writeNoteElement(writer, 'template');
                        contentWidget.serializeAllSettings = false;

                        var contentXML = XmlUtil.createDocument(writer.toString());
                        var root = contentXML.documentElement;
                        var targetWidget = hostNote.parseXml(root);
                        query('.finding', targetWidget.domNode).map(registry.byNode).forEach(function (f) {
                            domClass.add(f.domNode, className);
                            domClass.add(f.domNode, targetClass + '_detail');
                            f.formSource = f.name;
                        });
                        domClass.add(targetWidget.domNode, className);
                        domClass.add(targetWidget.domNode, targetClass);
                        targetGroup.addElement(targetWidget, null, targetWidget.get('position') || 'last', true);
                        hostEditor.ensureVisible(targetWidget.domNode);
                        topic.publish('/qc/ContentLoaded');
                    };
                };
            });

            //process any remaining unhandled findings
            var formWidgets = query('.finding', formNote.domNode)
                .filter(function (y) { return !domClass.contains(y, 'suppressEntry') })
                .map(registry.byNode)
                .filter(function (x) { return x.name && x.get('medcinId') && x.get('result') && array.indexOf(handled, x.name) < 0 ? true : false })
                .sort(function (a, b) { return StringUtil.compare(a.name, b.name) });


            //current widgets in the note that came from this form
            var hostWidgets = query('.' + className, hostNote.domNode)
                .map(registry.byNode)
                .filter(function (x) { return array.indexOf(handled, x.name) < 0 ? true : false }) 
                .sort(function (a, b) { return StringUtil.compare(a.formSource, b.formSource) });

            var f = 0, fLen = formWidgets.length;
            var h = 0, hLen = hostWidgets.length;


            var resultsOnly = this.action == 'addResults' ? true : false;

            var dataSection = null;
            var self = this;

            var addFromForm = function (x) {
                contentAdded = true;
                var sourceWidget = formWidgets[x];
                var dataOnly = domClass.contains(sourceWidget.domNode, 'hiddenEntry') || resultsOnly && !domClass.contains(sourceWidget.domNode, 'formResult');
                if (dataOnly) {
                    return addFormData(sourceWidget);
                }
                else {
                    return addFormFinding(sourceWidget);
                };
            };

            var addFormFinding = function (sourceWidget) {
                var finding = sourceWidget.toFinding();
                finding.type = 'term';
                finding.text = sourceWidget.get('text');
                finding.overrideTranscription = domClass.contains(sourceWidget.domNode, 'forceTranscriptionOverride');
                finding.placementId = sourceWidget.get('formMergePlacement') || '';
                return when(hostEditor.addToNote(finding), function (targetWidget) {
                    domClass.add(targetWidget.domNode, className);
                    if (sourceWidget.get('name')) {
                        targetWidget.formSource = sourceWidget.get('name');
                        if (!targetWidget.get('name')) {
                            targetWidget.set('name', namePrefix + sourceWidget.get('name'))
                        };
                    };
                    self.mergeFinding(sourceWidget, targetWidget);
                    return targetWidget;
                });
            };

            var addFormData = function (sourceWidget) {
                var targetWidget = core.Note.cloneElement(sourceWidget);
                targetWidget.set('name', namePrefix + sourceWidget.get('name'));
                targetWidget.formSource = sourceWidget.get('name');
                domClass.add(targetWidget.domNode, className);
                if (!dataSection) {
                    dataSection = hostNote.getElementByName('FormDataSection');
                    if (!dataSection) {
                        dataSection = core.createNoteElement('Section', { name: 'FormDataSection', layoutColumns: 1, findingPlacement: 1, styleClass: 'hidden', text: 'Form Data' });
                        dataSection.placeAt(hostNote.containerNode, 'last');
                    };
                };
                dataSection.addElement(targetWidget, null, '', false);
                return targetWidget;
            };

            var removeFromHost = function (y) {
                var classes = ' ' + hostWidgets[y].domNode.getAttribute('class').replace(className, '');
                if (!/\blst\w+/.test(classes)) {
                    hostWidgets[y].dropDelete();
                };
            };

            var mergeFromForm = lang.hitch(this, function (x, y) {
                this.mergeFinding(formWidgets[x], hostWidgets[y]);
                hostWidgets[y].updateTranscription();
            });

            var c = 0;
            var promises = [];

            while (f < fLen && h < hLen) {
                c = StringUtil.compare(formWidgets[f].name, hostWidgets[h].formSource);
                if (c < 0) {
                    promises.push(addFromForm(f));
                    f++;
                }
                else if (c == 0) {
                    mergeFromForm(f, h);
                    f++;
                    h++;
                }
                else {
                    removeFromHost(h);
                    h++;
                }
            };
            while (f < fLen) {
                promises.push(addFromForm(f));
                f++;
            };
            while (h < hLen) {
                removeFromHost(h);
                h++;
            };

            if (contentAdded) {
                this.registerListSource();
            };


            query('.qcStateButton', formNote.domNode).map(registry.byNode).filter(function (x) { return array.indexOf(handled, x.name) < 0 && !core.ancestorNodeByClass(x.domNode, 'mergeAsIs', true)}).forEach(function (y) {
                addFormData(y);
            });

            var measureCodeToUpdate = this.contentItem ? this.contentItem.measureCode : null;

            all(promises).then(function() {
                hostEditor.updateDisplay();
                if (measureCodeToUpdate) {
                    topic.publish('/cqm/NoteDataUpdated', measureCodeToUpdate);
                }
            });
        },

        mergeFinding: function (source, target) {
            array.forEach(['result', 'status', 'onset', 'duration', 'episode', 'timing', 'notation', 'specifier', 'value', 'unit'], function (prop) {
                if (source.get(prop)) {
                    target.set(prop, source.get(prop));
                }
            }, this);
            if (source.overrideTranscription && domClass.contains(source.domNode, 'forceTranscriptionOverride')) {
                target.set('overrideTranscription', true);
                target.set('text', source.get('text'));
            }
            return target;
        },

        registerListSource: function() {
            if (!this.contentId) {
                return;
            };
            var hostEditor = this.hostEditor;
            if (!hostEditor) {
                return;
            };
            var className = 'lst' + core.createClassName(this.contentId);
            if (!hostEditor.lists) {
                hostEditor.lists = {};
            };
            if (!hostEditor.lists[this.contentId]) {
                var listInfo = { id: this.contentId, className: className, text: this.title || this.name, type: 'form', icon:'form_blue' };
                hostEditor.lists[this.contentId] = listInfo;
                topic.publish("/noteEditor/listAdded", listInfo);
            };
        },

        ensureNames: function () {
            var containerNode = this.domNode;
            query('.finding', this.domNode).map(registry.byNode).forEach(function (finding) {
                if (!finding.get('name')) {
                    finding.set('name', finding.getUniqueName(finding.medcinId ? 'M' + finding.medcinId : 'Finding', '_', containerNode));
                };
            });
        },

        onFindingResultChanged: function () {
            this.checkState();
        },

        isComplete: function() {
            return !domClass.contains(this.domNode, 'incomplete') && query('.incomplete', this.domNode).filter(function (x) { return !domClass.contains(x, 'hidden') }).length == 0;
        },

        checkState: function (viewMode) {
            if ((viewMode || this.getViewMode()) == 'design') {
                this.cmdOK.set('disabled', false);
            }
            else {
                this.cmdOK.set('disabled', !this.isComplete());
            };
        },

        _checkIfSingleChild: function () {
            //this._singleChild = this.dialogContent;
            this._singleChild = null;
        },

        updateDisplay: function (viewMode) {
            viewMode = viewMode || this.getViewMode();
            this._size();
            if (this.resizer) {
                if (viewMode == 'design') {
                    this.resizer.set('enabled', true);
                }
                else {
                    this.resizer.set('enabled', this.sizeable);
                };
            };

            if (viewMode == 'design') {
                domClass.remove(this.domNode, 'qcContextMenuPrevent');
            }
            else {
                domClass.add(this.domNode, 'qcContextMenuPrevent');
            };

            this.inherited(arguments);
            this.checkState(viewMode);
        },

        resize: function (dim) {
            this._size();
            this._position();
        },

        _size: function () {
            domStyle.set(this.dialogContent, { width: this.width + 'px', height: this.height + 'px' });
            var buttonAreaHeight = domClass.contains(this.domNode, 'hideButtons') ? 0 : 52;
            var titleBarHeight = domClass.contains(this.domNode, 'hideTitle') ? 0 : 28;
            var w = this.width + 'px';
            var h = (titleBarHeight + this.height + buttonAreaHeight) + 'px';
            domStyle.set(this.domNode, { width: w, height: h });
        },

        _position: function () {
            if (this.getViewMode() == 'design') {
                return;
            }
            else {
                this.inherited(arguments);
            };
        },

        onResizerUpdate: function () {
            var buttonAreaHeight = 52;
            var titleBarHeight = 28;
            var pos = domGeometry.position(this.domNode);
            this.width = pos.w - 2;
            this.height = pos.h - (titleBarHeight + buttonAreaHeight);
            this._size();
            if (this.getViewMode() == 'design') {
                topic.publish("/noteEditor/SelectionChanged"); // to update the property grid
            };
        },

        show: function () {
            var self = this;
            when(this.inherited(arguments), function () {
                topic.publish('/qc/FormOpened', self)
            });
        },

        onEditStyles: function () {
            core.doDialog(StyleEditorDialog, {
                title: 'Form Styles',
                stylesheetId: this.get('stylesheetId')
            });
        },

        _getStylesheetIdAttr: function() {
            return this.get('name') + 'Stylesheet';
        },

        createFormStylesheet: function (node) {
            var existingStylesheet = dom.byId(this.get('stylesheetId'));

            if (existingStylesheet) {
                domConstruct.destroy(existingStylesheet);
            }

            var htm = '';
            htm += '<style type="text/css" id="' + this.get('stylesheetId') + '">';
            htm += node.textContent || node.text || node.innerText || node.innerHTML || '';
            htm += '</style>';

            domConstruct.place(htm, document.getElementsByTagName('head')[0]);
        },

        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            this.inherited(arguments);

            array.forEach(xmlNode.childNodes, function (xmlChild) {
                if (xmlChild.nodeType === 1) {
                    switch (xmlChild.tagName.toLowerCase()) {
                        case 'styles':
                            this.createFormStylesheet(xmlChild);
                            break;
                    };
                };
            }, this);
        },

        writeNoteElement: function (writer, mode) {
            this.ensureNames();
            this.inherited(arguments);
        },

        writeNoteChildren: function (writer, mode) {
            var styleText = '';
            var domNode = document.getElementById(this.get('stylesheetId'));

            if (domNode) {
                styleText = (domNode.textContent || domNode.innerHTML || '').trim();

                if (styleText) {
                    writer.element('Styles', null, styleText);
                }
            };

            return this.inherited(arguments);
        }
    });

    core.settings.noteElementClasses["qc/note/Form"] = TypeDef;

    return TypeDef;
});