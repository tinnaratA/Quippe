define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/request",
    "dojo/topic",
    "qc/TaskPane",
    "qc/_core"
], function (declare, array, lang, domStyle, request, topic, TaskPane, core) {
    var typeDef = declare('qc.taskbar.TranslationPane', [TaskPane], {
        subscriptions: null,
        name: 'translationPane',
        title: 'Translation',
        modes: ['standard'],
        hDef: null,
        culture: 'th-TH',
        open: true,
        description: 'Shows the currently selected note finding in the selected language when available',

        _setCultureAttr: function (value) {
            this.clear();
            this.culture = value;
        },


        _onEnabled: function () {
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onSelectionChanged))
                ];
            };
            this.onSelectionChanged();
        },

        _onDisabled: function () {
            this.clear();
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            }
        },

        clear: function () {
            this.containerNode.innerHTML = '';
        },

        onSelectionChanged: function () {
            var self = this;
            if (this.hDef) {
                this.hDef.cancel();
            };
            var widget = core.getNoteEditor().selection.getSelectedWidgets()[0];
            var medcinId = widget ? widget.medcinId || 0 : 0;
            var filled = this.get('fill');
            if (medcinId) {
                var polarity = widget.get('result') == 'N' ? 'negative' : 'positive';
                this.hDef = request.get(core.serviceURL('Quippe/TextService/ConceptPhrase/' + medcinId), {
                    query: { culture: this.culture, dataFormat: 'JSON' },
                    handleAs: 'json'
                }).then(function (data) {
                    var text = lang.getObject('conceptPhrase.' + polarity + '.text', false, data) || '';
                    self.containerNode.innerHTML = text;
                    if (text) {
                        if (!filled) {
                            domStyle.set(self.domNode, { display: 'block' });
                        }
                    }
                    else {
                        if (!filled) {
                            domStyle.set(self.domNode, { display: 'none' });
                        }
                    };
                }, function () { })
            }
            else {
                self.containerNode.innerHTML = '';
                if (!filled) {
                    domStyle.set(self.domNode, { display: 'none' });
                };
            };

        },

        getUserSettings: function () {
            var list = this.inherited(arguments);
            list.push({ name: 'culture', options: 'Quippe/TextService/AvailableCultures' });
            return list;
        }
    });

    return typeDef;
});