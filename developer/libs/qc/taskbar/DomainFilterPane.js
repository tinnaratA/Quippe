define([
    "dojo/_base/declare",
    "qc/taskbar/_NoteFilterPane"
], function (declare, _NoteFilterPane) {
    return declare("qc.taskbar.DomainFilterPane", [_NoteFilterPane], {

        getCategories: function () {
            return [
                { id: 'sx', text: 'Symptoms', test: function (x) { return x.termType == 1 } },
                { id: 'hx', text: 'History', test: function (x) { return x.termType == 5 || x.prefix == 'H' } },
                { id: 'px', text: 'Physical Exam', test: function (x) { return x.termType == 2 } },
                { id: 'tx', text: 'Tests', test: function (x) { return x.termType == 3 } },
                { id: 'dx', text: 'Diagnoses', test: function (x) { return x.termType == 6 } },
                { id: 'rx', text: 'Therapies', test: function (x) { return x.termType == 7 } },
                { id: 'med', text: 'Medications', test: function (x) { return x.termType == 7 && (x.rxCode || '').match('[MN]') } },
                { id: 'pro', text: 'Procedures', test: function (x) { return x.termType == 7 && (x.rxCode || '').match('[PS]') } },
                { id: 'fam', text: 'Family History', test: function(x) {return (x.prefix ||'').match('F[^PU]?') }}
            ];
        }

    });
});
