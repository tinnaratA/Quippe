//deprecated

//define([
//    "dijit/form/Button",
//    "dijit/form/CheckBox",
//    "dijit/form/DropDownButton",
//    "dijit/form/Select",
//    "dijit/form/TextBox",
//    "dijit/registry",
//    "dijit/TitlePane",
//    "dojo/_base/array",
//    "dojo/_base/declare",
//    "dojo/_base/lang",
//	"dojo/aspect",
//    "dojo/dom-class",
//    "dojo/dom-construct",
//    "dojo/dom-geometry",
//    "dojo/dom-style",
//    "dojo/NodeList",
//    "dojo/on",
//    "dojo/query",
//    "dojo/topic",
//    "qc/_core",
//    "qc/design/ElementTree",
//    "qc/DropDownTextBox",
//    "qc/FilteringSelect",
//    "qc/SettingsEnumStore",
//    "qc/TaskPane",
//	"qc/StringUtil"
//], function (Button, CheckBox, DropDownButton, Select, TextBox, registry, TitlePane, array, declare, lang, aspect, domClass, domConstruct, domGeometry, domStyle, NodeList, on, query, topic, core, ElementTree, DropDownTextBox, FilteringSelect, SettingsEnumStore, TaskPane, StringUtil) {
//	var ElementInspector = declare("qc.design.ElementInspector", [TaskPane], {
//        name: 'ElementInspector',
//        title: 'Element Properties',
//        modes: ['design'],
//        propertyGroup: '',
//        editor: null,
    
//        startup: function () {
//            if (!this._started) {
//                domClass.add(this.domNode, 'qcDesignerTaskPane');
//                domClass.add(this.domNode, 'qcElementInspector');
//                domClass.add(this.domNode, 'sealed');
    
//                var navLine = domConstruct.create('div');
//                domClass.add(navLine, 'item');
//                domConstruct.place('<div class="itemLabel">Element:</div>', navLine);
    
//                this.editBox = domConstruct.place('<div class="editBox basic" />', this.containerNode);
    
//                //this.navBox = new DropDownButton({ label: 'Document' });
//                this.navBox = new DropDownTextBox({ value: 'Document', allowTextEdit: false });
//                domStyle.set(this.navBox.domNode, { marginLeft: '4px' });
//                domConstruct.place(this.navBox.domNode, navLine);
//                domConstruct.place(navLine, this.editBox);
    
//                this.viewLink = domConstruct.place('<div class="viewLink">Advanced</div>', this.containerNode);
//                on(this.viewLink, "click", lang.hitch(this, this.toggleEditView));
    
//                this.inherited(arguments);
//            };
//        },
    
//        _onEnabled: function () {
//            if (!this._started) {
//                this.startup();
//            };
//            this.editor = query('.qcNoteEditor').map(registry.byNode)[0] || null;
//            if (!this.editor) {
//                return;
//            };
    
//            this.navBox.editor = this.editor;
//            if (!this.navTree) {
//                this.navTree = new ElementTree();
//                domStyle.set(this.navTree.domNode, { backgroundColor: '#ffffff', fontSize: '90%', border: '1px solid #999999', height: '200px' });
//                this.navBox.dropDown = this.navTree;
//                this.navTree.startup();
    
//            }
//            this.navTree.attach(this.editor);
    
//            if (!this.events) {
//                this.events = [
//                    aspect.after(this.navTree, "onNodeClick", lang.hitch(this, this.onTreeNodeClick), true)
//                ];
//            };
    
//            if (!this.subscriptions) {
//                this.subscriptions = [
//                    topic.subscribe('/noteEditor/SelectionChanged', lang.hitch(this, this.onSelectionChanged))
//                ];
//            };
    
    
//            this.showProperties(this.editor.getSelection() || this.editor.note || null);
//        },
    
//        _onDisabled: function () {
//            if (this.events) {
//                array.forEach(this.events, core.disconnect);
//                this.events = null;
//            };
//            if (this.subscriptions) {
//                array.forEach(this.subscriptions, core.unsubscribe);
//                this.subscriptions = null;
//            };
//            if (this.navTree) {
//                this.navTree.detach();
//            }
//            this.editor = null;
//        },
    
//        getElement: function (domNode) {
//            return new NodeList(domNode).closest('.noteElement').map(registry.byNode)[0] || null;
//        },
    
//        onSelectionChanged: function () {
//            var element = this.editor ? this.editor.getSelection() : null;
//            if (element) {
//                this.navTree.expandToElement(element);
//            };
//            this.showProperties(element);
//        },
    
//        onTreeNodeClick: function (node, evt) {
//            if (!domClass.contains(evt.target, "expander")) {
//                this.navBox.closeDropDown();
//                if (node.data && node.data.domNode) {
//                    if (domClass.contains(node.data.domNode, 'document')) {
//                        this.editor.clearSelection();
//                        this.editor.navigateToTop();
//                        this.showProperties(node.data);
//                    }
//                    else {
//                        this.editor.select(node.data);
//                        this.editor.ensureVisible(node.data.domNode);
//                    };
//                };
//            };
//        },
    
