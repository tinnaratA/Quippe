define([
    "qc/coding/_CodeEntryBlock",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/on",
    "qc/_core"
], function (_CodeEntryBlock, declare, lang, domClass, on, core) {
    return declare("qc.coding._NullCodeEntryBlock", [_CodeEntryBlock], {
        // summary:
        //     When viewing a list of codes to map to a finding, this widget represents an entry in the code selection list for "Do not code".

        _getSelectedAttr: function () {
            // summary: 
            //     Returns a flag indicating whether or not this code entry block is selected within the `owner` container panel.  Should be accessed via 
            //     `this.get('selected')`.
            // returns: Boolean
            //     True if the entry block is selected, false otherwise.
            // tags:
            //     private

            return domClass.contains(this.domNode, 'selected');
        },

        _setSelectedAttr: function (value) {
            // summary:
            //     Selects or deselects this code entry block within the `owner` container panel.  Should be accessed via `this.set('selected', value)`.
            // value: Boolean
            //     If true, this widget will be selected, if false it will be deselected.
            // description:
            //     If `value` is true, all of the other code entry blocks in `owner` will have their selected indicators cleared.
            // tags:
            //     private

            if (value) {
                this.owner.resetEntries();
                domClass.add(this.domNode, 'selected');
            }
            else {
                domClass.remove(this.domNode, 'selected');
            };
            this.owner.onOptionChanged();
        },
    
        loadEntry: function (mapEntry, vocabName, owner, currentEntry) {
            // summary:
            //     Initializes this widget to display within `owner`.
            // mapEntry: qc/coding/_CodeEntryBlock.__MapEntry?
            //     Details for the code that this widget will represent.  Defaults to a blank code and a description of "Do not code" if unspecified.
            // vocabName: String
            //     The vocabulary being coded against.
            // owner: EntryPanel
            //     The coding entry panel that this widget is housed under.
            // currentEntry: Object
            //     The currently selected coding entry in `owner`, used to determine if this particular widget should show up as selected by default.

            mapEntry = mapEntry || { code: '', description: 'Do not code' };
            this.vocabName = vocabName;
            this.mapEntry = mapEntry;
            this.owner = owner;
    
            this.codeLabel.innerHTML = 'Do not code';
            this.description.innerHTML = '';
            var isCurrentEntry = currentEntry && (currentEntry.code == mapEntry.code || currentEntry.baseCode == mapEntry.code);
            if (isCurrentEntry) {
                this.set('selected', true);
            };

            if (core.settings.features.touchPad) {
                on(this.domNode, "touchstart", lang.hitch(this, this.onTouchStart));
                on(this.domNode, "touchend", lang.hitch(this, this.onTouchEnd));
            }

            else {
                on(this.domNode, "click", lang.hitch(this, this.onClick));
            }
        }
    });
});