var path = require('path');
var q = require('q');
var uuid = require('node-uuid');
var quippe = require('@medicomp/quippe');
var personalSqliteService = require('./personalSqliteService');
var util = require('util');

var rowToItem = function (row) {
    return {
        id: row.ItemId,
        ParentId: row.ParentId,
        TypeName: row.TypeName,
        Name: row.Name,
        KeyWords: row.KeyWords,
        Attributes: row.Attributes,
        MimeType: row.MimeType,
        SubCount: row.SubCount || 0
    };
};

function personalContentLibrary(username) {
    personalSqliteService.apply(this, [username, 'ContentLibrary.dat']);
}

util.inherits(personalContentLibrary, personalSqliteService);
    
personalContentLibrary.prototype.GetItems = function (data) {
    var sql = "select i.ItemId, i.ParentId, i.TypeName, i.Name, i.KeyWords, i.Attributes, i.MimeType, IfNull(s.SubCount,0) as 'SubCount' ";
    sql += "  from Items i ";
    sql += "  left outer join (select ParentId, count(*) as 'SubCount' from Items group by ParentId) s ";
    sql += "    on i.ItemId = s.ParentId ";
    sql += " where i.ParentId=$parentId";
        
    var parameters = {
        $parentId: data.ParentId
    };
        
    if (data.TypeName) {
        sql += " and i.TypeName=$typeName";
        parameters.$typeName = data.TypeName;
    }
        
    if (data && data.Attributes != -1) {
        sql += " and i.Attributes & $attributes != 0";
        parameters.$attributes = data.Attributes;
    }
        
    sql += "  order by (i.Attributes & 16) desc, i.Name collate nocase asc;";
        
    return this.databaseAll(sql, parameters, function (rows) {
        var items = [];
            
        for (var i = 0; i < rows.length; i++) {
            items.push(rowToItem(rows[i]));
        }
            
        return items;
    });
};
    
personalContentLibrary.prototype.GetItem = function (data) {
    if (data.ItemId == "shared") {
        return q({
            id: 'shared',
            ParentId: '',
            TypeName: 'folder',
            Name: 'Shared Content',
            SubCount: 1,
            Attributes: 19,
            KeyWords: null,
            MimeType: null
        });
    }

    else if (data.ItemId == this.username) {
        return q({
            id: this.username,
            ParentId: '',
            TypeName: 'folder',
            Name: 'Personal Content',
            SubCount: 1,
            Attributes: 19,
            KeyWords: null,
            MimeType: null
        });
    }

    return this.databaseGet("select ItemId, ParentId, TypeName, Name, KeyWords, Attributes, MimeType from Items where ItemId = $itemId", {
        $itemId: data.ItemId
    }, function (row) {
        return row ? rowToItem(row) : null;
    });
};
    
personalContentLibrary.prototype.GetItemContent = function (data) {
    return this.databaseGet("select data from Items where ItemId = $id", {
        $id: data.id
    }, function (row) {
        return row ? row.Data : null;
    });
};
    
personalContentLibrary.prototype.GetItemBytes = function (data) {
    return this.databaseGet("select data from Items where ItemId = $id", {
        $id: data.id
    }, function (row) {
        return row ? row.Data : null;
    });
};
    
