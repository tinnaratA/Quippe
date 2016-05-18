define([
    "qc/FindingTab",
    "qc/TimingPanel",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/declare",
    "dojo/dom-style"
], function (FindingTab, TimingPanel, _WidgetsInTemplateMixin, declare, domStyle) {
    return declare("qc.FindingTimingTab", [FindingTab, _WidgetsInTemplateMixin], {
        title: 'Order Timing',

        templateString: '<div><div data-dojo-type="qc/TimingPanel" data-dojo-attach-point="timingPanel"></div></div>',


        postCreate: function () {
            domStyle.set(this.domNode, { margin: '0px', padding: '0px' });
        },

        setFinding: function (finding) {
            this.finding = finding;
            this.timingPanel.set('components', finding.timingComponents || []);
        },

        onOKClick: function (evt) {
            this.finding.timingComponents = this.timingPanel.get('components') || null;
        }
    });
});