define([
    "qc/note/_EditableTextMixin",
    "qc/note/_Element",
    "qc/note/_FindingElementMixin",
    "qc/note/_SelectableMixin",
	"qc/TimingTranscriber",
    "qc/Transcriber",
    "qc/TimingPanel",
    "dijit/Menu",
    "dijit/MenuItem",
    "dijit/PopupMenuItem",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/query",
    "dojo/topic",
    "qc/_core",
	"qc/design/StandardDialog",
    "qc/note/Component",
    "qc/note/ComponentSettingsMixin",
    "qc/note/PropertyBindingMixin",
	"qc/note/DateTimeEntry",
	"qc/note/Component_checkBox",
    "qc/note/Component_dateDropDown",
    "qc/note/Component_dateTimeDropDown",
    "qc/note/Component_doubleCheck",
    "qc/note/Component_dropDown",
    "qc/note/Component_label",
    "qc/note/Component_popup",
    "qc/note/Component_separator",
    "qc/note/Component_singleCheck",
    "qc/note/Component_termChooser",
    "qc/note/Component_textBox",
    "qc/note/Component_timingPopup",
    "qc/note/Component_dropDownList",
    "qc/note/Component_actionButton"
], function (_EditableTextMixin, _Element, _FindingElementMixin, _SelectableMixin, TimingTranscriber, Transcriber, TimingPanel, Menu, MenuItem, PopupMenuItem, registry, array, declare, lang, domClass, domConstruct, domStyle, query, topic, core, StandardDialog, Component, ComponentSettingsMixin, PropertyBindingMixin) {
	var FindingLabel = declare("qc.note.FindingLabel", [_Element, _SelectableMixin, _FindingElementMixin, ComponentSettingsMixin, PropertyBindingMixin, _EditableTextMixin], {
		templateString: '<div class="qcFindingEntry finding qcddSource qcContextMenuContainer hyperlinkParent" tabindex="1">'
                      + '  <div class="compTable" data-dojo-attach-point="componentsTable">'
                      + '    <div class="compRow" data-dojo-attach-point="componentsNode"></div>'
                      + '  </div>'
                      + '</div>',
		elementName: 'Finding',
		components: null,
		propertyIndex: null,
		designMode: false,
		resultSequence: 'P3',
		resultSequenceValues: null,

		startup: function () {
			if (!this._started) {
				this.inherited(arguments);
				//this.renderComponents();
			};
		},

		destroyRecursive: function () {
			if (this.components) {
				core.forEachProperty(this.components, function (name, comp) {
					if (comp && comp.destroyRecursive) {
						comp.destroyRecursive()
					};
					comp = null;
				}, this);
			};
			this.destroyBindings();
			this.inherited(arguments);
		},

		getComponentValue: function (name, value) {
			return this.propertyIndex && this.propertyIndex[name] ? this.propertyIndex[name].getValue() : this[name];
		},
		setComponentValue: function (name, value) {
			if (this.propertyIndex && this.propertyIndex[name]) {
				this.propertyIndex[name].setValue(value);
			};
			this._set(name, value);
			//this[name] = value;
		},

		_getTextAttr: function (value) {
			return this.getComponentValue('text');
		},
		_setTextAttr: function (value) {
			this.setComponentValue('text', value);
		},

		_getResultAttr: function (value) {
		    return domClass.contains(this.domNode, 'pos') ? 'A' : domClass.contains(this.domNode, 'neg') ? 'N' : '';
		},
		_setResultAttr: function (value) {
			value = value || '';
			if (value != this.get('result')) {
				if (value == 'A') {
					domClass.remove(this.domNode, 'neg');
					domClass.add(this.domNode, ['pos', 'entry']);
				}
				else if (value == 'N') {
					domClass.add(this.domNode, ['neg', 'entry']);
					domClass.remove(this.domNode, 'pos');
				}
				else {
					value = '';
					domClass.remove(this.domNode, ['neg', 'pos', 'entry']);
				};
				this.setComponentValue('result', value);
				this._set('result', value);
				this.updateTranscription();
				this.updateComponentDisplay();
				topic.publish('/qc/FindingResultChanged', this);

				if (core.settings.autoUndoAutoNeg && value == 'A') {
				    var part = this.getContainingPart();
				    var key = this.nodeKey;
				    if (part) {
				        query('.finding', part.containerNode).map(registry.byNode).forEach(function (x) {
				            if (x.autoNegated == true && x.get('result') == 'N' && key.substr(0, x.nodeKey.length) == x.nodeKey) {
				                x.autoNegated = false;
				                x.set('result', '');
				            }
				        })
				    }
				};

				setTimeout(lang.hitch(this, this.checkAutoPrompt), 500);
			};
		},

		_getValueAttr: function (value) {
			return this.getComponentValue('value');
		},
		_setValueAttr: function (value) {
			this.setComponentValue('value', value);
		},

		_getUnitAttr: function (value) {
			return this.getComponentValue('unit');
		},
		_setUnitAttr: function (value) {
			this.setComponentValue('unit', value);
		},

		_getOnsetAttr: function (value) {
			return this.getComponentValue('onset');
		},
		_setOnsetAttr: function (value) {
			this.setComponentValue('onset', value);
		},

		_getDurationAttr: function (value) {
			return this.getComponentValue('duration');
		},
		_setDurationAttr: function (value) {
			this.setComponentValue('duration', value);
		},

		_getEpisodeAttr: function (value) {
			return this.getComponentValue('episode');
		},
		_setEpisodeAttr: function (value) {
			this.setComponentValue('episode', value);
		},

		_getTimingAttr: function (value) {
			return this.getComponentValue('timing');
		},
		_setTimingAttr: function (value) {
			this.setComponentValue('timing', value);
		},

		_getNotationAttr: function (value) {
			return this.getComponentValue('notation');
		},
		_setNotationAttr: function (value) {
			this.setComponentValue('notation', value);
		},

		_getResultSequenceAttr: function () {
			return this.resultSequence || 'P3';
		},
		_setResultSequenceAttr: function (value) {
			switch (value) {
				case 'N2':  //2-state neg only
					this.resultSequenceValues = { '': 'N', 'N': '' };
					this.resultSequence = value;
					break;
				case 'P2':  //2-state pos only
					this.resultSequenceValues = { '': 'A', 'A': '' };
					this.resultSequence = value;
					break;
				case 'N3':  //3-state neg first
					this.resultSequenceValues = { '': 'N', 'N': 'A', 'A': '' };
					this.resultSequence = value;
					break;
				default:    //3-state pos first
					this.resultSequenceValues = { '': 'A', 'A': 'N', 'N': '' };
					this.resultSequence = 'P3';
					break;
			};
		},

		_getLabelAttr: function (value) {
			return this.getComponentValue('label');
		},
		_setLabelAttr: function (value) {
			this.setComponentValue('label', value);
		},

		_getPostSepAttr: function (value) {
			return this.getComponentValue('postSep');
		},
		_setPostSepAttr: function (value) {
			this.setComponentValue('postSep', value);
		},

		renderComponents: function (settings) {
			settings = settings || this._getComponentSettingsAttr();

			if (!settings) {
				return;
			};
			//        if (!settings || core.equivalentObjects(this.cachedComponentSettings, settings)) {
			//            return;
			//        };

			//        this.cachedComponentSettings = lang.clone(settings);

			if (this.components) {
				core.forEachProperty(this.components, function (name, comp) {
					if (comp.propertyName) {
						var compValue = comp.getValue();
						if (compValue && compValue != this[comp.propertyName]) {
							this[comp.propertyName] = compValue;
						};
					};
					if (comp && comp.destroyRecursive) {
						comp.destroyRecursive()
					};
					comp = null;
				}, this);
			};
			domConstruct.empty(this.componentsNode);

			this.components = {};
			this.propertyIndex = {};

			this.fixedTranscription = false;

			var compList = [];

			core.forEachProperty(settings, function (name, s, src, i) {
				if (s.visible != 0 || this.designMode) {
					var typeName = 'qc/note/Component_' + s.entryType;
					var type = null;

					try {
						type = require(typeName);
					}

					catch (e) {
						throw 'Missing finding entry component type: ' + typeName + ' in finding ' + this.medcinId;
					}

					var comp = new type(this, s);
					comp.name = name;
					var node = comp.createNode();
					if (comp.propertyName) {
						this.propertyIndex[comp.propertyName] = comp;
						if (this[comp.propertyName]) {
							comp.setValue(this[comp.propertyName]);
						}
						if (comp.propertyName == 'result') {
						    this.fixedTranscription = comp.togglePhrasing ? false : true;

							//Overrides the resultSequence if a dual-state result-bound checkbox is present
							if (comp.entryType == 'singleCheck' && (comp.styleClass == 'x' || comp.styleClass == 'check')) {
								if ((this.resultSequence || 'P3') == 'P3') {
									this.set('resultSequence', 'P2');
								}
								else if (this.resultSequence == 'N3') {
									this.set('resultSequence', 'N2');
								};
							};

						}
                        else if (comp.propertyName == 'label') {
						    if (comp.value) {
						        this.set('label', comp.value);
						        comp.setValue(comp.value);
						    }
						}
					};
					compList.push(comp);
					this.components[comp.name] = comp;
				};
			}, this);

			compList.sort(function (a, b) { return (a.sequence || 0) - (b.sequence || 0) });

			array.forEach(compList, function (comp) {
				if (comp.domNode) {
					domConstruct.place(comp.domNode, this.componentsNode);
				};
				comp.notifyValueChanged = lang.hitch(this, this.onComponentValueChanged);
			}, this);

			//this.updateComponentDisplay();
			//this.updateTranscription();
		},

        _setMedcinIdAttr: function(value) {
            this._set('medcinId', value);
            this.medcinId = value;
        },

        _getMedcinIdAttr: function() {
            return this.medcinId;
        },

		onComponentValueChanged: function (component, value) {
			if (component.propertyName) {
				//this[component.propertyName] = value;
				this._set(component.propertyName, value);
				if (value && !this.result && component.setsResult) {
					this.set('result', 'A');
					this.resultAutoSet = true;
				}
				else if (this.resultAutoSet && !value) {
					var allEmpty = true;
					core.forEachProperty(this.components, function (comp) {
						if (comp.propertyName && comp.setsResult && this[comp.propertyName]) {
							allEmpty = false;
						}
					});
					if (allEmpty) {
						this.set('result', '');
					};
				};
			};
		},

		resultToFlag: function (result) {
			switch ((result || '').toString()) {
				case 'A':
				case '1':
				case 'pos':
					return 2;
				case 'N':
				case '2':
				case 'neg':
					return 4;
				default:
					return 1;
			}
		},

		transcribe: function (context) {
			if (domClass.contains(this.domNode, 'listHide')) {
				return;
			};

			if (this.overrideTranscription && this.get('text')) {
				return;
			};

			context = context || {};
			context.resultSequence = this.get('resultSequence');

			var t = new Transcriber();
			context.suppress = context.suppress || {};
			core.forEachProperty(this.propertyIndex, function (name, comp) {
				switch (comp.propertyName || 'none') {
					case 'text':
						break;
					case 'result':
					    this.fixedTranscription = comp.togglePhrasing ? false : true;
						break;
					case 'none':
						break;
					default:
						context.suppress[name] = true;
						break;
				};
			});
			var text = t.transcribe(this, context);
			if (text) {
				this.set('text', text);
			}
			t = null;
		},

		updateDisplay: function () {
			this.renderComponents();
			this.updateComponentDisplay();
			this.inherited(arguments);
		},

		updateComponentDisplay: function (result) {
			if (!this.components) {
				return;
			};

			var rFlag = this.resultToFlag(this.get('result'));
			var disabled = this.get('disabled');

			core.forEachProperty(this.components, function (name, comp) {
				domStyle.set(comp.domNode, 'display', (rFlag & comp.visible) ? '' : 'none');
				comp.setDisabled(disabled || !(rFlag && comp.enabled));
				//comp.setDisabled(!disabled && (rFlag & comp.enabled) ? false : true);
			}, this);
		},

		toggleResultFromEvent: function (evt) {
			//handled by component event
		},

		parseXmlChildElements: function (widget, xmlNode, sourceClass) {
			this.parseComponentSettings(xmlNode);
			this.parseBindings(xmlNode);
			this.inherited(arguments);
		},

		writeNoteElement: function (writer, mode) {
			if (mode == 'template' || this.get('result')) {
				writer.beginElement(this.elementName || "Finding");
				this.writeAllAttributes(writer, mode);
				this.writeComponentSettings(writer, mode);
				this.writeBindings(writer, mode);
				this.writeAltPhrasing(writer, mode);
				this.writeCodingInfo(writer, mode);
				this.writeTimingComponents(writer, mode);
				writer.endElement();
				return 1;
			}
			else {
				return 0;
			}
		},

		writeNoteAttributes: function (writer, mode) {
			this.inherited(arguments);
			writer.attribute('AutoPrompt', this.haveOwnProperty('autoPrompt') ? this.autoPrompt : 'none', 'none');
			writer.attribute('ResultSequence', this.resultSequence || 'P3', 'P3');
		},

		_pgPropDef_resultSequence: function () {
		    return {
		        name: 'resultSequence',
		        group: 'Behavior',
		        options: '[P3=3-state, pos first;N3=3-state,neg first;P2=2-state, pos only;N2=2-state, neg only]',
		        isShareable: true,
		        description: core.getI18n('tooltipResultSequence'),
		        defaultValue: 'P3'
		    };
		},

		_pgPropDef_autoPrompt: function() {
		    return {
		        name: 'autoPrompt',
		        options: '[;RN=RN;DX=DX;none=None]',
		        group: 'Behavior',
		        isShareable: true,
		        description: core.getI18n('tooltipAutoPrompt')
		    };
		},


		duplicate: function (suppressName) {
			var newFinding = this.inherited(arguments);
			//        array.forEach(['toggleElement', 'autoPrompt'], function (prop) {
			//            newFinding.set(prop, this.get(prop))
			//        }, this);
			array.forEach(['autoPrompt'], function (prop) {
				newFinding.set(prop, this.get(prop))
			}, this);
			if (this.componentSettings) {
				newFinding.set('componentSettings', lang.clone(this.componentSettings));
			};
			return newFinding;
		},

		_getAutoPromptAttr: function () {
			return this.getInheritedProperty('autoPrompt', '');
		},
		_setAutoPromptAttr: function (value) {
			this.autoPrompt = value == 'inherited' ? '' : value;
		},

		//    _setToggleElementAttr: function (value) {
		//        this.toggleElement = value;
		//        this.checkElementToggle();
		//        var hSub = topic.subscribe('/qc/DocumentLoaded', lang.hitch(lang.hitch(this, function ()) {
		//            core.unsubscribe(hSub);
		//            this.checkElementToggle();
		//        }));
		//    },

		//    checkElementToggle: function () {
		//        var targetNames = this.get('toggleElement');
		//        if (!targetNames) {
		//            return;
		//        };

		//        array.forEach(targetNames.split(','), function (name) {
		//            var target = this.getElementByName(name.trim());
		//            if (target) {
		//                if (!target.toggleRefs) {
		//                    target.toggleRefs = [this]
		//                }
		//                else {
		//                    if (array.indexOf(target.toggleRefs, function (ref) { return ref == this }) < 0) {
		//                        target.toggleRefs.push(this);
		//                    };
		//                };

		//                if (array.some(target.toggleRefs, function (ref) { return ref.result == 'A' })) {
		//                    domClass.remove(target.domNode, 'hidden');
		//                }
		//                else {
		//                    domClass.add(target.domNode, 'hidden');
		//                };
		//            };
		//        }, this);
		//    },

		checkAutoPrompt: function () {
			var autoPrompt = this.get('autoPrompt') || 'none';
			if (autoPrompt == 'none') {
				return;
			};

			var medcinId = this.medcinId;
			if (!medcinId) {
				return;
			};

			var result = this.get('result') || 'N';

			if (result == 'N') {
				if (this.autoPromptListId) {
					var sourcesPane = query('.qcSourceList').map(registry.byNode)[0];
					if (sourcesPane) {
						sourcesPane.removeList(this.autoPromptListId);
					}
					else {
						topic.publish('/qc/RemoveList', this.autoPromptListId);
					};
					this.autoPromptListId = '';
				};
				return;
			};

			var prefix = this.prefix || '';
			var listSize = (this.rn == 'AX') ? 3 : core.settings.listSize;
			var listId = '';

			var key = autoPrompt + medcinId + prefix;
			this.autoPromptListId = key;
			topic.publish('/qc/ContentPrompt', autoPrompt, this.toFinding(), listSize, key, true);
		},

		/* Custom Result Sequence Handling */
		toggleResult: function (dualState, evt) {
			var seq = this.resultSequenceValues || { '': 'A', 'A': 'N', 'N': '' };
			var currentResult = this.get('result' || '');
			var newResult = dualState && currentResult != '' ? '' : seq[currentResult];
			this.set('result', newResult);
			return newResult;
		},

		getContextActions: function (item, widget, targetNode) {
			//Multi-Problem

			var response = { deferToParent: true };
			var actions = [];

			if (core.settings.enableProblemGrouping && item.type != 'selection') {
				var assessmentSection = core.ancestorWidgetByClass(widget, 'problemSectionController');
				if (assessmentSection) {
					actions.push({ label: 'Create a Problem Section', icon: '', topic: '/qc/CreateProblemSection', item: { dxWidget: widget, assessmentSection: assessmentSection }, beginGroup: true });
				}
				else {
				    var problemSection = core.ancestorWidgetByClass(widget, 'problemSection');
				    if (!problemSection) {
				        problemSection = core.ancestorWidgetByClass(widget, 'problemSectionSubgroup');
				    };
					if (problemSection) {
						var otherProblemSections = query('.problemSection').map(registry.byNode).filter(function (x) { return (x.problemMedcinId != problemSection.problemMedcinId) });
						if (otherProblemSections && otherProblemSections.length > 0) {
							var copyMenu = new Menu();
							var moveMenu = new Menu();
							array.forEach(otherProblemSections, function (y) {
								copyMenu.addChild(new MenuItem({
									label: y.get('text'),
									showLabel: true,
									onClick: function () { topic.publish('/qc/MoveOrCopyProblem', 'copy', widget, problemSection, y) }
								}));
								moveMenu.addChild(new MenuItem({
									label: y.get('text'),
									showLabel: true,
									onClick: function () { topic.publish('/qc/MoveOrCopyProblem', 'move', widget, problemSection, y) }
								}));
							});
							if (otherProblemSections.length > 1) {
							    copyMenu.addChild(new MenuItem({
							        label: 'All',
							        showLabel: true,
							        onClick: function () { topic.publish('/qc/MoveOrCopyProblem', 'copy', widget, problemSection, 'ALL') }
							    }));
							};

							var copyPopup = new PopupMenuItem({
								label: 'Copy to Problem',
								showLabel: true,
								popup: copyMenu
							});

							var movePopup = new PopupMenuItem({
								label: 'Move to Problem',
								showLabel: true,
								popup: moveMenu
							});

							actions.push({ menuItem: copyPopup, beginGroup: true });
							actions.push({ menuItem: movePopup });
						};
					};
				};
			};

			if ((this.timingComponents && this.timingComponents.length > 0) || (this.rnType == 'A') || (this.rn == 'AX')) {
				actions.push({ label: 'Edit Timing...', showLabel: true, onClick: lang.hitch(this, this.showTimingEditor) });
			};

			if (actions.length > 0) {
				response.mergeAfter = actions;
			};

			return response;
		},

		_editableText_ApplyChanges: function (newText, originalText) {
			this.set('text', newText);
			this.overrideTranscription = true;
			this.transcribe();
		},

		showTimingEditor: function () {
			var timingPanel = new TimingPanel();
			timingPanel.startup();
			var components = this.timingComponents || [];
			timingPanel.set('components', components);
			core.doDialog(StandardDialog, { title: 'Timing', content: timingPanel }, function () {
				this.timingComponents = timingPanel.get('components');
				this.set('timing', TimingTranscriber.transcribe(this.timingComponents));
				this.updateTranscription();
			}, null, this);
		},

		_setOverrideTranscriptionAttr: function (value) {
		    this.overrideTranscription = value;

		    if (this.overrideTranscription) {
		        this.set('postSep', '');
		    }

		    else {
		        this.transcribe({});
		    }
		}

	});

	core.settings.noteElementClasses["qc/note/FindingLabel"] = FindingLabel;

	return FindingLabel;
});