define([
    "dojo/_base/declare",
    "qc/TaskPane",
    "qc/_core",
    "qc/ListView",
    "qc/ListViewItem",
    "dojo/on",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/query",
    "dojo/dom-class",
    "dojo/_base/lang",
    "dojo/topic",
	"dojo/aspect"
], function (declare, TaskPane, core, ListView, ListViewItem, on, domConstruct, array, query, domClass, lang, topic, aspect) {
    return declare("qc.SourcesPane", [TaskPane], {

        name: "Sources",
        title: "Sources",
        listView: null,
        showDocumentTemplate: true,
        showCopyForward: true,
        autoHighlight: false,

        startup: function () {
            if (!this._started) {
                domClass.add(this.domNode, "qcSourceList");
                domClass.add(this.domNode, "qcddTarget");
                domClass.add(this.domNode, "qcContextMenuContainer");

                this.set("title", core.getI18n("sources"));

                this.listView = new ListView();
                domConstruct.place(this.listView.domNode, this.containerNode);
                this.listView.startup();
                this.listView.multiSelect = false;
                this.listView.setViewMode("list");
                this.listView.dropDelete = lang.hitch(this, this.dropDelete);
                aspect.after(this.listView, "onSelectionChanged", lang.hitch(this, this.onSelectionChanged), true);
                aspect.after(this.listView, "onItemDoubleClick", lang.hitch(this, this.onItemDoubleClick), true);

                this.subscriptions = [
                    topic.subscribe("/qc/WorkspaceReset", lang.hitch(this, this.clear)),
                    topic.subscribe("/noteEditor/listAdded", lang.hitch(this, this.addList)),
                    topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onNoteEditorSelectionChanged)),
                    topic.subscribe("/noteEditor/ListFocusChanged", lang.hitch(this, this.onListFocusChanged)),
                    topic.subscribe("/noteEditor/LoadingList", lang.hitch(this, this.onLoadingList)),
                    topic.subscribe("/qc/ErrorHandled", lang.hitch(this, this.clearLoading)),
                    topic.subscribe("/qc/EmptyList", lang.hitch(this, this.clearLoading))
                ];
                
                this.set("open", false);
                this.inherited(arguments);
            };
        },

        _setShowCopyForwardAttr: function(value) {
            this.showCopyForward = value || false;
            if (this._started) {
                var re = /^CopyForward/i;
                var fn = this.showCopyForward ? domClass.remove : domClass.add;
                this.listView.getChildren().forEach(function (li) {
                    if (li.data && re.test(li.data.id)) {
                        fn(li.domNode, 'hidden');
                    }
                });
                this._onListChanged();
            };
        },

        _setShowDocumentTemplateAttr: function(value) {
            this.showDocumentTemplate = value || false;
            if (this._started) {
                var li = this.listView.getItem('lstDocumentTemplate');
                if (li) {
                    if (this.showDocumentTemplate) {
                        domClass.remove(li.domNode, 'hidden');
                    }
                    else {
                        domClass.add(li.domNode, 'hidden');
                    };
                };
                this._onListChanged();
            };
        },

        onSelectionChanged: function () {
            topic.publish("/sourceList/ClearHighlight");
            array.forEach(this.listView.getSelectedItems(), function (item, i) { topic.publish("/sourceList/Highlight", item.listId) });
        },

        _onListChanged: function() {
            var haveVisibleItems = this.listView.getChildren().some(function (x) { return !domClass.contains(x.domNode, 'hidden') });
            this.set('open', haveVisibleItems);
        },

        onItemDoubleClick: function (item) {
            this.listView.clearSelected();
            if (item.data && item.data.type == 'form') {
                topic.publish("/qc/ShowEntryForm", item.data.id);
            }
            else {
                if (domClass.contains(item.domNode, 'listShow')) {
                    topic.publish("/sourceList/Focus");
                }
                else {
                    topic.publish("/sourceList/Focus", item.listId);
                }
            };
        },

        clear: function () {
            this.listView.clear();
            this._onListChanged();
        },

        addList: function (list) {
            this.clearLoading();
            var self = this;
            var li = self.listView.getItem(list.id);
            if (!li) {
                li = new ListViewItem({
                    caption: list.text,
                    icon: core.getItemIcon(list),
                    listId: list.id,
                    description: "",
                    data: list,
                    action: list.canDelete === false ? null : { icon: "xdel", onClick: function () { self.removeList(list.id); } }
                });
                domClass.add(li.domNode, core.createClassName(list.id));
                self.listView.addChild(li);
                if (/^CopyForward/i.test(list.id) && !this.showCopyForward) {
                    domClass.add(li.domNode, 'hidden');
                };
                if (list.id == 'lstDocumentTemplate' && !this.showDocumentTemplate) {
                    domClass.add(li.domNode, 'hidden');
                };
                if (this.autoHighlight && list.id != 'lstDocumentTemplate' && this.listView.getItemCount() > 1) {
                    self.listView.setSelectedItem(li)
                };
                //if (core.settings.highlightOnPrompt && /prompt/i.test(list.id)) {
                //    self.listView.setSelectedItem(li)
                //};
            }
            else {
                li.doneLoading();
                li.set('caption', list.text);
                li.set('icon', core.getItemIcon(list));
                li.data = list;
            };
            if (list.canDelete === false) {
                domClass.add(li.domNode, 'qcddPrevent');
            };
            this._onListChanged();
            return li;
        },

        removeList: function (listId) {
            this.clearLoading();
            this.listView.remove("listId", listId);
            this.listView.clearSelected();
            this._onListChanged();
            topic.publish("/qc/RemoveList", listId);
            topic.publish("/sourceList/Focus");
        },

        onLoadingList: function (list) {
            this.set("open", true);
            var li = this.listView.getItem('loadingIndicator');
            if (!li) {
                li = new ListViewItem({
                    caption: 'Loading...',
                    icon: '',
                    listId: 'loadingIndicator'
                });
                this.listView.addChild(li);
            }
            li.showLoading();
        },

        clearLoading: function () {
            this.listView.remove("listId", 'loadingIndicator');
        },

        getDropAction: function (source, ect) {
            if (source.id && this.listView.getItem(source.id)) {
                return null;
            };

            switch (source.type || 'unknown') {
                case 'list':
                    return 'add';
                case 'term':
                case 'finding':
                case 'findingGroup':
                case 'selection':
                    return 'prompt';
                default:
                    return null;
            }
        },

        dropDelete: function (source) {
            this.removeList(source.id);
        },

        doDrop: function (source, evt) {
            topic.publish("/qc/MergePrompt", source, -1);
        },

        onNoteEditorSelectionChanged: function (element) {
            query('.findingFocus', this.domNode).removeClass('findingFocus');
            if (!(element && element.domNode && element.domNode.className)) {
                return;
            };

            var lists = array.filter(element.domNode.className.split(' '), function (className) {
                return (className.substr(0, 3) == 'lst');
            });

            if (!lists || lists.length == 0) {
                return;
            };

            array.forEach(this.listView.getChildren(), function (item) {
                if (array.indexOf(lists, core.createClassName('lst' + item.listId)) >= 0) {
                    domClass.add(item.domNode, 'findingFocus');
                };
            });
        },

        onListFocusChanged: function (listId) {
            array.forEach(this.listView.getChildren(), function (item) {
                if (listId) {
                    domClass.add(item.domNode, item.listId == listId ? 'listShow' : 'listHide')
                }
                else {
                    domClass.remove(item.domNode, ['listShow', 'listHide']);
                }
            });
        },

        getContextActions: function (item, widget, targetNode) {
            var actions = [];
            var self = this;
            var li = item ? this.listView.getItem(item.id) : null;
            if (!li) {
                return actions;
            };

            actions.push({
                label: 'Highlight',
                icon: '',
                onClick: function () {
                    self.listView.setSelectedItem(li)
                }
            });

            if (item.type == 'form') {
                actions.push({
                    label: 'Open Form',
                    icon: '',
                    isDefault: true,
                    onClick: function () {
                        self.onItemDoubleClick(li)
                    }
                });
            }
            else {
                actions.push({
                    label: domClass.contains(li.domNode, 'listShow') ? 'Clear focus' : 'Focus',
                    icon: '',
                    isDefault: true,
                    onClick: function () {
                        self.onItemDoubleClick(li)
                    }
                });
            }


            if (item.canDelete !== false) {
                actions.push({
                    label: 'Remove',
                    icon: 'delete',
                    onClick: function () {
                        self.removeList(item.id)
                    },
                    beginGroup: true
                });
            }


            return actions;
        },

        getUserSettings: function () {
            var list = this.inherited(arguments) || [];
            list.push({ name: 'showDocumentTemplate', type: 'boolean' });
            list.push({ name: 'showCopyForward', caption: 'Show Copied Content', type: 'boolean' });
            list.push({ name: 'autoHighlight', caption: 'Highlight newly added content', type:'boolean' });
            return list;
        }

    });
});
