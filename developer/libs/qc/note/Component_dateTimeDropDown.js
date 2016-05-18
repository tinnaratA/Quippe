define([
    "dijit/popup",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/on",
    "qc/_core",
	"qc/DateUtil",
	"qc/StringUtil",
    "qc/note/Component_popup"
], function (popup, declare, lang, dom, domClass, on, core, DateUtil, StringUtil, Component_popup) {
    return declare("qc.note.Component_dateTimeDropDown", [Component_popup], {
        popupType: 'qc/note/DateTimeEntry',
    
        calendar: 'gregorian',      //deprecated
        datePattern: '',            
        timePattern: '',            
        formatLength: '',           //deprecated
        locale: '',                 //deprecated

        timeDropDownMinorIncrement: 15,
        timeDropDownMajorIncrement: 60,
        timeDropDownMaxHeight: 250,
    
        createNode: function () {
            this.domNode = this.inherited(arguments);
            domClass.remove(this.domNode, 'dateDropDown');
            domClass.add(this.domNode, 'dateTimeDropDown');
            return this.domNode;
        },
    
        getPropertyDefs: function () {
            return [
                { name: 'visible', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'enabled', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'required', group: 'Behavior', type: 'integer', options: this.resultFlagEnum, nullable: true },
                { name: 'styleClass', group: 'Style', type: 'string' },
                { name: 'elementStyle', group: 'Style', type: 'string' },
                //{ name: 'calendar', group: 'Format', options: StringUtil.formatCodedList(DateUtil.installedCalendars()) },
                { name: 'datePattern', group: 'Format' },
                { name: 'timePattern', group: 'Format' },
                //{ name: 'formatLength', group: 'Format', options: '[;short;long]' },
                { name: 'placeholder', group: 'General' },
                { name: 'timeDropDownMinorIncrement', caption: 'Minor Increment', type: 'integer', group: 'Time Drop Down' },
                { name: 'timeDropDownMajorIncrement', caption: 'Major Increment', type: 'integer', group: 'Time Drop Down' },
                { name: 'timeDropDownMaxHeight', caption: 'Max Height', type: 'integer', group: 'Time Drop Down' }
            ];
        },
    
        getTypedValue: function () {
            return DateUtil.isDate(this.value) ? this.value : null;
        },
    
        getFormattedValue: function () {
            var dateValue = this.getTypedValue();
            //console.log('==== getFormattedValue dateValue ====');
            //console.log(dateValue);
            if (dateValue) {
                //console.log('==== getFormattedValue datePattern 1 ====');
                //console.log(this.datePattern);
                //console.log('==== getFormattedValue timePattern 1 ====');
                //console.log(this.timePattern);

                //console.log('==== getFormattedValue datePattern 2 ====');
                //console.log(core.settings.defaultDateFormat);
                //console.log('==== getFormattedValue timePattern 2 ====');
                //console.log(core.settings.defaultTimeFormat);

                var formatOptions = {
                    selector: 'datetime',
                    formatLength: 'user',
                    datePattern: this.datePattern || core.settings.defaultDateFormat,
                    timePattern: this.timePattern || core.settings.defaultTimeFormat
                };
                //var formatOptions = this.datePattern && this.timePattern ? { selector: 'datetime', datePattern: this.datePattern, timePattern: this.timePattern } : 'datetime';
                //console.log('==== getFormattedValue formatOptions ====');
                //console.log(formatOptions);
                //console.log('==== getFormattedValue DateUtil ====');
                //console.log(DateUtil.format(dateValue, formatOptions));
                return DateUtil.format(dateValue, formatOptions);
            }
            else {
                return '';
            };
        },
        
        createPopupWidget: function () {
        	var typeObj = null;

	        try {
		        typeObj = require(this.popupType);
	        }

	        catch (e) {
	        }

	        if (!typeObj) {
                return null;
            };

            var value = this.getTypedValue() || new Date();
            //console.log('==== Value ====');
            //console.log(value);

            var formatOptions = {
                locale: core.settings.culture.toLowerCase(),
                timePattern: this.timePattern || core.settings.defaultTimeFormat,
                visibleIncrement: 'T00:' + (StringUtil.padLeft(this.timeDropDownMajorIncrement, 2, '0') + ':00'),
                clickableIncrement: 'T00:' + (StringUtil.padLeft(this.timeDropDownMinorIncrement, 2, '0') + ':00'),
                maxHeight: this.timeDropDownMaxHeight || 250
            };
            //console.log('==== formatOptions ====');
            //console.log(formatOptions);
            //console.log('==== calendar ====');
            //console.log(this.calendar);
            //console.log('==== typeObj ====');
            //console.log(new typeObj({ calendar: this.calendar, formatOptions: formatOptions, value: value }));
            var popupWidget = new typeObj({ calendar: this.calendar, formatOptions: formatOptions, value: value });
            //console.log('==== popupWidget ====');
            //console.log(popupWidget);

            popupWidget.startup();
    
            var hDoc = on(document.body, "mousedown", lang.hitch(this, function (evt) {
                if (dom.isDescendant(evt.target, popupWidget.domNode)) {
                    //keep open
                }
                else if (core.ancestorNodeByClass(evt.target, 'dijitCalendarMonthMenu', true)) {
                    //keep open
                }
                else if (core.ancestorNodeByClass(evt.target, 'dijitTimePickerItem', true)) {
                    //keep open
                }
                else if (core.ancestorNodeByClass(evt.target, 'dijitTimePickerPopup', true)) {
                    //keep open
                }
                else {
                    popup.close(popupWidget);
	                core.disconnect(hDoc);
                }
            }));
    
            return popupWidget;
        },
    
        setValue: function (value) {
            var dateValue = DateUtil.toDate(value);
            if (DateUtil.isDate(dateValue)) {
                this.value = dateValue;
            }
            else {
                this.value = value;
            };
            if (this.textbox) {
                this.textbox.value = this.getFormattedValue();
            };
        },

        onTextBoxChanged: function (evt) {
            this.setValue(this.textbox.value);
            this.notifyValueChanged(this, this.value);
        }
    });
});