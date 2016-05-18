define([
    "qc/DateUtil",
    "dijit/_Container",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/Toolbar",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/NodeList-traverse",
    "dojo/on",
    "dojo/topic",
    "qc/_core",
    "qc/ListView",
    "qc/ListViewItem"
], function (DateUtil, _Container, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Button, Toolbar, array, declare, lang, aspect, dom, domClass, NodeListTraverse, on, topic, core, ListView, ListViewItem) {
    return declare("qc.LibraryManagerSearchResultList", [_WidgetBase, _TemplatedMixin, _Container, _WidgetsInTemplateMixin], {
        templateString: '<div class="searchResultList qcContextMenuContainer libraryManagerSearchResultList">'
                      + '  <div class="content ic16" data-dojo-attach-point="listView" data-dojo-type="qc/ListView" multiSelect="false"></div>'
                      + '</div>',


        _searchDef: null,
        querySourceId: null,
        currentQuery: '',
        typeFilter: [],
        attributeFilter: -1,

        startup: function () {
            if (!this._started) {
                aspect.after(this.listView, "onItemClick", lang.hitch(this, this.onItemClick), true);
                aspect.after(this.listView, "onItemDoubleClick", lang.hitch(this, this.onItemDoubleClick), true);
                this.inherited(arguments);
            }
        },

        clearResults: function () {
            this.noResults();
            this.listView.clear();
        },

        getSelectedItem: function () {
            var item = this.listView.getSelectedItem();
            return item;
        },

        onItemClick: function (item) {
            this.cancelSearch();
        },

        onItemDoubleClick: function (item) {
        },

        hasResults: function() {
            
        },

        noResults: function() {
            
        },

        actionTaken: function() {
            
        },

        cancelSearch: function () {
            if (this._searchDef) {
                this._searchDef.cancel();
            };

            this.currentQuery = '';
        },

        getQueryString: function () {
            if (this.querySourceId) {
                var querySource = dom.byId(this.querySourceId);

                if (querySource) {
                    return querySource.value.trim();
                }
            }

            return '';
        },

        doSearch: function (full) {
            var self = this;
            var query = this.getQueryString();

            if (!query || query.length < 3) {
                return self.clearResults();
            };

            if (query == this.currentQuery) {
                return;
            };

            if (/{/.test(query)) {
                if (/}$/.test(query)) {
                    query = query.substr(1, query.length - 2);
                }
                else {
                    return;
                }
            };

            self.cancelSearch();

            this.currentQuery = query;
            var queryData = { "Keywords": query, "MaxResults": 30, "DataFormat": "JSON", culture: core.settings.culture };

            self._searchDef = core.xhrGet({
                url: core.serviceURL("Quippe/ContentLibrary/Search"),
                content: queryData,
                handleAs: "json",
                failOk: true,
                error: function (message) { },
                load: lang.hitch(this, function (data, ioArgs) {
                    self.listView.clear();
                    var resultCount = 0;
                    var highlightRegex = self._createHighlightRegex(query);
                    array.forEach(core.forceArray(data.items), function (item, i) {
                        if ((self.attributeFilter & item.attributes) != 0 && (!self.typeFilter || self.typeFilter.length == 0 || self.typeFilter.indexOf(item.type) >= 0)) {
                            self.listView.addChild(new ListViewItem({
                                caption: self._highlightRanges(item.text, highlightRegex),
                                icon: core.getItemIcon(item),
                                data: item
                            }));
                            resultCount += 1;
                        }
                    });

                    if (resultCount > 0) {
                        self.hasResults();
                    }

                    else {
                        self.noResults();
                    }

                })
            });
        },

        _createHighlightRegex: function(query) {
            if (!query) {
                return null;
            }

            var regex = '';
            var words = query.split(/\s+/);
            var escapeRegex = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;

            for (var i = 0; i < words.length; i++) {
                if (i > 0) {
                    regex += "|";
                }

                regex += "\\b(" + words[i].replace(escapeRegex, "\\$&") + ")";
            }

            return RegExp(regex, "gi");
        },

        _highlightRanges: function (text, highlightRegex) {
            if (!highlightRegex) {
                return text;
            };

            return text.replace(highlightRegex, "<span class='matchText'>$&</span>");
        },

        getContextActions: function (item, widget, targetNode) {
            return [];
        }
    });
});