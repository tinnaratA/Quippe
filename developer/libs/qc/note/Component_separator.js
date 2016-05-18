define([
    "dojo/_base/declare",
    "qc/note/Component_label"
], function (declare, Component_label) {
    return declare("qc.note.Component_separator", [Component_label], {
        entryClass: 'sep',
    
        getPropertyDefs: function () {
            var properties = this.name == "label" ? [{ name: 'value', group: 'Data' }] : [];

            return properties.concat([
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum , nullable: true},
                { name: 'showColors', group: 'Style', type: 'boolean', nullable: true },
                { name: 'styleClass', group: 'Style', type: 'string' },
                { name: 'elementStyle', group: 'Style', type: 'string' }
            ]);
        }
    });
});