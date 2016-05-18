define([
    "dijit/layout/BorderContainer",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/on",
    "qc/_core"
], function (BorderContainer, array, declare, event, lang, aspect, domClass, domConstruct, domGeometry, domStyle, on, core) {
	return declare("qc.CollapsibleSplitter", [BorderContainer._Splitter], {
        savedSize: 0,
        savedDimension: '',
        collapsed: false,
        isLeading: false,
        longSide: 40,
        shortSide: 12,
        blend: true,
        splitterSize: 5,
    
        buildRendering: function () {
            this.inherited(arguments);

            this.splitButton = domConstruct.create('div');
            domClass.add(this.splitButton, 'qcSplitButton');
    
            if (this.horizontal) {
                this.savedDimension = 'height';
                domClass.add(this.splitButton, 'horizontal');
            }
            else {
                this.savedDimension = 'width';
                domClass.add(this.splitButton, 'vertical');
            };
    
            switch (this.region) {
                case 'left':
                case 'top':
                case 'leading':
                    domClass.add(this.splitButton, 'leading');
                    this.isLeading = true;
                    break;
                case 'right':
                case 'bottom':
                case 'trailing':
                default:
                    domClass.add(this.splitButton, 'trailing');
                    this.isLeading = false;
                    break;
            };

            if (this.blend) {
                domClass.add(this.splitButton, 'blend');
            };

            domConstruct.place('<div class="buttonImage"></div>', this.splitButton);
            domConstruct.place(this.splitButton, this.container.domNode);
    
            //on(this.splitButton, "click", lang.hitch(this, this.onSplitButtonClick));
    
            if (core.util.isTouchDevice()) {
                on(this.splitButton, "touchstart", lang.hitch(this, this.onSplitButtonClick));
                this.shortSide = 24;
                this.longSide = 40;
                this.splitterSize = 12;
            }
            else {
                on(this.splitButton, "click", lang.hitch(this, this.onSplitButtonClick));
                this.shortSide = 12;
                this.longSide = 40;
                this.splitterSize = 5;
            };
    
            aspect.after(this.container, '_layoutChildren', lang.hitch(this, this.onResize), true);
            this.onResize();
        },
    
        onResize: function () {
    
            if (!this.centerPane) {
                this.centerPane = array.filter(this.container.getChildren(), function (child) { return child.region == "center"; })[0];
            };
            if (!this.centerPane) {
                return;
            };
    
            var posContainer = domGeometry.position(this.container.domNode);
            var posCenter = domGeometry.position(this.centerPane.domNode);
            var posChild = domGeometry.position(this.child.domNode);
    
            var ox = posCenter.x - posContainer.x;
            var oy = posCenter.y - posContainer.y;
            var x = 0;
            var y = 0;
            var splitterSize = this.collapsed ? -1 : this.splitterSize;        
            var blendOffset = this.blend ? this.collapsed ? 1 : 0 : 1;

            if (this.horizontal) {
                x = posCenter.w / 2 - this.longSide / 2;
                if (this.isLeading) {
                    y = oy - splitterSize - blendOffset;
                }
                else {
                    y = oy + posCenter.h + splitterSize - this.shortSide - blendOffset;
                };
            }
            else {
                y = posCenter.h / 2 - this.longSide / 2;
                if (this.isLeading) {
                    x = ox - splitterSize - blendOffset;
                }
                else {
                    x = ox + posCenter.w + splitterSize - this.shortSide - blendOffset;
                };
            };
    
            domStyle.set(this.splitButton, { left: x + 'px', top: y + 'px' });
        },
    
    
        onResize_ORIG: function () {
            if (!this.centerPane) {
                this.centerPane = array.filter(this.container.getChildren(), function (child) { return child.region == "center"; })[0];
            };
            if (!this.centerPane) {
                return;
            };
            var pos = domGeometry.position(this.centerPane.domNode);
            var x = 0;
            var y = 0;
            var splitterSize = 5;
            var offset = this.shortSide + splitterSize;
    
            if (this.horizontal) {
                x = (pos.w / 2) - (this.longSide / 2);
                if (this.isLeading) {
                    y = -offset
                }
                else {
                    y = pos.h + offset;
                };
            }
            else {
                y = (pos.h / 2) - (this.longSide / 2);
                if (this.isLeading) {
                    x = -offset;
                }
                else {
                    x = (pos.w + splitterSize) - (this.shortSide + 1);
                };
            };
            domStyle.set(this.splitButton, { left: x + 'px', top: y + 'px' });
        },
    
        onSplitButtonClick: function (evt) {
            event.stop(evt);
            this.toggleExpansion();
        },
    
        toggleExpansion: function () {
            if (this.collapsed) {
                this.expand();
            }
            else {
                this.collapse();
            }
        },
    
        collapse: function () {
        	var pos = domGeometry.position(this.child.domNode);
            if (this.horizontal) {
                this.savedSize = pos.h;
                domStyle.set(this.child.domNode, { display: 'none', height: '0px' });
                domStyle.set(this.domNode, { height: '0px' });
            }
            else {
                this.savedSize = pos.w;
                domStyle.set(this.child.domNode, { display: 'none', width: '0px' });
                domStyle.set(this.domNode, { width: '0px' });
            }
            domClass.add(this.splitButton, 'collapsed');
            this.collapsed = true;
            this.container.resize();
        },
    
        expand: function () {
            if (this.horizontal) {
                domStyle.set(this.child.domNode, { display: '', height: this.savedSize + 'px' });
                domStyle.set(this.domNode, { height: '' });
            }
            else {
                domStyle.set(this.child.domNode, { display: '', width: this.savedSize + 'px' });
                domStyle.set(this.domNode, { width: '' });
            };
            domClass.remove(this.splitButton, 'collapsed');
            this.collapsed = false;
            this.container.resize();
        }
    });
});