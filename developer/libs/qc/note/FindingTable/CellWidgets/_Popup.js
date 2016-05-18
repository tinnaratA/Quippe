define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
	"dojo/dom-style",
    "dojo/_base/lang",
    "dojo/on",
	"qc/_core",
    "qc/design/OptionListEditorDialog",
    "qc/note/FindingTable/CellWidgets/_Base"
], function (declare, domClass, domConstruct, domStyle, lang, on, core, OptionListEditorDialog, _Base) {
    return declare("qc.note.FindingTable.CellWidgets._Popup", [_Base], {
        templateString: '<div class="cellWidget cmpTbl popup qcddPrevent" data-dojo-attach-event="onclick:onClick">'
                      + '  <div class="cmpRow" data-dojo-attach-point="rowContainer">'
                      + '    <div class="cmpCell" data-dojo-attach-point="textContainer">'
                      + '      <input type="text" class="textBoxNode" data-dojo-attach-point="textBoxNode" data-dojo-attach-event="change:onTextBoxChanged" />'
                      + '    </div>'
                      + '    <div class="cmpCell buttonCell">'
                      + '      <div class="buttonNode" data-dojo-attach-point="buttonNode"></div>'
                      + '    </div>'
                      + '  </div>'
                      + '</div>',
        textEditable: true,
        multiLine: false,

        _getMultiLineAttr: function () {
            return this.multiLine;
        },
        _setMultiLineAttr: function (value) {
            if (value) {
                this.renderTextArea();
            }
            else {
                this.renderInputBox();
            };
        },

        renderInputBox: function () {
            if (this.textBoxNode && this.textBoxNode.tagName.toLowerCase() == 'input') {
                return this.textBoxNode;
            };
            var text = '';
            if (this.textBoxNode) {
                text = this.textBoxNode.value;
                domConstruct.destroy(this.textBoxNode);
            };
            this.textBoxNode = domConstruct.place('<input type="text" class="textBoxNode" />', this.textContainer, 'first');
            on(this.textBoxNode, 'change', lang.hitch(this, this.onTextBoxChanged));
            this.textBoxNode.value = text;
            this.multiLine = false;

            return this.textBoxNode;
        },

        renderTextArea: function () {
            if (this.textBoxNode && this.textBoxNode.tagName.toLowerCase() == 'textarea') {
                return this.textBoxNode;
            };
            var text = '';
            if (this.textBoxNode) {
                text = this.textBoxNode.value;
                domConstruct.destroy(this.textBoxNode);
            };
            this.textBoxNode = domConstruct.place('<textarea class="textBoxNode" style="width:100%;height:100%;resize:none"></textarea>', this.textContainer, 'first');
            this.textBoxNode.value = text;
            on(this.textBoxNode, 'change', lang.hitch(this, this.onTextBoxChanged));
            this.multiLine = true;

            return this.textBoxNode;
        },
    
        _setTextEditableAttr: function (value) {
            this.textEditable = value ? true : false;
            if (this.textEditable) {
                this.textBoxNode.removeAttribute('readonly');
                domClass.remove(this.domNode, 'noEdit');
            }
            else {
                this.textBoxNode.setAttribute('readonly', true);
                domClass.add(this.domNode, 'noEdit');
            };
        },
    
        updateDisplay: function () {
            this.textBoxNode.value = this.getFormattedValue();
        },
    
        onClick: function (evt) {
            if (domClass.contains(evt.target, 'buttonNode')) {
                this.showPopup();
            }
            else if (!this.textEditable && domClass.contains(evt.target, 'textBoxNode') && !this.isDesignMode()) {
                this.showPopup();
            };
        },
    
        onTextBoxChanged: function () {
            if (this.textEditable) {
                var textValue = this.textBoxNode.value || ''
                if (textValue != (this.value || '')) {
                    this.set('value', textValue);
                };
            };
        },
    
        showPopup: function () {
        },

        _pgPropDef_multiLine: function () {
            return { name: 'multiLine', caption: 'Multiline', type: 'boolean', group: 'Data Entry', description: core.getI18n('tooltipMultiline') };
        }
    
    });
});