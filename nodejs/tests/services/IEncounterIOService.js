var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var path = require("path");
var assert = require("assert");
var moment = require("moment");
var xmldoc = require("xmldoc");

function formatString(format) {
    for (var i = 1; i < arguments.length; i++)
        format = format.replace(new RegExp('\\{' + (i - 1) + '\\}', "g"), arguments[i]);
    return format;
}

function xmlDocument() {
    this.loadXml = function(xml) {
        this.xmldocInstance = new xmldoc.XmlDocument(xml);
    };
    this.outerXml = function() {
        return this.xmldocInstance.toString({
            compress: true
        });
    };
    this.toString = this.outerXml;
}

function formatDate(date, format) {
    var momentInstance = typeof(date) == "string" ? new moment(date, "YYYY-MM-DD HH:mm:ss") : new moment(date);
    return momentInstance.format(format == "G" ? "M/D/YYYY h:mm:ss A" : format == "d" ? "M/D/YYYY" : format.replace(/y/g, "Y").replace(/d/g, "D").replace(/tt/g, "A"));
}

Date.prototype.addDays = function(days) {
    return new moment(this).add(days, "days").toDate();
};

RegExp.prototype.replace = function(input, replacement) {
    if (input == null)
        return null;
    return input.replace(this, replacement);
};

function GetEncounterData(encounterId) {
    var provider;
    
    provider = quippe.getService("Quippe.IPatientDataService", {
        usesPromises: true
    });
    return provider.GetEncounter({
        id: encounterId
    });
}

function GetDocumentsCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Documents");
}

function GetEncountersCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Encounters");
}

function GetChartRecordsCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Records");
}

