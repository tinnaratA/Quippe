var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var path = require("path");
var assert = require("assert");

Array.prototype.orderBy = function(selector) {
    var sortedArray = this.slice(0);
    var sortCallback = function(a, b) {
        if (selector(a) < selector(b))
            return -1;
        if (selector(a) > selector(b))
            return 1;
        return 0;
    };
    sortedArray.sort(sortCallback);
    return sortedArray;
};

function GetPhrasesCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "PhraseOverrides.dat"
    ), "ConceptPhrases");
}

function AssertPhraseListsAreEqual(expectedPhrases, actualPhrases) {
    var sortedExpectedPhrases = expectedPhrases.orderBy(function(p) {
        return p.Sequence;
    });
    var sortedActualPhrases = actualPhrases.orderBy(function(p) {
        return p.Sequence;
    });
    expectedPhrases = sortedExpectedPhrases;
    actualPhrases = sortedActualPhrases;
    assert.equal(actualPhrases.length, expectedPhrases.length);
    for (var i = 0; i < expectedPhrases.length; i++) {
        assert.equal(actualPhrases[i].ContextMedcinId, expectedPhrases[i].ContextMedcinId);
        assert.equal(actualPhrases[i].Culture, expectedPhrases[i].Culture);
        assert.equal(actualPhrases[i].MedcinId, expectedPhrases[i].MedcinId);
        assert.equal(actualPhrases[i].Negative, expectedPhrases[i].Negative);
        assert.equal(actualPhrases[i].Positive, expectedPhrases[i].Positive);
        assert.equal(actualPhrases[i].Usage, expectedPhrases[i].Usage);
        assert.equal(actualPhrases[i].Sequence, expectedPhrases[i].Sequence);
    }
}

