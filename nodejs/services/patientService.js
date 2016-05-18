var config = require(__dirname+'/config/config.json');

var q = require('q');
var quippe = require('@medicomp/quippe');
var personalSqliteService = require('./personalSqliteService');
var util = require('util');
var xml2js = require('xml2js');
var customDataObject = require('./customDataObject');
var MedcinClient = require('@medicomp/medcin-client').Client;
var medcinEnums = require('@medicomp/medcin-client').Enums;
var moment = require('moment');

var Client = require('node-rest-client').Client;
var client = new Client();
var mongoose = require("mongoose");
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var patients = mongoose.model('patients',{
    _id: String,
    patient : {
        "id" : [
            {
                "anonymous" : Boolean,
                "activeStatus" : Boolean,
                "bu" : String,
                "key" : String,
                "use" : String
            }
        ],
        "name" : [
            {
                "language" : String,
                "family" : String,
                "given" : String,
                "prefix" : String,
                "use" : String
            }
        ],
        "birthDate" : Number,
        "text" : String,
        "gender" : String,
        "nationality" : String,
        "communicationLanguage" : String,
        "death" : Boolean,
        "createDateTime" : Number,
        "updateDateTime" : Number
    },
    cleaned_patient: {
        "id" : [
            {
                "anonymous" : Boolean,
                "activeStatus" : Boolean,
                "bu" : String,
                "key" : String,
                "use" : String
            }
        ],
        "name" : [
            {
                "language" : String,
                "family" : String,
                "given" : String,
                "prefix" : String,
                "use" : String
            }
        ],
        "birthDate" : Number,
        "birthDay" : Number,
        "birthMonth" : Number,
        "birthYear" : Number
    },
    lastUpdateFlag: String,
    seqid: Number
});

function patientService(username) {
    console.log("patientService");
    personalSqliteService.apply(this, [username, 'PatientData.dat', 'SamplePatientData.dat']);

    this.schemaUpdateScripts = [
        "alter table PatientSummary	add State			integer;"
        + "\nalter table PatientSummary add EffectiveDate text;"
        + "\nalter table PatientSummary add EndDate text;"
        + "\nalter table PatientSummary add SummaryGroupId text;"
        + "\nalter table PatientSummary add PrescriptionId integer;"
        + "\nalter table Records add PrescriptionId integer;"
        + "\nalter table Records add TimingId integer;"
        + "\ncreate table TimingComponents"
        + "\n("
        + "\n    TimingId		integer		not null,"
        + "\n	Sequence		integer		not null,"
        + "\n	Sequencing 		integer		not null,"
        + "\n	Occurrence		integer		not null,"
        + "\n	Occurrence2		integer		not null,"
        + "\n	Interval		decimal		not null,"
        + "\n	Interval2		decimal		not null,"
        + "\n	IntervalUnit	integer		not null,"
        + "\n	Repeat			integer		not null,"
        + "\n	Repeat2			integer		not null,"
        + "\n	Duration		decimal		not null,"
        + "\n	Duration2		decimal		not null,"
        + "\n	DurationUnit	integer		not null,"
        + "\n	StartDate		text		not null,"
        + "\n	EndDate			text		not null,"
        + "\n	StartTime		text		not null,"
        + "\n	EndTime			text		not null,"
        + "\n	TimeOfDay integer not null,"
        + "\n	Priority integer not null,"
        + "\n	Note text not null,"
        + "\n	ComponentText text not null,"
        + "\n	SourceText text not null,"
        + "\n	AsNeeded integer not null,"
        + "\n	constraint pkTimingComponents primary key(TimingId, Sequence)"
        + "\n);"
        + "\ncreate table Prescriptions"
        + "\n("
        + "\nPrescriptionId	integer		not null,"
        + "\nEffectiveDate	text		not null,"
        + "\nAmount			decimal		not null,"
        + "\nBrand			text		not null,"
        + "\nDays			integer		not null,"
        + "\nForm			text		not null,"
        + "\nFormPackage		text		not null,"
        + "\nGeneric			text		not null,"
        + "\nNDC				text		not null,"
        + "\nNote			text		not null,"
        + "\nRefills			integer		not null,"
        + "\nRxCUI			text		not null,"
        + "\nStrength		decimal		not null,"
        + "\nStrengthUnit	text		not null,"
        + "\nconstraint pkPrescriptions primary key (PrescriptionId)"
        + "\n);"
        + "\ncreate table PrescriptionSIGs"
        + "\n("
        + "\nPrescriptionId		integer		not null,"
        + "\nSequence			integer		not null,"
        + "\nQuantity			decimal		not null,"
        + "\nUnit				text		not null,"
        + "\nRoute				text		not null,"
        + "\nSite				text		not null,"
        + "\nSequencing 			integer		not null,"
        + "\nOccurrence			integer		not null,"
        + "\nOccurrence2			integer		not null,"
        + "\nInterval			decimal		not null,"
        + "\nInterval2			decimal		not null,"
        + "\nIntervalUnit		integer		not null,"
        + "\nRepeat				integer		not null,"
        + "\nRepeat2				integer		not null,"
        + "\nDuration			decimal		not null,"
        + "\nDuration2			decimal		not null,"
        + "\nDurationUnit		integer		not null,"
        + "\nStartDate			text		not null,"
        + "\nEndDate				text		not null,"
        + "\nStartTime			text		not null,"
        + "\nEndTime				text		not null,"
        + "\nTimeOfDay			integer		not null,"
        + "\nPriority			integer		not null,"
        + "\nTimingNote			text		not null,"
        + "\nTimingComponentText	text		not null,"
        + "\nTimingSourceText	text		not null,"
        + "\nAsNeeded			integer		not null,"
        + "\nconstraint pkPrescriptionSIGs primary key (PrescriptionId,Sequence)"
        + "\n);"
        + "\ncreate table RecordCodes"
        + "\n("
        + "\nRecordId		integer		not null,"
        + "\nSequence		integer		not null,"
        + "\nParentSequence	integer		not null,"
        + "\nVocab			text		not null,"
        + "\nCode			text		not null,"
        + "\nDescription		text		not null,"
        + "\nVersion			text		not null,"
        + "\nAutoMapped		integer		not null,"
        + "\nExpression		text		not null,"
        + "\nTermType		text		not null,"
        + "\nRelationship	text		not null,"
        + "\nGroupId			text		not null,"
        + "\nPriority		integer		not null,"
        + "\nconstraint pkRecordCodes primary key (RecordId,Sequence)"
        + "\n);"
        + "\ncreate index ixRecordCodes1 on RecordCodes(ParentSequence);",
        "create table PatientProperties"
        + "\n("
        + "\n   PatientId		text		not null,"
        + "\n	PropertyName	text		not null,"
        + "\n	PropertyValue	text		null,"
        + "\n	constraint pkPatientProperties primary key (PatientId, PropertyName)"
        + "\n);"
    ];
};

util.inherits(patientService, personalSqliteService);

patientService.prototype.GetSummary = function(data) {
    console.log("GetSummary");
    return this.databaseAll("select * from PatientSummary where PatientId=$patientId order by CategoryId, Sequence", {
        $patientId: data.PatientId
    }, function (rows) {
        var summaryItems = [];
        
        for (var i = 0; i < rows.length; i++) {
            summaryItems.push({
                CategoryId: rows[i].CategoryId,
                Sequence: rows[i].Sequence,
                MedcinId: rows[i].MedcinId,
                Prefix: rows[i].Prefix,
                Notation: rows[i].Note,
                Modifier: null,
                ResultCode: null,
                Status: null,
                Value: null,
                Unit: null,
                Onset: null,
                Duration: null,
                Episode: null
            });
        }
        
        return summaryItems;
    });
};

//patientService.prototype.NumEncounters = function (data) {
//    var sql = "select count(*) as rowCount";
//    sql += "  from Encounters e";
//    sql += "    inner join Records r on e.EncounterId = r.EncounterId";
//    sql += "  where e.PatientId = $patientId";
//    sql += "    and r.MedcinId = $medcinId";
//    sql += "    and r.Prefix = $prefix";
//
//    var parameters = {
//        $patientId: data.PatientId,
//        $medcinId: data.MedcinId,
//        $prefix: data.Prefix
//    };
//
//    if (data.StartDate.getFullYear() != 0) {
//        sql += " and e.EncounterTime < $startDate";
//        parameters.$startDate = this.getDateString(data.StartDate);
//    }
//
//    if (data.LookbackLimit.getFullYear() != 0) {
//        sql += " and e.EncounterTime >= $limit";
//        parameters.$limit = this.getDateString(data.LookbackLimit);
//    }
//
//    return this.databaseGet(sql, parameters, function (row) {
//        return row.rowCount;
//    });
//};

