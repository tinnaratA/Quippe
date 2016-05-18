define([
    "dojo/_base/declare",
    "qc/coding/SingleVocabTaskPane"
], function (declare, SingleVocabTaskPane) {
    return declare("qc.coding.CodingTaskPaneICD10", [SingleVocabTaskPane], {
        title: 'ICD-10-CM',
        vocab: 'icd10',

        getUserSettings: function () {
            return this.inherited(arguments).filter(function (x) { return x.name != 'vocab' });
        }
    });
});
/*
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
    return declare("qc.coding.CodingTaskPaneICD10", [TaskPane], {
        name: 'CodeEntryICD10',
        title: 'ICD-10-CM',
        subscriptions: null,
        panel: null,
    
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
            };
        },

        onFindingResultChanged: function(findingWidget) {
			if (findingWidget != this.findingWidget) {
				return;
			}

	        if (!findingWidget.codingInfo || !findingWidget.codingInfo['icd10'] || findingWidget.codingInfo['icd10'].isQualified) {
		        this.onSelectionChanged(findingWidget, true);
	        }
        },

		onDragAndDropComplete: function() {
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

		onFindingDetailsUpdated: function(widget) {
			this.onSelectionChanged(widget, true);
		},
    
        onSelectionChanged: function (widget, force) {
            if (!widget || !widget.domNode || !domClass.contains(widget.domNode, 'finding')) {
                this.set('open', false);
                return;
            };

			if (widget == this.findingWidget && !force) {
				return;
			}
    
            //TODO: only assements + entered + diagnosis????
    
            this.findingWidget = widget;
            var self = this;
            when(CodingManager.mapFinding(widget, 'icd10'), function (isMapped) {
                self.clear();
                var panel = CodingManager.getEntryPanel('icd10', widget);
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
            if (this.panel) {
                this.panel.destroyRecursive();
                this.panel = null;
            };
        }
    });
});
*/