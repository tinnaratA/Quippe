var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var path = require("path");
var assert = require("assert");

function GetFavoritesCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "favorites.dat"
    ), "Favorites");
}

function GetBeginningFavoritesList() {
    var favorites = [
        {
            ResourceType: "term",
            ResourceId: "30228",
            Text: "Antral",
            Icon: "termTypeDx"
        }, 
        {
            ResourceType: "term",
            ResourceId: "31226",
            Text: "Otitis Media",
            Icon: "termTypeDx"
        }, 
        {
            ResourceType: "term",
            ResourceId: "80",
            Text: "skull pain",
            Icon: "termTypeSx"
        }, 
        {
            ResourceType: "term",
            ResourceId: "51",
            Text: "A Few Times a Year",
            Icon: "termTypeSx"
        }, 
        {
            ResourceType: "list",
            ResourceId: "shared:3734AA7B27954AB1943A98A201F0318E",
            Text: "Multi-System",
            Icon: "document_preferences"
        }, 
        {
            ResourceType: "term",
            ResourceId: "30222",
            Text: "Peptic Ulcer Duodenal",
            Icon: "termTypeDx"
        }, 
        {
            ResourceType: "term",
            ResourceId: "281565",
            Text: "headaches several times each week",
            Icon: "termTypeSx"
        }, 
        {
            ResourceType: "image",
            ResourceId: "medcinimage:101",
            Text: "skin hands dermatology palms palmar right bottom",
            Icon: "pencil"
        }, 
        {
            ResourceType: "term",
            ResourceId: "32881",
            Text: "asthma",
            Icon: "termTypeDx"
        }
    ];
    return favorites;
}

function AssertFavoritesListsAreEqual(expectedFavorites, actualFavorites) {
    assert.equal(actualFavorites.length, expectedFavorites.length);
    for (var i = 0; i < expectedFavorites.length; i++) {
        assert.equal(actualFavorites[i].ResourceType, expectedFavorites[i].ResourceType);
        assert.equal(actualFavorites[i].ResourceId, expectedFavorites[i].ResourceId);
        assert.equal(actualFavorites[i].Text, expectedFavorites[i].Text);
        assert.equal(actualFavorites[i].Icon, expectedFavorites[i].Icon);
    }
}

