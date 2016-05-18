
define([
    "qc/NoteEditor",
    "qc/_core",
    "dojo/_base/lang",
    "dojo/request",
    "dojo/when",
    "dojo/promise/all",
    "dojo/Deferred",
    "dojo/text!BDMS/config.json",
    "dojo/text!BDMS/order_item.json"
], function (NoteEditor,core,lang,request,when,all,Deferred,config,orderitems) {
    if(true){
    var config_json=JSON.parse(config);
    var originalLoadDocumentTemplate = NoteEditor.prototype.loadDocumentTemplate;
    lang.extend(NoteEditor,
        {
            loadDocumentTemplate: function (templateId,settings) {

                var labresultTemplate=function (self,data,children,processControl,deferred) {
                    if (children) {
                        ++processControl.cntProcess;
                        console.log(config_json.rest_host + "/labresult/get/" + settings.patientId + "/" + settings.encounter.episodeNumber);
                        request.get(config_json.rest_host + "/labresult/get/" + settings.patientId + "/" + settings.encounter.episodeNumber //+patientId+"/O01-15-0061912"
                            , {handleAs: "json"}).then(function (labresult_data) {
                                //console.log(JSON.stringify(labresult_data));
                                if (!labresult_data.error) {
                                    for (var i = labresult_data.length - 1; i >= 0; i--)
                                        if (labresult_data[i].hos_testCode_Desc.trim() == "") {
                                            labresult_data.splice(i, 1);
                                        }


                                    children.setAttribute("ShowEmpty", "true");
                                    var j = 0;

                                    var addLabRecord=function(data,children,labresult_data,from,to,tablecount){
                                        var rowcount=to-from;
                                        if(labresult_data.length<to){
                                            rowcount=labresult_data.length-from;
                                        }
                                        var newe = data.createElement("Element");
                                        newe.setAttribute("Type", "qc.note.FindingTable");
                                        newe.setAttribute("Rows", (rowcount+1).toString());
                                        newe.setAttribute("Cols", "9");
                                        newe.setAttribute("StyleClass", "borders");
                                        children.appendChild(newe);

                                        j=0;
                                        newe = data.createElement("TableSettings");
                                        newe.setAttribute("ColStyle", "width:100px;");
                                        newe.setAttribute("ColType", "selector");
                                        newe.setAttribute("RowType", "selector");
                                        children.children[tablecount].appendChild(newe);

                                        j++;
                                        newe = data.createElement("RowSettings");
                                        children.children[tablecount].appendChild(newe);
                                        newe = data.createElement("Row");
                                        newe.setAttribute("Index", "1");
                                        newe.setAttribute("RowType", "header");
                                        children.children[tablecount].children[j].appendChild(newe);

                                        j++;
                                        newe = data.createElement("ColumnSettings");
                                        children.children[tablecount].appendChild(newe);
                                        newe = data.createElement("Column");
                                        newe.setAttribute("Index", "1");
                                        newe.setAttribute("CellStyle", "width:30px;");


                                        children.children[tablecount].children[j].appendChild(newe);
                                        newe = data.createElement("Column");
                                        newe.setAttribute("Index", "2");
                                        newe.setAttribute("CellStyle", "width:60px;");
                                        children.children[tablecount].children[j].appendChild(newe);
                                        newe = data.createElement("Column");
                                        newe.setAttribute("Index", "3");
                                        newe.setAttribute("CellStyle", "width:150px;");
                                        children.children[tablecount].children[j].appendChild(newe);
                                        newe = data.createElement("Column");
                                        newe.setAttribute("Index", "4");
                                        newe.setAttribute("CellStyle", "width:150px;");
                                        children.children[tablecount].children[j].appendChild(newe);
                                        newe = data.createElement("Column");
                                        newe.setAttribute("Index", "5");
                                        newe.setAttribute("CellStyle", "width:150px;");
                                        children.children[tablecount].children[j].appendChild(newe);
                                        newe = data.createElement("Column");
                                        newe.setAttribute("Index", "6");
                                        newe.setAttribute("CellStyle", "width:100px;");
                                        children.children[tablecount].children[j].appendChild(newe);
                                        newe = data.createElement("Column");
                                        newe.setAttribute("Index", "7");
                                        newe.setAttribute("CellStyle", "width:150px;");
                                        children.children[tablecount].children[j].appendChild(newe);
                                        newe = data.createElement("Column");
                                        newe.setAttribute("Index", "8");
                                        newe.setAttribute("ColType", "hidden");
                                        children.children[tablecount].children[j].appendChild(newe);
                                        newe = data.createElement("Column");
                                        newe.setAttribute("Index", "9");
                                        newe.setAttribute("ColType", "hidden");
                                        children.children[tablecount].children[j].appendChild(newe);


                                        j++;
                                        newe = data.createElement("CellSettings");
                                        children.children[tablecount].appendChild(newe);
                                        newe = data.createElement("Cell");
                                        newe.setAttribute("Row", "1");
                                        newe.setAttribute("Col", "1");
                                        newe.setAttribute("RowType", "selector");
                                        children.children[tablecount].children[j].appendChild(newe);

                                        newe = data.createElement("Cell");
                                        newe.setAttribute("Row", "1");
                                        newe.setAttribute("Col", "2");
                                        newe.setAttribute("RowType", "selector");
                                        newe.setAttribute("Value", "Date");
                                        children.children[tablecount].children[j].appendChild(newe);

                                        newe = data.createElement("Cell");
                                        newe.setAttribute("Row", "1");
                                        newe.setAttribute("Col", "3");
                                        newe.setAttribute("RowType", "selector");
                                        newe.setAttribute("Value", "Test Set");
                                        children.children[tablecount].children[j].appendChild(newe);

                                        newe = data.createElement("Cell");
                                        newe.setAttribute("Row", "1");
                                        newe.setAttribute("Col", "4");
                                        newe.setAttribute("RowType", "selector");
                                        newe.setAttribute("Value", "Test Item");
                                        children.children[tablecount].children[j].appendChild(newe);

                                        newe = data.createElement("Cell");
                                        newe.setAttribute("Row", "1");
                                        newe.setAttribute("Col", "5");
                                        newe.setAttribute("RowType", "selector");
                                        newe.setAttribute("Value", "Value");
                                        children.children[tablecount].children[j].appendChild(newe);

                                        newe = data.createElement("Cell");
                                        newe.setAttribute("Row", "1");
                                        newe.setAttribute("Col", "6");
                                        newe.setAttribute("RowType", "selector");
                                        newe.setAttribute("Value", "Unit");
                                        children.children[tablecount].children[j].appendChild(newe);

                                        newe = data.createElement("Cell");
                                        newe.setAttribute("Row", "1");
                                        newe.setAttribute("Col", "7");
                                        newe.setAttribute("RowType", "selector");
                                        newe.setAttribute("Value", "Normal Range");
                                        children.children[tablecount].children[j].appendChild(newe);

                                        newe = data.createElement("Cell");
                                        newe.setAttribute("Row", "1");
                                        newe.setAttribute("Col", "8");
                                        newe.setAttribute("RowType", "selector");
                                        newe.setAttribute("Value", "Test Set Code");
                                        children.children[tablecount].children[j].appendChild(newe);

                                        newe = data.createElement("Cell");
                                        newe.setAttribute("Row", "1");
                                        newe.setAttribute("Col", "9");
                                        newe.setAttribute("RowType", "selector");
                                        newe.setAttribute("Value", "Test Item Code");
                                        children.children[tablecount].children[j].appendChild(newe);


                                        for (var k = from; ((k < labresult_data.length)&&(k < to)); k++) {
                                            newe = data.createElement("Cell");
                                            newe.setAttribute("Row", ((k-from) + 2) + "");
                                            newe.setAttribute("Col", "1");
                                            newe.setAttribute("FindingRef", "LabResults" + k);
                                            newe.setAttribute("EntryType", "SingleCheck");
                                            newe.setAttribute("FindingProperty", "result");
                                            newe.setAttribute("CheckStyle", "check");
                                            //newe.setAttribute("Value", "A");
                                            //newe.setAttribute("HideLabel", "true");
                                            newe.setAttribute("Label", "");
                                            newe.setAttribute("CheckedValue", "A");
                                            children.children[tablecount].children[j].appendChild(newe);

                                            newe = data.createElement("Cell");
                                            newe.setAttribute("Row", ((k-from) + 2) + "");
                                            newe.setAttribute("Col", "2");
                                            var dateAuth = new Date(labresult_data[k].dateAuth);
                                            newe.setAttribute("Value", (dateAuth.getDate() + "/" + (dateAuth.getMonth() + 1 ) + "/" + dateAuth.getFullYear() ));
                                            children.children[tablecount].children[j].appendChild(newe);

                                            newe = data.createElement("Cell");
                                            newe.setAttribute("Row", ((k-from) + 2) + "");
                                            newe.setAttribute("Col", "3");
                                            newe.setAttribute("Value", labresult_data[k].hos_testSet_Desc);
                                            children.children[tablecount].children[j].appendChild(newe);

                                            newe = data.createElement("Cell");
                                            newe.setAttribute("Row", ((k-from) + 2) + "");
                                            newe.setAttribute("Col", "4");
                                            newe.setAttribute("Value", labresult_data[k].hos_testCode_Desc);
                                            children.children[tablecount].children[j].appendChild(newe);

                                            newe = data.createElement("Cell");
                                            newe.setAttribute("Row", ((k-from) + 2) + "");
                                            newe.setAttribute("Col", "5");
                                            newe.setAttribute("Value", labresult_data[k].value);
                                            children.children[tablecount].children[j].appendChild(newe);

                                            newe = data.createElement("Cell");
                                            newe.setAttribute("Row", ((k-from) + 2) + "");
                                            newe.setAttribute("Col", "6");
                                            newe.setAttribute("Value", (labresult_data[k].hos_units||"").replace('',"^"));
                                            children.children[tablecount].children[j].appendChild(newe);

                                            newe = data.createElement("Cell");
                                            newe.setAttribute("Row", ((k-from) + 2) + "");
                                            newe.setAttribute("Col", "7");
                                            newe.setAttribute("Value", labresult_data[k].normal||"");
                                            children.children[tablecount].children[j].appendChild(newe);

                                            newe = data.createElement("Cell");
                                            newe.setAttribute("Row", ((k-from) + 2) + "");
                                            newe.setAttribute("Col", "8");
                                            newe.setAttribute("Value", labresult_data[k].hos_testSet_Code);
                                            children.children[tablecount].children[j].appendChild(newe);

                                            newe = data.createElement("Cell");
                                            newe.setAttribute("Row", ((k-from) + 2) + "");
                                            newe.setAttribute("Col", "9");
                                            newe.setAttribute("Value", labresult_data[k].hos_testCode_Code);
                                            children.children[tablecount].children[j].appendChild(newe);


                                        }
                                        j++;
                                        var  newe = data.createElement("Findings");
                                        children.children[tablecount].appendChild(newe);
                                        for (var k = from; ((k < labresult_data.length)&&(k < to)); k++) {
                                            newe = data.createElement("Finding");
                                            newe.setAttribute("Name", "LabResults" + k);
                                            //newe.setAttribute("Result", "A");
                                            //newe.setAttribute("EntryId", "Q" + (q++));

                                            children.children[tablecount].children[j].appendChild(newe);
                                            //console.log("create"+k);
                                        }
                                    }

                                    var rowcount=50;
                                    var from=0;
                                    var to=from+rowcount;
                                    var tablecount=0;
                                    while(labresult_data.length>from){

                                    addLabRecord(data,children,labresult_data,from,to,tablecount);

                                         tablecount++;
                                        from+=rowcount;
                                        to=from+rowcount;
                                    }

                                }
                                if ((--processControl.cntProcess) == 0) {
                                    //console.log("D"+processControl.cntProcess);
                                    deferred.resolve(core.checkXmlResult(data) ? self.loadXml(data) : null);
                                }
                            });

                    }
                };

                var orderitemsTemplate = function (self,data,children) {

                    var deferred = new Deferred();

                    if (children) {
                        ++processControl.cntProcess;
                        request.get(config_json.rest_host + "/his/patientorderitem/getbyen/01/" + settings.encounter.episodeNumber.replace(" ", "")
                            , {handleAs: "json"}).then(function (order_result) {
                                //console.log('==== Order Items JSON ====');
                                //console.log(JSON.parse(orderitems));
                                //
                                //console.log('==== Order Items ====');
                                //console.log(order_result);

                                var order_items = JSON.parse(orderitems);

                                //console.log('=== EntryComponents ===');
                                //console.log(order_data);
                                var index = 0;
                                for (var i = 0; i < order_result.length; i++) {
                                    if (((order_result[i].OEC_OrderCategory_ORCAT_Desc == "Medicine") ||
                                        (order_result[i].OEC_OrderCategory_ORCAT_Desc == "Nutrition") ||
                                        (order_result[i].OEC_OrderCategory_ORCAT_Desc == "อาหารตามสั่ง")) &&
                                        (order_result[i].OEC_OrderStatus_OSTAT_Desc != "D/C (Discontinued)")&&
                                        (order_result[i].CT_CareProvAuthorise_CTPCP_Code == userinfo[0].doctor_code)) {

                                        for (var j = 0; j < order_items.length; j++) {
                                            if ((order_items[j].ItemCode == order_result[i].ARC_ItmMast_ARCIM_Code)&&
                                                (order_items[j].MEDCIN_ID != "#N/A")) {

                                                //console.log('=== Order JSON ===');
                                                //console.log(order_items[j]);

                                                var order_text = order_items[j].ItemDesc + " ";
                                                //order_text += order_result[i].ARC_ItmMast_ARCIM_Desc + " ";
                                                order_text += order_result[i].PHC_Instruc_PHCIN_Desc2 + " ";
                                                order_text += order_result[i].OEORI_DoseQty + " ";
                                                order_text += order_result[i].CT_UOM_CTUOM_Code + " ";
                                                order_text += order_result[i].PHC_Freq_PHCFR_Code;
                                                order_text += " #= ";
                                                order_text += order_result[i].OEORI_PhQtyOrd;

                                                var order_note = order_result[i].PHC_Instruc_PHCIN_Desc2 + " ";
                                                //order_note += order_result[i].PHC_Instruc_PHCIN_Desc2 + " ";
                                                order_note += order_result[i].OEORI_DoseQty + " ";
                                                order_note += order_result[i].CT_UOM_CTUOM_Code + " ";
                                                order_note += order_result[i].PHC_Freq_PHCFR_Code;
                                                order_note += " #= ";
                                                order_note += order_result[i].OEORI_PhQtyOrd;


                                                var newe = data.createElement("Finding");
                                                //newe.appendChild(order_data);

                                                //console.log('=== Block Finding ===');
                                                //console.log(newe);

                                                //children.appendChild(newe);
                                                newe.setAttribute("Name", "OrderItems" + i);
                                                newe.setAttribute("MedcinId", order_items[j].MEDCIN_ID);
                                                //newe.setAttribute("MedcinId", i);
                                                newe.setAttribute("Result", "A");
                                                newe.setAttribute("Text", order_text);
                                                //newe.setAttribute("Text", "finding"+i);
                                                newe.setAttribute("OverrideTranscription","true");
                                                newe.setAttribute("Note", order_note);
                                                newe.setAttribute("ResultSequence","P2");

                                                var order_data = data.createElement("EntryComponents");
                                                //order_data.children[index].appendChild(temp);

                                                //newe.appendChild(order_data);

                                                children.appendChild(newe);
                                                //console.log('=== Newe ===');
                                                //console.log(children);
                                                //newe.setAttribute("ResultSequence","P2");
                                                //newe.appendChild(order_data);

                                                children.children[index].appendChild(order_data);
                                                //console.log('=== order data ===');
                                                //console.log(children);

                                                var temp = data.createElement("Result");
                                                temp.setAttribute("EntryType", "singleCheck");
                                                temp.setAttribute("StyleClass", "check");
                                                temp.setAttribute("Visible", "-1");

                                                children.children[index].children[0].appendChild(temp);


                                                //newe.appendChild(order_data);
                                                //var temp = data.createElement("Result");
                                                //temp.setAttribute("EntryType", "singleCheck");
                                                //temp.setAttribute("StyleClass", "check");
                                                //temp.setAttribute("Visible", "-1");
                                                //children.children[index].children[0].appendChild(temp);
                                                index++;


                                            }
                                        }
                                    }
                                }
                                if ((--processControl.cntProcess) == 0) {
                                    //console.log("D"+processControl.cntProcess);
                                    deferred.resolve(core.checkXmlResult(data) ? self.loadXml(data) : null);
                                }
                            });
                    }
                };

                var processControl={ cntProcess : 1};

                var deferred = new Deferred();

                var id = templateId || core.settings.defaultNoteTemplate || "";
                var self = this;
                request(core.serviceURL("Quippe/NoteBuilder/DocumentTemplate"),{
                    query: { "id": id, "Culture": core.settings.culture, "PatientId": (core.Patient ? core.Patient.id : ''), "PrePopulate": true },
                    handleAs: "xml",
                    preventCache: true
                }).then(function(data) {

                    var episodeExist=false;
                    var doctorCodeExist=false;
                    var userIDExist=false;
                    var userGivenExist=false;
                    var userFamilyExist=false;
                    var doctorNameExist=false;
                    var medicalLicenseExist=false;

                    function extractResultText(children,target){
                        if(children.length) {

                            for (var c = 0; c < children.length; c++) {
                                if (children[c].getAttribute) {
                                    if (children[c].getAttribute("Name") == target)
                                        return children[c];
                                    else {
                                        var e = extractResultText(children[c].children, target);
                                        if (e!=null)
                                        {
                                            return e;
                                        }

                                    }
                                }
                            }
                        }
                    }

                    labresultTemplate(self,data,extractResultText(data.documentElement.children,"TestResults"),processControl,deferred);

                    console.log(config_json.rest_host + "/his/patientorderitem/getbyen/01/" + settings.encounter.episodeNumber.replace(" ", ""));

                    orderitemsTemplate(self,data,extractResultText(data.documentElement.children, "HMS_OrderItems"),processControl);

                    //console.log(data.documentElement.children);
                    for(var i=data.documentElement.children.length-1;i>=0;i--)
                    {
                        //console.log("start "+i);
                        var childrenName=data.documentElement.children[i].getAttribute("Name")+"";
                        //console.log(childrenName);
                        switch(childrenName){
                            case "TestResults":
                                var section_row=i;
                                //labresultTemplate(self,data,section_row,processControl,deferred);
                                break;
                            case "EpisodeNumber":
                                data.documentElement.removeChild(data.documentElement.children[i]);
                                //if((settings.encounter.episodeNumber||'')!=''){
                                //    data.documentElement.children[i].Value=settings.encounter.episodeNumber;
                                //    //alert(settings.encounter.episodeNumber)
                                //    episodeExist=true;
                                //}
                                break;
                            case "DoctorCode":
                                data.documentElement.removeChild(data.documentElement.children[i]);
                                //if((userinfo[0].doctor_code||'')!='') {
                                //    data.documentElement.children[i].Value = userinfo[0].doctor_code;
                                //    doctorCodeExist = true;
                                //}
                                break;
                            case "DoctorName":
                                data.documentElement.removeChild(data.documentElement.children[i]);
                                //if((userinfo[0].doctor_name||'')!='') {
                                //    data.documentElement.children[i].Value = (((userinfo[0].doctor_name) && (userinfo[0].doctor_name.indexOf('/') == -1)) ? userinfo[0].doctor_name : (userinfo[0].doctor_name.split('/')[0]));
                                //    doctorNameExist = true;
                                //}
                                break;
                            case "MedicalLicenseNo":
                                data.documentElement.removeChild(data.documentElement.children[i]);
                                //if((userinfo[0].medical_license_no||'')!='') {
                                //    data.documentElement.children[i].Value = userinfo[0].medical_license_no;
                                //    medicalLicenseExist = true;
                                //}
                                break;
                            case "UserID":
                                data.documentElement.removeChild(data.documentElement.children[i]);
                                //if((userinfo[0].user||'')!='') {
                                //    data.documentElement.children[i].Value = userinfo[0].user;
                                //    userIDExist = true;
                                //}
                                break;
                            case "UserGiven":
                                data.documentElement.removeChild(data.documentElement.children[i]);
                                //if((userinfo[0].given||'')!='') {
                                //    data.documentElement.children[i].Value = userinfo[0].given;
                                //    userGivenExist = true;
                                //}
                                break;
                            case "UserFamily":
                                data.documentElement.removeChild(data.documentElement.children[i]);
                                //if((userinfo[0].family||'')!='') {
                                //    data.documentElement.children[i].Value = userinfo[0].family;
                                //    userFamilyExist = true;
                                //}
                                break;
                            case "HMSLocationid":
                                data.documentElement.removeChild(data.documentElement.children[i]);
                                //if((userinfo[0].family||'')!='') {
                                //    data.documentElement.children[i].Value = userinfo[0].family;
                                //    userFamilyExist = true;
                                //}
                                break;
                            default :
                                break;
                        }
                    }

                    //console.log(data.documentElement);
                    //console.log(settings);
                    if((settings.encounter.episodeNumber||'')!=''){
                        var newe=data.createElement("Finding");
                        newe.setAttribute("Name","EpisodeNumber");
                        newe.setAttribute("Result","A");
                        newe.setAttribute("Value",settings.encounter.episodeNumber);
                        newe.setAttribute("Text","finding");
                        newe.setAttribute("StyleClass","hidden");
                        newe.setAttribute("PostSep",";");
                        data.documentElement.appendChild(newe);
                    }

                    if((userinfo[0].doctor_code||'')!=''){
                        var newe=data.createElement("Finding");
                        newe.setAttribute("Name","DoctorCode");
                        newe.setAttribute("Result","A");
                        newe.setAttribute("Value",userinfo[0].doctor_code);
                        newe.setAttribute("Text","finding");
                        newe.setAttribute("StyleClass","hidden");
                        newe.setAttribute("PostSep",";");
                        data.documentElement.appendChild(newe);
                        console.log("Create DoctorCode");

                    }

                    if((userinfo[0].doctor_name||'')!=''){
                        var newe=data.createElement("Finding");
                        newe.setAttribute("Name","DoctorName");
                        newe.setAttribute("Result","A");
                        newe.setAttribute("Value",(((userinfo[0].doctor_name)&&(userinfo[0].doctor_name.indexOf('/')==-1))?userinfo[0].doctor_name:(userinfo[0].doctor_name.split('/')[0])));
                        newe.setAttribute("Text","finding");
                        newe.setAttribute("StyleClass","hidden");
                        newe.setAttribute("PostSep",";");
                        data.documentElement.appendChild(newe);
                        console.log("Create DoctorName");
                    }

                    if((userinfo[0].medical_license_no||'')!=''){
                        var newe=data.createElement("Finding");
                        newe.setAttribute("Name","MedicalLicenseNo");
                        newe.setAttribute("Result","A");
                        newe.setAttribute("Value",userinfo[0].medical_license_no);
                        newe.setAttribute("Text","finding");
                        newe.setAttribute("StyleClass","hidden");
                        newe.setAttribute("PostSep",";");
                        data.documentElement.appendChild(newe);
                        console.log("Create MedicalLicenseNo");
                    }

                    if((userinfo[0].user||'')!=''){
                        var newe=data.createElement("Finding");
                        newe.setAttribute("Name","UserID");
                        newe.setAttribute("Result","A");
                        newe.setAttribute("Value",userinfo[0].user);
                        newe.setAttribute("Text","finding");
                        newe.setAttribute("StyleClass","hidden");
                        newe.setAttribute("PostSep",";");
                        data.documentElement.appendChild(newe);
                        console.log("Create UserID");

                    }
                    if((userinfo[0].given||'')!=''){
                        var newe=data.createElement("Finding");
                        newe.setAttribute("Name","UserGiven");
                        newe.setAttribute("Result","A");
                        newe.setAttribute("Value",userinfo[0].given);
                        newe.setAttribute("Text","finding");
                        newe.setAttribute("StyleClass","hidden");
                        newe.setAttribute("PostSep",";");
                        data.documentElement.appendChild(newe);
                        console.log("Create UserGiven");

                    }
                    if((userinfo[0].family||'')!=''){
                        var newe=data.createElement("Finding");
                        newe.setAttribute("Name","UserFamily");
                        newe.setAttribute("Result","A");
                        newe.setAttribute("Value",userinfo[0].family);
                        newe.setAttribute("Text","finding");
                        newe.setAttribute("StyleClass","hidden");
                        newe.setAttribute("PostSep",";");
                        data.documentElement.appendChild(newe);
                        console.log("Create UserFamily");

                    }
                    if((settings.locationid||'')!=''){
                        var newe=data.createElement("Finding");
                        newe.setAttribute("Name","HMSLocationid");
                        newe.setAttribute("Result","A");
                        newe.setAttribute("Value",settings.locationid);
                        newe.setAttribute("Text","finding");
                        newe.setAttribute("StyleClass","hidden");
                        newe.setAttribute("PostSep",";");
                        data.documentElement.appendChild(newe);
                        console.log("Create Location Id");
                    }

                    data.documentElement.setAttribute("TemplateId",settings.noteTemplate);
                    data.documentElement.setAttribute("TemplateName",settings.noteTemplateName);

                    if((--processControl.cntProcess)==0){
                        deferred.resolve(core.checkXmlResult(data) ? self.loadXml(data) : null);

                    }

                },function(err) {
                    core.showError(err)
                });

                return deferred.promise;
            }
        }
    );
}});




