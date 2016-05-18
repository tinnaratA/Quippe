define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-class",
    "qc/note/_Element",
    "qc/note/_SelectableMixin",
	"qc/note/PropertyBindingMixin",
    "qc/note/_EditableTextMixin",
    "qc/_core"
], function (declare, array, lang, domClass, _Element, _SelectableMixin, PropertyBindingMixin, _EditableTextMixin, core) {
    var typeDef = declare('qc.note.StateButton', [_Element, _SelectableMixin, PropertyBindingMixin], {
        elementName: 'StateButton',

        templateString: '<div class="qcStateButton qcddSource" data-dojo-attach-event="click:onClick">'
                      + '  <div class="chk"></div>'
                      + '  <div class="lbl innerLabel" data-dojo-attach-point="labelNode"></div>'
                      + '</div>',

        text: '',
        value: false,

        _setTextAttr: function(value) {
            var text = (value == null || value == undefined) ? '' : value.toString();
            this.labelNode.innerHTML = text;
            this._set('text', text);
        },

        //Result Property needed to support property binding expressions
        _getResultAttr: function() {
            return this.value ? 'A' : '';
        },

        _setResultAttr: function(value) {
            this.set('value', value == 'A' ? true : false);
        },
       
        _getValueAttr: function() {
            return this.value
        },

        _setValueAttr: function (value) {
            var bValue = value ? true : false;

            if (bValue != this.value) {
                if (bValue) {
                    if (!domClass.contains(this.domNode, 'checked')) {
                        domClass.add(this.domNode, 'checked');
                    };
                }
                else {
                    if (domClass.contains(this.domNode, 'checked')) {
                        domClass.remove(this.domNode, 'checked');
                    };
                };
                this._set('value', bValue);
                this._set('result', bValue);
            };
        },

        _getCheckedAttr: function() {
            return this.get('value');
        },
        _setCheckedAttr: function(value) {
            this.set('value', value == 'on' ? true : value == 'off' ? false : value ? true : false);
        },

        toggleValue: function() {
            this.set('value', !this.get('value'));
        },

        writeNoteAttributes: function (writer, mode) {
            this.inherited(arguments);
            writer.attribute('text', this.get('text'), '');
            writer.attribute('value', this.get('value'), false);
        },

        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            this.parseBindings(xmlNode);
        },

        writeNoteChildren: function (writer, mode) {
            this.writeBindings(writer, mode);
        },
        
        onClick: function (evt) {
            if (this.getViewMode() == 'design' || this.get('disabled')) {
                return;
            };
            this.toggleValue();
        },

        _pgPropDef_text: function () {
            return { name: 'text', group: 'Data', defaultValue: '' };
        },

        _pgPropDef_value: function () {
            return { name: 'value', group: 'Data', type: 'boolean', defaultValue: false };
        },

        _getExpressionValue_number: function (defaultValue) {
            return this.get('value') ? 1 : 0;
        },

        _getExpressionValue_boolean: function (defaultValue) {
            return this.get('value');
        }

    });

    core.settings.noteElementClasses["qc/note/StateButton"] = typeDef;

    return typeDef;
});