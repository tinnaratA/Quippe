define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "qc/note/Component"
], function (array, declare, domClass, domConstruct, Component) {
    return declare("qc.note.Component_doubleCheck", [Component], {
        entryClass: 'chk',
        styleClass: 'square',
        checkboxOrder: 'yn',
    
        createNode: function () {
            var domNode = this.inherited(arguments);
            domClass.add(domNode, 'double');
            var table = domConstruct.place('<div class="cbTbl"></div>', domNode);
            var row = domConstruct.place('<div class="cbRow"></div>', table);
    
            var boxClasses = this.checkboxOrder == 'ny' ? ['n', 'y'] : ['y', 'n'];
            array.forEach(boxClasses, function (p) {
                var cell = domConstruct.place('<div class="cbCell"></div>', row);
                var box = domConstruct.place('<div class="box"></div>', cell);
                domClass.add(box, p);
            });
    
            this.domNode = domNode;
            return domNode;
    
        },
    
        getPropertyDefs: function () {
            return [
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum , nullable: true},
                { name: 'checkboxOrder', group: 'Behavior', options: '[yn;ny]', nullable: true },
                { name: 'togglePhrasing', group: 'Behavior', type: 'boolean' },
                { name: 'styleClass', group: 'Style', type: 'string', options: '[;x;check;yn;square;round;ny=ny (reversed)]' , nullable: true, allowAnyValue: true},
                { name: 'elementStyle', group: 'Style', type: 'string' }
            ];
        },
    
        onClick: function (evt) {
            if (this.isDisabled) {
                return;
            };

            var owner = this.getOwner();
            if (!owner || owner.getViewMode() == 'design') {
                return;
            };

            var currentResult = owner.get('result');
            var newResult = '';
            if (domClass.contains(evt.target, 'y')) {
                newResult = currentResult == 'A' ? '' : 'A';
            }
            else if (domClass.contains(evt.target, 'n')) {
                newResult = currentResult == 'N' ? '' : 'N';
            };
            owner.set('result', newResult);
        }
    });
});