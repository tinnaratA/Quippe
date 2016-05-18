define([
    "dojo/_base/declare",
    "dojo/request",
    "dojo/when",
    "qc/taskbar/_NoteFilterPane"
], function (declare, request, when, _NoteFilterPane) {
    return declare("qc.taskbar.PrefixFilterPane", [_NoteFilterPane], {

        getCategories: function () {
            return request.get(core.serviceURL('Quippe/Enum/prefix'), {
                query: { orderBy: 2, dataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                var list = [];
                var items = data["enum"] ? data["enum"].item : [];
                items.forEach(function (item) {
                    list.push({
                        id: item.code,
                        text: item.description,
                        test: function (finding) {
                            return finding && finding.prefix == item.code;
                        }
                    });
                });
                return list;
            });
        }
    });
});
