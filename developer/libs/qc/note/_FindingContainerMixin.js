define([
    "dijit/_Container",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/query",
    "dojo/topic",
    "dojo/dom-class"
], function (_Container, _WidgetBase, registry, array, declare, query, topic, domClass) {
    return declare("qc.note._FindingContainerMixin", [_WidgetBase], {
        isContainer: true,
    
            hasFindings: function () {
                return (query(".finding", this.containerNode).length > 0);
            },
    
            hasEntries: function () {
                return (query(".entry", this.containerNode).length > 0)
                    || (query(".citedEntry", this.containerNode).length > 0)
                    || (query(".externalEntry", this.containerNode).length > 0)
                    || query('.freeText', this.containerNode).map(registry.byNode).some(function (freeText) { return freeText.hasContent(); });
            },
    
            clearNonEntries: function () {
                this.clearFindings(true);
            },

            //clearNonEntries: function () {
            //    query(".finding", this.containerNode)
            //        .map(registry.byNode)
            //        .filter(function (i) { return (i.get('result') || null) == null })
            //        .forEach(function (w) {
            //            w.destroyRecursive();
            //        }
            //    );
            //    this.transcribe();
            //    this.updateDisplay();
            //},
    
            clearFindings: function (keepEntries, suspendUpdate) {
                var count = 0;
                this.getChildNoteElements().forEach(function (child) {
                    if (domClass.contains(child.domNode, 'part')) {
                        count += child.clearFindings(keepEntries, true);
                    }
                    else if (domClass.contains(child.domNode, 'finding')) {
                        if (!keepEntries || !child.get('result')) {
                            child.destroyRecursive();
                            count++;
                        };
                    };
                });
                if (!suspendUpdate) {
                    this.transcribe();
                    this.updateDisplay();                    
                };
                if (count > 0) {
                    topic.publish('/noteEditor/findingsRemoved');
                };
                return count;
            }

            //clearFindings: function () {
            //    var list = [];
            //    query(".finding", this.containerNode)
            //        .map(registry.byNode)
            //        .forEach(function (w) {
            //            list.push(w.toFinding());
            //            w.destroyRecursive();
            //        }
            //    );
            //    this.transcribe();
            //    this.updateDisplay();
            //    array.forEach(list, function (finding) {
            //        topic.publish('/noteEditor/findingRemoved', finding);
            //    });
            //}
        }
    );
});