define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "qc/design/StandardDialog"
], function (declare, domConstruct, StandardDialog) {
    return declare("qc.design.StyleEditorDialog", [StandardDialog], {
        title: 'Document Styles',
        stylesheetId: 'DocumentStyleSheet',
        textEditor: null,
    
        startup: function () {
            if (!this._started) {
                this.textEditor = domConstruct.place('<textarea rows="20" cols="80"></textarea>', this.contentArea.domNode);
                this.inherited(arguments);
            };
        },
    
        show: function () {
            this.loadStyles();
            this.inherited(arguments);
        },
    
        loadStyles: function () {
            var node = document.getElementById(this.stylesheetId);
            if (node) {
                this.textEditor.value = (node.textContent || node.innerHTML || '').trim();
            };
        },
    
        saveStyles: function () {
            var styleText = this.textEditor.value.trim();
            var node = document.getElementById(this.stylesheetId);
            if (styleText) {
                if (!node) {
                    node = domConstruct.place('<style type="text/css" id="' + this.stylesheetId + '"></style>', document.getElementsByTagName('head')[0]);
                }
                node.innerHTML = styleText;
            }
            else {
                if (node) {
                    node.parentNode.removeChild(node);
                }
            };
        },
    
        onOKClick: function () {
            this.saveStyles();
            this.inherited(arguments);
        }
    });
});