personalContentLibrary.prototype.Insert = function (data) {
    if (this.stringIsNullOrEmpty(data.Item.TypeName)) {
        throw 'Item type not specified';
    }

    if (!data.Item.id) {
        data.Item.id = this.username + ":" + uuid.v4().toUpperCase();
        data.Item.id = data.Item.id.replace(/-/g, '');
    }
    
    var self = this;

    return (data.Item.ParentId != null && data.Item.ParentId != "" ? this.GetItem({
        ItemId: data.Item.ParentId
    }) : q(null)).then(function (parentItem) {
        if (parentItem != null && parentItem.Attributes != 0 && (parentItem.Attributes & 18) != 18) {
            throw "Attributes on the parent folder do not allow adding items to it.";
        }

        if (!data.Item.MimeType || !data.Item.Attributes) {
            return self.GetTypeInfo({
                TypeName: data.Item.TypeName
            }).then(function (typeInfo) {
                if (!data.Item.MimeType) {
                    data.Item.MimeType = typeInfo.MimeType;
                }
                
                if (!data.Item.Attributes) {
                    data.Item.Attributes = typeInfo.Attributes;
                }
                
                return self.databaseRun("insert into Items values ($itemId,$parentId,$typeName,$name,$keyWords,$attributes,$mimeType,$data);", {
                    $itemId: data.Item.id,
                    $parentId: data.Item.ParentId,
                    $typeName: data.Item.TypeName,
                    $name: data.Item.Name,
                    $keyWords: data.Item.KeyWords,
                    $attributes: data.Item.Attributes,
                    $mimeType: data.Item.MimeType,
                    $data: data.Data || ""
                }).then(function () {
                    return data.Item;
                });
            });
        }
        
        return self.databaseRun("insert into Items values ($itemId,$parentId,$typeName,$name,$keyWords,$attributes,$mimeType,$data);", {
            $itemId: data.Item.id,
            $parentId: data.Item.ParentId,
            $typeName: data.Item.TypeName,
            $name: data.Item.Name,
            $keyWords: data.Item.KeyWords,
            $attributes: data.Item.Attributes,
            $mimeType: data.Item.MimeType,
            $data: data.Data || ""
        }).then(function () {
            return data.Item;
        });
    });
};
    
personalContentLibrary.prototype.Delete = function (data) {
    if (!data.ItemId) {
        return false;
    }
        
    return this.DeleteRecursive(data.ItemId);
};
    
personalContentLibrary.prototype.DeleteRecursive = function (itemId) {
    var self = this;

    return this.GetItem({
        ItemId: itemId
    }).then(function (existingItem) {
        if (existingItem != null && existingItem.Attributes != 0 && (existingItem.Attributes & 4) != 4) {
            throw "Attributes on the item do not allow deleting it.";
        }

        return self.databaseAll("select ItemId from Items where ParentId=$parentId", {
            $parentId: itemId
        }, function (rows) {
            var childrenIds = [];
            
            for (var i = 0; i < rows.length; i++) {
                childrenIds.push(rows[i].ItemId);
            }
            
            return childrenIds;
        }).then(function (children) {
            if (children.length == 0) {
                return null;
            }
            
            var childDeletes = [];
            
            for (var i = 0; i < children.length; i++) {
                childDeletes.push(self.DeleteRecursive(children[i]));
            }
            
            return q.all(childDeletes);
        }).then(function () {
            return self.databaseRun("delete from Items where ItemId=$itemId", {
                $itemId: itemId
            });
        }).then(function() {
            return true;
        });
    });
};
    
personalContentLibrary.prototype.Update = function (data) {
    var self = this;
        
    return this.GetItem({
        ItemId: data.Item.id
    }).then(function (existingItem) {
        if (!existingItem) {
            var deferred = q.defer();
            deferred.reject("Item not found");
                
            return deferred.promise;
        }
        
        if (existingItem.Attributes != 0 && (existingItem.Attributes & 2) != 2) {
            throw "Attributes on the item do not allow updating it.";
        }
            
        var sql = "update Items set ";
        var parameters = {};
        var hasChanges = false;
            
        if (existingItem.Name != data.Item.Name) {
            sql += "Name=$name, ";
            parameters.$name = data.Item.Name;
            hasChanges = true;
        }
            
        if (existingItem.ParentId != data.Item.ParentId) {
            sql += "ParentId=$parentId, ";
            parameters.$parentId = data.Item.ParentId;
            hasChanges = true;
        }
            
        if (existingItem.TypeName != data.Item.TypeName) {
            sql += "TypeName=$typeName, ";
            parameters.$typeName = data.Item.TypeName;
            hasChanges = true;
        }
            
        if (existingItem.KeyWords != data.Item.KeyWords) {
            sql += "KeyWords=$keyWords, ";
            parameters.$keyWords = data.Item.KeyWords;
            hasChanges = true;
        }
            
        if (existingItem.Attributes != data.Item.Attributes && data.Item.Attributes != 0) {
            sql += "Attributes=$attributes, ";
            parameters.$attributes = data.Item.Attributes;
            hasChanges = true;
        }
            
        if (existingItem.MimeType != data.Item.MimeType) {
            sql += "MimeType=$mimeType, ";
            parameters.$mimeType = data.Item.MimeType;
            hasChanges = true;
        }
            
        if (data.Data) {
            sql += "Data=$data, ";
            parameters.$data = data.Data;
            hasChanges = true;
        }
            
        if (!hasChanges) {
            return null;
        }
            
        sql = sql.substring(0, sql.length - 2);
        sql += " where ItemId=$itemId";
            
        parameters.$itemId = data.Item.id;
            
        return self.databaseRun(sql, parameters).then(function () {
            return data.Item;
        });
    });
};
    
