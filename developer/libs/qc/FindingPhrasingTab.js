define([
    "qc/FindingTab",
    "qc/Transcriber",
    "qc/OptionList",
    "qc/PhraseEditorDialog",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/text!qc/templates/FindingPhrasingTab.htm",
    "qc/_core"
], function (FindingTab, Transcriber, OptionList, PhraseEditorDialog, _WidgetsInTemplateMixin, array, declare, lang, domConstruct, domStyle, on, FindingPhrasingTabTemplate, core) {
    return declare("qc.FindingPhrasingTab", [FindingTab, _WidgetsInTemplateMixin], {
        title: 'Phrasing',
        templateString: FindingPhrasingTabTemplate,

        startup: function () {
            if (!this._started) {
                this.phraseList.onItemClick = lang.hitch(this, function (item) {
                    array.forEach(this.phraseList.getChildren(), function (child) {
                        child.set('icon', child.id == item.id ? 'check' : '');
                    });
                });

                this.inherited(arguments);
            };
        },

        setFinding: function (finding) {
            var phraseList = this.phraseList;

            phraseList.clear();

            if (!finding) {
                return;
            }

            if (!finding.medcinId) {
                return;
            };

            this.finding = finding;

            this.updateText();

            if (core.settings.phrasingAllowOverride) {
                domStyle.set(this.overrideNode, 'display', 'block');
                this.chkOverrideTranscription.set("checked", finding.overrideTranscription);
                this.txtTranscription.setAttribute("disabled", !finding.overrideTranscription);
                on(this.chkOverrideTranscription, "Change", lang.hitch(this, this.onOverrideChanged));
                if (finding.overrideTranscription) {
                    this.txtTranscription.set('value', finding.get('text'));
                };
            }
            else {
                domStyle.set(this.overrideNode, 'display', 'none');
                this.txtTranscription.setAttribute("disabled", "true");
            };

            domStyle.set(this.editorLink, 'display', core.settings.phrasingAllowEdit ? 'block' : 'none');

            this.loadAltPhrases(finding);

        },

        loadAltPhrases: function (finding) {
            var phraseList = this.phraseList;

            phraseList.clear();

            if (!finding) {
                return null;
            }

            if (!finding.medcinId) {
                return null;
            };

            var currentText = finding.phrasing && finding.phrasing.ip && !finding.overrideTranscription ? finding.phrasing.ip : '';
            return core.xhrGet({
            	url: core.serviceURL('Quippe/TextService/ConceptPhrases/' + finding.medcinId),
            	content: { Usage: 7, DataFormat: 'JSON' , culture: core.settings.culture},
            	handleAs: 'json',
            	preventCache: true,
            	error: core.showError,
            	load: function (data, ioArgs) {
            		var s = 0;
            		var selectedId = -1;

            		var cpList = [];
            		array.forEach(core.forceArray(data.conceptPhrases), function (phrase) {
            			s = phrase.sequence;
            			if (!cpList[s]) {
            				cpList[s] = {
            					id: s
            				};
            			};
            			if (phrase.usage & 1) {
            				cpList[s].indPos = phrase.positive;
            				cpList[s].indNeg = phrase.negative;

            				if (phrase.positive == currentText) {
            					selectedId = s;
            				};
            			};
            			if (phrase.usage & 2) {
            				cpList[s].depPos = phrase.positive;
            				cpList[s].depNeg = phrase.negative;
            			};
            		});

            		array.forEach(cpList, function (cp) {
            			if (cp) {
            				phraseList.addItem({
            					id: cp.id,
            					text: cp.indPos || cp.indNeg || cp.id,
            					phrase: cp
            				});
            			};
            		});

            		if (selectedId < 0) {
            		    selectedId = 0;
            		};
            		phraseList.selectItem(selectedId);
            	}
            });
        },

        clear: function () {
            domConstruct.empty(this.phraseListNode);
        },

        onOKClick: function () {
            if (!this.finding) {
                return;
            };

            this.finding.overrideTranscription = this.chkOverrideTranscription.get('checked');
            if (this.finding.overrideTranscription) {
                this.finding.set('text', this.txtTranscription.get('value'));
            }
            else {
                var item = this.phraseList.getSelectedItem();
                if (item && item.phrase) {
                	if (!this.isSamePhrase(item.phrase, this.finding.phrasing)) {
						if (!this.finding.phrasing) {
							this.finding.phrasing = {};
						}

                        this.finding.phrasing['ip'] = item.phrase.indPos;
                        this.finding.phrasing['in'] = item.phrase.indNeg;
                        this.finding.phrasing['dp'] = item.phrase.depPos || item.phrase.indPos;
                        this.finding.phrasing['dn'] = item.phrase.depNeg || item.phrase.indNeg;
                        this.finding.phrasing.isAlternate = (item.phrase.id != 0);
                    };
                };
            };

        },

        isSamePhrase: function(phraseItem, findingPhrase) {
            return (phraseItem && findingPhrase)
                && (phraseItem['indPos'] === findingPhrase['ip'])
                && (phraseItem['indNeg'] === findingPhrase['in'])
                && (phraseItem['depPos'] === findingPhrase['dp'])
                && (phraseItem['depNeg'] === findingPhrase['dn']);
        },

        onEditClick: function () {
            if (!this.editorDialog) {
                this.editorDialog = new PhraseEditorDialog();
                this.editorDialog.caller = this;
            };
            this.editorDialog.loadPhrases(this.finding.medcinId);
            this.editorDialog.show();
        },

        onOverrideChanged: function () {
            var override = this.chkOverrideTranscription.get('value');
            if (override) {
                this.txtTranscription.setAttribute('disabled', false);
            }
            else {
                this.updateText();
                this.txtTranscription.setAttribute('disabled', true);
            };
        },

        onAltPhraseSelected: function () {
            this.updateText();
        },

        updateDisplay: function () {
            this.updateText();
        },

        updateText: function () {
            if (this.chkOverrideTranscription.get('checked')) {
                return;
            };

            var text = '';

            var finding = null;

            if (this.owner) {
                var detailTab = this.owner.defaultTab;
                if (detailTab && detailTab.getModifiedFinding) {
                    finding = detailTab.getModifiedFinding();
                };
            };

            if (!finding) {
                //finding = lang.clone(this.finding);
                finding = this.finding.duplicate(true);
            };

            if (finding) {
                var item = this.phraseList.getSelectedItem();
                if (item && item.phrase) {
					if (!finding.phrasing) {
						finding.phrasing = {};
					}

                    finding.phrasing['ip'] = item.phrase.indPos;
                    finding.phrasing['in'] = item.phrase.indNeg;
                    finding.phrasing['dp'] = item.phrase.depPos;
                    finding.phrasing['dn'] = item.phrase.depNeg;
                };
                var t = new Transcriber();
                text = t.transcribe(finding);
            };

            this.txtTranscription.set('value', text);
        }
    });
});