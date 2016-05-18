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
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    "dojo/when",
    "qc/_core",
    "qc/design/LayoutBuilder",
    "qc/design/ToolbarBuilder",
    "qc/Dialog",
	"qx/ScriptDebuggerDialog",
    "qc/XmlEditorPane"
], function (MenuItem, MenuSeparator, registry, array, declare, event, lang, domClass, domConstruct, domStyle, json, on, query, topic, when, core, LayoutBuilder, ToolbarBuilder, Dialog, ScriptDebuggerDialog, XmlEditorPane) {
    var DebugUtil = declare("qx.DebugUtil", [], {
        logItems: [],
        counters: {},
        baseTime: null,
    
        constructor: function () {
            var hLoad = topic.subscribe('/qc/DocumentLoaded', function () {
                core.unsubscribe(hLoad);
                if (core.app && core.app.toolbar) {
                    var toolsButton = array.filter(core.app.toolbar.getChildren(), function (x) { return x.get('label') == 'Tools' })[0];
                    if (toolsButton && toolsButton.dropDown) {
                        toolsButton.dropDown.addChild(new MenuSeparator());
    
                        toolsButton.dropDown.addChild(new MenuItem({
                            label: 'Script Debugger',
                            showLabel: true,
                            onClick: function () { core.doDialog(ScriptDebuggerDialog, { 'class': 'nonModal' }) }
                        }));

                    };
                };
            });
        },
    
        resetTimer: function (baseTime) {
            this.logItems = [];
            this.baseTime = baseTime || new Date().valueOf();
        },
    
        logStart: function (text) {
            var now = new Date().valueOf();
    
            if (this.baseTime == null) {
                this.resetTimer(now);
            };
    
            this.logItems.push({ text: text, time: now });
            this._logInfo('beg:' + text, this.logItems.length - 1, now - this.baseTime);
        },
    
        markStart: function (text) {
            var now = new Date().valueOf();
    
            if (this.baseTime == null) {
                this.resetTimer(now);
            };
    
            this.logItems.push({ text: text, time: now });
        },
    
        logEnd: function () {
            var now = new Date().valueOf();
    
            if (!this.logItems || this.logItems.length == 0) {
                return;
            };
    
            var item = this.logItems.pop();
            this._logInfo('end:' + item.text, this.logItems.length, now - this.baseTime, now - item.time);
        },
    
        logEvent: function (text) {
            var now = new Date().valueOf();
            this._logInfo(text, this.logItems.length, now - this.baseTime);
        },
    
        _logInfo: function (text, level, start, duration) {
            level = level || 0;
            var message = '';
            for (n = 0; n < level; n++) {
                message += '  ';
            };
            message += text || '';
            for (n = 60, len = message.length; n > len; n--) {
                message += ' ';
            };
            message += start == undefined ? '' : '\t' + start;
            message += duration == undefined ? '' : '\t' + duration;
    
            console.info(message);
        },
    
        clearCounters: function () {
            this.counters = {};
        },
    
        logCounters: function () {
            if (!this.counters) {
                console.info('Counter list is empty');
            };
    
            var lineCount = 0;
            for (var key in this.counters) {
                console.info(key + ':' + this.counters[key]);
                lineCount++;
            };
    
            return lineCount;
        },
    
        addCounter: function (key) {
            if (!this.counters) {
                this.counters = {};
            };
            if (this.counters[key]) {
                this.counters[key]++;
            }
            else {
                this.counters[key] = 1;
            };
        },
    
        countMe: function (args) {
            this.addCounter(args.callee.nom || 'anon');
        },
    
        showScriptDebugger: function () {
            core.doDialog(ScriptDebuggerDialog, { 'class': 'nonModal' });
        },

        timedContentLoad: function (item) {
            var tStart = new Date().valueOf();
            if (!item || !item.id) {
                console.log('timedContentLoad requires an object parameter like {id:string, type:string}');
                return;
            };

            var h = topic.subscribe('/qc/ContentLoaded', function () {
                h.remove();
                var time = new Date().valueOf() - tStart;
                console.log(time + ' ms to load content');
            });

            if (item.type == 'form') {
                var hShown = topic.subscribe('/qc/FormOpened', function () {
                    hShown.remove();
                    var time = new Date().valueOf() - tStart;
                    console.log(time + ' ms to show dialog');
                });
            };

            topic.publish('/qc/AddToNote', item);
            return 'Loading ' + (item.text || item.id);
        },

        timedTemplateLoad: function (patientId, templateId, encounterTime) {
            if (!patientId) {
                return 'Must supply a patient id';
            };
            var eTime = encounterTime ? new Date(eTime) : new Date();
            var settings = {
                patientId: patientId,
                encounter: {encounterTime: eTime}
            };
            if (templateId) {
                settings.noteTemplate  = templateId;
            };

            var tStart = new Date().valueOf();
            var h = topic.subscribe('/qc/DocumentLoaded', function () {
                h.remove();
                var time = new Date().valueOf() - tStart;
                console.log(time + ' ms to load document');
            });
            topic.publish('/qc/NewEncounter', settings);
            return 'Starting new encounter';
        }
    
    });

    var singleton = new DebugUtil();
    lang.setObject("qx.DebugUtil", singleton);

	return singleton;
});