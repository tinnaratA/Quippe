define([
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/query",
    "dojo/Stateful",
    "dojo/topic",
    "qc/_core",
    "qc/lang/qscript/Compiler",
    "qc/lang/qscript/Host",
    "qc/StringUtil"
], function (registry, array, declare, lang, domClass, query, Stateful, topic, core, Compiler, Host, StringUtil) {
    return declare("qc.lang.qscript.Binding", [Stateful], {
        reFindingProperty: /^(medcinId|prefix|result|value|unit|onset|duration|episode|timing|notation|specifier|termType|nodeKey|flag)$/,
    
        bindingType: '',
        bindTo: '',
        expression: '',
    
        owner: null,
    
        targetFunction: null,
        references: null,
        hasGroupReferences: false,
    
        constructor: function () {
            topic.subscribe('/qc/DocumentLoaded', lang.hitch(this, this.onNoteChanged));
            topic.subscribe('/qc/ContentLoaded', lang.hitch(this, this.onNoteChanged));
        },
    
        execute: function () {
            if (this.suspended) {
                return false;
            };
    
            try {
                this.suspended = true;
    
                this.ignoreAll();
    
                if (!this.owner || !this.owner.domNode) {
                    return false;
                };
    
                if (!this.targetFunction) {
                    if (!this.compile()) {
                        return false;
                    }
                };
    
                var context = this.resolveReferences();
                if (!context) {
                    this.observeNoteAdditions();
                    return false;
                };
    
                var currentResult = this.getCurrentValue();
                var result = this.targetFunction.call(Host, context);
                if (result != currentResult) {
                    this.applyResult(result);
                };
    
                if (this.hasGroupReferences) {
                    this.observeNoteAdditions();
                    this.observeNoteDeletions();
                };
                this.observePropertyChanges();
    
                return true;
    
            }
            catch (ex) {
                console.log(ex);
                return false;
            }
            finally {
                this.suspended = false;
            };
        },
    
        onNoteChanged: function () {
            if (this.suspended) {
                if (this.hExecTimeout) {
                    clearTimeout(this.hExecTimeout);
                };
                this.hExecTimeout = setTimeout(lang.hitch(this, this.onNoteChanged), 250);
            }
            else {
                this.execute();
            };
        },
    
        onPropertyChanged: function (propertyName, oldValue, newValue) {
            if (propertyName && this.reFindingProperty.test(propertyName)) {
                this.onNoteChanged();
            };
        },
    
        compile: function () {
            var result = Compiler.compile(this.expression);
            if (result.success) {
                //this.targetExpr = result.targetScript;
                this.targetFunction = result.targetFunction;
                this.references = result.references
                return true;
            }
            else {
                return false;
            };
        },
    
        resolveReferences: function () {
            var context = {};
            this.hasGroupReferences = false;
    
            for (var refName in this.references) {
    
                switch (refName) {
                    case 'Patient':
                        if (core.Patient) {
                            context.Patient = core.Patient;
                        }
                        else {
                            //this.writeLine("No patient loaded");
                            return;
                        };
                        break
                    case 'Encounter':
                        if (core.Encounter) {
                            context.Encounter = core.Encounter;
                        }
                        else {
                            //this.writeLine("No current encounter");
                            return;
                        }
                        break;
    
                    case 'Provider':
                        context.Provider = core.Provider || {};
                        break;
    
                    default:
                        var target = this.references[refName].target;
    
                        if (!(target && target.domNode)) {
                            target = refName == 'Owner' ? this.owner : this.owner.getElementByName(refName) || null;
                            if (target) {
                                this.references[refName].target = target;
                            }
                            else {
                                return null;
                            }
                        };

                        if (domClass.contains(target.domNode, 'part')) {
                            this.references[refName].isGroup = true;
                            this.hasGroupReferences = true;
                            this.references[refName].findings = query('.finding', target.domNode).map(registry.byNode);
                            context[refName] = this.references[refName].findings;
                        }
                        else {
                            context[refName] = target;
                        };
    
                        //if (domClass.contains(target.domNode, 'finding')) {
                        //    context[refName] = target;
                        //}
                        //else {
                        //    this.references[refName].isGroup = true;
                        //    this.hasGroupReferences = true;
                        //    this.references[refName].findings = query('.finding', target.domNode).map(registry.byNode);
                        //    context[refName] = this.references[refName].findings;
                        //};
                        break;
                };
            };
    
            context.Owner = this.owner;
            return context;
        },
    
        getCurrentValue: function () {
            if (!this.bindTo || !this.owner || !this.owner.domNode) {
                return null;
            };
    
            switch (this.bindingType) {
                case 'property':
                    return this.owner.get(this.bindTo);
                case 'styleClass':
                    return domClass.contains(this.owner.domNode, this.bindTo);
                default:
                    return null;
            };
        },
    
        applyResult: function (result) {
            if (!this.bindTo || !this.owner || !this.owner.domNode) {
                return;
            };
    
            if (this.bindingType == 'property') {
                this.owner.set(this.bindTo, result);
                if (this.bindTo == 'medcinId' && !isNaN(result) && result > 0 && this.owner.resolveTerm) {
                    this.owner.resolveTerm(result);
                };
            }
            else if (this.bindingType == 'styleClass') {
                if (result) {
                    domClass.add(this.owner.domNode, this.bindTo);
                }
                else {
                    domClass.remove(this.owner.domNode, this.bindTo);
                };

                //special case for the style class "hidden", resolve deferred content and/or update display on the containing part.
                if (this.bindTo == 'hidden') {
                    if (!result && this.owner._resolveDeferredContent) {
                        setTimeout(lang.hitch(this, function () {
                            this.owner._resolveDeferredContent();
                        }, 20));
                    }
                    else if (this.owner.getContainingPart) {
                        var part = this.owner.getContainingPart();
                        if (part && part.updateDisplay) {
                            part.updateDisplay();
                        };
                    };

                };
            };

        },
    
        destroy: function () {
            this.ignoreAll();
            this.owner = null;
            if (this.references) {
                for (var refName in this.references) {
                    this.references[refName].target = null;
                    this.references[refName].findings = null;
                };
            };
            this.references = null;
            this.targetFunction = null;
        },
    
        observeAll: function () {
            this.observeNoteAdditions();
            this.observeNoteDeletions();
            this.observePropertyChanges();
        },
    
        ignoreAll: function () {
            this.ignoreNoteAdditions();
            this.ignoreNoteDeletions();
            this.ignorePropertyChanges();
        },
    
        observeNoteAdditions: function () {
            if (!this.hNoteAdditions) {
                this.hNoteAdditions = [
                    //topic.subscribe('/qc/DocumentLoaded', lang.hitch(this, this.onNoteChanged)),
                    topic.subscribe('/noteEditor/listAdded', lang.hitch(this, this.onNoteChanged)),
                    topic.subscribe('/noteEditor/findingAdded', lang.hitch(this, this.onNoteChanged))
                ];
            };
        },
    
        ignoreNoteAdditions: function () {
            if (this.hNoteAdditions) {
                array.forEach(this.hNoteAdditions, core.unsubscribe);
                this.hNoteAdditions = null;
            };
        },
    
        observeNoteDeletions: function () {
            if (!this.hNoteDeletions) {
                this.hNoteDeletions = [
                    topic.subscribe('/noteEditor/listRemoved', lang.hitch(this, this.onNoteChanged)),
                    topic.subscribe('/noteEditor/findingRemoved', lang.hitch(this, this.onNoteChanged)),
                    topic.subscribe('/noteEditor/findingsRemoved', lang.hitch(this, this.onNoteChanged))
                ];
            };
        },
    
        ignoreNoteDeletions: function () {
            if (this.hNoteDeletions) {
                array.forEach(this.hNoteDeletions, core.unsubscribe);
                this.hNoteDeletions = null;
            };
        },
    
        observePropertyChanges: function () {
            if (!this.references) {
                return;
            };
    
            var fnPropChange = lang.hitch(this, this.onNoteChanged);
            if (!this.watchHandles) {
                this.watchHandles = [];
            };
            var watchHandles = this.watchHandles;
    
            for (var refName in this.references) {
                var watchTargets = this.references[refName].isGroup ? this.references[refName].findings : this.references[refName].target ? [this.references[refName].target] : [];
                for (var propName in this.references[refName].properties) {
                    array.forEach(watchTargets, function (w) {
                        if (w && w.watch) {
                            watchHandles.push(w.watch(propName, fnPropChange));
                        };
                    });
                };
            };
        },
    
        ignorePropertyChanges: function () {
            if (this.watchHandles) {
                array.forEach(this.watchHandles, function (h) { h.unwatch() });
                this.watchHandles = null;
            };
        },
    
        readXML: function (xmlNode) {
            array.forEach(xmlNode.attributes, function (attr) {
                this[StringUtil.toCamelLower(attr.name)] = attr.value;
            });
        },
    
        writeXML: function (writer, mode) {
            if (this.bindingType && this.bindTo && this.expression) {
                writer.beginElement('Binding');
                writer.attribute('BindingType', this.bindingType);
                writer.attribute('BindTo', this.bindTo);
                writer.attribute('Expression', this.expression);
                writer.endElement();
            };
        }
    });
});