describe("IPhraseEditorService", function() {
    var service = quippe.getService("Quippe.IPhraseEditorService", {
        usesPromises: true
    });
    
    it("TestGetPhrasesSingleItem", function(done) {
        var phrases;
        
        service.GetPhrases({
            MedcinId: 340167
        }).then(function(__callbackResults) {
            phrases = __callbackResults;
            assert.equal(phrases.length, 1);
            assert.equal(phrases[0].MedcinId, 340167);
            assert.equal(phrases[0].Usage, 1 | 2);
            assert.equal(phrases[0].Sequence, 0);
            assert.equal(phrases[0].ContextMedcinId, 0);
            assert.equal(phrases[0].Positive, "Reason for observation: ");
            assert.equal(phrases[0].Negative, "no Reason for observation:");
            assert.equal(phrases[0].Culture, "en-US");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPhrasesMultipleResults", function(done) {
        var phrases;
        
        service.GetPhrases({
            MedcinId: 106
        }).then(function(__callbackResults) {
            phrases = __callbackResults;
            assert.equal(phrases.length, 6);
            assert.equal(phrases[0].MedcinId, 106);
            assert.equal(phrases[0].Usage, 1 | 2);
            assert.equal(phrases[0].Sequence, 0);
            assert.equal(phrases[0].ContextMedcinId, 0);
            assert.equal(phrases[0].Positive, "Double vision");
            assert.equal(phrases[0].Negative, "no Double vision");
            assert.equal(phrases[0].Culture, "en-US");
            assert.equal(phrases[1].MedcinId, 106);
            assert.equal(phrases[1].Usage, 65543);
            assert.equal(phrases[1].Sequence, 1);
            assert.equal(phrases[1].ContextMedcinId, 0);
            assert.equal(phrases[1].Positive, "diplopia");
            assert.equal(phrases[1].Negative, "~< no");
            assert.equal(phrases[1].Culture, "en-US");
            assert.equal(phrases[2].MedcinId, 106);
            assert.equal(phrases[2].Usage, 65537);
            assert.equal(phrases[2].Sequence, 2);
            assert.equal(phrases[2].ContextMedcinId, 0);
            assert.equal(phrases[2].Positive, "double vision");
            assert.equal(phrases[2].Negative, "~< no");
            assert.equal(phrases[2].Culture, "en-US");
            assert.equal(phrases[3].MedcinId, 106);
            assert.equal(phrases[3].Usage, 65538);
            assert.equal(phrases[3].Sequence, 3);
            assert.equal(phrases[3].ContextMedcinId, 0);
            assert.equal(phrases[3].Positive, "double");
            assert.equal(phrases[3].Negative, "~< not");
            assert.equal(phrases[3].Culture, "en-US");
            assert.equal(phrases[4].MedcinId, 106);
            assert.equal(phrases[4].Usage, 65539);
            assert.equal(phrases[4].Sequence, 4);
            assert.equal(phrases[4].ContextMedcinId, 0);
            assert.equal(phrases[4].Positive, "seeing double images");
            assert.equal(phrases[4].Negative, "~< not");
            assert.equal(phrases[4].Culture, "en-US");
            assert.equal(phrases[5].MedcinId, 106);
            assert.equal(phrases[5].Usage, 65539);
            assert.equal(phrases[5].Sequence, 5);
            assert.equal(phrases[5].ContextMedcinId, 0);
            assert.equal(phrases[5].Positive, "seeing double");
            assert.equal(phrases[5].Negative, "~< not");
            assert.equal(phrases[5].Culture, "en-US");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPhrasesNoResults", function(done) {
        var phrases;
        
        service.GetPhrases({
            MedcinId: 999999
        }).then(function(__callbackResults) {
            phrases = __callbackResults;
            assert.equal(phrases, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetPhrasesOverwriteExisting", function(done) {
        var previousPhrasesCount;
        var expectedPhrases;
        var actualPhrases;
        var phrasesCount;
        
        GetPhrasesCount().then(function(__callbackResults) {
            previousPhrasesCount = __callbackResults;
            expectedPhrases = [{
                ContextMedcinId: 0,
                Culture: "en-US",
                MedcinId: 10001,
                Negative: "not testing symptom",
                Positive: "testing symptom",
                Sequence: 0,
                Usage: 2
            }, {
                ContextMedcinId: 0,
                Culture: "en-US",
                MedcinId: 10001,
                Negative: "not alternate testing symptom",
                Positive: "alternate testing symptom",
                Sequence: 1,
                Usage: 1
            }];
            return service.SetPhrases({
                List: expectedPhrases
            });
        }).then(function() {
            return service.GetPhrases({
                MedcinId: 10001
            });
        }).then(function(__callbackResults) {
            actualPhrases = __callbackResults;
            AssertPhraseListsAreEqual(expectedPhrases, actualPhrases);
            expectedPhrases[0].Negative = "not updated testing symptom";
            expectedPhrases[0].Positive = "updated testing symptom";
            expectedPhrases[0].Sequence = 2;
            expectedPhrases[0].Usage = 16;
            expectedPhrases[1].Negative = "not updated alternate testing symptom";
            expectedPhrases[1].Positive = "updated alternate testing symptom";
            expectedPhrases[1].Sequence = 3;
            expectedPhrases[1].Usage = 1048576;
            return service.SetPhrases({
                List: expectedPhrases
            });
        }).then(function() {
            return service.GetPhrases({
                MedcinId: 10001
            });
        }).then(function(__callbackResults) {
            actualPhrases = __callbackResults;
            AssertPhraseListsAreEqual(expectedPhrases, actualPhrases);
            return service.ClearPhrases({
                MedcinId: 10001
            });
        }).then(function() {
            return service.GetPhrases({
                MedcinId: 10001
            });
        }).then(function(__callbackResults) {
            actualPhrases = __callbackResults;
            assert.equal(actualPhrases, null);
            return GetPhrasesCount();
        }).then(function(__callbackResults) {
            phrasesCount = __callbackResults;
            assert.equal(phrasesCount, previousPhrasesCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetAndClearPhrases", function(done) {
        var previousPhrasesCount;
        var expectedPhrases;
        var actualPhrases;
        var phrasesCount;
        
        GetPhrasesCount().then(function(__callbackResults) {
            previousPhrasesCount = __callbackResults;
            expectedPhrases = [{
                ContextMedcinId: 0,
                Culture: "en-US",
                MedcinId: 10001,
                Negative: "not testing symptom",
                Positive: "testing symptom",
                Sequence: 0,
                Usage: 2
            }, {
                ContextMedcinId: 0,
                Culture: "en-US",
                MedcinId: 10001,
                Negative: "not alternate testing symptom",
                Positive: "alternate testing symptom",
                Sequence: 1,
                Usage: 1
            }];
            return service.SetPhrases({
                List: expectedPhrases
            });
        }).then(function() {
            return service.GetPhrases({
                MedcinId: 10001
            });
        }).then(function(__callbackResults) {
            actualPhrases = __callbackResults;
            AssertPhraseListsAreEqual(expectedPhrases, actualPhrases);
            return service.ClearPhrases({
                MedcinId: 10001
            });
        }).then(function() {
            return service.GetPhrases({
                MedcinId: 10001
            });
        }).then(function(__callbackResults) {
            actualPhrases = __callbackResults;
            assert.equal(actualPhrases, null);
            return GetPhrasesCount();
        }).then(function(__callbackResults) {
            phrasesCount = __callbackResults;
            assert.equal(phrasesCount, previousPhrasesCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetAndClearPhrasesMultipleMedcinIds", function(done) {
        var previousPhrasesCount;
        var expectedPhrases;
        var actualPhrases;
        var phrasesFor10001;
        var phrasesFor10002;
        var phrasesFor10001List;
        var phrasesFor10002List;
        var phrasesCount;
        
        GetPhrasesCount().then(function(__callbackResults) {
            previousPhrasesCount = __callbackResults;
            expectedPhrases = [
                {
                    ContextMedcinId: 0,
                    Culture: "en-US",
                    MedcinId: 10001,
                    Negative: "not testing symptom",
                    Positive: "testing symptom",
                    Sequence: 0,
                    Usage: 2
                }, 
                {
                    ContextMedcinId: 0,
                    Culture: "en-US",
                    MedcinId: 10001,
                    Negative: "not alternate testing symptom",
                    Positive: "alternate testing symptom",
                    Sequence: 1,
                    Usage: 1
                }, 
                {
                    ContextMedcinId: 0,
                    Culture: "en-US",
                    MedcinId: 10002,
                    Negative: "not another testing symptom",
                    Positive: "another testing symptom",
                    Sequence: 0,
                    Usage: 2
                }, 
                {
                    ContextMedcinId: 0,
                    Culture: "en-US",
                    MedcinId: 10002,
                    Negative: "not another alternate testing symptom",
                    Positive: "another alternate testing symptom",
                    Sequence: 1,
                    Usage: 1
                }
            ];
            return service.SetPhrases({
                List: expectedPhrases
            });
        }).then(function() {
            return service.GetPhrases({
                MedcinId: 10001
            });
        }).then(function(__callbackResults) {
            actualPhrases = __callbackResults;
            phrasesFor10001 = expectedPhrases.filter(function(p) {
                return p.MedcinId == 10001;
            });
            phrasesFor10002 = expectedPhrases.filter(function(p) {
                return p.MedcinId == 10002;
            });
            phrasesFor10001List = phrasesFor10001;
            phrasesFor10002List = phrasesFor10002;
            AssertPhraseListsAreEqual(phrasesFor10001List, actualPhrases);
            return service.GetPhrases({
                MedcinId: 10002
            });
        }).then(function(__callbackResults) {
            actualPhrases = __callbackResults;
            AssertPhraseListsAreEqual(phrasesFor10002List, actualPhrases);
            return service.ClearPhrases({
                MedcinId: 10001
            });
        }).then(function() {
            return service.ClearPhrases({
                MedcinId: 10002
            });
        }).then(function() {
            return service.GetPhrases({
                MedcinId: 10001
            });
        }).then(function(__callbackResults) {
            actualPhrases = __callbackResults;
            assert.equal(actualPhrases, null);
            return service.GetPhrases({
                MedcinId: 10002
            });
        }).then(function(__callbackResults) {
            actualPhrases = __callbackResults;
            assert.equal(actualPhrases, null);
            return GetPhrasesCount();
        }).then(function(__callbackResults) {
            phrasesCount = __callbackResults;
            assert.equal(phrasesCount, previousPhrasesCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestClearPhrasesNonExistentMedcinId", function(done) {
        var previousPhrasesCount;
        var phrasesCount;
        
        GetPhrasesCount().then(function(__callbackResults) {
            previousPhrasesCount = __callbackResults;
            return service.ClearPhrases({
                MedcinId: 999999
            });
        }).then(function() {
            return GetPhrasesCount();
        }).then(function(__callbackResults) {
            phrasesCount = __callbackResults;
            assert.equal(phrasesCount, previousPhrasesCount);
        }).done(function() {
            done();
        });
    });
});
