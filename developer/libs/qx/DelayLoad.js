define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/query",
    "dojo/topic",
    "dijit/registry",
    "qc/_core"
], function (declare, array, lang, domClass, query, topic, registry, core) {
    topic.subscribe('/qc/DocumentLoaded', function () {

        setTimeout(function () {
            //console.log('document loaded')
            var note = core.getNoteEditor().note;
            if (note && note.domNode && domClass.contains(note.domNode, 'delayLoad')) {
                query('.deferredContent').map(registry.byNode).forEach(function (x) {
                    //console.log('resovable ' + x.id);
                    setTimeout(function () {
                        if (x._resolveDeferredContent) {
                            //console.log('resolving ' + x.id);
                            x._resolveDeferredContent();
                        }
                    }, 10);
                });
            };
        }, 500);

    });
});