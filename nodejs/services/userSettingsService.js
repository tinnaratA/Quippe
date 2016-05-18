var config = require(__dirname+'/config/config.json');

var q = require('q');
var quippe = require('@medicomp/quippe');
var personalSqliteService = require('./personalSqliteService');
var util = require('util');
var fs = require('fs');
var path = require('path');
var domParser = require('xmldom').DOMParser;
var xpath = require('xpath');
var xml2js = require('xml2js');
var mongoose=require('mongoose');
var Client = require('node-rest-client').Client;
var client = new Client();
var fs = require('fs');

eval(fs.readFileSync('lib/md5/md5.js'));

function userSettingsService(username) {
    this.username = username;
};

userSettingsService.prototype.GetSchema = function () {
    var deferred = q.defer();

    fs.exists(path.join(quippe.config.dataDirectory, 'UserData', "_Templates", "settings.xml"), function(exists) {
        if (!exists) {
            deferred.resolve("<Settings/>");
        }

        else {
            fs.readFile(path.join(quippe.config.dataDirectory, 'UserData', "_Templates", "settings.xml"), function(errors, data) {
                if (errors) {
                    deferred.reject(errors);
                }

                deferred.resolve(String(data).trim());
            });
        }
    });

    return deferred.promise;
};

//userSettingsService.prototype.GetSettings = function (data) {
//    var self = this;
//
//    return this.GetDefaultSettings().then(function(defaultSettings) {
//        return self.GetUserSettings().then(function(userSettings) {
//            for (var setting in userSettings) {
//                defaultSettings[setting] = userSettings[setting];
//            }
//
//            return defaultSettings;
//        });
//    });
//};

userSettingsService.prototype.GetSettings = function (data) {
    var self = this;
    var promise = q.defer();
    client.get(config.rest_host + "/bcds/usersetup/get?user=" + data.ContextData.Username,
        function (data, response) {

            try {
                data = JSON.parse(data);
                if (data.error == null) {
                    promise.resolve(data[0].setting);
                } else {
                    promise.error(data.error);
                }
            } catch (err) {
                promise.resolve(null);
            }
        }
    );
    return promise.promise;
};

//userSettingsService.prototype.Reset = function (data) {
//    var self = this;
//
//    return this.GetDefaultSettings().then(function (defaultSettings) {
//        return self.GetUserSettings().then(function (userSettings) {
//            var deferred = q.defer();
//
//            fs.exists(path.join(quippe.config.dataDirectory, 'UserData', self.username), function (exists) {
//                var saveSettings = function () {
//                    var settingsToSave = {
//                        Item: []
//                    };
//
//                    for (var userSetting in userSettings) {
//                        if (defaultSettings[userSetting] != null && typeof defaultSettings[userSetting] != "undefined") {
//                            if (!(typeof data.Path == 'undefined' || data.Path == null || data.Path == '' || userSetting.indexOf(data.Path) == 0 || defaultSettings[userSetting] == userSettings[userSetting])) {
//                                settingsToSave.Item.push({
//                                    $: {
//                                        id: userSetting,
//                                        Value: userSettings[userSetting]
//                                    }
//                                });
//                            }
//                        }
//                    }
//
//                    var xmlBuilder = new xml2js.Builder({
//                        rootName: 'Settings',
//                        headless: true
//                    });
//
//                    var settingsXml = xmlBuilder.buildObject(settingsToSave);
//
//                    fs.writeFile(path.join(quippe.config.dataDirectory, 'UserData', self.username, "settings.xml"), settingsXml, function (errors) {
//                        if (errors) {
//                            deferred.reject(errors);
//                        }
//
//                        else {
//                            deferred.resolve(true);
//                        }
//                    });
//                }
//
//                if (!exists) {
//                    fs.mkdir(path.join(quippe.config.dataDirectory, 'UserData', self.username), function (errors) {
//                        if (errors) {
//                            deferred.reject(errors);
//                        }
//
//                        else {
//                            saveSettings();
//                        }
//                    });
//                }
//
//                else {
//                    saveSettings();
//                }
//            });
//
//            return deferred.promise;
//        });
//    });
//};

