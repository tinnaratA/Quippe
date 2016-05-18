define([
    "qc/Dialog",
    "qc/Transcriber",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
	"dojo/aspect",
    "dojo/on",
    "dojo/text!qc/templates/FindingDetailDialog.htm",
	"dojo/topic",
    "qc/_core"
], function (Dialog, Transcriber, _WidgetsInTemplateMixin, ContentPane, TabContainer, array, declare, lang, aspect, on, FindingDetailDialogTemplate, topic, core) {
    return declare("qc.FindingDetailsDialog", [Dialog, ContentPane, _WidgetsInTemplateMixin], {
            title: "Finding",
            templateString: FindingDetailDialogTemplate,
            finding: null,
            defaultTab: "",
    
            startup: function () {
                if (!this.started) {
                    on(this.cmdOK, "Click", lang.hitch(this, this.onOKClick));
                    on(this.cmdCancel, "Click", lang.hitch(this, this.onCancelClick));
                    aspect.after(this.tabContainer, "selectChild", lang.hitch(this, this.onTabSelected), true);
                    this.cmdOK.set("label", core.getI18n("cmdOK"));
                    this.cmdCancel.set("label", core.getI18n("cmdCancel"));
    
                    var self = this;
                    for (var entry in core.app.findingDetailDialogTabs) {
                        var Type = core.app.findingDetailDialogTabs[entry].type;
                        if (Type) {
                            var thetab = new Type();
                            thetab.title = core.app.findingDetailDialogTabs[entry].title;
                            thetab.owner = self;
                            self.tabContainer.addChild(thetab);
                            if (entry == "details") {
                                self.defaultTab = thetab;
                            }
                        }
                    };
                    this.inherited(arguments);
                };
            },
    
            addTab: function (kid) {
                this.tabContainer.addChild(arguments);
            },
    
            onTabSelected: function (tabPage) {
                if (tabPage && tabPage.updateDisplay) {
                    tabPage.updateDisplay();
                };
            },
    
    
            setFinding: function (finding) {
                this.tabContainer.selectChild(this.defaultTab);
                this.finding = finding;
                var medcinId = finding.get('medcinId') || 0;
                var t = new Transcriber();
                //this.set('title', /*medcinId + " - " + t.capitaliseFirstLetter( */t.transcribe(finding)/*)*/);
                this.set('title', (core.settings.showMedcinIdInDetailsDialog ? medcinId + ' - ' : '') + t.transcribeItem(finding));
                array.forEach(this.tabContainer.getChildren(), function (entry) {
                    entry.setFinding(finding);
                });
            },
    
            onOKClick: function (evt) {
                if (this.details) {
                    this.details.onOKClick(evt);
                }
    
                array.forEach(this.tabContainer.getChildren(), function (entry) {
                    entry.onOKClick(arguments);
                });
                this.finding.updateTranscription();

	            topic.publish("/qc/FindingDetailsUpdated", this.finding);

                this.onCancel();
            },
    
            onCancelClick: function (evt) {
                this.onCancel();
            }
        }
    );
});