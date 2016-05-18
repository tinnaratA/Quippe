define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
	"dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/RadioButton",
	"dijit/TooltipDialog",
	"dijit/popup",
    "dijit/registry",
    "dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-attr",
	"dojo/dom-geometry",
	"dojo/on",
    "dojo/query",
    "dojo/text!qc/coding/templates/FilterDialog.htm",
    "dojo/topic",
    "qc/_core"
], function (_TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Button, CheckBox, RadioButton, TooltipDialog, popup, registry, declare, lang, domAttr, domGeometry, on, query, FilterDialogTemplate, topic, core) {
	return declare("qc.coding.FilterDialog", [TooltipDialog, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		templateString: FilterDialogTemplate,
		dataChanged: false,

		_onShow: function () {
			this.inherited(arguments);

			if (this.clickHandle) {
				core.disconnect(this.clickHandle);
				this.clickHandle = null;
			}

			// We do this because otherwise IE will receive the click event that is still in progress (the one on the menu item being used to open this dialog)
			// and will therefore close the dialog immediately.  Inserting a delay before wiring up the event handler assures the fact that the click event
			// will be over the time it is wired.
			window.setTimeout(lang.hitch(this, function () {
				this.clickHandle = on(document, "click", lang.hitch(this, function (e) {
					if (e.pageX <= 0 && e.pageY <= 0) {
						return;
					}

					var rect = domGeometry.position(this.domNode, true);

					if (e.pageX < rect.x || e.pageX > rect.x + rect.w || e.pageY < rect.y || e.pageY > rect.y + rect.h) {
						this.onCancel();
					}
				}));
			}), 500);
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
    
        loadFilter: function (noteEditor, filter) {
            if (!noteEditor) {
                return;
            }
    
            query('input', this.domNode).forEach(function (node) {
                if (node.type == 'checkbox') {
                    registry.getEnclosingWidget(node).set('checked', filter[node.name]);
                }
                else if (node.type == 'radio') {
                    registry.getEnclosingWidget(node).set('checked', filter[node.name].toString() == node.value.toString());
                };
            });
            this.set('dataChanged', !this.isDefaultFilter(filter));
        },
    
        getSettingName: function (propertyName, asJsonName) {
            var name = asJsonName ? 'c' : 'C';
            name += 'odeReviewFilter';
            name += propertyName.charAt(0).toUpperCase();
            name += propertyName.substr(1);
            return name;
        },
    
        isDefaultFilter: function (filter) {
            for (var p in filter) {
                if (core.settings[this.getSettingName(p, true)] != filter[p]) {
                    return false;
                };
            };
            return true;
        },
    
        getFilter: function () {
            var filter = {};
    
            query('input', this.domNode).forEach(function (node) {
                if (node.type == 'checkbox') {
                    filter[node.name] = registry.getEnclosingWidget(node).get('checked')
                }
                else if (node.type == 'radio') {
                    if (registry.getEnclosingWidget(node).get('checked')) {
                        filter[node.name] = registry.getEnclosingWidget(node).get('value');
                    }
                };
            });
    
            return filter;
        },
    
        onDataChanged: function () {
            this.set('dataChanged', true);
        },
    
        onSaveDefault: function () {
            var filter = this.getFilter();
    
            var settings = {};
            for (var p in filter) {
                settings[this.getSettingName(p, false)] = filter[p];
                core.settings[this.getSettingName(p, true)] = filter[p];
            };
    
            var self = this;
            core.xhrPost({
                url: core.serviceURL('Quippe/UserSettings/Data'),
                content: settings,
                error: core.showError,
                load: function (data, ioArgs) {
                    self.set('dataChanged', false);
                    topic.publish('/qc/SettingsChanged', settings);
                    return true;
                }
            });
        },
    
        onApply: function () {
            var filter = this.getFilter();
            topic.publish('/codereview/SetFilter', filter);
            this.onCancel();
        },
    
        onCancel: function () {
	        popup.close(this);
        }
    });
});