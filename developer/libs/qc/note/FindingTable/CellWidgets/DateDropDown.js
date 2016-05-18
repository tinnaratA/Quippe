define([
    "dijit/Calendar",
    "dijit/popup",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/on",
    "qc/_core",
    "qc/DateUtil",
	"qc/StringUtil",
    "qc/note/FindingTable/CellWidgets/_Popup"
], function (Calendar, popup, declare, lang, dom, on, core, DateUtil, StringUtil, _Popup) {
    return declare("qc.note.FindingTable.CellWidgets.DateDropDown", [_Popup], {
        valueType: 'date',
        format: 'yyyy-MM-dd',
    
        hasValue: function () {
            return DateUtil.isDate(this.value);
        },

        onTextBoxChanged: function () {
            if (this.textEditable) {
                var value = DateUtil.globalParse(this.textBoxNode.value, this.calendar) || null;
                this.set('value', value);
            };
        },
    
        updateDisplay: function () {
            this.textBoxNode.value = this.getFormattedValue();
        },
    
        getTypedValue: function () {
            return DateUtil.isDate(this.value) ? this.value : null;
        },
    
        getFormattedValue: function () {
            var dateValue = this.getTypedValue();
            if (dateValue) {
                return DateUtil.globalFormat(dateValue, this.getFormatOptions(), this.calendar);
            }
            else {
                return '';
            };
        },
    
        getFormatOptions: function () {
            var formatOptions = {
                selector: 'date',
                locale: this.locale || core.settings.culture
            };
            if (this.format) {
                formatOptions.datePattern = this.format;
            };
            return formatOptions;
        },
    
        showPopup: function () {
            var popupWidget = this.createPopupWidget();
            if (!popupWidget) {
                return;
            };
    
            popup.open({
                parent: this,
                popup: popupWidget,
                around: this.domNode,
                onExecute: lang.hitch(this, function () {
                    var value = this.getPopupValue(popupWidget);
                    if (value) {
                        this.set('value', value);
                    };
                    popup.close(popupWidget);
                }),
                onCancel: lang.hitch(this, function () {
                    popup.close(popupWidget);
                })
            });
        },
    
        createPopupWidget: function () {
        	var language = (this.formatOptions ? (this.formatOptions.locale || core.settings.culture) : core.settings.culture).toLowerCase();
        	// DojoConvertIgnore
        	var datePackage = this.calendar && this.calendar != 'gregorian' ? 'qx.date.' + this.calendar : 'dojo.date';
    
            var popupWidget = new Calendar({ lang: language, datePackage: datePackage });
            popupWidget.set('value', this.getTypedValue() || new Date(""));
    
            var hDoc = on(document.body, "mousedown", lang.hitch(this, function (evt) {
                if (dom.isDescendant(evt.target, popupWidget.domNode)) {
                    //keep open
                }
                else if (core.ancestorNodeByClass(evt.target, 'dijitCalendarMonthMenu', true)) {
                    //keep open
                }
                else {
                    popup.close(popupWidget);
                    core.disconnect(hDoc)
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
        }
    
    });
});