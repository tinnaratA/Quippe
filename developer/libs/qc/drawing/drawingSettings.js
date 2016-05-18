define([
    "qc/_core"
], function (_core) {

    var theSettings = {};

    // When an image being imported is too big for the width by more than this ratio, the image will
    // be resampled down to this ration past the width.  If this is 1.5, and the image is and there's 
    // space for a 600 wide image, and the image is more than 900 wide, it will be shrunk to 900 wide.
    theSettings.WidthRatioOnImport = 1.5;

    if (_core.util.isTouchDevice()) {
        theSettings.grabTolerance = 9;
        theSettings.cropSnapToEdgeTolerance = 8;
        theSettings.extraGrabSpaceForTextBoxResize = 4;
    } else {
        // how easy it is to grab a line (including with arrows, but not the path/pen); also, how easy it is to grab the edge or corner of the crop box
        theSettings.grabTolerance = 5;
        // when resizing the crop box, this is how close to the edge the side will snap to the edge.
        theSettings.cropSnapToEdgeTolerance = 6;
        theSettings.extraGrabSpaceForTextBoxResize = 0;
    }

    _core.drawingSettings = theSettings;

    return theSettings;

});