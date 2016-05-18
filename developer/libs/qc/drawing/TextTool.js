define([
    "qc/drawing/_DrawingTool",
    "qc/drawing/TextShape",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/on",
    "qc/_core",
    "dojo/keys"
], function (_DrawingTool, TextShape, array, declare, lang, domConstruct, domGeometry, domStyle, on, core, keys) {
    return declare("qc.drawing.TextTool", [_DrawingTool], {
        name: 'Text',
        iconClass: 'font',

        drawingStyle: { strokeStyle: 'rgba(128,192,255,1.0)', lineWidth: 1.5, fillStyle: 'rgba(128,192,255,.5)' },
        textStyle: null,
        textEditor: null,
        currentShape: null,
        editor: null,
        hEvents: null,
        context: null,
        minWidth: 100,
        maxWidth: 500,
        minHeight: 20,

        //setStyle: function (styleObject) {
        //    this.textStyle = styleObject;
        //},

        onMouseDown: function (editor, context, evt) {
            this.clearContext(editor, context);

            if (this.isEditing) {
                this.endEdit();
                return;
            };

            var point = this.getEventPoint(evt);

            if ((editor.canvasWidth - point.x) < this.minWidth) {
                point.x = editor.canvasWidth - this.minWidth;
            };

            this.maxWidth = (editor.canvasWidth - point.x - 12);
            this.width = Math.max(this.minWidth, Math.min(100, this.maxWidth));

            var shape = editor.getShapeAtPoint(point.x, point.y);
            if (!(shape && shape.shapeName == 'Text')) {
                shape = new TextShape();
                shape.x = point.x;
                shape.y = point.y - this.minHeight;
                shape.w = this.width;
                shape.h = this.minHeight;
                shape.setStyle(this.drawingStyle);
                editor.addShape(shape);
            };

            this.currentShape = shape;
            this.editor = editor;
            this.context = context;

            this.startEdit();
        },

        startEdit: function () {
            var shape = this.currentShape;
            var textEditor = this.textEditor;
            var editor = this.editor;

            shape.hidden = true;
            if (!textEditor) {
                var textEditor = domConstruct.place('<div class="textEditor qcddPrevent" tabindex="1" contenteditable role="textbox"></div>', editor.canvasContainer);
                core.setSelectable(textEditor, true);
            };

            textEditor.innerHTML = shape.text;

            domStyle.set(textEditor, { display: 'block', left: (shape.x) + 'px', top: (shape.y - 1) + 'px', width: (shape.w) + "px", height: (shape.h + 2) + "px" });
            setTimeout(function () { textEditor.focus(); }, 200);

            this.hEvents = [
                on(textEditor, "keyup", lang.hitch(this, this.onTextEditorKeyUp)),
                on(textEditor, "blur", lang.hitch(this, this.onTextEditorBlur))
            ];

            this.textEditor = textEditor;
            this.isEditing = true;
            editor.renderShapes();

        },

        endEdit: function () {
            this.isEditing = false;

            array.forEach(this.hEvents, core.disconnect);

            var shape = this.currentShape;
            var textEditor = this.textEditor;
            var editor = this.editor;

            if (!(shape && textEditor && editor)) {
                return;
            };

            var text = this.getEditedText();

            if (!text) {
                editor.removeShape(shape.id);
            }
            else {
                shape.hidden = false;
                if (shape.text && shape.text !== text) {
                    editor.editorStateManager.addToStateHistory("textEdit");
                } else {
                    editor.editorStateManager.addToStateHistory("text");
                }
                var pos = domGeometry.position(textEditor);
                shape.w = pos.w;
                shape.h = pos.h;
                shape.text = text;
            };

            this.currentShape = null;

            textEditor.innerHTML = '';
            domStyle.set(textEditor, { display: 'none' });

            editor.renderShapes();
        },

        cancelEdit: function () {
            this.isEditing = false;

            var shape = this.currentShape;
            var textEditor = this.textEditor;
            var editor = this.editor;

            if (shape) {
                this.currentShape = null;
            };

            array.forEach(this.hEvents || [], core.disconnect);

            if (textEditor) {
                textEditor.innerHTML = '';
                domStyle.set(textEditor, { display: 'none' });
            };

            if (editor) {
                editor.renderShapes();
            };
        },

        onTextEditorKeyUp: function (evt) {
            if (evt.keyCode == keys.ESCAPE) {
                return this.cancelEdit();
            };
            var text = this.getEditedText();
            var h = this.calcHeight(text);
            domStyle.set(this.textEditor, { height: h + 'px' });
        },

        calcHeight: function (text) {
            var lineHeight = 20;
            var words = (text + '.').split(' ');
            var line = words.shift();
            var w = this.currentShape.w;
            var y = this.currentShape.lineHeight;
            var context = this.context;
            while (words.length > 0) {
                if (context.measureText(line + ' ' + words[0]).width > w) {
                    y += lineHeight;
                    line = words.shift();
                }
                else {
                    line += (' ' + words.shift());
                };
            };

            return y;
        },

        onTextEditorBlur: function (evt) {
            this.endEdit();
        },

        getEditedText: function () {
            return ((this.textEditor.textContent == undefined ? (this.textEditor.innerText || this.textEditor.innerHTML) : this.textEditor.textContent) || '').trim();
        }

    });
});