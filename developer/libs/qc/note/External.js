define([
    "qc/note/_EditableTextMixin",
    "qc/note/_Element",
    "qc/note/_SelectableMixin",
    "qc/_ContextMenuContainer",
    "qc/_core",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/query",
    "dojo/topic"
], function (_EditableTextMixin, _Element, _SelectableMixin, _ContextMenuContainer, core, array, declare, domClass, query, topic) {
    var External = declare("qc.note.External", [_Element, _SelectableMixin, _ContextMenuContainer, _EditableTextMixin], {
        elementName: 'External',
        templateString: '<div class="externalEntry qcddSource editableText"></div>',
        vocab: '',
        code: '',
        readOnlyCodes: true,
    
        _getTextAttr: function () {
            return this.domNode.innerHTML;
        },

        _setTextAttr: function (value) {
            this.domNode.innerHTML = value;
        },
    
        writeNoteAttributes: function (writer, mode) {
            writer.attribute('id', this.elementId || '', '');
            writer.attribute('Name', this.name || '', '');
            writer.attribute('Vocab', this.vocab, '');
            writer.attribute('Code', this.code, '');
            writer.attribute('Text', this.get('text'), '');
        },

        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            this.inherited(arguments);

            var self = this;
            array.forEach(xmlNode.childNodes, function (xmlChild) {
                if (xmlChild.nodeType === 1 && xmlChild.nodeName == 'Codes') {
                    self.codingInfo = {};

                    array.forEach(xmlChild.childNodes, function(xmlCode) {
                        if (xmlCode.nodeType === 1 && xmlCode.nodeName == 'Code') {
                            var vocab = xmlCode.getAttribute('Vocab');

                            self.codingInfo[vocab] = [{
                                vocab: vocab,
                                code: xmlCode.getAttribute('Value'),
                                description: xmlCode.getAttribute('Description')
                            }];
                        }
                    });
                };
            });
        },

        writeNoteChildren: function(writer) {
            var count = this.inherited(arguments) || 0;

            if (this.codingInfo) {
                writer.beginElement('Codes');

                for (var vocab in this.codingInfo) {
                    if (!this.codingInfo.hasOwnProperty(vocab)) {
                        continue;
                    }

                    array.forEach(this.codingInfo[vocab], function (code) {
                        writer.beginElement('Code');
                        writer.attribute('Vocab', vocab);
                        writer.attribute('Value', code.code);
                        writer.attribute('Description', code.description);
                        writer.endElement();

                        count++;
                    });
                }

                writer.endElement();
            }

            return count;
        },

        getContextActions: function () {
            return {
                deferToParent: true,
                mergeAfter: [
                    {
                        label: core.getI18n('deleteItem'),
                        icon: 'delete',
                        topic: '/qc/NoteEditor/Selection/Delete',
                        beginGroup: true
                    }
                ]
            };
        }
    });

    core.settings.noteElementClasses["qc/note/External"] = External;

    return External;
});