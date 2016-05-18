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
    return declare("qc.SearchResultList", [_WidgetBase, _TemplatedMixin, _Container, _WidgetsInTemplateMixin], {
        templateString: '<div class="searchResultList qcContextMenuContainer">'
                      + '  <div class="header ic16" data-dojo-attach-point="toolbar" data-dojo-type="dijit/Toolbar"></div>'
                      + '  <div class="content ic16" data-dojo-attach-point="listView" data-dojo-type="qc/ListView" multiSelect="false"></div>'
                      + '  <div class="resultStats" data-dojo-attach-point="resultStats"></div>'
                      + '</div>',


        _searchDef: null,
        _finalDef: null,
        autoFinalize: true,
        autoFinalizeDelay: 3000,
        maxPartialResults: 20,
        maxFullResults: 200,
        showStats: true,
        querySourceId: null,
        currentQuery: '',

        startup: function () {
            if (!this._started) {
	            aspect.after(this.listView, "onItemClick", lang.hitch(this, this.onItemClick), true);
	            aspect.after(this.listView, "onItemDoubleClick", lang.hitch(this, this.onItemDoubleClick), true);

	            this.toolbar.addChild(new Button({
		            label: core.getI18n("addtonote"),
		            iconClass: "document_add",
		            onClick: lang.hitch(this, this.onAddToNote),
		            showLabel: true,
		            disabled: true
	            }));

	            this.toolbar.addChild(new Button({
		            label: core.getI18n("mergeprompt"),
		            iconClass: "view",
		            onClick: lang.hitch(this, this.onMergePrompt),
		            showLabel: true,
		            disabled: true
	            }));

	            this.toolbar.addChild(new Button({
		            label: core.getI18n("addtofavorites"),
		            iconClass: "star_yellow_add",
		            onClick: lang.hitch(this, this.onAddToFavorites),
		            showLabel: true,
		            disabled: true
	            }));

	            this.set('showStats', core.settings.searchShowStats || false);
                this.content = this.listView;

	            this.inherited(arguments);
            }
        },

        _setShowStatsAttr: function (value) {
            this.showStats = value ? true : false;
            if (this.showStats) {
                domClass.add(this.domNode, 'showStats');
            }
            else {
                domClass.remove(this.domNode, 'showStats');
            }
        },

        getQueryString: function () {
            if (this.querySourceId) {
                var querySource = dom.byId(this.querySourceId);
                if (querySource) {
                    return querySource.value.trim();
                }
            };
            return '';
        },

        clearResults: function () {
            this.noResults();
            this.listView.clear();
            this.resultStats.innerHTML = '';
        },

        getSelectedItem: function () {
            var item = this.listView.getSelectedItem();
            if (item && item.type == 'term') {
                var query = this.getQueryString() || '';
                switch (query.charAt(query.length - 1) || '') {
                    case '+':
                        item.result = 'A';
                        break;
                    case '-':
                        item.result = 'N';
                        break;
                    default:
                        break;
                };
            };
            return item;
        },

        onAddToNote: function (evt) {
            var item = this.getSelectedItem();
            if (item) {
                item.data.styleClass = "lstSearch"
                topic.publish("/qc/AddToNote", item.data);
                this.actionTaken();
            };
        },

        onMergePrompt: function (evt) {
            var item = this.getSelectedItem();
            if (item) {
                topic.publish("/qc/MergePrompt", item.data, -1);
                this.actionTaken();
            };
        },

        onAddToFavorites: function (evt) {
            var item = this.getSelectedItem();
            if (item) {
                topic.publish("/qc/AddToFavorites", item.data);
                this.actionTaken();
            };
        },

        onItemClick: function (item) {
        	this.cancelSearch();

	        array.forEach(this.toolbar.getChildren(), function(child) {
		        child.set("disabled", false);
	        });
        },

        onItemDoubleClick: function (item) {
            this.cancelSearch();

            if (item) {
                topic.publish("/qc/AddToNote", item.data);
                this.actionTaken();
            };
        },

        hasResults: function () { },
        noResults: function () { },
        actionTaken: function () { },

        cancelSearch: function () {
            if (this._finalDef) {
                clearTimeout(this._finalDef);
                this._finalDef = null;
            };

            if (this._searchDef) {
                this._searchDef.cancel();
            };

            this.currentQuery = '';
        },

        doSearch: function (full) {
            var self = this;
            var query = self.getQueryString();
            if (self.queryReplacement && self.queryReplacement.query == query) {
                query = self.queryReplacement.replacement;
            };
            if (!query || query.length < 3) {
                return self.clearResults();
            };

            if (!full && query == this.currentQuery) {
                return;
            };

            self.cancelSearch();

            this.currentQuery = query;
            this.startTime = new Date();
            var maxResults = full ? self.maxFullResults : self.maxPartialResults;

            var queryData = { "Query": query, "MaxResults": maxResults, "DataFormat": "JSON", culture: core.settings.culture };
            if (core.settings.searchFilterBySex && core.Patient) {
                queryData["PatientSex"] = core.Patient.sex || '';
                queryData["PatientAge"] = core.Patient.ageInMinutes || 0;
            };

            if (!core.settings.features.drawing) {
                queryData["IncludeImages"] = "False"
            };

            self._searchDef = core.xhrGet({
                url: core.serviceURL("Quippe/Search"),
                content: queryData,
                handleAs: "json",
                failOk: true,
                error: function (message) { },
                load: lang.hitch(this, function (data, ioArgs) {
                    self.listView.clear();
                    var resultCount = 0;
                    if (this.showStats) {
                        var roundTrip = (this.startTime ? new Date() - this.startTime : 0);
                        this.resultStats.innerHTML = data.searchResults.count + ' results, ' + Math.round(data.searchResults.time) + 'ms on server, ' + roundTrip + 'ms total';
                    };
                    array.forEach(core.forceArray(data.searchResults.item), function (item, i) {
                        self.listView.addChild(new ListViewItem({
                            caption: self._highlightRanges(item.text, item.highlight),
                            icon: core.getItemIcon(item),
                            data: item
                        }));
                        resultCount += 1;
                    });

                    if (self.autoFinalize && !full && !this._finalDef) {
                        self._finalDef = setTimeout(function () { self.doSearch(true); }, self.autoFinalizeDelay);
                    }

                    if (resultCount > 0) {
                        self.hasResults();
                    }
                    else {
                        self.noResults();

                        if (data.searchResults.count == 0 && data.searchResults.suggestion && (core.settings.searchAllowApprox !== false)) {
                            self.queryReplacement = { query: query, replacement: data.searchResults.suggestion };
                            setTimeout(function () { self.doSearch(false) }, 10)
                        };
                    }

                })
            });
        },

        _highlightRanges: function (text, highlightList) {
            if (!highlightList) {
                return text;
            };

            var highlights = eval(highlightList);
            if (highlights === undefined || highlights.length === undefined || highlights.length === 0) {
                return text;
            };

            var buf = '';
            var p = 0;
            for (var h = 0; h < highlights.length; h++) {
                var start = highlights[h][0];
                var length = highlights[h][1];
                if (p < start) {
                    buf += text.substring(p, start);
                };
                buf += "<span class='matchText'>";
                buf += text.substr(start, length);
                buf += "</span>";
                p = start + length;
            };

            if (p < text.length) {
                buf += text.substring(p);
            };
            return buf;
        },

        getContextActions: function (item, widget, targetNode) {
            return [];
        }
    });
});