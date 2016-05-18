define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/_core",
    "qc/DateUtil"
], function (array, declare, lang, core, DateUtil) {
    return declare("qc.flowsheet.HistoryPool", [], {
        patientId: '',
        encounterTime: null,
        encounters: [],
        findings: [],
        encounterIndex: {},
        findingIndex: {},
        _loaded: false,
        _deferred: null,
    
        load: function (patientId, encounterTime) {
            if (this._loaded) {
                return true;
            }
            else if (this._deferred) {
                return this._deferred;
            }
            else {
                this.patientId = patientId;
                this.encounterTime = encounterTime;
                this._deferred = this._loadPool();
                return this._deferred;
            };
        },
    
        reset: function () {
            this.patientId = '';
            this.encounterTime = name;
            this.encounters = null;
            this.encounterIndex = null;
            this.findings = null;
            this.findingIndex = null;
            this._loaded = false;
            this._deferred = null;
        },
    
        isLoaded: function () {
            return this._loaded;
        },

        _populateData: function(historyPool) {
            var encounterList = array.map(historyPool.encounters, function (item) {
                return { id: item.id, time: typeof item.encounterTime == "string" ? DateUtil.dateFromJSON(item.encounterTime) : item.encounterTime }
            });

            var encounterIndex = {};
            for (var e = 0; e < encounterList.length; e++) {
                encounterIndex[encounterList[e].id] = e;
            };

            var findingList = [];
            var finding = null;
            var entries = null;
            array.forEach(historyPool.findings, function (hFinding) {
                finding = {
                    medcinId: hFinding.medcinId,
                    prefix: hFinding.prefix || '',
                    nodeKey: hFinding.nodeKey || '',
                    text: hFinding.text || hFinding.label || '',
                    sectionId: hFinding.sectionId || '',
                    groupId: hFinding.groupId || '',
                    entries: {}
                };
                array.forEach(hFinding.entries, function (hEntry) {
                    finding.entries[hEntry.encounterId] = {
                        result: hEntry.result || '',
                        value: hEntry.value || '',
                        unit: hEntry.unit || ''
                    };
                    if (hEntry.result == 'A') {
                        finding.hasAbnormalHistory = true;
                    };
                });
                findingList.push(finding);
            });

            var findingIndex = {};
            var key = '';
            for (var f = 0; f < findingList.length; f++) {
                key = this.getFindingKey(findingList[f].medcinId, findingList[f].prefix);
                findingIndex[key] = f;
            };

            this.encounters = encounterList;
            this.encounterIndex = encounterIndex;
            this.findings = findingList;
            this.findingIndex = findingIndex;
            this._loaded = true;
            return true;
        },
    
        _loadPool: function () {
            var self = this;
            return core.xhrGet({
            	url: core.serviceURL('Quippe/PatientData/HistoryPool'),
            	content: { "PatientId": this.patientId, "StartDate": DateUtil.formatISODate(this.encounterTime), "DataFormat": "JSON" },
            	handleAs: 'json',
            	error: function (err) {
            	    core.showError('Error loading patient history. ' + err.message || err);
            		self.encounters = [];
            		return self.encounters;
            	},
            	load: lang.hitch(this, function (data, ioArgs) {
	                return this._populateData(data.historyPool);
	            })
            });
        },
    
        getEncounter: function (encounterId) {
            return this.isLoaded() ? this.encounters[this.encounterIndex[encounterId]] || null : null;
        },
    
        getEncounterFindings: function (encounterId) {
            if (!this.isLoaded()) {
                return null;
            };
    
            var list = [];
            array.forEach(this.findings, function (finding) {
                if (finding.entries[encounterId]) {
                    list.push(finding, finding.entries[encounterId]);
                };
            });
            return list;
        },
    
        getFindings: function () {
            return this.isLoaded() ? this.findings : null;
        },
    
        getFinding: function (medcinId, prefix) {
            if (this.isLoaded()) {
                return this.findings[this.findingIndex[this.getFindingKey(medcinId, prefix)]] || null;
            }
            else {
                return null;
            };
        },
    
        getEntry: function (encounterId, medcinId, prefix) {
            var finding = this.getFinding(medcinId, prefix);
            if (finding) {
                var entry = finding.entries[encounterId];
                if (entry) {
                    return this.createEntry(finding, entry);
                };
            };
            return null;
        },
    
        createEntry: function (finding, findingEntry) {
            return {
                medcinId: finding.medcinId,
                prefix: finding.prefix || '',
                nodeKey: finding.nodeKey || '',
                sectionId: finding.sectionId || '',
                groupId: finding.groupId || '',
                text: finding.text || '',
                result: findingEntry.result || 'A',
                value: findingEntry.value || '',
                unit: findingEntry.unit || ''
            };
        },
    
        getFindingKey: function (medcinId, prefix) {
            return 'M' + (medcinId || 0) + (prefix ? '_' + prefix : '');
        }
    });
});