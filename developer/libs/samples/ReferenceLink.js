// This sample illustrates how to create and register a custom note element, in this case a list of references that can be added
// to a note document.

define([
    "dijit/MenuSeparator",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/topic",
    "qc/_core",
    "qc/MenuItem",
    "qc/note/_Element",
    "qc/note/_SelectableMixin",
    "qc/note/Section",
    "qc/design/StandardDialog"
], function (MenuSeparator, registry, array, declare, lang, aspect, domConstruct, query, topic, core, MenuItem, _Element,
             _SelectableMixin, Section, StandardDialog) {
    // Your custom note element must inherit from _Element and should also inherit from _SelectableMixin if you want the note 
    // element to be selectable in the editor
    var referenceLink = declare("samples.ReferenceLink", [_Element, _SelectableMixin], {
        // Make sure that the noteElement CSS class is attached to the root of your widget
        templateString: '<div class="samplesReferenceLink qcContextMenuContainer qcddSource noteElement" '
                  + '     data-dojo-attach-event="onclick: onClick">'
                  + '  <div style="font-weight:bold" data-dojo-attach-point="titleNode"></div>'
                  + '  <div data-dojo-attach-point="authorNode"></div>'
                  + '  <a style="display:block;" data-dojo-attach-point="urlNode" href="" target="QuippeCitation"></a>'
                  + '</div>',

        title: '',
        author: '',
        url: '',

        // The elementName property should be synced up with the name of your class
        elementName: 'ReferenceLink',

        // Getters and setters should be implemented for each property that is being serialized to the XML
        _getTitleAttr: function () {
            return this.titleNode.innerHTML;
        },

        _setTitleAttr: function (value) {
            this.titleNode.innerHTML = value;
        },

        _getAuthorAttr: function () {
            return this.authorNode.innerHTML;
        },

        _setAuthorAttr: function (value) {
            this.authorNode.innerHTML = value;
        },

        _getUrlAttr: function (value) {
            return this.urlNode.getAttribute('href');
        },

        _setUrlAttr: function (value) {
            this.urlNode.setAttribute('href', value);
            this.urlNode.innerHTML = value;
        },

        // writeNoteAttributes() is responsible for writing your element properties to the XML; there's no need to override
        // parseXmlAttributes() unless you are doing complex serialization/deserialization
        writeNoteAttributes: function(writer, mode) {
            writer.attribute('title', this.get('title'));
            writer.attribute('author', this.get('author'));
            writer.attribute('url', this.get('url'));
        },

        getContextActions: function () {
            return [
                {
                    label: 'Edit Reference...', onClick: lang.hitch(this, this.onEditReference)
                }
            ];
        },

        // We show a dialog allowing the user to edit the reference properties when the reference is created or when the user
        // right-clicks on the reference and selects "Edit Reference..."
        onEditReference: function () {
            var htm = '<table style="width:300px">'
            + '  <tr>'
            + '    <td>Title:</td>'
            + '    <td><input type="text" class="refTitle" value="' + this.get('title') + '"/>'
            + '  </tr>'
            + '  <tr>'
            + '    <td>Authors:</td>'
            + '    <td><input type="text" class="refAuthor" value="' + this.get('author') + '"/>'
            + '  </tr>'
            + '  <tr>'
            + '    <td>URL:</td>'
            + '    <td><input type="text" class="refURL" value="' + this.get('url') + '"/>'
            + '  </tr>'
            + '</table>';

            var dialog = new StandardDialog({
                 title: 'Edit Reference'
            });

            dialog.set('content', htm);

            var self = this;

            var hOk = aspect.after(dialog, 'onExecute', function () {
                hOk.remove();
                hCancel.remove();
                self.set('title', query('.refTitle', dialog.domNode)[0].value || '');
                self.set('author', query('.refAuthor', dialog.domNode)[0].value || '');
                self.set('url', query('.refURL', dialog.domNode)[0].value || '');
                domConstruct.destroy(dialog);
            });

            var hCancel = aspect.after(dialog, 'onCancel', function () {
                hOk.remove();
                hCancel.remove();
                domConstruct.destroy(dialog);
            });

            dialog.show();
        },

        onClick: function () {
            if (this.get('title') == '' || this.get('title') == 'Reference...') {
                this.onEditReference();
            };
        },

        // _pgGetProperties() will return a list of properties for the element when the user is in designer mode.  If you want
        // to display a combo box for a property that displays the list of allowed values, you can add an options item to the 
        // hash for that property in the form "[first item value=first item text;second item value=second item text;...]"
        _pgGetProperties: function () {
            return [
                { name: 'title' },
                { name: 'author', caption: 'Authors' },
                { name: 'url', caption: 'URL' }
            ];
        }
    });

    var hLoad = topic.subscribe('/qc/WorkspaceReset', function () {
        hLoad.remove();

        // Add CSS for the references section
        var css = [];
        css.push('.note .section.referencesSection { border-top: 3px #000000 solid; }');
        css.push('.note .section.referencesSection .sectionHeader { color: #000000 }');
        css.push('.samplesReferenceLink { margin:6px 0px 6px 0px; }');

        var styleNode = domConstruct.create('style');
        styleNode.setAttribute('type', 'text/css');
        styleNode.innerHTML = css.join('\n');

        domConstruct.place(styleNode, document.getElementsByTagName('head')[0]);

        // Add an item to the Tools menu
        if (core.app && core.app.toolbar) {
            var toolsButton = array.filter(core.app.toolbar.getChildren(), function (x) { return x.get('label') == 'Tools' })[0];

            if (toolsButton && toolsButton.dropDown) {
                toolsButton.dropDown.addChild(new MenuSeparator());

                var menuItem = new MenuItem({
                    label: 'Add reference...',
                    showLabel: true,
                    onClick: function () {
                        var newLink = new referenceLink();

                        var editor = query('.qcNoteEditor').map(registry.byNode)[0];
                        var note = editor.note;
                        var referencesSection = query('.referencesSection', note.domNode).map(registry.byNode)[0] || null;

                        // Create the references container section if it doesn't already exist
                        if (!referencesSection) {
                            referencesSection = new Section({ text: 'References', styleClass: 'referencesSection', showEmpty: true });
                            referencesSection.startup();
                            referencesSection.placeAt(note.containerNode);
                        };

                        // Add the reference to the end of the section and open up its editor dialog
                        newLink.placeAt(referencesSection.containerNode);
                        newLink.onEditReference();
                    }
                });

                toolsButton.dropDown.addChild(menuItem);
            };
        };
    });

    // Register the note element class with the note deserializer. The string index to noteElementClasses should always start
    // with "qc/note/" and be followed by the value that you chose for your elementName property.
    core.settings.noteElementClasses["qc/note/ReferenceLink"] = referenceLink;

    return referenceLink;
});