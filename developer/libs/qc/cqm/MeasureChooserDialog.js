define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
	"dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/form/CheckBox",
	"dijit/popup",
    "dijit/registry",
	"dijit/TooltipDialog",
    "dojo/_base/array",
    "dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
	"dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/when",
    "dojo/text!qc/cqm/templates/MeasureChooserDialog.htm",
    "dojo/topic",
    "qc/FilteringSelect",
    "qc/SettingsEnumStore",
    "qc/SearchBox",
    "qc/cqm/ServiceManager",
    "qc/_core"
], function (_TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Button, CheckBox, popup, registry, TooltipDialog, array, declare, lang, domAttr, domClass, domConstruct, domGeometry, domStyle, on, query, when, TemplateText, topic, FilteringSelect, SettingsEnumStore, SearchBox, ServiceManager, core) {
	return declare("qc.cqm.MeasureChooserDialog", [TooltipDialog, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
	    templateString: TemplateText,
        owner: null,
        table: null,
        dataChanged: null,
        events: [],
        perSystemSelection: null,
        currentSystemId: '',
        measureTable: null,
    
        startup: function() {
            if (!this._started) {
                this.loadSystems();
                this.txtSearch._searchControl = this;
                this.txtSearch.startup();
            };
        },

        loadSystems: function () {
            var self = this;
            when(ServiceManager.getSystems(), function (systems) {
                var enumList = systems.map(function (system) {
                    return { id: system.id, text: system.name }
                });
                enumList.unshift({ id: '', text: '' });
                var store = new SettingsEnumStore(enumList);
                self.lstSystems.set('searchAttr', 'text');
                self.lstSystems.set('store', store);
                self.lstSystems.set('value', 'mu2');
                self.events.push(on(self.lstSystems, 'Change', lang.hitch(self, self.onMeasureSystemChanged)));
            });
        },

        doSearch: function() {
            this.filterString = this.txtSearch.get('value') || '';
            this.updateDisplay();
        },

        onSearchQueryCleared: function() {
            this.filterString = '';
            this.updateDisplay();
        },

        _onShow: function () {
        	this.inherited(arguments);

        	if (this.clickHandle) {
        	    core.disconnect(this.clickHandle);
        	    this.clickHandle = null;
        	};

        	// We do this because otherwise IE will receive the click event that is still in progress (the one on the menu item being used to open this dialog)
        	// and will therefore close the dialog immediately.  Inserting a delay before wiring up the event handler assures the fact that the click event
        	// will be over the time it is wired.
	        window.setTimeout(lang.hitch(this, function() {
		        this.clickHandle = on(document, "click", lang.hitch(this, function(e) {
			        if (e.pageX <= 0 && e.pageY <= 0) {
				        return;
			        }

			        var rect = domGeometry.position(this.domNode, true);

			        if (e.pageX < rect.x || e.pageX > rect.x + rect.w || e.pageY < rect.y || e.pageY > rect.y + rect.h) {
				        this.onCancel();
			        }
		        }));
	        }), 500);

	       
	        this.updateDisplay();
        },

        onHide: function () {
        	core.disconnect(this.clickHandle);
	        this.clickHandle = null;
        },

        _getDataChangedAttr: function () {
            return this.dataChanged;
        },
        _setDataChangedAttr: function (value) {
            this.dataChanged = value;
            this.saveDefaultButton.set('disabled', !value);
        },
    
        loadMeasures: function() {            
            var selectedMeasures = ServiceManager.getSelectedMeasureCodes();

            var table = domConstruct.place('<table class="measureTable"></table>', this.tableNode);
            var row = null;
            var c1 = null;
            var c2 = null;
            var c3 = null;
            var chk = null;

            var self = this;

            array.forEach(ServiceManager.getMeasures(), function(measure) {
                row = table.insertRow(-1);
                row.measureCode = measure.code;
                row.systemId = measure.system;
                c1 = row.insertCell(-1);
                domClass.add(c1, 'checkCell');
                chk = new CheckBox();
                domClass.add(chk.domNode, 'chkMeasure');
                chk.startup();
                chk.measureCode = measure.code;
                chk.set('value', selectedMeasures.indexOf(measure.code) >= 0);
                chk.placeAt(c1);
                self.events.push(on(chk, "Click", lang.hitch(self, function () {
                    self.set('dataChanged', true);
                })));

                c2 = row.insertCell(-1);
                domClass.add(c2, 'captionCell');
                c2.innerHTML = measure.code;

                c3 = row.insertCell(-1);
                domClass.add(c3, 'descriptionCell');
                c3.innerHTML = measure.name;
            });

            this.measureTable = table;
            return table;
        },

        clear: function() {
            if (this.measureTable) {
                domConstruct.empty(this.tableNode);
                this.measureTable = null;
            };
            if (this.events) {
                array.forEach(this.events, function (e) {
                    e.remove();
                });
                this.events = null;
            };
            this.events = [];
        },

        updateDisplay: function () {
            when(ServiceManager.ready(), lang.hitch(this, function () {
                if (!this.measureTable) {
                    this.loadMeasures();
                };

                var table = this.measureTable;
                //var systemId = systemId || this.lstSystems.get('value') || 'mu2';
                var systemId = this.lstSystems.get('value') || '';
                var filter = null;
                if (this.filterString) {
                    try {
                        filter = new RegExp(this.filterString, 'i');
                    }
                    catch (ex) {
                        filter = null;
                    }
                };

                var show = false;
                for (var r = 0; r < table.rows.length; r++) {
                    show = true;
                    if (show && systemId) {
                        show = table.rows[r].systemId == systemId
                    };
                    if (show && filter) {
                        show = show && filter.test(table.rows[r].textContent)
                    };
                    if (show) {
                        domStyle.set(table.rows[r], { display: 'table-row' });
                    }
                    else {
                        domStyle.set(table.rows[r], { display: 'none' });
                    };
                };
            }));
        },

        
    
        destroyRecursive: function () {
            this.clear();
            this.inherited(arguments);
        },

        getSelectedMeasures: function () {
            return query('.chkMeasure', this.domNode).map(registry.byNode).filter(function (c1) { return c1.get('checked') }).map(function (c2) { return c2.measureCode });
        },

        onSaveDefault: function () {
            var measureList = this.getSelectedMeasures().join(',');
            core.settings.cqmSelectedMeasures = measureList;
            var data = { cqmSelectedMeasures: measureList };
            var self = this;
            core.xhrPost({
                url: core.serviceURL('Quippe/UserSettings/Data'),
                content: data,
                error: core.showError,
                load: function (res, ioArgs) {
                    self.set('dataChanged', false);
                    topic.publish('/qc/SettingsChanged', data);
                    return true;
                }
            });
        },
    
        onMeasureSystemChanged: function() {
            this.updateDisplay();
        },

        onApply: function () {
            var measureCodes = this.getSelectedMeasures();
            ServiceManager.setSelectedMeasureCodes(measureCodes);
            ServiceManager.evaluate();
            this.onCancel();
        },
    
        onCancel: function () {
	        popup.close(this);
        }
    
    });
});