define([
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/request",
    "dojo/topic",
    "qc/DateUtil",
    "qc/XmlUtil",
    "qc/StringUtil",
    "qc/_core",
    "qc/TimingTranscriber"
], function (registry, array, declare, lang, domClass, domConstruct, domGeometry, request, topic, DateUtil, XmlUtil, StringUtil, core, TimingTranscriber) {
    return declare("qc.note._FindingElementMixin", [], {
        type: 'finding',
        detailProperties: ['prefix', 'result', 'status', 'modifier', 'value', 'unit', 'onset', 'duration', 'episode', 'notation', 'specifier', 'timing'],
        entryId: '',
        medcinId: 0,
        nodeKey: '',
        termType: 0,
        flag: 0,
        subs: '',
        prefix: '',
        result: '',
        status: '',
        modifier: '',
        value: '',
        unit: '',
        onset: '',
        duration: '',
        episode: '',
        notation: '',
        specifier: '',
        timing: '',
        text: '',
        hasHistory: false,
        rn: '',
        notApplicable: false,
        hasInfo: false,
        overrideTranscription: false,
        placementId: '',
        formMergePlacement: '',
        specialty: '',
        rxCode: '',
    
        _getHasHistoryAttr: function (value) {
            return domClass.contains(this.domNode, "hasHistory");
        },
        _setHasHistoryAttr: function (value) {
            return value ? domClass.add(this.domNode, "hasHistory") : domClass.remove(this.domNode, "hasHistory");
        },
    
        _getPrefixAttr: function () {
            return this.prefix;
        },
        _setPrefixAttr: function (value) {
            this.prefix = value;
        },
    
        _getValueAttr: function () {
            return this.value;
        },
        _setValueAttr: function (value) {
            this.value = value;
            //automatically setting result when settings other finding property causes
            //a problem for saving properties in lists/templates
            //if (value != null && value != undefined && !this.get('result')) {
            //    this.set('result', 'A');
            //};
        },
    
        _getNotationAttr: function () {
            return this.notation;
        },
        _setNotationAttr: function (value) {
            this.notation = value;
        },
    
        _getNoteAttr: function () {
            return this.get('notation');
        },
        _setNoteAttr: function (value) {
            this.set('notation', value);
        },
    
        _getOnsetAttr: function () {
            return this.onset;
        },
        _setOnsetAttr: function (value) {
            this.onset = DateUtil.normalizeTimeString(value) || value;
        },
    
        _getDurationAttr: function () {
            return this.duration;
        },
        _setDurationAttr: function (value) {
            this.duration = DateUtil.normalizeTimeString(value) || value;
        },

        _getFormMergePlacementAttr: function () {
            return this.getInheritedProperty('formMergePlacement', '');
        },
        _setFormMergePlacementAttr: function (value) {
            this.formMergePlacement = value || '';
        },
    
        appendNotation: function (value) {
            this.set('notation', [this.get('notation'), value].join(' '));
        },
    
        setDetails: function (item) {
            if (item) {
                array.forEach(this.detailProperties, function (propName) {
                    if (item[propName] != undefined) {
                        this.set(propName, item[propName]);
                    };
                }, this);
                if (!this.overrideTranscription) {
                    if (item.text != undefined) {
                        this.set('text', item.text);
                    };
                    this.overrideTranscription = item.overrideTranscription || false;
                };
                if (item.placementId) {
                    this.placementId = item.placementId;
                };
            };
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
    
        resetDetails: function () {
            this.prefix = '';
            this.status = '';
            this.modifier = '';
            this.value = '';
            this.unit = '';
            this.onset = '';
            this.duration = '';
            this.episode = '';
            this.notation = '';
            this.specifier = '';
            this.timing = '';
            this.notApplicable = false;
            this.set('result', '');
        },
    
        toFinding: function () {
            return {
                id: this.get('medcinId'),
                nodeKey: this.get('nodeKey') || '',
                termType: this.get('termType') || '',
                subs: this.get('subs') || '',
                type: 'finding',
                medcinId: this.get('medcinId'),
                prefix: this.get('prefix') || '',
                result: this.get('result') || '',
                status: this.get('status') || '',
                modifier: this.get('modifier') || '',
                value: this.get('value') || '',
                unit: this.get('unit') || '',
                onset: this.get('onset') || '',
                duration: this.get('duration') || '',
                episode: this.get('episode') || '',
                timing: this.get('timing') || '',
                notation: this.get('notation') || '',
                text: this.get('text'),
                specifier: this.get('specifier'),
                rn: this.get('rn') || null,
                entryId: this.get('entryId') || '',
                hasInfo: this.get('hasInfo') || false,
                notApplicable: this.get('notApplicable') || false,
                overrideTranscription: this.overrideTranscription ? true : false,
                specialty: this.get('specialty') || '',
                rxCode: this.get('rxCode') || ''
            };
        },
    
        mergeFinding: function (other, overwrite) {
            array.forEach(['result', 'status', 'onset', 'duration', 'episode', 'timing', 'notation', 'text', 'specifier', 'value', 'unit'], function (prop) {
                if ((overwrite || !this.get(prop)) && other.get(prop)) {
                    this.set(prop, other.get(prop));
                };
            }, this);
            return this;
        },
    
        mergeTermData: function (termData) {
            array.forEach(['result', 'status', 'onset', 'duration', 'episode', 'timing', 'notation', 'text', 'specifier', 'value', 'unit'], function (prop) {
                if (termData[prop] && !this.get(prop)) {
                    this.set(prop, termData[prop]);
                };
            }, this);
            return this;
        },
    
        updateDisplay: function (viewMode) {
            viewMode = viewMode || this.getViewMode();
            if (viewMode == 'concise' && !this.get('result') && (!domClass.contains(this.domNode, 'alwaysShow'))) {
                domClass.add(this.domNode, 'viewHide');
            }
            else {
                domClass.remove(this.domNode, 'viewHide');
            }
        },
    
        toggleResult: function () {
            switch (this.get('result')) {
                case 'A':
                    this.set('result', 'N');
                    break;
                case 'N':
                    this.set('result', '');
                    break;
                default:
                    this.set('result', 'A');
                    break;
            };
        },
    
        toggleResultFromEvent: function (evt) {
            return this.toggleResult();
        },
    
        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            var self = this;
            array.forEach(xmlNode.childNodes, function (xmlChild) {
                if (xmlChild.nodeType === 1) {
                    switch (xmlChild.tagName.toLowerCase()) {
                        case 'phrasing':
                            var phrasing = {};
                            array.forEach(xmlChild.attributes, function (attr) {
                                phrasing[attr.name.charAt(0).toLowerCase() + attr.name.substr(1)] = attr.value;
                            });
                            self.phrasing = phrasing;
                            break;
                        case 'codes':
                            var codes = {};
                            array.forEach(xmlChild.childNodes, function (xCode) {
                                if (xCode.nodeType === 1 && xCode.tagName.toLowerCase() == 'code') {
                                    var vocab = xCode.getAttribute('Vocab');
                                    var code = xCode.getAttribute('Value');
                                    if (vocab && code) {
                                        codes[vocab] = { code: code };
                                        array.forEach(xCode.attributes, function (codeAttr) {
                                            codes[vocab][codeAttr.name.charAt(0).toLowerCase() + codeAttr.name.substr(1)] = codeAttr.value;
                                        });

                                        array.forEach(xCode.childNodes, function(xCodeChild) {
                                            if (xCodeChild.nodeType === 1 && xCodeChild.tagName.toLowerCase() == 'qualifiers') {
                                                codes[vocab].qualifiers = [];

                                                array.forEach(xCodeChild.childNodes, function (xQualifier) {
                                                    if (xQualifier.nodeType === 1 && xQualifier.tagName.toLowerCase() == 'qualifier') {
                                                        var qualifierCode = xQualifier.getAttribute('Value');
                                                        var qualifierRelationship = xQualifier.getAttribute('Relationship');

                                                        if (qualifierCode && qualifierRelationship) {
                                                            codes[vocab].qualifiers.push({
                                                                code: qualifierCode,
                                                                relationship: qualifierRelationship
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    };
                                };
                            });
                            self.codes = codes;
                            break;
                        case 'timing':
                            var timingComponents = [];
                            array.forEach(xmlChild.childNodes, function (xComp) {
                                if (xComp.nodeType === 1 && xComp.tagName.toLowerCase() == 'timingcomponent') {
                                    var oComp = XmlUtil.elementToObject(xComp);
                                    if (oComp) {
                                        timingComponents.push(oComp);
                                    };
                                };
                            });
                            self.timingComponents = timingComponents;
                            if (timingComponents.length > 0) {
                                self.timing = TimingTranscriber.transcribe(timingComponents);
                            };
                            break;
    
                        default:
                            break;
                    };
                };
            });
            self.inherited(arguments);
        },
    
        finalizeNote: function () {
            if (!this.get('result')) {
                this.deleteSelf(true);
            };
        },
    
        writeChartRecords: function (writer, includeNonEntered) {
            if (includeNonEntered || this.get('result')) {
                var finding = this.toFinding();
                writer.beginElement('Record');
                writer.attribute('EntryId', finding.entryId, '');
                writer.attribute('MedcinId', finding.medcinId, 0);
                writer.attribute('Prefix', finding.prefix, '');
                writer.attribute('Result', finding.result, '');
                writer.attribute('Status', finding.status, '');
                writer.attribute('Modifier', finding.modifier, '');
                writer.attribute('Value', finding.value, '');
                writer.attribute('Unit', finding.unit, '');
                writer.attribute('Onset', finding.onset, '');
                writer.attribute('Duration', finding.duration, '');
                writer.attribute('Episode', finding.episode, '');
                writer.attribute('Timing', finding.timing, '');
                writer.attribute('Note', finding.notation, '');
                writer.attribute('Specifier', finding.specifier, '');
                writer.attribute('Text', finding.text, '');
                writer.endElement();
                return 1;
            }
            else {
                return 0;
            };
        },
    
        writeNoteElement: function (writer, mode) {
            if (mode == 'template' || this.get('result')) {
                writer.beginElement("Finding");
                this.writeAllAttributes(writer, mode);
                this.writeAltPhrasing(writer, mode);
                this.writeCodingInfo(writer, mode);
                this.writeTimingComponents(writer, mode);
                writer.endElement();
                return 1;
            }
            else {
                return 0;
            }
        },
    
        writeNoteAttributes: function (writer, mode) {
            var finding = this.toFinding();
    
            writer.attribute('id', this.elementId || '', '');
            writer.attribute('Name', this.name || '', '');
            writer.attribute('EntryId', finding.entryId, '');
            writer.attribute('MedcinId', finding.medcinId, 0);
            writer.attribute('Prefix', finding.prefix, '');
            writer.attribute('Result', finding.result, '');
            writer.attribute('Status', finding.status, '');
            writer.attribute('Modifier', finding.modifier, '');
            writer.attribute('Value', finding.value, '');
            writer.attribute('Unit', finding.unit, '');
            writer.attribute('Onset', finding.onset, '');
            writer.attribute('Duration', finding.duration, '');
            writer.attribute('Episode', finding.episode, '');
            writer.attribute('Timing', finding.timing, '');
            writer.attribute('Note', finding.notation, '');
            writer.attribute('Specifier', finding.specifier, '');
            writer.attribute('Text', finding.text, '');
            writer.attribute('OverrideTranscription', this.overrideTranscription, false);
            writer.attribute('NotApplicable', this.notApplicable, false);
            writer.attribute('StyleClass', this.get('styleClass') || '', '');
            writer.attribute('FormMergePlacement', this.haveOwnProperty('formMergePlacement') ? this.formMergePlacement : '', '');
    
            writer.attribute('PostSep', this.get('postSep') || '', '');

            if (writer.parms.saveSources) {
                writer.attribute('SourceClasses', this.get('SourceClasses'), '');
            };
    
            if (core.app && core.app.customFindingAttributes) {
                array.forEach(core.app.customFindingAttributes, function (a) {
                    writer.attribute(a.tagName || StringUtil.toCamelUpper(a.name), finding[a] || this.get(a.name) || this.domNode.getAttribute(a.name.toLowerCase()), a.defaultValue);
                }, this);
            };

            if (mode == 'template' && this.problemGroupingOrigContainer) {
                if (typeof this.problemGroupingOrigContainer == 'string') {
                    writer.attribute('ProblemGroupingOrigContainer', this.problemGroupingOrigContainer, '');
                }
                else if (this.problemGroupingOrigContainer.domNode) {
                    writer.attribute('ProblemGroupingOrigContainer', this.problemGroupingOrigContainer.get('name'), '');
                }
            };

        },
    
        writeCodingInfo: function (writer, mode) {
            var entry = null;
            var includeDescriptions = core.settings.codingSerializeDescriptions;

            if (this.codes) {
	            var beginElementWritten = false;
                for (var v in this.codes) {
                	if (v != 'medcin') {
                	    if (!beginElementWritten) {
                	        writer.beginElement('Codes');
                	        beginElementWritten = true;
                	    };

		                entry = this.codes[v];
                        if (entry.code) {
                            writer.beginElement('Code');
                            writer.attribute('Vocab', v);
                            writer.attribute('Value', entry.code, '');
                            writer.attribute('AutoMapped', entry.autoMapped || false, false);
                            if (includeDescriptions) {
                                writer.attribute('Description', entry.description || '', '');
                            };
                            if (entry.baseCode && entry.baseCode != entry.code) {
                                writer.attribute('BaseCode', entry.baseCode);
                            };
                            if (entry.expression) {
                                writer.attribute('Expression', entry.expression);
                            };
                            if (entry.qualifiers) {
                                writer.beginElement('Qualifiers');
                                array.forEach(entry.qualifiers, function (q) {
                                    writer.beginElement('Qualifier');
                                    writer.attribute('Relationship', q.relationship || '', '');
                                    writer.attribute('Value', q.code || '', '');
                                    if (includeDescriptions) {
                                        writer.attribute('Description', q.description || '', '');
                                    };
                                    writer.endElement();
                                });
                                writer.endElement();
                            };
                            writer.endElement();
                        };
                    };
                };

	            if (beginElementWritten) {
		            writer.endElement();
	            }
            };
        },
    
        writeAltPhrasing: function (writer, mode) {
            if (this.phrasing && this.phrasing.isAlternate) {
                writer.beginElement('Phrasing');
                for (var p in this.phrasing) {
                    if (this.phrasing[p]) {
                        writer.attribute(p, this.phrasing[p]);
                    };
                };
                writer.endElement();
            };
        },
    
        writeTimingComponents: function (writer, mode) {
            if (this.timingComponents && this.timingComponents.length > 0) {
                writer.beginElement('Timing');
                writer.attribute('Text', TimingTranscriber.transcribe(this.timingComponents));
                array.forEach(this.timingComponents, function (comp, i) {
                    if (i > 0 && !comp.sequencing) {
                        comp.sequencing = 'S';
                    };
                    if (comp.asNeeded == 'on' || comp.asNeeded == true || comp.asNeeded == 'true') {
                        comp.asNeeded = true;
                    }
                    else {
                        comp.asNeeded = null;
                    };
                    writer.writeObject('TimingComponent', comp);
                });
                writer.endElement();
            };
        },
    
        getItem: function (node) {
            var selection = this.getEditorSelection();
            if (selection && selection.containsWidget(this) && selection.getItemCount() > 1) {
                return selection;
            }
            else {
                var item = this.toFinding();
                item.node = this.domNode;
                return item;
            };
        },
    
        getDropAction: function (source, evt) {
            switch (source.type || 'unknown') {
                case "finding":
                    return source.node ? 'move' : null;
                case "noteElement":
                case "findingGroup":
                    return 'move'
                case "list":
                case "term":
                case "element":
                case "image":
                case "macro":
                    return 'add';
                case "selection":
                case "chapter":
                case "section":
                case "group":
                    return "move";
                default:
                    return false;
            };
    
        },
    
        getPlacement: function (x, y) {
            var p = domGeometry.position(this.domNode);
            if (x > (p.x + (p.w / 2))) {
                return "after";
            }
            else {
                return "before";
            }
        },
    
        dropDelete: function (source) {
            if (this._beingDestroyed) {
                return;
            };
            var clearSelection = (this.domNode && domClass.contains(this.domNode, 'selected'))
            var finding = this.toFinding();
            var part = this.getParentNoteElement();
            this.destroyRecursive();
            if (clearSelection) {
                topic.publish("/noteEditor/SelectionChanged");
            };
            if (part) {
                part.updateDisplay();
                part.transcribe();
            };
            topic.publish('/noteEditor/findingRemoved', finding);
        },
    
        doDrop: function (source, evt) {
            var part = null;
    
            switch (source.type || 'unknown') {
                case "finding":
                case "findingGroup":
                    var sourceFinding = registry.byNode(source.node);
                    sourceFinding.moveTo(this.domNode, this.getPlacement(evt.clientX, evt.clientY));
                    break;
    
                case "chapter":
                case "section":
                case "group":
                    part = this.getContainingPart();
                    if (part) {
                        var p = part.getPartPlacement(source, evt);
                        domConstruct.place(source.node, p.node, p.pos);
                    };
                    break;
    
                case "noteElement":
                    if (source.inline) {
                        registry.byNode(source.node).moveTo(this.domNode, this.getPlacement(evt.clientX, evt.clientY));
                    }
                    else {
                        part = this.getContainingPart();
                        domConstruct.place(source.node, part.containerNode, 'last');
                    };
                    break;
    
                case "list":
                    topic.publish("/qc/AddToNote", source);
                    break;
    
                case "term":
                case "element":
                case "image":
                case "macro":
                    topic.publish("/qc/AddToNote", source, this.domNode, this.getPlacement(evt.clientX, evt.clientY));
                    break;
    
                case "selection":
                    source.moveTo(this.domNode, this.getPlacement(evt.clientX, evt.clientY));
                    break;
    
                default:
                    return;
            };
        },
    
        // summary: retturns true if this finding is part of a Form element
        isFormFinding: function() {
            return core.ancestorNodeByClass(this.domNode, 'qcForm') ? true : false;
        },
        
        _pgPropDef_medcinId: function () {
            return {
                name: 'medcinId',
                type: 'integer',
                group: 'Data',
                isShareable: false,
                description: core.getI18n('tooltipMedcinId'),
                defaultValue: 0,
                setter: lang.hitch(this, function (value) {
                    if (value > 0 && value != this.medcinId) {
                        this.resolveTerm(value);
                    };
                })
            };
        },

        _pgPropDef_prefix: function () {
            return { name: 'prefix', group: 'Data', isShareable: true, description: core.getI18n('tooltipPrefix') };
        },

        _pgPropDef_modifier: function () {
            return { name: 'modifier', group: 'Data', isShareable: true, description: core.getI18n('tooltipModifier') };
        },

        _pgPropDef_status: function () {
            return { name: 'status', group: 'Data', isShareable: true, description: core.getI18n('tooltipStatus') };
        },

        _pgPropDef_result: function () {
            return { name: 'result', group: 'Data', isShareable: true, description: core.getI18n('tooltipResult') };
        },

        _pgPropDef_value: function () {
            return { name: 'value', group: 'Data', isShareable: true, description: core.getI18n('tooltipValue') };
        },

        _pgPropDef_unit: function () {
            return { name: 'unit', group: 'Data', isShareable: true, description: core.getI18n('tooltipUnit') };
        },

        _pgPropDef_onset: function () {
            return { name: 'onset', group: 'Data', isShareable: true, description: core.getI18n('tooltipOnset') };
        },

        _pgPropDef_duration: function () {
            return { name: 'duration', group: 'Data', isShareable: true, description: core.getI18n('tooltipDuration') };
        },

        _pgPropDef_episode: function () {
            return { name: 'episode', group: 'Data', isShareable: true, description: core.getI18n('tooltipEpisode') };
        },

        _pgPropDef_timing: function () {
            return { name: 'timing', group: 'Data', isShareable: true, description: core.getI18n('tooltipTiming') };
        },

        _pgPropDef_notation: function () {
            return { name: 'notation', caption: 'Note', group: 'Data', isShareable: true, description: core.getI18n('tooltipNote') };
        },

        _pgPropDef_text: function () {
            return { name: 'text', group: 'Text', isShareable: true, description: core.getI18n('tooltipText'), readOnly: this.overrideTranscription != true };
        },

        _pgPropDef_overrideTranscription: function () {
            return { name: 'overrideTranscription', type: 'boolean', group: 'Text', isShareable: true, description: core.getI18n('tooltipOverrideTranscription'), defaultValue: 'false', reloadOnChange: true };
        },

        _pgPropDef_styleClass: function () {
            return { name: 'styleClass', group: 'Style', isShareable: true, description: core.getI18n('tooltipStyleClass') };
        },

        _pgPropDef_formMergePlacement: function() {
            if (this.isFormElement()) {
                return { name: 'formMergePlacement', caption: 'Note Placement', isAdvanced: true, isShareable: true, group: 'Behavior', description: core.getI18n('tooltipPlaceAt') };
            }
            else {
                return null;
            }
        },
        
        resolveTerm: function (medcinId) {
            medcinId = medcinId || this.medcinId || 0;
            if (medcinId <= 0) {
                return false;
            };
    
            this.codes = null;
    
            var self = this;
            return request(core.serviceURL("Quippe/NoteBuilder/Resolve"), {
                query: { "MedcinId": medcinId, "Culture": core.settings.culture, DataFormat: "JSON" },
                handleAs: "json"
            }).then(function (data) {
                if (data.term) {
                    self.set('medcinId', medcinId);
                    for (var p in data.term) {
                        if (p == 'text') {
                            if (!self.overrideTranscription) {
                                self.set(p, data.term[p]);
                            };
                        }
                        else {
                            self.set(p, data.term[p]);
                        };
                    }
                };
                self.updateTranscription();
                if (domClass.contains(self.domNode, 'selected')) {
                    topic.publish("/noteEditor/SelectionChanged");
                };
            }, function (err) { });
        },
    
        isEquivalentElement: function (other) {
            return (other.medcinId && other.medcinId == this.medcinId)
                && ((other.prefix || '') == (this.prefix || ''))
                && ((other.name || '') == (this.name || ''));
        },
    
        merge: function (other) {
            if (other.domNode && domClass.contains(other.domNode, 'finding')) {
                this.mergeFinding(other);
            };
            return this;
        },
    
        duplicate: function (suppressName) {

            // 1.9 refactor *dap* this just doesn't work in the new scheme of things
            //var findingType = lang.getObject(this.declaredClass, false);
            // var newFinding = new findingType();

            var newFinding = new this.constructor();

            
    
            array.forEach(this.detailProperties.concat(['medcinId', 'text', 'overrideTranscription', 'rn', 'rnType', 'rnDx', 'notApplicable', 'subs']), function (p) {
                newFinding.set(p, this.get(p));
            }, this);
    
            array.forEach(['phrasing', 'codes', 'timingComponents'], function (p) {
                if (this[p]) {
                    newFinding[p] = lang.clone(this[p]);
                };
            }, this);
    
            domClass.add(newFinding.domNode, this.domNode.className);

           // var newFinding = lang.clone(this);
    
            if (!suppressName) {
                var elementName = '';
                if (!this.name) {
                    elementName = this.getUniqueName(this.medcinId ? 'M' + this.medcinId : 'Finding');
                    this.set('name', elementName);
                };
    
                elementName = this.getUniqueName(this.name.split('_')[0]);
                newFinding.set('name', elementName);
            };

            return newFinding;
        },

        anyDetailPropertySet: function () {
            var props = ['value', 'onset', 'duration', 'prefix', 'notation', 'status', 'modifier', 'episode', 'timing'];
            var sourceNode = this.sourceXmlNode || null;
            var sourceAttrs = sourceNode ? ['Value', 'Onset', 'Duration', 'Prefix', 'Notation', 'Status', 'Modifier', 'Episode', 'Timing'] : null;

            for (var p = 0, pLen = props.length; p < pLen; p++) {
                if (props[p] != 'result') {
                    var value = this.get(props[p]);
                    if (value) {
                        if (sourceNode && sourceNode.getAttribute(sourceAttrs[p]) !== value.toString()) {
                            return true;
                        }
                        else {
                            return true;
                        };
                    };
                };
            };

            return false;
        }
    });
});