var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var path = require("path");
var assert = require("assert");
var moment = require("moment");
var customDataObject = require("../../services/customDataObject");
var guid = require("node-uuid");

function formatDate(date, format) {
    var momentInstance = typeof(date) == "string" ? new moment(date, "YYYY-MM-DD HH:mm:ss") : new moment(date);
    return momentInstance.format(format == "G" ? "M/D/YYYY h:mm:ss A" : format == "d" ? "M/D/YYYY" : format.replace(/y/g, "Y").replace(/d/g, "D").replace(/tt/g, "A"));
}

Date.prototype.addYears = function(years) {
    return new moment(this).add(years, "years").toDate();
};

function GetPatientsCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Patients");
}

function GetPatientSummariesCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "PatientSummary");
}

function GetEncountersCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Encounters");
}

function GetDocumentsCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Documents");
}

function GetRecordsCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "Records");
}

function GetPatientPropertiesCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PatientData.dat"
    ), "PatientProperties");
}

function GetPatient(patientId) {
    var patientDataService;
    
    patientDataService = quippe.getService("Quippe.IPatientDataService", {
        usesPromises: true
    });
    return patientDataService.GetPatient({
        id: patientId
    });
}

function AddPatientSubItems(patientId) {
    var encounter;
    var patientSummaryService;
    var encounterIOService;
    
    encounter = {
        BaseDate: new Date(),
        Code: "ABC",
        Description: "Test encounter",
        EncounterTime: new Date(),
        PatientId: patientId,
        ProviderId: "1"
    };
    patientSummaryService = quippe.getService("Quippe.IPatientDataService", {
        usesPromises: true
    });
    encounterIOService = quippe.getService("Quippe.IPatientDataService", {
        usesPromises: true
    });
    
    return patientSummaryService.SaveSummary({
        PatientId: patientId,
        Items: [{
            CategoryId: 0,
            Sequence: 1,
            MedcinId: 281565,
            Prefix: "",
            Notation: ""
        }]
    }).then(function() {
        return encounterIOService.SaveEncounter({
            Encounter: encounter,
            Records: [
                {
                    Duration: "3D",
                    Episode: "Current",
                    MedcinId: 1160,
                    Modifier: "1",
                    Notation: "test notation",
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
                    Prefix: "A",
                    ResultCode: "A",
                    Status: "5",
                    Value: "35",
                    Unit: "per minute"
                }
            ],
            Data: null
        });
    }).then(function() {});
}

function AssertPatientsAreEqual(sourcePatient, comparePatient) {
    assert.equal(formatDate(comparePatient.BirthDate, "yyyy-MM-ddTHH:mm:ss.fff"), formatDate(sourcePatient.BirthDate, "yyyy-MM-ddTHH:mm:ss.fff"));
    assert.equal(comparePatient.Ethnicity, sourcePatient.Ethnicity);
    assert.equal(comparePatient.FirstName, sourcePatient.FirstName);
    assert.equal(comparePatient.id, sourcePatient.id);
    assert.equal(comparePatient.LastName, sourcePatient.LastName);
    assert.equal(comparePatient.MaritalStatus, sourcePatient.MaritalStatus);
    assert.equal(comparePatient.Race, sourcePatient.Race);
    assert.equal(comparePatient.Religion, sourcePatient.Religion);
    assert.equal(comparePatient.Sex, sourcePatient.Sex);
    var castedSourcePatient = sourcePatient;
    var castedComparePatient = comparePatient;
    helpers.assertDictionariesAreEqual(castedSourcePatient.GetProperties(), castedComparePatient.GetProperties());
}

