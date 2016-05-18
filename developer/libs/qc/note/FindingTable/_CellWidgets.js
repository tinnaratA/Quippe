define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/note/FindingTable/CellWidgets/ComboBox",
    "qc/note/FindingTable/CellWidgets/DateDropDown",
    "qc/note/FindingTable/CellWidgets/DateTimeDropDown",
    "qc/note/FindingTable/CellWidgets/DoubleCheck",
    "qc/note/FindingTable/CellWidgets/DropDownList",
    "qc/note/FindingTable/CellWidgets/Empty",
    "qc/note/FindingTable/CellWidgets/Label",
    "qc/note/FindingTable/CellWidgets/SingleCheck",
    "qc/note/FindingTable/CellWidgets/TextBox",
    "qc/note/FindingTable/CellWidgets/TimeDropDown"
], function (declare, lang, ComboBox, DateDropDown, DateTimeDropDown, DoubleCheck, DropDownList, Empty, Label, SingleCheck, TextBox, TimeDropDown) {
    var _CellWidgets = declare("qx._FindingTable._CellWidgets", [], {
        defaultTypeName: 'Empty',
    
        getWidgetTypes: function () {
            return ['Label', 'TextBox', 'SingleCheck', 'DoubleCheck', 'DropDownList', 'ComboBox', 'DateDropDown', 'DateTimeDropDown', 'TimeDropDown'];
        },
    
        getTypeObject: function (typeName) {
        	var fullName = /\./.test(typeName) ? typeName.replace(/\./g,'/') : 'qc/note/FindingTable/CellWidgets/' + (typeName || this.defaultTypeName);
	        return require(fullName);
        },
    
        createNew: function (typeName, settings) {
            var widgetType = this.getTypeObject(typeName);
            return widgetType ? new widgetType(settings || {}) : null;
        }
    });

	return new _CellWidgets();
});