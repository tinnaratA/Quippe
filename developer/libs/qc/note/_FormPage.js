define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/topic",
	"qc/_core",
    "qc/note/_Group"
], function (declare, domClass, topic, core, _Group) {
    var TypeDef = declare("qc.note._FormPage", [_Group], {
        elementName: 'Page',
        partType: 'page',
        partLevel: 0,
        showHeader: false,
        showEmpty: true,
        pageId: '',
        owner: null,
        _allowDeferredChildren: false,

        postCreate: function () {
            this.inherited(arguments);
            domClass.add(this.domNode, 'qcFormPage page');
        },

        _setTextAttr: function(value) {
            this.inherited(arguments);
            if (this.owner && this.owner.updateTitle) {
                this.owner.updateTitle();
            }
        },

        writeNoteAttributes: function (writer, mode) {
            writer.attribute('Type', 'qc.note._FormPage');
            this.inherited(arguments);
        },

        toggleSelection: function (evt) {
            var value = !this.isSelected();
            this.setSelected(value);
            if (value) {
                this.ensureVisible();
            };
        },

        ensureVisible: function() {
            if (!domClass.contains(this.domNode, 'active')) {
                if (this.owner && this.owner.showPage) {
                    this.owner.showPage(this.pageId);
                };
            };
        },

        _onDeferredContentResolved: function () {
            if (this.owner && this.owner.synchHostToForm) {
                this.owner.synchHostToForm(this);
            };
        },

        _pgPropDef_anchor: function () { return null },
        _pgPropDef_level: function () { return null },
        _pgPropDef_showEmpty: function () { return null },
        _pgPropDef_freeTextMedcinId: function () { return null },
        _pgPropDef_groupKeys: function () { return null },
        _pgPropDef_groupingRule: function () { return null },
        _pgPropDef_placementId: function () { return null },
        _pgPropDef_position: function () { return null },
        _pgPropDef_autoPrompt: function () { return null },
        _pgPropDef_findingPlacement: function () { return null }
    });

    core.settings.noteElementClasses["qc/note/_FormPage"] = TypeDef;

    return TypeDef;
});