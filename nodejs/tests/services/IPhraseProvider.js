var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var assert = require("assert");

describe("IPhraseProvider", function() {
    var service = quippe.getService("Quippe.IPhraseProvider", {
        usesPromises: true
    });
    
    it("TestGetConceptContextId", function(done) {
        var contextId;
        
        service.GetConceptContextId({
            MedcinId: 601
        }).then(function(__callbackResults) {
            contextId = __callbackResults;
            assert.equal(contextId, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptContextIdNoResults", function(done) {
        var contextId;
        
        service.GetConceptContextId({
            MedcinId: 999999
        }).then(function(__callbackResults) {
            contextId = __callbackResults;
            assert.equal(contextId, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetCodedList", function(done) {
        var codedList;
        
        service.GetCodedList({
            ListName: "list"
        }).then(function(__callbackResults) {
            codedList = __callbackResults;
            assert.equal(codedList, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetCodedListNoResults", function(done) {
        var codedList;
        
        service.GetCodedList({
            ListName: "thisdoesnotexist"
        }).then(function(__callbackResults) {
            codedList = __callbackResults;
            assert.equal(codedList, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetCodedText", function(done) {
        var codedText;
        
        service.GetCodedText({
            ListName: "list",
            Code: "ABC"
        }).then(function(__callbackResults) {
            codedText = __callbackResults;
            assert.equal(codedText, "");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetCodedTextNoResultsBadListName", function(done) {
        var codedText;
        
        service.GetCodedText({
            ListName: "thisdoesnotexist",
            Code: "ABC"
        }).then(function(__callbackResults) {
            codedText = __callbackResults;
            assert.equal(codedText, "");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetCodedTextNoResultsBadCode", function(done) {
        var codedText;
        
        service.GetCodedText({
            ListName: "list",
            Code: "thisdoesnotexist"
        }).then(function(__callbackResults) {
            codedText = __callbackResults;
            assert.equal(codedText, "");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetString", function(done) {
        var phraseString;
        
        service.GetString({
            StringId: "string"
        }).then(function(__callbackResults) {
            phraseString = __callbackResults;
            assert.equal(phraseString, "");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetStringNoResults", function(done) {
        var phraseString;
        
        service.GetString({
            StringId: "thisdoesnotexist"
        }).then(function(__callbackResults) {
            phraseString = __callbackResults;
            assert.equal(phraseString, "");
        }).done(function() {
            done();
        });
    });
    
    it("TestSupportsContext", function(done) {
        var result;
        
        service.get_SupportsContext().then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, false);
        }).done(function() {
            done();
        });
    });
    
    it("TestSupportsCulture", function(done) {
        var result;
        
        service.SupportsCulture({
            CultureCode: "en-US"
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
        }).done(function() {
            done();
        });
    });
    
    it("TestSupportsCultureLowercase", function(done) {
        var result;
        
        service.SupportsCulture({
            CultureCode: "en-us"
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
        }).done(function() {
            done();
        });
    });
    
    it("TestSupportsCultureNonUSEnglish", function(done) {
        var result;
        
        service.SupportsCulture({
            CultureCode: "es-ES"
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, false);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhrase", function(done) {
        var phrase;
        
        service.GetConceptPhrase({
            MedcinId: 76201,
            Usage: -1
        }).then(function(__callbackResults) {
            phrase = __callbackResults;
            assert.equal(phrase.MedcinId, 76201);
            assert.equal(phrase.Usage, 1 | 2);
            assert.equal(phrase.Sequence, 0);
            assert.equal(phrase.ContextMedcinId, 0);
            assert.equal(phrase.Positive, "Ambulatory");
            assert.equal(phrase.Negative, "not Ambulatory");
            assert.equal(phrase.Culture, "en-US");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhraseMultiplePotentialResults", function(done) {
        var phrase;
        
        service.GetConceptPhrase({
            MedcinId: 91,
            Usage: -1
        }).then(function(__callbackResults) {
            phrase = __callbackResults;
            assert.equal(phrase.MedcinId, 91);
            assert.equal(phrase.Usage, 1 | 2);
            assert.equal(phrase.Sequence, 0);
            assert.equal(phrase.ContextMedcinId, 0);
            assert.equal(phrase.Positive, "Decreased vision ");
            assert.equal(phrase.Negative, "not Decreased vision");
            assert.equal(phrase.Culture, "en-US");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhraseSpecificUsage", function(done) {
        var phrase;
        
        service.GetConceptPhrase({
            MedcinId: 106,
            Usage: 4
        }).then(function(__callbackResults) {
            phrase = __callbackResults;
            assert.equal(phrase.MedcinId, 106);
            assert.equal(phrase.Usage, 65543);
            assert.equal(phrase.Sequence, 1);
            assert.equal(phrase.ContextMedcinId, 0);
            assert.equal(phrase.Positive, "diplopia");
            assert.equal(phrase.Negative, "~< no");
            assert.equal(phrase.Culture, "en-US");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhraseNonExistentMedcinId", function(done) {
        var phrase;
        
        service.GetConceptPhrase({
            MedcinId: 999999,
            Usage: -1
        }).then(function(__callbackResults) {
            phrase = __callbackResults;
            assert.equal(phrase, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhraseNonExistentUsage", function(done) {
        var phrase;
        
        service.GetConceptPhrase({
            MedcinId: 130175,
            Usage: 4
        }).then(function(__callbackResults) {
            phrase = __callbackResults;
            assert.equal(phrase, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhrasesSingleItem", function(done) {
        var phrases;
        
        service.GetConceptPhrases({
            MedcinId: 340167,
            Usage: -1
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
    
    it("TestGetConceptPhrasesMultipleResults", function(done) {
        var phrases;
        
        service.GetConceptPhrases({
            MedcinId: 106,
            Usage: -1
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
    
    it("TestGetConceptPhrasesMultipleResultsSpecificUsage", function(done) {
        var phrases;
        
        service.GetConceptPhrases({
            MedcinId: 106,
            Usage: 2
        }).then(function(__callbackResults) {
            phrases = __callbackResults;
            assert.equal(phrases.length, 5);
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
            assert.equal(phrases[2].Usage, 65538);
            assert.equal(phrases[2].Sequence, 3);
            assert.equal(phrases[2].ContextMedcinId, 0);
            assert.equal(phrases[2].Positive, "double");
            assert.equal(phrases[2].Negative, "~< not");
            assert.equal(phrases[2].Culture, "en-US");
            assert.equal(phrases[3].MedcinId, 106);
            assert.equal(phrases[3].Usage, 65539);
            assert.equal(phrases[3].Sequence, 4);
            assert.equal(phrases[3].ContextMedcinId, 0);
            assert.equal(phrases[3].Positive, "seeing double images");
            assert.equal(phrases[3].Negative, "~< not");
            assert.equal(phrases[3].Culture, "en-US");
            assert.equal(phrases[4].MedcinId, 106);
            assert.equal(phrases[4].Usage, 65539);
            assert.equal(phrases[4].Sequence, 5);
            assert.equal(phrases[4].ContextMedcinId, 0);
            assert.equal(phrases[4].Positive, "seeing double");
            assert.equal(phrases[4].Negative, "~< not");
            assert.equal(phrases[4].Culture, "en-US");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhrasesNonExistentMedcinId", function(done) {
        var phrases;
        
        service.GetConceptPhrases({
            MedcinId: 999999,
            Usage: -1
        }).then(function(__callbackResults) {
            phrases = __callbackResults;
            assert.equal(phrases, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhrasesNonExistentUsage", function(done) {
        var phrases;
        
        service.GetConceptPhrases({
            MedcinId: 106,
            Usage: 256
        }).then(function(__callbackResults) {
            phrases = __callbackResults;
            assert.equal(phrases, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhrasesMultipleMedcinIds", function(done) {
        var phrases;
        
        service.GetConceptPhrases({
            MedcinId: [340167, 106],
            Usage: -1
        }).then(function(__callbackResults) {
            phrases = __callbackResults;
            assert.equal(phrases.length, 7);
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
            assert.equal(phrases[6].MedcinId, 340167);
            assert.equal(phrases[6].Usage, 1 | 2);
            assert.equal(phrases[6].Sequence, 0);
            assert.equal(phrases[6].ContextMedcinId, 0);
            assert.equal(phrases[6].Positive, "Reason for observation: ");
            assert.equal(phrases[6].Negative, "no Reason for observation:");
            assert.equal(phrases[6].Culture, "en-US");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetConceptPhrasesMultipleMedcinIdsOneDoesNotExist", function(done) {
        var phrases;
        
        service.GetConceptPhrases({
            MedcinId: [106, 999999],
            Usage: -1
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
    
    it("TestGetConceptPhrasesMultipleMedcinIdsNoneExist", function(done) {
        var phrases;
        
        service.GetConceptPhrases({
            MedcinId: [999998, 999999],
            Usage: -1
        }).then(function(__callbackResults) {
            phrases = __callbackResults;
            assert.equal(phrases, null);
        }).done(function() {
            done();
        });
    });
});
