/**
 * Created by mrcapcom on 4/11/16.
 */

define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "qc/_core",
    "qc/XmlWriter",
    "qc/DateUtil",
    "dojo/request",
    "dojo/Deferred",
    "dojo/DeferredList",
    "dojo/when",
    "dojo/text!BDMS/config.json",
    "qc/PDFGen"
], function (array, declare, event, lang, query, domClass, domConstruct, domStyle, on,  core, XmlWriter, DateUtil, request, Deferred, DeferredList, when, config, PDFGen) {

    if(true) {
        lang.extend(PDFGen, {

            execute: function(noteEditor, settings) {
                if (!noteEditor) {
                    return;
                };

                settings = settings || noteEditor.getPrintSettings() || {};
                var printNode = noteEditor.getPrintable();
                domClass.add(printNode, 'printable');

                //remove old-style PatientBanner
                query('.patientBanner', printNode).forEach(function (node) { node.parentNode.removeChild(node) });

                var form = domConstruct.create('form')
                form.setAttribute('method', 'post');
                form.setAttribute('action', core.serviceURL("Quippe/Printing/PDF"));
                form.setAttribute('target', 'QuippePDFView');
                //form.setAttribute('accept-charset', 'UTF-8');

                var addParm = function (name, value) {
                    var input = domConstruct.create('input')
                    input.setAttribute('type', 'hidden');
                    input.setAttribute('name', name)
                    input.setAttribute('value', value)
                    form.appendChild(input);
                };

                addParm('Title', document.title);
                addParm('Debug', core.settings.printingDebug);
                addParm('NoteHTML', this.resolveHTML(printNode));
                var Title = document.title;
                var Debug = core.settings.printingDebug;
                var NoteHTML = this.resolveHTML(printNode);
                //addParm('PrintData', this.getPrintData(noteEditor.noteViewer ? noteEditor.noteViewer.note : noteEditor.note) || '');
                return when(this.getPrintData(noteEditor.noteViewer ? noteEditor.noteViewer.note : noteEditor.note) || '', function (PrintData) {
                    //console.log('==== Data ====');
                    //console.log(data);
                    addParm('PrintData',PrintData);

                    if (settings) {
                        for (var p in settings) {
                            addParm(p, settings[p]);
                        }
                    };

                    //console.log('==== printNode ====');
                    //console.log(printNode);
                    //console.log('==== Append Form ====');
                    console.log(document.body.appendChild(form));
                    document.body.appendChild(form);
                    //var temp = form.submit();
                    //console.log('==== Result ====');
                    //console.log(temp);

                    request(core.serviceURL("Quippe/Printing/PDF"),{
                        query: { "Title": Title, "Debug": Debug, "NoteHTML": NoteHTML, "PrintData": PrintData },
                        handleAs: "xml",
                        method: 'POST',
                        preventCache: true
                    }).then(function(data) {
                        console.log('==== Result ====');
                        console.log(data);
                    });

                    document.body.removeChild(form);

                    return true;
                });

            },

            resolveHTML: function (targetNode) {
                if (targetNode.nodeName.toLowerCase() == "html") {
                    return targetNode.outerHTML;
                }

                //var baseURL = window.location.href
                var writer = new XmlWriter();
                writer.raw('<!DOCTYPE html>');
                writer.beginElement('html');
                writer.beginElement('head');
                writer.beginElement('base')
                writer.attribute('href', this.getBaseURL());
                writer.endElement();
                writer.beginElement('title');
                writer.text(document.title)
                writer.endElement();
                query('link').forEach(function (link) {
                    writer.beginElement('link');
                    array.forEach(link.attributes, function (a) { writer.attribute(a.name, a.value) });
                    writer.endElement();
                });
                query('style').forEach(function (style) {
                    writer.beginElement('style');
                    //console.log('== Style ==');
                    //console.log(style);
                    array.forEach(style.attributes, function (a) { writer.attribute(a.name, a.value) });
                    writer.raw(style.textContent);
                    writer.endElement();
                });
                writer.endElement();
                writer.beginElement('body');
                array.forEach(document.body.attributes, function (a) {
                    writer.attribute(a.name, a.value);
                });

                writer.raw(targetNode.outerHTML);

                writer.endElement();
                writer.endElement();
                var res = writer.toString();
                return res;
            },

            getPrintData: function (noteWidget) {

                var bu = "01";
                var res = "";
                var config_json = JSON.parse(config);

                var ENDate = "";
                var allergy_text = "";
                var temp_endate = this.getEnDate(config_json.rest_host);
                var temp_allergy = this.getAllergy(config_json.rest_host);
                var list = new DeferredList([temp_endate, temp_allergy]);
                return list.then(function(result) {

                    ENDate = result[0][1][0];
                    allergy_text = result[1][1];

                    var writer = new XmlWriter();
                    writer.beginElement('PrintData');
                    var temp_name = core.Patient.fullName.split(", ");
                    var temp_birthdate = new Date(core.Patient.birthDate);
                    var day = temp_birthdate.getDate();
                    var month = temp_birthdate.getMonth()+1;
                    var year = temp_birthdate.getFullYear();
                    var year2 = temp_birthdate.getFullYear() + 543;
                    if(day<10){
                        day='0'+day;
                    }
                    if(month<10){
                        month='0'+month;
                    }
                    var age = getAge(year,month,day);
                    var new_hn = [core.Patient.id.slice(0, 2), "-", core.Patient.id.slice(2)].join('');
                    var new_hn = [new_hn.slice(0, 5), "-", new_hn.slice(5)].join('');
                    var new_en = [core.Encounter.episodeNumber.slice(0, 3), "-", core.Encounter.episodeNumber.slice(3)].join('');
                    var new_en = [new_en.slice(0, 6), "-", new_en.slice(6)].join('');
                    var temp = {
                        FullName:temp_name[1] + " " + temp_name[0],
                        BirthDate:day + "/" + month + "/" + year + "(" + year2 + ")",
                        SexLabel: core.Patient.sexLabel,
                        //AgeLabel: core.Patient.age.years + "Y " + core.Patient.age.months + "M " + core.Patient.age.days + "D",
                        AgeLabel: age.years + "Y " + age.months + "M " + age.days + "D",
                        HN: new_hn,//core.Patient.id,
                        EN: new_en,//core.Encounter.episodeNumber
                        ENDate: ENDate,
                        Allergy: allergy_text
                    };

                    //console.log('==== Patient ====');
                    writer.writeObject('Patient', temp, true);
                    //console.log('==== Encounter ====');
                    writer.writeObject('Encounter', noteWidget && noteWidget.Encounter ? noteWidget.Encounter : core.Encounter, true);
                    //console.log('==== Provider ====');
                    writer.writeObject('Provider', noteWidget && noteWidget.Provider ? noteWidget.Provider : core.Provider, true);
                    //console.log('==== Print ====');
                    writer.beginElement('Print');
                    //console.log('==== Time ====');
                    writer.attribute('Time', DateUtil.formatISODate(new Date()));
                    writer.endElement();

                    //console.log('==== Document ====');
                    if (noteWidget) {
                        writer.beginElement('Document')
                        noteWidget.writeNoteAttributes(writer, 'template');
                        writer.endElement();
                    };

                    writer.endElement();
                    //console.log('==== writer ====');
                    var res = writer.toString();
                    return res;

                });

            },

            getBaseURL: function () {
                var parts = window.location.pathname.split("/");
                parts.pop();
                var url = window.location.protocol + '//' + window.location.host + parts.join("/") + "/";
                return url;
            },

            getEnDate: function(config){

                var deferred = new Deferred();

                request.get(config + "/visit/get/" + core.Patient.id + "?bu=01").then(function (result_data) {
                    //return request.get((config_json.rest_host + "/visit/get/" + core.Patient.id + "?bu=01"),{handleAs: 'json'}).then(function (result_data) {
                    var json_en = JSON.parse(result_data);
                    for (var l = 0; l < json_en.length; l++) {
                        //console.log(result_data[l]);
                        if (core.Encounter.episodeNumber == json_en[l].PAADM_ADMNo) {
                            var endate = json_en[l].PAADM_AdmDateTime.split(" ");
                            //console.log('=== Func ENDate ===');
                            //console.log(endate);
                            deferred.resolve(endate);
                        }
                    }
                });

                return deferred.promise;
            },

            getAllergy: function(config){

                var deferred = new Deferred();

                request.get(config + "/his/patientallergy/getbyhn/01/" + core.Patient.id).then(function (result_data) {
                    var json_allergy = JSON.parse(result_data);
                    //console.log('=== Func Allergy ===');
                    //console.log(json_allergy);
                    var allergy_text = "";
                    var flag_allergy = false;
                    if(json_allergy.hasOwnProperty('error')){
                        allergy_text += "No Known Allergy";
                    }else if(json_allergy.length > 6){
                        allergy_text += "มีรายการแพ้ยามากกว่า 6 กรุณาดูข้อมูลจาก EMR";
                    }else{
                        for (var l = 0; l < json_allergy.length; l++) {
                            if ((json_allergy[l].ALG_InActive != "Y")){
                                flag_allergy = true;
                                if ((json_allergy[l].PHCGE_Name != null)) {
                                    allergy_text += json_allergy[l].PHCGE_Name.substring(0,12) + ", ";
                                }
                            }
                            if ((json_allergy[l].PAC_Allergy_ALG_Desc != null)) {
                                allergy_text += json_allergy[l].PAC_Allergy_ALG_Desc.substring(0,12) + ", ";
                            }
                        }
                        if(!flag_allergy){
                            allergy_text += "No Known Allergy";
                        }
                    }
                    //console.log('=== Func Allergy ===');
                    //console.log(allergy_text);
                    deferred.resolve(allergy_text);
                });

                return deferred.promise;
            }
        });
    }

    return declare("BDMS.PDFGen", [PDFGen],{

        }
    );

});

function getAge(yearDob,monthDob,dateDob) {
    var now = new Date();
    var today = new Date(now.getYear(), now.getMonth(), now.getDate());

    var yearNow = now.getFullYear();
    var monthNow = now.getMonth();
    var dateNow = now.getDate();

    var age = {};
    var ageString = "";
    var yearString = "";
    var monthString = "";
    var dayString = "";


    yearAge = yearNow - yearDob;

    if (monthNow >= monthDob)
        var monthAge = monthNow - monthDob;
    else {
        yearAge--;
        var monthAge = 12 + monthNow - monthDob;
    }

    if (dateNow >= dateDob)
        var dateAge = dateNow - dateDob;
    else {
        monthAge--;
        var dateAge = 31 + dateNow - dateDob;

        if (monthAge < 0) {
            monthAge = 11;
            yearAge--;
        }
    }

    age = {
        years: yearAge,
        months: monthAge,
        days: dateAge
    };

    return age;
}