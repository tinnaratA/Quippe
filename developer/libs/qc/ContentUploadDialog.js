// note that dijit/form/Button is required by the template

define([
    "qc/Dialog",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request/iframe",
    "dojo/on",
    "dojo/text!qc/templates/ContentUploadDialog.htm",
    "qc/_core",
    "dijit/form/ComboBox",
    "qc/SettingsEnumStore",
    "dojo/request",
    "qc/StringUtil",
    "qc/_EnumManager",
    "qc/FilteringSelect",
    "dojo/when",
    "qc/XmlUtil",
    "dojo/Deferred"
], function (qcDialog, _WidgetsInTemplateMixin, Button, array, declare, lang, iframe, on, ContentUploadDialogTemplate, core, ComboBox, SettingsEnumStore, request, StringUtil, EnumManager, FilteringSelect, when, XmlUtil, Deferred) {
    return declare("qc.ContentUploadDialog", [qcDialog, _WidgetsInTemplateMixin], {
        itemType: '',
        parentId: '',
        contentBuilt: false,
        title: "Upload Content",

        templateString: ContentUploadDialogTemplate,
        events: [],
        itemTypes: null,

        startup: function () {
            if (!this._started) {
                core.htmlI18n(this, "name");
                core.htmlI18n(this, "filename");
                core.htmlI18n(this, "keywords");
                this.set("title", core.getI18n("uploadcontent"));

                this.events = [
                    on(this.cmdUpload, "click", lang.hitch(this, this.onUploadClick)),
                    on(this.cmdCancel, "click", lang.hitch(this, this.onCancelClick)),
                    on(this.fileName, "change", lang.hitch(this, this.onFileNameChanged)),
                    on(this.itemName, "change", lang.hitch(this, this.onItemNameChanged))
                ];

                var itemTypeStore = new SettingsEnumStore(lang.hitch(this, this.getItemTypes));
                itemTypeStore.loadData();
                this.cmbItemTypes.set('searchAttr', 'text')
                this.cmbItemTypes.set('store', itemTypeStore)
                this.inherited(arguments);
            }
        },

        destroyRecursive: function () {
            array.forEach(this.events || [], core.disconnect);
            this.inherited(arguments);
        },

        _getParentIdAttr: function () {
            return this.parentIdField.value;
        },
        _setParentIdAttr: function (value) {
            this.parentIdField.value = value;
        },

        onUploadClick: function (evt) {
            if (!(this.fileName.value && this.itemName.value)) {
                return;
            };

            var self = this;
            request(core.serviceURL('Quippe/ContentLibrary/Info'), {
                query: { parentId: self.parentIdField.value, name: self.itemName.value, dataFormat: 'JSON' },
                handleAs: 'json',
                preventCache: true
            }).then(function (data) {
                if (data.item && data.item.id) {
                    core.confirm({
                        title: 'Content Library Upload', message: 'An item with the name "' + self.itemName.value + '" already exists in the content library. Do you want to replace it?', yesCallback: lang.hitch(self, function () {
                            self.replaceExistingField.value = true;
                            self.doUpload()
                        })
                    });
                }
                else {
                    self.doUpload();
                }

            });
        },

        doUpload: function () {
            var self = this;
            iframe.post(core.serviceURL('Quippe/ContentLibrary/Import'), {
                form: this.uploadForm,
                handleAs: "xml"
            }).then(function (data) {
                if (data.documentElement.tagName == 'Error') {
                    core.showError(data.documentElement.getAttribute("Message"));
                }
                else {
                    self.onExecute();
                }
            }, function (err) {
                core.showError(err);
            });
        },

        onFileNameChanged: function (evt) {
            var file = evt.target.files[0];
            if (file) {
                var p = file.name.lastIndexOf('.');
                this.itemName.value = p > 0 ? file.name.substr(0, p) : file.name;
                this.itemName.autoValue = this.itemName.value;
                this.setContentType(file);
            };
            this.checkState();
        },

        onItemNameChanged: function (evt) {
            this.checkState();
        },

        getItemTypes: function () {
            if (!EnumManager.data[core.settings.culture]) {
                EnumManager.data[core.settings.culture] = {};
            };
            var list = EnumManager.data[core.settings.culture]['ContentLibraryTypes'];
            if (list) {
                return this.filterItemTypes(list);
            }
            else {
                var self = this;
                return request(core.serviceURL('Quippe/ContentLibrary/Types'), {
                    query: { "DataFormat": "JSON" },
                    handleAs: 'json'
                }).then(function (data) {
                     var list = array.filter(data.types || [], function (x) { return x.mimeType ? true : false; }).map(function (y) {
                        var id = y.typeName;
                        var text = StringUtil.makeCaption(id);
                        var mimePattern = y.mimeType;
                        switch (id) {
                            case "element":
                                text = "Note Content";
                                break;
                            case "image":
                                mimePattern = "^image"
                                break;
                            case "extension":
                                mimePattern = "javascript"
                                break;
                            case "macro":
                                text = "Text Macro";
                                break;
                            case "udf":
                                text = "UDF";
                                break;
                            default:
                                break;
                        };
                        return { id: id, text: text, mimePattern: mimePattern };
                     });
                     list.push({ id: 'textlist', text: 'List', mimePattern: 'text/plain' });
                     EnumManager.data[core.settings.culture]['ContentLibraryTypes'] = list;
                     return self.filterItemTypes(list);
                });
            };

        },

        filterItemTypes: function(typeList) {
            var file = this.fileName.files[0];
            if (!file || !file.type) {
                return typeList;
            }
            else {
                var list = array.filter(typeList, function (x) {
                    return file.type.match(x.mimePattern);
                });
                return list;
            }
        },

        setContentType: function(file) {
            var listBox = this.cmbItemTypes;
            var validTypes = this.getItemTypes();
            if (validTypes.length == 0) {
                listBox.set('value', '');
            }
            else if (validTypes.length == 1) {
                listBox.set('value', validTypes[0].id);
            }
            else if (file.type == 'text/xml') {
                this.setContentTypeFromXml(file, listBox);
            }
            else if (file.type == 'text/html') {
                this.setContentTypeFromHtml(file, listBox);
            }
            else if (file.type == 'text/plain') {
                this.setContentTypeFromText(file, listBox);
            }
            else if (file.type.match('javascript')) {
                listBox.set('value', 'extension');
            };
        },

        setContentTypeFromXml: function (file, listBox) {
            var reader = new FileReader();
            reader.onload = function (evt) {
                var doc = XmlUtil.createDocument(reader.result)
                switch (doc.documentElement.tagName.toLowerCase()) {
                    case 'document':
                        listBox.set('value', 'template');
                        break;
                    case 'content':
                        listBox.set('value', 'element');
                        break;
                    case 'list':
                        listBox.set('value', 'list');
                        break;
                    case 'form':
                        listBox.set('value', 'form');
                        break;
                    case 'freetext':
                        listBox.set('value', 'macro')
                        break;
                    default:
                        break;
                };
            };
            reader.readAsText(file);
        },

        setContentTypeFromHtml: function (file, listBox) {
            var reader = new FileReader();
            reader.onload = function (evt) {
                var text = reader.result;
                var exp = /meta\s+name="quippeContentType"\s+content="([^"]*)"/i;
                var m = exp.exec(text);
                if (m && m.length > 0) {
                    listBox.set('value', m[1]);
                };
            };
            reader.readAsText(file);
        },

        setContentTypeFromText: function (file, listBox) {
            var reader = new FileReader();
            reader.onload = function (evt) {
                var type = '';
                var text = reader.result;
                if (/^\s*("MedcinList-V1\.2|#MedcinIdList)/) {
                    listBox.set('value', 'list');
                };
            };
            reader.readAsText(file);
        },

        checkState: function () {
            this.cmdUpload.set('disabled', !(this.fileName.value && this.itemName.value));
        }

    });
});