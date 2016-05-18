define([
    "dojo/_base/declare",
    "dojo/request",
    "dojo/when",
    "qc/taskbar/_NoteFilterPane",
    "qc/_core"
], function (declare, request, when, _NoteFilterPane, core) {
    return declare("qc.taskbar.SpecialtyFilterPane", [_NoteFilterPane], {

        shouldShow: function (group, itemCount) {
            if (this.get('showAll')) {
                return true;
            };

            if (group.hidden) {
                return false;
            };

            if (core.Patient) {
                if (group.femaleOnly && core.Patient.sex != 'F') {
                    return false;
                }

                if (group.minAge && group.minAge > (core.Patient.ageInMinutes || Infinity)) {
                    return false;
                }

                if (group.maxAge && group.maxAge < (core.Patient.ageInMinutes || 0)) {
                    return false;
                }
            };

            return itemCount > 0;
        },

        getCategories: function () {
            return request.get(core.serviceURL('Quippe/Enum/specialty'), {
                query: { orderBy: 2, dataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                var list = [];
                var items = data["enum"] ? data["enum"].item : [];
                items.forEach(function (item) {
                    var keep = true
                    list.push({
                        id: item.code,
                        text: item.description,
                        test: function (finding) {
                            return finding && finding.specialty == '*' || (finding.specialty || '').indexOf(item.code) >= 0;
                        },
                        hidden: /^[1456LM\*]$/.test(item.code),    // hide broad specialties (Trauma, Critical Care, Family Practice, General Practice, Internal Medicine)
                        femaleOnly: /^[FG]$/.test(item.code),   // Obstetrics & Gynecology
                        minAge: item.code == '7' ? (65 * 365.25 * 24 * 60) : null,     // minAge = 65 years for Geriatrics
                        maxAge: item.code == 'Y' ? (21 * 365.25 * 24 * 60) : null   // maxAge = 21 years for Pediatrics
                    });
                });
                return list;
            });
        }
    });
});
