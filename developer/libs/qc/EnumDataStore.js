define([
    "qc/_EnumManager",
    "dojo/_base/declare",
    "dojo/data/util/filter",
    "dojo/data/util/simpleFetch",
    "dojo/when"
], function (_EnumManager, declare, filter, simpleFetch, when) {

    var decl = declare("qc.EnumDataStore", [], {
        listPath: null,
        allowEmpty: false,

        constructor: function (listPath, allowEmpty) {
            this.listPath = listPath;
            this.allowEmpty = allowEmpty;
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
            return item.description;
        },

        getIdentity: function (item) {
            return item.code;
        },

        // Not sure I need this right now since I'm wrapping this store (which is based on dojo/data) in a dojo/store/DataStore, which adapts dojo/data data stores into dojo/store object stores
        ///* Added by *dap* for 1.9 refactor */
        //get: function (args) {
        //    if (args.identity === '-empty-') {
        //        args.onItem({ code: '-empty-', description: '' });
        //    }
        //    else {
        //        when(EnumManager.getText(this.listPath, args.identity), function (value) {
        //            args.onItem({ code: args.identity, description: value });
        //        });
        //    }
        //},

        /* Added by *dap* for 1.9 refactor - needed for dojo/store/DataStore */
        getAttributes: function() {
            return ["code", "description"];
        },

        getValues: function(item, attribute){
            return item[attribute];
        },

        /* End added by *dap* for 1.9 refactor - needed for dojo/store/DataStore */

        
        fetchItemByIdentity: function (args) {
            if (!args.identity || args.identity === '-empty-') {
                args.onItem({ code: '', description: '' });
            }
            else {
                when(_EnumManager.getText(this.listPath, args.identity), function (value) {
                    args.onItem({ code: args.identity, description: value });
                });
            }
        },

        _fetchItems: function (args, findCallback, errorCallback) {
            var self = this;
            if (!args.query) {
                args.query = {};
            };

            if (args.query.code == undefined) {
                args.query.code = "*";
            };

            if (args.query.description == undefined) {
                args.query.description = "*";
            };

            if (!args.queryOptions) {
                args.queryOptions = {};
            };

            // 1.9 refactor - *dap* apparently the dojo/store/DataStore wrapper sometimes passes in strings or undefined and sometimes regexp
            //var reCode = filter.patternToRegExp(args.query.code, args.queryOptions.ignoreCase);
            //var reDesc = filter.patternToRegExp(args.query.description, args.queryOptions.ignoreCase);

            var reCode = typeof args.query.code == "string" ? filter.patternToRegExp(args.query.code, args.queryOptions.ignoreCase) : args.query.code;
            var reDesc = typeof args.query.description == "string" ? filter.patternToRegExp(args.query.description, args.queryOptions.ignoreCase) : args.query.description;

            when(_EnumManager.getList(this.listPath), function (list) {
                var items = [];

                if (self.allowEmpty) {
                    var blankItem = { code: '', description: '' };
                    if (reCode.test(blankItem.code) && reDesc.test(blankItem.description)) {
                        items.push(blankItem);
                    };
                }

                for (var p in list) {
                    if (reCode.test(p) && reDesc.test(list[p].description)) {
                        items.push({ code: p, description: list[p].description });
                    }
                };

                findCallback(items, args);
            });
        }

    }
    );

    decl.extend(simpleFetch);

    return decl;
});