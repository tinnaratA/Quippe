/**** TailDetail Quippe Extension
Purpose:        
     Allows non right click access to a finding's details
Description:     
    Adds an ellipsis to the end of each finding name when that finding is marked as abnormal.  Watches
    toggle attempts on said findings to see if the user's click/touch is within the ellipsis area, and
    if so, opens the Finding Detail dialog, or the Multiple Findings Detail dialog, if appropriate.
Notes:
    Adds both a dojo aspect "around" and "after" to the FindingLabel.toggleResult function.  The around 
    function (aroundToggle) will pass through to the toggleResult function when the user is clicking in the normal 
    finding area.  When the user clicks/touches the ellipsis area, the around function will not pass through
    to toggleResult.  The after function (afterToggle) adds the Ellipsis to abnormal findings.  Multiple findings,
    group actions (eg otherwise normal), and save/open encounter are also covered.
****/
define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/_base/array",
    "dijit/registry",
	"qc/_core",
    "qc/note/FindingLabel",
    "qc/note/FindingGroup",
    "dojo/aspect",
    "dojo/_base/lang",
    "dojo/topic",
    "qc/ContextMenu",
    "qc/note/Document",
    "qc/FindingDetailDialog",
    "qc/NoteEditor",
    "qc/note/_Element",
    "qc/Workspace",
    "qc/NoteEditorSelection",
    "qc/MultiFindingDetailDialog"
], function (declare, domClass, domConstruct, query, array, registry, core, FindingLabel, findingGroup, aspect, lang, topic, ContextMenu, noteDocument, findingDetail, noteEditor, Element, Workspace, noteEditorSelection, MultiFindingDetailDialog) {
    var TailDetail = declare("qx.TailDetail", [],
    {
        ELLIPSIS_INDICATOR: '[ ... ]',
        tdThis: null,
        DEBUG_LOG: true,
        
        init: function()
        {
            /* Set a reference to this module which we will use throughout.  This is important because in most (all?) cases where we are
            wrapping Quippe functions, we want to keep that function's original "this", but also have a reference to the TailDetail code */
            tdThis = TailDetail.prototype;

            /**************** Individual finding related *****************/

            /* Once the toggle has occurred, append the ellipsis if necessary */
            aspect.after(FindingLabel.prototype, "toggleResult", tdThis.afterToggle, true);

            /* Before the toggle can occur see if this is a TailDetail Request */
            aspect.around(FindingLabel.prototype, "toggleResult",
                /* Original Method = toggleResult method */
                function (originalMethod) {
                    /* dualState and evt are same arguments taken by the original method */
                    return function (dualState, evt) {
                        /* See if this click is a detail request.  "this" context is a Widget */
                        if (! tdThis.aroundToggle(dualState, evt, this))
                            /* This was not a detail request, so we must toggle the Widget's state - call original method */
                            originalMethod.apply(this, arguments);
                    }
                }
            );

            /* Add Ellipses after findings are duplicated */
            aspect.after(noteEditor.prototype, "duplicateFinding", function () { tdThis.resetFindings(false, false, 'noteEditor.after.duplicateFinding'); }, false);
            
            /* Display mode (Concise, etc.) requires TailDetail restoration.  This also covers newly loaded documents */
            aspect.after(noteEditor.prototype, "updateDisplay", tdThis.restoreAll);

            /* When saving an encounter, we should strip our TailDetail indicators.  After save, we should restore them to the visible note */
            aspect.before(Workspace.prototype, "saveEncounter", tdThis.removeAll);
            aspect.after(Workspace.prototype, "saveEncounter", function () { tdThis.resetFindings(false, false, 'workspace.after.saveEncounter'); }, false);

            /* After the finding details dialog closees, we need verify the status of the finding we just modified */
            aspect.after(findingDetail.prototype, "onOKClick", function () { tdThis.resetFindings(false, false, 'findingDetail.after.onOKClick'); }, false);

            /**************** Headings/sections related *****************/

            /* When a section is autoNegated, unnegated, defaults set, or findings are cleared; TailDetail Ellipses are lost - re-add them */
            aspect.after(noteEditor.prototype, "autoNegate", function () { tdThis.resetFindings(false, false, 'noteEditor.after.autoNegate'); }, false);
            aspect.after(noteEditor.prototype, "undoAutoNegate", function () { tdThis.resetFindings(false, false, 'noteEditor.after.undoAutoNegate'); }, false);
            aspect.after(noteEditor.prototype, "enterDefaults", function () { tdThis.resetFindings(false, false, 'noteEditor.after.enterDefaults'); }, false);
            aspect.after(noteEditor.prototype, "clearNonEntered", function () { tdThis.resetFindings(false, false, 'noteEditor.after.clearNonEntered'); }, false);
            aspect.after(noteEditor.prototype, "clearFindings", function () { tdThis.resetFindings(false, false, 'noteEditor.after.clearFindings'); }, false);

            /**************** Grouped findings related *****************/

            /* When a finding group is first composed, we need to clean up the existing TailDetails of the constituent findings */
            aspect.after(noteEditorSelection.prototype, "doGroup", function () { tdThis.resetFindings(false, false, 'noteEditorSelection.after.doGroup'); }, false);

            /* When de-grouping findings, we need to reset the ellipses */
            aspect.after(findingGroup.prototype, "unmerge", function () { tdThis.resetFindings(false, false, 'findingGroup.after.unmerge'); }, false);

            /* After the finding group has toggled, strip or add TailDetail ellipsis as appropriate */
            aspect.after(findingGroup.prototype, "toggleResultFromEvent", function () { tdThis.resetFindings(false, false, 'findingGroup.after.ToggleResultFromEvent'); }, false)

            /* Similarly to the action taken for individual findings, we capture the toggle function and prevent its execution when a TailDetail request is made */
            aspect.around(findingGroup.prototype, "toggleResultFromEvent",
                /* Original Method = toggleResultFromEvent method */
                function (originalMethod) {
                    /* evt is the event data argument taken by the original method */
                    return function (evt) {
                        /* See if this click is a detail request.  "this" context is the finding group */
                        if (! tdThis.aroundGroupToggle(evt, this)) {
                            //TailDetail.prototype.afterDoGroup();
                            tdThis.resetFindings(false, true, 'findingGroup.around.ToggleResultFromEvent');
                            /* This was not a detail request, so we must toggle the group's state - call original method */
                            originalMethod.apply(this, arguments);
                        }
                    }
                }
            );

            /* Once the group detail dialog closes, make sure the grouped findings have/lack TailDetail elipsis.  NOTE:  There may be more appropriate places to execute this */
            aspect.after(MultiFindingDetailDialog.prototype, "hide", function () { tdThis.resetFindings(false, false, 'multiFindingDetailDialog.after.hide'); }, false);

            return this;
        },

        /*** aroundToggle function
        Purpose:
            Intercepts calls to FindingLabel.toggleResult, and passes through to it only when the user 
            action is not a TailDetail request.
        Arguments:
            dualState: toggleResult target argument (usually null)
            evt: toggleResult target argument (contains event/click data)
            finding: context we execute under (must be a Widget)
        ***/
        aroundToggle: function (dualState, evt, finding)
        {
            /* The Finding must be marked as abnormal for this to be a valid TailDetail Request */
            var isTDRequest = (dualState ? false : true) && finding.get('result') == 'A';

            if (isTDRequest)
            {
                /* Get the current text of the widget */
                var currentResult = finding.get('text');

                /* For this to be a valid TailDetail request, the ellipsis must be present */
                if (isTDRequest = currentResult.indexOf(tdThis.ELLIPSIS_INDICATOR) != -1)
                {
                    /* Calculate percentage of text is our Assumes TailDetail ellipsis is always at the rightmost end */
                    var cutoff = (tdThis.ELLIPSIS_INDICATOR).length / currentResult.length;

                    /* 10 = approximate left margin area offset of Quippe.  TODO: Get exact correct value */
                    var leftPos = finding.domNode.offsetLeft + 10;

                    /* Recalculated spot where the user clicked within the Finding text */
                    var pixelPos = parseInt(evt.clientX - leftPos * 1.0);

                    /* Maximum X coordinate of the data preceding the Ellipsis */
                    var dataArea = parseInt(finding.domNode.offsetWidth * (1 - cutoff));

                    /* Is the user's click X position after (to the right of) the last of the data area? */
                    if (isTDRequest = (pixelPos > dataArea))
                    {
                        if (tdThis.DEBUG_LOG) console.info("tailDetailRequest: at X: " + pixelPos + ", dataAreaEnd: " + dataArea + ".");

                        /* Must convert our Widget data (Finding) to an item */
                        var item = core.findingToItem(finding);

                        /* Show the DetailEditor or MultiFinding dialog, as appropriate */
                        if (finding.type != "findingGroup")
                            noteEditor.prototype.showFindingDetailEditor(item);
                        else
                        {
                            instance = new MultiFindingDetailDialog();
                            instance.findingData = finding;
                            instance.startup();
                            instance.show();
                        }
                    }
                }
            }

            return isTDRequest;
        },

        /*** afterToggle function
        Purpose:
            Adds or removes TailDetail Ellipsis, after a finding's state has been toggled  
        Arguments:
            dualState: Boolean indicating if this is a dualState finding
            evt: User event (click/touch) data; not currently used
            potentialFinding: The finding to examine (if omitted, assume `this`)
        ***/
        afterToggle: function(dualState, evt, potentialFinding) 
        {
            return tdThis.resetFindings(false, false, 'afterToggle');
        },

        /*** setFinding function
        Purpose:
            Updates a single finding or findingGroup with a TailDetial ellispsis, if necessary
        Arguments:
            dualState: Boolean indicating if this is a dualState finding
            evt: User event (click/touch) data; not currently used
            finding: The finding to examine
            justClear: Boolean flag incicating whether we want to simply REMOVE all TailDetail Ellipses
        Notes:
            Finding must be a valid finding or findingGroup widget.  This function is invoked frequently,
            so it is written with performance in mind and returns as soon as possible, before doing unneccesary
            work.  Modify only with great caution.
        ***/
        setFinding: function (dualState, evt, finding, justClear)
        {
            var changed = false;
            
            /* If dualState we never process it, return early */
            if (dualState)
                return changed;

            /* Get state of finding (result and current display text */
            isAbnormal = finding.get('result') ? finding.get('result') == 'A' : false;
            originalFindingText = finding.get('text');

            /* Does not need a TailDetail ellipsis, and does not contain an extraneous one */
            if (!isAbnormal && originalFindingText.indexOf(tdThis.ELLIPSIS_INDICATOR) == -1)
                return changed;
            
            /* Perform a heavy dualState check, and if this is a dualState item, return */
            if (dualState = tdThis.isDualState(finding))
                return changed;

            findingText = originalFindingText;
            
            /* Remove all TailDetail Ellipses from finding.  More than one may be present */
            while (findingText.indexOf(tdThis.ELLIPSIS_INDICATOR) > -1)
                findingText = findingText.replace(tdThis.ELLIPSIS_INDICATOR, '');

            /* Now, add a single TailDetail Ellipsis to the end of the finding/findingGroup, if it requires one */
            if (isAbnormal && !justClear)
                findingText = findingText + tdThis.ELLIPSIS_INDICATOR;
            
            /* Update the finding/findingGroup's text if necessary */
            if (changed = (originalFindingText != findingText))
                finding.set('text', findingText);

            return changed;
        },

        /*** resetFindings function
        Purpose:
            Examines findings and findingGroups and adds or removes TailDetail Ellipses as necessary
        Arguments:
            clearOnly: Boolean indicating whether we should clear ellipses, but not restore or add them 
            selectedItemsOnly: Apply our analysis only to currently selected items (ie they have the "selected" css class set)
            callerId: String identifier of caller, used for debugging
        Notes:
            eventContext, if provided, must be a Widget (as should `this` be; if eventContext not provided)
        ***/
        resetFindings: function (clearOnly, selectedItemsOnly, callerId)
        {
            var findingsUpdated = 0;
            var findingsExamined = 0;

            /* Is this an ellipsis clear only operation? */
            var justClear = clearOnly ? (clearOnly == true ? true : false) : false;

            /* Are we examining only selected items, or every item in the note? */
            var queryString = selectedItemsOnly ? (selectedItemsOnly == true ? '.findingGroup.selected, .finding.selected' : '.findingGroup, .finding') : '.findingGroup, .finding';
            
            /* For each item we care about, excluding free text findings ... */
            array.forEach(query(queryString, noteEditor.prototype.domNode).filter(':not(.freeText)').map(registry.byNode), function (finding) {
                if (finding)
                {
                    findingsExamined++;
                    /* Update that finding's presented text, if needed */
                    if (tdThis.setFinding(null, null, finding, justClear))
                        findingsUpdated++;
                }
            });

            if (tdThis.DEBUG_LOG) console.info('rgi: ' + callerId + " examined: " + findingsExamined + ", updated: " + findingsUpdated);
            return findingsUpdated;
        },

        /*** aroundGroupToggle function
        Purpose:
            Examines finding groups and adds or removes TailDetail Ellipses as necessary
        Arguments:
            evt: User event data indicating mouse/touch position
        Notes:
            Return value is a boolean indicating whether the user clicked in the TailDetail Ellipsis
            area.  The caller can then use that information to suppress the default function from executing.
        ***/
        aroundGroupToggle: function (evt) {

            /* return value and finished indicator */
            var toggled;

            /* Get findingGroups which are currently selected (should be a single group, though) */
            array.forEach(query('.findingGroup.selected', noteEditor.prototype.domNode).map(registry.byNode), function (findingGroup) {
                /* See if the findingGroup has a result (making it a true finding) */
                if (findingGroup && findingGroup.get('result')) {
                    /* Call our single finding code using this findingGroup's data */
                    toggled = tdThis.aroundToggle(null, evt, findingGroup);
                }
            });
            return toggled;
        },

        /*** restoreAll function
        Purpose:
            Adds TailDetail Ellipsis to all findings in a note
        Notes:
            Due to timing of operations on the note, slightly delaying this function's execution using a setTimeout call
            coerces it to behave correctly; otherwise it occurs too early in the refresh cycle (minor HACK <pt/>).  
        ***/
        restoreAll: function ()
        {
            setTimeout(function () { tdThis.resetFindings(false, false, 'restoreAll'); }, 0);
        },

        /*** removeAll function
        Purpose:
            Removes TailDetail Ellipses from all findings in a note
        ***/
        removeAll: function ()
        {
            tdThis.resetFindings(true, false, 'removeAll');
        },

        /*** isDualState function
        Purpose:
            Determines if a finding is a dualstate type
        Arguments:
            finding: finding to examine state type
        ***/
        isDualState: function (finding) {
            
            if (! finding)
                return false;

            var partOfCheck = false;
            array.forEach(query('.chk', finding.domNode).map(registry.byNode), function (subFinding) { if (partOfCheck) return; else partOfCheck= true; }); 
            
            return (finding.styleClass == 'x' || finding.styleClass == 'chk' || finding.styleClass == 'check' || partOfCheck);

        }
    });

    TailDetail.prototype.init();

});