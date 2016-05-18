define([
    "qc/MenuItem",
    "dijit/Menu",
    "dijit/MenuSeparator",
    "dijit/popup",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/_base/window",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/on",
    "dojo/topic",
    "qc/_core"
], function (qcMenuItem, Menu, MenuSeparator, popup, registry, array, declare, event, lang, window, domClass, domStyle, on, topic, core) {
    return declare("qc.ContextMenu", [Menu], {

        item: null,
        currentNode: null,
        pointerDownEvent: 0,

        startup: function () {
            if (!this._started) {
                on(window.doc, "contextmenu", lang.hitch(this, this.onContextMenu));
                if (window.PointerEvent) {
                    on(window.doc, "pointerdown", lang.hitch(this, this.onMSPointerDown));
                    on(window.doc, "pointerup", lang.hitch(this, this.onMSPointerUp));
                }
                else if (window.MSPointerEvent) {
                    on(window.doc, "mspointerdown", lang.hitch(this, this.onMSPointerDown));
                    on(window.doc, "mspointerup", lang.hitch(this, this.onMSPointerUp));
                }
                else {
                    on(window.doc, "mouseup", lang.hitch(this, this.onDocumentMouseUp));
                };
                domClass.add(this.domNode, "ic16");

                topic.subscribe('/qc/invokeContextMenu', lang.hitch(this, this.invokeMenu));
                topic.subscribe('/qc/invokeDefaultContextAction', lang.hitch(this, this.invokeDefaultAction));
                this.inherited(arguments);
            }
        },

        onContextMenu: function (evt) {
            event.stop(evt);
        },

        //        onContextMenu: function (evt) {
        //            var info = this.getMenuInfo(evt.target);
        //            if (info) {
        //                event.stop(evt);
        //                this.createMenu(info.item, info.target, info.actions);
        //                this.showMenu(info, evt.target);
        //            }
        //        },

        onMSPointerDown: function (evt) {
            this.pointerDownEvent = evt;
        },

        onMSPointerUp: function (evt) {
            if (evt.button == 2) {
                event.stop(evt);
                this.invokeMenu(evt.target);
            }
            else if (this.pointerDownEvent && evt.pointerType < 4 && evt.target == this.pointerDownEvent.target && (evt.hwTimestamp - this.pointerDownEvent.hwTimestamp) >= 1000) {
                event.stop(evt);
                this.invokeMenu(evt.target);
            };
        },

        invokeMenu: function (targetNode) {
            var info = this.getMenuInfo(targetNode);
            if (info) {
                this.createMenu(info.item, info.target, info.actions);
                this.showMenu(info, targetNode);
            }
        },

        invokeDefaultAction: function (targetNode) {
            var info = this.getMenuInfo(targetNode);
            if (info) {
                var handled = false;
                array.forEach(info.actions, function (action) {
                    if (!handled && action.isDefault) {
                        topic.publish(action.topic, info.item);
                        handled = true;
                    }
                });
                if (!handled) {
                    this.createMenu(info.item, info.target, info.actions);
                    this.showMenu(info, targetNode);
                }
            };
        },

        getMenuInfo: function (targetNode, menuContainer) {
            if (!targetNode) {
                return;
            };

            var widget = null;
            var item = null;
            var actions = null;
            var actionList = [];

            if (core.ancestorNodeByClass(targetNode, 'qcContextMenuPrevent', true)) {
                return null;
            };

            if (core.ancestorNodeByClass(targetNode, 'disabled', true)) {
                return null;
            };

            menuContainer = menuContainer || core.ancestorWidgetByClass(targetNode, 'qcContextMenuContainer', true) || core.app;

            if (menuContainer) {
                widget = registry.getEnclosingWidget(targetNode);
                if (widget && core.isFunction(widget.getItem)) {
                    item = widget.getItem(targetNode);
                };
                actions = menuContainer.getContextActions(item, widget, targetNode);
                if (actions) {
                    if (actions instanceof Array) {
                        actionList = actions;
                    }
                    else {
                        if (actions.deferToParent) {
                            actions.deferTo = core.ancestorWidgetByClass(menuContainer.domNode, 'qcContextMenuContainer', false);
                        };
                        if (actions.deferTo) {
                            var info = this.getMenuInfo(targetNode, actions.deferTo) || { actions: [] };
                            actionList = (actions.mergeBefore || []).concat(info.actions || [], actions.mergeAfter || []);
                        };
                    }
                };
            };

            if (actionList && actionList.length > 0) {
                return { item: item, actions: actionList, target: targetNode };
            };


        },

        onDocumentMouseUp: function (evt) {
            if (evt.button === 2) {
                event.stop(evt);
                this.invokeMenu(evt.target);
            };
        },

        clearMenu: function () {
            popup.close(this);
            if (this.currentNode) {
                this.unBindDomNode(this.currentNode);
                this.currentNode = null;
            };
            this._cleanUp();
            array.forEach(this.getChildren(), function (child) { child.destroyRecursive() });
        },

        createMenu: function (item, domNode, actions) {
            this.clearMenu();

            this.currentNode = domNode;
            this.bindDomNode(domNode);

            var defaultItems = [item];

            for (var n = 0; n < actions.length; n++) {
                var mi = this.createMenuItem(actions[n], item);
                if (mi) {
                    if (actions[n].beginGroup) {
                        this.addChild(new MenuSeparator());
                    }
                    this.addChild(mi);
                }
            };
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
		            clickHandler = lang.hitch(this, function(evt) {
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

            var mi = new qcMenuItem({
                label: label,
                iconClass: icon,
                onClick: function () {
                    popup.close(self);
                    clickHandler();
                }
            });

            if (action.isDefault) {
                domStyle.set(mi.domNode, { fontWeight: 'bold' });
            };

            if (action.disabled) {
                mi.set('disabled', true);
            };

            return mi;
        },

        showMenu: function (menuInfo, targetNode) {
            topic.publish('/qc/OnContextMenu', menuInfo);

            if (!menuInfo || !targetNode) {
                return;
            };

            var w = registry.getEnclosingWidget(menuInfo.target);
            if (w && domClass.contains(w.domNode, 'noteElement') && !domClass.contains(w.domNode, 'selected')) {
                var editor = core.ancestorWidgetByClass(w, 'qcNoteEditor');
                if (editor) {
                    editor.select(w);
                };
            };

            if (core.settings.features.touchPad) {
                if (this.currentPopup) {
                    this._stopPendingCloseTimer(this.currentPopup);
                    popup.close(this.currentPopup);
                };
                this._openMyself({ target: targetNode });
            }
            else {


                // 1.9 refactor - *dap*
                // this._openPopup();
                // note that (at least for the popups from the note) this doesn't actually popup the context menu - that's
                // done by a timer in _MenuBase.js that gets initialized in the call to this.bindDomNode in createMenu, above


                var from_item = this.focusedChild;
                if (from_item) {
                    this._openItemPopup(from_item);
                } 

          
            };
        }
    }
    );
});