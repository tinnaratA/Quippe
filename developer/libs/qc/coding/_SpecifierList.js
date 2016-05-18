define([
    "qc/coding/_SpecifierListItem",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/_base/array",
    "dojo/_base/declare",
	"dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/query",
    "qc/_core"
], function (_SpecifierListItem, _TemplatedMixin, _WidgetBase, array, declare, lang, domClass, domConstruct, on, query, core) {
    var _SpecifierList = declare("qc.coding._SpecifierList", [_WidgetBase, _TemplatedMixin], {
        // summary:
        //     Displayed within a `_CodeEntryBlock` instance and is used to display the specifiers (i.e. left, right, recurrent, initial encounter, etc.) in
        //     the form of a list.
        // description:
        //     Will only be displayed if `core.settings.codingShowSpecifiers` is set to true.

        // templateString: [private] String
        //     String that represents the template HTML to use when constructing the widget.
        templateString: '<div class="specifierList">'
                      + ' <div data-dojo-attach-point="headerNode" class="header"></div>'
                      + ' <div data-dojo-attach-point="listNode" class="items"></div>'
                      + '</div>',

        // events: [private] Handle[]
        //     List of event handles that this widget is subscribed to.
        events: [],

        // specifier: qc/coding/_SpecifierList.__Specifier
        //     Definition for the list of specifiers that we are to display, provided by a call to `load()`.
        specifier: null,
    
        load: function (specifier, owner, currentEntry) {
            // summary:
            //     Initializes this widget to display the specifiers provided in `specifier`.
            // specifier: qc/coding/_SpecifierList.__Specifier
            //     Details for the specifiers that will be displayed.
            // owner: qc/coding/_CodeEntryBlock
            //     The coding entry block that this widget is housed under.
            // currentEntry: Object
            //     The currently selected coding entry in `owner.owner` (an `EntryPanel`), used to determine which specifier, if any, should show up as 
            //     selected by default.

            this.clear();
            this.specifier = specifier;
            this.owner = owner;
            this.headerNode.innerHTML = (specifier.tag || 'Specifier');
    
            var selectedSpec = '';
    
            if (currentEntry) {
                var resolvedCode = currentEntry.resolvedCode || currentEntry.code || '';
                selectedSpec = (specifier.digit && resolvedCode) ? resolvedCode.charAt(specifier.digit) : '';
                if (!selectedSpec) {
                    selectedSpec = currentEntry.specifiers && currentEntry.specifiers[specifier.id] ? currentEntry.specifiers[specifier.id].code : '';
                };
            };
    
            array.forEach(specifier.list, function (specItem) {
                var listItem = new _SpecifierListItem({ code: specItem.code, description: specItem.description, selected: (specItem.code == selectedSpec) });
                listItem.placeAt(this.listNode);
                this.events.push(on(listItem, "Click", lang.hitch(this, this.onItemClick)));
            }, this);
        },
    
        clear: function () {
            // summary:
            //     Blanks out this widget by clearing out the contents of `headerNode` and `listNode`.

            this.headerNode.innerHTML = '';
            domConstruct.empty(this.listNode);
            if (this.events) {
                array.forEach(this.events, core.disconnect);
            };
            this.events = [];
        },
    
        onItemClick: function (item) {
            // summary:
            //     Event handler that is invoked when an item in the specifier list is clicked.
            // description:
            //     If any other specifier items are currently selected, they are unselected.  `owner.onSpecOptionChanged()` is called when processing is
            //     completed.
            // item: DOMNode
            //     Specifier item that was clicked.

            if (!item.get('selected')) {
                query('.specifierListItem', this.domNode).removeClass('selected');
                domClass.add(item.domNode, 'selected');
                this.owner.onSpecOptionChanged(this.specifier, item.code, item.description);
            };
        }
    });

    /*=====
    _SpecifierList.__SpecifierMetadata = declare("qc.coding._SpecifierList.__SpecifierMetadata", {
        // summary:
        //     Code and description for a specific specifier in a `__Specifier.list` instance.
        // code: String
        //     Code for the specifier list item.
        // description: String
        //     Description of the specifier list item.
        // __iskwargs:
        //     True
	});

	_SpecifierList.__Specifier = declare("qc.coding._SpecifierList.__Specifier", {
        // summary:
        //     Details for a specifier that will appear in a `_SpecifierList` widget.
        // tag: String
        //     Text to display in the header of the specifier node.
        // digit: Number
        //     Character location within the parent's code where the ID for the specifier should come from.
        // id:  String
        //     Identifier for the specifier.
        // list: qc/coding/_SpecifierList.__SpecifierMetadata[]
        //     List of codes and descriptions for the specifier.
        // __iskwargs:
        //     True
	});
	=====*/

    return _SpecifierList;
});