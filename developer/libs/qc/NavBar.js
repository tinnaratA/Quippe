define([
    "dijit/_Contained",
    "dijit/layout/ContentPane",
    "dijit/registry",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-class",
	"dojo/dom-construct",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    "qc/_core"
], function (_Contained, ContentPane, registry, declare, lang, dom, domClass, domConstruct, domStyle, on, query, topic, core) {
    return declare("qc.NavBar", [ContentPane, _Contained], {
        startup: function () {
            if (!this._started) {
                domClass.add(this.domNode, 'qcNavBar');
                domClass.add(this.domNode, 'qcddTarget');

                topic.subscribe("/qc/WorkspaceReset", lang.hitch(this, this.onWorkspaceReset));
                topic.subscribe("/qc/DocumentLoaded", lang.hitch(this, this.onDocumentLoaded));
                topic.subscribe('/noteEditor/DisplayUpdate', lang.hitch(this, this.onDisplayUpdate));
                topic.subscribe('/noteEditor/AnchorsChanged', lang.hitch(this, this.onDocumentLoaded));
                topic.subscribe('/noteEditor/SelectionChanged', lang.hitch(this, this.onSelectionChanged));

                if (window.PointerEvent) {
                    on(this.domNode, "pointerdown", lang.hitch(this, this.onMouseDown));
                }
                else if (window.MSPointerEvent) {
                    on(this.domNode, "mspointerdown", lang.hitch(this, this.onMouseDown));
                }
                else if (core.util.isTouchDevice()) {
                    on(this.domNode, "touchstart", lang.hitch(this, this.onMouseDown));
                }
                else {
                    on(this.domNode, "mousedown", lang.hitch(this, this.onMouseDown));
                };

                this.inherited(arguments);
            };
        },

        clear: function () {
            this.set('content', '');
        },

        onWorkspaceReset: function () {
            this.clear();
        },

        onDocumentLoaded: function (viewer) {
            viewer = viewer || query('.qcNoteEditor').map(registry.byNode)[0] || null;
            if (!viewer) {
                this.clear();
                return;
            };

            var htm = '';
            htm += '<table class="ic16"><tbody><tr>';
            htm += '<td class="leftNav" anchor="top"><div class="icon navigate_up leftNav"/></td>';

            var count = 0;
            query('.part', viewer.domNode).map(registry.byNode).forEach(function (part) {
                var anchorText = part.get('anchor');
                if (anchorText) {
                    htm += '<td class="center" ';
                    htm += (' anchor="' + part.get('id') + '"');
                    htm += '>';
                    htm += '<div class="anchorText">' + anchorText + '</div>';
                    htm += '</td>';
                    count += 1;
                };
            });

            htm += '<td class="rightNav" anchor="bottom"><div class="icon navigate_down" style="float:right"/></td>';
            htm += '</tr></tbody></table>';

            if (count == 0) {
                this.clear();
                domClass.add(this.domNode, 'hidden');
                domStyle.set(this.domNode, { height: '0px' });
            }
            else {
                domConstruct.place(htm, this.domNode, "only");
                domClass.remove(this.domNode, 'hidden');
            }
        },

        onDisplayUpdate: function (editor) {
            query('td', this.domNode).forEach(function (td) {
                var sectionId = td.getAttribute('anchor');
                if (sectionId && sectionId != 'top' && sectionId != 'bottom') {
                    var section = dom.byId(sectionId);
                    if (section && domStyle.get(section, 'display') != 'none') {
                        domClass.remove(td, 'disabled');
                    }
                    else {
                        domClass.add(td, 'disabled');
                    }
                }
            });
        },

        onMouseDown: function (evt) {
            var anchor = this.getAnchor(evt.target);
            if (anchor) {
                topic.publish('/noteEditor/NavigateTo', anchor, true);
            }
        },

        getAnchor: function (e) {
            if (e && !domClass.contains(e, 'disabled') && e.getAttribute) {
                var anchor = e.getAttribute('anchor');
                if (anchor) {
                    return anchor;
                }
                else {
                    if (e.parentNode && e.parentNode != this.domNode) {
                        return this.getAnchor(e.parentNode);
                    }
                }
            };
            return null;
        },

        getDropAction: function (source, evt) {
            var anchor = this.getAnchor(evt.target);
            if (anchor) {
                topic.publish('/noteEditor/NavigateTo', anchor);
                var widget = registry.byId(anchor);
                if (widget && widget.getDropAction) {
                    return widget.getDropAction(source, evt);
                }
            };
            return null;
        },

        doDrop: function (source, evt) {
            var anchor = this.getAnchor(evt.target);
            if (anchor) {
                var widget = registry.byId(anchor);
                if (widget && widget.doDrop) {
                    return widget.doDrop(source, evt);
                }
            };
            return null;
        },

        onSelectionChanged: function () {
            var anchorId = '';
            var widget = core.getNoteEditor().selection.getSelectedWidgets()[0];
            while (widget && !anchorId) {
                if (widget.get('anchor')) {
                    anchorId = widget.get('id');
                }
                else {
                    widget = widget.getContainingPart();
                };
            };

            anchorId = anchorId || '##NONE##';
            query('td', this.domNode).forEach(function (td) {
                if (td.getAttribute('anchor') == anchorId) {
                    domClass.add(td, 'active');
                }
                else {
                    domClass.remove(td, 'active');
                };
            });

        }



    });
});