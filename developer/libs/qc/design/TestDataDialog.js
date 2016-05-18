define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/topic",
    "qc/design/StandardDialog",
    "qc/ResizableDialogMixin",
    "qc/design/LayoutBuilder",
    "qc/design/PropertyGrid",
    "qc/ListView",
    "qc/ListViewItem",
    "qc/design/_PropertyGridSupport",
    "qc/DateUtil",
    "qc/_EnumManager",
    "qc/_core"
], function (declare, array, lang, aspect, domGeometry, domStyle, topic, StandardDialog, ResizableDialogMixin, LayoutBuilder, PropertyGrid, ListView, ListViewItem, _PropertyGridSupport, DateUtil, EnumManager, core) {
    var typeDef = declare('qc.design.TestDataDialog', [StandardDialog, ResizableDialogMixin], {
        title: 'Test Data',
        width: 500,
        height: 300,

        _patientType: declare('testData.Patient', [_PropertyGridSupport], {
            id: 'Patient',
            text: 'Patient',
            lastName: '',
            firstName: '',
            sex: '',
            birthDate: null,

            _pgPropDef_lastName: function () { return { name: 'lastName' } },
            _pgPropDef_firstName: function () { return { name: 'firstName' } },
            _pgPropDef_sex: function () { return { name: 'sex', options: '[F=female;M=male;U=unknown]' } },
            _pgPropDef_birthDate: function () {
                return {
                    name: 'birthDate',
                    getter: lang.hitch(this, function () {
                        return DateUtil.isDate(this.birthDate) ? DateUtil.format(this.birthDate, 'yyyy-MM-dd') : '';
                    }),
                    setter: lang.hitch(this, function (value) {
                        var d = DateUtil.toDate(value, null);
                        if (DateUtil.isDate(d)) {
                            this.birthDate = d;
                            return true;
                        }
                        else {
                            return false;
                        }
                    }),
                    validator: function (value, propDef) {
                        var d = DateUtil.toDate(value, null);
                        if (d === null) {
                            return { isValid: false, message: 'Invalid Date' };
                        }
                        else {
                            return { isValid: true };
                        }
                    },
                    reloadOnChange: true
                }
            }
        }),

        _encounterType: declare('testData.Encounter', [_PropertyGridSupport], {
            id: 'Encounter',
            text: 'Encounter',
            encounterTime: new Date(),
            _pgPropDef_encounterTime: function () {
                return {
                    name: 'encounterTime',
                    caption: 'Time',
                    getter: lang.hitch(this, function () {
                        return DateUtil.isDate(this.encounterTime) ? DateUtil.formatISODate(this.encounterTime) : '';
                    }),
                    setter: lang.hitch(this, function (value) {
                        var d = DateUtil.toDate(value, null);
                        if (DateUtil.isDate(d)) {
                            this.encounterTime = d;
                            return true;
                        }
                        else {
                            return false;
                        }
                    })
                }
            },
            _pgPropDef_code: function () { return { name: 'code' } },
            _pgPropDef_description: function () { return { name: 'description' } }
        }),

        _providerType: declare('testData.Provider', [_PropertyGridSupport], {
            id: 'Provider',
            text: 'Provider',
            encounterTime: new Date(),
            _pgPropDef_name: function () {
                return { name: 'name' }
            }
        }),

        show: function () {
            this.inherited(arguments);

            var containerNodeBox = domGeometry.getMarginBox(this.containerNode);
            var contentAreaBox = domGeometry.getMarginBox(this.contentArea.domNode);

            this.resizer.minWidth = containerNodeBox.w;
            this.resizer.minHeight = containerNodeBox.h + 28;

            this.contentAreaHeightDifference = containerNodeBox.h - contentAreaBox.h;
            this.contentAreaWidthDifference = containerNodeBox.w - contentAreaBox.w;

            this.initData();
        },

        postCreate: function () {
            this.inherited(arguments);
            this.initLayout();
        },

        _setWidthAttr: function (value) {
            var nValue = parseInt(value, 10);
            if (!isNaN(nValue) && nValue > 0) {
                this.width = nValue;
                if (this.layout) {
                    domStyle.set(this.layout, { width: nValue + 'px' });
                }
            }
        },

        _setHeightAttr: function (value) {
            var nValue = parseInt(value, 10);
            if (!isNaN(nValue) && nValue > 0) {
                this.height = nValue;
                if (this.layout) {
                    domStyle.set(this.layout, { height: nValue + 'px' });
                }
            }
        },

        initLayout: function () {
            this.propertyGrid = new PropertyGrid({ showTitlebar: true, sortProperties: false });
            this.listView = new ListView();
            aspect.after(this.listView, 'onSelectionChanged', lang.hitch(this, this.onSelectedItemChanged));

            this.layout = LayoutBuilder.buildLayout({
                style: { width: this.width + 'px', height: this.height + 'px', margin: '0px' },
                left: { content: this.listView, style: { width: '33%' }, splitter: true },
                center: { content: this.propertyGrid }
            });
            this.layout.placeAt(this.contentArea);
        },

        initData: function () {
            this.listView.addItem(new this._patientType);
            this.listView.addItem(new this._encounterType);
            this.listView.addItem(new this._providerType);
            this.listView.getChildren().forEach(function (li) {
                if (core[li.data.id]) {
                    li.data._pgGetProperties().forEach(function (prop) {
                        li.data[prop.name] = core[li.data.id][prop.name];
                    });
                }
            });
        },

        onSelectedItemChanged: function () {
            var listItem = this.listView.getSelectedItem();
            if (listItem) {
                this.propertyGrid.set('selectedObject', listItem.data);
            }
            else {
                this.propertyGrid.set('selectedObject', null);
            }
        },

        onResizerUpdate: function (width, height) {
            domStyle.set(this.containerNode, "width", (width - this.contentAreaWidthDifference) + "px");
            domStyle.set(this.containerNode, "height", (height - this.contentAreaHeightDifference) + "px");

            this.contentArea.resize({
                w: width - this.contentAreaWidthDifference,
                h: height - this.contentAreaHeightDifference - 28
            });
        },

        onOKClick: function () {
            this.listView.getChildren().forEach(function (li) {
                var data = li.data;
                if (data && data.id) {
                    if (!core[data.id]) {
                        core[data.id] = {};
                    };
                    data._pgGetProperties().forEach(function (prop) {
                        core[data.id][prop.name] = data[prop.name];
                    });
                    if (!core[data.id].id) {
                        core[data.id].id = data.id;
                    };
                }
            });


            if (core.Patient.sex) {
                core.Patient.sexLabel = EnumManager.getTextSynch('sex', core.Patient.sex);
            };

            if (core.Patient.birthDate && core.Encounter.encounterTime) {
                var age = DateUtil.calculateAge(core.Patient.birthDate, core.Encounter.encounterTime);
                if (age) {
                    core.Patient.ageInMinutes = age.totalMinutes;
                    core.Patient.ageLabel = age.label;
                    core.Patient.age = age;
                }
            };

            topic.publish('/qc/PatientChanged');
            this.inherited(arguments);
        }
    });

    return typeDef;
});