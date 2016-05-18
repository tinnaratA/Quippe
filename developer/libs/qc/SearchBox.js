define([
    "qc/SearchResultList",
    "qc/SearchResultTree",
    "dijit/_base/popup",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/popup",
    "dijit/Toolbar",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
    "dojo/on",
    "dojo/topic",
    "qc/_core",
    "dojo/keys"
], function (SearchResultList, SearchResultTree, basePopup, Button, TextBox, popup, Toolbar, array, declare, event, lang, aspect, dom, domClass, domConstruct, domGeometry, domStyle, on, topic, core, keys) {
    var SearchBox = declare("qc.SearchBox", [TextBox], {
        _searchControl: null,
        _isOpen: false,
        _nonCharKeys: [9, 12, /*16,*/ 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 45, 47, 91, 92, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 144, 145],
        keyTimer: null,

        startup: function () {
            if (!this._started) {
                this.inherited(arguments);
                domClass.add(this.domNode, 'qcSearchBox');
                this.textbox.setAttribute('autocorrect', 'off');
                this.textbox.setAttribute('autocapitalize', 'off');
                if (this._searchControl) {
                    this._searchControl.querySourceId = this.id;
                }
                else {
                    this._searchControl = core.settings.searchShowTree ? new SearchResultTree({ querySourceId: this.id }) : new SearchResultList({ querySourceId: this.id });
                    this._searchControl.startup();
                }
                this._isOpen = false;
                this.events = [
                    aspect.after(this._searchControl, "hasResults", lang.hitch(this, this.onResults), true),
                    aspect.after(this._searchControl, "noResults", lang.hitch(this, this.onNoResults), true),
                    aspect.after(this._searchControl, "actionTaken", lang.hitch(this, this.closePopup), true),
                    on(this.textbox, "keyup", lang.hitch(this, this.onSearchKeyUp)),
                    on(this.textbox, "keydown", lang.hitch(this, this.onSearchKeyDown))
                ];

                this.subscriptions = [
                    topic.subscribe("/dnd/drop", lang.hitch(this, this.closePopup)),
                    topic.subscribe("/qc/DragDropComplete", lang.hitch(this, this.closePopup)),
                    topic.subscribe("/qc/DoSearch", lang.hitch(this, this.invokeSearch)),
                    topic.subscribe('/qc/SettingsChanged', lang.hitch(this, this.onSettingsChanged))
                ];

                var nf = domConstruct.place('<div class="notFoundIndicator"></div>', this.domNode);
                this.events.push(on(nf, "click", lang.hitch(this, this.onClearQuery)));

                core.setSelectable(this.textbox, true);
            };
        },

        destroyRecursive: function () {
            this.closePopup();
            if (this.events) {
                this.events.forEach(function (x) { x.remove() });
                this.events = null;
            };
            if (this.subscriptions) {
                this.subscriptions.forEach(function (x) { x.remove() });
                this.subscriptions = null;
            };
            this.inherited(arguments);
        },

        _isNonCharKey: function (keyCode) {
            return (array.indexOf(this._nonCharKeys, keyCode) >= 0);
        },

        invokeSearch: function (query, fullSearch) {
            if (query) {
                this.set('value', query);
                this._searchControl.doSearch(fullSearch || false);
            };
        },

        onResults: function () {
            domClass.remove(this.domNode, 'noResults');
            this.openPopup();
        },

        onNoResults: function () {
            if (this.get('value') && this.get('value').length > 2) {
                domClass.add(this.domNode, 'noResults');
            }
            else {
                domClass.remove(this.domNode, 'noResults');
            };
            this.closePopup();
        },

        onSearchKeyDown: function(evt) {
            if (this._isNonCharKey(evt.keyCode)) {
                evt.stopPropagation();
            }
        },

        onSearchKeyUp: function (evt) {
            if (this.keyTimer) {
                clearTimeout(this.keyTimer);
            };

            if (this.get('value')) {
                domClass.add(this.domNode, 'hasText');
            }
            else {
                domClass.remove(this.domNode, 'hasText');
            }

            if (evt.keyCode == keys.ESCAPE) {
                this.closePopup();
            }
            else if (this._isNonCharKey(evt.keyCode)) {
                return;
            }
            else {
                this.keyTimer = setTimeout(lang.hitch(this, this.onDoSearch), 250);
                //this._searchControl.doSearch(false);
            }
        },

        onDoSearch: function () {
            this._searchControl.doSearch(false);
        },

        onClearQuery: function (evt) {
            this.set('value', '');
            domClass.remove(this.domNode, 'noResults');
            domClass.remove(this.domNode, 'hasText');
            if (this._searchControl && this._searchControl.onSearchQueryCleared) {
                this._searchControl.onSearchQueryCleared();
            };
            this.closePopup();
        },

        openPopup: function () {
            var self = this;
            if (!this._isOpen) {
                if (this._searchControl.toolbar) {
                    array.forEach(this._searchControl.toolbar.getChildren(), function(child) {
                        child.set("disabled", true);
                    });
                }

                popup.open({
                    "parent": self,
                    "popup": self._searchControl,
                    "around": self.domNode,
                    "onclose": function () { self.isOpen = false },
                    "onexecute": function () { self.isOpen = false }
                });

                if (core.util.isTouchDevice()) {
                    var searchPopup = popup.getTopPopup();
                    var searchControlContent = this._searchControl.treeView || this._searchControl.listView;

                    domClass.add(searchPopup.wrapper, "noOverflowScrolling");
                    domStyle.set(this._searchControl.domNode, "height", domGeometry.getContentBox(searchPopup.wrapper).h + "px");
                    domStyle.set(searchControlContent.domNode, "height", (domGeometry.getContentBox(searchPopup.wrapper).h - (domGeometry.position(searchControlContent.domNode).y - domGeometry.position(this._searchControl.domNode).y)) + "px");

                    // Additional logic to prevent accidental document scroll when trying to scroll in the search results popup
                    this.touchMoveHandles = [];

                    // If the touch move event did not originate within our search results popup (indicating that the user is touching and dragging elsewhere
                    // in the document), ignore it; this effectively allows scrolling only within the search results popup while it is open
                    this.touchMoveHandles.push(on(document.body, "touchmove", function (e) {
                        e.preventDefault();
                    }));

                    // When we get a touchstart event, we record the spot where the touch began and set a flag so that when the touchmove handler fires, it will
                    // know that it's the initial touchmove event after the touchstart
                    this.touchMoveHandles.push(on(this._searchControl.domNode, "touchstart", lang.hitch(this, function (e) {
                        this.touchStartPoint = {
                            x: e.touches[0].pageX,
                            y: e.touches[0].pageY
                        }

                        this.initialTouchMoveEvent = true;
                    })));

                    this.touchMoveHandles.push(on(this._searchControl.domNode, "touchmove", lang.hitch(this, function (e) {
                        if (this.initialTouchMoveEvent) {
                            // If the search control's content view is already at the top and the user starts dragging down (indicating that they want to scroll up), 
                            // iOS will go up the DOM tree until it gets to something scrollable (in this case, the document body) and it will scroll that.  Since we
                            // don't want that to happen, we need to block the event.  In essence, if the content view is already all the way up or all the way down,
                            // when scroll events start, we want to stop those scroll events, since they will end up scrolling the document.
                            if (e.touches[0].pageY - this.touchStartPoint.y > 0 && searchControlContent.viewPort.scrollTop == 0) {
                                e.preventDefault();
                            }

                            else if (e.touches[0].pageY - this.touchStartPoint.y < 0 && searchControlContent.viewPort.scrollTop == searchControlContent.viewPort.scrollHeight - domGeometry.getContentBox(searchControlContent.viewPort).h) {
                                e.preventDefault();
                            }
                        }

                        this.initialTouchMoveEvent = false;

                        // Stop the event propagation so that the body-level touchmove handler
                        e.stopPropagation();
                    })));

                }

                this._isOpen = true;

                var clickHandle = on(document, "click", lang.hitch(this, function (evt) {
                    if (dom.isDescendant(evt.target, this.domNode) || dom.isDescendant(evt.target, this._searchControl.domNode)) {
                        event.stop(evt);
                    }
                    else {
                        this.closePopup();
                        this._searchControl.cancelSearch();
                        core.disconnect(clickHandle);
                    };
                }));
            }
        },

        closePopup: function () {
            if (this._isOpen) {
                popup.close(this._searchControl);
                this._isOpen = false;

                if (this.touchMoveHandles) {
                    array.forEach(this.touchMoveHandles, core.disconnect);
                    this.touchMoveHandles = null;
                }
            };
        },

        onSettingsChanged: function (settings) {
            if (settings.searchShowStats != undefined) {
                this._searchControl.set('showStats', settings.searchShowStats);
            };
        }
    });

	core.settings.searchBoxClass = SearchBox;

	return SearchBox;
});