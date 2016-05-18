var sqlite3 = require('sqlite3');
var q = require('q');
var path = require('path');
var transactionDatabase = require('sqlite3-transactions').TransactionDatabase;
var upgradedDatabases = {};

function sqliteService(databaseFile) {
    this.databaseFile = databaseFile;
    this.database = new transactionDatabase(new sqlite3.Database(databaseFile));
    this.transaction = null;
}

sqliteService.prototype.databaseClose = function () {
    if (this.database) {
        this.database.close();
    }
}

sqliteService.prototype.upgradeDatabase = function () {
    var self = this;
    var deferred = q.defer();

    if (upgradedDatabases[this.databaseFile] || !this.schemaUpdateScripts || this.schemaUpdateScripts.length == 0) {
        upgradedDatabases[this.databaseFile] = true;
        deferred.resolve();
    }

    else {
        var runUpdateScript = function (scriptIndex) {
            if (scriptIndex < self.schemaUpdateScripts.length) {
                self.database.beginTransaction(function (beginTransactionErrors, transaction) {
                    if (beginTransactionErrors) {
                        deferred.reject(JSON.stringify({
                            ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                            Message: typeof beginTransactionErrors == 'string' ? beginTransactionErrors : JSON.stringify(beginTransactionErrors)
                        }));
                    }

                    transaction.exec(self.schemaUpdateScripts[scriptIndex], function (runScriptErrors) {
                        if (runScriptErrors) {
                            transaction.rollback(function (rollbackErrors) {
                                if (rollbackErrors) {
                                    deferred.reject(JSON.stringify({
                                        ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                                        Message: typeof rollbackErrors == 'string' ? rollbackErrors : JSON.stringify(rollbackErrors)
                                    }));
                                }

                                else {
                                    deferred.reject(JSON.stringify({
                                        ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                                        Message: typeof runScriptErrors == 'string' ? runScriptErrors : JSON.stringify(runScriptErrors)
                                    }));
                                }
                            });
                        }

                        else {
                            transaction.run("UPDATE SchemaVersion SET Version=$newVersion", {
                                $newVersion: scriptIndex + 1
                            }, function (updateVersionErrors) {
                                if (updateVersionErrors) {
                                    transaction.rollback(function (rollbackErrors) {
                                        if (rollbackErrors) {
                                            deferred.reject(JSON.stringify({
                                                ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                                                Message: typeof rollbackErrors == 'string' ? rollbackErrors : JSON.stringify(rollbackErrors)
                                            }));
                                        }

                                        else {
                                            deferred.reject(JSON.stringify({
                                                ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                                                Message: typeof updateVersionErrors == 'string' ? updateVersionErrors : JSON.stringify(updateVersionErrors)
                                            }));
                                        }
                                    });
                                }

                                else {
                                    transaction.commit(function (commitErrors) {
                                        if (commitErrors) {
                                            deferred.reject(JSON.stringify({
                                                ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                                                Message: typeof commitErrors == 'string' ? commitErrors : JSON.stringify(commitErrors)
                                            }));
                                        }

                                        else {
                                            runUpdateScript(scriptIndex + 1);
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }

            else {
                upgradedDatabases[self.databaseFile] = true;
                deferred.resolve();
            }
        };

        var doUpdates = function () {
            self.database.get("SELECT Version FROM SchemaVersion", {}, function (getVersionErrors, getVersionRow) {
                if (getVersionErrors) {
                    deferred.reject(JSON.stringify({
                        ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                        Message: typeof getVersionErrors == 'string' ? getVersionErrors : JSON.stringify(getVersionErrors)
                    }));
                }

                else {
                    runUpdateScript(getVersionRow.Version);
                }
            });
        };

        self.database.get("SELECT name FROM sqlite_master WHERE type='table' AND name='SchemaVersion'", {}, function (getTableErrors, row) {
            if (getTableErrors) {
                deferred.reject(JSON.stringify({
                    ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                    Message: typeof getTableErrors == 'string' ? getTableErrors : JSON.stringify(getTableErrors)
                }));
            }

            else {
                if (!row) {
                    self.database.run("CREATE TABLE SchemaVersion(Version INTEGER NOT NULL)", {}, function(createTableErrors) {
                        if (createTableErrors) {
                            deferred.reject(JSON.stringify({
                                ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                                Message: typeof createTableErrors == 'string' ? createTableErrors : JSON.stringify(createTableErrors)
                            }));
                        }

                        else {
                            self.database.run("INSERT INTO SchemaVersion VALUES(0)", {}, function(insertVersionErrors) {
                                if (insertVersionErrors) {
                                    deferred.reject(JSON.stringify({
                                        ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                                        Message: typeof insertVersionErrors == 'string' ? insertVersionErrors : JSON.stringify(insertVersionErrors)
                                    }));
                                }

                                else {
                                    doUpdates();
                                }
                            });
                        }
                    });
                }

                else {
                    doUpdates();
                }
            }
        });
    }

    return deferred.promise;
};

sqliteService.prototype.enableRegexpOperator = function () {
    var deferred = q.defer();

    if (!this.regexpOperatorEnabled) {
        var self = this;
        var platform = process.platform == 'win32' ? 'windows' : 'linux';
        var architecture = process.arch == 'x64' ? 'x64' : 'x86';
        var moduleName = process.platform == 'win32' ? 'pcre.dll' : 'pcre';

        this.database.loadExtension(path.join(__dirname, '..', 'lib', 'sqlite3', platform, architecture, moduleName), function (error) {
            if (!error) {
                self.regexpOperatorEnabled = true;
                deferred.resolve();
            }

            else {
                deferred.reject(error);
            }
        });
    }

    else {
        deferred.resolve();
    }

    return deferred.promise;
};

sqliteService.prototype.databaseAll = function (sql, parameters, map) {
    var deferred = q.defer();
    var self = this;

    this.upgradeDatabase().then(function () {
        (self.transaction || self.database).all(sql, parameters || {}, function (errors, rows) {
            if (errors) {
                deferred.reject(JSON.stringify({
                    ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                    Message: typeof errors == 'string' ? errors : JSON.stringify(errors)
                }));
            }

            else {
                deferred.resolve(map ? map(rows) : rows);
            }
        });
    }, function (errors) {
        deferred.reject(errors);
    });

    return deferred.promise;
};

sqliteService.prototype.databaseGet = function (sql, parameters, map) {
    var deferred = q.defer();
    var self = this;

    this.upgradeDatabase().then(function() {
        (self.transaction || self.database).get(sql, parameters || {}, function(errors, row) {
            if (errors) {
                deferred.reject(JSON.stringify({
                    ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                    Message: typeof errors == 'string' ? errors : JSON.stringify(errors)
                }));
            }

            else {
                deferred.resolve(map ? map(row) : row);
            }
        });
    }, function (errors) {
        deferred.reject(errors);
    });

    return deferred.promise;
};

sqliteService.prototype.databaseRun = function (sql, parameters) {
    var deferred = q.defer();
    var self = this;

    this.upgradeDatabase().then(function() {
        (self.transaction || self.database).run(sql, parameters || {}, function(errors) {
            if (errors) {
                deferred.reject(JSON.stringify({
                    ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                    Message: typeof errors == 'string' ? errors : JSON.stringify(errors)
                }));
            }

            else {
                deferred.resolve();
            }
        });
    }, function (errors) {
        deferred.reject(errors);
    });

    return deferred.promise;
}

sqliteService.prototype.getDateString = function (date) {
    if (typeof date == "string") {
        date = this.getDateFromString(date);
    }

    if (!date) {
        return null;
    }

    var dateString = date.getFullYear() + "-" + this.padLeft(2, '0', (date.getMonth() + 1).toString()) + "-" + this.padLeft(2, '0', date.getDate().toString()) + "T" + this.padLeft(2, '0', date.getHours().toString()) + ":" + this.padLeft(2, '0', date.getMinutes().toString()) + ":" + this.padLeft(2, '0', date.getSeconds().toString()) + "." + this.padLeft(3, '0', date.getMilliseconds().toString());
    return dateString;
};

sqliteService.prototype.getDateFromString = function (dateString) {
    if (!dateString) {
        return null;
    }

    var date = new Date(dateString.replace('T', ' '));
    return date;
};

sqliteService.prototype.stringIsNullOrEmpty = function(testString) {
    return typeof testString == 'undefined' || testString == null || testString == '';
}

sqliteService.prototype.beginTransaction = function () {
    var deferred = q.defer();
    var self = this;

    this.upgradeDatabase().then(function() {
        self.database.beginTransaction(function(errors, transaction) {
            if (errors) {
                deferred.reject(errors);
            }

            else {
                self.transaction = transaction;
                deferred.resolve();
            }
        });
    }, function(errors) {
        deferred.reject(errors);
    });

    return deferred.promise;
};

sqliteService.prototype.commitTransaction = function(result) {
    var deferred = q.defer();
    var self = this;

    this.transaction.commit(function (errors) {
        if (errors) {
            deferred.reject(JSON.stringify({
                ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                Message: typeof errors == 'string' ? errors : JSON.stringify(errors)
            }));
        }

        else {
            deferred.resolve(result);
        }

        self.transaction = null;
    });
    
    return deferred.promise;
};

sqliteService.prototype.rollbackTransaction = function () {
    var deferred = q.defer();
    var self = this;
    
    this.transaction.rollback(function (errors) {
        if (errors) {
            deferred.reject(JSON.stringify({
                ExceptionType: process.platform == 'win32' ? 'System.Data.SQLite.SQLiteException' : 'Mono.Data.Sqlite.SqliteException',
                Message: typeof errors == 'string' ? errors : JSON.stringify(errors)
            }));
        }

        else {
            deferred.resolve();
        }
        
        self.transaction = null;
    });
    
    return deferred.promise;
};

sqliteService.prototype.padLeft = function (padCount, padCharacter, sourceString) {
    return Array(padCount - sourceString.length + 1).join(padCharacter) + sourceString;
};

module.exports = sqliteService;