define([
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/dom-style",
	"dojo/keys",
    "dojo/text!qc/design/templates/FindingChooserDialog.htm",
    "qc/Dialog",
    "qc/MedcinTree"
], function (_WidgetsInTemplateMixin, declare, event, domStyle, keys, FindingChooserDialogTemplate, Dialog, MedcinTree) {
    return declare("qc.design.FindingChooserDialog", [Dialog, _WidgetsInTemplateMixin], {
        templateString: FindingChooserDialogTemplate,
        
        showFindingName: true,
        findingName: '',
        findingNameRequired: true,
    
        title: 'Finding Chooser',
    
        startup: function () {
            if (!this._started) {
                this.treeView.browse();
                this.inherited(arguments);
            };
        },
    
    
        _getFindingNameAttr: function () {
            return this.txtFindingName.get('value');
        },
        _setFindingNameAttr: function (value) {
            this.txtFindingName.set('value', value);
        },
    
        _setShowFindingNameAttr: function (value) {
            domStyle.set(this.findingNameNode, 'display', value ? 'block' : 'none');
        },
    
        _setFindingNameRequiredAttr: function (value) {
            this.findinNameRequired = value;
            if (value) {
                this.set('showFindingName', true);
            };
        },
    
        _getValueAttr: function () {
            var termData = this.treeView.getSelectedItem();
            if (termData) {
                termData.name = this.txtFindingName.get('value');
                return termData;
            }
            else {
                return null;
            };
        },
    
        _setValueAttr: function (value) {
            if (!value) {
                return;
            };
    
            var medcinId = -1;
            if (typeof value == 'number') {
                medcinId = value;
            }
            else if (typeof value == 'string' && /^\d+$/.test(value)) {
                medcinId = parseInt(value, 10);
            }
            else if (value.medcinId) {
                medcinId = value.medcinId;
            };
    
            if (medcinId > 0) {
                this.treeView.expandToMedcinId(medcinId);
            };
    
            this.txtFindingName.set('value', value.name || value.id || '');
        },
    
        checkState: function () {
            var value = this.get('value');
            if (!value) {
                this.cmdOK.set('disabled', true);
            }
            else if (this.findingNameRequired && !value.name) {
                this.cmdOK.set('disabled', true);
            }
            else {
                this.cmdOK.set('disabled', false);
            }
        },
    
        onTreeSelectionChanged: function (node) {
            this.checkState();
        },
    
        onSearchKeyUp: function (evt) {
            if (evt.keyCode == keys.ENTER) {
                event.stop(evt);
                this.onSearchButtonClick();
            };
        },
    
        onSearchButtonClick: function () {
            var query = this.txtSearch.get('value');
            if (query) {
                this.treeView.search(query);
            };
        },
    
        onBrowseClick: function () {
            this.treeView.browse();
        }
    });
});