var sqliteService = require('./sqliteService');
var util = require('util');
var quippe = require('@medicomp/quippe');
var fs = require('fs');
var wrench = require('wrench');
var path = require('path');

function personalSqliteService(username, dataFileName, templateFileName) {
    this.username = username;
    
    if (!fs.existsSync(path.join(quippe.config.dataDirectory, 'UserData', this.username))) {
        fs.mkdirSync(path.join(quippe.config.dataDirectory, 'UserData', this.username));
    }
    
    if (!fs.existsSync(path.join(quippe.config.dataDirectory, 'UserData', this.username, dataFileName))) {
        var templateFileContents = fs.readFileSync(path.join(quippe.config.dataDirectory, 'UserData', "_Templates", templateFileName || dataFileName));
        fs.writeFileSync(path.join(quippe.config.dataDirectory, 'UserData', this.username, dataFileName), templateFileContents);
    }

    sqliteService.apply(this, [path.join(quippe.config.dataDirectory, 'UserData', this.username, dataFileName)]);
}

util.inherits(personalSqliteService, sqliteService);

module.exports = personalSqliteService;