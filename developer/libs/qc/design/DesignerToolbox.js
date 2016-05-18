define([
	"qc/Note",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/text!qc/design/templates/toolbox.xml",
    "dojo/topic",
    "qc/_core",
    "qc/XmlUtil"
], function (Note, _TemplatedMixin, _WidgetBase, array, declare, domClass, domConstruct, query, toolbox, topic, core, XmlUtil) {
    return declare("qc.design.DesignerToolbox", [_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="qxDesignerToolbox qcddSource qcddTarget qcContextMenuContainer" data-dojo-attach-event="onclick:_onClick, ondblclick: _onDoubleClick"></div>',
        items: null,
    
        startup: function () {
            if (!this._started) {
                this.inherited(arguments);
                this.loadToolbox();
                topic.publish('/qc/Design/ToolboxLoaded', this);
            };
        },
    
        loadToolbox: function () {
            var toolboxData = XmlUtil.createDocument(toolbox);
            this._loadData(toolboxData.documentElement);
        },
    
        _loadData: function (xToolbox) {
            var itemTemplates = {};
            domConstruct.empty(this.domNode);
    
            array.forEach(XmlUtil.selectChildElements(xToolbox, 'Group'), function (xGroup) {
                var groupNode = domConstruct.place('<div class="group"></div>', this.domNode);
                groupNode.setAttribute('data-group-name', xGroup.getAttribute('Name'));
                if (xGroup.getAttribute('Collapsed') == 'true') {
                    domClass.add(groupNode, 'collapsed');
                };
    
                var headingNode = domConstruct.place('<div class="heading"></div>', groupNode);
    
                var expanderNode = domConstruct.place('<div class="expander"></div>', headingNode);
                var captionNode = domConstruct.place('<div class="caption"></div>', headingNode);
                captionNode.innerHTML = xGroup.getAttribute('Caption') || xGroup.getAttribute('Name');
    
                var contentNode = domConstruct.place('<div class="content"></div>', groupNode);
                array.forEach(XmlUtil.selectChildElements(xGroup, 'Item'), function (xItem) {
                    var template = XmlUtil.selectChildElement(xItem, '*');
                    var widget = this.widgetFromTemplate(template);
                    if (widget) {
                        var itemName = xItem.getAttribute('Name');
                        var itemNode = domConstruct.place('<div class="item"></div>', contentNode);
                        itemNode.setAttribute('data-item-name', itemName);
                        itemNode.innerHTML = xItem.getAttribute('Caption') || itemName;
                        itemTemplates[itemName] = template;
                    };
                }, this);
    
            }, this);
    
            this.items = itemTemplates;
        },
    
        registerTool: function (name, group, template) {
            if (!name || !template) {
                return;
            };
    
            if (this.items && this.items[name]) {
                return this.items[name];
            };
    
            group = group || 'Misc';
    
            var templateNode = null;
            if (typeof template == 'string') {
                var tempDoc = XmlUtil.createDocument(template);
                templateNode = tempDoc ? tempDoc.documentElement : null;
            }
            else if (template.nodeType == 1) {
                templateNode = template;
            }
            else {
                templateNode = null;
            };
    
            if (!templateNode) {
                return;
            };
    
            var groupNode = query('[data-group-name="' + group + '"]', this.domNode)[0];
            var contentNode = null;
    
            if (!groupNode) {
                groupNode = domConstruct.place('<div class="group"></div>', this.domNode);
                groupNode.setAttribute('data-group-name', group);
                var headingNode = domConstruct.place('<div class="heading"></div>', groupNode);
                var expanderNode = domConstruct.place('<div class="expander"></div>', headingNode);
                var captionNode = domConstruct.place('<div class="caption"></div>', headingNode);
                captionNode.innerHTML = group;
                contentNode = domConstruct.place('<div class="content"></div>', groupNode);
            }
            else {
                contentNode = query('.content', groupNode)[0];
            };
    
            var itemNode = domConstruct.place('<div class="item"></div>', contentNode);
            itemNode.setAttribute('data-item-name', name);
            itemNode.innerHTML = name;
            this.items[name] = templateNode;
            return this.items[name];
        },
    
        getItemTemplateFromNode: function (node) {
            var itemNode = core.ancestorNodeByClass(node, 'item', true);
            if (!itemNode) {
                return null;
            };
    
            var itemName = itemNode.getAttribute('data-item-name');
            if (!itemName) {
                return null;
            };
    
            return this.items ? this.items[itemName] : null;
        },
    
        widgetFromTemplate: function (template) {
            if (!template || !(('cloneNode' in template) ? true : false)) {
                return null;
            };
    
            var widget = Note.parseXml(template.cloneNode(true));
            if (!widget) {
                return null;
            };
    
            widget.startup();
            widget.updateDisplay('design');
            return widget;
        },
    
        getDragItem: function (itemName) {
        },
    
        _onClick: function (evt) {
            if (domClass.contains(evt.target, 'expander') || domClass.contains(evt.target, 'caption')) {
                var group = core.ancestorNodeByClass(evt.target, 'group');
                if (domClass.contains(group, 'collapsed')) {
                    domClass.remove(group, 'collapsed');
                }
                else {
                    domClass.add(group, 'collapsed');
                }
            };
        },
    
        _onDoubleClick: function (evt) {
            var template = this.getItemTemplateFromNode(evt.target);
            if (!template) {
                return;
            };
            var widget = this.widgetFromTemplate(template);
            if (!widget) {
                return;
            };
    
            this.onItemDoubleClick(widget);
        },
    
        onItemDoubleClick: function (widget) {
        },
    
        getItem: function (node) {
            var template = this.getItemTemplateFromNode(node);
            if (!template) {
                return null;
            };
            var widget = this.widgetFromTemplate(template);
            if (!widget) {
                return null;
            };
            return widget.getItem();
        },
    
        getContextActions: function (item, widget, targetNode) {
            var actions = [];
            //        if (widget) {
            //            actions.push({ label: core.getI18n('addtonote'), icon: '', topic: '/qc/AddToNote' });
            //        };
            return actions;
        },
    
        getDropAction: function (source, evt) {
            return null;
        },
    
        doDrop: function (source, evt) {
            return null;
        }
    });
});