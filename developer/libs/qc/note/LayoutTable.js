define([
    "qc/note/LayoutTable/_LayoutTable",
    "dijit/registry",
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/topic"
], function (_LayoutTable, registry, declare, domClass, domConstruct, query, topic) {
    return declare("qc.note.LayoutTable", [_LayoutTable], {
            elementName: 'LayoutTable',
    
            getItem: function (node) {
                return { type: 'group', text: 'Layout Table', node: this.domNode };
            },
    
            getDropAction: function (source, evt) {
                switch (source.type || 'unknown') {
                    case 'finding':
                        return 'move';
                    case 'term':
                        return 'add';
                    default:
                        return null;
                };
            },
    
            getDropPlacement: function (evt) {
                if (domClass.contains(evt.target, 'cell')) {
                    return { node: evt.target, pos: "last" };
                }
                else if (domClass.contains(evt.target, 'row')) {
                    return { node: query('>.cell', evt.target)[0] || null, pos: "last" };
                }
                else {
                    return { node: query('.cell', this.domNode)[0] || null, pos: "last" };
                }
            },
    
            doDrop: function (source, evt) {
                p = this.getDropPlacement(evt);
                switch (source.type || 'unknown') {
                    case 'finding':
                        var sourceFinding = registry.byNode(source.node);
                        sourceFinding.moveTo(p.node, p.pos);
                        break;
                    case 'term':
                        topic.publish("/qc/AddToNote", source, p.node, p.pos);
                        break;
                    default:
                        break;
                };
            },

            _pgPropDef_rows: function () {
                return { name: 'rows', type: 'integer' };
            },

            _pgPropDef_cols: function () {
                return { name: 'cols', type: 'integer' };
            }
        }
    );
});