define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/query",
    "dojo/topic"
], function (declare, domClass, query, topic) {
    return declare("qc.note._SelectableMixin", [], {
        postCreate: function () {
            domClass.add(this.domNode, 'selectable');
            this.inherited(arguments);
        },
    
        isSelected: function () {
            return domClass.contains(this.domNode, 'selected');
        },
    
        setSelected: function (value, exclusive) {
            if (exclusive) {
                query(".qcNoteEditor .selected").removeClass("selected");
            };
            if (value) {
                domClass.add(this.domNode, 'selected');
            }
            else {
                domClass.remove(this.domNode, 'selected');
            };
            topic.publish('/noteEditor/SelectionChanged', this);
        },
    
        toggleSelection: function (evt) {
            this.setSelected(!this.isSelected());
        }
    });
});