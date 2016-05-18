define([
    "qc/ListView",
    "dijit/layout/ContentPane",
	"dijit/_WidgetsInTemplateMixin",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/text!qc/coding/templates/FindingCodingTab.htm",
    "dojo/when",
	"qc/coding/CodingManager"
], function (ListView, ContentPane, _WidgetsInTemplateMixin, array, declare, lang, aspect, domClass, domConstruct, domStyle, on, query, FindingCodingTabTemplate, when, CodingManager) {
	return declare("qc.coding.FindingCodingTab", [ContentPane, _WidgetsInTemplateMixin], {
        templatString: FindingCodingTabTemplate,
        findingWidget: null,
        leftCol: null,
        rightCol: null,
        listView: null,
        panels: {},
        forceRefresh: false,
    
        startup: function () {
            if (!this._started) {
                this.inherited(arguments);
                var layout = domConstruct.create('div');
                domClass.add(layout, 'qcFindingCodingTab');
    
                this.leftCol = domConstruct.place('<div class="leftCol"></div>', layout);
                this.rightCol = domConstruct.place('<div class="rightCol"></div>', layout);
                this.listView = new ListView();
                this.listView.placeAt(this.leftCol);
                this.listView.onItemClick = lang.hitch(this, this.onListItemClick);
    
                this.set('content', layout);
    
            };
        },
    
        setFinding: function (findingWidget) {
            this.startup();
    
            this.findingWidget = findingWidget;
    
            var vocabs = array.map(CodingManager.vocabularies, function (v) { return v.name });
            if (!vocabs || vocabs.length == 0) {
                this.clear();
                return;
            };
    
            var lv = this.listView;
            var li = null;
            var self = this;
            var liFirst = null;
            when(CodingManager.mapFinding(findingWidget, vocabs, this.forceRefresh), function (haveData) {
                self.clear();                

                for (var v in findingWidget.codingInfo) {
                	if (v != 'medcin' && findingWidget.codingInfo[v] instanceof Array && findingWidget.codingInfo[v].length > 0) {
                        li = lv.addItem({ text: CodingManager.vocab(v).caption, vocabName: v });
                        if (!liFirst) {
                            liFirst = li;
                        };
                    };
                };
    
                if (liFirst) {
                    lv.setSelectedItem(liFirst);
                    self.onListItemClick(liFirst);
                }
                else {
                    self.rightCol.innerHTML = '<div style="margin-top:20px">No external coding information available for this finding.</div>';
                };

                self.forceRefresh = false;
            });
        },
    
        onListItemClick: function (item) {
            this.showPanel(item.data.vocabName);
        },
    
        showPanel: function (vocabName) {
            query('.qcCodingEntryPanel', this.rightCol).style('display', 'none');
            var panel = null;
            if (this.panels[vocabName]) {
                panel = this.panels[vocabName];
            }
            else {
                panel = CodingManager.getEntryPanel(vocabName, this.findingWidget);
                if (panel) {
                    panel.owner = this;
                    this.panels[vocabName] = panel;
                    panel.placeAt(this.rightCol);
                };
            };
            if (panel) {
                domStyle.set(panel.domNode, 'display', 'block');
            };
        },
    
        clear: function () {
            this.listView.clear();
            if (this.panels) {
                for (var p in this.panels) {
                    this.panels[p].destroyRecursive();
                };
                this.panels = {};
            };
            domConstruct.empty(this.rightCol);
        },
    
        onOKClick: function () {
	        var finding = null;

        	if (this.owner) {
        		var detailTab = this.owner.defaultTab;

        		if (detailTab) {
        			finding = detailTab.finding;
			        finding.codingInfo = this.findingWidget.codingInfo;
		        }
        	}

		    if (this.panels) {
		        for (var p in this.panels) {
					if (finding) {
						this.panels[p].findingWidget = finding;
					}

				    this.panels[p].applyCode();
			    };
		    }

            this.forceRefresh = true;
        },

        updateDisplay: function () {
	        var finding = null;

			if (this.owner) {
				var detailTab = this.owner.defaultTab;

				if (detailTab && detailTab.getModifiedFinding) {
					finding = detailTab.getModifiedFinding();
				}
			}

			if (finding && (!this.findingWidget.isEquivalentElement(finding) || this.findingWidget.status != finding.status || this.findingWidget.result != finding.result || this.findingWidget.modifier != finding.modifier || this.findingWidget.value != finding.value)) {
				this.setFinding(finding);
			}
		}
    });
});