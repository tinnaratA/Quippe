/**
 * Created by bexuser on 4/30/15.
 */
define([
    "qc/PatientInfoPanel",
    "dojo/_base/lang",
    "dojo/text!BDMS/templates/PatientInfoPanel.htm",
    "qc/_core"
], function(PatientInfoPanel,lang,template,core){
    if(true){
    var originalRenderPatientInfo = PatientInfoPanel.prototype.renderPatientInfo;
    lang.extend(PatientInfoPanel,
        {
            templateString : template
            ,

            renderPatientInfo : function(){
                originalRenderPatientInfo.apply(this, arguments);
                this.patientNationalID.innerHTML=core.Patient.id;
            }
        }
    );
}});

