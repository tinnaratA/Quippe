define([
    "qc/StringUtil",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "qc/_core"
], function (StringUtil, _TemplatedMixin, _WidgetBase, array, declare, domClass, domConstruct, query, core) {
    return declare("qc.OptionList", [_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="qcOptionList" data-dojo-attach-event="click:_onClick"></div>',

        addItem: function (item) {
            var itemNode = domConstruct.create('div');
            domClass.add(itemNode, 'option');
            itemNode.data = item;
            itemNode.innerHTML = '<div class="icon"></div><div class="label">' + (item.text || item.id || '') + '</div>';
            if (item.selected) {
                this.selectItem(item.id);
            };
            domConstruct.place(itemNode, this.domNode);
        },

        loadList: function (list) {
            this.clear();

            if (typeof list == 'string') {
                list = StringUtil.parseCodedList(list);
            };

            array.forEach(core.forceArray(list), function (item) { this.addItem(item) }, this);
        },

        selectItem: function (id) {
            query('.option', this.domNode).forEach(function (itemNode) {
                if (itemNode.data.id == id) {
                    domClass.add(itemNode, 'selected');
                }
                else {
                    domClass.remove(itemNode, 'selected');
                }
            });
            this.onSelectedItemChanged();
        },

        getSelectedItem: function () {
            return query('.selected', this.domNode).map(function (selectedNode) {
                return selectedNode.data;
            })[0] || null;
        },

        clear: function () {
            domConstruct.empty(this.domNode);
        },

        onSelectedItemChanged: function () { },

        _onClick: function (evt) {
            var optionNode = core.ancestorNodeByClass(evt.target, 'option', true);
            if (optionNode && !domClass.contains(optionNode, 'selected')) {
                query('.selected', this.domNode).removeClass('selected');
                domClass.add(optionNode, 'selected');
                this.onSelectedItemChanged();
            };
        }
    });
});