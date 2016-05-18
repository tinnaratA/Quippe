define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/dom-class"
], function (_TemplatedMixin, _WidgetBase, declare, event, domClass) {
    return declare("qc.coding._SpecifierListItem", [_WidgetBase, _TemplatedMixin], {
        // summary:
        //     Widget used to display a particular specifier within a `_SpecifierList` instance.

        // templateString: [private] String
        //     String that represents the template HTML to use when constructing the widget.
        templateString: '<div class="specifierListItem" data-dojo-attach-event="onclick:_onClick">'
                      + '  <div class="icon"></div>'
                      + '  <div data-dojo-attach-point="descriptionNode" class="description"></div>'
                      + '</div>',
    
        _getSelectedAttr: function () {
            // summary: 
            //     Returns a flag indicating whether or not this specifier is selected within the `_SpecifierList` container panel.  Should be accessed via 
            //     `this.get('selected')`.
            // returns: Boolean
            //     True if the specifier is selected, false otherwise.
            // tags:
            //     private

            return domClass.contains(this.domNode, 'selected');
        },

        _setSelectedAttr: function (value) {
            // summary:
            //     Selects or deselects this specifier within the `_SpecifierList` container panel.  Should be accessed via `this.set('selected', value)`.
            // value: Boolean
            //     If true, this widget will be selected, if false it will be deselected.
            // tags:
            //     private

            if (value) {
                domClass.add(this.domNode, 'selected');
            }
            else {
                domClass.remove(this.domNode, 'selected');
            };
        },
    
        _getDescriptionAttr: function () {
            // summary: 
            //     Returns the description for this specifier list item.  Should be accessed via `this.get('selected')`.
            // returns: String
            //     The value of `descriptionNode.innerHTML`.
            // tags:
            //     private

            return this.descriptionNode.innerHTML;
        },
        _setDescriptionAttr: function (value) {
            // summary: 
            //     Sets the description for this specifier list item.  Should be accessed via `this.set('selected', value)`.
            // value: String
            //     The description that we should use for the specifier list item.
            // tags:
            //     private

            this.descriptionNode.innerHTML = value;
        },
    
        _onClick: function (evt) {
            // summary: 
            //     Private event handler that is invoked whenever the click event occurs.
            // description:
            //     Invokes the public `onClick()` handler.
            // evt: Event
            //     Data for the click event.
            // tags:
            //     private

            event.stop(evt);
            this.onClick(this);
        },
    
        onClick: function (sender) {
            // summary: 
            //     Public event handler that is invoked whenever the click event occurs.
            // description:
            //     This event is listened to by the owner `_SpecifierList` so that it can respond to specifiers being clicked and update the code mapping for
            //     the underlying finding.
            // sender: Event
            //     Data for the click event.
        }
    });
});