define([
    "dojo/_base/declare",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane"
], function (declare, _TemplatedMixin, _WidgetsInTemplateMixin, ContentPane) {
    return declare("qc.FindingTab", [ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: "Empty Tab",
        templateString: '<div class="defaultTab" data-dojo-attach-point="defaultTab">Please extend this class to create a new type of tab.</div>',
        finding: null,

        startup: function () {
            if (!this.started) {
                this.inherited(arguments);
            };
        },

        setFinding: function (finding) {
            this.finding = finding;
        },

        updateDisplay: function () {
        },

        onOKClick: function (evt) {
        }
    }
    );
});