define([
    "dojo/_base/declare",
    "qc/taskbar/TaskBar"
], function (declare, TaskBar) {
    return declare("qc.TaskBar", [TaskBar], {});
});

// qc.TaskBar replaced by qc.taskbar.TaskBar
/*
define([
    "dijit/_Container",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/layout/ContentPane",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/query",
    "dojo/topic",
    "qc/_core"
], function (_Container, _TemplatedMixin, _WidgetBase, ContentPane, registry, array, declare, lang, domClass, domConstruct, domGeometry, domStyle, query, topic, core) {
    return declare("qc.TaskBar", [_WidgetBase, _TemplatedMixin, ContentPane, _Container], {
        mode: 'standard',

        childPanes: [],
        orderedPanes: [], //ordered by last used
        templateString: '<div data-dojo-attach-point="containerNode"></div>',

        startup: function () {
            if (!this._started) {
                if (!this.overflowMode) {
                    this.overflowMode = core.settings.taskBarDisplayMode || 'constrained';
                }
                if (this.overflowMode == 'scrolling') {
                    domStyle.set(this.domNode, "overflow", "auto");
                } else {
                    domStyle.set(this.domNode, "overflow", "visible");
                }
                domStyle.set(this.domNode, "position", "relative");
                domClass.add(this.domNode, "qcTaskBar");
                domClass.add(this.domNode, "qcddTarget");
                domClass.remove(this.domNode, "scrolling");
                domClass.add(this.domNode, this.overflowMode);

                topic.subscribe('/qc/SettingsChanged', lang.hitch(this, this.onSettingsChanged));
                topic.subscribe('/qc/WorkspaceReset', lang.hitch(this, this.onWorkspaceReset));
                topic.subscribe("/qc/ViewChanged", lang.hitch(this, this.updateDisplay));
                topic.subscribe('/qc/drawing/editStarted', lang.hitch(this, this.onDrawingStarted));
                topic.subscribe('/qc/drawing/editFinished', lang.hitch(this, this.onDrawingFinished));

                this._setTrashModeAttr(core.settings.trashCan || 'none');

                core.setSelectable(this.domNode, false);
                this.updateDisplay();
                this.resize();
                this.inherited(arguments);
            }
        },

        onDrawingStarted: function () {
            this.updateDisplay('drawing');
        },

        onDrawingFinished: function () {
            this.updateDisplay();
        },

        onSettingsChanged: function (settings) {
            this.updateDisplay();
            if (settings.taskBarDisplayMode) {
                this._setOverflowModeAttr(settings.taskBarDisplayMode);
            }
            if (settings.trashCan) {
                this._setTrashModeAttr(settings.trashCan);
            }
        },

        _getTrashModeAttr: function () {
            return this.trashMode;
        },

        _setTrashModeAttr: function (value) {
            this.trashMode = value;
            if (value == 'trashcan') {
                if (!this.trashcan) {
                    this.trashcan = domConstruct.place('<div class="trashcan"></div>', this.domNode);
                }
            } else {
                if (this.trashcan) {
                    domConstruct.destroy(this.trashcan);
                    this.trashcan = null;
                };
            }
        },

        _getOverflowModeAttr: function () {
            return this.overflowMode;
        },

        _setOverflowModeAttr: function (value) {
            if (value == 'scrolling') {
                domStyle.set(this.domNode, "overflow", "auto");
            } else {
                domStyle.set(this.domNode, "overflow", "visible");
            }

            if (this.overflowMode) {
                domClass.remove(this.domNode, this.overflowMode);
            };

            if (this.hAutoHideUpdate) {
                core.unsubscribe(this.hAutoHideUpdate);
            };

            this.overflowMode = value;
            domClass.add(this.domNode, this.overflowMode);

            if (value == 'autohide') {
                topic.subscribe('/qc/taskPaneOpen', lang.hitch(this, this._autoHide_onHeightChange));
                this.onHeightChange();
            };
        },

        onWorkspaceReset: function () {
            array.forEach(this.getChildren(), function (taskPane) {
                taskPane.set('enabled', false);
            });
        },

        updateDisplay: function (viewMode) {
            var mode = '';
            if (!viewMode) {
                var editor = query('.qcNoteEditor').map(registry.byNode)[0];
                viewMode = editor ? editor.viewMode : '';
            };
            switch (viewMode) {
                case 'drawing':
                    mode = 'drawing';
                    break;
                case 'design':
                    mode = 'design';
                    break;
                default:
                    mode = 'standard';
                    break;
            }

            array.forEach(this.getChildren(), function (taskPane) {
                if (core.settings['taskPanes_' + taskPane.get('name')] === false) {
                    taskPane.set('enabled', false);
                }
                else if (array.indexOf(core.forceArray(taskPane.modes), mode) < 0) {
                    taskPane.set('enabled', false);
                }
                else {
                    taskPane.set('enabled', true);
                }
            });

            this.mode = mode;
        },

        getDropAction: function (source, evt) {
            if (source && source.owner && core.isFunction(source.owner.dropDelete) && (this.trashMode != 'trashcan' || domClass.contains(evt.target, 'trashcan'))) {
                return 'delete';
            }
            else {
                return null;
            };
        },

        doDrop: function (source, evt) {
            if (source && source.owner && core.isFunction(source.owner.dropDelete)) {
                source.owner.dropDelete(source);
                return null;
            }
        },

        addChild: function (widget, insertIndex) {
            if (widget != null) {
                this.childPanes.push(widget);
            }
            this.inherited(arguments);
        },

        _autoHide_onHeightChange: function (pane, source) {
            if (this.overflowMode != 'autohide') {
                return;
            };

            heightSum = 0; //the total height of all the panes on the task bar.  This is being used to prevent the panes from going off the page.  
            array.forEach(this.getChildren(), function (entry, i) {
                if (!entry.background) {
                    heightSum = heightSum + domGeometry.getMarginBox(entry.domNode).h;
                }
            });

            if (pane) {
                if (array.indexOf(this.orderedPanes, pane) == -1) {
                    this.orderedPanes.push(pane);
                } else {
                    this.orderedPanes.splice(array.indexOf(this.orderedPanes, pane), 1);
                    this.orderedPanes.push(pane);
                }
            }

            if (this.overflowMode == 'autohide') {
                //This code is for proportionately resizing each panel
                //ratio = dojo.marginBox(this.domNode).h / heightSum;
                //array.forEach(this.orderedPanes, function (entry, i) {
                //console.log("Old height: " + dojo.marginBox(entry.domNode).h + " New Height: " + parseInt(dojo.marginBox(entry.domNode).h * ratio) + "px" + " at ratio: " + ratio);
                //domStyle.set(entry.domNode, "max-height", parseInt(dojo.marginBox(entry.domNode).h * ratio) + "px");
                //domStyle.set(entry.domNode, "overflow", "auto");
                //});

                count = 0;
                taskBarHeight = 0;
                try {
                    taskBarHeight = domGeometry.getMarginBox(this.domNode).h; //IE sometimes gives an error here
                } catch (err) { }
                while (heightSum > taskBarHeight) {
                    array.some(this.orderedPanes, function (entry, i) {
                        if (entry.open && !entry.keepOpen) {
                            entry._setOpenAttr(false, false);
                            return true;
                        }
                    });
                    heightSum = 0;
                    array.forEach(this.getChildren(), function (entry, i) {
                        if (!entry.background) {
                            heightSum = heightSum + domGeometry.getMarginBox(entry.domNode).h;
                        }
                    });
                    count++;
                    if (count > 20) {
                        break;
                    }
                }
            }
        }
    });
});
*/