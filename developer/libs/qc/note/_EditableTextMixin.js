define([
    "qc/note/_HyperlinkMixin",
    "dijit/_WidgetBase",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/keys",
    "dojo/on",
    "dojo/query",
    "qc/_core"
], function (_HyperlinkMixin, _WidgetBase, array, declare, event, lang, domClass, keys, on, query, core) {
    return declare("qc.note._EditableTextMixin", [_WidgetBase, _HyperlinkMixin], {
        _editableText_TextNode: null,
        _editableText_OriginalText: '',
        _editableText_Handlers: null,
        _editableText_ClearTabIndex: false,
    
        _editableText_RemoveClasses: null,
        _editableText_AddClasses: null,
    
        _editableText_CanEdit: function () {
            if (!core.settings.enableInlineTextEditing) {
                return false;
            };
    
            if (!this._editableText_TextNode) {
                this._editableText_TextNode = query('.editableText', this.domNode)[0];
            }

            if (!this._editableText_TextNode && domClass.contains(this.domNode, 'editableText')) {
                this._editableText_TextNode = this.domNode;
            }

            return this._editableText_TextNode ? true : false;
        },
    
        _editableText_StartEdit: function () {
            var fn = lang.hitch(this, this._editableText_DelayedStartEdit);
            setTimeout(fn, 120);
        },
    
        _editableText_DelayedStartEdit: function () {
            if (!this._editableText_CanEdit()) {
                return false;
            };
    
            var node = this._editableText_TextNode;
            this._editableText_OriginalText = node.textContent;
    
    
            if (node.getAttribute('tabIndex')) {
                this._editableText_ClearTabIndex = false;
            }
            else {
                this._editableText_ClearTabIndex = true;
                node.setAttribute('tabIndex', 1);
            };
    
            core.setSelectable(node, true);
            domClass.add(this.domNode, 'inTextEdit');
    
            this._editableText_AddClasses = [];
            this._editableText_RemoveClasses = [];
    
            if (!domClass.contains(this.domNode, 'qcddPrevent')) {
                domClass.add(this.domNode, 'qcddPrevent');
                this._editableText_RemoveClasses.push('qcddPrevent');
            };
    
            node.setAttribute("contentEditable", true);
            node.setAttribute("role", "textbox");
    
            try {
                var range = document.createRange();
                range.selectNodeContents(node);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
            catch (e) {
            };
    
    
            try {
                node.focus();
            }
            catch (e) {
            };
    
            this._editableText_Handlers = [
                on(node, "blur", lang.hitch(this, this._editableText_OnBlur)),
                on(node, "keydown", lang.hitch(this, this._editableText_OnKeyDown))
            ];
    
    
        },
    
        _editableText_ApplyChanges: function (newText, originalText) {
            this.set('text', newText);
        },
    
        _editableText_RevertToOriginal: function (originalText) {
            this.set('text', originalText);
        },
    
        _editableText_EndEdit: function () {
            var newText = this._editableText_TextNode.textContent || this._editableText_TextNode.innerText || '';
            if (newText) {
                this._editableText_ApplyChanges(newText, this._editableText_OriginalText);
            }
            else {
                this._editableText_RevertToOriginal(this._editableText_OriginalText);
            };
            this._editableText_StopEdit();
        },
    
        _editableText_CancelEdit: function () {
            this._editableText_RevertToOriginal(this._editableText_OriginalText);
            this._editableText_StopEdit();
        },
    
        _editableText_StopEdit: function () {
            var node = this._editableText_TextNode;
    
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            else if (document.selection) {
                document.selection.empty();
            };
    
            domClass.remove(this.domNode, 'inTextEdit');
            node.removeAttribute("contentEditable");
            core.setSelectable(node, false);
            if (this._editableText_ClearTabIndex) {
                node.removeAttribute('tabIndex');
            };
    
            array.forEach(this._editableText_RemoveClasses, function (className) { domClass.remove(this.domNode, className); }, this);
            array.forEach(this._editableText_AddClasses, function (className) { domClass.add(this.domNode, className); }, this);
            array.forEach(this._editableText_Handlers, core.disconnect);
    
            document.body.focus();
    
            try {
                var sel = window.getSelection();
                sel.removeAllRanges();
            }
            catch (e) { };
        },
    
        _editableText_OnBlur: function (evt) {
            this._editableText_EndEdit();
        },
    
        _editableText_OnKeyDown: function (evt) {
            if (evt.keyCode == keys.ESCAPE) {
                event.stop(evt);
                this._editableText_CancelEdit();
            }
            else if (evt.keyCode == keys.ENTER) {
                event.stop(evt);
                this._editableText_EndEdit();
            };
        },
    
        _editableText_OnMouseDown: function (evt) {
            if (evt.stopPropogation) {
                evt.stopPropogation();
            }
            else {
                evt.cancelBubble = true;
            };
        }
    });
});