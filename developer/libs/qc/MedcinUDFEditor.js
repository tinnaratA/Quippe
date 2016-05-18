/*
 * This module implements the User Defined Finding editor.
 * Developer: Roy Soltoff
 */
define([
"dojo/_base/array",
"dojo/_base/declare",
"dojo/_base/event",
"dojo/_base/lang",
"dojo/aspect",
"dojo/dom-construct",
"dojo/dom-class",
"dojo/keys",
"dojo/on",
"dojo/query",
"dojo/request",
"dojo/store/Memory",
"dojo/when",
"dojo/topic",
"dijit/Dialog",
"dijit/_TemplatedMixin",
"dijit/_WidgetsInTemplateMixin",
"dijit/_WidgetBase",
"dijit/form/Button",
"dijit/form/RadioButton",
"dijit/form/TextBox",
"dijit/layout/BorderContainer",
"dijit/layout/ContentPane",
"dijit/registry",
"dijit/Toolbar",
"dijit/ToolbarSeparator",
"qc/ContextMenu",
"qc/DataSheet",
"qc/DateUtil",
"qc/design/LayoutBuilder",
"qc/design/ToolbarBuilder",
"qc/FilteringSelect",
"dojo/text!qc/templates/UDFEditor.htm",
"qc/MedcinTreeDialog",
"qc/OpenContentDialog",
"qc/OpenUserContentDialog",
"qc/SaveContentDialog",
"qc/XmlUtil",
"qc/XmlWriter",
"qc/_core"
], function (array, declare, event, lang, aspect, domConstruct, domClass, keys, on, query, request, Memory, when, topic, Dialog, _TemplatedMixin, _WidgetsInTemplateMixin, _WidgetBase, Button, RadioButton, TextBox, BorderContainer, ContentPane, registry, Toolbar, ToolbarSeparator, ContextMenu, DataSheet, DateUtil, LayoutBuilder, ToolbarBuilder, FilteringSelect, UDFEditorTemplate, MedcinTreeDialog, OpenContentDialog, OpenUserContentDialog, SaveContentDialog, XmlUtil, XmlWriter, core) {
    return declare("qc.MedcinUDFEditor", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: "Medcin UDF Editor",
        templateString: UDFEditorTemplate,
        contextMenu: null,
        ready: null,
        attachId: 0,
        userid: 0,
        parentMedcinid: 0,
        attachLink: 'S',
        itemGUID: '',
        dirty: false,
        events: [],
        codeheadings: [
                { width: '80px', propertyName: 'codeset', caption: 'Code Set', widgetType: 'qc/FilteringSelect', constructor: null, settings: { required:false, searchAttr: 'name', data: null } },
                { propertyName: 'code', caption: 'Code' },
                { propertyName: 'year', caption: 'Year' },
                { width: '18px', deleteRowIndicator: true}
        ],
        codesets: [
                  { name: "CCC", id: "1", value:"1" },
                  { name: "SNOMED", id: "3", value: "3" },
                  { name: "ICD-10", id: "5", value: "5" },
                  { name: "ICD-9", id: "6", value: "6" },
                  { name: "ICD-H", id: "10", value: "10" },
                  { name: "ICD-F", id: "11", value: "11" },
                  { name: "CPT", id: "19", value: "19" },
                  { name: "CPTMod", id: "20", value: "20" },
                  { name: "HCPC", id: "22", value: "22" },
                  { name: "DSM", id: "23", value: "23" },
                  { name: "LOINC", id: "25", value: "25" },
                  { name: "RXNORM", id: "31", value: "31" },
                  { name: "CVX", id: "32", value: "32" },
                  { name: "UNII", id: "33", value: "33" },
                  { name: "DODUC", id: "39", value: "39" }
        ],

        startup: function () {
            if (!this._started) {
                this.inherited(arguments);
                this.mainPanel.startup();
                topic.subscribe("/qc/TreeDialogSelection", lang.hitch(this, this.attachto));    // for getting the user MedcinId selection to attach to
                this.codetable.startup();
                this._initContextMenus();
                this._hookEvents();
                this.codeheadings[0].constructor = lang.hitch(this,this.onWidgetCreate);
                this.ready = this.loadList();
            };
            this.doNew();
        },

        destroyRecursive: function () {
            this._unhookEvents();
            this.inherited(arguments);
        },

        _hookEvents: function () {
            if (this.events.length == 0) {
                var self = this;
                this.events = [
                    //aspect.after(this.codetable, "onSelectedRowChanged", lang.hitch(this, this.onSelectedRowChanged), true),
                    aspect.after(this.codetable, "onCellValueChanged", lang.hitch(this, this.onCellValueChanged), true),
                    aspect.after(this.codetable, "onRowDeleted", lang.hitch(this, this.onRowDeleted), true)
                ];
                var odc = lang.hitch(this, this.onDataChange);
                query('.textInput').map(registry.byNode).forEach(function (box) {
                    //var evt = aspect.after(box, "onInput", odc, true);
                    var evt = aspect.after(box, "onChange", odc, true);
                    self.events.push(evt);
                });
            }
        },

        _unhookEvents: function () {
            if (this.events.length > 0) {
                array.forEach(this.events, core.disconnect);
                this.events = [];
            }
        },

        _initContextMenus: function () {
            this.contextMenu = new qc.ContextMenu();
            this.contextMenu.startup();
        },

        _initCodeTable: function () {
            this.codetable.load(this.codeheadings/*,
            [{codeset:'5',code:'Z99.999',year:'2016'}]*/)    // Data here just for testing
        },

        /*
         * Handles the selection of the concept to attach this UDF to.
         * Will populate the UDF properties with the properties of the selection
         * for subsequent editing of this UDF's properties
        */
        attachto: function(e) {
            this.attachId = e.id;
            if (this.attachId > 0) {
                var self = this;
                request(core.serviceURL('Medcin/Term/' + this.attachId), {
                    query: { Details: 'search,nomin,sdocpos,sdocneg,pdocpos,pdocneg,unit,parentMedcinid', DataFormat: 'JSON' },
                    handleAs: 'json'
                }).then(function (data) {
                    var term = data.term;
                    if (term) {
                        self.parentMedcinid = term.parentMedcinid;
                        self.txtAttach.set("value", term.search + ' [' + self.attachId + ']');
                        self.txtSearch.set("value", term.search);
                        self.txtNomenclature.set("value", term.nomin);
                        self.txtSPos.set("value", term.sdocpos);
                        self.txtSNeg.set("value", term.sdocneg);
                        self.txtPPos.set("value", term.pdocpos);
                        self.txtPNeg.set("value", term.pdocneg);
                        self.txtUnit.set("value", term.unit);
                        if (term.unit != '') {
                            request(core.serviceURL('Medcin/Term/' + self.attachId + '/ValueCheck'), {
                                query: { Value: '1', Sex: 'F', DataFormat: 'JSON' },
                                handleAs: 'json'
                            }).then(function (data) {
                                var term = data.term;
                                if (term) {
                                    self.txtFemLow.set("value", term.normalLow);
                                    self.txtFemHigh.set("value", term.normalHigh);
                                }
                            }, function (err) {
                                core.showError(err);
                            });
                            request(core.serviceURL('Medcin/Term/' + self.attachId + '/ValueCheck'), {
                                query: { Value: '1', Sex: 'M', DataFormat: 'JSON' },
                                handleAs: 'json'
                            }).then(function (data) {
                                var term = data.term;
                                if (term) {
                                    self.txtMaleLow.set("value", term.normalLow);
                                    self.txtMaleHigh.set("value", term.normalHigh);
                                }
                            }, function (err) {
                                core.showError(err);
                            });
                        }
                        else {
                            self.txtFemLow.set("value", '');
                            self.txtFemHigh.set("value", '');
                            self.txtMaleLow.set("value", '');
                            self.txtMaleHigh.set("value", '');
                        }
                    }
                }, function (err) {
                    core.showError(err);
                });
            }
        },

        /*
         * This function is used to create a data store for the codelist selctor in the data table
         * We update this dynamically whenever there is a selection change in another row.
         */
        loadList: function () {
            var codelinkStore = new Memory({
                data: this.codesets.slice()    // Use a copy
            });
        },

        /*
         * Handles the 'attach to' button.
         * Uses the MedcinTreeDialog to locate a finding to attach to.
         * We subscribe to the TreeDialogSelection event to get the MedcinId.
        */
        doAttach: function () {
            core.doDialog(MedcinTreeDialog, { clear: 1 });
        },

        /*
         * Handles the click of the radio button group for the type of attachment
         */
        doAttachLink: function(evt){
            this.attachLink = evt.currentTarget.value;
        },

        /*
         * Handles the 'select Udf' button
         * This functionality is to obtain an existing UDF from the content library
        */
        doSelect: function () {
            this.onSelectUdf();
            this._disableSaveButton(true);
        },

        /*
         * This function obtains the current selection of attach type
         */
        _getLinkType: function () {
            var checkedButtons = query('[name=rbAttach]').filter(function (radio) { return radio.checked; });
            return checkedButtons[0].value();
        },

        /*
         * This function sets the attach type radio buttons appropriate to the UDF loaded
         */
        _setLinkType: function (linktype) {
            var rb;
            switch (this.attachLink) {
                case 'R':
                    rb = this.rbRep;
                    break;
                case 'P':
                    rb = this.rbPar;
                    break;
                default:
                    rb = this.rbSub;
                    break;
            }
            rb.set('checked', true);
        },

        disableSaveButton: function () {
            this._disableSaveButton(true);
        },

        _disableSaveButton: function (disabled) {
            var s1 = /*'abc';*/ this.txtSearch.get("value");
            var s2 = this.txtNomenclature.get("value");
            this.tbSave.set("disabled", disabled || this.codetable.hasErrors() || s1 == '' || s2 == '' || this.attachId == 0);
        },

        // Clear all the fields
        doNew: function () {
            this.userid = 0;
            this.attachId = 0;
            this.parentMedcinid = 0;
            this.attachLink = 'S';
            this.itemGUID = '';
            this.txtUDF.set("value", "");
            this._setLinkType(this.attachLink);
            query('.textInput').map(registry.byNode).forEach(function (box) {
                box.set("value", "");
            });
            this.dirty = false;
            this._disableSaveButton(true);
            this._initCodeTable();
        },

        /*
         * Handles the 'save UDF' button.
         * If the UDF under edit is a new one without an assigned userid,
         * the next available UDF id will be obtained from the MEDCN server.
        */
        doSave: function () {
           this.saveUdf();
        },

        /*
         * Handles the 'save medcin.udf' button.
         * This invokes the service call to MEDCIN.saveudf which re-writes
         * both the medcin.udf and medcin.udp data files.
         * Question: should this be done automatically after the save to the content library?
        */
        doSaveAtServer: function () {
            request(core.serviceURL('Medcin/Udf/SaveUdf'), {
                query: { DataFormat: 'Default' },
                method: 'POST'
        }).then(function (data) {
                if (data.error) {
                    core.showError(data.error.message);
                }
                else {
                    core.alert({ title: 'status', message: 'medcin.udf data file written at the server' });
                }
            }, function (err) {
                core.showError(err);
            });
        },

        /*
         * Anytime there is a change to the UDF data, set dirty and enable the tbSave button.
         * Should also confirm validity of codelist data before enabling the tbSave button.
        */
        onDataChange: function () {
            this.dirty = true;
            this._disableSaveButton(false);
        },

        /*
         * This function obtains the search text and parentMedcinid of the udf.
         * These properties are needed when loading a udf, or when registering all udfs
         */
        getAttachSearch: function (udf) {
            if (!udf.attachid) {
                return udf;
            }
            return request(core.serviceURL('Medcin/Term/' + udf.attachid), {
                query: { Details: 'search,parentMedcinid', DataFormat: 'JSON' },
                handleAs: 'json'
            }).then(function (data) {
                var term = data.term;
                if (term) {
                    udf.parentMedcinid = term.parentMedcinid;
                    udf.attachsearch = term.search;
                    return udf;
                }
            }, function (err) {
                core.showError(err);
                return udf;
            });
        },

        /*
         * This function retrieves an item list of all the udf-typed entries in the content library
         */
        getUdfList: function (list) {
            var self = this;
            return request(core.serviceURL('Quippe/KB/Extension/List'), {
                query: { 'DataFormat': 'JSON', TypeName: 'udf', Sorted: true },
                preventCache: true,
                handleAs: 'json'
            }).then(function (data) {
                array.forEach(data.items, function (item) {
                    list.push(item);
                })
                return list;
            }, function (err) {
                return [];
            });
        },

        _registerAll: function () {
            var self = this;
            var list = [];
            var udfs = [];
            when(this.getUdfList(list), function () {
                if (list.length > 0) {
                    array.forEach(list, function (item) {
                        when(self.openUdfItem(item), function (udf) {
                            when(self._registerUdf(self, udf), function () {
                                ;
                            });
                         })
                    })
                }
            })
        },

        /*
         * This function is to register with the MEDCIN server, all the content library UDFs
        */
        doRegisterAll: function () {
            when(this._registerAll(), function () {
                core.alert({ title: 'status', message: 'UDFs registered at the server' });
            })
        },

        /*
         * registers the UDF at the server so it is available immediately.
         * Note that this does NOT regenerate the server's medcin.udf file.
         * udf: a javascript object of the udf
         * We need to adjust the attachid and userid for the AddUserFinding API as follows:
         * S: attachid=attachId; userid = userid
         * P: attachid = ParentMedcinid(attachId); userid=userid
         * R: attachid=attachId(ignored); userid=attachId
        */
        _registerUdf: function (self, udf) {
            var attachid;
            var userid;
            var sdocpos = udf.sdocpos.length > 0 ? udf.sdocpos : ' ';   // Force a single space if its empty
            switch (udf.attachlink) {
                case 'R':
                    attachid = udf.attachid;
                    userid = udf.attachid;
                    break;
                case 'P':
                    attachid = udf.parentMedcinid;
                    userid = udf.userid;
                    break;
                default: /* 'S' */
                    attachid = udf.attachid;
                    userid = udf.userid;
                    break;
            }
            request(core.serviceURL('Medcin/Udf/RegisterUdf'), {
                query: {
                    DataFormat: 'JSON',
                    userid: userid,
                    attachid: attachid,
                    search: udf.search,
                    nomin: udf.nomin,
                    sdocpos: sdocpos, 
                    sdocneg:  udf.sdocneg, 
                    pdocpos: udf.pdocpos,
                    pdocneg:  udf.pdocneg, 
                    extrasearch:  udf.extrasearch, 
                    unitsofmeasure:  udf.unitofmeasure, /* service is 'units... */
                    femlowrange:  udf.femlowrange,
                    femhighrange: udf.femhighrange,
                    malelowrange:  udf.malelowrange, 
                    malehighrange:  udf.malehighrange, 
                    codelist:  udf.codelist, 
                    stag:  udf.stag, 
                    properties:  udf.properties
                },
                handleAs: 'json',
                method: 'POST'
            }).then(function (data) {
                var item = data.item;
                if (item) {
                    var rc = item.ReturnCode;
                }
            }, function (err) {
                //var doc = XmlUtil.createDocument(err.response.text);
                //var error = XmlUtil.selectChildElement(doc, "Error");
                //var s = error.attributes[0].nodeValue;
                core.showError(err);
            });
        },

        /*
         * Handles the saving of the UDF to the content library.
         * When the SaveContentDialog is OK, this function will convert the UDF to
         * an xml string, write the udf to the library, then register the udf
         * to the MEDCIN server.
        */
        saveUdf: function () {
            var self = this;
            var name = self.txtName.get("value") || '';
            if (name == '') {
                name = self.txtSearch.get("value");
                self.txtName.set("value", name);
            }
            var parms =  {};
            var item = self.controlsToJson(self);
            parms.itemId = self.userid;
            parms.keyWords = self.txtKeyWords.get("value") || '';
            parms.name = name;
            parms.itemGUID = self.itemGUID;
            parms.typeName = 'udf';
            parms.data = self.toUdfXml(item);
            parms.mimeType = 'text/xml';

            request(core.serviceURL('Quippe/KB/Extension/Save?DataFormat=JSON'), {
                data: parms,
                handleAs: 'json',
                method: 'POST'
            }).then(function (data) {
                if (data.error) {
                    core.showError(data.error.message);
                }
                else {
                    var newitem = data.item;
                    if (newitem) {
                        if (self.userid == 0) {
                            self.userid = newitem.itemId;
                            item.userid = self.userid;  // Update this for the reisterUdf
                            self.txtUDF.set("value", self.userid);
                        }
                        // Need to register the UDF with the server
                        self.dirty = false;
                        self._disableSaveButton(true);
                        self._registerUdf(self, item);
                    }
                }
            }, function (err) { core.showError(err) });
        },

        /*
         * This function will create the comma-delimited codelist string
         * [codetype,year,code[,...]]from the individual code properties of the UDF.
        */
        toCodelist: function () {
            var codelist = "";
            var codes = this.codetable.getData();
            for (i = 0; i < codes.length; i++) {
                var item = codes[i];
                if (i > 0) {
                    codelist += ',';
                }
                var s = item.codeset  + ',' + (item.year ? item.year : '0')+ ',' + item.code;
                codelist += s;
            }
            return codelist;
        },

        /*
         * function to convert the page controls content to a javascript object
         * Using this to provide a common object to register a udf  with the server
         */
        controlsToJson: function (self) {
            var item = {};
            item.userid = self.userid || 0;
            item.attachid = self.attachId;
            item.attachlink = self.attachLink;
            item.parentMedcinid = self.parentMedcinid;
            item.search = self.txtSearch.get("value") || '';
            item.nomin = self.txtNomenclature.get("value") || '';
            item.sdocpos = self.txtSPos.get("value") || '';
            item.sdocneg = self.txtSNeg.get("value") || '';
            item.pdocpos = self.txtPPos.get("value") || '';
            item.pdocneg = self.txtPNeg.get("value") || '';
            item.extrasearch = self.txtESearch.get("value") || '';
            item.unitofmeasure = self.txtUnit.get("value") || '';
            item.femlowrange = self.txtFemLow.get("value") || '';
            item.femhighrange = self.txtFemHigh.get("value") || '';
            item.malelowrange = self.txtMaleLow.get("value") || '';
            item.malehighrange = self.txtMaleHigh.get("value");
            item.codelist = self.toCodelist() || '';
            item.stag = self.txtTag.get("value") || '';
            item.properties = self.txtProperties.get("value") || '';
            return item;
        },

        /*
         * Function converts the comma-delimited string of codes to json object
         */
        toCodeJson: function (codelist) {
            var items = [];
            if (codelist == '') {
                return items;   // Empty string means no codes
            }
            var fields = codelist.split(',');
            if ((fields.length % 3) != 0) {
                return items; // Each code must have 3 fields
            }
            for (i = 0; i < fields.length; i += 3) {
                var item = {};
                item.codeset = fields[i];
                item.year = fields[i + 1];
                item.code = fields[i + 2];
                items.push(item);
            }
            return items;
        },

        /*
         * Converts the udf properties from an item to an xml string
        */
        toUdfXml: function (item) {
            var w = new XmlWriter();
            w.beginElement("udf");  // Like to add the id of the login user as an attribute
            w.attribute("EditDate", DateUtil.formatISODate(new Date()));
            w.beginElement('Item');
                w.attribute('userid', item.userid, '0');
                w.attribute('attachid', item.attachid, '0');
                w.attribute('attachlink', item.attachLink, 'S');
                w.attribute('search', item.search, '');
                w.attribute('nomin', item.nomin, '');
                w.attribute('sdocpos', item.sdocpos, '');
                w.attribute('sdocneg', item.sdocneg, '');
                w.attribute('pdocpos', item.pdocpos, '');
                w.attribute('pdocneg', item.pdocneg, '');
                w.attribute('extrasearch', item.extrasearch, '');
                w.attribute('unitofmeasure', item.unitofmeasure, '');
                w.attribute('femlowrange', item.femlowrange, '');
                w.attribute('femhighrange', item.femhighrange, '');
                w.attribute('malelowrange', item.malelowrange, '');
                w.attribute('malehighrange', item.malehighrange, '');
                w.attribute('codelist', item.codelist, '');
                w.attribute('stag', item.stag, '');
                w.attribute('properties', item.properties, '');
                w.endElement();
            w.endElement();
            return w.toString();
        },

        /*
         * Handles the selection of a UDF to retrieve from the content library.
         * Once the UDF is loaded, if there is an attachId, get that search string
         * to populate the attach text box.
        */
        onSelectUdf: function() {
            var self = this;
            core.doDialog(OpenUserContentDialog, { title: 'Select UDF', typeFilter: ['udf'] }, function (dlg) {
                var item = dlg.get("Item");
                if (item && item.data) {
                    var data = item.data;
                    self.doNew();
                    self.itemGUID = data.itemGUID;
                    self.txtUDF.set("value", data.itemId);
                    self.txtName.set("value", data.name);
                    self.txtKeyWords.set("value", data.keyWords);
                     // Now get the data
                    when(self.openUdfItem(item.data), function(udf) {
                        if (udf) {
                            self._unhookEvents();
                            self.attachId = udf.attachid;
                            self.attachLink = udf.attachlink;
                            self._setLinkType(self.attachLink);
                            self.userid = udf.userid;
                            self.txtUDF.set("value", udf.userid);
                            self.txtSearch.set("value", udf.search);
                            self.txtNomenclature.set("value", udf.nomin || '');
                            self.txtSPos.set("value", udf.sdocpos || '');
                            self.txtSNeg.set("value", udf.sdocneg || '');
                            self.txtPPos.set("value", udf.pdocpos || '');
                            self.txtPNeg.set("value", udf.pdocneg || '');
                            self.txtESearch.set("value", udf.extrasearch || '');
                            self.txtUnit.set("value", udf.unitofmeasure || '');
                            self.txtFemLow.set("value", udf.femlowrange);
                            self.txtFemHigh.set("value", udf.femhighrange);
                            self.txtMaleLow.set("value", udf.malelowrange);
                            self.txtMaleHigh.set("value", udf.malehighrange);
                            self.codetable.load(self.codeheadings, self.toCodeJson(udf.codelist || ''));
                            self.txtTag.set("value", udf.stag || '');
                            self.txtProperties.set("value", udf.properties || '');
                            self.txtAttach.set("value", udf.attachsearch + ' [' + udf.attachid + ']');
                            self.codetable.clearErrors();
                            self._hookEvents();
                            setTimeout(lang.hitch(self, self.disableSaveButton), 500);
                        }
                    })
                }
            })
        },

        /*
         * function loads the data of a udf from the content library
         */
        loadUdfItem: function(item) {
            if (!item || !item.itemId) {
                return null;
            };
            var self = this;
            var udf = {};
            return request(core.serviceURL('Quippe/KB/Extension/Data'), {
                query: { DataFormat: 'JSON', itemId: item.itemId },
                handleAs: 'xml'
            }).then(function (data, ioArgs) {
                var root = data ? data.documentElement : null;
                if (!root) {
                    return core.showError('Error loading content item ' + item.itemId + ' - Invalid XML document');
                };
                udf.userid = item.itemId;
                var udfitem = XmlUtil.selectChildElement(root, 'item');
                if (!udfitem) {
                    return null;
                }
                var el = udfitem.attributes;
                array.forEach(el, function (attr) {
                    switch (attr.name) {
                        case 'attachid':
                            udf.attachid = parseInt(attr.value,10);
                            break;
                        case 'attachlink':
                            udf.attachlink = attr.value;
                            break;
                        case 'search':
                            udf.search = attr.value;
                            break;
                        case 'nomin':
                            udf.nomin = attr.value;
                            break;
                        case 'sdocpos':
                            udf.sdocpos= attr.value;
                            break;
                        case 'sdocneg':
                            udf.sdocneg = attr.value;
                            break;
                        case 'pdocpos':
                            udf.pdocpos = attr.value;
                            break;
                        case 'pdocneg':
                            udf.pdocneg = attr.value;
                            break;
                        case 'extrasearch':
                            udf.extrasearch = attr.value;
                            break;
                        case 'unitofmeasure':
                            udf.unitofmeasure = attr.value;
                            break;
                        case 'femlowrange':
                            udf.femlowrange = attr.value;
                            break;
                        case 'femhighrange':
                            udf.femhighrange = attr.value;
                            break;
                        case 'malelowrange':
                            udf.malelowrange = attr.value;
                            break;
                        case 'malehighrange':
                            udf.malehighrange = attr.value;
                            break;
                        case 'codelist':
                            udf.codelist = attr.value;
                            break;
                        case 'stag':
                            udf.stag = attr.value;
                            break;
                        case 'properties':
                            udf.properties = attr.value;
                            break;
                    }
                })
                return udf;
            })
        },

        /*
         * Function to retrieve a selected udf from the content library and load it.
        */
        openUdfItem: function (item) {
            if (!item || !item.itemId) {
                return null;
            };

            var self = this;
            return when(self.loadUdfItem(item), function (udf) {
                // The next is used internally to get the search string and parentMedcinid
                // of the Medcin term attached to (the attachid)
                return when(self.getAttachSearch(udf), function (udf) {
                    return udf;
                });
            })
        },

        /*
         * This function is the creator for the qc/FilteringSelect;
         * it will be called when the datasheet is adding a row when the column
         * definition for that row is a widget. The widgetType and settings
         * are the function arguments.
         */
        onWidgetCreate: function (widget, settings) {
            settings.store = new Memory({ data: this.codesets });
            var ctl = new widget(settings);
            ctl.hSignals = [
                aspect.after(ctl, 'onChange', lang.hitch(this, this.onCodeChanged, ctl))
            ];
            return ctl; // The datasheet will put the cell object into the widget's parentNode property
        },

        /*
         * This function is called when any FilteringSelect control in the datasheet
         * has changed value. The control reference and new value are function arguments.
         * We need to revise the other rows to exclude this selection. This row already has
         * excluded the other rows' selections.
         * If ctl is null, this is called because of a row deleted; setup cellInfo to reflect no row for comparison
         */
        onCodeChanged: function (ctl, newval) {
            var self = this;
            var cellInfo = null;
            this.onDataChange();
            if (ctl) {
                var val = newval ? newval : ctl.get('value');
                var def = ctl.columnDef;
                cellInfo = this.codetable.getCellInfo(ctl.parentNode);
                this.onCellValueChanged(cellInfo, val);
            }
            else {
                cellInfo = { r: -1 };
            }

            // Only the 1st column of the codetable has a widget.
            var colInfo = this.codetable.getColumnCellInfo(0);
            var selections = [];

            array.forEach(colInfo, function (info) {
                var cell = info.cell;
                if (cell) {
                    val = self.codetable.cellValue(info.cell);
                    selections.push({r:info.r,value:self.codetable.cellValue(info.cell)});
                }
                else selections.push({});
            });
            array.forEach(colInfo, function (info) {
                if (info.r != cellInfo.r) { // Update the store only on other rows
                    var newStore = new Memory({
                        data: self.codesets.slice()
                    });
                    array.forEach(selections, function(x) {
                        if (x.r != info.r) {
                            newStore.remove(x.value);
                        }
                    })
                    var widget = self.codetable.getCellWidget(info.cell);
                    if (widget) {
                        widget.store = newStore;
                    }
                }
            });
        },

        /*
         * Called when a datasheet cell changes value
         * We should add some row validation code here (row selector is col 0)
         */
        onCellValueChanged: function (cellInfo, value) {
            if (domClass.contains(cellInfo.row, 'selected')) {
                var isOk = true;
                var val1 = value || '';
                var val2;
                switch (cellInfo.colDef.propertyName) {
                    case 'year':
                        this.onDataChange();
                        return;
                    case 'code':
                        val2 = this.codetable.cellValue(cellInfo.row.cells[1]);
                        break;
                    case 'codeset':
                        val2 = this.codetable.cellValue(cellInfo.row.cells[2]);
                        break;
                }
                if ((val1 == '' && val2 != '') || (val1 != '' && val2 == '')) {
                    isOk = false;
                }
                if (isOk) {
                    this.codetable.clearRowError(cellInfo.r);
                }
                else {
                    this.codetable.setRowError(cellInfo.r, 'data incomplete');
                }
                this.onDataChange();
            }
        },

        /*
         * Called after a codetable row is deleted. Need to update the code selectors
         * to add back in the code that was (may have been) selected in the deleted row.
         */
        onRowDeleted: function () {
            this.onCodeChanged(null);
        },

        /*
         * Called when a datasheet row selection changes
         * We are currently not hooked into that event
         */
        onSelectedRowChanged: function (row) {
        }

    });

});