personalContentLibrary.prototype.Search = function (data) {
    var self = this;
        
    var searchLogic = function () {
        var sql = "select i.*, IfNull(s.SubCount,0) as 'SubCount' ";
        sql += "  from Items i ";
        sql += "  left outer join (select ParentId, count(*) as 'SubCount' from Items group by ParentId) s ";
        sql += "    on i.ItemId = s.ParentId ";
        sql += " where i.Attributes & $attributes != 0";
            
        var parameters = {
            $attributes: data.Attributes
        }
            
        if (data.TypeName) {
            sql += " and i.TypeName=$typeName";
            parameters.$typeName = data.TypeName;
        }
            
        if (data.KeyWords) {
            var keyWords = data.KeyWords.toLowerCase().replace("'", " ").replace("--", " ");
            sql += " and (lower(i.Name || ' ' || i.KeyWords) REGEXP '^";
                
            var words = keyWords.split(' ');
                
            for (var i = 0; i < words.length; i++) {
                sql += "(?=.*\\b" + words[i].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + ")";
            }
                
            sql += "')";
        }
            
        sql += "  order by (i.Attributes & 16) desc, i.Name collate nocase asc";
            
        if (data.MaxResults > 0) {
            sql += " limit $maxResults";
            parameters.$maxResults = data.MaxResults;
        }
            
        sql += ";";
            
        return self.databaseAll(sql, parameters, function (rows) {
            var items = [];
                
            for (var i = 0; i < rows.length; i++) {
                items.push(rowToItem(rows[i]));
            }
                
            return items;
        });
    }
        
    if (data.KeyWords) {
        return this.enableRegexpOperator().then(function () {
            return searchLogic();
        });
    }

    else {
        return searchLogic();
    }
};
    
personalContentLibrary.prototype.GetTypes = function () {
    return this.databaseAll("select * from ItemTypes", null, function (rows) {
        var types = [];
            
        for (var i = 0; i < rows.length; i++) {
            types.push({
                TypeName: rows[i].TypeName,
                MimeType: rows[i].MimeType,
                Attributes: rows[i].Attributes
            });
        }
            
        return types;
    });
};
    
personalContentLibrary.prototype.GetTypeInfo = function (data) {
    return this.databaseGet("select * from ItemTypes where TypeName=$typeName", {
        $typeName: data.TypeName
    }, function (row) {
        if (!row) {
            return null;
        }
            
        return {
            TypeName: row.TypeName,
            MimeType: row.MimeType,
            Attributes: row.Attributes
        };
    });
};
    
personalContentLibrary.prototype.AddType = function (data) {
    var self = this;
        
    return this.databaseGet("select count(*) as count from ItemTypes where TypeName=$typeName;", {
        $typeName: data.ItemType.TypeName
    }).then(function (count) {
        if (count && count.count > 0) {
            var deferred = q.defer();
            deferred.reject("Type already exists");
                
            return deferred.promise;
        }
            
        return self.databaseRun("insert into ItemTypes(TypeName,MimeType,Attributes) values ($typeName, $mimeType, $attributes);", {
            $typeName: data.ItemType.TypeName,
            $mimeType: data.ItemType.MimeType,
            $attributes: data.ItemType.Attributes
        });
    });
};
    
personalContentLibrary.prototype.RemoveType = function (data) {
    return this.databaseRun("delete from ItemTypes where TypeName=$typeName;", {
        $typeName: data.TypeName
    });
};

