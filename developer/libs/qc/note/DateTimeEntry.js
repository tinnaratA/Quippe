define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/Calendar",
    "dijit/form/TimeTextBox",
    "dojo/_base/declare",
    "dojo/date",
    "dojo/dom-construct",
    "dojo/text!qc/note/templates/DateTimeEntry.htm",
    "qc/_core",
	"qc/DateUtil"
], function (_TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Calendar, TimeTextBox, declare, date, domConstruct, DateTimeEntryTemplate, core, DateUtil) {
    return declare("qc.note.DateTimeEntry", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: DateTimeEntryTemplate,
        
        formatOptions: null,
        calendar: '',
    
        _getCalendarAttr: function () {
            return this.calendar.datePackage;
        },
        _setCalendarAttr: function (value) {
        	this.calendar = value;
        	var datePackage = value && value != 'gregorian' ? 'qx.date.' + value : 'dojo.date';
            if (datePackage != this.calendar.datePackage) {
                domConstruct.empty(this.dateCell);
                var language = (this.formatOptions ? (this.formatOptions.locale || core.settings.culture) : core.settings.culture).toLowerCase();
                this.dateBox = new Calendar({ value: new Date(), lang: language, datePackage: datePackage });
                this.dateBox.startup();
                this.dateBox.placeAt(this.dateCell);
            }
        },
    
        _getFormatOptionsAttr: function () {
            return this.formatOptions;
        },
        _setFormatOptionsAttr: function (value) {
            this.formatOptions = value;
            this.dateBox.lang = (this.formatOptions.locale || core.settings.culture).toLowerCase();
            this.timeBox.set('constraints', {
                selector: 'time',
                timePattern: value.timePattern || core.settings.defaultTimeFormat || '',
                visibleIncrement: value.visibleIncrement || 'T01:00:00',
                clickableIncrement: value.clickableIncrement || 'T00:15:00'
            });
            this.timeBox.set('maxHeight', value.maxHeight || 250);
        },
    
        _getValueAttr: function () {
            var d = this.dateBox.get('value');
            if (this.calendar && this.calendar != 'gregorian') {
                d = d.toGregorian(d);
            };
            var t = this.timeBox.get('value');
            if (t) {
                return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes(), t.getSeconds());
            }
            else {
                return new Date(d.getFullYear(), d.getMonth(), d.getDate());
            };
        },
    
        _setValueAttr: function (value) {
            var dateTime = DateUtil.toDate(value);
            if (dateTime) {
                this.dateBox.set('value', dateTime);
                this.timeBox.set('value', dateTime);
            };
        },
    
        onExecute: function () {
        },
    
        onCancel: function () {
        }
    });
});