var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var path = require("path");
var assert = require("assert");
var moment = require("moment");

function formatDate(date, format) {
    var momentInstance = typeof(date) == "string" ? new moment(date, "YYYY-MM-DD HH:mm:ss") : new moment(date);
    return momentInstance.format(format == "G" ? "M/D/YYYY h:mm:ss A" : format == "d" ? "M/D/YYYY" : format.replace(/y/g, "Y").replace(/d/g, "D").replace(/tt/g, "A"));
}

function GetEncountersCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Encounters");
}

function GetLatestEncounterId() {
    return helpers.getMaxColumnValue(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Encounters", "EncounterId");
}

function AssertAreEncountersEqual(originalEncounter, compareEncounter) {
    assert.equal(formatDate(compareEncounter.BaseDate, "yyyy-MM-dd HH:mm:ss"), formatDate(originalEncounter.BaseDate, "yyyy-MM-dd HH:mm:ss"));
    assert.equal(formatDate(compareEncounter.EncounterTime, "yyyy-MM-dd HH:mm:ss"), formatDate(originalEncounter.EncounterTime, "yyyy-MM-dd HH:mm:ss"));
    assert.equal(compareEncounter.PatientId, originalEncounter.PatientId);
    assert.equal(compareEncounter.ProviderId, originalEncounter.ProviderId);
    assert.equal(compareEncounter.id, originalEncounter.id);
}

function AssertAreEntryListsEqual(entries, compareEntries) {
    assert.equal(compareEntries.length, entries.length);
    for (var i = 0; i < entries.length; i++) {
        assert.equal(compareEntries[i].Duration, entries[i].Duration);
        assert.equal(compareEntries[i].Episode, entries[i].Episode);
        assert.equal(compareEntries[i].MedcinId, entries[i].MedcinId);
        assert.equal(compareEntries[i].Modifier, entries[i].Modifier);
        assert.equal(compareEntries[i].Notation, entries[i].Notation);
        assert.equal(compareEntries[i].Onset, entries[i].Onset);
        assert.equal(compareEntries[i].Prefix, entries[i].Prefix);
        assert.equal(compareEntries[i].ResultCode, entries[i].ResultCode);
        assert.equal(compareEntries[i].Status, entries[i].Status);
        assert.equal(compareEntries[i].Value, entries[i].Value);
        assert.equal(compareEntries[i].Unit, entries[i].Unit);
    }
}

function AssertIsWilliamAtkins(patient) {
    assert.equal(patient.id, "222888");
    assert.equal(patient.FirstName, "William");
    assert.equal(patient.LastName, "Atkins");
    assert.equal(patient.Sex, "M");
    assert.equal(formatDate(patient.BirthDate, "d"), "10/15/1953");
    assert.equal(patient.MaritalStatus, "M");
    assert.equal(patient.Race, "C");
    assert.equal(patient.Religion, "H");
    assert.equal(patient.Ethnicity, "H");
}

function AssertIsElsieChen(patient) {
    assert.equal(patient.id, "16481.1");
    assert.equal(patient.FirstName, "Elsie");
    assert.equal(patient.LastName, "Chen");
    assert.equal(patient.Sex, "F");
    assert.equal(formatDate(patient.BirthDate, "d"), "11/22/1988");
    assert.equal(patient.MaritalStatus, "S");
    assert.equal(patient.Race, "O");
    assert.equal(patient.Religion, "U");
    assert.equal(patient.Ethnicity, "U");
}

function AssertIsEntry332(entry) {
    assert.equal(entry.EntryId, "332");
    assert.equal(entry.ChartFlag, 0);
    assert.equal(entry.Duration, "");
    assert.equal(entry.EncounterId, "34");
    assert.equal(entry.Episode, "");
    assert.equal(entry.MedcinId, 12499);
    assert.equal(entry.Modifier, "");
    assert.equal(entry.Notation, "");
    assert.equal(entry.Onset, "");
    assert.equal(entry.Prefix, "O");
    assert.equal(entry.ProviderId, "0");
    assert.equal(entry.RangeNormalHigh, 0);
    assert.equal(entry.RangeNormalLow, 0);
    assert.equal(entry.RangeScale, 0);
    assert.equal(entry.ResultCode, "A");
    assert.equal(entry.Status, "");
    assert.equal(formatDate(entry.TimeRecorded, "d"), "1/1/0001");
    assert.equal(entry.Value, "tntc");
    assert.equal(entry.Unit, "per HPF");
}

function AssertIsEntry1910(entry) {
    assert.equal(entry.EntryId, "1910");
    assert.equal(entry.ChartFlag, 0);
    assert.equal(entry.Duration, "");
    assert.equal(entry.EncounterId, "228");
    assert.equal(entry.Episode, "");
    assert.equal(entry.MedcinId, 41812);
    assert.equal(entry.Modifier, "");
    assert.equal(entry.Notation, "");
    assert.equal(entry.Onset, "2014-04-16T00:00:00");
    assert.equal(entry.Prefix, "");
    assert.equal(entry.ProviderId, "0");
    assert.equal(entry.RangeNormalHigh, 0);
    assert.equal(entry.RangeNormalLow, 0);
    assert.equal(entry.RangeScale, 0);
    assert.equal(entry.ResultCode, "A");
    assert.equal(entry.Status, "");
    assert.equal(formatDate(entry.TimeRecorded, "d"), "1/1/0001");
    assert.equal(entry.Value, "");
    assert.equal(entry.Unit, "");
}

function AssertIsEntry1277(entry) {
    assert.equal(entry.EntryId, "1277");
    assert.equal(entry.ChartFlag, 0);
    assert.equal(entry.Duration, "3D");
    assert.equal(entry.EncounterId, "160");
    assert.equal(entry.Episode, "");
    assert.equal(entry.MedcinId, 247);
    assert.equal(entry.Modifier, "");
    assert.equal(entry.Notation, "");
    assert.equal(entry.Onset, "");
    assert.equal(entry.Prefix, "H");
    assert.equal(entry.ProviderId, "0");
    assert.equal(entry.RangeNormalHigh, 0);
    assert.equal(entry.RangeNormalLow, 0);
    assert.equal(entry.RangeScale, 0);
    assert.equal(entry.ResultCode, "A");
    assert.equal(entry.Status, "");
    assert.equal(formatDate(entry.TimeRecorded, "d"), "1/1/0001");
    assert.equal(entry.Value, "");
    assert.equal(entry.Unit, "");
}

function AssertIsEntry345(entry) {
    assert.equal(entry.EntryId, "345");
    assert.equal(entry.ChartFlag, 0);
    assert.equal(entry.Duration, "");
    assert.equal(entry.EncounterId, "34");
    assert.equal(entry.Episode, "");
    assert.equal(entry.MedcinId, 81303);
    assert.equal(entry.Modifier, "S");
    assert.equal(entry.Notation, "");
    assert.equal(entry.Onset, "");
    assert.equal(entry.Prefix, "");
    assert.equal(entry.ProviderId, "0");
    assert.equal(entry.RangeNormalHigh, 0);
    assert.equal(entry.RangeNormalLow, 0);
    assert.equal(entry.RangeScale, 0);
    assert.equal(entry.ResultCode, "A");
    assert.equal(entry.Status, "");
    assert.equal(formatDate(entry.TimeRecorded, "d"), "1/1/0001");
    assert.equal(entry.Value, "");
    assert.equal(entry.Unit, "+");
}

function AssertIsEntry371(entry) {
    assert.equal(entry.EntryId, "371");
    assert.equal(entry.ChartFlag, 0);
    assert.equal(entry.Duration, "");
    assert.equal(entry.EncounterId, "37");
    assert.equal(entry.Episode, "");
    assert.equal(entry.MedcinId, 11454);
    assert.equal(entry.Modifier, "");
    assert.equal(entry.Notation, "Erythenatous tender nodule under right axilla");
    assert.equal(entry.Onset, "");
    assert.equal(entry.Prefix, "");
    assert.equal(entry.ProviderId, "0");
    assert.equal(entry.RangeNormalHigh, 0);
    assert.equal(entry.RangeNormalLow, 0);
    assert.equal(entry.RangeScale, 0);
    assert.equal(entry.ResultCode, "A");
    assert.equal(entry.Status, "");
    assert.equal(formatDate(entry.TimeRecorded, "d"), "1/1/0001");
    assert.equal(entry.Value, "");
    assert.equal(entry.Unit, "");
}

describe("IPatientDataService", function() {
    var service = quippe.getService("Quippe.IPatientDataService", {
        usesPromises: true
    });
    
    it("TestGetEncounterCodes", function(done) {
        var encounterCodes;
        
        service.GetEncounterCodes({}).then(function(__callbackResults) {
            encounterCodes = __callbackResults;
        }).done(function() {
            throw new Error("Expected an exception to be thrown");
        }, function(errors) {
            done();
        });
    });
    
    it("TestSaveCareProvider", function(done) {
        var careProvider;
        
        careProvider = {
            id: "100",
            Name: "New care provider"
        };
        
        service.SaveCareProvider({
            CareProvider: careProvider
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown");
        }, function(errors) {
            done();
        });
    });
    
    it("TestGetCareProvider", function(done) {
        var careProvider;
        
        service.GetCareProvider({
            id: "1"
        }).then(function(__callbackResults) {
            careProvider = __callbackResults;
            assert.equal(careProvider.id, "1");
            assert.equal(careProvider.Name, "Demo Care Provider");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetCareProviderNoResults", function(done) {
        var careProvider;
        
        service.GetCareProvider({
            id: "999999"
        }).then(function(__callbackResults) {
            careProvider = __callbackResults;
            assert.equal(careProvider, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatient", function(done) {
        var patient;
        
        service.GetPatient({
            id: "222888"
        }).then(function(__callbackResults) {
            patient = __callbackResults;
            AssertIsWilliamAtkins(patient);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatientNoResults", function(done) {
        var patient;
        
        service.GetPatient({
            id: "idontexist"
        }).then(function(__callbackResults) {
            patient = __callbackResults;
            assert.equal(patient, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEncounter", function(done) {
        var encounter;
        
        service.GetEncounter({
            id: "1"
        }).then(function(__callbackResults) {
            encounter = __callbackResults;
            assert.equal(encounter.id, "1");
            assert.equal(formatDate(encounter.BaseDate, "G"), "9/21/2002 3:42:00 AM");
            assert.equal(formatDate(encounter.EncounterTime, "G"), "9/21/2002 3:42:00 AM");
            assert.equal(encounter.PatientId, "16481.1");
            assert.equal(encounter.ProviderId, "0");
            assert.equal(encounter.Description, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEncounterNoResults", function(done) {
        var encounter;
        
        service.GetEncounter({
            id: "999999"
        }).then(function(__callbackResults) {
            encounter = __callbackResults;
            assert.equal(encounter, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatients", function(done) {
        var patients;
        
        service.GetPatients({
            Search: null
        }).then(function(__callbackResults) {
            patients = __callbackResults;
            assert.equal(patients.length, 2);
            AssertIsWilliamAtkins(patients[0]);
            AssertIsElsieChen(patients[1]);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatientsWithSearch", function(done) {
        var patients;
        
        service.GetPatients({
            Search: "william"
        }).then(function(__callbackResults) {
            patients = __callbackResults;
            assert.equal(patients.length, 1);
            AssertIsWilliamAtkins(patients[0]);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatientsWithSearchNoResults", function(done) {
        var patients;
        
        service.GetPatients({
            Search: "dontreturnanything"
        }).then(function(__callbackResults) {
            patients = __callbackResults;
            assert.equal(patients.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatientsWithBounds", function(done) {
        var patients;
        
        service.GetPatients({
            Search: null,
            StartIndex: 1,
            MaxRecords: 1
        }).then(function(__callbackResults) {
            patients = __callbackResults;
            assert.equal(patients.length, 1);
            AssertIsElsieChen(patients[0]);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatientsWithSearchAndBounds", function(done) {
        var patients;
        
        service.GetPatients({
            Search: "l",
            StartIndex: 0,
            MaxRecords: 1
        }).then(function(__callbackResults) {
            patients = __callbackResults;
            assert.equal(patients.length, 1);
            AssertIsWilliamAtkins(patients[0]);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatientsWithSearchAndBounds2", function(done) {
        var patients;
        
        service.GetPatients({
            Search: "l",
            StartIndex: 1,
            MaxRecords: 1
        }).then(function(__callbackResults) {
            patients = __callbackResults;
            assert.equal(patients.length, 1);
            AssertIsElsieChen(patients[0]);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatientsWithSearchAndBoundsNoResults", function(done) {
        var patients;
        
        service.GetPatients({
            Search: "dontreturnanything",
            StartIndex: 1,
            MaxRecords: 1
        }).then(function(__callbackResults) {
            patients = __callbackResults;
            assert.equal(patients.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEntry", function(done) {
        var entry;
        
        service.GetEntry({
            id: "332"
        }).then(function(__callbackResults) {
            entry = __callbackResults;
            AssertIsEntry332(entry);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEntry2", function(done) {
        var entry;
        
        service.GetEntry({
            id: "1910"
        }).then(function(__callbackResults) {
            entry = __callbackResults;
            AssertIsEntry1910(entry);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEntry3", function(done) {
        var entry;
        
        service.GetEntry({
            id: "1277"
        }).then(function(__callbackResults) {
            entry = __callbackResults;
            AssertIsEntry1277(entry);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEntry4", function(done) {
        var entry;
        
        service.GetEntry({
            id: "345"
        }).then(function(__callbackResults) {
            entry = __callbackResults;
            AssertIsEntry345(entry);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEntry5", function(done) {
        var entry;
        
        service.GetEntry({
            id: "371"
        }).then(function(__callbackResults) {
            entry = __callbackResults;
            AssertIsEntry371(entry);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEntryNoResults", function(done) {
        var entry;
        
        service.GetEntry({
            id: "999999"
        }).then(function(__callbackResults) {
            entry = __callbackResults;
            assert.equal(entry, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatientEncounters", function(done) {
        var encounters;
        
        service.GetPatientEncounters({
            PatientId: "222888"
        }).then(function(__callbackResults) {
            encounters = __callbackResults;
            assert.equal(encounters.length, 31);
            for (var __iteratorIndex = 0; __iteratorIndex < encounters.length; __iteratorIndex++) {
                var encounter = encounters[__iteratorIndex];
                assert.equal(encounter.PatientId, "222888");
                assert.equal(encounter.ProviderId, "0");
            }
            assert.equal(encounters[0].id, "236");
            assert.equal(encounters[1].id, "235");
            assert.equal(encounters[2].id, "234");
            assert.equal(encounters[3].id, "233");
            assert.equal(encounters[4].id, "232");
            assert.equal(encounters[5].id, "231");
            assert.equal(encounters[6].id, "230");
            assert.equal(encounters[7].id, "229");
            assert.equal(encounters[8].id, "228");
            assert.equal(encounters[9].id, "227");
            assert.equal(encounters[10].id, "226");
            assert.equal(encounters[11].id, "225");
            assert.equal(encounters[12].id, "223");
            assert.equal(encounters[13].id, "222");
            assert.equal(encounters[14].id, "221");
            assert.equal(encounters[15].id, "220");
            assert.equal(encounters[16].id, "219");
            assert.equal(encounters[17].id, "218");
            assert.equal(encounters[18].id, "217");
            assert.equal(encounters[19].id, "214");
            assert.equal(encounters[20].id, "212");
            assert.equal(encounters[21].id, "211");
            assert.equal(encounters[22].id, "210");
            assert.equal(encounters[23].id, "209");
            assert.equal(encounters[24].id, "208");
            assert.equal(encounters[25].id, "207");
            assert.equal(encounters[26].id, "206");
            assert.equal(encounters[27].id, "205");
            assert.equal(encounters[28].id, "204");
            assert.equal(encounters[29].id, "203");
            assert.equal(encounters[30].id, "202");
            assert.equal(formatDate(encounters[0].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-05-01T13:56:00");
            assert.equal(formatDate(encounters[0].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-05-01T13:56:00");
            assert.equal(formatDate(encounters[1].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-04-21T12:20:00");
            assert.equal(formatDate(encounters[1].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-04-21T12:20:00");
            assert.equal(formatDate(encounters[2].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-04-21T10:29:00");
            assert.equal(formatDate(encounters[2].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-04-21T10:29:00");
            assert.equal(formatDate(encounters[3].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-04-21T10:04:00");
            assert.equal(formatDate(encounters[3].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-04-21T10:04:00");
            assert.equal(formatDate(encounters[4].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-04-18T09:12:00");
            assert.equal(formatDate(encounters[4].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-04-18T09:12:00");
            assert.equal(formatDate(encounters[5].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-04-18T08:59:00");
            assert.equal(formatDate(encounters[5].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-04-18T08:59:00");
            assert.equal(formatDate(encounters[6].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-04-17T09:24:00");
            assert.equal(formatDate(encounters[6].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-04-17T09:24:00");
            assert.equal(formatDate(encounters[7].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-04-17T09:18:00");
            assert.equal(formatDate(encounters[7].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-04-17T09:18:00");
            assert.equal(formatDate(encounters[8].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-04-17T09:11:00");
            assert.equal(formatDate(encounters[8].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-04-17T09:11:00");
            assert.equal(formatDate(encounters[9].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-03-27T16:01:00");
            assert.equal(formatDate(encounters[9].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-03-27T16:01:00");
            assert.equal(formatDate(encounters[10].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2014-02-12T10:08:00");
            assert.equal(formatDate(encounters[10].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2014-02-12T10:08:00");
            assert.equal(formatDate(encounters[11].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-12-12T13:31:00");
            assert.equal(formatDate(encounters[11].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-12-12T13:31:00");
            assert.equal(formatDate(encounters[12].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-10-29T11:00:00");
            assert.equal(formatDate(encounters[12].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-10-29T11:00:00");
            assert.equal(formatDate(encounters[13].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-10-14T12:07:00");
            assert.equal(formatDate(encounters[13].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-10-14T12:07:00");
            assert.equal(formatDate(encounters[14].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-10-08T10:48:00");
            assert.equal(formatDate(encounters[14].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-10-08T10:48:00");
            assert.equal(formatDate(encounters[15].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-10-03T15:42:00");
            assert.equal(formatDate(encounters[15].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-10-03T15:42:00");
            assert.equal(formatDate(encounters[16].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-10-03T10:56:00");
            assert.equal(formatDate(encounters[16].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-10-03T10:56:00");
            assert.equal(formatDate(encounters[17].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-08-29T16:06:00");
            assert.equal(formatDate(encounters[17].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-08-29T16:06:00");
            assert.equal(formatDate(encounters[18].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-08-28T11:24:00");
            assert.equal(formatDate(encounters[18].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-08-28T11:24:00");
            assert.equal(formatDate(encounters[19].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-07-12T12:11:00");
            assert.equal(formatDate(encounters[19].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-07-12T12:11:00");
            assert.equal(formatDate(encounters[20].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-01-17T16:26:00");
            assert.equal(formatDate(encounters[20].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-01-17T16:26:00");
            assert.equal(formatDate(encounters[21].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2013-01-11T10:01:00");
            assert.equal(formatDate(encounters[21].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2013-01-11T10:01:00");
            assert.equal(formatDate(encounters[22].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2012-12-05T14:53:00");
            assert.equal(formatDate(encounters[22].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2012-12-05T14:53:00");
            assert.equal(formatDate(encounters[23].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2012-12-05T14:47:00");
            assert.equal(formatDate(encounters[23].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2012-12-05T14:47:00");
            assert.equal(formatDate(encounters[24].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2010-12-22T16:00:00");
            assert.equal(formatDate(encounters[24].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2010-12-22T16:00:00");
            assert.equal(formatDate(encounters[25].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2010-08-18T10:45:00");
            assert.equal(formatDate(encounters[25].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2010-08-18T10:45:00");
            assert.equal(formatDate(encounters[26].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2010-04-12T21:12:00");
            assert.equal(formatDate(encounters[26].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2010-04-12T21:12:00");
            assert.equal(formatDate(encounters[27].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2010-03-26T16:00:00");
            assert.equal(formatDate(encounters[27].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2010-03-26T16:00:00");
            assert.equal(formatDate(encounters[28].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2009-10-06T11:15:00");
            assert.equal(formatDate(encounters[28].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2009-10-06T11:15:00");
            assert.equal(formatDate(encounters[29].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2009-09-24T13:30:00");
            assert.equal(formatDate(encounters[29].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2009-09-24T13:30:00");
            assert.equal(formatDate(encounters[30].EncounterTime, "yyyy-MM-ddTHH:mm:ss"), "2009-01-14T15:00:00");
            assert.equal(formatDate(encounters[30].BaseDate, "yyyy-MM-ddTHH:mm:ss"), "2009-01-14T15:00:00");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPatientEncountersNoResults", function(done) {
        var encounters;
        
        service.GetPatientEncounters({
            PatientId: "999999"
        }).then(function(__callbackResults) {
            encounters = __callbackResults;
            assert.equal(encounters.length, 0);
        }).done(function() {
            done();
        });
    });
});
