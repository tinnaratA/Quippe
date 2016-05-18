define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
	"dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/form/CheckBox",
	"dijit/popup",
    "dijit/registry",
	"dijit/TooltipDialog",
    "dojo/_base/array",
    "dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
	"dojo/dom-geometry",
    "dojo/on",
    "dojo/query",
    "dojo/text!qc/coding/templates/VocabChooserDialog.htm",
    "dojo/topic",
    "qc/_core"
], function (_TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Button, CheckBox, popup, registry, TooltipDialog, array, declare, lang, domAttr, domClass, domConstruct, domGeometry, on, query, VocabChooserDialogTemplate, topic, core) {
	return declare("qc.coding.VocabChooserDialog", [TooltipDialog, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: VocabChooserDialogTemplate,
        owner: null,
        table: null,
        dataChanged: null,
        events: [],
    
        _onShow: function () {
        	this.inherited(arguments);

			if (this.clickHandle) {
				core.disconnect(this.clickHandle);
				this.clickHandle = null;
			}

        	// We do this because otherwise IE will receive the click event that is still in progress (the one on the menu item being used to open this dialog)
        	// and will therefore close the dialog immediately.  Inserting a delay before wiring up the event handler assures the fact that the click event
        	// will be over the time it is wired.
	        window.setTimeout(lang.hitch(this, function() {
		        this.clickHandle = on(document, "click", lang.hitch(this, function(e) {
			        if (e.pageX <= 0 && e.pageY <= 0) {
				        return;
			        }

			        var rect = domGeometry.position(this.domNode, true);

			        if (e.pageX < rect.x || e.pageX > rect.x + rect.w || e.pageY < rect.y || e.pageY > rect.y + rect.h) {
				        this.onCancel();
			        }
		        }));
	        }), 500);
        },

        onHide: function () {
        	core.disconnect(this.clickHandle);
	        this.clickHandle = null;
        },

        _getDataChangedAttr: function () {
            return this.dataChanged;
        },
        _setDataChangedAttr: function (value) {
            this.dataChanged = value;
            this.saveDefaultButton.set('disabled', !value);
        },
    
        loadVocabs: function (owner) {
            this.owner = owner;
    
            domConstruct.empty(this.tableNode);
    
            var vocabs = owner.vocab;
            var v = 0;
            var vLen = vocabs.length;
            if (vLen == 0) {
                return;
            };
    
            var table = domConstruct.place('<table class="vocabTable"></table>', this.tableNode);
            var row = null;
            var c1 = null;
            var c2 = null;
            var c3 = null;
            var chk = null;
    
            for (v = 0; v < vLen; v++) {
                row = table.insertRow(-1);
                row.vocabName = vocabs[v].name;
    
                c1 = row.insertCell(-1);
                domClass.add(c1, 'checkCell');
                chk = new CheckBox();
                chk.startup();
                chk.vocabIndex = v;
                chk.vocabName = vocabs[v].name;
                chk.set('value', vocabs[v].show);
                chk.placeAt(c1);
                this.events.push(on(chk, "Click", lang.hitch(this, this.onVocabChecked)));
    
                c2 = row.insertCell(-1);
                domClass.add(c2, 'captionCell');
                c2.innerHTML = vocabs[v].caption || vocabs[v].name;
    
                c3 = row.insertCell(-1);
                domClass.add(c3, 'descriptionCell');
                c3.innerHTML = vocabs[v].description || '';
            };
            this.table = table;
        },
    
        destroyRecursive: function () {
            if (this.events) {
                array.forEach(this.events, core.disconnect);
                this.events = null;
            };
            this.inherited(arguments);
        },
    
        onCellClick: function (evt) {
            var row = core.ancestorNodeByTagName(evt.target, 'tr');
            if (!row) {
                return;
            };
    
            if (domClass.contains(row, 'selected')) {
            	domClass.remove(row, 'selected');

            	this.moveUpButton.set('disabled', true);
            	this.moveDownButton.set('disabled', true);
            }
            else {
                query('.selected', this.table).removeClass('selected');
                domClass.add(row, 'selected');

                this.moveUpButton.set('disabled', row.rowIndex > 0 ? false : true);
                this.moveDownButton.set('disabled', row.rowIndex >= this.table.rows.length - 1 ? true : false);
            };
        },
    
        onVocabChecked: function () {
            this.set('dataChanged', true);
        },
    
        onMoveUp: function () {
            var row = query('.selected', this.table)[0] || null;
            if (!row) {
                return;
            };
    
            var r = row.rowIndex;
            if (r <= 0) {
                return;
            };
    
            row.parentNode.insertBefore(row, this.table.rows[r - 1]);
            if (r - 1 == 0) {
	            this.moveUpButton.set('disabled', true);
            };
    
            this.set('dataChanged', true);
        },
    
        onMoveDown: function () {
            var row = query('.selected', this.table)[0] || null;
            if (!row) {
                return;
            };
    
            var r = row.rowIndex;
            if (r >= this.table.rows.length - 1) {
                return;
            };
    
            row.parentNode.insertBefore(this.table.rows[r + 1], row);
            if (r + 1 >= this.table.rows.length - 1) {
	            this.moveDownButton.set('disabled', true);
            };
    
            this.set('dataChanged', true);
        },
    
        onSaveDefault: function () {
            var sequence = [];
            var selected = [];
            var table = this.table;
            var r = 0;
            var rLen = table.rows.length;
            var row = null;
            var checkbox = null;
            for (r = 0; r < rLen; r++) {
                row = table.rows[r];
                checkbox = registry.byNode(row.cells[0].childNodes[0]);
                sequence.push(checkbox.vocabName);
                if (checkbox.get('checked')) {
                    selected.push(checkbox.vocabName);
                };
            };
            var data = {
                'CodeReviewVocabSequence': sequence.join(','),
                'CodeReviewSelectedVocabs': selected.join(',')
            };
    
            var self = this;
            core.xhrPost({
                url: core.serviceURL('Quippe/UserSettings/Data'),
                content: data,
                error: core.showError,
                load: function (res, ioArgs) {
                    self.set('dataChanged', false);
                    topic.publish('/qc/SettingsChanged', {
                        codeReviewVocabSequence: data.CodeReviewVocabSequence,
                        codeReviewSelectedVocabs: data.CodeReviewSelectedVocabs
                    });
                    return true;
                }
            });
        },
    
        onApply: function () {
            var owner = this.owner;
            var table = this.table;
            var r = 0;
            var rLen = table.rows.length;
            var row = null;
            var checkbox = null;
            for (r = 0; r < rLen; r++) {
                row = table.rows[r];
                checkbox = registry.byNode(row.cells[0].childNodes[0]);
                owner.vocab[checkbox.vocabIndex].show = checkbox.get('checked');
                owner.vocab[checkbox.vocabIndex].sequence = r;
            };
            owner.recalc();
            this.onCancel();
        },
    
        onCancel: function () {
	        popup.close(this);
        }
    
    });
});