define([
    "qc/coding/_CodeEntryBlock",
    "qc/coding/_NullCodeEntryBlock",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/topic",
    "qc/_core"
], function (_CodeEntryBlock, _NullCodeEntryBlock, _TemplatedMixin, _WidgetBase, registry, array, declare, domClass, domConstruct, query, topic, core) {
    return declare("qc.coding.EntryPanel", [_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="qcCodingEntryPanel"></div>',
        findingWidget: null,
        vocabName: '',
        applyImmediate: false,
        owner: null,
    
        _getVocabNameAttr: function () {
            return this.vocabName;
        },
        _setVocabNameAttr: function (value) {
            if (this.vocabName) {
                domClass.remove(this.domNode, this.vocabName);
            };
            domClass.add(this.domNode, value);
            this.vocabName = value;
        },
    
        render: function (findingWidget) {
            if (!this.vocabName) {
                return false;
            };
    
            if (this.vocabName == 'medcin') {
                return false;
            };
    
            if (!findingWidget) {
                return false;
            };
    
            if (!findingWidget.codingInfo) {
                return false;
            };
    
            if (!findingWidget.codingInfo[this.vocabName]) {
                return false;
            };
    
            this.findingWidget = findingWidget;
            var currentEntry = findingWidget.codes ? findingWidget.codes[this.vocabName] || null : null;
            var mapEntries = core.forceArray(findingWidget.codingInfo[this.vocabName]);
    
            return this.renderMap(mapEntries, currentEntry);
        },
    
        renderMap: function (mapEntries, currentEntry) {
            var vocabName = this.vocabName;
            var contentArea = this.domNode;
            var entryBlock = null;
            var count = 0;
    
            array.forEach(mapEntries, function (mapEntry) {
                entryBlock = new _CodeEntryBlock();
                entryBlock.loadEntry(mapEntry, vocabName, this, currentEntry);
                entryBlock.placeAt(contentArea);
                count++;
            }, this);

            if (!this.findingWidget.readOnlyCodes) {
                entryBlock = new _NullCodeEntryBlock();
                entryBlock.loadEntry(null, vocabName, this, currentEntry);
                entryBlock.placeAt(contentArea);
            }

            return (count > 0);
        },
    
        clear: function () {
            query('.qcCodeEntryBlock', this.domNode).map(registry.byNode).forEach(function (x) { x.destroyRecursive() });
            domConstruct.empty(this.domNode);
        },
    
        resetEntries: function () {
            query('.qcCodeEntryBlock', this.domNode).map(registry.byNode).forEach(function (x) { x.set('selected', false) });
            query('.expanded', this.domNode).removeClass('expanded');
        },
    
        collapseAll: function () {
            query('.expanded', this.domNode).removeClass('expanded');
        },
    
        reposition: function () {
        },
    
        onOptionChanged: function (entryBlock, selected) {
            this.reposition();
            if (selected && this.applyImmediate) {
                this.applyCode();
            };
        },
    
        onReplacementSelected: function (replacementTerm) {
            if (replacementTerm && this.findingWidget && this.findingWidget.domNode) {
                replacementTerm.result = this.findingWidget.get('result') || '';
                replacementTerm.prefix = this.findingWidget.get('prefix') || '';
                var newTerm = this.findingWidget.toFinding();
                for (var p in replacementTerm) {
                    newTerm[p] = replacementTerm[p];
                };
                newTerm.type = 'term';
                this.findingWidget.set('result', '');
                topic.publish('/qc/AddToNote', newTerm, this.findingWidget.domNode, 'after');
            };
            if (this.owner.onApply) {
                this.owner.onApply();
            };
        },
    
        applyCode: function () {
            if (!this.findingWidget) {
                return;
            };
    
            if (!this.vocabName) {
                return;
            };
    
            var selectedEntryWidget = query('.qcCodeEntryBlock.selected', this.domNode).map(registry.byNode)[0] || null;
            if (!selectedEntryWidget) {
                return;
            };
    
            var item = selectedEntryWidget.mapEntry;
            var entry = {
                vocab: this.vocabName,
                code: item.resolvedCode || item.code,
                description: item.description
            };
            if (item.selectedSpecifiers) {
                entry.baseCode = item.baseCode || item.code;
                entry.specifiers = item.selectedSpecifiers;
            };
            entry.unreportable = selectedEntryWidget.isUnreportable();
            if (!this.findingWidget.codes) {
                this.findingWidget.codes = {};
            };
            if (item.expression) {
                entry.expression = item.expression;
            };
            if (item.qualifier) {
                entry.qualifiers = core.forceArray(item.qualifier);
            };
            this.findingWidget.codes[this.vocabName] = entry;
    
    
            if (entry.vocab == 'icd10') {
                if (entry.code) {
                    if (core.settings.icd10OverrideText) {
                        this.findingWidget.set('text', [item.description.toLowerCase(), this.getSpecText(item.selectedSpecifiers), this.getUserNotation(this.findingWidget.get('notation'))].join(' '));
                        this.findingWidget.overrideTranscription = true;
                        this.findingWidget.updateTranscription();
                    }
                    else if (core.settings.icd10AppendSpecifierText) {
                        this.findingWidget.set('notation', [this.getSpecNotation(item.selectedSpecifiers), this.getUserNotation(this.findingWidget.get('notation'))].join(' '));
                        this.findingWidget.updateTranscription();
                    }
                }
                else {
                    this.findingWidget.set('notation', this.getUserNotation(this.findingWidget.get('notation')));
                    this.findingWidget.overrideTranscription = false;
                    this.findingWidget.updateTranscription();
                };
            }
            else if (entry.vocab == 'dsm' && item.selectedSpecifiers) {
                this.findingWidget.set('notation', [this.getSpecNotation(item.selectedSpecifiers), this.getUserNotation(this.findingWidget.get('notation'))].join(' '));
                this.findingWidget.updateTranscription();
            };
    
			// todo: *las* changing entry to "do not code" in either the coding review panel or the task panel does not keep the other UI element in sync.  potential bug?
            topic.publish('/coding/CodeChanged', this.findingWidget, this.vocabName, entry, this.owner);
        },
    
        getUserNotation: function (notation) {
            if (!notation) {
                return '';
            };
    
            var src = notation.split('');
            var srcLen = src.length;
            var buf = [];
            var state = 0;
            var c = 0;
            while (c < srcLen) {
                switch (state) {
                    case 0:
                        if (src[c] == '{') {
                            state = 1;
                        }
                        else {
                            buf.push(src[c]);
                        }
                        break;
                    case 1:
                        if (src[c] == '}') {
                            state = 0;
                        }
                        else {
                            //skip
                        }
                        break;
                    default:
                        break;
                };
                c++;
            };
            return buf.join('');
        },
    
        getSpecText: function (specifiers) {
            return array.map(this.getSortedSpecifierList(specifiers), function (item) {
                return item.description
            }).join(', ') || '';
        },
    
        getSpecNotation: function (specifiers) {
            return array.map(this.getSortedSpecifierList(specifiers), function (item) {
                return '{CodeSpec' + item.id + ':' + item.description.toLowerCase() + '}'
            }).join('') || '';
        },
    
        getSortedSpecifierList: function (specifiers) {
            var list = [];
            var n = 10;
            for (var s in specifiers) {
                if (specifiers[s].digit) {
                    list[specifiers[s].digit] = specifiers[s];
                }
                else {
                    list[n] = specifiers[s];
                    n++;
                };
            };
            return array.filter(list, function (item) { return item != undefined });
        }
    });
});