describe("IPatientEditorService", function() {
    var service = quippe.getService("Quippe.IPatientEditorService", {
        usesPromises: true
    });
    
    it("TestAddPatientAlreadyExists", function(done) {
        var originalPatientCount;
        var patient;
        
        GetPatientsCount().then(function(__callbackResults) {
            originalPatientCount = __callbackResults;
            patient = new customDataObject({
                BirthDate: new Date(),
                FirstName: "Test",
                id: guid.v4().toString(),
                LastName: "Patient"
            });
            return service.AddPatient({
                Patient: patient
            });
        }).then(function() {
            return service.AddPatient({
                Patient: patient
            });
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown");
        }, function(errors) {
            var patientsCount;
            
            service.RemovePatient({
                PatientId: patient.id
            }).then(function() {
                return GetPatientsCount();
            }).then(function(__callbackResults) {
                patientsCount = __callbackResults;
                assert.equal(patientsCount, originalPatientCount);
            }).done(function() {
                done();
            });
        });
    });
    
    it("TestAddUpdateAndRemovePatient", function(done) {
        var originalPatientCount;
        var patient;
        var comparePatient;
        var patientsCount;
        var result;
        
        GetPatientsCount().then(function(__callbackResults) {
            originalPatientCount = __callbackResults;
            patient = new customDataObject({
                BirthDate: new Date(),
                Ethnicity: "U",
                FirstName: "Test",
                id: null,
                LastName: "Patient",
                MaritalStatus: "U",
                Race: "U",
                Religion: "U",
                Sex: "U"
            });
            return service.AddPatient({
                Patient: patient
            });
        }).then(function(__callbackResults) {
            patient = __callbackResults;
            assert.notEqual(patient.id, null);
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            patient.BirthDate = new Date().addYears(-1);
            patient.Ethnicity = "W";
            patient.FirstName = "Test2";
            patient.LastName = "Patient2";
            patient.MaritalStatus = "M";
            patient.Race = "W";
            patient.Religion = "C";
            patient.Sex = "F";
            return service.UpdatePatient({
                Patient: patient
            });
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            return service.RemovePatient({
                PatientId: patient.id
            });
        }).then(function() {
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestAddAndRemovePatientEmptyOptionalFields", function(done) {
        var originalPatientCount;
        var patient;
        var comparePatient;
        var patientsCount;
        
        GetPatientsCount().then(function(__callbackResults) {
            originalPatientCount = __callbackResults;
            patient = new customDataObject({
                BirthDate: new Date(),
                Ethnicity: "",
                FirstName: "Test",
                id: guid.v4().toString(),
                LastName: "Patient",
                MaritalStatus: "",
                Race: "",
                Religion: "",
                Sex: ""
            });
            return service.AddPatient({
                Patient: patient
            });
        }).then(function(__callbackResults) {
            patient = __callbackResults;
            assert.notEqual(patient.Sex, null);
            assert.notEqual(patient.Race, null);
            assert.notEqual(patient.Religion, null);
            assert.notEqual(patient.Ethnicity, null);
            assert.notEqual(patient.MaritalStatus, null);
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            return service.RemovePatient({
                PatientId: patient.id
            });
        }).then(function() {
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestAddAndRemovePatientNoPatientId", function(done) {
        var originalPatientCount;
        var patient;
        var comparePatient;
        var patientsCount;
        
        GetPatientsCount().then(function(__callbackResults) {
            originalPatientCount = __callbackResults;
            patient = new customDataObject({
                BirthDate: new Date(),
                Ethnicity: "U",
                FirstName: "Test",
                id: null,
                LastName: "Patient",
                MaritalStatus: "U",
                Race: "U",
                Religion: "U",
                Sex: "U"
            });
            return service.AddPatient({
                Patient: patient
            });
        }).then(function(__callbackResults) {
            patient = __callbackResults;
            assert.notEqual(patient.id, null);
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            return service.RemovePatient({
                PatientId: patient.id
            });
        }).then(function() {
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestRemovePatientWithSubItems", function(done) {
        var originalPatientsCount;
        var originalPatientSummariesCount;
        var originalEncountersCount;
        var originalDocumentsCount;
        var originalRecordsCount;
        var patient;
        var patientsCount;
        var patientSummariesCount;
        var encountersCount;
        var documentsCount;
        var recordsCount;
        
        GetPatientsCount().then(function(__callbackResults) {
            originalPatientsCount = __callbackResults;
            return GetPatientSummariesCount();
        }).then(function(__callbackResults) {
            originalPatientSummariesCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            originalEncountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            originalDocumentsCount = __callbackResults;
            return GetRecordsCount();
        }).then(function(__callbackResults) {
            originalRecordsCount = __callbackResults;
            patient = new customDataObject({
                BirthDate: new Date(),
                Ethnicity: "U",
                FirstName: "Test",
                id: guid.v4().toString(),
                LastName: "Patient",
                MaritalStatus: "U",
                Race: "U",
                Religion: "U",
                Sex: "U"
            });
            return service.AddPatient({
                Patient: patient
            });
        }).then(function(__callbackResults) {
            patient = __callbackResults;
            return AddPatientSubItems(patient.id);
        }).then(function() {
            return service.RemovePatient({
                PatientId: patient.id
            });
        }).then(function() {
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            return GetPatientSummariesCount();
        }).then(function(__callbackResults) {
            patientSummariesCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            return GetRecordsCount();
        }).then(function(__callbackResults) {
            recordsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientsCount);
            assert.equal(patientSummariesCount, originalPatientSummariesCount);
            assert.equal(encountersCount, originalEncountersCount);
            assert.equal(documentsCount, originalDocumentsCount);
            assert.equal(recordsCount, originalRecordsCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestRemovePatientDoesNotExist", function(done) {
        var originalPatientsCount;
        var originalPatientSummariesCount;
        var originalEncountersCount;
        var originalDocumentsCount;
        var originalRecordsCount;
        var patientsCount;
        var patientSummariesCount;
        var encountersCount;
        var documentsCount;
        var recordsCount;
        
        GetPatientsCount().then(function(__callbackResults) {
            originalPatientsCount = __callbackResults;
            return GetPatientSummariesCount();
        }).then(function(__callbackResults) {
            originalPatientSummariesCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            originalEncountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            originalDocumentsCount = __callbackResults;
            return GetRecordsCount();
        }).then(function(__callbackResults) {
            originalRecordsCount = __callbackResults;
            return service.RemovePatient({
                PatientId: "thispatientdoesnotexist"
            });
        }).then(function() {
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            return GetPatientSummariesCount();
        }).then(function(__callbackResults) {
            patientSummariesCount = __callbackResults;
            return GetEncountersCount();
        }).then(function(__callbackResults) {
            encountersCount = __callbackResults;
            return GetDocumentsCount();
        }).then(function(__callbackResults) {
            documentsCount = __callbackResults;
            return GetRecordsCount();
        }).then(function(__callbackResults) {
            recordsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientsCount);
            assert.equal(patientSummariesCount, originalPatientSummariesCount);
            assert.equal(encountersCount, originalEncountersCount);
            assert.equal(documentsCount, originalDocumentsCount);
            assert.equal(recordsCount, originalRecordsCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestUpdatePatientDoesNotExist", function(done) {
        var patient;
        var result;
        
        patient = new customDataObject({
            BirthDate: new Date(),
            Ethnicity: "U",
            FirstName: "Test",
            id: "thispatientdoesnotexist",
            LastName: "Patient",
            MaritalStatus: "U",
            Race: "U",
            Religion: "U",
            Sex: "U"
        });
        
        service.UpdatePatient({
            Patient: patient
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
        }).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Patient not found\"");
        }, function(errors) {
            helpers.validateException(errors, "Patient not found");
            done();
        });
    });
    
    it("TestUpdatePatientNoChanges", function(done) {
        var originalPatientCount;
        var patient;
        var comparePatient;
        var patientsCount;
        var result;
        
        GetPatientsCount().then(function(__callbackResults) {
            originalPatientCount = __callbackResults;
            patient = new customDataObject({
                BirthDate: new Date(),
                Ethnicity: "U",
                FirstName: "Test",
                id: null,
                LastName: "Patient",
                MaritalStatus: "U",
                Race: "U",
                Religion: "U",
                Sex: "U"
            });
            return service.AddPatient({
                Patient: patient
            });
        }).then(function(__callbackResults) {
            patient = __callbackResults;
            assert.notEqual(patient.id, null);
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            return service.UpdatePatient({
                Patient: patient
            });
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            return service.RemovePatient({
                PatientId: patient.id
            });
        }).then(function() {
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestUpdatePatientOnlyDefaultValues", function(done) {
        var originalPatientCount;
        var patient;
        var comparePatient;
        var patientsCount;
        var updatePatient;
        var result;
        
        GetPatientsCount().then(function(__callbackResults) {
            originalPatientCount = __callbackResults;
            patient = new customDataObject({
                BirthDate: new Date(),
                Ethnicity: "U",
                FirstName: "Test",
                id: null,
                LastName: "Patient",
                MaritalStatus: "U",
                Race: "U",
                Religion: "U",
                Sex: "U"
            });
            return service.AddPatient({
                Patient: patient
            });
        }).then(function(__callbackResults) {
            patient = __callbackResults;
            assert.notEqual(patient.id, null);
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            updatePatient = new customDataObject();
            updatePatient.LastName = null;
            updatePatient.FirstName = null;
            updatePatient.BirthDate = new Date("0001-01-01T00:00:00");
            updatePatient.Sex = null;
            updatePatient.Race = null;
            updatePatient.Religion = null;
            updatePatient.Ethnicity = null;
            updatePatient.MaritalStatus = null;
            updatePatient.id = patient.id;
            return service.UpdatePatient({
                Patient: updatePatient
            });
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            return service.RemovePatient({
                PatientId: patient.id
            });
        }).then(function() {
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestAddUpdatePatientWithCustomProperties", function(done) {
        var originalPatientCount;
        var originalPatientPropertiesCount;
        var patient;
        var comparePatient;
        var patientsCount;
        var patientPropertiesCount;
        
        GetPatientsCount().then(function(__callbackResults) {
            originalPatientCount = __callbackResults;
            return GetPatientPropertiesCount();
        }).then(function(__callbackResults) {
            originalPatientPropertiesCount = __callbackResults;
            patient = new customDataObject({
                BirthDate: new Date(),
                Ethnicity: "U",
                FirstName: "Test",
                id: null,
                LastName: "Patient",
                MaritalStatus: "U",
                Race: "U",
                Religion: "U",
                Sex: "U"
            });
            patient.SetProperty("SomeProperty", "Some value");
            patient.SetProperty("SomeOtherProperty", "Some other value");
            return service.AddPatient({
                Patient: patient
            });
        }).then(function(__callbackResults) {
            patient = __callbackResults;
            assert.notEqual(patient.id, null);
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            return GetPatientPropertiesCount();
        }).then(function(__callbackResults) {
            patientPropertiesCount = __callbackResults;
            assert.equal(patientPropertiesCount, originalPatientPropertiesCount + 2);
            patient.SetProperty("SomeProperty", "Some new value");
            patient.SetProperty("SomeOtherProperty", null, "");
            patient.SetProperty("SomeNewProperty", "New value");
            return service.UpdatePatient({
                Patient: patient
            });
        }).then(function() {
            return GetPatient(patient.id);
        }).then(function(__callbackResults) {
            comparePatient = __callbackResults;
            AssertPatientsAreEqual(patient, comparePatient);
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount + 1);
            return GetPatientPropertiesCount();
        }).then(function(__callbackResults) {
            patientPropertiesCount = __callbackResults;
            assert.equal(patientPropertiesCount, originalPatientPropertiesCount + 2);
            return service.RemovePatient({
                PatientId: patient.id
            });
        }).then(function() {
            return GetPatientsCount();
        }).then(function(__callbackResults) {
            patientsCount = __callbackResults;
            assert.equal(patientsCount, originalPatientCount);
            return GetPatientPropertiesCount();
        }).then(function(__callbackResults) {
            patientPropertiesCount = __callbackResults;
            assert.equal(patientPropertiesCount, originalPatientPropertiesCount);
        }).done(function() {
            done();
        });
    });
});