personalContentLibrary.prototype.GetProperties = function(data) {
    return this.databaseAll("SELECT PropertyName, PropertyValue FROM ItemProperties WHERE ItemId=$itemId", {
        $itemId: data.ItemId
    }, function (rows) {
        if (!rows || rows.length == 0) {
            return null;
        }
        
        var properties = {};

        for (var i = 0; i < rows.length; i++) {
            properties[rows[i].PropertyName] = rows[i].PropertyValue;
        }

        return properties;
    });
};

personalContentLibrary.prototype.SetProperty = function (data) {
    if (data.Name == null) {
        throw JSON.stringify({
            ExceptionType: 'System.ArgumentNullException',
            Message: 'Property name cannot be null'
        });
    }
    
    data.Properties = {};
    data.Properties[data.Name] = data.Value;

    delete data.Name;
    delete data.Value;

    return this.SetProperties(data);
};

personalContentLibrary.prototype.GetProperty = function (data) {
    return this.databaseGet("SELECT PropertyValue FROM ItemProperties WHERE ItemId=$itemId AND PropertyName=$propertyName", {
        $itemId: data.ItemId,
        $propertyName: data.Name
    }, function (row) {
        if (!row) {
            return null;
        }

        return row.PropertyValue;
    });
};

personalContentLibrary.prototype.SetProperties = function (data) {
    var self = this;
    var createInsertUpdateCallback = function (propertyName) {
        return function (row) {
            if (!row) {
                return self.databaseRun("INSERT INTO ItemProperties VALUES($itemId, $propertyName, $propertyValue)", {
                    $itemId: data.ItemId,
                    $propertyName: propertyName,
                    $propertyValue: data.Properties[propertyName]
                });
            }

            else {
                return self.databaseRun("UPDATE ItemProperties SET PropertyValue=$propertyValue WHERE ItemId=$itemId AND PropertyName=$propertyName", {
                    $itemId: data.ItemId,
                    $propertyName: propertyName,
                    $propertyValue: data.Properties[propertyName]
                });
            }
        }
    };
    var createSelectCallback = function(propertyName) {
        return function() {
            return self.databaseGet("SELECT ItemId FROM ItemProperties WHERE ItemId=$itemId AND PropertyName=$propertyName", {
                $itemId: data.ItemId,
                $propertyName: propertyName
            }, function (row) {
                return row;
            }).then(createInsertUpdateCallback(propertyName));
        }
    };

    return this.databaseGet("SELECT ItemId FROM Items WHERE ItemId=$itemId", {
        $itemId: data.ItemId
    }, function(row) {
        return row;
    }).then(function (row) {
        if (!row) {
            throw JSON.stringify({
                ExceptionType: 'System.Exception',
                Message: 'Item ' + data.ItemId + ' does not exist.'
            });
        }

        return self.beginTransaction().then(function() {
            var promiseChain = null;

            for (var propertyName in data.Properties) {
                if (!data.Properties.hasOwnProperty(propertyName)) {
                    continue;
                }

                if (promiseChain == null) {
                    promiseChain = createSelectCallback(propertyName)();
                }

                else {
                    promiseChain = promiseChain.then(createSelectCallback(propertyName));
                }
            }

            if (promiseChain == null) {
                promiseChain = q.defer();
                promiseChain.resolve();

                return promiseChain.promise;
            }

            return promiseChain;
        }).then(function () {
            return self.commitTransaction();
        }, function(errors) {
            self.rollbackTransaction();
            throw errors;
        });
    });
};

personalContentLibrary.prototype.ClearProperties = function(data) {
    return this.databaseRun("DELETE FROM ItemProperties WHERE ItemId=$itemId", {
        $itemId: data.ItemId
    });
};

