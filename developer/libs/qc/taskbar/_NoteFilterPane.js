define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/when",
    "dojo/topic",
    "dijit/registry",
    "qc/ListView",
    "qc/ListViewItem",
    "qc/TaskPane",
    "qc/_core"
], function (declare, array, lang, aspect, domClass, domConstruct, domStyle, on, query, when, topic, registry, ListView, ListViewItem, TaskPane, core) {
    return declare("qc.taskbar._NoteFilterPane", [TaskPane], {
        name: "FilterByDomain",
        title: "Domains",
        listView: null,
        showAll: false,
        showCounts: false,
        groups: null,


        startup: function () {
            if (!this._started) {
                this.loadList();
                this.inherited(arguments);
            };
        },

        loadList: function () {
            domClass.add(this.domNode, ['qcSourceList', 'qcContextMenuContainer']);
            this.listView = new ListView();
            domConstruct.place(this.listView.domNode, this.containerNode);

            this.listView.startup();
            this.listView.multiSelect = true;
            this.listView.setViewMode("simple");

            var self = this;
            when(this.getCategories(), function (list) {
                if (list) {
                    list.forEach(function (item) {
                        item.listViewItem = self.listView.addItem({ id: item.id, text: item.text });
                    });
                    aspect.after(self.listView, "onSelectionChanged", lang.hitch(self, self.onSelectionChanged), true);
                    aspect.after(self.listView, "onItemDoubleClick", lang.hitch(self, self.onItemDoubleClick), true);
                };
                self.groups = list || [];
                return self.groups;
            });
        },

        // summary
        //  returns a list of filter categories of the form
        //    {id:string, text:string, test:function(finding) }
        //  Where the test function will be executed against 
        //  findings from the note to determine if that finding belongs
        //  in that category.  OK to return a promise if the 
        //  categories will be loaded asynchronously.
        getCategories: function() {

        },

        // summary
        //  true to show all filter categories, false to 
        //  show only those that have active findings 
        _setShowAll: function (value) {
            this.showAll = value ? true : false;
            this.updateDisplay();
        },

        // summary
        //  true to show the finding count along with the category
        _setShowCounts: function (value) {
            this.showCounts = value ? true : false;
            this.updateDisplay();
        },

        _onEnabled: function () {
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/qc/WorkspaceReset", lang.hitch(this, this.clear)),
                    topic.subscribe('/noteEditor/listAdded', lang.hitch(this, this.onNoteChanged)),
                    topic.subscribe('/noteEditor/listRemoved', lang.hitch(this, this.onNoteChanged)),
                    topic.subscribe('/noteEditor/findingAdded', lang.hitch(this, this.onNoteChanged)),
                    topic.subscribe('/noteEditor/findingRemoved', lang.hitch(this, this.onNoteChanged)),
                    topic.subscribe('/noteEditor/findingsRemoved', lang.hitch(this, this.onNoteChanged)),
                    topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onNoteEditorSelectionChanged))
                ];
            };
            if (!this.persistentSubscriptions) {
                //TODO: add destroyRecursive to clean this up
                this.persistentSubscriptions = [
                    topic.subscribe('/noteEditor/ListFocusChanged', lang.hitch(this, this.onNoteEditorListFocusChanged))
                ];
            }
            this.updateDisplay();
        },

        _onDisabled: function () {
            if (this.subscriptions) {
                this.subscriptions.forEach(function (x) { x.remove() });
                this.subscriptions = null;
            };
        },

        getGroupCounts: function () {
            var counts = {};
            var groups = this.groups;
            query('.finding', core.getNoteEditor().domNode).map(registry.byNode).forEach(function (finding) {
                groups.forEach(function (g) {
                    if (g.test(finding)) {
                        counts[g.id] = (counts[g.id] || 0) + 1;
                    };
                });
            });
            return counts;
        },

        shouldShow: function(group, itemCount) {
            return itemCount > 0 || this.get('showAll');
        },

        updateDisplay: function () {
            if (!this.enabled || !this.groups) {
                return;
            };
            var counts = this.getGroupCounts();
            var showAll = this.get('showAll');
            var isEmpty = true;
            this.groups.forEach(function (group) {
                if (this.shouldShow(group, counts[group.id])) {
                    group.listViewItem.set('text', group.text + (this.showCounts && counts[group.id] > 0 ? ' (' + counts[group.id] + ')' : ''));
                    domClass.remove(group.listViewItem.domNode, 'hidden');
                    isEmpty = false;
                }
                else {
                    domClass.add(group.listViewItem.domNode, 'hidden');
                }
                domClass.remove(group.listViewItem.domNode, 'selected');
            }, this);
            this.set('isEmpty', isEmpty);
        },

        onNoteChanged: function () {
            this.updateDisplay();
        },

        onSelectionChanged: function () {
            this.applyHighlight();
        },

        onNoteEditorListFocusChanged: function (focusId) {
            if (focusId) {
                var id = focusId.split(':').pop();
                this.listView.getChildren().forEach(function (li) {
                    domClass.add(li.domNode, li.data.id == id ? 'listShow' : 'listHide');
                });
            }
            else {
                query(".listHide,.listShow", this.listView.domNode).removeClass(['listHide', 'listShow']);
            };
            this.listView.clearSelected();
        },

        applyHighlight: function () {
            topic.publish("/sourceList/ClearHighlight");
            var tests = this.groups.filter(function (x) { return domClass.contains(x.listViewItem.domNode, 'selected') }).map(function (y) { return y.test });
            var len = tests.length;
            var i = 0;
            if (len > 0) {
                query('.finding', core.getNoteEditor().domNode).map(registry.byNode).forEach(function (finding) {
                    for (i = 0; i < len; i++) {
                        if (tests[i](finding)) {
                            domClass.add(finding.domNode, 'highlight');
                        }
                    }
                });
                topic.publish('/noteEditor/ListHighlightChanged');
            };
        },

        onItemDoubleClick: function (item) {
            this.listView.clearSelected();
            var isFocused = item && item.domNode && domClass.contains(item.domNode, 'listShow');
            this.clearFocus();
            if (!isFocused) {
                this.focusItem(item);
            };
        },

        focusItem: function (item) {
            var editor = core.getNoteEditor();
            if (!editor) {
                return;
            };

            var group = this.groups.find(function (x) { return x.id == item.data.id });
            if (!group) {
                return;
            };

            editor.focusOn(group.test, this.name + ':' + item.data.id);
        },

        clearFocus: function () {
            var editor = core.getNoteEditor();
            if (editor) {
                editor.clearListFocus();
            };
        },

        clear: function () {
            if (this.listView) {
                query(".listHide,.listShow,.findingFocus", this.listView.domNode).removeClass(['listHide', 'listShow', 'findingFocus']);
            };
        },

        onNoteEditorSelectionChanged: function (element) {
            query('.findingFocus', this.domNode).removeClass('findingFocus');
            if (!element) {
                return;
            };
            this.groups.forEach(function (group) {
                if (group.test(element)) {
                    domClass.add(group.listViewItem.domNode, 'findingFocus');
                };
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

            actions.push({
                label: domClass.contains(li.domNode, 'listShow') ? 'Clear focus' : 'Focus',
                icon: '',
                onClick: function () {
                    self.onItemDoubleClick(li)
                }
            });

            return actions;
        },


        getUserSettings: function () {
            var list = this.inherited(arguments);
            list.push({ name: 'showAll', caption: 'Show all filter items', type: 'boolean' });
            list.push({ name: 'showCounts', caption: 'Show item counts', type: 'boolean' });
            return list;
        }

    });
});
