define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/query",
    "dojo/topic",
    "dojo/when",
    "dijit/registry",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Button",
    "qc/_core",
    "qc/Dialog",
    "qc/note/_Element",
    "qc/note/_SelectableMixin",
    "qc/note/_Group",
    "qc/note/Document",
    "qc/StringUtil",
    "qc/XmlUtil",
    "qc/note/Form",
    "qc/note/_FormPage",
    "qc/design/ObjectListEditorDialog",
    "dojo/text!qc/note/templates/Wizard.htm"
], function (declare, array, lang, domConstruct, domClass, domStyle, query, topic, when, registry, _WidgetsInTemplateMixin, Button, core, Dialog, _Element, _SelectableMixin, _Group, Document, StringUtil, XmlUtil, Form, _FormPage, ObjectListEditorDialog, templateText) {
    var TypeDef = declare("qc.note.Wizard", [Form], {
        templateString: templateText,
        pageIdNumber: 0,

        startup: function() {
            if (!this._started) {
                this.inherited(arguments);
                this.checkState();
            };
        },

        newPageId: function () {
            this.pageIdNumber++;
            return 'P' + this.pageIdNumber;
        },

        randomColor: function () {
            return 'RGB('
                + Math.floor(Math.random() * 255)
                + ','
                + Math.floor(Math.random() * 255)
                + ','
                + Math.floor(Math.random() * 255)
                + ')';
        },

        _getPagesAttr: function() {
            return this.getAllPages().map(function (x) { return x.get('name') });
        },

        getAllPages: function () {
            return query('.page', this.domNode).map(registry.byNode);
        },

        getPage: function (id) {
            return this.getAllPages().filter(function (x) { return x.pageId == id })[0];
        },

        getSelectedPage: function () {
            return this.getAllPages().filter(function (x) { return domClass.contains(x.domNode, 'active') })[0];
        },

        getVisiblePages: function () {
            return this.getAllPages().filter(function (x) { return !domClass.contains(x.domNode, 'hidden') });
        },

        selectPage: function (id) {
            var target = this.showPage(id);
            if (target && this.getViewMode() == 'design') {
                target.setSelected(true, true);
            };
        },

        updateDisplay: function (viewMode) {
            if (viewMode != 'design') {
                var page = this.getSelectedPage();
                if (!page || domClass.contains(page.domNode, 'hidden')) {
                    this.selectFirstPage();
                };
            };
            this.inherited(arguments);
        },

        showPage: function(id) {
            var target = this.getPage(id);
            if (target) {
                if (target._resolveDeferredContent) {
                    target._resolveDeferredContent();
                };
                var current = this.getSelectedPage();
                if (current) {
                    if (current.pageId != target.pageId) {
                        domClass.remove(current.domNode, 'active');
                        domClass.add(target.domNode, 'active');
                    };
                }
                else {
                    domClass.add(target.domNode, 'active');
                };
                this.updateTitle(target);

                target.updateDisplay();
            }
            else {
                this.updateTitle();
            };
            this.checkState();
            return target;
        },

        updateTitle: function (currentPage) {
            currentPage = currentPage || this.getSelectedPage();
            var titleParts = [];
            if (this.get('title')) {
                titleParts.push(this.title);
            };
            if (currentPage && currentPage.get('text')) {
                titleParts.push(currentPage.get('text'));
            };
            this.titleNode.innerHTML = titleParts.join(' - ');
        },

        addPage: function (page) {
            var page = page || new _FormPage();
            page.owner = this;
            page.pageId = this.newPageId();
            //domStyle.set(page.domNode, { width: '100%', height: '100%', display: 'none', backgroundColor: this.randomColor() });
            page.placeAt(this.containerNode);
            return page;
        },

        removePage: function (id) {
            var page = this.getPage(id);
            if (page) {
                page.destroyRecursive();
            };
        },

        moveUp: function (id) {
            var page = this.getPage(id);
            var prevPage = page.domNode.previousSibling;
            if (prevPage) {
                page.placeAt(prevPage, 'before');
            };
        },

        moveDown: function (id) {
            var page = this.getPage(id);
            var nextPage = page.domNode.nextSibling;
            if (nextPage) {
                page.placeAt(nextPage, 'after');
            };
        },

        getNextPage: function (viewMode) {
            var designMode = ((viewMode || this.getViewMode()) == 'design');
            var current = this.getSelectedPage();
            var nextNode = current ? current.domNode.nextElementSibling : query('.page', this.domNode)[0];
            if (!designMode) {
                while (nextNode && domClass.contains(nextNode, 'hidden')) {
                    nextNode = nextNode.nextElementSibling;
                };
            }
            return nextNode ? registry.byNode(nextNode) : null;
        },

        showNextPage: function () {
            var page = this.getNextPage();
            if (page) {
                this.selectPage(page.pageId);
            };
        },

        getPrevPage: function(viewMode) {
            var designMode = ((viewMode || this.getViewMode()) == 'design');
            var current = this.getSelectedPage();
            var prevNode = current ? current.domNode.previousElementSibling : null;
            if (!designMode) {
                while (prevNode && domClass.contains(prevNode, 'hidden')) {
                    prevNode = prevNode.previousElementSibling;
                }
            }
            return prevNode ? registry.byNode(prevNode) : null;
        },

        showPrevPage: function() {
            var page = this.getPrevPage();
            if (page) {
                this.selectPage(page.pageId);
            }
        },

        addElement: function (element, relativeTo, position, suspendUpdate, sourceClass) {
            if (sourceClass) {
                domClass.add(element.domNode, sourceClass);
            };
            if (element.elementName == 'Page') {
                this.addPage(element);
            }
            else {
                var current = this.getSelectedPage();
                if (current) {
                    current.addElement(element);
                };
            }
        },

        toggleSelection: function (evt) {
            if (this.getViewMode() == 'design') {
                if (core.ancestorNodeByClass(evt.target, 'titleBar', true)) {
                    this.setSelected(!this.isSelected());
                }
                else {
                    var current = this.getSelectedPage();
                    if (current) {
                        current.setSelected(true);
                    }
                }
            };
        },
        
        _pgPropDef_pages: function() {
            return {
                name: 'pages',
                editorCallback: lang.hitch(this, this.onEditPages),
                type: 'object',
                formatter: lang.hitch(this, function () { return this.getAllPages().length })
            };
        },

        onEditPages: function () {
            var self = this;

            var dlg = new ObjectListEditorDialog({
                title: 'Pages',
                width: 500,
                height: 400,
                itemType: _FormPage,
                itemIcon: 'document',
                itemTextProperty: 'name'
            });

            dlg.set('itemCreator', function () {
                var pageId = self.newPageId();
                var nMax = 1;
                array.forEach(dlg.get('value'), function (page) {
                    var n = parseInt(page.get('name').substr(4), 10);
                    if (!isNaN(n) && n > nMax) {
                        nMax = n;
                    };
                    nMax++;
                });
                var page = new _FormPage({ name: 'Page' + nMax, text: 'Page ' + nMax, owner: self, pageId: pageId });
                return page;
            });

            dlg.set('value', this.getAllPages());

            
            core.showDialog(dlg, function () {
                var current = null;
                var pageList = dlg.get('value');
                if (pageList.length == 0) {
                    array.forEach(self.getAllPages(), function (p) {
                        p.destroyRecursive();
                    });
                    self.updateTitle();
                }
                else {
                    array.forEach(pageList, function (page) {
                        if (current) {
                            page.placeAt(current.domNode, 'after');
                        }
                        else {
                            page.placeAt(self.containerNode, 'first');
                        };
                        current = page;
                    });
                    while (current && current.domNode.nextSibling) {
                        if (current.domNode.nextSibling.nodeType == 1 && current.domNode.nextSibling.getAttribute('widgetid')) {
                            registry.byNode(current.domNode.nextSibling).destroyRecursive();
                        }
                        else {
                            current.domNode.nextSibling.parentNode.removeChild(current.domNode.nextSibling);
                        }
                    };
                    self.selectFirstPage();
                };
            });
        },

        parseXmlChildElements: function (widget, xmlNode, sourceClass) {
            array.forEach(XmlUtil.selectChildElements(xmlNode, 'Page'), function (xPage) {
                xPage.setAttribute('Type', 'qc.note._FormPage');
            });
            this.inherited(arguments);
            this.selectFirstPage();
        },

        writeNoteAttributes: function (writer, mode) {
            writer.attribute('Type', 'qc.note.Wizard');
            this.inherited(arguments);
        },

        checkState: function (viewMode) {
            viewMode = viewMode || this.getViewMode();

            var current = this.getSelectedPage();
            var currentIncomplete = current ? domClass.contains(current.domNode, 'incomplete') || query('.incomplete', current.domNode).filter(function (x) { return !domClass.contains(x, 'hidden') }).length > 0 : false;

            if (this.getPrevPage(viewMode)) {
                domStyle.set(this.button1.domNode, { visibility: 'visible' });
            }
            else {
                domStyle.set(this.button1.domNode, { visibility: 'hidden' });
            };

            if (this.getNextPage(viewMode)) {
                this.button2.set('label', 'Next');
                this.button2.buttonAction = 'next';
            }
            else {
                this.button2.set('label', 'Finish');
                this.button2.buttonAction = 'finish';
            };
            this.button2.set('disabled', (viewMode != 'design') && currentIncomplete)
        },

        onButton1Click: function (evt) {
            this.showPrevPage();
        },

        onButton2Click: function (evt) {
            if (this.button2.buttonAction == 'finish') {
                this.onOKClick();
            }
            else {
                this.showNextPage();
            };
        },

        onButton3Click: function (evt) {
            this.onCancelClick();
        },

        show: function () {
            this.selectFirstPage();
            this.inherited(arguments);
        },

        selectFirstPage: function () {
            var page = this.getViewMode() == 'design' ? this.getAllPages()[0] : this.getVisiblePages()[0];
            if (page) {
                this.selectPage(page.pageId);
            };
            this.navStack = [];
        },

        getDropAction: function () {
            return null;
        },

        doDrop: function () {
            return null;
        }

    });

    core.settings.noteElementClasses["qc/note/Wizard"] = TypeDef;

    return TypeDef;
});