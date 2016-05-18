/* DO NOT ATTEMPT TO INSTANTIATE - _core is a singleton - note the absence of return declare("qc._core", ) */

define([
    "dojo/query",
    "dojo/dom-geometry",
    "dojo/sniff",
    "dojo/dom",
    "dojo/NodeList-dom",
    "dojo/dom-class",
    "dojo/_base/array",
    "dojo/_base/fx",
    "dojo/topic",
    "dojo/on",
    "dojo/when",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/Deferred",
    "dijit/registry",
    "dijit/Dialog",
    "dijit/form/Button",
	"dojo/request",
	"dojo/i18n!qc/nls/strings",
	"dojo/aspect",
    "qc/_ArrayUtil"
], function (query, geometry, has, dom, NodeList, domClass, array, baseFx, topic, on, when, domConstruct, domGeometry, lang, domStyle, Deferred, registry, Dialog, Button, request, strings, aspect, _ArrayUtil) {

    var core = {
        app: {},

        settings: {
            appTitle: "Quippe",
            baseServiceURL: "ws.aspx",
            loginPage: "Login.htm",
            culture: "en-US",
            defaultNoteTemplate: "shared:QUIPPESTANDARD",
            defaultSepStyle: "semicolon",
            sepStyle: "semicolon",
            features: {
                patientSummary: true,
                lookback: true,
                drawing: true
            },
            elementInspectorClass: null,
            designToolboxClass: null,
            noteElementClasses: new Object(),
            searchBoxClass: null
        },

        Patient: {
            id: null,
            lastName: '',
            firstName: '',
            birthDate: null,
            sex: 'U',
            sexLabel: '',
            ageLabel: ''
        },

        Encounter: {
            id: null,
            encounterTime: new Date()
        },

        Provider: {},

        getNoteEditor: function() {
            return query('.qcNoteEditor').map(registry.byNode)[0] || null;
        },

        getNoteElementByName: function(name) {
            var editor = this.getNoteEditor();
            return editor && editor.note ? editor.note.getElementByName(name) : null;
        },

        nodeId: function () {
            var id = "ct";
            for (var n = 0; n < arguments.length; n++) {
                id = id + "_" + this.createClassName(arguments[n].toString());
            };
            return id;
        },

        serviceURL: function (path) {
            //console.log('==== serviceURL ====');
            //console.log(this.settings.baseServiceURL + '/' + path);
            return this.settings.baseServiceURL + '/' + path;
        },

        isNativeCode: function (value) {
            return value && /\[native code\]/gi.test(value.toString());
        },

        getResultRoot: function (xmlData, suppressErrorMessage) {
            if (!xmlData || !xmlData.documentElement) {
                if (!suppressErrorMessage) {
                    this.showError("Invalid XML document");
                }
                return null;
            };

            if (xmlData.documentElement.tagName === "Error") {
                if (!suppressErrorMessage) {
                    this.showError(xmlData.documentElement.getAttribute("Message"));
                }
                return null;
            };

            return xmlData.documentElement;
        },

        createClassName: function (value) {
            if (value) {
                if (typeof (value) == 'string') {
                    var re = /\s|\.|\:|\//g;
                    return value.replace(re, "_");
                }
                else {
                    return 'itemClass_' + value.toString();
                }
            }
            else {
                return '';
            };
        },

        getIcon: function (key) {
            return key && this.app && this.app.iconMap ? this.app.iconMap[key.toLowerCase()] || key : key;
        },

        getI18n: function (name, parms) {
            var text = strings[name];
            if (parms && parms.length > 0) {
                for (var n = 0, len = parms.length; n < len; n++) {
                    text = text.replace('\{' + n + '\}', parms[n]);
                };
            };
            return text;
        },

        htmlI18n: function (self, name, parms) { //for use when a dojoAttachPoint has the same name as the appropriate i18n phrase
            self[name].innerHTML = this.getI18n(name, parms);
        },

        labelI18n: function (self, name, parms) { //for use when a dojoAttachPoint has the same name as the appropriate i18n phrase
            self[name].set("label", this.getI18n(name, parms));
        },

        titleI18n: function (self, name, parms) { //for use when a dojoAttachPoint has the same name as the appropriate i18n phrase
            self[name].set("title", this.getI18n(name, parms));
        },

        getItemIcon: function (item, topTermTypesOnly) {
            var itemType = "";
            if (typeof item === "string") {
                itemType = item;
            }
            else {
                itemType = item.type || "";
            };

            var key = item.icon || '';
            if (!key) {
                switch (itemType) {
                    case 'finding':
                    case 'term':
                        if (item.termType && !topTermTypesOnly) {
                            key = "termType" + this.TermTypeInfo.fromTermType(item.termType).abbreviation;
                        }
                        else if (item.nodeKey) {
                            if (item.nodeKey.length < 3 || !topTermTypesOnly) {
                                key = "termType" + this.TermTypeInfo.fromNodeKey(item.nodeKey).abbreviation;
                            }
                            else {
                                key = "";
                            }
                        }
                        else if (item.group) {
                            key = "termType" + item.group.substr(0, 1).toUpperCase() + "x";
                        }
                        else {
                            key = "";
                        }
                        break;
                    case "list":
                        key = item.listType ? 'list_' + item.listType : 'list';
                        break;
                    default:
                        key = itemType;
                        break;
                };
            };
            return key ? this.getIcon(key) : '';
        },

        findingToItem: function (finding) {
            var item = {};
            item.id = finding.medcinId;
            item.medcinId = finding.medcinId;
            item.nodeKey = finding.nodeKey || "";
            item.type = 'term';
            item.prefix = finding.prefix || "";
            item.result = finding.result || "";
            item.status = finding.status || "";
            item.modifier = finding.modifier || "";
            item.value = finding.value || "";
            item.unit = finding.unit || "";
            item.text = finding.text || this.Transcriber.transcribeFinding(finding).then(function () { return finding.text });
            if (finding.domNode) item.node = finding.domNode;
            return item;
        },

        parseList: function (listNode) {
            var list = {};
            list.id = listNode.getAttribute("id");
            list.className = this.createClassName(list.id);
            list.text = listNode.getAttribute("Text") || listNode.getAttribute("Caption");
            list.type = "list";
            list.listType = listNode.getAttribute("ListType") || listNode.getAttribute("Type") || "";
            list.icon = listNode.getAttribute("icon") || "document";
            list.terms = [];

            query("Term,Finding,Item", listNode).forEach(function (item, i) {
                list.push(this.nodeToItem(item));
            });
            return list;
        },

        nodeToItem: function (node) {
            var item = {};
            item.id = node.getAttribute("id") || node.getAttribute("MedcinId");
            item.type = node.getAttribute("Type") || "unknown";
            item.text = node.getAttribute("Text") || node.getAttribute("Caption");
            item.icon = node.getAttribute("Icon") || this.getItemIcon(item);
            if (item.type === "term") {
                item.termType = node.getAttribute("TermType") || undefined;
                item.nodeKey = node.getAttribute("NodeKey") || undefined;
                item.flags = node.getAttribute("Flags") || undefined;
                item.prefix = node.getAttribute("Prefix") || undefined;
                item.note = node.getAttribute("Note") || node.getAttribute("Notation") || undefined;
            }
            item.sourceNode = node;
            return item;
        },

        toParmObject: function (item) {
            var parm = {};
            for (var p in item) {
                if (p != "id") {
                    parm[p] = item[p];
                }
            }
            return parm;
        },

        forceArray: function (value) {
            if (!value) {
                return [];
            }
            else if (value instanceof Array) {
                return value;
            }
            else {
                return [value];
            };
        },

        contentPosition: function (node) {
            var pos = geometry.position(node);
            var box = geometry.getContentBox(node);
            return { "x": (pos.x + box.l), "y": (pos.y + box.t), "w": box.w, "h": box.h };
        },

        rectPointCompare: function (rect, point) {
            if (point.x < rect.x) {
                return -1;          //point outside, before rect
            }
            else if (point.x > (rect.x + rect.w)) {
                return 1;           //point outside, after rect
            }
            else if (point.y < rect.y) {
                return -1;          //point outside, before rect
            }
            else if (point.y > (rect.y + rect.h)) {
                return 1;           //point outside, after rect
            }
            else if (point.x < (rect.x + (rect.w / 2))) {
                return -0.5;        //point inside, before rect
            }
            else {
                return .5;          //pont inside, after rect
            }
        },

        setSelectable: function (node, value) {
            if (has("mozilla")) {
                node.style.MozUserSelect = value ? "text" : "-moz-none";
            }
            else if (has("opera")) {
                var v = (node.unselectable = value ? "" : "on");
                query("*", node).forEach("item.unselectable = '" + v + "'");
            }
            else {
                dom.setSelectable(node, value);
            }
        },

        closestNode: function (fromNode, query) {
            return new NodeList(fromNode).closest(query)[0] || null;
        },

        closestWidget: function (fromNode, query) {
            var node = this.closestNode(fromNode, query);
            if (node) {
                return registry.byNode(node) || null;
            }
            else {
                return null;
            };
        },

        childElementNodes: function (parentNode) {
            return parentNode && parentNode.childNodes ? array.filter(parentNode.childNodes, function (child) { return child.nodeType == 1; }) : [];
        },

        ancestorNodeByClass: function (fromNode, className, includeSelf) {
            var parent = includeSelf ? fromNode : fromNode.parentNode;
            while (parent) {
                if (domClass.contains(parent, className)) {
                    return parent;
                }
                else {
                    parent = parent.parentNode;
                }
            };
            return null;
        },

        ancestorNodeByTagName: function (fromNode, tagName, includeSelf) {
            var tag = tagName.toLowerCase();
            var parent = includeSelf ? fromNode : fromNode.parentNode;
            while (parent) {
                if (parent.tagName && parent.tagName.toLowerCase() == tag) {
                    return parent;
                }
                else {
                    parent = parent.parentNode;
                }
            };
            return null;
        },

        ancestorWidgetByClass: function (fromNode, className, includeSelf) {
            var parent = this.ancestorNodeByClass(fromNode.domNode || fromNode, className, includeSelf);
            return parent ? registry.byNode(parent) : null;
        },

        //determines if a given widget or node is in the current document
        isInDocument: function (widgetOrNode) {
            var domNode = widgetOrNode ? widgetOrNode.domNode ? widgetOrNode.domNode : widgetOrNode : null;
            while (domNode) {
                if (domNode.nodeType == 9) {
                    return true;
                }
                else {
                    domNode = domNode.parentNode;
                };
            };
            return false;
        },


        getNoteElementFromPoint: function(startElement, x, y) {
            // summary: 
            //   Finds the furthest descendant of startElement that contains the given coordinates.
            //   useful when there are overlapping DOM elements covering the note element, e.g. an 
            //   overlay div. If there are no overlapping elements the browser's document.elementFromPoint 
            //   function will be more efficient.
            // startElement: Object
            //   A NoteElement derived widget used as the starting point for the search
            // x: Number
            //   The x coordinate of the target widget
            // y: Number
            //   The y coordinate of the target widget

            if (!startElement || !startElement.getChildNoteElements) {
                return null;
            };

            var isContainedBy = function (widget) {
                var pos = geometry.position(widget.domNode);
                return x >= pos.x && x <= pos.x + pos.w && y >= pos.y && y <= pos.y + pos.h;
            };

            if (!isContainedBy(startElement)) {
                return null;
            };

            var target = null;
            var current = startElement;
            var children = null;
            var n = 0;
            var len = 0;
            while (current) {
                target = current;
                current = null;
                children = target.getChildNoteElements();
                len = children.length;
                for (n = 0; n < len; n++) {
                    if (isContainedBy(children[n])) {
                        current = children[n];
                        break;
                    };
                };
            };

            return target;
        },

        getDOMNodeFromPoint: function (startNode, x, y) {
            // summary: 
            //   Finds the furthest descendant of starNode that contains the given coordinates.
            //   useful when there are overlapping DOM elements covering the note element, e.g. an 
            //   overlay div. If there are no overlapping elements the browser's document.elementFromPoint 
            //   function will be more efficient.
            // startNode: DOMNode
            //   The DOMNode to search from
            // x: Number
            //   The x coordinate of the target widget
            // y: Number
            //   The y coordinate of the target widget
            if (!startNode) {
                return null;
            };

            var isContainedBy = function (node) {
                if (node && node.nodeType == 1) {
                    var pos = geometry.position(node);
                    return x >= pos.x && x <= pos.x + pos.w && y >= pos.y && y <= pos.y + pos.h;
                };
            };

            if (!isContainedBy(startNode)) {
                return null;
            };

            var target = null;
            var current = startNode;
            var children = null;
            var n = 0;
            var len = 0;
            while (current) {
                target = current;
                current = null;
                children = target.childNodes || [];
                len = children.length;
                for (n = 0; n < len; n++) {
                    if (isContainedBy(children[n])) {
                        current = children[n];
                        break;
                    };
                };
            };

            return target;
        },

        showError: function (errorInfo) {
            topic.publish("/qc/ErrorHandled");
            if (errorInfo.response && (errorInfo.response.status == 401 || errorInfo.response.status == 403) && core.settings.loginPage) {
                window.location.href = core.settings.loginPage;
                return false;
            }
            var message = errorInfo ? errorInfo.message ? errorInfo.message : errorInfo.toString() : "Unknown error";
            if (errorInfo && errorInfo.response && errorInfo.response.text) {
                try {
                    if (errorInfo.response.text.startsWith('<')) {
                        var doc = core.XmlUtil.createDocument(errorInfo.response.text);
                        var error = core.XmlUtil.selectChildElement(doc, "Error");
                        var s = error.attributes[0].nodeValue;
                        if (s && s != '') {
                            message += (': ' + s);
                        }
                    }
                }
                catch (ex) {}
            }

            var messageWrapper = '<div style="max-width:400px;max-height:400px;overflow-y:auto;margin:6px;">' + message + '</div>';
            core.doDialog(Dialog, { title: 'Error', content: messageWrapper });
            return false;
        },

        doDialog: function (dialogType, settings, executeCallback, cancelCallback, callbackContext) {
            if (!dialogType) {
                return;
            }

            var Type = typeof dialogType == 'string' ? require(dialogType) : dialogType;

            var dialog = new Type(settings || {});
            dialog.startup();
            return this.showDialog(dialog, executeCallback, cancelCallback, callbackContext);
        },

        showDialog: function (dialog, executeCallback, cancelCallback, callbackContext) {
            callbackContext = callbackContext || this;
            var hExec = null;
            var hCancel = null;

            executeCallback = executeCallback || function () { return true };
            cancelCallback = cancelCallback || function () { return true };

            hExec = dialog.on('execute', lang.hitch(this, function () {
                hExec.remove();
                hCancel.remove();
                when(executeCallback.call(callbackContext, dialog), function () {
                    when(dialog._fadeOutDeferred, function () {
                        dialog.destroyRecursive();
                    })
                });
            }));

            hCancel = dialog.on('cancel', lang.hitch(this, function () {
                hExec.remove();
                hCancel.remove();
                when(cancelCallback.call(callbackContext, dialog), function () {
                    when(dialog._fadeOutDeferred, function () {
                        dialog.destroyRecursive();
                    })
                });
            }));

            return dialog.show();
        },

        checkXmlResult: function (data, displayErrorMessage) {
            var message = null;

            if (!(data && data.documentElement)) {
                message = "Invalid document";
            }
            else if (data.documentElement.tagName.toLowerCase() == 'parseerror') {
                message = data.documentElement.value || "Error parsing XML document";
            }
            else if (data.documentElement.tagName.toLowerCase() == 'error') {
                message = data.documentElement.getAttribute("Message") || "Error in XML document";
            }
            else {
                return true;
            }

            if (message && (displayErrorMessage === true || displayErrorMessage === undefined)) {
                this.showError(message);
            };
            return false;
        },

        xmlErrorFilter: function (data, ioArgs, onSuccess, onError) {
            if (data && data.documentElement && data.documentElement.tagName == 'Error') {
                if (onError == undefined) {
                    onError = this.showError;
                }
                return onError(data.documentElement.getAttribute("Message"));
            }
            else {
                if (onSuccess == undefined) {
                    return data;
                }
                else {
                    return onSuccess(data, ioArgs);
                }
            };
        },

        // replacement for the browser's alert dialog
        // settings: 
        //{
        //    title: dialog title, default = blank
        //    message: alert message
        //    okLabel: label for the "OK" button, default = culture specific "OK"
        //}
        alert: function (settings) {
            var message = '';
            if (settings == undefined || typeof settings == 'string') {
                message = settings || '';
                settings = {}
            }
            else {
                message = settings.message || '';
            };
            var okLabel = settings.okLabel || this.getI18n('cmdOK');

            var dlg = new Dialog({ title: settings.title || '' });

            var content = domConstruct.create('div');
            domStyle.set(content, { margin: '12px', maxWidth: '400px' });

            domConstruct.place('<div>' + message + '</div>', content);
            var buttonDiv = domConstruct.place('<div></div>', content)
            domStyle.set(buttonDiv, { marginTop: '8px', textAlign: 'right' });


            var okButton = new Button({ label: okLabel });
            okButton.onClick = lang.hitch(dlg, function () {
                this.onExecute();
            });
            okButton.placeAt(buttonDiv);

            dlg.set('content', content);
            this.showDialog(dlg);
        },

        // replacement for the browser's confirmation dialog
        // settings: 
        //{
        //    title: dialog title, default = blank
        //    message: confirm message
        //    yesLabel: label for the "Yes" button, default = culture specific "Yes"
        //    noLabel: label for the "No" button, default = culture specific "No"
        //    topic: topic top publish when "yes" clicked
        //    topicParms: [parms to publish with the topic]
        //}
        confirm: function (settings) {
            var message = '';
            if (settings == undefined || typeof settings == 'string') {
                message = settings || '';
                settings = {}
            }
            else {
                message = settings.message || '';
            };
            var yesLabel = settings.yesLabel || this.getI18n('yes');
            var noLabel = settings.noLabel || this.getI18n('no');

            var dlg = new Dialog({ title: settings.title || '' });

            var content = domConstruct.create('div');
            domStyle.set(content, 'margin', '12px');

            domConstruct.place('<div>' + message + '</div>', content);
            var buttonDiv = domConstruct.place('<div></div>', content)
            domStyle.set(buttonDiv, { marginTop: '8px', textAlign: 'right' });

            var destroyDialog = function () {
                when(dlg.hide(), function() {
                    dlg.destroyRecursive();
                });
            };

            var yesButton = new Button({ label: yesLabel });
            if (settings.yesCallback) {
                yesButton.onClick = lang.hitch(dlg, function () {
                    settings.yesCallback.call(settings.callbackContext || dlg);
                    setTimeout(destroyDialog, 100);
                });
            }
            else if (settings.topic) {
                yesButton.onClick = lang.hitch(dlg, function () {
                    topic.publish(settings.topic, settings.topicParms || []);
                    setTimeout(destroyDialog, 100);
                });
            };
            yesButton.placeAt(buttonDiv);

            var noButton = new Button({ label: noLabel });
            if (settings.noCallback) {
                noButton.onClick = lang.hitch(dlg, function () {
                    settings.noCallback.call(settings.callbackContext || dlg);
                    setTimeout(destroyDialog, 100);
                });
            }
            else {
                noButton.onClick = lang.hitch(dlg, function () {
                    setTimeout(destroyDialog, 100);
                });
            };
            noButton.placeAt(buttonDiv);

            dlg.set('content', content);
            dlg.show();

        },

        equivalentObjects: function (a, b) {
            if (typeof a != typeof b) {
                return false;
            };

            if (a == null) {
                return (b == null);
            };

            if (typeof a != 'object') {
                return (a === b);
            };

            if (a instanceof Array) {
                if (!(b instanceof Array)) {
                    return false;
                };
                if (a.length != b.length) {
                    return false;
                };
                for (var n = 0, len = a.length; n < a; n++) {
                    if (!this.equivalentObjects(a[n], b[n])) {
                        return false;
                    };
                };
            };

            for (var p in a) {
                if (!this.equivalentObjects(a[p], b[p])) {
                    return false;
                };
            };

            for (var q in b) {
                if (b[q] != undefined && a[q] == undefined) {
                    return false;
                }
            };

            return true;
        },

        getObjectOverrides: function (a, b) {
            if (a == undefined || a == null) {
                return (b == 0 || b) ? b : null;
            };

            if (b == undefined || b == null) {
                return null;
            };

            if (typeof b != typeof a) {
                return b;
            };

            if (b instanceof Array) {
                for (var n = 0; n < b.length; n++) {
                    if (b[n] !== a[n]) {
                        return b;
                    };
                };
            };

            switch (typeof b) {
                case 'function':
                    return null;
                case 'object':
                    var p = '';
                    var v = null;
                    var r = null;
                    for (p in b) {
                        v = this.getObjectOverrides(a[p], b[p]);
                        if (v != null) {
                            r = r || {};
                            r[p] = v;
                        };
                    };
                    return r;
                default:
                    return b === a ? null : b;
            };
        },

        applyObjectOverrides: function (a, b) {
            if (a == undefined || a == null) {
                return b;
            };

            if (b == undefined || b == null) {
                return a;
            };

            if (b instanceof Array) {
                return b;
            };

            if (typeof b == 'object') {
                var c = lang.clone(a);
                for (var p in b) {
                    c[p] = this.applyObjectOverrides(a[p], b[p]);
                };
                return c;
            };

            return b;
        },

        forEachProperty: function (obj, fn, context, includeFunctions) {
            if (obj) {
                var i = 0;
                for (var name in obj) {
                    if (includeFunctions || typeof obj[name] != 'function') {
                        fn.call(context || this, name, obj[name], obj, i);
                        i++;
                    };
                };
            };
        },

        isHiddenNode: function (node, skipContainerCheck) {
            if (!node) {
                return false;
            };
            var hidden = (domClass.contains(node, 'listHide') || domClass.contains(node, 'viewHide') || domClass.contains(node, 'hidden') || domStyle.get(node, 'display') == 'none' || domStyle.get(node, 'visibility') == 'hidden');
            if (!hidden && !skipContainerCheck) {
                hidden = core.ancestorNodeByClass(node, 'hidden', false) ? true : false;
            };
            return hidden;
        },

        isHiddenFinding: function(element) {
            var node = element.domNode || element;
            return node ? this.isHiddenNode(node) || this.ancestorNodeByClass(node, 'hiddenFindingContainer') : false;
        },

        TermTypeInfo: {
            termTypes: [
                { termType: 1, caption: "Symptoms", abbreviation: "Sx", nodeKey: "A", medcinId: 2952 },
                { termType: 5, caption: "History", abbreviation: "Hx", nodeKey: "B", medcinId: 5141 },
                { termType: 2, caption: "Physical Examination", abbreviation: "Px", nodeKey: "C", medcinId: 6000 },
                { termType: 3, caption: "Test", abbreviation: "Tx", nodeKey: "D", medcinId: 102905 },
                { termType: 6, caption: "Diagnoses, Syndromes & Conditions", abbreviation: "Dx", nodeKey: "F", medcinId: 39448 },
                { termType: 7, caption: "Therapy", abbreviation: "Rx", nodeKey: "G", medcinId: 40000 }
            ],

            nodeKeyIndex: ['A', 'B', 'C', 'D', 'F', 'G'],
            termTypeIndex: [1, 5, 2, 3, 6, 7],

            fromNodeKey: function (nodeKey) {
                if (nodeKey) {
                    var key = nodeKey.length > 1 ? nodeKey.substr(1, 1) : nodeKey.substr(0, 1);
                    var n = array.indexOf(this.nodeKeyIndex, key);
                    if (n >= 0) {
                        return this.termTypes[n];
                    };
                }
            },

            fromTermType: function (termType) {
                var t = parseInt(termType, 10);
                var n = array.indexOf(this.termTypeIndex, t);
                if (n >= 0) {
                    return this.termTypes[n];
                };
            }
        },

        MedcinInfo: {
            standardNoteSectionIds: {
                'CC': 1,
                'CCSection': 1,
                'HPI': 2,
                'HPISection': 2,
                'ROS': 16,
                'ROSSection': 16
            },

            knownMedcinIds: {
                HPIFreeText: 112342
            },

            standardFindingProperties: ['duration', 'episode', 'modifier', 'notation', 'onset', 'prefix', 'result', 'specifier', 'status', 'timing', 'unit', 'value'],

            isAncestor: function (parent, child) {
                var parentKey = parent ? parent.nodeKey ? parent.nodeKey : parent.toString() : '';
                var childKey = child ? child.nodeKey ? child.nodeKey : child.toString() : '';
                return (parentKey && childKey && childKey.length > parentKey.length && childKey.substr(0, parentKey.length) == parentKey);
            },

            isSibling: function (item1, item2) {
                var key1 = item1 ? item1.nodeKey ? item1.nodeKey : item1.toString() : '';
                var key2 = item2 ? item2.nodeKey ? item2.nodeKey : item2.toString() : '';
                var len = key1.length;
                return (len > 0 && len == key2.length && key1 != key2 && key1.substr(0, len - 2) == key2.substr(0, len - 2));
            },

            nodeKeyComparer: function (a, b) {
                var aKey = a ? a.nodeKey || a.toString() : '';
                var bKey = b ? b.nodeKey || b.toString() : '';
                if (aKey < bKey) {
                    return -1;
                }
                else if (aKey > bKey) {
                    return 1;
                }
                else {
                    return 0;
                };
            },

            reverseNodeKeyComparer: function (a, b) {
                var aKey = a ? a.nodeKey || a.toString() : '';
                var bKey = b ? b.nodeKey || b.toString() : '';
                if (bKey < aKey) {
                    return -1;
                }
                else if (bKey > aKey) {
                    return 1;
                }
                else {
                    return 0;
                };
            },

            isHistoryPrefix: function (prefix) {
                if (!prefix) {
                    return false;
                }
                else if (prefix.charAt(0) == 'H') {
                    return (prefix != 'HY');
                }
                else if (prefix.charAt(0) == 'F') {
                    return (prefix != 'FP' && prefix != 'FU');
                }
                else {
                    return false;
                }
            },

            isValidPrefix: function (prefix, termTypeOrNodeKey) {
                if (!(prefix && termTypeOrNodeKey)) {
                    return false;
                };

                var termType = 0;
                if (typeof termTypeOrNodeKey == 'string') {
                    var info = this.TermTypeInfo.fromNodeKey(termTypeOrNodeKey);
                    termType = info ? info.termType : 0;
                }
                else {
                    termType = termTypeOrNodeKey;
                };

                if (!termType) {
                    return false;
                };

                var codeEntry = core.EnumManager.getItemSynch('prefix', prefix);
                if (codeEntry) {
                    if ((codeEntry.flags & Math.pow(2, termType)) == 0) {
                        return false;
                    }
                    else {
                        return true;
                    }
                };

                return false;
            },

            isPlaceholderFreeText: function (text) {
                if (text && text.toString().match(/(Free Text\]|Free Text\:|the chief complaint is\:|use for reason for patient\'s call\])/i)) {
                    return true;
                }
                else {
                    return false;
                }
            }
        },

    	// *las* Added unsubscribe, disconnect, xhrGet, xhrPost, and isFunction to ease the transition from Dojo 
        // 1.6 to Dojo 1.9
        unsubscribe: function (handle) {
	        if (handle) {
		        handle.remove();
	        }
        },

        disconnect: function (handle) {
	        if (handle) {
		        handle.remove();
	        }
        },

		xhrGet: function(message) {
			if (message.query == null && message.content != null) {
				message.query = message.content;
			}

			return request.get(message.url, message).then(message.load, message.error);
		},

		xhrPost: function(message) {
			if (message.data == null && message.content != null) {
				message.data = message.content;
			}

			return request.post(message.url, message).then(message.load, message.error);
		},

		isFunction: function(input) {
			return (typeof input == "function");
		},

		createFindingEntry: function () {
			var args = Array.prototype.slice.call(arguments, 0);
			args.unshift("FindingLabel");

			return core.createNoteElement.apply(this, args);
		},

		createNoteElement: function (type) {
			var args = Array.prototype.slice.call(arguments, 0);
			args.shift();

			return core.settings.noteElementClasses["qc/note/" + type].apply(this, args);
		},

		createSection: function () {
			var args = Array.prototype.slice.call(arguments, 0);
			args.unshift("Section");

			return core.createNoteElement.apply(this, args);
		},

		createChapter: function () {
			var args = Array.prototype.slice.call(arguments, 0);
			args.unshift("Chapter");

			return core.createNoteElement.apply(this, args);
		},

		createGroup: function () {
			var args = Array.prototype.slice.call(arguments, 0);
			args.unshift("Group");

			return core.createNoteElement.apply(this, args);
		},

		createNoteDocument: function () {
			var args = Array.prototype.slice.call(arguments, 0);
    		args.unshift("Document");

    		return core.createNoteElement.apply(this, args);
		},

		createSearchBox: function() {
			return core.settings.searchBoxClass.apply(this, arguments);
		},

		isEmpty: function(obj) { 
			for(var prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					return false;
				}
			}

			return true; 
		},

		ensureNodeVisible: function (node, containerNode, scrollingMethod) {
		    var posNode = domGeometry.position(node);
		    var posContainer = domGeometry.position(containerNode);
		    var posScrollContainer = domGeometry.position(containerNode.parentNode);

		    while (node && node.nodeType == 1) {
		        domClass.remove(node, 'collapsed');
		        node = node.parentNode;
		    }

		    if (scrollingMethod == 'top') {
		        if (posNode.y < 0 || (posNode.y + posNode.h) >= posScrollContainer.h) {
		            var newTop = (-1 * (posNode.y - posContainer.y)) + (posScrollContainer.h / 2) - posNode.h / 2;
		            var minTop = -1 * posContainer.h + posScrollContainer.h;
		            var maxTop = 0;
		            var moveTo = Math.max(Math.min(maxTop, newTop), minTop);
		            baseFx.animateProperty({
		                node: containerNode,
		                properties: {
		                    top: moveTo
		                }
		            }).play();
		        }
		    }

		    else {
		        if (posNode.y <= posScrollContainer.y || posNode.y + posNode.h >= posScrollContainer.y + posScrollContainer.h) {
		            this.animateScroll((posNode.y - posContainer.y) - (posScrollContainer.h / 2 - posNode.h / 2), containerNode.parentNode);
		        }
		    }
		},

		animateScroll: function (scrollTo, view) {
		    var current = view.scrollTop;

		    var a = new baseFx.Animation(lang.mixin({
		        beforeBegin: function () {
		            if (this.curve) {
		                delete this.curve;
		            }

		            a.curve = new baseFx._Line(current, scrollTo);
		        },
		        onAnimate: function (value) {
		            view.scrollTop = value;
		        }
		    }));

		    a.play();
		}
    };

    core.util = {
        isTouchDevice: function () {
            if (core.settings.isWin8Touch) {
                return true;
            };

            // suppress touch handling for Windows machines that only partially support touch
            // will need revision for windows surface tablets.
            if (navigator.userAgent.indexOf("Windows NT") >= 0 && navigator.userAgent.indexOf("Windows NT 6.2") < 0) {
                return false;
            };

            var node = domConstruct.create('div');
            node.setAttribute('ontouchstart', 'return;');
            return typeof node.ontouchstart == "function";
        },

        isMultiSelectEvent: function(e) {
            if (core.util.isMac()) {
                return e.metaKey;
            }

            else {
                return e.ctrlKey;
            }
        },

        isMac: function() {
            return navigator.platform.match(/Mac/i);
        },

        //isIOS7: function () {
        //    return navigator.userAgent.match(/(iPad|iPhone);.*CPU.*OS 7_\d/i);
        //},

        isIOS: function () {
            return navigator.userAgent.match(/(iPad|iPhone);/i);
        },

        supportsCanvas: function () {
            return typeof document.createElement("canvas").getContext == "function";
        },

        addStylesheetLink: function (id, href, moduleName) {
            // href = moduleName ? dojo.moduleUrl(moduleName, href).uri : href;
            href = moduleName ? require.toUrl(moduleName + '/' + href) : href;
            var link = dom.byId(id);
            if (link) {
                link.setAttribute('href', href);
            }
            else {
                link = window.document.createElement('link');
                link.setAttribute('id', id);
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('href', href);
                query('head')[0].appendChild(link);
            };
        }
    };

	lang.setObject("core", core);

    return core;

});