personalContentLibrary.prototype.FindItemsByProperty = function(data) {
    var sql = "";
    var parameters = {};

    sql += "select distinct i.*, IfNull(s.SubCount,0) as 'SubCount' ";
    sql += "  from Items i ";
    sql += "  join ItemProperties p ";
    sql += "    on i.ItemId = p.ItemId ";
    sql += "  left outer join (select ParentId, count(*) as 'SubCount' from Items group by ParentId) s ";
    sql += "    on i.ItemId = s.ParentId ";
    sql += "where ";
    
    if (data.Name) {
        sql += " p.PropertyName=$propertyName and ";
        parameters.$propertyName = data.Name;
    }

    switch (data.FilterType) {
        case 0:
            sql += data.Value != null
	                    ? " p.PropertyValue=$propertyValue "
	                    : " p.PropertyValue IS NULL ";
            
            if (data.Value != null) {
                parameters.$propertyValue = data.Value;
            }

            break;

        case 1:
            sql += " p.PropertyValue LIKE $propertyValue ";
            parameters.$propertyValue = data.Value + "%";
            break;

        case 2:
            sql += " p.PropertyValue LIKE $propertyValue ";
            parameters.$propertyValue = "%" + data.Value;
            break;

        case 3:
            sql += " p.PropertyValue LIKE $propertyValue ";
            parameters.$propertyValue = "%" + data.Value + "%";
            break;
    }
    
    sql += ";";

    return this.databaseAll(sql, parameters, function(rows) {
        if (!rows || rows.length == 0) {
            return null;
        }

        var items = [];

        for (var i = 0; i < rows.length; i++) {
            items.push(rowToItem(rows[i]));
        }

        return items;
    });
};

personalContentLibrary.prototype.GetDefaultProperties = function(data) {
    if (data.ItemType.toLowerCase() == "folder") {
        return q(null);
    }

    return this.databaseGet("SELECT TypeName FROM ItemTypes WHERE TypeName=$typeName", {
        $typeName: data.ItemType
    }, function(row) {
        if (!row) {
            return null;
        }

        return [
            {
                Name: "Author"
            }, {
                Name: "Description"
            }, {
                Name: "Copyright"
            }, {
                Name: "Version"
            }
        ];
    });
};

personalContentLibrary.prototype.DeleteProperty = function (data) {
    return this.databaseRun("DELETE FROM ItemProperties WHERE ItemId=$itemId AND PropertyName=$propertyName", {
        $itemId: data.ItemId,
        $propertyName: data.Name
    });
};

var getLibraryHandler = function (idOrPath, username) {
    if (idOrPath == null || idOrPath == "") {
        return null;
    }
    
    var pathComponents = idOrPath.split('/').filter(function (value) {
        return value != null && value != '';
    });
    
    if (pathComponents[0].split(':')[0].toLowerCase() == 'shared') {
        return new personalContentLibrary('shared');
    }

    else {
        return new personalContentLibrary(username);
    }
};

var getHandlerAndCall = function (idOrPath, data, method) {
    var libraryHandler = getLibraryHandler(idOrPath, data.ContextData.Username);
    var deferred;
    
    if (!libraryHandler) {
        deferred = q.defer();
        deferred.resolve();
        
        return deferred.promise;
    }
    
    try {
        return libraryHandler[method](data).then(function (results) {
            libraryHandler.databaseClose();
            return results;
        }, function (errors) {
            libraryHandler.databaseClose();
            throw errors;
        });
    }

    catch (errors) {
        deferred = q.defer();
        deferred.reject(errors);
        
        return deferred.promise;
    }
}

