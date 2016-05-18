// This is a basic Quippe Clinical Lens application that demonstrates how to customize the appearance of findings within Clinical
// Lens, specifically changing the color of positive/abnormal vs. negative/normal items within the "ROS & Exam" category and
// adding sub-groups to the "History" category.

define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "ClinicalLens/Application"
], function (declare, domClass, domConstruct, query, Application) {
    return declare("samples.CustomLensFindingsApp", [Application], {
        // addEntryToContainer() is invoked for each instance of a finding in a patient's chart and is responsible for creating
        // its DOM element and adding it to the provided container.  For categories that have sub-categories, like "Lab & 
        // Imaging" or "ROS & Exam", the provided container is the already-created sub-category div.  For everything else, the
        // container is the content node of the category TitlePane instance.
        addEntryToContainer: function (entry, findingElement, container, sortType) {
            var entryNode = this.inherited(arguments);

            // For items in the "ROS & Exam" category, we are going to color-code positive vs. negative findings to make them
            // easier to tell apart
            if (entry.category == 'ROS & Exam') {
                domClass.add(entryNode, entry.resultCode == 'A' ? 'pos' : 'neg');
            }

            return entryNode;
        },

        // getSubContainerForEntry() is invoked to get the sub-group within a category container that an entry belongs to.  It's
        // used for the "ROS & Exam" and "Lab & Imaging Results" categories to further classify the entries.  In our case, we're
        // going to be adding groups for personal and family history to the "History" category.
        getSubContainerForEntry: function(entry, container) {
            if (entry.category == 'History') {
                var subGroupClass = (entry.prefix || '').substring(0, 1) == 'F' ?
                    'familyHistoryContainer' :
                    'personalHistoryContainer';
                var subGroupTitle = (entry.prefix || '').substring(0, 1) == 'F' ? 'Family History' : 'Personal History';
                var subGroupPlacement = (entry.prefix || '').substring(0, 1) == 'F' ? 'last' : 'first';
                var actualContainer = query('.' + subGroupClass, container);

                if (actualContainer.length > 0) {
                    actualContainer = actualContainer[0];
                }

                else {
                    actualContainer = domConstruct.create('div', {
                        innerHTML: '<div class="groupHeader">' + subGroupTitle + '</div>',
                        className: subGroupClass + ' groupContainer'
                    });

                    if (container.firstChild && domClass.contains(container.firstChild, 'dateHeader') &&
                        subGroupPlacement == 'first') {
                        domConstruct.place(actualContainer, container.firstChild, 'after');
                    }

                    else {
                        domConstruct.place(actualContainer, container, subGroupPlacement);
                    }
                }

                return actualContainer;
            }

            return this.inherited(arguments);
        }
    });
})