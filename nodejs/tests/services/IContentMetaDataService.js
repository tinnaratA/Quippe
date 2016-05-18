var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var path = require("path");
var arrayPrototypeFind = require("array.prototype.find");
var assert = require("assert");

function GetPropertiesCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "ContentLibrary.dat"
    ), "ItemProperties");
}

function AssertItemsContains28A46F14889A4FED9CABAFC4547C6058(items) {
    var item = items.find(function(i) {
        return i.id == "admin:28A46F14889A4FED9CABAFC4547C6058";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin");
    assert.equal(item.TypeName, "element");
    assert.equal(item.Name, "macro2");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 167);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsContains2B996160AF3D468B96FA3CF7B8ACC074(items) {
    var item = items.find(function(i) {
        return i.id == "admin:2B996160AF3D468B96FA3CF7B8ACC074";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin");
    assert.equal(item.TypeName, "element");
    assert.equal(item.Name, "macro1");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 167);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsContains1DF035ACFFB94C9DAE77CAE4C8492480(items) {
    var item = items.find(function(i) {
        return i.id == "shared:1DF035ACFFB94C9DAE77CAE4C8492480";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "shared:357E82A1D98E4CB9A6BD33F9B2CF5F88");
    assert.equal(item.TypeName, "template");
    assert.equal(item.Name, "Encounter - FP (format)");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 39);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsContains439E78CC34FA44EF8C48824C5B3C50DB(items) {
    var item = items.find(function(i) {
        return i.id == "shared:439E78CC34FA44EF8C48824C5B3C50DB";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "shared:357E82A1D98E4CB9A6BD33F9B2CF5F88");
    assert.equal(item.TypeName, "template");
    assert.equal(item.Name, "Basic Note - Two Column");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 39);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

describe("IContentMetaDataService", function() {
    var service = quippe.getService("Quippe.IContentMetaDataService", {
        usesPromises: true
    });
    
    it("TestSetPropertyNonExistentItem", function(done) {
        service.SetProperty({
            ItemId: "admin:thisitemdoesnotexist",
            Name: "property",
            Value: "value"
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Item admin:thisitemdoesnotexist does not exist.\"");
        }, function(errors) {
            helpers.validateException(errors, "Item admin:thisitemdoesnotexist does not exist.");
            done();
        });
    });
    
    it("TestSetPropertyNullPropertyName", function(done) {
        service.SetProperty({
            ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
            Name: null,
            Value: "Null property value"
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown");
        }, function(errors) {
            done();
        });
    });
    
    it("TestSetPropertiesNonExistentItem", function(done) {
        service.SetProperties({
            ItemId: "admin:thisitemdoesnotexist",
            Properties: {
                "Property": "Value"
            }
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Item admin:thisitemdoesnotexist does not exist.\"");
        }, function(errors) {
            helpers.validateException(errors, "Item admin:thisitemdoesnotexist does not exist.");
            done();
        });
    });
    
    it("TestGetProperties", function(done) {
        var properties;
        var expectedProperties;
        
        service.GetProperties({
            ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            expectedProperties = {
                "FirstProperty": "This is a property value",
                "SecondProperty": "Another value",
                "ThirdProperty": "One more for the tests"
            };
            helpers.assertDictionariesAreEqual(expectedProperties, properties);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPropertiesNonExistentItem", function(done) {
        var properties;
        
        service.GetProperties({
            ItemId: "admin:thisitemdoesnotexist"
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            assert.equal(properties, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetPropertyNewProperty", function(done) {
        var oldPropertiesCount;
        var propertiesCount;
        var propertyValue;
        
        GetPropertiesCount().then(function(__callbackResults) {
            oldPropertiesCount = __callbackResults;
            return service.SetProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "AnotherProperty",
                Value: "Another property value"
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount + 1);
            return service.GetProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "AnotherProperty"
            });
        }).then(function(__callbackResults) {
            propertyValue = __callbackResults;
            assert.equal(propertyValue, "Another property value");
            return service.DeleteProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "AnotherProperty"
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetPropertyExistingProperty", function(done) {
        var oldPropertiesCount;
        var propertiesCount;
        var propertyValue;
        
        GetPropertiesCount().then(function(__callbackResults) {
            oldPropertiesCount = __callbackResults;
            return service.SetProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "FirstProperty",
                Value: "This is a new property value"
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount);
            return service.GetProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "FirstProperty"
            });
        }).then(function(__callbackResults) {
            propertyValue = __callbackResults;
            assert.equal(propertyValue, "This is a new property value");
            return service.SetProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "FirstProperty",
                Value: "This is a property value"
            });
        }).then(function() {
            return service.GetProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "FirstProperty"
            });
        }).then(function(__callbackResults) {
            propertyValue = __callbackResults;
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount);
            assert.equal(propertyValue, "This is a property value");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetProperty", function(done) {
        var propertyValue;
        
        service.GetProperty({
            ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
            Name: "FirstProperty"
        }).then(function(__callbackResults) {
            propertyValue = __callbackResults;
            assert.equal(propertyValue, "This is a property value");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPropertyNonExistentItem", function(done) {
        var propertyValue;
        
        service.GetProperty({
            ItemId: "admin:thisitemdoesnotexist",
            Name: "FirstProperty"
        }).then(function(__callbackResults) {
            propertyValue = __callbackResults;
            assert.equal(propertyValue, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetPropertyNonExistentPropertyName", function(done) {
        var propertyValue;
        
        service.GetProperty({
            ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
            Name: "ThisPropertyDoesNotExist"
        }).then(function(__callbackResults) {
            propertyValue = __callbackResults;
            assert.equal(propertyValue, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetPropertiesAllNewProperties", function(done) {
        var oldPropertiesCount;
        var propertiesCount;
        var properties;
        var expectedProperties;
        
        GetPropertiesCount().then(function(__callbackResults) {
            oldPropertiesCount = __callbackResults;
            return service.SetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Properties: {
                    "AnotherProperty": "Another property value",
                    "YetAnotherProperty": "Yet another property value",
                    "OneMoreProperty": "One more property value"
                }
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount + 3);
            return service.GetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
            });
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            expectedProperties = {
                "FirstProperty": "This is a property value",
                "SecondProperty": "Another value",
                "ThirdProperty": "One more for the tests",
                "AnotherProperty": "Another property value",
                "YetAnotherProperty": "Yet another property value",
                "OneMoreProperty": "One more property value"
            };
            helpers.assertDictionariesAreEqual(expectedProperties, properties);
            return service.DeleteProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "AnotherProperty"
            });
        }).then(function() {
            return service.DeleteProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "YetAnotherProperty"
            });
        }).then(function() {
            return service.DeleteProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "OneMoreProperty"
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestSetPropertiesAllExistingProperties", function(done) {
        var oldPropertiesCount;
        var newProperties;
        var propertiesCount;
        var properties;
        
        GetPropertiesCount().then(function(__callbackResults) {
            oldPropertiesCount = __callbackResults;
            newProperties = {
                "FirstProperty": "New value for FirstProperty",
                "SecondProperty": "New value for SecondProperty",
                "ThirdProperty": "New value for ThirdProperty"
            };
            return service.SetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Properties: newProperties
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount);
            return service.GetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
            });
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            helpers.assertDictionariesAreEqual(newProperties, properties);
            return service.SetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Properties: {
                    "FirstProperty": "This is a property value",
                    "SecondProperty": "Another value",
                    "ThirdProperty": "One more for the tests"
                }
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount);
            return service.GetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
            });
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            assert.equal(properties["FirstProperty"], "This is a property value");
            assert.equal(properties["SecondProperty"], "Another value");
            assert.equal(properties["ThirdProperty"], "One more for the tests");
        }).done(function() {
            done();
        });
    });
    
    it("TestSetPropertiesMixNewAndExistingProperties", function(done) {
        var oldPropertiesCount;
        var newProperties;
        var propertiesCount;
        var properties;
        
        GetPropertiesCount().then(function(__callbackResults) {
            oldPropertiesCount = __callbackResults;
            newProperties = {
                "FirstProperty": "New value for FirstProperty",
                "SecondProperty": "New value for SecondProperty",
                "ThirdProperty": "New value for ThirdProperty",
                "AnotherProperty": "Another property value",
                "YetAnotherProperty": "Yet another property value",
                "OneMoreProperty": "One more property value"
            };
            return service.SetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Properties: newProperties
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount + 3);
            return service.GetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
            });
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            helpers.assertDictionariesAreEqual(newProperties, properties);
            return service.DeleteProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "AnotherProperty"
            });
        }).then(function() {
            return service.DeleteProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "YetAnotherProperty"
            });
        }).then(function() {
            return service.DeleteProperty({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Name: "OneMoreProperty"
            });
        }).then(function() {
            return service.SetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Properties: {
                    "FirstProperty": "This is a property value",
                    "SecondProperty": "Another value",
                    "ThirdProperty": "One more for the tests"
                }
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount);
            return service.GetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
            });
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            assert.equal(properties["FirstProperty"], "This is a property value");
            assert.equal(properties["SecondProperty"], "Another value");
            assert.equal(properties["ThirdProperty"], "One more for the tests");
        }).done(function() {
            done();
        });
    });
    
    it("TestClearProperties", function(done) {
        var oldPropertiesCount;
        var propertiesCount;
        var properties;
        
        GetPropertiesCount().then(function(__callbackResults) {
            oldPropertiesCount = __callbackResults;
            return service.ClearProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount - 3);
            return service.GetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
            });
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            assert.equal(properties, null);
            return service.SetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074",
                Properties: {
                    "FirstProperty": "This is a property value",
                    "SecondProperty": "Another value",
                    "ThirdProperty": "One more for the tests"
                }
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount);
            return service.GetProperties({
                ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
            });
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            assert.equal(properties["FirstProperty"], "This is a property value");
            assert.equal(properties["SecondProperty"], "Another value");
            assert.equal(properties["ThirdProperty"], "One more for the tests");
        }).done(function() {
            done();
        });
    });
    
    it("TestClearPropertiesNonExistentItem", function(done) {
        var oldPropertiesCount;
        var propertiesCount;
        
        GetPropertiesCount().then(function(__callbackResults) {
            oldPropertiesCount = __callbackResults;
            return service.ClearProperties({
                ItemId: "admin:thisitemdoesnotexist"
            });
        }).then(function() {
            return GetPropertiesCount();
        }).then(function(__callbackResults) {
            propertiesCount = __callbackResults;
            assert.equal(propertiesCount, oldPropertiesCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetAvailablePropertiesForTemplate", function(done) {
        var availableProperties;
        
        service.GetDefaultProperties({
            ItemType: "template"
        }).then(function(__callbackResults) {
            availableProperties = __callbackResults;
            assert.equal(availableProperties.length, 4);
            assert.equal(availableProperties[0].Name, "Author");
            assert.equal(availableProperties[1].Name, "Description");
            assert.equal(availableProperties[2].Name, "Copyright");
            assert.equal(availableProperties[3].Name, "Version");
        }).done(function() {
            done();
        });
    });
    
    it("TestGetAvailablePropertiesForFolder", function(done) {
        var properties;
        
        service.GetDefaultProperties({
            ItemType: "folder"
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            assert.equal(properties, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetAvailablePropertiesNonExistentItemType", function(done) {
        var properties;
        
        service.GetDefaultProperties({
            ItemType: "thistypedoesnotexist"
        }).then(function(__callbackResults) {
            properties = __callbackResults;
            assert.equal(properties, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyNullPropertyName", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: null,
            Value: "This is a property value",
            FilterType: 0
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 1);
            AssertItemsContains2B996160AF3D468B96FA3CF7B8ACC074(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyNullPropertyValue", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: "FourthProperty",
            Value: null,
            FilterType: 0
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 1);
            AssertItemsContains439E78CC34FA44EF8C48824C5B3C50DB(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyFilterTypeEqualsMatches", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: "FirstProperty",
            Value: "This is a property value",
            FilterType: 0
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 1);
            AssertItemsContains2B996160AF3D468B96FA3CF7B8ACC074(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyFilterTypeEqualsNoMatches", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: "ThirdProperty",
            Value: "thiswillnotmatch",
            FilterType: 0
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyFilterTypeStartsWithMatches", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: "SecondProperty",
            Value: "another",
            FilterType: 1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 2);
            AssertItemsContains2B996160AF3D468B96FA3CF7B8ACC074(items);
            AssertItemsContains439E78CC34FA44EF8C48824C5B3C50DB(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyFilterTypeStartsWithNoMatches", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: "ThirdProperty",
            Value: "thiswillnotmatch",
            FilterType: 1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyFilterTypeEndsWithMatches", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: "SecondProperty",
            Value: "value",
            FilterType: 2
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 2);
            AssertItemsContains2B996160AF3D468B96FA3CF7B8ACC074(items);
            AssertItemsContains439E78CC34FA44EF8C48824C5B3C50DB(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyFilterTypeEndsWithNoMatches", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: "ThirdProperty",
            Value: "thiswillnotmatch",
            FilterType: 2
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyFilterTypeContainsMatches", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: "ThirdProperty",
            Value: "third",
            FilterType: 3
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 2);
            AssertItemsContains28A46F14889A4FED9CABAFC4547C6058(items);
            AssertItemsContains1DF035ACFFB94C9DAE77CAE4C8492480(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestFindItemsByPropertyFilterTypeContainsNoMatches", function(done) {
        var items;
        
        service.FindItemsByProperty({
            Name: "ThirdProperty",
            Value: "thiswillnotmatch",
            FilterType: 3
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items, null);
        }).done(function() {
            done();
        });
    });
});
