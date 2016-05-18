define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/text!qc/flowsheet/templates/Graph.htm",
    "qc/chart/_Chart",
    "qc/chart/Scatter"
], function (_TemplatedMixin, _WidgetBase, declare, lang, domAttr, domConstruct, domGeometry, domStyle, GraphTemplate, Chart, Scatter) {
    return declare('qc.flowsheet.Graph', [_WidgetBase, _TemplatedMixin], {
        templateString: GraphTemplate,

        startup: function () {
            if (!this._started) {
                this.inherited(arguments);

                this.flowsheetNodes = [];
                this.graphData = {
                    encounters: [],
                    datasets: [],
                    labels: [],
                    min: null,
                    max: null
                };

                this.resize();
            }
        },

        clear: function () {
            if (this.graph) {
                this.graph.destroy();
                domConstruct.destroy(this.legend);
                this.titleNode.innerHTML = '';
            }
        },

        onGraphCloseClicked: function() {
            this.close();
        },

        close: function () {
        },

        createLegend: function () {
            this.legend = domConstruct.place(this.graph.generateLegend(), this.domNode);
        },

        draw: function () {
            this.graph = new Chart(this.graphCanvas.getContext('2d')).Scatter(this.graphData, lang.mixin(lang.clone(this.options), {
                scaleStartValue: this.yAxisBounds.min,
                scaleStepWidth: Math.ceil((this.yAxisBounds.max - this.yAxisBounds.min) / this.options.scaleSteps),
                scaleLabel: '<%=value%> ' + this.unit,
                scaleType: 'date',
                tooltipTemplate: '<%if (datasetLabel){%><%=datasetLabel%> on <%}%><%=argLabel%>: <%=valueLabel%>',
                multiTooltipTemplate: '<%if (datasetLabel){%><%=datasetLabel%> on <%}%><%=argLabel%>: <%=valueLabel%>',
                tooltipTitleFontSize: 0
            }));
        },

        setTitle: function (title) {
            this.titleNode.innerHTML = title;
        },

        resize: function () {
            var hadGraph = false;

            if (this.graph) {
                this.graph.destroy();
                hadGraph = true;
            }

            if (!this.graphPadding) {
                this.graphPadding = domGeometry.getPadExtents(this.domNode);
                this.graphMargins = domGeometry.getMarginExtents(this.domNode);
                this.graphCanvasMargins = domGeometry.getMarginExtents(this.graphCanvas);
                this.parentPadding = domGeometry.getPadExtents(this.domNode.parentNode);
            }

            domStyle.set(this.domNode, 'width', (parseInt(this.domNode.parentNode.style.width, 10) - this.graphMargins.w - this.graphPadding.w) + 'px');
            domStyle.set(this.domNode, 'height', (parseInt(this.domNode.parentNode.style.height, 10) - this.graphMargins.h - this.graphPadding.h) + 'px');

            domAttr.set(this.graphCanvas, 'width', parseInt(this.domNode.parentNode.style.width, 10) - this.graphPadding.w - this.graphCanvasMargins.w - this.graphMargins.w);
            domAttr.set(this.graphCanvas, 'height', parseInt(this.domNode.parentNode.style.height, 10) - this.graphPadding.h - this.graphCanvasMargins.h - this.graphMargins.h);

            if (hadGraph) {
                this.draw();
            }
        }
    });
})