// This is a very basic Quippe application that demonstrates how to setup your application class initially and override basic 
// methods.  In this case, we're adding an item to the context menu that displays for findings that allows the user to open the
// XML editor directly on that finding.

define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/topic",
    "Quippe/Application"
], function(declare, lang, topic, Application) {
    return declare("samples.CustomContextMenuApp", [Application], {
        // The getContextActions() method is invoked whenever the right mouse button is clicked and returns a list of actions to
        // be displayed in the menu.
        getContextActions: function (item, widget, targetNode) {
            // We first call the base class' method to get the initial list of actions to add to
            var actions = this.inherited(arguments);

            // Only add items if we're dealing with a finding
            if (item != null && item.type == "finding") {
                actions.push({ label: "Show XML", icon: 'view', onClick: lang.hitch(this, this.showFindingXML), beginGroup: true });
            }

            return actions;
        },

        showFindingXML: function () {
            // The /qc/ChartReview/OpenView topic will open a task pane instance on the bottom part of the screen, so we'll pass
            // in the XML editor pane module path and initialize it with an editMode of element so that it starts off focused on
            // the selected element.
            topic.publish("/qc/ChartReview/OpenView", {
                id: "XmlEditorPane",
                title: "XML Editor",
                typeName: "qc/XmlEditorPane",
                instanceParms: {
                    editMode: "element"
                },
                instance: null
            });
        }
    });
})