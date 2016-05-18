define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/_base/array",
	"dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "qc/_core"
], function (declare, _WidgetBase, _TemplatedMixin, array, lang, domClass, domConstruct, on, core) {
    return declare("qc.ListViewItem", [_WidgetBase, _TemplatedMixin], {

        caption: "",
        description: "",
        icon: "",
        toolTip: "",
        subItems: [],
        action: null,
        owner: null,

        templateString: '<tr class="qcListViewItem qcddSource">'
                      + '  <td class="iconCell">'
                      + '    <div data-dojo-attach-point="iconNode" class="icon ${icon}"></div>'
                      + '  </td>'
                      + '  <td class="textCell">'
                      + '    <div class="textContent" data-dojo-attach-point="textContent">'
                      + '      <div class="caption" data-dojo-attach-point="captionNode"></div>'
                      + '    </div>'
                      + '  </td>'
                      + '</tr>',

        startup: function () {
            if (!this._started) {
                if (this.action) {
                    this.actionButton = domConstruct.place('<div class="actionButton"></div>', this.textContent, 'last');
                    domClass.add(this.actionButton, this.action.icon);
                    domClass.add(this.actionButton, "disabled");
                    on(this.actionButton, "click", lang.hitch(this, this.action.onClick));
                    on(this.actionButton, "mouseover", lang.hitch(this, function () { domClass.remove(this, "disabled") }));
                    on(this.actionButton, "mouseout", lang.hitch(this, function () { domClass.remove(this, "disabled") }));
                };
                core.setSelectable(this.domNode, false);
                this.inherited(arguments);
            }
        },

        _setCaptionAttr: function (value) {
            this.captionNode.innerHTML = value;
            this.caption = value;
        },

        _getTextAttr: function() {
            return this.get('caption');
        },
        _setTextAttr: function(value) {
            this.set('caption', value);
        },

        _getDescriptionAttr: function() {
            return this.descriptionNode ? this.descriptionNode.innerHTML : '';
        },
        _setDescriptionAttr: function (value) {
            value = value || '';
            if (value && !this.descriptionNode) {
                this.descriptionNode = domConstruct.place('<div class="description"></div>', this.textContent);
            };
            if (this.descriptionNode) {
                this.descriptionNode.innerHTML = value || '';
            };
        },

        _setIconAttr: function (value) {
            value = value || '';
            if (this.icon) {
                domClass.remove(this.iconNode, this.icon);
            };
            this.icon = value;
            if (this.icon) {
                domClass.add(this.iconNode, this.icon)
            };
        },

        addSubItem: function (value) {
            domConstruct.place('<td class="subItem">' + value + '</td>', this.domNode);
        },

        showLoading: function () {
            domClass.remove(this.iconNode, this.icon);
            domClass.add(this.iconNode, 'loading');
        },

        doneLoading: function () {
            domClass.remove(this.iconNode, 'loading');
            domClass.add(this.iconNode, this.icon);
        },

        getItem: function (node) {
            var item = this.data;
            item.sourceOwner = this.owner;
            return item;
        }

    })
});


