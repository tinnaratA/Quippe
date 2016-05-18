define([
    "qc/coding/CodingManager",
    "qc/coding/EntryPanel",
    "qc/TaskPane",
    "dojo/_base/array",
    "dojo/_base/declare",
	"dojo/_base/lang",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/when",
    "qc/_core"
], function (CodingManager, EntryPanel, TaskPane, array, declare, lang, domClass, topic, when, core) {
    return declare("qc.coding.SingleVocabTaskPane", [TaskPane], {
        name: 'Coding',
        title: 'Coding',
        subscriptions: null,
        panel: null,
        vocab: '',

        _onEnabled: function () {
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onSelectionChanged)),
                    topic.subscribe("/coding/CodeChanged", lang.hitch(this, this.onCodeChanged)),
                    topic.subscribe('/qc/SettingsChanged', lang.hitch(this, this.onSettingsChanged)),
					topic.subscribe('/qc/FindingDetailsUpdated', lang.hitch(this, this.onFindingDetailsUpdated)),
					topic.subscribe('/qc/DragDropComplete', lang.hitch(this, this.onDragAndDropComplete)),
					topic.subscribe('/qc/FindingResultChanged', lang.hitch(this, this.onFindingResultChanged))
                ];

                topic.subscribe("/qc/WorkspaceReset", lang.hitch(this, this.onWorkspaceReset));

                var editor = core.getNoteEditor();
                if (editor) {
                    this.onSelectionChanged(editor.selection.getSelectedWidget());
                };
            };
        },

        onFindingResultChanged: function (findingWidget) {
            if (findingWidget != this.findingWidget) {
                return;
            }

            if (!findingWidget.codingInfo || !findingWidget.codingInfo[this.vocab] || findingWidget.codingInfo[this.vocab].isQualified) {
                this.onSelectionChanged(findingWidget, true);
            }
        },

        onDragAndDropComplete: function () {
            if (this.findingWidget) {
                this.onSelectionChanged(this.findingWidget, true);
            }
        },

        _onDisabled: function () {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            };
        },

        onFindingDetailsUpdated: function (widget) {
            this.onSelectionChanged(widget, true);
        },

        onSelectionChanged: function (widget, force) {
            var vocab = this.vocab;
            if (!vocab) {
                return;
            };

            if (!widget || !widget.domNode || (!domClass.contains(widget.domNode, 'finding') && !domClass.contains(widget.domNode, 'externalEntry'))) {
                this.set('open', false);
                return;
            };

            if (widget == this.findingWidget && !force) {
                return;
            };

            this.findingWidget = widget;
            var self = this;
            when(CodingManager.mapFinding(widget, vocab), function (isMapped) {
                self.clear();
                var panel = CodingManager.getEntryPanel(vocab, widget);
                if (panel) {
                    panel.owner = self;
                    panel.applyImmediate = true;
                    panel.placeAt(self.containerNode);
                    self.panel = panel;
                    self.set('open', true);
                    return true;
                }
                else {
                    self.set('open', false);
                    return false;
                };
            });
        },

        onWorkspaceReset: function () {
            this.clear();
        },

        onCodeChanged: function (findingWidget, vocabName, entry, owner) {
            if (owner && owner.id != this.id && findingWidget && this.findingWidget && findingWidget.id == this.findingWidget.id) {
                this.onSelectionChanged(findingWidget, true);
            };
        },

        onSettingsChanged: function () {
            if (this.findingWidget) {
                this.onSelectionChanged(this.findingWidget, true);
            };
        },

        clear: function () {
            this.findingWidget = null;
            if (this.panel) {
                this.panel.destroyRecursive();
                this.panel = null;
            };
        },

        getUserSettings: function () {
            var vocabs = CodingManager.vocabularies.map(function(v) {return {id:v.name, text:v.caption || v.name}});
            var list = this.inherited(arguments);
            list.push({ name: 'vocab', caption: 'Vocabulary', options: vocabs });
            return list;
        }
    });
});