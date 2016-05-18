define([
    "qc/MenuItem",
    "dijit/MenuSeparator",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/event",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/json",
	"dojo/keys",
    "dojo/on",
    "dojo/query",
    "dojo/request",
    "dojo/topic",
    "dojo/when",
    "qc/_core",
    "qc/design/LayoutBuilder",
    "qc/design/ToolbarBuilder",
    "qc/Dialog",
	"qc/lang/qscript/Host",
    "qc/lang/qscript/Compiler",
    "qc/Resizer"
], function (MenuItem, MenuSeparator, registry, array, declare, event, lang, domClass, domConstruct, domStyle, json, keys, on, query, request, topic, when, core, LayoutBuilder, ToolbarBuilder, Dialog, Host, Compiler, Resizer) {

    return declare("qx.ScriptDebuggerDialog", [Dialog], {
        title: 'Script Debugger',
    	toolbar: null,
    	inputBox: null,
    	outputBox: null,
    
    	startup: function () {
    		if (!this._started) {
    			this.buildLayout();
    			this.inherited(arguments);
    		};
    	},
    
    	buildLayout: function () {
    		this.events = [];
    		domStyle.set(this.domNode, { fontSize: '12px' });
    
    		this.inputBox = domConstruct.create('textarea');
    		domStyle.set(this.inputBox, { fontFamily: 'Consolas,Monospace', fontSize: '10pt', border: '0px', width: '98%', height: '95%', tabSize: 2, resize: 'none' });
    		this.events.push(on(this.inputBox, "keypress", lang.hitch(this, this.onKeyDown)));
    
    		this.outputBox = domConstruct.create('textarea');
    		domStyle.set(this.outputBox, { fontFamily: 'Consolas,Monospace', fontSize: '10pt', border: '0px', width: '100%', height: '100%', resize: 'none' });
    
    		this.toolbar = ToolbarBuilder.buildToolbar({
    			tbExec: { label: 'Exec Javascript', onClick: lang.hitch(this, this.execute) },
    			sep1: {},
    			tbParseExp: { label: 'Parse Expression', onClick: lang.hitch(this, this.parseExpression) },
    			tbExecExp: { label: 'Exec Expression', onClick: lang.hitch(this, this.execExpression) },
    			sep2: {},
    			tbClearOutput: { label: 'Clear Output', onClick: lang.hitch(this, this.clearOutput) }
    		});
    
    		domStyle.set(this.containerNode, { width: '600px', height: '400px' });
    		var layout = {
    			gutters: false, style: { width: '100%', height: '100%', margin: '0px', padding: '0px' },
    			top: { height: '30px', splitter: false, content: this.toolbar },
    			center: {
    				gutters: true,
    				center: { content: this.inputBox, style: { margin: '0px', padding: '8px' } },
    				bottom: { height: '30%', splitter: true, content: this.outputBox, style: { margin: '0px', padding: '8px', overflow: 'hidden' } }
    			}
    		};
    
    		domStyle.set(this.containerNode, { margin: '0px', padding: '0px', position: 'relative' });
    		var layoutPanel = LayoutBuilder.buildLayout(layout);
    		layoutPanel.placeAt(this.containerNode);
    		layoutPanel.startup();

   		
    		var resizer = new Resizer({
    		    ownerNode: this.containerNode, enabled: true, resizeCallback: lang.hitch(this, function (w, h) {
    		        domStyle.set(this.containerNode, { width: w + 'px', height: h + 'px' });
    		        layoutPanel.resize();
    		    })
    		});
    	},
    
    	onKeyDown: function (evt) {
    		if (evt.keyCode == keys.TAB) {
    			event.stop(evt);
    			if (evt.shiftKey) {
    				this.backTab(evt.target);
    			}
    			else {
    				this.insertTab(evt.target);
    			};
    		};
    	},
    
    	insertTab: function (textArea) {
    		var start = textArea.selectionStart;
    		var end = textArea.selectionEnd;
    		var text = textArea.value;
    		textArea.value = text.substr(0, start) + '\t' + text.substr(end);
    		textArea.selectionStart = textArea.selectionEnd = start + 1;
    	},
    
    	backTab: function (textArea) {
    		var start = textArea.selectionStart;
    		var end = textArea.selectionEnd;
    		var text = textArea.value;
    		if (text.substr(start - 2, 2).match(/\s\s/)) {
    			textArea.value = text.substr(0, start - 1) + text.substr(end);
    			textArea.selectionStart = textArea.selectionEnd = start - 1;
    		};
    	},
    
    	clearOutput: function () {
    		this.outputBox.value = '';
    	},
    
    	writeLine: function (text) {
    		this.write(text + '\n');
    	},
    
    	write: function (text) {
    		this.outputBox.value += text;
    	},
    
    	writeData: function (data, isFinal) {
    	    if (data === undefined) {
    	        this.writeLine('undefined');
    	    }
    	    else if (data === null) {
    	        this.writeLine('null');
    	    }
    		else if (typeof data == 'object') {
    			if (data.promise && !isFinal) {
    				var self = this;
    				when(data, function (x) { self.writeData(x, true) });
    			}
    			else {
    			    var filter = function () {
    			        var visited = [];
    			        return function (key, value) {
    			            if (typeof value == 'object') {
    			                if (visited.indexOf(value) >= 0) {
    			                    return value === null ? 'null' : value.toString();
    			                }
    			                else {
    			                    visited.push(value);
    			                    return value;
    			                }
    			            }
    			            else {
    			                return value;
    			            }
    			        }
    			    }
    				this.writeLine(json.stringify(data, filter(), '  '));
    			}
    		}
    		else {
    			this.writeLine(data);
    		};
    	},
    
    	execute: function () {
    		var code = this.inputBox.value;
    
    		if (!code) {
    			return;
    		};

    		var script = 'var output = this;';
    		script += 'var lang = require("dojo/_base/lang");';
    		script += 'var core = require("qc/_core");';
    		script += 'var write = lang.hitch(this, this.write);';
    		script += 'var writeLine = lang.hitch(this, this.writeLine);';
    		script += 'var clear = lang.hitch(this, this.clearOutput);';
    		script += 'var editor = core.getNoteEditor();';
    		script += 'var note = editor ? editor.note : null;';
    		script += code;
    
    	    try {
    	        var self = this;
    	        var fn = function () { return eval(script) };
    	        when(fn.call(this), function (result) {
    	            if (result != undefined) {
    	                self.writeData(result);
    	            };
    	        });
    		}
    		catch (ex) {
    			this.writeLine(ex);
    		};
    	},
    
    	parseExpression: function () {
    		if (!Compiler) {
    			this.writeLine('Expression Compiler not loaded');
    			return null;
    		};
    
    		var script = this.inputBox.value;
    
    		if (!script) {
    			return;
    		};
    
    		this.clearOutput();
    		var result = Compiler.compile(script, { supportsAssignment: true, stripNewlines: true });
    		if (result.success) {
    			this.writeLine(result.targetScript);
    		}
    		else {
    			this.writeLine(result.error);
    		}
    
    		return result;
    	},
    
    	execExpression: function () {
    		if (!Compiler) {
    			this.writeLine('Expression Compiler not loaded');
    			return null;
    		};
    
    		var script = this.inputBox.value;
    
    		if (!script) {
    			return;
    		};
    
    		this.clearOutput();
    		var parseResult = Compiler.compile(script, { supportsAssignment: true, stripNewlines: true });
    		if (!parseResult.success) {
    			this.writeLine(parseResult.error);
    			return;
    		};
    
    		var context = {};
    		for (var refName in parseResult.references) {
    			switch (refName) {
    				case 'Owner':
    					break;
    				case 'Patient':
    					if (core.Patient) {
    						context.Patient = core.Patient;
    					}
    					else {
    						this.writeLine("No patient loaded");
    						return;
    					};
    					break;
    				case 'Encounter':
    					if (core.Encounter) {
    						context.Encounter = core.Encounter;
    					}
    					else {
    						this.writeLine("No current encounter");
    						return;
    					};
    					break;
    				case 'Provider':
    					context.Provider = core.Provider || {};
    					break;
    
    				default:
    					var e = query('.noteElement[data-name="' + refName + '"]').map(registry.byNode)[0];
    					if (e) {
    					    //if (domClass.contains(e.domNode, 'finding')) {
    					    //    context[refName] = e;
    					    //}
    					    //else {
    					    //    context[refName] = query('.finding', e.domNode).map(registry.byNode);
    					    //};

    					    if (domClass.contains(e.domNode, 'part')) {
    					        context[refName] = query('.finding', e.domNode).map(registry.byNode);
    					        context[refName].isGroup = true;
    					    }
    					    else {
    					        context[refName] = e;
    					    };
    					}
    					else {
    					    //this.writeLine("Can't find referenced element: " + refName);
    					    //return;
    					};
    					break;
    			};
    
    		};
    
    		var result = parseResult.targetFunction.call(Host, context);
    		this.writeData(result);
    	}
    });
});