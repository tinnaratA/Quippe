define([
    "qc/ListView",
    "qc/MenuItem",
    "qc/TaskPane",
    "dijit/ColorPalette",
    "dijit/form/Button",
    "dijit/form/DropDownButton",
    "dijit/Menu",
    "dijit/TitlePane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/topic"
], function (ListView, MenuItem, TaskPane, ColorPalette, Button, DropDownButton, Menu, TitlePane, array, declare, lang, domClass, domConstruct, domStyle, on, query, topic) {
    return declare("qc.drawing.Toolbox", [TaskPane], {
        name: 'DrawingToolbox',
        title: 'Drawing Editor',
        modes: ['drawing'],
    
        startup: function () {
            if (!this._started) {
                domClass.add(this.domNode, 'qcDrawingToolbox');
                domClass.add(this.containerNode, 'drawingTool');
                domStyle.set(this.domNode, 'display', 'none');
    
                topic.subscribe('/qc/WorkspaceReset', lang.hitch(this, this.onEndEdit));
                topic.subscribe('/qc/drawing/editStarted', lang.hitch(this, this.onStartEdit));
                topic.subscribe('/qc/drawing/editFinished', lang.hitch(this, this.onEndEdit));
                topic.subscribe('/qc/drawing/setSelectedTool', lang.hitch(this, this.setSelectedTool));
    
                this.buildToolbox();
    
                this.inherited(arguments);
            };
        },
    
        buildToolbox: function () {

            domConstruct.place('<div class="header">Drawing Tools</div>', this.containerNode);    
            var lvDrawingTools = new ListView();
            domClass.add(lvDrawingTools.domNode, 'section');
            domConstruct.place(lvDrawingTools.domNode, this.containerNode);
            lvDrawingTools.startup();
            lvDrawingTools.multiSelect = false;
            lvDrawingTools.setViewMode("list");
            lvDrawingTools.addItem({ text: 'Pointer', icon: 'pointer', toolName: 'selection' });
            lvDrawingTools.addItem({ text: 'Pen', icon: 'pen', toolName: 'path' });
            lvDrawingTools.addItem({ text: 'Line', icon: 'line0', toolName: 'line0' });
            lvDrawingTools.addItem({ text: 'Arrow Line', icon: 'line1', toolName: 'line1' });
            lvDrawingTools.addItem({ text: 'Double Arrow Line', icon: 'line2', toolName: 'line2' });
            lvDrawingTools.addItem({ text: 'Text', icon: 'text', toolName: 'text' });
            lvDrawingTools.onItemClick = lang.hitch(this, this.onItemClick);
            this.lstTools = lvDrawingTools;

            domConstruct.place('<div class="header">Image Tools</div>', this.containerNode);
            var lvImageTools = new ListView();
            domClass.add(lvImageTools.domNode, 'section');
            domConstruct.place(lvImageTools.domNode, this.containerNode);
            lvImageTools.startup();
            lvImageTools.multiSelect = false;
            lvImageTools.setViewMode("list");
            lvImageTools.addItem({ text: 'Flip Horizontal', icon: 'flipHorizontal', toolName: 'flipHorizontal' });
            lvImageTools.addItem({ text: 'Flip Vertical', icon: 'flipVertical', toolName: 'flipVertical' });
            lvImageTools.addItem({ text: 'Rotate Left', icon: 'rotateLeft', toolName: 'rotateLeft' });
            lvImageTools.addItem({ text: 'Rotate Right', icon: 'rotateRight', toolName: 'rotateRight' });
            lvImageTools.addItem({ text: 'Crop', icon: 'crop', toolName: 'crop' });
            lvImageTools.onItemClick = lang.hitch(this, this.onItemClick);
            this.imageTools = lvImageTools;

            domConstruct.place('<div class="header">Style</div>', this.containerNode);
            var divStyle = domConstruct.place('<div class="section"></div>', this.containerNode);    
            var pStroke = new ColorPalette({ onChange: lang.hitch(this, function (value) { this.setLineColor(value) }) });
            this.cmbStrokeColor = new DropDownButton({
                label: "Line/Text Color",
                showLabel: false,
                iconClass: 'blank',
                dropDown: pStroke
            });
            domStyle.set(this.cmbStrokeColor.iconNode, 'backgroundColor', '#000000');
            domStyle.set(this.cmbStrokeColor._buttonNode, 'backgroundColor', '#ffffff');
            domStyle.set(this.cmbStrokeColor._buttonNode, 'borderRadius', '0px');
            domStyle.set(this.cmbStrokeColor.iconNode, 'margin', '0px 6px 0px 2px');
            domConstruct.place(this.cmbStrokeColor.domNode, divStyle);
    
            var mWidth = new Menu();
            var ln = 0.5;
            while (ln < 6) {
                var mi = new MenuItem();
                mi.set('label', ln.toString());
                if (ln == 1.5) {
                    mi.set('checked', true);
                }
                var fn = new Function('this.setLineWidth(' + (ln) + ');');
                mi.onClick = lang.hitch(this, fn);
                mWidth.addChild(mi);
                ln += 0.5;
            };
    
            this.cmdLineWidth = new DropDownButton({
                label: "Line Weight",
                showLabel: false,
                iconClass: "linewidth",
                dropDown: mWidth
            });
            domStyle.set(this.cmdLineWidth._buttonNode, 'backgroundColor', '#ffffff');
            domStyle.set(this.cmdLineWidth._buttonNode, 'borderRadius', '0px');
            domStyle.set(this.cmdLineWidth.iconNode, 'margin', '0px 6px 0px 2px');
            domConstruct.place(this.cmdLineWidth.domNode, divStyle);
    
            domConstruct.place('<div class="header">Actions</div>', this.containerNode);
            var lvActions = new ListView();
            domClass.add(lvActions.domNode, 'section');
            domConstruct.place(lvActions.domNode, this.containerNode);
            lvActions.startup();
            lvActions.multiSelect = false;
            lvActions.setViewMode("list");
            lvActions.addItem({ text: 'Select All', icon: 'selectAll', toolName: 'selectAll' });
            lvActions.addItem({ text: 'Delete Selected', icon: 'deleteSelection', toolName: 'deleteSelection' });
            this.undoListItem = lvActions.addItem({ text: 'Undo', icon: 'undo', toolName: 'undo' });
            lvActions.addItem({ text: 'Delete Image', icon: 'deleteImage', toolName: 'deleteImage' });
            lvActions.onItemClick = lang.hitch(this, this.onItemClick);
            this.actionTools = lvActions;

        }, 
        
        onStartEdit: function (editor) {
    
            // Do we really want to keep highlighted actions that have no ongoing effect?  If yes, then refactor below to remove repetition.

            function highlightActiveTool(particularTool) {
                particularTool.clearSelected();
                var toolName = editor.selectedTool || 'selection';
                array.forEach(particularTool.getChildren(), function (li) {
                    if (li.data.toolName === toolName) {
                        domClass.add(li.domNode, 'selected');
                    }
                });
            }

            highlightActiveTool(this.lstTools);
            highlightActiveTool(this.imageTools);
            highlightActiveTool(this.actionTools);

        },
    
        onEndEdit: function () {
        },
    
        onItemClick: function (newItem) {
            topic.publish('/qc/drawing/selectTool', newItem.data.toolName);
        },

        setSelectedTool: function (toolNameWeWantSelected) {
            var itemWeWantSelected = this.lstTools.findByData('toolName', toolNameWeWantSelected)[0]
                || this.imageTools.findByData('toolName', toolNameWeWantSelected)[0]
                || this.actionTools.findByData('toolName', toolNameWeWantSelected)[0];
            this.lstTools.setSelectedItem(itemWeWantSelected);
            this.imageTools.setSelectedItem(itemWeWantSelected);
            this.actionTools.setSelectedItem(itemWeWantSelected);
        },

        setLineColor: function (value) {
            domStyle.set(this.cmbStrokeColor.iconNode, 'backgroundColor', value);
            topic.publish("/qc/drawing/setStyle", { strokeStyle: value});
        },
    
        setLineWidth: function (value) {
            topic.publish("/qc/drawing/setStyle", { lineWidth: value});
        },

        updateUndoCaptionText: function(value) {
            if (value) {
                this.undoListItem.captionNode.innerHTML = "Undo <span style='color: #AAAAAA'>" + value + "</span>";
            } else {
                this.undoListItem.captionNode.innerHTML = "Undo";
            }
        }
    
    });
});