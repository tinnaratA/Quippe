var q = require('q');
var quippe = require('@medicomp/quippe');
var personalSqliteService = require('./personalSqliteService');
var util = require('util');

function favoritesService(username) {
    personalSqliteService.apply(this, [username, 'favorites.dat']);
};

util.inherits(favoritesService, personalSqliteService);

favoritesService.prototype.GetFavorites = function () {
    return this.databaseAll("select * from Favorites order by sequence", null, function (rows) {
        var favorites = [];
        
        for (var i = 0; i < rows.length; i++) {
            favorites.push({
                ResourceType: rows[i].ResourceType,
                ResourceId: rows[i].ResourceId.toString(),
                Text: rows[i].Text,
                Icon: rows[i].Icon
            });
        }
        
        return favorites;
    });
};

favoritesService.prototype.Add = function (data) {
    var self = this;

    return this.beginTransaction().then(function() {
        return self.databaseGet("select ifNull(max(sequence),-1) + 1 As sequence from Favorites", null).then(function(row) {
            return self.databaseRun("insert into Favorites(ResourceType,ResourceId,Text,Icon,Sequence) values ($resourceType, $resourceId, $text, $icon, $sequence);", {
                $resourceType: data.ResourceType.toLowerCase(),
                $resourceId: data.ResourceId,
                $text: data.Text,
                $icon: data.Icon,
                $sequence: row.sequence
            }).then(function () {
                return self.commitTransaction(true);
            });
        });
    }).then(null, function (errors) {
        self.rollbackTransaction();
        throw errors;
    });
};

favoritesService.prototype.Delete = function (data) {
    return this.databaseRun("delete from Favorites where ResourceType=$resourceType and ResourceId=$resourceId", {
        $resourceType: data.ResourceType,
        $resourceId: data.ResourceId
    }).then(function() {
        return true;
    });
};

favoritesService.prototype.SetSequence = function (data) {
    var self = this;

    return this.databaseGet("select IfNull(sequence, -1) As sequence from Favorites where ResourceType=$resourceType and ResourceId=$resourceId", {
        $resourceType: data.TargetType.toLowerCase(),
        $resourceId: data.TargetId
    }).then(function(row) {
        if (!row || row.sequence == null || row.sequence < 0) {
            return false;
        }

        return self.databaseGet("select count(*) As sourceCount from Favorites where ResourceType=$resourceType and ResourceId=$resourceId", {
            $resourceType: data.SourceType.toLowerCase(),
            $resourceId: data.SourceId
        }).then(function(countRow) {
            if (countRow.sourceCount == 0) {
                return false;
            }

            if (data.Relationship == "after") {
                return self.databaseRun("update Favorites set sequence = sequence + 1 where sequence > $sequence", {
                    $sequence: row.sequence
                }).then(function() {
                    return self.databaseRun("update Favorites set sequence = $sequence where ResourceType=$resourceType and ResourceId=$resourceId", {
                        $sequence: row.sequence + 1,
                        $resourceType: data.SourceType.toLowerCase(),
                        $resourceId: data.SourceId
                    });
                }).then(function() {
                    return true;
                });
            }

            else {
                return self.databaseRun("update Favorites set sequence = sequence + 1 where sequence >= $sequence", {
                    $sequence: row.sequence
                }).then(function () {
                    return self.databaseRun("update Favorites set sequence = $sequence where ResourceType=$resourceType and ResourceId=$resourceId", {
                        $sequence: row.sequence,
                        $resourceType: data.SourceType.toLowerCase(),
                        $resourceId: data.SourceId
                    });
                }).then(function () {
                    return true;
                });
            }
        });
    });
};

var getHandlerAndCall = function (data, method) {
    var favoritesHandler = new favoritesService(data.ContextData.Username);
    
    try {
        return favoritesHandler[method](data);
    }

    catch (errors) {
        var deferred = q.defer();
        deferred.reject(errors);
        
        return deferred.promise;
    }
}

quippe.registerService(['Quippe.IFavoritesService'], {
    Add: function (data) {
        return getHandlerAndCall(data, 'Add');
    },
    
    Delete: function (data) {
        return getHandlerAndCall(data, 'Delete');
    },
    
    GetFavorites: function (data) {
        return getHandlerAndCall(data, 'GetFavorites');
    },
    
    SetSequence: function (data, callback) {
        return getHandlerAndCall(data, 'SetSequence', callback);
    }
}, {
    usesPromises: true
});