userSettingsService.prototype.Reset = function (data) {
    //console.log("Start UpdateSettings");
    var promise = q.defer();
    var self = this;

    client.get(config.rest_host + "/bcds/usersetup/get?user=default",
        function (usersetupDefaultData, response) {
            usersetupDefaultData = JSON.parse(usersetupDefaultData);
            if (usersetupDefaultData.error == null) {
                client.get(config.rest_host + "/bcds/usersetup/get?user=" + data.ContextData.Username,
                    function (usersetupData, response) {
                        usersetupData = JSON.parse(usersetupData);
                        usersetupData.setting = usersetupDefaultData[0].setting;
                        var args = {
                            data: {
                                restuser: "bexchange",
                                restpass: "Bexch@nge",
                                jsondata: encodeURIComponent(JSON.stringify(usersetupData))
                            },
                            headers: {"Content-Type": "application/json"}
                        };
                        client.post(config.rest_host + "/bcds/usersetup/set", args,
                            function (usersetup_save_data, response) {
                                usersetup_save_data = JSON.parse(usersetup_save_data);
                                if (usersetup_save_data.error) {
                                    promise.reject(usersetup_save_data.error);
                                } else {
                                    promise.resolve(true);
                                }
                            });
                    }
                );
                return promise.promise;
            } else {
                promise.resolve(false);
            }
            return promise.promise;
        }
    );
};

//userSettingsService.prototype.UpdateSettings = function (data) {
//    var self = this;
//
//    return this.GetDefaultSettings().then(function(defaultSettings) {
//        return self.GetUserSettings().then(function(userSettings) {
//            for (var setting in data.Values) {
//                userSettings[setting] = data.Values[setting];
//            }
//
//            var deferred = q.defer();
//
//            fs.exists(path.join(quippe.config.dataDirectory, 'UserData', self.username), function (exists) {
//                var saveSettings = function () {
//                    var settingsToSave = {
//                        Item: []
//                    };
//
//                    for (var userSetting in userSettings) {
//                        if (defaultSettings[userSetting] != null && typeof defaultSettings[userSetting] != "undefined") {
//                            if (defaultSettings[userSetting] != userSettings[userSetting]) {
//                                settingsToSave.Item.push({
//                                    $: {
//                                        id: userSetting,
//                                        Value: userSettings[userSetting]
//                                    }
//                                });
//                            }
//                        }
//                    }
//
//                    var xmlBuilder = new xml2js.Builder({
//                        rootName: 'Settings',
//                        headless: true
//                    });
//
//                    var settingsXml = xmlBuilder.buildObject(settingsToSave);
//
//                    fs.writeFile(path.join(quippe.config.dataDirectory, 'UserData', self.username, "settings.xml"), settingsXml, function(errors) {
//                        if (errors) {
//                            deferred.reject(errors);
//                        }
//
//                        else {
//                            deferred.resolve(true);
//                        }
//                    });
//                }
//
//                if (!exists) {
//                    fs.mkdir(path.join(quippe.config.dataDirectory, 'UserData', self.username), function (errors) {
//                        if (errors) {
//                            deferred.reject(errors);
//                        }
//
//                        else {
//                            saveSettings();
//                        }
//                    });
//                }
//
//                else {
//                    saveSettings();
//                }
//            });
//
//            return deferred.promise;
//        });
//    });
//};

