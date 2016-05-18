define([
    "dojo/_base/declare"
], function (declare) {

    return declare("qc.drawing.EditorState", [],
    {
        backgroundImageTag: null,
        shapes: [],
        triggerAction: null,
        drawingStyle: null,
        height: null,
        width: null,

        constructor: function (triggerAction, properties) {
            this.triggerAction = triggerAction;
            this.shapes = properties.shapes;
            this.drawingStyle = properties.drawingStyle;
            this.height = properties.height;
            this.width = properties.width;
            this.backgroundImageTag = properties.backgroundImageTag;
        }
    });

});