define([
    "dojo/_base/declare",
    "qx/date/buddhist/Date",
    "qx/date/buddhist/locale",
    "qc/DateUtil"
], function (declare, Date, locale, DateUtil) {
    DateUtil.calendars.buddhist = {
        locale: locale,
        dateClass: Date
    };

	return {};
});