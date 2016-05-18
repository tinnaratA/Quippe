define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_Container",
    "dojo/dom-class"
], function (declare, _WidgetBase, _TemplatedMixin, _Container, domClass) {
    return declare("qc._ContextMenuContainer", [_WidgetBase, _TemplatedMixin, _Container], {
        // summary: 
        //      Mixin for widgets that provide a context menu.  Add this to your widget
        //      and override the getContextActions method.  On right-click of an item
        //      the ContextMenu manager will call the getContextActions method on the 
        //      closest widget having the class 'qcContextMenuContainer'. The data item,
        //      associated widget, and target dom node are passed in to getContextActions.
        //      It should return an array of action objects of the form:
        //      
        //      {label:string, icon:string, topic:string, item:object, beginGroup:boolean}
        //
        //      where:
        //          label = the label of the menu item
        //          icon  = the icon class of the menu item, optional
        //          topic = the topic to publish when that menu item is clicked
        //          item  = the item to be published with the topic, if not specified the
        //                  original data item will be passed.
        //          beginGroup = inserts a menu separator before the menu item, optional
        //
        postCreate: function () {
            domClass.add(this.domNode, 'qcContextMenuContainer');
            this.inherited(arguments);
        },

        getContextActions: function (item, widget, targetNode) {
            return [];
        }

    });
});

