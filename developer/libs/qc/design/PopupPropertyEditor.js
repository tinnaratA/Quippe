define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/dom-style",
    "dojo/text!qc/design/templates/PopupPropertyEditor.htm",
    "qc/_core",
	"qc/SettingsEnumStore"
], function (_TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, declare, lang, domStyle, PopupPropertyEditorTemplate, core, SettingsEnumStore) {
    return declare("qc.design.PopupPropertyEditor", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: PopupPropertyEditorTemplate,
        
        callback: null,
        dialogTypeName: '',
        dialogSettings: null,
        targetObject: null,
        propertyInfo: null,
        value: null,
    
        _setPropertyInfoAttr: function (value) {
            this.propertyInfo = value;
            this.textBox.set('readOnly', this.propertyInfo && (this.propertyInfo.readOnly == true || this.propertyInfo.type == 'object'));

            domStyle.set(this.textBox.domNode, "display", !this.propertyInfo || !this.propertyInfo.options ? "" : "none");
            domStyle.set(this.filteringSelect.domNode, "display", this.propertyInfo && this.propertyInfo.options ? "" : "none");

            if (this.propertyInfo.options) {
	            this.filteringSelect.set("required", !this.propertyInfo.allowEmpty);
				this.filteringSelect.set("store", new SettingsEnumStore(this.propertyInfo.options, this.propertyInfo.allowEmpty));
			}
        },
    
        _getValueAttr: function () {
            return this.value;
        },
        _setValueAttr: function (value) {
        	this.value = value;
	        var editorControl = this.propertyInfo && this.propertyInfo.options ? this.filteringSelect : this.textBox;

            if (editorControl) {
                if (this.propertyInfo && this.propertyInfo.formatter) {
                	editorControl.set('value', this.propertyInfo.formatter(value) || '');
                }
                else {
                    editorControl.set('value', value ? value.toString() : '');
                }
            };
        },
    
        onPopupButtonClick: function () {
            if (core.isFunction(this.callback)) {
                this.callback.call(this, this.targetObject, this.propertyInfo, this);
            }
            else if (this.dialogTypeName) {
                var self = this;
                var dlgType = require(self.dialogTypeName.replace(/\./g, "/"));
                if (dlgType) {
                    var settings = this.dialogSettings || {};
                    settings.value = this.value;
                    core.doDialog(dlgType, settings, function (dlg) {
                        self.set('value', dlg.get('value'));
                        if (self.propertyGrid && self.reloadOnChange) {
                            self.propertyGrid.refresh();
                        };
                    });
                };
            };
        },
    
        onTextBoxChanged: function () {
            if (!this.propertyInfo.readOnly) {
                var textValue = this.textBox.get('value')
                if (this.value != textValue) {
                    if (this.propertyInfo && this.propertyInfo.parser) {
                        this.value = this.propertyInfo.parser(textValue)
                    }
                    else {
                        this.value = textValue;
                    }
                    this.onChange();
                };
            };
        },

        onFilteringSelectChanged: function (value) {
	        this.value = value;
			this.onChange(this);
		},
    
        onChange: function () {
        }
    });
});