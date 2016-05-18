define([
    "qc/Dialog",
    "qc/FilteringSelect",
    "qc/SettingsEnumStore",
    "dijit/_Container",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/Select",
    "dijit/form/TextBox",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/text!qc/templates/UserAccountDialog.htm",
    "dojo/when",
    "qc/_core",
    "dojo/request"
], function (Dialog, FilteringSelect, SettingsEnumStore, _Container, _WidgetBase, _WidgetsInTemplateMixin, Button, CheckBox, Select, TextBox, array, declare, UserAccountDialogTemplate, when, core, request) {
    return declare("qc.UserAccountDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: "Account",

        templateString: UserAccountDialogTemplate,
        propertyNames: ['FirstName', 'LastName', 'Email', 'Organization', 'Address1', 'Address2', 'City', 'State', 'PostalCode', 'CountryCode'],

        startup: function () {
            if (!this.started) {
                core.htmlI18n(this, "uadFirstName");
                core.htmlI18n(this, "uadLastName");
                core.htmlI18n(this, "uadEmail");
                core.htmlI18n(this, "uadOrganization");
                core.htmlI18n(this, "uadAddress");
                core.htmlI18n(this, "uadCity");
                core.htmlI18n(this, "uadState");
                core.htmlI18n(this, "uadPostalCode");
                core.htmlI18n(this, "uadCurrentPassword");
                core.htmlI18n(this, "uadNewPassword");
                core.htmlI18n(this, "uadConfirm");
                core.labelI18n(this, "cmdOK");
                core.labelI18n(this, "cmdCancel");
                this.set("title", core.getI18n("uadAccount"));
                core.titleI18n(this, "uadAccount");
                core.titleI18n(this, "uadContactInfo");
                core.titleI18n(this, "uadPassword");

                this.inherited(arguments);
            }
        },

        show: function () {
            this.inherited(arguments);
            this.passwordMessage.innerHTML = "";
            this.txtCurrentPassword.set('value', '');
            this.txtNewPassword.set('value', '');
            this.txtConfirmNewPassword.set('value', '');
            this.loadData();
        },

        loadData: function () {
            var self = this;
            request(core.serviceURL("Quippe/Security/GetProfile?DataFormat=JSON"), {
                handleAs: "json",
                preventCache: true
            }).then(function (data) {
                var profile = {};

                for (var property in data.profile) {
                    profile[property.substring(0, 1).toUpperCase() + property.substring(1)] = data.profile[property];
                }

                array.forEach(self.propertyNames, function (name) {
                    var pName = 'edit' + name;
                    if (self[pName]) {
                        self[pName].set('value', profile[name] || '');
                    }
                });
                self.origValues = profile;
            }, function(err) {
                core.showError(err);
            });
        },

        saveData: function () {
            var self = this;
            var newData = null;
            array.forEach(this.propertyNames, function (name) {
                var pName = 'edit' + name;
                if (self[pName]) {
                    var newValue = self[pName].get('value');
                    if (self.origValues[name] == undefined || self.origValues[name] != newValue) {
                        if (!newData) {
                            newData = {};
                        }
                        newData[name] = newValue;
                    }
                }
            });


            if (newData) {
                return request.post(core.serviceURL("Quippe/Security/SaveProfile?DataFormat=JSON"), {
            		data: newData,
            		handleAs: "json"
                }).then(function (data) {
                    if (!data.result.profileSaved) {
                        core.showError(data.result.message || 'Error saving account information');
                        return false;
                    }
                    else {
                        return true;
                    };
                }, function (err) {
                    core.showError(err);
                });
            }
            else {
                return true;
            }
        },

        onSetPassword: function () {
            var msg = this.passwordMessage;

            msg.innerHTML = "";

            var pwCurrent = this.txtCurrentPassword.get('value');
            var pwNew = this.txtNewPassword.get('value');
            var pwConfirm = this.txtConfirmNewPassword.get('value');

            if (!(pwCurrent && pwNew && pwConfirm)) {
                msg.innerHTML = 'Please enter your current and new passwords';
                return;
            }

            if (pwNew !== pwConfirm) {
                msg.innerHTML = 'Password not confirmed';
                return;
            }

            request.post(core.serviceURL("Quippe/Security/SetPassword?DataFormat=JSON"), {
                data: { "OldPassword": pwCurrent, "NewPassword": pwNew },
                handleAs: "json"
            }).then(function(data) {
                msg.innerHTML = data.result.message;
            }, function(err) {
                msg.innerHTML = err;
            });
        },

        onOKClick: function () {
            var self = this;
            when(this.saveData(), function () { self.hide(); });
        },

        onCancelClick: function () {
            this.hide();
        }
    }
    );
});