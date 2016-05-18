define([
	"qc/ContentUploadDialog",
	"qc/TreeNode",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/Dialog",
	"dijit/form/Button",
	"dijit/form/DateTextBox",
	"dijit/form/NumberTextBox",
	"dijit/form/TextBox",
	"dijit/layout/BorderContainer",
	"dijit/layout/ContentPane",
	"dijit/registry",
	"dijit/Toolbar",
	"dijit/Tooltip",
	"dijit/ToolbarSeparator",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/aspect",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/on",
	"dojo/query",
	"dojo/text!qc/templates/LibraryManagerDialog.htm",
	"dojo/topic",
	"dojo/when",
	"dojo/window",
	"qc/_core",
	"qc/DataSheet",
	"qc/FilteringSelect",
	"qc/LibraryManagerSearchResultList",
	"qc/ResizableDialogMixin",
	"qc/SettingsEnumStore",
	"qc/StringUtil",
	"qc/XmlWriter",
	"dojo/request"
], function (ContentUploadDialog, TreeNode, _WidgetsInTemplateMixin, Dialog, Button, DateTextBox, NumberTextBox, TextBox, BorderContainer, ContentPane, registry, Toolbar, Tooltip, ToolbarSeparator, array, declare, lang, aspect, domClass, domConstruct, domGeometry, domStyle, on, query, LibraryManagerDialogTemplate, topic, when, win, core, DataSheet, FilteringSelect, LibraryManagerSearchResultList, ResizableDialogMixin, SettingsEnumStore, StringUtil, XmlWriter, request) {
	return declare("qc.LibraryManagerDialog", [Dialog, _WidgetsInTemplateMixin, ResizableDialogMixin], {
		title: 'Content Library',
		
		templateString: LibraryManagerDialogTemplate,
		uploadDialog: null,
		tools: {},
		currentFolder: null,
		defaultProperties: {},
		searchResultList: new LibraryManagerSearchResultList(),
		tooltips: {},

		attributeFlags: {
			none: 0x0,
			canRead: 0x1,
			canWrite: 0x2,
			canDelete: 0x4,
			container: 0x10,
			item: 0x20,
			defaultItem: 0x40,
			canMerge: 0x80,
			system: 0x10000,
			any: -1
		},

		propertyColumns: [
			{ caption: 'Property Name', propertyName: 'name', styleClass: 'propertyNameCell', defaultValue: '', multiLine: false },
			{ caption: 'Value', propertyName: 'value', defaultValue: '', styleClass: 'valueCell', multiLine: false }
		],
	
		startup: function () {
			if (!this._started) {
				core.labelI18n(this, "tbNewFolder");
				core.labelI18n(this, "tbUpload");
				core.labelI18n(this, "tbDownload");
				core.labelI18n(this, "tbRename");
				core.labelI18n(this, "tbDelete");
				core.labelI18n(this, "tbClose");
	
				this.navTree.resolveChildren = lang.hitch(this, this.resolveChildren);
				this.navTree.nodeFromItem = lang.hitch(this, this.nodeFromItem);
				this.navTree.getDropAction = lang.hitch(this, this.getDropAction);
				this.navTree.doDrop = lang.hitch(this, this.doDrop);
				this.navTree.hideRoot = true;
	
	
				this.rootNode = this.navTree.addItem({ text: "Content Library", id: "", type: "folder", icon: "folder", subs: "+" });
				this.rootNode.expand();
				this.currentFolder = this.rootNode;
	
				this.dataSheet = new DataSheet();
				this.dataSheet.placeAt(this.propertyFields);
				this.dataSheet.startup();

				this.events = [
					aspect.after(this.navTree, "onSelectionChanged", lang.hitch(this, this.onSelectionChanged), true),
					aspect.after(this.searchResultList, "onItemClick", lang.hitch(this, this.onSearchItemClicked), true),
                    aspect.after(this.navTree, "onLabelChanged", lang.hitch(this, this.onTreeLabelChanged), true)
				];

				if (!this.hasContentMetaDataService()) {
                    domStyle.set(this.searchSeparator.domNode, "display", "none");
                    domStyle.set(this.filterBox.domNode, "display", "none");

					this.events.push(aspect.after(this.navTree, "onNodeClick", lang.hitch(this, this.onFolderClicked), true));
					this.events.push(aspect.after(this.lvDetails, "onSelectionChanged", lang.hitch(this, this.onSelectionChanged), true));
					this.events.push(aspect.after(this.lvDetails, "onLabelChanged", lang.hitch(this, this.onDetailLabelChanged), true));
				}

				else {
					this.events.push(aspect.after(this.navTree, "onNodeClick", lang.hitch(this, function (treeNode) {
						this.currentFolder = treeNode;
					}), true));
					this.events.push(aspect.after(this.dataSheet, "onCellValueChanged", lang.hitch(this, this.propertyGridValueChanged), true));
					this.events.push(aspect.after(this.dataSheet, "deleteRow", lang.hitch(this, this.enableSave), true));
					this.events.push(aspect.after(this.dataSheet, "onEditKeyUp", lang.hitch(this, function (evt) {
						if (!this.savePropertiesButton.get("disabled")) {
							return;
						}
						
						var cellInfo = this.dataSheet.getCellInfo(evt.target);

						if (!cellInfo || cellInfo.c != 2) {
							return;
						}

						var propertyName = this.dataSheet.cellValue(this.dataSheet.table.rows[cellInfo.r].cells[1]);

						var originalProperty = array.filter(this.originalProperties.properties, lang.hitch(this, function (item) {
							return item.name == propertyName;
						}));
						originalProperty = originalProperty.length == 0 ? null : originalProperty[0];

						if (!originalProperty || originalProperty.value != this.dataSheet.cellValue(cellInfo.cell)) {
							this.enableSave();
						}
					}), true));
				}
	
				this.inherited(arguments);
	
				if (core.app.isDemo) {
					array.forEach(this.toolbar.getChildren(), function (child) {
						child.set('disabled', true);
					});
				};
	
				topic.subscribe('/ContentLibraryManager/ProcessDelete', lang.hitch(this, this.processDelete));
			    topic.subscribe('/qc/ContentLibrary/Changed', lang.hitch(this, this.contentLibraryChanged));
	
				this.mainPanel.startup();
				this.onSelectionChanged();

				if (this.hasContentMetaDataService()) {
					domStyle.set(this.lvDetails.domNode, "display", "none");
					domStyle.set(this.tbRename.domNode, "display", "none");
					domStyle.set(this.renameSeparator.domNode, "display", "none");
				}

				this.resizer.minWidth = 760;
				this.resizer.minHeight = 600;
			};
		},

		contentLibraryChanged: function (parameters) {
            if (parameters && parameters.fromLibraryManager) {
                return;
            }

            this.navTree.clear();
            this.rootNode = this.navTree.addItem({ text: "Content Library", id: "", type: "folder", icon: "folder", subs: "+" });
            this.rootNode.expand();
            this.currentFolder = this.rootNode;
            domStyle.set(this.propertiesPane.domNode, "display", "none");

            this.tbNewFolder.set("disabled", true);
            this.tbUpload.set("disabled", true);
            this.tbDownload.set("disabled", true);
            this.tbRename.set("disabled", true);
            this.tbDelete.set("disabled", true);
		},
	
		resolveChildren: function (tNode) {
			if (!(tNode && tNode.data)) {
				return [];
			};

			var foldersPromise = (tNode.data.subs || tNode.refreshNeeded) ? core.xhrGet({
				url: core.serviceURL("Quippe/ContentLibrary/Folders"),
				content: { ParentId: tNode.data.id, DataFormat: "JSON" },
				preventCache: true,
				handleAs: "json",
				error: function(message) {
					core.showError(message);
					return [];
				},
				load: function(data, ioArgs) {
					if (data.error) {
						core.showError(data.error.message);
						return [];
					}
					return data.items || [];
				}
			}) : null;

			if ((this.hasContentMetaDataService() && tNode.data.fileSubs) || tNode.refreshNeeded) {
			    tNode.refreshNeeded = false;

				var retrieveFiles = lang.hitch(this, function(foldersData) {
					var attr = this.attributeFlags.item;

					return request(core.serviceURL("Quippe/ContentLibrary/List"), {
						query: { ParentId: tNode.data.id, Attributes: attr, DataFormat: "JSON" },
						handleAs: "json",
						preventCache: true
					}).then(function(data) {
						if (data.error) {
							return core.showError(data.error.message);
						}
						return data.items && data.items.length > 0 ? foldersData.concat(data.items) : foldersData;
					}, function(err) {
						core.showError(err);
						return [];
					});
				});
				
				if (foldersPromise) {
					return foldersPromise.then(function (foldersData) {
						return retrieveFiles(foldersData);
					});
				}

				else {
					return retrieveFiles([]);
				}
			}

			else {
			    tNode.refreshNeeded = false;
				return foldersPromise;
			}
		},
	
		nodeFromItem: function (item) {
			if (!item.text) {
				item.text = item.name;
			};
			var node = new TreeNode({
				label: item.text,
				icon: item.icon || core.getItemIcon(item, true),
				lazyLoading: item.subs || (this.hasContentMetaDataService() && item.fileSubs) ? true : false,
				reserveIconSpace: false,
				data: item
			});
			return node;
		},
	
		showFolder: function (folderNode) {
			if (!folderNode) {
				folderNode = this.currentFolder;
			}
	
			if (!folderNode) {
				return;
			};
			this.navTree.select(folderNode);
	
			var lvDetails = this.lvDetails;
			lvDetails.clear();
	
			var attr = this.attributeFlags.item;
	
			this.currentFolder = folderNode;
			var self = this;

			return request(core.serviceURL("Quippe/ContentLibrary/List"), {
				query: { ParentId: folderNode.data.id, Attributes: attr, DataFormat: "JSON" },
				handleAs: "json",
				preventCache: true
			}).then(function (data) {
				if (data.error) {
					return core.showError(data.error.message);
				}
				array.forEach(data.items, function (item) { lvDetails.addItem(item); });
				self.onSelectionChanged();
			}, function(err) {
				core.showError(err);
			});
		},
	
		getSelectedItem: function () {
			var widget = this.lvDetails.getSelectedItem() || this.navTree.selectedNode || null;
			if (widget && widget.data) {
				return widget.data;
			}
			else {
				return null;
			}
		},
	
		onSelectionChanged: function () {
            if (this.suppressShowProperties) {
                return;
            }

			domStyle.set(this.propertiesPane.domNode, "display", "none");

			var item = this.getSelectedItem();

			if (!item) {
				this.tbNewFolder.set('disabled', true);
				this.tbDelete.set('disabled', true);
				this.tbRename.set('disabled', true);
				this.tbDownload.set('disabled', true);
				this.tbUpload.set('disabled', true);
				return;
			};

			if (item.attributes & this.attributeFlags.container) {
				this.tbNewFolder.set('disabled', (item.attributes & this.attributeFlags.canWrite) == 0);
				this.tbDelete.set('disabled', (item.attributes & this.attributeFlags.canDelete) == 0);
				this.tbRename.set('disabled', (item.attributes & this.attributeFlags.canWrite) == 0);
				this.tbDownload.set('disabled', false);
				this.tbUpload.set('disabled', (item.attributes & this.attributeFlags.canWrite) == 0);
				if (!item.parentId) {
					this.tbDelete.set('disabled', true);
					this.tbRename.set('disabled', true);
				};
			}
			else {
				this.tbNewFolder.set('disabled', true);
				this.tbDelete.set('disabled', (item.attributes & this.attributeFlags.canDelete) == 0);
				this.tbRename.set('disabled', (item.attributes & this.attributeFlags.canWrite) == 0);
				this.tbDownload.set('disabled', false);
				this.tbUpload.set('disabled', true);
			}

			if (this.hasContentMetaDataService()) {
				when(this.getDefaultProperties(item.type), lang.hitch(this, function(defaultProperties) {
					request(core.serviceURL("Quippe/ContentLibrary/Properties"), {
						query: { DataFormat: "JSON", id: item.id },
						handleAs: "json",
						preventCache: true
					}).then(lang.hitch(this, function(itemProperties) {
						domStyle.set(this.propertiesPane.domNode, "display", "block");
						this.savePropertiesButton.set("disabled", true);

						this.typeContainer.innerHTML = StringUtil.toCamelUpper(item.type);
					    this.idContainer.innerHTML = item.id;

						if (!itemProperties.properties) {
							itemProperties.properties = [];
						}

						for (var i = 0; i < defaultProperties.length; i++) {
							var itemProperty = array.filter(itemProperties.properties, function(item) {
								return item.name == defaultProperties[i].name;
							});

							itemProperty = itemProperty.length > 0 ? itemProperty[0] : null;

							if (!itemProperty) {
								itemProperties.properties.push({
									name: defaultProperties[i].name
								});
							}
						}

						itemProperties.properties.push({
							name: "Name",
							value: item.text || item.name
						});

						itemProperties.properties.push({
							name: "Keywords",
							value: item.keywords
						});

						itemProperties.properties.sort(function (a, b) {
                            if (a.name.toLowerCase() == "name") {
                                return -1;
                            }

                            if (b.name.toLowerCase() == "name") {
                                return 1;
                            }

							if (a.name.toLowerCase() < b.name.toLowerCase()) {
								return -1;
							}

							if (a.name.toLowerCase() > b.name.toLowerCase()) {
								return 1;
							}

							return 0;
						});

						this.originalProperties = itemProperties;
						this.dataSheet.load(this.propertyColumns, itemProperties.properties);
					}));
				}), function(err) {
					core.showError(err);
				});
			}
		},

		saveProperties: function () {
			var item = this.getSelectedItem();
			var propertiesXml = new XmlWriter();
			var newProperties = this.dataSheet.getData();
			var renamed = false;
			var newName = null;
			var keywordsChanged = false;
			var newKeywords;

			propertiesXml.beginElement("Properties");

			for (var i = 0; i < newProperties.length; i++) {
				if (newProperties[i].name == "Name" && newProperties[i].value != "" && newProperties[i].value != null && newProperties[i].value != (item.text || item.name)) {
					renamed = true;
					newName = newProperties[i].value;
				}

				else if (newProperties[i].name == "Keywords" && newProperties[i].value != "" && newProperties[i].value != null && newProperties[i].value != item.keywords) {
					keywordsChanged = true;
					newKeywords = newProperties[i].value;
				}

				propertiesXml.beginElement("Property");
				propertiesXml.attribute("Name", newProperties[i].name);
				propertiesXml.attribute("Value", newProperties[i].value);
				propertiesXml.endElement();
			}

			propertiesXml.endElement();

			var deleteProperties = [];

			for (var j = 0; j < this.originalProperties.properties.length; j++) {
				if (this.originalProperties.properties[j].name == "Name") {
					continue;
				}

				var itemProperty = array.filter(newProperties, lang.hitch(this, function (item) {
					return item.name == this.originalProperties.properties[j].name;
				}));

				if (itemProperty.length == 0) {
					deleteProperties.push(this.originalProperties.properties[j].name);
				}
			}

			request(core.serviceURL("Quippe/ContentLibrary/Properties"), {
				query: { id: item.id },
				data: { Properties: propertiesXml.toString() },
				preventCache: true,
				method: "POST"
			}).then(lang.hitch(this, function (data) {
				if (data.error) {
					core.showError(data.error.message);
				}

				else {
					if (deleteProperties.length > 0) {
						propertiesXml = new XmlWriter();
						propertiesXml.beginElement("Properties");

						for (var i = 0; i < deleteProperties.length; i++) {
							propertiesXml.beginElement("Property");
							propertiesXml.attribute("Name", deleteProperties[i]);
							propertiesXml.endElement();
						}

						propertiesXml.endElement();

						request(core.serviceURL("Quippe/ContentLibrary/DeleteProperties"), {
							query: { id: item.id },
							data: { Properties: propertiesXml.toString() },
							preventCache: true,
							method: "POST"
						}).then(lang.hitch(this, function(data) {
							if (data.error) {
								core.showError(data.error.message);
							}

							else {
								if (renamed) {
									this.navTree.selectedNode.set("label", newName);
									this.navTree.onLabelChanged(this.selectedNode, newName);

									if (item.text) {
										item.text = newName;
									}

									else {
										item.name = newName;
									}

									topic.publish('/qc/ContentLibrary/Changed', {
									    fromLibraryManager: true
									});
								}

								if (keywordsChanged) {
									item.keywords = newKeywords;
								}

								this.savePropertiesButton.set("disabled", true);
							}
						}, function (err) {
							core.showError(err);
						}));
					}

					else {
						if (renamed) {
							this.navTree.selectedNode.set("label", newName);
							this.navTree.onLabelChanged(this.selectedNode, newName);
							
							if (item.text) {
								item.text = newName;
							}

							else {
								item.name = newName;
							}

							topic.publish('/qc/ContentLibrary/Changed', {
                            fromLibraryManager: true
                        });
						}

						if (keywordsChanged) {
							item.keywords = newKeywords;
						}

						this.savePropertiesButton.set("disabled", true);
					}
				}
			}, function (err) {
				core.showError(err);
			}));
		},

		getDefaultProperties: function(itemType) {
			if (this.defaultProperties[itemType]) {
				return this.defaultProperties[itemType];
			}

			return request(core.serviceURL("Quippe/ContentLibrary/DefaultProperties"), {
				query: { DataFormat: "JSON", ItemType: itemType },
				handleAs: "json",
				preventCache: true
			}).then(lang.hitch(this, function (data) {
				if (data.error) {
					core.showError(data.error.message);
					return;
				}

				if (!data.properties) {
					data.properties = [];
				}

				this.defaultProperties[itemType] = data.properties;

				return data.properties;
			}), function (err) {
				core.showError(err);
			});
		},
	
		onFolderClicked: function (treeNode) {
			if (treeNode) {
				this.showFolder(treeNode);
			}
		},
	
		renameItem: function (id, newName) {
			return request(core.serviceURL('Quippe/ContentLibrary/Rename?DataFormat=JSON'), {
				data: { id: id, NewName: newName },
				handleAs: "json",
				method: "POST"
			}).then( function (data) {
				if (data.error) {
					return core.showError(data.error.message);
				};
				if (!data.response.success) {
					core.showError("Error renaming item " + data.response.message || "");
					return false;
				}
				else {
				    topic.publish('/qc/ContentLibrary/Changed', {
				        fromLibraryManager: true
				    });
					return true;
				}
			}, function (err) {
				core.showError(err);
			});
		},
	
		onTreeLabelChanged: function (treeNode, newLabel) {
            if (!treeNode) {
                return;
            }

			var self = this;
			when(this.renameItem(treeNode.data.id, newLabel), function () {
			    treeNode.data.text = newLabel;
                self.onFolderClicked(treeNode);
			});
		},
	
		onDetailLabelChanged: function (listItem, newLabel) {
			var self = this;
			when(this.renameItem(listItem.data.id, newLabel), function () {
				listItem.data.text = newLabel;
				self.showFolder()
			});
		},
	
		doNewFolder: function () {
			var tree = this.navTree;
			var parentFolder = this.navTree.selectedNode || this.rootNode;
		    var self = this;
	
			when(parentFolder.expand(), function () {
				var namePrefix = 'New Folder';
				var nameIndex = 0;
				var newName = namePrefix;
				var existingItems = array.filter(parentFolder.getChildren(), function (item) { return (item.data.text == newName) });
				while (existingItems.length > 0) {
					nameIndex += 1;
					newName = namePrefix + ' ' + nameIndex;
					existingItems = array.filter(parentFolder.getChildren(), function (item) { return (item.data.text == newName) });
				};
	
				request(core.serviceURL("Quippe/ContentLibrary/Save?DataFormat=JSON"), {
					data: { name: newName, type: 'folder', ParentId: parentFolder.data.id, mimeType: '' },
					method: "POST",
					handleAs: "json"
				}).then(function (data) {
					if (data.error) {
						return core.showError(data.error.message);
					};
					var child = parentFolder.addItem(data.item);
					when(parentFolder.expand(), function () {
					    self.suppressShowProperties = true;
					    tree.select(child);
					    domStyle.set(self.propertiesPane.domNode, "display", "none");
					    tree.startLabelEdit();
					    self.suppressShowProperties = false;
					});
				    topic.publish('/qc/ContentLibrary/Changed', {
				        fromLibraryManager: true
				    });
				}, function (err) {
					core.showError(err);
				});
			});
		},
	
		doUpload: function () {
			if (!this.currentFolder) {
				return;
			}
	
			core.doDialog(ContentUploadDialog, { parentId: this.currentFolder.data.id }, function () {
			    topic.publish('/qc/ContentLibrary/Changed', {
			        fromLibraryManager: true
			    });

				if (this.hasContentMetaDataService()) {
				    this.currentFolder.invalidate();
				    this.currentFolder.lazyLoading = true;
				    this.currentFolder.refreshNeeded = true;
					this.currentFolder.expand();
				}

				else {
					this.showFolder();
				}
			}, null, this);
	
		},
	
		doDownload: function () {
			//var li = this.lvDetails.getSelectedItem();
			//if (!li) {
			//    return;
			//};
	
			//var id = li.data.id;
			//if (!id) {
			//    return;
			//};

			var item = this.getSelectedItem();
			if (item && item.id) {
				var url = core.serviceURL('Quippe/ContentLibrary/Export?id=' + item.id);
				window.location.href = url;
			}
	

		},
	
		doRename: function () {
			var item = this.getSelectedItem();
			if (item) {
				if (item.type == 'folder' || this.hasContentMetaDataService()) {
					this.navTree.startLabelEdit();
				}
				else {
					this.lvDetails.startLabelEdit();
				}
			};
		},
	
		doDelete: function () {
			var item = this.getSelectedItem();
			if (!item) {
				return;
			};
	
			core.confirm({
				title: core.getI18n('confirmdeletedialogtitle'),
				message: item.type == 'folder' ? core.getI18n('confirmdeletecontentfolder', [item.text]) : core.getI18n('confirmdeletecontentitem', [item.text]),
				topic: '/ContentLibraryManager/ProcessDelete',
				topicParms: item
			});
		},
	
		processDelete: function (item) {
			var self = this;
			if (item.type == 'folder' || this.hasContentMetaDataService()) {
				if (!this.currentFolder) {
					return;
				};
				var childFolder = this.currentFolder;
				var parentFolder = childFolder.parentNode;
				this.navTree.clearSelection();
			}
	
			request(core.serviceURL('Quippe/ContentLibrary/Delete?DataFormat=JSON'), {
				data: { id: item.id },
				handleAs: "json",
				method: "POST"
			}).then(function (data) {
				if (data.error) {
					core.showError(data.error.message);
				}
				else if (!data.response.success) {
					core.showError("Error deleting: " + data.response.message);
				}
				else {
					if (item.type == 'folder' || self.hasContentMetaDataService()) {
						parentFolder.removeChild(childFolder);
						self.showFolder(parentFolder);
					}
					else {
						self.showFolder();
					};
					topic.publish('/qc/ContentLibrary/Changed', {
					    fromLibraryManager: true
					});
				}
			}, function (err) {
				core.showError(err);
			});
		},
	
		getTreeNodeIdPath: function (treeNode) {
			var list = [];
			while (treeNode && treeNode.data) {
				list.push(treeNode.data.id);
				treeNode = treeNode.parentNode;
			}
			return list;
		},
	
		getDropAction: function (source, evt, treeNode) {
			if (source && source.id
				&& treeNode && treeNode.data
				&& treeNode.data.id != source.id
				&& (!source.parentId || source.parentId != treeNode.data.id)
				&& (domClass.contains(evt.target, 'label') || domClass.contains(evt.target, 'icon'))
				&& treeNode.data.attributes & this.attributeFlags.container
				&& treeNode.data.attributes & this.attributeFlags.canWrite
				&& array.indexOf(this.getTreeNodeIdPath(treeNode), source.id) < 0
			) {
				if (evt.ctrlKey) {
					return 'copy';
				}
				else if (!(source.attributes & this.attributeFlags.canWrite)) {
				    return 'copy';
				}
				else {
					return 'move';
				};
			};
			return null;
		},
	
		doDrop: function (source, evt, treeNode) {
			var action = this.getDropAction(source, evt, treeNode);
			if (!action) {
				return;
			};
	
			var self = this;
	
			var sourceParentNode = null;
			if (source.type == 'folder' || this.hasContentMetaDataService()) {
				sourceParentNode = this.navTree.findNode(function (x) { return x.data.id == source.parentId });
			};
	
			request(core.serviceURL('Quippe/ContentLibrary/' + action + '?DataFormat=JSON'), {
				data: { id: source.id, NewParentId: treeNode.data.id },
				handleAs: 'json',
				method: 'POST'
			}).then(function (data) {
			    if (data.error) {
					core.showError(data.error.message);
				}
			    else if (!data.response.success) {
					core.showError(data.response.message);
				}
			    else {
			        treeNode.invalidate();
			        treeNode.refreshNeeded = true;
			        treeNode.expand();

					topic.publish('/qc/ContentLibrary/Changed', {
					    fromLibraryManager: true
					});

					if (sourceParentNode) {
					    sourceParentNode.removeChild(source.sourceOwner);
					}
			    };

				self.showFolder();
			}, function (err) {
				core.showError(err);
			});
		},

		hasContentMetaDataService: function() {
			return array.indexOf(core.settings.services, 'Quippe.IContentMetaDataService') >= 0;
		},

		onResizerUpdate: function(width, height) {
			domStyle.set(this.containerNode, "width", width + "px");
			domStyle.set(this.containerNode, "height", height + "px");

			this.mainPanel.resize({
				w: width,
				h: height - 41
			});
		},

		onSearchItemClicked: function(item) {
			var itemNode = this.navTree.findNode(lang.hitch(this, function(x) {
				return x.data.id == (this.hasContentMetaDataService() || item.data.type == 'folder' ? item.data.id : item.data.parentId);
			}));

			var highlightNode = lang.hitch(this, function(nodeToHighlight) {
				nodeToHighlight.expand();

				var parent = nodeToHighlight.parentNode;

				while (parent) {
					parent.expand();
					parent = parent.parentNode;
				}

				this.navTree.select(nodeToHighlight);
				win.scrollIntoView(nodeToHighlight.domNode);

				if (!this.hasContentMetaDataService()) {
					this.showFolder(nodeToHighlight).then(lang.hitch(this, function () {
						if (item.data.type != 'folder') {
							var listViewItem = this.lvDetails.getItem(item.data.id);

							this.lvDetails.setSelectedItem(listViewItem);
							win.scrollIntoView(listViewItem.domNode);
						}
					}));
				}

				this.filterBox.closePopup();
			});

			var needsFullPathLookup = false;

			if (itemNode) {
				highlightNode(itemNode);
			}

			else {
				if (this.hasContentMetaDataService()) {
					itemNode = this.navTree.findNode(lang.hitch(this, function (x) {
						return x.data.id == item.data.parentId;
					}));

					if (itemNode) {
						when(itemNode.expand(), lang.hitch(this, function () {
							itemNode = this.navTree.findNode(lang.hitch(this, function (x) {
								return x.data.id == item.data.id;
							}));

							highlightNode(itemNode);
						}));
					}

					else {
						needsFullPathLookup = true;
					}
				}

				else {
					needsFullPathLookup = true;
				}
			}

			if (needsFullPathLookup) {
				request(core.serviceURL('Quippe/ContentLibrary/Info?DataFormat=JSON'), {
					query: { id: (this.hasContentMetaDataService() || item.data.type == 'folder' ? item.data.id : item.data.parentId), IncludeAncestorIds: true },
					handleAs: 'json',
					method: 'GET'
				}).then(lang.hitch(this, function (data) {
					if (data.error) {
						core.showError(data.error.message);
					}

					var expandNodes = null;

					for (var i = data.item.ancestors.length - 1; i >= 0; i--) {
						itemNode = this.navTree.findNode(lang.hitch(this, function (x) {
							return x.data.id == data.item.ancestors[i].id;
						}));

						if (itemNode) {
							expandNodes = data.item.ancestors.slice(i + 1);
							break;
						}
					}

					var createCallback = lang.hitch(this, function(childNodes) {
						return lang.hitch(this, function() {
							if (childNodes.length == 0) {
								itemNode = this.navTree.findNode(lang.hitch(this, function(x) {
									return x.data.id == (this.hasContentMetaDataService() || item.data.type == 'folder' ? item.data.id : item.data.parentId);
								}));

								highlightNode(itemNode);
								return null;
							}

							else {
								itemNode = this.navTree.findNode(lang.hitch(this, function(x) {
									return x.data.id == childNodes[0].id;
								}));

								return itemNode.expand().then(createCallback(childNodes.slice(1)));
							}
						});
					});

					return itemNode.expand().then(createCallback(expandNodes));
				}), function (err) {
					core.showError(err);
				});
			}
		},

		enableSave: function () {
			var valid = query("tr.data.error", this.dataSheet.domNode).length == 0;
			this.savePropertiesButton.set("disabled", !valid);
		},

		propertyGridValueChanged: function (cellInfo, value) {
			if (cellInfo.c == 1 && this.dataSheet.getData().filter(function(item) {
				return item.name == value;
			}).length > 1) {
				domClass.add(cellInfo.row, "error");
				var tooltip = new Tooltip({
					label: "Property names must be unique",
					connectId: cellInfo.row,
					position: ["above"]
				});
				tooltip.startup();
				Tooltip.show("Property names must be unique", cellInfo.row, ["above"]);
				this.tooltips["row" + cellInfo.r] = tooltip;
			}

			else if (cellInfo.c == 1) {
				domClass.remove(cellInfo.row, "error");

				if (this.tooltips["row" + cellInfo.r]) {
				    this.tooltips["row" + cellInfo.r].destroy();
				    delete this.tooltips["row" + cellInfo.r];
				}
			}

			this.enableSave();
		},

		selectNodeText: function (e) {
		    var range;

            if (document.body.createTextRange) {
                range = document.body.createTextRange();
                range.moveToElementText(e.target);
                range.select();
            }

            else if (window.getSelection) {
                var selection = window.getSelection();
                range = document.createRange();
                range.selectNodeContents(e.target);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
	});
});