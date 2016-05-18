define([
    "qc/_EnumManager",
    "qc/Dialog",
    "qc/EnumDataStore",
    "qc/FilteringSelect",
    "qc/FindingTab",
    "qc/SettingsEnumStore",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/ComboBox",
    "dijit/form/TextBox",
    "dijit/layout/ContentPane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/on",
    "dojo/text!qc/templates/MultiFindingDetailDialog.htm",
    "qc/_core",
	"dojo/store/DataStore"
], function (_EnumManager, Dialog, EnumDataStore, FilteringSelect, FindingTab, SettingsEnumStore, _WidgetsInTemplateMixin, ComboBox, TextBox, ContentPane, array, declare, lang, domClass, domStyle, on, MultiFindingDetailDialogTemplate, core, DataStore) {
    return declare("qc.MultiFindingDetailDialog", [Dialog, _WidgetsInTemplateMixin], {
        title: 'Multiple Findings',
        templateString: MultiFindingDetailDialogTemplate,
        findingData: null,
        dataLoaded: null,
        hCheckChanged: null,

        startup: function () {
            if (!this.started) {
                this.lblResult.innerHTML = core.getI18n("result") + ":";
                this.lblPrefix.innerHTML = core.getI18n("prefix") + ":";
                this.lblModifier.innerHTML = core.getI18n("modifier") + ":";
                this.lblStatus.innerHTML = core.getI18n("status") + ":";
                this.lblOnset.innerHTML = core.getI18n("onset") + ":";
                this.lblDuration.innerHTML = core.getI18n("duration") + ":";
                this.lblEpisodes.innerHTML = core.getI18n("episodes") + ":";

                this.cmbResult.store = new SettingsEnumStore('[A=abnormal/positive;N=normal/negative]', true);
	            this.cmbPrefix.store = new DataStore({ store: new EnumDataStore('prefix', true) });
	            this.cmbModifier.store = new DataStore({ store: new EnumDataStore('modifier', true) });
	            this.cmbStatus.store = new DataStore({ store: new EnumDataStore('status', true) });

                this.inherited(arguments);
            };
        },

        setData: function (data) {
            if (this.hCheckChanged) {
                core.disconnect(this.hCheckChanged);
            };

            var finding = null;
            var isGroup = data && data.domNode && domClass.contains(data.domNode, 'findingGroup');
            if (isGroup) {
                this.findingData = data;
                finding = data.toFinding();
            }
            else if (data.type == 'selection') {
                this.findingData = data.getSelectedWidgets();
                finding = this.findingData[0] ? this.findingData[0].toFinding() : null;
            }
            else {
                this.findingData = core.forceArray(data);
                finding = this.findingData[0] ? this.findingData[0].toFinding() : null;
            }

            if (!finding) {
                return;
            };

            this.cmbResult.set('value', finding.result || '');
            this.cmbPrefix.set('value', finding.prefix || '');
            this.cmbModifier.set('value', finding.modifier || '');
            this.cmbStatus.set('value', finding.status || '');

            this.txtOnset.set('value', finding.onset || '');
            this.txtDuration.set('value', finding.duration || '');
            this.txtEpisode.set('value', finding.episode || '');

            if (isGroup) {
                this.chkOverrideTranscription.set('checked', data.get('overrideTranscription'));
                this.txtTranscription.set('value', data.get('text'));
                this.hCheckChanged = on(this.chkOverrideTranscription, "Change", lang.hitch(this, this.onOverrideCheckChanged));
                domStyle.set(this.overrideCheckRow, { display: 'table-row' });
                domStyle.set(this.overrideTextRow, { display: 'table-row' });
            }
            else {
                domStyle.set(this.overrideCheckRow, { display: 'none' });
                domStyle.set(this.overrideTextRow, { display: 'none' });
            };


        },

        onOverrideCheckChanged: function () {
            if (this.chkOverrideTranscription.get('value')) {
                this.txtTranscription.set('disabled', false);
            }
            else {
                this.findingData.set('overrideTranscription', false);
                this.findingData.updateTranscription();
                this.txtTranscription.set('value', this.findingData.get('text'));
                this.txtTranscription.set('disabled', true);
            };
        },

        onOKClick: function () {
            var data = this.findingData;
            var isGroup = data && data.domNode && domClass.contains(data.domNode, 'findingGroup');
            var changes = {};

            changes.result = this.normalizeValue(this.cmbResult.get('value'), '');
            changes.prefix = this.normalizeValue(this.cmbPrefix.get('value'), '');
            changes.modifier = this.normalizeValue(this.cmbModifier.get('value'), '');
            changes.status = this.normalizeValue(this.cmbStatus.get('value'), '');
            changes.onset = this.normalizeValue(this.txtOnset.get('value'), '');
            changes.duration = this.normalizeValue(this.txtDuration.get('value'), '');
            changes.episode = this.normalizeValue(this.txtEpisode.get('value'), '');

            if (isGroup) {
                changes.overrideTranscription = this.chkOverrideTranscription.get('checked');
                if (changes.overrideTranscription) {
                    changes.text = this.txtTranscription.get('value');
                };
            };

            array.forEach(core.forceArray(data), function (item) {
                this.applyProperties(item, changes);
                item.updateTranscription();
            }, this);

            this.hide();
        },

        applyProperties: function (finding, properties) {
            for (var p in properties) {
                finding.set(p, properties[p]);
            };
        },

        onCancelClick: function () {
            this.hide();
        },

        normalizeValue: function (value, defaultValue) {
            if (value && value != '-empty-') {
                return value;
            }
            else {
                return defaultValue;
            }
        }
    });
});