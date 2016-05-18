define([
    "qc/TaskPaneActionButton",
    "dijit/form/_FormWidget",
    "dijit/form/DropDownButton",
    "dijit/layout/ContentPane",
    "dijit/Menu",
    "dijit/TitlePane",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/topic"
], function (TaskPaneActionButton, _FormWidget, DropDownButton, ContentPane, Menu, TitlePane, declare, domClass, domConstruct, domStyle, topic) {
    return declare("qc.taskbar.TaskPane", [TitlePane], {
        menuIcon: null,
        menuItems: null,
        menu: null,
        actionButton: null,

        name: '',
        enabled: false,
        visible: true,
        modes: ['standard'],
        group: '',
        description: '',
        maxHeight: 0,
        closeOnEmpty: true,

        showInShortList: true,

        startup: function () {
            if (!this._started) {
                topic.publish("/qc/taskPaneOpen", this, 0);
                domClass.add(this.domNode, "qcTaskPane");
                domClass.add(this.domNode, "ic16");
                domClass.add(this.domNode, "qcddSource");
                if (this.menuItems) {
                    this.setMenu(this.menuItems, this.menuIcon);
                };
                this.inherited(arguments);
            };
        },

        _getNameAttr: function () {
            return this.name || this.get('title') || this.id;
        },

        _setNameAttr: function (value) {
            this.name = value;
        },

        _getMaxHeightAttr: function() {
            return domStyle.get(this.containerNode, 'maxHeight');
        },
        _setMaxHeightAttr: function(value) {
            if (value > 0) {
                domStyle.set(this.containerNode, { maxHeight: value + 'px', overflow: 'auto' });
            };
        },

        _getEnabledAttr: function () {
            return this.enabled;
        },

        _setEnabledAttr: function (value) {
            if (value) {
                this.enabled = true;
                domStyle.set(this.domNode, 'display', 'block');
                this._onEnabled();
            }
            else {
                this.enabled = false;
                domStyle.set(this.domNode, 'display', 'none');
                this._onDisabled();
            }
        },

        _getCollapsibleAttr: function () {
            return this.get('toggleable');
        },
        _setCollapsibleAttr: function (value) {
            this.set('toggleable', value);
        },

        _getNoTitleAttr: function () {
            return domClass.contains(this.domNode, 'noTitle');
        },
        _setNoTitleAttr: function (value) {
            if (value) {
                domClass.add(this.domNode, 'noTitle');
            }
            else {
                domClass.remove(this.domNode, 'noTitle');
            };
        },

        _getFillAttr: function () {
            return domClass.contains(this.domNode, 'fill');
        },
        _setFillAttr: function (value) {
            if (value) {
                domClass.add(this.domNode, 'fill');
                this.set('open', true);
            }
            else {
                domClass.remove(this.domNode, 'fill');
            };
        },

        _getIsEmptyAttr: function() {
            return domClass.contains(this.domNode, 'empty');
        },
        _setIsEmptyAttr: function(value) {
            if (value) {
                domClass.add(this.domNode, 'empty');
                if (this.closeOnEmpty && !this.get('fill')) {
                    this.set('open', false);
                    this.autoClosed = true;
                };
            }
            else {
                domClass.remove(this.domNode, 'empty');
                if (this.autoClosed) {
                    this.set('open', true);
                    this.autoClosed = false;
                };
            };
        },

        _onEnabled: function () {
        },

        _onDisabled: function () {
        },

        setMenu: function (menuItems, menuIcon) {
            this.menuIcon = menuIcon || "pencil";
            this.menuItems = menuItems;
            this.menu = new Menu();
            for (var n = 0; n < this.menuItems.length; n++) {
                this.menu.addChild(this.menuItems[n]);
            }
            this.menu.startup();
            this.actionButton = new TaskPaneActionButton({ dropDown: this.menu, icon: this.menuIcon });
            domConstruct.place(this.actionButton.domNode, this.titleBarNode, "first");
        },

        addChild: function (child) {
            domConstruct.place(child.domNode, this.containerNode);
        },

        _setOpenAttr: function (open, animate) {
            this.inherited(arguments);
            if (open) {
                topic.publish("/qc/taskPaneOpen", this, 1);
            }
        },

        resize: function () {
            this.inherited(arguments);
            topic.publish("/qc/taskPaneOpen", this, 2);
        },

        _layout: function () {
            this.inherited(arguments);
            topic.publish("/qc/taskPaneOpen", this, 3);
        },

        show: function () {
            domStyle.set(this.domNode, { display: 'block' });
        },

        hide: function () {
            domStyle.set(this.domNode, { display: 'none' });
        },

        getUserSettings: function () {
            return [
                { name: 'title' },
                { name: 'visible', caption: 'Enabled', type: 'boolean' },
                { name: 'showInShortList', caption: 'Show in short list', type: 'boolean' }
            ];
        },

        getItem: function () {
            return { type: 'taskPane', text: this.get('title'), taskPane: this };
        }


    }
    );
});