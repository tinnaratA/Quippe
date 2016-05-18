define([
    "dojo/_base/declare",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
	"qc/_core",
    "qc/SearchBox"
], function (declare, domClass, domConstruct, query, core, SearchBox) {
	domConstruct.place('<style type="text/css">.searchHighight {background-color:#ffff00 !important;}</style>', document.getElementsByTagName('head')[0]);

    var searchBox = declare("qx.LocalSearch", [SearchBox], {
        haveLocalSearchResults: false,
        localSearchHighlightClass: 'searchHighight',
    
        onSearchKeyUp: function (evt) {
            var searchQuery = this.textbox.value;
            if (searchQuery.length > 0 && searchQuery.charAt(0) == '>') {
                this.doLocalSearch();
            }
            else {
                if (this.haveLocalSearchResults) {
                    this.clearLocalSearch();
                };
                this.inherited(arguments);
            };
        },
    
        onClearQuery: function (evt) {
            this.clearLocalSearch();
            this.inherited(arguments);
        },
    
        clearLocalSearch: function () {
            query('.searchHighight').forEach(function (node) {
                var parent = node.parentNode;
                var textNode = node.childNodes[0];
                if (node.previousSibling && node.previousSibling.nodeType == 3) {
                    if (node.nextSibling && node.nextSibling.nodeType == 3) {
                        node.previousSibling.nodeValue = node.previousSibling.nodeValue + textNode.nodeValue + node.nextSibling.nodeValue;
                        parent.removeChild(node.nextSibling);
                    }
                    else {
                        node.previousSibling.nodeValue += textNode.nodeValue;
                    };
                }
                else if (node.nextSibling && node.nextSibling.nodeType == 3) {
                    node.nextSibling.nodeValue = textNode.nodeValue + node.nextSibling.nodeValue;
                }
                else {
                    parent.insertBefore(textNode, node);
                };
                parent.removeChild(node);
            });
        },
    
        doLocalSearch: function () {
            this.clearLocalSearch();
    
            var searchQuery = (this.textbox.value || '').substr(1).trim();
            if (searchQuery.length < 2) {
                domClass.remove(this.domNode, 'hasText');
                return;
            };
    
    
            var re = new RegExp(searchQuery, 'ig');
            var noteElement = null;
            var root = query('.qcNoteEditor .document')[0];
            var current = root;
            var found = false;
            var highlightClass = this.localSearchHighlightClass;
    
            var nextNode = function (node) {
                if (node) {
                    if (node.hasChildNodes()) {
                        return node.firstChild;
                    }
                    else {
                        while (node && !node.nextSibling && node != root) {
                            node = node.parentNode;
                        };
                        return node.nextSibling || null;
                    }
                }
                else {
                    return null;
                };
            };
    
    
            var m = null;
            var hNode = null;
            var range = null;
            var qlen = searchQuery.length;
            var next = null;
            while (current) {
                if (current.nodeType == 1) {
                    noteElement = current;
                    current = nextNode(current);
                }
                else if (current.nodeType == 3) {
                    if (noteElement && !core.isHiddenNode(noteElement)) {
                        m = re.exec(current.nodeValue);
                        next = nextNode(current);
                        while (m != null) {
                            hNode = domConstruct.create('span');
                            domClass.add(hNode, 'searchHighight');
                            range = document.createRange();
                            range.setStart(current, m.index);
                            range.setEnd(current, m.index + qlen);
                            range.surroundContents(hNode);
                            m = re.exec(current.nodeValue);
                            found = true;
                        };
                        current = next;
                    }
                    else {
                        current = nextNode(current);
                    }
                }
                else {
                    current = nextNode(current);
                };
            };
    
            if (found) {
                this.haveLocalSearchResults = true;
                domClass.add(this.domNode, 'hasText');
                domClass.remove(this.domNode, 'noResults');
            }
            else {
                this.haveLocalSearchResults = false;
                domClass.remove(this.domNode, 'hasText');
                domClass.add(this.domNode, 'noResults');
            };
        }
    
    });
    
    core.settings.searchBoxClass = searchBox;

    return searchBox;
});