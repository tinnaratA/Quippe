define([
    "qc/DateUtil",
    "qc/Dialog",
    "qc/SettingsEnumStore",
    "qc/StringUtil",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/DateTextBox",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/text!qc/templates/PatientEditorDialog.htm",
	"dojo/topic",
    "dojo/when",
    "qc/_core",
    "dojo/request",
    "qc/XmlWriter"
], function (DateUtil, Dialog, SettingsEnumStore, StringUtil, _WidgetsInTemplateMixin, DateTextBox, array, declare, lang, domStyle, PatientEditorDialogTemplate, topic, when, core, request, XmlWriter) {
    return declare("qc.PatientEditorDialog", [Dialog, _WidgetsInTemplateMixin], {
        templateString: PatientEditorDialogTemplate,

        title: 'Demo Patient Editor',
        //fieldNames: ['PatientId', 'LastName', 'FirstName', 'BirthDate', 'Sex', 'Race', 'Religion', 'Ethnicity', 'MaritalStatus'],
        fieldNames: ['PatientId', 'LastName', 'FirstName', 'BirthDate', 'Sex', 'DefaultTemplate'],

        startup: function () {
            if (!this._started) {
                this.loadLists();
                this.resetFields();
                this.inherited(arguments);
            };
        },

        loadLists: function () {
            this.cSex.store = new SettingsEnumStore(core.EnumManager.getListArray('sex'));
            this.cSex.searchAttr = 'text';
            this.cSex.set('value', '');

            this.cDefaultTemplate.store = new SettingsEnumStore("Quippe/ContentLibrary/Search?TypeName=template", true, "text");
            this.cDefaultTemplate.store.updateNeeded = true;
        },

        //loadLists: function () {
        //    var names = ['Sex', 'Race', 'Religion', 'Ethnicity', 'MaritalStatus'];
        //    var enums = ['GENDER', 'RACE', 'RELIGION', 'ETHNIC', 'MARITAL']
        //    array.forEach(names, function (name, i) {
        //        var listBox = this['c' + name];
        //        listBox.store = new SettingsEnumStore('Medcin/Enums/' + enums[i], true, 'text');
        //        listBox.searchAttr = 'text';
        //        listBox.set('value', '');
        //    }, this);
        //},

        show: function () {
            this.resetFields();
            this.loadPatients();
            this.inherited(arguments);
        },

        resetFields: function () {
            array.forEach(this.fieldNames, function (fieldName) {
                this['c' + fieldName].set('value', '');
            }, this);
            domStyle.set(this.formTable, { display: 'none' });
            this.cPatientId.set('disabled', false);
        },

        loadPatients: function () {
            var self = this;
            var lv = this.lvPatients;
            lv.clear();

            return request(core.serviceURL('Quippe/PatientData/Patients'), {
                query: { 'DataFormat': 'JSON' },
                preventCache: true,
                handleAs: 'json'
            }).then(function(data) {
                array.forEach(core.forceArray(data.patients), function (patient) {
                    lv.addItem({ id: patient.id, text: self.createNameLabel(patient), patient: patient });
                });
                lv.addItem({ id: "(new)", text: "(New Patient)", patient: { id: "(new)" } });
            }, function(err) {
                core.showError(err);
            });
        },

        onSaveClicked: function () {
            var item = this.lvPatients.getSelectedItem();
            if (!(item && item.data && item.data.patient)) {
                return;
            };

            var patientData = {};
            var isValid = true;
            var customPropertiesXml = new XmlWriter();

            customPropertiesXml.beginElement("Properties");

            array.forEach(this.fieldNames, function (fieldName) {
                var widget = this['c' + fieldName];
                if (core.isFunction(widget.validate)) {
                    isValid = isValid && widget.validate();
                };

                if (fieldName == 'BirthDate') {
                    patientData.BirthDate = DateUtil.formatISODate(this.cBirthDate.get('value'));
                }
                
                else if (fieldName == "DefaultTemplate") {
                    patientData[fieldName] = widget.get('value');

                    customPropertiesXml.element("Property", {
                        Name: fieldName,
                        Value: widget.get("value")
                    });
                }

                else {
                    patientData[fieldName] = widget.get('value');
                };
            }, this);

            customPropertiesXml.endElement();
            patientData.CustomPropertiesXml = customPropertiesXml.toString();

            if (!isValid) {
                return;
            };

            if (item.data.patient.id == '' || item.data.patient.id == '(new)') {
                return this.addPatient(patientData);
            }
            else {
                return this.updatePatient(patientData, item);
            };
        },

        addPatient: function (patient) {
            if (patient.PatientId == '(new)') {
                patient.PatientId = '';
            };

            var self = this;
            return request.post(core.serviceURL('Quippe/PatientData/PatientEditor/Add?DataFormat=JSON'), {
                data: patient,
                handleAs: 'json'
            }).then(function(data) {
                if (data.error) {
                    return core.showError(data.error);
                };
                var p = data.patient;
                when(self.loadPatients(), function () {
                    var item = self.lvPatients.getItem(p.id);
                    if (item) {
                        self.lvPatient.setSelectedItem(item);
                    };
                });
	            topic.publish("/qc/PatientListChanged");
            }, function(err) {
                core.showError(err);
            });
        },

        updatePatient: function (patient, item) {
            var self = this;
            return request.post( core.serviceURL('Quippe/PatientData/PatientEditor/Update?DataFormat=JSON'), {
                data: patient,
                handleAs: 'json'
            }).then(function(data) {
                if (data.error) {
                    return core.showError(data.error);
                };
                patient = data.patient;
                if (patient) {
                    item.data = { id: patient.id, text: self.createNameLabel(patient), patient: patient };
                    item.set('caption', item.data.text);

                    topic.publish("/qc/PatientListChanged");
                }
                else if (data.response.message) {
                    core.showError(data.response.message);
                    return false;
                }
                else {
                    core.showError('Error saving patient data');
                    return false;
                };
            }, function(err) {
                core.showError(err);
            });
        },

        onDeleteClicked: function () {
            var item = this.lvPatients.getSelectedItem();
            if (!(item && item.data && item.data.patient)) {
                return;
            };

            var patient = item.data.patient;
            var message = "Are you sure you want to delete the patient ";
            message += patient.id;
            message += " - "
            message += this.createNameLabel(patient);
            message += " and all associated records from the database?";

            var self = this;
            core.confirm({
                message: message,
                yesCallback: function () {
                    request.post(core.serviceURL('Quippe/PatientData/PatientEditor/Remove'), {
                        data: { PatientId: patient.id }
                    }).then(function(data) {
                        if (data.error) {
                            return core.showError(data.error);
                        };
                        self.resetFields();
                        self.lvPatients.clearSelected();
                        self.lvPatients.removeItem(item.data);

                        topic.publish("/qc/PatientListChanged");
                    }, function(err) {
                        core.showError(err)
                    });
                }
            })
        },

        onPatientSelectionChanged: function () {
            var item = this.lvPatients.getSelectedItem();
            if (item && item.data && item.data.patient) {
                this.showPatient(item.data.patient);
                domStyle.set(this.formTable, { display: 'block' });
            }
            else {
                domStyle.set(this.formTable, { display: 'none' });
            };
        },

        showPatient: function (patient) {
            array.forEach(this.fieldNames, function (fieldName) {
                switch (fieldName) {
                    case 'PatientId':
                        if (patient.id == '(new)') {
                            this.cPatientId.set('value', '');
                            this.cPatientId.set('disabled', false);
                            domStyle.set(this.cmdDelete.domNode, { display: 'none' });
                            domStyle.set(this.leaveBlankMessage, { visibility: 'visible' });
                        }
                        else {
                            this.cPatientId.set('value', patient.id);
                            this.cPatientId.set('disabled', true);
                            domStyle.set(this.cmdDelete.domNode, { display: '' });
                            domStyle.set(this.leaveBlankMessage, { visibility: 'hidden' });
                        };
                        break;
                    case 'BirthDate':
                        if (patient.id == '(new)') {
                            this.cBirthDate.set('value', '');
                        }
                        else {
                            this.cBirthDate.set('value', DateUtil.dateFromJSON(patient.birthDate) || '');
                        };
                        break;
                    case 'Sex':
                        if (patient.id == '(new)') {
                            this.cSex.set('value', 'U');
                        }
                        else {
                            this.cSex.set('value', patient.sex || 'U');
                        };
                        break;
                    case 'Template':
                        if (patient.defaultTemplate) {
                            this.cDefaultTemplate.set('value', patient.defaultTemplate);
                        }
                        else {
                            this.cDefaultTemplate.set('value', '');
                        }
                        break;
                    default:
                        this['c' + fieldName].set('value', patient[StringUtil.toCamelLower(fieldName)] || '');
                        break;
                }

            }, this);
        },

        createNameLabel: function (patient) {
            var label = '';
            label += patient.lastName || patient.LastName || '';

            var firstName = patient.firstName || patient.FirstName || '';
            if (firstName) {
                if (label) {
                    label = label + ', ' + firstName;
                }
                else {
                    label = firstName;
                }
            }

            if (!label) {
                label = 'Unknown';
            };

            return label;
        }

    });
});