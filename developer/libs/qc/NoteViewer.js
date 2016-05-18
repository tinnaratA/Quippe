define([
    "qc/Note",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/dom-class",
    "dojo/dom-style"
], function (Note, _TemplatedMixin, _WidgetBase, declare, event, domClass, domStyle) {
    return declare("qc.NoteViewer",[_WidgetBase, _TemplatedMixin], {
        note: null,
        templateString: '<div class="noteViewer" data-dojo-attach-event="mousedown:_onMouseDown"></div>',

        load: function (id) {
            //TODO: Fetch encounter note from server then loadXml
        },

        loadXml: function (xDoc) {
            var note = Note.parseXml(xDoc, 'lstDocumentTemplate');
            if (note) {
                this.clear();
                note.placeAt(this.domNode);
	            note.updateDisplay();
                this.note = note;
            };
        },

        setView: function (viewMode) {
        },

        clear: function () {
            if (this.note) {
                this.note.deleteSelf();
            }
            domStyle.set(this.domNode, { left: '0px', top: '0px' });
        },


        _onMouseDown: function (evt) {
            event.stop(evt);
        },

        setStandardView: function() {
            if (!this.note) {
                return;
            }

            if (this.note.domNode) {
                domClass.remove(this.note.domNode, 'concise');
                this.note.updateDisplay('expanded');
                this.note.transcribe();
            }
        },

        setPrintView: function () {
            if (!this.note) {
                return;
            }

            if (this.note.domNode) {
                domClass.add(this.note.domNode, 'concise');
                this.note.updateDisplay('concise');
                this.note.transcribe();
            }
        }
    });
});