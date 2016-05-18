define([
    "qc/coding/CodingManager",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
	"dijit/_WidgetsInTemplateMixin",
    "dijit/popup",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/text!qc/coding/templates/CodingOptionDialog.htm",
    "qc/_core"
], function (CodingManager, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, popup, declare, lang, domClass, domConstruct, domGeometry, domStyle, CodingOptionDialogTemplate, core) {
	return declare("qc.coding.CodingOptionDialog", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: CodingOptionDialogTemplate,
        treeNode: null,
        vocabName: '',
        findingWidget: null,
        entryPanel: null,
    
        loadMap: function (treeNode, vocabName, currentEntry) {
            if (!treeNode || !treeNode.isNoteFinding()) {
                return false;
            };
    
            if (vocabName.toLowerCase() == 'medcin') {
                return false;
            };
    
            if (this.vocabName) {
                domClass.remove(this.domNode, this.vocabName);
            };
    
            var panel = CodingManager.getEntryPanel(vocabName, treeNode.refWidget);
            if (!panel) {
                return false;
            };
    
            domConstruct.empty(this.contentArea);
            panel.placeAt(this.contentArea);
            panel.owner = this;
            panel.reposition = lang.hitch(this, this.reposition);
            this.entryPanel = panel;
    
            return (panel != null);
        },
    
        resetContent: function () {
            if (this.entryPanel) {
                this.entryPanel.destroyRecursive();
            };
        },
    
        reposition: function () {
            if (!this.popupPosition) {
                return;
            };
    
            var popup = core.ancestorNodeByClass(this.domNode, 'dijitPopup');
            if (!popup) {
                return;
            };
    
            var posCurrent = domGeometry.position(popup);
            domStyle.set(popup, { top: (this.popupPosition.y + this.popupPosition.h - posCurrent.h) + 'px' });
        },
    
        onApply: function () {
            if (this.entryPanel) {
                this.entryPanel.applyCode();
            };
            popup.close();
        },
    
        onCancel: function () {
            popup.close();
        }
    
    });
});