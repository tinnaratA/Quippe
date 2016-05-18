define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "qc/note/Component"
], function (declare, domClass, domConstruct, Component) {
    return declare("qc.note.Component_checkBox", [Component], {
        entryClass: 'checkBox',
        styleClass: 'check',
        label: '',
    
        createNode: function () {
            var domNode = this.inherited(arguments);
    
            var table = domConstruct.place('<div class="cbTbl"></div>', domNode);
            var row = domConstruct.place('<div class="cbRow"></div>', table);
    
            var cell1 = domConstruct.place('<div class="cbCell"></div>', row);
            this.checkboxNode = domConstruct.place('<div class="box"></div>', cell1);
    
    
            var cell2 = domConstruct.place('<div class="cbCell"></div>', row);
            this.labelNode = domConstruct.place('<div class="lbl"></div>', cell2);
    
            this.labelNode.innerHTML = this.label;
            this.domNode = domNode;
            return domNode;
        },
    
        getPropertyDefs: function () {
            return [
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'togglePhrasing', group: 'Behavior', type: 'boolean' },
                { name: 'label', group: 'Data' },
                { name: 'styleClass', group: 'Style', type: 'string', options: '[;check;x]', nullable: true, allowAnyValue: true },
                { name: 'elementStyle', group: 'Style', type: 'string' }
            ];
        },
    
    
        getValue: function () {
            return this.value || false;
        },
    
        setValue: function (value) {
            if (value != this.value) {
                if (value) {
                    domClass.add(this.domNode, 'checked');
                    this.value = true;
                }
                else {
                    domClass.remove(this.domNode, 'checked');
                    this.value = false;
                };
                this.notifyValueChanged(this, this.value);
            };
        },
    
        onClick: function (evt) {
            if (this.isDisabled) {
                return;
            };
            this.setValue(!this.getValue());
        }
    });
});