//var mapItem = require('./helpers/mapItem');
//var quippe = require('@medicomp/quippe');

//quippe.registerRoute("GET", "/Quippe/ContentLibrary/List", function (request, response, next) {
//    quippe.services["Quippe.IContentLibraryService"].GetItems({
//        ParentId: request.query.ParentId,
//        TypeName: request.query.TypeName,
//        Attributes: request.query.Attributes || -1,
//        Username: 'admin'
//    }, function (serviceError, serviceResponse) {
//        if (serviceError) {
//            return next(serviceError);
//        }

//        var items = serviceResponse ? serviceResponse.map(mapItem) : null;
//        quippe.writeResponse(request, response, { items: items }, serviceError);
//        next();
//    });
//});