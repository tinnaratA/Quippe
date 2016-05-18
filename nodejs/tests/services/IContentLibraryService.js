var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");
var path = require("path");
var arrayPrototypeFind = require("array.prototype.find");
var assert = require("assert");
var guid = require("node-uuid");

String.prototype.replaceAll = function(search, replace) {
    var escapeRegex = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;
    var replaceRegex = new RegExp(search.replace(escapeRegex, "\\\\$&"), "gi");
    return this.replace(replaceRegex, replace);
};

function GetItemsCount() {
    return helpers.getTableRowCount(path.join(
        quippe.config.dataDirectory, 
        "UserData", 
        "admin", 
        "ContentLibrary.dat"
    ), "Items");
}

function AssertItemsContainsAC911AE5A8234B6B9D45FD760A9A7614(items) {
    var item = items.find(function(i) {
        return i.id == "admin:AC911AE5A8234B6B9D45FD760A9A7614";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin");
    assert.equal(item.TypeName, "folder");
    assert.equal(item.Name, "Merge Finding Tests");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 23);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(2, item.SubCount);
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

function AssertItemsContains8FB6183BFC174CA0A4CF2B6D700307DD(items) {
    var item = items.find(function(i) {
        return i.id == "admin:8FB6183BFC174CA0A4CF2B6D700307DD";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin");
    assert.equal(item.TypeName, "list");
    assert.equal(item.Name, "9000 Findings");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 167);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsContains19E83EAFDA2F4410A794FE0FEEA05A20(items) {
    var item = items.find(function(i) {
        return i.id == "admin:19E83EAFDA2F4410A794FE0FEEA05A20";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin");
    assert.equal(item.TypeName, "template");
    assert.equal(item.Name, "Lyme Template");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 39);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsContainsCDFFC6793A614A82ADD95ECD4B34C59F(items) {
    var item = items.find(function(i) {
        return i.id == "admin:CDFFC6793A614A82ADD95ECD4B34C59F";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin");
    assert.equal(item.TypeName, "element");
    assert.equal(item.Name, "MU_BMI_Screening");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 167);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsContains28C3F2FA38E84948B3BD655B94000904(items) {
    var item = items.find(function(i) {
        return i.id == "admin:28C3F2FA38E84948B3BD655B94000904";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin:8FED0195547D4891AEBC5360F75C9F6C");
    assert.equal(item.TypeName, "list");
    assert.equal(item.Name, "Many_Findings_1");
    assert.equal(item.KeyWords, "stuff more");
    assert.equal(item.Attributes, 167);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsContains38B9CE2DB8994500B26B677C4137D056(items) {
    var item = items.find(function(i) {
        return i.id == "admin:38B9CE2DB8994500B26B677C4137D056";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin");
    assert.equal(item.TypeName, "list");
    assert.equal(item.Name, "Lyme stuff");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 167);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsContainsAD70AFF819B045BBAD7D066B25B6ADEA(items) {
    var item = items.find(function(i) {
        return i.id == "admin:AD70AFF819B045BBAD7D066B25B6ADEA";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin:AC911AE5A8234B6B9D45FD760A9A7614");
    assert.equal(item.TypeName, "list");
    assert.equal(item.Name, "Many Findings 1");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 167);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsContainsB76073E84A714881AA2D69BEA320997C(items) {
    var item = items.find(function(i) {
        return i.id == "admin:B76073E84A714881AA2D69BEA320997C";
    });
    assert.notEqual(item, null);
    assert.equal(item.ParentId, "admin:AC911AE5A8234B6B9D45FD760A9A7614");
    assert.equal(item.TypeName, "list");
    assert.equal(item.Name, "Ten x 2 ^ 15 - 1 FT Field");
    assert.equal(item.KeyWords, "");
    assert.equal(item.Attributes, 167);
    assert.equal(item.MimeType, "text/xml");
    assert.equal(0, item.SubCount);
}

function AssertItemsAreEqual(expectedItem, actualItem) {
    assert.equal(actualItem.Attributes, expectedItem.Attributes);
    assert.equal(actualItem.id, expectedItem.id);
    assert.equal(actualItem.KeyWords, expectedItem.KeyWords);
    assert.equal(actualItem.MimeType, expectedItem.MimeType);
    assert.equal(actualItem.Name, expectedItem.Name);
    assert.equal(actualItem.ParentId, expectedItem.ParentId);
    assert.equal(actualItem.TypeName, expectedItem.TypeName);
}

describe("IContentLibraryService", function() {
    var service = quippe.getService("Quippe.IContentLibraryService", {
        usesPromises: true
    });
    
    it("TestInsertMissingKeywords", function(done) {
        var previousItemsCount;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            return service.Insert({
                Item: {
                    id: guid.v4().toString(),
                    Attributes: -1,
                    MimeType: "text/test",
                    Name: "Should Not Succeed",
                    ParentId: "someparent",
                    TypeName: "element"
                },
                Data: "just a bunch of text"
            });
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Abort due to constraint violation\r\nItems.KeyWords may not be NULL\"");
        }, function(errors) {
            helpers.validateException(errors, "Abort due to constraint violation\r\nItems.KeyWords may not be NULL");
            var currentItemsCount;
            
            GetItemsCount().then(function(__callbackResults) {
                currentItemsCount = __callbackResults;
                assert.equal(currentItemsCount, previousItemsCount);
            }).done(function() {
                done();
            });
        });
    });
    
    it("TestGetItems", function(done) {
        var items;
        
        service.GetItems({
            ParentId: "admin",
            TypeName: "",
            Attributes: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 30);
            AssertItemsContains2B996160AF3D468B96FA3CF7B8ACC074(items);
            AssertItemsContains8FB6183BFC174CA0A4CF2B6D700307DD(items);
            AssertItemsContains19E83EAFDA2F4410A794FE0FEEA05A20(items);
            AssertItemsContainsCDFFC6793A614A82ADD95ECD4B34C59F(items);
            AssertItemsContainsAC911AE5A8234B6B9D45FD760A9A7614(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemsByTypeName", function(done) {
        var items;
        
        service.GetItems({
            ParentId: "admin",
            TypeName: "element",
            Attributes: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 11);
            AssertItemsContains2B996160AF3D468B96FA3CF7B8ACC074(items);
            AssertItemsContainsCDFFC6793A614A82ADD95ECD4B34C59F(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemsByParent", function(done) {
        var items;
        
        service.GetItems({
            ParentId: "admin:AC911AE5A8234B6B9D45FD760A9A7614",
            TypeName: "",
            Attributes: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 2);
            AssertItemsContainsAD70AFF819B045BBAD7D066B25B6ADEA(items);
            AssertItemsContainsB76073E84A714881AA2D69BEA320997C(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemsWithAttributes", function(done) {
        var items;
        
        service.GetItems({
            ParentId: "admin",
            TypeName: "",
            Attributes: 128
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 19);
            AssertItemsContains2B996160AF3D468B96FA3CF7B8ACC074(items);
            AssertItemsContains8FB6183BFC174CA0A4CF2B6D700307DD(items);
            AssertItemsContainsCDFFC6793A614A82ADD95ECD4B34C59F(items);
            assert.equal(items.find(function(i) {
                return i.id == "admin:19E83EAFDA2F4410A794FE0FEEA05A20";
            }), null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemsWithAttributesNoResults", function(done) {
        var items;
        
        service.GetItems({
            ParentId: "admin:AC911AE5A8234B6B9D45FD760A9A7614",
            TypeName: "",
            Attributes: 64
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemsByTypeNameNoResults", function(done) {
        var items;
        
        service.GetItems({
            ParentId: "admin:AC911AE5A8234B6B9D45FD760A9A7614",
            TypeName: "nothinghere",
            Attributes: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemsByParentNoResults", function(done) {
        var items;
        
        service.GetItems({
            ParentId: "admin:nothinghere",
            TypeName: "",
            Attributes: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItem", function(done) {
        var item;
        
        service.GetItem({
            ItemId: "admin:2B996160AF3D468B96FA3CF7B8ACC074"
        }).then(function(__callbackResults) {
            item = __callbackResults;
            assert.notEqual(item, null);
            AssertItemsContains2B996160AF3D468B96FA3CF7B8ACC074([item]);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemNoResults", function(done) {
        var item;
        
        service.GetItem({
            ItemId: "admin:nothinghere"
        }).then(function(__callbackResults) {
            item = __callbackResults;
            assert.equal(item, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetTemplateItemContent", function(done) {
        var content;
        
        service.GetItemContent({
            id: "admin:19E83EAFDA2F4410A794FE0FEEA05A20"
        }).then(function(__callbackResults) {
            content = __callbackResults;
            assert.equal(content.replaceAll("\r", ""), helpers.getExpectedResultsText("ContentLibraryService", "Item19E83EAFDA2F4410A794FE0FEEA05A20.txt").replaceAll("\r", ""));
        }).done(function() {
            done();
        });
    });
    
    it("TestGetContentNoResults", function(done) {
        var content;
        
        service.GetItemContent({
            id: "admin:nothinghere"
        }).then(function(__callbackResults) {
            content = __callbackResults;
            assert.equal(content, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetImageItemBytes", function(done) {
        var content;
        var compareContent;
        
        service.GetItemBytes({
            id: "admin:589DB72267FB46FB81F655D0C9E5C16B"
        }).then(function(__callbackResults) {
            content = __callbackResults;
            compareContent = helpers.getExpectedResultsBytes("ContentLibraryService", "Item589DB72267FB46FB81F655D0C9E5C16B.dat");
            assert.notEqual(content, null);
            for (var i = 0; i < content.length - 1; i++) {
                assert.equal(content[i], compareContent[i]);
            }
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemBytesNoResults", function(done) {
        var content;
        
        service.GetItemBytes({
            id: "admin:nothinghere"
        }).then(function(__callbackResults) {
            content = __callbackResults;
            assert.equal(content, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetTypes", function(done) {
        var types;
        
        service.GetTypes({}).then(function(__callbackResults) {
            types = __callbackResults;
            assert.equal(types.length, 8);
            assert.equal(types[3].TypeName, "library");
            assert.equal(types[1].TypeName, "folder");
            assert.equal(types[6].TypeName, "template");
            assert.equal(types[4].TypeName, "list");
            assert.equal(types[0].TypeName, "element");
            assert.equal(types[7].TypeName, "theme");
            assert.equal(types[2].TypeName, "image");
            assert.equal(types[5].TypeName, "system");
            assert.equal(types[3].MimeType, "");
            assert.equal(types[1].MimeType, "");
            assert.equal(types[6].MimeType, "text/xml");
            assert.equal(types[4].MimeType, "text/xml");
            assert.equal(types[0].MimeType, "text/xml");
            assert.equal(types[7].MimeType, "text/css");
            assert.equal(types[2].MimeType, "image/png");
            assert.equal(types[5].MimeType, "");
            assert.equal(types[3].Attributes, 65553);
            assert.equal(types[1].Attributes, 23);
            assert.equal(types[6].Attributes, 39);
            assert.equal(types[4].Attributes, 167);
            assert.equal(types[0].Attributes, 167);
            assert.equal(types[7].Attributes, 39);
            assert.equal(types[2].Attributes, 167);
            assert.equal(types[5].Attributes, 65536);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetTypeInfo", function(done) {
        var typeInfo;
        
        service.GetTypeInfo({
            TypeName: "element"
        }).then(function(__callbackResults) {
            typeInfo = __callbackResults;
            assert.equal(typeInfo.TypeName, "element");
            assert.equal(typeInfo.MimeType, "text/xml");
            assert.equal(typeInfo.Attributes, 167);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetTypeInfoNoResults", function(done) {
        var typeInfo;
        
        service.GetTypeInfo({
            TypeName: "nothing"
        }).then(function(__callbackResults) {
            typeInfo = __callbackResults;
            assert.equal(typeInfo, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchByKeywords", function(done) {
        var items;
        
        service.Search({
            KeyWords: "stuff",
            TypeName: "",
            Attributes: -1,
            MaxResults: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 2);
            AssertItemsContains28C3F2FA38E84948B3BD655B94000904(items);
            AssertItemsContains38B9CE2DB8994500B26B677C4137D056(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchByKeywordsAndType", function(done) {
        var items;
        
        service.Search({
            KeyWords: "stuff",
            TypeName: "list",
            Attributes: -1,
            MaxResults: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 2);
            AssertItemsContains28C3F2FA38E84948B3BD655B94000904(items);
            AssertItemsContains38B9CE2DB8994500B26B677C4137D056(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchByKeywordsTypeAndAttributes", function(done) {
        var items;
        
        service.Search({
            KeyWords: "stuff",
            TypeName: "list",
            Attributes: 128,
            MaxResults: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 2);
            AssertItemsContains28C3F2FA38E84948B3BD655B94000904(items);
            AssertItemsContains38B9CE2DB8994500B26B677C4137D056(items);
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchByKeywordsWithMaxResults", function(done) {
        var items;
        
        service.Search({
            KeyWords: "stuff",
            TypeName: "list",
            Attributes: 128,
            MaxResults: 1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 1);
            if (items.find(function(i) {
                return i.id == "28C3F2FA38E84948B3BD655B94000904";
            }) != null) {
                AssertItemsContains28C3F2FA38E84948B3BD655B94000904(items);
            }
            else {
                AssertItemsContains38B9CE2DB8994500B26B677C4137D056(items);
            }
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchByKeywordsNoResults", function(done) {
        var items;
        
        service.Search({
            KeyWords: "thereisnothingforthiskeyword",
            TypeName: "",
            Attributes: -1,
            MaxResults: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchByKeywordsAndTypeNoResults", function(done) {
        var items;
        
        service.Search({
            KeyWords: "stuff",
            TypeName: "nothinghere",
            Attributes: -1,
            MaxResults: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestSearchByKeywordsTypeAndAttributesNoResults", function(done) {
        var items;
        
        service.Search({
            KeyWords: "stuff",
            TypeName: "list",
            Attributes: 65536,
            MaxResults: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.equal(items.length, 0);
        }).done(function() {
            done();
        });
    });
    
    it("TestInsertUpdateAndDelete", function(done) {
        var previousItemsCount;
        var newItem;
        var insertedItem;
        var retrievedItem;
        var itemContent;
        var result;
        var currentItemsCount;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            newItem = {
                Attributes: 32 | 2 | 1 | 4,
                id: guid.v4().toString(),
                KeyWords: "these are some keywords",
                MimeType: "text/xml",
                Name: guid.v4().toString(),
                ParentId: "admin",
                TypeName: "element"
            };
            return service.Insert({
                Item: newItem,
                Data: "<element>Some stuff</element>"
            });
        }).then(function(__callbackResults) {
            insertedItem = __callbackResults;
            return service.GetItem({
                ItemId: insertedItem.id
            });
        }).then(function(__callbackResults) {
            retrievedItem = __callbackResults;
            AssertItemsAreEqual(newItem, retrievedItem);
            return service.GetItemContent({
                id: insertedItem.id
            });
        }).then(function(__callbackResults) {
            itemContent = __callbackResults;
            assert.equal("<element>Some stuff</element>", itemContent);
            newItem.Attributes = 65536 | 2 | 1 | 4;
            newItem.KeyWords = "new keywords";
            newItem.MimeType = "image/png";
            newItem.Name = guid.v4().toString();
            newItem.ParentId = "admin:AC911AE5A8234B6B9D45FD760A9A7614";
            newItem.TypeName = "list";
            return service.Update({
                Item: newItem,
                Data: "<list>this is updated content</list>"
            });
        }).then(function() {
            return service.GetItem({
                ItemId: insertedItem.id
            });
        }).then(function(__callbackResults) {
            retrievedItem = __callbackResults;
            AssertItemsAreEqual(newItem, retrievedItem);
            return service.GetItemContent({
                id: insertedItem.id
            });
        }).then(function(__callbackResults) {
            itemContent = __callbackResults;
            assert.equal("<list>this is updated content</list>", itemContent);
            return service.Delete({
                ItemId: insertedItem.id
            });
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
            return GetItemsCount();
        }).then(function(__callbackResults) {
            currentItemsCount = __callbackResults;
            assert.equal(currentItemsCount, previousItemsCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestDeleteWithChildren", function(done) {
        var previousItemsCount;
        var newFolder;
        var childItem;
        var result;
        var currentItemsCount;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            newFolder = {
                Attributes: 16 | 2 | 1 | 4,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "",
                Name: guid.v4().toString(),
                ParentId: "admin",
                TypeName: "folder"
            };
            return service.Insert({
                Item: newFolder,
                Data: null
            });
        }).then(function() {
            childItem = {
                Attributes: 32 | 2 | 1 | 4,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "text/xml",
                Name: guid.v4().toString(),
                ParentId: newFolder.id,
                TypeName: "element"
            };
            return service.Insert({
                Item: childItem,
                Data: null
            });
        }).then(function() {
            childItem = {
                Attributes: 32 | 2 | 1 | 4,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "text/xml",
                Name: guid.v4().toString(),
                ParentId: newFolder.id,
                TypeName: "element"
            };
            return service.Insert({
                Item: childItem,
                Data: null
            });
        }).then(function() {
            return service.Delete({
                ItemId: newFolder.id
            });
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
            return GetItemsCount();
        }).then(function(__callbackResults) {
            currentItemsCount = __callbackResults;
            assert.equal(currentItemsCount, previousItemsCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestInsertMissingTypeName", function(done) {
        var previousItemsCount;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            return service.Insert({
                Item: {
                    id: guid.v4().toString(),
                    Attributes: -1,
                    MimeType: "text/test",
                    Name: guid.v4().toString(),
                    ParentId: "someparent",
                    KeyWords: ""
                },
                Data: "just a bunch of text"
            });
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Item type not specified\"");
        }, function(errors) {
            helpers.validateException(errors, "Item type not specified");
            var currentItemsCount;
            
            GetItemsCount().then(function(__callbackResults) {
                currentItemsCount = __callbackResults;
                assert.equal(currentItemsCount, previousItemsCount);
            }).done(function() {
                done();
            });
        });
    });
    
    it("TestInsertInferredMimeType", function(done) {
        var newItem;
        var insertedItem;
        var retrievedItem;
        
        newItem = {
            Attributes: -1,
            id: guid.v4().toString(),
            TypeName: "element",
            Name: guid.v4().toString(),
            KeyWords: "",
            ParentId: "someparent"
        };
        
        service.Insert({
            Item: newItem,
            Data: "just a bunch of text"
        }).then(function(__callbackResults) {
            insertedItem = __callbackResults;
            return service.GetItem({
                ItemId: insertedItem.id
            });
        }).then(function(__callbackResults) {
            retrievedItem = __callbackResults;
            assert.notEqual(retrievedItem, null);
            newItem.MimeType = "text/xml";
            AssertItemsAreEqual(newItem, retrievedItem);
        }).done(function() {
            done();
        });
    });
    
    it("TestUpdateDoesNotExist", function(done) {
        service.Update({
            Item: {
                id: "thereisnowaythisexists"
            },
            Data: "just a bunch of text"
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Item not found\"");
        }, function(errors) {
            helpers.validateException(errors, "Item not found");
            done();
        });
    });
    
    it("TestDeleteDoesNotExist", function(done) {
        var previousItemsCount;
        var result;
        var currentItemsCount;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            return service.Delete({
                ItemId: "thereisnowaythisexists"
            });
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
            return GetItemsCount();
        }).then(function(__callbackResults) {
            currentItemsCount = __callbackResults;
            assert.equal(currentItemsCount, previousItemsCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestDeleteParentDoesNotExist", function(done) {
        var previousItemsCount;
        var currentItemsCount;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            return service.Delete({
                ItemId: "/noparent/thereisnowaythisexists"
            });
        }).then(function() {
            return GetItemsCount();
        }).then(function(__callbackResults) {
            currentItemsCount = __callbackResults;
            assert.equal(currentItemsCount, previousItemsCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestRemoveTypeDoesNotExist", function(done) {
        var previousTypesList;
        var currentTypesList;
        
        service.GetTypes({}).then(function(__callbackResults) {
            previousTypesList = __callbackResults;
            return service.RemoveType({
                TypeName: "idontexist"
            });
        }).then(function() {
            return service.GetTypes({});
        }).then(function(__callbackResults) {
            currentTypesList = __callbackResults;
            assert.equal(currentTypesList.length, previousTypesList.length);
        }).done(function() {
            done();
        });
    });
    
    it("TestAddTypeAlreadyExists", function(done) {
        service.AddType({
            ItemType: {
                Attributes: -1,
                MimeType: "text/test-type",
                TypeName: "library"
            }
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Type already exists\"");
        }, function(errors) {
            helpers.validateException(errors, "Type already exists");
            done();
        });
    });
    
    it("TestAddTypeAndRemove", function(done) {
        var insertedItemType;
        var retrievedItemType;
        
        insertedItemType = {
            Attributes: -1,
            MimeType: "text/test-type",
            TypeName: "Test Type"
        };
        
        service.AddType({
            ItemType: insertedItemType
        }).then(function() {
            return service.GetTypeInfo({
                TypeName: insertedItemType.TypeName
            });
        }).then(function(__callbackResults) {
            retrievedItemType = __callbackResults;
            assert.notEqual(retrievedItemType, null);
            assert.equal(retrievedItemType.Attributes, insertedItemType.Attributes);
            assert.equal(retrievedItemType.MimeType, insertedItemType.MimeType);
            assert.equal(retrievedItemType.TypeName, insertedItemType.TypeName);
            return service.RemoveType({
                TypeName: insertedItemType.TypeName
            });
        }).then(function() {
            return service.GetTypeInfo({
                TypeName: insertedItemType.TypeName
            });
        }).then(function(__callbackResults) {
            retrievedItemType = __callbackResults;
            assert.equal(retrievedItemType, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemNullId", function(done) {
        var item;
        
        service.GetItem({
            ItemId: null
        }).then(function(__callbackResults) {
            item = __callbackResults;
            assert.equal(item, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemContentNullId", function(done) {
        var itemContent;
        
        service.GetItemContent({
            id: null
        }).then(function(__callbackResults) {
            itemContent = __callbackResults;
            assert.equal(itemContent, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemBytesNullId", function(done) {
        var itemBytes;
        
        service.GetItemBytes({
            id: null
        }).then(function(__callbackResults) {
            itemBytes = __callbackResults;
            assert.equal(itemBytes, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestGetItemsNullParentId", function(done) {
        var items;
        
        service.GetItems({
            ParentId: null,
            TypeName: "",
            Attributes: -1
        }).then(function(__callbackResults) {
            items = __callbackResults;
            assert.notEqual(items, null);
            assert.equal(items.length, 2);
            assert.equal(items[0].Attributes, 1 | 2 | 16);
            assert.equal(items[0].KeyWords, null);
            assert.equal(items[0].MimeType, null);
            assert.equal(items[0].Name, "Shared Content");
            assert.equal(items[0].ParentId, "");
            assert.equal(items[0].SubCount, 1);
            assert.equal(items[0].TypeName, "folder");
            assert.equal(items[0].id, "shared");
            assert.equal(items[1].Attributes, 1 | 2 | 16);
            assert.equal(items[1].KeyWords, null);
            assert.equal(items[1].MimeType, null);
            assert.equal(items[1].Name, "Personal Content");
            assert.equal(items[1].ParentId, "");
            assert.equal(items[1].SubCount, 1);
            assert.equal(items[1].TypeName, "folder");
            assert.equal(items[1].id, "admin");
        }).done(function() {
            done();
        });
    });
    
    it("TestUpdateNullItemId", function(done) {
        var updateItem;
        var resultItem;
        
        updateItem = {
            Attributes: 32,
            id: null,
            KeyWords: "these are some keywords",
            MimeType: "text/xml",
            Name: guid.v4().toString(),
            ParentId: "admin",
            TypeName: "element"
        };
        
        service.Update({
            Item: updateItem,
            Data: null
        }).then(function(__callbackResults) {
            resultItem = __callbackResults;
            assert.equal(resultItem, null);
        }).done(function() {
            done();
        });
    });
    
    it("TestInsertWithInheritedAttributes", function(done) {
        var previousItemsCount;
        var newItem;
        var insertedItem;
        var retrievedItem;
        var result;
        var currentItemsCount;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            newItem = {
                Attributes: 0,
                id: guid.v4().toString(),
                KeyWords: "these are some keywords",
                MimeType: "text/xml",
                Name: guid.v4().toString(),
                ParentId: "admin",
                TypeName: "element"
            };
            return service.Insert({
                Item: newItem,
                Data: null
            });
        }).then(function(__callbackResults) {
            insertedItem = __callbackResults;
            return service.GetItem({
                ItemId: insertedItem.id
            });
        }).then(function(__callbackResults) {
            retrievedItem = __callbackResults;
            newItem.Attributes = 167;
            AssertItemsAreEqual(newItem, retrievedItem);
            return service.Delete({
                ItemId: insertedItem.id
            });
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
            return GetItemsCount();
        }).then(function(__callbackResults) {
            currentItemsCount = __callbackResults;
            assert.equal(currentItemsCount, previousItemsCount);
        }).done(function() {
            done();
        });
    });
    
    it("TestInsertWithoutPermission", function(done) {
        var previousItemsCount;
        var newFolder;
        var childItem;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            newFolder = {
                Attributes: 16 | 4,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "",
                Name: guid.v4().toString(),
                ParentId: "admin",
                TypeName: "folder"
            };
            return service.Insert({
                Item: newFolder,
                Data: null
            });
        }).then(function() {
            childItem = {
                Attributes: 32 | 2 | 1 | 4,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "text/xml",
                Name: guid.v4().toString(),
                ParentId: newFolder.id,
                TypeName: "element"
            };
            return service.Insert({
                Item: childItem,
                Data: null
            });
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Attributes on the parent folder do not allow adding items to it.\"");
        }, function(errors) {
            helpers.validateException(errors, "Attributes on the parent folder do not allow adding items to it.");
            var result;
            var currentItemsCount;
            
            service.Delete({
                ItemId: newFolder.id
            }).then(function(__callbackResults) {
                result = __callbackResults;
                assert.equal(result, true);
                return GetItemsCount();
            }).then(function(__callbackResults) {
                currentItemsCount = __callbackResults;
                assert.equal(currentItemsCount, previousItemsCount);
            }).done(function() {
                done();
            });
        });
    });
    
    it("TestUpdateWithoutPermission", function(done) {
        var previousItemsCount;
        var newItem;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            newItem = {
                Attributes: 32 | 1 | 4,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "text/xml",
                Name: guid.v4().toString(),
                ParentId: "admin",
                TypeName: "element"
            };
            return service.Insert({
                Item: newItem,
                Data: null
            });
        }).then(function() {
            newItem.Name = "Updated name";
            return service.Update({
                Item: newItem,
                Data: null
            });
        }).then(function() {}).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Attributes on the item do not allow updating it.\"");
        }, function(errors) {
            helpers.validateException(errors, "Attributes on the item do not allow updating it.");
            var result;
            var currentItemsCount;
            
            service.Delete({
                ItemId: newItem.id
            }).then(function(__callbackResults) {
                result = __callbackResults;
                assert.equal(result, true);
                return GetItemsCount();
            }).then(function(__callbackResults) {
                currentItemsCount = __callbackResults;
                assert.equal(currentItemsCount, previousItemsCount);
            }).done(function() {
                done();
            });
        });
    });
    
    it("TestDeleteChildrenWithoutPermission", function(done) {
        var previousItemsCount;
        var newFolder;
        var childItem;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            newFolder = {
                Attributes: 16 | 2 | 1 | 4,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "",
                Name: guid.v4().toString(),
                ParentId: "admin",
                TypeName: "folder"
            };
            return service.Insert({
                Item: newFolder,
                Data: null
            });
        }).then(function() {
            childItem = {
                Attributes: 32 | 2 | 1,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "text/xml",
                Name: guid.v4().toString(),
                ParentId: newFolder.id,
                TypeName: "element"
            };
            return service.Insert({
                Item: childItem,
                Data: null
            });
        }).then(function() {
            return service.Delete({
                ItemId: newFolder.id
            });
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
        }).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Attributes on the item do not allow deleting it.\"");
        }, function(errors) {
            helpers.validateException(errors, "Attributes on the item do not allow deleting it.");
            var result;
            var currentItemsCount;
            
            childItem.Attributes = 32 | 2 | 1 | 4;
            
            service.Update({
                Item: childItem,
                Data: null
            }).then(function() {
                return service.Delete({
                    ItemId: newFolder.id
                });
            }).then(function(__callbackResults) {
                result = __callbackResults;
                assert.equal(result, true);
                return GetItemsCount();
            }).then(function(__callbackResults) {
                currentItemsCount = __callbackResults;
                assert.equal(currentItemsCount, previousItemsCount);
            }).done(function() {
                done();
            });
        });
    });
    
    it("TestDeleteWithoutPermission", function(done) {
        var previousItemsCount;
        var newFolder;
        var childItem;
        
        GetItemsCount().then(function(__callbackResults) {
            previousItemsCount = __callbackResults;
            newFolder = {
                Attributes: 16 | 2 | 1 | 4,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "",
                Name: guid.v4().toString(),
                ParentId: "admin",
                TypeName: "folder"
            };
            return service.Insert({
                Item: newFolder,
                Data: null
            });
        }).then(function() {
            childItem = {
                Attributes: 32 | 2 | 1,
                id: "admin:" + guid.v4(),
                KeyWords: "",
                MimeType: "text/xml",
                Name: guid.v4().toString(),
                ParentId: newFolder.id,
                TypeName: "element"
            };
            return service.Insert({
                Item: childItem,
                Data: null
            });
        }).then(function() {
            return service.Delete({
                ItemId: childItem.id
            });
        }).then(function(__callbackResults) {
            result = __callbackResults;
            assert.equal(result, true);
        }).done(function() {
            throw new Error("Expected an exception to be thrown with the message \"Attributes on the item do not allow deleting it.\"");
        }, function(errors) {
            helpers.validateException(errors, "Attributes on the item do not allow deleting it.");
            var result;
            var currentItemsCount;
            
            childItem.Attributes = 32 | 2 | 1 | 4;
            
            service.Update({
                Item: childItem,
                Data: null
            }).then(function() {
                return service.Delete({
                    ItemId: childItem.id
                });
            }).then(function(__callbackResults) {
                result = __callbackResults;
                assert.equal(result, true);
                return service.Delete({
                    ItemId: newFolder.id
                });
            }).then(function(__callbackResults) {
                result = __callbackResults;
                assert.equal(result, true);
                return GetItemsCount();
            }).then(function(__callbackResults) {
                currentItemsCount = __callbackResults;
                assert.equal(currentItemsCount, previousItemsCount);
            }).done(function() {
                done();
            });
        });
    });
});
