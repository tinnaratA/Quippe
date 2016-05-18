define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/_base/declare"
], function (_TemplatedMixin, _WidgetBase, declare) {
    return declare("qc.Label", [_WidgetBase, _TemplatedMixin], {
        text: '',
        templateString: '<div class="qcLabel">${text}</div>'
    });
});