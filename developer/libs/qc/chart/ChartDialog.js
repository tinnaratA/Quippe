define([
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/on",
    "qc/Dialog",
    "qc/chart/_Chart",
    "dojo/text!qc/chart/templates/ChartDialog.htm"
], function (_WidgetsInTemplateMixin, declare, lang, domAttr, on, Dialog, Chart, ChartDialogTemplate) {
    return declare("qc.chart.ChartDialog", [Dialog, _WidgetsInTemplateMixin], {
        templateString: ChartDialogTemplate,

        _setChartWidthAttr: function(width) {
            domAttr.set(this.chartCanvas, 'width', width);
        },

        _setChartHeightAttr: function (height) {
            domAttr.set(this.chartCanvas, 'height', height);
        },

        _getChartWidthAttr: function() {
            return parseInt(domAttr.get(this.chartCanvas, 'width'));
        },

        _getChartHeightAttr: function () {
            return parseInt(domAttr.get(this.chartCanvas, 'height'));
        },

        show: function(data, options) {
            return this.inherited(arguments).then(lang.hitch(this, function () {
                new Chart(this.chartCanvas.getContext('2d'))[this.type](data, options);
            }));
        }
    });
})