function DeleteTestEncounter(id) {
    return helpers.deleteRows(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Documents", "encounterId='" + id + "'");
    return helpers.deleteRows(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Records", "encounterId='" + id + "'");
    return helpers.deleteRows(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Encounters", "encounterId='" + id + "'");
}

describe("IEncounterIOService", function() {
    var service = quippe.getService("Quippe.IEncounterIOService", {
        usesPromises: true
    });
    
    it("TestOpenEncounter", function(done) {
        var encounter;
        
        service.OpenEncounter({
            EncounterId: "234"
        }).then(function(__callbackResults) {
            encounter = __callbackResults;
            helpers.assertXmlIsEqual(helpers.getExpectedResultsText("EncounterIOService", "Encounter234.txt"), encounter.toString());
        }).done(function() {
            done();
        });
    });
    
    it("TestOpenOldEncounter", function(done) {
        var encounter;
        
        service.OpenEncounter({
            EncounterId: "202"
        }).then(function(__callbackResults) {
            encounter = __callbackResults;
            helpers.assertXmlIsEqual(helpers.getExpectedResultsText("EncounterIOService", "Encounter202.txt"), encounter.toString());
        }).done(function() {
            done();
        });
    });
    
    it("TestOpenEncounterNoResults", function(done) {
        var encounter;
        
        service.OpenEncounter({
            EncounterId: "999999"
        }).then(function(__callbackResults) {
            encounter = __callbackResults;
            assert.equal(encounter, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestSaveEncounterNewNoDocument", function(done) {
        var entryIdRegex;
        var encounter;
        var previousChartRecordsCount;
        var previousEncountersCount;
        var previousDocumentsCount;
        var onset;
        var findings;
        var encounterId;
        var encounterDocument;
        var chartRecordsCount;
        var encountersCount;
        var documentsCount;
        
        entryIdRegex = new RegExp("EntryId=\"\\d+\" ", "g");
        encounter = {
            BaseDate: new Date(),
            Code: "ABC",
            Description: "Test encounter",
            EncounterTime: new Date(),
            PatientId: "222888",
            ProviderId: "1"
        };
        
        GetChartRecordsCount().then(function(__callbackResults) {
            previousChartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            previousEncountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            previousDocumentsCount = __callbackResults;
            onset = new Date().addDays(-1).toString("yyyy-MM-ddTHH:mm:ss");
            findings = [
                {
                    Duration: "3D",
                    Episode: "Current",
                    MedcinId: 1160,
                    Modifier: "1",
                    Notation: "test notation",
                    Onset: onset,
                    Prefix: "O",
                    ResultCode: "A",
                    Status: "2",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "3D",
                    Episode: "Previous",
                    MedcinId: 1215,
                    Modifier: "2",
                    Notation: "another notation",
                    Onset: onset,
                    Prefix: "H",
                    ResultCode: "A",
                    Status: "3",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "3D",
                    Episode: "Some other value",
                    MedcinId: 1217,
                    Modifier: "3",
                    Notation: "yet another notation",
                    Onset: onset,
                    Prefix: "A",
                    ResultCode: "N",
                    Status: "4",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "3D",
                    Episode: "",
                    MedcinId: 6021,
                    Modifier: "",
                    Notation: "notating measurements",
                    Onset: onset,
                    Prefix: "A",
                    ResultCode: "A",
                    Status: "5",
                    Value: "35",
                    Unit: "per minute"
                }, 
                {
                    Duration: "3D",
                    Episode: "",
                    MedcinId: 12499,
                    Modifier: "",
                    Notation: "notating measurements",
                    Onset: onset,
                    Prefix: "O",
                    ResultCode: "A",
                    Status: "6",
                    Value: "15",
                    Unit: "per HPF"
                }
            ];
            return service.SaveEncounter({
                Encounter: encounter,
                Records: findings,
                Data: null
            });
        }).then(function(__callbackResults) {
            encounterId = __callbackResults;
            assert.notEqual(encounterId, null);
            encounter.id = encounterId;
            return service.OpenEncounter({
                EncounterId: encounterId
            });
        }).then(function(__callbackResults) {
            encounterDocument = __callbackResults;
            helpers.assertXmlIsEqual(formatString(helpers.getExpectedResultsText("EncounterIOService", "SaveEncounterNewNoDocument.txt"), encounterId, onset), entryIdRegex.replace(encounterDocument.toString(), ""));
            return GetChartRecordsCount();
        }).then(function(__callbackResults) {
            chartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            assert.equal(chartRecordsCount, previousChartRecordsCount + findings.length);
            assert.equal(encountersCount, previousEncountersCount + 1);
            assert.equal(documentsCount, previousDocumentsCount);
            return DeleteTestEncounter(encounter.id);
        }).then(function() {}).done(function() {
            done();
        });
    });
    
    it("TestSaveEncounterNewWithDocument", function(done) {
        var entryIdRegex;
        var encounterXml;
        var encounter;
        var previousChartRecordsCount;
        var previousEncountersCount;
        var previousDocumentsCount;
        var findings;
        var encounterId;
        var actualEncounterXml;
        var chartRecordsCount;
        var encountersCount;
        var documentsCount;
        
        entryIdRegex = new RegExp("EntryId=\"\\d+\" ", "g");
        encounterXml = new xmlDocument();
        encounterXml.loadXml(helpers.getExpectedResultsText("EncounterIOService", "TestData", "SaveEncounterNewWithDocument.txt"));
        encounter = {
            BaseDate: new Date(),
            Code: "ABC",
            Description: "Test encounter",
            EncounterTime: new Date(),
            PatientId: "222888",
            ProviderId: "1"
        };
        
        GetChartRecordsCount().then(function(__callbackResults) {
            previousChartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            previousEncountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            previousDocumentsCount = __callbackResults;
            findings = [
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 97371,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "",
                    ResultCode: "A",
                    Status: "",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 40170,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 41907,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 44746,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 40296,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 40457,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 40464,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "",
                    Value: "",
                    Unit: ""
                }
            ];
            return service.SaveEncounter({
                Encounter: encounter,
                Records: findings,
                Data: encounterXml.toString()
            });
        }).then(function(__callbackResults) {
            encounterId = __callbackResults;
            assert.notEqual(encounterId, null);
            encounter.id = encounterId;
            return service.OpenEncounter({
                EncounterId: encounterId
            });
        }).then(function(__callbackResults) {
            actualEncounterXml = __callbackResults;
            helpers.assertXmlIsEqual(encounterXml.toString(), entryIdRegex.replace(actualEncounterXml.toString(), ""));
            return GetChartRecordsCount();
        }).then(function(__callbackResults) {
            chartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            assert.equal(chartRecordsCount, previousChartRecordsCount + findings.length);
            assert.equal(encountersCount, previousEncountersCount + 1);
            assert.equal(documentsCount, previousDocumentsCount + 1);
            return DeleteTestEncounter(encounter.id);
        }).then(function() {}).done(function() {
            done();
        });
    });
    
    it("TestSaveEncounterExistingWithDocument", function(done) {
        var entryIdRegex;
        var encounterXml;
        var encounter;
        var previousChartRecordsCount;
        var previousEncountersCount;
        var previousDocumentsCount;
        var findings;
        var encounterId;
        var actualEncounterXml;
        var chartRecordsCount;
        var encountersCount;
        var documentsCount;
        
        entryIdRegex = new RegExp("EntryId=\"\\d+\" ", "g");
        encounterXml = new xmlDocument();
        encounterXml.loadXml(helpers.getExpectedResultsText("EncounterIOService", "TestData", "SaveEncounterNewWithDocument.txt"));
        encounter = {
            BaseDate: new Date(),
            Code: "ABC",
            Description: "Test encounter",
            EncounterTime: new Date(),
            PatientId: "222888",
            ProviderId: "1"
        };
        
        GetChartRecordsCount().then(function(__callbackResults) {
            previousChartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            previousEncountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            previousDocumentsCount = __callbackResults;
            findings = [
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 97371,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "",
                    ResultCode: "A",
                    Status: "",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 40170,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "A",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 41907,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "A",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 44746,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "A",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 40296,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "A",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 40457,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "A",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "",
                    Episode: "",
                    MedcinId: 40464,
                    Modifier: "",
                    Notation: "",
                    Onset: "",
                    Prefix: "O",
                    ResultCode: "",
                    Status: "A",
                    Value: "",
                    Unit: ""
                }
            ];
            return service.SaveEncounter({
                Encounter: encounter,
                Records: findings,
                Data: encounterXml.toString()
            });
        }).then(function(__callbackResults) {
            encounterId = __callbackResults;
            assert.notEqual(encounterId, null);
            encounter.id = encounterId;
            return service.OpenEncounter({
                EncounterId: encounterId
            });
        }).then(function(__callbackResults) {
            actualEncounterXml = __callbackResults;
            helpers.assertXmlIsEqual(encounterXml.toString(), entryIdRegex.replace(actualEncounterXml.toString(), ""));
            return GetChartRecordsCount();
        }).then(function(__callbackResults) {
            chartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            assert.equal(chartRecordsCount, previousChartRecordsCount + findings.length);
            assert.equal(encountersCount, previousEncountersCount + 1);
            assert.equal(documentsCount, previousDocumentsCount + 1);
            encounterXml.loadXml(helpers.getExpectedResultsText("EncounterIOService", "TestData", "SaveEncounterExistingWithDocument.txt"));
            findings.splice(0, 0, {
                Duration: "",
                Episode: "",
                MedcinId: 3669,
                Modifier: "",
                Notation: "",
                Onset: "",
                Prefix: "",
                ResultCode: "",
                Status: "A",
                Value: "",
                Unit: ""
            });
            findings.splice(0, 0, {
                Duration: "",
                Episode: "",
                MedcinId: 3856,
                Modifier: "",
                Notation: "",
                Onset: "",
                Prefix: "",
                ResultCode: "",
                Status: "A",
                Value: "",
                Unit: ""
            });
            findings.splice(0, 0, {
                Duration: "",
                Episode: "",
                MedcinId: 3419,
                Modifier: "",
                Notation: "",
                Onset: "",
                Prefix: "",
                ResultCode: "",
                Status: "A",
                Value: "",
                Unit: ""
            });
            return service.SaveEncounter({
                Encounter: encounter,
                Records: findings,
                Data: encounterXml.toString()
            });
        }).then(function() {
            return service.OpenEncounter({
                EncounterId: encounterId
            });
        }).then(function(__callbackResults) {
            actualEncounterXml = __callbackResults;
            helpers.assertXmlIsEqual(encounterXml.toString(), entryIdRegex.replace(actualEncounterXml.toString(), ""));
            return GetChartRecordsCount();
        }).then(function(__callbackResults) {
            chartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            assert.equal(chartRecordsCount, previousChartRecordsCount + findings.length);
            assert.equal(encountersCount, previousEncountersCount + 1);
            assert.equal(documentsCount, previousDocumentsCount + 1);
            return DeleteTestEncounter(encounter.id);
        }).then(function() {}).done(function() {
            done();
        });
    });
    
    it("TestSaveEncounterExistingAddChartRecords", function(done) {
        var entryIdRegex;
        var encounter;
        var previousChartRecordsCount;
        var previousEncountersCount;
        var previousDocumentsCount;
        var onset;
        var findings;
        var encounterId;
        var encounterDocument;
        var chartRecordsCount;
        var encountersCount;
        var documentsCount;
        
        entryIdRegex = new RegExp("EntryId=\"\\d+\" ", "g");
        encounter = {
            BaseDate: new Date(),
            Code: "ABC",
            Description: "Test encounter",
            EncounterTime: new Date(),
            PatientId: "222888",
            ProviderId: "1"
        };
        
        GetChartRecordsCount().then(function(__callbackResults) {
            previousChartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            previousEncountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            previousDocumentsCount = __callbackResults;
            onset = new Date().addDays(-1).toString("yyyy-MM-ddTHH:mm:ss");
            findings = [
                {
                    Duration: "3D",
                    Episode: "Current",
                    MedcinId: 1160,
                    Modifier: "1",
                    Notation: "test notation",
                    Onset: onset,
                    Prefix: "O",
                    ResultCode: "A",
                    Status: "2",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "3D",
                    Episode: "Previous",
                    MedcinId: 1215,
                    Modifier: "2",
                    Notation: "another notation",
                    Onset: onset,
                    Prefix: "H",
                    ResultCode: "A",
                    Status: "3",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "3D",
                    Episode: "Some other value",
                    MedcinId: 1217,
                    Modifier: "3",
                    Notation: "yet another notation",
                    Onset: onset,
                    Prefix: "A",
                    ResultCode: "N",
                    Status: "4",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "3D",
                    Episode: "",
                    MedcinId: 6021,
                    Modifier: "",
                    Notation: "notating measurements",
                    Onset: onset,
                    Prefix: "A",
                    ResultCode: "A",
                    Status: "5",
                    Value: "35",
                    Unit: "per minute"
                }, 
                {
                    Duration: "3D",
                    Episode: "",
                    MedcinId: 12499,
                    Modifier: "",
                    Notation: "notating measurements",
                    Onset: onset,
                    Prefix: "O",
                    ResultCode: "A",
                    Status: "6",
                    Value: "15",
                    Unit: "per HPF"
                }
            ];
            return service.SaveEncounter({
                Encounter: encounter,
                Records: findings,
                Data: null
            });
        }).then(function(__callbackResults) {
            encounterId = __callbackResults;
            assert.notEqual(encounterId, null);
            encounter.id = encounterId;
            return service.OpenEncounter({
                EncounterId: encounterId
            });
        }).then(function(__callbackResults) {
            encounterDocument = __callbackResults;
            helpers.assertXmlIsEqual(formatString(helpers.getExpectedResultsText("EncounterIOService", "SaveEncounterNewNoDocument.txt"), encounterId, onset), entryIdRegex.replace(encounterDocument.toString(), ""));
            return GetChartRecordsCount();
        }).then(function(__callbackResults) {
            chartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            assert.equal(chartRecordsCount, previousChartRecordsCount + findings.length);
            assert.equal(encountersCount, previousEncountersCount + 1);
            assert.equal(documentsCount, previousDocumentsCount);
            findings.splice(0, 0, {
                Duration: "3D",
                Episode: "Sometime",
                MedcinId: 9308,
                Modifier: "11",
                Notation: "testing notations",
                Onset: onset,
                Prefix: "O",
                ResultCode: "N",
                Status: "8",
                Value: "",
                Unit: ""
            });
            findings.push({
                Duration: "3D",
                Episode: "Another time",
                MedcinId: 247,
                Modifier: "12",
                Notation: "final testing of notations",
                Onset: onset,
                Prefix: "O",
                ResultCode: "N",
                Status: "8",
                Value: "",
                Unit: ""
            });
            return service.SaveEncounter({
                Encounter: encounter,
                Records: findings,
                Data: null
            });
        }).then(function() {
            return service.OpenEncounter({
                EncounterId: encounterId
            });
        }).then(function(__callbackResults) {
            encounterDocument = __callbackResults;
            helpers.assertXmlIsEqual(formatString(helpers.getExpectedResultsText("EncounterIOService", "SaveEncounterExistingAddChartRecords.txt"), encounterId, onset), entryIdRegex.replace(encounterDocument.toString(), ""));
            return GetChartRecordsCount();
        }).then(function(__callbackResults) {
            chartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            assert.equal(chartRecordsCount, previousChartRecordsCount + findings.length);
            assert.equal(encountersCount, previousEncountersCount + 1);
            assert.equal(documentsCount, previousDocumentsCount);
            return DeleteTestEncounter(encounter.id);
        }).then(function() {}).done(function() {
            done();
        });
    });
    
    it("TestSaveEncounterExistingRemoveChartRecords", function(done) {
        var entryIdRegex;
        var encounter;
        var previousChartRecordsCount;
        var previousEncountersCount;
        var previousDocumentsCount;
        var onset;
        var findings;
        var encounterId;
        var encounterDocument;
        var chartRecordsCount;
        var encountersCount;
        var documentsCount;
        
        entryIdRegex = new RegExp("EntryId=\"\\d+\" ", "g");
        encounter = {
            BaseDate: new Date(),
            Code: "ABC",
            Description: "Test encounter",
            EncounterTime: new Date(),
            PatientId: "222888",
            ProviderId: "1"
        };
        
        GetChartRecordsCount().then(function(__callbackResults) {
            previousChartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            previousEncountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            previousDocumentsCount = __callbackResults;
            onset = new Date().addDays(-1).toString("yyyy-MM-ddTHH:mm:ss");
            findings = [
                {
                    Duration: "3D",
                    Episode: "Current",
                    MedcinId: 1160,
                    Modifier: "1",
                    Notation: "test notation",
                    Onset: onset,
                    Prefix: "O",
                    ResultCode: "A",
                    Status: "2",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "3D",
                    Episode: "Previous",
                    MedcinId: 1215,
                    Modifier: "2",
                    Notation: "another notation",
                    Onset: onset,
                    Prefix: "H",
                    ResultCode: "A",
                    Status: "3",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "3D",
                    Episode: "Some other value",
                    MedcinId: 1217,
                    Modifier: "3",
                    Notation: "yet another notation",
                    Onset: onset,
                    Prefix: "A",
                    ResultCode: "N",
                    Status: "4",
                    Value: "",
                    Unit: ""
                }, 
                {
                    Duration: "3D",
                    Episode: "",
                    MedcinId: 6021,
                    Modifier: "",
                    Notation: "notating measurements",
                    Onset: onset,
                    Prefix: "A",
                    ResultCode: "A",
                    Status: "5",
                    Value: "35",
                    Unit: "per minute"
                }, 
                {
                    Duration: "3D",
                    Episode: "",
                    MedcinId: 12499,
                    Modifier: "",
                    Notation: "notating measurements",
                    Onset: onset,
                    Prefix: "O",
                    ResultCode: "A",
                    Status: "6",
                    Value: "15",
                    Unit: "per HPF"
                }
            ];
            return service.SaveEncounter({
                Encounter: encounter,
                Records: findings,
                Data: null
            });
        }).then(function(__callbackResults) {
            encounterId = __callbackResults;
            assert.notEqual(encounterId, null);
            encounter.id = encounterId;
            return service.OpenEncounter({
                EncounterId: encounterId
            });
        }).then(function(__callbackResults) {
            encounterDocument = __callbackResults;
            helpers.assertXmlIsEqual(formatString(helpers.getExpectedResultsText("EncounterIOService", "SaveEncounterNewNoDocument.txt"), encounterId, onset), entryIdRegex.replace(encounterDocument.toString(), ""));
            return GetChartRecordsCount();
        }).then(function(__callbackResults) {
            chartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            assert.equal(chartRecordsCount, previousChartRecordsCount + findings.length);
            assert.equal(encountersCount, previousEncountersCount + 1);
            assert.equal(documentsCount, previousDocumentsCount);
            findings.splice(4, 1);
            findings.splice(0, 1);
            return service.SaveEncounter({
                Encounter: encounter,
                Records: findings,
                Data: null
            });
        }).then(function() {
            return service.OpenEncounter({
                EncounterId: encounterId
            });
        }).then(function(__callbackResults) {
            encounterDocument = __callbackResults;
            helpers.assertXmlIsEqual(formatString(helpers.getExpectedResultsText("EncounterIOService", "SaveEncounterExistingRemoveChartRecords.txt"), encounterId, onset), entryIdRegex.replace(encounterDocument.toString(), ""));
            return GetChartRecordsCount();
        }).then(function(__callbackResults) {
            chartRecordsCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            assert.equal(chartRecordsCount, previousChartRecordsCount + findings.length);
            assert.equal(encountersCount, previousEncountersCount + 1);
            assert.equal(documentsCount, previousDocumentsCount);
            return DeleteTestEncounter(encounter.id);
        }).then(function() {}).done(function() {
            done();
        });
    });
    
    it("TestSaveEncounterExistingNoEncounterDataUpdate", function(done) {
        var encounterDateTime;
        var encounter;
        var onset;
        var findings;
        var encounterId;
        var actualEncounter;
        
        encounterDateTime = new Date();
        encounter = {
            BaseDate: encounterDateTime,
            Code: "ABC",
            Description: "Test encounter",
            EncounterTime: encounterDateTime,
            PatientId: "222888",
            ProviderId: "1"
        };
        onset = new Date().addDays(-1).toString("yyyy-MM-ddTHH:mm:ss");
        findings = [
            {
                Duration: "3D",
                Episode: "Current",
                MedcinId: 1160,
                Modifier: "1",
                Notation: "test notation",
                Onset: onset,
                Prefix: "O",
                ResultCode: "A",
                Status: "2",
                Value: "",
                Unit: ""
            }, 
            {
                Duration: "3D",
                Episode: "Previous",
                MedcinId: 1215,
                Modifier: "2",
                Notation: "another notation",
                Onset: onset,
                Prefix: "H",
                ResultCode: "A",
                Status: "3",
                Value: "",
                Unit: ""
            }, 
            {
                Duration: "3D",
                Episode: "Some other value",
                MedcinId: 1217,
                Modifier: "3",
                Notation: "yet another notation",
                Onset: onset,
                Prefix: "A",
                ResultCode: "N",
                Status: "4",
                Value: "",
                Unit: ""
            }, 
            {
                Duration: "3D",
                Episode: "",
                MedcinId: 6021,
                Modifier: "",
                Notation: "notating measurements",
                Onset: onset,
                Prefix: "A",
                ResultCode: "A",
                Status: "5",
                Value: "35",
                Unit: "per minute"
            }, 
            {
                Duration: "3D",
                Episode: "",
                MedcinId: 12499,
                Modifier: "",
                Notation: "notating measurements",
                Onset: onset,
                Prefix: "O",
                ResultCode: "A",
                Status: "6",
                Value: "15",
                Unit: "per HPF"
            }
        ];
        
        service.SaveEncounter({
            Encounter: encounter,
            Records: findings,
            Data: null
        }).then(function(__callbackResults) {
            encounterId = __callbackResults;
            assert.notEqual(encounterId, null);
            encounter.id = encounterId;
            encounter.Code = "DEF";
            encounter.BaseDate = new Date().addDays(-1);
            encounter.EncounterTime = new Date().addDays(-1);
            encounter.Description = "updated description";
            encounter.ProviderId = "2";
            encounter.PatientId = "12345";
            return service.SaveEncounter({
                Encounter: encounter,
                Records: findings,
                Data: null
            });
        }).then(function() {
            return GetEncounterData(encounterId);
        }).then(function(__callbackResults) {
            actualEncounter = __callbackResults;
            assert.equal(actualEncounter.id, encounterId);
            assert.equal(formatDate(actualEncounter.BaseDate, "G"), formatDate(encounterDateTime, "G"));
            assert.equal(formatDate(actualEncounter.EncounterTime, "G"), formatDate(encounterDateTime, "G"));
            assert.equal(actualEncounter.ProviderId, "1");
            assert.equal(actualEncounter.PatientId, "222888");
            return DeleteTestEncounter(encounter.id);
        }).then(function() {}).done(function() {
            done();
        });
    });
});
