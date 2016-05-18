define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
	"dijit/Dialog",
	"dijit/form/Button",
	"dijit/registry",
    "dojo/_base/array",
	"dojo/_base/lang",
    "dojo/_base/declare",
	"dojo/dom",
    "dojo/dom-style",
	"dojo/on",
    "dojo/query",
	"dojo/request/xhr",
    "qc/_core",
    "qc/StringUtil"
], function (_TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Dialog, Button, registry, array, lang, declare, dom, domStyle, on, query, xhr, core, StringUtil) {
    return declare("qc.serviceTester.RequestForm", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        owner: null,
        templateString: '<div><div data-dojo-attach-point="formNode"></div><div data-dojo-type="dijit/form/Button" data-dojo-attach-point="submitButton" data-dojo-attach-event="onClick:onSubmitRequest" style="display:none">Submit Request</div></div>',
        method: null,
        path: null,
        serviceInfo: null,
        requestUrl: null,
        chartData: null,
        sampleChart: '<Patient LastName="Doe" FirstName="John" BirthDate="1966-06-29T00:00:00" Sex="M">\n'
					 + '  <Encounters>\n'
					 + '    <Encounter EncounterTime="2010-04-01T14:45:00">\n'
					 + '      <Records>\n'
					 + '        <Record MedcinId="5" />\n'
					 + '        <Record MedcinId="10" />\n'
					 + '        <Record MedcinId="243" />\n'
					 + '      </Records>\n'
					 + '    </Encounter>\n'
					 + '   </Encounters>\n'
					 + '</Patient>\n',

        getParmValue: function(paramName, defaultValue) {
        	var e = dom.byId("QP_" + paramName);

			if (e) {
				if (e.type == 'select-multiple') {
					var s = '';
					for (var n = 0; n < e.childNodes.length; n++) {
						if (e.childNodes[n].selected) {
							s += s.length > 0 ? ' ' : '';
							s += e.childNodes[n].value;
						}
					}
					return s;
				}
				else {
					return e.value || defaultValue || '';
				}
			}
			return '';
		},

		loadResponseText: function(data) {
			dom.byId("responseContent").innerHTML = "<pre id='responseData'></pre>";
			dom.byId('responseData').innerText = data;
			dom.byId("responseURL").innerHTML = '<a href="' + this.requestUrl + '" target="QuippeWebServiceData">' + this.requestUrl + '</a>';
			registry.byId("tabContainer").selectChild("responseTab");
		},

		loadErrorResponse: function(ex) {
			var res = ex.responseText || ex || 'Error';
			this.loadResponseText(res);
		},

        onSubmitRequest: function() {
        	var baseUrl = core.serviceURL(this.serviceInfo.path.substring(1));
        	var queryString = '';
        	var formContent = {};

        	if (this.serviceInfo.parameters && this.serviceInfo.parameters.length > 0) {
        		for (var x = 0; x < this.serviceInfo.parameters.length; x++) {
        			var paramName = this.serviceInfo.parameters[x].name;
        			var value = this.getParmValue(paramName, this.serviceInfo.parameters[x].defaultValue);

        			if (value) {
        				switch (this.serviceInfo.parameters[x].source) {
        					case "Path":
        						baseUrl = baseUrl.replace("{" + paramName + "}", value);
        						break;
        					case "Query":
        						queryString += ((!queryString ? '?' : '&') + paramName + '=' + escape(value));
        						break;
        					case "Form":
        						formContent[paramName] = value;

        						//Save the chart xml for re-use in other service calls
        						if (this.serviceInfo.parameters[x].name === "Chart") {
        							this.chartData = value;
        						}
        						break;
        					default:
        						break;
        				}
        			}
        			else {
        				if (this.serviceInfo.parameters[x].required) {
        					this.showError("Parameter " + paramName + " is required");
        					return;
        				}
        			}
        		}
        	}

	        var requestData = {
		        data: formContent,
				method: this.method,
		        handleAs: "text",
		        preventCache: true
	        };

	        this.requestUrl = baseUrl + queryString;
	        xhr(this.requestUrl, requestData).then(lang.hitch(this, this.loadResponseText), lang.hitch(this, this.loadErrorResponse));
		},
    
        showService: function (path, method) {
            var self = this;
	        core.xhrGet({
		        url: core.serviceURL('Help'),
		        content: { "Resource": path, "Method": method, "DataFormat": "JSON" },
		        handleAs: "json",
		        load: function(data, ioArgs) {
			        if (data.error) {
				        core.showError(data.error);
			        } else if (data.resource) {
				        self.serviceInfo = data.resource;
				        self.method = method;
				        self.path = path;
				        self.buildForm(path, data.resource);
			        } else {
				        core.showError("Invalid response from server");
			        }

			        registry.byId("tabContainer").selectChild("requestTab");
		        },
		        error: core.showError
	        });
        },
    
        getValues: function () {
            var values = {};
            query('.reqform', this.domNode).forEach(function (e) {
                values[e.getAttribute('name')] = e.value;
            });
            return values;
        },
    
        buildForm: function (path, info) {
            var htm = '';
    
            htm += ('<h2>' + path + '</h2>');
            if (info.summary) {
                htm += ('<p>' + info.summary + '</p>');
            };
    
            htm += '<table class="requestTable">';
            array.forEach(['method', 'schemaId', 'rootElement'], function (propName) {
                if (info[propName]) {
                    htm += '<tr>';
                    htm += '<td class="bold">' + StringUtil.makeCaption(propName) + ':' + '</td>';
                    htm += '<td colspan="3">' + info[propName] + '</td>';
                    htm += '</tr>'
                };
            });
    
            htm += this.buildParmFields(array.filter(core.forceArray(info.parameters), function (p) { return p.required }), 'Required Parameters');
            htm += this.buildParmFields(array.filter(core.forceArray(info.parameters), function (p) { return !p.required }), 'Optional Parameters');
    
            htm += '</table>';
    
            this.formNode.innerHTML = htm;

			if (dom.byId("sampleChartLink")) {
				on(dom.byId("sampleChartLink"), "click", lang.hitch(this, this.loadSampleChart));
			}

            domStyle.set(this.submitButton.domNode, { display: 'block' });
        },

        loadSampleChart: function() {
        	var e = dom.byId("QP_Chart");

			if (e) {
				e.value = this.sampleChart;
			}
		},
    
        buildParmFields: function (parms, heading) {
            if (!parms || parms.length == 0) {
                return '';
            };
    
            var htm = '';
    
            htm += '<tr><td colspan="4" class="bold">' + heading + '</td></tr>';
            array.forEach(parms, function (item) {
                if (item.type == 'XmlDocument') {
                    htm += '<tr>';
                    htm += '<td colspan="4">';
                    htm += item.name + ':<br />';
                    htm += this.createInput(item);
                    htm += '<br />';
                    htm += '<a href="#" id="sampleChartLink">Load Sample Chart</a>';
                    htm += '</tr>';
                }
                else {
                    htm += '<tr>';
                    htm += '<td class="parmLabel">' + item.name + ':</td>';
                    htm += '<td>' + this.createInput(item) + '</td>';
                    htm += '<td>' + item.type + '</td>';
                    htm += '<td>' + (item.description || '') + '</td>';
                    htm += '</tr>';
                };
            }, this);
            return htm;
        },
    
        createInput: function (item) {
            var htm = '';
            if (item.type == 'XmlDocument') {
                htm += '<textarea class="reqform" id="QP_';
                htm += item.name;
                htm += '" cols="80" rows="10">';
                htm += '</textarea>';
            }
            else if (item.options) {
                htm += '<select class="reqform" id="QP_';
                htm += item.name;
                htm += '" ';
                htm += (item.multipleChoice ? 'multiple="true" size="5"' : '');
                htm += '>';
                if (!item.isRequired) {
                    htm += '<option value=""></option>';
                };
                var optList = core.forceArray(item.options.option || item.options);
                array.forEach(optList, function (opt) {
                    htm += '<option';
                    htm += ' value="' + opt.value + '"';
                    htm += (opt.value == item.defaultValue ? ' selected="selected"' : '');
                    htm += '>';
                    htm += (opt.name || opt.value);
                    htm += '</option>';
                });
                htm += '</select>';
            }
            else {
                htm += '<input class="reqform" id="QP_';
                htm += item.name;
                htm += '" ';
                htm += ' type="text"';
                htm += '/>';
            };
    
            return htm;
        },

		showError: function(message) {
			if (this.errorDialog == null) {
				this.errorDialog = new Dialog({ title: "Error" });
			}

			this.errorDialog.attr("content", message);
			this.errorDialog.show();
		}
    });
});