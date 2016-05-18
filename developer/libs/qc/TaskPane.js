define([
    "dojo/_base/declare",
    "qc/taskbar/TaskPane"
], function (declare, TaskPane) {
    return declare("qc.TaskPane", [TaskPane], {});
});

/*
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
    return declare("qc.TaskPane", [TitlePane], {
        menuIcon: null,
            menuItems: null,
            menu: null,
            actionButton: null,
    
            name: '',
            enabled: false,
            modes: ['standard'],
    
            startup: function () {
                if (!this._started) {
                    topic.publish("/qc/taskPaneOpen", this, 0);
                    domClass.add(this.domNode, "qcTaskPane");
                    domClass.add(this.domNode, "ic16");
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
            }
        }
    );
});
*/