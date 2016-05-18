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
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/NodeList-traverse",
    "dojo/on",
    "dojo/topic",
    "qc/_core",
    "qc/TreeView",
    "qc/TreeNode"
], function (DateUtil, _Container, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Button, Toolbar, array, declare, lang, aspect, dom, domConstruct, domClass, NodeListTraverse, on, topic, core, TreeView, TreeNode) {
    return declare("qc.SearchResultTree", [_WidgetBase, _TemplatedMixin, _Container, _WidgetsInTemplateMixin], {
        templateString: '<div class="searchResultList qcContextMenuContainer">'
                      + '  <div class="header ic16" data-dojo-attach-point="toolbar" data-dojo-type="dijit/Toolbar"></div>'
                      + '  <div class="content ic16" data-dojo-attach-point="treeView" data-dojo-type="qc/TreeView" multiSelect="false"></div>'
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
        reCommand: /^\-\S+\:?\s?$|^\-?\S+\:\s?$/,

        startup: function () {
            if (!this._started) {
	            aspect.after(this.treeView, "onSelectionChanged", lang.hitch(this, this.onSelectionChanged), true);
	            aspect.after(this.treeView, "onNodeDoubleClick", lang.hitch(this, this.oNodeDoubleClick), true);

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
	            this.treeView.resolveChildren = lang.hitch(this, this.resolveChildren);
	            this.treeView.nodeFromItem = lang.hitch(this, this.nodeFromItem);
                this.content = this.treeView;
             
	            this.inherited(arguments);
            }
        },

        _setShowStatsAttr: function(value){
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
            this.treeView.clear();
            this.resultStats.innerHTML = '';
        },

        getSelectedItem: function () {
            var item = this.treeView.getSelectedItem();
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
            var item = this.getMergeableSelection();
            if (item) {
                this.addItemToNote(item);
            };
        },

        onMergePrompt: function (evt) {
            var item = this.getMergeableSelection();
            if (item) {
                topic.publish("/qc/MergePrompt", item, -1);
                this.actionTaken();
            };
        },

        onAddToFavorites: function (evt) {
            var item = this.getSelectedItem();
            if (item) {
                topic.publish("/qc/AddToFavorites", item);
                this.actionTaken();
            };
        },

        getMergeableSelection: function() {
            var item = this.treeView.getSelectedItem();
            if (!item) {
                return null;
            };

            //suppress "adding" a form in design mode
            if (item.type == 'form') {
                if (!this.editor) {
                    this.editor = core.getNoteEditor();
                };
                var viewMode = this.editor ? this.editor.viewMode : '';
                if (viewMode == 'design') {
                    return null;
                };
            };

            return item;
        },

        onSelectionChanged: function (item) {
        	this.cancelSearch();

        	var disabled = this.getMergeableSelection() ? false : true;

	        array.forEach(this.toolbar.getChildren(), function(child) {
		        child.set("disabled", disabled);
	        });
        },

        oNodeDoubleClick: function (item) {
            this.cancelSearch();
            this.addItemToNote(item.data);
        },

        addItemToNote: function(item) {
            if (!item) {
                return;
            };
            if (item.type == 'term') {
                item.styleClass = 'lstSearch';
            };
            topic.publish("/qc/AddToNote", item);
            this.actionTaken();
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
            if (!query || (query.length < 3 && !query.match(/[A-Z][A-Z]/))) {
                return self.clearResults();
            };

            if (!full && query == this.currentQuery) {
                return;
            };

            if (this.reCommand.test(query)) {
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
            var maxResults = full ? self.maxFullResults : self.maxPartialResults;

            var queryData = { "Query": query, "MaxResults": maxResults, "DataFormat": "JSON", culture: core.settings.culture };

            if (core.settings.searchVersion) {
                queryData["SearchVersion"] = core.settings.searchVersion;
            }

            if (core.settings.searchFilterBySex && core.Patient) {
                queryData["PatientSex"] = core.Patient.sex || '';
                queryData["PatientAge"] = core.Patient.ageInMinutes || 0;
            };

            if (!core.settings.features.drawing) {
                queryData["IncludeImages"] = "False"
            };

            if (this.searchCommand) {
                queryData["Command"] = this.searchCommand;
            }
            
            this.startTime = new Date();
            self._searchDef = core.xhrGet({
                url: core.serviceURL("Quippe/Search"),
                content: queryData,
                handleAs: "json",
                failOk: true,
                error: function (message) { },
                load: lang.hitch(this, function (data, ioArgs) {
                    var resultCount = 0;
                    var res = data.searchResults;

                    if (core.settings.searchShowStats) {
                        var roundTrip = (this.startTime ? new Date() - this.startTime : 0);
                        this.resultStats.innerHTML = (res.count ? data.searchResults.count + ' results, ' : '')
                            + (res.searchTime ? Math.round(data.searchResults.searchTime) + 'ms in search, ' : '')
                            + (res.time ? Math.round(data.searchResults.time) + 'ms on server, ': '')
                            + (roundTrip ? roundTrip + 'ms total' : '')
                    };

                    self.treeView.clear();
                    array.forEach(core.forceArray(res.item), function (item, i) {
                        var tNode = new TreeNode({
                            label: self._highlightRanges(item.text, item.highlight),
                            icon: core.getItemIcon(item),
                            lazyLoading: item.subs ? true : false,
                            data: item
                        });
                        if (item.tags) {
                            domClass.add(tNode.domNode, item.tags);
                        };
                        self.treeView.addChild(tNode);
                     
                        resultCount += 1;
                    });

                    if (self.autoFinalize && !full && !self._finalDef && resultCount >= self.maxPartialResults) {
                        self._finalDef = setTimeout(function () { self.doSearch(true); }, self.autoFinalizeDelay);
                    }

                    if (resultCount > 0) {
                        self.hasResults();
                    }
                    else {
                        self.noResults();

                        if (res.count == 0 && res.suggestion && (core.settings.searchAllowApprox !== false)) {
                            self.queryReplacement = { query: query, replacement: res.suggestion };
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
        },

        convertTerm: function (term) {
            return {
                medcinId: term.m,
                nodeKey: term.n,
                termType: core.TermTypeInfo.fromNodeKey(term.n).termType,
                subs: term.s,
                text: term.t,
                fullText: term.fullText || term.t,
                type: 'term'
            };
        },

        resolveChildren: function (tNode) {
            this.cancelSearch();

            if (!tNode.data || !(tNode.data.type == 'term')) {
                return [];
            };

            var converter = this.convertTerm;
            var id = tNode.data.id || tNode.data.medcinId || 0;
            if (!id) {
                return;
            };

            return core.xhrGet({
                url: core.serviceURL('Quippe/Browse/Subs'),
                content: { MedcinId: id, DataFormat: "JSON", IncludeFullText: this.includeFullText, culture: core.settings.culture },
                handleAs: "json",
                error: core.showError,
                load: function (data, ioArgs) {
                    if (data && data.termList && data.termList.term) {
                        return array.map(core.forceArray(data.termList.term), converter);
                    }
                    else {
                        return [];
                    }
                }
            });
        },

        nodeFromItem: function (item) {
            return new TreeNode({
                label:  this._highlightRanges(item.text, item.highlight),
                icon: item.icon || core.getItemIcon(item, false),
                lazyLoading: item.subs ? true : false,
                reserveIconSpace: false,
                data: item
            });
        }
    });
});