patientService.prototype.NumEncounters = function (data) {
    console.log("NumEncounters");

    var promise = q.defer();
    var self = this;

    var db = mongoose.createConnection('mongodb://'+config.db_host+'/BEXBCDS');

    db.on('error', function(err) {
        promise.reject(err);
    });
    db.once('open', function(callback){
        var encounter=db.model('clinicaldocuments',{
            id : String,
            xml : String,
            PatientId : String,
            ProviderId : String,
            EncounterTime : String,
            BaseDate : Date,
            Code : String,
            Description : String,
            finding : [{
                EntryId : String,
                ProviderId : String,
                EncounterId : String,
                Specifier : String,
                TimeRecorded : Date,
                ChartFlag : Number,
                RangeScale : Number,
                RangeNormalLow : Number,
                RangeNormalHigh : Number,
                MedcinId  : Number,
                Prefix  : String,
                Modifier  : String,
                ResultCode  : String,
                Status  : String,
                Value  : String,
                Unit  : String,
                Notation  : String,
                Onset  : String,
                Duration  : String,
                Episode  : String
            }]
        });

        encounter.find({ "PatientId" : data.PatientId
            , "finding" : { $elemMatch : { MedcinId : data.MedcinId , Prefix : data.Prefix }}
        }, { "finding" : 1 })
            .exec(function (err, data) {
                if(err){
                    console.log("mongoose error find");
                    db.close();
                    promise.reject(err);
                }
                else{
                    promise.resolve(data.length);
                }
            });
    });
    return promise.promise;

};

//patientService.prototype.GetHistory = function(data) {
//    var self = this;
//
//    var sql = "select e.EncounterId, e.EncounterTime, r.RecordId, r.MedcinId, r.Prefix, r.Result, r.Value, r.Unit ";
//    sql += "  from Encounters e";
//    sql += "    inner join Records r on e.EncounterId = r.EncounterId";
//    sql += " where e.PatientId = $patientId";
//
//    var parameters = {
//        $patientId: data.PatientId,
//        $medcinId: data.MedcinId,
//        $prefix: data.Prefix
//    };
//
//    if (data.StartDate.getFullYear() != 0) {
//        sql += " and e.EncounterTime < $startDate";
//        parameters.$startDate = this.getDateString(data.StartDate);
//    }
//
//    if (data.LookbackLimit.getFullYear() != 0) {
//        sql += " and e.EncounterTime >= $limit";
//        parameters.$limit = this.getDateString(data.LookbackLimit);
//    }
//
//    sql += "    and r.MedcinId = $medcinId";
//    sql += "    and r.Prefix = $prefix";
//    sql += " order by e.EncounterTime desc ";
//
//    if (data.MaxRecords > 0) {
//        sql += " limit " + data.MaxRecords;
//    }
//
//    return this.databaseAll(sql, parameters, function (rows) {
//        var returnData = [];
//
//        for (var i = 0; i < rows.length; i++) {
//            returnData.push({
//                PatientId: data.PatientId,
//                EncounterId: rows[i].EncounterId.toString(),
//                RecordId: rows[i].RecordId.toString(),
//                EncounterTime: self.getDateFromString(rows[i].EncounterTime),
//                MedcinId: rows[i].MedcinId,
//                Prefix: rows[i].Prefix,
//                Result: rows[i].Result,
//                Value: rows[i].Value,
//                Unit: rows[i].Unit
//            });
//        }
//
//        return returnData;
//    });
//};

