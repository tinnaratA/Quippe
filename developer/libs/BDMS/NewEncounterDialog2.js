/**
 * Created by bexuser on 4/30/15.
 */
define(["qc/NewEncounterDialog2",
    "dojo/_base/lang",
    "dojo/text!BDMS/templates/NewEncounterDialog2.htm",
    "qc/_core",
    "dojo/on",
    "dojo/aspect",
    "dojo/topic",
    "dojo/request",
    "dojo/_base/array",
    "qc/DateUtil",
    "dojo/text!BDMS/config.json"
], function(NewEncounterDialog2,lang,template,core,on,aspect,topic,request,array,DateUtil,config){
    if(true) {
        var config_json = JSON.parse(config);
        var originalstartup = NewEncounterDialog2.prototype.startup;
        lang.extend(NewEncounterDialog2,
            {
                templateString: template
                ,

                startup: function () {
                    originalstartup.apply(this, arguments);
                    //alert(this.events.length);
                    if (!this.started) {
                        this.events.push(on(this.txtPatientSearch, "Change", lang.hitch(this, this.hideError)));
                        this.events.push(aspect.after(this.txtPatientSearch, "onSelectionChanged", lang.hitch(this, this.onPatientSelectionChanged), true));
                        this.events.push(aspect.after(this.lstEncounters, "onItemDoubleClick", lang.hitch(this, this.onEncounterDoubleClick), true));

                        this.txtPatientSearch.isRequired = true;
                    }
                },

                onPatientSelectionChanged: function () {
                    var lv = this.lstEncounters;
                    lv.clear();
                    var patientId = this.txtPatientSearch.selectedPatientId;
                    if (patientId) {
                        request((config_json.rest_host + "/visit/get/" + patientId), {
                            query: {PatientId: patientId, DataFormat: "JSON"},
                            preventCache: true,
                            handleAs: "json"
                        }).then(function (data) {
                            //alert(JSON.stringify(data));
                            for (var i = data.length - 1; i >= 0; i--) {
                                var item = {};
                                item.id = data[i].PAADM_ADMNo.toString();
                                var dt = dtStrToDate(data[i].PAADM_AdmDateTime);
                                //alert((dt.getMonth()+1)+"/"+dt.getDate()+"/"+dt.getYear()+" "+dt.getHours()+":"+dt.getMinutes());
                                item.text = data[i].PAADM_ADMNo.toString() + " (" + datetostr(dt) + ")";
                                item.icon = 'document';
                                item.encounterId = data[i].PAADM_ADMNo.toString();
                                item.encounterTime = dtStrToDate(data[i].PAADM_AdmDateTime);
                                lv.addItem(item);
                            }

                        }, function (err) {
                            core.showError(err);
                        });


                    }
                },

                onOKClick: function () {
                    if (!this.txtPatientSearch.selectedPatientId) {
                        return;
                    }
                    ;

                    if (!this.txtVisitDate.isValid()) {
                        return;
                    }
                    ;

                    if (!this.txtVisitTime.isValid()) {
                        return;
                    }
                    ;

                    if (!this.cmbTemplate.isValid()) {
                        return;
                    }
                    ;


                    var d = this.txtVisitDate.get("value");
                    var t = this.txtVisitTime.get("value");
                    var eTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes());

                    var data = {
                        patientId: this.txtPatientSearch.selectedPatientId,
                        encounter: {
                            encounterTime: eTime, code: '10',
                            EpisodeNumber: this.lstEncounters.getSelectedItem().data.id,
                            description: 'Office Visit'
                        },
                        noteTemplate: this.cmbTemplate.get('value'),
                        noteTemplateName: this.cmbTemplate.item.text
                    };


                    //this.lstEncounters.getSelectedItem().data.id

                    topic.publish("/qc/NewEncounter", data);
                    this.hide();
                },

                onEncounterDoubleClick: function (item) {
                    this.lstEncounters.setSelectedItem(item);

                    this.txtVisitDate.setAttribute("value", this.lstEncounters.getSelectedItem().data.encounterTime);
                    this.txtVisitTime.setAttribute("value", this.lstEncounters.getSelectedItem().data.encounterTime);
                }
            }
        );
    }
});


function dtStrToDate(d_in){
    if(d_in.indexOf("-")>-1){
        var d1=d_in.split(' ');
        var d2=d1[0].split('-');
        if(d1.length==1)
            return new Date(parseInt(d2[0]),parseInt(d2[1])-1,parseInt(d2[2]),0,0,0);
        else{
            var d3=d1[1].split(':');
            var d4=d3[2].split('.');
            return new Date(parseInt(d2[0]),parseInt(d2[1])-1,parseInt(d2[2]),parseInt(d3[0]),parseInt(d3[1]),parseInt(d4[0]));
        }
    }else if(d_in.indexOf("/")>-1){
        var d1=d_in.split(' ');
        var d2=d1[0].split('/');
        if(d1.length==1)
            return new Date(parseInt(d2[2]),parseInt(d2[1])-1,parseInt(d2[0]),0,0,0);
        else{
            var d3=d1[1].split(':');
            var d4=d3[2].split('.');
            return new Date(parseInt(d2[2]),parseInt(d2[1])-1,parseInt(d2[0]),parseInt(d3[0]),parseInt(d3[1]),parseInt(d4[0]));
        }
    }
}

function datetostr(d_in){
    return (PadDigits(d_in.getDate(),2)+"/"+PadDigits(d_in.getMonth()+1,2)+"/"+PadDigits(d_in.getFullYear(),4)+" "+PadDigits(d_in.getHours(),2)+":"+PadDigits(d_in.getMinutes(),2))
}


function PadDigits(input, totalDigits)
{
    if(input==null)
        return input;
    input=input.toString();
    var result = input;
    if(isNumber(result)){
        if (totalDigits > input.length)
        {
            for (i=0; i < (totalDigits - input.length); i++)
            {
                result = '0' + result;
            }
        }
    }
    return result;
}
function isNumber(str) {
    for (var i = 0; i < str.length; i++)
        if (!((str.charCodeAt(i) >= 48) && (str.charCodeAt(i) <= 57)))
            return false;
    return true;
}