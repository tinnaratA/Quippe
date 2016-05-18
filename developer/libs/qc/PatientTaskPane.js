define([
    "dojo/_base/declare",
    "qc/TaskPane",
    "qc/_core",
    "qc/_EnumManager",
    "qc/PatientInfoPanel",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/topic",
    "dojo/_base/lang"
], function (declare, TaskPane, core, EnumManager, PatientInfoPanel, domClass, domConstruct, topic, lang) {
    return declare("qc.PatientTaskPane", [TaskPane], {

        name: 'PatientInfo',
        title: 'Patient',

        patientInfoPanel: null,

        startup: function () {
            if (!this._started) {
                if (!this.patientInfoPanel) {
                    this.set("title", core.getI18n("patient"));

                    domClass.add(this.domNode, "qcTaskPane");
                    domClass.add(this.domNode, "ic16");
                    domClass.add(this.domNode, "qcddTarget");
                    this.set("open", false);
                    this.patientInfoPanel = new PatientInfoPanel();
                    this.patientInfoPanel.startup();
                    domConstruct.place(this.patientInfoPanel.domNode, this.containerNode);
                }
                topic.subscribe("/qc/PatientChanged", lang.hitch(this, this.onPatientChanged));
                this.inherited(arguments);
            };
        },

        onPatientChanged: function () {
            this.set("open", ((core.Patient && core.Patient.id) ? true : false));
        },

        getDropAction: function (source, evt) {
            if (!core.settings.features.patientSummary) {
                return null;
            }

            switch (source.type || 'unknown') {
                case 'finding':
                case 'term':
                    return 'add';
                default:
                    return null;
            }
        },

        doDrop: function (source, evt) {
            if (!core.settings.features.patientSummary) {
                return null;
            }

            var category = "0";
            if (source.prefix && source.prefix == 'AL') {
                category = "1";
            }
            else if (source.termType && source.termType == 7) {
                category = "2";
            }
            else {
                category = "0";
            }

            this.patientInfoPanel.addActiveItem(category, source);
        }
    })
});