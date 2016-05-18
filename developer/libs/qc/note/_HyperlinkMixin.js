define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/query"
], function (declare, domConstruct, query) {
    return declare("qc.note._HyperlinkMixin", [], {
        _hyperlinkHref: '',
        _hyperlinkText: '',
        _hyperlinkNode: null,
        _hyperlinkParent: null,
        _hyperlinkTarget: '_self',
    
        _getHyperlinkHrefAttr: function (value) {
            return this._hyperlinkHref;
        },
    
        _setHyperlinkHrefAttr: function (value) {
            if (value != this._hyperlinkHref) {
                this._hyperlinkHref = value;
                this.updateHyperlinkHref();
            }
        },
    
        _getHyperlinkTextAttr: function () {
            return this._hyperlinkText;
        },
    
        _setHyperlinkTextAttr: function (value) {
            if (value != this._hyperlinkText) {
                this._hyperlinkText = value;
                this.updateHyperlinkText();
            }
        },
    
        _getHyperlinkTargetAttr: function () {
            return this._hyperlinkTarget;
        },
    
        _setHyperlinkTargetAttr: function (value) {
            if (value != this._hyperlinkTarget) {
                this._hyperlinkTarget = value;
                this.updateHyperlinkTarget();
            }
        },
    
        updateHyperlinkText: function () {
            if (this.ensureHyperlinkNode()) {
                this._hyperlinkNode.innerHtml = this._hyperlinkText;
            }
        },
    
        updateHyperlinkHref: function () {
            if (this.ensureHyperlinkNode()) {
                this._hyperlinkNode.href = this._hyperlinkHref;
            }
        },
    
        updateHyperlinkTarget: function () {
            if (this.ensureHyperlinkNode()) {
                this._hyperlinkNode.target = this._hyperlinkTarget;
            }
        },
    
    
        ensureHyperlinkNode: function () {
    
            if (!this._hyperlinkNode && this._hyperlinkText && this._hyperlinkHref) {
                if (!this._hyperlinkParent) {
                    if (this.domNode.classList.contains('hyperlinkParent'))
                        this._hyperlinkParent = this.domNode;
                    else
                        this._hyperlinkParent = query('.hyperlinkParent', this.domNode)[0];
                }
    
                if (this._hyperlinkParent) {
                    this._hyperlinkNode = domConstruct.place('<a href="' + this._hyperlinkHref + '" target="' + this.hyperlinkTarget + '">' + this._hyperlinkText + '</a>', this._hyperlinkParent);
                }
            }
    
            return this._hyperlinkNode != null;
        }
    
    });
});