// An example template checker function.  When the TemplateChecker runs it calls any of its 
// member functions that start with "_check" passing in the current note editor instance.
// So adding a new validation routine is a matter of extending the qc/design/TemplateChecker
// module by adding a new _check... function.  The check function should return an array
// of objects with the following properties:
//
//  level       - level of error, should be info, warning, error
//  type        - cagetory name of the error, used to filter the error list
//  elementName - the name or description of the element (if any) that raised the error
//  description - description of the error
//  noteRef     - the note element widget (if any) that raised the error
//
// This example simply looks for any NoteElement widget that is using the Notation property
// with a TextBox for data entry and raises a warning.

define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/query",
    "dijit/registry",
    "qc/_core",
    "qc/design/TemplateChecker"
], function (declare, array, lang, query, registry, core, TemplateChecker) {

    lang.extend(TemplateChecker, {

        _check_warnOnUseOfNotationProperty: function (editor) {
            var list = [];
            query('.noteElement', editor.domNode).map(registry.byNode).forEach(function (widget) {
                var settings = widget.get('componentSettings');
                if (settings && typeof settings == 'object') {
                    if (settings.notation && settings.notation.visible !== 0 && settings.notation.entryType != 'label') {
                        list.push({
                            level: 'warning',
                            type: 'Notation Component',
                            elementName: widget.name || widget.get('text'),
                            description: 'Finding has a visible "notation" component',
                            noteRef: widget
                        });
                    }
                }
            });
            return list;
        }

    });

});