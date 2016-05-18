define(["qc/OpenEncounterDialog",
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
    "dojo/text!BDMS/templates/OpenEncounterDialog.htm",
    "dojo/topic",
    "qc/_core",
    "qc/DateUtil",
    "dojo/request",
    "dojo/text!BDMS/config.json"
], function (OpenEncounterDialog,FilteringSelect, PatientSearchBox, _WidgetsInTemplateMixin, Dialog, Button, DateTextBox, TextBox, TimeTextBox, array, declare, lang, aspect, domStyle, on, OpenEncounterDialogTemplate, topic, core, DateUtil, request,config) {
    if(true) {
        //var originalopenEncounterDialog = OpenEncounterDialog.prototype.onPatientSelectionChanged;
        var config_json = JSON.parse(config);
        lang.extend(OpenEncounterDialog,
            {
                templateString: OpenEncounterDialogTemplate
                ,
                onPatientSelectionChanged: function () {
                    //alert("A");
                    var lv = this.lstEncounters;
                    lv.clear();
                    var patientId = this.txtPatientSearch.selectedPatientId;
                    if (patientId) {
                        request((config_json.rest_host + "/bcds/clinicaldocument/getbymrn/01/" + patientId), {
                            query: {PatientId: patientId, DataFormat: "JSON"},
                            preventCache: true,
                            handleAs: "json"
                        }).then(function (data) {
                            //data=JSON.parse(data);
                            if (data.error) {
                            } else {
                                //for (var i = data.length - 1; i >= 0; i--) {
                                for (var i = 0; i<data.length; i++) {
                                    var item = {};
                                    item.id = data[i]._id;
                                    item.text = data[i].EpisodeNumber + " (" + datetostr(new Date(data[i].EncounterTime)) + ")";
                                    //item.text = e.id+" ("+DateUtil.formatJSONDate(e.time, { selector: "datetime", formatLength: "short" });
                                    item.icon = 'document';
                                    item.encounterId = data[i]._id;
                                    item.encounterTime = new Date(data[i].EncounterTime);
                                    lv.addItem(item);
                                }
                            }

                        }, function (err) {
                            core.showError(err);
                        });
                    }
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

function PadDigits(input, totalDigits) {
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