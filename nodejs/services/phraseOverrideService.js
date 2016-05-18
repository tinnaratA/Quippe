var q = require('q');
var quippe = require('@medicomp/quippe');
var personalSqliteService = require('./personalSqliteService');
var util = require('util');
var fs = require('fs');
var path = require('path');

var wordDelimiters = new RegExp("(\\s|,|;|\:|\\/|\\/)");
var stripCharacters = new RegExp("(\\(|\\)|\\[|\\]|\\{|\\}|\"|'|\\.|_)", "g");
var nonAlphaCharacters = new RegExp("^[^a-zA-Z0-9]$");
var stopWords = new RegExp("^(a|all|an|and|any|are|as|at|be|but|by|can|did|do|for|get|got|had|has|have|he|her|him|his|how|if|in|is|it|its|me|my|no|not|now|of|on|or|our|she|so|the|to|up|was|were|with)$");
var tilde = new RegExp("\~", "g");

function phraseOverrideService(username) {
    if (fs.existsSync(path.join(quippe.config.dataDirectory, 'UserData', username, 'PhraseOverrides.dat'))) {
        personalSqliteService.apply(this, [username, 'PhraseOverrides.dat']);
    }

    else {
        this.username = username;
    }
};

util.inherits(phraseOverrideService, personalSqliteService);

phraseOverrideService.prototype.GetConceptPhrase = function (data) {
    return this.GetPhraseList(data.MedcinId, data.Usage, 1).then(function(phrases) {
        if (phrases == null || phrases.length == 0) {
            return null;
        }

        return phrases[0];
    });
};

phraseOverrideService.prototype.GetConceptPhrases = function (data) {
    if (data.MedcinId) {
        return this.GetPhraseList(data.MedcinId, data.Usage, -1);
    }

    else {
        return this.GetPhraseList(data.MedcinIds, data.Usage, 100000);
    }
};

phraseOverrideService.prototype.GetConceptContextId = function (data) {
    var deferred = q.defer();
    deferred.resolve(0);

    return deferred.promise;
};

phraseOverrideService.prototype.GetCodedList = function (data) {
    var deferred = q.defer();
    deferred.resolve(null);
    
    return deferred.promise;
};

phraseOverrideService.prototype.GetCodedText = function (data) {
    var deferred = q.defer();
    deferred.resolve('');
    
    return deferred.promise;
};

phraseOverrideService.prototype.GetString = function (data) {
    var deferred = q.defer();
    deferred.resolve('');
    
    return deferred.promise;
};

phraseOverrideService.prototype.Search = function (data) {
    if (data.Query == null) {
        throw JSON.stringify({
            ExceptionType: 'System.ArgumentNullException'
        });
    }
    
    if (!this.database) {
        var emptyDeferred = q.defer();
        emptyDeferred.resolve([]);

        return emptyDeferred.promise;
    }

    var searchWords = [];
    var words = data.Query.split(wordDelimiters);
    
    for (var i = 0; i < words.length; i++) {
        var word = words[i];

        word = word.replace(stripCharacters, "");

        if (this.stringIsNullOrEmpty(word)) {
            continue;
        }

        else if (word.match(nonAlphaCharacters)) {
            continue;
        }

        else if (word.match(stopWords)) {
            continue;
        }

        else if (word.match(tilde)) {
            continue;
        }

        else {
            searchWords.push(word);
        }
    }
    
    if (searchWords.length == 0) {
        var deferred = q.defer();
        deferred.resolve(null);

        return deferred.promise;
    }

    var parameters = {};
    var sql = "select MedcinId, Positive from ConceptPhrases where ";
    
    for (var j = 0; j < searchWords.length; j++) {
        if (j > 0) {
            sql += " and ";
        }

        sql += "Positive like '%" + searchWords[j] + "%'";
    }
    
    if (data.Limit > 0) {
        sql += " limit $limit";
        parameters.$limit = data.Limit;
    }

    return this.databaseAll(sql, parameters).then(function(rows) {
        var results = [];
        
        for (var k = 0; k < rows.length; k++) {
            results.push({
                Medcinid: rows[k].MedcinId,
                Description: rows[k].Positive,
                Prefix: null,
                Modifier: null,
                Status: null,
                Result: null,
                Nodekey: null,
                TermType: 0,
                Flags: 0,
                Gpflags: 0,
                ItemFlags: 0,
                Subs: null,
                Vardata: null
            });
        }

        return results;
    });
};

phraseOverrideService.prototype.GetSuggestion = function (data) {
    var deferred = q.defer();
    deferred.resolve('');
    
    return deferred.promise;
};

