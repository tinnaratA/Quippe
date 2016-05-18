// This sample application just includes the reference to the samples/FindingDetailsTaskPane
// The task pane will register itself with the taskbar when loaded.

define([
    "dojo/_base/declare",
    "Quippe/Application",
    "samples/FindingDetailsTaskPane"
], function (declare, Application, FindingDetailsTaskPane) {

    return declare("samples.CustomTaskPaneApp", [Application], {
    });

})