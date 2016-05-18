define([
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/_base/window",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
	"dojo/keys",
    "dojo/NodeList-traverse",
    "dojo/on",
    "dojo/topic",
    "qc/_core"
], function (registry, array, declare, event, lang, window, domClass, domConstruct, domStyle, keys, NodeListTraverse, on, topic, core) {
    return declare("qc.DndManager", [], {
        selectBeforeDrag: false,
    
            isDragging: false,
            avatar: null,
            avatarIcon: null,
            avatarText: null,
            iconClass: null,
            container: null,
            px: 0,
            py: 0,
            source: null,
            minOffset: 3,
            events: null,
            ax: 8,
            ay: 28,
    
    
            startup: function () {
                if (!this.container) {
                    this.container = document.body;
                }
    
                on(window.doc, "dragstart", event.stop);
	            on(window.doc, "selectstart", lang.hitch(this, this.onSelectStart));
    
	            if (core.settings.features.touchPad) {
	                on(this.container, "touchstart", lang.hitch(this, this.onTouchStart));
	                on(this.container, "touchmove", lang.hitch(this, this.onTouchMove));
	                on(this.container, "touchend", lang.hitch(this, this.onTouchEnd));
	            }
	            else {
	                on(this.container, "mousedown", lang.hitch(this, this.onMouseDown));
	                on(this.container, "mousemove", lang.hitch(this, this.onMouseMove));
	                on(this.container, "mouseup", lang.hitch(this, this.onMouseUp));
	            };
    
                topic.subscribe('/qc/InvokeDnd', lang.hitch(this, this.invokeDnd));
                topic.subscribe('/qc/CancelDnd', lang.hitch(this, this.cancel));
                this.createAvatar('', 'noDrop');
    
                if (core.settings.features.touchPad) {
                    this.ax = 16;
                    this.ay = 56;
                }
                else {
                    this.ax = 8;
                    this.ay = 28;
                }
            },
    
            onSelectStart: function (evt) {
                var cancel = true;
    
                if (evt.target) {
                    var targetNode = evt.target.nodeType === 3 ? evt.target.parentNode : evt.target;
                    if (core.ancestorNodeByClass(targetNode, 'freeText', true)) {
                        cancel = false;
                    }
                    else if (targetNode.getAttribute('contentEditable')) {
                        cancel = false;
                    }
                    else {
                        var tagName = targetNode ? targetNode.tagName.toLowerCase() : '';
                        switch (tagName) {
                            case 'textarea':
                                cancel = false;
                                break;
                            case 'input':
                                cancel = false;
                                break;
                            default:
                                break;
                        }
                    };
                };
    
                if (cancel) {
                    event.stop(evt);
                };
            },
    
            invokeDnd: function (source, x, y) {
                if (this.isDragging) {
                    this.cancel();
                };
    
                this.px = x;
                this.py = y;
                this.isDragging = true;
                this.showAvatar(x - this.ax, y - this.ay, 'noDrop', source.text);
                this.source = source;
                this.events = [
                    on(window.doc, "keyup", lang.hitch(this, this.onKeyUp)),
                    on(window.doc, "selectstart", event.stop)
                ];
            }, 
            
            setPosition: function (node, x, y) {
                domStyle.set(node, { left: x + "px", top: y + "px" });
            },
    
            isBeyondOffset: function (x1, y1, x2, y2, offset) {
                return (Math.abs(x1 - x2) >= offset) || (Math.abs(y1 - y2) >= offset);
            },
    
            cancel: function () {
                this.px = 0;
                this.py = 0;
                this.source = null;
                this.isDragging = false;
                this.hideAvatar();
                array.forEach(this.events, core.disconnect);
            },
    
            createAvatar: function (text, icon) {
                this.avatar = domConstruct.create("div");
                domClass.add(this.avatar, "qcddAvatar");
                domClass.add(this.avatar, "ic16");
                core.setSelectable(this.avatar, false);
                this.iconClass = icon || this.iconClassFromAction("noDrop");
                this.avatarIcon = domConstruct.create("div");
                domClass.add(this.avatarIcon, "icon");
                domClass.add(this.avatarIcon, this.iconClass);
                domConstruct.place(this.avatarIcon, this.avatar);
    
                this.avatarText = domConstruct.create("div");
                domClass.add(this.avatarText, "text");
                this.avatarText.innerHTML = text || '';
                domConstruct.place(this.avatarText, this.avatar);
    
                domConstruct.place(this.avatar, this.container);
                return this.avatar;
            },
    
            showAvatar: function (x, y, icon, text) {
                var action = icon ? (icon.action || icon) : 'noDrop';
                var iconClass = this.iconClassFromAction(action);
                if (iconClass != this.iconClass) {
                    if (this.iconClass) {
                        domClass.remove(this.avatarIcon, this.iconClass);
                    };
                    domClass.add(this.avatarIcon, iconClass);
                    this.iconClass = iconClass;
                };
    
                if (text) {
                    //this.avatarText.innerHTML = text.replace("<br/>", " ").replace("<br>", " ");
                    this.avatarText.innerHTML = text.replace(/\<[a-z\/]+\>/gi, ' ');
                };
    
                domStyle.set(this.avatar, { visibility: "visible", left: x + "px", top: y + "px" });
            },
    
            hideAvatar: function () {
                domStyle.set(this.avatar, { visibility: "hidden" });
            },
    
    
            iconClassFromAction: function (action) {
                switch (action) {
                    case 'default':
                    case 'move':
                    case 'insert':
                        return 'arrow_down_green';
                    case 'copy':
                    case 'add':
                        return 'add';
                    case 'delete':
                        return 'delete';
                    case 'none':
                    case 'noDrop':
                        return 'sign_forbidden';
                    case 'prompt':
                        return 'view';
                    case 'insertText':
                        return 'font';
                    default:
                        return 'arrow_down_green';
                }
            },
    
            getDropInfo: function (evt) {
                if (!(evt && evt.target && this.source)) {
                    return null;
                };
    
                if (core.ancestorNodeByClass(evt.target, 'sealed', true)) {
                    return null;
                };
    
                var target = core.ancestorWidgetByClass(evt.target, 'qcddTarget', true);
                if (!target) {
                    return null;
                };
    
                if (!target.getDropAction) {
                    return null;
                };
    
                var action = target.getDropAction(this.source, evt);
                if (!action) {
                    return null;
                };
    
                return { target: target, action: action };
            },
    
            onMouseDown: function (evt) {
                if (this.isDragging) {
                    this.cancel();
                }
                else {
                    this.source = this.getSource(evt);
                    this.px = evt.clientX;
                    this.py = evt.clientY;
                };
            },
    
            onMouseUp: function (evt) {
                this.hideAvatar();
                if (this.isDragging) {
                    this.isDragging = false;
                    if (evt && evt.target && this.source) {
                        event.stop(evt);
                        var info = this.getDropInfo(evt);
                        if (info) {
                            var res = info.target.doDrop(this.source, evt);
                            topic.publish("/qc/DragDropComplete");
                            if (res && res.node) {
                                res.node.focus();
                            }
                        }
                    };
                }
                this.cancel();
            },
    
            onMouseMove: function (evt) {
                if (this.px == 0) {
                    return;
                }
    
                if (this.isDragging) {
                    event.stop(evt);
                    var info = this.getDropInfo(evt);
                    this.showAvatar(evt.pageX - this.ax, evt.pageY - this.ay, info);
                }
                else {
                    if (this.source && this.isBeyondOffset(this.px, this.py, evt.clientX, evt.clientY, this.minOffset)) {
                        event.stop(evt);
                        this.isDragging = true;
                        this.showAvatar(evt.pageX - this.ax, evt.pageY - this.ay, 'noDrop', this.source.text);
                        this.events = [
                            on(window.doc, "keyup", lang.hitch(this, this.onKeyUp)),
                            on(window.doc, "selectstart", event.stop)
                        ];
                    }
                };
            }, 
            
            getSource: function (evt) {
                var node = evt ? evt.target : null;
    
                if (!node) {
                    return null;
                };
    
                if (core.ancestorNodeByClass(node, 'qcddPrevent', true)) {
                    return null;
                };
    
                var sourceNode = core.ancestorNodeByClass(node, 'qcddSource', true);
                if (!sourceNode) {
                    return null;
                };
    
                var sourceWidget = registry.byNode(sourceNode);
                if (!(sourceWidget && sourceWidget.getItem)) {
                    return null;
                };
    
                if (this.selectBeforeDrag && !domClass.contains(sourceNode, 'selected')) {
                    return null;
                };
    
                var sourceItem = sourceWidget.getItem(node);
                if (!sourceItem) {
                    return null;
                };
    
                if (!sourceItem.sourceOwner) {
                    sourceItem.sourceOwner = sourceWidget;
                };
    
                return sourceItem;
            },
    
            onKeyUp: function (evt) {
                if (this.isDragging && evt.keyCode == keys.ESCAPE) {
                    this.cancel();
                }
            },
    
            toMouseEvent: function (e) {
                if (e.touches && e.touches.length == 1) {
                    return e.touches[0];
                }
                else {
                    return null;
                };
            },
    
            onTouchStart: function (e) {
                if (this.isDragging) {
                    this.cancel();
                }
                else {
                    var evt = this.toMouseEvent(e);
                    if (evt) {
                        this.source = this.getSource(evt);
                        this.px = evt.clientX;
                        this.py = evt.clientY;
                    };
                };
            },
    
            onTouchMove: function (e) {
                if (this.px == 0) {
                    return;
                };
    
                var evt = this.toMouseEvent(e);
                if (!evt) {
                    if (this.isDragging) {
                        this.cancel();
                    };
                    return;
                };
    
                if (this.isDragging) {
                    event.stop(e);
                    this.px = evt.clientX;
                    this.py = evt.clientY;
                    var targetNode = document.elementFromPoint(this.px, this.py);
                    var xevt = { target: targetNode, clientX: this.px, clientY: this.py };
                    var info = this.getDropInfo(xevt);
                    this.showAvatar(evt.pageX - this.ax, evt.pageY - this.ay, info);
                }
                else {
                    if (this.source && this.isBeyondOffset(this.px, this.py, evt.clientX, evt.clientY, this.minOffset)) {
                        event.stop(e);
                        this.isDragging = true;
                        this.showAvatar(evt.pageX - this.ax, evt.pageY - this.ay, 'noDrop', this.source.text);
                        this.events = [
                            on(window.doc, "dragstart", event.stop),
                            on(window.doc, "selectstart", event.stop)
                        ];
                    }
                };
            },
    
            onTouchEnd: function (e) {
                if (this.isDragging && this.source) {
                    var targetNode = document.elementFromPoint(this.px, this.py);
                    var evt = { target: targetNode, clientX: this.px, clientY: this.py };
                    var info = this.getDropInfo(evt);
                    if (info) {
                        var res = info.target.doDrop(this.source, evt);
                        topic.publish("/qc/DragDropComplete");
                        if (res && res.node) {
                            res.node.focus();
                        }
                    }
                };
                this.cancel();
            }
    
        }
    );
});