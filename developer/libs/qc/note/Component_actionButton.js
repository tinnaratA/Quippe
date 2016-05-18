define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/request",
    "dojo/topic",
    "qc/_core",
    "qc/note/Component"
], function (declare, lang, domClass, domConstruct, on, request, topic, core, Component) {
    return declare("qc.note.Component_actionButton", [Component], {
        text: "...",

        createNode: function () {
            var domNode = this.inherited(arguments);

            this.button = domConstruct.create("div", { innerHTML: this.text }, domNode);

            domClass.add(this.button, "actionButton");
            on(this.button, "click", lang.hitch(this, this.onButtonClick));

            this.domNode = domNode;

            return domNode;
        },

        getPropertyDefs: function () {
            var list = [];

            list.push({ name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true });
            list.push({ name: 'styleClass', group: 'Style' });
            list.push({ name: 'action', group: 'Behavior', options: '[=None;launchForm=Launch Form;mergeContent=Merge Content;navigate=Open URL;showProperties=Open Finding Properties]', reloadOnChange: true });
            list.push({ name: 'text', caption: 'Text', group: 'Data', value: '...' });

            switch (this.action) {
                case 'navigate':
                    list.push({ name: 'href', caption: 'URL', group: 'Data' });
                    list.push({ name: 'targetName', caption: 'Target Window Name', group: 'Data' });
                    break;
                case 'launchForm':
                    list.push({ name: 'contentId', caption: 'Form Id', group: 'Data' });
                    break;
                case 'mergeContent':
                    list.push({ name: 'contentId', group: 'Data' });
                    break;
                default:
                    break;
            };

            return list;
        },

        onButtonClick: function (evt) {
            if (core.getNoteEditor().viewMode == 'design') {
            }

            else if (this.action == 'navigate') {
                if (this.href) {
                    window.open(this.href, this.targetName || '_blank', '', false);
                }
            }

            else if (this.action == 'launchForm') {
                if (this.contentId) {
                    topic.publish('/qc/ShowEntryForm', this.contentId);
                }
            }

            else if (this.action == 'mergeContent') {
                if (this.contentId) {
                    request.get(core.serviceURL('Quippe/ContentLibrary/Info'), {
                        query: { id: this.contentId, dataFormat: 'JSON' },
                        handleAs: 'json'
                    }).then(function (data) {
                        if (data.item) {
                            topic.publish('/qc/AddToNote', data.item);
                        }

                        else if (data.message) {
                            core.showError(data.message);
                        }
                    }, core.showError);
                }
            }

            else if (this.action == 'showProperties') {
                topic.publish('/qc/EditFindingDetails', this.getOwner().getItem());
            }
        }

    });
});