define([
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/topic",
    "dojo/keys",
    "dojo/on",
    "qc/_core"
], function (declare, event, lang, topic, keys, on, core) {

    var typeDef = declare('qc.KeyHandler', [], {
        editor: null,

        constructor: function (disabled) {
            if (!disabled) {
                this.enable();
            };
        },

        enable: function () {
            this.editor = core.getNoteEditor();

            if (!this.events) {
                this.events = [
                    on(window, 'keydown', lang.hitch(this, this.onKeyDown)),
                    topic.subscribe('/qc/DocumentLoaded', lang.hitch(this, function () {
                        this.editor = core.getNoteEditor();
                    }))
                ];
            };
        },

        disable: function() {
            if (this.events) {
                this.events.forEach(function (x) { x.remove() });
                this.events = null;
            }
        },
        
        isEditControl: function(node) {
            if (node) {
                if (node.nodeType == 1) {
                    if (/input|textarea|select/i.test(node.tagName)) {
                        return true;
                    }
                    else if (node.hasAttribute('contenteditable') && node.getAttribute('contenteditable') !== "false") {
                        return true;
                    }
                    else {
                        return this.isEditControl(node.parentNode);
                    }
                }
                else if (node.nodeType == 3) {
                    return this.isEditControl(node.parentNode);
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        },

        onKeyDown: function (evt) {
            var code = evt.charCode || evt.keyCode;
           
            if (code == keys.BACKSPACE && !this.isEditControl(evt.target)) {
                event.stop(evt);
                return;
            };


            if (!this.editor) {
                return;
            };

            ////Prevent pasting into FreetText widgets
            //if (evt.ctrlKey && code == 86 && core.ancestorWidgetByClass(evt.target, 'freeText', true)) {
            //    event.stop(evt);
            //    return;
            //};

            if (evt.ctrlKey) {
                var sel = this.editor.selection;
                if (!this.isEditControl(evt.target) && core.ancestorWidgetByClass(evt.target, 'noteElement', true)) {
                    evt.preventDefault();
                    if (code == 67) { // C
                        sel.copy();
                        return;
                    }
                    else if (code == 88) { // X
                        sel.cut();
                        return;
                    }
                    else if (code == 86) { // V
                        sel.paste();
                        return;
                    }
                }
                else {
                    sel.savedSelection = null;
                }
            };

            if (!this.isEditControl(evt.target) && core.ancestorWidgetByClass(evt.target, 'noteElement', true)) {
                if (code == keys.RIGHT_ARROW || (code == keys.TAB && !evt.shiftKey)) {
                    evt.preventDefault();
                    this.editor.selection.selectNext();
                    return;
                };
                if (code == keys.LEFT_ARROW || (code == keys.TAB && evt.shiftKey)) {
                    evt.preventDefault();
                    this.editor.selection.selectPrevious();
                    return;
                };
                if (code == keys.SPACE) {
                    if (this.editor.selection.isAllFindings()) {
                        evt.preventDefault();
                        this.editor.selection.getSelectedWidgets().forEach(function (x) {
                            if (x.toggleResult) {
                                x.toggleResult();
                            }
                        });
                        return;
                    };
                };
            }
        }

});

    return typeDef;
});