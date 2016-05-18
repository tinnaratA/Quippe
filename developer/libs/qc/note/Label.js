define([
    "qc/note/_EditableTextMixin",
    "qc/note/_Element",
    "qc/note/_SelectableMixin",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/string",
    "dojo/date/locale",
    "qc/_core",
	"qc/note/PropertyBindingMixin",
	"qc/DateUtil",
    "qc/StringUtil",
    "dijit/registry",
    "dojo/query"
], function (_EditableTextMixin, _Element, _SelectableMixin, declare, lang, string, dateLocale, core, PropertyBindingMixin, DateUtil, StringUtil, registry, query) {
	var Label = declare("qc.note.Label", [_Element, _SelectableMixin, _EditableTextMixin, PropertyBindingMixin], {
        elementName: 'Label',
        styleClass: '',
        labelStyle: '',
        text: '',
        templateString: '<div class="noteLabel qcddSource innerLabel editableText hyperlinkParent"></div>',
    
        formatters: {
            Date: function (value) {
                return this.ShortDate(value);
            },
    
            Time: function (value) {
                return this.ShortTime(value);
            },
    
            DateTime: function (value) {
                return this.ShortDateTime(value);
            },
    
            ShortDate: function (value) {
                return this._formatDate(value, { selector: "date", formatLength: "short" });
            },
    
            ShortTime: function (value) {
                return this._formatDate(value, { selector: "time", formatLength: "short" });
            },
    
            ShortDateTime: function (value) {
                return this._formatDate(value, { selector: "datetime", formatLength: "short" });
            },
    
            LongDate: function (value) {
                return this._formatDate(value, { selector: "date", formatLength: "long" });
            },
    
            LongTime: function (value) {
                return this._formatDate(value, { selector: "time", formatLength: "long" });
            },
    
            LongDateTime: function (value) {
                return this._formatDate(value, { selector: "datetime", formatLength: "long" });
            },
    
            _formatDate: function (value, options) {
                if (!value) {
                    return '';
                };
    
                var d = new Date(value);
                if (!d) {
                    return ''
                };
    
                if (!options) {
                    options = { selector: "datetime", formatLength: "short", fullYear: true, locale: core.settings.culture };
                };
    
                if (!options.locale) {
                    options.locale = core.settings.culture;
                };
    
                if (options.fullYear == undefined) {
                    options.fullYear = true;
                };
    
                return dateLocale.format(d, options)
            }
        },
    
        _getTextAttr: function () {
            return this.text;
        },
    
        _setTextAttr: function (value) {
            this.text = (value || '').toString();
            this.updateDisplay();
        },
    
        _setFormatAttr: function (value) {
            this.format = (value || '').toString();
            this.updateDisplay();
        },
    
        _setLabelStyleAttr: function (value) {
            this._applyStyleAttribute(value, this.domNode);
        },
    
        updateDisplay: function () {
            var dataSource = core;
            var workspace = query('.qcWorkspace').map(registry.byNode)[0];
            var tab = workspace ? workspace.tabControl.selectedChildWidget : null;

            if (tab && tab.domNode.firstChild) {
                var widget = registry.byNode(tab.domNode.firstChild);
                
                if (widget.getContextData) {
                    dataSource = widget.getContextData();
                }
            }

        	if (/\$\{/.test(this.text || '')) {
        		this.domNode.innerHTML = string.substitute(this.text, dataSource, function (x) { return x || '' }, this.formatters);
        		return;
        	};

        	var text = '';
        	if (this.format && this.valueType) {
        	    if (this.valueType == 'number') {
        	        text = StringUtil.formatNumber(this.value, this.format);
        		}
        		else if (this.format && this.valueType == 'date') {
        			text = DateUtil.globalFormat(DateUtil.toDate(this.value), { selector: 'date', locale: core.settings.culture, datePattern: this.format });
        		}
        		else if (this.format && this.valueType == 'time') {
        			text = DateUtil.globalFormat(DateUtil.toDate(this.value), { selector: 'time', locale: core.settings.culture, timePattern: this.format });
        		}
        	}
        	else if (this.value != null) {
        		text = this.value.toString();
        	}
        	else if (this.text != null) {
        		text = this.text;
        	}
        	else {
        		text = '';
        	};

        	this.text = text;
        	this.domNode.innerHTML = text;

        	if (this._hyperlinkNode) {
        		this._hyperlinkNode = null;
        		this.ensureHyperlinkNode();
        	}
        },
    
        writeNoteAttributes: function (writer, mode) {
            if (this.text) {
                if (mode == 'document') {
                    writer.attribute('Text', string.substitute(this.text, core, function (x) { return x || '' }, this.formatters));
                }
                else {
                    writer.attribute('Text', this.text);
                }
            };

            this.inherited(arguments);

            writer.attribute('value', this.value, '');
            writer.attribute('valueType', this.valueType, '');
            writer.attribute('format', this.format, '');
            writer.attribute('styleClass', this.styleClass, '');

            if (/\$\{/.test(this.text || '')) {
            	if (mode == 'document') {
            		writer.attribute('Text', string.substitute(this.text, core, function (x) { return x || '' }, this.formatters));
            	}
            	else {
            		writer.attribute('Text', this.text);
            	}
            };
        },
    
        getItem: function (node) {
            return { type: 'noteElement', text: this.text || 'Label', node: this.domNode, inline:true };
        },
          
        _editableText_CanEdit: function () {
            if (!core.settings.enableInlineTextEditing) {
                return false;
            };
    
            if (!this._editableText_TextNode) {
                this._editableText_TextNode = this.domNode;
            };
    
            return this._editableText_TextNode ? true : false;
        },

		value: null,
		valueType: null,
    
		_setValueAttr: function (value) {
			this.value = value;
			this.updateDisplay();
		},
    
		parseXmlChildElements: function (widget, xmlNode, sourceClass) {
			this.parseBindings(xmlNode);
		},
    
		writeNoteChildren: function (writer, mode) {
			this.writeBindings(writer, mode);
		},

	    // === property definitions === 
		_pgPropDef_text: function () {
		    return { name: 'text', group: 'Data' };
		},

		_pgPropDef_value: function () {
		    return { name: 'value', group: 'Data' };
		},

		_pgPropDef_valueType: function () {
		    return { name: 'valueType', group: 'Data', options: '[;text;number;date;time]', description: core.getI18n('tooltipValueType') };
		},

		_pgPropDef_format: function () {
		    return { name: 'format', group: 'Data', description: core.getI18n('tooltipFormat') };
		}
    });

    core.settings.noteElementClasses["qc/note/Label"] = Label;

	return Label;
});