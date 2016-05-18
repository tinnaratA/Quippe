var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var assert = require("assert");

describe("ITermSearchService", function() {
    var service = quippe.getService("Quippe.ITermSearchService", {
        usesPromises: true
    });
    
    it("TestGetSuggestion", function(done) {
        var suggestion;
        
        service.GetSuggestion({
            Query: "any string"
        }).then(function(__callbackResults) {
            suggestion = __callbackResults;
            assert.equal(suggestion, "");
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchNullQuery", function(done) {
        var results;
        
        service.Search({
            Query: null,
            Culture: "en-us",
            Limit: -1
        }).then(function(__callbackResults) {
            results = __callbackResults;
            assert.equal(results, null);
        }).done(function() {
            throw new Error("Expected an exception to be thrown");
        }, function(errors) {
            done();
        });
    });
    
    it("TestSearchBlankQuery", function(done) {
        var results;
        
        service.Search({
            Query: "",
            Culture: "en-us",
            Limit: -1
        }).then(function(__callbackResults) {
            results = __callbackResults;
            assert.equal(results, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchNoResults", function(done) {
        var results;
        
        service.Search({
            Query: "thereisabsolutelynowaythatthisexists",
            Culture: "en-us",
            Limit: -1
        }).then(function(__callbackResults) {
            results = __callbackResults;
            assert.notEqual(results, null);
            assert.equal(results.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchFullMatch", function(done) {
        var results;
        
        service.Search({
            Query: "Wheelchair",
            Culture: "en-us",
            Limit: -1
        }).then(function(__callbackResults) {
            results = __callbackResults;
            assert.notEqual(results, null);
            assert.equal(results.length, 1);
            assert.equal(results[0].Medcinid, 309973);
            assert.equal(results[0].Description, "Wheelchair");
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchFullMatchDifferentCase", function(done) {
        var results;
        
        service.Search({
            Query: "wheelchair",
            Culture: "en-us",
            Limit: -1
        }).then(function(__callbackResults) {
            results = __callbackResults;
            assert.notEqual(results, null);
            assert.equal(results.length, 1);
            assert.equal(results[0].Medcinid, 309973);
            assert.equal(results[0].Description, "Wheelchair");
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchPartialMatch", function(done) {
        var results;
        
        service.Search({
            Query: "wheel",
            Culture: "en-us",
            Limit: -1
        }).then(function(__callbackResults) {
            results = __callbackResults;
            assert.notEqual(results, null);
            assert.equal(results.length, 1);
            assert.equal(results[0].Medcinid, 309973);
            assert.equal(results[0].Description, "Wheelchair");
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchMultipleWordsFullMatch", function(done) {
        var results;
        
        service.Search({
            Query: "ambulation cane",
            Culture: "en-us",
            Limit: -1
        }).then(function(__callbackResults) {
            results = __callbackResults;
            assert.notEqual(results, null);
            assert.equal(results.length, 2);
            assert.equal(results[0].Medcinid, 130172);
            assert.equal(results[1].Medcinid, 130172);
            assert.equal(results[0].Description, "ambulation required cane");
            assert.equal(results[1].Description, "Limited Ambulation With Cane");
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchMultipleWordsPartialMatch", function(done) {
        var results;
        
        service.Search({
            Query: "ambul cane",
            Culture: "en-us",
            Limit: -1
        }).then(function(__callbackResults) {
            results = __callbackResults;
            assert.notEqual(results, null);
            assert.equal(results.length, 3);
            assert.equal(results[0].Medcinid, 130172);
            assert.equal(results[1].Medcinid, 130172);
            assert.equal(results[2].Medcinid, 130172);
            assert.equal(results[0].Description, "Ambulatory with cane");
            assert.equal(results[1].Description, "ambulation required cane");
            assert.equal(results[2].Description, "Limited Ambulation With Cane");
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchWithLimit", function(done) {
        var results;
        
        service.Search({
            Query: "ambul cane",
            Culture: "en-us",
            Limit: 2
        }).then(function(__callbackResults) {
            results = __callbackResults;
            assert.notEqual(results, null);
            assert.equal(results.length, 2);
            assert.equal(results[0].Medcinid, 130172);
            assert.equal(results[1].Medcinid, 130172);
            assert.equal(results[0].Description, "Ambulatory with cane");
            assert.equal(results[1].Description, "ambulation required cane");
        }).done(function() {
            done();
        });
    });
});
