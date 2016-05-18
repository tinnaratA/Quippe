/*

The following is an example of adding custom widget to the designer toolbox.

*/
define([
    "dojo/_base/declare",
    "dojo/topic",
    "qc/note/_Element",
    "qc/_core"
], function (declare, topic, _Element, core) {

    //definition of our custom note element widget...
    var typeDef = declare('samples.ToolboxExample', [_Element], {
        templateString: '<div style="display:inline-block;padding:12px;background-color:#abcdef;border:1px #999999 solid;font-size:150%;text-align:center;">My Custom Note Element</div>'
    });

    //subscribe to the ToolboxLoaded topic, which the designer toolbox will publish when it first loads
    var hToolboxLoaded = topic.subscribe('/qc/Design/ToolboxLoaded', function (toolbox) {
        // remove the subscription handle, since we only want to do this once
        hToolboxLoaded.remove();

        // register our widget with a name and group for the item in the toolbox, and a string representing the XML that will be used
        // to create new instances of our widget
        toolbox.registerTool('My Custom Widget', 'Samples', '<Element Type="samples.ToolboxExample"></Element>');
    });

    return typeDef;
});