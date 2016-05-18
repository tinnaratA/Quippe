define([
    "dijit/_WidgetsInTemplateMixin",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/keys",
	"dojo/text!qc/design/templates/SavePresetDialog.htm",
    "qc/Dialog",
	"qc/_core"
], function (_WidgetsInTemplateMixin, declare, event, lang, keys, SavePresetDialogTemplate, Dialog, core) {
	return declare("qc.design.SavePresetDialog", [Dialog, _WidgetsInTemplateMixin], {
		title: 'Save Preset',
		templateString: SavePresetDialogTemplate,

		_getPresetNameAttr: function () {
			return this.presetNameTextBox.get('value');
		},

		_setPresetNameAttr: function (value) {
			this.presetNameTextBox.set('value', value);
			this.checkState();
		},

		onOKClick: function (event, accepted) {
			if (this.presets[this.get('presetName')] && !accepted) {
				core.confirm({
					title: 'Save Preset',
					message: 'An preset with the name "' + this.get('presetName') + '" already exists. Do you want to replace it?',
					yesCallback: lang.hitch(this, function () {
						this.onOKClick(null, true);
					})
				});

				return;
			}

			this.inherited(arguments);
		},

		checkState: function (evt) {
			if (this.get('presetName') != '' && this.get('presetName') != null) {
				this.cmdOK.set('disabled', false);
			}

			else {
				this.cmdOK.set('disabled', true);
			}

			if (evt && evt.keyCode == keys.ENTER && !this.cmdOK.get('disabled')) {
				event.stop(evt);
				this.onOKClick();
			}
		}
	});
});