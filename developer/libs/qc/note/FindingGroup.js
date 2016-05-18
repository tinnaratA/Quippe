define([
    "qc/note/_EditableTextMixin",
    "qc/note/_Element",
    "qc/note/_FindingElementMixin",
    "qc/note/_SelectableMixin",
    "qc/Transcriber",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/topic",
    "qc/_core",
    "qc/StringUtil"
], function (_EditableTextMixin, _Element, _FindingElementMixin, _SelectableMixin, Transcriber, _TemplatedMixin, _WidgetBase, registry, array, declare, domClass, domConstruct, query, topic, core, StringUtil) {
    var FindingGroup = declare("qc.note.FindingGroup", [_WidgetBase, _TemplatedMixin, _Element, _SelectableMixin, _EditableTextMixin], {
        templateString: '<div class="qcFindingGroup findingGroup findingLabel hiddenFindingContainer qcddSource sealed finding">'
                      + '  <div class="findingList" data-dojo-attach-point="findingListNode"></div>'
                      + '  <div class="innerLabel editableText" data-dojo-attach-point="label"></div>'
                      + '</div>',
    
    
        //from first finding
        medcinId: 0,
        nodeKey: '',
        termType: 0,
        flags: 0,
    
        elementName: 'FindingGroup',
        overrideTranscription: false,
    
        //shared finding properties
        sharedProperties: ['prefix', 'result', 'modifier', 'status', 'onset', 'duration', 'episode', 'entryStyle'],
        prefix: '',
        result: '',
        modifier: '',
        status: '',
        onset: '',
        duration: '',
        episode: '',
        entryStyle: '',
    
        phrasing: null,
    
        _getPrefixAttr: function () {
            return this.prefix;
        },
        _setPrefixAttr: function (value) {
            this.prefix = value;
            this.setAll('prefix', value);
        },
    
        _getModifierAttr: function () {
            return this.modifier;
        },
        _setModifierAttr: function (value) {
            this.modifier = value;
            this.setAll('modifier', value);
        },
    
        _getStatusAttr: function () {
            return this.status;
        },
        _setStatusAttr: function (value) {
            this.status = value;
            this.setAll('status', value);
        },
    
        _getOnsetAttr: function () {
            return this.onset;
        },
        _setOnsetAttr: function (value) {
            this.onset = value;
            this.setAll('onset', value);
        },
    
        _getDurationAttr: function () {
            return this.duration;
        },
        _setDurationAttr: function (value) {
            this.duration = value;
            this.setAll('duration', value);
        },
    
        _getEpisodeAttr: function () {
            return this.episode;
        },
        _setEpisodeAttr: function (value) {
            this.episode = value;
            this.setAll('episode', value);
        },
    
        _getTextAttr: function () {
            return this.label.innerHTML;
        },
        _setTextAttr: function (value) {
            this.label.innerHTML = value;
        },
    
    
        _getResultAttr: function (value) {
            if (domClass.contains(this.domNode, 'pos')) {
                return 'A';
            }
            else if (domClass.contains(this.domNode, 'neg')) {
                return 'N';
            }
            else {
                return '';
            }
        },
        _setResultAttr: function (value) {
            value = value || '';
            if (value == 'A') {
                domClass.remove(this.domNode, 'neg');
                domClass.add(this.domNode, 'pos');
            }
            else if (value == 'N') {
                domClass.remove(this.domNode, 'pos');
                domClass.add(this.domNode, 'neg');
            }
            else {
                value = '';
                domClass.remove(this.domNode, ['pos', 'neg']);
            };
            if (this.autoNegated) {
                this.autoNegated = false
            };
            this.setAll('result', value);
            this.updateTranscription();
        },
    
        addFinding: function (findingWidget) {
            return this.addElement(findingWidget);
        },
    
        addElement: function (element, relativeTo, position, suspendUpdate, sourceClass) {
            if (domClass.contains(element.domNode, 'finding')) {
                element.moveTo(this.findingListNode, 'last');
                this.phrasing = null;
                if (!this.medcinId) {
                    this.medcinId = element.medcinId;
                    this.nodeKey = element.nodeKey;
                    this.termType = element.termType;
                    this.flags = element.flags;
                    this.set('entryStyle', element.get('entryStyle'));
                };
                element.savedFixedTranscription = element.fixedTranscription || false;
                element.fixedTranscription = true;
                domClass.add(element.domNode, 'subsumed');
                if (sourceClass) {
                    domClass.add(element.domNode, sourceClass);
                };
                return element;
            };
        },
    
        //handled by EditorSelection
        //    merge: function (findingWidgets) {
        //        var result = '';
        //        array.forEach(findingWidgets || [], function (widget) {
        //            if (!result) {
        //                result = widget.get('result');
        //            };
        //            if (domClass.contains(widget.domNode, 'findingGroup')) {
        //                var list = widget.getFindings();
        //                this.merge(list);
        //                widget.dropDelete();
        //            }
        //            else {
        //                this.addElement(widget);
        //            }
        //        }, this);
    
        //        var firstFinding = this.getFirstFinding();
        //        array.forEach(this.sharedProperties, function (propertyName) {
        //            this.set(propertyName, firstFinding.get(propertyName));
        //        }, this);
    
        //        this.set('result', result);
    
        //        this.updateTranscription();
        //    },
    
        unmerge: function () {
            var findings = this.getFindings();
            array.forEach(findings, function (widget) {
                widget.fixedTranscription = widget.savedFixedTranscription || false;
                widget.moveTo(this.domNode, 'before');
                domClass.remove(widget.domNode, 'subsumed');
            }, this);
            this.destroyRecursive();
            return findings;
        },
    
        clear: function () {
            array.forEach(this.getFindings(), function (finding) {
                finding.destroyRecursive();
            });
        },
    
    
        getChildNoteElements: function () {
            return this.getFindings();
        },
    
        getFindings: function () {
            return query('.finding', this.findingListNode).map(registry.byNode);
        },
    
        hasFindings: function () {
            return this.getFindings().length > 0;
        },
    
        getFirstFinding: function () {
            return this.getFindings()[0] || null;
        },
    
        writeChartRecords: function (writer, includeNonEntered) {
            array.forEach(this.getFindings(), function (widget) {
                widget.writeChartRecords(writer, includeNonEntered);
            }, this);
        },
    
        writeNoteAttributes: function (writer, mode) {
            writer.attribute('id', this.elementId || '', '');
            array.forEach(['name', 'prefix', 'result', 'modifier', 'status', 'onset', 'duration', 'episode', 'text', 'overrideTranscription'], function (propName) {
                writer.attribute(StringUtil.toCamelUpper(propName), this.get(propName), '');
            }, this);
        },
    
        setAll: function (name, value) {
            array.forEach(this.getFindings(), function (finding) {
                finding.set(name, value);
            });
        },
    
        updatePhrasing: function () {
            var list = this.getFindings();
            if (!list || list.length == 0) {
                return;
            };
            var context = {
                suppress: {
                    prefix: true,
                    result: true,
                    modifier: true,
                    status: true,
                    onset: true,
                    duration: true,
                    episode: true
                }
            };
    
            var transcriber = new Transcriber();
            var text = '';
            var pos = '';
            var neg = 'no ';
    
            var phrasing = {};
            for (var p in list[0].phrasing) {
                phrasing[p] = list[0].phrasing[p];
            };
    
            for (var n = 0, len = list.length; n < len; n++) {
                list[n].transcribe(context);
                text = list[n].get('text');
                if (n > 0) {
                    if (n == len - 1) {
                        pos += ' and ';
                        neg += ' or ';
                    }
                    else {
                        pos += ', ';
                        neg += ', ';
                    }
                }
                pos += text;
                neg += text;
            };
    
            phrasing['ip'] = pos;
            phrasing['in'] = neg;
            phrasing['dp'] = pos;
            phrasing['dn'] = neg;
    
            this.phrasing = phrasing;
            return phrasing;
        },
    
        transcribe: function (context) {
            if (domClass.contains(this.domNode, 'listHide')) {
                return;
            };
    
            if (this.overrideTranscription && this.get('text')) {
                return;
            };
    
            if (!this.phrasing) {
                this.updatePhrasing();
            };
    
            var t = new Transcriber();
            var text = t.transcribe(this, context);
            if (text) {
                this.set('text', text);
            }
            t = null;
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
            var targetNode = evt.target;
            if (domClass.contains(targetNode, 'innerLabel')) {
                this.toggleResult();
            }
            else if (domClass.contains(targetNode, 'checkbox')) {
                if (domClass.contains(this.domNode, 'chkSingle')) {
                    if (this.dualState) {
                        this.set('result', this.get('result') == 'A' ? '' : 'A');
                    }
                    else {
                        this.toggleResult();
                    }
                }
                else {
                    if (domClass.contains(targetNode, 'left')) {
                        this.set('result', this.get('result') == 'A' ? '' : 'A');
                    }
                    else {
                        this.set('result', this.get('result') == 'N' ? '' : 'N');
                    }
                };
            };
        },
    
        getItem: function (node) {
            var selection = this.getEditorSelection();
            if (selection && selection.containsWidget(this) && selection.getItemCount() > 1) {
                return selection;
            }
            else {
                var item = this;
                item.type = 'findingGroup';
                item.text = this.get('text');
                item.node = this.domNode;
                return item;
            };
        },
    
        _getPreSepAttr: function () {
            return this.preSepNode ? this.preSepNode.innerHTML : '';
        },
        _setPreSepAttr: function (value) {
            if (value) {
                if (!this.preSepNode) {
                    this.preSepNode = domConstruct.place('<div class="preSep"></div>', this.domNode, 'first');
                };
                this.preSepNode.innerHTML = value;
            };
        },
    
        _getPostSepAttr: function () {
            return this.postSepNode ? this.postSepNode.innerHTML : '';
        },
        _setPostSepAttr: function (value) {
            if (value) {
                if (!this.postSepNode) {
                    this.postSepNode = domConstruct.place('<div class="postSep"></div>', this.label, 'after');
                };
                this.postSepNode.innerHTML = value;
            };
        },
    
        _getEntryStyleAttr: function () {
            return this.entryStyle;
        },
        _setEntryStyleAttr: function (value) {
            value = value || '';
            if (this.entryStyle) {
                array.forEach(this.entryStyle.split(' '), function (s) {
                    domClass.remove(this.domNode, s);
                }, this);
            };
            this.dualState = false;
            this.fixedTranscription = false;
            array.forEach(value.split(' '), function (s) {
                switch (s) {
                    case 'chkSingle':
                        if (!this.checkboxLeft) {
                            this.checkboxLeft = domConstruct.place('<div class="checkbox left"></div>', this.label, 'before');
                        };
                        this.dualState = true;
                        this.fixedTranscription = true;
                        break;
                    case 'chkDouble':
                        if (!this.checkboxLeft) {
                            this.checkboxLeft = domConstruct.place('<div class="checkbox left"></div>', this.label, 'before');
                        };
                        if (!this.checkboxRight) {
                            this.checkboxRight = domConstruct.place('<div class="checkbox right"></div>', this.checkboxLeft, 'after');
                        };
                        this.fixedTranscription = true;
                        break;
                    case 'chkStyleYN':
                        this.dualState = false;
                        break;
                    case 'chkStyleSquare':
                        this.dualState = false;
                        break;
                    case 'chkStyleRound':
                        this.dualState = false;
                        break;
                    default:
                        break;
                };
                domClass.add(this.domNode, s);
            }, this);
            this.entryStyle = value;
            this.updateTranscription();
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
    
        toFinding: function () {
            var finding = this.getFirstFinding();
            return finding ? finding.toFinding() : null;
        },
    
        dropDelete: function (source) {
            this.deleteSelf();
            topic.publish('/noteEditor/findingRemoved');
        },
    
    
        _editableText_CanEdit: function () {
            if (!core.settings.enableInlineTextEditing) {
                return false;
            };
    
            if (!this._editableText_TextNode) {
                this._editableText_TextNode = this.label;
            };
    
            return this._editableText_TextNode ? true : false;
        },
    
        _editableText_ApplyChanges: function (newText, originalText) {
            this.set('text', newText);
            this.overrideTranscription = true;
            this.transcribe();
        },
    
        merge: function (other) {
            if (other.domNode && domClass.contains(other.domNode, 'finding')) {
                this.addFinding(other);
            };
            return this;
        },
    
        resetDetails: function () {
            this.set('prefix', '');
            this.set('status', '');
            this.set('modifier', '');
            this.set('value', '');
            this.set('unit', '');
            this.set('onset', '');
            this.set('duration', '');
            this.set('episode', '');
            this.set('notation', '');
            this.set('specifier', '');
            this.set('timing', '');
            this.set('notApplicable', false);
            this.set('result', '');
        }
    
    
    
    });

    core.settings.noteElementClasses["qc/note/FindingGroup"] = FindingGroup;

	return FindingGroup;
});