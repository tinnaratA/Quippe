define([
    "qc/FilteringSelect",
    "qc/FindingTab",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/ComboBox",
    "dijit/form/TextBox",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request",
    "dojo/text!qc/templates/FindingDetailTab.htm",
    "dojo/when",
    "qc/_core",
    "qc/SettingsEnumStore",
    "qc/StringUtil"
], function (FilteringSelect, FindingTab, _WidgetsInTemplateMixin, ComboBox, TextBox, declare, lang, request, FindingDetailTabTemplate, when, core, SettingsEnumStore, StringUtil) {
    return declare("qc.FindingDetailTab", [FindingTab, _WidgetsInTemplateMixin], {
        title: "Details",

        templateString: FindingDetailTabTemplate,
        finding: null,
        emptyStore: null,
        enumLists: null,

        startup: function () {
            if (!this.started) {
                this.prefix.innerHTML = core.getI18n("prefix") + ":";
                this.modifier.innerHTML = core.getI18n("modifier") + ":";
                this.status.innerHTML = core.getI18n("status") + ":";

                this.value.innerHTML = core.getI18n("value") + ":";
                this.unit.innerHTML = core.getI18n("unit") + ":";
                this.note.innerHTML = core.getI18n("note") + ":";

                this.onset.innerHTML = core.getI18n("onset") + ":";
                this.duration.innerHTML = core.getI18n("duration") + ":";
                this.episodes.innerHTML = core.getI18n("episodes") + ":";

                this.inherited(arguments);
            };
        },

        setFinding: function (finding) {
            this.enumLists = {};
            this.finding = finding;

            this.cmbPrefix.set('store', new SettingsEnumStore(lang.hitch(this, this.getPrefixList)));
            this.cmbPrefix.set('value', finding.get('prefix'));

            this.cmbModifier.set('store', new SettingsEnumStore(lang.hitch(this, this.getModifierList)));
            this.cmbModifier.set('value', finding.get('modifier'));

            this.cmbStatus.set('store', new SettingsEnumStore(lang.hitch(this, this.getStatusList)));
            this.cmbStatus.set('value', finding.get('status'));

            this.cmbUnit.set('store', new SettingsEnumStore(lang.hitch(this, this.getUnitList)));
            this.cmbUnit.set('value', finding.get('unit'));

            this.txtValue.set('value', finding.get('value') || "");
            this.txtOnset.set('value', finding.get('onset') || "");
            this.txtDuration.set('value', finding.get('duration') || "");
            this.txtEpisode.set('value', finding.get('episode') || "");
            this.txtNote.set('value', finding.get('notation') || "");
        },

        getModifiedFinding: function () {
            var findingCopy = this.finding.duplicate(true);
            findingCopy.set('prefix', this.normalizeValue(this.cmbPrefix.get('value'), ''));
            findingCopy.set('modifier', this.normalizeValue(this.cmbModifier.get('value'), ''));
            findingCopy.set('status', this.normalizeValue(this.cmbStatus.get('value'), ''));
            findingCopy.set('value', this.normalizeValue(this.txtValue.get('value'), ''));
            findingCopy.set('unit', this.normalizeValue(this.cmbUnit.get('value'), ''));
            findingCopy.set('onset', this.normalizeValue(this.txtOnset.get('value'), ''));
            findingCopy.set('duration', this.normalizeValue(this.txtDuration.get('value'), ''));
            findingCopy.set('episode', this.normalizeValue(this.txtEpisode.get('value'), ''));
            findingCopy.set('notation', this.normalizeValue(this.txtNote.get('value'), ''));
            return findingCopy;
        },

        getPrefixList: function () {
            if (this.enumLists.prefix) {
                return this.enumLists.prefix;
            };
            var self = this;
            var termType = this.finding ? this.finding.termType || -1 : -1;
            var target = this.finding ? this.finding.prefix || '' : '';
            return when(core.EnumManager.getList('prefix'), function (data) {
                var list = [{ id: '', text: '' }];
                for (var p in data) {
                    if (data[p].code == target || termType < 0 || !data[p].flags || (data[p].flags & Math.pow(2, termType)) != 0) {
                        list.push({ id: data[p].code, text: data[p].description });
                    }
                };
                var cmp = StringUtil.compare;
                list.sort(function (a, b) { return cmp(a.text, b.text) });
                self.enumLists.prefix = list;
                return list;
            });
        },

        getStatusList: function () {
            if (this.enumLists.status) {
                return this.enumLists.status;
            };
            var self = this;
            var termType = this.finding ? this.finding.termType || -1 : -1;
            var target = this.finding ? this.finding.status || '' : '';
            return when(core.EnumManager.getList('status'), function (data) {
                var list = [{ id: '', text: '' }];
                for (var p in data) {
                    if (data[p].code == target || termType < 0 || !data[p].flags || (data[p].flags & Math.pow(2, termType)) != 0) {
                        list.push({ id: data[p].code, text: data[p].description });
                    }
                };
                var cmp = StringUtil.compare;
                list.sort(function (a, b) { return cmp(a.text, b.text) });
                self.enumLists.status = list;
                return list;
            });
        },

        getModifierList: function () {
            if (this.enumLists.modifier) {
                return this.enumLists.modifier;
            };
            var self = this;
            var target = this.finding ? this.finding.modifier || '' : '';
            return when(this.getQFlags(), function (qflags) {
                return when(core.EnumManager.getList('modifier'), function (data) {
                    var list = [{ id: '', text: '' }];
                    for (var p in data) {
                        if (data[p].code == target || qflags <= 0 || !data[p].flags || (data[p].flags & qflags) != 0) {
                            list.push({ id: data[p].code, text: data[p].description });
                        }
                    };
                    var cmp = StringUtil.compare;
                    list.sort(function (a, b) { return cmp(a.text, b.text) });
                    self.enumLists.modifier = list;
                    return list;
                });
            });
        },

        getQFlags: function () {
            if (this.finding && this.finding.medcinId) {
                if (this.finding.qflags) {
                    return this.finding.qflags;
                }
                else {
                    return request.get(core.serviceURL('Medcin/Term/' + this.finding.medcinId + '?Details=qflags&DataFormat=2'), { handleAs: 'json' }).then(function (data) {
                        return data.term ? parseInt(data.term.qflags, 10) || 0 : 0;
                    });
                }
            }
            else {
                return 0;
            };
        },

        getUnitList: function () {
            if (this.enumLists.unit) {
                return this.enumLists.unit;
            };
            var self = this;
            return request.get(core.serviceURL('Medcin/Term/' + this.finding.medcinId + '/Units'), { query: { dataFormat: 'JSON' }, handleAs: 'json' }).then(function (data) {
                var list = [{ id: '', text: '' }];
                if (data && data.term && data.term.units) {
                    core.forceArray(data.term.units.unit).forEach(function (item) {
                        list.push({ id: item.name, text: item.name });
                    });
                };
                self.enumLists.unit = list;
                return list;
            });
        },

        normalizeValue: function (value, defaultValue) {
            if (value && value != '-empty-') {
                return value;
            }
            else {
                return defaultValue;
            }
        },

        onOKClick: function (evt) {
            this.finding.set('prefix', this.normalizeValue(this.cmbPrefix.get('value'), ''));
            this.finding.set('modifier', this.normalizeValue(this.cmbModifier.get('value'), ''));
            this.finding.set('status', this.normalizeValue(this.cmbStatus.get('value'), ''));
            this.finding.set('value', this.normalizeValue(this.txtValue.get('value'), ''));
            this.finding.set('unit', this.normalizeValue(this.cmbUnit.get('value'), ''));
            this.finding.set('onset', this.normalizeValue(this.txtOnset.get('value'), ''));
            this.finding.set('duration', this.normalizeValue(this.txtDuration.get('value'), ''));
            this.finding.set('episode', this.normalizeValue(this.txtEpisode.get('value'), ''));
            this.finding.set('notation', this.normalizeValue(this.txtNote.get('value'), ''));
        }
    }
    );
});