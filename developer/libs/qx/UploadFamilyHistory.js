define([
    "dijit/_WidgetsInTemplateMixin",
    "dijit/MenuSeparator",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/request",
    "dojo/request/iframe",
    "dojo/topic",
    "dojo/when",
    "qc/_core",
    "qc/CheckList",
    "qc/Dialog",
    "qc/MenuItem",
    "qc/Note",
    "qc/Transcriber",
    "dojo/text!qx/templates/UploadFamilyHistoryDialog.htm",
    "dojo/text!qx/templates/SearchDialog.htm"
], function (_WidgetsInTemplateMixin, MenuSeparator, registry, array, lang, declare, domClass, domConstruct, domStyle, on, query, request, iframe, topic, when, core, CheckList, Dialog, MenuItem, Note, Transcriber, UploadFamilyHistoryDialogTemplate, SearchDialogTemplate) {
    var searchDialog = declare("qx.SearchDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: 'Search',
        templateString: SearchDialogTemplate,

        startup: function() {
            if (!this._started) {
                this.searchBox._searchControl = this.searchResults;

                this.searchBox.openPopup = lang.hitch(this.searchBox, function() {
                    if (!this._isOpen) {
                        domStyle.set(this._searchControl.domNode, "display", "block");
                        this._isOpen = true;
                    }
                });

                this.searchResults.oNodeDoubleClick = lang.hitch(this, function(item) {
                    when(this.execute(item), lang.hitch(this, function() {
                        this.destroy();
                    }));
                });

                this.inherited(arguments);
            };
        },

        execute: function(item) {
            
        }
    });

    var uploadFamilyHistoryDialog = declare("qx.UploadFamilyHistoryDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: 'Upload Family History',
        templateString: UploadFamilyHistoryDialogTemplate,
        currentPage: 1,
        findingWidgets: [],

        startup: function () {
            if (!this._started) {
                this.inherited(arguments);
            };
        },

        onPreviousClick: function() {
            this.cmdNext.set("label", "Next");
            this.cmdPrevious.set("disabled", true);

            domStyle.set(this.page1, "display", "block");
            domStyle.set(this.page2.domNode, "display", "none");

            this.currentPage--;
        },

        onNextClick: function () {
            if (this.currentPage == 1) {
                this.cmdNext.set("disabled", true);
                this.cmdNext.set("label", "Processing...");

                var self = this;

                iframe.post(core.serviceURL('HL7/CDA/GetFindings?DataFormat=XML&PatientId=' + core.Patient.id), {
                    form: this.uploadForm,
                    handleAs: "xml"
                }).then(function (data) {
                    if (data.documentElement.tagName == 'Error') {
                        core.showError(data.documentElement.getAttribute("Message"));
                    }

                    else {
                        self.cmdNext.set("label", "Finish");
                        self.cmdPrevious.set("disabled", false);
                        self.cmdNext.set("disabled", false);
                        self.findingsCheckList.clear();

                        self.findingWidgets = [];

                        array.forEach(data.documentElement.childNodes, function (childNode) {
                            if (childNode.nodeType == 1) {
                                childNode.setAttribute("Type", "FindingLabel");

                                var findingWidget = Note.parseXml(childNode);
                                findingWidget.transcribe({});
                                findingWidget.type = "finding";

                                var index = self.findingWidgets.length;
                                var checkbox = self.findingsCheckList.addItem(index, findingWidget.get("text"), false);

                                if (findingWidget.get("medcinId") == 0) {
                                    var checkboxLabel = checkbox.domNode.nextSibling;

                                    domConstruct.create("span", { innerHTML: " (" }, checkboxLabel);

                                    var resolveLink = domConstruct.create("a", { href: "javascript:void(0);", innerHTML: "resolve unmapped finding" }, checkboxLabel);
                                    on(resolveLink, "click", lang.hitch(this, function () {
                                        this.resolvingItem = resolveLink;

                                        var dialog = new searchDialog({
                                            title: "Resolve Unmapped Finding",
                                            execute: function (resolvedItem) {
                                                return request(core.serviceURL("Quippe/NoteBuilder/Resolve"), {
                                                    handleAs: "json",
                                                    query: {
                                                        MedcinId: resolvedItem.data.id,
                                                        Prefix: findingWidget.get("prefix"),
                                                        Culture: core.settings.culture,
                                                        DataFormat: "JSON",
                                                        PatientId: (core.Patient ? core.Patient.id : '')
                                                    },
                                                    preventCache: true
                                                }).then(function (data) {
                                                    var resolvedFindingWidget = core.createFindingEntry(data.term);

                                                    resolvedFindingWidget.transcribe({});
                                                    resolvedFindingWidget.type = "finding";
                                                    resolvedFindingWidget.codes = findingWidget.codes;

                                                    self.findingWidgets[index] = resolvedFindingWidget;

                                                    checkbox.set("disabled", false);
                                                    checkboxLabel.innerHTML = resolvedFindingWidget.get("text");
                                                    domClass.remove(checkbox.domNode.parentNode, "disabled");
                                                }, function (err) {
                                                    core.showError(err);
                                                });
                                            }
                                        });

                                        dialog.startup();
                                        dialog.show();
                                    }));

                                    domConstruct.create("span", { innerHTML: ")" }, checkboxLabel);

                                    checkbox.set("disabled", true);
                                    domClass.add(checkbox.domNode.parentNode, "disabled");
                                }

                                self.findingWidgets.push(findingWidget);
                            }
                        });

                        domStyle.set(self.page1, "display", "none");
                        domStyle.set(self.page2.domNode, "display", "block");
                        self.page2.resize();

                        self.currentPage++;
                    }
                }, function (err) {
                    core.showError(err);
                    self.cmdNext.set("disabled", false);
                });
            }

            else {
                var items = [];

                array.forEach(this.findingsCheckList.getItems(), lang.hitch(this, function(item) {
                    if (item.checked) {
                        this.findingWidgets[item.id].set("result", "A");
                        items.push(this.findingWidgets[item.id].toFinding());
                        topic.publish("/qc/AddToNote", this.findingWidgets[item.id], null, null, true);
                    }
                }));

                if (items.length > 0) {
                    topic.publish("/qc/AddToNote", {
                        type: "list",
                        id: "FamilyHistory",
                        text: "Family History Upload",
                        item: items
                    });
                }

                this.destroy();
            }
        },

        onSelectAllClick: function() {
            query(".dijitCheckBox", this.findingsCheckList.domNode).map(registry.byNode).map(function (checkbox) {
                if (!checkbox.get("disabled")) {
                    checkbox.set("checked", true);
                }
            });
        },

        onSelectNoneClick: function() {
            query(".dijitCheckBox", this.findingsCheckList.domNode).map(registry.byNode).map(function (checkbox) {
                if (!checkbox.get("disabled")) {
                    checkbox.set("checked", false);
                }
            });
        },

        onCancelClick: function () {
            this.destroy();
        },

        onFileNameChange: function() {
            this.cmdNext.set("disabled", this.fileName.value ? false : true);
        }
    });

    var hLoad = topic.subscribe('/qc/WorkspaceReset', function () {
        hLoad.remove();

        if (core.app && core.app.toolbar) {
            var toolsButton = array.filter(core.app.toolbar.getChildren(), function (x) { return x.get('label') == 'Tools' })[0];

            if (toolsButton && toolsButton.dropDown) {
                toolsButton.dropDown.addChild(new MenuSeparator());

                var menuItem = new MenuItem({
                    label: 'Upload Family History...',
                    showLabel: true,
                    onClick: function () {
                        var dialog = new uploadFamilyHistoryDialog();

                        dialog.startup();
                        dialog.show();
                    }
                });

                toolsButton.dropDown.addChild(menuItem);
            };
        };
    });
})