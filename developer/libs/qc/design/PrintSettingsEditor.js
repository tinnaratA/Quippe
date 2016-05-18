define([
    "dijit/_WidgetBase", 
    "dijit/_TemplatedMixin", 
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/request",
    "qc/StringUtil",
    "qc/_core",
    "dojo/text!qc/design/templates/PrintSettingsEditor.htm",
    "qc/FilteringSelect",
    "dijit/form/TextBox",
    "dijit/form/CheckBox",
    "qc/SettingsEnumStore"
], function (_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, registry, array, declare, lang, on, domClass, domConstruct, query, request, StringUtil, core, templateText, FilteringSelect, TextBox, CheckBox, SettingsEnumStore) {
    return declare("qc.design.PrintSettingsEditor", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: templateText,
        
        value: null,
        hChange: null,

        startup: function () {
            query('.dataField', this.domNode).map(registry.byNode).forEach(function (fieldWidget) {
                var enumSource = fieldWidget["data-enum-source"]
                if (enumSource) {
                    var store = new SettingsEnumStore(enumSource);
                    fieldWidget.set('store', store)
                };
            });

            this.ctlPageHeaderId.set('store', new SettingsEnumStore(lang.hitch(this, this.getPageHeaderList)));
            this.ctlPageFooterId.set('store', new SettingsEnumStore(lang.hitch(this, this.getPageFooterList)));
        },

        _getValueAttr: function () {
            this.writeValue();
            return this.value;
        },
        _setValueAttr: function (value) {
            this.value = value || {};
            this.readValue();
        },

        readValue: function () {
            this.value = this.value || {};

            if (this.hChange) {
                array.forEach(this.hChange, function (h) { h.remove(); });
                this.hChange = null;
            };
            var value = this.value;

            query('.dataField', this.domNode).map(registry.byNode).forEach(function (fieldWidget) {
                var propName = fieldWidget["data-property-name"]
                if (propName) {
                    if (value[propName] !== undefined) {
                        fieldWidget.set('value', value[propName]);
                    }
                };
            });

            query('.defaultValue', this.domNode).forEach(function (dNode) {
                var propName = dNode.getAttribute("data-property-name");
                if (propName) {
                    dNode.innerHTML = core.settings['printing' + StringUtil.toCamelUpper(propName)] || '';
                };
            });
            this.onPaperChanged();
            this.hChange = [
                on(this.ctlPageSize, 'Change', lang.hitch(this, this.onPaperChanged)),
                on(this.ctlUseDefault, 'Change', lang.hitch(this, this.onDefaultCheckChanged))
            ];
        },

        readDefaultValues: function () {
            query('.dataField', this.domNode).map(registry.byNode).forEach(function (fieldWidget) {
                var propName = fieldWidget["data-property-name"]
                if (propName && propName != 'useDefault') {
                    if (core.settings['printing' + StringUtil.toCamelUpper(propName)] != undefined) {
                        fieldWidget.set('value', core.settings['printing' + StringUtil.toCamelUpper(propName)] || '');
                    }
                };
            });
        },

        writeValue: function () {
            var value = this.value || {};
            query('.dataField', this.domNode).map(registry.byNode).forEach(function (fieldWidget) {
                var propName = fieldWidget["data-property-name"]
                if (propName) {
                    value[propName] = fieldWidget.type == 'checkbox' ? fieldWidget.get('checked') : fieldWidget.get('value');
                };
            });
            this.value = value;
        },

        onPaperChanged: function () {
            var disabled = this.ctlPageSize.get('value').toLowerCase() != 'custom'
            this.ctlPageWidth.set('disabled', disabled);
            this.ctlPageHeight.set('disabled', disabled);
        },

        

        getPageHeaderList: function() {
            return this.getContentList('pageHeader');
        },

        getPageFooterList: function () {
            return this.getContentList('pageFooter');
        },

        getContentList: function (typeName) {
            var self = this;
            return request(core.serviceURL('Quippe/ContentLibrary/Search?TypeName=' + typeName), {
                query: { 'DataFormat': 'JSON' },
                preventCache: true,
                handleAs: 'json'
            }).then(function (data) {
                var list = [];
                array.forEach(data.items, function (item) {
                    list.push(item);
                })
                list.push({ id: 'none', text: 'None' });
                return list;
            }, function (err) {
                return [];
            });
        },

        onDefaultCheckChanged: function () {
            this.value.useDefault = this.ctlUseDefault.get('checked');
            var disabled = this.value.useDefault;
            query('.dataField', this.domNode).map(registry.byNode).forEach(function (fieldWidget) {
                if (fieldWidget["data-property-name"] != 'useDefault') {
                    fieldWidget.set('disabled', disabled)
                };
            });
            if (disabled) {
                this.readDefaultValues()
            }
            else {
                this.readValue();
            }
        }
    });
});