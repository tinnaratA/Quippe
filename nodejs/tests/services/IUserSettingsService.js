var quippe = require("@medicomp/quippe");
var helpers = require("../helpers");
var q = require("q");

function GetInitialSettings() {
    return {
        "Culture": "en-US",
        "Role": "1",
        "DefaultNoteTemplate": "shared:QUIPPESTANDARD",
        "DefaultListSize": "2",
        "HistoryTabLabels": "",
        "enableCopyForward": "true",
        "flowsheetDefaultDateHeadings": "",
        "flowsheetShowColorBars": "true",
        "FlowsheetFilterCurrentLevel": "visible",
        "FlowsheetFilterHistoryLevel": "related",
        "FlowsheetFilterExcludeNonEntered": "false",
        "FlowsheetFilterExcludeNoHistory": "true",
        "FlowsheetFilterExcludeNoAbnormalHistory": "false",
        "TaskBarDisplayMode": "",
        "TrashCan": "trashcan",
        "TaskBarCollapsible": "true",
        "TaskPanes_PatientInfo": "true",
        "TaskPanes_Sources": "true",
        "TaskPanes_Orders": "false",
        "TaskPanes_Favorites": "true",
        "TaskPanes_Debug": "false",
        "emDefaultSetting": "O",
        "emDefaultServiceType": "AQ",
        "emDefaultExamType": "d",
        "emShowCPT": "true",
        "codingServiceEnabled": "true",
        "codingShowHints": "true",
        "codingShowSpecifiers": "true",
        "codingShowSubs": "false",
        "codingShowCodeQualifiers": "true",
        "TaskPanes_CodeEntryICD10": "true",
        "icd10AppendSpecifierText": "true",
        "icd10OverrideText": "false",
        "ShowDeveloperTools": "true",
        "EnableDesignView": "true",
        "ShowMedcinIdInDetailsDialog": "true",
        "SaveNoteSources": "",
        "EnableMultiSelect": "true",
        "EnableInlineTextEditing": "true",
        "EnableTextMacros": "true",
        "EnableProblemGrouping": "true",
        "EnableSaveElement": "true",
        "TranscribeSearchResults": "false",
        "PhrasingAllowOverride": "true",
        "PhrasingAllowEdit": "true",
        "nursingFeaturesEnabled": "true",
        "nurseAutoPrompt": "",
        "gmShowInk": "true",
        "gmDragThresholdX": "200",
        "gmDragThresholdY": "60",
        "gmClickToleranceX": "3",
        "gmClickToleranceY": "3",
        "gmClickHoldTime": "1000",
        "gmStrokeWaitTime": "500",
        "gmShowScrollMargin": "true",
        "gmScrollMarginColor": "#eeeeee",
        "gmScrollMarginWidth": "36",
        "AddOnPrompt": "true",
        "SimulateTouchPad": "true",
        "EnableFollowUpPrompt": "false",
        "EnableQuippeDesigner": "true",
        "Extensions": "qx.DebugUtil",
        "SystemExtensions": "",
        "CodeReviewSelectedVocabs": "icd10,icd,icdproc,icdo,loinc,medcin,rxnorm",
        "CodeReviewVocabSequence": "acc,cas,ccc,cccdiag,cccint,cdt,cpt,cptmod,cvx,dsm,hcpc,hcpcmod,icd10,icd,icdproc,icdo,loinc,medcin,rxnorm,snomed,unii",
        "CodeReviewFilterCurrentLevel": "visible",
        "CodeReviewFilterExcludeNonEntered": "true",
        "CodeReviewFilterExcludeNegatives": "true",
        "printingUsePDF": "true",
        "printingUsePrintView": "true",
        "printingDebug": "false",
        "printingPageSize": "Letter",
        "printingOrientation": "Portrait",
        "printingMargins": "1in",
        "printingPageWidth": "",
        "printingPageHeight": "",
        "printingPageHeaderId": "shared:standard_page_header",
        "printingPageFooterId": "shared:standard_page_footer",
        "ComponentSettingPresets": "",
        "CodeReviewFilterHideEmptyRows": "true",
        "CodeReviewFilterHideEmptyCols": "true",
        "UseDesignTemplates": "false"
    };
}

