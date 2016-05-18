define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/json",
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    "dojo/when",
    "dijit/_WidgetBase",
    "dijit/layout/_LayoutWidget",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/form/DropDownButton",
    "dijit/Menu",
    "dijit/popup",
    "qc/ReviewPane",
    "qc/Label",
    "qc/MenuItem",
    "qc/cqm/ServiceManager",
    "qc/cqm/FilterDialog",
    "qc/cqm/MeasureChooserDialog",
    "qc/StringUtil",
    "qc/_core"
], function (declare, array, lang, domClass, domConstruct, domStyle, json, on, query, topic, when, _WidgetBase, _LayoutWidget, Button, TextBox, DropDownButton, Menu, popup, ReviewPane, Label, MenuItem, ServiceManager, FilterDialog, MeasureChooserDialog, StringUtil, core) {
    var typeDef = declare('qc.cqm.ReviewPane', [_WidgetBase, _LayoutWidget, ReviewPane], {
        filter: null,
        selectedMeasures: null,
        responseTable: null,
        responseEvents: null,
        subscriptions: null,
        autoRecalc: false,
        sortProperty: 'status',
        sortOrder: 1,
        
        startup: function () {
            if (!this._started) {

                this.defaultFilter = {
                    currentLevel: core.settings.cqmReviewFilterCurrentLevel || 'applicable',
                    hideInfoOnly: core.settings.cqmReviewFilterHideInfoOnly == undefined ? true : core.settings.cqmReviewFilterHideInfoOnly
                };
                this.filter = this.defaultFilter;
                this.filterDialog = new FilterDialog({ owner: this });
                this.filterDialog.startup();

                this.measuresDialog = new MeasureChooserDialog({ owner: self });
                this.measuresDialog.startup();

                this._initResponseTable();
                
                domClass.add(this.domNode, 'qcCqmReviewPane');
                domClass.add(this.domNode, 'colorBars');
                domStyle.set(this.domNode, { width: '100%', height: '100%' });
                this.inherited(arguments);
            };
        },

        show: function() {
            if (!this.subscriptions) {
                this.subscriptions = [];
                this.subscriptions.push(topic.subscribe('/cqm/measuresUpdated', lang.hitch(this, this.onMeasuresUpdated)));
                this.subscriptions.push(topic.subscribe('/cqm/NoteDataUpdated', lang.hitch(this, this.onNoteDataUpdated)));
                if (this.autoRecalc) {
                    this.subscriptions.push(topic.subscribe('/qc/FindingResultChanged', lang.hitch(this, this.onNoteChanged)));
                    this.subscriptions.push(topic.subscribe('/qc/FindingDetailsUpdated', lang.hitch(this, this.onNoteChanged)));
                    this.subscriptions.push(topic.subscribe('/qc/ContentLoaded', lang.hitch(this, this.onNoteChanged)));
                    this.subscriptions.push(topic.subscribe('/noteEditor/listAdded', lang.hitch(this, this.onNoteChanged)));
                    this.subscriptions.push(topic.subscribe('/noteEditor/listRemoved', lang.hitch(this, this.onNoteChanged)));
                    this.subscriptions.push(topic.subscribe('/noteEditor/findingAdded', lang.hitch(this, this.onNoteChanged)));
                    this.subscriptions.push(topic.subscribe('/noteEditor/findingRemoved', lang.hitch(this, this.onNoteChanged)));
                    this.subscriptions.push(topic.subscribe('/noteEditor/findingsRemoved', lang.hitch(this, this.onNoteChanged)));
                };
            };
            this.calculate();
        },

        hide: function() {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, function (h) { h.remove() });
                this.subscriptions = null;
            };
        },

        _setFilterAttr: function(filter) {
            this.filter = filter || this.defaultFilter;
            this.render();
        },

        getToolbarItems: function () {
            var list = [];

            var label = new Label({ 'text': 'Quality Measure Review' });
            domStyle.set(label.domNode, { fontWeight: 'bold', marginLeft: '4px', marginRight: '12px' });
            list.push(label);

            var filterButton = new DropDownButton({
                label: 'View',
                showLabel: true,
                dropDown: this.filterDialog
            });

            filterButton.isLoaded = lang.hitch(this, function () {
                this.filterDialog.loadFilter(this.filter);
                return true;
            });
            filterButton._onBlur = function () { };
            list.push(filterButton);

            var measuresButton = new DropDownButton({
                label: 'Measures',
                showLabel: true,
                dropDown: this.measuresDialog
            });
            measuresButton._onBlur = function () { };
            list.push(measuresButton);

            var calcButton = new Button({
                label: 'Recalculate',
                showLabel: true,
                onClick: lang.hitch(this, function () { this.calculate() })
            });
            list.push(calcButton);

            return list;
        },

        calculate: function (measureCodes) {
            if (this.hChangeTimer) {
                clearTimeout(this.hChangeTimer);
                this.hChangeTimer = null;
            };
            ServiceManager.evaluate(measureCodes);
        },

        clear: function() {
            if (this.responseTable) {
                while (this.responseTable.rows.length > 1) {
                    this.responseTable.deleteRow(this.responseTable.rows.length - 1);
                };
            };
            if (this.responseEvents) {
                array.forEach(this.responseEvents, function (h) {
                    h.remove();
                });
                this.responseEvents = null;
            };
        },

        onMeasuresUpdated: function(measures) {
            this.render();
        },

        onNoteDataUpdated: function (measureCodes) {
            if (this.hChangeTimer) {
                clearTimeout(this.hChangeTimer);
                this.hChangeTimer = null;
            };
            this.hChangeTimer = setTimeout(lang.hitch(this, function () { this.calculate(measureCodes) }), 300);
        },

        render: function () {
            var sortProperty = this.sortProperty || 'status';
            var sortOrder = this.sortOrder || 1;
            var level = this.filter.currentLevel;
            var hideInfoOnly = this.filter.hideInfoOnly;

            var measures = ServiceManager.getMeasures().filter(function (m) {
                //var status = m.status || {};
                if (hideInfoOnly && m.infoOnly) {
                    return false;
                };
                if (level == 'all') {
                    return true;
                };
                if (ServiceManager.isSelected(m)) {
                    if (level == 'selected') {
                        return true;
                    }
                    else if (m.response && m.response.evaluationResult >= 2) {
                        if (level == 'applicable') {
                            return true;
                        }
                        else {
                            // level == incomplete
                            //return !status.complete;
                            return m.response.evaluationResult < 7;
                        };
                    };
                };
                return false;
            }).sort(function (a, b) {
                    var n = 0;
                    if (sortProperty == 'action') {
                        n = (a.contentItems ? 0 : 1) - (b.contentItems ? 0 : 1);
                    }
                    else if (sortProperty == 'status') {
                        n = StringUtil.compare(a.status ? a.status.text : '',b.status ? b.status.text : '');
                    }
                    else {
                        n = StringUtil.compare(a[sortProperty], b[sortProperty]);
                    };

                    if (n == 0) {
                        n = StringUtil.compare(a.code, b.code);
                    };

                    if (n == 0) {
                        n = StringUtil.compare(a.text, b.text);
                    };

                    return n * sortOrder;
            });

            this.clear();
            var table = this.responseTable;
            var self = this;
            array.forEach(measures, function (measure, i) {
                measure.status = measure.status || {text: 'unknown'};
                var actionButton = null;
                if (measure.contentItems && measure.contentItems.length > 0) {
                    if (measure.contentItems.length == 1) {
                        measure.contentItems[0].measureCode = measure.code;
                        actionButton = new Button({
                            label: measure.contentItems[0].type == 'list' ? 'Prompt List' : 'Entry Form',
                            showLabel: false,
                            iconClass: core.getItemIcon(measure.contentItems[0].type),
                            onClick: function () { topic.publish('/qc/AddToNote', measure.contentItems[0]) }
                        });
                        domClass.add(actionButton.domNode, 'ic16');
                    }
                    else {
                        var menu = new Menu();
                        array.forEach(measure.contentItems, function (item) {
                            item.measureCode = measure.code;
                            menu.addChild(new MenuItem({
                                label: item.text,
                                showLabel: true,
                                iconClass: core.getItemIcon(item.type),
                                onClick: function () { topic.publish('/qc/AddToNote', item) }
                            }))
                        });
                        domClass.add(menu.domNode, 'ic16');

                        actionButton = new DropDownButton({
                            label: measure.contentItems[0].type == 'list' ? 'Prompt List' : 'Entry Form',
                            showLabel: false,
                            iconClass: core.getItemIcon(measure.contentItems[0].type),
                            //onClick: function () { topic.publish('/qc/AddToNote', measure.contentItems[0]) },
                            dropDown: menu
                        });
                        domClass.add(actionButton.domNode, 'ic16');
                    }
                };

                var row = table.insertRow(-1);
                row.measure = measure;
                domClass.add(row, 'data');
                domClass.add(row, i % 2 == 0 ? 'even' : 'odd');

                var cell = null;

                cell = row.insertCell(-1);
                domClass.add(cell, 'status');
                cell.innerHTML = measure.status.text;
                //var icon = domConstruct.place('<div class="icon"></div>', cell);
                //if (measure.status.complete) {
                //    domClass.add(icon, "document_ok");
                //}
                //else if (measure.status.applicable) {
                //    domClass.add(icon, "document_unknown");
                //}
                //else if (measure.infoOnly) {
                //    domClass.add(icon, "document_information");
                //}
                //else {
                //    domClass.add(icon, "document_forbidden");
                //};
                

                cell = row.insertCell(-1);
                domClass.add(cell, 'code');
                cell.innerHTML = measure.code || measure.id || '';

                cell = row.insertCell(-1);
                domClass.add(cell, 'description');
                cell.innerHTML = measure.name || '';

                cell = row.insertCell(-1);
                domClass.add(cell, 'action');
                if (actionButton) {
                    actionButton.placeAt(cell);
                };

                cell = row.insertCell(-1);
                domClass.add(cell, 'info');
                if (measure.hasDocument) {
                    var infoButton = new Button({
                        label: 'Measure documentation',
                        showLabel: false,
                        iconClass: 'document',
                        onClick: function () { window.open(core.serviceURL('Quippe/Coding/CQM/Measure/Document?Measure=' + measure.code), 'CQMMeasureInfo' + measure.code) }
                    });
                    infoButton.placeAt(cell);
                };

                cell = row.insertCell(-1);
                domClass.add(cell, 'hide');
                var ignoreButton = new Button({
                    //label: 'Ignore this measure for now',
                    label: '<div class="minusSignDiv" title="Hide this measure for now"></div>',
                    showLabel: true,
                    //iconClass: 'xdel disabled',
                    onClick: lang.hitch(self, function () {
                        ServiceManager.removeSelectedMeasureCode(measure.code);
                        self.render();
                    })
                });
                ignoreButton.placeAt(cell);

            });

            this.domNode.appendChild(table);
        },

        _initResponseTable: function() {
            this.responseTable = domConstruct.place('<table class="responseTable ic16"></table>', this.domNode);

            var row = this.responseTable.insertRow(-1);
            domClass.add(row, 'header');

            var cell = null;
            var span = null;

            cell = row.insertCell(-1);
            span = domConstruct.place('<span class="innerLabel">Status</span>', cell);
            domClass.add(cell, 'status');
            domClass.add(cell, 'sort');
            cell.setAttribute('data-measure-property', 'status');

            cell = row.insertCell(-1);
            span = domConstruct.place('<span class="innerLabel">Measure</span>', cell);
            domClass.add(cell, 'code');
            cell.setAttribute('data-measure-property', 'code');

            cell = row.insertCell(-1);
            span = domConstruct.place('<span class="innerLabel">Description</span>', cell);
            domClass.add(cell, 'name');
            cell.setAttribute('data-measure-property', 'name');

            cell = row.insertCell(-1);
            cell.setAttribute('colspan', 3);
            span = domConstruct.place('<span class="innerLabel">Actions</span>', cell);
            domClass.add(cell, 'action');
            cell.setAttribute('data-measure-property', 'action');

            on(this.responseTable, 'click', lang.hitch(this, this.onResponseTableClick));
        },

       
        onFilterChanged: function(filter) {
            this.filter = filter || this.defaultFilter;
            this.render();
        },

        onResponseTableClick: function(evt) {
            var cell = core.ancestorNodeByTagName(evt.target, 'td', true);
            if (!cell) {
                return;
            };

            var row = cell.parentNode;

            if (domClass.contains(row, 'header')) {
                if (domClass.contains(cell, 'sort')) {
                    if (domClass.contains(cell, 'desc')) {
                        domClass.remove(cell, 'desc');
                        this.sortOrder = 1;
                    }
                    else {
                        domClass.add(cell, 'desc');
                        this.sortOrder = -1;
                    };
                    this.sortProperty = cell.getAttribute('data-measure-property');
                }
                else {
                    query('.sort', row).removeClass('sort');
                    domClass.add(cell, 'sort');
                    domClass.remove(cell, 'desc');
                    this.sortProperty = cell.getAttribute('data-measure-property');
                    this.sortOrder = 1;
                };
                this.render();
                return;
            };
        },

        onNoteChanged: function () {
            if (this.hNoteChangeTimer) {
                clearTimeout(this.hNoteChangeTimer);
                this.hNoteChangeTimer = null;
            };
            this.hNoteChangeTimer = setTimeout(lang.hitch(ServiceManager, ServiceManager.evaluate), 1000);
        }
    });

    return typeDef;
});