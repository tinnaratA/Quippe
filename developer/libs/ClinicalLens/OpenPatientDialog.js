define([
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/array",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/_base/declare",
    "dojo/Deferred",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/io-query",
    "dojo/json",
    "dojo/query",
    "dojo/request",
    "dojo/request/iframe",
    "dojo/text!ClinicalLens/templates/OpenPatientDialog.htm",
    "qc/_core",
    "qc/_EnumManager",
    "qc/DateUtil",
    "qc/Dialog",
    "qc/SettingsEnumStore"
], function (_WidgetsInTemplateMixin, array, event, lang, declare, Deferred, domClass, domConstruct, domStyle, ioQuery, json, query, request, iframe, OpenPatientDialogTemplate, core, EnumManager, DateUtil, Dialog, SettingsEnumStore) {
    return declare("ClinicalLens.OpenPatientDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: 'Open Patient',
        templateString: OpenPatientDialogTemplate,

        startup: function () {
            if (!this._started) {
                this.inherited(arguments);
                this.sex.store = new SettingsEnumStore(core.EnumManager.getListArray('sex'));

                if (array.indexOf(core.settings.userRoles, 'Admin') != -1 || array.indexOf(core.settings.userRoles, 'DataImporter') != -1) {
                    domStyle.set(this.importNewPatientButton.domNode, 'display', '');
                }

                request(core.serviceURL('Quippe/PatientData/Patients'), {
                    query: { 
                        Search: '',
                        MaxResults: core.settings.demoNewEncounterDialogMaxPatients || 20,
                        Culture: core.settings.culture, 
                        DataFormat: 'JSON'
                    },
                    handleAs: 'json',
                    preventCache: true
                }).then(lang.hitch(this, function (data) {
                    var count = 0;

                    domConstruct.empty(this.patientsTable);

                    array.forEach(data.patients, lang.hitch(this, function (item) {
                        var htm = '<tr class="' + ((count % 2 == 0) ? 'even' : 'odd') + '"' + (count == 0 ? ' style="border-top:0px"' : '') + '>';

                        htm += ('<td>' + item.id + '</td>');
                        htm += ('<td>' + item.lastName + '</td>');
                        htm += ('<td>' + item.firstName + '</td>');
                        htm += ('<td>' + DateUtil.formatJSONDate(item.birthDate) + '</td>');
                        htm += ('<td>' + (EnumManager.getTextSynch('sex', item.sex) || item.sex) + '</td>');
                        htm += '</tr>';

                        domConstruct.place(htm, this.patientsTable);

                        count += 1;
                    }));

                    core.setSelectable(this.patientsTable, false);

                    if (this.openType == "import") {
                        this.onImportNewPatientClick();
                    }
                }), function (err) {
                    core.showError(err);
                });
            };
        },

        createPatient: function() {
            return request.post(core.serviceURL('Quippe/PatientData/PatientEditor/Add'), {
                query: {
                    DataFormat: 'JSON'
                },
                data: {
                    FirstName: this.firstName.get('value'),
                    LastName: this.lastName.get('value'),
                    BirthDate: DateUtil.formatISODate(this.birthDate.get('value')),
                    Sex: this.sex.get('value')
                },
                handleAs: 'json'
            }).then(lang.hitch(this, function(data) {
                data.patient.birthDate = DateUtil.dateFromJSON(data.patient.birthDate);
                core.Patient = data.patient;
            }), function (error) {
                core.showError(error);
            });
        },

        importChart: function () {
            var queryStringValues = document.location.search ? ioQuery.queryToObject(document.location.search.substring(1)) : {};

            return iframe.post(core.serviceURL('HL7/FHIR/ImportChart'), {
                query: {
                    DataFormat: 'JSON',
                    ReturnMarkedUpChartXml: queryStringValues.ShowXML ? 'true' : 'false',
                    PatientId: core.Patient.id,
                    PersistChart: core.settings.persistChartOnImport
                },
                form: this.uploadForm,
                handleAs: 'html'
            }).then(lang.hitch(this, function (html) {
                var chart = json.parse(html.documentElement.outerText || html.documentElement.textContent).historyPool;

                if (!core.settings.persistChartOnImport) {
                    var currentEntryId = 1;

                    array.forEach(chart.findings, function(finding) {
                        array.forEach(finding.entries, function(entry) {
                            entry.id = currentEntryId++;
                        });
                    });
                }

                return chart;
            }), function (error) {
                core.showError(error);
            });
        },

        getPatient: function (patientId) {
            console.log('== getPatient==');
            console.log(core);
            if (!core.smart) {
            return request.get(core.serviceURL('Quippe/PatientData/Patient'), {
                query: {
                    id: patientId,
                    DataFormat: 'JSON'
                },
                handleAs: 'json'
                }).then(lang.hitch(this, function(data) {
                data.patient.birthDate = DateUtil.dateFromJSON(data.patient.birthDate);
                core.Patient = data.patient;
                }), function(error) {
                    core.showError(error);
                });
            }

            else {
                var deferred = new Deferred();

                core.smart.patient.read().then(lang.hitch(this, function (patient) {
                    core.Patient = {
                        id: patient.id,
                        firstName: patient.name[0].given.join(' '),
                        lastName: patient.name[0].family.join(' '),
                        sex: patient.gender ? patient.gender.substring(0, 1).toUpperCase() : 'U',
                        birthDate: patient.birthDate ? new Date(patient.birthDate) : null
                    };

                    deferred.resolve();
            }), function (error) {
                core.showError(error);
                    deferred.reject();
            });

                return deferred.promise;
            }
        },

        openChart: function () {
            return this.getPatient(this.selectedPatientId).then(lang.hitch(this, function () {
                if (core.smart) {
                    return request.get(core.serviceURL('HL7/FHIR/RetrieveChart'), {
                        query: {
                            DataFormat: 'JSON',
                            PatientId: this.selectedPatientId,
                            FHIRServerUrl: core.smart.server.serviceUrl,
                            FHIRAuthToken: core.smart.server.auth ? core.smart.server.auth.token : null,
                            FHIRAuthTokenType: core.smart.server.auth ? core.smart.server.auth.type : null
                        },
                        handleAs: 'json'
                    });
                }

                else {
                    return request.get(core.serviceURL('Quippe/PatientData/HistoryPool'), {
                        query: {
                            DataFormat: 'JSON',
                            PatientId: this.selectedPatientId,
                            IncludePhrasing: 'True',
                            TermProperties: 'TermType,IsFreeText,Specialty,GroupName,GroupNodeKey,SectionName,Flag'
                        },
                        handleAs: 'json'
                    });
                }
            })).then(lang.hitch(this, function (data) {
                if (core.smart) {
                    return data.historyPool;
                }

                else {
                    var findingIndex = {};

                    array.forEach(data.historyPool.findings, function(finding) {
                        finding.termType = finding.termtype;
                        findingIndex[finding.medcinId + ":" + finding.prefix] = finding;
                    });

                    return request.get(core.serviceURL('Quippe/PatientData/Patient/Summary'), {
                        query: {
                            DataFormat: 'JSON',
                            PatientId: this.selectedPatientId
                        },
                        handleAs: 'json'
                    }).then(lang.hitch(this, function(summaryData) {
                        if (summaryData.summary && summaryData.summary.length > 0) {
                            array.forEach(summaryData.summary, function(summaryItem) {
                                if (summaryItem.categoryId == 0 && findingIndex[summaryItem.medcinId + ":" + summaryItem.prefix]) {
                                    findingIndex[summaryItem.medcinId + ":" + summaryItem.prefix].isActiveProblem = true;
                                }
                            });
                        }

                        if (array.indexOf(core.settings.services, 'Quippe.IChartAnalysisService') > 0) {
                            return request.get(core.serviceURL('Quippe/PatientData/AnalyzeChart'), {
                                query: {
                                    DataFormat: 'JSON',
                                    PatientId: this.selectedPatientId
                                },
                                handleAs: 'json'
                            }).then(function(analysisData) {
                                data.historyPool.warningMessages = analysisData.warnings;
                                return data.historyPool;
                            });
                        }

                        else {
                            return data.historyPool;
                        }
                    }));
                }
            }));
        },

        displayProcessingOverlay: function() {
            this.processingOverlay = domConstruct.create('div', {
                className: 'loadingShim',
                innerHTML: 'Loading...'
            }, document.documentElement);

            this.hide();
        },

        importPatient: function() {
            this.displayProcessingOverlay();
            this.patientOpening();
            return this.createPatient().then(lang.hitch(this, this.importChart)).then(lang.hitch(this, this.patientOpened));
        },

        openPatient: function (patientId) {
            if (patientId) {
                this.selectedPatientId = patientId;
            }

            this.displayProcessingOverlay();
            this.patientOpening();
            this.openChart().then(lang.hitch(this, this.patientOpened));
        },

        onOKClick: function () {
            if (this.openType == "import") {
                if (!this.firstName.isValid || !this.lastName.isValid || !this.birthDate.isValid || !this.sex.isValid || !this.chartFileName.files || this.chartFileName.files.length == 0) {
                    return;
                }

                this.importPatient();
            }

            else {
                this.openPatient();
            }
        },

        onCancelClick: function () {
            this.destroy();
        },

        destroy: function () {
            this.inherited(arguments);

            if (this.processingOverlay) {
                domConstruct.destroy(this.processingOverlay);
            }
        },

        onImportNewPatientClick: function () {
            this.openType = "import";

            domStyle.set(this.choosePatientStep, 'display', 'none');
            domStyle.set(this.importPatientStep, 'display', 'block');

            this.set('title', 'Import New Patient');
            this.cmdOK.set('disabled', false);
        },

        onPatientsTableClick: function(evt) {
            event.stop(evt);
            var row = null;

            switch (evt.target.tagName.toLowerCase()) {
                case 'td':
                    row = evt.target.parentNode;
                    break;

                case 'tr':
                    row = evt.target;
                    break;

                default:
                    row = null;
                    break;
            }

            if (row) {
                this.selectPatient(row);
                this.cmdOK.set('disabled', false);
            }
        },

        onPatientsTableDoubleClick: function (evt) {
            this.onPatientsTableClick(evt);
            this.onOKClick();
        },

        selectPatient: function (row) {
            query("*", this.patientsTable).removeClass("selected");
            domClass.add(row, "selected");

            this.selectedPatientId = row.children[0].innerHTML;
        }
    });
})