define([
    "dijit/_Container",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dijit/TitlePane",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
	"qc/_core",
    "qc/ListView",
    "qc/TaskPane"
], function (_Container, _TemplatedMixin, _WidgetBase, registry, TitlePane, declare, lang, domClass, domConstruct, core, ListView, TaskPane) {
	var Toolbox = declare("qc.design.Toolbox", [TaskPane], {
        name: 'DesignToolbox',
        title: 'Toolbox',
        modes: ['design'],
        listView: null,
    
        toolboxItems: [
            { text: 'Section', icon: 'document', className: 'qc/note/Section', defaultParms: { text: 'New Section'} },
            { text: 'Group', icon: 'document', className: 'qc/note/Group', defaultParms: { text: 'New Group'} },
            { text: 'Finding', icon: 'document', className: 'qc/note/FindingLabel', defaultParms: { text: 'Finding'} }
        ],
    
        startup: function () {
            if (!this._started) {
                domClass.add(this.domNode, "qcDesignerTaskPane");
                domClass.add(this.domNode, "qcContextMenuContainer");
                domClass.add(this.domNode, 'sealed');
    
                this.listView = new ListView();
                domConstruct.place(this.listView.domNode, this.containerNode);
                this.listView.startup();
                this.listView.multiSelect = false;
                this.listView.setViewMode("list");
    
                for (var n = 0; n < this.toolboxItems.length; n++) {
                    var li = this.listView.addItem(this.toolboxItems[n]);
                    li.getItem = lang.hitch(this, this.createDragItem);
                };
    
                this.set("open", true);
                this.inherited(arguments);
            };
        },
    
        createDragItem: function (node) {
            var li = registry.getEnclosingWidget(node);
            if (!(li && li.data && li.data.className)) {
                return;
            }
    
            var type = require(li.data.className.replace(/\./g, "/"));
            if (type) {
                var item = new type(li.data.defaultParms);
                return item.getItem();
            }
            else {
                return null;
            }
        },
    
        getContextActions: function () {
            return [];
        }
	});

	core.settings.designToolboxClass = Toolbox;

	return Toolbox;
});