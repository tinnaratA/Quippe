define([
	"dijit/_TemplatedMixin",
	"dijit/_WidgetBase",
	"dijit/Dialog",
	"dijit/layout/BorderContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/TabContainer",
	"dijit/registry",
	"dijit/TitlePane",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/aspect",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/on",
	"dojo/query",
	"dojo/request",
	"dojo/text!qc/serviceTester/templates/ServiceTester.htm",
	"qc/_core",
	"qc/serviceTester/ResourceTree",
	"qc/XmlUtil",
	"qc/XmlWriter"
], function(_TemplatedMixin, _WidgetBase, Dialog, BorderContainer, ContentPane, TabContainer, registry, TitlePane, array, declare, lang, aspect, dom, domConstruct, on, query, request, ServiceTesterTemplate, core, ResourceTree, XmlUtil, XmlWriter) {
	return declare([], {
		hButtton: null,
		serviceInfo: null,
		chartData: '',
		//reqURL: '',

		sampleChart: ''
			+ '<Patient LastName="Doe" FirstName="John" BirthDate="1966-06-29T00:00:00" Sex="M">\n'
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

		initPage: function() {
			var navTree = new ResourceTree();
			domConstruct.place(navTree.domNode, 'navPane');
			navTree.startup();
			aspect.after(navTree, 'onSelectionChanged', lang.hitch(this, this.onTreeNodeSelected), true);
			on(dom.byId("responseURL"), 'click', lang.hitch(this, this.onResponseURLClick));
		},

		onTreeNodeSelected: function(treeNode) {
			if (treeNode && treeNode.data) {
				var resName = treeNode.data.name || '';
				var path = treeNode.data.path || '';
				var method = treeNode.data.method || '';
				if (path) {
					this.showResource(path, method);
				}
			};
		},

		buildRequestPage: function(path, data) {
			this.serviceInfo = data.documentElement;

			if (this.hButton != null) {
				core.disconnect(this.hButton);
			}

			var xRoot = data.documentElement;

			if (xRoot.tagName === "Error") {
				core.showError(xRoot.getAttribute("Message"));
			}

			var w = new XmlWriter({ indent: false });
			w.element("h1", null, path);
			var xSummary = XmlUtil.selectChildElement(xRoot, "Summary");
			//var xSummary = xRoot.selectSingleNode("Summary");
			if (xSummary) {
				w.element("p", null, xSummary.childNodes[0].nodeValue);
			}
			w.beginElement("table");
			array.forEach(["Method", "SchemaId", "RootElement"], function(attrName) {
				var attrValue = xRoot.getAttribute(attrName);
				if (attrValue) {
					w.beginElement("tr");
					w.element("td", { style: "font-weight:bold;" }, attrName + ':');
					w.element("td", null, attrValue);
					w.endElement();
				}
			});
			w.endElement();

			w.beginElement("form", { method: xRoot.getAttribute("Method"), target: 'QuippeWebServiceData', "class": "testForm" });

			w.beginElement("table", { "class": "requestTable" });
			var xParms = XmlUtil.selectChildElement(xRoot, "Parameters");

			this.createParmList(array.filter(XmlUtil.selectChildElements(xParms, "Parameter"), function(x) {
				return x.getAttribute('Required') == 'True'
			}), 'Required Parameters', w);

			this.createParmList(array.filter(XmlUtil.selectChildElements(xParms, "Parameter"), function (x) {
				return x.getAttribute('Required') != 'True'
			}), 'Optional Parameters', w);

			w.endElement();
			w.endElement();

			w.element("br");
			w.element("input", { type: "submit", value: "Submit Request", id: "cmdSubmit" });

			dom.byId("requestTab").innerHTML = w.toString();
			query(".sampleChartLink").on("click", lang.hitch(this, this.loadSampleChart));

			this.hButton = on(dom.byId("cmdSubmit"), "click", lang.hitch(this, this.onSubmitRequest));
		},

		showResource: function(path, method) {
			var req = {
				url: (core.serviceURL("Help")),
				content: { "Resource": path, "Method": method },
				handleAs: "xml",

				load: lang.hitch(this, function(data, ioargs) {
					this.buildRequestPage(path, data);
					this.showTab("requestTab");
				}),

				error: core.showError
			};
			core.xhrGet(req);
		},

		createParmList: function(nodelist, heading, w) {
			if (!nodelist || nodelist.length === 0) {
				return;
			}

			w.beginElement("tr");
			w.element("td", { colspan: "4", style: "font-size:100%;font-weight:bold;" }, heading);
			w.endElement()

			for (var n = 0; n < nodelist.length; n++) {
			    var node = nodelist[n];
			    var name = node.getAttribute("Name");
			    var inputId = "QP_" + name;
				var currentValue = this.currentParmValue(node);

				if (node.getAttribute("Type") === "XmlDocument" || (parseInt(node.getAttribute("MaxLength") || "0", 10) > 2000)) {
					w.beginElement("tr");
					w.element("td", { colspan: "3" }, (name + ":"));
					if (name === 'Chart') {
						w.beginElement("td", { style: "text-align:right;" });
						w.element("a", { href: "#", "class": "sampleChartLink" }, "Load Sample Chart");
						w.endElement();
					}
					w.endElement();
					w.beginElement("tr");
					w.beginElement("td", { colspan: "4" });
					w.beginElement("textarea", { name: name, wrap: "off", id: inputId, style: "height:300px;width:100%;" });
					if (this.chartData != null && this.chartData !== '') {
						w.text(this.chartData);
					}
					w.endElement(true);
					w.endElement();
					w.endElement();
				}
				else {
					w.beginElement("tr");
					w.element("td", null, (name + ":"));
					w.beginElement("td");
					var xOptionContainer = XmlUtil.selectChildElement(node, 'Options');
					var xOptions = XmlUtil.selectChildElements(xOptionContainer, 'Option');
					//var xOptions = node.selectNodes("Options/Option");
					if (xOptions && xOptions.length > 0) {
						w.beginElement("select")
						w.attribute("id", inputId);
						w.attribute("name", name);
						if (node.getAttribute("MultipleChoice")) {
							w.attribute("multiple", "true");
							w.attribute("size", "5");
						}
						if (node.getAttribute("IsRequired") != "True") {
							w.element("option", { value: "" });
						}
						for (var i = 0; i < xOptions.length; i++) {
							var xOpt = xOptions[i];
							w.beginElement("option");
							w.attribute("value", xOpt.getAttribute("Value"));
							if (xOpt.getAttribute("Value") == node.getAttribute("DefaultValue")) {
								w.attribute("selected", "true");
							}
							w.text(xOpt.getAttribute("Name") || xOpt.getAttribute("Value"));
							w.endElement();
						}
						w.endElement();
					}
					else {
                        if (node.getAttribute("SupportsSuffixes") == "true") {
                            w.beginElement("input");
                            w.attribute("name", "SUF_" + name);
                            w.attribute("type", "text");
                            w.attribute("id", "SUF_" + name);
                            w.attribute("class", "suffix");
                            w.endElement();
                        }

					    w.beginElement("input");
					    w.attribute("name", name);
						w.attribute("type", "text");
						w.attribute("id", inputId);
					    w.attribute("value", currentValue);
						w.endElement();
					}
					w.endElement();
					w.element("td", null, node.getAttribute("Type"));
					w.element("td", null, node.getAttribute("Description"));
					w.endElement();
				}
			}
		},

		loadSampleChart: function() {
			var e = dom.byId("QP_Chart");
			if (e) {
				e.value = this.sampleChart;
			}
		},

		onSubmitRequest: function () {
		    this.req = null;
		    var req = this.createRequest();
		    if (req) {
		        req["method"] = this.serviceInfo.getAttribute("Method");
		        this.req = req;
		        return request(req["url"], req).then(req["load"], req["error"]);
		    };
		},

		createRequest: function() {
			if (!this.serviceInfo) {
				return null;
			}

			var xParms = XmlUtil.selectChildElement(this.serviceInfo, 'Parameters');
			var xParm = XmlUtil.selectChildElements(xParms, 'Parameter');
			//var xParm = serviceInfo.selectNodes("Parameters/Parameter");
			var baseURL = core.serviceURL(this.serviceInfo.getAttribute("Path").substring(1));
			var queryString = '';
			var formContent = {};

			if (xParm && xParm.length > 0) {
				for (var x = 0; x < xParm.length; x++) {
					var parmName = xParm[x].getAttribute("Name");
					var value = this.getParmValue(parmName, xParm[x].getAttribute("DefaultValue"));
				    var suffix = "";

                    if (xParm[x].getAttribute("SupportsSuffixes") == "true") {
                        suffix = dom.byId("SUF_" + parmName).value;
                    }

					if (value) {
						switch (xParm[x].getAttribute("Source")) {
							case "Path":
								baseURL = baseURL.replace("{" + parmName + "}", value);
								break;
							case "Query":
								queryString += ((!queryString ? '?' : '&') + parmName + suffix + '=' + escape(value));
								break;
							case "Form":
								formContent[parmName + suffix] = value;

								//Save the chart xml for re-use in other service calls
								if (xParm[x].getAttribute("Name") === "Chart") {
									this.chartData = value;
								}
								break;
							default:
								break;
						}
					}
					else {
						if (xParm[x].getAttribute("Required") == 'True') {
							core.showError("Parameter " + parmName + " is required");
							return null;
						}
					}
				}
			}

			var req = {};
			req["url"] = baseURL + queryString;
			req["data"] = formContent;
			req["handleAs"] = "text";
			req["load"] = lang.hitch(this, this.loadResponseText);
			req["error"] = lang.hitch(this, this.loadErrorResponse);
			//req["error"] = showError;
			req["preventCache"] = true;
			return req;
		},

		currentParmValue: function(node) {
			if (!node) {
				return '';
			}

			var parmName = node.getAttribute("Name");
			var defaultValue = node.getAttribute("DefaultValue");
			var value = this.getParmValue(parmName, defaultValue);
			if (value == null || value === '') {
				return defaultValue;
			}
			else {
				return value;
			}
		},

		getParmValue: function(parmName, defaultValue) {
			var e = dom.byId("QP_" + parmName);
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
			this.setElementText('responseData', data);
			var responseURL = dom.byId("responseURL");
			responseURL.innerHTML = this.req.url;
			responseURL.setAttribute('title', this.req.url);
			this.showTab("responseTab");
		},

		loadErrorResponse: function(ex) {
			var res = ex.responseText || ex || 'Error';
			this.loadResponseText(res);
			//dojo.byId("responseContent").innerHTML = res;
			//dojo.byId("responseURL").innerHTML = reqURL;
			//showTab("responseTab");
		},

		setElementText: function(id, text) {
			var e = dom.byId(id);
			if (e) {
				if (typeof (e.textContent) == 'undefined') {
					e.innerText = text;
				}
				else {
					e.textContent = text;
				}
			}
		},

		showTab: function(id) {
			var tbc = registry.byId("contentPane");
			var tp = registry.byId(id);
			if (tbc && tp) {
				tbc.selectChild(tp);
			}
		},

		onResponseURLClick: function (evt) {
		    if (this.req.method == 'POST') {
		        var form = query('.testForm')[0];
		        form.action = this.req.url;
		        form.submit();
		    }
		    else {
		        window.open(this.req.url, 'QuippeWebServiceData')
		    };
		}
	});
});