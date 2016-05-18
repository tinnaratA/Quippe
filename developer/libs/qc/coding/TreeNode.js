// qc.coding.TreeNode replaced by qc.noteData.TreeNode
//
//
//define([
//    "qc/Transcriber",
//    "dojo/_base/array",
//    "dojo/_base/declare",
//    "dojo/dom-class",
//    "qc/_core"
//], function (Transcriber, array, declare, domClass, core) {
//    return declare("qc.coding.TreeNode", [], {
//        id: '',
//        tree: null,
//        parent: null,
//        firstChild: null,
//        nextSibling: null,
//        isTreeNode: true,
//        level: 0,
    
//        visible: null,
//        collapsed: false,
    
//        nodeType: '',
//        medcinId: 0,
//        prefix: '',
//        nodeKey: '',
//        refWidget: null,
    
//        equals: function (otherNode) {
//            return otherNode && otherNode.id === this.id;
//        },
    
//        isSameTerm: function (other) {
//            return (other && (this.medcinId > 0) && this.medcinId === other.medcinId && (this.prefix || '') === (other.prefix || ''));
//        },
    
//        hasChildren: function () {
//            return this.firstChild ? true : false;
//        },
    
//        isGroup: function () {
//            return this.nodeType === 'group';
//        },
    
//        isFinding: function () {
//            return this.nodeType === 'finding';
//        },
    
//        isNoteFinding: function () {
//            return (this.isFinding() && this.refWidget && this.refWidget.domNode)
//        },
    
//        nextNode: function () {
//            if (this.firstChild) {
//                return this.firstChild;
//            }
//            else {
//                return this.nextNonChild();
//            }
//        },
    
//        nextNonChild: function () {
//            if (this.nextSibling) {
//                return this.nextSibling;
//            }
//            else if (this.parent) {
//                return this.parent.nextNonChild();
//            }
//            else {
//                return null;
//            };
//        },
    
//        createChildNode: function (args) {
//            var node = this.tree.createNode(args);
//            node.parent = this;
//            node.level = this.level + 1;
//            return node;
//        },
    
//        insertBefore: function (args, refChild) {
//            var newChild = this.createChildNode(args);
//            var child = this.firstChild;
//            var prev = null;
//            while (child) {
//                if (child.equals(refChild)) {
//                    newChild.nextSibling = refChild;
//                    if (prev) {
//                        prev.nextSibling = newChild;
//                    }
//                    else {
//                        this.firstChild = newChild;
//                    }
//                    return newChild;
//                }
//                else {
//                    prev = child;
//                    child = child.nextSibling;
//                }
//            };
//            newChild.nextSibling = this.firstChild;
//            this.firstChild = newChild;
//            return newChild;
//        },
    
//        insertAfter: function (args, refChild) {
//            var newChild = this.createChildNode(args);
//            var child = this.firstChild;
//            var prev = null;
//            while (child) {
//                if (child.equals(refChild)) {
//                    newChild.nextSibling = child.nextSibling;
//                    child.nextSibling = newChild;
//                    return newChild;
//                }
//                else {
//                    prev = child;
//                    child = child.nextSibling;
//                }
//            };
//            if (prev) {
//                prev.nextSibling = newChild;
//            }
//            else {
//                this.firstChild = newChild;
//            }
//            return newChild;
//        },
    
//        appendChild: function (args) {
//            var newChild = this.createChildNode(args);
//            var child = this.firstChild;
//            var prev = null;
//            while (child) {
//                prev = child;
//                child = child.nextSibling;
//            };
//            if (prev) {
//                prev.nextSibling = newChild;
//            }
//            else {
//                this.firstChild = newChild;
//            }
//            return newChild;
//        },
    
//        removeChild: function (child) {
//            var current = this.firstChild;
//            var prev = null;
//            while (current) {
//                if (current.equals(child)) {
//                    if (prev) {
//                        prev.nextSibling = current.nextSibling;
//                    }
//                    else {
//                        this.firstChild = current.nextSibling;
//                    }
//                    child.clear();
//                    current = null;
//                }
//                else {
//                    prev = current;
//                    current = current.nextSibling;
//                }
//            };
//        },
    
//        clearChildren: function () {
//            while (this.firstChild) {
//                this.removeChild(this.firstChild);
//            };
//        },
    
//        clear: function () {
//            this.clearChildren();
//            this.parent = null;
//            this.nextSibling = null;
//            this.refWidget = null;
//        },
    
//        find: function (predicate) {
//            var list = [];
//            var node = this;
//            while (node) {
//                if (predicate(node)) {
//                    list.push(node);
//                };
//                node = node.nextNode();
//            };
//            return list;
//        },
    
//        findFirst: function (predicate) {
//            var list = [];
//            var node = this;
//            while (node) {
//                if (predicate(node)) {
//                    return node;
//                };
//                node = node.nextNode();
//            };
//            return null;
//        },
    
