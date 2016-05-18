define([
    "dijit/popup",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/on",
    "qc/_core",
    "qc/note/Component_dropDown"
], function (popup, declare, lang, dom, domClass, on, core, Component_dropDown) {
    return declare("qc.note.Component_popup", [Component_dropDown], {
        popupType: '',
    
        createNode: function () {
            this.domNode = this.inherited(arguments);
            domClass.add(this.domNode, 'popup');
            return this.domNode;
        },
    
        getPropertyDefs: function () {
            return [
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'enabled', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'required', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'popupType', group: 'Behavior' },
                { name: 'styleClass', group: 'Style', type: 'string' },
                { name: 'elementStyle', group: 'Style', type: 'string' },
                { name: 'placeholder', group: 'General' }
            ];
        },
    
        createPopupWidget: function () {

            if (!this.popupType) {
                return null;
            };

            var typeObj = null;

	        try {
		        typeObj = require(this.popupType);
	        }

	        catch (e) {
	        }

	        if (!typeObj) {
                return null;
            };

            var popupWidget = new typeObj({ value: this.getTypedValue() });
    
            var hDoc = on(document.body, "mousedown", lang.hitch(this, function (evt) {
                if (!dom.isDescendant(evt.target, popupWidget.domNode)) {
                    popup.close(popupWidget);
                    core.disconnect(hDoc)
                };
            }));

            return popupWidget;
        },
    
        getPopupValue: function (popupWidget) {
            return popupWidget.get('value');
        },
    
    
        showDropDown: function () {
            var popupWidget = this.createPopupWidget();

            if (!popupWidget) {
                return;
            };
            popupWidget.startup();
            var owner = this.getOwner();
    
            popup.open({
                parent: owner,
                popup: popupWidget,
                around: this.domNode,
                onExecute: lang.hitch(this, function () {
                    var value = this.getPopupValue(popupWidget);
                    if (value && this.propertyName) {
                        owner.set(this.propertyName, value);
                        this.notifyValueChanged(this, value);
                    };
                    popup.close(popupWidget);
                }),
                onCancel: lang.hitch(this, function () {
                    popup.close(popupWidget);
                })
            });
        }
    });
});