function GetDefaultSettings() {
    return {
        "Culture": "en-US",
        "Role": "1",
        "DefaultNoteTemplate": "shared:QUIPPESTANDARD",
        "DefaultListSize": "2",
        "HistoryTabLabels": "absolute",
        "enableCopyForward": "true",
        "flowsheetDefaultDateHeadings": "absolute",
        "flowsheetShowColorBars": "true",
        "FlowsheetFilterCurrentLevel": "visible",
        "FlowsheetFilterHistoryLevel": "related",
        "FlowsheetFilterExcludeNonEntered": "false",
        "FlowsheetFilterExcludeNoHistory": "true",
        "FlowsheetFilterExcludeNoAbnormalHistory": "false",
        "TaskBarDisplayMode": "constrained",
        "TrashCan": "none",
        "TaskBarCollapsible": "true",
        "TaskPanes_PatientInfo": "true",
        "TaskPanes_Sources": "true",
        "TaskPanes_Orders": "false",
        "TaskPanes_Favorites": "true",
        "TaskPanes_Debug": "false",
        "emDefaultSetting": "O",
        "emDefaultServiceType": "OO",
        "emDefaultExamType": "A",
        "emShowCPT": "false",
        "codingServiceEnabled": "true",
        "codingShowHints": "false",
        "codingShowSpecifiers": "true",
        "codingShowSubs": "false",
        "codingShowCodeQualifiers": "true",
        "TaskPanes_CodeEntryICD10": "false",
        "icd10AppendSpecifierText": "false",
        "icd10OverrideText": "false",
        "ShowDeveloperTools": "true",
        "EnableDesignView": "true",
        "ShowMedcinIdInDetailsDialog": "true",
        "SaveNoteSources": "no",
        "EnableMultiSelect": "true",
        "EnableInlineTextEditing": "true",
        "EnableTextMacros": "true",
        "EnableProblemGrouping": "true",
        "EnableSaveElement": "true",
        "TranscribeSearchResults": "true",
        "PhrasingAllowOverride": "true",
        "PhrasingAllowEdit": "true",
        "nursingFeaturesEnabled": "true",
        "nurseAutoPrompt": "1",
        "gmShowInk": "true",
        "gmDragThresholdX": "200",
        "gmDragThresholdY": "60",
        "gmClickToleranceX": "3",
        "gmClickToleranceY": "3",
        "gmClickHoldTime": "1000",
        "gmStrokeWaitTime": "500",
        "gmShowScrollMargin": "false",
        "gmScrollMarginColor": "#eeeeee",
        "gmScrollMarginWidth": "36",
        "AddOnPrompt": "true",
        "SimulateTouchPad": "false",
        "EnableFollowUpPrompt": "false",
        "EnableQuippeDesigner": "true",
        "Extensions": "",
        "SystemExtensions": "",
        "CodeReviewSelectedVocabs": "cpt,dsm,icd,icd10,loinc,rxnorm",
        "CodeReviewVocabSequence": "",
        "CodeReviewFilterCurrentLevel": "visible",
        "CodeReviewFilterExcludeNonEntered": "true",
        "CodeReviewFilterExcludeNegatives": "true",
        "printingUsePDF": "true",
        "printingUsePrintView": "true",
        "printingDebug": "false",
        "printingPageSize": "Letter",
        "printingOrientation": "Portrait",
        "printingMargins": "1in",
        "printingPageWidth": "",
        "printingPageHeight": "",
        "printingPageHeaderId": "shared:standard_page_header",
        "printingPageFooterId": "shared:standard_page_footer",
        "ComponentSettingPresets": "",
        "CodeReviewFilterHideEmptyRows": "true",
        "CodeReviewFilterHideEmptyCols": "true",
        "UseDesignTemplates": "false"
    };
}

