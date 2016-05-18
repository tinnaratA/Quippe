define([
    "qc/_core",
    "dojo/_base/array",
	"dojo/_base/lang",
    "dojo/request",
    "dojo/when",
    "qc/StringUtil"
], function(core, array, lang, request, when, StringUtil) {

    core.EnumManager = {

        data: {},

        loadLists: function (listNames, culture, capitalization, itemCallback) {
            var self = this;
            culture = culture || core.settings.culture || 'en-US';

            if (!this.data[culture]) {
                this.data[culture] = {};
            };

            var listsNeeded = array.filter(listNames, function (x) { return !self.data[culture][x] });

            if (listsNeeded.length == 0) {
                return true;
            };

            if (!itemCallback) {
                itemCallback = function (listName, item) {
                    var listItem = {
                        code: item.code,
                        description: item.description ? StringUtil.capitalize(item.description, capitalization) : item.code
                    };
                    if (item.flags) {
                        listItem.flags = item.flags;
                    };
                    return listItem;
                };
            };

            var def = request.get(core.serviceURL('Quippe/Enum/EnumSet'), {
                query: { "Enums": listsNeeded.join(','), "DataFormat": "JSON", "Culture": culture },
                handleAs: 'json'
            }).then(function (data, ioArgs) {
                array.forEach(data.enums, function (enumList) {
                    var list = {};
                    var listName = enumList.name;
                    array.forEach(enumList.item, function (item) {
                        list[item.code] = itemCallback(listName, item);
                    });
                    self.data[culture][listName] = list;
                });
            }, core.showError);

            return def;
        },

        loadList: function (name, path, culture, capitalization, orderBy, itemCallback) {
            name = name.toLowerCase();
            culture = culture || core.settings.culture || 'en-US';

            if (!this.data[culture]) {
                this.data[culture] = {};
            };

            var list = this.data[culture][name]
            if (list) {
                return list;
            }

            var parms = {
                'DataFormat': 'JSON',
                'Culture': culture
            };

            if (capitalization) {
                parms['Capitalization'] = capitalization;
            };

            if (orderBy) {
                parms['OrderBy'] = orderBy;
            };

            if (!itemCallback) {
                itemCallback = function (item) {
                    if (!item.description) {
                        item.description = item.code;
                    };
                    return item;
                };
            };

            var self = this;

            list = request(core.serviceURL(path), {
                query: parms,
                handleAs: 'json'
            }).then(function (data) {
                var list = {};
                if (data && data['enum']) {
                    array.forEach(core.forceArray(data['enum'].item), function (item) {
                        list[item.code] = itemCallback(item);
                    });
                    self.data[culture][name] = list;
                };
                return list;
            }, function (err) { core.showError(err) });

            self.data[culture][name] = list;
            return list;
        },

        getList: function (nameOrPath) {
            if (!nameOrPath || nameOrPath === '-empty-') {
                return null;
            };

            return this.loadList(nameOrPath, nameOrPath, core.settings.culture, null, null, null);
        },

        getListArray: function (name) {
            return when(this.getList(name), function (listObject) {
                var list = [];
                for (var id in listObject) {
                    list.push({ id: id, text: listObject[id] ? listObject[id].description || '' : '' });
                };
                return list;
            });
        },

        addList: function (name, culture, list) {
            name = name.toLowerCase();
            culture = culture || core.settings.culture;
            if (!this.data[culture]) {
                this.data[culture] = {};
            };
            this.data[culture][name] = list;
            return list;
        },

        getText: function (listName, code) {
            return when(this.getList(listName), function (list) { return list[code] ? (list[code].description || code) : "" });
        },

        getTextSynch: function (listName, code, culture) {
            var item = this.getItemSynch(listName, code, culture);
            return item ? item.description : '';
        },

        getItemSynch: function (listName, code, culture) {
            listName = listName.toLowerCase();
            if (this.data) {
                var c = culture || core.settings.culture || "en-US";
                if (this.data[c]) {
                    if (this.data[c][listName]) {
                        if (this.data[c][listName][code]) {
                            return this.data[c][listName][code];
                        }
                    }
                }
            };
            return null;
        }

    };

    lang.setObject("qc.EnumManager", core.EnumManager);

    return core.EnumManager;
}
);