define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/query",
    "dojo/request/iframe"
], function (_TemplatedMixin, _WidgetBase, declare, domConstruct, domStyle, query, iframe) {
    return declare("qc.DocumentView", [_WidgetBase, _TemplatedMixin], {
        url: '',
        templateString: '<div class="qcDocumentView"></div>',
        iframe: null,

        getFrame: function () {
            var fName = this.id + 'Frame';
            if (window[fName]) {
                return window[fName];
            }
            else if (window.frames && window.frames[fName]) {
                return window.frames[fName];
            }
            else {
                return null;
            }
        },

        show: function (url) {
            if (!url) {
                url = this.url;
            };

            if (!this.iframe) {
                var fName = this.id + 'Frame';
                this.iframe = domConstruct.create("iframe");
                this.iframe.setAttribute("name", fName);
                //domStyle.set(this.iframe, { "width": "100%", "height": "100%", "visibility": "visible" });
                domConstruct.place(this.iframe, this.domNode);
            };

            this.iframe.setAttribute("src", url);
            domStyle.set(this.domNode, "display", "block");
            this.url = url;
        },

        hide: function () {
            domStyle.set(this.domNode, "display", "none");
        },

        destroyRecursive: function () {
            if (this.iframe) {
                domConstruct.destroy(this.iframe);
            };
            domConstruct.destroy(this.domNode);
        },

        /*print: function () {
            var frame = this.getFrame();
            if (frame) {
                frame.focus();
                frame.print();
            };

        },*/

        getPrintSettings: function() {
            return {};
        },

        getPrintable: function (previewWidget) {
            return query("html", this.getFrame().document)[0].cloneNode(true);
        }
    }
    );
});