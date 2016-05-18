define([
    "dojo/_base/declare",
    "qx/date/islamic/Date",
    "qx/date/islamic/locale",
    "qc/DateUtil"
], function (declare, Date, locale, DateUtil) {
    DateUtil.calendars.islamic = {
        locale: locale,
        dateClass: Date
    };

	return {};
});