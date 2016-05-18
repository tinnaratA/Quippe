define([
    "qc/TimingPanel",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "qc/_core",
	"qc/design/StandardDialog",
	"qc/TimingTranscriber",
    "qc/note/Component_label"
], function (TimingPanel, declare, domClass, domConstruct, core, StandardDialog, TimingTranscriber, Component_label) {
    return declare("qc.note.Component_timingPopup", [Component_label], {
        entryClass: 'timingPopup',
        propertyName: 'timing',
        defaultValue: '',
    
        createNode: function () {
    
            var domNode = this.inherited(arguments);
            domClass.add(domNode, 'qcddPrevent');
    
            var table = domConstruct.place('<div class="cbTbl"></div>', domNode);
            var row = domConstruct.place('<div class="cbRow"></div>', table);
    
            var cell1 = domConstruct.place('<div class="cbCell"></div>', row);
    
            this.labelNode = domConstruct.place('<div class="lbl"></div>', cell1);
    
            var cell2 = domConstruct.place('<div class="cbCell arrowCell"></div>', row);
            this.arrowNode = domConstruct.place('<div class="arrow"></div>', cell2);
    
            this.domNode = domNode;
            return domNode;
        },
    
    
        getValue: function () {
            return this.labelNode ? this.labelNode.innerHTML : '';
        },
    
        setValue: function (value) {
            if (this.labelNode) {
                if (value ) {
                    this.labelNode.innerHTML = value;
                }
                else if (this.owner && this.owner.timingComponents) {
                    this.labelNode.innerHTML = TimingTranscriber.transcribe(this.owner.timingComponents);
                };
                if (!this.labelNode.innerHTML) {
                    this.labelNode.innerHTML= this.defaultValue;
                };
            };
        },
    
        onClick: function (evt) {
            if (this.isDisabled) {
                return;
            };
            if (core.ancestorNodeByClass(evt.target, 'arrowCell', true)) {
                this.showEditor();
            };
        },
    
    
        showEditor: function() {
            var timingPanel = new TimingPanel();
            timingPanel.startup();
            var finding = this.getOwner();
            var components = finding ? finding.timingComponents || []: [];
            timingPanel.set('components', components);
            core.doDialog(StandardDialog, {title: 'Timing', content: timingPanel }, function() {
                finding.timingComponents = timingPanel.get('components');
                finding.timing = TimingTranscriber.transcribe(finding.timingComponents);
                this.labelNode.innerHTML = finding.timing || '';
            }, null, this);
        }
    
    });
});