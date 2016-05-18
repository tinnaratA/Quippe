define([
    "dijit/form/Button",
	"dijit/form/DropDownButton",
    "dijit/form/TextBox",
    "dijit/Menu",
    "dijit/MenuBar",
    "dijit/MenuBarItem",
	"dijit/MenuSeparator",
    "dijit/PopupMenuBarItem",
    "dijit/PopupMenuItem",
    "dijit/registry",
    "dijit/Toolbar",
	"dijit/ToolbarSeparator",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    "qc/_core",
    "qc/MenuItem"
], function (Button, DropDownButton, TextBox, Menu, MenuBar, MenuBarItem, MenuSeparator, PopupMenuBarItem, PopupMenuItem, registry, Toolbar, ToolbarSeparator, declare, lang, domClass, on, query, topic, core, MenuItem) {
    var ToolbarBuilder = declare("qc.design.ToolbarBuilder", [], {
        iconSize: 24,
        submenuIconSize: 16,
    
        _buildContainer: function (data, container, containerType, iconSize) {
            data = data || {};
    
            var separatorType = null;
            var popupType = null;
            var toolType = null;
            var containerTypeObject = null;
            var tool = null;
            var popupProperty = ''
            iconSize = iconSize || this.iconSize;
    
            switch (containerType) {
                case 'menubar':
                    toolType = MenuItem;
                    separatorType = MenuSeparator;
                    popupType = PopupMenuBarItem;
                    popupProperty = 'popup';
                    containerTypeObject = MenuBar;
                    break;
                case 'menu':
                    toolType = MenuItem;
                    popupType = PopupMenuItem;
                    separatorType = MenuSeparator;
                    popupProperty = 'popup';
                    containerTypeObject = Menu;
                    break;
                case 'toolbar':
                    toolType = Button;
                    popupType = DropDownButton;
                    popupProperty = 'dropDown';
                    separatorType = ToolbarSeparator;
                    containerTypeObject = Toolbar;
                    break;
                default:
                    console.log('unknown toolbar container type');
                    return;
            };
    
            if (!container) {
                container = new containerTypeObject();
            };
    
            container.tools = container.tools || {};
    
            domClass.add(container.domNode, 'ic' + iconSize);
    
            for (var name in data) {
                if (data[name].widget) {
                    tool = data[name].widget;
                }
                else if (data[name]['type']) {
                    if (typeof data[name]['type'] == 'string') {
                        var constructor = require(data[name]['type'].replace(/\./g, "/"));
                        tool = new constructor();
                    }
                    else {
                        tool = new data[name]['type']();
                    }
                }
                else if (name.match('^sep')) {
                    tool = new separatorType();
                }
                else if (data[name]['menu']) {
                    tool = new popupType();
                }
                else {
                    tool = new toolType();
                };
    
                for (var propName in data[name]) {
                    switch (propName) {
                        case 'widget':
                            break;
                        case 'type':
                            break;
                        case 'menu':
                            tool.set(popupProperty, this._buildContainer(data[name][propName], null, 'menu', iconSize || this.submenuIconSize || this.iconSize));
                            break;
                        case 'topic':
                            tool.onClick = this.buildPublishFunction(data[name]['topic'], data[name]['topicArgs']);
                            break;
                        case 'topicArgs':
                            break;
                        case 'icon':
                            tool.set('iconClass', data[name][propName]);
                            break;
                        case 'menuId':
                            domClass.add(tool.domNode, 'menuid_' + data[name][propName]);
                            break;
                        default:
                            if (propName.match('^on.+') && core.isFunction(data[name][propName])) {
                                on(tool, propName.substring(2), data[name][propName]);
                            }
                            else {
                                tool.set(propName, data[name][propName]);
                            }
                            break;
                    };
                };
                container.addChild(tool);
                container.tools[name] = tool;
            };
    
            container.getItemByMenuId = function (id) {
                return query('.menuid_' + id).map(registry.byNode)[0];
            };
    
            return container;
        },
    
        buildToolbar: function (data, container, iconSize) {
            return this._buildContainer(data, container, 'toolbar', iconSize);
        },
    
        buildMenubar: function (data, container, iconSize) {
            return this._buildContainer(data, container, 'menubar', iconSize);
        },
    
        buildMenu: function (data, container, iconSize) {
            return this._buildContainer(data, container, 'menu', iconSize);
        },
    
        buildPublishFunction: function (publishTopic, topicArgs) {
            var argList = core.forceArray(topicArgs);
            var fn = function () {
            	topic.publish(publishTopic, argList);
            };
            return fn;
        }
    });

    var singleton = new ToolbarBuilder();

    lang.setObject("qc.ToolbarBuilder", singleton);

	return singleton;
});