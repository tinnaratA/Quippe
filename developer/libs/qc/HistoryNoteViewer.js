define([
    "qc/NoteViewer",
    "dijit/registry",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/request",
    "dojo/topic",
    "qc/_core",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "qc/XmlUtil",
	"dojo/when",
	"dojo/has",
	"dojo/sniff",
    "qc/MenuItem",
    "dijit/Menu",
    "dijit/popup",
    "qc/DateUtil",
    "qc/XmlWriter",
    "qc/note/CitationSection",
    "dojo/NodeList-manipulate",
    "qc/_EnumManager"
], function (NoteViewer, registry, declare, event, lang, array, domClass, domConstruct, domStyle, on, query, request, topic, core, _TemplatedMixin, _WidgetBase, XmlUtil, when, has, sniff, MenuItem, Menu, popup, DateUtil, XmlWriter, CitationSection, NodeListManipulate, _EnumManager) {
    return declare("qc.HistoryNoteViewer", [_WidgetBase, _TemplatedMixin], {
        note: null,
        templateString: '<div class="qcHistoryNoteViewer"></div>',
        popupMenu: null,
        encounterId: null,
        encounterTime: null,
        preventCache: false,

        startup: function () {
            if (!this._started) {
                this.iframe = this.addIframe(this.domNode);
                this.inherited(arguments);

                this.popupMenu = new Menu();

                this.copyButton = new MenuItem({
                    label: 'Copy into current note',
                    iconClass: 'document_into',
                    onClick: lang.hitch(this, this.copyToNote)
                });
                this.popupMenu.addChild(this.copyButton);

                this.citeButton = new MenuItem({
                    label: 'Add as citation to current note',
                    iconClass: 'document_add',
                    onClick: lang.hitch(this, this.citeToNote)
                });
                this.popupMenu.addChild(this.citeButton);

                domClass.add(this.popupMenu.domNode, 'ic16 qcHistoryViewer');
                this.popupMenu.startup();
            };
        },

        destroyRecursive: function() {
            this.clear();
        },

        addIframe: function (container) {
            var iframe = document.createElement('iframe');
            iframe.src = 'about:blank';
            container.appendChild(iframe);

            var doc = iframe.contentDocument;
            doc.open();
            doc.write('<!DOCTYPE html>\n<html><head></head><body></body>');
            doc.close();
            return iframe;
        },

        clear: function () {
            if (this.events) {
                array.forEach(this.events, core.disconnect);
                this.events = null;
            };
            domConstruct.empty(this);
        },

        loadEncounter: function (encounterId, encounterTime) {
            if (!encounterId && encounterId != 0) {
                return;
            };
            this.encounterId = encounterId;
            this.encounterTime = encounterTime;
            var self = this;
            this.clear();

            domStyle.set(self.domNode, { visibility: 'hidden' });

            var noteLoaded = when(self.getEncounterInfo(), function (encounterInfo) {
                var encounterDateTime = DateUtil.dateFromJSON(encounterInfo.encounterTime);

                self.contextData = {};

                self.contextData.Encounter = {
                    encounterTime: encounterDateTime
                };

                self.contextData.Patient = {
                    id: encounterInfo.patient.id,
                    firstName: encounterInfo.patient.firstName,
                    lastName: encounterInfo.patient.lastName,
                    sex: encounterInfo.patient.sex
                };

                if (encounterInfo.patient.birthDate) {
                    var patientBirthDate = DateUtil.dateFromJSON(encounterInfo.patient.birthDate);
                    var patientAge = DateUtil.calculateAge(patientBirthDate, encounterDateTime);

                    self.contextData.Patient.birthDate = patientBirthDate;
                    self.contextData.Patient.ageInMinutes = patientAge.totalMinutes;
                    self.contextData.Patient.ageLabel = patientAge.label;
                }

                if (self.contextData.Patient.sex) {
                    self.contextData.Patient.sexLabel = _EnumManager.getTextSynch('sex', self.contextData.Patient.sex);
                }

                if (encounterInfo.provider) {
                    self.contextData.Provider = {
                        id: encounterInfo.provider.id,
                        Name: encounterInfo.provider.name
                    };
                }
            }).then(function () {
                return request(core.serviceURL("Quippe/PatientData/Patient/History/Note"), {
                    query: { EncounterId: encounterId },
                    handleAs: 'xml',
                    preventCache: self.preventCache
                });
            }).then(function(data, ioArgs) {
                return self.loadXML(data);
            }, core.showError).then(function (data) {
                self.noteViewer.note.Encounter = self.contextData.Encounter;
                self.noteViewer.note.Patient = self.contextData.Patient;
                self.noteViewer.note.Provider = self.contextData.Provider;

                return data;
            });

            when(noteLoaded, function () {
                setTimeout(function () { domStyle.set(self.domNode, { visibility: 'visible' }) }, 300);
            });

            return noteLoaded;
        },

        loadXML: function (xml) {
            var fDoc = this.iframe.contentWindow ? this.iframe.contentWindow.document : this.iframe.contentDocument;

            var fHead = fDoc.getElementsByTagName('head')[0];
            query('link').forEach(function (link) {
                fHead.appendChild(link.cloneNode());
            });

            var fBody = fDoc.getElementsByTagName('body')[0];
            array.forEach(document.body.attributes, function (attr) {
                fBody.setAttribute(attr.name, attr.value);
            });
            domClass.add(fBody, "qcHistoryNoteViewerBody");

            var xRoot = xml.documentElement;

            var xStyles = XmlUtil.selectChildElement(xRoot, 'Styles');
            if (xStyles) {
                xml.documentElement.removeChild(xStyles);
            };
            var docTheme = xRoot.getAttribute('Theme');
            xRoot.removeAttribute('Theme');
            if (!docTheme || docTheme == 'none') {
                docTheme = core.settings.defaultDocumentTheme || '';
            };

            if (xStyles) {
                var fDocStyle = fDoc.createElement('style');
                fDocStyle.setAttribute('type', 'text/css');
                fDocStyle.innerHTML = xStyles.textContent;
                fHead.appendChild(fDocStyle);
            };

            if (navigator.msPointerEnabled) {
                domStyle.set(this.domNode, { "-ms-touch-action": "auto", "touch-action": "auto" });
                domStyle.set(this.iframe, { "-ms-touch-action": "auto", "touch-action": "auto" });

                var touchAction = '{-ms-touch-action: auto;touch-action: auto;}';
                var surfaceStyle = fDoc.createElement('style');
                surfaceStyle.setAttribute('type', 'text/css');
                var styleText = [];
                styleText.push('html ' + touchAction);
                styleText.push('*' + touchAction);
                surfaceStyle.innerHTML = styleText.join('\n');
                fHead.appendChild(surfaceStyle);
            };

            var fNote = fDoc.createElement('div');
            this.noteNode = fNote;

            domClass.add(fNote, 'qcNoteEditor');
            fBody.appendChild(fNote);
            domStyle.set(fBody, { overflow: core.util.isTouchDevice() ? 'scroll' : 'auto' });

            var noteViewer = new NoteViewer();
            noteViewer.startup();
            domStyle.set(noteViewer.domNode, { position: 'relative' });
            fNote.appendChild(noteViewer.domNode);
            noteViewer.loadXml(xRoot);
            if (docTheme) {
                request.get(core.serviceURL('Quippe/ContentLibrary/Theme'), { query: { id: docTheme } }).then(function (data) {
                    var fDocTheme = fDoc.createElement('style');
                    fDocTheme.setAttribute('type', 'text/css');
                    fDocTheme.innerHTML = data;
                    if (fDocStyle) {
                        fHead.insertBefore(fDocTheme, fDocStyle);
                    }
                    else {
                        fHead.appendChild(fDocTheme);
                    };
                });
            };
            if (core.settings.overrideTheme) {
                request.get(core.serviceURL('Quippe/ContentLibrary/Theme'), { query: { id: core.settings.overrideTheme } }).then(function (data) {
                    var fOverrideTheme = fDoc.createElement('style');
                    fOverrideTheme.setAttribute('type', 'text/css');
                    fOverrideTheme.innerHTML = data;
                    fHead.appendChild(fOverrideTheme);
                });
            };
            noteViewer.note.updateDisplay();
            noteViewer.note.isHistoryView = true;

            var overlay = domConstruct.create('div');
            domClass.add(overlay, "qcHistoryNoteViewerOverlay");
            if (has("ie") <= 8) {
                overlay.setAttribute('style', overlay.getAttribute('style') + ';progid:DXImageTransform.Microsoft.Alpha(Opacity=30)');
            };
            domConstruct.place(overlay, noteViewer.domNode);

            this.noteViewer = noteViewer;

            this.events = [];
            this.events.push(on(overlay, 'contextmenu', event.stop));
            this.events.push(on(overlay, 'mouseup', lang.hitch(this, this.onOverlayClick)));
            return true;
        },

        onOverlayClick: function (evt) {
            popup.close();


            var note = this.noteViewer ? this.noteViewer.note : null;
            if (!note) {
                return;
            };

            query('.selected', note.domNode).removeClass('selected');

            if (!(core.settings.enableCopyForward || core.settings.enableCitations)) {
                return;
            };

                        
            var target = core.getNoteElementFromPoint(note, evt.clientX, evt.clientY);
            if (!target) {
                return;
            };

            if (domClass.contains(target.domNode, 'part') && !(domClass.contains(target.domNode, 'qxFindingTable') || domClass.contains(target.domNode, 'qcFindingTable'))) {
                var targetElement = core.getDOMNodeFromPoint(target.domNode, evt.clientX, evt.clientY);
                if (!targetElement || !domClass.contains(targetElement, 'innerLabel')) {
                    return;
                };
            };

            domStyle.set(this.copyButton.domNode, { display: core.settings.enableCopyForward ? 'block' : 'none' });
            domStyle.set(this.citeButton.domNode, { display: core.settings.enableCitations ? 'block' : 'none' });

            domClass.add(target.domNode, 'selected');
            this.popupMenu._openMyself({ target: target.domNode });
        },

        getEncounterInfo: function () {
            if (this.encounterInfo) {
                return this.encounterInfo;
            }
            else {
                var self = this;
                this.encounterInfo = request.get(core.serviceURL('Quippe/PatientData/EncounterInfo'), {
                    query: { EncounterId: this.encounterId, DataFormat: 'JSON' },
                    handleAs: 'json'
                }).then(function (data) {
                    self.encounterInfo = data && data.encounter ? data.encounter : { id: self.encounterId, encounterTime: self.encounterTime };
                    if (!self.encounterInfo.description) {
                        self.encounterInfo.description = self.noteViewer && self.noteViewer.note ? self.noteViewer.note.get('title') || '' : '';
                    };
                    return self.encounterInfo;
                })
                return this.encounterInfo;
            };
        },


        citeToNote: function () {
            when(this.getEncounterInfo(), lang.hitch(this, function (encounterInfo) {
                this._citeToNote(encounterInfo);
            }));
        },

        _citeToNote: function (encounterInfo) {
            var note = this.noteViewer ? this.noteViewer.note : null;
            if (!note) {
                return;
            };
            var sourceElement = query('.selected', note.domNode).map(registry.byNode)[0];
            if (!sourceElement) {
                return;
            };
            var noteEditor = core.getNoteEditor();
            if (!noteEditor) {
                return;
            };
            var currentNote = noteEditor.note;
            if (!currentNote) {
                return;
            };

            var citeClass = 'citedFrom' + encounterInfo.id;
            var targetGroup = query('.' + citeClass, currentNote.domNode).map(registry.byNode)[0];
            if (!targetGroup) {
                targetGroup = new CitationSection();
                targetGroup.startup();
                targetGroup.set('headerLeft', encounterInfo.encounterTime ? DateUtil.formatJSONDate(encounterInfo.encounterTime) : '');
                targetGroup.set('headerCenter', encounterInfo.description || '');
                targetGroup.set('headerRight', encounterInfo.provider ? encounterInfo.provider.name || '' : '');
                targetGroup.set('styleClass', citeClass);
                currentNote.addElement(targetGroup);
            };

            var targetElement = core.Note.cloneElement(sourceElement);
            targetElement.startup();
            targetElement.set('styleClass', ['qcContextMenuPrevent', 'sealed', 'qcddPrevent', 'externalEntry', targetElement.get('styleClass')].join(' '));
            targetElement.placeAt(targetGroup.containerNode);
            query('.entry', targetGroup.domNode).forEach(function (x) {
                domClass.remove(x, 'entry');
                domClass.add(x, 'citedEntry');
            });
            query('*[contenteditable]', targetGroup.domNode).forEach(function (x) {
                x.removeAttribute('contenteditable')
            });
            query('input', targetGroup.domNode).forEach(function (x) {
                x.setAttribute('readonly', true)
            });

            noteEditor.updateDisplay();
        },
        
        copyToNote: function(allFindings) {
            when(this.getEncounterInfo(), lang.hitch(this, function (encounterInfo) {
                this._copyToNote(encounterInfo, allFindings);
            }));
        },

        _copyToNote: function(encounterInfo, allFindings) {
            var note = this.noteViewer ? this.noteViewer.note : null;
            if (!note) {
                return;
            };
            var sourceElement = query('.selected', note.domNode).map(registry.byNode)[0];
            if (!sourceElement) {
                return;
            };
            var noteEditor = core.getNoteEditor();
            if (!noteEditor) {
                return;
            };
            var currentNote = noteEditor.note;
            if (!currentNote) {
                return;
            };

            var targets = [];
            var toResolve = [];

            noteEditor.getGroup({ placementId: 'X' }); //to ensure editor grouping rules are up to date
            var targetKeys = noteEditor.groupingRules.keys;

            var isDescendant = function (ancestor, child) {
                var parent = child.getContainingPart();
                while (parent && parent.id != ancestor.id) {
                    parent = parent.getContainingPart();
                };
                return (parent && parent.id == ancestor.id);
            };

            var findMatchingGroup = function (sourceGroup, targetParent) {
                var sourceKeys = sourceGroup.getGroupKeyList ? sourceGroup.getGroupKeyList() : sourceGroup.name ? [sourceGroup.name] : [];
                var target = null;
                for (var n = 0; n < sourceKeys.length; n++) {
                    target = targetKeys[sourceKeys[n]];
                    if (target && (!targetParent || isDescendant(targetParent, target))) {
                        return target;
                    };
                };
                return null;
            };

            var findMatchingParent = function (sourceGroup) {
                var sourceParent = sourceGroup.getContainingPart();
                var targetParent = null;
                while (sourceParent) {
                    targetParent = findMatchingGroup(sourceParent);
                    if (targetParent) {
                        return targetParent;
                    }
                    else {
                        sourceParent = sourceParent.getContainingPart();
                    };
                };
                return null;
            };

            var shallowCopy = function(group) {
                var writer = new XmlWriter();
                var mode = 'template';
                var tagName = group.partType.charAt(0).toUpperCase() + group.partType.substr(1);

                writer.beginElement(tagName);
                group.writeNoteAttributes(writer, mode);
                group.writeCustomAttributes(writer, mode);
                group.writeComponentSettings(writer, mode);
                group.writeBindings(writer, mode);
                writer.endElement(tagName);

                var xml = writer.toString();
                var copy = core.Note.parseXml(xml);
                return copy;
            };

            var addToResolveList = function (widget, parent, sourceIndex) {
                var res = {
                    medcinId: widget.get('medcinId'),
                    prefix: widget.get('prefix') || '',
                    text: widget.get('text'),
                    sourceIndex: sourceIndex
                };
                if (parent) {
                    res.sectionId = '_';
                    res.groupId = '_';
                };
                toResolve.push(res);
            }

            var rxGroup = /\s(chapter|section|group)\s/;
            var rxFinding = /\sfinding\s/;
            var rxFreeText = /\sfreeText\s/;

            var buildTargets = function (sourceWidget, targetParent) {
                var targetWidget = null;
                var className = ' ' + sourceWidget.domNode.className + ' ';
                var i = 0;

                if (rxGroup.test(className)) {
                    targetWidget = findMatchingGroup(sourceWidget, targetParent);
                    if (!targetWidget) {
                        targetWidget = shallowCopy(sourceWidget);
                        targetParent = targetParent || findMatchingParent(sourceWidget);
                        targets.push({ widget: targetWidget, parent: targetParent });
                    };
                    array.forEach(sourceWidget.getChildNoteElements(), function (child) {
                        buildTargets(child, targetWidget);
                    });
                }
                else if (rxFinding.test(className)) {
                    if ((allFindings || sourceWidget.get('result')) && sourceWidget.get('medcinId') && (!rxFreeText.test(className) || sourceWidget.get('text'))) {
                        targetWidget = core.Note.cloneElement(sourceWidget);
                        targetWidget.set('entryId', '');
                        targetWidget.set('hasHistory', true);
                        targets.push({ widget: targetWidget, parent: targetParent, isFinding: true });
                        addToResolveList(targetWidget, targetParent, targets.length);
                    };
                }
                else {
                    targetWidget = core.Note.cloneElement(sourceWidget);
                    targetParent = targetParent || findMatchingParent(sourceWidget);
                    targets.push({ widget: targetWidget, parent: targetParent });
                };
            };

            var resolveTerms = function () {
                if (!toResolve || toResolve.length == 0) {
                    return true;
                }
                else {
                    var writer = new XmlWriter();
                    writer.writeList('List', 'Term', toResolve)
                    return request.post(core.serviceURL('Quippe/NoteBuilder/ResolveDocument?DataFormat=JSON&Culture=' + core.settings.culture), {
                        data: { Data: writer.toString() },
                        handleAs: 'json'
                    }).then(function (data) {
                        array.forEach(data.list, function (term) {
                            var i = term.sourceIndex - 1;
                            if (i >= 0) {
                                for (var p in term) {
                                    if (p != 'sourceIndex' && term[p] && term[p] != '_') {
                                        targets[i].widget.set(p, term[p]);
                                    };
                                };
                            };
                        });
                        return true;
                    });
                }
            };

            buildTargets(sourceElement);

            if (targets.length == 0) {
                return;
            };

            var sourceId = 'CopyForwardEncounter' + encounterInfo.id;
            var sourceInfo = {
                id: sourceId,
                type: 'content',
                text: ['Copied from', encounterInfo.description || '', DateUtil.formatDate(this.encounterTime)].join(' '),
                icon: 'element',
                className: core.createClassName('lst' + sourceId)
            };

            when(resolveTerms(), function () {
                array.forEach(targets, function (target) {
                    if (!target.parent) {
                        target.parent = target.isFinding ? noteEditor.getGroup(target.widget) : noteEditor;
                    };
                    var relativeTo = null;
                    var position = null;

                    if (domClass.contains(target.widget.domNode, 'problemSection')) {
                        relativeTo = query('.problemSectionPlaceholder', currentNote.domNode)[0];
                        if (relativeTo) {
                            position = 'after';
                        }
                        else {
                            relativeTo = query('.problemSectionController', currentNote.domNode)[0];
                            if (relativeTo) {
                                position = 'before';
                            }
                            else {
                                relativeTo = null;
                                position = null;
                            }
                        }
                    };

                    target.parent.addElement(target.widget, relativeTo, position, false, sourceInfo.className);
                });
                noteEditor.transcribe();
                noteEditor.updateDisplay();
                noteEditor.lists[sourceInfo.id] = sourceInfo;
                topic.publish("/noteEditor/listAdded", sourceInfo);
            });

        },

        getContextData: function() {
            var contextData = {
                Patient: this.contextData.Patient,
                Encounter: this.contextData.Encounter,
                Provider: this.contextData.Provider
            };

            for (var propertyName in core) {
                if (core.hasOwnProperty(propertyName) && !contextData.hasOwnProperty(propertyName) && typeof core[propertyName] != "function") {
                    contextData[propertyName] = core[propertyName];
                }
            }

            return contextData;
        },

        getPrintable: function (previewWidget) {
            this.noteViewer.setPrintView();

            query(".patientBanner .noteLabel", this.noteNode).forEach(function (e) {
                registry.getEnclosingWidget(e).updateDisplay();
            });

            // To deal with the fact that cloneNode won't actually copy the current value
            // of a textarea element.  Since that is stored in the value *property* not 
            // in a node - thanks W3C.
            query('textarea', this.noteNode).forEach(function (textArea) {
                textArea.innerHTML = textArea.value;
            });
            query('input', this.noteNode).forEach(function (input) {
                if (input.getAttribute('type') == 'text') {
                    input.setAttribute('value', input.value);
                };
            });

            var clone = this.noteNode.cloneNode(true);
            this.noteViewer.setStandardView();

            query("*", clone).removeClass(["selected", "highlight"]);
            domStyle.set(clone, { left: '0px', top: '0px' });
            query(".qcHistoryNoteViewerOverlay", clone).remove();

            return clone;

        },

        getPrintSettings: function () {
            return this.noteViewer && this.noteViewer.note ? this.noteViewer.note.get('printSettings') : {};
        }
    });
});