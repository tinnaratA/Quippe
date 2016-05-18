define([
    "qc/lang/qscript/Binding",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/_core",
	"qc/XmlUtil",
	"qc/design/PropertyBindingDialog"
], function (Binding, array, declare, lang, core, XmlUtil, PropertyBindingDialog) {
    return declare("qc.note.PropertyBindingMixin", [], {
        bindings: null,
    
        parseBindings: function (xmlNode) {
            var xBindings = XmlUtil.selectChildElement(xmlNode, 'Bindings');
            if (xBindings) {
                if (!this.bindings) {
                    this.bindings = [];
                };
    
                array.map(XmlUtil.selectChildElements(xBindings, 'Binding'), XmlUtil.elementToObject).forEach(function (bindInfo) {
                    bindInfo.owner = this;
                    var binding = new Binding(bindInfo);
                    this.bindings.push(binding);

                    if (binding.bindingType == 'property' && binding.bindTo == 'text') {
                        this.overrideTranscription = true;
                    };

                }, this);
    
                xmlNode.removeChild(xBindings);
            };
        },
    
        writeBindings: function (writer, mode) {
            if (this.bindings && this.bindings.length > 0) {
                writer.beginElement('Bindings');
                array.forEach(this.bindings, function (binding) {
                    binding.writeXML(writer, mode);
                });
                writer.endElement();
            };
        },
    
        destroyBindings: function () {
            if (this.bindings) {
                array.forEach(this.bindings, function (binding) { binding.destroy() });
            };
            this.bindings = null;
        },
    
        onEditPropertyBindings: function (targetObject, propertyInfo, caller) {
            core.doDialog(PropertyBindingDialog, { title: 'Property Bindings', bindingType: 'property', targetWidget: this }, lang.hitch(this, function () {
                if (caller && caller.textBox) {
                    caller.textBox.set('value', this.propertyBindingFormatter())
                    if (caller.propertyGrid) {
                        caller.propertyGrid.refresh();
                    };
                }
            }));
        },
    
        onEditConditionalStyles: function (targetObject, propertyInfo, caller) {
            core.doDialog(PropertyBindingDialog, { title: 'Conditional Styles', bindingType: 'styleClass', targetWidget: this }, lang.hitch(this, function () {
                if (caller && caller.textBox) {
                    caller.textBox.set('value', this.conditionalStyleFormatter())
                    if (caller.propertyGrid) {
                        caller.propertyGrid.refresh();
                    };
                }
            }));
        },
    
        bindingFormatter: function(bindingType) {
            return (this.bindings || []).filter(function (x) { return x.bindingType == bindingType }).map(function (y) { return y.bindTo }).join(', ');
        },

        propertyBindingFormatter: function () {
            return this.bindingFormatter('property');
        },

        conditionalStyleFormatter: function () {
            return this.bindingFormatter('styleClass');
        },

        setBinding: function (bindingType, bindTo, expression) {
            var binding = new Binding({ bindingType: bindingType, bindTo: bindTo, expression: expression })

            if (!this.bindings) {
                this.bindings = [];
            };
           
            var i = this.bindings.findIndex(function (x) { return x.bindingType == bindingType && x.bindTo == bindTo });
            if (i >= 0) {
                this.bindings[i].destroy();
                this.bindings[i] = binding;
            }
            else {
                this.bindings.push(binding);
            };

            if (bindingType == 'property' && bindTo == 'text') {
                this.overrideTranscription = true;
            };

            return binding;
        },

        removeBinding: function(bindingType, bindTo) {
            if (!this.bindings) {
                return false;
            };
            var i = this.bindings.findIndex(function (x) { return x.bindingType == binding.bindingType && x.bindTo == binding.bindTo });
            if (i >= 0) {
                this.bindings[i].destroy();
                this.bindings.splice(i, 1);
                return true;
            }
            else {
                return false;
            };
        },

        _pgPropDef_propertyBindings: function () {
            return {
                name: 'propertyBindings',
                group: 'Behavior',
                editorCallback: lang.hitch(this, this.onEditPropertyBindings),
                description: core.getI18n('tooltipPropertyBindings'),
                formatter: lang.hitch(this, this.propertyBindingFormatter),
                readOnly: true,
                reloadOnChange: true
            };
        },

        _pgPropDef_conditionalStyles: function () {
            return {
                name: 'conditionalStyles',
                group: 'Style',
                editorCallback: lang.hitch(this, this.onEditConditionalStyles),
                description: core.getI18n('tooltipConditionalStyles'),
                formatter: lang.hitch(this, this.conditionalStyleFormatter),
                readOnly: true,
                reloadOnChange: true
            };
        }


    
    });
});