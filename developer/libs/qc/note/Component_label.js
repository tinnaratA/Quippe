define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "qc/note/Component"
], function (declare, domClass, Component) {
    return declare("qc.note.Component_label", [Component], {
        entryClass: 'lbl',
    
        createNode: function () {
            var domNode = this.inherited(arguments);
            if (this.name == 'text') {
                domClass.add(domNode, 'innerLabel');
            };
            if (this.showLookback) {
                domClass.add(domNode, 'showLookback');
            };
            if (this.showColors) {
                domClass.add(domNode, 'showColors');
            };
            if (this.toggleResult) {
                domClass.add(domNode, 'toggleResult');
            };
            if (this.propertyName == 'text') {
                domClass.add(domNode, 'editableText');
            };
            this.domNode = domNode;
            return domNode;
        },
    
        getPropertyDefs: function () {
            return [
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'toggleResult', group: 'Behavior', type: 'boolean', nullable: true },
                { name: 'showColors', group: 'Style', type: 'boolean', nullable: true },
                { name: 'showLookback', group: 'Style', type: 'boolean' , nullable: true},
                // { name: 'editableText', group: 'Style', type: 'boolean' , nullable: true},
                { name: 'styleClass', group: 'Style', type: 'string' },
                { name: 'elementStyle', group: 'Style', type: 'string' }
            ];
        },
    
        getValue: function () {
            return this.domNode ? this.domNode.innerHTML || "" : "";
        },
    
        setValue: function (value) {
            if (this.domNode) {
                this.domNode.innerHTML = value;
            };
        },
    
        onClick: function (evt) {
            if (!this.isDisabled && this.toggleResult && !core.util.isMultiSelectEvent(evt)) {
                var owner = this.getOwner();
                if (owner && owner.getViewMode() != 'design') {
                    owner.toggleResult(null,  evt);
                };
            };
        }
    
    });
});