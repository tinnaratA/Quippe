define([
    "qc/MedcinTree",
    "dojo/_base/array",
    "dojo/_base/declare",
    "qc/_core"
], function (MedcinTree, array, declare, core) {
    var CodedTermTree = declare("qc.coding.CodedTermTree", [MedcinTree], {
        // summary:
        //      Contained within a `_CodeEntryBlock` widget, this widget renders the available substitutions for a code in the form of a tree.
        // description:
        //      This widget will be displayed only when the `core.settings.codingShowSubs` setting is active.

        // vocabName: String
        //     Coding vocabulary being used for this entry.
        vocabName: '',
    
        convertTerm: function (term) {
            // summary:
            //     Generates the HTML to display for each substitution retrieved by `resolveChildren()`.
            // description:
            //     The HTML for the substitution takes the form of `code:text` and is set on the `term` parameter's `text` property.
            // term: qc/coding/CodedTermTree.__Sub
            //     Substitution entry that we're generating the label for.
            // returns: qc/coding/CodedTermTree.__Sub
            //     The provided `term` parameter with its `text` property set to the label HTML.
            // tags:
            //     private
            var text = '<span class="codeLabel' + (term.unreportable ? ' unreportable' : '') + '">' + term.code + '</span>:' + '<span class="textLabel">' + term.text + '</span>';
            term.fullText = term.text;
            term.text = text;
            return term;
        },

        resolveChildren: function (tNode) {
            // summary:
            //     Populates the tree with the subs for a given Medcin finding and for a particular vocabulary.
            // description:
            //     Looks at the `data` property of `tNode` and gets its `medcinId` property to pass to the web service.  Calls the `Quippe/Coding/Subs` with
            //     the aforementioned `medcinId` and `vocabName` and then calls `convertTerm` to generate the labels for each applicable sub to display in the
            //     tree.
            // tNode: Object
            //     Parent node (the root) that we are to retrieve the subs for.
            // returns: Promise
            //     The `Promise` for the call to the `Quippe/Coding/Subs` web service.
            var converter = this.convertTerm;
            var vocabName = this.vocabName;
    
            return core.xhrGet({
                url: core.serviceURL("Quippe/Coding/Subs"),
                content: { MedcinId: tNode.data.medcinId, VocabName: vocabName, SortByCode: true, DataFormat: "JSON" },
                handleAs: "json",
                error: core.showError,
                load: function (data, ioArgs) {
                    if (data && data.termList && data.termList.term) {
                        return array.map(core.forceArray(data.termList.term), converter);
                    }
                    else {
                        return [];
                    }
                }
            });
        }
    });

    /*=====
    CodedTermTree.__Sub = declare("qc.coding.CodedTermTree.__Sub", {
        // summary:
        //     Substitution that can be made for a given code.
        // medcinId: Number
        //     Medcin identifier for the sub.
        // nodeKey: String
        //     Location within the Medcin hierarchy of the sub.
        // text: String
        //     Human readable text used to display the sub.
        // code: String
        //     Code for the sub within the target vocabulary.
        // __iskwargs:
        //     True
	});
	=====*/

    return CodedTermTree;
});