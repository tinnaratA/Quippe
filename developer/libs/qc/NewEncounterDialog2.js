define([
    "qc/Dialog",
    "qc/EnumDataStore",
    "qc/_EnumManager",
    "qc/FilteringSelect",
    "qc/PatientSearchBox",
    "qc/SettingsEnumStore",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/form/DateTextBox",
    "dijit/form/Select",
    "dijit/form/TextBox",
    "dijit/form/TimeTextBox",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/text!qc/templates/NewEncounterDialog2.htm",
    "dojo/topic",
    "qc/_core",
    "dojo/request",
    "qc/DateUtil",
	"dojo/when",
    "qc/ResizableDialogMixin"
], function (Dialog, EnumDataStore, EnumManager, FilteringSelect, PatientSearchBox, SettingsEnumStore, _WidgetsInTemplateMixin, Button, DateTextBox, Select, TextBox, TimeTextBox, array, declare, event, lang, aspect, domClass, domConstruct, domGeometry, domStyle, on, query, NewEncounterDialog2Template, topic, core, request, DateUtil, when, ResizableDialogMixin) {
    return declare("qc.NewEncounterDialog2", [Dialog, _WidgetsInTemplateMixin, ResizableDialogMixin], {
        title: "New encounter",
            
        templateString: NewEncounterDialog2Template,
        events: [],
        userHasSelectedTemplate: false,
        suppressTemplateChangedEvent: false,
    
        startup: function () {
            if (!this.started) {
                core.htmlI18n(this, "nePatient");
                core.htmlI18n(this, "neEncounterTime");
                core.htmlI18n(this, "neTemplate");
                this.cmdOK.setAttribute("label", core.getI18n("cmdOK"));
                this.cmdCancel.setAttribute("label", core.getI18n("cmdCancel"));
    
                this.set("title", core.getI18n("newencounter"));
    
                this.events = [
                    on(this.cmdOK, "Click", lang.hitch(this, this.onOKClick)),
                    on(this.cmdCancel, "Click", lang.hitch(this, this.onCancelClick)),
                    on(this.tblPatients, "click", lang.hitch(this, this.onResultClick)),
                    on(this.tblPatients, "dblclick", lang.hitch(this, this.onResultDoubleClick))
                ];
    
                query('input', this.domNode).forEach(function (input) { on(input, "focus", event.stop) });
    
                core.setSelectable(this.tblPatients, false);
    
                this.cmbTemplate.store = new SettingsEnumStore("Quippe/ContentLibrary/Search?TypeName=template", false, "text");
                this.cmbTemplate.store.updateNeeded = true;

                this.suppressTemplateChangedEvent = true;
                this.cmbTemplate.setAttribute("value", core.settings.defaultNoteTemplate);
    
                var now = new Date();
                this.txtVisitDate.setAttribute("value", now);
                this.txtVisitDate.setAttribute("required", true);
                this.txtVisitDate.set('constraints', { formatLength:'user' });
    
                this.txtVisitTime.setAttribute("value", now);
                this.txtVisitTime.setAttribute("required", true);
                this.txtVisitTime.set('constraints', { formatLength: 'user' });
                this.txtVisitTime.set('maxHeight', 250);

                topic.subscribe('/qc/ContentLibrary/Changed', lang.hitch(this, this.onLibraryChanged));
                topic.subscribe('/qc/SettingsChanged', lang.hitch(this, this.onSettingsChanged));
	            topic.subscribe('/qc/PatientListChanged', lang.hitch(this, this.loadPatients));

	            this.loadPatients();

	            this.inherited(arguments);

	            this.resizer.minWidth = 450;
	            var existingOnDown = this.resizer.onDown;

                this.resizer.onDown = lang.hitch(this.resizer, function(evt) {
                    existingOnDown.apply(this, arguments);

                    if (!this.minHeight) {
                        this.minHeight = this.posOwner.h - 2;
                    }
                });

                this.resizer._sizeChangedFromHandle = lang.hitch(this, function (w, h) {
                    domStyle.set(this.contentArea, 'max-height', '10000px');
                    domStyle.set(this.patientTablePanel, 'max-height', '10000px');
                    domStyle.set(this.patientTablePanel, 'height', (h - 193) + 'px');
                });
            }
        },
    
        loadPatients: function () {
            var self = this;
            var table = this.tblPatients;
            request(core.serviceURL('Quippe/PatientData/Patients'), {
                query: { "Search": '', "MaxResults": core.settings.demoNewEncounterDialogMaxPatients || 20, "Culture": core.settings.culture, "DataFormat": "JSON" },
                handleAs: 'json',
				preventCache: true
            }).then(function (data) {
                self.patients = data.patients;

                var count = 0;
	            domConstruct.empty(table);
                array.forEach(data.patients, lang.hitch(this, function (item, i) {
                    var htm = '<tr class="' + ((count % 2 == 0) ? 'even' : 'odd') + '"' + (count == 0 ? ' style="border-top:0px"' : count == data.patients.length - 1 ? ' style="border-bottom:1px"' : '') + '>';
                    htm += ('<td>' + item.id + '</td>');
                    htm += ('<td>' + item.lastName + '</td>');
                    htm += ('<td>' + item.firstName + '</td>');
                    htm += ('<td>' + self.formatBirthDate(item.birthDate) + '</td>');
                    htm += ('<td>' + self.formatSex(item.sex) + '</td>');
                    htm += '</tr>';

                    var row = domConstruct.place(htm, table);

                    if (this.selectedPatientId && this.selectedPatientId == item.id) {
                        domClass.add(row, 'selected');

                        if (item.defaultTemplate) {
                            this.suppressTemplateChangedEvent = true;
                            this.cmbTemplate.setAttribute("value", item.defaultTemplate);
                        }
                    }

                    count += 1;
                }));
                core.setSelectable(table, false);
            }, function(err) {
                core.showError(err);
            });
        },
    
        onOKClick: function () {
            if (!this.selectedPatientId) {
                return;
            };
    
            if (!this.txtVisitDate.isValid()) {
                return;
            };
    
            if (!this.txtVisitTime.isValid()) {
                return;
            };
    
            if (!this.cmbTemplate.isValid()) {
                return;
            };
    
    
            var d = this.txtVisitDate.get("value");
            var t = this.txtVisitTime.get("value");
            var eTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes());
    
            var data = {
                patientId: this.selectedPatientId,
                encounter: { encounterTime: eTime, code: '10', description: 'Office Visit' },
                noteTemplate: this.cmbTemplate.get('value')
            };
    
            topic.publish("/qc/NewEncounter", data);
            this.hide();
        },
    
        selectItem: function (row) {
            query("*", this.tblPatients).removeClass("selected");
            domClass.add(row, "selected");
            this.selectedPatientId = row.children[0].innerHTML;

            var selectedPatient = array.filter(this.patients, lang.hitch(this, function(patient) {
                return patient.id == this.selectedPatientId;
            }))[0];

            if (selectedPatient.defaultTemplate && !this.userHasSelectedTemplate) {
                this.suppressTemplateChangedEvent = true;
                this.cmbTemplate.setAttribute("value", selectedPatient.defaultTemplate);
            }
        },
    
        onResultClick: function (evt) {
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
                this.selectItem(row);
            }
        },
    
        onResultDoubleClick: function (evt) {
            this.onResultClick(evt);
            this.onOKClick();
        },
    
        formatSex: function (value) {
            return EnumManager.getTextSynch('sex', value) || value;
        },
    
        formatBirthDate: function (value) {
            return DateUtil.formatJSONDate(value)
        },
    
        onLibraryChanged: function () {
            this.cmbTemplate.store.updateNeeded = true;
        },
    
        onSettingsChanged: function (settings) {
            if (settings.defaultNoteTemplate && !this.userHasSelectedTemplate) {
                if (this.selectedPatientId) {
                    var selectedPatient = array.filter(this.patients, lang.hitch(this, function(patient) {
                        return patient.id == this.selectedPatientId;
                    }))[0];

                    this.suppressTemplateChangedEvent = true;
                    this.cmbTemplate.setAttribute("value", selectedPatient.defaultTemplate ? selectedPatient.defaultTemplate : core.settings.defaultNoteTemplate);
                }

                else {
                    this.suppressTemplateChangedEvent = true;
                    this.cmbTemplate.setAttribute("value", core.settings.defaultNoteTemplate);
                }
            };
        },
    
        onCancelClick: function () {
            this.hide();
        },
    
        showError: function (message) {
            this.errorMessage.innerHTML = message;
            domStyle.set(this.errorMessage, "visibility", "visible");
        },
    
        hideError: function (message) {
            domStyle.set(this.errorMessage, "visibility", "hidden");
        },
    
        show: function () {
            var d = new Date();
            this.txtVisitDate.setAttribute('value', d);
            this.txtVisitTime.setAttribute('value', d);

            this.inherited(arguments);
        },

        onTemplateChanged: function() {
            if (!this.suppressTemplateChangedEvent) {
                this.userHasSelectedTemplate = true;
            }

            this.suppressTemplateChangedEvent = false;
        },

        setData: function(data) {
            if (data.selectedPatientId) {
                this.selectedPatientId = data.selectedPatientId;
            }
        }
    }
    );
});