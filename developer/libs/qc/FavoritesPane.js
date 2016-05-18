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
    "dojo/request",
    "dojo/topic",
	"dojo/aspect"
], function (declare, TaskPane, core, ListView, ListViewItem, on, domConstruct, array, query, domClass, lang, request, topic, aspect) {
    return declare("qc.FavoritesPane", [TaskPane], {

        title: core.getI18n("favorites"),
        listView: null,
        itemCount: 0,

        startup: function () {
            if (!this._started) {
                this.set("open", false);
                domClass.add(this.domNode, "qcddTarget");
                domClass.add(this.domNode, "qcContextMenuContainer");
                this.listView = new ListView();
                domConstruct.place(this.listView.domNode, this.containerNode);
                this.listView.startup();
                this.listView.multiSelect = false;
                this.listView.setViewMode("list");
                this.listView.dropDelete = lang.hitch(this, "removeFavorite");
                this.listView.onLabelChanged = lang.hitch(this, "onItemRenamed");
                this.listView.allowLabelEdit = true;
                domClass.add(this.listView.domNode, "qcFavoritesList");
                aspect.after(this.listView, "onItemDoubleClick", lang.hitch(this, "onItemDoubleClick"), true);
                this.inherited(arguments);
            }
        },

        _onEnabled: function () {
            if (!this.loaded) {
                this.loadFavorites();
            };
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/qc/AddToFavorites", lang.hitch(this, this.addToFavorites)),
                    topic.subscribe("/qc/RemoveFavorite", lang.hitch(this, this.removeFavorite))
                ];
            };
        },

        _onDisabled: function () {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            };
        },

        loadFavorites: function () {
            var self = this;
            self.loaded = true;
            self.listView.clear();
            request.get(core.serviceURL("Quippe/Favorites"), {
                handleAs: "xml",
                preventCache: true
            }).then(function (data, ioArgs) {
                var count = 0;
                query("Item", data).forEach(function (node, n) {
                    var item = core.nodeToItem(node);
                    if (item.type == 'image' && !core.settings.features.drawing) {
                        //skip item
                    }
                    else {
                        var child = self.listView.createListViewItem(item);
                        child.action = { icon: "xdel", onClick: function () { topic.publish("/qc/RemoveFavorite", item); } };
                        self.listView.addChild(child);
                        count++;
                    };
                });
                if (count > 0) {
                    self.set("open", true);
                }                
            }, function (err) { core.showError(err) });
        },

        addToFavorites: function (item, relativeTo, position) {
            if (!item.id) {
                item.id = item.medcinId;
            };

            if (item.type == 'finding') {
                item.type = 'term';
            };

            if (!this.listView.containsItem(item.id)) {
                var li = new ListViewItem({
                    caption: item.text,
                    icon: item.icon || core.getItemIcon(item, false) || "",
                    itemId: item.id,
                    description: "",
                    data: item
                });
                li.action = { icon: "xdel", onClick: function () { topic.publish("/qc/RemoveFavorite", item); } };
                this.listView.addChild(li);
                if (relativeTo) {
                    domConstruct.place(li.domNode, relativeTo, position);
                }

                this.set("open", true);

                request.post(core.serviceURL("Quippe/Favorites/Add"), {
                    data: { id: item.id, Type: item.type, Text: item.text, Icon: li.icon },
                    handleAs: "xml"
                }).then(function (data) { }, function (err) { core.showError(err) });
            }
        },

        removeFavorite: function (item) {
            var listItem = this.listView.getItem(item.id);
            if (listItem) {
                this.listView.removeChild(listItem);
                if (this.listView.getItemCount() == 0) {
                    this.set("open", false);
                };
            }

            request.get(core.serviceURL("Quippe/Favorites/Delete"),{
                query: { id: item.id, Type: item.type },
                handleAs: "xml",
                preventCache: true
            }).then(function(data){}, function(err) { core.showError(err) });

        },

        onItemRenamed: function (listItem, newName) {
            var item = listItem.data;
            if (item.id && item.type && item.text != newName) {
                request.post(core.serviceURL("Quippe/Favorites/Rename"), {
                    data: { id: item.id, Type: item.type, Text: newName },
                    handleAs: "xml"
                }).then(function (data) { }, function (err) { core.showError(err) } );
            };
        },

        onItemDoubleClick: function (item) {
            topic.publish("/qc/MergePrompt", item.data, -1);
        },

        getDropAction: function (source, evt) {
            if (!source) {
                return;
            };

            var item = this.listView.getItem(source.id);
            if (item) {
                return 'move';
            };

            switch (source.type || 'unknown') {
                case "term":
                case "finding":
                case "element":
                case "image":
                case "macro":
                    return 'add';
                case "list":
                    if (source.id && !(source.listType && source.listType.match(/prompt/i))) {
                        return 'add';
                    }
                    else {
                        return null;
                    };
                default:
                    return null;
            };
        },

        dropDelete: function (source) {
            this.removeFavorite(source);
        },

        doDrop: function (source, evt) {
            if (source.type === 'finding') {
                source.type = 'term';
            };

            var rel = this.listView.getInsertRelative(evt.clientX, evt.clientY);
            var item = this.listView.getItem(source.id);
            if (item) {
                if (rel) {
                    domConstruct.place(item.domNode, rel.item.domNode, rel.pos);
                }
                if (item.data && rel.item) {
                    request.post(core.serviceURL('Quippe/Favorites/Sequence'),{
                        data: { SourceType: item.data.type, SourceId: item.data.id, TargetType: rel.item.data.type, TargetId: rel.item.data.id, Relationship: rel.pos },
                        handleAs: "xml"
                    }).then(function (data) { }, function (err) { core.showError(err) });
                }
            }
            else {
                if (rel) {
                    this.addToFavorites(source, rel.item.domNode, rel.pos);
                }
                else {
                    this.addToFavorites(source);
                }
            }
        },

        getContextActions: function (item, widget, targetNode) {
            var actions = [];

            switch (item.type || 'unknown') {
                case 'finding':
                case 'term':
                    actions.push({ label: core.getI18n('addtonote'), icon: '', topic: '/qc/AddToNote' });
                    actions.push({ label: core.getI18n('prompt'), icon: 'view', topic: '/qc/MergePrompt', beginGroup: true });
                    if (core.settings.enableFollowUpPrompt) {
                        actions.push({ label: core.getI18n("fuprompt"), icon: 'view', topic: '/qc/FollowUpPrompt' });
                    };
                    if (core.settings.nursingFeaturesEnabled) {
                        actions.push({ label: core.getI18n("nursingprompt"), icon: 'rnprompt', topic: '/qc/NursingPrompt' });
                    };
                    break;
                case 'list':
                    actions.push({ label: core.getI18n('merge'), icon: '', topic: '/qc/AddToNote' });
                    break;
                default:
                    actions.push({ label: core.getI18n('addtonote'), icon: '', topic: '/qc/AddToNote' });
                    break;
            };

            actions.push({
                label: core.getI18n('tbRename'),
                icon: 'pencil',
                beginGroup: true,
                onClick: lang.hitch(this, function () {
                    this.listView.setSelectedItem(widget);
                    this.listView.startLabelEdit();
                })
            });

            actions.push({
                label: core.getI18n('deleteItem'),
                icon: 'delete',
                beginGroup: true,
                onClick: lang.hitch(this, function () {
                    this.removeFavorite(item);
                })
            });

            return actions;
        }
    });
});
