var quippe = require('@medicomp/quippe');
var fs = require('fs');
var path = require('path');
var q = require('q');
var wrench = require('wrench');
var sqlite3 = require('sqlite3');
var assert = require('assert');
var xmldoc = require('xmldoc');
var moment = require('moment');

if (!process.env.UNIT_TEST_DATA_DIR) {
    console.error('You must set the UNIT_TEST_DATA_DIR environment variable.');
    process.exit();
}

quippe.config = {
    dataDirectory: process.env.UNIT_TEST_DATA_DIR
};

if (process.env.MEDCIN_SERVER_HOST) {
    quippe.config.medcinServerHost = process.env.MEDCIN_SERVER_HOST;
}

if (process.env.MEDCIN_SERVER_PORT) {
    quippe.config.medcinServerPort = process.env.MEDCIN_SERVER_PORT;
}

// The version of this method actually exported by wrench doesn't do the chmod synchronously, so we have to patch it
wrench.chmodSyncRecursive = function (sourceDir, filemode) {
    var files = fs.readdirSync(sourceDir);
    
    for (var i = 0; i < files.length; i++) {
        var currFile = fs.lstatSync(path.join(sourceDir, files[i]));
        
        if (currFile.isDirectory()) {
            /*  ...and recursion this thing right on back. */
            wrench.chmodSyncRecursive(path.join(sourceDir, files[i]), filemode);
        } else {
            /*  At this point, we've hit a file actually worth copying... so copy it on over. */
            fs.chmodSync(path.join(sourceDir, files[i]), filemode);
        }
    }
    
    /*  Finally, chmod the parent directory */
    fs.chmodSync(sourceDir, filemode);
};

if (!fs.existsSync(quippe.config.dataDirectory)) {
    fs.mkdirSync(quippe.config.dataDirectory);
}

wrench.chmodSyncRecursive(quippe.config.dataDirectory, 0777);
wrench.copyDirSyncRecursive(path.join(__dirname, 'data'), quippe.config.dataDirectory, {
    forceDelete: true
});
wrench.chmodSyncRecursive(quippe.config.dataDirectory, 0777);

quippe.logger = {
    info: function() {
    }
};

quippe.registerServiceMethod = function(data, callback) {
    callback(null);
};

var originalGetService = quippe.getService;

quippe.getService = function(serviceName, options) {
    var service = originalGetService.call(quippe, serviceName, options);

    var wrapFunction = function (originalFunction) {
        return function (data) {
            data = data || {};
            data.ContextData = {
                Username: 'admin'
            };
            
            return originalFunction(data);
        };
    };
    
    var newService = {};
    
    for (var member in service) {
        if (typeof (service[member]) == "function" && service.hasOwnProperty(member)) {
            newService[member] = wrapFunction(service[member]);
        }
    }
    
    return newService;
};

fs.readdirSync(path.join(__dirname, '..', 'services')).forEach(function (file) {
    if (file.match(/.+\.js$/ig) !== null) {
        var name = file.replace(/\.js$/i, '');
        require(path.join(__dirname, '..', 'services', name));
    }
});

module.exports = {
    getExpectedResultsText: function(file) {
        var pathComponents = [__dirname, "results"];

        for (var i = 0; i < arguments.length; i++) {
            pathComponents.push(arguments[i]);
        }

        return fs.readFileSync(path.join.apply(null, pathComponents)).toString().replace(/^\uFEFF/, '');
    },

    getExpectedResultsBytes: function() {
        var pathComponents = [__dirname, "results"];

        for (var i = 0; i < arguments.length; i++) {
            pathComponents.push(arguments[i]);
        }

        return fs.readFileSync(path.join.apply(null, pathComponents));
    },

    getTableRowCount: function(databasePath, tableName) {
        var deferred = q.defer();
        var database = new sqlite3.Database(databasePath);

        database.get("SELECT COUNT(*) AS rowCount FROM " + tableName, {}, function(errors, row) {
            if (errors) {
                deferred.reject(errors);
            }

            else {
                deferred.resolve(row.rowCount);
            }
        });

        return deferred.promise;
    },

    deleteRows: function(databasePath, tableName, whereClause) {
        var deferred = q.defer();
        var database = new sqlite3.Database(databasePath);

        database.run("DELETE FROM " + tableName + " WHERE " + whereClause, {}, function(errors) {
            if (errors) {
                deferred.reject(errors);
            }

            else {
                deferred.resolve();
            }
        });

        return deferred.promise;
    },
    
    getMaxColumnValue: function (databasePath, tableName, columnName) {
        var deferred = q.defer();
        var database = new sqlite3.Database(databasePath);
        
        database.get("SELECT MAX(" + columnName + ") As maxValue FROM " + tableName, {}, function (errors, row) {
            if (errors) {
                deferred.reject(errors);
            }

            else {
                deferred.resolve(row.maxValue);
            }
        });
        
        return deferred.promise;
    },

    validateException: function(errors, expectedMessage) {
        var exception = {
        
        };

        if (typeof (errors) == "string" && errors.toString().substring(0, 1) == "{") {
            exception = JSON.parse(errors);
        }

        else if (typeof (errors) == "string") {
            exception = {
                ExceptionType: "System.Exception",
                Message: errors
            }
        }

        if (exception.ExceptionType && (exception.ExceptionType == "System.Data.SQLite.SQLiteException" || exception.ExceptionType == "Mono.Data.Sqlite.SqliteException")) {
            return;
        }

        assert.equal(exception.Message, expectedMessage);
    },
    
    assertXmlIsEqual: function(expected, actual) {
        var actualXml = actual;
        
        if (typeof (actual) == "string") {
            actualXml = new xmldoc.XmlDocument(actual);
        }

        var expectedXml = new xmldoc.XmlDocument(expected);

        assert.equal(actualXml.toString(), expectedXml.toString());
    },

    assertDictionariesAreEqual: function (expectedDictionary, actualDictionary) {
        if (expectedDictionary == null) {
            assert.equal(actualDictionary, null);
            return;
        }

        for (item in expectedDictionary) {
            if (expectedDictionary.hasOwnProperty(item)) {
                assert.equal(actualDictionary[item], expectedDictionary[item]);
            }
        }

        for (item in actualDictionary) {
            if (actualDictionary.hasOwnProperty(item)) {
                assert.equal(actualDictionary[item], expectedDictionary[item]);
            }
        }
    }
}