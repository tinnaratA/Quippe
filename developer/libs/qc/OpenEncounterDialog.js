define([
    "qc/FilteringSelect",
    "qc/PatientSearchBox",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/Dialog",
    "dijit/form/Button",
    "dijit/form/DateTextBox",
    "dijit/form/TextBox",
    "dijit/form/TimeTextBox",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom-style",
    "dojo/on",
    "dojo/text!qc/templates/OpenEncounterDialog.htm",
    "dojo/topic",
    "qc/_core",
    "qc/DateUtil",
    "dojo/request"
], function (FilteringSelect, PatientSearchBox, _WidgetsInTemplateMixin, Dialog, Button, DateTextBox, TextBox, TimeTextBox, array, declare, lang, aspect, domStyle, on, OpenEncounterDialogTemplate, topic, core, DateUtil, request) {
    return declare("qc.OpenEncounterDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: "Open Encounter",

        templateString: OpenEncounterDialogTemplate,
        events: [],

        startup: function () {
            if (!this.started) {
                core.htmlI18n(this, "oePatient");
                core.htmlI18n(this, "oeEncounters");
                this.cmdOK.set("label", core.getI18n("cmdOK"));
                this.cmdCancel.set("label", core.getI18n("cmdCancel"));
                this.set("title", core.getI18n("openencounter"));

                this.events = [
                    on(this.cmdOK, "Click", lang.hitch(this, this.onOKClick)),
                    on(this.cmdCancel, "Click", lang.hitch(this, this.onCancelClick)),
                    on(this.txtPatientSearch, "Change", lang.hitch(this, this.hideError)),
                    aspect.after(this.txtPatientSearch, "onSelectionChanged", lang.hitch(this, this.onPatientSelectionChanged), true),
                    aspect.after(this.lstEncounters, "onItemDoubleClick", lang.hitch(this, this.onEncounterDoubleClick), true)
                ];

                this.txtPatientSearch.isRequired = true;
                this.txtPatientSearch.startup();

                this.inherited(arguments);
            }
        },

        show: function () {
            if (core.Patient && core.Patient.id && core.Patient.lastName) {
                this.txtPatientSearch.txtSearch.set('value', core.Patient.lastName + ', ' + core.Patient.firstName);
                this.txtPatientSearch.selectedPatientId = core.Patient.id;
                this.onPatientSelectionChanged();
            };
            this.inherited(arguments);
        },

        onPatientSelectionChanged: function () {
            var lv = this.lstEncounters;
            lv.clear();
            var patientId = this.txtPatientSearch.selectedPatientId;
            if (patientId) {
                request(core.serviceURL("Quippe/PatientData/PatientEncounters"),{
                    query: { PatientId: patientId, DataFormat: "JSON" },
                    preventCache: true,
                    handleAs: "json"
                }).then(function(data){
                    if (data && data.encounters && data.encounters.encounter) {
                        array.forEach(core.forceArray(data.encounters.encounter), function (e) {
                            var item = {};
                            item.id = e.id;
                            item.text = DateUtil.formatJSONDate(e.time, { selector: "datetime", formatLength: "user" });
                            item.icon = 'document';
                            item.encounterId = e.id;
                            item.encounterTime = DateUtil.dateFromJSON(e.time);
                            lv.addItem(item);
                        });
                    }
                }, function(err){
                    core.showError(err);
                });
            }
        },

        onOKClick: function () {
            this.txtPatientSearch.hideResults();

            if (!this.txtPatientSearch.selectedPatientId) {
                return;
            };

            if (!this.lstEncounters.getSelectedItem()) {
                return;
            };
            var enc = this.lstEncounters.getSelectedItem().data;

            var data = {
                patientId: this.txtPatientSearch.selectedPatientId,
                encounter: { id: enc.id, encounterTime: enc.encounterTime }
            };

            topic.publish("/qc/OpenEncounter", data);
            this.hide();
        },

        onEncounterDoubleClick: function (item) {
            this.lstEncounters.setSelectedItem(item);
            this.onOKClick();
        },

        onCancelClick: function () {
            this.txtPatientSearch.hideResults();
            this.hide();
        },

        showError: function (message) {
            this.errorMessage.innerHTML = message;
            domStyle.set(this.errorMessage, "visibility", "visible");
        },

        hideError: function (message) {
            domStyle.set(this.errorMessage, "visibility", "hidden");
        }

    }
    );
});