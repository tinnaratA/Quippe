define([
    "qc/coding/CodingManager",
    "qc/coding/CodingOptionDialog",
    "qc/coding/FilterDialog",
    "qc/coding/Tree",
    "qc/coding/VocabChooserDialog",
    "qc/MenuItem",
    "qc/ReviewPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/form/Button",
    "dijit/form/DropDownButton",
    "dijit/layout/_LayoutWidget",
    "dijit/Menu",
    "dijit/MenuItem",
    "dijit/popup",
    "dijit/registry",
    "dijit/Toolbar",
    "dijit/ToolbarSeparator",
    "dijit/TooltipDialog",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/DeferredList",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    "dojo/when",
    "qc/_core"
], function (CodingManager, CodingOptionDialog, FilterDialog, Tree, VocabChooserDialog, qcMenuItem, ReviewPane, _TemplatedMixin, _WidgetBase, Button, DropDownButton, _LayoutWidget, Menu, MenuItem, popup, registry, Toolbar, ToolbarSeparator, TooltipDialog, array, declare, lang, DeferredList, domClass, domConstruct, domGeometry, domStyle, on, query, topic, when, core) {
    return declare("qc.coding.CodeReview", [_WidgetBase, _TemplatedMixin, _LayoutWidget, ReviewPane], {
        templateString: '<div></div>',
        tree: null,
        labels: null,
        headers: null,
        appSubscriptions: null,
        noteSubscriptions: null,
        events: null,
        noteEditor: null,
        _layoutSuspended: false,
    
        defaultFilter: { currentLevel: 'visible', excludeNonEntered: false, excludeNegatives: true, hideEmptyRows: true, hideEmptyCols: true },
        filter: { currentLevel: 'visible', excludeNonEntered: false, excludeNegatives: true, hideEmptyRows: true, hideEmptyCols: true },
    
        rowHeight: 25,
        headerRowHeight: 25,
        labelColWidth: 301,
        dataColWidth: 107,
        dr: 0,
        dc: 0,
        viewRows: 0,
        viewCols: 0,
        filterDialog: null,
        vocabDialog: null,
    
        vocab: [
            { name: 'acc', id: 2, caption: 'ACC', description: 'American College of Cardiology', show: false, sequence: 0 },
            { name: 'cas', id: 3, caption: 'CAS', description: 'Chemical Abstract Service', show: false, sequence: 0 },
            { name: 'ccc', id: 4, caption: 'CCC', description: 'Clinical Care Classification System', show: false, sequence: 0 },
            { name: 'cdt', id: 5, caption: 'CDT', description: 'Current Dental Terminology', show: false, sequence: 0 },
            { name: 'cpt', id: 6, caption: 'CPT', description: 'Current Procedural Terminology', show: true, sequence: 0 },
            { name: 'cvx', id: 7, caption: 'CVX', description: 'HL7 CVX - Vaccines Administered', show: false, sequence: 0 },
            { name: 'dsm', id: 8, caption: 'DSM', description: 'Diagnostic and Statistical Manual of Mental Disorders', show: true, sequence: 0 },
            { name: 'hcpc', id: 9, caption: 'HCPC', description: 'Healthcare Common Procedure Coding', show: false, sequence: 0 },
            { name: 'icd', id: 10, caption: 'ICD-9-CM', description: 'International Classification of Diseases, Rev. 9', show: true, sequence: 0 },
            { name: 'icd10', id: 11, caption: 'ICD-10-CM', description: 'International Classification of Diseases, Rev. 10', show: true, sequence: 0 },
            { name: 'icdo', id: 12, caption: 'ICD-O-3', description: 'International Classification of Diseases for Oncology', show: false, sequence: 0 },
            { name: 'icdproc', id: 13, caption: 'ICD-9-CM Proc', description: 'ICD-9-CM Vol. 3 Procedures', show: false, sequence: 0 },
            { name: 'loinc', id: 14, caption: 'LOINC', description: 'Logical Observation Identifiers Names and Codes', show: true, sequence: 0 },
            { name: 'medcin', id: 1, caption: 'MEDCIN', description: 'MEDCIN', show: true },
            { name: 'rxnorm', id: 15, caption: 'RxNorm', description: 'RxNorm', show: true },
            { name: 'snomed', id: 16, caption: 'SNOMED-CT', description: 'Systematized Nomenclature of Medicine-Clinical Terms', show: true, sequence: 0 },
            { name: 'unii', id: 17, caption: 'SRS UNII', description: 'Substance Registration System Unique Ingredient Identifier', show: false, sequence: 0 }
        ],
    
        startup: function () {
        	if (!this._started) {
                this.loadVocabs();
    
                domClass.add(this.domNode, 'qcCodeReview');
                domClass.add(this.domNode, 'colorBars');
    
                this.viewTable = domConstruct.place('<table></table>', this.domNode);
                this.scrollView = domConstruct.place('<div class="scrollView"></div>', this.domNode);
                this.sizerBox = domConstruct.place('<div class="sizerBox"></div>', this.scrollView);
    
                this.defaultFilter = {
                    currentLevel: core.settings.codeReviewFilterCurrentLevel || 'visible',
                    excludeNonEntered: core.settings.codeReviewFilterExcludeNonEntered == undefined ? true : core.settings.codeReviewFilterExcludeNonEntered,
                    excludeNegatives: core.settings.codeReviewFilterExcludeNegatives == undefined ? true : core.settings.codeReviewFilterExcludeNegatives,
                    hideEmptyRows: core.settings.codeReviewFilterHideEmptyRows == undefined ? true : core.settings.codeReviewFilterHideEmptyRows,
                    hideEmptyCols: core.settings.codeReviewFilterHideEmptyCols == undefined ? true : core.settings.codeReviewFilterHideEmptyCols
                };
                this.filter = this.defaultFilter;
    
                this.filterDialog = new FilterDialog();
                this.filterDialog.startup();
    
                this.inherited(arguments);
                this.resize();
            };
        },
    
        loadVocabs: function () {
        	var self = this;

            when(CodingManager.loadVocabs(), function (vocabs) {
                self.vocab = vocabs;
    
                if (core.settings.codeReviewSelectedVocabs) {
                    array.forEach(self.vocab, function (vocab) { vocab.show = false; });
                    array.forEach(core.settings.codeReviewSelectedVocabs.split(','), function (v) {
                        var vocab = self.getVocabByName(v);
                        if (vocab) {
                            vocab.show = true;
                        };
                    }, self);
                };
    
                if (core.settings.codeReviewVocabSequence) {
                    var seq = core.settings.codeReviewVocabSequence.split(',');
                    for (var s = 0; s < seq.length; s++) {
                        var vocab = self.getVocabByName(seq[s]);
                        if (vocab) {
                            vocab.sequence = s;
                        };
                    };
                };
    
                self.vocab.sort(function (a, b) {
                    var n = (a.sequence || 0) - (b.sequence || 0);
                    if (n == 0) {
                        return a.caption <= b.caption ? -1 : 1;
                    }
                    else {
                        return n;
                    }
                });
    
                self.vocabDialog = new VocabChooserDialog();
                self.vocabDialog.startup();
                self.vocabDialog.loadVocabs(self);
                self.vocabDialog.set('dataChanged', false);
            });
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
	        filterButton._onBlur = function() {
	        };
	        list.push(filterButton);
    
            var vocabButton = new DropDownButton({
            	label: 'Vocabularies',
            	showLabel: true,
				dropDown: this.vocabDialog
            });
            vocabButton._onBlur = function () {
            };
            list.push(vocabButton);
    
            list.push(new ToolbarSeparator());
    
            var btnCollapseAll = new Button({
                label: 'Collapse All',
                showLabel: true,
                onClick: function () { topic.publish('/codereview/CollapseAll') }
            });
            list.push(btnCollapseAll);
    
            var btnExpandAll = new Button({
                label: 'Expand All',
                showLabel: true,
                onClick: function () { topic.publish('/codereview/ExpandAll') }
            });
            list.push(btnExpandAll);
    
            list.push(new ToolbarSeparator());
    
            this.refreshButton = new Button({
                label: 'Refresh',
                showLabel: true,
                onClick: lang.hitch(this, this.recalc)
            });
            list.push(this.refreshButton);
    
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
                topic.subscribe('/codereview/CollapseAll', lang.hitch(this, this.onCollapseAll)),
                topic.subscribe('/codereview/ExpandAll', lang.hitch(this, this.onExpandAll)),
                topic.subscribe('/codereview/SetFilter', lang.hitch(this, this.onSetFilter)),
                topic.subscribe('/codereview/ShowFilter', lang.hitch(this, this.onShowFilter)),
                topic.subscribe('/coding/CodeChanged', lang.hitch(this, this.onCodeChanged)),
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
                array.forEach(this.noteSubscriptions, core.unsubscribe);
                this.noteSubscriptions = null;
            };
            if (this.events) {
                array.forEach(this.events, core.disconnect);
                this.events = null;
            };
            if (this.tree) {
                this.tree.clear();
            };
        },
    
        recalc: function () {
            var self = this;
            when(this.calculate(), function () {
                self.applyFilter();
                self.updateDataTable();
                self.updateDisplay();
            });
        },
    
        calculate: function () {
            //TODO: include filter & vocabs...
    
        	var vocabs = array.filter(this.vocab, function (x) { return x.show });

			return CodingManager.mapChart(null, vocabs);
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
    
            if (!(this.tree)) {
                return this.clearDataTable();
            };
    
            var labels = this.tree.visibleChildren();
            var r = 0;
            var rLen = labels.length;
            if (rLen == 0) {
                return this.clearDataTable();
            };
    
            this.vocab.sort(function (a, b) {
                var n = (a.sequence || 0) - (b.sequence || 0);
                if (n == 0) {
                    return a.caption <= b.caption ? -1 : 1;
                }
                else {
                    return n;
                }
            });
    
            var filter = this.filter;
            var headers = [];
            var emptyColumn = true;
            var vocabName = '';
            var node = null;
            array.forEach(this.vocab, function (v) {
                if (v.show) {
                    vocabName = v.name;
                    emptyColumn = true;
                    r = 0;
                    while (r < rLen && emptyColumn) {
                        node = labels[r];
                        if (node.isNoteFinding()
                            && node.refWidget.codingInfo
                            && node.refWidget.codingInfo[vocabName]
                            && ((node.refWidget.codingInfo[vocabName].length > 0) || !filter.hideEmptyCols)) {
                            emptyColumn = false;
                        }
                        else {
                            r++;
                        };
                    };
                    if (!emptyColumn) {
                        headers.push(v);
                    };
                };
            });
    
            this.labels = labels;
            this.headers = headers;
            this.updateScroller(this.labels.length + 1, this.headers.length + 1);
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
            var headers = this.headers;
            if (!nodes || !headers) {
                return this.clearViewTable();
            };
    
            var node = null;
            var header = null;
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
            var dcLen = headers.length;
            var dr = 0;
            var dc = 0;
    
    
            //top-left headers
            row = table.rows[0];
            if (drLen > 0) {
                row.cells[0].innerHTML = '<span style="margin-left:4px">Finding</span>';
            }
            else {
                row.cells[0].innerHTML = '';
            };
    
            //column headers
            dc = dcStart;
            for (vc = 0; vc < vcLen; vc++) {
                cell = row.cells[vc + 1];
                if (dc < dcLen) {
                    header = headers[dc];
                    cell.setAttribute('data-vocab-name', header.name);
                    cell.innerHTML = header.caption;
                    dc++;
                }
                else {
                    cell.setAttribute('data-vocab-name', '');
                    cell.innerHTML = '';
                    this.clearViewTable(0, vc + 1, vrLen, vc + 1);
                }
            };
    
            var vocab = null;
            //data
            dr = drStart;
            for (vr = 0; vr < vrLen; vr++) {
                row = table.rows[vr + 1];
                node = dr < drLen ? nodes[dr] : null;
                if (node) {
                    row.cells[0].innerHTML = this.createLabelHtml(node);
                    domClass.toggle(row, 'highlight', (selectedNode && selectedNode.equals(node)));
                    domClass.toggle(row, 'group', (node.isGroup()));
                    row.setAttribute('data-node-id', node.id);
    
                    if (node.isFinding()) {
                        dc = dcStart;
                        for (vc = 0; vc < vcLen; vc++) {
                            vocab = headers[dc];
                            cell = row.cells[vc + 1];
                            //cell.innerHTML = this.createDataHtml(node, vocab);
                            this.writeCodeLabel(cell, node, vocab);
                            dc++;
                        };
                    }
                    else {
                        this.clearViewTable(vr + 1, 1, vr + 1, vcLen + 1);
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
            return '<div '
                + ' data-node-id="' + node.id + '"'
                + ' class="' + classNames.join(' ') + '"'
                + ' style="margin-left:' + (16 * (node.level - 1)) + 'px;"'
                + '>'
                + '<div class="expander"></div>'
                + '<div class="label">' + node.text + '</div>'
                + '</div>';
        },
    
    
        writeCodeLabel: function (cell, node, vocab) {
            if (!(vocab && node && node.refWidget)) {
                return;
            };
    
            if (vocab.name == 'medcin') {
                this.writeMedcinCodeLabel(cell, node);
                return;
            };
    
            if (!node.refWidget.codingInfo) {
                return;
            };
    
            cell.innerHTML = '';
            var isMapped = node.isNoteFinding() && node.refWidget.codes && node.refWidget.codes[vocab.name];
            var mapSuppressed = isMapped && !node.refWidget.codes[vocab.name].code
            var hasInfo = vocab.name != 'medcin' && node.refWidget.codingInfo[vocab.name] && node.refWidget.codingInfo[vocab.name].length > 0;
            //var hasOptions = hasInfo && node.refWidget.codingInfo[vocab.name].length > 1;
            var isReportable = isMapped && !node.refWidget.codes[vocab.name].unreportable;
    
            var codeText = isMapped ? mapSuppressed ? '-' : node.refWidget.codes[vocab.name].code : hasInfo ? '?' : '';
    
            var dataDiv = domConstruct.place('<div class="codeCellData"></div>', cell);
            var codeDiv = domConstruct.place('<div class="code"></div>', dataDiv);
            if (isMapped && !mapSuppressed) {
                domClass.add(codeDiv, 'entered');
            };
            if (!isReportable) {
                domClass.add(codeDiv, 'unreportable');
            };
            codeDiv.innerHTML = codeText;
    
            //var infoDiv = domConstruct.place('<div class="info"></div>', dataDiv);
        },
    
        writeMedcinCodeLabel: function (cell, node) {
            cell.innerHTML = '';
            var dataDiv = domConstruct.place('<div class="codeCellData"></div>', cell);
            var codeDiv = domConstruct.place('<div class="code entered"></div>', dataDiv);
            codeDiv.innerHTML = node.refWidget.get('medcinId') + ' ' + node.refWidget.get('prefix');
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
                        row.cells[c].setAttribute('data-vocab-name', '');
                    }
                };
            };
            return true;
        },
    
        /* Filter */
        applyFilter: function (filter) {
            if (this.tree && this.noteEditor) {
                filter = filter || this.filter || this.defaultFilter || null;
                var selectedVocabs = array.filter(this.vocab, function (v) { return v.show }).map(function (x) { return x.name });
                this.filter = filter;
                this.tree.applyFilter(filter, selectedVocabs, this.noteEditor.viewMode);
            };
        },
    
        /* Layout */
        updateGridSize: function (w, h) {
            var table = this.viewTable;
            var row = null;
            var cell = null;
            var r = 0;
            var rLen = 0;
            var cLen = 0;
    
            var dataWidth = w > 0 ? w - this.labelColWidth : 0;
            var dataCols = Math.floor(dataWidth / this.dataColWidth) + 1;
    
            var dataHeight = h > 0 ? h - this.headerRowHeight : 0;
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
            if (settings.codingShowColorBars != undefined) {
                this.set('showColorBars', settings.flowsheetShowColorBars);
            };
    
            this.defaultFilter = {
                currentLevel: core.settings.codeReviewFilterCurrentLevel || 'visible',
                excludeNonEntered: core.settings.codeReviewFilterExcludeNonEntered == undefined ? true : core.settings.codeReviewFilterExcludeNonEntered,
                excludeNegatives: core.settings.codeReviewFilterExcludeNegatives == undefined ? true : core.settings.codeReviewFilterExcludeNegatives,
                hideEmptyRows: core.settings.codeReviewFilterHideEmptyRows == undefined ? true : core.settings.codeReviewFilterHideEmptyRows,
                hideEmptyCols: core.settings.codeReviewFilterHideEmptyCols == undefined ? true : core.settings.codeReviewFilterHideEmptyCols
            };
        },
    
        onWorkspaceReset: function () {
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
            };
    
            this.noteSubscriptions = [
                topic.subscribe('/noteEditor/listAdded', lang.hitch(this,this.onEditorNoteChanged)),
                topic.subscribe('/noteEditor/listRemoved', lang.hitch(this, this.onEditorNoteChanged)),
                topic.subscribe('/noteEditor/findingAdded', lang.hitch(this, this.onEditorNoteChanged)),
                topic.subscribe('/noteEditor/findingRemoved', lang.hitch(this, this.onEditorNoteChanged)),
                topic.subscribe('/noteEditor/findingsRemoved', lang.hitch(this, this.onEditorNoteChanged)),
    
                topic.subscribe('/noteEditor/ListFocusChanged', lang.hitch(this, this.onEditorViewChanged)),
                topic.subscribe('/noteEditor/ListHighlightChanged', lang.hitch(this, this.onEditorViewChanged)),
                topic.subscribe('/noteEditor/SelectionChanged', lang.hitch(this, this.onEditorViewChanged)),
                topic.subscribe('/qc/ViewChanged', lang.hitch(this, this.onEditorViewChanged)),
				topic.subscribe('/qc/FindingDetailsUpdated', lang.hitch(this, this.onEditorNoteChangedForceRecalc)),
				topic.subscribe('/qc/DragDropComplete', lang.hitch(this, this.onEditorNoteChanged)),
				topic.subscribe('/qc/FindingResultChanged', lang.hitch(this, this.onEditorNoteChanged))
            ];
    
            this.beginLoading('Loading Code Mappings...', 1000, 10000);
            this.tree.loadDocument(note);
            var self = this;
            when(this.calculate(), function () {
                self.applyFilter();
                self.updateDataTable();
                self.updateDisplay();
                self.endLoading();
            });
        },

        onEditorNoteChangedForceRecalc: function() {
            this.tree.synchNoteFindings(this.noteEditor.note);
            this.recalc();
        },
    
        onEditorNoteChanged: function () {
            var treeChanged = this.tree.synchNoteFindings(this.noteEditor.note);
            if (treeChanged) {
                this.recalc();
            };
        },
    
        onEditorViewChanged: function () {
            this.applyFilter();
            this.updateDataTable();
            this.updateDisplay();
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
            popup.close();
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
    
            var vocabName = table.rows[0].cells[cell.cellIndex].getAttribute('data-vocab-name');
    
            var updateNeeded = false;
    
            if (domClass.contains(evt.target, 'expander') && node && node.hasChildren()) {
                node.collapsed = !node.collapsed;
                updateNeeded = true;
            }
            else if (domClass.contains(evt.target, 'label') && node) {
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
                        else {
                            this.noteEditor.select(node.refWidget);
                        }
                    };
                };
    
                if (!navigated && node.refWidget) {
                    topic.publish('/noteEditor/NavigateTo', node.refWidget.id);
                };
            }
            else if (node && vocabName && node.isFinding()) {
                updateNeeded = false;
                this.showCodingOptions(node, vocabName, cell);
            };
    
            if (updateNeeded) {
                this.applyFilter();
                this.updateDataTable();
                this.updateDisplay();
            }
    
        },
    
        showCodingOptions: function (node, vocabName, cell) {
            popup.close();
    
            if (!node || !vocabName || !cell) {
                return;
            };
    
            if (!node.isFinding()) {
                return;
            };
    
            if (!node.refWidget.codingInfo) {
                return;
            };
    
            if (!node.refWidget.codingInfo[vocabName]) {
                return;
            };
    
            var optionDialog = null;
            if (this.optionDialog) {
                optionDialog = this.optionDialog;
                optionDialog.resetContent();
            }
            else {
                optionDialog = new CodingOptionDialog();
                optionDialog.startup();
            };
    
            if (!optionDialog.loadMap(node, vocabName)) {
                return;
            };
    
            if (this.tooltipDialog) {
                this.tooltipDialog.destroyRecursive();
            };
    
            this.tooltipDialog = new TooltipDialog();
            this.tooltipDialog.startup();
            this.tooltipDialog.set('content', optionDialog);
    
            var popupArgs = { popup: this.tooltipDialog, around: cell, orient: { TL: 'BL', TR: 'BL' }, onCancel: function () { }, onClose: function () { } };
            optionDialog.popupArgs = popupArgs;
            var hPopup = popup.open(popupArgs);
            optionDialog.popupPosition = hPopup;
            optionDialog.reposition();
        },
    
        onCodeChanged: function () {
            this.applyFilter();
            this.updateDataTable();
            this.updateDisplay();
        },
    
        //    onApplyOptions: function (optionsPanel, entry) {
        //        this.applyFilter();
        //        this.updateDataTable();
        //        this.updateDisplay();
        //        this.onCancelOptions(optionsPanel);
        //    },
    
        //    onCancelOptions: function (optionsPanel) {
        //        popup.close();
        //        if (optionsPanel) {
        //            optionsPanel.destroyRecursive();
        //        };
        //    },
    
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
            var pos = null;
    
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
    
        getVocabByName: function (name) {
            for (var v = 0; v < this.vocab.length; v++) {
                if (this.vocab[v].name == name) {
                    return this.vocab[v];
                };
            };
            return null;
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