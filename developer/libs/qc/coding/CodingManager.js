define([
    "qc/coding/EntryPanel",
    "qc/StringUtil",
    "qc/XmlWriter",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/query",
    "dojo/topic",
    "dojo/when",
    "qc/_core",
	"qc/DateUtil"
], function (EntryPanel, StringUtil, XmlWriter, registry, array, declare, lang, query, topic, when, core, DateUtil) {
    var CodingManager = declare("qc.coding.CodingManager", [], {
        _started: false,
        relationships: null,
        relationshipSnomedIds: null,

        startup: function () {
            if (!this._started) {
                this._started = true;
                this.loadVocabs();
                this.loadRelationships();
            };
        },
    
        vocabularies: [],
    
        specifierLists: {},
    
        loadVocabs: function () {
            if (this.vocabularies && this.vocabularies.length > 0) {
                return this.vocabularies;
            };
    
            var self = this;
            return core.xhrGet({
                url: core.serviceURL('Quippe/Coding/Vocabs'),
                content: { DataFormat: 'JSON' },
                handleAs: 'json',
                error: function () { },
                load: function (data, ioArgs) {
                    if (data.vocabs) {
                        self.vocabularies = data.vocabs;
                        return self.vocabularies;
                    }
                    else {
                        return [];
                    }
                }
            });
    
        },

        loadRelationships: function() {
            if (this.relationships) {
                return this.relationships;
            }
            else {
                var self = this;
                return core.xhrGet({
                    url: core.serviceURL('Quippe/Coding/Relationships'),
                    content: { DataFormat: 'JSON' },
                    handleAs: 'json',
                    error: function () { },
                    load: function (data, ioArgs) {
                        if (data.relationships) {
                            self.relationships = data.relationships;
                            self.relationshipSnomedIds = {};
                            array.forEach( self.relationships, function(r) {
                                if (r.name && r.snomedId) {
                                    self.relationshipSnomedIds[r.name] = r.snomedId;
                                };
                            });
                            return self.relationships;
                        }
                        else {
                            return [];
                        }
                    }
                });
            };
        },
    
        shouldMapAny: function (finding, vocabs) {
            return array.some(vocabs, function (v) { return this.shouldMap(finding, v) }, this);
        },
    
        shouldMap: function (finding, vocab) {
            return true;
        },
    
        getSpecifierList: function (listId) {
            if (this.specifierLists[listId]) {
                return this.specifierLists[listId];
            }
            else {
                var self = this;
                var def = core.xhrGet({
                    url: core.serviceURL('Coding/SpecifierList'),
                    content: { ListId: listId, DataFormat: 'JSON' },
                    handleAs: 'json',
                    error: function () {
                        self.specifierLists[listId] = null;
                    },
                    load: function (data, ioArgs) {
                        self.specifierLists[listId] = core.forceArray(data['enum']);
                        return self.specifierLists[listId];
                    }
                });
                self.specifierLists[listId] = def;
                return def;
            };
        },
    
        getEntryPanel: function (vocab, finding) {
            var panel = null;
    
            var typeName = 'qc/coding/EntryPanel_' + vocab;
            var PanelType = null;

            try {
                PanelType = require(typeName);
            }

            catch (e) {
            }
    
            if (PanelType) {
                panel = new PanelType();
            }
            else {
                panel = new EntryPanel({ vocabName: vocab });
            };
    
            return panel.render(finding) ? panel : null;
        },
    
        vocab: function (name) {
            return array.filter(this.vocabularies, function (v) { return v.name == name })[0] || null;
        },
    
        mapFinding: function (findingWidget, vocabs, forceRefresh) {
            if (!findingWidget) {
                return false;
            };
    
            if (!findingWidget.codingInfo) {
                findingWidget.codingInfo = {};
            };
    
            var rxNormTermTypes = null;

            var vocabList = [];
            array.forEach(core.forceArray(vocabs), function (v) {
                if ((forceRefresh || !findingWidget.codingInfo[v] || findingWidget.codingInfo.prefix != findingWidget.prefix ||
                     ((!findingWidget.codingInfo[v] || findingWidget.codingInfo[v].isQualified) && (findingWidget.codingInfo.status != findingWidget.status || 
                       findingWidget.codingInfo.modifier != findingWidget.modifier || findingWidget.codingInfo.result != findingWidget.result ||
					   findingWidget.codingInfo.value != findingWidget.value)))
                    && this.shouldMap(findingWidget, v)) {
                    vocabList.push(v);
                    if (v == 'rxnorm' && core.settings.codingRxNormTermTypes) {
                        rxNormTermTypes = new RegExp('^(' + core.settings.codingRxNormTermTypes.split(',').map(function (x) { return x.toUpperCase().trim() }).join('|') + ')$');
                    }
                };
            }, this);
    
            if (vocabList.length == 0) {
                return false;
            };
    
            var self = this;
            var finding = findingWidget.toFinding();
            var count = 0;
            var entries = null;
    
            if (!finding.medcinId) {
                return false;
            };
    
            var snomedExpressions = core.settings.codingIncludeSnomedExpressions;

            return core.xhrGet({
                url: core.serviceURL('Quippe/Coding/FindingMap'),
                content: {
                    MedcinId: finding.medcinId,
                    Prefix: finding.prefix || '',
                    Result: finding.result || '',
                    Modifier: finding.modifier || '',
                    Status: finding.status || '',
                    Value: finding.value || '',
                    Vocabs: vocabList.join(','),
                    RecordId: findingWidget.id,
                    DataFormat: 'JSON',
                    IncludeHints: core.settings.codingShowHints,
                    IncludeSpecifierLists: core.settings.codingShowSpecifiers,
                    PatientId: core.Patient ? core.Patient.id || '' : '',
                    EncounterTime: core.Encounter ? DateUtil.formatISODate(core.Encounter.encounterTime) : ''
                },
                handleAs: 'json',
                error: core.showError,
                load: function (data, ioArgs) {
                    array.forEach(vocabList, function (v) {
                        entries = self.getMapEntries(data.codeMap, findingWidget.id, v);
                        if (entries && entries.length > 0) {
                            if (snomedExpressions && v == 'snomed') {
                                self.addSnomedExpressions(entries);
                            };
                            if (rxNormTermTypes && v == 'rxnorm') {
                                entries = entries.filter(function (x) { return x.termType && rxNormTermTypes.test(x.termType) });
                            };
                            findingWidget.codingInfo[v] = entries;
                            self.autoSelectEntry(findingWidget, v, entries);
                            count++;
                        }
                        else {
                            findingWidget.codingInfo[v] = []; //track empty mappings
                            if (findingWidget.codes && findingWidget.codes[v]) {
                                delete findingWidget.codes[v];
                            };
                            if (entries) {
                                findingWidget.codingInfo[v].isQualified = entries.isQualified;
                            };
                        }
                    });

                    findingWidget.codingInfo.prefix = findingWidget.prefix;
                    findingWidget.codingInfo.status = findingWidget.status;
                    findingWidget.codingInfo.modifier = findingWidget.modifier;
                    findingWidget.codingInfo.result = findingWidget.result;
                    findingWidget.codingInfo.value = findingWidget.value;

                    //self.autoSelectCodes(findingWidget);
                    topic.publish('/coding/MapChanged', findingWidget);
                    return (count > 0);
                }
            });
    
        },
    
        getMapEntries: function (codeMap, recordId, vocab) {
            var records = core.forceArray(codeMap);
            for (var r = 0; r < records.length; r++) {
                if (records[r].id == recordId) {
                    var maps = core.forceArray(records[r].map);
                    for (var m = 0; m < maps.length; m++) {
                        if (maps[m].vocab == vocab) {
                            var returnValue = core.forceArray(maps[m].entries);

                            if (maps[m].isQualified) {
                                returnValue.isQualified = true;
                            }

                            return returnValue;
                        };
                    };
                };
            };
            return [];
        },
    
        mapChart: function (filter, vocabularies) {
            var noteEditor = query('.qcNoteEditor').map(registry.byNode)[0];
            if (!noteEditor) {
                return false;
            };
    
            var vocabs = array.map(vocabularies || this.vocabularies, function (v) { return { name: v.name, updateNeeded: false} });
            var allVocabsNeeded = false;
            var findingUpdateNeeded = false;
            var findings = [];
    
            var self = this;
    
            query('.finding', noteEditor.domNode).map(registry.byNode).forEach(function (finding) {
                if (finding.codingInfo) {
                    if (!finding.codingInfo.deferred) {
                        findingUpdateNeeded = false;

                        array.forEach(vocabs, function (v) {
                            if ((finding.codingInfo[v.name] == undefined || finding.codingInfo.prefix != finding.prefix || (finding.codingInfo[v.name].isQualified && (finding.codingInfo.status != finding.status || finding.codingInfo.result != finding.result || finding.codingInfo.modifier != finding.modifier || finding.codingInfo.value != finding.value))) && self.shouldMap(finding, v.name)) {
                                findingUpdateNeeded = true;
                                v.updateNeeded = true;
                            };
                        });
                        if (findingUpdateNeeded) {
                            findings.push(finding);
                        };
                    };
                }
                else {
                    if (self.shouldMapAny(finding, vocabs)) {
                        finding.codingInfo = { deferred: true };
                        findings.push(finding);
                        allVocabsNeeded = true;
                    };
                };
            });
    
            if (findings.length == 0) {
                return false;
            };
    
            var codeSets = array.filter(vocabs, function (v) { return allVocabsNeeded || v.updateNeeded }).map(function (x) { return x.name });
            var codeSetList = codeSets.join(',');
    
            var chartData = this.getChartXML(findings);
            if (!chartData) {
                return false;
            };
    
            return core.xhrPost({
                url: core.serviceURL('Quippe/Coding/ChartMap?DataFormat=JSON'),
                content: {
                    Vocabs: codeSetList,
                    Chart: chartData,
                    IncludeHints: core.settings.codingShowHints,
                    IncludeSpecifierLists: core.settings.codingShowSpecifiers
                },
                handleAs: 'json',
                error: core.showError,
                load: function (data, ioArgs) {
                    var changed = false;
                    array.forEach(core.forceArray(data.codeMap), function (record) {
                        var widget = registry.byId(record.id);
                        if (widget) {
                            if (!widget.codingInfo || widget.codingInfo.deferred) {
                                widget.codingInfo = {};
                            }

                            array.forEach(vocabs, function (v) {
                                widget.codingInfo[v] = [];
                            });
				
                            array.forEach(core.forceArray(record.map), function (map) {
                                if (map.vocab == 'snomed') {
                                    self.addSnomedExpressions(map.entries);
                                };

                                widget.codingInfo[map.vocab] = map.entries;

                                if (map.isQualified) {
                                    widget.codingInfo[map.vocab].isQualified = true;
                                };

                                self.autoSelectEntry(widget, map.vocab, map.entries);

                            });

                            widget.codingInfo.prefix = widget.prefix;
                            widget.codingInfo.status = widget.status;
                            widget.codingInfo.modifier = widget.modifier;
                            widget.codingInfo.result = widget.result;
                            widget.codingInfo.value = widget.value;

                            //self.autoSelectCodes(widget);
                            changed = true;
                        };
                    });
                    if (changed) {
                        topic.publish('/coding/MapChanged');
                    };
                    return true;
                }
            });
        },
    
        getChartXML: function (findingWidgets) {
            if (!findingWidgets || findingWidgets.length == 0) {
                return '';
            };
    
            var eTime = core.Encounter && core.Encounter.encounterTime ? core.Encounter.encounterTime : new Date();
    
            var w = new XmlWriter();
            w.beginElement("Chart");
            w.attribute("xmlns", "http://schemas.medicomp.com/V3/Chart.xsd");
    
            w.beginElement("Patient");
            if (core.Patient) {
                w.attribute("id", core.Patient.id || '', '');
            }
    
            w.beginElement("Encounters");
            w.beginElement("Encounter");
            w.attribute("EncounterTime", DateUtil.formatISODate(eTime));
            w.beginElement("Records");
    
            var finding = null;
            array.forEach(findingWidgets, function (findingWidget) {
                finding = findingWidget.toFinding();
                w.beginElement('Record');
                w.attribute('id', findingWidget.id);
                w.attribute('MedcinId', finding.medcinId, 0);
                w.attribute('Prefix', finding.prefix, '');
                w.attribute('Result', finding.result, '');
                w.attribute('Status', finding.status, '');
                w.attribute('Value', finding.value, '');
                w.attribute('Unit', finding.unit, '');
                w.endElement();
            });
    
            w.endElement(); //Records
            w.endElement(); //Encounter
            w.endElement(); //Encounters
            w.endElement(); //Patient
            w.endElement(); //Chart
    
            return w.toString();
        },
    
        //autoSelectCodes: function (finding) {
        //    if (!finding || !finding.codingInfo) {
        //        return;
        //    };
        //    if (!finding.codes) {
        //        finding.codes = {};
        //    };
        //    for (var v in finding.codingInfo) {
        //		if (!(finding.codingInfo[v] instanceof Array)) {
        //			continue;
        //		}

        //    	if (finding.codes[v] && !array.some(finding.codingInfo[v], function(code) {
        //            return code.code == finding.codes[v].code;
        //    	})) {
        //            delete finding.codes[v];
        //        }

        //        if (!finding.codes[v]) {
        //            var entry = array.filter(finding.codingInfo[v], function (mapEntry) {
        //                return mapEntry.autoSelect;
        //            });
        //            if (entry.length > 0) {
        //                finding.codes[v] = entry[0];
        //                finding.codes[v].autoMapped = true;
        //            };
        //        };
        //    };
        //},

        autoSelectEntry: function (finding, vocab, entries) {
            if (!finding) {
                return;
            };

            if (!finding.codingInfo || !entries) {
                if (finding.codes) {
                    delete finding.codes;
                };
                return;
            };

            if (!finding.codes) {
                finding.codes = {};
            };

            var currentEntry = finding.codes[vocab] || null;

            if (!currentEntry || !entries.some(function (x) { return (x.code == currentEntry.code) || (x.code == currentEntry.baseCode) })) {
                delete finding.codes[vocab];
                var autoEntry = entries.filter(function (x) { return x.autoSelect })[0];
                if (autoEntry) {
                    finding.codes[vocab] = autoEntry;
                    finding.codes[vocab].autoMapped = true;
                }
            };

        },

        sortCodes: function (finding) {
            if (!finding || !finding.codingInfo) {
                return;
            };
            for (var v in finding.codingInfo) {
                finding.codingInfo[v].sort(StringUtil.compare);
            };
        },
    
        //applySpecifier: function (vocabName, baseCode, specItem) {
        //    var customFunction = 'applySpecifier_' + vocabName;
        //    if (core.isFunction(this[customFunction])) {
        //        return this[customFunction](baseCode, specItem);
        //    };
    
        //    if (specifier.digit && baseCode) {
        //        var buf = baseCode.split('');
        //        buf[specifier.digit] = code;
        //        for (var n = 0; n < buf.length; n++) {
        //            if (!buf[n]) {
        //                buf[n] = '?';
        //            };
        //        };
        //        entry.resolvedCode = buf.join('');
        //    }
        //    else {
        //        entry.resolvedCode = baseCode;
        //    };
        //},
    
        //applySpecifier_icd10: function (baseCode, specItem) {
        //},

        addSnomedExpressions: function (entries) {
            if (!entries) {
                return;
            };
            var self = this;

            when(self.loadRelationships(), function (rel) {
                var useDesc = core.settings.codingUseDescriptionsInSnomedExpressions;
                array.forEach(entries, function (entry) {
                    if (!entry.expression) {
                        var expr = '';
                        expr += entry.code;
                        expr += useDesc ? '|' + entry.description + '|' : '';
                        if (entry.qualifier) {
                            array.forEach(core.forceArray(entry.qualifier), function (q) {
                                if (self.relationshipSnomedIds[q.relationship]) {
                                    expr += ':'
                                    expr += self.relationshipSnomedIds[q.relationship];
                                    expr += useDesc ? '|' + q.relationship + '|' : '';
                                    expr += '=';
                                    expr += q.code;
                                    expr += useDesc ? '|' + q.description + '|' : '';
                                }
                            });
                        };
                        entry.expression = expr;
                    };
                });
            });

        }
    
    });

	var singleton = new CodingManager();

	lang.setObject("qc.coding.CodingManager", singleton);

	return singleton;
});