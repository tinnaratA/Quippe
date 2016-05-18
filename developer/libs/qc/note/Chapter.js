define([
    "qc/note/_Group",
    "dojo/_base/declare",
	"qc/_core"
], function (_Group, declare, core) {
    var Chapter = declare("qc.note.Chapter", [_Group], {
        partType: 'chapter',
            partLevel: 2
        }
    );

	core.settings.noteElementClasses["qc/note/Chapter"] = Chapter;

	return Chapter;
});