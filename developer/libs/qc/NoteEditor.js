define([
    "dojo/_base/declare",
    "qc/NoteViewer",
    "qc/_core",
    "dojo/_base/array",
    "dojo/_base/fx",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/keys",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/query",
    "dijit/registry",
    "dojo/request",
    "dojo/string",
    "dojo/topic",
    "dojo/when",
    "dojo/_base/window",
    "qc/XmlUtil",
    "qc/XmlWriter",
    "qc/DateUtil",
    "qc/NoteEditorSelection",
    "qc/note/Document",
    "qc/FindingDetailDialog",
    "qc/note/FreeText",
    "qc/note/FindingLabel",
    "qc/note/Section",
    "qc/note/Group",
    "qc/EntryFormDialog",
    "qc/lang/qscript/Compiler",
    "qc/lang/qscript/Host",
    "qc/Transcriber",
    "qc/drawing/ImageTransformer"
], function (declare, NoteViewer, core, array, baseFx, dom, domClass, domConstruct, domGeometry, domStyle, keys, lang, on, query, registry, request, string, topic, when, window, XmlUtil, XmlWriter, DateUtil, NoteEditorSelection, NoteDocument, FindingDetailDialog, FreeText, FindingLabel, Section, Group, EntryFormDialog, ScriptCompiler, ScriptHost, Transcriber, ImageTransformer) {
    return declare("qc.NoteEditor", [NoteViewer], {
        note: null,
        templateString: '<div class="qcNoteEditor qcddTarget" tabIndex="1"></div>',
        viewMode: '',
        inputMode: 'Mouse',
        groupingRules: null,
        entryIdPrefix: 'Q',
        entryIdNumber: 0,
        selection: null,
        forceSuppressSelection: false,

        constructor: function () {
            this.lists = {};
            this.selection = new NoteEditorSelection(this);
        },

        postCreate: function () {
            core.setSelectable(this.domNode, false);

            this.subscriptions = [
                topic.subscribe('/sourceList/Highlight', lang.hitch(this, this.highlightList)),
                topic.subscribe('/sourceList/ClearHighlight', lang.hitch(this, this.clearListHighlight)),
                topic.subscribe('/sourceList/Focus', lang.hitch(this, this.focusList)),
                topic.subscribe('/qc/AddToNote', lang.hitch(this, this.addToNote)),
                topic.subscribe('/qc/MergePrompt', lang.hitch(this, this.mergePrompt)),
                topic.subscribe('/qc/NursingPrompt', lang.hitch(this, this.nursingPrompt)),
                topic.subscribe('/qc/FollowUpPrompt', lang.hitch(this, this.followUpPrompt)),
                topic.subscribe('/qc/ContentPrompt', lang.hitch(this, this.contentPrompt)),
                topic.subscribe('/qc/RemoveList', lang.hitch(this, this.removeList)),
                topic.subscribe('/qc/DeleteFinding', lang.hitch(this, this.deleteFinding)),
                topic.subscribe('/qc/TagText', lang.hitch(this, this.tagText)),
                topic.subscribe('/qc/SetView', lang.hitch(this, this.setView)),
                topic.subscribe('/qc/EditFindingDetails', lang.hitch(this, this.showFindingDetailEditor)),
                topic.subscribe('/qc/ChartPrompt', lang.hitch(this, this.chartPrompt)),
                topic.subscribe('/qc/WorkspaceReset', lang.hitch(this, this.clear)),
                topic.subscribe('/qc/SaveContent', lang.hitch(this, this.saveContent)),
                topic.subscribe('/qc/UpdateTranscription', lang.hitch(this, this.transcribe)),
                topic.subscribe('/qc/SetInputMode', lang.hitch(this, this.setInputMode)),
                topic.subscribe('/qc/AutoNegate', lang.hitch(this, this.autoNegate)),
                topic.subscribe('/qc/UndoAutoNegate', lang.hitch(this, this.undoAutoNegate)),
                topic.subscribe("/qc/EnterDefaults", lang.hitch(this, this.enterDefaults)),
                topic.subscribe('/qc/ClearFindings', lang.hitch(this, this.clearFindings)),
                topic.subscribe('/qc/ClearNonEntered', lang.hitch(this, this.clearNonEntered)),
                topic.subscribe('/noteEditor/NavigateTo', lang.hitch(this, this.navigateToSection)),
                topic.subscribe('/qc/OnGroupingRulesChanged', lang.hitch(this, this.onGroupingRulesChanged)),
                topic.subscribe('/qc/AddFreeTextToGroup', lang.hitch(this, this.addFreeTextToGroup)),
                topic.subscribe('/qc/DuplicateFinding', lang.hitch(this, this.duplicateFinding)),
                topic.subscribe('/qc/CreateProblemSection', lang.hitch(this, this.createProblemSection)),
                topic.subscribe('/qc/MoveOrCopyProblem', lang.hitch(this, this.moveOrCopyProblem)),
                topic.subscribe('/qc/UndoProblemSection', lang.hitch(this, this.undoProblemSection)),
                topic.subscribe("/qc/NoteChanged", lang.hitch(this, this.updateDisplay)),
                topic.subscribe('/qc/ShowEntryForm', lang.hitch(this, this.showEntryForm)),
                topic.subscribe('/qc/InsertImage', lang.hitch(this, this.addLocalImage))
            ];

            this.inherited(arguments);
        },

        startup: function () {
            if (!this._started) {

                this.scrollingMethod = 'scroll';

                this.events = [
                    on(this.domNode, "click", lang.hitch(this, this._onClick)),
                    on(this.domNode, "keydown", lang.hitch(this, this._onKeyDown))
                ];

                this.note = core.createNoteDocument();
                this.note.startup();
                this.note.placeAt(this.domNode);
                this.inherited(arguments);
            };
        },

        clear: function () {
            this.inherited(arguments);
            this.lists = {};
            if (this.formSources) {
                for (var name in this.formSources) {
                    if (this.formSources[name].instance) {
                        this.formSources[name].instance.destroyRecursive();
                    };
                };
                this.formSources = null;
            };
            this.groupingRules = null;
            this.resetEntryIdNumber();
        },

        updateDisplay: function (viewMode) {
            this.note.updateDisplay(viewMode || this.viewMode);
            topic.publish('/noteEditor/DisplayUpdate', this);
        },

        transcribe: function () {
            this.note.transcribe();
        },

        loadXml: function (xDoc) {
            this.inherited(arguments);
            var xSources = XmlUtil.selectChildElement(xDoc.documentElement, 'Sources');
            if (xSources) {
                array.forEach(XmlUtil.selectChildElements(xSources, 'Source'), function (xSource) {
                    var listId = xSource.getAttribute('id');
                    if (listId) {
                        this.lists[listId] = {
                            id: listId,
                            text: xSource.getAttribute('Text') || listId,
                            type: xSource.getAttribute('Type') || 'list',
                            listType: xSource.getAttribute('ListType') || 'list',
                            className: 'lst' + core.createClassName(listId)
                        };
                        topic.publish("/noteEditor/listAdded", this.lists[listId]);
                    };
                }, this);
            };

            this.lists.lstDocumentTemplate = {
                id: 'lstDocumentTemplate',
                text: 'Document Template',
                type: 'template',
                listType: 'template',
                className: 'lstDocumentTemplate'
            };

            if (this.note) {
                query('.finding', this.note.domNode).addClass('lstDocumentTemplate');
            };

            ////to make sure theme gets reset
            //if (!this.note.get('theme')) {
            //    this.note.set('theme', 'none');
            //};

            topic.publish('/qc/DocumentLoaded', this);
        },

        loadDocumentTemplate: function (templateId) {
            var id = templateId || core.settings.defaultNoteTemplate || "";
            var self = this;
            return request(core.serviceURL("Quippe/NoteBuilder/DocumentTemplate"),{
                query: { "id": id, "Culture": core.settings.culture, "PatientId": (core.Patient ? core.Patient.id : ''), "PrePopulate": true },
                handleAs: "xml",
                preventCache: true
            }).then(function(data) {
                return core.checkXmlResult(data) ? self.loadXml(data) : null;
            },function(err) {
                core.showError(err);
            });
        },


        mergeDrawing: function (imageId, relativeTo, position) {
            var self = this;
            request(core.serviceURL('Quippe/Drawing/Element'), {
                query: { id: imageId, DataFormat: 'XML' },
                handleAs: 'xml'
            }).then(function (data) {
                return core.checkXmlResult(data) ? self.mergeXml(data.documentElement, relativeTo, position) : null;
            }, function (err) {
                core.showError(err);
            });
        },

        mergeElement: function (item, relativeTo, position, suppressSelection) {
            if (!item) {
                return;
            };

            var id = typeof item == 'string' ? item : item.id;
            if (!id) {
                return;
            };

            var current = query("[id='" + id + "']", this.domNode);
            if (current && current.length > 0) {
                return;
            };

            var sourceClass = core.createClassName('lst' + id);
            var sourceName = item.text || '';
            if (sourceName) {
                topic.publish("/noteEditor/LoadingList", id, sourceName);
            }
            var self = this;
            request(  core.serviceURL("Quippe/NoteBuilder/DocumentTemplate"), {
                query: { "id": id, "Culture": core.settings.culture, "PatientId": (core.Patient ? core.Patient.id : '') },
                handleAs: "xml",
                preventCache: true
            }).then(function(data) {
                if (core.checkXmlResult(data)) {
                    var xNodes = data.documentElement.tagName.toLowerCase() == 'content' ? XmlUtil.selectChildElements(data.documentElement) : [data.documentElement];
                    var elements = [];
                    xNodes.forEach(function (xChild) {
                        elements.push(self.mergeXml(xChild, relativeTo, position, true, sourceClass));
                    });
                    self.updateDisplay();
                    topic.publish('/qc/OnGroupingRulesChanged');
                    topic.publish("/noteEditor/AnchorsChanged");
                    topic.publish("/qc/ContentLoaded");

                    if (sourceName) {
                        var listItem = { id: id, text: item.text, type: 'element', className: sourceClass };
                        self.lists[id] = listItem;
                        topic.publish('/noteEditor/listAdded', listItem);
                    };
                    if (!suppressSelection && !this.forceSuppressSelection && elements.length > 0) {
                        self.select(elements[0]);
                        self.ensureVisible(elements[0].domNode);
                    };
                    return elements.length > 1 ? elements : elements[0];
                };
            }, function(err) {
                core.showError(err)
            });
        },

        mergeXml: function (xNode, relativeTo, position, suspendLayout, sourceClass) {
            position = position || (xNode.getAttribute ? xNode.getAttribute("Position") : '') || "last";

            var element = core.Note.parseXml(xNode, sourceClass);
            if (!element) {
                return;
            };

            if (element.name) {
                var matchingItem = this.note.getElementByName(element.name);
                if (matchingItem && matchingItem.isEquivalentElement(element)) {
                    var container = matchingItem.getContainingPart();
                    if (container) {
                        return container.addElement(element, null, '', suspendLayout, sourceClass);
                    };
                }
            };

            return this.addElement(element, relativeTo, position, suspendLayout, sourceClass);
        },

        addElement: function(element, relativeTo, position, suspendLayout, sourceClass) {
            if (!element) {
                return;
            };

            element.startup();

            position = position || "last";

            var target = null;
            relativeTo = this.getRelativeToDomNode(relativeTo);
            if (relativeTo) {
                target = core.ancestorWidgetByClass(relativeTo, 'part', true);
            };

            if (!target) {
                target = this.getGroup(element, true);
            };

            if (target && !relativeTo) {
                relativeTo = (position == 'before' || position == 'after') ? target.domNode : target.containerNode;
            };

            //check and merge duplicate free text elements
            if (domClass.contains(element.domNode, 'freeText')) {
                var existingWidget = query('.freeText', target.domNode).map(registry.byNode).filter(function (widget) {
                    if (widget.medcinId == element.medcinId && widget.prefix == element.prefix) {
                        return widget;
                    };
                })[0];
                if (existingWidget) {
                    if (existingWidget.mergeOtherFreeText(element)) {
                        target = null;
                    };
                };
            };

            if (target) {
                target.addElement(element, relativeTo, position, suspendLayout, sourceClass);
            };

            if (!suspendLayout) {
                this.note.transcribe();
                this.note.updateDisplay()
                this.ensureVisible(element.domNode);
            };

            return element;
        },

        mergeXmlFindings: function (xNode, sourceClass) {
            var findingIndex = this.getFindingIndex();
            var subGroupId = ''
            var groupId = '';
            var sectionId = '';
            var target = null;

            array.forEach(xNode.childNodes, function (xChild) {
                if (xChild.nodeType == 1) {
                    var element = core.Note.parseXml(xChild, sourceClass);
                    if (element) {
                        var existingFinding = findingIndex[element.get('medcinId')] ? findingIndex[element.get('medcinId')][element.get('prefix') || 'X'] : null;
                        if (existingFinding) {
                            existingFinding.mergeFinding(element);
                        }
                        else {
                            subGroupId = xChild.getAttribute("SubGroupId") || null;
                            groupId = xChild.getAttribute("GroupId") || null;
                            sectionId = xChild.getAttribute("SectionId") || null;
                            target = this.getGroup({ 'groupId': groupId, 'sectionId': sectionId, 'subGroupId': subGroupId });
                            target.addElement(element);
                        }
                    };
                };
            }, this);

            this.transcribe();
            this.updateDisplay();
        },

        onGroupingRulesChanged: function () {
            this.groupingRules = null;
        },

        getFindingIndex: function (part) {
            var findingIndex = [];
            part = part || this.note;
            query('.finding', part.domNode).map(registry.byNode).forEach(function (f) {
                if (f) {
                    var m = parseInt(f.get('medcinId'), 10);
                    var p = f.get('prefix') || 'X';
                    if (findingIndex[m]) {
                        findingIndex[m][p] = f;
                    }
                    else {
                        findingIndex[m] = {};
                        findingIndex[m][p] = f;
                    }
                };
            });
            return findingIndex;
        },

        getFindings: function () {
            return query('.finding', this.domNode).map(registry.byNode).map(function (widget) { return widget.toFinding() });
        },

        getGroup: function (item, suppressCatchAll) {
            var self = this;

            var r = this.groupingRules;
            if (!r) {
                this.groupingRules = {
                    rules: [],
                    keys: {}
                };
                r = this.groupingRules;
                query('.part', this.note.domNode).map(registry.byNode).forEach(function (part) {
                    if (part.groupingRule) {
                        var result = self.compileGroupingRule(part.groupingRule);
                        if (result.success) {
                            r.rules.push({
                                'test': result.targetFunction,
                                'part': part,
                                'lang': result.lang || ''
                            });
                        };
                    };

                    array.forEach(part.getGroupKeyList(), function (key) {
                        r.keys[key] = part;
                    });
                });
            };


            var getByName = lang.hitch(this.note, this.note.getElementByName);
            
            var context = {
                'Owner': item,
                'Item': item,
                getObject: function (name, property) {
                    var target = typeof name == 'object' ? name : this[name] || getByName(name);
                    return target ? property ? target.get ? target.get(property) : target[property] : target : null;
                }
            };

            for (var n = 0; n < r.rules.length; n++) {
                context.Self = context.Group = r.rules[n].part;
                if (r.rules[n].lang == 'js') {
                    if (r.rules[n].test(item, array, lang, this.note)) {
                        return context.Group;
                    };
                }
                else {
                    if (r.rules[n].test.call(ScriptHost, context)) {
                        return context.Group;
                    };
                };
            };

            return r.keys[item.placementId] || r.keys[item.subGroupId] || r.keys[item.groupId] || r.keys[item.sectionId] || (!suppressCatchAll && r.keys['*']) || this.note;
        },

        compileGroupingRule: function (rule, suppressErrors) {
            if (!rule) {
                return null;
            };


            var result = {};

            if (/^%%/.test(rule)) {
                result = this.createJSGroupingRuleFn(rule.substr(2));
            }
            else {
                result = ScriptCompiler.compile(rule);
                if (!result.success) {
                    var r2 = this.createJSGroupingRuleFn(rule);
                    if (r2.success) {
                        result = r2;
                    };
                };
            };

            if (!result.success && !suppressErrors) {
                core.showError(result.error);
            };

            return result;
        },

        createJSGroupingRuleFn: function (rule) {
            if (!rule) {
                return null;
            };
            var s = '';
            s += 'var medcinId = parseInt(item.medcinId,10) || 0;';
            s += 'var nodeKey = item.nodeKey || "";';
            s += 'var termType = parseInt(item.termType,10) || 0;';
            s += 'var groupId = item.groupId || "G0";';
            s += 'var sectionId = item.sectionId || "S0";';
            s += 'var subGroupId = item.subGroupId || "";';
            s += 'var prefix = item.prefix || "";';
            s += 'var nodeKeyMatch = function (pattern) {return nodeKey.match("^(" + pattern + ")")};';
            s += 'var medcinIdList = function (list) { return array.indexOf(lang.isArray(list) ? list : Array.prototype.slice.call(arguments, 0), medcinId) >= 0 };';
            s += 'var descendentOf = function (name) {';
            s += '  var element = note ? note.getElementByName(name) : null;';
            s += '  var nodeKey = element ? element.nodeKey : "";';
            s += '  return nodeKey ? nodeKeyMatch(nodeKey) : false;';
            s += '};';
            s += 'var descendantOf = descendentOf;';
            s += 'return (' + rule + ');';
            var result = {};
            try {
                result.targetFunction = new Function('item', 'array', 'lang', 'note', s);
                if (result.targetFunction) {
                    result.targetFunction.call({}, array, lang, this.note); //test the expression
                };
                result.success = true;
                result.lang = 'js';
            }
            catch (ex) {
                result.success = false;
                result.error = ex;
            };
            return result;
        },

        addList: function (listOrDeferred) {
            this.clearListFocus(true);
            this.clearListHighlight();

            if (this.viewMode == 'concise') {
                this.setView('expanded');
            };

            var self = this;

            return when(listOrDeferred, function (list) {
                if (!(list && list.item)) {
                    topic.publish('/qc/EmptyList');
                    return;
                }

                if (!list.item.length) {
                    list.item = core.forceArray(list.item);
                };

                if (!list.className) {
                    list.className = 'lst' + core.createClassName(list.id);
                }

                var finding = null;
                var target = null;
                var prefix = '';
                //****var defaultGroup = note.getGroup("*") || note;

                //Build Finding Index
                var findingIndex = self.getFindingIndex();

                //Add findings
                array.forEach(list.item, function (item) {
                    target = self.getGroup(item);
                    //prefix = target.get('forcePrefix') || item.prefix;
                    prefix = (target.resolvePrefix ? target.resolvePrefix(item) || item.prefix : item.prefix) || 'X'
                    //if (!prefix) {
                    //    var testPrefix = target.get('applyPrefix');
                    //    if (core.MedcinInfo.isValidPrefix(testPrefix, item.termType)) {
                    //        prefix = testPrefix;
                    //    }
                    //    if (!prefix) {
                    //        prefix = 'X';
                    //    };
                    //};
                    finding = findingIndex[item.medcinId] ? findingIndex[item.medcinId][prefix] : null;
                    if (finding) {
                        finding.setDetails(item);
                    }
                    else {
                        var ItemClass = (item.isFreeText ? FreeText : (target.get('itemEntryClass') ? require(target.get('itemEntryClass')) : core.settings.noteElementClasses["qc/note/FindingLabel"]));
                        finding = new ItemClass(item);
                        target.addElement(finding, null, null, true);
                    };
                    domClass.add(finding.domNode, list.className);

                });
                core.app.clearPreventCache(list.id);

                self.lists[list.id] = list;

                self.transcribe();
                self.updateDisplay();

                topic.publish('/noteEditor/listAdded', list);
            });
        },

        removeList: function(listId) {
            var list = this.lists[listId];
            if (!list || !list.className) {
                return;
            };
            this.clearListHighlight();
            this.clearSelection();
            var lstExp = /lst|subsumed/;
            query('.' + list.className, this.note.domNode)
                .removeClass(list.className)
                .filter(function (x) { return !lstExp.test(x.className) })
                .map(registry.byNode)
                .forEach(function (y) {
                    if (y && y.domNode) {
                        if (!(domClass.contains(y.domNode, 'entry') || query('.entry', y.domNode).length > 0)) {
                            y.deleteSelf(true);
                        };
                    };
                });

            delete this.lists[list.id];
            this.updateDisplay();
            topic.publish('/noteEditor/listRemoved', list);
        },

        deleteFinding: function (finding) {
            if (!finding) {
                return;
            };

            if (typeof finding.dropDelete == "function") {
                return finding.dropDelete();
            };

            if (finding.node) {
                return this.deleteFinding(registry.byNode(finding.node));
            };
        },

        fetchList: function (id) {
            topic.publish("/noteEditor/LoadingList");
            return this.lists[id] || request( core.serviceURL("Quippe/NoteBuilder/ListTemplate"), {
                 query: { "id": id, "Culture": core.settings.culture, "DataFormat": "JSON", "PatientId": (core.Patient ? core.Patient.id : '') },
                 handleAs: "json", 
                 preventCache: true
            }).then(function(data) {
                return data.list; 
            }, function(err) {
                core.showError(err)
            });
        },

        quickPrompt: function (item, listSize, role) {
            var size = listSize > 0 ? listSize : core.settings.listSize || 2;
            var providerRole = role || 0;
            var medcinId = item.medcinId || item.id || 0;
            if (medcinId === 0) {
                return;
            }

            var listId = "IPrompt_" + medcinId + "_" + size + "_" + providerRole;
            topic.publish("/noteEditor/LoadingList");
            return this.lists[listId] || request( core.serviceURL("Quippe/NoteBuilder/QuickPrompt"), {
                query: {
                    "MedcinId": medcinId,
                    "ListSize": size,
                    "Culture": core.settings.culture,
                    "DataFormat": "JSON",
                    "Prefix": item.prefix || "",
                    "Result": item.result || "A",
                    "Onset": item.onset || "",
                    "Duration": item.duration || "",
                    "Scale": item.scale || 0,
                    "PatientId": core.Patient ? core.Patient.id : "",
                    "EncounterTime": DateUtil.formatISODate(core.Encounter && core.Encounter.encounterTime ? core.Encounter.encounterTime : new Date()),
                    "Role": providerRole
                },
                handleAs: "json",
                preventCache: true
            }).then(function(data) {
                return data.list;
            }, function(err) {
                core.showError(err)
            });
        },

        resolveAddFinding: function (termData, relativeTo, position, suppressSelection) {
            var medcinId = 0;
            var prefix = '';

            if (typeof termData == 'number') {
                medcinId = termData;
                termData = null;
            }
            else if (typeof termData == 'string') {
                medcinId = parseInt(termData, 10);
                termData = null;
            }
            else if (termData.medcinId) {
                medcinId = termData.medcinId;
                prefix = termData.prefix || '';
            }
            else if (termData.id) {
                medcinId = parseInt(termData.id, 10);
                prefix = termData.prefix || '';
            }

            if (!medcinId) {
                return null;
            };

            var finding = this.note.getFinding({ medcinId: medcinId, prefix: prefix });
            if (finding) {
                if (finding.elementName == 'FreeText' && finding.appendText) {
                    finding.appendText(termData.notation || termData.note || '');
                };
                if (!finding.get('result') && !(this.viewMode == 'design')) {
                    finding.set('result', 'A');
                };

                finding.mergeTermData(termData);

                if (!suppressSelection && !this.forceSuppressSelection) {
                    this.select(finding, true);
                    this.ensureVisible(finding.domNode);
                };
                return finding;
            };

            var self = this;
            return request(core.serviceURL("Quippe/NoteBuilder/Resolve"), {
                handleAs: "json",
                query: { "MedcinId": medcinId, "Prefix": prefix, "Culture": core.settings.culture, DataFormat: "JSON", "PatientId": (core.Patient ? core.Patient.id : '') },
                preventCache: true
            }).then(function(data) {
                var item = data.term;
                finding = item.isFreeText ? new FreeText(item) : core.createFindingEntry(item);
                finding.setDetails(termData);
                if (termData && termData.styleClass) {
                    domClass.add(finding.domNode, termData.styleClass);
                };
                finding.startup();
                return self.addFinding(finding, relativeTo, position, suppressSelection);
            }, function(err) {
                core.showError(err)
            });
        },

        addFinding: function (finding, relativeTo, position, suppressSelection) {
            if (!finding) {
                return null;
            };

            var target = null;
            relativeTo = this.getRelativeToDomNode(relativeTo);
            if (relativeTo) {
                target = core.ancestorWidgetByClass(relativeTo, 'part', true);
            };

            if (!target) {
                target = this.getGroup(finding);
            };

            var findingIndex = this.getFindingIndex(target);
            var medcinId = finding.get('medcinId');
            //var prefix = target.get('forcePrefix') || finding.get('prefix') || target.get('applyPrefix') || 'X';
            var prefix = (target.resolvePrefix ? target.resolvePrefix(finding) || finding.prefix : finding.prefix) || 'X';

            if (findingIndex[medcinId] && findingIndex[medcinId][prefix]) {
                var existingFinding = findingIndex[medcinId][prefix];
                var eName = existingFinding.get('name') || '';
                var fName = finding.get('name') || '';
                if (eName === fName) {
                    if (existingFinding.elementName == 'FreeText') {
                        existingFinding.appendText(finding.get('text') || '');
                    }
                    else {
                        existingFinding.mergeFinding(finding);
                    };
                    if (!eName && fName) {
                        existingFinding.set('name', fName);
                    };
                    if (!suppressSelection && !this.forceSuppressSelection) {
                        this.select(existingFinding);
                        this.ensureVisible(existingFinding.domNode);
                    };
                    return existingFinding;
                };
            };

            var itemEntryClass = target.get('itemEntryClass') || null;
            if (itemEntryClass && itemEntryClass.replace("/", ".") != finding.declaredClass) {
                var ItemClass = require(itemEntryClass.replace(/\./g, "/"));
                var newFinding = new ItemClass();
                newFinding.mergeFinding(finding);
                finding = newFinding;
            };

            target.addElement(finding, relativeTo, position);
            finding.updateTranscription();
            this.updateDisplay();
            if (!suppressSelection && !this.forceSuppressSelection) {
                this.select(finding);
                this.ensureVisible(finding.domNode);
            };
            topic.publish('/noteEditor/findingAdded', finding);
            return finding;
        },

        addToNote: function (item, relativeTo, position, suppressSelection) {
            if (item.promise) {
                return when(item, lang.hitch(this, function (resolvedItem) {
                    this.addToNote(resolvedItem, relativeTo, position, suppressSelection);
                }));
            };

            switch (item.type) {
                case "term":
                    return this.resolveAddFinding(item, relativeTo, position, suppressSelection);

                case "finding":
                    return this.addFinding(item, relativeTo, position, suppressSelection);

                case "list":
                    if (item.isResolved || item.item || item.listType == "TaggedText") {
                        return this.addList(item);
                    }
                    else if (item.listType == "Prompt" && item.medcinId) {
                        return this.addList(this.quickPrompt(item));
                    }
                    else if (item.id) {
                        return this.addList(this.fetchList(item.id));
                    }
                    else {
                        return null;
                    };

                case "image":
                    return this.mergeDrawing(item.id, relativeTo, position);

                case "element":
                    return this.mergeElement(item, relativeTo, position);

                case "macro":
                    return this.mergeElement(item, relativeTo, position);

                case "form":
                    if (this.viewMode == 'design') {
                        return;
                    };
                    return this.showEntryForm(item);

                default:
                    return null;
            }
        },

        duplicateFinding: function (oldFinding, suppressSelection) {
            if (!oldFinding || typeof oldFinding.duplicate != "function") {
                return null;
            };

            var newFinding = oldFinding.duplicate();

            domConstruct.place(newFinding.domNode, oldFinding.domNode, 'after');
            newFinding.startup();

            if (!suppressSelection && !this.forceSuppressSelection) {
                this.select(newFinding);
                newFinding.updateTranscription();
            };

            newFinding.updateDisplay();
            return newFinding;
        },

        mergePrompt: function (item, role) {
            role = role || -1;
            if (role < 0) {
                role = this.note.get('providerRole') || core.settings.role || 1;
            };

            if (item.type == 'term' && core.settings.addOnPrompt) {
                topic.publish('/qc/AddToNote', item);
            };


            switch (item.type) {
                case "term":
                case "finding":
                    if (core.settings.useContentPrompt) {
                        return this.contentPrompt(null, item);
                    }
                    else {
                        if (role == 2 || item.rn) {
                            return this.nursingPrompt(item, -1, role);
                        }
                        else {
                            return this.addList(this.quickPrompt(item, -1, role));
                        };
                    }
                    break;

                case "list":
                case "element":
                case "image":
                case "form":
                case "macro":
                    return this.addToNote(item);

                case 'findingGroup':
                    return this.chartPrompt('IP', 0, 0, item.getFindings(), item.text, 'PROMPT_' + item.id);

                case 'selection':
                    return this.chartPrompt('IP', 0, 0, item.getFindings());

                default:
                    return;
            }
        },

        nursingPrompt: function (item, listSize, role) {
            var size = (listSize > 0) ? listSize : 2;
            var medcinId = item.medcinId || item.id || 0;
            if (medcinId === 0) {
                return;
            }

            var listId = "RN_" + medcinId + "_" + size;
            topic.publish("/noteEditor/LoadingList");
            var list = this.lists[listId] || request(core.serviceURL("Quippe/Nursing/Prompt"), {
                query: {
                    "MedcinId": medcinId,
                    "ListSize": size,
                    "Culture": core.settings.culture,
                    "DataFormat": "JSON",
                    "Prefix": item.prefix || "",
                    "Result": item.result || "A",
                    "Onset": item.onset || "",
                    "Duration": item.duration || "",
                    "Scale": item.scale || 0,
                    "PatientId": core.Patient ? core.Patient.id : ""
                },
                handleAs: "json"
            }).then(function(data) {
                return data.list;
            }, function(err) {
                core.showError(err)
            });

	        this.addList(list);
        },

        followUpPrompt: function (item, listSize) {
            var size = listSize > 0 ? listSize : core.settings.listSize || 2;
            var medcinId = item.medcinId || item.id || 0;
            if (medcinId === 0) {
                return;
            }

            var listId = "FPrompt_" + medcinId + "_" + size;
            topic.publish("/noteEditor/LoadingList");
            var list = this.lists[listId] || request(core.serviceURL("Quippe/NoteBuilder/FollowUpPrompt"), {
                query: {
                    "MedcinId": medcinId,
                    "ListSize": size,
                    "Culture": core.settings.culture,
                    "DataFormat": "JSON",
                    "Prefix": item.prefix || "",
                    "Result": item.result || "A",
                    "Onset": item.onset || "",
                    "Duration": item.duration || "",
                    "Scale": item.scale || 0,
                    "PatientId": core.Patient ? core.Patient.id : "",
                    "EncounterTime": DateUtil.formatISODate(core.Encounter && core.Encounter.encounterTime ? core.Encounter.encounterTime : new Date())
                },
                handleAs: "json",
                preventCache: true
                }).then(function(data) {
                    return data.list;
                }, function(err) {
                    core.showError(err)
                });

            this.addList(list);
        },

        //contentPrompt: function (promptType, item, listSize, listId, fallback) {
        //    var self = this;
        //    var size = listSize > 0 ? listSize : core.settings.listSize || 2;
        //    var medcinId = item.medcinId || item.id || 0;
        //    if (medcinId === 0) {
        //        return;
        //    };
        //    promptType = promptType || 'DX';

        //    listId = listId || promptType + medcinId + (item.prefix || '')
        //    var sourceClass = core.createClassName('lst' + listId);
        //    topic.publish("/noteEditor/LoadingList");

        //    return request.get(core.serviceURL("Quippe/NoteBuilder/ContentPrompt"), {
        //        query: {
        //            "PromptType": promptType,
        //            "ListId": listId,
        //            "Fallback": fallback || 'true',
        //            "MedcinId": medcinId,
        //            "ListSize": size,
        //            "Culture": core.settings.culture,
        //            "DataFormat": "XML",
        //            "Prefix": item.prefix || "",
        //            "Result": item.result || "A",
        //            "Onset": item.onset || "",
        //            "Duration": item.duration || "",
        //            "Scale": item.scale || 0,
        //            "PatientId": core.Patient ? core.Patient.id : "",
        //            "EncounterTime": DateUtil.formatISODate(core.Encounter && core.Encounter.encounterTime ? core.Encounter.encounterTime : new Date())
        //        },
        //        handleAs: "xml",
        //        preventCache: true
        //    }).then(function (data) {
        //        if (core.checkXmlResult(data)) {
        //            var root = data.documentElement;
        //            var rootTag = root.tagName.toLowerCase();
        //            if (rootTag == 'list') {
        //                var list = XmlUtil.elementToObject(root);
        //                self.addList(list);
        //            }
        //            else {
        //                var xNodes = rootTag == 'content' ? XmlUtil.selectChildElements(root) : [root];
        //                var elements = [];
        //                xNodes.forEach(function (xChild) {
        //                    elements.push(self.mergeXml(xChild, null, null, true, sourceClass));
        //                });
        //                self.updateDisplay();
        //                topic.publish('/qc/OnGroupingRulesChanged');
        //                topic.publish("/noteEditor/AnchorsChanged");
        //                topic.publish("/qc/ContentLoaded");

        //                var listItem = { id: listId, text: item.text, type: 'element', className: sourceClass };
        //                self.lists[listId] = listItem;
        //                topic.publish('/noteEditor/listAdded', listItem);
        //            }
                    
        //        };
        //    }, function (err) {
        //        core.showError(err)
        //    });
        //},

        contentPrompt: function (promptType, item, listSize, listId, fallback) {
            var size = listSize > 0 ? listSize : core.settings.listSize || 2;
            var medcinId = item.medcinId || item.id || 0;
            if (medcinId === 0) {
                return;
            }

            promptType = promptType || 'DX';

            listId = listId || promptType + medcinId + (item.prefix || '')
            topic.publish("/noteEditor/LoadingList");
            var list = this.lists[listId] || request(core.serviceURL("Quippe/ContentLibrary/ContentPrompt"), {
                query: {
                    "PromptType": promptType,
                    "ListId": listId,
                    "Fallback": fallback || 'true',
                    "MedcinId": medcinId,
                    "ListSize": size,
                    "Culture": core.settings.culture,
                    "DataFormat": "JSON",
                    "Prefix": item.prefix || "",
                    "Result": item.result || "A",
                    "Onset": item.onset || "",
                    "Duration": item.duration || "",
                    "Scale": item.scale || 0,
                    "PatientId": core.Patient ? core.Patient.id : "",
                    "EncounterTime": DateUtil.formatISODate(core.Encounter && core.Encounter.encounterTime ? core.Encounter.encounterTime : new Date())
                },
                handleAs: "json", 
                preventCache: true
            }).then(function(data) {
                return data.list;
            }, function(err) {
                core.showError(err)
            });

            this.addList(list);
        },


        addFreeTextToGroup: function (groupItem) {
            if (!groupItem || !groupItem.node) {
                return;
            };

            var group = registry.byNode(groupItem.node);
            if (!group || !group.containerNode) {
                return;
            };

            var textId = group.get('freeTextMedcinId');
            if (!textId) {
                return;
            };

            var exists = false;
            query('.freeText', group.domNode).map(registry.byNode).forEach(function (f) {
                if (f.get('medcinId') == textId) {
                    exists = true;
                }
            });

            if (exists) {
                return;
            };

            var element = new FreeText({ medcinId: textId });
            element.placeAt(group.containerNode, 'first');
            element.startup();
            group.updateDisplay();
            element.startEdit();

        },

        highlightList: function (listId) {
            var list = this.lists[listId];
            if (list && list.className) {
                this.clearListHighlight();
                //query('.finding.' + list.className, this.note.domNode).addClass("highlight");
                query('.' + list.className, this.note.domNode).addClass('highlight');
                topic.publish('/noteEditor/ListHighlightChanged', listId);
            }
        },

        clearListHighlight: function () {
            if (this.note) {
                query(".highlight", this.note.domNode).removeClass('highlight');
                topic.publish('/noteEditor/ListHighlightChanged');
            };
        },

        focusList: function (listId) {
            this.clearListFocus(listId ? true : false);
            var list = this.lists[listId];
            if (list) {
                domClass.add(this.domNode, 'hasListFocus');
                query('.noteElement', this.note.domNode).forEach(function (node) {
                    domClass.add(node, domClass.contains(node, list.className) ? 'listShow' : 'listHide');
                });
                this.updateDisplay('listfocus');
                this.transcribe();
                this.navigateToTop();
                topic.publish('/noteEditor/ListFocusChanged', listId);
            };
        },

        focusOn: function(predicate, focusId) {
            this.clearListFocus(true);
            if (!predicate) {
                return;
            };
            domClass.add(this.domNode, 'hasListFocus');
            query('.finding', this.note.domNode).map(registry.byNode).forEach(function (finding) {
                domClass.add(finding.domNode, predicate(finding) ? 'listShow' : 'listHide');
            });
            this.updateDisplay('listfocus');
            this.transcribe();
            this.navigateToTop();
            topic.publish('/noteEditor/ListFocusChanged', focusId);
        },

        clearListFocus: function (suppressUpdate) {
            domClass.remove(this.domNode, 'hasListFocus');
            this.clearListHighlight();
            query(".listHide,.listShow", this.note.domNode).removeClass(['listHide', 'listShow']);
            if (!suppressUpdate) {
                this.updateDisplay();
                this.transcribe();
            };
            topic.publish('/noteEditor/ListFocusChanged');
        },

        clearSelection: function (dontNotify) {
            query(".selected", this.domNode).removeClass("selected");
            if (!dontNotify) {
                topic.publish("/noteEditor/SelectionChanged");
            };
        },

        select: function (widget, focus) {
            if (!widget || !widget.domNode) {
                return;
            };

            var selectableWidget = domClass.contains(widget.domNode, 'selectable') ? widget : core.ancestorWidgetByClass('selectable');
            if (selectableWidget) {
                selectableWidget.setSelected(true, true);
            };

            if (focus) {
                this.focusElement(widget);
            };
        },

        focusElement: function (element) {
            if (element && element.domNode) {
                try {
                    element.domNode.focus();
                }
                catch (ex) {
                };
            };
        },

        getSelection: function () {
            return query(".selected", this.domNode).map(registry.byNode)[0];
        },

        getSelectedFinding: function () {
            var w = this.getSelection();
            if (w && domClass.contains(w.domNode, 'finding') && typeof w.getItem == "function") {
                return w.getItem();
            }
            else {
                return null;
            }
        },

        setView: function (viewMode, force) {
            if (!this.note) {
                return;
            };

            var oldMode = this.viewMode;

            if (viewMode == 'design') {
                this.previousScrollPosition = this.domNode.parentNode.scrollTop;

                var contentResolved = false;
                query('.deferredContent', this.domNode).forEach(function (widget) {
                    if (widget._resolveDeferredContent) {
                        widget._resolveDeferredContent(true);
                        contentResolved = true;
                    }

                    else if (!widget.domNode) {
                        var containerWidget = registry.byNode(widget);

                        if (containerWidget && containerWidget._resolveDeferredContent) {
                            containerWidget._resolveDeferredContent(true);
                            contentResolved = true;
                        }
                    }
                });
                if (contentResolved) {
                    topic.publish('/qc/ContentLoaded');
                };

            };

	        if (this.note.domNode) {
		        domClass.remove(this.note.domNode, oldMode);
		        domClass.add(this.note.domNode, viewMode);
		        this.updateDisplay(viewMode);
	        }

	        this.viewMode = viewMode;

	        if (this.note.domNode) {
	            this.note.transcribe();
	        };

	        if (force || viewMode != oldMode) {
                switch (viewMode) {
                    case 'design':
                        var current = this.getSelection();

                        if (current) {
                            this.ensureVisible(current.domNode);
                        }
                        else {
                            this.navigateToTop();
                        }
                        break;

                    case 'outline':
                        query('.part', this.note.domNode).addClass('collapsed');
                        this.clearSelection();
                        this.navigateToTop();
                        break;

                    default:
                        this.clearSelection();

                        if (oldMode == 'design' && this.previousScrollPosition) {
                            this.domNode.parentNode.scrollTop = this.previousScrollPosition;
                        }

                        else {
                            this.navigateToTop();
                        }

                        break;
                };
                topic.publish('/qc/ViewChanged', viewMode);
            };
        },


        showFindingDetailEditor: function (findingItem) {
            if (!(findingItem && findingItem.node)) {
                return;
            }

            var finding = registry.byNode(findingItem.node);
            if (!finding) {
                return;
            };

            if (!this.findingDetailDialog) {
                this.findingDetailDialog = new FindingDetailDialog();
                this.findingDetailDialog.startup();
            };

            this.findingDetailDialog.setFinding(finding);
            this.findingDetailDialog.show();
        },

        autoNegate: function (partItem) {
            if (!(partItem && partItem.node)) {
                return;
            };

            var part = registry.byNode(partItem.node);
            if (part && typeof part.autoNegate == "function") {
                part.autoNegate();
            };
        },

        undoAutoNegate: function (partItem) {
            if (!(partItem && partItem.node)) {
                return;
            };

            var part = registry.byNode(partItem.node);
            if (part && typeof part.undoAutoNegate == "function") {
                part.undoAutoNegate();
            };
        },

        enterDefaults: function (partItem) {
            var part = (partItem && partItem.node) ? registry.byNode(partItem.node) : this.note;
            if (part && typeof part.enterDefaults == "function") {
                part.enterDefaults();
            }
        },

        clearFindings: function (partItem) {
            if (!(partItem && partItem.node)) {
                return;
            };

            var part = registry.byNode(partItem.node);
            if (part && typeof part.clearFindings == "function") {
                part.clearFindings();
            };
        },

        clearNonEntered: function (partItem) {
            if (!(partItem && partItem.node)) {
                return;
            };

            var part = registry.byNode(partItem.node);
            if (part && typeof part.clearNonEntries) {
                part.clearNonEntries();
            };
        },


        getPrintable: function (previewWidget) {
            var restoreView = '';
            var restoreGestureMode = false;

            topic.publish('/qc/drawing/endEdit')

            if (this.note && domClass.contains(this.note.domNode, 'printExpanded')) {
                if (this.viewMode != 'expanded') {
                    restoreView = this.viewMode;
                    this.setView('expanded');
                };
            }
            else if (this.viewMode != 'concise' && this.note.hasEntries()) {
                restoreView = this.viewMode;
                this.setView('concise');
            };

	        query(".patientBanner .noteLabel").forEach(function(e) {
		        registry.getEnclosingWidget(e).updateDisplay();
	        });

            if (this.gestureManager) {
                this.gestureManager.mode = 'suspended';
                restoreGestureMode = true;
            };

            // To deal with the fact that cloneNode won't actually copy the current value
            // of a textarea element.  Since that is stored in the value *property* not 
            // in a node - thanks W3C.
            query('textarea', this.domNode).forEach(function (textArea) {
                textArea.innerHTML = textArea.value;
            });
            query('input', this.domNode).forEach(function (input) {
                if (input.getAttribute('type') == 'text') {
                    input.setAttribute('value', input.value);
                };
            });

            var clone = this.domNode.cloneNode(true);
            query("*", clone).removeClass(["selected", "highlight"]);
            domStyle.set(clone, { left: '0px', top: '0px' });

            if (restoreView) {
                this.setView(restoreView);
            };
            if (restoreGestureMode) {
                this.gestureManager.cancelAction();
            };

            return clone;

        },

        getPrintSettings: function() {
            return this.note ? this.note.get('printSettings') : {};
        },

        _onClick: function (evt) {
            if (this.clickHandler) {
                return this.clickHandler(evt);
            };

            var widget = registry.getEnclosingWidget(evt.target);

            if (!(widget && widget.domNode)) {
                this.clearSelection();
                return;
            };

            if (domClass.contains(evt.target, 'expander')) {
                if (typeof widget.toggleExpansion == "function") {
                    widget.toggleExpansion();
                };
                return;
            };

            var selectableWidget = domClass.contains(widget.domNode, 'selectable') ? widget : core.ancestorWidgetByClass(widget.domNode, 'selectable', false);
            if (selectableWidget) {
                if (!core.util.isMultiSelectEvent(evt) || !core.settings.enableMultiSelect) {
                	this.clearSelection();
                };
                selectableWidget.toggleSelection(evt);
            }
            //TEMP: for old version finding table
            else if (widget.declaredClass == 'core.Note._TextBoxCellWidget' && widget.finding) {
                widget.finding.setSelected(true, true);
            }
            else {
                this.clearSelection();
            };

            if (!widget.get('disabled') && !core.util.isMultiSelectEvent(evt) && this.viewMode != 'design' && domClass.contains(widget.domNode, 'finding')) {
                widget.toggleResultFromEvent(evt);
                topic.publish("/qc/FindingClick", widget);
            };
        },

        _onKeyDown: function (evt) {
            if (evt.keyCode == keys.F2) {
                if (this.selection && this.selection.getItemCount() == 1) {
                    var widget = this.selection.getSelectedWidgets()[0];
                    if (widget && widget._editableText_CanEdit && widget._editableText_CanEdit()) {
                        evt.stopPropagation();
                        widget._editableText_StartEdit();
                    };
                };
            };
        },

        blurActiveInput: function () {
            var e = document.activeElement;
            if (e) {
                switch (e.tagName.toLowerCase()) {
                    case 'input':
                    case 'textarea':
                        e.blur();
                        break;
                    default:
                        break;
                };
            }
        },


        chartPrompt: function (promptMethod, listSize, setListSize, dataSource, promptName, promptId) {
            var size = listSize || core.settings.listSize || 2;
            if (setListSize && size != core.settings.listSize) {
                topic.publish('/qc/SetListSize', size);
            };

            switch (promptMethod) {
                case 'DX':
                    var dxFinding = this.getSelectedFinding();
                    if (dxFinding) {
                        this.mergePrompt(dxFinding);
                    };
                    break;
                case 'RN':
                    var rnFinding = this.getSelectedFinding();
                    if (rnFinding) {
                        this.nursingPrompt(rnFinding, size, 'nurse');
                    };
                    break;
                case 'FU':
                    var fuFinding = this.getSelectedFinding();
                    if (fuFinding) {
                        this.followUpPrompt(fuFinding, size);
                    };
                    break;
                default:
                    var chart = this.getChartXml(dataSource);
                    if (chart) {
                        var self = this;
                        var listId = "ChartPrompt";
                        topic.publish("/noteEditor/LoadingList");
                        request.post(core.serviceURL("Quippe/NoteBuilder/ChartPrompt?DataFormat=JSON" + (core.settings.culture ? "&Culture=" + core.settings.culture : '') + (promptId ? '&RequestId=' + promptId : '')), {
                            data: { Chart: chart, ListSize: size, Role: core.settings.role || 0, PromptName: promptName || '' },
                            handleAs: "json"
                        }).then(function(data) {
                            self.removeList(listId);
                            self.addList(data.list);
                        }, function(err) {
                            core.showError(err)
                        });
                    }
            };
        },

        // TODO: *dap* This doesn't make *any* sense to me, and the message to which this is subscribed above isn't called published anywhere, so I'm commenting it out. 04/04/2014
        //tagText: function () {
        //    var def = new dojo.Deferred();
        //    query(".freeText", this.note.containerNode).map(registry.byNode).forEach(function (x) {
        //        def.addCallback(lang.hitch(x, x.tagText));
        //    });
        //    def.addErrback(core.showError);
        //    def.callback({ success: true });
        //},

        saveContent: function (parms) {
            switch (parms.type) {
                case "list":
                    return this.saveList(parms);
                case "template":
                    return this.saveTemplate(parms);
                case "element":
                    return this.saveAsNoteContent(parms);
                default:
                    return null;
            }
        },


        saveList: function (parms) {
            parms.data = this.note.toFindingList(parms);
            parms.mimeType = 'text/xml';

            return request(core.serviceURL('Quippe/ContentLibrary/Save?DataFormat=JSON'), {
            		data: parms,
					method: 'POST',
                    handleAs: 'json'
                }).then(function(data) {
                    if (data.error) {
                        core.showError(data.error.message);
                        return null;
                    }
                    else {
                        core.app.setPreventCache(parms.id);
                        topic.publish('/qc/ContentLibrary/Changed', parms);
                        return data.item;
                    }
                }, function(err) {
                    core.showError(err)
                });
        },

        saveTemplate: function (parms) {
            var writer = new XmlWriter();
            this.note.writeNoteElement(writer, 'template');
            parms.data = writer.toString();
            parms.mimeType = 'text/xml';
            return request.post(core.serviceURL('Quippe/ContentLibrary/Save?DataFormat=JSON'), {
                data: parms,
                handleAs: 'json'
            }).then(function(data) {
                if (data.error) {
                    core.showError(data.error.message);
                    return null;
                }
                else {
                    topic.publish('/qc/ContentLibrary/Changed');
                    if (parms.makeDefault && data.item && data.item.id) {
                        var id = data.item.id;
                        request.post(core.serviceURL('Quippe/UserSettings/Data'), {
                            data: { "DefaultNoteTemplate": id }
                        }).then(function(data) {
                            core.settings.defaultNoteTemplate = id;
                            topic.publish('/qc/SettingsChanged', { defaultNoteTemplate: id });
                        }, function(err) {
                            // core.showError(err)
                        });
                    };
                    return data.item;
                }
            }, function(err) {
                core.showError(err)
            });
        },

        saveAsNoteContent: function (parms) {
            var writer = new XmlWriter();
            writer.beginElement('Content');
            array.forEach(this.note.getChildren(), function (child) {
                child.writeNoteElement(writer, 'template');
            }, this);
            writer.endElement();

            parms.data = writer.toString();
            parms.mimeType = 'text/xml';
  
            return request( core.serviceURL('Quippe/ContentLibrary/Save?DataFormat=JSON'), {
            	data: parms,
				method: 'POST',
                handleAs: 'json'
            }).then(function(data) {
                if (data.error) {
                    core.showError(data.error.message);
                    return null;
                }
                else {
                    topic.publish('/qc/ContentLibrary/Changed');
                    return data.item;
                }
            }, function(err) {
                core.showError(err)
            });
        },

        getNoteXml: function () {

        },

        getChartXml: function (findingList, settings) {
            var eTime = core.Encounter && core.Encounter.encounterTime ? core.Encounter.encounterTime : new Date();
            var recordCount = 0;

            settings = settings || {}; //{ xmlns: "http://schemas.medicomp.com/V3/Chart.xsd", evenIfEmpty: false };
            if (settings.xmlns == undefined) {
                settings.xmlns = "http://schemas.medicomp.com/V3/Chart.xsd";
            };

            var w = new XmlWriter();
            w.beginElement("Chart");
            if (settings.xmlns) {
                w.attribute("xmlns", settings.xmlns, "");
            };
            

            w.beginElement("Patient");
            if (core.Patient) {
                w.attribute("id", core.Patient.id || '', '');
                w.attribute("Sex", core.Patient.sex || 'U', 'U');
                w.attribute("Race", core.Patient.race || 'U', 'U');
                w.attribute("Religion", core.Patient.race || 'U', 'U');
                w.attribute("Ethnicity", core.Patient.race || 'U', 'U');
                w.attribute("MaritalStauts", core.Patient.race || 'U', 'U');
                if (core.Patient.birthDate) {
                    w.attribute("BirthDate", DateUtil.formatISODate(core.Patient.birthDate));
                };
            }

            w.beginElement("Encounters");
            w.beginElement("Encounter");
            w.attribute("EncounterTime", DateUtil.formatISODate(eTime));
            w.beginElement("Records");

            var includeNonEntered = true;
            if (!findingList) {
                findingList = query('.entry', this.note.containerNode).map(registry.byNode);
                includeNonEntered = false;
            };

            array.forEach(findingList, function (entry) {
                recordCount += entry.writeChartRecords(w, includeNonEntered);
            });


            w.endElement();
            w.endElement();
            w.endElement();


            w.endElement()

            w.endElement();

            if (recordCount > 0 || settings.evenIfEmpty) {
                return w.toString();
            }
            else {
                return null;
            }
        },

        navigateToTop: function () {
            if (this.scrollingMethod == 'top') {
                domStyle.set(this.domNode, 'top', '0px');
            }
            else {
                this.domNode.parentNode.scrollTop = 0;
            }
        },

        navigateToSection: function (sectionId, select) {
            var posEditor = null;
            var posSection = null;
            var posContainer = null;
            var posThis = null;
            var posThat = null;
            var node = null;

            if (this.scrollingMethod == 'top') {
                var moveTo = null;
                switch (sectionId) {
                    case 'top':
                        moveTo = 0;
                        break;
                    case 'bottom':
                        posThis = domGeometry.position(this.domNode);
                        posThat = domGeometry.position(this.domNode.parentNode);
                        moveTo = -1 * posThis.h + posThat.h;
                        break;
                    default:
                        node = dom.byId(sectionId);
                        if (node && (domStyle.set(node, 'display') != 'none')) {
                            posEditor = domGeometry.position(this.domNode);
                            posSection = domGeometry.position(node);
                            posContainer = domGeometry.position(this.domNode.parentNode);
                            var bottom = -1 * posEditor.h + posContainer.h;
                            var target = -1 * (posSection.y - posEditor.y);
                            moveTo = Math.min(Math.max(bottom, target), 0);
                        }
                        break;
                };

                if (moveTo != null) {
                    baseFx.animateProperty({
                        node: this.domNode,
                        properties: {
                            top: moveTo
                        }
                    }).play();
                };
            }
            else {
                var scrollTo = null;
                switch (sectionId) {
                    case 'top':
                        scrollTo = 0;
                        break;
                    case 'bottom':
                        scrollTo = this.domNode.scrollHeight;
                        break;
                    default:
                        node = dom.byId(sectionId);
                        if (node && (domStyle.set(node, 'display') != 'none')) {
                            posEditor = domGeometry.position(this.domNode);
                            posSection = domGeometry.position(node);
                            scrollTo = (posSection.y - posEditor.y);
                        }
                        break;
                };
                if (scrollTo != null) {
                    this.animateScoll(scrollTo);
                };
            };

            if (select && node) {
                this.select(registry.byNode(node));
            };
        },

        ensureVisible: function(elementOrNode) {
            var domNode = elementOrNode ? elementOrNode.domNode ? elementOrNode.domNode : elementOrNode : null;

            if (!domNode) {
                return;
            };

            if (this.viewMode == 'design') {
                var page = core.ancestorWidgetByClass(domNode, 'qcFormPage', true);
                if (page) {
                    page.ensureVisible();
                }
            };

            this._ensureNodeVisible(domNode);
            
        },

        _ensureNodeVisible: function (node) {
            var posNode = domGeometry.position(node);
            var posEditor = domGeometry.position(this.domNode);
            var posContainer = domGeometry.position(this.domNode.parentNode);

            var cNode = node;
            while (cNode && cNode.nodeType == 1) {
                domClass.remove(cNode, 'collapsed');
                cNode = cNode.parentNode;
            };

            if (this.scrollingMethod == 'top') {
                if (posNode.y < 0 || (posNode.y + posNode.h) >= posContainer.h) {
                    var newTop = (-1 * (posNode.y - posEditor.y)) + (posContainer.h / 2) - posNode.h / 2;
                    var minTop = -1 * posEditor.h + posContainer.h;
                    var maxTop = 0;
                    var moveTo = Math.max(Math.min(maxTop, newTop), minTop);
                    baseFx.animateProperty({
                        node: this.domNode,
                        properties: {
                            top: moveTo
                        }
                    }).play();
                };
            }
            else {
                if (posNode.y <= posContainer.y || posNode.y + posNode.h >= posContainer.y + posContainer.h) {
                    this.animateScoll((posNode.y - posEditor.y) - (posContainer.h / 2 - posNode.h / 2));
                };
            };
        },

        animateScoll: function (scrollTo) {
            var view = this.domNode.parentNode;
            var current = view.scrollTop;

            var a = new baseFx.Animation(lang.mixin({
                beforeBegin: function () {
                    if (this.curve) {
                        delete this.curve;
                    };
                    a.curve = new baseFx._Line(current, scrollTo);
                },
                onAnimate: function (value) {
                    view.scrollTop = value;
                }
            }));

            a.play();
        },

        /* Entry Id Handling */
        ensureEntryIds: function () {
            var self = this;
            query('.entry', this.domNode).map(registry.byNode).forEach(function (w) {
                if (!w.get('entryId')) {
                    w.set('entryId', self.getEntryId());
                };
            });
        },

        getEntryId: function () {
            if (this.entryIdNumber < 0) {
                this.entryIdNumber = this.maxEntryId();
            };
            this.entryIdNumber++;
            return this.entryIdPrefix + this.entryIdNumber;
        },

        resetEntryIdNumber: function () {
            this.entryIdNumber = -1;
        },

        maxEntryId: function () {
            var self = this;
            var list = query('.finding', this.domNode).map(registry.byNode).map(function (w) { return self.getEntryNumber(w.get('entryId')); }) || [];
            var value = 0;
            for (var n = 0, len = list.length; n < len; n++) {
                if (list[n] > value) {
                    value = list[n];
                };
            };
            return value;
        },

        getEntryNumber: function (entryId) {
            if (entryId) {
                if (typeof entryId == 'number') {
                    return entryId;
                }
                else if (typeof entryId == 'string') {
                    var n = parseInt(entryId.substr(this.entryIdPrefix.length), 10);
                    return isNaN(n) ? 0 : n;
                }
                else {
                    return 0;
                }
            };
            return 0;
        },

        updateNursingAutoPrompt: function (widget) {
            if (!widget.rn) {
                return;
            };

            if (!core.settings.nurseAutoPrompt || core.settings.nurseAutoPrompt < 1) {
                return;
            };

            var level = { 'AX': 1, 'IX': 2, 'DX': 3 }[widget.rn] || 1000;

            if (core.settings.nurseAutoPrompt < level) {
                return;
            };

            if (widget.get('result') == 'A') {
                topic.publish('/qc/NursingPrompt', widget.toFinding());
            }
            else {
                var listSize = (widget.rn == 'AX') ? 3 : core.settings.listSize;
                var listId = 'RN_' + widget.get('medcinId') + '_' + listSize;
                var sourcesPane = query('.qcSourceList').map(registry.byNode)[0];
                if (sourcesPane) {
                    sourcesPane.removeList(listId);
                }
                else {
                    this.removeList(listId);
                };
            };
        },

        //Multi-Problem
        createProblemSection: function (args) {
            var dxWidget = args.dxWidget;
            var assessmentSection = args.assessmentSection;
            if (!dxWidget || !assessmentSection) {
                return;
            };

            var dxSections = query('.problemSection', this.domNode).map(registry.byNode) || [];
            var problemNumber = dxSections.length + 1;
            var newSection = core.createSection({ styleClass: 'problemSection' });
            newSection.startup();
            newSection.problemMedcinId = dxWidget.get('medcinId');
            newSection.problemNumber = problemNumber;
            newSection.problemText = Transcriber.transcribeItem(dxWidget);
            newSection.set('text',  ScriptCompiler.exec(newSection, core.settings.problemSectionTitle || '"Problem " & problemNumber'));
            newSection.set('showEmpty', true);

            if (dxSections.length > 0) {
                newSection.placeAt(dxSections[dxSections.length - 1].domNode, 'after');
            }
            else {
                var problemSectionPlaceholder = query('.problemSectionPlaceholder')[0];
                if (problemSectionPlaceholder) {
                    newSection.placeAt(problemSectionPlaceholder, 'after');
                }
                else {
                    newSection.placeAt(assessmentSection.domNode, 'before');
                }
            };

            dxWidget.problemGroupingOrigContainer = dxWidget.getContainingPart();

            var assessmentGroup = core.createGroup({ text: 'Assessment:' });
            assessmentGroup.placeAt(newSection.containerNode);
            assessmentGroup.addElement(dxWidget, null, '', true, '');

            var lastGroup = assessmentGroup;
            var handledGroups = [];
            
            var addSubgroup = function (parentPart, sourcePart) {
                if (handledGroups.indexOf(sourcePart.id) < 0) {
                    var heading = sourcePart.get('text');
                    if (!/\:$/.test(heading)) {
                        heading += ':';
                    };
                    var targetPart = core.createGroup({ text: heading, impliedPrefixes: sourcePart.impliedPrefixes, styleClass: 'problemSectionSubgroupCopy' });
                    targetPart.problemSubgroupId = sourcePart.id;
                    if (parentPart) {
                        targetPart.placeAt(parentPart.containerNode, 'last');
                    }
                    else {
                        targetPart.placeAt(lastGroup, 'after');
                        lastGroup = targetPart;
                    };
                    targetPart.startup();
                    if (domClass.contains(sourcePart.domNode, 'problemSectionDisableRollup')) {
                        query('.part', sourcePart.domNode).map(registry.byNode).forEach(function (subPart) {
                            addSubgroup(targetPart, subPart);
                        });
                    };
                    query('.freeText', sourcePart.domNode).filter(function (x) { return !core.isHiddenFinding(x) }).map(registry.byNode).forEach(function (entry) {
                        var newFreeText = core.Note.cloneElement(entry)
                        newFreeText.problemGroupingOrigContainer = entry.getContainingPart();
                        targetPart.addElement(newFreeText, null, '', true, '');
                        entry.set('text', '');
                    });
                    query('.entry', sourcePart.domNode).filter(function (x) { return !core.isHiddenFinding(x) }).map(registry.byNode).forEach(function (entry) {
                        entry.problemGroupingOrigContainer = entry.getContainingPart();
                        targetPart.addElement(entry, null, '', true, '');
                    });
                    handledGroups.push(sourcePart.id);
                }
            };

            query('.problemSectionSubgroup', this.domNode).map(registry.byNode).forEach(function (part) {
                addSubgroup(null, part);
            });

            newSection.transcribe();

            if (domClass.contains(this.domNode, 'hasListFocus')) {
                this.updateDisplay('listfocus');
            }
            else {
                this.updateDisplay();
            };

            this.select(dxWidget);
            this.ensureVisible(dxWidget.domNode);
            return newSection;
        },

        moveOrCopyProblem: function (action, problemWidget, fromSection, toSection) {
            if (action == 'copy' && typeof toSection == 'string' && toSection == 'ALL') {
                var copyFn = lang.hitch(this, this.moveOrCopyProblem);
                query('.problemSection', this.domNode).map(registry.byNode).forEach(function (x) {
                    if (x.id != fromSection.id) {
                        copyFn(action, problemWidget, fromSection, x);
                    };
                });
                return;
            };

            if (!toSection) {
                return;
            };
            
            var toPart = null;
            var fromPart = core.ancestorWidgetByClass(problemWidget, 'problemSectionSubgroupCopy');
            if (!fromPart) {
                fromPart = domClass.contains(fromSection.domNode, 'problemSectionDisableRollup') ? core.ancestorWidgetByClass(problemWidget, 'part') : core.ancestorWidgetByClass(problemWidget, 'problemSectionSubgroup');
            };
            if (!fromPart) {
                toPart = toSection;
            }
            else {
                var subgroupId = fromPart.problemSubgroupId || fromPart.id;
                toPart = query('.problemSectionSubgroupCopy', toSection.containerNode).map(registry.byNode).filter(function (x) { return x.problemSubgroupId == subgroupId })[0] || null;
                if (!toPart) {
                    toPart = toSection;
                };
            };

            if (action == 'copy' && toPart.containsFinding(problemWidget)) {
                return;
            };

            var finding = action == 'copy' ? this.duplicateFinding(problemWidget) : problemWidget;
            finding.problemGroupingOrigContainer = problemWidget.getContainingPart();
            toPart.addElement(finding);
            fromSection.updateDisplay();
            toSection.updateDisplay();
        },
                
        undoProblemSection: function (sectionWidget) {
            var self = this;
            var dxWidget = null;
            query('.finding', sectionWidget.domNode).map(registry.byNode).forEach(function (findingWidget) {
                if (domClass.contains(findingWidget.domNode, 'freeText')) {
                    findingWidget.endEdit();
                };
                if (typeof findingWidget.problemGroupingOrigContainer == 'string') {
                    findingWidget.problemGroupingOrigContainer = self.getElementByName(findingWidget.problemGroupingOrigContainer);
                }
                if (findingWidget.problemGroupingOrigContainer && core.isInDocument(findingWidget.problemGroupingOrigContainer)) {
                    findingWidget.problemGroupingOrigContainer.addElement(findingWidget, null, null, false)
                }
                else {
                    self.addFinding(findingWidget, null, null, false);
                }
                if (findingWidget.medcinId == sectionWidget.problemMedcinId) {
                    dxWidget = findingWidget;
                };
            });
            sectionWidget.destroyRecursive();
            this.updateDisplay();
            if (dxWidget) {
                this.select(dxWidget);
                this.ensureVisible(dxWidget.domNode);
            };
        },

        getDropAction: function (source, evt) {
            return this.note ? this.note.getDropAction(source, evt) : null;
        },

        doDrop: function (source, evt) {
            return this.note ? this.note.doDrop(source, evt) : null;
        },

        destroyRecursive: function () {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, function (x) { x.remove() });
                this.subscriptions = null;
            };
            if (this.events) {
                array.forEach(this.events, function (x) { x.remove() });
            };
            if (this.note) {
                this.note.destroyRecursive();
            };
            this.inherited(arguments);
        },

        showEntryForm: function (item) {
            var contentId = typeof item == 'string' ? item : item.id;
            if (!contentId) {
                return;
            };
            var self = this;
            

            var hLoaded = topic.subscribe('/qc/FormOpened', function () {
                hLoaded.remove();
                core.app.showBusy(false);
            });
            core.app.showBusy(true, 30000, 300);

            request.get(core.serviceURL('Quippe/NoteBuilder/DocumentTemplate'), {
                query: {
                    id: contentId,
                    patientId: core.Patient ? core.Patient.id : '',
                    dataFormat: 'XML'
                },
                handleAs: 'xml'
            }).then(function (data, ioArgs) {
                if (!core.checkXmlResult(data, true)) {
                    core.app.showBusy(false);
                    return;
                };

                var form = core.Note.parseXml(data);
                if (!form) {
                    core.app.showBusy(false);
                    core.showError('Unable to load form');
                    return;
                };

                form.contentId = contentId;
                form.contentItem = typeof item == 'string' ? { id: item } : item;
                form.hostEditor = self;
                form.synchHostToForm();
                domClass.add(form.domNode, 'qcddPrevent sealed');
                form.transcribe();
                form.updateDisplay();
                topic.publish('/qc/ContentLoaded');
                core.showDialog(form);

            }, function (err) {
                core.app.showBusy(false);
                core.showError(err);
            });
        },

        _getImageBlobWithoutExifData: function(reader) {
            var imageBlob;
            var dv = new DataView(reader.result);
            var offset = 0, recess = 0;
            var pieces = [];
            var i = 0;
            if (dv.getUint16(offset) == 0xffd8) {
                offset += 2;
                var app1 = dv.getUint16(offset);
                offset += 2;
                while (offset < dv.byteLength) {
                    if (app1 == 0xffe1) {
                        pieces[i] = { recess: recess, offset: offset - 2 };
                        recess = offset + dv.getUint16(offset);
                        i++;
                    }
                    else if (app1 == 0xffda) {
                        break;
                    }
                    offset += dv.getUint16(offset);
                    var app1 = dv.getUint16(offset);
                    offset += 2;
                }
                if (pieces.length > 0) {
                    var newPieces = [];
                    pieces.forEach(function (v) {
                        newPieces.push(this.result.slice(v.recess, v.offset));
                    }, reader);
                    newPieces.push(reader.result.slice(recess));
                    imageBlob = new Blob(newPieces, { type: 'image/jpeg' });
                }
            }
            //if (!imageBlob) {
            //    imageBlob = dv;
            //    //imageBlob = reader.result;
            //}
            return imageBlob;
        },

        addLocalImage: function () {
            var self = this;
            var fileInput = domConstruct.place('<input type="file" style="display:none;" accept="image/*" />', document.body);
            on(fileInput, 'change', function () {
                var file = fileInput.files[0];
                if (!file) {
                    return;
                };
                var reader = new FileReader();
                reader.onload = function (evt) {
                    var imageBlob = self._getImageBlobWithoutExifData(reader);

                    domConstruct.destroy(fileInput);

                    var reader2 = new FileReader();
                    reader2.onload = function(evt) {

                        var img = new Image();
                        img.src = evt.target.result;
                        on(img, 'load', function() {
                            var width = img.width;
                            var height = img.height;

                            var imageTransformer;
                            var targetWidth = domGeometry.getMarginBox(self.domNode).w - 20;
                            if (width > targetWidth) {
                                var targetHeight = ~~(targetWidth / width * height);
                                if (width > targetWidth * core.drawingSettings.WidthRatioOnImport) {
                                    imageTransformer = new ImageTransformer(img);
                                    imageTransformer.resampleTo(~~(targetWidth * core.drawingSettings.WidthRatioOnImport));
                                    if (core.drawingSettings.WidthRatioOnImport != 1) {
                                        imageTransformer.width = targetWidth;
                                        imageTransformer.height = targetHeight;
                                    }
                                } else {
                                    img.width = targetWidth;
                                    img.height = targetHeight;
                                }
                                width = targetWidth;
                                height = targetHeight;
                            }

                            var writer = new XmlWriter();
                            writer.beginElement('Drawing');
                            writer.attribute('SectionId', "S8");
                            writer.attribute('GroupId', 'Drawings');
                            writer.attribute('FromImage', 'true');
                            writer.attribute('Width', width);
                            writer.attribute('Height', height);
                            writer.endElement();

                            var drawingDoc = writer.toDocument();
                            var drawingWidget = self.mergeXml(drawingDoc.documentElement);

                            drawingWidget.drawingEditor.setBackgroundImageDirectly(imageTransformer || img);

                            domConstruct.destroy(fileInput);
                        });
                    };
                    if (imageBlob) {
                        reader2.readAsDataURL(imageBlob);
                    } else {
                        reader2.readAsDataURL(file);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
            fileInput.click();
        },

        getElementByName: function (name) {
            return this.note ? this.note.getElementByName(name) : null;
        },

        getRelativeToDomNode: function (nodeReference /* DOM Node, Note Element Widget, or element name */) {
            if (!nodeReference) {
                return null;
            };

            if (typeof nodeReference == 'string') {
                return this.getRelativeToDomNode(this.getElementByName(nodeReference));
            }
            else if (nodeReference.domNode) {
                if (domClass.contains(nodeReference.domNode, 'part')) {
                    return nodeReference.containerNode || nodeReference.domNode;
                }
                else {
                    return nodeReference.domNode;
                }
            }
            else {
                return nodeReference;
            }
        }

    });
});