//        findNode: function (id) {
//            return this.findFirst(function (node) { return node.id === id });
//        },
    
//        forEach: function (fn) {
//            var node = this;
//            while (node) {
//                fn(node);
//                node = node.nextNode();
//            };
//        },
    
//        collapseAll: function () {
//            this.forEach(function (node) { node.collapsed = true });
//        },
    
//        expandAll: function () {
//            this.forEach(function (node) { node.collapsed = false });
//        },
    
//        isVisible: function () {
//            if (this.visible == null) {
//                var child = this.firstChild;
//                while (child) {
//                    if (child.isVisible()) {
//                        return true;
//                    }
//                    else {
//                        child = child.nextSibling;
//                    }
//                };
//                return false;
//            }
//            else {
//                return this.visible;
//            };
//        },
    
//        visibleChildren: function () {
//            var list = [];
//            var node = this.firstChild;
//            while (node) {
//                if (node.isVisible()) {
//                    list.push(node);
//                }
//                if (node.collapsed) {
//                    node = node.nextNonChild();
//                }
//                else {
//                    node = node.nextNode();
//                };
//            };
//            return list;
//        },
    
//        addInSequence: function (args) {
//            var newChild = this.createChildNode(args);
//            var child = this.firstChild;
//            if (newChild.isGroup()) {
//                while (child) {
//                    if (child.isGroup()) {
//                        child = child.nextSibling;
//                    }
//                    else {
//                        return this.insertBefore(newChild, child);
//                    }
//                };
//            }
//            else {
//                while (child) {
//                    if (child.isGroup() || child.nodeKey <= newChild.nodeKey) {
//                        child = child.nextSibling;
//                    }
//                    else {
//                        return this.insertBefore(newChild, child);
//                    }
//                };
//            };
//            return this.appendChild(newChild);
//        },
    
//        addChildNoteElement: function (widget) {
//            var nodeType = '';
//            var text = '';
//            if (domClass.contains(widget.domNode, 'findingGroup')) {
//                nodeType = 'group';
//                text = widget.get('text');
//            }
//            else if (domClass.contains(widget.domNode, 'freeText')) {
//                nodeType = 'finding';
//                text = widget.getPlainText(40, true);
//            }
//            else if (domClass.contains(widget.domNode, 'finding')) {
//                nodeType = 'finding';
//                text = new Transcriber().transcribeItem(widget, true);
//            }
//            else {
//                nodeType = 'group';
//                text = widget.get('text');
//            };
    
//            return this.addInSequence({
//                nodeType: nodeType,
//                text: text,
//                medcinId: widget.get('medcinId') || 0,
//                prefix: widget.get('prefix') || '',
//            	modifier: widget.get('modifier') || '',
//            	result: widget.get('result') || '',
//                nodeKey: widget.get('nodeKey') || '',
//                refWidget: widget,
//                parentSectionId: nodeType == 'finding' && widget.getContainingPart().groupKeys ? widget.getContainingPart().groupKeys[0] : null
//            });
//        },
    
//        placeFindingElement: function (widget) {
//            var partNode = null;
//            var part = widget.getContainingPart();
//            if (part) {
//                partNode = this.findFirst(function (node) { return node.refWidget && node.refWidget.id == part.id });
//            };
//            if (!partNode) {
//                partNode = this;
//            };
//            return partNode.addChildNoteElement(widget);
//        },
    
//        loadHiddenNoteFindings: function () {
//            if (!(this.refWidget && this.refWidget.domNode && domClass.contains(this.refWidget.domNode, 'noteElement'))) {
//                return;
//            };
    
//            if (!core.isFunction(this.refWidget.getFindings)) {
//                return;
//            };
    
//            array.forEach(this.refWidget.getFindings(true), function (finding) {
//                this.addChildNoteElement(finding);
//                this.nodeType = 'group';
//            }, this);
//        },
    
//        loadNoteElements: function () {
//            if (!(this.refWidget && this.refWidget.domNode && domClass.contains(this.refWidget.domNode, 'noteElement'))) {
//                return;
//            };
    
//            array.forEach(this.refWidget.getChildNoteElements(), function (childElement) {
//                if (domClass.contains(childElement.domNode, 'part')) {
//                    var childNode = this.addChildNoteElement(childElement);
//                    childNode.loadNoteElements();
//                }
//                else if (domClass.contains(childElement.domNode, 'hiddenFindingContainer') && childElement.hasFindings()) {
//                    var childNode = this.addChildNoteElement(childElement);
//                    childNode.loadHiddenNoteFindings();
//                }
//                else if (domClass.contains(childElement.domNode, 'freeText')) {
//                    //skip freeText elements which also have the finding class
//                }
//                else if (domClass.contains(childElement.domNode, 'finding')) {
//                    this.addChildNoteElement(childElement);
//                }
//                else {
//                    //skip all other noteElements
//                }
//            }, this);
//        }
//    });
//});