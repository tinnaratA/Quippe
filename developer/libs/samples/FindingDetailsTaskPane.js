// Here we illustrate how to create a custom task pane to be placed in the right-hand task bar.  In this case we are creating
// a task pane that allows the user to edit the properties for the currently selected finding directly instead of having to
// open the finding details dialog.

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
    var typeDef = declare("samples.FindingDetailsTaskPane", [TaskPane], {
        name: "Details",        // unique name for the task pane

        // User configurable properties
        title: "Details",       // titlebar text
        group: 'Entry',         // initial taskbar group
        visible: true,          // controls the visibility of the task pane

        startup: function () {
            if (!this._started) {
                // If you want to have this task pane be a drag-and-drop target, add the qcddTarget CSS class to its domNode
                //domClass.add(this.domNode, "qcddTarget");

                // If you want this task pane to display a context menu when a right-click occurs in it, add the 
                // qcContextMenuContainer CSS class to its domNode and implement the getContextActions function below
                //domClass.add(this.domNode, "qcContextMenuContainer");

                this.propertyGrid = new PropertyGrid({ sortProperties: false }, this.containerNode);
                this.propertyGrid.propertyManager = this;
                this.propertyGrid.startup();

                this.set('open', false);

                this.inherited(arguments);
            }
        },

        // Called by the PropertyGrid to get the wrapper object that is called to retrieve and set properties for the provided
        // obj
        _pgGetWrapper: function (obj) {
            // Get the base wrapper object for the finding so that we can override a few functions
            var wrapper = obj._pgGetWrapper(obj);

            // Override _pgGetProperties() so that we can return a static list of properties
            wrapper._pgGetProperties = lang.hitch(this, function() {
                return this.getProperties(obj);
            });

            // Override _pgSetPropertyValue() so that we can update the finding's transcription when its properties are set
            var oldSetPropertyValue = wrapper._pgSetPropertyValue;
            wrapper._pgSetPropertyValue = function(propertyInfo, value) {
                oldSetPropertyValue(propertyInfo, value);
                obj.updateTranscription();
            }

            return wrapper;
        },

        refreshGrid: function() {
            this.propertyGrid.refresh();
        },

        // Return the same list of properties that you see in the details dialog, with the prefix, modifier, status, and unit
        // properties being bound to the list of values valid for the finding's Medcin ID
        getProperties: function(obj) {
            var list = [];

            list.push({ name: 'prefix', options: "Medcin/Enums/Prefix?OrderBy=2&MedcinId=" + obj.get("medcinId") });
            list.push({ name: 'modifier', options: "Medcin/Enums/Modifier?OrderBy=2&MedcinId=" + obj.get("medcinId") });
            list.push({ name: 'status', options: "Medcin/Enums/Status?OrderBy=2&MedcinId=" + obj.get("medcinId") });
            list.push({ name: 'value' });
            list.push({ name: 'unit', options: "Medcin/Enums/Units?OrderBy=2&MedcinId=" + obj.get("medcinId") });
            list.push({ name: 'note' });
            list.push({ name: 'onset' });
            list.push({ name: 'duration' });
            list.push({ name: 'episodes' });

            return list;
        },

        // Wire up topic and DOM event subscriptions for the pane so that we can react to events within the note editor.  In
        // this case, we're subscribing to the /notEditor/SelectionChanged topic so that we can display the updated properties
        // when a new finding is selected and /qc/FindingDetailsUpdated so that we can update the property values if the user
        // changes them through the finding details dialog.
        _onEnabled: function () {
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onFindingSelected)),
                    topic.subscribe("/qc/FindingDetailsUpdated", lang.hitch(this, this.refreshGrid))
                ];
            };
        },

        // Called when the task pane is disabled; unsubscribes from the topics subscribed to in _onEnabled().
        _onDisabled: function () {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            }
        },

        onFindingSelected: function (widget) {
            // If the user has selected a section or group or has deselected the current finding, collapse the task pane
            if (!widget || !widget.domNode || !domClass.contains(widget.domNode, 'finding')) {
                this.set('open', false);
                return;
            }

            this.set('open', true);
            this.propertyGrid.set("selectedObject", widget);
        }

        // If you want this task pane to display a context menu when a right-click occurs in it, add the qcContextMenuContainer
        // CSS class to its domNode and implement the getContextActions function
        //getContextActions: function (item, widget, targetNode) {
        //    var actions = [];

        //    actions.push({
        //        label: core.getI18n('tbRename'),
        //        icon: 'pencil',
        //        beginGroup: true,
        //        onClick: lang.hitch(this, function () {
        //            this.listView.setSelectedItem(widget);
        //            this.listView.startLabelEdit();
        //        })
        //    });

        //    actions.push({
        //        label: core.getI18n('deleteItem'),
        //        icon: 'delete',
        //        beginGroup: true,
        //        onClick: lang.hitch(this, function () {
        //            this.removeFavorite(item);
        //        })
        //    });

        //    return actions;
        //}
    });

    // The TaskBarLoaded topic will be published when the application starts and the
    // taskbar has loaded all of its default panes.  Call registerTaskPane to add our
    // new custom task pane.
    var hSubscribe = topic.subscribe('/qc/TaskBarLoaded', function (taskBar) {
        hSubscribe.remove();
        var detailsPane = new typeDef();
        taskBar.registerTaskPane(detailsPane)
    });

    return typeDef;
});