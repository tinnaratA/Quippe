define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "qc/note/Component"
], function (declare, domClass, domConstruct, Component) {
    return declare("qc.note.Component_singleCheck", [Component], {
        entryClass: 'chk',
        styleClass: 'x',
        propertyName: 'result',
    
        createNode: function () {
            var domNode = this.inherited(arguments);
            domClass.add(domNode, 'single');
            domConstruct.place('<div class="box"></div>', domNode);
            this.domNode = domNode;
            return domNode;
        },
    
        getPropertyDefs: function () {
            return [
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'togglePhrasing', group: 'Behavior', type: 'boolean' },
                { name: 'styleClass', group: 'Style', type: 'string', options: '[;x;check;yn;square;round;revCheck]', nullable: true, allowAnyValue: true },
                { name: 'elementStyle', group: 'Style', type: 'string' }
            ];
        },
    
        onClick: function (evt) {
            if (this.isDisabled) {
                return;
            };
            var dualState = this.styleClass == 'x' || this.styleClass == 'check' ? true : false;
            var owner = this.getOwner();
            if (owner && owner.getViewMode() != 'design') {
                owner.toggleResult(dualState);
            };
        }
    });
});