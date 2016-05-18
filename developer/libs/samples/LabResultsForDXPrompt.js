// This extension will react to the user doing a diagnosis prompt, find the relevant tests for the diagnosis, and call the
// Quippe/PatientData/Patient/ExternalEntries/LabResults web service to merge relevant recent lab results for the patient into
// the note

define([
    "dijit/registry",
    "dojo/_base/array",
    "dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/promise/all",
    "dojo/query",
    "dojo/request",
    "dojo/topic",
    "qc/_core",
    "qc/DateUtil",
    "qc/note/FreeText"
], function (registry, array, aspect, domClass, domStyle, all, query, request, topic, core, DateUtil, FreeText) {
    function matchOnGroupKey(groupKey) {
        return function(part) {
            return part.groupKeys && part.groupKeys.length > 0 && part.groupKeys.indexOf(groupKey) != -1;
        };
    }

    function matchOnMedcinId(medcinId) {
        return function(findingWidget) {
            return findingWidget.medcinId == medcinId;
        };
    }

    // The /notEditor/listAdded topic is published whenever the user does a diagnosis prompt
    topic.subscribe("/noteEditor/listAdded", function (list) {
        // In addition to the diagnosis prompt, this topic is published in other scenarios like adding a pre-defined list of
        // findings from the search box, so we do a check to make sure that this actual a diagnosis prompt action
        if (!list || list.listType != "Prompt" || !list.medcinId) {
            return;
        }

        var noteEditor = core.app.workspace.ensureEditor();

        // Get the "Previous Tests" and "Tests" sections so that we know what part of the node to merge the lab results into and
        // which section to find tests for the diagnosis from, respectively
        var previousTestsSections = query(".part", noteEditor.note.domNode)
            .map(registry.byNode)
            .filter(matchOnGroupKey("S18"));

        if (!previousTestsSections || previousTestsSections.length == 0) {
            return;
        }

        var previousTestsSection = previousTestsSections[0];

        var testsSections = query(".part", noteEditor.note.domNode)
            .map(registry.byNode)
            .filter(matchOnGroupKey("S10"));

        if (!testsSections || testsSections.length == 0) {
            return;
        }

        var testsSection = testsSections[0];
        var testMedcinIds = "";

        // Get the list of MEDCIN IDs for the tests that the diagnosis prompt returned
        array.forEach(list.item, function (item) {
            if (item.termType == 3) {
                if (!query(".finding", testsSection.domNode).map(registry.byNode).some(matchOnMedcinId(item.medcinId))) {
                    return;
                }

                if (testMedcinIds.length > 0) {
                    testMedcinIds += ",";
                }

                testMedcinIds += item.medcinId.toString();
            }
        });

        if (testMedcinIds.length == 0) {
            return;
        }

        // Call the web service to get any recent lab results for the tests
        request.get(core.serviceURL("Quippe/PatientData/Patient/ExternalEntries/LabResults"), {
            handleAs: "json",
            query: {
                DataFormat: "JSON",
                PatientId: core.Patient.id,
                MedcinIds: testMedcinIds
            }
        }).then(function(data) {
            if (data.entries && data.entries.entry) {
                if (!(data.entries.entry instanceof Array) && data.entries.entry) {
                    data.entries.entry = [data.entries.entry];
                }

                if (!data.entries.entry || data.entries.entry.length == 0) {
                    return;
                }

                var resolveList = "";
                var indexedEntries = {};

                for (var i = 0; i < data.entries.entry.length; i++) {
                    if (resolveList.length > 0) {
                        resolveList += ",";
                    }

                    resolveList += data.entries.entry[i].medcinId.toString();
                    indexedEntries[data.entries.entry[i].medcinId.toString()] = data.entries.entry[i];
                }

                // Resolve the list of lab results so that we can display them in the note
                request.get(core.serviceURL("Quippe/NoteBuilder/ResolveTerms"), {
                    handleAs: "json",
                    query: {
                        MedcinIds: resolveList,
                        Culture: core.settings.culture,
                        DataFormat: "JSON",
                        PatientId: (core.Patient ? core.Patient.id : "")
                    },
                    preventCache: true
                }).then(function (data) {
                    if (!(data.list.item instanceof Array) && data.list.item) {
                        data.list.item = [data.list.item];
                    }

                    if (!data.list.item || data.list.item.length == 0) {
                        return;
                    }

                    // Create a finding widget for each lab result, add a note indicating when the lab result came in, and add
                    // the finding to the note
                    for (var j = 0; j < data.list.item.length; j++) {
                        var item = data.list.item[j];
                        var entry = indexedEntries[item.medcinId.toString()];
                        var finding = item.isFreeText ? new FreeText(item) : core.createFindingEntry(item);

                        finding.setDetails(entry);
                        finding.startup();

                        if (entry.timeRecorded) {
                            finding.notation = "(" + DateUtil.formatDateTime(DateUtil.dateFromJSON(entry.timeRecorded)) + ")";
                        }

                        previousTestsSection.addElement(finding);
                    }

                    // Run transcription and update the note editor's display so that previously hidden sections, like "Previous
                    // Tests" will be displayed if they now have findings in them
                    previousTestsSection.transcribe();
                    noteEditor.updateDisplay();
                }, function (err) {
                    core.showError(err);
                });
            }
        });
    });
})