patientService.prototype.GetHistory = function (data) {
    console.log("GetHistory");

    var promise = q.defer();
    var self = this;

    var db = mongoose.createConnection('mongodb://'+config.db_host+'/BEXBCDS');

    db.on('error', function (err) {
        promise.reject(err);
    });
    db.once('open', function (callback) {
            var encounter = db.model('clinicaldocuments', {
                id: String,
                xml: String,
                PatientId: String,
                ProviderId: String,
                EncounterTime: String,
                BaseDate: Date,
                Code: String,
                Description: String,
                finding: [{
                    EntryId: String,
                    ProviderId: String,
                    EncounterId: String,
                    Specifier: String,
                    TimeRecorded: Date,
                    ChartFlag: Number,
                    RangeScale: Number,
                    RangeNormalLow: Number,
                    RangeNormalHigh: Number,
                    MedcinId: Number,
                    Prefix: String,
                    Modifier: String,
                    ResultCode: String,
                    Status: String,
                    Value: String,
                    Unit: String,
                    Notation: String,
                    Onset: String,
                    Duration: String,
                    Episode: String
                }]
            });

            encounter.find({
                "PatientId": data.PatientId
                , "finding": {$elemMatch: {MedcinId: data.MedcinId, Prefix: data.Prefix}}
            }).sort({BaseDate : -1})
                .exec(function (err, findresultdata) {
                    if (err) {
                        db.close();
                        promise.reject(err);
                    }
                    else {
                        var resultData = [];
                        for (var i = 0; i < findresultdata.length; i++) {
                            for (var j = 0; j < findresultdata[i].finding.length; j++) {
                                if ((findresultdata[i].finding[j].MedcinId == data.MedcinId)
                                    && (findresultdata[i].finding[j].Prefix == data.Prefix)) {
                                    resultData.push(
                                        {
                                            PatientId: findresultdata[i].PatientId,
                                            EncounterId: findresultdata[i]._id.toString(),
                                            RecordId: 0,
                                            EncounterTime: findresultdata[i].EncounterTime,
                                            MedcinId: findresultdata[i].finding[j].MedcinId,
                                            Prefix: findresultdata[i].finding[j].Prefix,
                                            Result: findresultdata[i].finding[j].ResultCode,
                                            Value: findresultdata[i].finding[j].Value,
                                            Unit: findresultdata[i].finding[j].Unit
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            );

            promise.resolve(data.length);
        }
    );
    return promise.promise;
};

//patientService.prototype.GetPatient = function (data) {
//    var self = this;
//
//    return this.databaseGet("select * from Patients where PatientId=$patientId", {
//        $patientId: data.id
//    }, function (row) {
//        if (!row) {
//            return null;
//        }
//
//        return new customDataObject({
//            id: row.PatientId,
//            LastName: row.LastName,
//            FirstName: row.FirstName,
//            Sex: row.Sex,
//            BirthDate: self.getDateString(row.BirthDate),
//            Race: row.Race,
//            Religion: row.Religion,
//            Ethnicity: row.Ethnicity,
//            MaritalStatus: row.MaritalStatus
//        });
//    }).then(function(patient) {
//        if (!patient) {
//            return patient;
//        }
//
//        return self.databaseAll("select * from PatientProperties where PatientId=$patientId", {
//            $patientId: data.id
//        }, function(rows) {
//            if (!rows || rows.length == 0) {
//                return patient;
//            }
//
//            for (var i = 0; i < rows.length; i++) {
//                patient._CustomData[rows[i].PropertyName] = rows[i].PropertyValue;
//            }
//
//            return patient;
//        });
//    });
//};

patientService.prototype.GetPatient = function (data) {
    console.log("GetPatient");

    var promise = q.defer();
    var self=this;

    console.log(config.rest_host+"/his/patient/getbyhn/01/"+data.id);
    client.get(config.rest_host+"/his/patient/getbyhn/01/"+data.id,
        function(data,response){
            try{
                data=JSON.parse(data);
                if(data.error){
                    promise.resolve(null);
                }else{
                    var returnData = [];

                    for (var i = 0; i < 1; i++) {
                        var mrn="";
                        for(var j=0;j< data[i].id.length;j++){
                            if(data[i].id[j].use=="MRN"){
                                mrn=data[i].id[j].key;
                            }
                        }
                        promise.resolve({
                            id: mrn,
                            LastName: data[i].name[0].family,
                            FirstName: data[i].name[0].given,
                            Sex: (data[i].gender=="Male"?"M":"F"),
                            BirthDate: self.getDateString(new Date(data[i].birthDate)),
                            Race: "U",
                            Religion: "U",
                            Ethnicity: "U",
                            MaritalStatus: "U"
                        });
                    }

                }
            }catch(err)
            {
                promise.resolve(null);
            }
        }
    );
    return promise.promise;
};

//patientService.prototype.GetEncounterNoteType = function (data) {
//    return this.databaseGet("select DocumentType from Documents where EncounterId=$encounterId", {
//        $encounterId: data.EncounterId
//    }, function (row) {
//        if (row) {
//            switch (row.DocumentType) {
//                case 2:
//                    return 'application/pdf';
//
//                case 1:
//                    return 'application/vnd.medicomp.quippe.note+xml';
//            }
//        }
//
//        return 'text/html';
//    });
//};

patientService.prototype.GetEncounterNoteType = function (data) {
    console.log("GetEncounterNoteType");
    return 'application/vnd.medicomp.quippe.note+xml';
};

//patientService.prototype.GetEncounter = function (data) {
//    var self = this;
//
//    return this.databaseGet("select * from Encounters where EncounterId=$encounterId", {
//        $encounterId: data.id
//    }, function(row) {
//        if (!row) {
//            return null;
//        }
//
//        return {
//            id: row.EncounterId.toString(),
//            EncounterTime: self.getDateFromString(row.EncounterTime),
//            BaseDate: self.getDateFromString(row.EncounterTime),
//            PatientId: row.PatientId,
//            ProviderId: row.ProviderId.toString(),
//            Code: null,
//            Description: null
//        };
//    });
//}

patientService.prototype.GetEncounter = function (data) {
    console.log("GetEncounter");

    var promise = q.defer();
    var self=this;

    client.get(config.rest_host+"/bcds/clinicaldocument/getbyid/01/"+data.id+"?sort=-1",
        function(data,response){
            try{
                data=JSON.parse(data);
                if(data.error){
                    promise.resolve(null);
                }else{

                    var returnData = [];
                    for (var i = 0; i < 1; i++) {
                        promise.resolve({
                            id : data[i]._id.toString(),
                            EncounterTime  : self.getDateString(new Date(data[i].EncounterTime)),
                            BaseDate  : self.getDateString(new Date(data[i].EncounterTime)),
                            PatientId  : data[i].PatientId,
                            ProviderId  : data[i].ProviderId,
                            Code  : null,
                            Description  : null
                        });
                    }
                }
            }catch(err)
            {
                promise.resolve(null);
            }
        });

    return promise.promise;
};

//patientService.prototype.GetEncounterNote = function (data) {
//    var self = this;
//
//    return this.GetEncounter({
//        id: data.EncounterId
//    }).then(function(encounter) {
//        if (!encounter) {
//            return null;
//        }
//
//        return self.GetEncounterNoteType(data).then(function(noteType) {
//            if (noteType == 'application/vnd.medicomp.quippe.note+xml') {
//                return self.databaseGet("select Data from Documents where EncounterId=$encounterId", {
//                    $encounterId: data.EncounterId
//                }, function(row) {
//                    return row.Data;
//                });
//            }
//
//            else if (noteType == 'application/pdf') {
//                return self.databaseGet("select DocumentId from Documents where EncounterId=$encounterId", {
//                    $encounterId: data.EncounterId
//                }, function(row) {
//                    return row.DocumentId;
//                }).then(function(documentId) {
//                    return self.databaseGet("select Data from Documents where DocumentId=$documentId", {
//                        $documentId: documentId
//                    }, function (row) {
//                        return row.Data;
//                    });
//                });
//            }
//
//            else {
//                return self.GetPatient({
//                    id: encounter.PatientId
//                }).then(function (patient) {
//                    var age = moment(patient.BirthDate).diff(encounter.EncounterTime, 'minutes');
//                    var fullName = patient.LastName + ", " + patient.FirstName;
//                    var encounterTime = moment(encounter.EncounterTime).format('YYYYMMDDhhmmss');
//                    var client = new MedcinClient();
//
//                    if (quippe.config.medcinServerHost) {
//                        client.configuration.host = quippe.config.medcinServerHost;
//                    }
//
//                    if (quippe.config.medcinServerPort) {
//                        client.configuration.port = quippe.config.medcinServerPort;
//                    }
//
//                    var connection = client.getConnection();
//
//                    return connection.connectionPromise.then(function() {
//                        return connection.setPatient(age, patient.Sex, patient.Ethnicity, patient.Religion, patient.Race, fullName, patient.BirthDate);
//                    }).then(function() {
//                        return self.GetChartEntries({
//                            EncounterId: data.EncounterId
//                        });
//                    }).then(function(chartEntries) {
//                        var currentId = -1;
//                        var promise = null;
//
//                        var createAddNarrate2Callback = function(entry, id) {
//                            return function() {
//                                return connection.addNarrate2(id, entry.MedcinId, encounterTime, entry.Prefix, entry.Modifier, entry.ResultCode, entry.Status, entry.Onset, entry.Duration, 0, 0, 0, 0);
//                            }
//                        };
//
//                        var createAddNarrate2Ex = function(entry, id) {
//                            return function() {
//                                return connection.addNarrate2Ex(-1 * id, entry.Episode, entry.Notation, '', entry.Value, entry.Unit, 0, 0, 0, '');
//                            }
//                        }
//
//                        for (var i = 0; i < chartEntries.length; i++) {
//                            if (!promise) {
//                                promise = createAddNarrate2Callback(chartEntries[i], currentId)();
//                            }
//
//                            else {
//                                promise = promise.then(createAddNarrate2Callback(chartEntries[i], currentId));
//                            }
//
//                            promise = promise.then(createAddNarrate2Ex(chartEntries[i], currentId));
//                            currentId -= 1;
//                        }
//
//                        return promise;
//                    }).then(function() {
//                        return connection.setNarrateOptions(medcinEnums.NarrateOptions.medOptionNone | medcinEnums.NarrateOptions.medNoTableRanges | medcinEnums.NarrateOptions.medNoDoctorHeadings);
//                    }).then(function () {
//                        return connection.setNarrativeContext(medcinEnums.NarrativeContext.medContextChart);
//                    }).then(function () {
//                        return connection.setNarrativeFormat(medcinEnums.NarrativeFormats.medFormatNarrative);
//                    }).then(function () {
//                        return connection.setNarrativeOutput(medcinEnums.NarrativeOutput.medOutputHtml);
//                    }).then(function() {
//                        return connection.narrate();
//                    }).then(function (results) {
//                        results = results.replace('<HEAD><TITLE>', '<HEAD><meta http-equiv="Content-Type" Content="text/html;charset=utf-8" ><TITLE>');
//                        connection.medcinEnd();
//
//                        return results;
//                    });
//                });
//            }
//        });
//    });
//};

patientService.prototype.GetEncounterNote = function (data) {
    console.log("GetEncounterNote");

    var promise = q.defer();
    var self=this;

    client.get(config.rest_host+"/bcds/clinicaldocument/getbyid/01/"+data.EncounterId+"?sort=-1",
        function(data,response){
            try{
                data=JSON.parse(data);
                if(data.error){
                    promise.resolve(null);
                }else{
                    var returnData = [];
                    for (var i = 0; i < 1; i++) {
                        promise.resolve(data[i].xml);
                    }
                }
            }catch(err)
            {
                promise.resolve(null);
            }

        }
    );

    return promise.promise;

};

//patientService.prototype.GetHistoryEntries = function (data) {
//    var sql = "select e.EncounterTime, r.*, ";
//    sql += "p.PrescriptionId as RxPrescriptionId, p.EffectiveDate as RxEffectiveDate, p.Amount, p.Brand, p.Days, p.Form, p.FormPackage, p.Generic, p.NDC, p.Note as RxNote, p.Refills, p.RxCUI, p.Strength, p.StrengthUnit, ";
//    sql += "s.Sequence as SigSequence, s.Quantity, s.Unit as SigUnit, s.Route, s.Site, s.Sequencing, s.Occurrence, s.Occurrence2, s.Interval, s.Interval2, s.IntervalUnit, s.Repeat, s.Repeat2, s.Duration as SigDuration, s.Duration2, s.DurationUnit, s.StartDate as SigStartDate, s.EndDate as SigEndDate, s.StartTime, s.EndTime, s.TimeOfDay, s.Priority, s.TimingNote, s.TimingComponentText, s.TimingSourceText, s.AsNeeded ";
//    sql += "from Encounters as e ";
//    sql += "inner join Records r on e.EncounterId = r.EncounterId ";
//    sql += "left join Prescriptions as p on p.PrescriptionId=r.PrescriptionId ";
//    sql += "left join PrescriptionSIGs as s on s.PrescriptionId=p.PrescriptionId ";
//    sql += " where e.PatientId = $patientId";
//
//    var parameters = {
//        $patientId: data.PatientId
//    };
//
//    if (data.StartDate.getFullYear() != 0) {
//        sql += " and e.EncounterTime < $startDate";
//        parameters.$startDate = this.getDateString(data.StartDate);
//    }
//
//    if (data.LookbackLimit.getFullYear() != 0) {
//        sql += " and e.EncounterTime >= $limit";
//        parameters.$limit = this.getDateString(data.LookbackLimit);
//    }
//
//    sql += " order by r.RecordId, s.Sequence ";
//
//    return this.databaseAll(sql, parameters, function (rows) {
//        if (rows.length == 0) {
//            return null;
//        }
//
//        var returnData = [];
//
//        for (var i = 0; i < rows.length; i++) {
//            returnData.push({
//                EncounterId: rows[i].EncounterId.toString(),
//                EntryId: rows[i].RecordId.toString(),
//                ProviderId: rows[i].ProviderId.toString(),
//                MedcinId: rows[i].MedcinId,
//                Prefix: rows[i].Prefix,
//                Modifier: rows[i].Modifier,
//                ResultCode: rows[i].Result,
//                Status: rows[i].Status,
//                Onset: rows[i].Onset,
//                Duration: rows[i].Duration,
//                Value: rows[i].Value,
//                Unit: rows[i].Unit,
//                Episode: rows[i].Episode,
//                Notation: rows[i].Note,
//                Specifier: null,
//                TimeRecorded: null,
//                ChartFlag: null,
//                RangeScale: null,
//                RangeNormalLow: null,
//                RangeNormalHigh: null
//            });
//        }
//
//        return returnData;
//    });
//};

patientService.prototype.GetHistoryEntries = function (data) {
    console.log("GetHistoryEntries");

    var promise = q.defer();
    var self=this;
    var querystr="";

    if(data.LookbackLimit> new Date("0001-01-01")) {
        querystr+="&datefrom="+data.LookbackLimit.getTime();
    }
    if(data.StartDate> new Date("0001-01-01")) {
        querystr+="&dateto="+data.StartDate.getTime();
    }

    client.get(config.rest_host+"/bcds/clinicaldocument/getbymrn/01/"+data.PatientId+"?sort=-1&"+querystr,
        function(data,response){
            try{
                data=JSON.parse(data);
                if(data.error){
                    promise.resolve([]);
                }else{
                    var findingData=[];
                    for(var i=0;i<data.length;i++){
                        for(var j=0;j<data[i].finding.length;j++){
                            findingData.push({
                                EntryId : "0",
                                ProviderId : data[i].ProviderId,
                                PatientId: data[i].PatientId,
                                Specifier : data[i].finding[j].Specifier,
                                TimeRecorded : self.getDateString(new Date(data[i].EncounterTime)) ,
                                ChartFlag :  data[i].finding[j].ChartFlag,
                                RangeScale :  data[i].finding[j].RangeScale,
                                RangeNormalLow :  data[i].finding[j].RangeNormalLow,
                                RangeNormalHigh :  data[i].finding[j].RangeNormalHigh,
                                EncounterId: data[i]._id.toString(),
                                RecordId: 0,
                                EncounterTime: self.getDateString(new Date(data[i].EncounterTime)),
                                MedcinId: data[i].finding[j].MedcinId,
                                Prefix: data[i].finding[j].Prefix,
                                ResultCode : data[i].finding[j].ResultCode,
                                Modifier: data[i].finding[j].Modifier,
                                Status: data[i].finding[j].Status,
                                Value: data[i].finding[j].Value,
                                Unit: data[i].finding[j].Unit,
                                Notation: data[i].finding[j].Notation,
                                Onset: data[i].finding[j].Onset,
                                Duration: data[i].finding[j].Duration,
                                Episode: data[i].finding[j].Episode
                            });
                        }
                    }
                    promise.resolve(findingData);
                }
            }catch(err)
            {
                promise.resolve(null);
            }
        });

    return promise.promise;

};

//patientService.prototype.HasChanges = function (data) {
//    var sql = "select exists( ";
//    sql += "  select 1 from Encounters e";
//    sql += "    where e.PatientId = $patientId";
//
//    var parameters = {
//        $patientId: data.PatientId
//    };
//
//    if (data.ThresholdDate.getFullYear() != 0) {
//        sql += "    and e.EncounterTime > $thresholdDate";
//        parameters.$thresholdDate = this.getDateString(data.ThresholdDate);
//    }
//
//    sql += ") as result";
//
//    return this.databaseGet(sql, parameters, function (row) {
//        return row.result == 1;
//    });
//};

patientService.prototype.HasChanges = function (data) {
    console.log("HasChanges");

    var promise = q.defer();
    var self=this;

    client.get(config.rest_host+"/bcds/clinicaldocument/getbymrn/01/"+data.PatientId+"?sort=-1&datefrom="+data.ThresholdDate.getTime(),
        function(data,response){
            try{
                data=JSON.parse(data);
                if(data.error){
                    promise.resolve(null);
                }else{
                    promise.resolve(data.length>0);
                }
            }catch(err)
            {
                promise.resolve(null);
            }
        }
    );

    return promise.promise;
};

patientService.prototype.HasHistory = function(data) {
    return this.NumEncounters(data).then(function(rowCount) {
        return rowCount > 0;
    });
};

patientService.prototype.SaveSummary = function (data) {
    var self = this;
    
    return this.databaseRun("delete from PatientSummary where PatientId=$patientId", {
        $patientId: data.PatientId
    }).then(function() {
        var promises = [];
        
        for (var i = 0; i < data.Items.length; i++) {
            promises.push(self.databaseRun("insert into PatientSummary (PatientId, CategoryId, Sequence, MedcinId, Prefix, Note) values ($patientId, $categoryId, $sequence, $medcinId, $prefix, $note)", {
                $patientId: data.PatientId,
                $categoryId: data.Items[i].CategoryId,
                $sequence: data.Items[i].Sequence,
                $medcinId: data.Items[i].MedcinId,
                $prefix: data.Items[i].Prefix || "",
                $note: data.Items[i].Notation || ""
            }));
        }

        return q.all(promises).then(function() {
            return true;
        });
    });
};

patientService.prototype.GetCategories = function (data) {
    return this.databaseAll("select * from SummaryCategories", null, function (rows) {
        var categories = [];
        
        for (var i = 0; i < rows.length; i++) {
            categories.push({
                id: rows[i].CategoryId,
                Description: rows[i].Description
            });
        }
        
        return categories;
    });
};

patientService.prototype.GetRowValue = function(row, column, defaultValue) {
    if (row[column] == null || typeof row[column] == "undefined") {
        return defaultValue;
    }

    return row[column];
}

patientService.prototype.GetEntry = function (data) {
    var self = this;

    return this.databaseGet('select * from Records where RecordId=$recordId', {
        $recordId: data.id
    }, function (row) {
        if (!row) {
            return null;
        }

        return {
            ChartFlag: self.GetRowValue(row, "ChartFlag", 0),
            Duration: self.GetRowValue(row, "Duration", ""),
            EncounterId: row.EncounterId ? row.EncounterId.toString() : null,
            EntryId: row["RecordId"].toString(),
            Episode: self.GetRowValue(row, "Episode", ""),
            MedcinId: self.GetRowValue(row, "MedcinId", 0),
            Modifier: self.GetRowValue(row, "Modifier", ""),
            Notation: self.GetRowValue(row, "Note", ""),
            Onset: self.GetRowValue(row, "Onset", ""),
            Prefix: self.GetRowValue(row, "Prefix", ""),
            ProviderId: row.ProviderId ? row.ProviderId.toString() : "0",
            RangeNormalHigh: self.GetRowValue(row, "RangeNormalHigh", 0),
            RangeNormalLow: self.GetRowValue(row, "RangeNormalLow", 0),
            RangeScale: self.GetRowValue(row, "RangeScale", 0),
            ResultCode: self.GetRowValue(row, "Result", ""),
            Status: self.GetRowValue(row, "Status", ""),
            TimeRecorded: self.GetRowValue(row, "EditDateTime", '0001-01-01'),
            Unit: self.GetRowValue(row, "Unit", ""),
            Value: self.GetRowValue(row, "Value", ""),
            Specifier: null
        };
    });
};

patientService.prototype.GetChartEntries = function (data) {
    var self = this;
    
    return this.databaseAll('select * from Records where EncounterId=$encounterId', {
        $encounterId: data.EncounterId
    }, function (rows) {
        if (rows.length == 0) {
            return null;
        }

        var returnData = [];
        
        for (var i = 0; i < rows.length; i++) {
            returnData.push({
                ChartFlag: self.GetRowValue(rows[i], "ChartFlag", 0),
                Duration: self.GetRowValue(rows[i], "Duration", ""),
                EncounterId: rows[i].EncounterId ? rows[i].EncounterId.toString() : null,
                EntryId: rows[i]["RecordId"].toString(),
                Episode: self.GetRowValue(rows[i], "Episode", ""),
                MedcinId: self.GetRowValue(rows[i], "MedcinId", 0),
                Modifier: self.GetRowValue(rows[i], "Modifier", ""),
                Notation: self.GetRowValue(rows[i], "Note", ""),
                Onset: self.GetRowValue(rows[i], "Onset", ""),
                Prefix: self.GetRowValue(rows[i], "Prefix", ""),
                ProviderId: rows[i].ProviderId ? rows[i].ProviderId.toString() : "0",
                RangeNormalHigh: self.GetRowValue(rows[i], "RangeNormalHigh", 0),
                RangeNormalLow: self.GetRowValue(rows[i], "RangeNormalLow", 0),
                RangeScale: self.GetRowValue(rows[i], "RangeScale", 0),
                ResultCode: self.GetRowValue(rows[i], "Result", ""),
                Status: self.GetRowValue(rows[i], "Status", ""),
                TimeRecorded: self.GetRowValue(rows[i], "EditDateTime", '0001-01-01'),
                Unit: self.GetRowValue(rows[i], "Unit", ""),
                Value: self.GetRowValue(rows[i], "Value", ""),
                Specifier: null
            });
        }

        return returnData;
    });
};

patientService.prototype.GetCareProvider = function (data) {
    return this.databaseGet("select * from Providers where ProviderId=$providerId", {
        $providerId: data.id
    }, function(row) {
        if (!row) {
            return null;
        }

        return {
            id: row.ProviderId.toString(),
            Name: row.Name
        }
    });
};

//patientService.prototype.GetPatients = function (data) {
//    var self = this;
//
//    var sql = "select * from Patients";
//    var parameters = {};
//
//    if (data.Search) {
//        sql += " where LastName like $search";
//        sql += " or FirstName like $search";
//
//        parameters.$search = '%' + data.Search + '%';
//    }
//
//    sql += " order by LastName, FirstName";
//
//    if (data.MaxRecords && data.MaxRecords > 0) {
//        sql += " limit $maxRecords";
//        parameters.$maxRecords = data.MaxRecords;
//    }
//
//    if (data.StartIndex && data.StartIndex > 0) {
//        sql += " offset $offset";
//        parameters.$offset = data.StartIndex;
//    }
//
//    return this.databaseAll(sql, parameters, function(rows) {
//        var returnData = [];
//
//        for (var i = 0; i < rows.length; i++) {
//            returnData.push({
//                id: rows[i].PatientId,
//                LastName: rows[i].LastName,
//                FirstName: rows[i].FirstName,
//                Sex: rows[i].Sex,
//                BirthDate: self.getDateString(rows[i].BirthDate),
//                Race: rows[i].Race,
//                Religion: rows[i].Religion,
//                Ethnicity: rows[i].Ethnicity,
//                MaritalStatus: rows[i].MaritalStatus,
//            });
//        }
//
//        return returnData;
//    });
//};

patientService.prototype.GetPatients = function (data) {
    console.log("GetPatients");

    var promise = q.defer();
    var self=this;
    if(data.Search=="")
        return [];
    client.get(config.rest_host+"/his/patient/getbyhn/01/"+data.Search,
        function(data,response){
            try{
                data=JSON.parse(data);
                if(data.error){
                    promise.resolve(null);
                }else{
                    var returnData = [];
                    for (var i = 0; i < data.length; i++) {
                        var mrn="";
                        for(var j=0;j< data[i].id.length;j++){
                            if(data[i].id[j].use=="MRN"){
                                mrn=data[i].id[j].key;
                            }
                        }
                        returnData.push({
                            id: mrn,
                            LastName: data[i].name[0].family,
                            FirstName: data[i].name[0].given,
                            Sex: (data[i].gender=="Male"?"M":"F"),
                            BirthDate: self.getDateString(new Date(data[i].birthDate)),
                            Race: "U",
                            Religion: "U",
                            Ethnicity: "U",
                            MaritalStatus: "U"
                        });
                    }
                    promise.resolve(returnData);
                }
            }catch(err)
            {
                promise.resolve(null);
            }
        }
    );

    return promise.promise;

};

//patientService.prototype.GetPatientEncounters = function (data) {
//    var self = this;
//
//    return this.databaseAll("select EncounterId, EncounterTime, PatientId, ProviderId from Encounters where PatientId=$patientId order by EncounterTime desc, EncounterId desc", {
//        $patientId: data.PatientId
//    }, function(rows) {
//        var returnData = [];
//
//        for (var i = 0; i < rows.length; i++) {
//            returnData.push({
//                id: rows[i].EncounterId.toString(),
//                EncounterTime: self.getDateFromString(rows[i].EncounterTime),
//                BaseDate: self.getDateFromString(rows[i].EncounterTime),
//                PatientId: rows[i].PatientId,
//                ProviderId: rows[i].ProviderId.toString(),
//                Code: null,
//                Description: null
//            });
//        }
//
//        return returnData;
//    });
//};

patientService.prototype.GetPatientEncounters = function (data) {
    console.log("GetPatientEncounters");

    var promise = q.defer();
    var self=this;

    client.get(config.rest_host+"/bcds/clinicaldocument/getbymrn/01/"+data.PatientId+"?sort=-1",
        function(data,response){
            try{
                data=JSON.parse(data);
                if(data.error){
                    promise.resolve([]);
                }else{
                    var returnData = [];
                    for (var i = 0; i < data.length; i++) {
                        returnData.push({
                            id : data[i]._id.toString(),
                            EpisodeNumber : data[i].EpisodeNumber,
                            EncounterTime  : self.getDateString(new Date(data[i].EncounterTime)),
                            BaseDate  : self.getDateString(new Date(data[i].EncounterTime)),
                            PatientId  : data[i].PatientId,
                            ProviderId  : data[i].ProviderId,
                            Code  : null,
                            Description  : null
                        });
                    }
                    promise.resolve(returnData);
                }
            }catch(err)
            {
                promise.resolve(null);
            }
        }
    );

    return promise.promise;
};

//patientService.prototype.SaveEncounter = function (data) {
//    var self = this;
//
//    if (data.Records) {
//        return this.beginTransaction().then(function () {
//            var saveOtherData = function () {
//                return self.DoSaveChartEntries(data.Encounter, data.Records).then(function() {
//                    if (data.Data != null) {
//                        return self.databaseGet("select DocumentId from Documents where EncounterId=$encounterId and DocumentType=1", {
//                            $encounterId: data.Encounter.id
//                        }).then(function(row) {
//                            if (!row) {
//                                return self.databaseGet("select ifnull(max(DocumentId), -1) + 1 as DocumentId from Documents", null).then(function(documentIdRow) {
//                                    return self.databaseRun("insert into Documents values ($documentId,$documentType,$patientId,$encounterId,$providerId,$data)", {
//                                        $documentId: documentIdRow.DocumentId,
//                                        $documentType: 1,
//                                        $patientId: data.Encounter.PatientId,
//                                        $encounterId: data.Encounter.id,
//                                        $providerId: data.Encounter.ProviderId || "",
//                                        $data: data.Data || ""
//                                    }).then(function() {
//                                        return self.commitTransaction(data.Encounter.id.toString());
//                                    });
//                                });
//                            }
//
//                            else {
//                                return self.databaseRun("update Documents set Data=$data where DocumentId=$documentId", {
//                                    $data: data.Data,
//                                    $documentId: row.DocumentId
//                                }).then(function() {
//                                    return self.commitTransaction(data.Encounter.id.toString());
//                                });
//                            }
//                        });
//                    }
//
//                    else {
//                        return self.commitTransaction(data.Encounter.id.toString());
//                    }
//                });
//            };
//
//            var encounterId = parseInt(data.Encounter.id);
//
//            if (!encounterId || encounterId < 0) {
//                return self.DoSaveEncounter(data).then(saveOtherData);
//            }
//
//            else {
//                return saveOtherData();
//            }
//        }).then(null, function(errors) {
//            self.rollbackTransaction();
//            throw errors;
//        });
//    }
//
//    else {
//        throw JSON.stringify({
//            ExceptionType: 'System.NotImplementedException'
//        });
//    }
//};

patientService.prototype.SaveEncounter = function (data) {
    console.log("SaveEncounter");

    var promise = q.defer();
    var self=this;
    var parser = xml2js.Parser();

    parser.parseString(data.Data,function(err,result){
        if(err){
            promise.error(err);
        }
        else
        {
            var jsondata= {};
            if(result.Document.$.TemplateId||result.Document.$.TemplateName){
                jsondata.template={ };
                if(result.Document.$.TemplateId)
                    jsondata.template.id=result.Document.$.TemplateId;
                if(result.Document.$.TemplateName)
                    jsondata.template.name=result.Document.$.TemplateName;
            }
            //// ResultText
            var extractResultText=function(doc){
                for(var obj in doc){
                    if(obj=="Finding"){
                        for(var i=0;i<doc[obj].length;i++){
                            for(var j=0;j<data.Records.length;j++){
                                if(data.Records[j].MedcinId==doc[obj][i].$.MedcinId){
                                    data.Records[j].ResultText=doc[obj][i].$.Text;
                                }
                            }
                        }
                    }
                    if(typeof(doc) ==  'object')
                        extractResultText(doc[obj])
                }

            }
            extractResultText(result.Document);
            //// Lab Result
            var section=[];
            if(result.Document.Section!=null)
                section=result.Document.Section;
            if(result.Document.Chapter!=null){
                for(var i=0;i<result.Document.Chapter.length;i++)
                    if(result.Document.Chapter[i].Section!=null)
                        for(var j=0;j<result.Document.Chapter[i].Section.length;j++){
                            section.push(result.Document.Chapter[i].Section[j]);
                        }
            }

            var labresult=[];
            for(var i=0;i<section.length;i++){
                if((JSON.parse(JSON.stringify(section[i].$)).Name=='TestResults')&&(section[i].Element)){

                    var maxrow=0;
                    for(var j=0;j<section[i].Element[0].CellSettings[0].Cell.length;j++){
                        if(maxrow<parseInt(section[i].Element[0].CellSettings[0].Cell[j].$.Row)){
                            maxrow=parseInt(section[i].Element[0].CellSettings[0].Cell[j].$.Row);
                        }
                    }
                    for(var j=0;j<(maxrow-1);j++){
                        labresult.push({});
                    }
                    for(var j=0;j<section[i].Element[0].CellSettings[0].Cell.length;j++){
                        var row=parseInt(section[i].Element[0].CellSettings[0].Cell[j].$.Row)-2;
                        var col=parseInt(section[i].Element[0].CellSettings[0].Cell[j].$.Col);
                        if(row>=0){
                            if(col==1){
                                labresult[row].CheckedStatus=(section[i].Element[0].CellSettings[0].Cell[j].$.Value);
                            }else if(col==2){
                                var value=section[i].Element[0].CellSettings[0].Cell[j].$.Value;
                                var valueArr=value.split('/');
                                labresult[row].dateAuth=(new Date(parseInt(valueArr[2]),parseInt(valueArr[1])-1,parseInt(valueArr[0]) )).getTime();
                            } else if(col==3){
                                labresult[row].hos_testSet_Desc=(section[i].Element[0].CellSettings[0].Cell[j].$.Value);
                            } else if(col==4){
                                labresult[row].hos_testCode_Desc=(section[i].Element[0].CellSettings[0].Cell[j].$.Value);
                            } else if(col==5){
                                labresult[row].value=(section[i].Element[0].CellSettings[0].Cell[j].$.Value);
                            } else if(col==6){
                                labresult[row].hos_testSet_Code=(section[i].Element[0].CellSettings[0].Cell[j].$.Value);
                            } else if(col==7){
                                labresult[row].hos_testCode_Code=(section[i].Element[0].CellSettings[0].Cell[j].$.Value);
                            }

                        }

                    }
                }
            }

            jsondata.xml=data.Data;
            jsondata.PatientId=data.Encounter.PatientId;
            jsondata.ProviderId=data.Encounter.ProviderId;
            jsondata.EncounterTime=data.Encounter.EncounterTime;
            jsondata.BaseDate=data.Encounter.BaseDate;
            jsondata.Code=data.Encounter.Code;
            jsondata.Description=data.Encounter.Description;
            jsondata.finding=data.Records;
            jsondata.labresult=labresult;

            try{
                for(var i=0;i<result.Document.Finding.length;i++){
                    var finding=JSON.parse(JSON.stringify(result.Document.Finding[i].$));
                    if(finding.Name=='EpisodeNumber'){
                        jsondata.EpisodeNumber=finding.Value;
                    }
                    if(finding.Name=='UserID'){
                        jsondata.UserID=finding.Value;
                    }
                    if(finding.Name=='UserGiven'){
                        jsondata.UserGiven=finding.Value;
                    }
                    if(finding.Name=='UserFamily'){
                        jsondata.UserFamily=finding.Value;
                    }
                    if(finding.Name=='DoctorCode'){
                        jsondata.DoctorCode=finding.Value;
                    }
                    if(finding.Name=='DoctorName'){
                        jsondata.DoctorName=finding.Value;
                    }
                    if(finding.Name=='MedicalLicenseNo'){
                        jsondata.MedicalLicenseNo=finding.Value;
                    }
                    if(finding.Name=='HMSLocationid'){
                        jsondata.HMSLocationid=finding.Value;
                    }

                }
            }catch(err){

            }

            if(data.Encounter.id!=-1){
                client.get(config.rest_host+"/bcds/clinicaldocument/getbyid/01/"+data.Encounter.id+"?sort=-1",
                    function(clinicaldocument_data,response){
                        clinicaldocument_data=JSON.parse(clinicaldocument_data);
                        clinicaldocument_data=clinicaldocument_data[0];
                        //console.log(JSON.stringify(data));
                        if(clinicaldocument_data.error){
                            promise.resolve(null);
                        }else{
                            var jsondata_temp=jsondata;
                            jsondata=clinicaldocument_data;
                            jsondata.xml=jsondata_temp.xml;
                            jsondata.PatientId=jsondata_temp.PatientId;
                            jsondata.ProviderId=jsondata_temp.ProviderId;
                            jsondata.EncounterTime=jsondata_temp.EncounterTime;
                            jsondata.BaseDate=jsondata_temp.BaseDate;
                            jsondata.Code=jsondata_temp.Code;
                            jsondata.Description=jsondata_temp.Description;
                            jsondata.finding=jsondata_temp.finding;
                            jsondata.labresult=jsondata_temp.labresult;
                            jsondata.template=jsondata_temp.template;

                            //console.log("mongoose open");
                            var args = {
                                data: {
                                    restuser: "bexchange",
                                    restpass: "Bexch@nge",
                                    jsondata: encodeURIComponent(JSON.stringify(jsondata))
                                },
                                headers: {"Content-Type": "application/json"}
                            };
                            client.post(config.rest_host+"/bcds/clinicaldocument/set/01", args, function (clinicaldocument_save_data, response) {
                                clinicaldocument_save_data=JSON.parse(clinicaldocument_save_data);
                                if(data.error){
                                    promise.reject(clinicaldocument_save_data.error);
                                }else {
                                    promise.resolve(jsondata._id.toString());
                                }
                            });

                        }
                    }
                );
            }else{
                var args = {
                    data: {
                        restuser: "bexchange",
                        restpass: "Bexch@nge",
                        jsondata: encodeURIComponent(JSON.stringify(jsondata))
                    },
                    headers: {"Content-Type": "application/json"}
                };
                client.post(config.rest_host+"/bcds/clinicaldocument/set/01", args, function (clinicaldocument_save_data, response) {
                    clinicaldocument_save_data=JSON.parse(clinicaldocument_save_data);
                    if(clinicaldocument_save_data.error){
                        promise.reject(clinicaldocument_save_data.error);
                    }else{
                        data.Encounter.id=clinicaldocument_save_data._id.toString();
                        promise.resolve(clinicaldocument_save_data._id.toString());
                    }
                });
            }
        }
    });

    return promise.promise;
};

patientService.prototype.DoSaveEncounter = function(data) {
    var self = this;
    
    if (!data.Encounter.id || data.Encounter.id < 0) {
        return self.databaseGet("select ifnull(max(EncounterId), -1) + 1 as EncounterId from Encounters", null).then(function (row) {
            data.Encounter.id = row.EncounterId;

            var sql = "insert into Encounters(EncounterId, PatientId, EncounterTime, ProviderId, EncounterCode) ";
            sql += " values ($encounterId, $patientId, $encounterTime, $providerId,  $encounterCode); ";
            
            return self.databaseRun(sql, {
                $encounterId: data.Encounter.id,
                $patientId: data.Encounter.PatientId,
                $encounterTime: self.getDateString(data.Encounter.EncounterTime),
                $providerId: data.Encounter.ProviderId || "",
                $encounterCode: data.Encounter.Code || ""
            });
        });
    }

    else {
        var sql = "update Encounters set ";
        sql += " PatientId=$patientId, EncounterTime=$encounterTime, ProviderId=$providerId, EncounterCode=$encounterCode ";
        sql += " where EncounterId=$encounterId; ";
        
        return self.databaseRun(sql, {
            $encounterId: data.Encounter.id,
            $patientId: data.Encounter.PatientId,
            $encounterTime: self.getDateString(data.Encounter.EncounterTime),
            $providerId: data.Encounter.ProviderId || "",
            $encounterCode: data.Encounter.Code || ""
        });
    }
}

patientService.prototype.DoSaveChartEntries = function(encounter, records) {
    var self = this;

    var deferred = this.databaseRun("delete from Records where EncounterId=$encounterId", {
        $encounterId: encounter.id
    });

    var createInsertCallback = function (entry) {
        return function () {
            return self.databaseGet("select ifnull(max(RecordId), -1) + 1 as RecordId from Records", null).then(function (row) {
                var sql = "insert into Records(RecordId, PatientId, EncounterId, ProviderId, MedcinId, Prefix, Modifier, Result, Status, Onset, Duration, Value, Unit, Episode, Timing, Note)";
                sql += " values($recordId, $patientId, $encounterId, $providerId, $medcinId, $prefix, $modifier, $result, $status, $onset, $duration, $value, $unit, $episode, $timing, $note); ";

                return self.databaseRun(sql, {
                    $recordId: row.RecordId,
                    $patientId: encounter.PatientId,
                    $encounterId: encounter.id,
                    $providerId: encounter.ProviderId || "",
                    $medcinId: entry.MedcinId,
                    $prefix: entry.Prefix || "",
                    $modifier: entry.Modifier || "",
                    $result: entry.Result != null ? entry.Result : entry.ResultCode,
                    $status: entry.Status || "",
                    $onset: entry.Onset || "",
                    $duration: entry.Duration || "",
                    $value: entry.Value || "",
                    $unit: entry.Unit || "",
                    $episode: entry.Episode || "",
                    $note: entry.Notation || "",
                    $timing: ""
                });
            });
        };
    };
    
    for (var i = 0; i < records.length; i++) {
        deferred = deferred.then(createInsertCallback(records[i]));
    }

    return deferred;
};

patientService.prototype.SaveChartEntries = function (data) {
    throw JSON.stringify({
        ExceptionType: 'System.NotImplementedException'
    });
};

patientService.prototype.SaveCareProvider = function (data) {
    throw JSON.stringify({
        ExceptionType: 'System.NotSupportedException'
    });
};

patientService.prototype.RemoveEncounter = function (data) {
    throw JSON.stringify({
        ExceptionType: 'System.NotImplementedException'
    });
};

patientService.prototype.AddPatient = function (data) {
    var self = this;

    var doInsert = function () {
        if (!data.Patient.Sex) {
            data.Patient.Sex = 'U';
        }
        
        if (!data.Patient.Race) {
            data.Patient.Race = 'U';
        }
        
        if (!data.Patient.Religion) {
            data.Patient.Religion = 'U';
        }
        
        if (!data.Patient.Ethnicity) {
            data.Patient.Ethnicity = 'U';
        }
        
        if (!data.Patient.MaritalStatus) {
            data.Patient.MaritalStatus = 'U';
        }
        
        var sql = "insert into Patients(PatientId,LastName,FirstName,BirthDate,Sex,Race,Religion,Ethnicity,MaritalStatus)";
        sql += " values($patientId,$lastName,$firstName,$birthDate,$sex,$race,$religion,$ethnicity,$maritalStatus)";

        return self.beginTransaction().then(function() {
            return self.databaseRun(sql, {
                $patientId: data.Patient.id,
                $lastName: data.Patient.LastName || "",
                $firstName: data.Patient.FirstName || "",
                $birthDate: self.getDateString(data.Patient.BirthDate),
                $sex: data.Patient.Sex || "",
                $race: data.Patient.Race || "",
                $religion: data.Patient.Religion || "",
                $ethnicity: data.Patient.Ethnicity || "",
                $maritalStatus: data.Patient.MaritalStatus || ""
            });
        }).then(function() {
            if (data.Patient._CustomData) {
                var promiseChain = q(null);
                var createInsertPropertyCallback = function (key, value) {
                    return function() {
                        return self.databaseRun("insert into PatientProperties values($patientId, $propertyName, $propertyValue)", {
                            $patientId: data.Patient.id,
                            $propertyName: key,
                            $propertyValue: value
                        });
                    }
                };
                    
                for (var key in data.Patient._CustomData) {
                    if (!data.Patient._CustomData.hasOwnProperty(key)) {
                        continue;
                    }

                    promiseChain = promiseChain.then(createInsertPropertyCallback(key, data.Patient._CustomData[key]));
                }

                return promiseChain;
            }

            return q(null);
        }).then(function() {
            return self.commitTransaction(data.Patient);
        }, function(errors) {
            self.rollbackTransaction();
            throw errors;
        });
    }
    
    var getId = function(currentSequence, idPrefix) {
        return self.databaseGet("select count(*) as idCount, $patientId as id from Patients where PatientId=$patientId", {
            $patientId: idPrefix + self.padLeft(3, '0', currentSequence.toString())
        }).then(function(row) {
            if (row.idCount == 0) {
                return row.id;
            }

            else {
                return getId(currentSequence + 1, idPrefix);
            }
        });
    }

    if (!data.Patient.id) {
        var prefix = new Date().getFullYear().toString().substring(2, 2) + this.padLeft(4, '0', new Date().getMonth().toString() + new Date().getDate().toString());
        
        return getId(0, prefix).then(function (id) {
            data.Patient.id = id;

            return doInsert();
        });
    }

    else {
        return doInsert();
    }
};

patientService.prototype.UpdatePatient = function (data) {
    var self = this;
    
    return this.GetPatient({
        id: data.Patient.id
    }).then(function(patient) {
        if (!patient) {
            throw 'Patient not found';
        }

        var parameters = {};
        var hasParameters = false;

        if (!self.stringIsNullOrEmpty(data.Patient.LastName) && data.Patient.LastName != patient.LastName) {
            parameters.$lastName = data.Patient.LastName;
            hasParameters = true;
        }

        if (!self.stringIsNullOrEmpty(data.Patient.FirstName) && data.Patient.FirstName != patient.FirstName) {
            parameters.$firstName = data.Patient.FirstName;
            hasParameters = true;
        }

        if (!self.stringIsNullOrEmpty(data.Patient.BirthDate) && data.Patient.BirthDate.getFullYear() > 0 && data.Patient.BirthDate != patient.BirthDate) {
            parameters.$birthDate = self.getDateString(data.Patient.BirthDate);
            hasParameters = true;
        }

        if (!self.stringIsNullOrEmpty(data.Patient.Sex) && data.Patient.Sex != patient.Sex) {
            parameters.$sex = data.Patient.Sex;
            hasParameters = true;
        }

        if (!self.stringIsNullOrEmpty(data.Patient.Race) && data.Patient.Race != patient.Race) {
            parameters.$race = data.Patient.Race;
            hasParameters = true;
        }

        if (!self.stringIsNullOrEmpty(data.Patient.Religion) && data.Patient.Religion != patient.Religion) {
            parameters.$religion = data.Patient.Religion;
            hasParameters = true;
        }

        if (!self.stringIsNullOrEmpty(data.Patient.Ethnicity) && data.Patient.Ethnicity != patient.Ethnicity) {
            parameters.$ethnicity = data.Patient.Ethnicity;
            hasParameters = true;
        }

        if (!self.stringIsNullOrEmpty(data.Patient.MaritalStatus) && data.Patient.MaritalStatus != patient.MaritalStatus) {
            parameters.$maritalStatus = data.Patient.MaritalStatus;
            hasParameters = true;
        }

        if (!hasParameters) {
            return true;
        }

        var sql = 'update Patients set ';
        var i = 0;

        for (var parameter in parameters) {
            if (i > 0) {
                sql += ", ";
            }

            sql += parameter.substring(1) + "=" + parameter;

            i++;
        }

        sql += " where PatientId=$patientId";

        parameters.$patientId = data.Patient.id;

        return self.beginTransaction().then(function() {
            return self.databaseRun(sql, parameters);
        }).then(function () {
            if (data.Patient._CustomData) {
                return self.databaseAll("select PropertyName, PropertyValue from PatientProperties where PatientId=$patientId", {
                    $patientId: data.Patient.id
                }).then(function (rows) {
                    var existingProperties = {};
                                
                    if (rows) {
                        for (var i = 0; i < rows.length; i++) {
                            existingProperties[rows[i].PropertyName] = rows[i].PropertyValue;
                        }
                    }

                    var promiseChain = q(null);
                    var createUpdatePropertyCallback = function (key, value) {
                        var insertUpdateSql = existingProperties.hasOwnProperty(key) ? "update PatientProperties set PropertyValue=$propertyValue where PatientId=$patientId and PropertyName=$propertyName" : "insert into PatientProperties values($patientId, $propertyName, $propertyValue)";
                                    
                        return function () {
                            return self.databaseRun(insertUpdateSql, {
                                $patientId: data.Patient.id,
                                $propertyName: key,
                                $propertyValue: value
                            });
                        }
                    };
                    var createDeletePropertyCallback = function (key) {
                        return function () {
                            return self.databaseRun("delete from PatientProperties where PatientId=$patientId and PropertyName=$propertyName", {
                                $patientId: data.Patient.id,
                                $propertyName: key
                            });
                        }
                    };
                                
                    for (var key in data.Patient._CustomData) {
                        if (!data.Patient._CustomData.hasOwnProperty(key)) {
                            continue;
                        }
                                    
                        promiseChain = promiseChain.then(createUpdatePropertyCallback(key, data.Patient._CustomData[key]));
                    }
                                
                    for (var existingKey in existingProperties) {
                        if (!existingProperties.hasOwnProperty(existingKey)) {
                            continue;
                        }

                        if (!data.Patient._CustomData.hasOwnProperty(existingKey)) {
                            promiseChain = promiseChain.then(createDeletePropertyCallback(existingKey));
                        }
                    }
                                
                    return promiseChain;
                });
            }
                    
            return q(null);
        }).then(function () {
            return self.commitTransaction(true);
        }, function (errors) {
            self.rollbackTransaction();
            throw errors;
        });
    });
};

patientService.prototype.RemovePatient = function (data) {
    var self = this;
    
    return this.beginTransaction().then(function(transaction) {
        return self.databaseRun("delete from Patients where PatientId=$patientId", {
            $patientId: data.PatientId
        }).then(function() {
            return self.databaseRun("delete from PatientSummary where PatientId=$patientId", {
                $patientId: data.PatientId
            });
        }).then(function() {
            return self.databaseRun("delete from Encounters where PatientId=$patientId", {
                $patientId: data.PatientId
            });
        }).then(function() {
            return self.databaseRun("delete from Documents where PatientId=$patientId", {
                $patientId: data.PatientId
            });
        }).then(function() {
            return self.databaseRun("delete from Records where PatientId=$patientId", {
                $patientId: data.PatientId
            });
        }).then(function () {
            return self.databaseRun("delete from PatientProperties where PatientId=$patientId", {
                $patientId: data.PatientId
            });
        });
    }).then(function() {
        return self.commitTransaction(true);
    }, function(errors) {
        self.rollbackTransaction();
        throw errors;
    });
};

patientService.prototype.GetEncounterCodes = function (data) {
    throw JSON.stringify({
        ExceptionType: 'System.NotSupportedException'
    });
};

//patientService.prototype.OpenEncounter = function(data) {
//    var self = this;
//
//    return this.databaseGet("select Data from Documents where EncounterId=$encounterId and DocumentType=1", {
//        $encounterId: data.EncounterId
//    }).then(function(row) {
//        if (row) {
//            return row.Data;
//        }
//
//        return self.databaseAll("select * from Records where EncounterId=$encounterId", {
//            $encounterId: data.EncounterId
//        }).then(function(rows) {
//            if (rows.length > 0) {
//                var xmlBuilder = new xml2js.Builder({
//                    rootName: 'Findings',
//                    headless: true
//                });
//
//                var findings = {};
//
//                findings.$ = {};
//
//                findings.$.PatientId = rows[0].PatientId;
//                findings.$.ProviderId = rows[0].ProviderId;
//                findings.$.EncounterId = rows[0].EncounterId;
//                findings.Finding = [];
//
//                for (var i = 0; i < rows.length; i++) {
//                    var finding = {};
//                    finding.$ = {};
//
//                    for (var column in rows[i]) {
//                        if (column == 'RecordId') {
//                            finding.$.EntryId = rows[i][column];
//                        }
//
//                        else if (column == 'PatientId' || column == 'ProviderId' || column == 'EncounterId') {
//                            continue;
//                        }
//
//                        else if (typeof rows[i][column] != 'undefined' && rows[i][column] != null && rows[i][column].toString() != '0' && rows[i][column].toString() != '') {
//                            finding.$[column] = rows[i][column];
//                        }
//                    }
//
//                    findings.Finding.push(finding);
//                }
//
//                return xmlBuilder.buildObject(findings);
//            }
//
//            else {
//                return null;
//            }
//        });
//    });
//};

patientService.prototype.OpenEncounter = function(data) {
    console.log("OpenEncounter");

    var promise = q.defer();
    var self=this;

    client.get(config.rest_host+"/bcds/clinicaldocument/getbyid/01/"+data.EncounterId+"?sort=-1",
        function(data,response){
            try{
                data=JSON.parse(data);
                if(data.error){
                    promise.resolve(null);
                }else{

                    var returnData = [];
                    for (var i = 0; i < 1; i++) {
                        promise.resolve(data[i].xml);
                    }
                }
            }catch(err)
            {
                promise.resolve(null);
            }
        }
    );

    return promise.promise;

};

var getHandlerAndCall = function (data, method) {
    var patientHandler = new patientService(data.ContextData.Username);
    
    try {
        return patientHandler[method](data);
    }

    catch (errors) {
        var deferred = q.defer();
        deferred.reject(errors);

        return deferred.promise;
    }
}

quippe.registerService(['Quippe.IPatientSummaryService', 'Quippe.IPatientHistoryService', 'Quippe.IPatientDataService', 'Quippe.IPatientEditorService', 'Quippe.IEncounterIOService'], {
    GetSummary: function(data) {
        return getHandlerAndCall(data, 'GetSummary');
    },
    
    SaveSummary: function (data) {
        return getHandlerAndCall(data, 'SaveSummary');
    },
    
    GetCategories: function (data) {
        return getHandlerAndCall(data, 'GetCategories');
    },

    HasHistory: function(data) {
        return getHandlerAndCall(data, 'HasHistory');
    },

    NumEncounters: function (data) {
        return getHandlerAndCall(data, 'NumEncounters');
    },

    GetHistory: function (data) {
        return getHandlerAndCall(data, 'GetHistory');
    },

    GetEncounterNoteType: function (data) {
        return getHandlerAndCall(data, 'GetEncounterNoteType');
    },

    GetEncounterNote: function (data) {
        return getHandlerAndCall(data, 'GetEncounterNote');
    },

    GetHistoryEntries: function (data) {
        return getHandlerAndCall(data, 'GetHistoryEntries');
    },

    HasChanges: function (data) {
        return getHandlerAndCall(data, 'HasChanges');
    },

    GetPatient: function(data) {
        return getHandlerAndCall(data, 'GetPatient');
    },

    GetEncounter: function (data) {
        return getHandlerAndCall(data, 'GetEncounter');
    },

    GetEntry: function (data) {
        return getHandlerAndCall(data, 'GetEntry');
    },

    GetCareProvider: function (data) {
        return getHandlerAndCall(data, 'GetCareProvider');
    },

    GetPatients: function (data) {
        return getHandlerAndCall(data, 'GetPatients');
    },

    GetPatientEncounters: function (data) {
        return getHandlerAndCall(data, 'GetPatientEncounters');
    },

    GetChartEntries: function (data) {
        return getHandlerAndCall(data, 'GetChartEntries');
    },

    SaveEncounter: function (data) {
        return getHandlerAndCall(data, 'SaveEncounter');
    },

    SaveChartEntries: function (data) {
        return getHandlerAndCall(data, 'SaveChartEntries');
    },

    SaveCareProvider: function (data) {
        return getHandlerAndCall(data, 'SaveCareProvider');
    },

    RemoveEncounter: function (data) {
        return getHandlerAndCall(data, 'RemoveEncounter');
    },

    GetEncounterCodes: function (data) {
        return getHandlerAndCall(data, 'GetEncounterCodes');
    },

    AddPatient: function (data) {
        return getHandlerAndCall(data, 'AddPatient');
    },

    UpdatePatient: function (data) {
        return getHandlerAndCall(data, 'UpdatePatient');
    },

    RemovePatient: function (data) {
        return getHandlerAndCall(data, 'RemovePatient');
    },

    OpenEncounter: function (data) {
        return getHandlerAndCall(data, 'OpenEncounter');
    }
}, {
    usesPromises: true
});