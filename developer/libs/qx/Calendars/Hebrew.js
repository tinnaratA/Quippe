define([
    "dojo/_base/declare",
    "qx/date/hebrew/Date",
    "qx/date/hebrew/locale",
    "qc/DateUtil"
], function (declare, Date, locale, DateUtil) {
    DateUtil.calendars.hebrew = {
        locale: locale,
        dateClass: Date
    };

	return {};
});