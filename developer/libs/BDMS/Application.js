/**
 * Created by bexuser on 4/30/15.
 */
define([
    "dojo/_base/declare",
    "Quippe/Application",
    "BDMS/PatientInfoPanel",
    "BDMS/OpenEncounterDialog",
    "BDMS/NewEncounterDialog2",
    "BDMS/NoteEditor",
    "BDMS/Workspace",
    "BDMS/note/Document",
    "BDMS/PDFGen",
    "dojo/_base/lang",
    "qc/_core",
    "dojo/topic",
    "qc/MenuItem",
    "dijit/Menu",
    "dijit/form/Button",
    "dijit/form/DropDownButton",
    "dojo/text!BDMS/config.json"
], function (declare, QuippeApplication, PatientInfoPanel, OpenEncounterDialog, NewEncounterDialog2, NoteEditor, Workspace, Document, PDFGen, lang, core, topic, MenuItem, Menu, Button, DropDownButton, config) {

    if(true) {
        var config_json = JSON.parse(config);
        //console.log(config_json);
        var original_initToolbar = QuippeApplication.prototype._initToolbar;
        lang.extend(QuippeApplication,
            {
                _initToolbar: function () {
                    original_initToolbar.apply(this, arguments);

                    this.toolbar.removeChild(0);


                    //var appButton = new Button({
                    //    label: core.getI18n("newencounter"),
                    //    iconClass: "document_add",
                    //    showLabel: false,
                    //    onClick: function () {
                    //        topic.publish("/qc/ShowDialog", "newEncounter")
                    //    }
                    //});
                    //this.toolbar.addChild(appButton, 0);

                    //removeChild
                    //getChildren
                    //var appButton = new Button({
                    //    label: core.getI18n("openencounter"),
                    //    iconClass: "folder_document",
                    //    showLabel: false,
                    //    onClick: function () {
                    //        topic.publish("/qc/ShowDialog", "openEncounter")
                    //    }
                    //});
                    //this.toolbar.addChild(appButton, 1);


                    var appMenu = new Menu();
                    appMenu.addChild(new MenuItem({
                        label: core.getI18n("savedraft"),
                        disabled: (core.settings.demoMode ? true : false),
                        showLabel: false,
                        onClick: function () {
                            topic.publish("/qc/SaveEncounter", false)
                        }
                    }));
                    appMenu.addChild(new MenuItem({
                        label: core.getI18n("savefinalnote"),
                        disabled: (core.settings.demoMode ? true : false),
                        showLabel: false,
                        onClick: function () {
                            topic.publish("/qc/SaveEncounter", true)
                        }
                    }));
                    var appButton = new DropDownButton({
                        label: "Save",
                        iconClass: "floppy_disk",
                        showLabel: false,
                        dropDown: appMenu
                    });
                    //this.toolbar.addChild(appButton, 2);
                    this.toolbar.addChild(appButton, 0);

                    appButton = new Button({
                        label: "Create PDF",
                        iconClass: "printer2",
                        showLabel: false,
                        onClick: function () {
                            topic.publish("/qc/CreatePDF")
                        }
                    });
                    //this.toolbar.addChild(appButton, 3);
                    this.toolbar.addChild(appButton, 1);

                    //appButton = new Button({
                    //    label: "Generate Report",
                    //    iconClass: "form_blue",
                    //    showLabel: false,
                    //    onClick: function () {
                    //        console.log(JSON.stringify(core.Encounter));
                    //        //window.open(config_json.report_host+"?documentid="+core.Encounter.id+"&hn="+core.Patient.id);
                    //        //"documentid="+core.Encounter.id+"&hn="+core.Patient.id
                    //        //topic.publish("/qc/CreatePDF")
                    //    }
                    //});
                    //this.toolbar.addChild(appButton, 4);


                    var appMenu = new Menu();
                    //appMenu.addChild(new MenuItem({
                    //    label: core.getI18n("savecontent") + "...",
                    //    iconClass: "",
                    //    disabled: (core.settings.demoMode ? true : false),
                    //    showLabel: false,
                    //    //onClick: function () { topic.publish("/qc/ShowDialog", ["saveContent"]) }
                    //    onClick: lang.hitch(this, this.onSaveContent)
                    //}));
                    //
                    //appMenu.addChild(new MenuItem({
                    //    label: core.getI18n("logoff"),
                    //    iconClass: "",
                    //    showLabel: false,
                    //    onClick: function () {
                    //        topic.publish("/qc/LogOff")
                    //    }
                    //}));

                    appMenu.addChild(new MenuItem({
                        label: 'Quippe Clinical Lens',
                        iconClass: "",
                        showLabel: false,
                        onClick: function () {
                            var patientId = core.Patient.id;
                            if(patientId){
                                window.open('ClinicalLens.htm?patientId=' + core.Patient.id, 'QuippeClinicalLens')
                            }else{
                                window.open('ClinicalLens.htm', 'QuippeClinicalLens')
                            }
                        }
                    }));

                    var appButton = new DropDownButton({
                        label: core.getI18n("applicationmenu"),
                        iconClass: "quippe",
                        showLabel: false,
                        dropDown: appMenu
                    });
                    //this.toolbar.addChild(appButton, 5);
                    this.toolbar.addChild(appButton, 2);


                    //console.log(config.report_host);
                    //console.log(core);
                    //console.log(JSON.stringify(core.Patient));
                    //console.log(JSON.stringify(core.Encounter));
                }
            }
        );
    }

    return declare("BDMS.Application", [QuippeApplication],{

        }
    );

});