describe("IFavoritesService", function() {
    var service = quippe.getService("Quippe.IFavoritesService", {
        usesPromises: true
    });
    
    it("TestGetFavorites", function(done) {
        var expectedFavorites;
        var actualFavorites;
        
        expectedFavorites = GetBeginningFavoritesList();
        
        service.GetFavorites({}).then(function(__callbackResults) {
            actualFavorites = __callbackResults;
            AssertFavoritesListsAreEqual(expectedFavorites, actualFavorites);
        }).done(function() {
            done();
        });
    });
    
    it("TestAddAndDelete", function(done) {
        var expectedFavorites;
        var newFavorite;
        var favorites;
        
        expectedFavorites = GetBeginningFavoritesList();
        newFavorite = {
            ResourceType: "term",
            ResourceId: "999999",
            Text: "Testing new favorite",
            Icon: "termTypeDx"
        };
        
        service.Add({
            ResourceType: "term",
            ResourceId: "999999",
            Text: "Testing new favorite",
            Icon: "termTypeDx"
        }).then(function() {
            return service.GetFavorites({});
        }).then(function(__callbackResults) {
            favorites = __callbackResults;
            expectedFavorites.push(newFavorite);
            AssertFavoritesListsAreEqual(expectedFavorites, favorites);
            expectedFavorites.splice(expectedFavorites.length - 1, 1);
            return service.Delete({
                ResourceType: "term",
                ResourceId: "999999"
            });
        }).then(function() {
            return service.GetFavorites({});
        }).then(function(__callbackResults) {
            favorites = __callbackResults;
            AssertFavoritesListsAreEqual(expectedFavorites, favorites);
        }).done(function() {
            done();
        });
    });
    
    it("TestDeleteDoesNotExist", function(done) {
        var previousFavoritesCount;
        var favoritesCount;
        
        GetFavoritesCount().then(function(__callbackResults) {
            previousFavoritesCount = __callbackResults;
            return service.Delete({
                ResourceType: "term",
                ResourceId: "999999"
            });
        }).then(function() {
            return GetFavoritesCount();
        }).then(function(__callbackResults) {
            favoritesCount = __callbackResults;
            assert.equal(favoritesCount, previousFavoritesCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestAddAlreadyExists", function(done) {
        service.Add({
            ResourceType: "term",
            ResourceId: "30228",
            Text: "Antral",
            Icon: "termTypeDx"
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown");
        }, function(errors) {
            done();
        });
    });
    
    it("TestSetSequenceBefore", function(done) {
        var expectedFavorites;
        var movingFavorite;
        var favorites;
        
        expectedFavorites = GetBeginningFavoritesList();
        
        service.SetSequence({
            SourceType: "term",
            SourceId: "51",
            TargetType: "term",
            TargetId: "31226",
            Relationship: "before"
        }).then(function() {
            movingFavorite = expectedFavorites[3];
            expectedFavorites.splice(3, 1);
            expectedFavorites.splice(1, 0, movingFavorite);
            return service.GetFavorites({});
        }).then(function(__callbackResults) {
            favorites = __callbackResults;
            AssertFavoritesListsAreEqual(expectedFavorites, favorites);
            return service.SetSequence({
                SourceType: "term",
                SourceId: "51",
                TargetType: "list",
                TargetId: "shared:3734AA7B27954AB1943A98A201F0318E",
                Relationship: "before"
            });
        }).then(function() {
            expectedFavorites = GetBeginningFavoritesList();
            return service.GetFavorites({});
        }).then(function(__callbackResults) {
            favorites = __callbackResults;
            AssertFavoritesListsAreEqual(expectedFavorites, favorites);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetSequenceAfter", function(done) {
        var expectedFavorites;
        var movingFavorite;
        var favorites;
        
        expectedFavorites = GetBeginningFavoritesList();
        
        service.SetSequence({
            SourceType: "term",
            SourceId: "51",
            TargetType: "term",
            TargetId: "30228",
            Relationship: "after"
        }).then(function() {
            movingFavorite = expectedFavorites[3];
            expectedFavorites.splice(3, 1);
            expectedFavorites.splice(1, 0, movingFavorite);
            return service.GetFavorites({});
        }).then(function(__callbackResults) {
            favorites = __callbackResults;
            AssertFavoritesListsAreEqual(expectedFavorites, favorites);
            return service.SetSequence({
                SourceType: "term",
                SourceId: "51",
                TargetType: "term",
                TargetId: "80",
                Relationship: "after"
            });
        }).then(function() {
            expectedFavorites = GetBeginningFavoritesList();
            return service.GetFavorites({});
        }).then(function(__callbackResults) {
            favorites = __callbackResults;
            AssertFavoritesListsAreEqual(expectedFavorites, favorites);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetSequenceTargetDoesNotExist", function(done) {
        var result;
        var expectedFavorites;
        var actualFavorites;
        
        service.SetSequence({
            SourceType: "term",
            SourceId: "30228",
            TargetType: "term",
            TargetId: "999999",
            Relationship: "after"
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, false);
            expectedFavorites = GetBeginningFavoritesList();
            return service.GetFavorites({});
        }).then(function(__callbackResults) {
            actualFavorites = __callbackResults;
            AssertFavoritesListsAreEqual(expectedFavorites, actualFavorites);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetSequenceSourceDoesNotExist", function(done) {
        var result;
        var expectedFavorites;
        var actualFavorites;
        
        service.SetSequence({
            SourceType: "term",
            SourceId: "999999",
            TargetType: "term",
            TargetId: "30228",
            Relationship: "after"
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, false);
            expectedFavorites = GetBeginningFavoritesList();
            return service.GetFavorites({});
        }).then(function(__callbackResults) {
            actualFavorites = __callbackResults;
            AssertFavoritesListsAreEqual(expectedFavorites, actualFavorites);
        }).done(function() {
            done();
        });
    });
});
