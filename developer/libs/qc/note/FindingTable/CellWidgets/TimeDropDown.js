define([
    "dijit/_TimePicker",
    "dijit/popup",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
	"dojo/dom-class",
    "dojo/on",
    "qc/_core",
    "qc/DateUtil",
    "qc/note/FindingTable/CellWidgets/_Popup"
], function (_TimePicker, popup, declare, lang, dom, domClass, on, core, DateUtil, _Popup) {
    return declare("qc.note.FindingTable.CellWidgets.TimeDropDown", [_Popup], {
        //calendar: 'gregorian',
        //datePattern: 'HH:mm',
        //formatLength: '',
        dateCell: '',
        valueType: 'time',
        format: 'HH:mm',
        refDate: null,
    
        hasValue: function () {
            return this.getFormattedValue() ? true : false;
        },

        _pgPropDef_dateCell: function () {
            return { name: 'dateCell', group: 'Data', description: core.getI18n('tooltipDateCell') };
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
            return this.getFullDateTime(this.value);
        },
    
        getFullDateTime: function (time) {
            var d = null;
            if (this.dateCell) {
                var cell = this.owner.getCellAtAddress(this.dateCell);
                if (cell) {
                    var widget = this.owner.getCellWidget(cell);
                    if (widget) {
                        d = widget.get('value');
                    }
                };
            };
    
            if (!DateUtil.isDate(d)) {
                d = new Date();
            };
    
            var dt = null;
            if (DateUtil.isDate(time)) {
                dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), time.getHours(), time.getMinutes(), time.getSeconds());
            }
            else {
                dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
            }
            return dt;
        },
    
        getFormattedValue: function () {
            if (!this.value) {
                return '';
            };
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
    
            var hDoc = on(document.body, "mousedown", lang.hitch(this, function (evt) {
                if (dom.isDescendant(evt.target, popupWidget.domNode.parentNode)) {
                    //keep open
                }
                else {
                    popup.close(popupWidget);
	                core.disconnect(hDoc);
                };
            }));
    
            popup.open({
                parent: this,
                popup: popupWidget,
                around: this.domNode,
                onExecute: lang.hitch(this, function () {
                    var value = this.getPopupValue(popupWidget);
                    if (value) {
                        this.set('value', this.getFullDateTime(value));
                    };
                    popup.close(popupWidget);
                }),
                onCancel: lang.hitch(this, function () {
                    popup.close(popupWidget);
                })
            });
        },
    
        createPopupWidget: function () {
            return new _TimePicker({ value: this.getTypedValue(), constraints: this.getFormatOptions() });
        },
    
        getPopupValue: function (popupWidget) {
            return popupWidget.get('value');
        },
    
        dependsOn: function (cell) {
            if (this.dateCell) {
                var addr = this.owner.rcToAddr(cell.dataRow, cell.dataCol);
                if (this.dateCell == addr) {
                    return true;
                };
            };
            return this.inherited(arguments);
        },
    
        calculate: function () {
            if (this.value) {
                this.set('value', this.getTypedValue());
            };
            this.inherited(arguments);
        }
    });
});