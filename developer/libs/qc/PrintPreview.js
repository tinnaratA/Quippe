define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/text!qc/templates/PrintPreview.htm",
    "qc/_core"
], function (_TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Button, array, declare, event, lang, domClass, domConstruct, domStyle, on, PrintPreviewTemplate, core) {
    return declare("qc.PrintPreview", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

        templateString: PrintPreviewTemplate,

        events: [],
    
        startup: function () {
            if (!this.started) {
                core.htmlI18n(this, "ppPrint");
                core.htmlI18n(this, "ppClose");
                this.inherited(arguments);
            }
        },
    
        showNode: function (node, settings) {
            if (!node) {
                return false;
            };

            var printNode = node.cloneNode(true);
            domClass.add(printNode, "printable");
            this.page.appendChild(printNode);


            domStyle.set(printNode, { 'position': 'relative', 'left': '0px', 'top': '0px' });
            this.events = [
                on(this.page, "mousedown", lang.hitch(event.stop))
                ];
            domStyle.set(this.domNode, "display", "block");
            return true;
        },
    
        showWidget: function (widget, settings) {
            if (!widget) {
                return false;
            };
    
            if (core.isFunction(widget.getPrintable)) {
                return this.showNode(widget.getPrintable(this), settings);
            }
            else {
                return this.showNode(widget.domNode, settings);
            };
        },
    
        close: function () {
            array.forEach(this.events, core.disconnect);
            domStyle.set(this.domNode, "display", "none");
            domConstruct.empty(this.page);
            this.onClose();
        },
    
        _onPrint: function () {
            window.print();
            this.onPrint();
        },
    
        _onClose: function () {
            this.close();
        },
    
        onPrint: function () { },
        onClose: function () { }
    }
    );
});