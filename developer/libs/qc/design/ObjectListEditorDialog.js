define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/on",
    "dojo/aspect",
    "dijit/layout/BorderContainer",
    "qc/_core",
    "qc/design/StandardDialog",
    "qc/design/LayoutBuilder",
    "qc/design/ToolbarBuilder",
    "qc/design/PropertyGrid",
    "qc/ListView",
    "qc/ListViewItem",
    "qc/ResizableDialogMixin"
], function (declare, array, lang, domClass, domGeometry, domStyle, on, aspect, BorderContainer, core, StandardDialog, LayoutBuilder, ToolbarBuilder, PropertyGrid, ListView, ListViewItem, ResizableDialogMixin) {
    var typeDef = declare('qc.design.ObjectListEditorDialog', [StandardDialog, ResizableDialogMixin], {
        value: null,
        itemType: null,
        itemIcon: null,
        itemTextProperty: 'text',
        itemCreator: null,
        width: 500,
        height: 300,

        show: function() {
            this.inherited(arguments);

            var containerNodeBox = domGeometry.getMarginBox(this.containerNode);
            var contentAreaBox = domGeometry.getMarginBox(this.contentArea.domNode);

            this.resizer.minWidth = containerNodeBox.w;
            this.resizer.minHeight = containerNodeBox.h + 28;

            this.contentAreaHeightDifference = containerNodeBox.h - contentAreaBox.h;
            this.contentAreaWidthDifference = containerNodeBox.w - contentAreaBox.w;
        },

        postCreate: function () {
            this.inherited(arguments);
            this.initLayout();
        },

        _setWidthAttr: function(value) {
            var nValue = parseInt(value, 10);
            if (!isNaN(nValue) && nValue > 0) {
                this.width = nValue;
                if (this.layout) {
                    domStyle.set(this.layout, { width: nValue + 'px' });
                }
            }
        },

        _setHeightAttr: function (value) {
            var nValue = parseInt(value, 10);
            if (!isNaN(nValue) && nValue > 0) {
                this.height = nValue;
                if (this.layout) {
                    domStyle.set(this.layout, { height: nValue + 'px' });
                }
            }
        },

        initLayout: function () {
            //domStyle.set(this.cmdCancel.domNode, { display: 'none' });
            //domStyle.set(this.cmdOK.containerNode, { width: '80px' });
            this.toolbar = ToolbarBuilder.buildToolbar({
                add: { label: 'Add', icon: 'add', showLabel: true, onClick: lang.hitch(this, this.onAddClick) },
                remove: { label: 'Remove', icon: 'delete', showLabel: true, onClick: lang.hitch(this, this.onRemoveClick) },
                moveUp: { label: 'Move Up', icon: 'arrow_up_green', showLabel: true, onClick: lang.hitch(this, this.onMoveUpClick) },
                moveDown: { label: 'Move Down', icon: 'arrow_down_green', showLabel: true, onClick: lang.hitch(this, this.onMoveDownClick) }
            }, null, 16);

            this.propertyGrid = new PropertyGrid({ showTitlebar: true });
            aspect.after(this.propertyGrid, 'onPropertyChanged', lang.hitch(this, this.onPropertyChanged));

            this.listView = new ListView();
            aspect.after(this.listView, 'onSelectionChanged', lang.hitch(this, this.onSelectedItemChanged));
            
            this.listView.createListViewItem = lang.hitch(this, function (item) {
                return new ListViewItem({
                    caption: item.get ? item.get(this.itemTextProperty) : item[this.itemTextProperty] || "",
                    icon: this.itemIcon || item.icon || core.getItemIcon(item),
                    description: item.description || "",
                    data: item
                });
            });

            this.layout = LayoutBuilder.buildLayout({
                style: { width: this.width + 'px', height: this.height + 'px' , margin: '0px' },
                gutter: false,
                top: { content: this.toolbar, style: { height: '28px' } },
                center: {
                    left: { content: this.listView, style: { width: '33%' }, splitter: true },
                    center: { content: this.propertyGrid }
                }
            });
            this.layout.placeAt(this.contentArea);
        },

        _getValueAttr: function() {
            return this.listView.getChildren().map(function (x) { return x.data });
        },
        _setValueAttr: function(value) {
            this.loadList(core.forceArray(value));
        },

        loadList: function(list) {
            this.listView.clear();
            array.forEach(list || [], function (item) {
                this.listView.addItem(item);
            }, this);
        },

        onSelectedItemChanged: function () {
            this.checkState();
        },

        checkState: function () {
            var listItem = this.listView.getSelectedItem();
            if (listItem) {
                this.propertyGrid.set('selectedObject', listItem.data);
                var index = this.listView.getItemIndex(listItem.data.id);
                var count = this.listView.getItemCount();
                this.toolbar.tools.remove.set('disabled', false);
                this.toolbar.tools.moveUp.set('disabled', index <= 0);
                this.toolbar.tools.moveDown.set('disabled', index >= count - 1);
            }
            else {
                this.toolbar.tools.remove.set('disabled', true);
                this.toolbar.tools.moveUp.set('disabled', true);
                this.toolbar.tools.moveDown.set('disabled', true);
            }
        },

        onPropertyChanged: function (sender, args) {
            var target = args[0];
            var prop = args[1];
            if (prop && prop.name == this.itemTextProperty) {
                var item = this.listView.getSelectedItem();
                item.set('caption', item.data.get ? item.data.get(this.itemTextProperty) : item.data[this.itemTextProperty] || '');
            };
        },

        onAddClick: function () {
            var item = null;
            if (this.itemCreator) {
                item = this.itemCreator();
            }
            else if (this.itemType) {
                item = new this.itemType();
            };
            if (item) {
                if (!this.value) {
                    this.value = [];
                };
                this.value.push(item);
                this.listView.addItem(item);
            };
            this.checkState();
        },

        onRemoveClick: function () {
            this.listView.removeSelected();
            this.checkState();
        },

        onMoveUpClick: function () {
            this.listView.moveUp();
            this.checkState();
        },

        onMoveDownClick: function () {
            this.listView.moveDown();
            this.checkState();
        },

        onResizerUpdate: function (width, height) {
            domStyle.set(this.containerNode, "width", (width - this.contentAreaWidthDifference) + "px");
            domStyle.set(this.containerNode, "height", (height - this.contentAreaHeightDifference) + "px");

            this.contentArea.resize({
                w: width - this.contentAreaWidthDifference,
                h: height - this.contentAreaHeightDifference - 28
            });
        }
    });

    return typeDef;
});