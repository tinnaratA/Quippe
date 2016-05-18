define([
    "dijit/Calendar",
    "dijit/popup",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/on",
    "qc/_core",
	"qc/DateUtil",
	"qc/StringUtil",
    "qc/note/Component_dateTimeDropDown"
], function (Calendar, popup, declare, lang, dom, domClass, on, core, DateUtil, StringUtil, Component_dateTimeDropDown) {
    return declare("qc.note.Component_dateDropDown", [Component_dateTimeDropDown], {
        popupType: 'dijit/Calendar',
    
        createNode: function () {
            this.domNode = this.inherited(arguments);
            domClass.remove(this.domNode, 'dateTimeDropDown');
            domClass.add(this.domNode, 'dateDropDown');
            return this.domNode;
        },


        getPropertyDefs: function () {
            return [
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'enabled', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'required', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'styleClass', group: 'Style', type: 'string' },
                { name: 'elementStyle', group: 'Style', type: 'string' },
                { name: 'datePattern', group: 'Format' },
                { name: 'placeholder', group: 'General' }
            ];
        },

        createPopupWidget: function () {
        	var language =  core.settings.culture.toLowerCase();
        	// DojoConvertIgnore
        	var datePackage = this.calendar && this.calendar != 'gregorian' ? 'qx.date.' + this.calendar : 'dojo.date';
    
            var popupWidget = new Calendar({ lang: language, datePackage: datePackage });
            popupWidget.set('value', this.getTypedValue() || new Date());
    
            var hDoc = on(document.body, "mousedown", lang.hitch(this, function (evt) {
                if (dom.isDescendant(evt.target, popupWidget.domNode)) {
                    //keep open
                }
                else if (core.ancestorNodeByClass(evt.target, 'dijitCalendarMonthMenu', true)) {
                    //keep open
                }
                else {
                    popup.close(popupWidget);
	                core.disconnect(hDoc);
                };
            }));
    
            return popupWidget;
        },
    
        getPopupValue: function (popupWidget) {
            var d = popupWidget.get('value');
    
            if (this.calendar && this.calendar != 'gregorian' && core.isFunction(d.toGregorian)) {
                d = d.toGregorian(d);
            };
    
            return d;
        },

        getFormattedValue: function () {
            var dateValue = this.getTypedValue();
            if (dateValue) {
                return DateUtil.format(dateValue, this.datePattern || 'date');
            }
            else {
                return '';
            };
        }
    });
});