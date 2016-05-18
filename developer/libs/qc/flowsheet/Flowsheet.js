define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/form/Button",
    "dijit/form/DropDownButton",
    "dijit/form/ToggleButton",
    "dijit/layout/_LayoutWidget",
    "dijit/layout/ContentPane",
    "dijit/Menu",
    "dijit/MenuItem",
	"dijit/popup",
    "dijit/registry",
    "dijit/Toolbar",
    "dijit/ToolbarSeparator",
    "dijit/Tooltip",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/DeferredList",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/request",
    "dojo/topic",
    "dojo/when",
    "qc/_core",
    "qc/chart/_Chart",
    "qc/chart/Line",
    "qc/CheckedMenuItem",
    "qc/DateUtil",
    "qc/flowsheet/FilterDialog",
    "qc/flowsheet/Graph",
    "qc/flowsheet/HistoryPool",
    "qc/flowsheet/Tree",
    "qc/MenuItem",
    "qc/Label",
    "qc/ReviewPane",
    "qc/StringUtil"
], function (_TemplatedMixin, _WidgetBase, Button, DropDownButton, ToggleButton, _LayoutWidget, ContentPane, Menu, MenuItem, popup, registry, Toolbar, ToolbarSeparator, Tooltip, array, declare, lang, aspect, DeferredList, domAttr, domClass, domConstruct, domGeometry, domStyle, on, query, request, topic, when, core, Chart, Line, CheckedMenuItem, DateUtil, FilterDialog, Graph, HistoryPool, Tree, qcMenuItem, Label, ReviewPane, StringUtil) {
    return declare("qc.flowsheet.Flowsheet", [_WidgetBase, _TemplatedMixin, _LayoutWidget, ReviewPane], {
        templateString: '<div></div>',
        tree: null,
        pool: null,
        labels: null,
        headers: null,
        appSubscriptions: null,
        noteSubscriptions: null,
        events: null,
        noteEditor: null,
        _layoutSuspended: false,

        graphScaleCushionPercentage: 0.1,
        graphPointStrokeColor: "#ffffff",
        graphPointHighlightFill: "#ffffff",
        lineGraphColors: [
            "rgba(151,187,205,1)",
            "rgba(255,142,142,1)",
            "rgba(145,196,111,1)",
            "rgba(255,159,104,1)",
            "rgba(223,155,255,1)"
        ],
        lineGraphOptions: {
            bezierCurve: false,
            scaleOverride: true,
            scaleSteps: 4,
            datasetFill: false,
            multiTooltipTemplate: "<%= value %> - <%= datasetLabel %>",
            animation: false
        },
    
        defaultFilter: {
            currentLevel: 'filtered',
            historyLevel: 'related',
            visible: true,
            highlighted: false,
            selected: false,
            entered: false,
            haveHistory: true,
            havePositiveHistory: false
        },

        filter: {
            currentLevel: 'filtered',
            historyLevel: 'related',
            visible: true,
            highlighted: false,
            selected: false,
            entered: false,
            haveHistory: true,
            havePositiveHistory: false
        },

        dateHeadings: 'absolute',
    
        rowHeight: 25,
        headerRowHeight: 25,
        labelColWidth: 301,
        currentColWidth: 103,
        dataColWidth: 101,
        dr: 0,
        dc: 0,
        viewRows: 0,
        viewCols: 0,
        filterDialog: null,
        filterButtons: null,
    
        startup: function () {
            if (!this._started) {
                domClass.add(this.domNode, 'qcFlowsheet');
                if (core.settings.flowsheetShowColorBars) {
                    domClass.add(this.domNode, 'colorBars');
                };
    
                this.viewTable = domConstruct.place('<table></table>', this.domNode);
                this.scrollView = domConstruct.place('<div class="scrollView"></div>', this.domNode);
                this.sizerBox = domConstruct.place('<div class="sizerBox"></div>', this.scrollView);

                for (var p in this.defaultFilter) {
                    if (core.settings['fsFilter_' + p] != undefined) {
                        this.defaultFilter[p] = core.settings['fsFilter_' + p];
                        this.filter[p] = this.defaultFilter[p];
                    };
                };
    
                this.filterDialog = new FilterDialog();
                this.filterDialog.startup();
    
                this.dateHeadings = core.settings.flowsheetDefaultDateHeadings || 'absolute';
    
                this.inherited(arguments);
                this.resize();
            };
        },
    
        _getCiteModeAttr: function () {
            return domClass.contains(this.domNode, 'citeMode');
        },
        _setCiteModeAttr: function (value) {
            domClass.toggle(this.domNode, 'citeMode', value);
            if (this.citeModeButton) {
                this.citeModeButton.set('checked', value);
            };
        },
    
        _getShowColorBarsAttr: function () {
            return domClass.contains(this.domNode, 'colorBars');
        },
        _setShowColorBarsAttr: function (value) {
            domClass.toggle(this.domNode, 'colorBars', value);
        },
    
        show: function () {
            this.attach();
        },
    
        hide: function () {
            this.detach();
        },
    
        getToolbarItems: function () {
            var list = [];
    
            var filterButton = new DropDownButton({
                label: 'Filter',
                showLabel: true,
                dropDown: this.filterDialog
            });
            filterButton.isLoaded = lang.hitch(this, function () {
                this.filterDialog.loadFilter(this.noteEditor, this.filter);
                return true;
            });
            filterButton._onBlur = function () {
            };
            list.push(filterButton);

            var filterButtonDisplay = core.settings.flowsheetShowFilterButtons ? 'inline-block' : 'none';
            this.filterButtons = {};

            this.autoFilterButton = new ToggleButton({
                label: 'Auto',
                checked: core.settings.fsFilter_currentLevel == 'auto',
                onClick: lang.hitch(this, function () {
                    popup.close();
                    var filter = this.filter || {};
                    filter.currentLevel = filter.currentLevel == 'auto' ? 'filtered' : 'auto';
                    this.applyFilter(filter, true);
                })
            });
            list.push(this.autoFilterButton);
            domStyle.set(this.autoFilterButton.domNode, { display: filterButtonDisplay });

            array.forEach(['highlighted', 'selected', 'entered'], function (flag) {
                var button = new ToggleButton({
                    label: flag.substr(0, 1).toUpperCase() + flag.substr(1),
                    checked: core.settings['fsFilter_' + flag],
                    onClick: lang.hitch(this, function () {
                        popup.close();
                        this.filter[flag] = !this.filter[flag];
                        if (this.filter[flag]) {
                            this.filter.currentLevel = 'filtered';
                        };
                        this.applyFilter(this.filter, true);
                    })
                });
                this.filterButtons[flag] = button;
                domStyle.set(button.domNode, { display: filterButtonDisplay });
                list.push(button);
            }, this);

            list.push(new ToolbarSeparator());

            this.headingMenu = new Menu();
            this.headingMenu.addChild(new CheckedMenuItem({
                label: 'Encounter Date',
                showLabel: true,
                checked: (this.dateHeadings == 'absolute'),
                value: 'absolute',
                onClick: function () { topic.publish('/flowsheet/SetDateLabel', 'absolute') }
            }));
            this.headingMenu.addChild(new CheckedMenuItem({
                label: 'Encounter Time',
                showLabel: true,
                checked: (this.dateHeadings == 'enctime'),
                value: 'enctime',
                onClick: function () { topic.publish('/flowsheet/SetDateLabel', 'enctime') }
            }));
            this.headingMenu.addChild(new CheckedMenuItem({
                label: 'Encounter Date & Time',
                showLabel: true,
                checked: (this.dateHeadings == 'encdatetime'),
                value: 'encdatetime',
                onClick: function () { topic.publish('/flowsheet/SetDateLabel', 'encdatetime') }
            }));
            this.headingMenu.addChild(new CheckedMenuItem({
                label: 'Relative to Current Encounter',
                showLabel: true,
                checked: (this.dateHeadings == 'relative'),
                value: 'relative',
                onClick: function () { topic.publish('/flowsheet/SetDateLabel', 'relative') }
            }));
            this.headingMenu.addChild(new CheckedMenuItem({
                label: 'Patient Age',
                showLabel: true,
                checked: (this.dateHeadings == 'age'),
                value: 'age',
                onClick: function () { topic.publish('/flowsheet/SetDateLabel', 'age') }
            }));
    
            var btnHeading = new DropDownButton({
                label: 'Date Headings',
                showLabel: true,
                dropDown: this.headingMenu
            });
            list.push(btnHeading);
    
            list.push(new ToolbarSeparator());
    
            var btnCollapseAll = new Button({
                label: 'Collapse All',
                showLabel: true,
                onClick: function () { topic.publish('/flowsheet/CollapseAll') }
            });
            list.push(btnCollapseAll);
    
            var btnExpandAll = new Button({
                label: 'Expand All',
                showLabel: true,
                onClick: function () { topic.publish('/flowsheet/ExpandAll') }
            });
            list.push(btnExpandAll);
    
            list.push(new ToolbarSeparator());
    
            this.citeModeButton = new ToggleButton({
                label: 'Copy Forward',
                showLabel: true,
                checked: this.get('citeMode'),
                onClick: function () { topic.publish('/flowsheet/ToggleCiteMode') }
            });
            list.push(this.citeModeButton);
    
    
            return list;
        },
    
        layout: function () {
            var pos = domGeometry.position(this.domNode);
            this.updateGridSize(pos.w, pos.h);
            this.updateDisplay();
        },
    
        attach: function (noteEditor) {
            this.detach();
    
            this.appSubscriptions = [
                topic.subscribe('/qc/WorkspaceReset', lang.hitch(this, this.onWorkspaceReset)),
                topic.subscribe('/qc/DocumentLoaded', lang.hitch(this, this.onEditorDocumentLoaded)),
                topic.subscribe('/flowsheet/CollapseAll', lang.hitch(this, this.onCollapseAll)),
                topic.subscribe('/flowsheet/ExpandAll', lang.hitch(this, this.onExpandAll)),
                topic.subscribe('/flowsheet/SetFilter', lang.hitch(this, this.onSetFilter)),
                topic.subscribe('/flowsheet/SetDateLabel', lang.hitch(this, this.onSetDateLabel)),
                topic.subscribe('/flowsheet/ToggleCiteMode', lang.hitch(this, this.onToggleCiteMode)),
                topic.subscribe('/flowsheet/ShowFilter', lang.hitch(this, this.onShowFilter)),
                topic.subscribe('/qc/SettingsChanged', lang.hitch(this, this.onSettingsChanged))
            ];
    
            this.noteEditor = query('.qcNoteEditor').map(registry.byNode)[0];
            if (this.noteEditor && this.noteEditor.note) {
                this.onEditorDocumentLoaded();
            };
    
            this.events = [
                on(this.scrollView, "scroll", lang.hitch(this, this.onGridScroll)),
                on(this.domNode, "click", lang.hitch(this, this.onGridClick))
            ];
        },
    
    
        detach: function () {
            if (this.appSubscriptions) {
                array.forEach(this.appSubscriptions, core.unsubscribe);
                this.appSubscriptions = null;
            };
            if (this.noteSubscriptions) {
                array.forEach(this.appSubscriptions, core.unsubscribe);
                this.noteSubscriptions = null;
            };
            if (this.events) {
                array.forEach(this.events, core.disconnect);
                this.events = null;
            };
            if (this.tree) {
                this.tree.clear();
            };

            if (this.graphWidget) {
                this.graphWidget.close();
            }
        },
    
        clearDataTable: function () {
            this.labels = [];
            this.headers = [];
            this.updateScroller(0, 0);
        },
    
        updateDataTable: function () {
            if (this._layoutSuspended) {
                return;
            };
    
            if (!(this.tree && this.pool)) {
                return this.clearDataTable();
            };
    
            var labels = this.tree.visibleChildren();
            var node = null;
            var r = 0;
            var rLen = labels.length;
            if (rLen == 0) {
                return this.clearDataTable();
            };
    
            var pool = this.pool;
            var encounters = pool.encounters;
            var e = 0;
            var eLen = encounters.length;
            if (!encounters || eLen == 0) {
                return this.clearDataTable();
            };
    
            var encounter = null;
            var finding = null;
            var headers = [];
            var emptyColumn = true;
    
            for (e = 0; e < eLen; e++) {
                encounter = encounters[e];
                emptyColumn = true;
                r = 0;
                while (r < rLen && emptyColumn) {
                    node = labels[r];
                    finding = node && node.isFinding() ? pool.getEntry(encounter.id, node.medcinId, node.prefix) : null;
                    if (finding) {
                        emptyColumn = false;
                    }
                    else {
                        r++;
                    }
                };
                if (!emptyColumn) {
                    headers.push(encounter);
                };
            };
    
            this.labels = labels;
            this.headers = headers;
            this.updateScroller(labels.length + 1, headers.length + 1);
        },
    
        updateDisplay: function () {
            if (this._layoutSuspended) {
                return;
            };
    
            var table = this.viewTable;
            if (!table || table.rows.length == 0) {
                return;
            };
    
            var nodes = this.labels;
            var encounters = this.headers;
            if (!nodes || !encounters) {
                return this.clearViewTable();
            };
    
            var node = null;
            var pool = this.pool;
            var encounter = null;
            var finding = null;
    
            var selectedNode = this.selectedNode || null;
            var row = null;
            var cell = null;
    
            var vr = 0;
            var vc = 0;
            var vrLen = this.viewRows;
            var vcLen = this.viewCols;
    
            var drStart = this.dr || 0;
            var dcStart = this.dc || 0;
            var drLen = nodes.length;
            var dcLen = encounters.length;
            var dr = 0;
            var dc = 0;
    
    
            //top-left headers
            row = table.rows[0];
            if (drLen > 0) {
                row.cells[0].innerHTML = '<span style="margin-left:4px">Description</span>';
                row.cells[1].innerHTML = 'Current';
            }
            else {
                row.cells[0].innerHTML = '';
                row.cells[1].innerHTML = '';
            };
    
            //column headers
            dc = dcStart;
            for (vc = 0; vc < vcLen; vc++) {
                cell = row.cells[vc + 2];
                if (dc < dcLen) {
                    encounter = encounters[dc];
                    cell.setAttribute('data-encounter-id', encounter.id);
                    cell.innerHTML = this.createEncouterHeadingHtml(encounter);
                    dc++;
                }
                else {
                    cell.setAttribute('data-encounter-id', '');
                    cell.innerHTML = '';
                }
            };
    
            //data
            dr = drStart;
            for (vr = 0; vr < vrLen; vr++) {
                row = table.rows[vr + 1];
                node = dr < drLen ? nodes[dr] : null;
                if (node) {
                    row.cells[0].innerHTML = this.createLabelHtml(node);
                    if (node.isNoteFinding()) {
                        row.cells[1].innerHTML = this.createCurrentHtml(node);
                    }
                    else {
                        row.cells[1].innerHTML = '';
                    }
                    domClass.toggle(row, 'highlight', (selectedNode && selectedNode.equals(node)));
                    domClass.toggle(row, 'group', (node.isGroup()));
                    row.setAttribute('data-node-id', node.id);
    
                    if (node.isFinding()) {
                        dc = dcStart;
                        for (vc = 0; vc < vcLen; vc++) {
                            cell = row.cells[vc + 2];
                            finding = dc < dcLen && node && node.isFinding() ? pool.getEntry(encounters[dc].id, node.medcinId, node.prefix) : null;
                            cell.innerHTML = finding ? this.createDataHtml(finding) : '';
                            dc++;
                        };
                    }
                    else {
                        this.clearViewTable(vr + 1, 2, vr + 1, vcLen + 2);
                    }

                    if (this.graphWidget) {
                        domClass.toggle(row, 'highlight', this.graphWidget.flowsheetNodes.indexOf(node) != -1);
                    }
                }
                else {
                    this.clearViewTable(vr + 1, 0, vr + 1, vcLen);
                    domClass.remove(row, 'highlight');
                    domClass.remove(row, 'group');
                    row.setAttribute('data-node-id', '');
                }
                dr++;
            };
        },
    
        createLabelHtml: function (node) {
            var classNames = ['outline', node.nodeType];
            if (node.hasChildren()) {
                classNames.push(node.collapsed ? 'collapsed' : 'expanded');
            };
            if (node.isFinding() && !node.isNoteFinding()) {
                classNames.push('historyOnly');
            };
            return '<div '
                + ' data-node-id="' + node.id + '"'
                + ' class="' + classNames.join(' ') + '"'
                + ' style="margin-left:' + (16 * (node.level - 1)) + 'px;"'
                + '>'
                + '<div class="expander"></div>'
                + '<div class="label">' + node.text + '</div>'
            //+ '<div class="label">' + node.text + (' (' + node.medcinId + ':' + node.prefix + ')') + '</div>'
                + '</div>';
        },
    
        createCurrentHtml: function (node) {
            var finding = node.refWidget.toFinding();
            return '<div class="cellData ' + (finding.result || '') + '">' + this.getValueLabel(finding) + '</div>'
        },
    
        createDataHtml: function (finding) {
            return '<div class="cellData ' + (finding.result || '') + '">' + this.getValueLabel(finding) + '</div>'
        },
    
        createEncouterHeadingHtml: function (encounter) {
            if (!encounter) {
                return '';
            };
    
            var htm = '<div class="cellData">'
            switch (this.dateHeadings) {
                case 'relative':
                    htm += DateUtil.getLookbackTimespan(encounter.time, core.Encounter.encounterTime) + ' ago';
                    break;
                case 'age':
                    var age = DateUtil.calculateAge(core.Patient.birthDate, encounter.time);
                    htm += age ? age.label + ' old' : DateUtil.formatDate(encounter.time);
                    break;
                case 'encdate':
                    htm += DateUtil.formatDate(encounter.time);
                    break;
                case 'enctime':
                    htm += DateUtil.formatTime(encounter.time);
                    break;
                case 'encdatetime':
                    htm += DateUtil.formatDate(encounter.time);
                    htm += '<br/>';
                    htm += DateUtil.formatTime(encounter.time);
                    break;
                default:
                    htm += DateUtil.formatDate(encounter.time);
                    break;
            };
            htm += '</div>';
            return htm;
        },
    
        getValueLabel: function (finding) {
            if (finding) {
                if (finding.value) {
                    if (finding.unit) {
                        return finding.value + ' ' + finding.unit;
                    }
                    else {
                        return finding.value;
                    }
                }
                else {
                    switch (finding.result || '') {
                        case 'A':
                            return '<div class="resultBox"></div>';
                        case 'N':
                            return '<div class="resultBox"></div>';
                        default:
                            return '';
                    };
                };
            };
            return '';
        },
    
    
        clearViewTable: function (rFirst, cFirst, rLast, cLast) {
            var table = this.viewTable;
            var row = null;
            rFirst = rFirst || 0;
            cFirst = cFirst || 0;
            rLast = rLast || table.rows.length - 1;
            cLast = cLast || table.rows[0] ? table.rows[0].cells.length - 1 : -1;
            for (var r = rFirst; r <= rLast; r++) {
                row = table.rows[r];
                if (cFirst == 0) {
                    row.setAttribute('data-node-id', '');
                };
                for (var c = cFirst; c <= cLast; c++) {
                    row.cells[c].innerHTML = '';
                    if (rFirst == 0) {
                        row.cells[c].setAttribute('data-encounter-id', '');
                    }
                };
            };
            return true;
        },
    
        /* Filter */
        applyFilter: function (filter, updateDisplay) {
            filter = filter || this.filter || null;
            this.filter = filter;

            if (this.tree.applyFilter) {
                var activeFilter = this.tree.applyFilter(filter, this.noteEditor.viewMode);
            }

            if (this.filterButtons) {
                for (var flag in this.filterButtons) {
                    this.filterButtons[flag].set('checked', filter[flag]);
                    this.filterButtons[flag].set('disabled', activeFilter.currentLevel == 'auto');
                };
            };
            
            if (updateDisplay) {
                this.updateDataTable();
                this.updateDisplay();
            };
        },

        toggleFilter_highlighted: function () {
            popup.close();
            this.filter.highlighted = !this.filter.highlighted;
            if (this.filter.highlighted) {
                this.filter.currentLevel = 'filtered';
            };
            this.applyFilter(this.filter, true);
        },

        toggleFilter_selected: function () {
            popup.close();
            this.filter.selected = !this.filter.selected;
            if (this.filter.selected) {
                this.filter.currentLevel = 'filtered';
            };
            this.applyFilter(this.filter, true);
        },
    
        /* Layout */
        updateGridSize: function (w, h) {
            if (!w || !h) {
                return;
            };
            var table = this.viewTable;
            var row = null;
            var cell = null;
            var r = 0;
            var rLen = 0;
            var c = 0;
            var cLen = 0;
    
            var dataWidth = w - (this.labelColWidth + this.currentColWidth);
            var dataCols = Math.floor(dataWidth / this.dataColWidth) + 1;
    
            var dataHeight = h - this.headerRowHeight;
            var dataRows = Math.floor(dataHeight / this.rowHeight) + 1;
    
            var totalRows = dataRows + 2;
            var totalCols = dataCols + 3;
    
            rLen = table.rows.length;
            while (rLen < totalRows) {
                row = table.insertRow(-1);
                domClass.add(row, rLen == 0 ? 'header' : 'data');
                if (rLen % 2 == 1) {
                    domClass.add(row, 'odd');
                };
                rLen++;
            };
            while (rLen > totalRows) {
                table.deleteRow(rLen - 1);
                rLen--;
            };
    
            for (r = 0; r < rLen; r++) {
                row = table.rows[r];
                cLen = row.cells.length;
                while (cLen < totalCols) {
                    cell = row.insertCell(-1);
                    switch (cLen) {
                        case 0:
                            domClass.add(cell, 'labelCell');
                            break;
                        case 1:
                            domClass.add(cell, 'currentCell');
                            break;
                        default:
                            domClass.add(cell, 'dataCell');
                            break;
                    };
                    cLen++;
                };
                while (cLen > totalCols) {
                    row.deleteCell(cLen - 1);
                    cLen--;
                };
            };
    
            domStyle.set(this.scrollView, {
                left: (w - dataWidth) + 'px',
                top: (h - dataHeight) + 'px',
                width: (dataWidth) + 'px',
                height: (dataHeight) + 'px'
            });
    
            this.viewRows = dataRows;
            this.viewCols = dataCols;
        },
    
        updateScroller: function (dataRows, dataCols) {
            domStyle.set(this.sizerBox, {
                width: (dataCols * this.dataColWidth) + 'px',
                height: (dataRows * this.rowHeight) + 'px'
            });
        },
    
        /* Event Handlers */
        onSettingsChanged: function (settings) {
            if (settings.flowsheetShowColorBars != undefined) {
                this.set('showColorBars', settings.flowsheetShowColorBars);
            };
            if (settings.flowsheetShowFilterButtons != undefined) {
                var display = settings.flowsheetShowFilterButtons ? 'inline-block' : 'none';
                for (var flag in this.filterButtons) {
                    domStyle.set(this.filterButtons[flag].domNode, { display: display });
                };
                domStyle.set(this.autoFilterButton.domNode, { display: display });
            };
        },
    
        onWorkspaceReset: function () {
            if (this.graphWidget) {
                this.graphWidget.close();
            }

            if (this.noteSubscriptions) {
                array.forEach(this.noteSubscriptions, core.unsubscribe);
                this.noteSubscriptions = null;
            };
            if (this.tree) {
                this.tree.clear();
            };
            this.filter = this.defaultFilter;
            this.updateDataTable();
            this.updateDisplay();
        },
    
        onEditorDocumentLoaded: function () {
            if (!core.Patient && core.Encounter) {
                return;
            }
            var patientId = core.Patient.id;
            var encounterTime = core.Encounter.encounterTime;
    
            this.noteEditor = query('.qcNoteEditor').map(registry.byNode)[0];
            if (!this.noteEditor) {
                return;
            };
            var note = this.noteEditor.note;
            if (!note) {
                return;
            };
    
            if (!this.tree) {
                this.tree = new Tree();
                this.tree.noteEditor = this.noteEditor;
            };
    
            var pool = core.HistoryPool;
            if (!pool || pool.patientId != core.Patient.id || pool.encounterTime < encounterTime) {
                this.beginLoading('Loading patient history...', 500, 5000);
                pool = new HistoryPool();
                core.HistoryPool = pool;
            };
            this.pool = pool;
    
            this.noteSubscriptions = [
                topic.subscribe('/noteEditor/listAdded', lang.hitch(this, this.onEditorNoteChanged)),
                topic.subscribe('/noteEditor/listRemoved', lang.hitch(this, this.onEditorNoteChanged)),
                topic.subscribe('/noteEditor/findingAdded', lang.hitch(this, this.onEditorNoteChanged)),
                topic.subscribe('/noteEditor/findingRemoved', lang.hitch(this, this.onEditorNoteChanged)),
                topic.subscribe('/noteEditor/findingsRemoved', lang.hitch(this, this.onEditorNoteChanged)),
    
                topic.subscribe('/noteEditor/ListFocusChanged', lang.hitch(this, this.onEditorViewChanged)),
                topic.subscribe('/noteEditor/ListHighlightChanged', lang.hitch(this, this.onEditorViewChanged)),
                topic.subscribe('/noteEditor/SelectionChanged', lang.hitch(this, this.onEditorViewChanged)),
                topic.subscribe('/qc/ViewChanged', lang.hitch(this, this.onEditorViewChanged)),
                topic.subscribe('/qc/FindingClick', lang.hitch(this, this.onEditorViewChanged))
            ];
    
            var self = this;
    
            when(pool.load(patientId, encounterTime), function () {
                self.tree.loadDocument(note);
                self.tree.synchHistoryFindings(self.noteEditor, self.pool);
                self.applyFilter();
                self.updateDataTable();
                self.updateDisplay();
                self.endLoading();
            });
        },
    
        onEditorNoteChanged: function () {
            if (this.hUpdate) {
                clearTimeout(this.hUpdate);
                this.hUpdate = null;
            };
            this.hUpdate = setTimeout(lang.hitch(this, function () {
                var treeChanged = this.tree.synchNoteFindings(this.noteEditor.note);
                if (treeChanged) {
                    this.applyFilter();
                    this.updateDataTable();
                    this.updateDisplay();
                };
            }), 10);
        },
    
        onEditorViewChanged: function () {
            if (this.hUpdate) {
                clearTimeout(this.hUpdate);
                this.hUpdate = null;
            };
            this.hUpdate = setTimeout(lang.hitch(this, function () {
                this.hUpdate = null;
                this.applyFilter();
                this.updateDataTable();
                this.updateDisplay();
            }), 10);
        },

        onCollapseAll: function () {
            this.tree.collapseAll();
            this.updateDataTable();
            this.updateDisplay();
        },
    
        onExpandAll: function () {
            this.tree.expandAll();
            this.updateDataTable();
            this.updateDisplay();
        },
    
        onSetFilter: function (filter) {
            this.filter = filter;
            this.applyFilter();
            this.updateDataTable();
            this.updateDisplay();
        },
    
        onSetDateLabel: function (value) {
            array.forEach(this.headingMenu.getChildren(), function (item) {
                item.set('checked', (item.value == value));
            });
            this.dateHeadings = value;
            this.updateDisplay();
        },
    
        onToggleCiteMode: function () {
            this.set('citeMode', !this.get('citeMode'));
        },
    
        onGridScroll: function () {
            var posView = domGeometry.position(this.scrollView);
            var posData = domGeometry.position(this.sizerBox);
    
            var dx = posView.x - posData.x;
            var dy = posView.y - posData.y;
    
            var r = Math.round(dy / this.rowHeight);
            var c = Math.round(dx / this.dataColWidth);
            if (r != this.dr || c != this.dc) {
                this.dr = r;
                this.dc = c;
                this.updateDisplay();
            };
        },
    
        onGridClick: function (evt) {
            var table = this.viewTable;
            var row = null;
            var cell = null;
    
            if (domClass.contains(evt.target, 'sizerBox')) {
                cell = this.findCellFromPosition(evt.clientX, evt.clientY);
            }
            else {
                cell = this.findCellFromElement(evt.target);
            };
    
            if (!cell) {
                return;
            };
    
            row = cell.parentNode;
            if (!row) {
                return;
            };
    
            var node = null;
            var nodeId = row.getAttribute('data-node-id') || '';
            if (nodeId) {
                node = this.tree.findNode(nodeId);
            };
    
            var encounterId = table.rows[0].cells[cell.cellIndex].getAttribute('data-encounter-id');
    
            var updateNeeded = false;
    
            if (domClass.contains(evt.target, 'expander') && node && node.hasChildren()) {
                node.collapsed = !node.collapsed;
                updateNeeded = true;
            }
            else if (domClass.contains(evt.target, 'label') && node && !this.graphWidget) {
                var navigated = false;
    
                if (node.isFinding()) {
                    this.selectedNode = this.selectedNode && this.selectedNode.equals(node) ? null : node;
                    updateNeeded = true;
                    if (node.refWidget && this.filter.currentLevel != 'selected') {
                        if (node.parent && node.parent.refWidget && domClass.contains(node.parent.refWidget.domNode, 'hiddenFindingContainer')) {
                            this.noteEditor.select(node.parent.refWidget);
                            topic.publish('/noteEditor/NavigateTo', node.parent.refWidget.id);
                            navigated = true;
                        }
                        else if (this.noteEditor && node.refWidget) {
                            this.noteEditor.select(node.refWidget);
                        }
                    };
                };
    
                if (!navigated && node.refWidget) {
                    topic.publish('/noteEditor/NavigateTo', node.refWidget.id);
                }
            }
            else if (this.get('citeMode') && encounterId) {
                if (node && node.isFinding()) {
                    when(this.citeFinding(encounterId, node), function (nFinding) {
                        if (nFinding) {
                            topic.publish('/noteEditor/NavigateTo', nFinding.id)
                        };
                    });
                    updateNeeded = true;
                }
                else if (row.rowIndex == 0) {
                    this.citeEncounter(encounterId);
                    this.set('citeMode', false);
                    updateNeeded = true;
                }
            }
            else if (domClass.contains(evt.target, 'graphIcon') || (domClass.contains(evt.target, 'label') && this.graphWidget)) {
                this.selectedNode = node;
                updateNeeded = true;

                this.showGraph(node, row);
            }
    
            if (updateNeeded) {
                this.applyFilter();
                this.updateDataTable();
                this.updateDisplay();
            }
    
        },

        createGraphWidget: function () {
            var graphTab = new ContentPane({
                title: 'Flowsheet Graph'
            });

            domClass.add(graphTab.domNode, 'graphTab');

            core.app.workspace.tabControl.addChild(graphTab, 1);
            core.app.workspace.tabControl.selectChild(graphTab);

            var graphWidget = new Graph({
                options: this.lineGraphOptions
            });
            graphTab.addChild(graphWidget);

            graphWidget.startup();
            graphWidget.close = lang.hitch(this, function() {
                core.app.workspace.tabControl.removeChild(graphTab);
                graphTab.destroy();

                this.graphWidget = null;
            });

            aspect.after(graphTab, 'resize', lang.hitch(graphWidget, graphWidget.resize));

            return graphWidget;
        },

        getUnit: function(findingEntries) {
            var unit = null;

            core.forEachProperty(findingEntries, function(encounterId, entry) {
                if (unit == null && entry.unit) {
                    unit = entry.unit;
                }
            });

            return unit || '';
        },
    
        showGraph: function (node, row) {
            var addToGraph = true;
            var findingLabel;
            var finding;

            if (node.refWidget) {
                finding = node.refWidget.toFinding();
                findingLabel = finding.label ? finding.label : node.text.substring(node.text.lastIndexOf('>') + 1);
            }

            else {
                findingLabel = node.text.substring(node.text.lastIndexOf('>') + 1);
            }

            var findingEntries = this.pool.getFinding(node.medcinId, node.prefix).entries;

            if (!this.graphWidget) {
                this.graphWidget = this.createGraphWidget();
                this.graphWidget.flowsheetNodes.push(node);
                this.graphWidget.unit = this.getUnit(findingEntries);
            }

            else {
                var flowsheetNodeIndex = this.graphWidget.flowsheetNodes.indexOf(node);

                if (flowsheetNodeIndex != -1) {
                    this.graphWidget.flowsheetNodes.splice(flowsheetNodeIndex, 1);
                    this.graphWidget.graphData.datasets.splice(flowsheetNodeIndex, 1);

                    this.selectedNode = null;

                    addToGraph = false;
                }

                else {
                    if (this.graphWidget.unit == '' || this.graphWidget.unit != this.getUnit(findingEntries)) {
                        this.graphWidget.flowsheetNodes = [node];
                        this.graphWidget.graphData = {
                            datasets: [],
                            min: null,
                            max: null
                        };

                        this.graphWidget.unit = this.getUnit(findingEntries);
                    }

                    else {
                        if (this.graphWidget.flowsheetNodes.length == this.lineGraphColors.length) {
                            Tooltip.show('Only ' + this.lineGraphColors.length + ' items can be displayed in the graph at one time.', row, ['below', 'above']);

                            setTimeout(function () {
                                Tooltip.hide(row);
                            }, 5000);

                            return;
                        }

                        this.graphWidget.flowsheetNodes.push(node);
                    }
                }
            }

            if (this.graphWidget.flowsheetNodes.length == 0) {
                this.graphWidget.close();
                return;
            }

            var valueRangePromise = null;

            if (addToGraph) {
                var dataset = {
                    label: findingLabel,
                    data: []
                };

                core.forEachProperty(findingEntries, lang.hitch(this, function (encounterId, entry) {
                    if (typeof entry.value == 'number') {
                        if (!valueRangePromise) {
                            valueRangePromise = request.get(core.serviceURL('Medcin/Term/' + node.medcinId + '/ValueCheck'), {
                                query: {
                                    Value: entry.value,
                                    Unit: entry.unit || '',
                                    Sex: core.Patient.sex,
                                    Age: DateUtil.calculateAge(core.Patient.birthDate, new Date()).totalMinutes,
                                    DataFormat: 'JSON'
                                },
                                handleAs: 'json'
                            }).then(lang.hitch(this, function (data) {
                                if (data.term.normalHigh) {
                                    dataset.normalHigh = data.term.normalHigh;
                                    dataset.normalLow = data.term.normalLow;

                                    if (this.graphWidget.graphData.datasets.length > 0) {
                                        var numDigits = function(x) {
                                            return Math.max(Math.floor(Math.log10(Math.abs(x))), 0) + 1;
                                        }

                                        var normalHighDigits = 0;
                                        var normalLowDigits = 0;

                                        array.forEach(this.graphWidget.graphData.datasets, function(currentDataset) {
                                            if (typeof currentDataset.normalHigh == 'number') {
                                                normalHighDigits = normalHighDigits == 0 ? numDigits(currentDataset.normalHigh) : Math.max(normalHighDigits, numDigits(currentDataset.normalHigh));
                                                normalLowDigits = normalLowDigits == 0 ? numDigits(currentDataset.normalLow) : Math.min(normalLowDigits, numDigits(currentDataset.normalLow));
                                            }
                                        });

                                        if ((node.medcinId == 6046 || node.medcinId == 6047) && array.filter(this.graphWidget.flowsheetNodes, function(graphNode) {
                                            return graphNode.medcinId == 6046 || graphNode.medcinId == 6047;
                                        }).length > 0) {
                                            // Added an exception for displaying SBP and DBP on the same graph
                                        }

                                        else if (normalHighDigits == 0 || (numDigits(dataset.normalHigh) != normalHighDigits && numDigits(dataset.normalLow) != normalLowDigits)) {
                                            this.graphWidget.flowsheetNodes = [node];
                                            this.graphWidget.graphData = {
                                                datasets: [],
                                                min: null,
                                                max: null
                                            };

                                            this.updateDisplay();
                                        }
                                    }
                                }
                            }));
                        }

                        var encounter = this.pool.getEncounter(encounterId);
                        var insertIndex = 0;

                        for (; insertIndex < dataset.data.length; insertIndex++) {
                            if (encounter.time < dataset.data[insertIndex].x) {
                                break;
                            }
                        }

                        dataset.data.splice(insertIndex, 0, {
                            x: encounter.time,
                            y: entry.value
                        });
                    }
                }));

                if (finding && !isNaN(parseFloat(finding.value))) {
                    dataset.data.push({
                        x: core.Encounter.encounterTime,
                        y: parseFloat(finding.value)
                    });

                    if (!this.graphWidget.unit && finding.unit) {
                        this.graphWidget.unit = finding.unit;
                    }
                }

                valueRangePromise = when(valueRangePromise).then(lang.hitch(this, function() {
                    this.graphWidget.graphData.datasets.push(dataset);
                }));
            }

            return when(valueRangePromise).then(lang.hitch(this, function () {
                var title = '';

                this.graphWidget.yAxisBounds = this.getYAxisBounds(this.graphWidget.graphData.datasets);
                this.graphWidget.clear();

                array.forEach(this.graphWidget.graphData.datasets, lang.hitch(this, function (dataset, index) {
                    dataset.strokeColor = this.lineGraphColors[index];
                    dataset.pointColor = this.lineGraphColors[index];
                    dataset.pointStrokeColor = this.graphPointStrokeColor;
                    dataset.pointHighlightFill = this.graphPointHighlightFill;
                    dataset.pointHighlightStroke = this.lineGraphColors[index];

                    if (index > 0 && this.graphWidget.graphData.datasets.length > 2) {
                        title += ',';
                    }

                    if (index > 0) {
                        title += ' ';
                    }

                    if (this.graphWidget.graphData.datasets.length > 1 && index == this.graphWidget.graphData.datasets.length - 1) {
                        title += 'and ';
                    }

                    title += StringUtil.capitalize(dataset.label, 'title');
                }));

                this.graphWidget.setTitle(title);
                this.graphWidget.draw();
                this.graphWidget.createLegend();
            }));
        },

        getYAxisBounds: function (datasets) {
            var max = null;
            var min = null;

            array.forEach(datasets, function (dataset) {
                if (dataset.normalHigh) {
                    max = max == null ? dataset.normalHigh : Math.max(max, dataset.normalHigh);
                }

                if (dataset.normalLow) {
                    min = min == null ? dataset.normalLow : Math.min(min, dataset.normalLow);
                }

                array.forEach(dataset.data, function(dataPoint) {
                    if (max == null) {
                        max = dataPoint.y;
                    }

                    else {
                        max = Math.max(max, dataPoint.y);
                    }

                    if (min == null) {
                        min = dataPoint.y;
                    }

                    else {
                        min = Math.min(min, dataPoint.y);
                    }
                });
            });

            var cushionAmount = (max - min) * this.graphScaleCushionPercentage;

            if (min >= 0) {
                if (Math.floor(min - cushionAmount) > 0) {
                    min = Math.floor(min - cushionAmount);
                }

                else {
                    min = 0;
                }
            }

            else {
                min = Math.floor(min - cushionAmount);
            }

            max = Math.ceil(max + cushionAmount);

            return {
                max: max,
                min: min
            }
        },

        findCellFromElement: function (element) {
            while (element && element.tagName) {
                switch (element.tagName.toLowerCase()) {
                    case 'td':
                        return element;
                    case 'tr':
                    case 'tbody':
                    case 'table':
                        return null;
                    default:
                        element = element.parentNode;
                };
            }
            return null;
        },
    
        //retrn row,col from view table that contains x,y
        findCellFromPosition: function (x, y) {
            var table = this.viewTable;
            var rLen = table.rows.length;
            if (rLen == 0) {
                return null;
            };
    
            var cLen = table.rows[0].cells.length;
            if (cLen == 0) {
                return null;
            };
    
            var r = 0;
            var c = 0;
            var rMatch = -1;
            var cMatch = -1;
    
            while ((rMatch < 0 || cMatch < 0) && r >= 0 && r < rLen && c >= 0 && c < cLen) {
                pos = domGeometry.position(table.rows[r].cells[c]);
                if (rMatch < 0) {
                    if (y < pos.y) {
                        r--;
                    }
                    else if (y > pos.y + pos.h) {
                        r++;
                    }
                    else {
                        rMatch = r;
                    }
                };
    
                if (cMatch < 0) {
                    if (x < pos.x) {
                        c--;
                    }
                    else if (x > pos.x + pos.w) {
                        c++;
                    }
                    else {
                        cMatch = c;
                    };
                };
            };
    
            if (rMatch >= 0 && cMatch >= 0) {
                return table.rows[rMatch].cells[cMatch];
            }
            else {
                return null;
            }
        },
    
        citeFinding: function (encounterId, node) {
            if (!node.medcinId) {
                return null;
            };
    
            var hFinding = this.pool.getEntry(encounterId, node.medcinId, node.prefix || '');
            if (!hFinding) {
                return null;
            };
    
            var nFinding = node.refWidget;
            if (nFinding) {
                if (hFinding.value && !nFinding.get('value')) {
                    nFinding.set('value', hFinding.value);
                };
                if (hFinding.unit && !nFinding.get('unit')) {
                    nFinding.set('unit', hFinding.unit);
                };
                if (hFinding.result && !nFinding.get('result')) {
                    nFinding.set('result', hFinding.result);
                };
                nFinding.transcribe(nFinding);
	            topic.publish('/noteEditor/NavigateTo', nFinding.id);
            }
            else {
                var suppressSelection = this.filter.currentLevel == 'selected' ? true : false;
                var def = this.noteEditor.resolveAddFinding({
                    type: 'term',
                    medcinId: hFinding.medcinId,
                    prefix: hFinding.prefix || '',
                    result: hFinding.result || '',
                    value: hFinding.value || '',
                    unit: hFinding.unit || ''
                }, null, null, suppressSelection);
                when(def, function (newFinding) {
                    topic.publish('/noteEditor/NavigateTo', newFinding.id)
                });
            };
        },
    
        citeEncounter: function (encounterId) {
            this.suspendLayout();
    
            var defs = [];
            var hFinding = null;
            var nFinding = null;
    
            array.forEach(this.tree.visibleChildren(), function (node) {
                if (node.isFinding()) {
                    hFinding = this.pool.getEntry(encounterId, node.medcinId, node.prefix || '');
                    if (hFinding) {
                        nFinding = node.refWidget;
                        if (nFinding) {
                            if (hFinding.value && !nFinding.get('value')) {
                                nFinding.set('value', hFinding.value);
                            };
                            if (hFinding.unit && !nFinding.get('unit')) {
                                nFinding.set('unit', hFinding.unit);
                            };
                            if (hFinding.result && !nFinding.get('result')) {
                                nFinding.set('result', hFinding.result);
                            };
                        }
                        else {
                            defs.push(this.noteEditor.resolveAddFinding({
                                type: 'term',
                                medcinId: hFinding.medcinId,
                                prefix: hFinding.prefix || '',
                                result: hFinding.result || '',
                                value: hFinding.value || '',
                                unit: hFinding.unit || ''
                            }, null, null, true));
                        }
                    };
                };
            }, this);
    
            var self = this;
    
            var realDefs = array.filter(defs, function (d) { return d.promise != undefined });
            if (realDefs.length > 0) {
                var defList = realDefs.length > 0 ? new DeferredList(realDefs) : true;
                when(defList, function () {
                    self.applyFilter();
                    self.resumeLayout();
                });
            }
            else {
                self.applyFilter();
                self.resumeLayout();
            };
        },
    
        suspendLayout: function () {
            this._layoutSuspended = true;
        },
    
        resumeLayout: function () {
            this._layoutSuspended = false;
            this.updateDisplay();
        }
    });
});