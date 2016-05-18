// Building off of our earlier work setting up a custom Quippe application in CustomContextMenuApp.js, we're now going to cover
// customizing the application toolbar by adding a new top-level toolbar item as well as adding a new item to the tools submenu.

define([
    "dijit/form/DropDownButton",
    "dijit/Menu",
    "dijit/MenuItem",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/on",
    "Quippe/Application"
], function (DropDownButton, Menu, MenuItem, declare, lang, domClass, on, Application) {
    return declare("samples.CustomToolbarApp", [Application], {
        // The _initToolbar function is called during application setup to populate the main toolbar of the application.
        _initToolbar: function () {
            // Call the base class' version of the method to perform the initial setup so that we can start adding our items
            this.inherited(arguments);

            var newSubmenu = new Menu();

            newSubmenu.addChild(new MenuItem({
                label: "New Menu Item 1",
                showLabel: true,
                iconClass: "help2",
                onClick: function() {
                    alert('New menu item 1 clicked');
                }
            }));

            newSubmenu.addChild(new MenuItem({
                label: "New Menu Item 2",
                showLabel: true,
                iconClass: "help2",
                onClick: function () {
                    alert('New menu item 2 clicked');
                }
            }));

            // Adding this CSS class ensures that icons will appear next to the menu items; you can omit this if you are not
            // displaying any
            domClass.add(newSubmenu.domNode, "ic16");
            
            // Append this new dropdown to the end of the toolbar
            this.toolbar.addChild(new DropDownButton({
                label: "New Menu",
                iconClass: "view",
                showLabel: true,
                dropDown: newSubmenu
            }));

            // this.toolbar.getChildren()[0] will give us the first item in the toolbar (the app button) and we can then call
            // addChild() on its dropdown property to add new menu items to it.  Passing in 2 as the second parameter to 
            // addChild() will insert the new menu item in the third slot.
            this.toolbar.getChildren()[0].dropDown.addChild(new MenuItem({
                label: "New App Menu Item",
                showLabel: true,
                iconClass: "help2",
                onClick: function() {
                    alert('New app menu item clicked');
                }
            }), 2);
        }
    });
})