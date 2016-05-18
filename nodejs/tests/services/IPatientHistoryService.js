var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var assert = require("assert");
var moment = require("moment");

String.prototype.replaceAll = function(search, replace) {
    var escapeRegex = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;
    var replaceRegex = new RegExp(search.replace(escapeRegex, "\\\\$&"), "gi");
    return this.replace(replaceRegex, replace);
};

Date.prototype.addYears = function(years) {
    return new moment(this).add(years, "years").toDate();
};

describe("IPatientHistoryService", function() {
    var service = quippe.getService("Quippe.IPatientHistoryService", {
        usesPromises: true
    });
    
    it("TestGetEncounterNoteTypeFromNewNote", function(done) {
        var noteType;
        
        service.GetEncounterNoteType({
            EncounterId: "209"
        }).then(function(__callbackResults) {
            noteType = __callbackResults;
            assert.equal(noteType, "application/vnd.medicomp.quippe.note+xml");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEncounterNoteTypeFromOldNote", function(done) {
        var noteType;
        
        service.GetEncounterNoteType({
            EncounterId: "1"
        }).then(function(__callbackResults) {
            noteType = __callbackResults;
            assert.equal(noteType, "text/html");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEncounterNoteNewNote", function(done) {
        var note;
        
        service.GetEncounterNote({
            EncounterId: "224"
        }).then(function(__callbackResults) {
            note = __callbackResults;
            assert.notEqual(note, null);
            assert.equal(note.replaceAll("\r\n", "\n"), helpers.getExpectedResultsText("PatientHistoryService", "Note224.txt").replaceAll("\r\n", "\n"));
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEncounterNoteOldNote", function(done) {
        var note;
        
        service.GetEncounterNote({
            EncounterId: "34"
        }).then(function(__callbackResults) {
            note = __callbackResults;
            assert.notEqual(note, null);
            assert.equal(note.replaceAll("\r\n", "\n"), helpers.getExpectedResultsText("PatientHistoryService", "Note34.txt").replaceAll("\r\n", "\n"));
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEncounterNotePdf", function(done) {
        var note;
        var compareContent;
        
        service.GetEncounterNote({
            EncounterId: "12345"
        }).then(function(__callbackResults) {
            note = __callbackResults;
            compareContent = helpers.getExpectedResultsBytes("PatientHistoryService", "Note12345.dat");
            assert.notEqual(note, null);
            for (var i = 0; i < note.length - 1; i++) {
                assert.equal(note[i], compareContent[i]);
            }
        }).done(function() {
            done();
        });
    });
    
    it("TestGetEncounterNoteNoResults", function(done) {
        var note;
        
        service.GetEncounterNote({
            EncounterId: "999999"
        }).then(function(__callbackResults) {
            note = __callbackResults;
            assert.equal(note, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetHistoryEntriesPatientDoesNotExist", function(done) {
        var historyEntries;
        
        service.GetHistoryEntries({
            PatientId: "999999",
            StartDate: new Date("0001-01-01T00:00:00"),
            LookbackLimit: new Date("0001-01-01T00:00:00")
        }).then(function(__callbackResults) {
            historyEntries = __callbackResults;
            assert.equal(historyEntries, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetHistoryEntriesExcludeSomeWithStartDate", function(done) {
        var historyEntries;
        
        service.GetHistoryEntries({
            PatientId: "222888",
            StartDate: new Date("2014-04-21 10:30:00"),
            LookbackLimit: new Date("2014-04-21 10:25:00")
        }).then(function(__callbackResults) {
            historyEntries = __callbackResults;
            assert.equal(historyEntries.length, 6);
            assert.equal(historyEntries[0].EncounterId, "234");
            assert.equal(historyEntries[1].EncounterId, "234");
            assert.equal(historyEntries[2].EncounterId, "234");
            assert.equal(historyEntries[3].EncounterId, "234");
            assert.equal(historyEntries[4].EncounterId, "234");
            assert.equal(historyEntries[5].EncounterId, "234");
            assert.equal(historyEntries[0].EntryId, "1936");
            assert.equal(historyEntries[1].EntryId, "1937");
            assert.equal(historyEntries[2].EntryId, "1938");
            assert.equal(historyEntries[3].EntryId, "1939");
            assert.equal(historyEntries[4].EntryId, "1940");
            assert.equal(historyEntries[5].EntryId, "1941");
            assert.equal(historyEntries[0].MedcinId, 111906);
            assert.equal(historyEntries[1].MedcinId, 6003);
            assert.equal(historyEntries[2].MedcinId, 6255);
            assert.equal(historyEntries[3].MedcinId, 9354);
            assert.equal(historyEntries[4].MedcinId, 6266);
            assert.equal(historyEntries[5].MedcinId, 33757);
            for (var __iteratorIndex = 0; __iteratorIndex < historyEntries.length; __iteratorIndex++) {
                var historyEntry = historyEntries[__iteratorIndex];
                assert.equal(historyEntry.Prefix, "");
                assert.equal(historyEntry.Modifier, "");
                assert.equal(historyEntry.ResultCode, "A");
                assert.equal(historyEntry.Status, "");
                assert.equal(historyEntry.ProviderId, "0");
                assert.equal(historyEntry.Onset, "");
                assert.equal(historyEntry.Duration, "");
                assert.equal(historyEntry.Value, "");
                assert.equal(historyEntry.Unit, "");
                assert.equal(historyEntry.Episode, "");
                assert.equal(historyEntry.Notation, "");
            }
        }).done(function() {
            done();
        });
    });
    
    it("TestGetHistoryEntriesExcludeSomeWithLoopbackLimit", function(done) {
        var historyEntries;
        
        service.GetHistoryEntries({
            PatientId: "222888",
            StartDate: new Date("0001-01-01T00:00:00"),
            LookbackLimit: new Date("2014-04-21 10:25:00")
        }).then(function(__callbackResults) {
            historyEntries = __callbackResults;
            assert.equal(historyEntries.length, 10);
            assert.equal(historyEntries[9].EncounterId, "236");
            assert.equal(historyEntries[8].EncounterId, "235");
            assert.equal(historyEntries[7].EncounterId, "235");
            assert.equal(historyEntries[6].EncounterId, "235");
            assert.equal(historyEntries[5].EncounterId, "234");
            assert.equal(historyEntries[4].EncounterId, "234");
            assert.equal(historyEntries[3].EncounterId, "234");
            assert.equal(historyEntries[2].EncounterId, "234");
            assert.equal(historyEntries[1].EncounterId, "234");
            assert.equal(historyEntries[0].EncounterId, "234");
            assert.equal(historyEntries[9].EntryId, "1945");
            assert.equal(historyEntries[8].EntryId, "1944");
            assert.equal(historyEntries[7].EntryId, "1943");
            assert.equal(historyEntries[6].EntryId, "1942");
            assert.equal(historyEntries[5].EntryId, "1941");
            assert.equal(historyEntries[4].EntryId, "1940");
            assert.equal(historyEntries[3].EntryId, "1939");
            assert.equal(historyEntries[2].EntryId, "1938");
            assert.equal(historyEntries[1].EntryId, "1937");
            assert.equal(historyEntries[0].EntryId, "1936");
            assert.equal(historyEntries[9].MedcinId, 97371);
            assert.equal(historyEntries[8].MedcinId, 306965);
            assert.equal(historyEntries[7].MedcinId, 306286);
            assert.equal(historyEntries[6].MedcinId, 309960);
            assert.equal(historyEntries[5].MedcinId, 33757);
            assert.equal(historyEntries[4].MedcinId, 6266);
            assert.equal(historyEntries[3].MedcinId, 9354);
            assert.equal(historyEntries[2].MedcinId, 6255);
            assert.equal(historyEntries[1].MedcinId, 6003);
            assert.equal(historyEntries[0].MedcinId, 111906);
            for (var __iteratorIndex = 0; __iteratorIndex < historyEntries.length; __iteratorIndex++) {
                var historyEntry = historyEntries[__iteratorIndex];
                assert.equal(historyEntry.Prefix, "");
                assert.equal(historyEntry.Modifier, "");
                assert.equal(historyEntry.ResultCode, "A");
                assert.equal(historyEntry.Status, "");
                assert.equal(historyEntry.ProviderId, "0");
                assert.equal(historyEntry.Onset, "");
                assert.equal(historyEntry.Duration, "");
                assert.equal(historyEntry.Value, "");
                assert.equal(historyEntry.Unit, "");
                assert.equal(historyEntry.Episode, "");
                assert.equal(historyEntry.Notation, "");
            }
        }).done(function() {
            done();
        });
    });
    
    it("TestGetHistoryEntriesNoResultsFromStartDate", function(done) {
        var historyEntries;
        
        service.GetHistoryEntries({
            PatientId: "999999",
            StartDate: new Date().addYears(-10),
            LookbackLimit: new Date("0001-01-01T00:00:00")
        }).then(function(__callbackResults) {
            historyEntries = __callbackResults;
            assert.equal(historyEntries, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetHistoryEntriesNoResultsFromLoopbackLimit", function(done) {
        var historyEntries;
        
        service.GetHistoryEntries({
            PatientId: "999999",
            StartDate: new Date("0001-01-01T00:00:00"),
            LookbackLimit: new Date()
        }).then(function(__callbackResults) {
            historyEntries = __callbackResults;
            assert.equal(historyEntries, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestHasChanges", function(done) {
        var result;
        
        service.HasChanges({
            PatientId: "222888",
            ThresholdDate: new Date().addYears(-5)
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
        }).done(function() {
            done();
        });
    });
    
    it("TestHasChangesInvalidPatientId", function(done) {
        var result;
        
        service.HasChanges({
            PatientId: "999999",
            ThresholdDate: new Date("0001-01-01T00:00:00")
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, false);
        }).done(function() {
            done();
        });
    });
    
    it("TestHasChangesNoResults", function(done) {
        var result;
        
        service.HasChanges({
            PatientId: "222888",
            ThresholdDate: new Date()
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, false);
        }).done(function() {
            done();
        });
    });
});