phraseOverrideService.prototype.GetPhraseList = function (medcinIds, usage, limit) {
    if (!this.database) {
        var emptyDeferred = q.defer();
        emptyDeferred.resolve([]);
        
        return emptyDeferred.promise;
    }
    
    if (!(medcinIds instanceof Array)) {
        medcinIds = [medcinIds];
    }

    limit = limit < 0 ? 1000 : limit;

    var sql = "select * from ConceptPhrases where MedcinId in(";
    
    for (var i = 0; i < medcinIds.length; i++) {
        if (i > 0) {
            sql += ", ";
        }

        sql += medcinIds[i];
    }

    sql += ") and (Usage & $usage) order by MedcinId, Sequence limit $limit";

    return this.databaseAll(sql, {
        $usage: usage,
        $limit: limit
    }, function (rows) {
        if (!rows || rows.length == 0) {
            return null;
        }

        var phrases = [];
        
        for (var i = 0; i < rows.length; i++) {
            phrases.push({
                MedcinId: rows[i].MedcinId,
                Usage: rows[i].Usage,
                Sequence: rows[i].Sequence,
                ContextMedcinId: 0,
                Positive: rows[i].Positive,
                Negative: rows[i].Negative,
                Culture: "en-US"
            });
        }

        return phrases;
    });
};

phraseOverrideService.prototype.GetPhrases = function (data) {
    return this.GetPhraseList(data.MedcinId, -1, -1);
};

phraseOverrideService.prototype.SetPhrases = function (data) {
    var self = this;

    return this.beginTransaction().then(function () {
        var promises = [];
        var previousMedcinId = 0;

        for (var i = 0; i < data.List.length; i++) {
            if (data.List[i].MedcinId != previousMedcinId) {
                promises.push(self.databaseRun("delete from ConceptPhrases where MedcinId=$medcinId;", {
                    $medcinId: data.List[i].MedcinId
                }));

                previousMedcinId = data.List[i].MedcinId;
            }

            promises.push(self.databaseRun("insert into ConceptPhrases(MedcinId,Sequence,Usage,Positive,Negative) values ($medcinId,$sequence,$usage,$positive,$negative)", {
                $medcinId: data.List[i].MedcinId,
                $sequence: data.List[i].Sequence,
                $usage: data.List[i].Usage,
                $positive: data.List[i].Positive,
                $negative: data.List[i].Negative
            }));
        }

        return q.all(promises).then(function() {
            return self.commitTransaction(true);
        }, function(errors) {
            self.rollbackTransaction();
            throw errors;
        });
    });
};

phraseOverrideService.prototype.ClearPhrases = function(data) {
    return this.databaseRun("delete from ConceptPhrases where MedcinId=$medcinId;", {
        $medcinId: data.MedcinId
    }).then(function() {
        return true;
    });
};

var getHandlerAndCall = function (data, method) {
    var handler = new phraseOverrideService(data.ContextData.Username);
    
    try {
        return handler[method](data);
    }

    catch (errors) {
        var deferred = q.defer();
        deferred.reject(errors);
        
        return deferred.promise;
    }
}

quippe.registerService(['Quippe.IPhraseProvider', 'Quippe.ITermSearchService', 'Quippe.IPhraseEditorService'], {
    SupportsCulture: function (data) {
        return q(data.CultureCode.toLowerCase() == 'en-us');
    },
    
    GetConceptPhrase: function (data) {
        return getHandlerAndCall(data, 'GetConceptPhrase');
    },
    
    GetConceptPhrases: function (data) {
        return getHandlerAndCall(data, 'GetConceptPhrases');
    },
    
    GetConceptContextId: function (data) {
        return getHandlerAndCall(data, 'GetConceptContextId');
    },

    GetCodedList: function (data) {
        return getHandlerAndCall(data, 'GetCodedList');
    },

    GetCodedText: function (data) {
        return getHandlerAndCall(data, 'GetCodedText');
    },

    GetString: function (data) {
        return getHandlerAndCall(data, 'GetString');
    },

    get_Culture: function(data) {
        return q('en-US');
    },

    get_SupportsContext: function(data) {
        return q(false);
    },

    Search: function (data) {
        return getHandlerAndCall(data, 'Search');
    },

    GetSuggestion: function (data) {
        return getHandlerAndCall(data, 'GetSuggestion');
    },

    GetPhrases: function (data) {
        return getHandlerAndCall(data, 'GetPhrases');
    },

    SetPhrases: function (data) {
        return getHandlerAndCall(data, 'SetPhrases');
    },

    ClearPhrases: function (data) {
        return getHandlerAndCall(data, 'ClearPhrases');
    }
}, {
    usesPromises: true
});