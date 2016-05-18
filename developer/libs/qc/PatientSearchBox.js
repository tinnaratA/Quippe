define([
    "dijit/_base/popup",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/TextBox",
    "dijit/form/ValidationTextBox",
    "dijit/layout/ContentPane",
    "dijit/popup",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/query",
    "dojo/text!qc/templates/PatientSearchBox.htm",
    "qc/_core",
    "dojo/keys",
    "qc/_EnumManager",
    "qc/DateUtil"
], function (dijit_basePopup, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, TextBox, ValidationTextBox, ContentPane, popup, array, declare, event, lang, domClass, domConstruct, on, query, PatientSearchBoxTemplate, core, keys, EnumManager, DateUtil) {
    return declare("qc.PatientSearchBox", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        query: null,
        _searchDef: null,
        _fullDef: null,
        _isOpen: false,
        maxFullResults: 50,
        maxPartialResults: 15,
        minQueryLength: 0,
        autoFinalize: true,
        autoFinalizeDelay: 3000,
        selectedPatientId: null,
        isRequired: false,

        templateString: PatientSearchBoxTemplate,

        startup: function () {
            if (!this._started) {
                this.txtSearch.required = this.isRequired;
                on(this.txtSearch, "KeyUp", lang.hitch(this, this.onSearchKeyUp));
                on(this.resultsBox, "Click", lang.hitch(this, this.onResultClick));

                if (core.util.isTouchDevice()) {
                    on(this.resultsBox, "touchstart", lang.hitch(this, this.onResultClick));
                }

                this.inherited(arguments);
            }
        },

        onSearchKeyUp: function (evt) {
            var s = null;
            if (evt.keyCode == keys.ESCAPE) {
                this.hideResults();
                event.stop(evt);
            }
            else if (evt.keyCode == keys.DOWN_ARROW) {
                this.selectNextResult();
                event.stop(evt);
            }
            else if (evt.keyCode == keys.UP_ARROW) {
                this.selectPreviousResult();
                event.stop(evt);
            }
            else if (evt.keyCode == keys.TAB) {
                if (this._isOpen) {
                    s = query("tr.selected", this.tblResults)[0];
                    if (s) {
                        this.selectItem(s);
                    }
                    else if (this.tblResults.rows.length > 0) {
                        this.selectItem(this.tblResults.rows[0]);
                    }
                }
                else {
                    this.query = this.txtSearch.get("value");
                    this.doSearch();
                }
            }
            else if (evt.keyCode == keys.ENTER) {
                if (this._isOpen) {
                    s = query("tr.selected", this.tblResults)[0];
                    if (s) {
                        this.selectItem(s);
                    };
                }
                else {
                    this.query = this.txtSearch.get("value");
                    this.doSearch(false, true);
                }
            }
            else {
                var text = this.txtSearch.get("value");
                if (text == this.query && evt.keyCode != keys.ENTER) {
                    return;
                };
                this.cancelSearch();
                if (text) {
                    this.query = text;
                    this.doSearch(false);
                }
            }
        },


        doSearch: function (full, allowBlank) {
            var self = this;

            if (!this.query && !allowBlank) {
                return this.hideResults();
            }

            var maxResults = full ? this.maxFullResults : this.maxPartialResults;

            this.cancelSearch();

            self._searchDef = core.xhrGet({
                url: core.serviceURL('Quippe/PatientData/Patients'),
                content: { "Search": this.query, "MaxResults": maxResults, "Culture": core.settings.culture, "DataFormat": "JSON" },
                handleAs: "json",
                failOk: true,
                error: function (message) {
                    console.log(message);
                },
                load: function (data, ioArgs) {
                    var selId = '';
                    var selRow = query("tr.selected", this.tblResults)[0];
                    if (selRow) {
                        selId = selRow.children[0].innerHTML;
                    }
                    self.clearResults();
                    var table = self.tblResults;
                    var count = 0;
                    array.forEach(data.patients, function (item, i) {
                        var htm = '<tr class="' + ((count % 2 == 0) ? 'even' : 'odd') + (item.id == selId ? ' selected' : '') + '">';
                        htm += ('<td>' + item.id + '</td>');
                        htm += ('<td>' + item.lastName + '</td>');
                        htm += ('<td>' + item.firstName + '</td>');
                        htm += ('<td>' + self.formatBirthDate(item.birthDate) + '</td>');
                        htm += ('<td>' + self.formatSex(item.sex) + '</td>');
                        htm += '</tr>';
                        domConstruct.place(htm, table);
                        count += 1;
                    });

                    if (count >= maxResults && self.autoFinalize && !full && !self._finalDef) {
                        self._finalDef = setTimeout(function () { self.doSearch(true); }, self.autoFinalizeDelay);
                    }

                    if (count > 0) {
                        self.showResults();
                    }
                    else {
                        self.hideResults();
                    }

                }
            });
        },

        formatSex: function (value) {
            return EnumManager.getTextSynch('sex', value) || value;
        },

        formatBirthDate: function (value) {
            return DateUtil.formatJSONDate(value)
        },

        cancelSearch: function () {
            if (this._finalDef) {
                clearTimeout(this._finalDef);
                this._finalDef = null;
            };

            if (this._searchDef) {
                this._searchDef.cancel();
            };
        },

        clearResults: function () {
            query("tr", this.tblResults).forEach(domConstruct.destroy);
            this.onSelectionChanged();
        },

        showResults: function () {
            var self = this;
            if (!self.isOpen) {
                popup.open({
                    "parent": self,
                    "popup": self.resultsBox,
                    "around": self.domNode,
                    "onclose": function () { self.isOpen = false },
                    "onexecute": function () { self.isOpen = false }
                });
                self._isOpen = true;
            };
        },

        hideResults: function () {
            if (this._isOpen) {
                popup.close(this.resultsBox);
                this._isOpen = false;
            };
        },

        selectNextResult: function () {
            this.cancelSearch();
            if (this._isOpen) {
                var s = query("tr.selected", this.tblResults)[0];
                if (s) {
                    if (s.rowIndex < this.tblResults.rows.length) {
                        domClass.remove(s, "selected");
                        domClass.add(this.tblResults.rows[s.rowIndex + 1], "selected");
                    }
                }
                else {
                    s = this.tblResults.rows[0];
                    if (s) {
                        domClass.add(s, "selected");
                    }
                }
            }
        },

        selectPreviousResult: function () {
            this.cancelSearch();
            if (this._isOpen) {
                var s = query("tr.selected", this.tblResults)[0];
                if (s) {
                    if (s.rowIndex > 0) {
                        domClass.remove(s, "selected");
                        domClass.add(this.tblResults.rows[s.rowIndex - 1], "selected");
                    }
                };
            }
        },

        selectItem: function (row) {
            this.cancelSearch();
            domClass.remove(this.tblResults, "selected");
            domClass.add(row, "selected");
            this.hideResults();
            this.selectedPatientId = row.children[0].innerHTML;
            this.txtSearch.set("value", row.children[1].innerHTML + ', ' + row.children[2].innerHTML);
            this.onSelectionChanged();
        },

        onResultClick: function (evt) {
            event.stop(evt);
            this.cancelSearch();
            var row = null;
            switch (evt.target.tagName.toLowerCase()) {
                case 'td':
                    row = evt.target.parentNode;
                    break;
                case 'tr':
                    row = evt.target;
                    break;
                default:
                    row = null;
                    break;
            }

            if (row) {
                this.selectItem(row);
            }
        },

        onSelectionChanged: function () {
        }
    }
    );
});