define([
    "dijit/_HasDropDown",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/focus",
    "dojo/_base/declare"
], function (_HasDropDown, _TemplatedMixin, _WidgetBase, focus, declare) {
    return declare("qc.TaskPaneActionButton", [_WidgetBase, _TemplatedMixin, _HasDropDown], {
        icon: "pencil",
            label: "",
            templateString: '<span class="titlebarActionButton ${icon}">${label}</span>',
    
            onLoadDropDown: function () {
            },
    
            isLoaded: function () {
                return false;
            },
    
            loadDropDown: function (callback) {
                this.onLoadDropDown();
                this.inherited(arguments);
            },
    
            focus: function () {
                focus.focus(this.domNode);
            }
        }
    );
});