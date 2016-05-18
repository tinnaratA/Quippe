define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/query",
    "qc/_core",
    "qc/note/Wizard",
    "dojo/text!qc/note/templates/TabbedDialog.htm"
], function (declare, array, lang, domClass, domConstruct, domGeometry, domStyle, query, core, Wizard, templateText) {
    var typeDef = declare('qc.note.TabbedDialog', [Wizard], {
        templateString: templateText,



        checkState: function (viewMode) {
            viewMode = viewMode || this.getViewMode();

            var incomplete = query('.incomplete', this.domNode).filter(function (x) { return !core.ancestorNodeByClass(x, 'hidden', true) }).length > 0;
            this.button1.set('disabled', incomplete);

            this.renderTabs(viewMode);
        },

        renderTabs: function (viewMode) {
            var showAll = (viewMode == 'design');
            var x = 8;
            var tabStrip = this.tabStripNode;
            tabStrip.innerHTML = '';
            this.getAllPages().forEach(function (page, i) {
                if (showAll || !domClass.contains(page.domNode, 'hidden')) {
                    var isActive = domClass.contains(page.domNode, 'active');
                    var htm = '<div class="tabButton ';
                    htm += (isActive ? 'activeTab' : '');
                    htm += '" ';
                    htm += 'style="left:' + x + 'px;" ';
                    htm += 'data-page-id="' + page.pageId + '">'
                    htm += page.get('text');
                    htm += '</div>';
                    var button = domConstruct.place(htm, tabStrip);
                    x += (domGeometry.position(button).w + 2);
                };
            });
        },

        updateTitle: function() {
        },

        onTabClick: function (evt) {
            var button = core.ancestorNodeByClass(evt.target, 'tabButton', true);
            if (button) {
                var pageId = button.getAttribute('data-page-id');
                if (pageId) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.selectPage(pageId);
                };
            };
        },

        writeNoteAttributes: function (writer, mode) {
            writer.attribute('Type', 'qc.note.TabbedDialog');
            this.inherited(arguments);
        }

    });

    core.settings.noteElementClasses["qc/note/TabbedDialog"] = typeDef;
    return typeDef;
});