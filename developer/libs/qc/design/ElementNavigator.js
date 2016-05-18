define([
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/on",
    "qc/_core",
    "qc/design/_ElementNavigatorTree",
    "qc/design/_ObjectNavigator",
    "qc/DropDownTextBox",
    "qc/StringUtil"
], function (declare, lang, aspect, domClass, domStyle, on, core, _ElementNavigatorTree, _ObjectNavigator, DropDownTextBox, StringUtil) {
    return declare("qc.design.ElementNavigator", [DropDownTextBox, _ObjectNavigator], {
        elementClass: 'noteElement',
        sourceNode: null,
        destroyOnClose: false,
        allowTextEdit: false,
        selectedObject: null,
        tree: null,
    
        postCreate: function () {
            domClass.add(this.domNode, 'qcElementNavigator');
            this.textbox.setAttribute('disabled', true);
            this.inherited(arguments);
        },
    
        _setSelectedObjectAttr: function (value) {
            if (value instanceof Array) {
                this.selectedObject = value[0];
                if (value.length > 1) {
                    this.set('value', "Multiple Objects");
                }
                else {
                    this.set('value', this.getLabel(this.selectedObject));
                }
            }
            else {
                this.selectedObject = value;
                this.set('value', this.getLabel(value));
            };
            this._isLoaded = false;
        },
    
        _onavGetSelectedObject: function () {
            return this.get('selectedObject');
        },
    
        _onavSetSelectedObject: function (obj) {
            this.set('selectedObject', obj);
        },
    
        getLabel: function (widget) {
            if (!widget) {
                return '';
            };
    
            if (widget instanceof Array) {
                return 'Multiple Objects';
            };
    
            if (core.isFunction(widget.getNavigatorLabel)) {
                return widget.getNavigatorLabel();
            };
    
            if (widget.name) {
                return widget.name;
            };

            var typeName = StringUtil.toCamelUpper(widget.partType || (widget.sourceXmlNode ? widget.sourceXmlNode.tagName : widget.elementName) || '');
            var name = widget.name ? widget.name : (widget.get('text') || '').replace(':', '');
            var label = '';
    
            if (typeName) {
                if (name) {
                    label = typeName + ': ' + name;
                }
                else {
                    label = typeName;
                }
            }
            else {
                label = name;
            }
    
            return label.length > 30 ? label.substr(0, 30) + '...' : label;
        },
    
        loadDropDown: function () {
            if (!this.dropDown) {
                this.dropDown = new _ElementNavigatorTree({ elementClass: this.elementClass, editor: this.editor });
                this.dropDown.getLabel = this.getLabel;
                domStyle.set(this.dropDown.domNode, { height: '200px', border: '1px solid #999999', backgroundColor: '#ffffff', fontSize: domStyle.get(this.domNode, 'fontSize') });
                aspect.after(this.dropDown, "onNodeClick", lang.hitch(this, this.onTreeNodeClick), true);
                this.dropDown.startup();
            };
            if (!this._isLoaded && this.selectedObject) {
                this.dropDown.buildTree(this.selectedObject);
            };
            this.inherited(arguments);
        },
    
        onTreeNodeClick: function (node, evt) {
            if (node && node.data) {
                this._onavSelectionChanged(node.data);
                this.closeDropDown();
            };
        }
    });
});