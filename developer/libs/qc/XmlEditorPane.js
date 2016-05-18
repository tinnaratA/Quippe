define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/CheckedMenuItem",
    "dijit/form/Button",
    "dijit/form/DropDownButton",
	"dijit/layout/_LayoutWidget",
    "dijit/Menu",
    "dijit/registry",
    "dijit/ToolbarSeparator",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/on",
	"dojo/query",
    "dojo/topic",
    "qc/_core",
    "qc/design/ToolbarBuilder",
    "qc/ReviewPane",
    "qc/XmlUtil",
    "qc/XmlWriter"
], function (_TemplatedMixin, _WidgetBase, CheckedMenuItem, Button, DropDownButton, _LayoutWidget, Menu, registry, ToolbarSeparator, array, declare, event, lang, domClass, domConstruct, on, query, topic, core, ToolbarBuilder, ReviewPane, XmlUtil, XmlWriter) {
	return declare("qc.XmlEditorPane", [_WidgetBase, _TemplatedMixin, _LayoutWidget, ReviewPane], {
		editMode: 'document',
		currentTarget: null,

		show: function () {
			this.setEditMode();
		},

		startup: function() {
			if (!this._started) {
				domClass.add(this.domNode, 'qcXmlEditorPane');
				
				this.textEditor = domConstruct.place('<textarea spellcheck="false" class="textEditor"></textarea>', this.domNode);
				on(this.textEditor, "keydown", lang.hitch(this, this.onKeyDown));
    
				this.inherited(arguments);
				this.resize();
			}
		},

		hide: function () {
			if (this.hSelectionChanged) {
				core.unsubscribe(this.hSelectionChanged);
				this.hSelectionChanged = null;
			};
		},

		getToolbarItems: function () {
			var list = [];

			this.editModeMenu = new Menu();
			this.editModeMenu.addChild(new CheckedMenuItem({
				label: 'Whole Document',
				checked: true,
				editMode: 'document',
				onClick: lang.hitch(this, this.onEditModeMenuClicked)
			}));
			this.editModeMenu.addChild(new CheckedMenuItem({
				label: 'Selected Element',
				checked: false,
				editMode: 'element',
				onClick: lang.hitch(this, this.onEditModeMenuClicked)
			}));

			this.editModeButton = new DropDownButton({
				label: 'View',
				iconClass: '',
				dropDown: this.editModeMenu
			});
			list.push(this.editModeButton);

			list.push(new ToolbarSeparator());

			list.push(new Button({
				label: 'Reload XML',
				iconClass: 'arrow_down_green',
				onClick: lang.hitch(this, this.reload)
			}));

			list.push(new Button({
				label: 'Apply Changes',
				iconClass: 'arrow_up_green',
				onClick: lang.hitch(this, this.applyChanges)
			}));


			return list;
		},

		reload: function () {
			this.textEditor.value = '';
			var noteEditor = query('.qcNoteEditor').map(registry.byNode)[0];
			if (!noteEditor) {
				return;
			};

			var target = this.editMode == 'document' ? noteEditor.note : noteEditor.selection.getSelectedWidgets()[0];
			if (!target) {
				return;
			};

			var writer = new XmlWriter({ indentString: '\t' });
			target.writeNoteElement(writer, 'template');
			var xml = writer.toString();
			this.textEditor.value = xml;

			this.currentTarget = target;
		},

		applyChanges: function () {
			var xDoc = null;
			try {
				xDoc = XmlUtil.createDocument(this.textEditor.value);
			}
			catch (ex) {
				return core.showError(ex);
			};

			if (!xDoc) {
				return;
			};

			if (xDoc.documentElement.tagName.toLowerCase() == 'parsererror') {
				var errorText = xDoc.documentElement.innerHTML.replace(/sourcetext/g, 'pre');
				return core.showError(errorText);
			};

			var noteEditor = query('.qcNoteEditor').map(registry.byNode)[0];
			if (!noteEditor) {
				return;
			};

			if (this.editMode == 'document') {
				var editorView = noteEditor.viewMode;
				noteEditor.clear();
				noteEditor.loadXml(xDoc);
				noteEditor.setView(editorView);
			}
			else if (this.editMode == 'element' && this.currentTarget) {
				var widget = core.Note.parseXml(xDoc.documentElement);
				if (widget) {
					widget.placeAt(this.currentTarget.domNode, 'before');
					this.currentTarget.dropDelete();
					noteEditor.select(widget, true);
					noteEditor.updateDisplay();

					topic.publish('/qc/OnGroupingRulesChanged');
					topic.publish("/noteEditor/AnchorsChanged");
					topic.publish("/qc/ContentLoaded");
				};
			};


			this.reload();
		},

		onKeyDown: function (e) {
			if (e.keyCode == 9) {
				var editor = this.textEditor;
				event.stop(e);
				if (e.shiftKey) {
				}
				else {
					var selStart = editor.selectionStart;
					editor.value = editor.value.substr(0, selStart) + '\t' + editor.value.substring(selStart);
					editor.selectionStart = editor.selectionEnd = selStart + 1;
				};
			};
		},

		onEditModeMenuClicked: function (evt) {
			var menuItem = registry.getEnclosingWidget(evt.target);
			if (menuItem && menuItem.editMode) {
				this.setEditMode(menuItem.editMode);
			};
		},

		setEditMode: function (mode) {
			mode = mode || this.editMode || 'document';
			if (mode == 'document') {
				if (this.hSelectionChanged) {
					core.unsubscribe(this.hSelectionChanged);
					this.hSelectionChanged = null;
				};
			}
			else {  //element
				if (!this.hSelectionChanged) {
					this.hSelectionChanged = topic.subscribe('/noteEditor/SelectionChanged', lang.hitch(this, this.onEditorSelectionChanged));
				};
			};

			array.forEach(this.editModeMenu.getChildren(), function (item) {
				item.set('checked', item.editMode == mode ? true : false);
			});

			this.editMode = mode;
			this.reload();
		},

		onEditorSelectionChanged: function () {
			this.reload();
		}
	});
});