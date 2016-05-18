define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "qc/note/Section"
], function (declare, lang, domClass, domConstruct, Section) {
    var typeDef = declare('qc.note.CitationSection', [Section], {
        headerLeftNode: null,
        headerCenterNode: null,
        headerRightNode: null,

        postCreate: function () {
            domClass.add(this.domNode, 'citation sealed qcContextMenuContainer');
            domClass.add(this.containerNode, 'disabled');
            this.headerLeftNode = domConstruct.place('<div class="left"></div>', this.innerLabel);
            this.headerCenterNode = domConstruct.place('<div class="center"></div>', this.innerLabel);
            this.headerRightNode = domConstruct.place('<div class="right"></div>', this.innerLabel);
            this.inherited(arguments);
        },

        _getHeaderLeftAttr: function () {
            return this.headerLeftNode.innerHTML;
        },
        _setHeaderLeftAttr: function (value) {
            this.headerLeftNode.innerHTML = value;
        },

        _getHeaderCenterAttr: function () {
            return this.headerCenterNode.innerHTML;
        },
        _setHeaderCenterAttr: function (value) {
            this.headerCenterNode.innerHTML = value;
        },

        _getHeaderRightAttr: function () {
            return this.headerRightNode.innerHTML;
        },
        _setHeaderRightAttr: function (value) {
            this.headerRightNode.innerHTML = value;
        },

        dropDelete: function () {
            this.destroyRecursive();
        },

        getContextActions: function (item, widget, targetNode) {
            return [
                { label: 'Delete Citation', icon: 'delete', onClick: lang.hitch(this, this.dropDelete) }
            ];
        }

    });

    return typeDef;
});