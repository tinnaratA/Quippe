define([
    "qc/Label",
    "qc/MenuItem",
    "qc/ReviewPane",
    "dijit/_Contained",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/StackContainer",
    "dijit/Menu",
    "dijit/Toolbar",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/Deferred",
    "dojo/dom-class",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/topic",
    "dojo/when",
    "qc/_core"
], function (Label, MenuItem, ReviewPane, _Contained, _TemplatedMixin, _WidgetBase, Button, BorderContainer, ContentPane, StackContainer, Menu, Toolbar, array, declare, lang, Deferred, domClass, domGeometry, domStyle, topic, when, core) {
    return declare("qc.ReviewBar", [BorderContainer, _Contained], {
        design: 'headline',
        gutters: false,
        liveSplitters: false,
        minVisibleHeight: 50,
        visibleHeight: 300,
        currentAnalyzer: null,

        postCreate: function () {
            domClass.add(this.domNode, 'qcReviewBar');
            domClass.add(this.domNode, 'qcddPrevent');
            this.toolbar = new Toolbar();
            domClass.add(this.toolbar.domNode, 'toolbar ic16');
            this.toolbar.set('region', 'top');
            this.addChild(this.toolbar);

            this.contentPane = new StackContainer();
            domClass.add(this.contentPane.domNode, 'content');
            this.contentPane.set('region', 'center');
            this.addChild(this.contentPane);

            this.inherited(arguments);
        },

        startup: function () {
            if (!this._started) {
                topic.subscribe('/qc/ChartReview/OpenView', lang.hitch(this, this.openView));
                topic.subscribe('/qc/ChartReview/Show', lang.hitch(this, this.show));
                topic.subscribe('/qc/ChartReview/Hide', lang.hitch(this, this.hide));
                topic.subscribe('/qc/ChartReview/Toggle', lang.hitch(this, this.toggleVisibility));
                topic.subscribe('/qc/WorkspaceReset', lang.hitch(this, this.onWorkspaceReset));
                //topic.subscribe('/qc/DocumentLoaded', lang.hitch(this, this.hide));
                topic.subscribe('/qc/ViewChanged', lang.hitch(this, this.onViewChanged));
                this.inherited(arguments);
                this.hide();
            };
        },

        show: function () {
            if (domClass.contains(this.domNode, 'visible')) {
                return;
            };
            var h = this.visibleHeight >= this.minVisibleHeight ? this.visibleHeight : this.minVisibleHeight;
            domClass.remove(this.domNode, 'hidden');
            domClass.add(this.domNode, 'visible');
            this.resize({ h: h });
            this.contentPane.layout();

            var parent = this.getParent();
            if (parent && core.isFunction(parent.getSplitter)) {
                var splitter = parent.getSplitter('bottom');
                if (splitter) {
                    domStyle.set(splitter.domNode, 'display', 'block');
                };
                parent.layout();
            };

            topic.publish('/qc/ChartReview/VisibilityChanged', true);
        },

        hide: function () {
            if (domClass.contains(this.domNode, 'visible')) {
                var pos = domGeometry.getMarginBox(this.domNode);
                this.visibleHeight = pos.h >= this.minVisibleHeight ? pos.h : this.minVisibleHeight;
                domClass.remove(this.domNode, 'visible');
            };

            array.forEach(this.contentPane.getChildren(), function (child) {
                if (core.isFunction(child.hide)) {
                    child.hide();
                };
            });

            domClass.add(this.domNode, 'hidden');
            this.resize({ h: 0 });
            this.contentPane.layout();

            var parent = this.getParent();
            if (parent && core.isFunction(parent.getSplitter)) {
                var splitter = parent.getSplitter('bottom');
                if (splitter) {
                    domStyle.set(splitter.domNode, 'display', 'none');
                };
                parent.layout();
            };

            topic.publish('/qc/ChartReview/VisibilityChanged', false);
        },

        onWorkspaceReset: function () {
            this.hide();
            this.clearToolbar();

            array.forEach(this.contentPane.getChildren(), function (child) {
                if (core.isFunction(child.hide)) {
                    this.contentPane.removeChild(child);
                    child.destroyRecursive();
                };
            }, this);
        },

        onViewChanged: function (viewMode) {
            //if (viewMode == 'design') {
            //    this.hide();
            //};
        },

        toggleVisibility: function () {
            var pos = domGeometry.getMarginBox(this.domNode);
            if (pos.h < this.minVisibleHeight) {
                this.show();
            }
            else {
                this.hide();
            }
        },


        openView: function (parms) {
            var viewId = typeof parms == 'string' ? parms : parms.id || null;
            if (!viewId) {
                return;
            };

            var self = this;
            when(this.getViewById(viewId) || this.createView(parms), function (view) {
                if (!view) {
                    return null;
                };
                self.loadToolbar(view);
                self.contentPane.selectChild(view);
                self.show();
                if (core.isFunction(view.show)) {
                    view.show();
                };
                if (core.isFunction(view.layout)) {
                    view.layout();
                };
                return view;
            });
        },

        //openView_OLD: function (parms) {
        //    var viewId = typeof parms == 'string' ? parms : parms.id || null;
        //    if (!viewId) {
        //        return;
        //    };

        //    var view = this.getViewById(viewId) || this.createView(parms);
        //    if (!view) {
        //        return;
        //    };

        //    this.loadToolbar(view);
        //    this.contentPane.selectChild(view);

        //    this.show();

        //    if (core.isFunction(view.show)) {
        //        view.show();
        //    };

        //    if (core.isFunction(view.layout)) {
        //        view.layout();
        //    };
        //},

        getViewById: function (id) {
            return array.filter(this.contentPane.getChildren(), function (child) {
                if (child.viewId == id) {
                    return child;
                }
            })[0] || null;
        },

        createView: function (parms) {
            if (!parms.typeName) {
                return null;
            };

            var self = this;
            var deferred = new Deferred();

            // 1.9 refactor *dap*
            //return when(core.getTypeDeferred(parms.typeName), function (type) {
            //    var instance = new type(parms.instanceParms);
            //    if (instance) {
            //        instance.viewId = parms.id;
            //        self.contentPane.addChild(instance);
            //        instance.startup();
            //        return instance;
            //    };
        	//});

	        var instance;

	        require([parms.typeName], function(TypeDef) {
	            instance = new TypeDef(parms.instanceParms);
		        if (instance) {
			        instance.viewId = parms.id;
			        self.contentPane.addChild(instance);
			        instance.startup();

			        deferred.resolve();
		        }
	        });

	        return when(deferred, function() {
		        return instance;
	        });
        },

        //createView_OLD: function (parms) {
        //    if (parms.typeName) {
        //        var type = lang.getObject(parms.typeName, false);
        //        if (type) {
        //            var instance = new type(parms.instanceParms);
        //            if (instance) {
        //                instance.viewId = parms.id;
        //                this.contentPane.addChild(instance);
        //                instance.startup();
        //                return instance;
        //            };
        //        };
        //    };
        //    return null;
        //},

        clearToolbar: function () {
            array.forEach(this.toolbar.getChildren(), function (child) {
                this.toolbar.removeChild(child);
            }, this);
        },

        loadToolbar: function (view) {
            this.clearToolbar();
            if (core.isFunction(view.getToolbarItems)) {
                array.forEach(view.getToolbarItems(), function (item) {
                    this.toolbar.addChild(item);
                }, this);
            };
            var closeButton = new Button({
                label: 'Close',
                iconClass: 'xdel',
                showLabel: false,
                onClick: lang.hitch(this, this.hide)
            });
            domClass.add(closeButton.domNode, 'closeButton');
            this.toolbar.addChild(closeButton);
        }
    });
});