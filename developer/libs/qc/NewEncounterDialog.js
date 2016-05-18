define([
    "qc/EnumDataStore",
    "qc/FilteringSelect",
    "qc/PatientSearchBox",
    "qc/SettingsEnumStore",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/Dialog",
    "dijit/form/Button",
    "dijit/form/DateTextBox",
    "dijit/form/TextBox",
    "dijit/form/TimeTextBox",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/on",
    "dojo/text!qc/templates/NewEncounterDialog.htm",
    "dojo/topic",
    "qc/_core",
	"dojo/store/DataStore"
], function (EnumDataStore, FilteringSelect, PatientSearchBox, SettingsEnumStore, _WidgetsInTemplateMixin, Dialog, Button, DateTextBox, TextBox, TimeTextBox, declare, lang, domStyle, on, NewEncounterDialogTemplate, topic, core, DataStore) {
    return declare("qc.NewEncounterDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: "New Encounter",

        templateString: NewEncounterDialogTemplate,
        events: [],

        startup: function () {
            if (!this.started) {
                this.events = [
                    on(this.cmdOK, "Click", lang.hitch(this, this.onOKClick)),
                    on(this.cmdCancel, "Click", lang.hitch(this, this.onCancelClick)),
                    on(this.txtPatientSearch, "Change", lang.hitch(this, this.hideError)),
                    on(this.cmbVisitType, "Change", lang.hitch(this, this.hideError)),
                    on(this.txtVisitDate, "Change", lang.hitch(this, this.hideError)),
                    on(this.txtVisitTime, "Change", lang.hitch(this, this.hideError)),
                    on(this.cmbTemplate, "Change", lang.hitch(this, this.hideError))
                ];

                this.cmbVisitType.store = new DataStore({ store: new EnumDataStore("Quippe/TextService/CodedList/EncounterCodes", false, "text") });
                this.cmbVisitType.set("value", "10");

                this.cmbTemplate.store = new SettingsEnumStore("Quippe/ContentLibrary/Search?TypeName=template", false, "text");
                this.cmbTemplate.store.updateNeeded = true;
                this.cmbTemplate.set("value", core.settings.defaultNoteTemplate);

                this.txtPatientSearch.isRequired = true;
                this.txtPatientSearch.startup();

                var now = new Date();
                this.txtVisitDate.set("value", now);
                this.txtVisitDate.set("required", true);

                this.txtVisitTime.set("value", now);
                this.txtVisitTime.set("required", true);

                topic.subscribe('/qc/ContentLibrary/Changed', lang.hitch(this, this.onLibraryChanged));
                this.inherited(arguments);
            }
        },

        onOKClick: function () {
            if (!this.txtPatientSearch.selectedPatientId) {
                return;
            };

            if (!this.cmbVisitType.isValid()) {
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
                patientId: this.txtPatientSearch.selectedPatientId,
                encounter: { encounterTime: eTime, code: this.cmbVisitType.get("value"), description: this.cmbVisitType.get("text") },
                noteTemplate: this.cmbTemplate.get("value")
            };

            topic.publish("/qc/NewEncounter", data);
            this.hide();
        },

        onLibraryChanged: function () {
            this.cmbTemplate.store.updateNeeded = true;
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
        }

    }
    );
});