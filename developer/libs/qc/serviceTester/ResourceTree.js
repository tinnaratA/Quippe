define([
	"dijit/Dialog",
    "dojo/_base/array",
    "dojo/_base/declare",
    "qc/_core",
    "qc/TreeNode",
    "qc/TreeView"
], function (Dialog, array, declare, core, TreeNode, TreeView) {
	return declare("qc.ServiceTester.ResourceTree", [TreeView], {
		hideRoot: true,
		reserveIconSpace: false,

		startup: function () {
			if (!this._started) {
				this.loadTree();
				this.inherited(arguments);
			};
		},

		loadTree: function () {
			var self = this;
			this.root = this.addItem({ name: 'Web Services' });
			core.xhrGet({
				url: core.serviceURL('Help/Directory'),
				content: { DataFormat: 'JSON' },
				preventCache: true,
				handleAs: 'json',
				error: this.showError,
				load: function (data, ioArgs) {
					self.loadResources(self.root, data.resources);
					self.root.expand();
				}
			});
		},

		loadResources: function (parentNode, items) {
			if (!items) {
				return;
			};
			var self = this;
			var prevNode = null;
			array.forEach(core.forceArray(items), function (item) {
				if (prevNode && item.name == prevNode.data.name) {
					prevNode.set('label', prevNode.data.name + ' (' + prevNode.data.method + ')');
					item.caption = item.name + ' (' + item.method + ')';
				};
				var tNode = parentNode.addItem(item);
				self.loadResources(tNode, item.resource);
				prevNode = tNode;
			});
		},

		nodeFromItem: function (item) {
			return new TreeNode({ label: item.caption || item.name, reserveIconSpace: false, data: item });
		},

		showError: function (message) {
			if (this.errorDialog == null) {
				this.errorDialog = new Dialog({ title: "Error" });
			}
			this.errorDialog.attr("content", message);
			this.errorDialog.show();
		}
	});
});