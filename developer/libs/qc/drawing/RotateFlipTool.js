define([
    "dojo/_base/declare"
], function (declare) {

    return declare("qc.drawing.RotateFlipTool", [], {
        name: 'RotateFlip',
        iconClass: 'should not matter',

        mode: '',

        onSelected:  function(editor) {

            editor.editorStateManager.addToStateHistory(this.mode);

            switch (this.mode) {
                case "flipHorizontal":
                    editor.getBackgroundImageTransformer().flipHorizontal();
                    break;
                case "flipVertical":
                    editor.getBackgroundImageTransformer().flipVertical();
                    break;
                case "rotateRight":
                    editor.getBackgroundImageTransformer().rotateRight();
                    editor.DoChromeResizeHackJiggle();
                    break;
                case "rotateLeft":
                    editor.getBackgroundImageTransformer().rotateLeft();
                    editor.DoChromeResizeHackJiggle();
                    break;
            }
        }

    });
});