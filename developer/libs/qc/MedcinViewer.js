define([
"dojo/_base/array",
"dojo/_base/declare",
"dojo/_base/event",
"dojo/_base/lang",
"dojo/aspect",
"dojo/dom-class",
"dojo/dom-construct",
"dojo/dom-style",
"dojo/keys",
"dojo/on",
"dojo/query",
"dojo/request",
"dojo/when",
"dijit/_TemplatedMixin",
"dijit/_WidgetBase",
"dijit/form/Button",
"dijit/form/TextBox",
"dijit/layout/ContentPane",
"dijit/layout/TabContainer",
"dijit/Toolbar",
"qc/DateUtil",
"qc/design/LayoutBuilder",
"qc/design/ToolbarBuilder",
"qc/Label",
"qc/MedcinTree",
"qc/StringUtil",
"qc/Transcriber",
"qc/_core"
], function (array, declare, event, lang, aspect, domClass, domConstruct, domStyle, keys, on, query, request, when, _TemplatedMixin, _WidgetBase, Button, TextBox, ContentPane, TabContainer, Toolbar, DateUtil, LayoutBuilder, ToolbarBuilder, Label, MedcinTree, StringUtil, Transcriber, core) {
    return declare("qc.medcinViewer.MedcinViewer", [_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="qcMedcinViewer"></div>',
        toolbar: null,
        tree: null,
        tabs: null,

        startup: function () {
            if (!this._started) {
                this.buildPage();
                this.inherited(arguments);
            };
        },

        buildPage: function () {
            this.toolbar = ToolbarBuilder.buildToolbar({
                searchBox: { type: 'dijit/form/TextBox', placeHolder: 'Search', onKeyUp: lang.hitch(this, this.onSearchKeyUp) },
                searchButton: { label: 'Search', showLabel: false, icon: 'view', onClick: lang.hitch(this, this.onSearchClick) },
                sep1: true,
                browseButton: { label: 'Browse', showLabel: true, icon: 'text_tree', onClick: lang.hitch(this, this.browse) }
            });

            this.tree = new MedcinTree({ hideRoot: true, searchVersion: 2 });
            this.tabs = new TabContainer();
            this.termTitle = domConstruct.create('div');
            domClass.add(this.termTitle, 'termTitle');

            var copyright = '<div style="text-align:right;font-size:80%;">&copy; ' + new Date().getFullYear() + ' - Medicomp Systems Inc - All rights reserved</div>';

            var page = LayoutBuilder.buildLayout({
                border: '0px',
                className: 'page', gutters: false,
                top: { content: this.toolbar },
                center: {
                    gutters: false, liveSplitters: true, border: '0px',
                    left: { splitter: true, width: '33%', content: this.tree, border: '0px' },
                    center: { 
                        top: { content: this.termTitle, style: { height: '24px', border: '0px', marginLeft:'8px' } },
                        center: {content: this.tabs, style: { border: '0px', margin: '8px' } }
                    }
                },
                bottom: { height: '30px', content: copyright }
            });

            this.events = [
                aspect.after(this.tree, "onSelectionChanged", lang.hitch(this, this.onTreeNodeSelected), true),
                aspect.after(this.tabs, "selectChild", lang.hitch(this, this.onTabSelected), true)
            ];

            page.placeAt(this.domNode);
            page.startup();

            this.buildTabs();
        },

        buildTabs: function () {
            var self = this;
            var tabs = this.tabs;
            when(self.getRoles(), function (roles) {
                when(self.getServices(), function (services) {
                    var tabList = [
                        { name: 'properties', renderWith: 'showTermProperties' },
                        { name: 'strings', renderWith: 'showTermStrings', service: 'Quippe.ITextService' },
                        { name: 'codes', renderWith: 'showCodes', service: 'Quippe.Coding.ICodeMappingService' },
                        { name: 'diagnostic', title: 'Diagnostic', renderWith: 'showDiagnosticIndex', service: 'Quippe.IDiagnosticIndexService', role: 'QuippeDiagnosticIndex' },
                        { name: 'crossDiagnostic', title: 'Cross Diagnostic', renderWith: 'showCrossDiagnosticIndex', service: 'Quippe.IDiagnosticIndexService', role: 'QuippeDiagnosticIndex' },
                        { name: 'promptTester', renderWith: 'showPromptTester', service: 'Quippe.Internal.Services.IPromptTesterService', role: 'QuippeDiagnosticIndex' }
                    ];
                    var tab = null;
                    array.forEach(tabList, function (item) {
                        if (!item.role || array.indexOf(roles, item.role) >= 0) {
                            if (!item.service || array.indexOf(services, item.service) >= 0) {
                                tab = new ContentPane({ title: item.title || StringUtil.makeCaption(item.name) });
                                tab.renderWith = item.renderWith || '';
                                tabs.addChild(tab);
                            };
                        };
                    });
                })
            });
            tabs.resize();
        },


        getRoles: function () {
            return request(core.serviceURL('Quippe/UserSettings/Roles'), {
                query: { DataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                return data.roles ? core.forceArray(data.roles) : [];
            })
        },

        getServices: function () {
            return request(core.serviceURL('Quippe/ServiceInfo/Services'), {
                query: { DataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                return data.services ? core.forceArray(data.services).filter(function (x) { return x.implementation }).map(function (y) { return y.contract }) : [];
            })
        },

        onSearchKeyUp: function (evt) {
            if (evt.keyCode == keys.ENTER) {
                event.stop(evt);
                this.onSearchClick();
            };
        },

        onSearchClick: function () {
            this.search(this.toolbar.tools.searchBox.get('value'));
        },

        browse: function () {
            var item = this.tree.resMode == 'search' ? this.tree.getSelectedItem() : null;
            this.tree.resMode = 'browse';
            if (item) {
                this.tree.browseToTerm(item);
            }
            else {
                this.tree.browse();
                this.showTerm(null);
            };
        },

        search: function (query) {
            if (query) {
                this.tree.resMode = "search";
                this.tree.search(query);
            };
        },

        onTreeNodeSelected: function () {
            this.showTerm(this.tree.getSelectedItem());
        },

        onTabSelected: function (tab) {
            if (tab && tab.renderWith && core.isFunction(this[tab.renderWith])) {
                this[tab.renderWith](tab, this.selectedTerm);
            };
        },

        showTerm: function (term) {
            if (!term || !term.medcinId) {
                document.title = 'Medcin Viewer';
                this.termTitle.innerHTML = '';
                this.selectedTerm = null;
                return;
            };

            if (this.selectedTerm && this.selectedTerm.medcinId == term.medcinId) {
                return;
            };

            var self = this;
            request.get(core.serviceURL('Quippe/NoteBuilder/Resolve'), {
                query: {
                    medcinId: term.medcinId,
                    dataFormat: 'JSON'
                },
                handleAs: 'json'
            }).then(function (data) {
                self.selectedTerm = data.term;
                var desc = Transcriber.transcribeItem(data.term);
                document.title = desc;
                self.termTitle.innerHTML = data.term.medcinId + ' - ' + desc;
                self.onTabSelected(self.tabs.selectedChildWidget);
            });

            //var fullText = '';
            //if (term && term.medcinId != 0 && term.text) {
            //    fullText = term.fullText || term.text;
            //    document.title = fullText;
            //    this.termTitle.innerHTML = term.medcinId + ' - ' + fullText;
            //}
            //else {
            //    document.title = 'Medcin Viewer';
            //    this.termTitle.innerHTML = '';
            //};
            //this.onTabSelected(this.tabs.selectedChildWidget);
        },

        showTermProperties: function (tab, term) {
            if (!(term && term.medcinId)) {
                tab.set('content', '');
                return;
            };

            if (tab.medcinId == term.medcinId) {
                return;
            };

            tab.medcinId = term.medcinId;
            request(core.serviceURL('Quippe/MedcinViewer/TermProperties'), {
                query: { MedcinId: term.medcinId, DataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                var htm = '<table class="dataTable" style="width:100%">';
                array.forEach(data.termProperties, function (group) {
                    htm += '<tr><td colspan="2"><div class="sectionHeader">' + group.text + '</div></td></tr>'
                    array.forEach(core.forceArray(group.item), function (item) {
                        htm += '<tr>';
                        htm += '<td style="width:150px">' + item.name + '</td>';
                        htm += '<td>' + (item.value || '') + (item.description ? (' - ' + item.description) : '') + '</td>';
                        htm += '</tr>';
                    });
                });
                htm += '</table>';
                tab.set('content', htm);
                return data.term;
            }, function (err) {
                core.showError(err);
            });
        },

        showTermStrings: function (tab, term) {
            if (!(term && term.medcinId)) {
                tab.set('content', '');
                return;
            };

            if (tab.medcinId == term.medcinId) {
                return;
            };

            var fixUsage = function (culture, usageString) {
                return usageString ? usageString.toString().split(', ').filter(function (value) {
                    switch (value.toLowerCase()) {
                        case 'masculine':
                        case 'feminine':
                        case 'neuter':
                            if (culture != 'en-US') {
                                return value;
                            }
                            else {
                                return null;
                            }
                        case 'none':
                            return '';
                        default:
                            return value;
                    }
                }).join(', ') : '';
            };

            tab.medcinId = term.medcinId;
            request(core.serviceURL('Quippe/TextService/AllPhrases'), {
                query: { MedcinId: term.medcinId, Usage: -1, Culture: 'All', DataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                var htm = '';
                var tableHeader = '<table class="dataTable phraseTable"><tr><th>Sequence</th><th>Positive</th><th>Negative</th><th>Usage</th>';

                htm += tableHeader;
                array.forEach(core.forceArray(data.conceptPhrases), function (cultureElement) {
                    htm += '<tr><td colspan="4"><div class="sectionHeader">' + cultureElement.displayName + '</div></td></tr>';

                    var list = core.forceArray(cultureElement.conceptPhrase).sort(function (a, b) { return parseFloat(a.sequence) - parseFloat(b.sequence) });
                    list[0].rowSpan = 1;
                    var current = 0;
                    for (var n = 1; n < list.length; n++) {
                        if (list[n].sequence == list[current].sequence) {
                            list[current].rowSpan++;
                            list[n].rowSpan = 0;
                        }
                        else {
                            current = n;
                            list[current].rowSpan = 1;
                        }
                    };
                    array.forEach(list, function (phrase) {
                        htm += '<tr>';
                        if (phrase.rowSpan == 0) {
                            //skip sequence column
                        }
                        else if (phrase.rowSpan == 1) {
                            htm += '<td class="seqCol">' + (phrase.sequence + 1) + '</td>';
                        }
                        else {
                            htm += '<td class="seqCol" rowspan="' + phrase.rowSpan + '">' + (phrase.sequence + 1) + '</td>';
                        };
                        htm += '<td>' + (phrase.positive ? phrase.positive.text || '' : '') + '</td>';
                        htm += '<td>' + (phrase.negative ? phrase.negative.text || '' : '') + '</td>';
                        htm += '<td>' + fixUsage(cultureElement.culture, phrase.usage || '') + '</td>';
                        htm += '</tr>';
                    });

                });
                htm += '</table>';
                tab.set('content', htm);
                return data.term;
            }, function (err) {
                core.show(err);
            });
        },

        showDiagnosticIndex: function (tab, term) {

            if (!(term && term.medcinId)) {                
                tab.set('content', '');
                return;
            };

            if (tab.medcinId == term.medcinId) {
                return;
            };

            tab.set('content', '');
            var self = this;
            request(core.serviceURL('Quippe/MedcinViewer/DiagnosticIndex'), {
                query: { MedcinId: term.medcinId, DataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                var index = data.index;
                var htm = '';
                if (index.count > 0) {
                    htm += '<div class="sectionHeader">' + index.count + ' link' + (index.count > 1 ? 's' : '') + '</div>';
                    htm += '<table class="dataTable" style="margin-top:8px;">';
                    htm += '<tr>';
                    htm += '<th rowspan="2" colspan="2">id</th>';
                    htm += '<th rowspan="2">Description</th>';
                    htm += '<th rowspan="2">Prefix</th>';
                    htm += '<th rowspan="2">Prompt Priority</th>';
                    htm += '<th rowspan="2">Follow Up Priority</th>';
                    htm += '<th rowspan="2">Node Key</th>';
                    htm += '<th rowspan="2">Present</th>';
                    htm += '<th rowspan="2">Absent</th>';
                    htm += '<th colspan="7">Scale</th>';
                    htm += '<th colspan="2">Timing</th>';
                    htm += '<th colspan="2">Age Range</th>';
                    htm += '</tr>';
                    htm += '<tr>';
                    htm += '<th>1</th>';
                    htm += '<th>2</th>';
                    htm += '<th>3</th>';
                    htm += '<th>N</th>';
                    htm += '<th>4</th>';
                    htm += '<th>5</th>';
                    htm += '<th>6</th>';
                    htm += '<th>Expire</th>';
                    htm += '<th>Delay</th>';
                    htm += '<th>Start</th>';
                    htm += '<th>End</th>';
                    htm += '</tr>';
                    core.forceArray(index.item).forEach(function (item, i) {
                        htm += '<tr class="' + (i % 2 == 0 ? 'even' : 'odd') + '">';
                        htm += '<td class="termTypeCol ic16"><div class="ic16 termType' + core.TermTypeInfo.fromTermType(item.termType).abbreviation + '"></div></td>';
                        htm += '<td class="idCol"><a href="#' + item.dFinding + '" class="termLink">' + item.dFinding + '</a></td>';
                        htm += '<td title="Description">' + (item.description || '') + '</td>';
                        htm += '<td title="Prefix" style="text-align:center;">' + (item.dPrefix || '') + '</td>';
                        htm += '<td title="IPrompt Priority" style="text-align:center;">' + (item.iPrompt || '') + '</td>';
                        htm += '<td title="Follow Up Priority" style="text-align:center;">' + (item.iFU || '') + '</td>';
                        htm += '<td title="Node Key" style="white-space:nowrap;">' + (item.dNodeKey || '').replace(' ', '-', 'g') + '</td>';
                        htm += '<td title="Present" style="text-align:center;">' + (item.present || '') + '</td>';
                        htm += '<td title="Absent" style="text-align:center;">' + (item.absent || '') + '</td>';
                        ['1', '2', '3', 'Normal', '4', '5', '6'].forEach(function (s, n) {
                            htm += '<td title="Scale ' + s + '" style="text-align:center;">' + (item['scale' + (n + 1)] || '') + '</td>';
                        });
                        htm += '<td title="Expire" style="text-align:center;">' + DateUtil.minutesToAgeLabel(item.expire).toLowerCase() + '</td>';
                        htm += '<td title="Delay" style="text-align:center;">' + DateUtil.minutesToAgeLabel(item.delay).toLowerCase() + '</td>';
                        htm += '<td title="Start Age" style="text-align:center;">' + DateUtil.minutesToAgeLabel(item.startAge).toLowerCase() + '</td>';
                        htm += '<td title="End Age" style="text-align:center;">' + DateUtil.minutesToAgeLabel(item.endAge).toLowerCase() + '</td>';
                        htm += '</tr>';
                    });
                    htm += '</table>';
                }
                else {
                    htm += '<div class="sectionHeader">No links</div>';
                };
                tab.set('content', htm);
                if (self.hDXClick) {
                    self.hDXClick.remove();
                    self.hDXClick = null;
                };
                var table = query('table', tab.domNode)[0];
                if (table) {
                    self.hDXClick = on(table, 'click', lang.hitch(self, self.selectRow));
                };
                tab.medcinId = term.medcinId;
            }, function (err) {
                core.showError(err);
            });
        },

        showCrossDiagnosticIndex: function (tab, term) {
            if (!(term && term.medcinId)) {
                tab.set('content', '');
                return;
            };

            if (tab.medcinId == term.medcinId) {
                return;
            };

            tab.set('content', '');
            var self = this;
            request(core.serviceURL('Quippe/MedcinViewer/CrossDiagnosticIndex'), {
                query: { MedcinId: term.medcinId, DataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {

                var index = data.index;
                var htm = '';
                if (index.count > 0) {
                    htm += '<div class="sectionHeader">' + index.count + ' reference' + (index.count > 1 ? 's' : '') + '</div>';
                    htm += '<table class="dataTable" style="margin-top:8px;">';
                    htm += '<tr>';
                    htm += '<th rowspan="2" colspan="2">id</th>';
                    htm += '<th rowspan="2">Description</th>';
                    htm += '<th rowspan="2">Prefix</th>';
                    htm += '<th rowspan="2">Prompt Priority</th>';
                    htm += '<th rowspan="2">Follow Up Priority</th>';
                    htm += '<th rowspan="2">Present</th>';
                    htm += '<th rowspan="2">Absent</th>';
                    htm += '<th colspan="7">Scale</th>';
                    htm += '<th colspan="2">Timing</th>';
                    htm += '<th colspan="2">Age Range</th>';
                    htm += '</tr>';
                    htm += '<tr>';
                    htm += '<th>1</th>';
                    htm += '<th>2</th>';
                    htm += '<th>3</th>';
                    htm += '<th>N</th>';
                    htm += '<th>4</th>';
                    htm += '<th>5</th>';
                    htm += '<th>6</th>';
                    htm += '<th>Expire</th>';
                    htm += '<th>Delay</th>';
                    htm += '<th>Start</th>';
                    htm += '<th>End</th>';
                    htm += '</tr>';
                    core.forceArray(index.item).forEach(function (item, i) {
                        htm += '<tr class="' + (i % 2 == 0 ? 'even' : 'odd') + '">';
                        htm += '<td class="termTypeCol ic16"><div class="ic16 termType' + core.TermTypeInfo.fromTermType(item.termType).abbreviation + '"></div></td>';
                        htm += '<td class="idCol"><a href="#' + item.medcinId + '" class="termLink">' + item.medcinId + '</a></td>';
                        htm += '<td title="Description">' + (item.description || '') + '</td>';
                        htm += '<td title="Prefix" style="text-align:center;">' + (item.dPrefix || '') + '</td>';
                        htm += '<td title="IPrompt Priority" style="text-align:center;">' + (item.iPrompt || '') + '</td>';
                        htm += '<td title="Follow Up Priority" style="text-align:center;">' + (item.iFU || '') + '</td>';
                        htm += '<td title="Present" style="text-align:center;">' + (item.present || '') + '</td>';
                        htm += '<td title="Absent" style="text-align:center;">' + (item.absent || '') + '</td>';
                        ['1', '2', '3', 'Normal', '4', '5', '6'].forEach(function (s, n) {
                            htm += '<td title="Scale ' + s + '" style="text-align:center;">' + (item['scale' + (n + 1)] || '') + '</td>';
                        });
                        htm += '<td title="Expire" style="text-align:center;">' + DateUtil.minutesToAgeLabel(item.expire).toLowerCase() + '</td>';
                        htm += '<td title="Delay" style="text-align:center;">' + DateUtil.minutesToAgeLabel(item.delay).toLowerCase() + '</td>';
                        htm += '<td title="Start Age" style="text-align:center;">' + DateUtil.minutesToAgeLabel(item.startAge).toLowerCase() + '</td>';
                        htm += '<td title="End Age" style="text-align:center;">' + DateUtil.minutesToAgeLabel(item.endAge).toLowerCase() + '</td>';
                        htm += '</tr>';
                    });
                    htm += '</table>';
                }
                else {
                    htm += '<div class="sectionHeader">No references</div>';
                }
                tab.set('content', htm);

                if (self.hCXClick) {
                    self.hCXClick.remove();
                    self.hCXClick = null;
                };
                var table = query('table', tab.domNode)[0];
                if (table) {
                    self.hCXClick = on(table, 'click', lang.hitch(self, self.selectRow));
                };
                tab.medcinId = term.medcinId;
            }, function (err) {
                core.showError(err);
            });
        },

        showCodes: function (tab, term) {
            if (!(term && term.medcinId)) {
                tab.set('content', '');
                return;
            };

            if (tab.medcinId == term.medcinId) {
                return;
            };

            request(core.serviceURL('Quippe/MedcinViewer/CodeMap'), {
                query: { MedcinId: term.medcinId, DataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                var r = 0;
                var htm = '';
                htm += '<table class="dataTable" style="margin-top:8px;">';
                htm += '<tr><th>Vocabulary</th><th>Group</th><th>Prefix</th><th>Result</th><th>Relationship</th><th>Code</th><th>Description</th></tr>';
                array.forEach(core.forceArray(data.map.item), function (item) {
                    htm += '<tr class="' + (r % 2 == 0 ? 'even' : 'odd') + '">';
                    htm += '<td>' + (item.vocabulary || '') + '</td>';
                    htm += '<td>' + (item.group || '') + '</td>';
                    htm += '<td>' + (item.prefix || '') + '</td>';
                    htm += '<td>' + (item.result || '') + '</td>';
                    htm += '<td>' + (item.relationship || '') + '</td>';
                    htm += '<td>' + (item.targetCode || '') + '</td>';
                    htm += '<td>' + (item.description || '') + '</td>';
                    htm += '</tr>';
                    r += 1;
                });
                htm += '</table>';
                tab.set('content', htm);
                tab.medcinId = term.medcinId;
            }, function (err) {
                core.showError(err);
            });
        },

        showPromptTester: function (tab, term) {
            if (!term || !term.medcinId) {
                return;
            };

            if (!this.promptTester) {
                this.promptTester = new PromptTester();
                this.promptTester.startup();
                domStyle.set(tab.domNode, { padding: '0px' });
                tab.set('content', this.promptTester);
            }
            this.promptTester.render(term);
            tab.medcinId = term.medcinId;
        },

        selectRow: function (evt) {
            var tr = core.ancestorNodeByTagName(evt.target, 'tr');
            if (tr) {
                if (domClass.contains(tr, 'selected')) {
                    domClass.remove(tr, 'selected');
                }
                else {
                    var table = tr.parentElement;
                    query('.selected', table).removeClass('selected');
                    domClass.add(tr, 'selected');
                };
            };
        }
    });

});