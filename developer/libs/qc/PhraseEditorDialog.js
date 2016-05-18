define([
    "qc/Dialog",
    "qc/WordUtil",
    "qc/XmlWriter",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/text!qc/templates/PhraseEditorDialog.htm",
    "qc/_core",
	"dojo/request"
], function (Dialog, WordUtil, XmlWriter, _WidgetsInTemplateMixin, array, declare, lang, domConstruct, PhraseEditorDialogTemplate, core, request) {
    return declare("qc.PhraseEditorDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: 'Phrase Editor',
        templateString: PhraseEditorDialogTemplate,

        medcinId: 0,
        currentId: '',
        nextId: 0,
        originalList: null,

        startup: function () {
            if (!this._started) {
                this.lvPhrases.viewMode = 'simple';
                this.lvPhrases.onItemClick = lang.hitch(this, this.onPhraseListItemClick);
                this.lvPhrases.onSelectionChanged = lang.hitch(this, this.onPhraseListSelectionChanged);
                this.inherited(arguments);
            };
        },

        loadPhrases: function (medcinId) {
            this.medcinId = medcinId;

            this.lvPhrases.clear();

            var self = this;
            core.xhrGet({
                url: core.serviceURL('Quippe/TextService/PhraseOverrides'),
                content: { MedcinId: medcinId, Usage: 3, DataFormat: 'JSON', culture: core.settings.culture },
                preventCache: true,
                handleAs: 'json',
                error: core.showError,
                load: function (data, ioArgs) {
                    var list = [];
                    var seq = -1;
                    var li = null;
                    array.forEach(core.forceArray(data.conceptPhrases), function (phrase) {
                        seq = phrase.sequence;
                        if (!list[seq]) {
                            list[seq] = {
                                id: 'P' + seq,
                                text: phrase.positive
                            };
                        };
                        if (phrase.usage & 1) {
                            list[seq].indPos = phrase.positive;
                            list[seq].indNeg = WordUtil.apply(phrase.positive, phrase.negative)
                        };
                        if (phrase.usage & 2) {
                            list[seq].depPos = phrase.positive;
                            list[seq].depNeg = WordUtil.apply(phrase.positive, phrase.negative)
                        };
                    });

                    self.originalList = list;
                    self.currentId = '';
                    for (var n = 0; n < list.length; n++) {
                        if (list[n]) {
                            li = self.lvPhrases.addItem(lang.clone(list[n]));
                            if (n == 0) {
                                self.lvPhrases.setSelectedItem(li);
                            };
                        };
                    };
                    self.checkState();
                }
            });
        },

        onPhraseListItemClick: function (item) {
            var selectedItem = this.lvPhrases.getSelectedItem();
            if (!selectedItem) {
                this.lvPhrases.setSelectedItem(item);
            };
        },

        onPhraseListSelectionChanged: function () {
            this.saveChanges();
            this.checkState();
            this.currentId = '';
            var item = this.lvPhrases.getSelectedItem();
            if (!item) {
                this.txtIndPos.set('value', '');
                this.txtIndNeg.set('value', '');
                this.txtDepPos.set('value', '');
                this.txtDepNeg.set('value', '');
                return;
            };

            this.txtIndPos.set('value', item.data.indPos);
            this.txtIndNeg.set('value', item.data.indNeg);
            this.txtDepPos.set('value', item.data.depPos);
            this.txtDepNeg.set('value', item.data.depNeg);
            this.currentId = item.data.id;

        },

        doNewPhrase: function () {
            var item = {
                id: this.getNewId(),
                text: 'New Phrase',
                indPos: '',
                indNeg: '',
                depPos: '',
                depNeg: ''
            };
            var li = this.lvPhrases.addItem(item);
            this.lvPhrases.setSelectedItem(li);
        },

        doDeletePhrase: function () {
            var item = this.lvPhrases.getSelectedItem();
            if (item) {
                var index = this.lvPhrases.getItemIndex(item.data.id);
                this.lvPhrases.removeChild(item);
                this.currentId = '';
                var items = this.lvPhrases.getChildren();
                while (index >= items.length) {
                    index--;
                };
                if (index >= 0) {
                    this.lvPhrases.setSelectedItem(items[index]);
                };
            };
        },

        doMoveUp: function () {
            var item = this.lvPhrases.getSelectedItem();
            if (!item) {
                return;
            };

            var items = this.lvPhrases.getChildren();
            var targetIndex = this.lvPhrases.getItemIndex(item.data.id);
            if (targetIndex > 0) {
                domConstruct.place(items[targetIndex].domNode, items[targetIndex - 1].domNode, 'before');
            };
            this.checkState();
        },

        doMoveDown: function () {
            var item = this.lvPhrases.getSelectedItem();
            if (!item) {
                return;
            };

            var items = this.lvPhrases.getChildren();
            var targetIndex = this.lvPhrases.getItemIndex(item.data.id);
            if (targetIndex >= 0 && targetIndex < items.length - 1) {
                domConstruct.place(items[targetIndex].domNode, items[targetIndex + 1].domNode, 'after');
            };
            this.checkState();
        },

        doReset: function () {
            var self = this;
            request(core.serviceURL('Quippe/TextService/PhraseOverrideReset?DataFormat=JSON&Culture=' + core.settings.culture), {
                data: { MedcinId: self.medcinId },
                handleAs: 'json',
				method: 'POST'
            }).then(function(data) {
                self.loadPhrases(self.medcinId);
                if (self.caller && self.caller.finding) {
                    self.caller.loadAltPhrases(self.caller.finding);
                };
            }, function(err) {
                core.showError(err);
            });
         },

        onOKClick: function () {
            var self = this;
            var n = 0;
            var orig = this.originalList;
            var changed = false;
            var medcinId = this.medcinId;
            var split = false;

            var list = array.map(this.lvPhrases.getChildren(), function (li) {
                return {
                    indPos: li.data.indPos,
                    indNeg: li.data.indNeg,
                    depPos: li.data.depPos,
                    depNeg: li.data.depNeg
                };
            });

            if (!orig || orig.length == 0) {
                changed = true;
            };

            if (!changed && list.length != orig.length) {
                changed = true;
            };

            if (!changed) {
                for (var n = 0, len = list.length; n < len; n++) {
                    if (list[n].indPos != orig[n].indPos
                     || list[n].indNeg != orig[n].indNeg
                     || list[n].depPos != orig[n].depPos
                     || list[n].depNeg != orig[n].depNeg
                    ) {
                        changed = true;
                        break;
                    };
                };
            };

            if (changed) {
                var writer = new XmlWriter();
                writer.beginElement('ConceptPhrases');
                n = 0;
                array.forEach(list, function (item) {
                    split = !(item.indPos == item.depPos && item.indNeg == item.depNeg)
                    if (split) {
                        writer.beginElement('ConceptPhrase');
                        writer.attribute('MedcinId', medcinId);
                        writer.attribute('Sequence', n);
                        writer.attribute('Usage', 1);
                        writer.attribute('Positive', item.indPos);
                        writer.attribute('Negative', item.indNeg);
                        writer.endElement();
                        writer.beginElement('ConceptPhrase');
                        writer.attribute('MedcinId', medcinId);
                        writer.attribute('Sequence', n);
                        writer.attribute('Usage', 2);
                        writer.attribute('Positive', item.depPos);
                        writer.attribute('Negative', item.depNeg);
                        writer.endElement();
                    }
                    else {
                        writer.beginElement('ConceptPhrase');
                        writer.attribute('MedcinId', medcinId);
                        writer.attribute('Sequence', n);
                        writer.attribute('Usage', 3);
                        writer.attribute('Positive', item.indPos);
                        writer.attribute('Negative', item.indNeg);
                        writer.endElement();
                    };
                    n++;
                });
                writer.endElement();
                var xml = writer.toString();

                request(core.serviceURL('Quippe/TextService/PhraseOverrides?DataFormat=JSON&Culture=' + core.settings.culture), {
                	data: { Data: xml },
					method: 'POST',
                    handleAs: 'json'
                }).then(function(data) {
                    if (self.caller && self.caller.finding) {
                        self.caller.loadAltPhrases(self.caller.finding);
                    };
                    self.hide();
                }, function(err) {
                    core.showError(err)
                });
            }
            else {
                this.hide();
            };

        },

        onCancelClick: function () {
            this.hide();
        },

        autoNegate: function (phrase) {
            return WordUtil.autoNegate(phrase);
        },

        checkState: function () {
            var item = this.lvPhrases.getSelectedItem();
            if (!item) {
                this.tbDeletePhrase.set('disabled', true);
                this.tbMoveUp.set('disabled', true);
                this.tbMoveDown.set('disabled', true);
                return;
            };


            var index = this.lvPhrases.getItemIndex(item.data.id);
            var count = this.lvPhrases.getItemCount();

            this.tbDeletePhrase.set('disabled', (count <= 1));
            this.tbMoveUp.set('disabled', (index <= 0));
            this.tbMoveDown.set('disabled', (index >= count - 1));
        },

        renumberItems: function () {
            var seq = 0;
            array.forEach(this.lvPhrases.getChildren(), function (li) {
                li.data.id = seq;
                li.data.sequence = seq;
                seq++;
            });
        },

        getNewId: function () {
            this.nextId++;
            return 'N' + this.nextId;
        },

        saveChanges: function () {
            if (!this.txtIndPos.get('value')) {
                return;
            };

            if (!this.txtIndNeg.get('value')) {
                this.txtIndNeg.set('value', this.autoNegate(this.txtIndPos.get('value')));
            };

            if (!this.txtDepPos.get('value')) {
                this.txtDepPos.set('value', this.txtIndPos.get('value'));
            };

            if (!this.txtDepNeg.get('value')) {
                this.txtDepNeg.set('value', this.autoNegate(this.txtDepPos.get('value')));
            };

            if (this.currentId) {
                var currentItem = this.lvPhrases.getItem(this.currentId);
                if (currentItem) {
                    currentItem.data.indPos = this.txtIndPos.get('value');
                    currentItem.data.indNeg = this.txtIndNeg.get('value');
                    currentItem.data.depPos = this.txtDepPos.get('value');
                    currentItem.data.depNeg = this.txtDepNeg.get('value');
                    currentItem.set('caption', currentItem.data.indPos);
                };
            };
        }
    });
});