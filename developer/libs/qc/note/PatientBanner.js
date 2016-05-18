define([
    "qc/note/_Element",
    "dijit/_Container",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/query",
	"qc/_core"
], function (_Element, _Container, declare, domClass, query, core) {
    var PatientBanner = declare("qc.note.PatientBanner", [_Container, _Element], {
        elementName: 'PatientBanner',
            templateString: '<div class="patientBanner" data-dojo-attach-point="containerNode"></div>',
    
            addElement: function (element, relativeTo, position, suspendUpdate, sourceClass) {
                if (sourceClass) {
                    domClass.add(element.domNode, sourceClass);
                };
                this.addChild(element);
            },
    
            writeNoteElement: function (writer, mode) {
                if (mode == 'template') {
                    writer.copyElement(this.sourceXmlNode);
                }
                else {
                    this.inherited(arguments);
                }
            },
    
            finalizeNote: function () {
                if (this.sourceXmlNode) {
                    query('Label', this.sourceXmlNode).forEach(function (label) {
    
                    }, this);
                };
            }
        }
    );

    core.settings.noteElementClasses["qc/note/PatientBanner"] = PatientBanner;

	return PatientBanner;
});