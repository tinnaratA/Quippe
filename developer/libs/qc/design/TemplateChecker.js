define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    "dijit/_WidgetBase",
    "dijit/layout/_LayoutWidget",
    "dijit/form/Button",
    "dijit/form/DropDownButton",
    "dijit/registry",
    "qc/MenuItem",
    "qc/ReviewPane",
    "qc/CheckList",
    "qc/Label",
    "qc/StringUtil",
    "qc/_core"
], function (declare, array, lang, aspect, domClass, domConstruct, domStyle, on, query, topic, _WidgetBase, _LayoutWidget, Button, DropDownButton, registry, MenuItem, ReviewPane, CheckList, Label, StringUtil, core) {
    var typeDef = declare('qc.design.TemplateChecker', [_WidgetBase, _LayoutWidget, ReviewPane], {
        issues: null,
        issueFilter: null,
        filterChecklist: null,
        sortProperty: 'type',
        sortOrder: 1,
        statsNode: null,

        startup: function() {
            if (!this._started) {
                domClass.add(this.domNode, 'qcTemplateChecker');
                domClass.add(this.domNode, 'ic16');
                on(this.domNode, 'click', lang.hitch(this, this.onClick));

                this.filterChecklist = new CheckList();
                aspect.after(this.filterChecklist, 'onChange', lang.hitch(this, this.onFilterChecklistChanged));
                domStyle.set(this.filterChecklist.domNode, { padding: '6px', border: '1px #999999 solid' });

                topic.subscribe('/qc/DocumentLoaded', lang.hitch(this, this.clear));

                this.inherited(arguments);
            }
        },

        _initTable: function() {
            var table = domConstruct.place('<table></table>', this.domNode);
            var header = table.insertRow(-1);
            domClass.add(header, 'header');

            var cell = null;
            cell = header.insertCell(-1);
            domClass.add(cell, 'level')
            cell.innerHTML = '<span class="innerLabel"></span>';
            cell.setAttribute('data-sort-property', 'level');

            cell = header.insertCell(-1);
            cell.innerHTML = '<span class="innerLabel">Issue</span>';
            domClass.add(cell, 'type sort')
            cell.setAttribute('data-sort-property', 'type');

            cell = header.insertCell(-1);
            domClass.add(cell, 'description');
            cell.innerHTML = '<span class="innerLabel">Description</span>';
            cell.setAttribute('data-sort-property', 'description');

            cell = header.insertCell(-1);
            domClass.add(cell, 'elementName');
            cell.innerHTML = '<span class="innerLabel">Element</span>';
            cell.setAttribute('data-sort-property', 'elementName');
            this.table = table;
            
            return table;
        },

        getToolbarItems: function () {
            var list = [];

            var label = new Label({ 'text': 'Template Checker' });
            domStyle.set(label.domNode, { fontWeight: 'bold', marginLeft: '4px', marginRight: '12px' , marginTop:'2px'});
            list.push(label);

            var calcButton = new Button({
                label: 'Refresh',
                showLabel: true,
                onClick: lang.hitch(this, function () { this.calculate() })
            });
            list.push(calcButton);

            this.filterButton = new DropDownButton({
                label: 'Filter',
                showLabel: true,
                dropDown: this.filterChecklist,
                disabled: true
            });
            list.push(this.filterButton);

            return list;
        },

        show: function () {
            this.calculate();
        },

        hide: function () {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, function (h) { h.remove() });
                this.subscriptions = null;
            };
            this.clear();
        },

        onNoteChanged: function () {
            this.calculate();
        },

        selectNoteElements: function (elements) {
            var element = elements instanceof Array ? elements[0] : elements;
            if (!element || !element.domNode) {
                return;
            };

            var editor = core.getNoteEditor();
            editor.select(element);
            editor.ensureVisible(element.domNode);

            var wizard = core.ancestorWidgetByClass(element.domNode, 'qcWizard');

            if (wizard) {
                if (domClass.contains(element.domNode, 'page')) {
                    wizard.selectPage(element.pageId);
                }
                else {
                    var page = core.ancestorWidgetByClass(element.domNode, 'page', false);
                    if (page && page.pageId) {
                        wizard.showPage(page.pageId);
                    }
                }
            };

            if (domClass.contains(element.domNode, 'finding')) {
                var table = core.ancestorWidgetByClass(element.domNode, 'qcFindingTable');
                if (table) {
                    table._cmdShowData();
                }
            };

            //topic.publish("/noteEditor/SelectionChanged");
        },

        onClick: function (evt) {
            var cell = core.ancestorNodeByTagName(evt.target, 'td', true);
            var row = core.ancestorNodeByTagName(evt.target, 'tr', true);

            if (domClass.contains(evt.target, 'noteLink')) {
                var id = evt.target.getAttribute('data-widget-id');
                if (id) {
                    var widget = registry.byId(id);
                    if (widget) {
                        this.selectNoteElements(widget);
                    };
                }
                else {
                    if (row) {
                        if (row.issue && row.issue.noteRef) {
                            this.selectNoteElements(row.issue.noteRef);
                        };
                    };
                };
                return;
            };

            if (row && cell && domClass.contains(row, 'header')) {
                if (domClass.contains(cell, 'sort')) {
                    if (domClass.contains(cell, 'desc')) {
                        domClass.remove(cell, 'desc');
                        this.sortOrder = 1;
                    }
                    else {
                        domClass.add(cell, 'desc');
                        this.sortOrder = -1;
                    };
                    this.sortProperty = cell.getAttribute('data-sort-property');
                }
                else {
                    query('.sort', row).removeClass('sort');
                    domClass.add(cell, 'sort');
                    domClass.remove(cell, 'desc');
                    this.sortProperty = cell.getAttribute('data-sort-property');
                    this.sortOrder = 1;
                };
                this.render();
                return;
            };
        },

        onFilterChecklistChanged: function () {
            var filter = this.issueFilter || {};
            this.filterChecklist.getItems().forEach(function (item) {
                filter[item.id] = item.checked;
            });
            this.issueFilter = filter;
            this.render();
        },

        calculate: function () {
            this.issues = this.getIssues();
            this.render()
        },

        clear: function () {
            var table = this.table;
            if (table) {
                var r = table.rows.length - 1;
                while (r > 0) {
                    table.deleteRow(r);
                    r--;
                };
            };
        },

        render: function () {
            var table = this.table || this._initTable();
            this.clear();

            var filter = this.issueFilter || null;
            var list = this.issues || [];

            var issues = filter ? list.filter(function (x) { return filter[x.type] !== false }) : list;
            filter = filter || {};

            if (this.contentNode) {
                domConstruct.destroy(this.contentNode);
            };

            issues.forEach(function (x) {
                if (!x.elementName) {
                    var topRef = x.noteRef ? x.noteRef instanceof Array ? x.noteRef[0] : x.noteRef : null;
                    if (topRef) {
                        var nameText = topRef.name || topRef.get('text') || topRef.id || '';
                        x.elementName = nameText.length > 30 ? nameText.substr(0, 30) + '&hellip;' : nameText;
                    }
                }
            });

            var props = ['level', 'type', 'description', 'elementName'];
            var sortProperty = this.sortProperty || 'type';
            var sortOrder = this.sortOrder || 1;
            issues.sort(function (a, b) {
                var n = (a.sort || 0) - (b.sort || 0);
                if (n != 0) {
                    return n;
                };
                n = StringUtil.compare(a[sortProperty], b[sortProperty]) * sortOrder;
                if (n == 0) {
                    var i = 0;
                    while (n == 0 && i < props.length) {
                        if (props[i] != sortProperty) {
                            n = StringUtil.compare(a[props[i]], b[props[i]]);
                        };
                        i++;
                    }
                };
                return n;
            });

            var getIconClass = function (level) {
                switch (level) {
                    case 'ok':
                        return 'check';
                    case 'info':
                        return 'information2';
                    case 'warning':
                        return 'sign_warning';
                    case 'error':
                        return 'error';
                    default:
                        return '';
                };
            };


            var addRow = function (issue, i) {
                var topRef = issue.noteRef ? issue.noteRef instanceof Array ? issue.noteRef[0] : issue.noteRef : null;
                var row = table.insertRow(-1);
                domClass.add(row, i % 2 == 0 ? 'even' : 'odd');
                row.issue = issue;
                var cell = null;

                cell = row.insertCell(-1);
                domClass.add(cell, 'level');
                cell.innerHTML = '<div class="icon ' + getIconClass(issue.level) + '" title="' + issue.level + '"></div>';

                cell = row.insertCell(-1);
                domClass.add(cell, 'type');
                cell.innerHTML = issue.type || '';

                cell = row.insertCell(-1);
                domClass.add(cell, 'description');
                cell.innerHTML = issue.description || '';

                cell = row.insertCell(-1);
                domClass.add(cell, 'elementName');
                if (issue.elementName) {
                    cell.innerHTML = '<span class="noteLink">' + issue.elementName + '</span>';
                };

                if (filter[issue.type] == undefined) {
                    filter[issue.type] = true;
                };

                return row;
            };

            issues.forEach(addRow);

            this.filterChecklist.clear();
            var typeCount = 0;
            for (var name in filter) {
                this.filterChecklist.addItem(name, name, filter[name]);
                typeCount++;
            };
            this.filterButton.set('disabled', typeCount == 0);

            this.renderStats();
        },

        getIssues: function() {
            //var issue = {
            //    level: '',
            //    type: '',
            //    description:'',
            //    elementName: '',
            //    noteRef: widget
            //}

            var checkFunctions = [];
            for (var p in this) {
                if (/^\_check/.test(p)) {
                    checkFunctions.push(lang.hitch(this, this[p]));
                };
            };

            var issues = [];
            var editor = core.getNoteEditor();
            checkFunctions.forEach(function (checkFn) {
                var items = checkFn(editor);
                if (items && items.length > 0) {
                    issues = issues.concat(items);
                };
            });

            if (issues.length == 0) {
                issues.push({ level: 'ok', type: 'OK', description: 'No issues found in template' });
            }
            return issues;
        },

        _check_elementNames: function(editor) {
            var issues = [];
            var reName = /^[A-Z][A-Za-z0-9\_]*$/;
            var reAutoName = /^M[\d\_]+$/;
            var list = query('.noteElement', editor.domNode).map(registry.byNode).filter(function (x) { return x.name }).sort(function (a, b) { return StringUtil.compare(a.name, b.name) });
            var dupNames = [];
            var prevItems = [];

            list.forEach(function (item) {
                if (!reName.test(item.name)) {
                    issues.push({ level: 'error', type: 'Invalid Name', elementName: item.name, noteRef: item, description: 'Names must begin with an uppercase letter, and can contain only letters, numbers and underscores.' });
                };

                // ignoring auto-name here - will check if an auto-named element is used in an expression
                //else if (reAutoName.test(item.name)) {
                //    issues.push({ level: 'warning', type: 'Auto-named Element', elementName: item.name, noteRef: item, description: 'It is recommended that you give elements meaningful names to help with future maintenance and debugging.' });
                //};

                if (prevItems.length > 0) {
                    if (prevItems[0].name == item.name) {
                        prevItems.push(item);
                    }
                    else {
                        if (prevItems.length > 1) {
                            issues.push({
                                level: 'error',
                                type: 'Duplicate Names',
                                elementName: prevItems[0].name,
                                noteRef: prevItems,
                                description: 'The following elements have the same name: ' + prevItems.map(function (x) { return '<span class="noteLink" data-widget-id="' + x.id + '">' + x.id + '</span>' }).join(', ')
                            });
                        };
                        prevItems = [item];
                    }
                }
                else {
                    prevItems.push(item);
                };

            });

            if (prevItems.length > 1) {
                issues.push({
                    level: 'error',
                    type: 'Duplicate Names',
                    elementName: prevItems[0].name,
                    noteRef: prevItems,
                    description: 'The following elements have the same name: ' + prevItems.map(function (x) { return '<span class="noteLink" data-widget-id="' + x.id + '">' + x.id + '</span>' }).join(', ')
                });
            };

            return issues;
        },

        _check_enteredFindings: function (editor) {
            var list = [];
            query('.finding', editor.domNode).map(registry.byNode).filter(function (x) { return x.get('result') }).forEach(function (y) {
                var text = y.name || y.get('text') || y.id;
                if (text.length > 30) {
                    text = text.substr(0, 30) + '...';
                };
                list.push({
                    level: 'warning',
                    type: 'Entered Finding',
                    elementName: text,
                    description: 'Finding has its result property set, it will automatically be recorded as entered when used in a note.',
                    noteRef: y
                });
            });
            return list;
        },

        _check_checkedStateButtons: function(editor) {
            var list = [];
            query('.qcStateButton', editor.domNode).map(registry.byNode).filter(function (x) { return x.get('value') }).forEach(function (y) {
                var text = y.name || y.get('text') || y.id;
                if (text.length > 30) {
                    text = text.substr(0, 30) + '...';
                };
                list.push({
                    level: 'warning',
                    type: 'Checked State Button',
                    elementName: text,
                    description: 'The state button has its value set to true',
                    noteRef: y
                });
            });
            return list;
        },

        _check_emptyMedcinId: function (editor) {
            var list = [];
            query('.finding', editor.domNode).map(registry.byNode).filter(function (x) { return !x.medcinId }).forEach(function (y) {
                if (domClass.contains(y.domNode, 'freeText')) {
                    //OK for free text
                }
                else if (core.ancestorNodeByClass(y.domNode, 'qcFindingTable')) {
                    //skip table findings for now
                }
                else {
                    list.push({
                        level: 'error',
                        type: 'Missing MedcinId',
                        elementName: y.name || y.get('text'),
                        description: 'Finding has an empty or zero MedcinId',
                        noteRef: y
                    });
                };
            });
            return list;
        },

        _ignore_check_MissingFormHiddenEntry: function(editor) {
            var list = [];
            query('.form .finding', editor.domNode).map(registry.byNode).filter(function (x) { return !x.medcinId }).forEach(function (y) {
                if (!domClass.contains(y.domNode, 'hiddenEntry')) {
                    list.push({
                        level: 'warning',
                        type: 'Missing MedcinId',
                        elementName: y.name || y.get('text'),
                        description: 'Form finding with no MedcinId and not marked as a "hiddenEntry".  The finding result will not be remembered when re-opening the form.',
                        noteRef: y
                    });
                };
            });
            return list;
        },

        // Checks for valid expression
        _check_expressions: function (editor) {
            var issues = [];

            var bindingName = function (binding) {
                return binding.bindingType ? binding.bindingType == 'styleClass' ? 'conditional style' : binding.bindingType + ' binding' : 'binding';
            };

            var ignoreRefs = /^(Patient|Encounter|Provider|Owner)$/;
            var reAutoName = /^M[\d\_]+$/;

            query('.noteElement', editor.domNode).map(registry.byNode).forEach(function (element) {
                if (element.bindings) {
                    element.bindings.forEach(function (binding) {
                        var addIssue = function (description, level, type) {
                            issues.push({ level: level || 'error', type: type || 'Expression Error', noteRef: element, description: description });
                        };

                        var bName = bindingName(binding);
                        if (!binding.bindTo) {
                            addIssue(bName + " doesn't bind to anything");
                        }
                        else if (!binding.expression) {
                            addIssue('Missing expression on ' + bName);
                        }
                        else {
                            if (binding.compile()) {
                                if (binding.references) {
                                    if (binding.resolveReferences) {
                                        for (var refName in binding.references) {
                                            if (reAutoName.test(refName)) {
                                                addIssue("Found auto-generated name, " + refName + ", in " + bName + ".  This will make future maintenance difficult.", 'warning', 'Auto-named Element');
                                            }
                                        }
                                    }
                                    else {
                                        for (var refName in binding.references) {
                                            if (!ignoreRefs.test(refName) && !binding.references[refName].target) {
                                                addIssue("Can't find referenced element " + refName + " in " + bName, 'warning', 'Missing Reference');
                                            }
                                        }
                                    }
                                };
                            }
                            else {
                                addIssue('Unabled to compile ' + bName);
                            }
                        };

                    });
                }
            });
            return issues;
        },

        // Checks for the style class "mergeAsIs" contained within another "mergeAsIs"
        _check_NestedMergeAsIs: function (editor) {
            var issues = [];

            query('.mergeAsIs', editor.note.domNode).forEach(function (parent) {
                query('.mergeAsIs', parent).map(registry.byNode).forEach(function (child) {
                    issues.push({ level: 'warning', type: 'Nested "mergeAsIs"', noteRef: child, description: "The element and one of its ancestor elements has the 'mergeAsIs' style class.  Only the top level 'mergeAsIs' element will be respected."});
                });
            });
            return issues;
        },

        // Checks for elements that have multiple property binding expressions to the same property
        _check_RedundantPropertyBinding: function (editor) {
            var issues = [];
            query('.noteElement').map(registry.byNode).filter(function (x) { return x.bindings && x.bindings.length > 1 }).forEach(function (element) {
                var names = element.bindings.filter(function (x) { return x.bindingType == 'property' }).map(function (y) { return y.bindTo }).sort();
                var current = '';
                var count = 0;
                names.forEach(function (name) {
                    if (name == current) {
                        count++;
                    }
                    else {
                        if (count > 1) {
                            issues.push({ level: 'warning', type: 'Redundant Property Binding', noteRef: element, description: 'There are multiple bindings to the "' + current + '" property.  Only the last property binding will have any effect.' });
                        };
                        count = 1;
                        current = name;
                    }
                });
                if (count > 1) {
                    issues.push({ level: 'warning', type: 'Redundant Property Binding', noteRef: element, description: 'There are multiple bindings to the "' + current + '" property.  Only the last property binding will have any effect.' });
                };
            });
            return issues;
        },

        // Checks for elements that have multiple property conditional style expressions to the same property
        _check_RedundantConditionalStyles: function (editor) {
            var issues = [];
            query('.noteElement').map(registry.byNode).filter(function (x) { return x.bindings && x.bindings.length > 1 }).forEach(function (element) {
                var names = element.bindings.filter(function (x) { return x.bindingType == 'styleClass' }).map(function (y) { return y.bindTo }).sort();
                var current = '';
                var count = 0;
                names.forEach(function (name) {
                    if (name == current) {
                        count++;
                    }
                    else {
                        if (count > 1) {
                            issues.push({ level: 'warning', type: 'Redundant Conditional Style', noteRef: element, description: 'There are conditional style expression for the  "' + current + '" style.  Only the last expression will have any effect.' });
                        };
                        count = 1;
                        current = name;
                    }
                });
                if (count > 1) {
                    issues.push({ level: 'warning', type: 'Redundant Conditional Style', noteRef: element, description: 'There are conditional style expression for the  "' + current + '" style.  Only the last expression will have any effect.' });
                };
            });
            return issues;
        },

        renderStats: function (editor) {
            var total = {
                elements: 0,
                containers: 0,
                findings: 0,
                propertyBindings: 0,
                conditionalStyles: 0,
                deferrable: 0
            };

            query('.noteElement').map(registry.byNode).forEach(function (element) {
                total.elements++;
                if (domClass.contains(element.domNode, 'part')) {
                    total.containers++;
                };
                if (domClass.contains(element.domNode, 'finding')) {
                    total.findings++;
                };
                if (element.canDeferLoad && element.canDeferLoad()) {
                    total.deferrable++;
                };
                if (element.bindings && element.bindings.length > 0) {
                    element.bindings.forEach(function (binding) {
                        if (binding.bindingType == 'property') {
                            total.propertyBindings++;
                        }
                        else if (binding.bindingType == 'styleClass') {
                            total.conditionalStyles++;
                        }
                    });
                };
            });

            if (!this.statsNode) {
                this.statsNode = domConstruct.place('<div class="stats"></div>', this.domNode);
            };

            var htm = '<div class="header">Document Stats</div>';
            htm += '<table>';
            for (var name in total) {
                htm += '<tr><td>' + name + '</td><td>' + total[name] + '</td></tr>';
            }
            htm += '</table>';

            this.statsNode.innerHTML = htm;
        }
    });

    return typeDef;
});
