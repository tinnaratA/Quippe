define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "qc/StringUtil",
    "qc/XmlUtil"
], function (array, declare, StringUtil, XmlUtil) {
    return declare("qc.design.OptionListManagerMixin", [], {
        optionLists: null,
    
        constructor: function () {
            this.optionLists = {};
        },
    
        parseOptionLists: function (parentNode) {
            this.optionLists = {};
            var xOptionLists = XmlUtil.selectChildElement(parentNode, 'OptionLists');
            if (xOptionLists) {
                array.forEach(XmlUtil.selectChildElements(xOptionLists), function (xList) {
                    var name = xList.getAttribute('Name');
                    if (name) {
                        var listType = xList.getAttribute('ListType') || 'text';
                        var list = [];
                        array.forEach(XmlUtil.selectChildElements(xList), function (xListItem) {
                            var item = XmlUtil.elementToObject(xListItem);
                            if (!item.id && item.medcinId) {
                                item.id = item.medcinId;
                            };
                            list.push(item);
                        }, this);
                        this.optionLists[name] = { name: name, listType: listType, list: list };
                    };
                }, this);
            };
        },
    
        writeOptionLists: function (writer, mode) {
            if (!this.optionLists) {
                return;
            };
            var started = false;
            var list = null;
            var name = '';
            var n = 0;
            for (name in this.optionLists) {
                list = this.optionLists[name].list;
                if (list && list.length > 0) {
                    if (!started) {
                        writer.beginElement('OptionLists');
                        started = true;
                    };
                    writer.beginElement('OptionList');
                    writer.attribute('Name', name);
                    writer.attribute('ListType', this.optionLists[name].listType || '', '');
                    for (n = 0; n < list.length; n++) {
                        writer.writeObject('Item', list[n]);
                    };
                    writer.endElement();
                };
            };
            if (started) {
                writer.endElement();
            };
        },
    
        getOptionList: function (name) {
            return this.optionLists[name] ? this.optionLists[name].list || [] : [];
        },
    
        getOptionListNames: function (typeFilter) {
            var list = [];
            for (var name in this.optionLists) {
                if (!typeFilter || typeFilter == this.optionLists[name].listType) {
                    list.push(name);
                };
            };
            return list;
        },
    
        getListItem: function (listName, id) {
            var list = this.getOptionList(listName);
            if (list) {
                return array.filter(list, function (item) { return item.id == id })[0] || null;
            };
        },
    
        getItemId: function (listName, text) {
            var list = this.getOptionList(listName);
            if (list) {
                return array.filter(list, function (item) { return StringUtil.compare(text, item.text, true) })[0] || null;
            };
        },
    
        getItemText: function (listName, id) {
            var item = this.getListItem(listName, id);
            return item ? item.text || '' : '';
        }
    
    
    });
});