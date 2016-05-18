define([
    "qc/note/_Group",
    "dojo/_base/declare",
	"qc/_core"
], function (_Group, declare, core) {
    var Group = declare("qc.note.Group", [_Group], {
        partType: 'group',
            partLevel: 4
        }
    );

    core.settings.noteElementClasses["qc/note/Group"] = Group;

	return Group;
});