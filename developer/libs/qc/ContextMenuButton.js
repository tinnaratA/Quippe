define([
    "qc/MenuItem",
    "dijit/form/DropDownButton",
    "dijit/Menu",
    "dijit/MenuSeparator",
    "dijit/popup",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/query",
    "dojo/topic",
    "qc/_core"
], function (MenuItem, DropDownButton, Menu, MenuSeparator, popup, registry, array, declare, lang, domClass, query, topic, core) {
    return declare("qc.ContextMenuButton", [DropDownButton], {
        label: 'Actions',
        iconClass: 'form_blue',
        editor: null,
        disabled: true,
        menu: null,

        startup: function () {
            if (!this._started) {
                topic.subscribe('/noteEditor/SelectionChanged', lang.hitch(this, this.onSelectionChanged));
                topic.subscribe('/qc/WorkspaceReset', lang.hitch(this, this.onWorkspaceReset));
                this.menu = new Menu();
                domClass.add(this.menu.domNode, 'ic16');
                this.menu.startup();
                this.set('dropDown', this.menu);
                this.inherited(arguments);
            };
        },

        onWorkspaceReset: function () {
            this.editor = query('.qcNoteEditor').map(registry.byNode)[0] || null;
        },

        onSelectionChanged: function () {
            if (this.hSel) {
                clearTimeout(this.hSel);
                this.hSel = null;
            };

            this.hSel = setTimeout(lang.hitch(this, this._onSelectionChanged), 250);
        },

        _onSelectionChanged: function () {
            if (!this.editor) {
                return this.disableMenu();
            };

            var widget = this.editor.getSelection();
            if (!widget) {
                return this.disableMenu();
            };

            var info = core.app.contextMenu.getMenuInfo(widget.domNode);
            if (!info || !info.actions || info.actions.length == 0) {
                return this.disableMenu();
            };

            this.createMenu(info.item, info.actions);
            this.set('disabled', false);

        },

        clearMenu: function () {
            array.forEach(this.menu.getChildren(), function (child) { child.destroyRecursive() });
        },

        disableMenu: function () {
            this.set('disabled', true);
            return false;
        },

        createMenu: function (item, actions) {
            this.clearMenu();
            for (var n = 0; n < actions.length; n++) {
                var mi = this.createMenuItem(actions[n], item);
                if (mi) {
                    if (actions[n].beginGroup) {
                        this.menu.addChild(new MenuSeparator());
                    }
                    this.menu.addChild(mi);
                }
            };

            return this.menu;
        },

        createMenuItem: function (action, defaultTopicItem) {
            if (!action) {
                return null;
            };

            if (action.menuItem) {
                return action.menuItem;
            };

            var label = action.label || core.getI18n("menuitem");
            var icon = action.icon || '';

            var clickHandler = action.onClick || null;
            if (!clickHandler) {
                var publishItem = action.item || defaultTopicItem;
                var publishTopic = action.topic || '/qc/NotImplemented';

                if (!(publishItem instanceof Array)) {
                	clickHandler = lang.hitch(this, function (evt) {
                		topic.publish(publishTopic, publishItem);
                	});
                }

                else {
                	publishItem.unshift(publishTopic);
                	clickHandler = lang.hitch(this, function (evt) {
                		topic.publish.apply(this, publishItem);
                	});
                }
            };

            var self = this;

            var mi = new MenuItem({
                label: label,
                iconClass: icon,
                onClick: function () {
                    popup.close(self);
                    clickHandler();
                }
            });

            return mi;
        }
    });
});