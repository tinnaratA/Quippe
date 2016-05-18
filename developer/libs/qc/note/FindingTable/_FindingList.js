define([
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/query",
    "qc/XmlUtil"
], function (_TemplatedMixin, _WidgetBase, registry, array, declare, query, XmlUtil) {
    return declare("qc.note.FindingTable._FindingList", [_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="findingList">'
                      + '  <div class="header">Table Findings</div>'
                      + '  <div class="content" data-dojo-attach-point="containerNode"></div>'
                      + '</div>',
    
    
        updateDisplay: function (viewMode) {
            array.forEach(this.getFindings(), function (finding) {
                finding.updateDisplay(viewMode);
            });
        },
    
        getFinding: function (name) {
            return query('.finding[data-name="' + name + '"]', this.containerNode).map(registry.byNode)[0] || null;
        },
    
        getFindings: function () {
            return query('.finding', this.containerNode).map(registry.byNode);
        },
    
        getEnumList: function (listWidget) {
            return [{ id: '', text: ''}].concat(array.map(array.filter(this.getFindings(), function(finding) {
                return finding.get('name');
            }), function (finding) {
                var id = finding.get('name');
                if (/^M\d+/.test(id)) {
                    var text = finding.get('text');
                    if (text.length > 30) {
                        text = text.substr(0, 30) + '&hellip;';
                    };
                    return { id: id, text: id + ': ' + text };
                }
                else {
                    return { id: id, text: id };
                };
            }));
        },
    
        getUniqueName: function (sourceName) {
            var sequence = 0;
            var existing = this.getFinding(sourceName);
            if (existing) {
                while (existing) {
                    sequence += 1;
                    existing = this.getFinding(sourceName + '_' + sequence);
                };
                return sourceName + '_' + sequence;
            }
            else {
                return sourceName;
            };
    
        },
    
        parseFindings: function (xmlNode) {
            var xFindings = XmlUtil.selectChildElement(xmlNode, 'Findings');
            if (xFindings) {
                array.forEach(XmlUtil.selectChildElements(xFindings, 'Finding'), function (xFinding) {
                    var widget = this.parseXml(xFinding);
                    if (widget) {
                        widget.startup();
                        widget.placeAt(this.containerNode);
                    };
                }, this);
            };
        },
    
        writeFindings: function (writer, mode) {
            var list = this.getFindings();
            if (list.length > 0) {
                writer.beginElement('Findings');
                array.forEach(list, function (finding) {
                    finding.writeNoteElement(writer, mode);
                });
                writer.endElement();
            };
        }
    
    });
});