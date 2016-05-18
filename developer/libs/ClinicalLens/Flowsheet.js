define([
    "dijit/Tooltip",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/request",
    "dojo/when",
    "qc/_core",
    "qc/DateUtil",
    "qc/flowsheet/Graph",
    "qc/flowsheet/HistoryPool",
    "qc/StringUtil",
    "Quippe/Flowsheet",
    "qc/noteData/Tree"
], function (Tooltip, array, declare, lang, domAttr, domClass, domConstruct, domGeometry, domStyle, on, query, request, when, core, DateUtil, Graph, HistoryPool, StringUtil, Flowsheet, Tree) {

    return declare("ClinicalLens.Flowsheet", [Flowsheet], {
        currentColWidth: 0,
        labelColWidth: 303,

        attach: function() {
            this.events = [
                on(this.scrollView, "scroll", lang.hitch(this, this.onGridScroll)),
                on(this.domNode, "click", lang.hitch(this, this.onGridClick))
            ];
        },

        loadChart: function (chart, categories) {
            this.tree = new Tree();

            var generateToFinding = function(finding) {
                return function() {
                    return finding;
                }
            };

            var groupNodes = {};

            array.forEach(categories, lang.hitch(this, function(category) {
                groupNodes[category] = this.tree.addInSequence({
                    nodeType: 'group',
                    text: category
                });
            }));

            for (var i = 0; i < chart.findings.length; i++) {
                var finding = chart.findings[i];
                var parentNode = groupNodes[finding.category];
                var graphIcon = false;

                if ((finding.termType == 3 && !finding.prefix) || finding.termType == 1 || finding.termType == 2) {
                    if (array.filter(finding.entries, function (item) { return typeof item.value == "number" }).length > 2) {
                        graphIcon = true;
                    }
                }

                parentNode.addInSequence({
                    nodeType: 'finding',
                    text: (graphIcon ? '<span class="graphIcon" title="Display graph"></span>' : '') + finding.label,
                    medcinId: finding.medcinId,
                    prefix: finding.prefix,
                    nodeKey: finding.nodeKey,
                    specialty: finding.specialty,
                    hasValue: array.filter(finding.entries, function (item) { return typeof item.value == "number" }).length > 0,
                    specialtyVisible: true,
                    diagnosisVisible: true,
                    dataVisible: true,
                    refWidget: {
                        toFinding: generateToFinding(finding),
                        domNode: true
                    },
                    visible: true
                });
            }

            this.pool = new HistoryPool();
            this.pool._populateData(chart);

            this.show();
            this.updateDataTable();
            this.updateDisplay();
        },

        createGraphWidget: function() {
            this.graphOverlayNode = domConstruct.create('div', {
                className: 'graphOverlay'
            }, this.domNode);

            domStyle.set(this.graphOverlayNode, {
                left: this.scrollView.style.left,
                top: (parseInt(this.scrollView.style.top, 10) - this.headerRowHeight) + 'px',
                width: this.scrollView.style.width,
                height: (parseInt(this.scrollView.style.height, 10) + this.headerRowHeight) + 'px'
            });

            domStyle.set(this.scrollView, 'left', '0px');
            domStyle.set(this.scrollView, 'overflow-x', 'hidden');

            var graphWidget = new Graph({
                options: this.lineGraphOptions
            });

            graphWidget.placeAt(this.graphOverlayNode);
            graphWidget.startup();

            graphWidget.close = lang.hitch(this, function() {
                domStyle.set(this.scrollView, 'left', this.graphOverlayNode.style.left);
                domStyle.set(this.scrollView, 'overflow-x', '');

                domConstruct.destroy(this.graphOverlayNode);
                this.graphWidget = null;
                this.graphOverlayNode = null;

                this.selectedNode = null;
                this.updateDisplay();
            });

            return graphWidget;
        },

        onGridClick: function(evt) {
            if ((domClass.contains(evt.target, 'sizerBox') || domClass.contains(evt.target, 'scrollView')) && this.graphWidget) {
                var cell = this.findCellFromPosition(evt.clientX, evt.clientY);
                var row = cell.parentNode;
                var nodeId = row.getAttribute('data-node-id') || '';
                var node = null;

                if (nodeId) {
                    if (query('.graphIcon', cell).length > 0) {
                        node = this.tree.findNode(nodeId);

                        this.showGraph(node, row);
                        this.updateDisplay();
                    }

                    return;
                }
            }

            this.inherited(arguments);
        },

        updateGridSize: function(w, h) {
            this.inherited(arguments);

            if (this.graphOverlayNode) {
                domStyle.set(this.graphOverlayNode, {
                    left: parseInt(domStyle.get(this.scrollView, 'left'), 10) + 'px',
                    top: (parseInt(domStyle.get(this.scrollView, 'top'), 10) - this.headerRowHeight) + 'px',
                    width: parseInt(this.scrollView.style.width, 10) + 'px'
                });

                this.graphWidget.resize();

                domStyle.set(this.scrollView, 'left', '0px');
                domStyle.set(this.scrollView, 'overflow-x', 'hidden');
            }
        }
    });
})