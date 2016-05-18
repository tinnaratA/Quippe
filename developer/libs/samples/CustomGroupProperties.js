dojo.provide('samples.CustomGroupProperties');

// This example adds creates a mixin class that contains three custom properties.  The mixin is then added to the
// ctui.note Chapter, Section and Group widgets.
//
// To test this example, add samples.CustomGroupProperties to the list of extensions under Tools > Options > Advanced
//

dojo.declare('samples.CustomGroupProperties._PropertyMixin', null, {
    prop1: '',
    prop2: false,
    prop3: 1,

    _pgGetProperties: function (propertyGrid) {
        var list = this.inherited(arguments);

        list.push({ name: 'prop1', group: 'Custom' });
        list.push({ name: 'prop2', type: 'boolean', group: 'Custom' });
        list.push({ name: 'prop3', options: '[1=option 1;2=option 2;3=option 3]', type: 'integer', group: 'Custom' });

        return list;
    },

    writeNoteAttributes: function (writer, mode) {
        this.inherited(arguments);
        writer.attribute('prop1', this.prop1 || '', '');
        writer.attribute('prop1', this.prop2 || false, false);
        writer.attribute('prop1', this.prop3);
    }

});


dojo.declare('samples.CustomGroupProperties.Chapter', [ctui.note.Chapter, samples.CustomGroupProperties._PropertyMixin], {});
ctui.note.Chapter = samples.CustomGroupProperties.Chapter;

dojo.declare('samples.CustomGroupProperties.Section', [ctui.note.Section, samples.CustomGroupProperties._PropertyMixin], {});
ctui.note.Section = samples.CustomGroupProperties.Section;

dojo.declare('samples.CustomGroupProperties.Group', [ctui.note.Group, samples.CustomGroupProperties._PropertyMixin], {});
ctui.note.Group = samples.CustomGroupProperties.Group;
