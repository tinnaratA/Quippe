define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom-style",
    "dojo/request",
    "dojo/topic",
    "dojo/when",
    "qc/TaskPane",
    "qc/MedcinTree",
    "qc/_core"
], function (declare, array, lang, aspect, domStyle, request, topic, when, TaskPane, MedcinTree, core) {
    var typeDef = declare('qc.taskbar.BrowsePane', [TaskPane], {
        subscriptions: null,
        name: 'BrowsePane',
        title: 'Browse',
        modes: ['standard'],
        open: true,
        treeView: null,
        stretch: true,
        rootAtSelection: false,

        startup: function () {
            if (!this._started) {
                this.treeView = new MedcinTree({ hideRoot: false });
                this.treeView.placeAt(this.containerNode);
                domStyle.set(this.containerNode, { margin: '0px', padding: '0px' });
                domStyle.set(this.treeView.domNode, {height:'100%' });
                aspect.after(this.treeView, 'onNodeDoubleClick', lang.hitch(this, this.onNodeDoubleClick));
                this.inherited(arguments);
            };
        },


        _onEnabled: function () {
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onSelectionChanged))
                ];
            };
            this.onSelectionChanged();
        },

        _onDisabled: function () {
            this.clear();
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            }
        },

        _setRootAtSelectionAttr: function(value) {
            this.rootAtSelection = value || false;
            if (this.treeView) {
                this.treeView.browse();
            };
        },

        clear: function () {
            this.treeView.browse();
        },

        onSelectionChanged: function () {
            if (this.hSelectionChanged) {
                clearTimeout(this.hSelectionChanged);
            }
            this.hSelectionChanged = setTimeout(lang.hitch(this, function() {
                var widget = core.getNoteEditor().selection.getSelectedWidgets()[0];
                if (widget && widget.medcinId) {
                    if (this.rootAtSelection) {
                        when(this.treeView.setRoot(widget), function (root) { if (root) { root.expand() } });
                    }
                    else {
                        this.treeView.expandToTerm(widget);
                    }
                    this.selectedFinding = widget;
                }
                else {
                    this.treeView.browse();
                    this.selectedFinding = null;
                };
                
            }), 100);
        },
        
        onNodeDoubleClick: function (tNode) {
            var item = this.treeView.getSelectedItem();
            if (item) {
                var relativeTo = this.selectedFinding ? this.selectedFinding.domNode : null;
                var position = relativeTo ? 'after' : '';
                if (this.selectedFinding) {
                    item.prefix = this.selectedFinding.get('prefix');
                    item.result = this.selectedFinding.get('result');
                };
                topic.publish('/qc/AddToNote', item, relativeTo, position, false);
            }
        },

        getUserSettings: function () {
            var list = this.inherited(arguments);
            list.push({ name: 'rootAtSelection', caption: 'Set root at selected term', type: 'boolean' });
            return list;
        }
    });

    return typeDef;
});