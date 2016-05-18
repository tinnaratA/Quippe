define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/on",
	"qc/_core",
    "qc/note/_Group",
    "qc/note/Section"
], function (declare, lang, domClass, on, core, _Group, Section) {
    var section = declare("qx._TestExt._Group", [Section], {
        postCreate: function () {
            domClass.add(this.domNode, 'expandable');
            domClass.add(this.domNode, 'collapsed');
            on(this.innerLabel, "click", lang.hitch(this, this.toggleExpansion));
            this.inherited(arguments);
        },
    
        updateDisplay: function () {
            this.inherited(arguments);
            if (this.hasFindings()) {
                this.expand();
            }
            else {
                this.collapse();
            };
        }
    
    });

    core.settings.noteElementClasses["qc/note/Section"] = section;

	return section;
});