//        clear: function () {
//            if (this.editorEvents) {
//                array.forEach(this.editorEvents, core.disconnect);
//                this.editorEvent = null;
//            };
//            query('.elementProperty', this.editBox).forEach(domConstruct.destroy);
//            this.navBox.set('value', '');
//        },
    
//        showProperties: function (element) {
//            this.clear();
    
//            if (!(element && core.isFunction(element.getDesignerProperties))) {
//                return;
//            };
    
//            var props = element.getDesignerProperties();
//            if (!props || props.length == 0) {
//                return;
//            };
    
//            this.navBox.set('value', this.getElementLabel(element));
    
//            this.editorEvents = [];
//            var self = this;
//            var boolStore = new SettingsEnumStore('[true=True;false=False]');
//            array.forEach(props, function (item) {
//                if (!item.hidden) {
//                    var itemContent = domConstruct.create('div');
//                    domClass.add(itemContent, 'item');
//                    domClass.add(itemContent, 'elementProperty');
//                    if (item.isAdvanced) {
//                        domClass.add(itemContent, 'advancedProperty');
//                    };
//                    lbl = domConstruct.create('div');
//                    domClass.add(lbl, 'itemLabel');
//                    if (!item.caption) {
//                        item.caption = StringUtil.makeCaption(item.propertyName);
//                    }
//                    lbl.innerHTML = item.caption + ':';
//                    domConstruct.place(lbl, itemContent);
    
//                    box = domConstruct.create('div')
//                    domClass.add(box, 'itemValueBox');
//                    domConstruct.place(box, itemContent);
    
//                    if (item.enumSource) {
//                        var store = new SettingsEnumStore(item.enumSource);
//                        ctl = new FilteringSelect({ searchAttr: 'text', store: store });
//                        ctl.set('value', element.getDesignerPropertyValue(item.propertyName));
//                    }
//                    else {
//                        switch (item.type) {
//                            case 'boolean':
//                                ctl = new CheckBox();
//                                ctl.set('checked', element.getDesignerPropertyValue(item.propertyName));
//                                break;
//                            default:
//                                ctl = new TextBox();
//                                ctl.set('value', element.getDesignerPropertyValue(item.propertyName));
//                                break;
//                        };
//                    };
    
//                    var setter = {
//                        itemData: item,
//                        element: element,
//                        owner: self,
//                        onChange: function (value) {
//                            this.element.setDesignerPropertyValue(item.propertyName, value);
//                        }
//                    };
    
//                    if (item.readOnly) {
//                        ctl.set('disabled', true);
//                    };
    
//                    domClass.add(ctl.domNode, 'itemValue');
//                    ctl.itemData = item;
//                    ctl.sourceElement = element;
    
//                    domConstruct.place(ctl.domNode, box);
//                    ctl.startup();
//                    domConstruct.place(itemContent, self.editBox);
//                    self.editorEvents.push(on(ctl, "Change", lang.hitch(setter, setter.onChange)));
//                };
//            });
//        },
    
//        getElementLabel: function (element) {
//            return StringUtil.joinPhrases([
//                (StringUtil.toCamelUpper(element.partType) || element.elementName || 'Element'),
//                (element.name || element.get('text') || '')
//            ], ':', ':').substr(0, 30);
    
    
//            //return (element.get('text') || StringUtil.toCamelUpper(element.partType) || element.elementName || 'Element').substr(0, 30);
    
//            //        var text = element.get('text');
//            //        if (element.partType) {
//            //            return element.partType + (text ? ':' + text : '');
//            //        }
//            //        else {
//            //            return element.id + (text ? ' (' + text + ')' : '');
//            //        }
//        },
    
//        toggleEditView: function () {
//            if (domClass.contains(this.editBox, 'basic')) {
//                domClass.remove(this.editBox, 'basic');
//                domClass.add(this.editBox, 'advanced');
//                this.viewLink.innerHTML = 'Basic';
//            }
//            else {
//                domClass.remove(this.editBox, 'advanced');
//                domClass.add(this.editBox, 'basic');
//                this.viewLink.innerHTML = 'Advanced';
//            }
//            this.resize();
//        },
    
//        resize: function() {
//            //this.inherited(arguments);
    
//            var taskBar = core.ancestorWidgetByClass(this.domNode, 'qcTaskBar');
//            if (!taskBar) {
//                return;
//            };
    
//            var taskBarHeight = domGeometry.position(taskBar.domNode).h || 0;
//            if (taskBarHeight > 100) {
//                var posThis = domGeometry.position(this.domNode);
//                var posTitle = domGeometry.position(this.titleBarNode);
//                var maxHeight = taskBarHeight - posThis.y - posTitle.h - 52;
//                if (maxHeight > 100) {
//                    domStyle.set(this.containerNode, {maxHeight:  maxHeight + 'px', overflow: 'auto'});
//                };
//            };
//        }
    
    
//	});

//	core.settings.elementInspectorClass = ElementInspector;

//	return ElementInspector;
//});