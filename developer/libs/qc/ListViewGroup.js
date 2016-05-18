define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "qc/_core"
], function (declare, _WidgetBase, _TemplatedMixin, core) {
    return declare("qc.ListViewGroup", [_WidgetBase, _TemplatedMixin], {

        key: "",
        caption: "",

        templateString: '<tr class="qcListViewGroup"><td class="textCell" colspan="2">${caption}</td></tr>',

        startup: function () {
            core.setSelectable(this.domNode, false);
            if (!this.caption) {
                this.caption = this.key;
            }
        }

    })
});