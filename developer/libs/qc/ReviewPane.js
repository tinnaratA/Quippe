define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style"
], function (declare, lang, domConstruct, domGeometry, domStyle) {
    return declare("qc.ReviewPane", [], {
        hLoadingIndicator: null,
        hLoadingIndicatorTimeout: null,
    
        show: function () {
        },
    
        hide: function () {
        },
    
        getToolbarItems: function () {
            return [];
        },
    
        beginLoading: function (message, delay, timeout) {
            if (this.hLoadingIndicator) {
                return;
            }
    
            if (this.loadingIndicator) {
                return;
            };
    
            delay = delay || 500;
            timeout = timeout || 5000;
    
            this.hLoadingIndicator = setTimeout(lang.hitch(this, function () {
                this.loadingIndicator = domConstruct.place('<div class="loadingIndicator">' + (message || 'Loading...') + '</div>', this.domNode);
                var posContainer = domGeometry.position(this.domNode);
                var posNode = domGeometry.position(this.loadingIndicator);
                domStyle.set(this.loadingIndicator, { display: 'block', left: (posContainer.w / 2 - posNode.w / 2) + 'px', top: (posContainer.h / 2 - posNode.h / 2) + 'px' });
                this.hLoadingIndicatorTimeout = setTimeout(lang.hitch(this, this.endLoading), timeout);
            }), delay);
    
        },
    
        endLoading: function () {
            if (this.loadingIndicator) {
                domConstruct.destroy(this.loadingIndicator);
                this.loadingIndicator = null;
            };
            if (this.hLoadingIndicator) {
                clearTimeout(this.hLoadingIndicator);
            };
            if (this.hLoadingIndicatorTimeout) {
                clearTimeout(this.hLoadingIndicatorTimeout);
            };
        }
    
    });
});