define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/query",
    "dojo/request",
    "dojo/topic",
    "dijit/registry",
    "qc/note/_EditableTextMixin",
    "qc/note/_Element",
    "qc/note/_SelectableMixin",
	"qc/note/PropertyBindingMixin",
    "qc/StringUtil",
    "qc/_core"
], function (declare, array, lang, query, request, topic, registry, _EditableTextMixin, _Element, _SelectableMixin, PropertyBindingMixin, StringUtil, core) {
    var typeDef = declare('qc.note.Hyperlink', [_EditableTextMixin, _Element, _SelectableMixin, PropertyBindingMixin], {
        elementName: 'Hyperlink',
        templateString: '<div class="qcHyperlink qcddSource innerLabel editableText qcHtmlContent" data-dojo-attach-event="click:onClick"></div>',
        formNode: null,
        contentId: '',
        href: '',
        targetName: 'HyperlinkTarget',
        text: '',

        _getTextAttr: function (value) {
            return this.domNode.innerHTML;
        },
        _setTextAttr: function (value) {
            this.domNode.innerHTML = value;
        },

        _pgPropDef_text: function () {
            return { name: 'text', group: 'Text' };
        },

        _pgPropDef_action: function() {
            return { name: 'action', group: 'Behavior', options: '[=None;launchForm=Launch Form;mergeContent=Merge Content;navigate=Open URL;eval=Execute JavaScript]', reloadOnChange: true };
        },

        _pgPropDef_href: function() {
            if (this.action == 'navigate') {
                return { name: 'href', caption: 'URL', group: 'Data' };
            }
            else if (this.action == 'eval') {
                return { name: 'href', caption: 'Script', group: 'Data' };
            }
            else {
                return null;
            }
        },

        _pgPropDef_targetName: function () {
            if (this.action == 'navigate') {
                return { name: 'targetName', caption: 'Target Window Name', group: 'Data' };
            }
            else {
                return null;
            }
        },

        _pgPropDef_contentId: function () {
            var prop = {
                name: 'contentId',
                group: 'Data',
                type: 'string',
                editorDialogType: 'qc/OpenContentDialog',
                editorDialogSettings: {
                    title: 'Select Content',
                    selectedItemId: this.contentId
                }
            };

            if (this.action == 'launchForm') {
                prop.caption = 'Form Id';
                prop.editorDialogSettings.title = 'Select Form';
                prop.editorDialogSettings.typeFilter = ['form'];
                return prop;
            }
            else if (this.action == 'mergeContent') {
                return prop;
            }
            else {
                return null;
            }
        },

        writeNoteAttributes: function (writer) {
            array.forEach(this._pgGetProperties(), function (prop) {
                if (prop.type != 'object') {
                    writer.attribute(StringUtil.toCamelUpper(prop.name), this.get(prop.name) || '', '');
                };
            }, this);
        },

        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            this.parseBindings(xmlNode);
        },
    
        writeNoteChildren: function (writer, mode) {
            this.writeBindings(writer, mode);
        },
    
        onClick: function (evt) {

            if (this.getViewMode() == 'design') {
                return;
            };

            if (this.get('disabled')) {
                return;
            };

            if (this.action == 'navigate') {
                if (this.href) {
                    window.open(this.href, this.targetName || '_blank', '', false);
                };
                return;
            };

            if (this.action == 'launchForm') {
                if (this.contentId) {
                    topic.publish('/qc/ShowEntryForm', this.contentId);
                };
                return;
            };

            if (this.action == 'mergeContent') {
                if (this.contentId) {
                    request.get(core.serviceURL('Quippe/ContentLibrary/Info'),
                    {
                        query: { id: this.contentId, dataFormat: 'JSON' },
                        handleAs: 'json'
                    }).then(function (data) {
                        if (data.item) {
                            topic.publish('/qc/AddToNote', data.item);
                        }
                        else if (data.message) {
                            core.showError(data.message);
                        };
                    }, core.showError);
                };
                return;
            };

            if (this.action == 'eval') {
                var code = this.href;
                var fn = function() {return eval(code)};
                return fn.call(this);
            };
        },


        showAttachedForm: function (formNode) {
            var form = registry.byNode(formNode);
            if (!form) {
                return;
            };
            domClass.remove(formNode, 'hidden');
            form.hostEditor = this;
            form.synchHostToForm();
            form.transcribe();
            form.updateDisplay();
            topic.publish('/qc/ContentLoaded');
            core.showDialog(form);
        }
    });
    core.settings.noteElementClasses["qc/note/Hyperlink"] = typeDef;
    return typeDef;
});