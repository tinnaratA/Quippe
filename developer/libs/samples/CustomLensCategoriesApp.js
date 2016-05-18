// This is a very basic Quippe Clinical Lens application that demonstrates how to setup your application class initially and 
// override basic methods.  In this case, we're customizing the rules that are used to place findings into categories and adding
// a new category.

define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/request",
    "ClinicalLens/Application",
    "qc/_core"
], function (declare, lang, domConstruct, request, Application, core) {
    return declare("samples.CustomLensCategoriesApp", [Application], {
        // addFindingCategories() is invoked during application startup to create the TitlePane instances used to display the
        // findings
        addFindingCategories: function () {
            this.inherited(arguments);

            // For demonstration purposes only, we are going to remove the "Unmapped Findings" category so that our new category
            // will fit into the existing layout
            domConstruct.destroy(this.findingCategoryPanes['Unmapped Findings'].entireChart.domNode.parentNode);
            domConstruct.destroy(this.findingCategoryPanes['Unmapped Findings'].mostRecent.domNode.parentNode);

            delete this.findingCategoryPanes['Unmapped Findings'];

            // Add a new category pane for vital signs
            this.addFindingCategory('Vitals');
        },

        // When adding findings to Clinical Lens from a patient's chart, getFindingCategory() is called to determine which
        // category a finding belongs in; the return value from this function should be the title of the category created in
        // addFindingCategories()
        getFindingCategory: function (finding) {
            // If the finding is under vital signs in the MEDCIN hierarchy, place it in the "Vitals" category
            if (finding.nodeKey.substring(0, this.vitalSignsRootNodeKey.length) == this.vitalSignsRootNodeKey) {
                return 'Vitals';
            }

            // Otherwise, fall back to the standard rules
            return this.inherited(arguments);
        },

        startup: function() {
            if (!this._started) {
                this.inherited(arguments);

                // A common practice when categorizing findings in Clinical Lens is to check to see if the finding is a child of
                // a particular node in the MEDCIN hierarchy, so we're going to retrieve the node key for the vital signs finding
                // (MEDCIN ID 6001) to use in getFindingCategory(); remember that MEDCIN IDs are static, but node keys in the 
                // hierarchy can change between releases, so it's always a good idea to retrieve node keys from the server at 
                // startup rather than use a static value
                request.get(core.serviceURL('Medcin/Term/6001'), {
                    query: {
                        DataFormat: 'JSON'
                    },
                    handleAs: 'json'
                }).then(lang.hitch(this, function (data) {
                    this.vitalSignsRootNodeKey = '-' + data.term.nodekey.replace(/ /gi, '-');
                }));
            }
        }
    });
})