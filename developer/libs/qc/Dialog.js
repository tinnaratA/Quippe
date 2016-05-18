define([
    "dijit/_WidgetsInTemplateMixin",
    "dijit/Dialog",
    "dijit/focus",
    "dojo/_base/declare",
    "dojo/_base/fx",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dojo/dom-style",
    "dojo/on",
	"dojo/window",
    "qc/_core"
], function (_WidgetsInTemplateMixin, Dialog, focus, declare, fx, lang, Deferred, domStyle, on, window, core) {
    return declare("qc.Dialog", [Dialog, _WidgetsInTemplateMixin], {
        closeButtonTouchHandle: null,
    
        //Overridden from dijit.Dialog to deal w/iPad
        show: function () {
            // summary:
            //		Display the dialog
            // returns: dojo.Deferred
            //		Deferred object that resolves when the display animation is complete
    
            if (this.open) { return; }
    
            if (!this._started) {
                this.startup();
            }
    
            // first time we show the dialog, there's some initialization stuff to do
            if (!this._alreadyInitialized) {
                this._setup();
                this._alreadyInitialized = true;
            }
    
            if (this._fadeOutDeferred) {
                this._fadeOutDeferred.cancel();
            }
    
            //*******************************************************************************
            //**** Override to prevent moving the dialog when the iPad keyboard pops up  ****
            //*******************************************************************************
            if (!core.settings.features.touchPad) {
                /* dap TODO: changed this line to make it more like the current dialog.show, maybe needs to be refactored?  */
                // this._modalconnects.push(on(window, "scroll", lang.hitch(this, "layout")));
                this._modalconnects.push(on(window.get(document), "scroll", lang.hitch(this, "resize")));
                this._modalconnects.push(on(window.get(document), "resize", lang.hitch(this, function () {
                    // IE gives spurious resize events and can actually get stuck
                    // in an infinite loop if we don't ignore them
                    var viewport = window.getBox();
                    if (!this._oldViewport ||
    						viewport.h != this._oldViewport.h ||
    						viewport.w != this._oldViewport.w) {
                        this.resize();
                        this._oldViewport = viewport;
                    }
                })));
            };
    
    
            //Touch Handler for closeButtonNode
            if (!this.closeButtonTouchHandle && this.closeButtonNode && core.util.isTouchDevice()) {
                this.closeButtonTouchHandle = on(this.closeButtonNode, "touchstart", lang.hitch(this, this.onCloseTouchStart));
            };
    
            //**************************** End Custom Changes
    
    
            this._modalconnects.push(on(this.domNode, "keypress", lang.hitch(this, "_onKey")));
    
            domStyle.set(this.domNode, {
                opacity: 0,
                display: ""
            });
    
            this._set("open", true);
            this._onShow(); // lazy load trigger
    
            this._size();
            this._position();
    
            // fade-in Animation object, setup below
            var fadeIn;
    
            this._fadeInDeferred = new Deferred(lang.hitch(this, function () {
                fadeIn.stop();
                delete this._fadeInDeferred;
            }));
    
            fadeIn = fx.fadeIn({
                node: this.domNode,
                duration: this.duration,
                beforeBegin: lang.hitch(this, function () {
                    Dialog._DialogLevelManager.show(this, this.underlayAttrs);
                }),
                onEnd: lang.hitch(this, function () {
                    if (this.autofocus && Dialog._DialogLevelManager.isTop(this)) {
                        // find focusable items each time dialog is shown since if dialog contains a widget the
                        // first focusable items can change
                        this._getFocusItems(this.domNode);
                        focus.focus(this._firstFocusItem);
                    }

                    // 1.9 conversion *dap* - change from dojo.Deferred to dojo/Deferred
                    // this._fadeInDeferred.callback(true);
                    this._fadeInDeferred.resolve(true);
                    delete this._fadeInDeferred;
                })
            }).play();
    
            return this._fadeInDeferred;
        },
    
        onCloseTouchStart: function (evt) {
            this.onCancel();
        },
    
        onOKClick: function () {
            this.onExecute();
        },
    
        onCancelClick: function () {
            this.onCancel();
        }
    });
});