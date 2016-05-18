define([
    "qc/design/PropertyGrid",
    "qc/TaskPane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/topic",
    "qc/_core"
], function (PropertyGrid, TaskPane, array, declare, lang, domClass, domConstruct, domStyle, topic, core) {
    var typeDef = declare("qc.taskbar.FindingDetailsTaskPane", [TaskPane], {
        name: "Details",
       
        title: "Details",
        group: 'Entry',

        startup: function () {
            if (!this._started) {
                this.propertyGrid = new PropertyGrid({ sortProperties: false }, this.containerNode);
                this.propertyGrid.propertyManager = this;
                this.propertyGrid.startup();
                this.set('open', false);
                this.inherited(arguments);
            }
        },

        _pgGetWrapper: function (obj) {
            var wrapper = obj._pgGetWrapper(obj);

            wrapper._pgGetProperties = lang.hitch(this, function () {
                return this.getProperties(obj);
            });

            var oldSetPropertyValue = wrapper._pgSetPropertyValue;
            wrapper._pgSetPropertyValue = function (propertyInfo, value) {
                oldSetPropertyValue(propertyInfo, value);
                obj.updateTranscription();
            };

            return wrapper;
        },

        refreshGrid: function() {
            this.propertyGrid.refresh();
        },
        
        getProperties: function(obj) {
            var list = [];

            list.push({ name: 'prefix', options: "Medcin/Enums/Prefix?OrderBy=2&MedcinId=" + obj.get("medcinId") });
            list.push({ name: 'modifier', options: "Medcin/Enums/Modifier?OrderBy=2&MedcinId=" + obj.get("medcinId") });
            list.push({ name: 'status', options: "Medcin/Enums/Status?OrderBy=2&MedcinId=" + obj.get("medcinId") });
            list.push({ name: 'value' });
            list.push({ name: 'unit', options: "Medcin/Enums/Units?OrderBy=2&MedcinId=" + obj.get("medcinId"), allowAnyValue: true });
            list.push({ name: 'note' });
            list.push({ name: 'onset' });
            list.push({ name: 'duration' });
            //list.push({ name: 'episodes' });

            return list;
        },
       
        _onEnabled: function () {
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onSelectionChanged)),
                    topic.subscribe("/qc/FindingDetailsUpdated", lang.hitch(this, this.refreshGrid))
                ];
            };
            this.onSelectionChanged();
        },

        _onDisabled: function () {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            }
        },

        onSelectionChanged: function () {
            if (this.hOnChange) {
                clearTimeout(this.hOnChange);
                this.hOnChange = null;
            };
            this.hOnChange = setTimeout(lang.hitch(this, function () {
                this.hOnChange = null;
                var widget = core.getNoteEditor().selection.getSelectedWidgets()[0];
                if (widget && domClass.contains(widget.domNode, 'finding')) {
                    this.propertyGrid.set("selectedObject", widget);
                    if (!this.get('open')) {
                        this.set('open', true);
                    };
                }
                else {
                    if (this.get('open')) {
                        this.set('open', false);
                    };
                    this.propertyGrid.set("selectedObject", null);
                };
            }), 20);
        }
    });

    return typeDef;
});