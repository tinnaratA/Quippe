define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/form/CheckBox",
    "dijit/form/ComboBox",
    "dijit/form/TextBox",
    "dijit/form/ValidationTextBox",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/NodeList",
    "dojo/on",
    "dojo/query",
	"dojo/topic",
    "qc/_core",
    "qc/CheckList",
    "qc/design/_PropertyGridSupport",
    "qc/design/DropDownPropertyEditor",
    "qc/design/PopupPropertyEditor",
    "qc/FilteringSelect",
    "qc/SettingsEnumStore",
    "qc/StringUtil",
    "dijit/popup",
    "dijit/TooltipDialog"
], function (_TemplatedMixin, _WidgetBase, CheckBox, ComboBox, TextBox, ValidationTextBox, ContentPane, TabContainer, array, declare, lang, aspect, domClass, domConstruct, domStyle, NodeList, on, query, topic, core, CheckList, _PropertyGridSupport, DropDownPropertyEditor, PopupPropertyEditor, FilteringSelect, SettingsEnumStore, StringUtil, popup, TooltipDialog) {
    return declare("qc.design.PropertyGrid", [_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="qcPropertyGrid qcddPrevent sealed" data-dojo-attach-event="onclick:onGridClick">'
                      + '  <div class="titleBar">'
                      + '    <div class="textNode" data-dojo-attach-point="titleBarTextNode">Properties</div>'
                      + '    <div class="button categoryButton" data-dojo-attach-point="categoryButton" data-dojo-attach-event="onclick:toggleCategoryDisplay"></div>'
                      + '    <div class="button alphaButton" data-dojo-attach-point="alphaButton" data-dojo-attach-event="onclick:togglePropertySort"></div>'
                      + '  </div>'
                      + '  <div class="navigator" data-dojo-attach-point="navigatorNode">'
                      + '  </div>'
                      + '  <div class="grid" data-dojo-attach-point="gridNode"></div>'
                      + '  <div class="help" data-dojo-attach-point="helpNode"></div>'
                      + '</div>',
        selectedObject: null,
        showTitlebar: false,
        showSections: false,
        showGroups: true,
        sortProperties: true,
        propertyManager: null,
        showNavigator: false,
        showHelp: false,
        navigator: null,
        hNav: null,
        defaultSection: '',
        defaultGroup: '',

        startup: function() {
            if (!this._started) {
                this.inherited(arguments);
                topic.subscribe('/pg/Refresh', lang.hitch(this, this._renderObject));
            };
        },
    
        _events: null,

        _getShowTitlebarAttr: function () {
            return this.showTitlebar;
        },
        _setShowTitlebarAttr: function (value) {
            if (value) {
                this.showTitlebar = true;
                domClass.add(this.domNode, 'showTitlebar');
            }
            else {
                this.showTitlebar = false;
                domClass.remove(this.domNode, 'showTitlebar');
            };
        },
        _getTitleAttr: function () {
            return this.titleBarTextNode.innerHTML;
        },
        _setTitleAttr: function(value) {
            this.titleBarTextNode.innerHTML = value || '';
        },
    
        _getSelectedObjectAttr: function () {
            return this.selectedObject;
        },
        _setSelectedObjectAttr: function (value) {
            this.selectedObject = value;
            if (this.navigator) {
                this.navigator._onavSetSelectedObject(value);
            };
            this._renderObject(value);
        },
    
        _setNavigatorAttr: function (value) {
            if (this.navigator && this.navigator != value) {
                this.navigator.destroy();
                core.disconnect(this.hNav);
            };
            this.navigator = value;
            if (this.navigator) {
                this.navigator.placeAt(this.navigatorNode);
                this.hNav = aspect.after(this.navigator, '_onavSelectionChanged', lang.hitch(this, this.onNavigatorSelectionChanged), true);
            };
        },
    
        onNavigatorSelectionChanged: function (obj) {
            this.set('selectedObject', obj);
        },
    
        _getShowNavigatorAttr: function () {
            return this.showNavigator;
        },
        _setShowNavigatorAttr: function (value) {
            this.showNavigator = value;
            domStyle.set(this.navigatorNode, 'display', value ? 'block' : 'none');
        },
    
        _getShowSectionsAttr: function () {
            return this.showSections;
        },
        _setShowSectionsAttr: function (value) {
            if (value) {
                this.showSections = true;
                domClass.add(this.domNode, 'sectionTabs');
            }
            else {
                this.showSections = false;
                domClass.remove(this.domNode, 'sectionTabs');
            };
            this._renderObject();
        },
    
        _getShowGroupsAttr: function () {
            return this.showGroups;
        },
        _setShowGroupsAttr: function (value) {
            if (value) {
                domClass.add(this.domNode, "showGroups");
                this.showGroups = true;
            }
            else {
                domClass.remove(this.domNode, "showGroups");
                this.showGroups = false;
            }
            this.refresh();
        },

        _getSortPropertiesAttr: function() {
            return this.sortProperties;
        },
        _setSortPropertiesAttr: function (value) {
            if (value) {
                domClass.add(this.domNode, "sortProperties");
                this.sortProperties = true;
            }
            else {
                domClass.remove(this.domNode, "sortProperties");
                this.sortProperties = false;
            }
            this.refresh();
        },

        _clear: function () {
            if (this._events) {
                array.forEach(this._events, core.disconnect);
                this._events = null;
            }
            domConstruct.empty(this.gridNode);
            if (this.hPopup) {
                popup.close();
                this.hPopup = null;
            };
        },
    
        _getMultiObjectWrapper: function (list) {
            var targetObjects = array.filter(list, function (item) { return item && item._hasPropertyGridSupport });
            if (targetObjects.length < 2) {
                return null;
            };
    
            var getSharedProperties = function (item) {
                return array.filter(item._pgGetProperties(), function (x) { return x.isShareable }).sort(function (a, b) { return StringUtil.compare(a.name, b.name) });
            };
    
            var intersect = function (a, b) {
                if (!a) {
                    return b;
                };
                if (!b) {
                    return a;
                };
                var list = [];
                var len = Math.min(a.length, b.length);
                for (var n = 0; n < len; n++) {
                    if (a[n].name == b[n].name) {
                        list.push(a[n]);
                    };
                };
                return list;
            };
    
            var sharedProperties = null;
            array.forEach(targetObjects, function (x, i) {
                sharedProperties = intersect(sharedProperties, getSharedProperties(x));
            });
            if (!sharedProperties || sharedProperties.length == 0) {
                return null;
            };
    
            var wrapper = {
                target: list,
                _hasPropertyGridSupport: true,
    
                _pgGetProperties: function () {
                    return sharedProperties;
                },
    
                _pgGetPropertyValue: function (propInfo) {
                    var value = list[0]._pgGetPropertyValue(propInfo);
                    for (var n = 1; n < list.length; n++) {
                        if (list[n]._pgGetPropertyValue(propInfo) != value) {
                            return { mixedValues: true, toString: function () { return '' } };
                        };
                    };
                    return value;
                },
    
                _pgSetPropertyValue: function (propInfo, value) {
                    if (value == undefined || (value != null && value.mixedValues)) {
                        return false;
                    };
                    array.forEach(list, function (item) {
                        item._pgSetPropertyValue(propInfo, value);
                    });

                    return true;
                }
            };
    
            var reloadFunction = lang.hitch(this, this._renderObject);
            var notifyFunction = lang.hitch(this, this.onPropertyChanged);
    
            wrapper.setPropertyValue = function (prop, value) {
                var typedValue = null;
    
                if (prop.nullable && (value == undefined || value == null || value == 'null' || (value == '' && prop.type != 'string'))) {
                    typedValue = null;
                }
                else {
                    switch (prop.type) {
                        case 'integer':
                            typedValue = parseInt(value, 10);
                            if (isNaN(typedValue)) {
                                return;
                            };
                            break;
    
                        case 'number':
                        case 'float':
                            typedValue = parseFloat(value);
                            if (isNaN(typedValue)) {
                                return;
                            };
                            break;
    
                        case 'boolean':
                            typedValue = (value == 'true' ? true : false);
                            break;
    
                        default:
                            typedValue = value;
                            break;
                    };
                };
    
                var changed = this._pgSetPropertyValue(prop, typedValue);
                if (changed == undefined) {
                    changed = true;
                };
                if (changed) {
                    notifyFunction(wrapper.target, prop);
                    if (prop.reloadOnChange) {
                        reloadFunction();
                    };
                };
                return changed;
            };
    
            return wrapper;
        },
    
        _getWrapper: function (sourceObject) {
            if (!sourceObject) {
                return null;
            };
    
            var obj = null;
            if (sourceObject instanceof Array) {
                if (sourceObject.length > 1) {
                    return this._getMultiObjectWrapper(sourceObject);
                }
                else if (!sourceObject[0]) {
                    return null;
                }
                else {
                    obj = sourceObject[0];
                }
            }
            else {
                obj = sourceObject;
            };
    
            var wrapper = null;
    
            if (this.propertyManager && this.propertyManager._pgGetWrapper) {
                wrapper = this.propertyManager._pgGetWrapper(obj);
            };
    
            if (!wrapper) {
                wrapper = {
                    target: obj,
                    _hasPropertyGridSupport: true
                };
                if (obj._hasPropertyGridSupport) {
                    wrapper._pgGetProperties = lang.hitch(obj, obj._pgGetProperties);
                    wrapper._pgGetPropertyValue = lang.hitch(obj, obj._pgGetPropertyValue);
                    wrapper._pgSetPropertyValue = lang.hitch(obj, obj._pgSetPropertyValue);
                }
                else {
                    var pg = new _PropertyGridSupport();
                    wrapper._pgGetProperties = lang.hitch(obj, pg.__pgGetSimplePropertyList);
                    wrapper._pgGetPropertyValue = lang.hitch(obj, pg._pgGetPropertyValue);
                    wrapper._pgSetPropertyValue = lang.hitch(obj, pg._pgSetPropertyValue);
                };
            };
    
            var reloadFunction = lang.hitch(this, this._renderObject);
            var notifyFunction = lang.hitch(this, this.onPropertyChanged);
    
            wrapper.setPropertyValue = function (prop, value) {
                var typedValue = null;
    
                if (prop.nullable && (value == undefined || value == null || value == 'null' || (value == '' && prop.type != 'string'))) {
                    typedValue = null;
                }
                else {
                    switch (prop.type) {
                        case 'integer':
                            typedValue = parseInt(value, 10);
                            if (isNaN(typedValue)) {
                                return;
                            };
                            break;
    
                        case 'number':
                        case 'float':
                            typedValue = parseFloat(value);
                            if (isNaN(typedValue)) {
                                return;
                            };
                            break;
    
                        case 'boolean':
                            typedValue = (value == 'true' ? true : false);
                            break;
    
                        default:
                            typedValue = value;
                            break;
                    };
                };
    
                var changed = this._pgSetPropertyValue(prop, typedValue);
                if (changed == undefined) {
                    changed = true;
                };
                if (changed) {
                    notifyFunction(wrapper.target, prop);
                    if (prop.reloadOnChange) {
                        reloadFunction();
                    };
                };
                return changed;
            };
    
            return wrapper;
        },
    
    
        _setShowSectionsAttr: function (value) {
            if (value) {
                this.showSections = true;
                domClass.add(this.domNode, 'sectionTabs');
            }
            else {
                this.showSections = false;
                domClass.remove(this.domNode, 'sectionTabs');
            }
        },
    
        _getTargetProperties: function (target) {
            var propList = target._pgGetProperties(this).map(function(x,i) {
                x.origIndex = i; 
                return x
            });
    
            var strcmp = function (x, y) {
                var lx = (x || '').toLowerCase();
                var ly = (y || '').toLowerCase();
                return (lx < ly) ? -1 : (lx > ly) ? 1 : 0;
            };
    
            var self = this;
            propList.sort(function (a, b) {
                if (a.sortAfter || b.sortAfter || a.sortBefore || b.sortBefore) {
                    var x = 1;
                };
                var n = 0;
                n = n === 0 && self.showSections ? strcmp((a.section || self.defaultSection),( b.section || self.defaultSection)) : n;
                n = n === 0 && self.showGroups ? strcmp((a.group || self.defaultGroup), (b.group || self.defaultGroup)) : n;
                n = n === 0 && self.sortProperties ? strcmp((a.caption || a.name), (b.caption || b.name)) : n;
                n = n === 0 ? strcmp((a.sortKey || 'middle'), (b.sortKey || 'middle'), true) : n;
                n = n === 0 ? a.origIndex - b.origIndex : n; //for stable sort
                return n;
            });
            return propList;
        },
    
        _createEditControl: function (prop, value) {
            //TODO: fix for compatiblity with ElementInspector, remove when property grid replaces inspector in design view
            if (prop.enumSource && !prop.options) {
                prop.options = prop.enumSource;
            };
    
            var editControl = null;
            var store = null;
    
            if (prop.editorDialogType) {
                editControl = new PopupPropertyEditor({ dialogTypeName: prop.editorDialogType, dialogSettings: prop.editorDialogSettings || null, value: value, propertyInfo: prop, propertyGrid: this });
            }
            else if (prop.editorCallback) {
                editControl = new PopupPropertyEditor({ callback: prop.editorCallback, propertyInfo: prop, value: value, propertyGrid: this });
            }
            else if (prop.options && prop.multipleChoice) {
                var checkList = new CheckList();
                checkList.load(prop.options);
                checkList.startup();
                editControl = new DropDownPropertyEditor({ dropDown: checkList, value: value });
            }
            else if (prop.options && prop.allowAnyValue) {
                store = new SettingsEnumStore(prop.options);
                editControl = new ComboBox({ searchAttr: 'text', store: store, value: (value != null && typeof (value) != "undefined" ? value.toString() : value) });
                editControl.set('required', false);
            }
            else if (prop.options) {
                store = new SettingsEnumStore(prop.options, prop.allowEmpty);
                editControl = new FilteringSelect({ searchAttr: 'text', store: store, value: (value != null && typeof (value) != "undefined" ? value.toString() : value) });
                editControl.set('required', false);
            }
            else if (prop.type == 'boolean') {
                store = new SettingsEnumStore(prop.nullable ? '[;true;false]' : '[true;false]');
                editControl = new FilteringSelect({ searchAttr: 'text', store: store, value: (value != null && typeof (value) != "undefined" ? value.toString() : value) });
                editControl.set('required', false);
            }
            else if (prop.type == 'integer') {
                editControl = new ValidationTextBox({
                    value: value,
                    pattern: "[0-9]*"
                });
            }
            else {
                editControl = new TextBox({ value: value });                
            };
    
            if (prop.readOnly) {
                editControl.set('readOnly', true);
            };
            if (prop.disabled) {
                editControl.set('disabled', true);
            };
            return editControl;
        },
    
        _renderObject: function (obj) {
            this._clear();
            this._events = [];
    
            obj = obj || this.selectedObject;
    
            if (!obj) {
                return;
            };
    
            var target = this._getWrapper(obj || this.selectedObject);
            if (!target) {
                return;
            };
    
            var propList = this._getTargetProperties(target);
    
            var section = null;
            var group = null;
            var prevSection = null;
            var prevGroup = null;
    
            var tabContainer = null;
            var tab = null;
            var row = null;
            var groupCell = null;
            var labelCell = null;
            var dataCell = null;
            var editControl = null;
            var table = null;
            var store = null;

            if (this.showSections) {
                //domStyle.set(this.gridNode, { border: '0px;' });
                tabContainer = new TabContainer({ showTitle: true, tabStrip: true });
                tabContainer.placeAt(this.gridNode);
                domClass.add(tabContainer.domNode, 'tabs');
                tabContainer.startup();
                tabContainer.resize();
            }
            else {
                //domStyle.set(this.gridNode, { border: '1px solid #999999;' });
                table = domConstruct.create('table');
                table.cols = 2;
                domConstruct.place(table, this.gridNode);
            };
    
            var isDefaultValue = function (prop, value) {
                if (typeof prop.isDefaultValue == 'function') {
                    return prop.isDefaultValue(value);
                }
                else if (prop.defaultValue == undefined) {
                    return false;
                }
                else if (prop.type == 'boolean') {
                    return (value || '').toString() == (prop.defaultValue || 'false').toString();
                }
                else {
                    return value == prop.defaultValue;
                };
            };

            var showMessage = this.showInfoMessage;

            var getChangeFn = function (e) {
                return function () {
                    var value = e.get('value');
                    if (typeof value == 'string') {
                        value = value.trim();
                    };
                    if (e.propertyInfo.validator) {
                        var res = e.propertyInfo.validator(value, e.propertyInfo);
                        if (res && !res.isValid) {
                            domClass.add(e.infoCell, 'invalidValue');
                            e.infoCell.innerHTML = "!";
                            e.infoCell.setAttribute('data-message', res.message || 'Invalid property value');
                            showMessage(e.infoCell);
                            return;
                        }
                    };
                    domClass.remove(e.infoCell, 'invalidValue');
                    e.infoCell.innerHTML = "";
                    e.infoCell.removeAttribute('data-message');

                    if (e.originalValue == undefined || value !== e.originalValue) {
                        e.targetObject.setPropertyValue(e.propertyInfo, value);
                        e.originalValue = value;
                    };
                    domClass.toggle(e.dataCell, 'isDefaultValue', isDefaultValue(e.propertyInfo, value));

                    if (e.targetObject.target && e.targetObject.target.domNode && domClass.contains(e.targetObject.target.domNode, 'finding')) {
		                topic.publish('/qc/FindingDetailsUpdated', obj);
	                }
                };
            };
    
            array.forEach(propList, function (prop) {
                section = prop.section || this.defaultSection;
                if (this.showSections && (section != prevSection)) {
                    tab = new ContentPane({ title: (section || 'Properties') });
                    tabContainer.addChild(tab);
                    table = domConstruct.create('table');
                    table.cols = 2;
                    tab.set('content', table);
                    prevSection = section;
                    prevGroup = null;
                };
    
                group = prop.group || this.defaultGroup;
                if (this.showGroups && (group !== '') && (group !== prevGroup)) {
                    row = table.insertRow(-1);
                    groupCell = row.insertCell(0);
                    groupCell.colSpan = 3;
                    domClass.add(groupCell, 'groupCell');
                    groupCell.innerHTML = '<div><div class="expander expanded"></div><div class="groupHeader">' + group + '</div></div>';
                    groupCell.setAttribute('groupname', group);
                    groupCell.setAttribute('groupvisible', true);
                    prevGroup = group;
                    this._events.push(on(groupCell, "click", lang.hitch(this, this.toggleGroup)));
                };
    
                /* prop */
                row = table.insertRow(-1);
                row.groupName = group;
                labelCell = row.insertCell(0);
                domClass.add(labelCell, 'labelCell');
                labelCell.innerHTML = '<div>' + (prop.caption || StringUtil.makeCaption(prop.name)) + '</div>';
                if (prop.description) {
                    labelCell.setAttribute('title', prop.description);
                };

                infoCell = row.insertCell(-1);
                domClass.add(infoCell, 'infoCell');

                dataCell = row.insertCell(-1);
                domClass.add(dataCell, 'dataCell');
    
    
                var value = target._pgGetPropertyValue(prop);
                if (prop.type == 'boolean') {
                    value = (prop.nullable && (value === null || value === '')) ? '' : value ? 'true' : 'false';
                }
                else {
                    if (value == undefined) {
                        value = '';
                    };
                };
                editControl = this._createEditControl(prop, value);
                if (isDefaultValue(prop, value)) {
                    domClass.add(dataCell, 'isDefaultValue');
                };
    
                if (editControl) {
                    editControl.originalValue = value;
                    editControl.targetObject = target;
                    editControl.propertyInfo = prop;
                    editControl.placeAt(dataCell);
                    editControl.dataCell = dataCell;
                    editControl.infoCell = infoCell;
                    editControl.gridRow = row;
                    editControl.startup();
    
                    this._events.push(on(editControl, "Change", lang.hitch(editControl, getChangeFn(editControl))));
                };
            }, this);
        },


    
        toggleGroup: function (evt) {
    
            var table = new NodeList(evt.target).closest('table')[0] || null;
            if (!table) {
                return;
            };
    
            var groupNode = new NodeList(evt.target).closest('.groupCell')[0] || null;
            if (!groupNode) {
                return;
            };
    
            var groupName = groupNode.getAttribute('groupname');
            if (!groupName) {
                return;
            };
    
            groupVisible = groupNode.getAttribute('groupvisible') == 'true' ? true : false;
    
            var display = groupVisible ? 'none' : 'table-row';
    
            array.forEach(table.rows, function (row) {
                if (row.groupName == groupName) {
                    domStyle.set(row, { display: display });
                };
            });
    
            if (display == 'none') {
                query('.expander', groupNode).removeClass('expanded');
                query('.expander', groupNode).addClass('collapsed');
            }
            else {
                query('.expander', groupNode).removeClass('collapsed');
                query('.expander', groupNode).addClass('expanded');
            };
    
            groupNode.setAttribute('groupvisible', !groupVisible);
        },
    
        onPropertyChanged: function (targetObject, propertyInfo) {
        },
    
        refresh: function () {
            this._renderObject();
        },

        toggleCategoryDisplay: function () {
            this.set('showGroups', !this.get('showGroups'));
        },

        togglePropertySort: function () {
            this.set('sortProperties', !this.get('sortProperties'));
        },

        onGridClick: function (evt) {
            if (domClass.contains(evt.target, 'categoryButton')) {
                this.toggleCategoryDisplay();
            }
            else if (domClass.contains(evt.target, 'alphaButton')) {
                this.togglePropertySort();
            }
            else if (domClass.contains(evt.target, 'infoCell')) {
                this.showInfoMessage(evt.target);
            }
        },

        showInfoMessage: function (infoCell) {
            if (!infoCell) {
                return;
            };

            var message = infoCell.getAttribute('data-message');
            if (!message) {
                return;
            };

            if (this.tooltipDialog) {
                this.tooltipDialog.destroyRecursive();
            };

            this.tooltipDialog = new TooltipDialog();
            this.tooltipDialog.startup();

            var htm = '<div style="max-width:200px;margin:12px;">' + message + '</div>';
            this.tooltipDialog.set('content', htm);

            this.hPopup = popup.open({ popup: this.tooltipDialog, around: infoCell });
            var hDown = on(document, 'mousedown', function () {
                popup.close();
                hDown.remove();
                this.hPopup = null;
            });
        }
    
    });
});