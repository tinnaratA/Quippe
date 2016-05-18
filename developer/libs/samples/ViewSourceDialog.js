define([
	"dijit/_WidgetsInTemplateMixin",
	"dijit/Dialog",
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/request",
	"dojo/text!samples/templates/ViewSourceDialog.htm"
], function (_WidgetsInTemplateMixin, Dialog, TabContainer, ContentPane, declare, lang, domClass, domConstruct, request, ViewSourceDialogTemplate) {
    return declare("samples.ViewSourceDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: 'View Source',
        templateString: ViewSourceDialogTemplate,

        startup: function () {
            if (!this._started) {
                for (var i = 0; i < this.files.length; i++) {
                    request.get(this.files[i]).then(lang.hitch(this, this.createTabCallback(this.files[i])));
                }

                this.inherited(arguments);
            }
        },

        createTabCallback: function(file) {
            return function(data) {
                var preContainer = domConstruct.create("pre");
                var codeContainer = domConstruct.create("code", null, preContainer);

                if (file.substring(file.lastIndexOf(".")) == ".js") {
                    domClass.add(codeContainer, "javascript");
                }

                else if (file.substring(file.lastIndexOf(".")) == ".htm") {
                    domClass.add(codeContainer, "xml");
                }

                codeContainer.innerHTML = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                this.hljs.highlightBlock(codeContainer);

                var fileTab = new ContentPane({
                    title: file.indexOf("/") != -1 ? file.substring(file.lastIndexOf("/") + 1) : file,
                    content: preContainer
                });

                this.fileTabs.addChild(fileTab);
            }
        }
    });
});