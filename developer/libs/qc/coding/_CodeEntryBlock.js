define([
    "qc/coding/_SpecifierList",
    "qc/coding/CodedTermTree",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
	"dijit/_WidgetsInTemplateMixin",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/when",
    "qc/_core"
], function (_SpecifierList, CodedTermTree, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, array, declare, event, lang, domClass, domConstruct, domStyle, on, query, when, core) {
    var _CodeEntryBlock = declare("qc.coding._CodeEntryBlock", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        // summary:
        //     When viewing a list of codes to map to a finding, this widget represents single code to display in the list along with any further subcodes,
        //     represented by qualifiers or specifiers, hints, or applicable substitutions underneath it in a tree view.
        // description:
        //     To show the various sub-items of a code within this widget, the following options must be set to true:
        //     
        //     - Qualifiers: `core.settings.showCodeQualifiers`
        //     - Specifiers: `core.settings.codingShowSpecifiers`
        //     - Hints: `core.settings.codingShowHints`
        //     - Substitutions: `core.settings.codingShowSubs`

        // templateString: [private] String
        //     String that represents the template HTML to use when constructing the widget.
        templateString: '<div class="qcCodeEntryBlock">'
                      + '  <div class="header">'
                      + '    <div class="cell"><div class="expander"></div></div>'
                      + '    <div class="cell"><div data-dojo-attach-point="icon" class="icon"></div></div>'
                      + '    <div class="cell"><div data-dojo-attach-point="codeLabel" class="codeLabel"></div></div>'
                      + '    <div class="cell"><div data-dojo-attach-point="description" class="description"></div></div>'
                      + '  </div>'
                      + '  <div data-dojo-attach-point="detailNode" class="detail">'
                      + '  </div>'
                      + '</div>',
    
        // owner: [private] EntryPanel
        //     `EntryPanel` instance that contains this code widget, should be set via a call to `loadEntry()`.
        owner: null,

        // mapEntry: qc/coding/_CodeEntryBlock.__MapEntry
        //     Contains details for the code that this entry represents, should be set via a call to `loadEntry()`.  
        mapEntry: null,

        // events: [private] Handle[]
        //     List of event handles that this widget is subscribed to.  Unused.
        events: [],
    
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
                if (!domClass.contains(this.domNode, 'selected')) {
                    this.owner.resetEntries();
                };
                this.owner.collapseAll();
                domClass.add(this.domNode, 'selected');
                domClass.add(this.domNode, 'expanded');
            }
            else {
                domClass.remove(this.domNode, 'selected');
                query('.selected', this.domNode).removeClass('selected');
                this.resetEntry();
                this.codeLabel.innerHTML = this.mapEntry.code;
                if (this.isUnreportable()) {
                    domClass.add(this.domNode, 'unreportable');
                };
            };
            this.owner.onOptionChanged(this, value);
        },
    
        loadEntry: function (mapEntry, vocabName, owner, currentEntry) {
            // summary:
            //     Initializes this widget to display a particular code and vocabulary.
            // mapEntry: qc/coding/_CodeEntryBlock.__MapEntry
            //     Details for the code that this widget will represent.
            // vocabName: String
            //     The vocabulary that this code belongs to.
            // owner: qc/coding/EntryPanel
            //     The coding entry panel that this widget is housed under.
            // currentEntry: Object
            //     The currently selected coding entry in `owner`, used to determine if this particular widget should show up as selected by default.

            this.vocabName = vocabName;
            this.mapEntry = mapEntry;
            this.owner = owner;
    
            var isCurrentEntry = currentEntry && (currentEntry.code == mapEntry.code || currentEntry.baseCode == mapEntry.code);
    
            this.codeLabel.innerHTML = mapEntry.code;
            this.description.innerHTML = mapEntry.description || '';
    
            if (isCurrentEntry) {
                this.set('selected', true);
                this.codeLabel.innerHTML = currentEntry.code || mapEntry.code;
                if (this.isUnreportable(currentEntry)) {
                    domClass.add(this.domNode, 'unreportable');
                };
            }
            else {
                if (this.isUnreportable(mapEntry)) {
                    domClass.add(this.domNode, 'unreportable');
                };
            };
    
            if (mapEntry.autoMapped) {
                domClass.add(this.domNode, 'autoMapped');
            };
    
            var detailCount = 0;
    
            if (owner && owner.findingWidget && owner.findingWidget.readOnlyCodes) {
                domStyle.set(this.icon, 'display', 'none');
            }

            if (core.settings.codingShowCodeQualifiers) {
                detailCount += this.renderCodeQualifiers(mapEntry, this.detailNode, currentEntry);
            };
    
            if (core.settings.codingShowSpecifiers) {
                detailCount += this.renderSpecifierDetails(mapEntry, this.detailNode, currentEntry);
            };
    
            if (core.settings.codingShowHints) {
                detailCount += this.renderHintDetails(mapEntry, this.detailNode, currentEntry);
            };
    
            if (core.settings.codingShowSubs) {
                detailCount += this.renderSubDetails(mapEntry, this.detailNode, currentEntry);
            };
    
            if (detailCount > 0) {
                domClass.add(this.domNode, 'hasDetail');
            };

            if (core.settings.features.touchPad) {
                on(this.domNode, "touchstart", lang.hitch(this, this.onTouchStart));
                on(this.domNode, "touchend", lang.hitch(this, this.onTouchEnd));
            }

            else {
                on(this.domNode, "click", lang.hitch(this, this.onClick));
            }
        },
    
        renderCodeQualifiers: function (item, detailBlock, currentEntry) {
            // summary:
            //     Called from `loadEntry()`.  If `item.qualifier` has any items, render each qualifier option under the main option in a tree-view format.
            // item: qc/coding/_CodeEntryBlock.__MapEntry
            //     The `mapEntry` parameter passed to `loadEntry()`, represents the code that we are rendering.
            // detailBlock: DOMNode
            //     The "details" subarea under the code that we are to render the qualifiers to.
            // currentEntry: Object
            //     The `currentEntry` parameter passed to `loadEntry()`.  Unused.
            // returns: Number
            //     The number of qualifier entries that were rendered.
            // tags:
            //     private

            var list = core.forceArray(item.qualifier);
            if (!list || list.length == 0) {
                return 0;
            };
    
            var count = 0;
            var htm = '';
            htm += '<div>';
            array.forEach(list, function (q) {
                htm += '<div class="codeQualifier">';
                htm += '+ ';
                htm += q.relationship || '';
                htm += ': ';
                htm += q.code || '';
                htm += ' - ';
                htm += q.description || '';
                htm += '</div>'
                count++;
            });
            htm += '</div>';
    
            if (count > 0) {
                domConstruct.place(htm, detailBlock);
            };
    
            return count;
        },
    
        renderSpecifierDetails: function (item, detailBlock, currentEntry) {
            // summary:
            //     Called from `loadEntry()`.  If `item.specifiers` has any items, render each specifier option under the main option in a list.
            // item: qc/coding/_CodeEntryBlock.__MapEntry
            //     The `mapEntry` parameter passed to `loadEntry()`, represents the code that we are rendering.
            // detailBlock: DOMNode
            //     The "details" subarea under the code that we are to render the specifiers to.
            // currentEntry: Object
            //     The `currentEntry` parameter passed to `loadEntry()`, represents the current code entry selected in the `owner` EntryPanel.
            // returns: Number
            //     The number of specifier entries that were rendered.
            // tags:
            //     private

            if (!item.specifiers) {
                return 0;
            };
    
            var count = 0;
            array.forEach(core.forceArray(item.specifiers), function (specifier) {
                var list = new _SpecifierList();
                list.load(specifier, this, currentEntry);
                list.placeAt(detailBlock);
                count++;
            }, this);
    
            return count;
        },
    
        renderHintDetails: function (item, detailBlock, currentEntry) {
            // summary:
            //     Called from `loadEntry()`.  If `item.hints` has any items, join the hints together with commas and place them below the text describing
            //     the code entry.
            // item: qc/coding/_CodeEntryBlock.__MapEntry
            //     The `mapEntry` parameter passed to `loadEntry()`, represents the code that we are rendering.
            // detailBlock: DOMNode
            //     The "details" subarea under the code that we are to render the hints to.
            // currentEntry: Object
            //     The `currentEntry` parameter passed to `loadEntry()`.  Unused.
            // returns: Number
            //     1 if there were hints that were added to the UI, 0 otherwise.
            // tags:
            //     private

            var hintText = array.filter(item.hints || [], function (hint) { return hint.text }).map(function (x) { return x.text }).join(', ');
            if (hintText) {
                var div = domConstruct.create('div');
                domClass.add(div, 'hint');
                div.innerHTML = hintText;
                domConstruct.place(div, detailBlock);
                return 1;
            }
            else {
                return 0;
            };
        },
    
        renderSubDetails: function (item, detailBlock, currentEntry) {
            // summary:
            //     Called from `loadEntry()`.  Gets the finding that we are coding and, if it has any potential substitutions associated with it 
            //     (`finding.subs`) and our `vocabName` property is 'icd' or 'icd10' and `item` has no specifiers associated with it, render the substitutions
            //     in `detailBlock` in the form of a `CodedTermTree` widget.  When an item in that tree is double-clicked, replace the associated finding in
            //     the note with the specified subsitution finding.
            // item: qc/coding/_CodeEntryBlock.__MapEntry
            //     The `mapEntry` parameter passed to `loadEntry()`, represents the code that we are rendering.
            // detailBlock: DOMNode
            //     The "details" subarea under the code that we are to render the substitutions to.
            // currentEntry: Object
            //     The `currentEntry` parameter passed to `loadEntry()`.  Unused.
            // returns: Number
            //     1 if there were substitutions rendered to the UI, 0 otherwise.
            // tags:
            //     private

            if (!(item.unreportable && (item.isCategory || !item.specifiers))) {
                return 0;
            };
    
            if (array.indexOf(['icd', 'icd10'], this.vocabName) < 0) {
                return 0;
            };
    
            var finding = this.owner && this.owner.findingWidget ? this.owner.findingWidget.toFinding() : null;
            if (!finding || !finding.subs) {
                return 0;
            };
    
            var label = domConstruct.place('<div style="font-style:italic;">Replace with:</div>', detailBlock);
            var tree = new CodedTermTree({ vocabName: this.vocabName, hideRoot: true, owner: this.owner });
            tree.startup();
            tree.onNodeDoubleClick = lang.hitch(this, this.onReplacementNodeClick);
            var root = tree.setRoot({ type: 'term', medcinId: finding.medcinId, subs: '+', text: finding.text });
            tree.placeAt(detailBlock);
            when(root.expand(), function () {
                if (root.childCount == 0 && tree.domNode) {
                    domStyle.set(label, { display: 'none' });
                    domStyle.set(tree.domNode, { display: 'none' });
                };
            });
            return 1;
        },
    
        onSpecOptionChanged: function (specifier, code, description) {
            // summary:
            //     Event raised from `_SpecifierList` (rendered by `renderSpecifierDetails`) when the specifier item selected has been changed.  
            // description: 
            //     Updates `mapEntry`, setting `resolvedCode` as appropriate and adding an item to its `selectedSpecifiers` hash with the id, code, digit, and 
            //     description of the specifier.  Calls the `onOptionChanged()` function on `owner` when it's done.
            // specifier: qc/coding/_SpecifierList.__Specifier
            //     New specifier that was selected.
            // code: String
            //     Code for the specifier selected.
            // description: String
            //     Description for the specifier selected.

            var entry = this.mapEntry;
            if (!entry) {
                return;
            };
    
            if (!entry.selectedSpecifiers) {
                entry.selectedSpecifiers = {};
            };
    
            entry.selectedSpecifiers[specifier.id] = {
                id: specifier.id,
                code: code || '',
                digit: specifier.digit || null,
                description: description
            };
    
            var baseCode = entry.resolvedCode || entry.baseCode || entry.code;
            if (specifier.digit && baseCode) {
                var buf = baseCode.split('');
                buf[3] = ".";
                buf[specifier.digit] = code;
                for (var n = 0; n < buf.length; n++) {
                    if (!buf[n]) {
                        buf[n] = '?';
                    };
                };
                entry.resolvedCode = buf.join('');
            }
            else {
                entry.resolvedCode = baseCode;
            };
    
            if (this.isUnreportable(entry)) {
                domClass.add(this.domNode, 'unreportable');
            }
            else {
                domClass.remove(this.domNode, 'unreportable');
                entry.resolvedCode = entry.resolvedCode.replace(/\?/g, 'X');
            };
    
            this.codeLabel.innerHTML = entry.resolvedCode;
    
            this.clearAutoMapFlag();
            this.owner.onOptionChanged(this, true);
        },
    
        onReplacementNodeClick: function (tNode, evt) {
            // summary:
            //     Event raised from the `CodedTermTree` rendered by `renderSubDetails()` when a substitution node is double-clicked.  Calls 
            //     `owner.onReplacementSelected()` to perform the substitution.
            // tNode: DOMNode
            //     Node in the tree that was double-clicked.
            // evt: Event
            //     Data for the double-click event.  Unused.
            // tags:
            //     private

            var term = tNode.data;
            term.type = 'term';
            this.owner.onReplacementSelected(term);
        },
    
        // TODO: remove, does not appear to be used.
        getFindingEntry: function () {

            if (!this.owner || !this.owner.findingWidget || !this.owner.findingWidget.codingInfo) {
                return null;
            };
            return this.owner.findingWidget.codingInfo[this.vocabName] || null;
        },
    
        isUnreportable: function (item) {
            // summary:
            //     Checks to see if a given coding item is unreportable.
            // description:
            //     We check a series of properties on `item` to see if it's unreportable:
            //
            //     - If `item.unreportable` is false, return false.
            //     - If the item has no specifiers, return true.
            //     - If any of the specifiers are not selected, or have no code, or have a code of 'x' return true.
            //     - Otherwise, return false.
            // item: Object?
            //     Item that we are to check.  Defaults to `mapEntry` if unspecified.
            // returns: Boolean
            //     True if the item is unreportable, false otherwise.

            item = item || this.mapEntry;
            if (!item.unreportable) {
                return false;
            };
    
            var iSpec = item.specifiers;
            var sSpec = item.selectedSpecifiers;
    
            if (!iSpec || iSpec.length == 0 || !sSpec) {
                return true;
            };
    
            var value = false;
            array.forEach(iSpec, function (spec) {
                if (!sSpec[spec.id] || !sSpec[spec.id].code || sSpec[spec.id].code == 'x') {
                    value = true;
                };
            });
    
            return value;
        },
    
        onClick: function (evt) {
            // summary:
            //     Event that is raised whenever a click event occurs in the widget.  If the click occurs over an expander UI element, we trigger that 
            //     expander, otherwise we set the 'selected' attribute to true.
            // evt: Event
            //     Data about the click event.

            this.clearAutoMapFlag();
            if (domClass.contains(evt.target, 'expander')) {
                this.toggleExpansion();
            }
            else {
                this.set('selected', true);
            }
        },
    
        toggleExpansion: function () {
            // summary:
            //     Called from `onClick()` when an expander element is clicked.  If the element is already expanded, call `owner.collapseAll()` to collapse it.
            //     Otherwise, set the 'selected' attribute to true and add the `expanded` CSS class to `domNode`.
            // tags:
            //     private

            var shouldExpand = !domClass.contains(this.domNode, 'expanded');
            this.owner.collapseAll();
            if (shouldExpand) {
                if (!this.get('selected')) {
                    this.set('selected', true);
                };
                domClass.add(this.domNode, 'expanded');
            };
        },
    
        resetEntry: function () {
            // summary:
            //     Called whenever the 'selected' attribute is set to false.  Clears out the `baseCode`, `resolvedCode`, and `selectedSpecifiers` properties of
            //     `mapEntry`.
            // tags:
            //     private

            var entry = this.mapEntry;
            if (!entry) {
                return;
            };
    
            if (entry.baseCode) {
                delete entry.baseCode;
            };
    
            if (entry.resolvedCode) {
                delete entry.resolvedCode;
            };
    
            if (entry.selectedSpecifiers) {
                delete entry.selectedSpecifiers;
            };
        },
    
        clearAutoMapFlag: function () {
            // summary:
            //     Called from `onSpecOptionChanged` when a specifier is selected to indicate that we're not using an auto-mapped code any longer.
            // tags:
            //     private

            this.mapEntry.autoMapped = false;
            domClass.remove(this.domNode, 'autoMapped');
        },
    
        onTouchStart: function (evt) {
            // summary:
            //     Event handler that's called when a touch event starts on the widget.  Populates a `touchData` property that is used by `onTouchEnd` event
            //     handler to determine what to do when the touch event completes.
            // evt: Event
            //     Data for the touch start event.

            if (evt.touches.length > 1) {
                this.touchData = null;
                return;
            };

            this.touchData = {
                initialEvent: evt,
                target: evt.target
            };
        },

        onTouchEnd: function (evt) {
            // summary:
            //     Event handler that's called when a touch event ends on the widget.  Uses the `touchData` property populated by `onTouchStart` to determine
            //     where the touch originated and either expands the subs tree (if an expander was the target) or selects the code entry.
            // evt: Event
            //     Data for the touch end event.

            if (this.touchData) {
                event.stop(evt);

                if (domClass.contains(this.touchData.target, 'expander')) {
                    this.toggleExpansion();
                }

                else {
                    this.set('selected', true);
                }

                this.touchData = null;
            };
        }
    });

    /*=====
    _CodeEntryBlock.__Qualifier = declare("qc.coding._CodeEntryBlock.__Qualifier", {
        // summary:
        //     Qualifier that can be applied to a `__MapEntry` to further refine it.
        // relationship: String
        //     Relationship of the qualifier to the main code (same as, broader than, part of, etc.).
        // code: String
        //     Code for the qualifier.
        // description: String
        //     Description of the qualifier.
        // __iskwargs:
        //     True
	});

	_CodeEntryBlock.__MapEntry = declare("qc.coding._CodeEntryBlock.__MapEntry", {
        // summary:
        //     Details for a code that a `_CodeEntryBlock` widget will represent.
        // code: String
        //     Identifier for the code.
        // description: String
        //     Descriptive text for the code.
        // unreportable: Boolean
        //     Flag indicating that this code cannot be reported.
        // autoMapped: Boolean
        //     Flag indicating that this code is the default code to be used for a finding.
        // qualifier: qc/coding/_CodeEntryBlock.__Qualifier[]
        //     List of qualifiers that can be applied to this code to further refine it.
        // specifiers: qc/coding/_SpecifierList.__Specifier[]
        //     Specifier data to provide metadata for the code (i.e. left, right, recurrent, initial encounter, etc.).
        // hints: String|String[]
        //     Text to be displayed with the code to assist the user in choosing a mapping.
        // isCategory: Boolean
        //     Flag indicating that this code represents a category.
        // __iskwargs:
        //     True
	});
	=====*/

    return _CodeEntryBlock;
});