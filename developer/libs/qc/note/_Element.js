define([
    "qc/design/_PropertyGridSupport",
    "dijit/_Contained",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/query",
	"dojo/promise/all",
    "qc/_core"
], function (_PropertyGridSupport, _Contained, _TemplatedMixin, _WidgetBase, registry, array, declare, lang, domClass, domConstruct, domStyle, query, all, core) {
    return declare("qc.note._Element", [_WidgetBase, _TemplatedMixin, _Contained, _PropertyGridSupport], {
        templateString: '<div></div>',
        isElementContainer: false,
        elementId: '',
        styleClass: '',
        sourceXmlNode: null,
        elementName: 'Element',
        entryStyle: null,
        sectionId: '',
        groupId: '',
        name: '',
        disabled: false,
    
        postCreate: function () {
            domClass.add(this.domNode, 'noteElement');
            this.domNode.setAttribute('tabindex', 1);
            this.inherited(arguments);
        },
    
        getInheritedProperty: function (name, defaultValue) {
            defaultValue = defaultValue == undefined ? null : defaultValue;
            var value = this[name];
            if (value) {
                return value;
            }
            else {
                var parent = this.getParentNoteElement();
                if (parent) {
                    return parent.get(name) || defaultValue;
                }
                else {
                    return defaultValue;
                };
            };
        },
    
        getDerivedProperty: function (name, defaultValue) {
            var value = this[name] || defaultValue || null;
            var parent = this.getParentNoteElement();
            if (parent) {
                return core.applyObjectOverrides(parent.getDerivedProperty(name), value);
            }
            else {
                return value;
            }
        },
    
        setDerivedProperty: function (name, value) {
            var parent = this.getParentNoteElement();
            if (parent) {
                var parentValue = parent.getDerivedProperty(name);
                this[name] = core.getObjectOverrides(parentValue, value);
            }
            else {
                this[name] = value;
            }
        },
    
        haveOwnProperty: function (name) {
            if (this[name]) {
                var parent = this.getParentNoteElement();
                var parentValue = parent ? parent.getInheritedProperty(name) : null;
                return (parentValue != this[name]);
            }
            else {
                return false;
            };
        },
    
        _setNameAttr: function (value) {
            var sValue = value ? value.toString().trim() : '';
            if (sValue) {
                this.domNode.setAttribute('data-name', sValue);
                this.name = sValue;
            }
            else {
                this.domNode.removeAttribute('data-name');
                this.name = '';
            }
        },
    
        _getDisabledAttr: function () {
            return this.disabled || core.ancestorNodeByClass(this.domNode, 'disabled', true);
        },
        _setDisabledAttr: function (value) {
            var origValue = this.get('disabled');
            this.disabled = value;
            var newValue = this.get('disabled');
            if (newValue) {
                domClass.add(this.domNode, 'disabled');
            }
            else {
                domClass.remove(this.domNode, 'disabled');
            };
            if (this.domNode && (newValue !== origValue)) {
                this.updateDisplay();
            };
        },

        _getStyleClassAttr: function () {
            return this.styleClass;
        },
        _setStyleClassAttr: function (value) {
            if (this.styleClass) {
                array.forEach(this.styleClass.split(' '), function (s) {
                    domClass.remove(this.domNode, s);
                }, this);
                this.styleClass = '';
            };
            if (value !== null && value !== undefined) {
                array.forEach(value.toString().split(' '), function (s) {
                    domClass.add(this.domNode, s);
                }, this);
                this.styleClass = value.toString();
            };
        },
    
        _getEntryStyleAttr: function () {
            return this.getInheritedProperty('entryStyle', '');
        },
        _setEntryStyleAttr: function (value) {
            this.entryStyle = value;
        },

        _getSourceClassesAttr: function () {
            return array.filter(this.domNode.className.split(' '), function (name) {
                return name.match('^lst');
            }).join(' ').trim();
        },
        _setSourceClassesAttr: function (value) {
            array.forEach(value.split(' '), function (s) {
                domClass.add(this.domNode, s);
            }, this);
        },

        getContainingPart: function () {
            return core.ancestorWidgetByClass(this, 'part');
        },
    
        isContainedBy: function (widget) {
            var targetId = widget && widget.domNode ? widget.domNode.id : null;
            if (!targetId) {
                return false
            };
    
            var parent = this.domNode.parentNode;
            while (parent && parent.nodeType == 1) {
                if (parent.id == targetId) {
                    return true;
                }
                else {
                    parent = parent.parentNode;
                };
            };
    
            return false;
        },

        // summary: returns true if this element is part of a Quippe Form
        isFormElement: function() {
            return this.domNode && core.ancestorNodeByClass(this.domNode, 'qcForm') ? true : false;
        },
    
        getParentNoteElement: function () {
            return core.ancestorWidgetByClass(this, 'noteElement');
        },
    
        getChildNoteElements: function () {
            var container = this.containerNode || this.domNode;
            return container ? query("> .noteElement", container).map(registry.byNode) : [];
        },
    
        getFindings: function (includeNonEntered) {
            var classTest = includeNonEntered ? 'finding' : 'entry';
            return array.filter(this.getChildren(), function (x) { return domClass.contains(x.domNode, classTest); })
                    .map(function (y) { return y.toFinding(); });
        },
    
        deleteSelf: function (suspendUpdate) {
            if (this._beingDestroyed) {
                return;
            };
            var part = suspendUpdate ? null : this.getParentNoteElement();
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            };
            if (this.events) {
                array.forEach(this.events, core.disconnect);
                this.events = null;
            };
            this.destroyRecursive();
            if (part) {
                part.updateDisplay();
                part.transcribe();
            };
        },
    
        moveTo: function (targetNode, position) {
            var oldPart = this.getParentNoteElement();
            domConstruct.place(this.domNode, targetNode, position);
            var newPart = this.getParentNoteElement();


            if (newPart && newPart.applyPrefixRule && domClass.contains(this.domNode, 'finding')) {
                newPart.applyPrefixRule(this);
            };

            //if (newPart && domClass.contains(this.domNode, 'finding')) {
            //    var prefix = newPart.get('forcePrefix');
            //    if (prefix) {
            //        this.setPrefixFromRule(prefix);
            //    }
            //    else if (!this.get('prefix')) {
            //        prefix = newPart.get('applyPrefix');
            //        if (prefix && core.MedcinInfo.isValidPrefix(prefix, this.get('termType') || this.get('nodeKey'))) {
            //            this.setPrefixFromRule(prefix);
            //        };
            //    };
            //    this.set('entryStyle', newPart.get('entryStyle'));
            //};

            if (oldPart) {
                if (newPart) {
                    if (oldPart.domNode.id != newPart.domNode.id) {
                        oldPart.transcribe();
                        newPart.transcribe();
                        if (this.inheritedValues) {
                            this.inheritedValues = null;
                        };
                        oldPart.updateDisplay();
                        newPart.updateDisplay();
                    }
                    else {
                        newPart.transcribe();
                        newPart.updateDisplay();
                    }
                }
            }
            else {
                if (newPart) {
                    newPart.transcribe();
                    newPart.updateDisplay();
                }
                else {
                    this.transcribe();
                    this.updateDisplay();
                }
            };
        },
    
        addElement: function (element, relativeTo, position, suspendUpdate, sourceClass) {
        },
    
        removeElement: function (element) {
        },
    
        isEmpty: function () {
            return (query(".finding", this.domNode).length == 0);
        },
    
        updateDisplay: function (viewMode) {
            this._updateChildDisplay(viewMode || this.getViewMode());
        },
    
        _updateChildDisplay: function (viewMode) {
            array.forEach(this.getChildNoteElements(), function (child) {
                child.updateDisplay(viewMode);
            });
        },
    
        finalizeNote: function () {
            var promiseResults = [];
            array.forEach(this.getChildNoteElements(), function (child) {
                var childPromisesMaybe = child.finalizeNote();
                if (childPromisesMaybe) {
                    promiseResults[promiseResults.length] = childPromisesMaybe;
                }
            });
            return promiseResults.length > 0 ? all(promiseResults) : null;
        },
    
        getEditor: function () {
            if (!this._editor) {
                this._editor = query('.qcNoteEditor').map(registry.byNode)[0];
            };
            return this._editor;
        },

		getNote: function() {
			var editor = this.getEditor();

			if (!editor) {
				return null;
			}

			return editor.note;
		},
    
        getEditorSelection: function () {
            var editor = this.getEditor();
            return editor ? editor.selection || null : null;
        },
    
        getViewMode: function () {
            var editor = this.getEditor();
            return editor ? editor.viewMode : '';
        },
    
        toFinding: function () {
            return this;
        },
    
        /* Parser Methods */
        parseXml: function (xmlNode, sourceClass) {
            var widget = this.createFromXml(xmlNode);
            if (widget) {
                widget.sourceXmlNode = xmlNode.cloneNode(true);
                if (sourceClass) {
                    domClass.add(widget.domNode, sourceClass);
                };
                widget.parseXmlAttributes(widget, xmlNode);
                widget.parseXmlChildElements(widget, xmlNode, sourceClass);
            };
            return widget;
        },
    
        createFromXml: function (xmlNode) {
            var type = this.typeFromNode(xmlNode);
            if (type) {
                return new type();
            }
            else {
                return null;  //Throw type exception?
            }
        },
    
        typeFromNode: function (xmlNode) {

            var typeName = xmlNode.getAttribute("Type");
	        if (!typeName) {
		        typeName = xmlNode.tagName;
		        if (xmlNode.tagName === 'Finding') {
		            //var isFreeText = xmlNode.getAttribute('IsFreeText');

		            //if (isFreeText == 'True') {
		            //    typeName = 'FreeText';
		            //}

		            //else {
		            //    typeName += xmlNode.getAttribute("DisplayStyle") || "Label";
		            //}

		            typeName = "FindingLabel";
		        }

		        return core.settings.noteElementClasses["qc/note/" + typeName] ? core.settings.noteElementClasses["qc/note/" + typeName] : null;
	        }

	        else {
	        	typeName = typeName.replace(/\./g, "/");

				if (typeName.indexOf('/') == -1) {
					typeName = 'qc/note/' + typeName;
				}

	        	if (core.settings.noteElementClasses[typeName]) {
			        return core.settings.noteElementClasses[typeName];
	        	}

	        	var type = null;

				try {
					type = require(typeName);
				}

				catch (e) {
				}

		        return type;
	        }
	        //return lang.getObject(typeName, false) || null;
        },
    
        parseXmlAttributes: function (widget, xmlNode) {
            array.forEach(xmlNode.attributes, function (attr) {
                widget.setFromXmlAttribute(attr.name, attr.value);
            });
        },
    
        setFromXmlAttribute: function (name, value) {
            if (name.toLowerCase() == 'id') {
                this.set('elementId', value);
            }
            else {
                this.set(name.charAt(0).toLowerCase() + name.substr(1), core.XmlUtil.parseAttributeValue(value));
            }
        },
    
        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            var self = this;
            array.forEach(xmlNode.childNodes, function (xmlChild) {
                if (xmlChild.nodeType === 1) {
                    var child = self.parseXml(xmlChild, sourceClass);
                    if (child) {
                        widget.addElement(child, 'self', (xmlChild.getAttribute('Position') || 'last'), true, sourceClass);
                    };
                };
            });
        },
    
        _attrToArray: function (value) {
            return value ? value.split(/\s*,\s*/) : [];
        },
    
        _applyStyleAttribute: function (styleString, domNode) {
            var style = this._createStyleObject(styleString);
            if (style) {
                domStyle.set(domNode || this.domNode, style);
            }
        },
    
        _createStyleObject: function (value) {
            if (!value) {
                return null;
            };
    
            var s = {};
            array.forEach(value.split(";"), function (item) {
                if (item) {
                    var w = item.trim().split(":");
                    if (w[0] && w[1]) {
                        s[core.StringUtil.toJsonStyleName(w[0])] = w[1];
                    };
                }
            });
            return s;
        },
    
        getClosestPart: function (partType) {
            return this.getContainingPart(partType || 'part');
        },
    
        getContainerGroupKeys: function() {
            var sectionId = '';
            var groupId = '';
            var placementId = '';
            var groupPattern = /^[GTV]/;
            var sectionPattern = /^S/;

            var part = this.getContainingPart();
            while (part && (!groupId || !sectionId || !placementId)) {
                if (!placementId && part.get('name') && !groupId && !sectionId) {
                    placementId = part.get('name');
                };
                part.getGroupKeyList().forEach(function (key) {
                    if (key != placementId) {
                        if (!groupId && groupPattern.test(key)) {
                            groupId = key;
                        }
                        if (!sectionId && sectionPattern.test(key)) {
                            sectionId = key;
                        }
                    }
                });
                part = part.getContainingPart();
            };
            return { groupId: groupId, sectionId: sectionId, placementId: placementId };
        },

        //getContainerGroupKeys_ORIG: function () {
        //    var groupId = '';
        //    var sectionId = '';
    
        //    var keyLists = new NodeList(this.domNode)
        //            .parents('.part')
        //            .map(registry.byNode)
        //            .map(function (w) { return w.getGroupKeyList() });
    
        //    array.forEach(keyLists, function (keyList) {
        //        array.forEach(keyList, function (key) {
        //            if (key.charAt(0) == 'G' || key.charAt(0) == 'T' || key.charAt(0) == 'V') {
        //                if (!groupId) {
        //                    groupId = key;
        //                };
        //            }
        //            else if (key.charAt(0) == 'S') {
        //                if (!sectionId) {
        //                    sectionId = key;
        //                };
        //            };
        //        });
        //    });
        //    return { sectionId: sectionId, groupId: groupId };
        //},
    
        /* DnD Methods */
        getItem: function (node) {
            return { type: 'noteElement', text: this.get('text') || this.name || this.elementName, node: this.domNode, inline: this.isContainer ? false : true };
        },
    
        getDropAction: function (source, evt) {
            var part = this.getContainingPart();
            return part ? part.getDropAction(source, evt) : null;
        },
    
        doDrop: function (source, evt) {
            var part = this.getContainingPart();
            return part ? part.doDrop(source, evt) : null;
        },
    
        dropDelete: function (source) {
            this.deleteSelf();
        },
    
        /* Serialization */
        writeChartRecords: function (writer, includeNonEntered) {
            return 0;
        },
    
        writeNoteElement: function (writer, mode) {
            writer.beginElement(this.elementName);
            this.writeAllAttributes(writer, mode);
            this.writeNoteChildren(writer, mode);
            writer.endElement();
        },

        writeAllAttributes: function (writer, mode) {
            this.writeNoteAttributes(writer, mode);
            this.writeCustomAttributes(writer, mode);
            this.writeStandardAttributes(writer, mode);
        },

        writeStandardAttributes: function(writer, mode) {
            writer.attribute('Name', this.get('name'), '');
            writer.attribute('StyleClass', this.get('styleClass'), '');
            if (writer.parms.saveSources) {
                writer.attribute('SourceClasses', this.get('sourceClasses'), '');
            };
        },

        writeCustomAttributes: function (writer, mode) {
            if (this.sourceXmlNode) {
                array.forEach(this.sourceXmlNode.attributes, function (a) {
                    if (a.name.charAt(0) == '_') {
                        writer.attribute(a.name, a.value);
                    }
                    else if (a.prefix) {
                        writer.attribute(a.name, a.value);
                    };
                }, this);
            };
        },

        writeNoteAttributes: function (writer, mode) {
            //override in derived classes to write class specific attributes
        },
    
        writeNoteChildren: function (writer, mode) {
            var count = 0;
            array.forEach(this.getChildNoteElements(), function (e) {
                count += e.writeNoteElement(writer, mode)
            });
            return count;
        },
    
        /* Transcription */
        updateTranscription: function () {
            var part = this.getClosestPart();
            if (part) {
                part.transcribe({ empty: true });
            }
        },
    
        transcribe: function (context) {
            this.transcribeChildren(context);
        },
    
        transcribeChildren: function (currentContext) {
            var context = this.createTranscriptionContext(currentContext);
            array.forEach(this.getChildNoteElements(), function (child) {
                child.transcribe(context);
            });
        },
    
        createTranscriptionContext: function (currentContext) {
            return currentContext || {};
        },
    
        /* Design */
    
        getDesigner: function () {
            return this;
        },

        getDesignableChildren: function(sender) {
            return this.getChildNoteElements();
        },

        getDesignerParent: function (sender) {
            return this.getParentNoteElement();
        },
    
        //getDesignerProperties is deprecated, use _pgPropDef method signature or override _pgGetProperties
        getDesignerProperties: function () {
            return null;
        },
    
        getDesignerPropertyValue: function (propertyName) {
            return this.get(propertyName);
        },
    
        setDesignerPropertyValue: function (propertyName, value) {
            this.set(propertyName, value);
        },
    
        isEquivalentElement: function (other) {
            return (other.name && other.name == this.name);
        },
    
        merge: function (other) {
            return this;
        },
    
    
        /* Property Grid Support */

        _pgGetProperties: function (propertyGrid) {
            var props = this._pgGetPropDefs(propertyGrid);
            
            var legacyProps = this.getDesignerProperties();
            if (legacyProps && legacyProps.length > 0) {
                var names = props.map(function (x) { return x.name });
                legacyProps.filter(function (y) { return name.indexOf(y.propertyName < 0) }).forEach(function (info) {
                    var name = info.propertyName;
                    delete info.propertyName;
                    var newInfo = lang.clone(info);
                    newInfo.name = name;
                    return newInfo;
                });
                return props.concat(legacyProps);
            }
            else {
                return props;
            };
        },
    
        _pgGetPropertyValue: function (propertyInfo) {
            if (propertyInfo.getter) {
                return propertyInfo.getter();
            }
            else if (this.getDesignerPropertyValue) {
                return this.getDesignerPropertyValue(propertyInfo.name)
            }
            else {
                return this.get(propertyInfo.name);
            };
        },
    
        _pgSetPropertyValue: function (propertyInfo, value) {
            if (propertyInfo.setter) {
                return propertyInfo.setter(value)
            }
            else if (this.setDesignerPropertyValue) {
                return this.setDesignerPropertyValue(propertyInfo.name, value);
            }
            else {
                this.set(propertyInfo.name, value);
                return true;
            }
        },
    
        /* Named Elements */
        getElementsByName: function (name, container) {
            if (name) {
                container = container || core.ancestorNodeByClass(this.domNode, 'nameContainer', true) || null;
                return query('.noteElement[data-name="' + name + '"]', container).map(registry.byNode);
            }
            else {
                return [];
            };
        },
    
        getElementByName: function (name, container) {
            if (name == this.name) {
                return this;
            }
            else {
                return this.getElementsByName(name, container)[0] || null;
            }
        },
    
        getNamedElements: function (container, pattern) {
            container = container || core.ancestorNodeByClass(this.domNode, 'nameContainer', true) || null;
            return query('.noteElement[data-name]', container).map(registry.byNode);
        },
    
        getUniqueName: function (name, delim, container) {
            name = name || 'Element';
            delim = delim || '_';
    
            var maxIndex = -1;
    
            var re = new RegExp('^' + name + '(?:' + delim + '([0-9]+))?$', 'i');
            var m = null;
    
            if (this.name) {
                m = re.exec(this.name);
                if (m != null) {
                    maxIndex = m[1] ? parseInt(m[1], 10) : 0;
                };
            };
    
            query('.noteElement[data-name]', container).forEach(function (node) {
                var m = re.exec(node.getAttribute('data-name'));
                if (m != null) {
                    maxIndex = Math.max(maxIndex, m[1] ? parseInt(m[1], 10) : 0);
                };
            });
    
            maxIndex++;
    
            if (maxIndex <= 0) {
                return name;
            }
            else {
                return name + delim + maxIndex;
            };
        },

        // === property definitions === 
        _pgPropDef_name: function () {
            return {
                name: 'name',
                description: core.getI18n('tooltipName'),
                validator: function (value, propDef) {
                    if (!value || /^[A-Z][a-zA-Z0-9_]+$/.test(value)) {
                        return { isValid: true };
                    }
                    else {
                        return { isValid: false, message: 'Element name must begin with an uppercase letter and can contain only letters, numbers and the underscore character.' };
                    }
                }
            }
        },

        _pgPropDef_styleClass: function () {
            return {
                name: 'styleClass',
                description: core.getI18n('tooltipStyleClass'),
                group: 'Style',
                isShareable: true
            }
        },

        _getExpressionValue: function (typeName, defaultValue) {
            var fName = '_getExpressionValue_' + typeName;
            return this[fName] ? this[fName]() : defaultValue;
        },

        _getExpressionValue_string: function (defaultValue) {
            return this.get('text') || '';
        },

        _getExpressionValue_number: function (defaultValue) {
            return defaultValue || 0;
        },

        _getExpressionValue_boolean: function (defaultValue) {
            return defaultValue || false;
        }
    });
});