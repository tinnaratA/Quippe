define([
    "dijit/popup",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/_core",
    "qc/DateUtil",
    "qc/note/DateTimeEntry",
    "qc/note/FindingTable/CellWidgets/_Popup"
], function (popup, declare, lang, core, DateUtil, DateTimeEntry, _Popup) {
    return declare("qc.note.FindingTable.CellWidgets.DateTimeDropDown", [_Popup], {        
        valueType: 'dateTime',
        format: 'yyyy-MM-dd HH:mm',
    
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
                locale: this.locale || core.settings.culture,
                selector: 'date'
            };
            if (this.formatLength) {
                formatOptions.formatLength = this.formatLength;
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
            var value = this.getTypedValue();
            if (!value) {
                value = new Date();
            };
            var opt = {};
            if (this.format) {
                var p = this.format.split(' ');
                opt.datePattern = p[0];
                opt.timePattern = p[1] || '';
            };
            return new DateTimeEntry({formatOptions: opt, value: value});
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