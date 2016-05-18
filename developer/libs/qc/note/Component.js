define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/Stateful",
    "qc/_core",
    "qc/design/_PropertyGridSupport",
    "qc/design/FindingListEditorDialog",
    "qc/design/OptionListEditorDialog",
    "qc/StyleUtil",
    "qc/TimingPanel"
], function (array, declare, lang, domClass, domConstruct, domStyle, on, Stateful, core, _PropertyGridSupport, FindingListEditorDialog, OptionListEditorDialog, StyleUtil, TimingPanel) {
	return declare("qc.note.Component", [_PropertyGridSupport], {
    domNode: null,
    entryClass: '',
    styleClass: '',
    elementStyle: '',
    propertyName: '',
    visible: -1,
    enabled: -1,
    required: 0,
    events: null,
    defaultValue: null,

    isDisabled: false,
    isRequired: false,

    resultFlagEnum: '[;0=no;-1=yes;1=when unentered;2=when positive;4=when negative;6=when entered]',

    constructor: function (owner, settings) {
        if (settings) {
            for (var name in settings) {
                this[name] = settings[name];
            };
        };
    },

    getOwner: function () {
			return this.domNode ? core.ancestorWidgetByClass(this.domNode, 'qcFindingEntry', false) : null;
    },

    destroyRecursive: function () {
        if (this.events) {
				array.forEach(this.events, core.disconnect);
        };
        if (this.domNode) {
				domConstruct.destroy(this.domNode);
        };
        if (this.notifyValueChanged) {
            this.notifyValueChanged = null;
        };
    },

    createNode: function () {
			var domNode = domConstruct.create('div');
        if (this.name) {
            domNode.setAttribute('data-comp-name', this.name);
        };
			domClass.add(domNode, 'cmp');
        if (this.entryClass) {
				domClass.add(domNode, this.entryClass);
        };
        if (this.styleClass) {
				domClass.add(domNode, this.styleClass);
        };
        if (this.propertyName) {
				domClass.add(domNode, this.propertyName);
        };
        if (this.style) {
				domStyle.set(domNode, this.style);
        };
        if (this.elementStyle) {
            try {
					var s = StyleUtil.styleToObject(this.elementStyle);
                if (s) {
						domStyle.set(domNode, s);
                };
            }
            catch (ex) {
            };
        };
			this.events = [on(domNode, "click", lang.hitch(this, this.onClick))];
        this.domNode = domNode;
        return domNode;
    },

    setStyleProperty: function (name, value) {
			domStyle.set(this.domNode, name, value);
    },

    updateDisplay: function () {
    },

    getPropertyDefs: function () {
        return [];
    },

    _pgGetProperties: function (propertyGrid) {
        return this.getPropertyDefs();
    },

    _pgGetPropertyValue: function (propertyInfo) {
        return this.get(propertyInfo.name);
    },

    _pgSetPropertyValue: function (propertyInfo, value) {
        if (value != this.get(propertyInfo.name)) {
            this.set(propertyInfo.name, value);
            if (propertyInfo.group == 'Style') {
                this.setStyleProperty(propertyInfo.name, value);
            };
            return true;
        };
    },

    getTypedValue: function () {
        return this.getValue();
    },

    getFormattedValue: function () {
        return this.getValue();
    },

    getValue: function () {
        return this.value || '';
    },

    setValue: function (value) {
        this.value = value;
    },

    onClick: function (evt) {
    },

    setDisabled: function (value) {
        this.isDisabled = value || false;
    },

    notifyValueChanged: function (component, newValue, oldValue) {
    }
            });
});