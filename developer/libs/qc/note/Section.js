define([
    "qc/note/_Group",
	"qc/_core",
    "dojo/_base/declare"
], function (_Group, core, declare) {
    var Section = declare("qc.note.Section", [_Group], {
        partType: 'section',
            partLevel: 3
        }
    );

    core.settings.noteElementClasses["qc/note/Section"] = Section;

	return Section;
});