quippe.registerService(['Quippe.IContentLibraryService', 'Quippe.IContentMetaDataService'], {
    GetItems: function (data) {
        if (!data.ParentId) {
            return q([
                {
                    id: 'shared',
                    ParentId: '',
                    TypeName: 'folder',
                    Name: 'Shared Content',
                    SubCount: 1,
                    Attributes: 19,
                    KeyWords: null,
                    MimeType: null
                }, {
                    id: data.ContextData.Username,
                    ParentId: '',
                    TypeName: 'folder',
                    Name: 'Personal Content',
                    SubCount: 1,
                    Attributes: 19,
                    KeyWords: null,
                    MimeType: null
                }
            ]);
        }

        else {
           return getHandlerAndCall(data.ParentId, data, "GetItems");
        }
    },
    
    GetItem: function (data) {
        return getHandlerAndCall(data.ItemId, data, "GetItem");
    },
    
    GetItemContent: function (data) {
        return getHandlerAndCall(data.id, data, "GetItemContent");
    },
    
    GetItemBytes: function (data) {
        return getHandlerAndCall(data.id, data, "GetItemBytes");
    },
    
    Insert: function (data) {
        return getHandlerAndCall(data.Item.ParentId, data, "Insert");
    },
    
    Delete: function (data) {
        return getHandlerAndCall(data.ItemId, data, "Delete");
    },
    
    Update: function (data) {
        return getHandlerAndCall(data.Item.id, data, "Update");
    },
    
    Search: function (data) {
        var userContentLibrary = new personalContentLibrary(data.ContextData.Username);
        var sharedContentLibrary = new personalContentLibrary("shared");
        
        return q.all([userContentLibrary.Search(data), sharedContentLibrary.Search(data)]).then(function (allItems) {
            var mergedItems = [];
            
            for (var i = 0; i < allItems.length; i++) {
                for (var x = 0; x < allItems[i].length; x++) {
                    mergedItems.push(allItems[i][x]);
                }
            }

            userContentLibrary.databaseClose();
            sharedContentLibrary.databaseClose();

            return mergedItems;
        }, function (errors) {
            userContentLibrary.databaseClose();
            sharedContentLibrary.databaseClose();

            throw errors;
        });
    },
    
    GetTypes: function (data) {
        var sharedContentLibrary = new personalContentLibrary("shared");

        return sharedContentLibrary.GetTypes(data).then(function (types) {
            sharedContentLibrary.databaseClose();
            return types;
        }, function (errors) {
            sharedContentLibrary.databaseClose();
            throw errors;
        });
    },
    
    GetTypeInfo: function (data) {
        var sharedContentLibrary = new personalContentLibrary("shared");

        return sharedContentLibrary.GetTypeInfo(data).then(function (types) {
            sharedContentLibrary.databaseClose();
            return types;
        }, function (errors) {
            sharedContentLibrary.databaseClose();
            throw errors;
        });
    },
    
    AddType: function (data) {
        var sharedContentLibrary = new personalContentLibrary("shared");

        return sharedContentLibrary.AddType(data).then(function () {
            sharedContentLibrary.databaseClose();
            return true;
        }, function (errors) {
            sharedContentLibrary.databaseClose();
            throw errors;
        });
    },
    
    RemoveType: function (data) {
        var sharedContentLibrary = new personalContentLibrary("shared");

        return sharedContentLibrary.RemoveType(data).then(function (success) {
            sharedContentLibrary.databaseClose();
            return success;
        }, function (errors) {
            sharedContentLibrary.databaseClose();
            throw errors;
        });
    },

    GetProperties: function (data) {
        return getHandlerAndCall(data.ItemId, data, "GetProperties");
    },

    SetProperty: function (data) {
        return getHandlerAndCall(data.ItemId, data, "SetProperty");
    },

    GetProperty: function (data) {
        return getHandlerAndCall(data.ItemId, data, "GetProperty");
    },

    SetProperties: function (data) {
        return getHandlerAndCall(data.ItemId, data, "SetProperties");
    },

    ClearProperties: function (data) {
        return getHandlerAndCall(data.ItemId, data, "ClearProperties");
    },

    FindItemsByProperty: function(data) {
        var userContentLibrary = new personalContentLibrary(data.ContextData.Username);
        var sharedContentLibrary = new personalContentLibrary("shared");
        
        return q.all([sharedContentLibrary.FindItemsByProperty(data), userContentLibrary.FindItemsByProperty(data)]).then(function (allItems) {
            var mergedItems = [];
            
            for (var i = 0; i < allItems.length; i++) {
                if (allItems[i] == null) {
                    continue;
                }

                for (var x = 0; x < allItems[i].length; x++) {
                    mergedItems.push(allItems[i][x]);
                }
            }
            
            if (mergedItems.length == 0) {
                mergedItems = null;
            }
            
            userContentLibrary.databaseClose();
            sharedContentLibrary.databaseClose();

            return mergedItems;
        }, function (errors) {
            userContentLibrary.databaseClose();
            sharedContentLibrary.databaseClose();

            throw errors;
        });
    },

    GetDefaultProperties: function (data) {
        var sharedContentLibrary = new personalContentLibrary("shared");
        
        return sharedContentLibrary.GetDefaultProperties(data).then(function (properties) {
            sharedContentLibrary.databaseClose();
            return properties;
        }, function (errors) {
            sharedContentLibrary.databaseClose();
            throw errors;
        });
    },

    DeleteProperty: function (data) {
        return getHandlerAndCall(data.ItemId, data, "DeleteProperty");
    }
}, {
    usesPromises: true
});