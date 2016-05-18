define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/CheckBox",
    "dijit/form/DateTextBox",
    "dijit/form/FilteringSelect",
    "dijit/form/ValidationTextBox",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/query",
    "dojo/text!qc/templates/TimingPanel.htm",
    "qc/_core",
    "qc/_EnumManager",
    "qc/DateUtil",
    "qc/design/ToolbarBuilder",
    "qc/TimingTranscriber",
    "qc/SettingsEnumStore",
    "qc/StringUtil"
], function (_TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, CheckBox, DateTextBox, FilteringSelect, ValidationTextBox, array, declare, lang, domClass, domConstruct, on, query, TimingPanelTemplate, core, _EnumManager, DateUtil, ToolbarBuilder, TimingTranscriber, SettingsEnumStore, StringUtil) {
    return declare("qc.TimingPanel", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: TimingPanelTemplate,
        
        components: null,
        componentTemplates: [
            { text: 'Stat', priority: 'S' },
            { text: 'once a day', occurrence: 1, interval: '1', intervalUnit: 'D' },
            { text: 'every shift', interval: '1', intervalUnit: 'F' },
            { text: 'PRN', asNeeded: true },
            { text: 'every 2 hours', occurrence: 1, interval: '2', intervalUnit: 'H' },
            { text: 'every 15 minutes x 4', occurrence: 1, interval: '15', intervalUnit: 'N', repeat: 4 },
            { text: 'as ordered', note: 'as ordered' }
        ],
        compEvents: null,
        suspendUpdates: false,
    
        fields: {
            sequencing: { widget: 'cmbSequencing', optionsName: 'sequencing' },
            asNeeded: { widget: 'chkAsNeeded', type: 'boolean' },
            occurrence: { widget: 'txtOccurrence', type: 'int' },
            occurrence2: { widget: 'txtOccurrence2', type: 'int' },
            interval: { widget: 'txtInterval', type: 'float' },
            interval2: { widget: 'txtInterval2', type: 'float' },
            intervalUnit: { widget: 'cmbIntervalUnit', optionsName: 'timeUnits' },
            repeat: { widget: 'txtRepeat', type: 'int' },
            repeat2: { widget: 'txtRepeat2', type: 'int' },
            duration: { widget: 'txtDuration', type: 'float' },
            duration2: { widget: 'txtDuration2', type: 'float' },
            durationUnit: { widget: 'cmbDurationUnit', optionsName: 'timeUnits' },
            timeOfDay: { widget: 'cmbTimeOfDay', optionsName: 'timeOfDay' },
            priority: { widget: 'cmbPriority', optionsName: 'priority' },
            startTime: { widget: 'txtStartTime', type: 'date' },
            endTime: { widget: 'txtEndTime', type: 'date' },
            note: { widget: 'txtNote' }
        },
    
        _getComponentsAttr: function () {
            return this.components;
        },
        _setComponentsAttr: function (value) {
            this.clearSelection();
            this.components = value || [];
            this.renderComponentList();
        },
    
        startup: function () {
            if (!this._started) {
                this.init();
                this.inherited(arguments);
            };
        },
    
        init: function () {
            var templateMenu = {};
            array.forEach(this.componentTemplates, function (t, i) {
                templateMenu['T' + i] = { label: t.text, index: i, onClick: lang.hitch(this, function () { this.doAdd(i) }) };
            }, this);
    
            this.toolbar = ToolbarBuilder.buildToolbar({
                add: { label: 'Add Component', icon: 'add', onClick: lang.hitch(this, this.doAdd) },
                addPreset: { label: 'Add Preset', icon: 'add', menu: templateMenu },
                sep1: {},
                remove: { label: 'Remove Component', icon: 'delete', onClick: lang.hitch(this, this.doRemove), disabled: true },
                clearAll: { label: 'Clear All', icon: 'delete', onClick: lang.hitch(this, this.doClearAll), disabled: true }
            }, null, 16);
            this.toolbar.placeAt(this.toolbarNode);
    
            var setComponentValue = lang.hitch(this, this.setComponentValue);
            var getChangeFn = function (widget, field) {
                return function () { setComponentValue(field, widget.get('value')); };
            };
    
            this.compEvents = [];
            var widget = null;
            for (var f in this.fields) {
                widget = this[this.fields[f].widget];
                if (widget) {
                    widget.fieldName = f;
                    if (this.fields[f].options) {
                        widget.store = new SettingsEnumStore(this.fields[f].options);
                    }
                    else if (this.fields[f].optionsName) {
                        widget.store = new SettingsEnumStore(TimingTranscriber.getEnum(this.fields[f].optionsName));
                    };
                    widget.changeFunction = function () { setComponentValue(f, this.get('value')); };
                    this.compEvents.push(on(widget, "Change", lang.hitch(this, getChangeFn(widget, f))));
                };
            };
            this.checkState();
        },
    
        renderComponentList: function () {
            if (!this.components) {
                this.components = [];
            };
    
            var selIndex = this.getSelectedIndex();
            domConstruct.empty(this.componentList);
    
            array.forEach(this.components, function (comp, i) {
                comp.text = TimingTranscriber.transcribeComponent(comp, i);
                var compNode = domConstruct.place('<div class="componentText">' + comp.text + '</div>', this.componentList);
                compNode.compIndex = i;
                if (i == selIndex) {
                    domClass.add(compNode, 'selected');
                };
            }, this);
    
            this.checkState();
        },
    
        clearDetails: function () {
            for (var f in this.fields) {
                if (this.fields[f].widget) {
                    this[this.fields[f].widget].set('value', null);
                };
            };
        },
    
        renderDetail: function (compNode) {
    
            domClass.remove(compNode, 'selected');
            this.clearDetails();
            domClass.add(compNode, 'selected');
    
            compNode = compNode || this.getSelectedNode();
            if (!compNode) {
                return;
            };
            var index = compNode.compIndex;
            if (index < 0 || index >= this.components.length) {
                return;
            };
    
            var comp = this.components[index];
    
            for (var f in this.fields) {
                if (this.fields[f].widget) {
                    this[this.fields[f].widget].set('value', comp ? comp[f] : null);
                };
            };
        },
    
        setComponentValue: function (name, value) {
            var index = this.getSelectedIndex();
            if (index < 0) {
                return;
            };
    
            if ((this.components[index][name] || '') != (value || '')) {
                this.components[index][name] = value;
    
                if (value) {
                    if (name == 'interval' && !this.components[index]['intervalUnit']) {
                        this.components[index]['intervalUnit'] = 'H';
                        this.cmbIntervalUnit.set('value', 'H');
                    };
                    if (name == 'duration' && !this.components[index]['durationUnit']) {
                        this.components[index]['durationUnit'] = this.components[index]['intervalUnit'] || 'D';
                        this.cmbDurationUnit.set('value', this.components[index]['durationUnit']);
                    };
    
                };
                this.renderText();
                this.checkState();
            };
        },
    
        renderText: function () {
            var compNode = this.getSelectedNode();
            if (!compNode) {
                return;
            };
            var index = compNode.compIndex;
            var comp = this.components[index];
            comp.text = TimingTranscriber.transcribeComponent(comp, index);
            compNode.innerHTML = comp.text;
        },
    
        toggleSelection: function (compNode) {
            if (domClass.contains(compNode, 'selected')) {
                this.clearSelection();
            }
            else {
                query('.selected', this.componentList).removeClass('selected');
                domClass.add(compNode, 'selected');
                this.renderDetail(compNode);
                this.checkState();
            };
        },
    
        clearSelection: function () {
            query('.selected', this.componentList).removeClass('selected');
            this.clearDetails();
            this.checkState();
        },
    
        selectComp: function (index) {
            var compNode = null;
            query('.selected', this.componentList).removeClass('selected');
            query('.componentText', this.componentList).forEach(function (node) {
                if (node.compIndex == index) {
                    compNode = node;
                    domClass.add(node, 'selected');
                }
                else {
                    domClass.remove(node, 'selected');
                };
            });
            this.renderDetail(compNode);
            this.checkState();
        },
    
        getSelectedNode: function () {
            return query('.selected', this.componentList)[0];
        },
    
        getSelectedIndex: function () {
            var compNode = this.getSelectedNode();
            if (compNode) {
                return compNode.compIndex;
            }
            else {
                return -1;
            };
        },
    
        doAdd: function (index) {
            if (!this.components) {
                this.components = [];
            };
            var comp = {};
            if (index >= 0 && index < this.componentTemplates.length) {
                for (var p in this.componentTemplates[index]) {
                    comp[p] = this.componentTemplates[index][p];
                };
            };
            if (!comp.sequencing) {
                comp.sequencing = 'S';
            };
            this.components.push(comp);
            this.renderComponentList();
            this.selectComp(this.components.length - 1);
        },
    
        doRemove: function () {
            var i = this.getSelectedIndex();
            if (i >= 0) {
                this.clearSelection();
                this.components.splice(i, 1);
                this.renderComponentList();
            };
        },
    
        doClearAll: function () {
            this.clearSelection();
            this.components = [];
            this.renderComponentList();
        },
    
        checkState: function () {
            var index = this.getSelectedIndex();
    
            this.toolbar.tools['clearAll'].set('disabled', (!this.components || this.components.length == 0));
    
            var disabled = index < 0;
            this.toolbar.tools['remove'].set('disabled', disabled);
            var widget = null;
            for (var f in this.fields) {
                widget = this[this.fields[f].widget];
                if (widget) {
                    widget.set('disabled', disabled);
                };
            };
    
            if (!disabled) {
                if (index == 0) {
                    this.cmbSequencing.set('value', '');
                    this.cmbSequencing.set('disabled', true);
                }
                else {
                    this.cmbSequencing.set('disabled', false);
                };
    
            };
    
        },
    
        onListTableClick: function (evt) {
            var compNode = core.ancestorNodeByClass(evt.target, 'componentText', true);
            if (compNode) {
                this.toggleSelection(compNode);
            }
            else {
                this.clearSelection();
            };
        }
    
    
    });
});