define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/query",
    "dijit/registry",
    "qc/drawing/EditorState"
], function (declare, array, query, registry, EditorState) {

    function getBackgroundImageInfo(bagOrBackgroundImage, imageTag) {
        var currentBackgroundImage = bagOrBackgroundImage.backgroundImage || bagOrBackgroundImage;
        if (currentBackgroundImage) {
            return {
                src: currentBackgroundImage.src,
                width: currentBackgroundImage.width,
                height: currentBackgroundImage.height,
                naturalWidth: currentBackgroundImage.naturalWidth,
                naturalHeight: currentBackgroundImage.naturalHeight
            }
        }
        return { tag: imageTag }
    };

    function getInformationAboutThisTriggerAction(aboutTo) {
        var values;
        switch (aboutTo) {
            case "flipHorizontal":
                values = [true, "horizontal flip"];
                break;
            case "flipVertical":
                values = [true, "vertical flip"];
                break;
            case "rotateRight":
                values = [true, "right rotation"];
                break;
            case "rotateLeft":
                values = [true, "left rotation"];
                break;
            case "resize":
                values = [true, "resize"];
                break;
            case "crop":
                values = [true, "crop"];
                break;
            case "path":
                values = [false, "pen draw"];
                break;
            case "line":
                values = [false, "line draw"];
                break;
            case "text":
                values = [false, "text creation"];
                break;
            case "textEdit":
                values = [false, "text edit"];
                break;
            case "moveShapes":
                values = [false, "shape move"];
                break;
            case "deleteShapes":
                values = [false, "shape delete"];
                break;
            case "shapeStyleChange":
                values = [false, "shape style change"];
                break;
            default:
                throw new Error("Tried to save state before unrecognized action");
        }
        return {
            aboutTo : aboutTo,
            requiresImageSave: values[0],
            displayName: values[1]
        }
    }

    return declare("qc.drawing.EditorStateManager", [],
    {
        _savedStates: null,
        _weAreCurrentlyUndooing: false,
        _editor: null,
        _imageTagCounter: 0,
        _dictImages: null,

        _getMassagedPreviousShape: function () {
            var state = null;
            if (this._savedStates.length > 0) {

                state = this._savedStates.pop();

                if (state.backgroundImageTag) {
                    for (var i = 0; i < this._dictImages.length; i++) {
                        var thisImage = this._dictImages[i];
                        if (thisImage.tag === state.backgroundImageTag) {
                            state.backgroundImage = thisImage.image;
                            var index = array.indexOf(this._dictImages, thisImage);
                            this._dictImages.splice(index);
                        }
                    }
                }
            }
            return state;
        },

        constructor: function (parentEditor) {
            this._editor = parentEditor;
            this._savedStates = [];
            this._dictImages = [];
            this.whichEditor = parentEditor.domNode.id;
        },

        addToStateHistory: function (triggeringAction, propertyOverrides) {
            if (this._weAreCurrentlyUndooing) {
                return;
            }

            var triggerAction = getInformationAboutThisTriggerAction(triggeringAction);
            var valuesToStore = propertyOverrides || {};

            // To head off potential memory problems, the background image state is only saved if there is a change to it.
            // This way if someone is playing around with arrows and text, you don't have the same huge graphic saved 40 times.
            if (triggerAction.requiresImageSave) {
                this._imageTagCounter++;
                this._dictImages.push({
                    tag: this._imageTagCounter,
                    image: getBackgroundImageInfo(valuesToStore.backgroundImage || this._editor.backgroundImage)
                });
                valuesToStore.backgroundImageTag = this._imageTagCounter;
            }

            valuesToStore.shapes = valuesToStore.shapes || this._editor.getCopyOfShapes();
            valuesToStore.drawingStyle = valuesToStore.drawingStyle || this._editor.drawingStyle;
            valuesToStore.height = valuesToStore.height || this._editor.height;
            valuesToStore.width = valuesToStore.width || this._editor.width;
            
            this._savedStates[this._savedStates.length] = new EditorState(triggerAction, valuesToStore);
            this.updateUndoButtonWithLastAction();
        },

        undoLastAction: function () {
            var revertedState = this._getMassagedPreviousShape();
            if (revertedState) {
                this._weAreCurrentlyUndooing = true;
                if (revertedState.backgroundImage) {
                    this._editor.setBackgroundImageDirectly(revertedState.backgroundImage);
                    this._editor.DoChromeResizeHackJiggle();
                }
                if (revertedState.shapes) {
                    this._editor.shapes = (revertedState.shapes);
                    this._editor.renderShapes();
                }
                if (revertedState.drawingStyle) {
                    this._editor.setStyle(revertedState.drawingStyle);
                }

                this._weAreCurrentlyUndooing = false;
                this.updateUndoButtonWithLastAction();
            }
        },

        getLastTriggerAction: function() {
            return this._savedStates.length === 0 ? null : states[states.length - 1].triggerAction;
        },

        updateUndoButtonWithLastAction: function() {
            var nextActionToUndo = null;
            if (this._savedStates.length !== 0) {
                nextActionToUndo = this._savedStates[this._savedStates.length - 1].triggerAction.displayName;
            }
//            var toolbox = dijit.byId("qc_drawing_Toolbox_0");
//            var toolbox = query('.qcDrawingToolbox').map(registry.byNode)[0];
            var toolbox = registry.byNode(query('.qcDrawingToolbox')[0]);
            toolbox.updateUndoCaptionText(nextActionToUndo);
        }

    });

})