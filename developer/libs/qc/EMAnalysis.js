define([
    "qc/DataBinder",
    "qc/FilteringSelect",
    "qc/Label",
    "qc/ReviewPane",
    "qc/SettingsEnumStore",
    "qc/XmlWriter",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/NumberSpinner",
    "dijit/form/Select",
    "dijit/registry",
    "dijit/TitlePane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/text!qc/templates/EMAnalysis.htm",
    "dojo/topic",
    "dojo/when",
    "qc/_core",
    "dojo/request",
    "qc/DateUtil",
    "qc/Transcriber"
], function (DataBinder, FilteringSelect, Label, ReviewPane, SettingsEnumStore, XmlWriter, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Button, CheckBox, NumberSpinner, Select, registry, TitlePane, array, declare, lang, domClass, domConstruct, domStyle, on, query, EMAnalysisTemplate, topic, when, core, request, DateUtil, Transcriber) {
	return declare("qc.EMAnalysis", [_WidgetBase, _TemplatedMixin, ReviewPane, _WidgetsInTemplateMixin], {
        templateString: EMAnalysisTemplate,
        ready: null,
        inputShown: false,
        calcResult: null,
        floorTimeMedcinId: 133357,
        overHalfMedcinId: 133358,
    
        componentInfo: [],
    
    
        startup: function () {
            if (!this._started) {
                this.componentInfo = [
                    { code: 0, label: '', levelLabels: [] },
                    { code: 1, label: "HPI", levelLabels: [core.getI18n('embrief'), core.getI18n('emextended'), '', ''] },
                    { code: 2, label: 'ROS', levelLabels: [core.getI18n('empertinent'), core.getI18n('emextended'), core.getI18n('emcomplete'), ''] },
                    { code: 3, label: 'PFSH', levelLabels: [core.getI18n('empertinent'), core.getI18n('emcomplete'), '', ''] },
                    { code: 4, label: 'Overall Historyo', levelLabels: [core.getI18n('emfocused'), core.getI18n('emexpanded'), core.getI18n('emdetailed'), core.getI18n('emcomprehensive')], isSummary: true },
                    { code: 5, label: 'Examination', levelLabels: [core.getI18n('embrief'), core.getI18n('emexpanded'), core.getI18n('emdetailed'), core.getI18n('emcomprehensive')], isSummary: true },
                    { code: 6, label: 'Overal MDM', levelLabels: [core.getI18n('emstraight'), core.getI18n('emlow'), core.getI18n('emmoderate'), core.getI18n('emhigh')], isSummary: true },
                    { code: 7, label: 'Dx/Mgt', levelLabels: [core.getI18n('emminimal'), core.getI18n('emlimited'), core.getI18n('emmultiple'), core.getI18n('emextensive')] },
                    { code: 8, label: 'Complexity of Data', levelLabels: [core.getI18n('emminimal'), core.getI18n('emlimited'), core.getI18n('emmoderate'), core.getI18n('emextensive')] },
                    { code: 9, label: 'Overall Risk', levelLabels: [core.getI18n('emminimal'), core.getI18n('emlow'), core.getI18n('emmoderate'), core.getI18n('emhigh')], isSummary: true },
                    { code: 10, label: 'Problem Risk', levelLabels: [core.getI18n('emminimal'), core.getI18n('emlow'), core.getI18n('emmoderate'), core.getI18n('emhigh')] },
                    { code: 11, label: 'Tests Risk', levelLabels: [core.getI18n('emminimal'), core.getI18n('emlow'), core.getI18n('emmoderate'), core.getI18n('emhigh')] },
                    { code: 12, label: 'Mgt Risk', levelLabels: [core.getI18n('emminimal'), core.getI18n('emlow'), core.getI18n('emmoderate'), core.getI18n('emhigh')] }
                ];
                this.inherited(arguments);
                this.ready = this.loadLists();
                this.tabContainer.startup();
            };
        },
    
        loadLists: function () {
            this.statusStore = new SettingsEnumStore('Medcin/Enums/STATUSD', true);
            var settingsStore = new SettingsEnumStore('Medcin/Enums/SETTINGS', false, 'text');
            var serviceTypeStore = new SettingsEnumStore('Medcin/Enums/EMServiceType?Setting=' + (core.settings.emDefaultSetting || 'O'), false, 'text');
            var examTypeStore = new SettingsEnumStore('Medcin/Enums/EXAMTYPE', false, 'text');
    
            this.cmbSetting.set('searchAttr', 'text');
            this.cmbSetting.set('store', settingsStore);
            this.cmbSetting.set('value', core.settings.emDefaultSetting || 'O');
    
            this.cmbServiceType.set('searchAttr', 'text');
            this.cmbServiceType.set('store', serviceTypeStore);
            this.cmbServiceType.set('value', core.settings.emDefaultServiceType || 'OO');
    
            this.cmbExamType.set('searchAttr', 'text');
            this.cmbExamType.set('store', examTypeStore);
            this.cmbExamType.set('value', core.settings.emDefaultExamType || 'A');
    
            return when(this.statusStore.loadData(), function () {
                return when(settingsStore.loadData(), function () {
                    return when(serviceTypeStore.loadData(), function () {
                        return when(examTypeStore.loadData(), function () {
                            return true;
                        });
                    });
                });
            });
        },
    
        show: function () {
            var self = this;
            when(this.ready, function () {
                self.bindControls();
                self.updateProblemTable();
                if (!this.subscriptions) {
                    this.subscriptions = [
                        topic.subscribe('/qc/FindingClick', lang.hitch(self, self.onFindingClick))
                    ];
                };
                if (!self.hServiceList) {
                    self.hServiceList = on(self.cmbSetting, "Change", function () {
                        var currentValue = self.cmbServiceType.get('value', '');
                        var serviceTypeStore = new SettingsEnumStore('Medcin/Enums/EMServiceType?Setting=' + self.cmbSetting.get('value'), false, 'text');
                        when(serviceTypeStore.loadData(), function () {
                            self.cmbServiceType.set('store', serviceTypeStore);
                            var hasItem = array.some(serviceTypeStore.list, function (x) { return x.id == currentValue });
                            self.cmbServiceType.set('value', hasItem ? currentValue : '');
                        });
                    });
                };
            });
        },
    
        hide: function () {
            this.unbindControls();
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            };
            if (this.hServiceList) {
                core.disconnect(this.hServiceList);
                this.hServiceList = null;
            };
            //if (this.hAnalysis) {
            //    core.disconnect(this.hAnalysis);
            //};
        },
    
        getToolbarItems: function () {
            var list = [];
    
            var label = new Label({ 'text': 'E&M Calculator' });
            domStyle.set(label.domNode, { fontWeight: 'bold', marginLeft: '4px', marginRight: '12px' });
            list.push(label);
    
            var refreshButton = new Button({
                label: 'Refresh',
                iconClass: 'refresh',
                onClick: lang.hitch(this, this.calculate)
            });
            list.push(refreshButton);
    
            return list;
        },
    
        onFindingClick: function (element) {
            if (element.get('termType') == 6) {
                this.updateProblemTable();
            };
        },
    
        bindControls: function () {
            if (this.isBound) {
                return true;
            };
    
            if (!(core.Patient && core.Encounter)) {
                return false;
            };
    
            if (!core.Encounter.emInfo) {
                core.Encounter.emInfo = {
                    newPatient: false,
                    setting: core.settings.emDefaultSetting,
                    serviceType: core.settings.emDefaultServiceType,
                    examType: core.settings.emDefaultExamType,
                    floorTime: 0,
                    overHalf: false
                };
            };
    
            this.optNewPatient.bindProperty(core.Encounter.emInfo, 'newPatient', 'checked');
            this.chkOverHalf.bindProperty(core.Encounter.emInfo, 'overHalf', 'checked');
            this.txtFloorTime.bindProperty(core.Encounter.emInfo, 'floorTime', 'value', null, function (x) { return parseInt(x, 10) });
            this.cmbSetting.bindProperty(core.Encounter.emInfo, 'setting', 'value');
            this.cmbServiceType.bindProperty(core.Encounter.emInfo, 'serviceType', 'value');
            this.cmbExamType.bindProperty(core.Encounter.emInfo, 'examType', 'value');
            this.isBound = true;
        },
    
        unbindControls: function () {
            this.optNewPatient.unbindAll();
            this.chkOverHalf.unbindAll();
            this.txtFloorTime.unbindAll();
            this.cmbSetting.unbindAll();
            this.cmbServiceType.unbindAll();
            this.cmbExamType.unbindAll();
            this.isBound = false;
        },
    
        reset: function () {
            this.unbindControls();
            this.tabContainer.selectChild(this.inputTab);
            this.inputShown = false;
            this.inherited(arguments);
        },
    
        resize: function (newSize) {
            this.tabContainer.resize(newSize);
        },
    
        calculate: function () {
            var self = this;
            return when(this.ready, function () {
                self.bindControls();
                self.updateProblemTable();
                return self.doCalculation();
            });
        },
    
        doCalculation: function () {
            var self = this;
            var chartData = this.getChartXml();
            var emInfo = core.Encounter.emInfo;
    
            if (!(chartData && emInfo && emInfo.setting && emInfo.serviceType && emInfo.examType)) {
                return;
            };
    
            var override = self.getAnalysisOverrides() || '';
    
            return request(core.serviceURL('Quippe/ChartReview/EM?DataFormat=JSON'), {
                data: {
                    NewPatient: emInfo.newPatient,
                    Setting: emInfo.setting,
                    Service: emInfo.serviceType,
                    ExamType: emInfo.examType,
                    FaceTime: emInfo.floorTime,
                    OverHalf: emInfo.overHalf,
                    Override: override,
                    Chart: chartData
                },
                handleAs: 'json',
				method: 'POST'
            }).then(  function (data) {
                if (data.error) {
                    self.renderCalcError(data.error);
                }
                else if (data.em) {
                    self.calcResult = data.em;
                    self.renderAnalysis();
                    self.renderResult();
                };
            }, function (err) {
                core.showError(err);
            }
            );
    
        },
    
        renderCalcError: function (error) {
            this.resultMessage.innerHTML = error.message || error;
            domStyle.set(this.resultMessage, 'display', 'block');
            this.tabContainer.selectChild(this.resultTab);
        },
    
        renderResult: function () {
            var result = this.calcResult ? this.calcResult.results : null;
            if (!result) {
                return;
            };
    
            if (result.message) {
                this.resultMessage.innerHTML = result.message;
                domStyle.set(this.resultMessage, 'display', 'block');
            }
            else {
                this.resultMessage.innerHTML = '';
                domStyle.set(this.resultMessage, 'display', 'none');
            };
    
    
            var table = this.resultTable;
            var showTable = false;
            var row = null;
    
            row = table.rows[1];
            if (result.system && result.system.medcinId) {
                row.cells[1].innerHTML = result.system.medcinId;
                row.cells[2].innerHTML = result.system.spec;
                row.cells[3].innerHTML = result.system.text;
                showTable = true;
                domStyle.set(row, 'display', 'table-row');
            }
            else {
                domStyle.set(row, 'display', 'none');
            }
    
            row = table.rows[2];
            if (result.user && result.user.medcinId) {
                row.cells[1].innerHTML = result.user.medcinId;
                row.cells[2].innerHTML = result.user.spec;
                row.cells[3].innerHTML = result.user.text;
                showTable = true;
                domStyle.set(row, 'display', 'table-row');
            }
            else {
                domStyle.set(row, 'display', 'none');
            }
    
            query(".cptCol", table).style('display', (core.settings.emShowCPT ? 'table-cell' : 'none'));
            domStyle.set(table, 'display', showTable ? 'block' : 'none');
            this.tabContainer.selectChild(this.resultTab);
        },
    
    
        onAnalysisClick: function (evt) {
            if (!this.analysisTable) {
                return;
            };
    
            var row = core.closestNode(evt.target, 'tr');
            if (!row) {
                return;
            };
    
            if (domClass.contains(evt.target, 'expander')) {
                if (domClass.contains(evt.target, 'expanded')) {
                    this.collapseRow(row);
                }
                else if (domClass.contains(evt.target, 'collapsed')) {
                    this.expandRow(row);
                }
            }
            else if (domClass.contains(evt.target, 'label')) {
                this.highlightRow(row);
            }
            else if (domClass.contains(evt.target, 'analysisLabel')) {
                this.highlightRow(row);
            }
    
            else if (domClass.contains(evt.target, 'detailLevel')) {
                var td = evt.target;
                if (domClass.contains(td, 'summary')) {
                    //ignore
                }
                else if (domClass.contains(td, 'notApplicable')) {
                    //ignore
                }
                else if (domClass.contains(td, 'userValue')) {
                    query('.userValue', row).removeClass('userValue');
                    domClass.remove(row, 'overridden');
                }
                else if (domClass.contains(td, 'systemValue')) {
                    query('.userValue', row).removeClass('userValue');
                    domClass.remove(row, 'overridden');
                }
                else {
                    query('.userValue', row).removeClass('userValue');
                    domClass.add(td, 'userValue');
                    domClass.add(row, 'overridden');
                }
    
            };
        },
    
        clearHighlights: function () {
            query('.highlight', this.analysisTable).removeClass('highlight');
            topic.publish('/sourceList/ClearHighlight');
        },
    
        highlightRow: function (row) {
            if (!row) {
                return;
            };
    
            if (domClass.contains(row, 'highlight')) {
                this.clearHighlights();
                return;
            };
    
            this.clearHighlights();
    
            domClass.add(row, 'highlight');
    
            if (row.item) {
                var list = this.getFindingItems(row.item);
                if (list && list.length > 0) {
                    array.forEach(list, function (findingId) {
                        domClass.add(findingId, 'highlight');
                    });
                    topic.publish('/noteEditor/NavigateTo', list[0]);
                };
            };
        },
    
        getFindingItems: function (item) {
            if (!item) {
                return [];
            };
    
            if (item.findingId) {
                return [item.findingId];
            };
    
            var list = [];
            array.forEach(core.forceArray(item.item), function (child) {
                list = list.concat(this.getFindingItems(child));
            }, this);
            return list;
        },
    
        collapseAll: function () {
            array.forEach(this.analysisTable.rows, function (childRow) {
                if (!childRow.parentRow) {
                    this.collapseRow(childRow);
                };
            }, this);
        },
    
        collapseRow: function (row) {
            array.forEach(this.analysisTable.rows, function (childRow) {
                if (childRow.parentRow == row) {
                    this.collapseRow(childRow);
                    domStyle.set(childRow, 'display', 'none');
                };
            }, this);
    
            query('.expander', row).removeClass('expanded');
            query('.expander', row).addClass('collapsed');
        },
    
        expandRow: function (row) {
            array.forEach(this.analysisTable.rows, function (childRow) {
                if (childRow.parentRow == row) {
                    domStyle.set(childRow, 'display', 'table-row');
                };
            }, this);
    
            query('.expander', row).removeClass('collapsed');
            query('.expander', row).addClass('expanded');
        },
    
        renderAnalysis: function () {
            if (this.hAnalysis) {
                core.disconnect(this.hAnalysis);
            };
    
            var analysis = this.calcResult ? this.calcResult.analysis : null;
            if (!analysis) {
                return;
            };
    
            var table = domConstruct.create('table');
            table.setAttribute('cols', 5);
            domClass.add(table, 'analysisTable');
            domClass.add(table, 'ic16');
    
            this.addAnalysisChildRows(table, null, analysis);
    
            this.analysisTab.set('content', table);
            this.analysisTable = table;
            this.hAnalysis = on(table, "click", lang.hitch(this, this.onAnalysisClick));
            this.collapseAll();
    
            var legend = '<div class="analysisTableLegend">'
                       + '  <div class="block systemValue"></div><div class="label">System Calculated Value</div>'
                       + '  <div class="block userValue"></div><div class="label">Override</div>'
                       + '</div>';
    
            domConstruct.place(legend, table, 'after');
    
    
        },
    
        addAnalysisChildRows: function (table, parentRow, itemList) {
            var count = 0;
            array.forEach(core.forceArray(itemList), function (item) {
                this.addAnalysisRow(table, parentRow, item);
                count++;
            }, this);
            if (parentRow) {
                if (count == 0) {
                    query('.expander', parentRow).addClass('leaf');
                }
            };
        },
    
        addAnalysisRow: function (table, parentRow, item) {
            var row = table.insertRow(-1);
            var cell = null;
            var info = null;
            var lbl = null;
            var n = 0;
            var lvl = parentRow ? parentRow.level + 1 : 0;
            row.level = lvl;
            row.parentRow = parentRow || null;
            row.item = item;
            var icon = '';
            switch (item.type) {
                case 'Component':
                    domClass.add(row, 'component');
                    cell = row.insertCell(0);
                    domClass.add(cell, 'labelCell');
                    icon = (item.system || item.user) ? 'check' : '';
                    lbl = domConstruct.place('<div class="analysisLabel"><div class="expander"></div><div class="iconNode ' + icon + '"></div><div class="label">' + item.name + '</div></div>', cell);
                    domStyle.set(lbl, 'marginLeft', (lvl * 16) + 'px');
                    info = this.componentInfo[item.code];
                    for (n = 0; n < 4; n++) {
                        cell = row.insertCell(n + 1);
                        cell.innerHTML = info.levelLabels[n];
                        cell.emLevel = n + 1;
                        domClass.add(cell, 'detailLevel');
                        if (!info.levelLabels[n]) {
                            domClass.add(cell, 'notApplicable');
                        };
                        if (info.isSummary) {
                            domClass.add(cell, 'summary');
                        }
                    };
                    if (item.system) {
                        domClass.add(row.cells[item.system], 'systemValue');
                    };
                    if (item.user) {
                        domClass.add(row.cells[item.user], 'userValue');
                        domClass.add(row, 'overridden');
                    };
    
                    this.addAnalysisChildRows(table, row, core.forceArray(item.item));
                    break;
    
                case 'BodySystem':
                case 'Category':
                    icon = item.bulletsMet ? 'check' : '';
                    cell = row.insertCell(0);
                    domClass.add(cell, 'labelCell');
                    lbl = domConstruct.place('<div class="analysisLabel"><div class="expander"></div><div class="iconNode ' + icon + '"></div><div class="label">' + (item.text || item.type) + '</div></div>', cell);
                    domStyle.set(lbl, 'marginLeft', (lvl * 16) + 'px');
                    cell = row.insertCell(1);
                    cell.setAttribute('colspan', 4);
                    cell.innerHTML = item.data || '';
                    this.addAnalysisChildRows(table, row, core.forceArray(item.item));
                    break;
    
                case 'Bullet':
                    icon = 'bullet_ball_blue' + (item.hasData ? '' : ' disabled');
                    cell = row.insertCell(0);
                    domClass.add(cell, 'labelCell');
                    lbl = domConstruct.place('<div class="analysisLabel"><div class="expander"></div><div class="iconNode ' + icon + '"></div><div class="label">' + (item.text || item.type) + '</div></div>', cell);
                    domStyle.set(lbl, 'marginLeft', (lvl * 16) + 'px');
                    cell = row.insertCell(1);
                    cell.setAttribute('colspan', 4);
                    cell.innerHTML = item.data || '';
                    this.addAnalysisChildRows(table, row, core.forceArray(item.item));
                    break;
    
                case 'FindingRef':
                    icon = core.getItemIcon({ type: 'term', termType: item.termType });
                    cell = row.insertCell(0);
                    domClass.add(cell, 'labelCell');
                    lbl = domConstruct.place('<div class="analysisLabel"><div class="expander"></div><div class="iconNode ' + icon + '"></div><div class="label">' + (item.text || item.type) + '</div></div>', cell);
                    domStyle.set(lbl, 'marginLeft', (lvl * 16) + 'px');
                    cell = row.insertCell(1);
                    cell.setAttribute('colspan', 4);
                    cell.innerHTML = item.data || '';
                    this.addAnalysisChildRows(table, row, core.forceArray(item.item));
                    break;
    
                default:
                    cell = row.insertCell(0);
                    domClass.add(cell, 'labelCell');
                    lbl = domConstruct.place('<div class="analysisLabel"><div class="expander"></div><div class="iconNode ' + icon + '"></div><div class="label">' + (item.text || item.type) + '</div></div>', cell);
                    domStyle.set(lbl, 'marginLeft', (lvl * 16) + 'px');
                    cell = row.insertCell(1);
                    cell.setAttribute('colspan', 4);
                    cell.innerHTML = item.data || '';
                    this.addAnalysisChildRows(table, row, core.forceArray(item.item));
                    break;
            };
        },
    
        getAnalysisOverrides: function () {
            var override = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            var haveOverride = false;
            var table = this.analysisTable;
    
            if (table) {
                query('.component', table).forEach(function (row) {
                    var code = row.item ? parseInt(row.item.code, 10) : 0;
                    if (code) {
                        var td = query('.userValue', row)[0] || null;
                        if (td && td.emLevel) {
                            override[code - 1] = td.emLevel;
                            haveOverride = true;
                        };
                    };
                });
            };

            //if (override[0] === 0) {
            //    var HPIOverrides = query('.freeText').map(registry.byNode).filter(function (x) { return x.medcinId == core.MedcinInfo.knownMedcinIds.HPIFreeText && x.emLevel > 1 && x.hasContent }).map(function (y) { return y.emLevel }).sort()
            //    if (HPIOverrides.length > 0) {
            //        override[0] == HPIOverrides[HPIOverrides.length - 1];
            //        haveOverride = true;
            //    }
            //};
    
            if (haveOverride) {
                return override.join('');
            }
            else {
                return '';
            };
        },
    
    
        updateProblemTable: function () {
            var self = this;
            var table = this.problemTable;
            var row = null;
            var findingId = '';
            var findingWidget = null;
    
            //remove un-entered findings
            for (var n = table.rows.length - 1; n > 0; n--) {
                row = table.rows[n];
                findingId = row.getAttribute('findingId') || null;
                if (findingId) {
                    findingWidget = registry.byId(findingId);
                    if (!findingWidget || findingWidget.get('result') != 'A') {
                        query('problemCell', row).map(registry.byNode).forEach(function (widget) {
                            widget.unbindAll();
                            widget.destroyRecursive();
                        });
                        table.deleteRow(n);
                    };
                };
            };
    
            //add new findings
            this.getProblemList().forEach(function (findingWidget) {
                row = self.findProblemRow(findingWidget.id);
                if (!row) {
                    row = self.addProblemRow(findingWidget);
                }
            });
    
            domStyle.set(table, 'display', table.rows.length > 1 ? 'block' : 'none');
        },
    
        addProblemRow: function (findingWidget) {
            if (!findingWidget.emInfo) {
                findingWidget.emInfo = {
                    isActive: false,
                    isChronic: false,
                    isNew: false,
                    workupPlanned: false,
                    status: findingWidget.get('status') || ''
                };
            };
    
            var row = this.problemTable.insertRow(-1);
            row.setAttribute('findingId', findingWidget.id);
    
            var c0 = row.insertCell(0);
            c0.innerHTML = Transcriber.transcribeItem(findingWidget, true);
    
            var c1 = row.insertCell(1);
            domClass.add(c1, 'checkCell');
            var chk1 = new CheckBox();
            domClass.add(chk1.domNode, 'problemCell');
            chk1.bindProperty(findingWidget.emInfo, 'isActive', 'checked');
            chk1.placeAt(c1);
    
            var c2 = row.insertCell(2);
            domClass.add(c2, 'checkCell');
            var chk2 = new CheckBox();
            domClass.add(chk2.domNode, 'problemCell');
            chk2.bindProperty(findingWidget.emInfo, 'isChronic', 'checked');
            chk2.placeAt(c2);
    
            var c3 = row.insertCell(3);
            domClass.add(c3, 'checkCell');
            var chk3 = new CheckBox();
            domClass.add(chk3.domNode, 'problemCell');
            chk3.bindProperty(findingWidget.emInfo, 'isNew', 'checked');
            chk3.placeAt(c3);
    
            var c4 = row.insertCell(4);
            domClass.add(c4, 'checkCell');
            var chk4 = new CheckBox();
            domClass.add(chk4.domNode, 'problemCell');
            chk4.bindProperty(findingWidget.emInfo, 'workupPlanned', 'checked');
            chk4.placeAt(c4);
    
            var c5 = row.insertCell(5);
            var lst = new FilteringSelect({ store: this.statusStore, searchAttr: 'text' });
            domClass.add(lst.domNode, 'problemCell');
            lst.bindProperty(findingWidget.emInfo, 'status', 'value');
            lst.placeAt(c5);
    
            return row;
        },
    
    
        findProblemRow: function (findingId) {
            return query('tr[findingId="' + findingId + '"]', this.problemTable)[0] || null;
        },
    
        getProblemList: function () {
            var problemListPrefixes = ['', '?', '?+', 'A', 'CN', 'D', 'DS', 'DI', 'E', 'FU', 'IO', 'IP', 'P', 'PR', 'PE', 'PO', 'PP', 'RD', 'RF', 'RI', 'RM', 'RO', 'RS', 'S', 'W'];
            return query('.entry').map(registry.byNode).filter(function (widget) {
                if (widget.get('termType') == 6 && widget.get('result') == 'A' && (!widget.get('prefix') || array.indexOf(problemListPrefixes, widget.get('prefix')) >= 0)) {
                    return widget;
                };
            });
        },
    
        postSystemCode: function () {
            this.postCode(lang.getObject('calcResult.results.system', false, this));
        },
    
        postUserCode: function () {
            this.postCode(lang.getObject('calcResult.results.user', false, this));
        },
    
        postCode: function (res) {
            if (!res) {
                return;
            };
    
            query('.emResult').map(registry.byNode).forEach(function (w) { w.deleteSelf(); });
    
            if (core.Encounter.emInfo.floorTime) {
                topic.publish('/qc/AddToNote', { type: 'term', medcinId: this.floorTimeMedcinId, result: 'A', value: core.Encounter.emInfo.floorTime, unit: 'minutes', styleClass: 'emResult emFloorTime'});
            }
    
            if (core.Encounter.emInfo.overHalf) {
                topic.publish('/qc/AddToNote', { type: 'term', medcinId: this.overHalfMedcinId, result: 'A', styleClass: 'emResult emOverHalf'});
            }
    
            var findingItem = {
                type: 'term',
                medcinId: res.medcinId,
                result: 'A',
                specifier: res.spec,
                notation: core.settings.emShowCPT ? res.spec : '',
                styleClass: 'emResult emCodeEntry'
            };
            topic.publish('/qc/AddToNote', findingItem);
        },
    
        getChartXml: function () {
            var eTime = core.Encounter && core.Encounter.encounterTime ? core.Encounter.encounterTime : new Date();
            var recordCount = 0;
    
            var groupAssignment = {};
            query('.part.section').map(registry.byNode).forEach(function (section) {
                var nGroup = core.MedcinInfo.standardNoteSectionIds[section.name || 'none'] || 0;
                if (nGroup) {
                    query('.entry', section.domNode).forEach(function (entry) {
                        groupAssignment[entry.id] = nGroup;
                    });
                };
            });
    
            var w = new XmlWriter();
            w.beginElement("Chart");
            w.attribute("xmlns", "http://schemas.medicomp.com/V3/Chart.xsd");
    
            w.beginElement("Patient");
            if (core.Patient) {
                w.attribute("id", core.Patient.id || '', '');
                w.attribute("Sex", core.Patient.sex || 'U', 'U');
                w.attribute("Race", core.Patient.race || 'U', 'U');
                w.attribute("Religion", core.Patient.race || 'U', 'U');
                w.attribute("Ethnicity", core.Patient.race || 'U', 'U');
                w.attribute("MaritalStauts", core.Patient.race || 'U', 'U');
                if (core.Patient.birthDate) {
                    w.attribute("BirthDate", DateUtil.formatISODate(core.Patient.birthDate));
                };
            }
    
            w.beginElement("Encounters");
            w.beginElement("Encounter");
            w.attribute("EncounterTime", DateUtil.formatISODate(eTime));
            w.beginElement("Records");
    
            query(".entry")
                .map(registry.byNode)
                .forEach(function (entry) {
                    var finding = entry.toFinding();
                    w.beginElement('Record');
                    w.attribute('id', entry.domNode.id);
                    w.attribute('MedcinId', finding.medcinId, 0);
                    w.attribute('Prefix', finding.prefix, '');
                    w.attribute('Result', finding.result, '');
                    w.attribute('Status', finding.status, '');
                    w.attribute('Modifier', finding.modifier, '');
                    if (finding.medcinId == core.MedcinInfo.knownMedcinIds.HPIFreeText && entry.get('emLevel') > 0) {
                        w.attribute('Value', entry.get('emLevel'), '');
                    }
                    else {
                        w.attribute('Value', finding.value, '');
                    }
                    w.attribute('Unit', finding.unit, '');
                    w.attribute('Onset', finding.onset, '');
                    w.attribute('Duration', finding.duration, '');
                    w.attribute('Episode', finding.episode, '');
                    w.attribute('Note', finding.notation, '');
                    w.attribute('Text', finding.text, '');
                    var emInfo = entry.emInfo;
                    if (emInfo) {
                        w.beginElement("EMInfo");
                        w.attribute("IsActive", emInfo.isActive || false, false);
                        w.attribute("IsChronic", emInfo.isChronic || false, false);
                        w.attribute("IsNew", emInfo.isNew || false, false);
                        w.attribute("AdditionalWorkupPlanned", emInfo.workupPlanned || false, false);
                        w.attribute("Status", emInfo.status || '', '');
                        w.attribute("Risk", emInfo.risk || 0, 0);
                        w.attribute("Complexity", emInfo.complexity || 0, 0);
                        w.endElement();
                    };
                    w.attribute('NarrativeGroup', groupAssignment[entry.domNode.id] || 0, 0);
                    w.endElement();
                    recordCount++;
                }
            );
    
    
            w.endElement();
            w.endElement();
            w.endElement();
    
    
            w.endElement()
    
            w.endElement();
    
            if (recordCount > 0) {
                return w.toString();
            }
            else {
                return null;
            }
        }
    });
});