define([
    "dijit/_Container",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/on",
    "dojo/text!samples/templates/Browser.htm",
    "dojo/when",
    "dojo/hash",
    "dojo/topic",
    "dojo/io-query",
    "dojo/query",
    "dojo/request",
    "dijit/registry",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "qc/_core",
    "qc/TreeView",
    "samples/ViewSourceDialog"
], function (_Container, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Button, BorderContainer, ContentPane, TabContainer, array, declare, event, lang, aspect, on, BrowserTemplate, when, hash, topic, ioQuery, query, request, registry, domGeometry, domClass, core, TreeView, ViewSourceDialog) {
    return declare("samples.Browser", [_WidgetBase, _TemplatedMixin, _Container, _WidgetsInTemplateMixin], {
        templateString: BrowserTemplate,

        docPath: '.',
        trackHistory: true,
        topicHistory: [],
        pHist: -1,
        tocTree: null,
        suppressAutoScroll: false,
        tocRoot: null,
        tocData: {
            title: "Samples",
            content: "Welcome.htm",
            children: [
                {
                    title: "Customizing the Quippe Workspace",
                    content: "about:blank",
                    children: [
                        {
                            title: "Setting Up Your Application",
                            content: "ApplicationSetup.htm",
                            files: [
                                "/libs/samples/templates/ApplicationSetup.htm",
                                "/libs/samples/CustomContextMenuApp.js"
                            ]
                        },
                        {
                            title: "Customizing the Toolbar",
                            content: "ToolbarCustomization.htm",
                            files: [
                                "/libs/samples/templates/ToolbarCustomization.htm",
                                "/libs/samples/CustomToolbarApp.js"
                            ]
                        },
                        {
                            title: "Creating a Custom Task Pane",
                            content: "CustomTaskPane.htm",
                            files: [
                                "/libs/samples/templates/CustomTaskPane.htm",
                                "/libs/samples/FindingDetailsTaskPane.js",
                                "/libs/samples/CustomTaskPaneApp.js"
                            ]
                        }
                    ]
                },
                {
                    title: "Loading Content Outside of Quippe",
                    content: "ContentOutsideQuippe.htm",
                    files: [ 
                        "/libs/samples/templates/ContentOutsideQuippe.htm"
                    ]
                },
                {
                    title: "Viewing and Editing Notes Outside of Quippe",
                    content: "NotesOutsideQuippe.htm",
                    files: [ 
                        "/libs/samples/templates/NotesOutsideQuippe.htm"
                    ]
                },
                {
                    title: "Adding Custom Properties to Note Elements",
                    content: "CustomNoteProperties.htm",
                    files: [
                        "/libs/samples/templates/CustomNoteProperties.htm",
                        "/libs/samples/ShortcutKeys.js"
                    ]
                },
                {
                    title: "Creating Custom Note Elements",
                    content: "CustomNoteElement.htm",
                    files: [
                        "/libs/samples/templates/CustomNoteElement.htm",
                        "/libs/samples/ReferenceLink.js",
                        "/libs/samples/Application.js"
                    ]
                },
                {
                    title: "Incorporating External Patient Data",
                    content: "ExternalPatientData.htm",
                    files: [
                        "/libs/samples/templates/ExternalPatientData.htm",
                        "/libs/samples/LabResultsForDXPrompt.js"
                    ]
                },
                {
                    title: "Extending the Template Checker",
                    content: "ExtendingTheTemplateChecker.htm",
                    files: [
                        "/libs/samples/templates/ExtendingTheTemplateChecker.htm"
                    ]
                },
                {
                    title: "Customizing Clinical Lens",
                    content: "about:blank",
                    children: [
                        {
                            title: "Setting Up Your Application",
                            content: "ClinicalLensSetup.htm",
                            files: [
                                "/libs/samples/templates/ClinicalLensSetup.htm",
                                "/libs/samples/CustomLensCategoriesApp.js"
                            ]
                        },
                        {
                            title: "Customizing the Appearance of Findings",
                            content: "CustomLensFindings.htm",
                            files: [
                                "/libs/samples/templates/CustomLensFindings.htm",
                                "/libs/samples/CustomLensFindingsApp.js"
                            ]
                        }
                    ]
                }
            ]
        },

        startup: function () {
            if (!this._started) {
                this._started = true;

                aspect.after(this.navTree, "onNodeClick", lang.hitch(this, this.onTreeNodeClick), true);
                this.inherited(arguments);

                this.loadToc();
                
                var locationComponents = {};

                if (hash()) {
                    locationComponents = ioQuery.queryToObject(decodeURIComponent(hash()));
                }

                if (locationComponents.topic) {
                    this.onHashChange(hash());
                }

                else {
                    this.showTopic(this.tocData);
                }

                topic.subscribe("/dojo/hashchange", lang.hitch(this, this.onHashChange));
            }
        },

        onViewSourceClicked: function() {
            var viewSourceDialog = new ViewSourceDialog({
                files: this.navTree.selectedNode.data.files,
                hljs: this.hljs
            });

            viewSourceDialog.startup();
            viewSourceDialog.show();
        },

        addTocItem: function(item, parentNode) {
            var currentNode = parentNode.addItem({
                text: item.title,
                content: item.content,
                files: item.files,
                icon: "noIcon"
            });

            domClass.add(currentNode.domNode, "topic_" + item.content.replace(".", "_"));

            if (item.children) {
                for (var i = 0; i < item.children.length; i++) {
                    this.addTocItem(item.children[i], currentNode);
                }
            }
        },

        loadToc: function () {
            this.addTocItem(this.tocData, this.navTree);
        },

        onHashChange: function (locationHash) {
            if (this.getLocationHash() == locationHash) {
                return;
            }

            var currentLocation = this.getLocation();
            var locationComponents = ioQuery.queryToObject(decodeURIComponent(locationHash));
            this.topicIFrame.contentWindow.location.replace(this.getTopicUrl(locationComponents.topic, locationComponents.section));

            if (currentLocation.topic.indexOf("#") != -1 && locationComponents.topic.indexOf("#") != -1 && currentLocation.topic.substring(0, currentLocation.topic.indexOf("#")) == locationComponents.topic.substring(0, locationComponents.topic.indexOf("#"))) {
                this.onTopicIFrameLoad();
            }
        },

        getLocationHash: function () {
            return encodeURIComponent(ioQuery.objectToQuery(this.getLocation()));
        },

        getLocation: function () {
            var parser = document.createElement('a');
            parser.href = this.topicIFrame.contentWindow.location.href;

            var topicId = parser.pathname.substring(parser.pathname.lastIndexOf("/") + 1).replace(".", "_");

            var locationHash = {
                topic: topicId + parser.hash
            };

            if (this.tocRoot) {
                locationHash.tocRoot = this.tocRoot;
            }

            return locationHash;
        },

        onTopicIFrameLoad: function (evt) {
            if (this.topicIFrame.contentWindow.location.href == "about:blank") {
                this.viewSourceButton.set("disabled", true);
                this.suppressAutoScroll = false;
                return;
            }

            var locationComponents = this.getLocation();

            if (this._started && hash() != this.getLocationHash()) {
                hash(this.getLocationHash(), true);
            }

            if (this._started) {
                var topicNode = query(".topic_" + locationComponents.topic.replace("#", "_"));
                var currentTreeNodeWidget = registry.getEnclosingWidget(topicNode[0].parentNode);

                while (currentTreeNodeWidget && domClass.contains(currentTreeNodeWidget.domNode, "qcTreeNode")) {
                    currentTreeNodeWidget.expand();
                    currentTreeNodeWidget = registry.getEnclosingWidget(currentTreeNodeWidget.domNode.parentNode);
                }

                this.navTree.select(registry.byNode(topicNode[0]));

                if (!this.suppressAutoScroll) {
                    var scrollPosition = domGeometry.position(topicNode[0]);
                    this.navTree.domNode.parentNode.scrollTop = scrollPosition.y + this.navTree.domNode.parentNode.scrollTop - domGeometry.position(this.navTree.domNode.parentNode).y - 30;
                }

                this.topicIFrame.contentWindow.focus();
                this.suppressAutoScroll = false;

                this.viewSourceButton.set("disabled", !this.navTree.selectedNode.data.files || this.navTree.selectedNode.data.files.length == 0);
            }
        },

        onTreeNodeClick: function (tNode) {
            this.showTopic(tNode.data);
        },

        getTopicUrl: function (topicId) {
            if (topicId == "about:blank") {
                return topicId;
            }

            return "/libs/samples/templates/" + topicId.replace(/_htm$/, '.htm');
        },

        showTopic: function (topic) {
            if (!topic) {
                return;
            };

            var currentLocation = this.getLocation();

            this.suppressAutoScroll = true;
            this.topicIFrame.setAttribute('src', this.getTopicUrl(topic.content));

            if (currentLocation.topic.indexOf("#") != -1 && topic.content.indexOf("#") != -1 && currentLocation.topic.substring(0, currentLocation.topic.indexOf("#")) == topic.content.substring(0, topic.content.indexOf("#"))) {
                this.onTopicIFrameLoad();
            }
        },

        onSearchClick: function () {
            this.searchBox.onDoSearch();
        }
    });
});