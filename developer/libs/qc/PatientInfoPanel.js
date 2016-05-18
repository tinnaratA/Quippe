define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/Toolbar",
    "dijit/Menu",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "qc/_core",
    "qc/XmlWriter",
    "dojo/text!qc/templates/PatientInfoPanel.htm",
    "dojo/topic",
    "dojo/request",
    "dojo/_base/array",
    "qc/ListView",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/query",
    "dojo/dom-style",
    "dijit/registry",
    "qc/ListViewItem",
    "qc/DateUtil",
    "dojo/when",
	"dojo/aspect"
], function (declare, _WidgetBase, _TemplatedMixin, Toolbar, Menu, Button, TextBox, core, XmlWriter, template, topic, request, array, ListView, lang, on, query, domStyle, registry, ListViewItem, DateUtil, when, aspect) {
    return declare("qc.PatientInfoPanel", [_WidgetBase, _TemplatedMixin], {

        templateString: template,
        trackChanges: true,

        startup: function () {
            if (!this._started) {
                topic.subscribe("/qc/PatientChanged", lang.hitch(this, this.onPatientChanged));
                topic.subscribe("/qc/AddActiveItem", lang.hitch(this, this.addActiveItem));
                topic.subscribe("/qc/RemoveActiveItem", lang.hitch(this, this.removeActiveItem));
                topic.subscribe("/qc/SelectPatient", lang.hitch(this, this.onSelectPatient));

                if (core.settings.features.patientSummary) {
                    var self = this;

                    var res = request(core.serviceURL('Quippe/PatientData/SummaryCategories'),
                       {
                           query: { dataFormat: 'JSON' },
                           handleAs: "json"
                       });

                    when(res, function (res) {
                        if (!res.summaryCategories) {
                            res.summaryCategories = [
                                { id: "0", description: "Active Problems" },
                                { id: "1", description: "Allergies" },
                                { id: "2", description: "Current Medications" }
                            ];
                        };
                        var groups = {};
                        array.forEach(res.summaryCategories, function (item) {
                            groups[item.id] = item.description;
                        });
                        self.activeItemList = new ListView({ showGroups: true, viewMode: 'list', groups: groups }, self.activeItems);
                        self.activeItemList.startup();
                        self.activeItemList.initAllGroups();
                        self.activeItemList.dropDelete = lang.hitch(self, self.removeActiveItem);
                        self.activeItemList.createListViewItem = lang.hitch(self, self.createListViewItem);
                        aspect.after(self.activeItemList, "onItemDoubleClick", lang.hitch(self, self.onItemDoubleClick), true);
                    },
                    function (err) { core.showError(err) });
                };

                this.inherited(arguments);
            }
        },

        onPatientChanged: function () {
            this.clearPatientInfo();
            if (core.Patient && core.Patient.id) {
                this.renderPatientInfo(core.Patient);
            }
            else {
                domStyle.set(this.patientPanel, "display", "none");
            };
        },

        clearPatientInfo: function () {
            this.patientName.innerHTML = "";
            this.patientDemographics.innerHTML = "";
            if (this.activeItemList) {
                query(".qcListView", this.activeItems).forEach(function (item, i) { registry.byId(item.id).destroyRecursive() });
                this.activeItemList.clear();
                this.activeItemList.initAllGroups();
                this.onSectionsCleared();
            };
        },

        renderPatientInfo: function (patient) {
            this.trackChanges = false;
            var self = this;

            this.patientName.innerHTML = (patient.firstName + ' ' + patient.lastName).trim();

            var info = []
            if (patient.sexLabel) {
                info.push(patient.sexLabel);
            };

            if (patient.birthDate) {
                info.push("DoB:" + DateUtil.formatDate(patient.birthDate));
            };

            if (patient.age && patient.age.shortLabel) {
                info.push('Age:' + patient.age.shortLabel);
            };
            this.patientDemographics.innerHTML = info.join(', ');

            if (this.activeItemList) {
                array.forEach(patient.ActiveItems, function (item, i) { self.addActiveItem(item.categoryId, item) });
            };

            domStyle.set(this.patientPanel, "display", "block");
            this.trackChanges = true;
        },

        getSectionId: function (categoryId) {
            return this.id + "_af_" + categoryId;
        },

        onSectionHidden: function (sectionId, category) { },
        onSectionShown: function (sectionId, category) { },
        onSectionAdded: function (sectionId, category) { },
        onSectionsCleared: function () { },

        toggleSectionDisplay: function (categoryId) {
            this.activeItemList.toggleGroupDisplay(categoryId, true);
        },

        addActiveItem: function (categoryId, item) {
            if (categoryId == null) {
                categoryId = "0"; //TODO: Guess category from Item properties
            }
            if (!item.type) {
                item.type = "term";
            }
            var listItem = this.activeItemList.getItem(item.id);
            if (!listItem) {
                listItem = this.activeItemList.createListViewItem(item);
                listItem.group = categoryId;
                listItem.action = { icon: "xdel", onClick: function () { topic.publish("/qc/RemoveActiveItem", item); } };
                this.activeItemList.addChild(listItem);
                if (this.trackChanges) {
                    this.postActiveItems();
                };
            }
        },

        createListViewItem: function (item) {
            if (item.type == 'finding') {
                item.type = 'term';
            }

            return new ListViewItem({
                caption: item.note || item.text || "",
                icon: item.icon || core.getItemIcon(item),
                description: item.description || "",
                data: item
            });
        },

        removeActiveItem: function (item) {
            if (item) {
                this.activeItemList.removeItem(item);
                if (this.trackChanges) {
                    this.postActiveItems();
                };
            }
        },

        postActiveItems: function () {
            if (!core.Patient) {
                return;
            };

            var writer = new XmlWriter();
            writer.beginElement("ActiveItems");
            var items = this.activeItemList.getChildren();
            var category = 0;
            for (var n = 0; n < items.length; n++) {
                if (items[n].declaredClass == "qc.ListViewGroup") {
                    category = items[n].key;
                }
                else {
                    writer.beginElement("Item");
                    writer.attribute("CategoryId", category);
                    writer.attribute("Sequence", n);
                    writer.attribute("MedcinId", items[n].data.id || -1);
                    writer.attribute("Prefix", items[n].data.prefix || "");
                    writer.attribute("Note", items[n].data.note || "");
                    writer.endElement();
                }
            };
            writer.endElement();

            var data = writer.toString();

            request.post(core.serviceURL("Quippe/PatientData/Patient/Summary"), {
                data: { PatientId: core.Patient.id, ActiveItems: data },
                handleAs: "xml"
            }).then(function (data) {
                return true;
            }, core.showError)
        },

        onItemDoubleClick: function (item) {
            switch (item.group) {
                case "0":   //Active Problems
                    item.data.result = "A";
                    topic.publish("/qc/AddToNote", item.data);
                    topic.publish("/qc/MergePrompt", item.data, -1);
                    break;
                case "2":   //Current Medications
                    item.data.result = "A";
                    item.data.prefix = "O";
                    topic.publish("/qc/AddToNote", item.data);
                    break;
                default:
                    item.data.result = "A";
                    topic.publish("/qc/AddToNote", item.data);
                    break;
            };

        }

    });
});

