define([
	"dojo/_base/declare",
	"qc/_core",
	"qc/TaskPane"
], function (declare, core, TaskPane) {
	var TaskPaneOverride = declare("qc.design.TaskPaneOverride", TaskPane, {
		modes: ['']
	});

	core.settings.designToolboxClass = TaskPaneOverride;

	return TaskPaneOverride;
});