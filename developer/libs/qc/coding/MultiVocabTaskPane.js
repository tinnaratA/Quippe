define([
    "qc/coding/CodingManager",
    "qc/coding/EntryPanel",
    "qc/TaskPane",
    "dojo/_base/array",
    "dojo/_base/declare",
	"dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/query",
    "dojo/topic",
    "dojo/when",
    "dijit/registry",
    "qc/_core"
], function (CodingManager, EntryPanel, TaskPane, array, declare, lang, domClass, domConstruct, domStyle, query, topic, when, registry, core) {
    return declare("qc.coding.MultiVocabTaskPane", [TaskPane], {
        name: 'Coding',
        title: 'Coding',
        subscriptions: null,
        vocabs: '',

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
            };

            this.onSelectionChanged(findingWidget, true);
        },

        onDragAndDropComplete: function () {
            if (this.findingWidget) {
                this.onSelectionChanged(this.findingWidget, true);
            };
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
            if (this.hTimer) {
                clearTimeout(this.hTimer);
            };
            this.hTimer = setTimeout(lang.hitch(this, function () {
                this._onSelectionChanged(widget, force);
            }), 10);
        },

        _onSelectionChanged: function (widget, force) {
            if (!this.vocabs) {
                return;
            };

            var vocabs = this.vocabs.split(',');

            if (!widget || !widget.domNode || (!domClass.contains(widget.domNode, 'finding') && !domClass.contains(widget.domNode, 'externalEntry'))) {
                this.set('isEmpty', true);
                this.clear();
                return;
            };

            if (widget == this.findingWidget && !force) {
                return;
            };

            this.findingWidget = widget;
            var self = this;
            when(CodingManager.mapFinding(widget, vocabs, force), function (isMapped) {
                var panel = null;
                var count = 0;
                self.clear();
                for (var v in widget.codingInfo) {
                    if (widget.codingInfo[v] instanceof Array && widget.codingInfo[v].length > 0) {
                        panel = CodingManager.getEntryPanel(v, widget);
                        if (panel) {
                            domConstruct.place('<div style="font-weight:bold;margin-top:8px;">' + CodingManager.vocab(v).caption + '</div>', self.containerNode)
                            panel.owner = self;
                            panel.applyImmediate = true;
                            panel.placeAt(self.containerNode);
                            count++;
                        };
                    };
                };
                self.set('isEmpty', count == 0);
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
            query('.qcCodingEntryPanel', this.containerNode).map(registry.byNode).forEach(function (x) {
                x.destroyRecursive();
            });
            this.containerNode.innerHTML = '';;
        },

        getUserSettings: function () {
            var vocabs = CodingManager.vocabularies.map(function (v) { return { id: v.name, text: v.caption || v.name } });
            var list = this.inherited(arguments);
            list.push({ name: 'vocabs', caption: 'Vocabularies', options: vocabs, multipleChoice: true });
            return list;
        }
    });
});