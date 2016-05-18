var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var assert = require("assert");
var q = require("q");

function GetDefaultPatientSummaryItems() {
    return [{
        CategoryId: 0,
        Sequence: 1,
        MedcinId: 281565,
        Prefix: "",
        Notation: ""
    }];
}

function AssertPatientSummaryListsAreEqual(expectedPatientSummaryItems, actualPatientSummaryItems) {
    assert.equal(actualPatientSummaryItems.length, expectedPatientSummaryItems.length);
    for (var i = 0; i < expectedPatientSummaryItems.length; i++) {
        assert.equal(actualPatientSummaryItems[i].CategoryId, expectedPatientSummaryItems[i].CategoryId);
        assert.equal(actualPatientSummaryItems[i].Sequence, expectedPatientSummaryItems[i].Sequence);
        assert.equal(actualPatientSummaryItems[i].MedcinId, expectedPatientSummaryItems[i].MedcinId);
        assert.equal(actualPatientSummaryItems[i].Notation, expectedPatientSummaryItems[i].Notation);
    }
}

describe("IPatientSummaryService", function() {
    var service = quippe.getService("Quippe.IPatientSummaryService", {
        usesPromises: true
    });
    
    it("TestGetSummary", function(done) {
        var patientSummaryItems;
        
        service.GetSummary({
            PatientId: "222888"
        }).then(function(__callbackResults) {
            patientSummaryItems = __callbackResults;
            AssertPatientSummaryListsAreEqual(GetDefaultPatientSummaryItems(), patientSummaryItems);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetSummaryNoResults", function(done) {
        var summary;
        
        service.GetSummary({
            PatientId: "999998"
        }).then(function(__callbackResults) {
            summary = __callbackResults;
            assert.equal(summary.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetCategories", function(done) {
        var categories;
        
        service.GetCategories({}).then(function(__callbackResults) {
            categories = __callbackResults;
            assert.equal(categories.length, 3);
            assert.equal(categories[0].id, 0);
            assert.equal(categories[0].Description, "Active Problems");
            assert.equal(categories[1].id, 1);
            assert.equal(categories[1].Description, "Allergies");
            assert.equal(categories[2].id, 2);
            assert.equal(categories[2].Description, "Current Medications");
        }).done(function() {
            done();
        });
    });
    
    it("TestSaveSummary", function(done) {
        var patientSummaryItems;
        var currentPatientSummaryItems;
        
        patientSummaryItems = [{
            CategoryId: 0,
            Sequence: 1,
            MedcinId: 3000,
            Prefix: "A",
            Notation: "This is a notation"
        }, {
            CategoryId: 1,
            Sequence: 2,
            MedcinId: 4000,
            Prefix: "R",
            Notation: "This is another notation"
        }, {
            CategoryId: 2,
            Sequence: 3,
            MedcinId: 5000,
            Prefix: "D",
            Notation: "This is one more notation"
        }];
        
        service.SaveSummary({
            PatientId: "222888",
            Items: patientSummaryItems
        }).then(function() {
            return service.GetSummary({
                PatientId: "222888"
            });
        }).then(function(__callbackResults) {
            currentPatientSummaryItems = __callbackResults;
            AssertPatientSummaryListsAreEqual(patientSummaryItems, currentPatientSummaryItems);
            return service.SaveSummary({
                PatientId: "222888",
                Items: GetDefaultPatientSummaryItems()
            });
        }).then(function() {
            return service.GetSummary({
                PatientId: "222888"
            });
        }).then(function(__callbackResults) {
            currentPatientSummaryItems = __callbackResults;
            AssertPatientSummaryListsAreEqual(GetDefaultPatientSummaryItems(), currentPatientSummaryItems);
        }).done(function() {
            done();
        });
    });
    
    it("TestSaveSummaryPatientDoesNotExist", function(done) {
        var patientSummaryItems;
        var actualPatientSummaryItems;
        
        patientSummaryItems = GetDefaultPatientSummaryItems();
        
        service.SaveSummary({
            PatientId: "999999",
            Items: patientSummaryItems
        }).then(function() {
            return service.GetSummary({
                PatientId: "999999"
            });
        }).then(function(__callbackResults) {
            actualPatientSummaryItems = __callbackResults;
            AssertPatientSummaryListsAreEqual(patientSummaryItems, actualPatientSummaryItems);
        }).done(function() {
            done();
        });
    });
});
