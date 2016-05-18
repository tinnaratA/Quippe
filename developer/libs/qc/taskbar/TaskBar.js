define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/query",
    "dojo/topic",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/json",
    "dojo/on",
    "dijit/_Container",
    "dijit/layout/_ContentPaneResizeMixin",
    "dijit/layout/_LayoutWidget",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/TooltipDialog",
    "dijit/popup",
    "dijit/registry",
    "qc/design/LayoutBuilder",
    "qc/XmlUtil",
    "qc/TaskPane",
    "qc/CheckList",
    "qc/taskbar/TaskPaneEditorDialog",
    "qc/taskbar/StandardTaskPanes",
    "qc/design/StandardDialog",
    "qc/_core",
    "dojo/text!qc/taskbar/templates/TaskBar.htm",
    "dojo/text!qc/taskbar/templates/taskbar.xml"
], function (declare, array, lang, aspect, query, topic, domClass, domConstruct, domGeometry, domStyle, json, on, _Container, _ContentPaneResizeMixin, _LayoutWidget, ContentPane, _TemplatedMixin, _WidgetBase, TooltipDialog, popup, registry, LayoutBuilder, XmlUtil, TaskPane, CheckList, TaskPaneEditorDialog, StandardTaskPanes, StandardDialog, core, TemplateText, TaskBarXML) {

    var typeDef = declare('qc.taskbar.TaskBar', [_WidgetBase, _TemplatedMixin, _Container, _ContentPaneResizeMixin], {
        subscriptions: null,
        events: null,
        panes: null,
        mode: '',
        activeGroup: 'Entry',
        userSettings: null,
        paneSequence: '',
        initialSettings: null,
        showGroups: true,

        viewModeMap: {
            "drawing": "drawing",
            "design": "design",
            "expanded": "standard",
            "concise": "standard",
            "outline": "standard"
        },

        templateString: TemplateText,

        constructor: function () {
            this.panes = [];
            this.userSettings = {};
            this.initialSettings = {};
        },

        startup: function () {
            if (!this._started) {
                this.subscriptions = [
                    topic.subscribe('/qc/SettingsChanged', lang.hitch(this, this.onSettingsChanged)),
                    topic.subscribe('/qc/WorkspaceReset', lang.hitch(this, this.onWorkspaceReset)),
                    topic.subscribe("/qc/ViewChanged", lang.hitch(this, this.onViewChanged)),
                    topic.subscribe('/qc/drawing/editStarted', lang.hitch(this, this.onDrawingStarted)),
                    topic.subscribe('/qc/drawing/editFinished', lang.hitch(this, this.onDrawingFinished)),
                    topic.subscribe('/qc/RegisterTaskPane', lang.hitch(this, this.onRegisterTaskPane)),
                    topic.subscribe('/qc/taskPaneOpen', lang.hitch(this, this.onTaskPaneChanged))
                ];
                this.set('showTrashCan', core.settings.taskBarShowTrashCan || false);
                this.set('showGroups', core.settings.taskBarShowGroups === false ? false : true);
                this.inherited(arguments);
                this.loadTaskPanes();
                this.resize();
            };
        },

        loadUserSettings: function () {
            var s = core.settings.taskBarPaneSettings || '';
            this.userSettings = s ? json.parse(s) : {};
            return this.userSettings;
        },

        saveUserSettings: function () {
            var settings = core.getObjectOverrides(this.initialSettings, this.userSettings);
            var customSettings = settings ? json.stringify(settings) : '';
            if (customSettings != core.settings.taskBarPaneSettings) {
                this.saveSetting('taskBarPaneSettings', customSettings);
            };
        },

        saveSetting: function (name, value) {
            core.settings[name] = value;
            var content = {};
            content[name] = value;
            core.xhrPost({
                url: core.serviceURL('Quippe/UserSettings/Data'),
                content: content
            });
        },

        loadTaskPanes: function() {
            var xml = XmlUtil.createDocument(TaskBarXML);
            if (!xml || !xml.documentElement) {
                return;
            };
            var config = XmlUtil.elementToObject(xml.documentElement);
            if (!config) {
                return;
            };

            this.initialSettings = {};
            var userSettings = this.loadUserSettings();
            var standardProps = ['group', 'title', 'visible'];
            var self = this;

            config.taskPane = config.taskPane || [];
            
            var modules = config.taskPane.map(function (y) { return y.type.replace(/\./g, "/") });

            var panes = [];
            array.forEach(config.taskPane, function (paneDef, i) {
                var type = null;
                try {
                    type = require(modules[i]);
                }
                catch (ex) {
                    console.error('Unable to find the task pane module "' + modules[i] + '", check that it has been included in the build');
                };
                if (type) {
                    self.initialSettings[paneDef.name] = {};
                    var instance = new type(paneDef);
                    var props = standardProps.concat(instance.getUserSettings ? (instance.getUserSettings() || []).map(function (x) { return x.name }) : []);
                    props.forEach(function (x) {
                        self.initialSettings[paneDef.name][x] = instance.get(x);
                    });
                    var override = userSettings[paneDef.name]
                    if (override) {
                        for (var s in override) {
                            instance.set(s, override[s]);
                        };
                    };
                    instance.startup();
                    panes.push(instance);
                };
            });

            this.panes = panes;
            this.sortPanes();
            this.updateDisplay();

            topic.publish('/qc/TaskBarLoaded', this);
        },

        sortPanes: function () {
            if (!this.panes || this.panes.length == 0) {
                return;
            };
            var initialOrder = {};
            this.panes.forEach(function (x, i) { initialOrder[x.name] = i });

            var groupSeq = this.showGroups && core.settings.taskBarGroupSequence ? core.settings.taskBarGroupSequence.split(',') : null;
            var paneSeq = core.settings.taskBarPaneSequence ? core.settings.taskBarPaneSequence.split(',') : null;
            this.panes.sort(function (a, b) {
                var n = groupSeq ? ((groupSeq.indexOf(a.group) + 1) || groupSeq.length) - ((groupSeq.indexOf(b.group) + 1) || groupSeq.length) : 0;
                if (n == 0) {
                    n = paneSeq ? ((paneSeq.indexOf(a.name) + 1 || paneSeq.length)) - ((paneSeq.indexOf(b.name) + 1 || paneSeq.length)) : 0;
                    if (n == 0) {
                        n = initialOrder[a.name] - initialOrder[b.name]
                    };
                };
                return n;
            });
        },

        getPane: function (name) {
            return this.panes.find(function (x) { return x.name == name });
        },

        _getShowTrashCanAttr: function () {
            return domClass.contains(this.trashNode, 'showTrashCan');
        },
        _setShowTrashCanAttr: function(value) {
            if (value) {
                domClass.add(this.trashNode, 'showTrashCan');
            }
            else {
                domClass.remove(this.trashNode, 'showTrashCan');
            };
        },

        _setShowGroupsAttr: function(value) {
            var show = value ? true : false;
            if (show != this.showGroups) {
                this.showGroups = show;
                if (this.showGroups) {
                    domClass.remove(this.domNode, 'ungrouped');
                }
                else {
                    domClass.add(this.domNode, 'ungrouped');
                };
                this.updateDisplay();
            };
        },

        onDrawingStarted: function () {
            this.activeGroup = '';
            this.updateDisplay('drawing');
        },

        onDrawingFinished: function () {
            this.activeGroup = '';
            this.updateDisplay();
        },

        onSettingsChanged: function (settings) {
            if (settings.taskBarShowTrashCan != undefined) {
                this.set('showTrashCan', settings.taskBarShowTrashCan);
            };
            if (settings.taskBarShowGroups != undefined) {
                this.set('showGroups', settings.taskBarShowGroups);
            };
            if (settings.taskBarPaneSettings) {
                this.loadUserSettings();
            };
            this.updateDisplay();
        },

        onWorkspaceReset: function () {
            this.activeGroup = '';
            this.updateDisplay();
        },

        onViewChanged: function() {
            this.activeGroup = '';
            this.updateDisplay();
        },

        updateDisplay: function(viewMode) {
            if (this.showGroups) {
                this.updateDisplay_grouped(viewMode);
            }
            else {
                this.updateDisplay_ungrouped(viewMode);
            };
        },

        updateDisplay_ungrouped: function(viewMode) {
            viewMode = viewMode || core.getNoteEditor().viewMode;

            var mode = this.viewModeMap[viewMode] || 'standard';
            var containerNode = this.containerNode;

            var showPane = function (pane) {
                pane.set('noTitle', pane.get('title') ? false : true);
                lastPane = pane;
                if (pane.domNode && !pane.domNode.parentNode) {
                    pane.placeAt(containerNode);
                };
                pane.set('enabled', true);
            };

            var hidePane = function (pane) {
                if (pane.domNode && pane.domNode.parentNode) {
                    pane.domNode.parentNode.removeChild(pane.domNode);
                };
                pane.set('enabled', false);
            };

            this.panes.forEach(function (pane) {
                if (pane.visible && pane.modes.indexOf(mode) >= 0) {
                    showPane(pane);
                }
                else {
                    hidePane(pane);
                }
            });
            
            this.linkTable.innerHTML = '';
            this.mode = mode;
        },

        _checkIfSingleChild: function () {
            return false;
        },

        updateDisplay_grouped: function (viewMode) {
            viewMode = viewMode || core.getNoteEditor().viewMode;

            var mode = this.viewModeMap[viewMode] || 'standard';
            var group = this.activeGroup || '';

            var groups = [];
            var paneCount = 0;
            var lastPane = null;
            var containerNode = this.containerNode;

            var showPane = function (pane) {
                pane.set('noTitle', pane.get('title') ? false : true);
                pane.set('fill', false);
                if (lastPane) {
                    pane.placeAt(lastPane, 'after');
                }
                else {
                    pane.placeAt(containerNode);
                };
                lastPane = pane;
                pane.set('enabled', true);
                paneCount++;
            };

            var hidePane = function (pane) {
                if (pane.domNode && pane.domNode.parentNode) {
                    pane.domNode.parentNode.removeChild(pane.domNode);
                };
                pane.set('enabled', false);
            };

            var toShow = [];
            var toHide = [];
           
            this.panes.forEach(function (pane) {
                if (pane.visible && pane.modes.indexOf(mode) >= 0) {
                    if (!group) {
                        group = pane.group;
                    };
                    if (groups.indexOf(pane.group) < 0) {
                        groups.push(pane.group);
                    };
                    if (pane.group == group) {
                        toShow.push(pane);
                    }
                    else {
                        toHide.push(pane);
                    };
                }
                else {
                    toHide.push(pane);
                }
            });

            var showing = toShow.map(function (x) { return x.name }).join(",");
            var groupList = groups.join(',');
            if (this.prevDisplay) {
                if (group == this.prevDisplay.group && mode == this.prevDisplay.mode && showing == this.prevDisplay.showing && groupList == this.prevDisplay.groupList) {
                    return;
                }
            };
            this.prevDisplay = { group: group, mode: mode, showing: showing, groupList: groupList };

            toHide.forEach(hidePane);
            toShow.forEach(showPane);

            if (paneCount == 0) {
                for (var g = 0; g < groups.length; g++) {
                    if (groups[g] != group) {
                        this.activeGroup = groups[g];
                        return this.updateDisplay(viewMode);
                    }
                }
            };

            if (paneCount == 1) {
                domClass.add(this.domNode, 'singlePane');
                lastPane.set('fill', true);
            }
            else {
                domClass.remove(this.domNode, 'singlePane');
            };

            var groupSeq = (core.settings.taskBarGroupSequence || '').split(',');
            var sortedGroups = groups.sort(function (a, b) {
                return (((groupSeq.indexOf(a) + 1) || 10) - ((groupSeq.indexOf(b) + 1) || 10)) || (groups.indexOf(a) - groups.indexOf(b));
            });
            var htm = '<table class="navTable ' + (groups.length < 2 ? 'singleGroup' : '') + '"><tr>';
            htm += sortedGroups.map(function (g) {
                return '<td class="' + (g == group ? 'active' : '') + '"><div class="groupLink" data-group-name="' + g + '">' + g + '</div></td>';
            }).join('');
            htm += '</tr></table>';
            this.linkTable.innerHTML = htm;

            this.activeGroup = group;
            this.mode = mode;
            this._layout();
        },

        addChild: function (widget, index, suspendUpdate) {
            this.registerTaskPane(widget, '', suspendUpdate);
        },

        onRegisterTaskPane: function(widget) {
            this.registerTaskPane(widget);
        },

        
        registerTaskPane: function (taskPane, placeBefore, suspendUpdate) {
            if (!taskPane) {
                return;
            };
            if (!taskPane.name) {
                throw ('Failed to register task pane - missing name property');
            };

            taskPane.startup();

            var override = this.userSettings[taskPane.name]
            if (override) {
                for (var s in override) {
                    taskPane.set(s, override[s]);
                };
            };

            var i = placeBefore ? this.panes.findIndex(function (x) { return x.name == placeBefore }) : -1;
            if (i < 0) {
                this.panes.push(taskPane);
            }
            else {
                this.panes.splice(i, 0, taskPane);
            };
            if (!suspendUpdate) {
                this.sortPanes();
                this.updateDisplay();
            };
        },

        onNavClick: function (evt) {
            var link = core.ancestorNodeByClass(evt.target, 'groupLink', true);
            if (link) {
                this.activeGroup = link.getAttribute('data-group-name');
                this.updateDisplay();
                return;
            };

            if (core.ancestorNodeByClass(evt.target, 'editButton', true)) {
                this.editTaskPanes(evt.target);
                return;
            };

        },

        getItem: function(node) {
            if (domClass.contains(node, 'groupLink')) {
                return { type: 'taskBarGroupLink', text: node.innerHTML, node: node };
            }
            else {
                return null;
            }
        },

        getDropAction: function (source, evt) {
            if (!source) {
                return null;
            };

            var trashClass = this.get('showTrashcan') ? 'trashCan' : 'trashPane';
            var isDelete = core.ancestorNodeByClass(evt.target, trashClass, true) ? true : false;

            if (source.type == 'taskPane') {
                return isDelete ? 'delete' : 'move';
            }
            else if (source.type == 'taskBarGroupLink') {
                return core.ancestorNodeByClass(evt.target, 'navPane', true) && evt.target != source.node ? 'move' : null;
            }
            else if (source && source.sourceOwner && core.isFunction(source.sourceOwner.dropDelete)) {
                return isDelete ? 'delete' : null;
            };

            return null;
        },

        doDrop: function (source, evt) {
            if (!source) {
                return null;
            };

            var trashClass = this.get('showTrashcan') ? 'trashCan' : 'trashPane';
            var isDelete = core.ancestorNodeByClass(evt.target, trashClass, true) ? true : false;

            if (source.taskPane) {
                if (isDelete) {
                    source.taskPane.set('visible', false);
                    this.updateDisplay();
                }
                else if (domClass.contains(evt.target, 'groupLink')) {
                    this.moveToGroup(source.taskPane, evt.target.getAttribute('data-group-name'));
                }
                else {
                    this.movePane(source.taskPane, evt.clientY);
                }
            }
            else if (source.type == 'taskBarGroupLink') {
                this.moveGroup(source.node, evt.clientX);
            }
            else if (source.sourceOwner && core.isFunction(source.sourceOwner.dropDelete) && isDelete) {
                source.sourceOwner.dropDelete(source);
            };
            
        },

        movePane: function (pane, y) {
            var targetPane = null;
            var i = 0;
            var lastVisible = null;
            var targetName = '';
            var moveAfter = false;
            var otherPanes = query('.qcTaskPane', this.domNode).map(registry.byNode).filter(function (x) { return x.name != pane.name && x.get('enabled') });
            while (!targetName && i < otherPanes.length) {
                targetPane = otherPanes[i];
                lastVisible = targetPane;
                var pos = domGeometry.position(targetPane.domNode);
                if (pos.y > y) {
                    pane.placeAt(targetPane.domNode, 'before');
                    targetName = targetPane.name;
                };
                i++;
            };
            

            if (!targetName && lastVisible) {
                pane.placeAt(lastVisible.domNode, 'after');
                targetName = lastVisible.name;
                moveAfter = true;
            };

            var targetIndex = this.panes.findIndex(function (x) { return x.name == targetName }) + (moveAfter ? 1 : 0);
            var currentIndex = this.panes.findIndex(function (x) { return x.name == pane.name });
            this.panes.move(currentIndex, targetIndex);
            var paneSeq = this.panes.map(function (x) { return x.name }).join(',');
            this.saveSetting('taskBarPaneSequence', paneSeq);
        },

        moveGroup: function (sourceNode, linkPosition) {
            var groupList = core.settings.taskBarGroupSequence ? core.settings.taskBarGroupSequence.split(',') : [];
            if (groupList.length == 0) {
                this.panes.forEach(function (x) {
                    if (x.group && groupList.indexOf(x.group) < 0) {
                        groupList.push(x.group);
                    };
                });
            };
                        
            var sourceGroup = sourceNode.getAttribute('data-group-name');
            var targetGroup = '';
            var position = '';
            var links = query('.groupLink', this.linkTable);
            var i = 0;
            while (!targetGroup && i < links.length) {
                var pos = domGeometry.position(links[i]);
                if (pos.x > linkPosition) {
                    targetGroup = links[i].getAttribute('data-group-name');
                    position = 'before';
                }
                else {
                    i++;
                }
            };
            if (!targetGroup) {
                links[links.length - 1].getAttribute('data-group-name');
                position = 'after';
            };
            var groupSeq = [];
            groupList.forEach(function (g) {
                if (g == sourceGroup) {
                    //skip
                }
                else if (g == targetGroup) {
                    if (position == 'before') {
                        groupSeq.push(sourceGroup);
                        groupSeq.push(targetGroup);
                    }
                    else {
                        groupSeq.push(targetGroup);
                        groupSeq.push(sourceGroup);
                    }
                }
                else {
                    groupSeq.push(g);
                }
            });

            this.saveSetting('taskBarGroupSequence', groupSeq.join(','));
            this.updateDisplay();
        },

        moveToGroup: function(pane, groupName) {
            if (!pane || !groupName || pane.group == groupName) {
                return;
            };

            var currentIndex = this.panes.findIndex(function (x) { return x.name == pane.name });
            var targetIndex = currentIndex;
            this.panes.forEach(function (p, i) {
                if (p.name != pane.name && p.group == groupName) {
                    targetIndex = i;
                }
            });
            this.panes.move(currentIndex, targetIndex);
            var paneSeq = this.panes.map(function (x) { return x.name }).join(',');
            this.saveSetting('taskBarPaneSequence', paneSeq);

            pane.group = groupName;
            if (!this.userSettings[pane.name]) {
                this.userSettings[pane.name] = {};
            };
            this.userSettings[pane.name].group = groupName;
            this.saveUserSettings();
            this.activeGroup = groupName;
            this.updateDisplay();
        },

        editTaskPanes: function (buttonNode) {
            popup.close();

            if (this.tooltipDialog) {
                this.tooltipDialog.destroyRecursive();
            };

            var mode = this.mode;
            var eventHandlers = [];

            var shortListCount = 0;
            var checkList = new CheckList();
            this.panes.forEach(function (pane) {
                if (pane.showInShortList && pane.modes.indexOf(mode) >= 0) {
                    checkList.addItem(pane.get('name'), pane.get('title') || pane.get('name'), pane.visible, '')
                    shortListCount++;
                };
            });
            
            if (shortListCount == 0) {
                return this.onEditSettings();
            };

            var div = domConstruct.create('div');
            checkList.placeAt(div);
            domClass.add(div, 'taskPanePopup');
            domStyle.set(div, { padding: '6px' });

            var link = domConstruct.place('<a href="#" style="display:inline-block;margin-top:12px;margin-left:8px;">Edit Task Pane Settings</a>', div);
            eventHandlers.push(on(link, 'click', lang.hitch(this, this.onEditSettings)));

            this.tooltipDialog = new TooltipDialog();
            this.tooltipDialog.startup();
            this.tooltipDialog.set('content', div);

             

            var onClose = lang.hitch(this, function () {
                if (!this.userSettings) {
                    this.userSettings = {};
                };
                var list = checkList.getItems();
                list.forEach(function (item) {
                    if (!this.userSettings[item.id]) {
                        this.userSettings[item.id] = {};
                    };
                    this.userSettings[item.id].visible = item.checked;
                    var pane = this.getPane(item.id);
                    if (pane) {
                        pane.set('visible', item.checked);
                    };
                }, this);
                this.saveUserSettings();
                this.prevDisplay = null;
                this.updateDisplay();
            });
            eventHandlers.push(aspect.after(checkList, "onChange", onClose));

            var popupArgs = { popup: this.tooltipDialog, around: buttonNode, onClose: onClose };
            popup.open(popupArgs);

            var hClose = on(document, 'mousedown', function (evt) {
                if (!core.ancestorNodeByClass(evt.target, 'taskPanePopup', true)) {
                    hClose.remove();
                    eventHandlers.forEach(function(x){x.remove()});
                    popup.close();
                    if (domClass.contains(evt.target, 'editButton')) {
                        evt.preventDefault();
                        evt.stopPropagation();
                    };
                };
            });
        },

        onEditSettings: function () {
            popup.close();

            var firstVisibleName = this.panes.filter(function (x) { return x.enabled }).map(function (y) { return y.name })[0];

            var dlg = new TaskPaneEditorDialog();
            dlg.startup();
            dlg.loadTaskPanes(this.panes, firstVisibleName);

            var ignoreProps = ['id', 'text', 'name', 'description', 'customSettings', 'owner'];
            core.showDialog(dlg, lang.hitch(this, function () {
                dlg.getSettings().forEach(function (item) {
                    var pane = this.getPane(item.name);
                    for (var p in item) {
                        if (ignoreProps.indexOf(p) < 0) {
                            pane.set(p, item[p]);
                            if (!this.userSettings[item.name]) {
                                this.userSettings[item.name] = {};
                            };
                            this.userSettings[item.name][p] = item[p];
                        }
                    };
                }, this);
                this.saveUserSettings();
                this.prevDisplay = null;
                this.updateDisplay();
            }));
        },

        onTaskPaneChanged: function (pane, eventNumber) {
            //console.log((pane ? pane.name : 'no pane') + ', evt:' + eventNumber);
        }

    });
   
    return typeDef;
});