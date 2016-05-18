define([
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-style",
    "qc/MedcinTree",
    "qc/StringUtil"
], function (BorderContainer, ContentPane, TabContainer, array, declare, lang, domClass, domStyle, MedcinTree, StringUtil) {
    var LayoutBuilder = declare("qc.design.LayoutBuilder", [], {
        buildApp: function (layout, parentNode) {
            domStyle.set(document.documentElement, { height: '100%' });
            domStyle.set(document.body, { height: '100%', margin: '0px' });
            domClass.add(document.body, 'claro');
            if (!layout.className) {
                layout.className = 'page';
            };
            var app = this.buildLayout(layout);
            domStyle.set(app.domNode, { width: '100%', height: '100%', margin: '0px', padding: '0px' });
            app.placeAt(parentNode || document.body);
            app.startup();
            return app;
        },
    
        buildLayout: function (layout) {
            var layoutProperties = ['name', 'type'];
            var regionProperties = ['top', 'bottom', 'left', 'right', 'center'];
            var typeName = 'dijit/layout/ContentPane';
    
            var settings = {
                style: {
                    margin: '0px',
                    padding: '0px'
                }
            };
    
            var localName = '';
            var classNames = [];
            var tabList = null;
    
            if (!layout._isTabPage && layout.title && !(layout.top || layout.left || layout.right || layout.bottom)) {
                layout.top = { content: layout.title, style: { height: '12px', backgroundColor: '#efefef', fontSize: '8.25pt', padding: '2px', margin: '0px', borderBottom: '1px solid #B5BCC7' }, splitter: false };
                layout.center = { padding: '0px', margin: '0px' };
                if (layout.content) {
                    layout.center.content = layout.content;
                    layout.content = null;
                };
                layout.title = '';
                layout.gutters = false;
            };
    
            for (var p in layout) {
                switch (p) {
                    case 'name':
                        localName = layout[p];
                        break;
                    case 'type':
                    	typeName = layout[p].replace(/\./g, "/");
                        break;
                    case 'top':
                    case 'bottom':
                        typeName = 'dijit/layout/BorderContainer';
                        settings.design = 'headline';
                        break;
                    case 'left':
                    case 'right':
                        typeName = 'dijit/layout/BorderContainer';
                        settings.design = 'sidebar';
                        break;
                    case 'center':
                        typeName = 'dijit/layout/BorderContainer';
                        break;
                    case 'tabs':
                        typeName = 'dijit/layout/TabContainer';
                        tabList = layout[p];
                        break;
                    case 'className':
                        classNames.push(layout[p]);
                        break;
                    case 'width':
                    case 'height':
                    case 'margin':
                    case 'padding':
                    case 'backgroundColor':
                        if (!settings.style) {
                            settings.style = {};
                        };
                        settings.style[p] = layout[p];
                        break;
                    case 'content':
                        break;
                    case 'style':
                        if (!settings.style) {
                            settings.style = layout[p];
                        }
                        else {
                            for (var s in layout[p]) {
                                settings.style[s] = layout[p][s];
                            }
                        }
                        break;
					// TODO: *las* need to figure out what to do with this
                    //case 'collapsible':
                    //    if (layout.collapsible) {
                    //        settings._splitterClass = CollapsibleSplitter;
                    //    };
    
                    default:
                        settings[p] = layout[p];
                        break;
                };
            };

	        var type = require(typeName);
            if (!type) {
                throw ('Type not found: ' + typeName);
            };
    
            var instance = new type(settings);
            if (!instance) {
                throw ("Can't create instance of: " + typeName);
            };
    
            if (layout.region) {
                classNames.push(layout.region);
            };

            array.forEach(classNames, function (className) { domClass.add(instance.domNode, className) });
    
            var childLayout = null;
            var childName = '';
            var child = null;
    
            array.forEach(['top', 'left', 'center', 'right', 'bottom'], function (region) {
                childLayout = layout[region];
                if (childLayout) {
	                if (childLayout instanceof Array) {
						for (var i = 0; i < childLayout.length; i++) {
							childName = childLayout[i].name || (region + 'Pane');
							childLayout[i].region = region;
							child = this.buildLayout(childLayout[i]);
							instance.addChild(child);
							instance[childName] = child;
						}
	                }

	                else {
		                childName = childLayout.name || (region + 'Pane');
		                childLayout.region = region;
		                child = this.buildLayout(childLayout);
		                instance.addChild(child);
		                instance[childName] = child;
	                }
                };
            }, this);
    
            if (tabList) {
                for (var tabName in tabList) {
                    childLayout = tabList[tabName];
                    childLayout._isTabPage = true;
                    childLayout.title = childLayout.title || StringUtil.makeCaption(tabName);
                    child = this.buildLayout(childLayout);
                    instance.addChild(child);
                    instance[tabName] = child;
                };
            };
    
            if (layout.content) {
                instance.set('content', layout.content);
            };
    
            return instance;
        }
    });

	var singleton = new LayoutBuilder();
	
	lang.setObject("qc.design.LayoutBuilder", singleton);

    return singleton;
});