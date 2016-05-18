define([
    "qc/note/_Element",
    "dijit/layout/ContentPane",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
	"qc/_core"
], function (_Element, ContentPane, declare, domClass, domConstruct, core) {
    var contentPane = declare("qc.note.ContentPane", [_Element], {
        styleClass: '',
            displayStyle: '',
            templateString: '<div data-dojo-attach-point="containerNode"></div>',
            childStyleClass: '',
            elementName: 'ContentPane',
            isContainer: true,
    
            addElement: function (element, relativeTo, position, suspendUpdate, sourceClass) {
                domConstruct.place(element.domNode, this.domNode);
                if (this.childStyleClass) {
                    domClass.add(element.domNode, this.childStyleClass);
                };
                if (sourceClass) {
                    domClass.add(element.domNode, sourceClass);
                };
            },
    
            _setDisplayStyleAttr: function (value) {
                this._applyStyleAttribute(value, this.domNode);
            },
    
            _setStyleClassAttr: function (value) {
                if (value) {
                    domClass.add(this.domNode, value);
                }
            }
        }
    );

    core.settings.noteElementClasses["qc/note/ContentPane"] = contentPane;

	return contentPane;
});