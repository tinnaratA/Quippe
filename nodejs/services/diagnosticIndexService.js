var quippe = require('@medicomp/quippe');
var sqliteService = require('./sqliteService');
var path = require('path');
var util = require('util');

function diagnosticIndexService() {
    sqliteService.apply(this, [path.join(quippe.config.dataDirectory, 'expert.dat')]);
};

util.inherits(diagnosticIndexService, sqliteService);

diagnosticIndexService.prototype.GetCrossDiagnosticIndex = function (data) {
    return this.databaseAll("select * from diagnostic where dfinding=$medcinId", {
        $medcinId: data.MedcinId
    }, function (rows) {
        return rows;
    });
};

diagnosticIndexService.prototype.GetDiagnosticIndex = function (data) {
    return this.databaseAll("select dFinding, dPrefix, termType, replace(dNodeKey, ' ', '-') as 'dNodeKey', iPrompt, iFU, present, absent, scale1,  scale2,  scale3,  scale4,  scale5,  scale6,  scale7, startage, endage, expire, delay from diagnostic where medcinId = $medcinId order by dNodeKey", {
        $medcinId: data.MedcinId
    }, function (rows) {
        return rows;
    });
};

quippe.registerService(['Quippe.IDiagnosticIndexService'], {
    GetCrossDiagnosticIndex: function (data) {
        var service = new diagnosticIndexService();
        return service.GetCrossDiagnosticIndex(data);
    },

    GetDiagnosticIndex: function (data) {
        var service = new diagnosticIndexService();
        return service.GetDiagnosticIndex(data);
    }
}, {
    usesPromises: true
});