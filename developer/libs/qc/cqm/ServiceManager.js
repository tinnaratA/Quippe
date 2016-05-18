define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/query",
    "dojo/request",
    "dojo/topic",
    "dojo/when",
    "dijit/registry",
    "qc/StringUtil",
    "qc/DateUtil",
    "qc/_core"
], function (declare, array, lang, Deferred, promiseAll, query, request, topic, when, registry, StringUtil, DateUtil, core) {

    var ServiceManager = declare('qc.cqm.ServiceManager', [], {
        systems: null,
        measures: null,
        _selectedMeasureCodes: null,

        evaluationStatusLabels: ['None', 'Performed', 'Failed', 'Not Implemented'],
        //server eval result:   ['None', 'N/A', 'Applicable', 'Included', 'Excluded', 'Excepted', 'Partially Met', 'Met'],
        evaluationResultLabels: ['None', 'N/A', 'Unmet', 'Unmet', 'Excluded', 'Excluded', 'Met', 'Met'],
        //server doc status:       ['None', 'NotFinished', 'Pending', 'Finished'],
        documentationStatusLabels: ['Unmet', 'Incomplete', 'Pending', 'Unmet'],

        constructor: function () {
            topic.subscribe('/qc/DocumentLoaded', lang.hitch(this, function () { this.reset(); }));
            topic.subscribe('/qc/SettingsChanged', lang.hitch(this, this.onSettingsChanged));
        },

        getSelectedMeasureCodes: function() {
            if (!this._selectedMeasureCodes) {
                this._selectedMeasureCodes = core.settings.cqmSelectedMeasures ? core.settings.cqmSelectedMeasures.split(',') : [];
            };
            return this._selectedMeasureCodes;
        },

        setSelectedMeasureCodes: function(value) {
            this._selectedMeasureCodes = typeof value == 'string' ? value.split(',') : core.forceArray(value);
        },

        getMeasurePeriod: function() {
            if (this._measurePeriod == undefined) {
                this._measurePeriod = core.settings.cqmMUMeasurePeriod ? DateUtil.parseDateRangeString(core.settings.cqmMUMeasurePeriod) : null;
            };
            return this._measurePeriod;
        },
        setMeasurePeriod: function(value) {
            this._measurePeriod = value;
        },

        addSelectedMeasureCode: function(code) {
            var i = array.indexOf(this._selectedMeasureCodes, code);
            if (i < 0) {
                this._selectedMeasureCodes.push(code);
            };
        },

        removeSelectedMeasureCode: function(code) {
            var i = array.indexOf(this._selectedMeasureCodes, code);
            if (i >= 0) {
                this._selectedMeasureCodes.splice(i, 1);
            };
        },

        getSystems: function () {
            if (this.systems) {
                return this.systems;
            };

            var self = this;
            return request.get(core.serviceURL('Quippe/Coding/Cqm/SupportedSystems'), {
                query: { DataFormat: "JSON" }, handleAs: 'json'
            }).then(function (data) {
                self.systems = data.supportedSystems;
                return self.systems;
            }, core.showError);
        },

        getMeasures: function () {
            if (this.measures) {
                return this.measures;
            };

            var self = this;
            return request.get(core.serviceURL('Quippe/Coding/Cqm/MeasureList'), {
                query: { DataFormat: "JSON" },
                handleAs: 'json'
            }).then(function (data) {
                self.measures = data.measures;
                return self.measures;
            }, core.showError);
        },

       
        getMeasure: function (code) {
            var i = array.indexOf(this.getMeasures(), function (m) { return m.code == code });
            return i >= 0 ? self.measures[i] : null;
        },

        formatMeasureCode: function(systemId, measureId) {
            return (systemId || '').toUpperCase() + '-' + StringUtil.padLeft(measureId, 4, "0");
        },

        isSelected: function(measure) {
            return array.indexOf(this.getSelectedMeasureCodes(), measure.code) >= 0;
        },

        getSelectedMeasures: function () {
            return array.filter(this.getMeasures(), this.isSelected, this);
        },

        evaluate: function(measureCodes) {
            when(this.ready(), lang.hitch(this, function () { this._evaluate(measureCodes) }));
        },

        getMeasureStatus: function (prompt) {
            var status = { text: 'Unknown' };

            if (prompt) {
                if (prompt.evaluationStatus == 1 /*Performed*/) {
                    status.text = this.evaluationResultLabels[prompt.evaluationResult] || 'Unknown Result';
                    if (status.text == 'Unmet' && prompt.documentationStatus) {
                        status.text = this.documentationStatusLabels[prompt.documentationStatus] || 'Unmet'
                    };
                }
                else {
                    status.text = this.evaluationStatusLabels[prompt.evaluationStatus] || 'Unknown Status';
                }
            };
            return status;
        },

        _evaluate: function (measureCodes) {
            var patientId = core.Patient ? core.Patient.id : '';
            if (!patientId) {
                return null;
            };

            measureCodes = (measureCodes || this.getSelectedMeasureCodes().join(',')).toLowerCase()
            if (!measureCodes) {
                return null;
            };

            var calcStatus = lang.hitch(this, this.getMeasureStatus);
            var chart = this.getChartXml();
            var self = this;

            var content = {
                PatientId: patientId,
                IgnoreEncounterType: true,
                Chart: chart,
                Measures: measureCodes
            };

            var measurePeriod = this.getMeasurePeriod();
            if (measurePeriod) {
                content.MeasurementPeriodStart = DateUtil.formatISODate(measurePeriod.start);
                content.MeasurementPeriodEnd = DateUtil.formatISODate(measurePeriod.end);
            };
           
            var def = request.post(core.serviceURL('Quippe/Coding/Cqm/Evaluate?DataFormat=JSON&Culture=' + core.settings.culture), {
                data: content,
                handleAs: 'json'
            }).then(function (data) {
                this.hEvaluate = null;

                if (data.error) {
                    core.showError(data.error);
                    return null;
                };

                var resSystems = data && data.evaluation ? core.forceArray(data.evaluation.prompts) : [];
                array.forEach(resSystems, function (resSystem) {
                    var prompts = core.forceArray(resSystem.prompt);
                    array.forEach(prompts, function (prompt) {
                        var code = self.formatMeasureCode(resSystem.systemId, prompt.measureId);
                        var measure = self.getMeasures().find(function (x) { return x.code == code });
                        if (measure) {
                            measure.response = prompt;
                            measure.status = calcStatus(prompt);
                        };
                    });
                });

                topic.publish('/cqm/measuresUpdated');
            }, core.showError);

            return def;
        },

        getChartXml: function () {
            var editor = this.getNoteEditor();
            if (!editor) {
                return null;
            };
            return editor.getChartXml(null, { evenIfEmpty: true });
        },

        getNoteEditor: function () {
            return query('.qcNoteEditor').map(registry.byNode)[0];
        },

        ready: function () {
            var d1 = new Deferred();
            when(this.getSystems(), function () {
                d1.resolve();
            });

            var d2 = new Deferred();
            when(this.getMeasures(), function () {
                d2.resolve();
            });

            return promiseAll([d1, d2]);
        },

        reset: function () {
            if (this.measures) {
                array.forEach(this.measures, function (measure) {
                    measure.applicable = null;
                    measure.updateNeeded = null;
                    measure.complete = null;
                    measure.excluded = null;
                });
            };
            this._selectedMeasureCodes = null;
        },

        onSettingsChanged: function (settings) {
            if (settings.cqmMUMeasurePeriod != undefined) {
                this._measurePeriod = DateUtil.parseDateRangeString(settings.cqmMUMeasurePeriod)
            };
        }

    });

    var instance = new ServiceManager();
    lang.setObject("qc.cqm.ServiceManager", instance);
    
    return instance;
});