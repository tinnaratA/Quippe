// The following is an example of adding custom properties to a Quippe note element.
//
// In this example, we want add the ability to use keyboard shortcuts to select various groups in the note.  To do this, we'll 
// add a "shortcutKey" property to the qc.note._Group widget, make that property available in the designer, and add the event 
// hooks to handle the shortcuts.

define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/topic",
    "qc/note/_Group",
    "qc/_core"
], function (declare, array, lang, on, topic, _Group, core) {
    // This hash will contain a map of keyIdentifier strings to note _Group widgets
    var keys = {};

    // The handle for the keyup event handler
    var hKeyUp = null;
    
    // The keyboard event handler.  We'll see if the pressed key is in our list of shortcut keys, and, if so, call the 
    // noteEditor's select method to select the mapped element.
    function onKeyUp(evt) {
        var id = evt.keyIdentifier || '';

        if (id && keys[id]) {
            core.getNoteEditor().select(keys[id]);
        }
    }

    // The '/qc/WorkspaceReset' topic is published when the app initially loads and whenever a new encounter is started, but 
    // before the document template is loaded.  This is a good time to clear out any existing shortcut keys that might have been
    // registered from a previous note.
    topic.subscribe('/qc/WorkspaceReset', lang.hitch(this, function () {
        keys = {};
        if (hKeyUp) {
            hKeyUp.remove();
            hKeyUp = null;
        }
    }));

    // Our property setter for the shortcut key will publish this topic.  We'll just add the key to our map and create the event 
    // handler if needed.  Note we don't create an event handler until the first shortcut key is added so that we don't take any 
    // performance hit looking at keyboard events when a note template doesn't define any shortcut keys.
    topic.subscribe('/qc/AddShortcutKey', lang.hitch(this, function (key, target) {
        keys[key] = target;

        if (!hKeyUp) {
            hKeyUp = on(window, 'keyup', onKeyUp);
        }
    }));

    // Our property setter for the shortcut key will publish this topic to remove an existing shortcut key before setting a new 
    // one.
    topic.subscribe('/qc/RemoveShortcutKey', lang.hitch(this, function (key, target) {
        delete keys[key];
    }));

    // Now we'll extend the qc.note._Group element to add the shortcutKey property.  All of  the "container" type elements - 
    // Document, Chapter, Section, Group are derived from _Group.  So extending this one widget will cover all of those.
    lang.extend(_Group, {
        // The property getter for the shortcut key
        _getShortcutKeyAttr: function() {
            return this.shortcutKey || '';
        },

        // The property setter for the shortcut key.  We'll publish the topics to remove any existing key and add the new one 
        // whenever the setter is called.
        _setShortcutKeyAttr: function (value) {
            if (this.shortcutKey) {
                topic.publish('/qc/RemoveShortcutKey', this.shortcutKey, this);
            }

            this.shortcutKey = value || '';

            if (this.shortcutKey) {
                topic.publish('/qc/AddShortcutKey', this.shortcutKey, this);
            }
        },

        // This is where the shortcut key will get serialized into the note XML.  Each note element will call writeNoteElement ->
        // writeNoteAttributes -> writeNoteChildElements to serialize itself.  We'll just call the base method, then write our 
        // attribute. We really don't need to override anything for the deserialization process for this example, since the 
        // deserialization method, parseXmlAttributes will call set(attrName, attrValue) for any attributes in the XML.
        writeNoteAttributes: function(writer) {
            this.inherited('writeNoteAttributes', arguments);
            writer.attribute('ShortcutKey', this.get('shortcutKey'), '');
        },

        // _pgGetProperties is the method called by the design mode property grid to get the designable properties for the 
        // selected object.  Adding our shortcut property here makes the property available in design mode.
        _pgGetProperties: function () {
            var list = this.inherited('_pgGetProperties', arguments);
            list.push({ name: 'shortcutKey', description: 'A keyboard shortcut to select this element', group: 'Behavior' });
            return list;
        }
    });
});