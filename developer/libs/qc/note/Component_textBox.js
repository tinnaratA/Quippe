define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "qc/note/Component"
], function (declare, lang, domClass, domConstruct, on, Component) {
    return declare("qc.note.Component_textBox", [Component], {
        entryClass: 'txt',
        placeholder: '',

        createNode: function () {
            var domNode = this.inherited(arguments);
            domClass.add(this.domNode, 'qcddPrevent');
            this.textbox = domConstruct.place('<input type="text" class="textBox"' + (this.placeholder ? ' placeholder="' + this.placeholder + '"' : '') + ' />', domNode);
            this.events.push(on(this.textbox, "change", lang.hitch(this, this.onTextBoxChanged)));
            this.domNode = domNode;
            return domNode;
        },
    
        getPropertyDefs: function () {
            return [
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'enabled', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'required', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'styleClass', group: 'Style', type: 'string' },
                { name: 'elementStyle', group: 'Style', type: 'string' },
                { name: 'placeholder', group:'General' }
            ];
        },
    
        getValue: function () {
            return this.textbox ? this.textbox.value || "" : "";
        },
    
        setValue: function (value) {
            if (this.textbox) {
                this.textbox.value = value;
            };
        },

        setDisabled: function (value) {
            if (this.textbox) {
                if (value) {
                    this.textbox.setAttribute('disabled', true);
                }
                else {
                    this.textbox.removeAttribute('disabled');
                }
            };
            this.isDisabled = value || false;
        },
    
        onClick: function (evt) {
            if (this.isDisabled) {
                return;
            };
            this.textbox.focus();
        },
    
        onTextBoxChanged: function (evt) {
            this.notifyValueChanged(this, this.textbox.value);
        }
    });
});