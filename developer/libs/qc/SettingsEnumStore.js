define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/data/util/filter",
    "dojo/data/util/simpleFetch",
    "dojo/Deferred",
    "dojo/when",
    "qc/_core",
    "qc/StringUtil"
], function (array, declare, lang, filter, simpleFetch, Deferred, when, core, StringUtil) {
    var SettingsEnumStore = declare("qc.SettingsEnumStore", [], {
        url: '',
        list: null,
        allowEmpty: false,
        sortBy: '',
        updateNeeded: false,
        listFilter: null,
        listCallback: null,

        constructor: function (enumSource, allowEmpty, sortBy) {
            this.allowEmpty = allowEmpty || false;
            this.sortBy = sortBy || '';
            if (enumSource) {
                if (typeof enumSource == 'string') {
                    if (enumSource.charAt(0) == '[') {
                        this.list = StringUtil.parseCodedList(enumSource, sortBy, allowEmpty, ';');
                    }
                    else if (enumSource.charAt(0) == '{') {
                        this.listCallback = new Function(enumSource.substr(1, enumSource.trim().length - 2));
                        this.list = null;
                    }
                    else {
                        this.list = null;
                        this.url = core.serviceURL(enumSource);
                    }
                }
                else if (typeof enumSource == 'function') {
                    this.listCallback = enumSource;
                    this.list = null;
                }
                else if (enumSource instanceof Array) {
                    this.list = enumSource;
                };
            };
        },

        getValue: function (item, attribute, defaultValue) {
            return item[attribute] == undefined ? defaultValue : item[attribute];
        },

        isItemLoaded: function (item) {
            return true;
        },

        getFeatures: function () {
        	// DojoConvertIgnore
            return { "dojo.data.api.Read": true, "dojo.data.api.Identity": true };
        },

        close: function () {
            return;
        },

        getLabel: function (item) {
            return item.text;
        },

        getLabelAttributes: function (item) {
            return 'text';
        },

        getIdentity: function (item) {
            return item.id;
        },

        loadData: function () {
            if (this.listCallback) {
                return this.listCallback.call(null, this);
            };

            if (this.list && !(this.url && this.updateNeeded)) {
                return this.list;
            };

            var preventCache = this.updateNeeded || false;
            this.updateNeeded = false;

            var self = this;
            var listFilter = this.listFilter || null;
            var allowEmpty = this.allowEmpty || false;
            var sortBy = this.sortBy || '';

            return core.xhrGet({
                url: this.url,
                content: { "DataFormat": "JSON" },
                preventCache: preventCache,
                handleAs: "json",
                error: core.showError,
                load: function (data, ioArgs) {
                    if (data.error) {
                        core.showError(data.error.message);
                        self.list = [];
                        return [];
                    };

                    var list = data.items || [];

                    if (list.length == 0 && data['enum'] && data['enum'].item) {
                        array.forEach(core.forceArray(data['enum'].item), function (i) {
                            i.id = i.id || i.code;
                            i.text = i.text || i.description || i.code;
                            i.fullDescription = i.id + (i.text && i.text !== i.id) ? ' - ' + i.text : '';
                            list.push(i);
                        });
                    };

                    if (allowEmpty) {
                        if (list.length == 0 || list[0].id != '') {
                            list.unshift({ id: '', text: '' })
                        };
                    };

                    if (listFilter) {
                        list = array.filter(list, listFilter);
                    };

                    if (sortBy) {
                        list.sort(function (a, b) { return StringUtil.compare(a[sortBy], b[sortBy], true) });
                    };

                    self.list = list;
                    return list;
                }
            });

        },

        /* Added by *dap* for 1.9 refactor - replaces fetchItemByIdentity */
        get: function (id) {
			var listOrDeferred = this.loadData();

			return when(listOrDeferred, function (list) {
		        for (var n = 0; n < list.length; n++) {
			        if (list[n].id == id) {
				        return list[n];
			        }
		        }

		        return null;
	        });
        },

        /* *dap* DEPRECATED */
        fetchItemByIdentity: function (args) {
            when(this.loadData(), function (list) {
                for (var n = 0; n < list.length; n++) {
                    if (list[n].id == args.identity) {
                        args.onItem(list[n]);
                    }
                };
            });
        },

        /* Added by *dap* for 1.9 refactor - replaces fetchItems - stolen/modified from DataStore.js */
        query: function (query, options) {
        // summary:
        //		Queries the store for objects.
        // query: Object
        //		The query to use for retrieving objects from the store
        // options: Object?
        //		Optional options object as used by the underlying dojo.data Store.
        // returns: dojo/store/api/Store.QueryResults
        //		A query results object that can be used to iterate over results.
        var fetchHandle;
        var deferred = new Deferred(function () { fetchHandle.abort && fetchHandle.abort(); });
        deferred.total = new Deferred();
        fetchHandle = this.fetch(lang.mixin({
                query: query,
            onBegin: function (count) {
                    deferred.total.resolve(count);
                },
            onComplete: function (results) {
                    deferred.resolve(results);
                },
            onError: function (error) {
                    deferred.reject(error);
                },
                options: options
            }));
        return deferred;
        },

        _fetchItems: function (args, findCallback, errorCallback) {
            if (!args.query) {
                args.query = {};
            };

            if (args.query.id == undefined) {
                args.query.id = "*";
            };

            if (args.query.text == undefined) {
                args.query.text = "*";
            };

            if (!args.queryOptions) {
                args.queryOptions = {};
            };

            var isRegex = function (x) {
                return x && typeof x == 'object' && typeof x.test == 'function';
            };

            when(this.loadData(), function (list) {

                if (args.query.id == "*" && args.query.text == "*") {
                    findCallback(list, args);
                }
                else {
                    var items = [];
                    var reId = isRegex(args.query.id) ? args.query.id : filter.patternToRegExp(args.query.id, args.queryOptions.ignoreCase);
                    var reText = isRegex(args.query.text) ? args.query.text : filter.patternToRegExp(args.query.text, args.queryOptions.ignoreCase);
                    for (var n = 0; n < list.length; n++) {
                        if (reId.test(list[n].id) && reText.test(list[n].text)) {
                            items.push(list[n]);
                        }
                    };
                    findCallback(items, args);
                }
            });
        }

    });

    lang.extend(SettingsEnumStore, simpleFetch);

	return SettingsEnumStore;
});