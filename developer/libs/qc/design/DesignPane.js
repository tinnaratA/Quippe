define([
	"qc/Note",
    "dijit/_Container",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    "qc/_core",
    "qc/design/ElementNavigator",
    "qc/design/LayoutBuilder",
    "qc/design/PropertyGrid",
    "qc/TaskPane",
    "qc/design/DesignerToolbox"
], function (Note, _Container, _TemplatedMixin, _WidgetBase, registry, array, declare, event, lang, aspect, domClass, domStyle, on, query, topic, core, ElementNavigator, LayoutBuilder, PropertyGrid, TaskPane, DesignerToolbox) {
    var DesignPane = declare("qc.design.DesignPane", [_WidgetBase, _TemplatedMixin, _Container], {
        templateString: '<div class="qcDesignPane" style="display:none;width:100%;height:100%"></div>',
        title: 'Design',
        modes: ['design'],
        visible: true,
        events: null,
        subscriptions: null,
        _enabled: false,
        layoutPanel: null,
    
        _onEnabled: function () {
            if (!this._started) {
                this.startup();
            };
    
            this._onDisabled();
    
            this.editor = query('.qcNoteEditor').map(registry.byNode)[0] || null;
            if (!this.editor) {
                return;
            };
    
            if (!this.layoutPanel) {
                this._initLayout();
            };
    
            this.navigator.editor = this.editor;

            this.events = [
                aspect.after(this.toolbox, "onItemDoubleClick", lang.hitch(this, this.onToolboxItemDoubleClick), true),
                aspect.after(this.navigator, '_onavSelectionChanged', lang.hitch(this, this.onNavigatorSelectionChanged), true)
            ];

            this.subscriptions = [
                topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onNoteEditorSelectionChanged)),
                topic.subscribe("/qc/DocumentLoaded", lang.hitch(this, this.onDocumentLoaded))
            ];
    
            domStyle.set(this.domNode, { display: 'block' });
            this.layoutPanel.resize();
            this._enabled = true;
            this.onNoteEditorSelectionChanged();
        },
    
        _getEnabledAttr: function () {
            return this._enabled;
        },
        _setEnabledAttr: function (value) {
            value ? this._onEnabled() : this._onDisabled();
        },
    
        _onDisabled: function () {
            if (this.editor) {
                this.editor.clickHandler = null;
            };
    
            domStyle.set(this.domNode, { display: 'none' });
            if (this.events) {
                array.forEach(this.events, core.disconnect);
                this.events = null;
            };
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            };
            this.editor = null;
            this._enabled = false;
        },
    
        _initLayout: function () {
            this.navigator = new ElementNavigator({ allowTextEdit: true });
            this.navigator.startup();
    
            this.propertyGrid = new PropertyGrid({ navigator: this.navigator, showNavigator: true, sortProperties: false, showSections: false, showGroups: true, showTitlebar: true });
            
            this.toolbox = new DesignerToolbox();
            this.toolbox.startup();
    
            domStyle.set(this.toolbox.domNode, { fontSize: '80%', width: '100%', height: '100%', margin: '0px', padding: '0px', border: '0px' });

            var layoutInfo = {
                style: { width: '100%', height: '100%', margin: '0px', padding: '0px' },
                top: { height: '30%', splitter: true, content: this.toolbox, margin: '0px', padding: '0px', className: 'toolPanel', title: 'Toolbox' },
                center: { content: this.propertyGrid, margin: '0px', padding: '0px', className: 'toolPanel', NOTITLE_title: 'Properties' }
            };
    
            this.layoutPanel = LayoutBuilder.buildLayout(layoutInfo);
            this.layoutPanel.placeAt(this.domNode);
            this.layoutPanel.startup();
        },
    
        onNoteEditorSelectionChanged: function () {
            var elements = array.map(this.editor.selection.getSelectedWidgets(), function (x) { return x.getDesigner() }).filter(function (y) { return y != undefined && y != null });
    
            if (elements.length == 0) {
                this.propertyGrid.set('selectedObject', this.editor.note || null);
            }
            else if (elements.length == 1) {
                this.propertyGrid.set('selectedObject', elements[0]);
            }
            else {
                this.propertyGrid.set('selectedObject', elements);
            };
        },
    
        onNoteEditorSelectionChanged_ORIG: function () {
            var element = this.editor.getSelection();
            if (element) {
                this.propertyGrid.set('selectedObject', element);
            }
            else if (this.editor.note) {
                this.propertyGrid.set('selectedObject', this.editor.note);
            }
            else {
                this.propertyGrid.set('selectedObject', null);
            }
        },
    
        onNavigatorSelectionChanged: function (obj) {
            if (!obj) {
                return;
            };

            if (obj.isPlaceholder) {
                return;
            };

            if (obj.selectionCallback) {
                obj.selectionCallback(obj);
                return;
            };

            if (!obj.domNode) {
                return;
            };

            if (this.editor) {
                this.editor.select(obj);
                if (obj.partType == 'document') {
                }
                else {
                    this.editor.ensureVisible(obj.header || obj.domNode);
                }
            };
        },
    
        widgetFromToolboxItem: function (item) {
            if (!item || !item.data || !item.data.cloneNode) {
                return null;
            };
    
            var xTemplate = item.data.cloneNode(true);
            if (!xTemplate) {
                return null;
            };
    
            var widget = Note.parseXml(xTemplate);
            if (!widget) {
                return null;
            };
    
            widget.startup();
            return widget;
        },
    
        onToolboxItemDoubleClick: function (widget) {
            if (!widget) {
                return;
            };
    
            var selection = this.editor.getSelection();
            var target = null;
            if (selection) {
                switch (widget.partType || '') {
                    case 'group':
                        target = core.ancestorWidgetByClass(selection.domNode, 'section', true);
                        break;
                    case 'section':
                        target = core.ancestorWidgetByClass(selection.domNode, 'chapter', true);
                        break;
                    case 'chapter':
                        target = this.editor.note;
                        break;
                    default:
                        target = core.ancestorWidgetByClass(selection.domNode, 'part', true);
                        break;
                };
            };
            if (!target || domClass.contains(target.domNode, 'qxFindingTable')) {
                target = this.editor.note;
            };
            var e = target.addElement(widget);
            this.editor.select(e);
            target.updateDisplay();
        },
    
        resize: function () {
            if (this.layoutPanel) {
                this.layoutPanel.resize();
            };
        },

        onDocumentLoaded: function () {
            this.editor = query('.qcNoteEditor').map(registry.byNode)[0] || null;
            if (this.editor) {
                this.onNoteEditorSelectionChanged();
            }
            else {
                this.propertyGrid.set('selectedObject', null);
            }
        },

        getUserSettings: function () {
            return [
                { name: 'title' },
                { name: 'visible', caption: 'Enabled', type: 'boolean' },
                { name: 'showInShortList', caption: 'Show in short list', type: 'boolean' }
            ];
        }
    });

    core.settings.elementInspectorClass = DesignPane;

	return DesignPane;
});