describe("IUserSettingsService", function() {
    var service = quippe.getService("Quippe.IUserSettingsService", {
        usesPromises: true
    });
    
    it("TestGetSchema", function(done) {
        var schema;
        
        service.GetSchema({}).then(function(__callbackResults) {
            schema = __callbackResults;
            helpers.assertXmlIsEqual(helpers.getExpectedResultsText("UserSettingsService", "schema.txt"), schema.toString());
        }).done(function() {
            done();
        });
    });
    
    it("TestGetSettings", function(done) {
        var settings;
        
        service.GetSettings({}).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestResetSingleSetting", function(done) {
        var expectedSettings;
        var settings;
        
        expectedSettings = GetInitialSettings();
        expectedSettings["Extensions"] = "";
        
        service.Reset({
            Path: "Extensions"
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(expectedSettings, settings);
            return service.UpdateSettings({
                Values: {
                    "Extensions": "qx.DebugUtil"
                }
            });
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestResetMultipleMatchingSettings", function(done) {
        var expectedSettings;
        var settings;
        
        expectedSettings = GetInitialSettings();
        expectedSettings["CodeReviewVocabSequence"] = "";
        expectedSettings["CodeReviewSelectedVocabs"] = "cpt,dsm,icd,icd10,loinc,rxnorm";
        
        service.Reset({
            Path: "CodeReview"
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(expectedSettings, settings);
            return service.UpdateSettings({
                Values: {
                    "CodeReviewVocabSequence": "acc,cas,ccc,cccdiag,cccint,cdt,cpt,cptmod,cvx,dsm,hcpc,hcpcmod,icd10,icd,icdproc,icdo,loinc,medcin,rxnorm,snomed,unii",
                    "CodeReviewSelectedVocabs": "icd10,icd,icdproc,icdo,loinc,medcin,rxnorm"
                }
            });
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestResetNonExistentSetting", function(done) {
        var settings;
        
        service.Reset({
            Path: "thisnamedoesnotexist"
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestResetAllSettingsWithNull", function(done) {
        var settings;
        
        service.Reset({
            Path: null
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetDefaultSettings(), settings);
            return service.UpdateSettings({
                Values: GetInitialSettings()
            });
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestResetAllSettingsWithBlank", function(done) {
        var settings;
        
        service.Reset({
            Path: ""
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetDefaultSettings(), settings);
            return service.UpdateSettings({
                Values: GetInitialSettings()
            });
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestUpdateSingleSetting", function(done) {
        var expectedSettings;
        var settings;
        
        expectedSettings = GetInitialSettings();
        expectedSettings["Extensions"] = "a new value";
        
        service.UpdateSettings({
            Values: {
                "Extensions": "a new value"
            }
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(expectedSettings, settings);
            return service.UpdateSettings({
                Values: {
                    "Extensions": "qx.DebugUtil"
                }
            });
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestUpdateNonExistentSetting", function(done) {
        var settings;
        
        service.UpdateSettings({
            Values: {
                "NonExistentSetting": "a new value"
            }
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestUpdateMultipleSettings", function(done) {
        var expectedSettings;
        var settings;
        
        expectedSettings = GetInitialSettings();
        expectedSettings["CodeReviewSelectedVocabs"] = "a new value";
        expectedSettings["CodeReviewVocabSequence"] = "another new value";
        
        service.UpdateSettings({
            Values: {
                "CodeReviewSelectedVocabs": "a new value",
                "CodeReviewVocabSequence": "another new value"
            }
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(expectedSettings, settings);
            return service.UpdateSettings({
                Values: {
                    "CodeReviewSelectedVocabs": "icd10,icd,icdproc,icdo,loinc,medcin,rxnorm",
                    "CodeReviewVocabSequence": "acc,cas,ccc,cccdiag,cccint,cdt,cpt,cptmod,cvx,dsm,hcpc,hcpcmod,icd10,icd,icdproc,icdo,loinc,medcin,rxnorm,snomed,unii"
                }
            });
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestUpdateMultipleSettingsIncludingNonExistentSetting", function(done) {
        var expectedSettings;
        var settings;
        
        expectedSettings = GetInitialSettings();
        expectedSettings["CodeReviewSelectedVocabs"] = "a new value";
        expectedSettings["CodeReviewVocabSequence"] = "another new value";
        
        service.UpdateSettings({
            Values: {
                "CodeReviewSelectedVocabs": "a new value",
                "NonExistentSetting": "a new value",
                "CodeReviewVocabSequence": "another new value"
            }
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(expectedSettings, settings);
            return service.UpdateSettings({
                Values: {
                    "CodeReviewSelectedVocabs": "icd10,icd,icdproc,icdo,loinc,medcin,rxnorm",
                    "CodeReviewVocabSequence": "acc,cas,ccc,cccdiag,cccint,cdt,cpt,cptmod,cvx,dsm,hcpc,hcpcmod,icd10,icd,icdproc,icdo,loinc,medcin,rxnorm,snomed,unii"
                }
            });
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
    
    it("TestUpdateEmptySettings", function(done) {
        var settings;
        
        service.UpdateSettings({
            Values: {}
        }).then(function() {
            return service.GetSettings({});
        }).then(function(__callbackResults) {
            settings = __callbackResults;
            helpers.assertDictionariesAreEqual(GetInitialSettings(), settings);
        }).done(function() {
            done();
        });
    });
});