userSettingsService.prototype.UpdateSettings = function (data) {
    //console.log("Start UpdateSettings");
    var promise = q.defer();
    var self = this;
    var db = mongoose.createConnection('mongodb://' + config.db_host + '/BEXBCDS');

    var usersetups = db.model('usersetups', {
        _id: "",
        user: "",
        setting: ""
    });

    //console.log("mongoose connect");
    db.on('error', function (err) {
        //console.log(err);
        promise.reject(err);
    });

    client.get(config.rest_host + "/bcds/usersetup/get?user=default",
        function (usersetupDefaultData, response) {
            usersetupDefaultData = JSON.parse(usersetupDefaultData);
            if (usersetupDefaultData.error == null) {
                client.get(config.rest_host + "/bcds/usersetup/get?user=" + data.ContextData.Username,
                    function (usersetupData, response) {
                        usersetupData = JSON.parse(usersetupData);
                        if (usersetupData.error) {
                            delete usersetupDefaultData[0]._id;
                            usersetupDefaultData[0].user = data.ContextData.Username;
                            usersetupData = usersetupDefaultData[0];
                        } else {
                            usersetupData = usersetupData[0];
                        }
                        for (var setting in data.Values) {
                            usersetupData.setting[setting] = data.Values[setting];
                        }
                        var args = {
                            data: {
                                restuser: "bexchange",
                                restpass: "Bexch@nge",
                                jsondata: encodeURIComponent(JSON.stringify(usersetupData))
                            },
                            headers: {"Content-Type": "application/json"}
                        };
                        client.post(config.rest_host + "/bcds/usersetup/set", args,
                            function (usersetup_save_data, response) {
                                usersetup_save_data = JSON.parse(usersetup_save_data);
                                if (usersetup_save_data.error) {
                                    promise.reject(usersetup_save_data.error);
                                } else {
                                    promise.resolve(true);
                                }
                            });
                    }
                );
                return promise.promise;
            } else {
                promise.resolve(false);
            }
            return promise.promise;
        }
    );
};

userSettingsService.prototype.GetUserSettings = function () {
    var deferred = q.defer();
    var settings = {};
    var self = this;
    
    fs.exists(path.join(quippe.config.dataDirectory, 'UserData', this.username, "settings.xml"), function (exists) {
        if (!exists) {
            deferred.resolve(settings);
        }

        else {
            fs.readFile(path.join(quippe.config.dataDirectory, 'UserData', self.username, "settings.xml"), function(errors, data) {
                if (errors) {
                    deferred.reject(errors);
                }

                data = String(data).trim();

                var xmlDocument = new domParser().parseFromString(data);
                var settingNodes = xpath.select('//Item', xmlDocument);

                for (var i = 0; i < settingNodes.length; i++) {
                    var id = xpath.select1("@id", settingNodes[i]).value;
                    var valueNode = xpath.select1("@Value", settingNodes[i]);
                    var value = valueNode ? valueNode.value : '';

                    if (!settings[id]) {
                        settings[id] = value;
                    }
                }

                deferred.resolve(settings);
            });
        }
    });

    return deferred.promise;
};

userSettingsService.prototype.GetDefaultSettings = function() {
    return this.GetSchema().then(function(schema) {
        var xmlDocument = new domParser().parseFromString(schema);
        var select = xpath.useNamespaces({
            "s": "http://schemas.medicomp.com/V3/UserSettings.xsd"
        });
        var settingNodes = select('//s:Item', xmlDocument);
        var settings = {};

        for (var i = 0; i < settingNodes.length; i++) {
            var id = select("@id", settingNodes[i])[0].value;
            var valueNodes = select("@Value", settingNodes[i]);
            var value = valueNodes.length == 1 ? valueNodes[0].value : '';

            if (!settings[id]) {
                settings[id] = value;
            }
        }

        return settings;
    });
};

var getHandlerAndCall = function (data, method) {
    var userSettingsHandler = new userSettingsService(data.ContextData.Username);
    
    try {
        return userSettingsHandler[method](data);
    }

    catch (errors) {
        var deferred = q.defer();
        deferred.reject(errors);
        
        return deferred.promise;
    }
}

quippe.registerService(['Quippe.IUserSettingsService'], {
    GetSchema: function (data) {
        return getHandlerAndCall(data, 'GetSchema');
    },
    
    GetSettings: function (data) {
        return getHandlerAndCall(data, 'GetSettings');
    },
    
    Reset: function (data) {
        return getHandlerAndCall(data, 'Reset');
    },
    
    UpdateSettings: function (data) {
        return getHandlerAndCall(data, 'UpdateSettings');
    }
}, {
    usesPromises: true
});