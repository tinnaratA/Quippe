// A sample task pane that shows reference information from MedlinePlus for the currently selected finding
// Details on the MedlinePlus Connect web service at https://www.nlm.nih.gov/medlineplus/connect/overview.html
//
// Note: To use this task pane you will need to enable the Quippe proxy service in your web.config file
//
define([
    "qc/TaskPane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/dom-geometry",
    "dojo/topic",
    "dojo/request",
    "dojo/query",
    "dojo/when",
    "qc/coding/CodingManager",
    "qc/_core"
], function (TaskPane, array, declare, lang, domClass, domConstruct, domStyle, domGeometry, topic, request, query, when, CodingManager, core) {
    var typeDef = declare("samples.MedlinePlusTaskPane", [TaskPane], {
        name: "MedlinePlus",


        title: "MedlinePlus",
        group: 'Reference',

        _onEnabled: function () {
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onFindingSelected))
                ];
            };
            this.onFindingSelected();
        },

        _onDisabled: function () {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            }
        },

        onFindingSelected: function () {
            var finding = core.getNoteEditor().selection.getFindings()[0] || null;
            if (!finding) {
                return this.clear();
            };
            this.getContent(finding);
        },

        getContent: function (finding) {
            var self = this;
            var url = '';

            var getMappedCode = function (map) {
                var selected = core.forceArray(map).find(function (x) { return x.selected });
                if (!selected) {
                    selected = map.find(function (x) { return x.autoSelect });
                    if (!selected) {
                        selected = map[0];
                    }
                };
                return selected || null;
            }

            var vocabs = ["icd10", "icd", "snomed", "loinc", "rxnorm"];

            var vocabIds = {
                "icd10": "2.16.840.1.113883.6.90",
                "icd": "2.16.840.1.113883.6.103",
                "loinc": "2.16.840.1.113883.6.1",
                "rxnorm": "2.16.840.1.113883.6.88", //rxcui
                "snomed": "2.16.840.1.113883.6.96"
            };

            when(CodingManager.mapFinding(finding, vocabs), function (haveData) {
                var code = '';
                for (var id in vocabIds) {
                    code = getMappedCode(finding.codingInfo[id]);
                    if (code) {
                        url = "https://apps.nlm.nih.gov/medlineplus/services/mpconnect_service.cfm";
                        url += ("?mainSearchCriteria.v.cs=" + vocabIds[id]);
                        url += ("&mainSearchCriteria.v.c=" + code.code);
                        url += ("&mainSearchCriteria.v.dn=" + code.description);
                        url += ("&knowledgeResponseType=application/json");
                        url += ("&informationRecipient.languageCode.c=en");
                        url += ("&informationRecipient=PROV");
                        break;
                    }
                };
                self.clear();
                if (code) {
                    request.get('proxy?' + url, { handleAs: 'json' }).then(function (data) {
                        var responseNode = domConstruct.place('<div class="referenceBlock"></div>', self.containerNode);
                        var entries = data.feed ? data.feed.entry ? core.forceArray(data.feed.entry) : [] : [];
                        entries.forEach(function (entry) {
                            var link = core.forceArray(entry.link)[0];
                            var entryNode = domConstruct.place('<div class="referenceEntry"></div>', responseNode);
                            domClass.add(entryNode, 'ic16');
                            domConstruct.place('<a href="' + link.href + '"><div class="icon document"></div><div class="title">' + link.title + '</div>', entryNode);
                            domConstruct.place('<div class="summary">' + (entry.summary ? entry.summary._value || '' : '') + '</div>', entryNode);
                            query('a', entryNode).forEach(function (a) { a.setAttribute('target', 'QuippeMedlinePlus') });
                            
                        });
                    });
                };
            });

        },

        clear: function () {
            this.containerNode.innerHTML = '';
        }
    });

    // The TaskBarLoaded topic will be published when the application starts and the
    // taskbar has loaded all of its default panes.  Call registerTaskPane to add our
    // new custom task pane.
    var hSubscribe = topic.subscribe('/qc/TaskBarLoaded', function (taskBar) {
        hSubscribe.remove();
        var taskPane = new typeDef();
        taskBar.registerTaskPane(taskPane)
    });


    return typeDef;
});