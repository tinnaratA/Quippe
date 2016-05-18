//Generates Score Calculation Table for the Quippe Student Edition
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/io-query",
    "dojo/query",
    "dojo/topic",
    "dijit/registry",
    "qc/MenuItem",
    "qc/XmlWriter",
    "qc/note/FindingTable",
    "qc/_core"
], function (declare, array, lang, domClass, ioQuery, query, topic, registry, MenuItem, XmlWriter, FindingTable, core) {

    function postScore() {
        var scoreTable = query('.exerciseScoreTable').map(registry.byNode)[0];
        if (!scoreTable) {
            core.showError('No score table found');
        };
        scoreTable.getFindings().forEach(function (finding) {
            (finding.bindings || []).forEach(function (binding) { binding.execute() });
        });
        scoreTable.updateDisplay();
        var totalFinding = scoreTable.getElementByName('TotalScorePercentage');
        if (!totalFinding) {
            core.showError("Can't find total score finding");
        };

        var qs = location.search ? ioQuery.queryToObject(location.search.substr(1)) : {};
        var userId = qs['UserId'] || 'unknown';
        var exerciseId = qs['Exercise'] || 'unknown';

        var htm = '<div style="margin:12px;">';
        htm += '<div>Student: ' + userId + '</div>';
        htm += '<div>Exercise: ' + exerciseId + '</div>';
        htm += '<div>Score: ' + (totalFinding.get('value') || 0) + '%' + '</div>';
        htm += '</div>';
        core.alert({ title: 'Scoring Results', message: htm });
    };

    function generateScoreTable() {
        var editor = core.getNoteEditor();
        var sections = [];
        query('.section', editor.note.domNode).map(registry.byNode).filter(function (x) { return x.name }).forEach(function (section) {
            var terms = [];
            query('.finding', section.domNode).map(registry.byNode).filter(function (finding) { return finding.get('result') }).forEach(function (entry) {
                var expr = '(medcinId==' + entry.medcinId;
                if (domClass.contains(entry.domNode, 'freeText')) {
                    expr += ' and text <> empty'
                };
                ['result', 'prefix', 'modifier', 'status', 'value'].forEach(function (prop) {
                    if (entry.get(prop)) {
                        expr += " and " + prop + "=='" + entry.get(prop) + "'";
                    }
                });
                expr += ')';
                terms.push(expr);
            });
            if (terms.length > 0) {
                sections.push({
                    name: section.name,
                    scoreName: section.name + 'Score',
                    expr: 'count ' + section.name + ' {' + terms.join(' or ') + '}',
                    expr2: 'count ' + section.name + ' - ' + 'count ' + section.name + ' {' + terms.join(' or ') + '}',
                    max: terms.length
                });
            };
        });

        query('.exerciseScoreTable').map(registry.byNode).forEach(function (t) { t.destroyRecursive() });
        if (sections.length == 0) {
            return;
        };

        var tbl = new FindingTable();
        var r = 0;
        var c = 0;
        var len = sections.length;
        var writer = new XmlWriter();
        writer.beginElement('Element');
        writer.attribute('Type', 'qc.note.FindingTable');
        writer.attribute('Name', 'ExerciseScoreTable');
        writer.attribute('Rows', len + 3);
        writer.attribute('Cols', 5);
        writer.attribute('StyleClass', 'exerciseScoreTable borders');

        writer.beginElement('RowSettings');
        writer.beginElement('Row');
        writer.attribute('Index', 1);
        writer.attribute('RowType', 'header');
        writer.endElement();
        writer.beginElement('Row');
        writer.attribute('Index', len + 2);
        writer.attribute('RowType', 'footer');
        writer.attribute('CellStyle', 'font-weight:bold;');
        writer.endElement();
        writer.beginElement('Row');
        writer.attribute('Index', len + 3);
        writer.attribute('RowType', 'footer');
        writer.attribute('CellStyle', 'font-weight:bold;');
        writer.endElement();
        writer.endElement();

        writer.beginElement('ColumnSettings');
        for (c = 2; c <= 5; c++) {
            writer.beginElement('Column');
            writer.attribute('Index', c);
            writer.attribute('CellStyle', 'text-align:right;');
            writer.endElement();
        };
        writer.endElement();

        writer.beginElement('CellSettings');

        ['Section', 'Correct', 'Max Correct', 'Incorrect', 'Score'].forEach(function (hdr, i) {
            writer.beginElement('Cell');
            writer.attribute('Row', 1);
            writer.attribute('Col', i + 1);
            writer.attribute('Value', hdr);
            writer.endElement();
        });

        for (r = 0; r < len; r++) {
            writer.beginElement('Cell');
            writer.attribute('Row', r + 2);
            writer.attribute('Col', 1);
            writer.attribute('Value', sections[r].name);
            writer.endElement();

            writer.beginElement('Cell');
            writer.attribute('Row', r + 2);
            writer.attribute('Col', 2);
            writer.attribute('FindingRef', sections[r].scoreName);
            writer.attribute('FindingProperty', 'value');
            writer.endElement();

            writer.beginElement('Cell');
            writer.attribute('Row', r + 2);
            writer.attribute('Col', 3);
            writer.attribute('Value', sections[r].max);
            writer.endElement();
            
            writer.beginElement('Cell');
            writer.attribute('Row', r + 2);
            writer.attribute('Col', 4);
            writer.attribute('FindingRef', sections[r].scoreName);
            writer.attribute('FindingProperty', 'onset');
            writer.endElement();


            writer.beginElement('Cell');
            writer.attribute('Row', r + 2);
            writer.attribute('Col', 5);
            writer.attribute('Formula', tbl.rcToAddr(r + 2, 2) + '- (0.25 * ' + tbl.rcToAddr(r + 2, 4) + ')');
            writer.endElement();

        };

        r = len + 2;
        writer.beginElement('Cell');
        writer.attribute('Row', r);
        writer.attribute('Col', 1);
        writer.attribute('Value', 'Total');
        writer.endElement();

        for (c = 2; c <= 5; c++) {
            writer.beginElement('Cell');
            writer.attribute('Row', r);
            writer.attribute('Col', c);
            writer.attribute('Formula', 'sum ' + tbl.rcToAddr(2, c) + '..' + tbl.rcToAddr(len + 1, c));
            writer.endElement();
        };

        writer.beginElement('Cell');
        writer.attribute('Row', r);
        writer.attribute('Col', 2);
        writer.attribute('Formula', 'sum B2..' + tbl.rcToAddr(len + 1, 2));
        writer.endElement();

        writer.beginElement('Cell');
        writer.attribute('Row', r);
        writer.attribute('Col', 3);
        writer.attribute('Formula', 'sum C2..' + tbl.rcToAddr(len + 1, 3));
        writer.endElement();
       
        r++;
        writer.beginElement('Cell');
        writer.attribute('Row', r);
        writer.attribute('Col', 1);
        writer.attribute('Value', 'Percentage');
        writer.endElement();

        writer.beginElement('Cell');
        writer.attribute('Row', r);
        writer.attribute('Col', 2);
        writer.attribute('FindingRef', 'TotalScorePercentage');
        writer.attribute('FindingProperty', 'value');
        writer.attribute('Formula', 'round(' + tbl.rcToAddr(len + 2, 5) + '/' + tbl.rcToAddr(len + 2, 3) + ' * 100,1)');
        writer.endElement();

        writer.beginElement('Cell');
        writer.attribute('Row', r);
        writer.attribute('Col', 3);

        //var href = "javascript:require('dojo/query')('.exerciseScoreTable').map(require('dijit/registry').byNode).forEach(function (x) { x.recalc() });";
        //var href="javascript://alert('hello');"
        var href = "javascript:require('dojo/topic').publish('/qc/ContentLoaded');";
        writer.attribute('value', '<a href="' + href + '">Recalc</a>');        
        writer.endElement();


        writer.endElement();

        writer.beginElement('Findings');
        for (r = 0; r < len; r++) {
            writer.beginElement('Finding');
            writer.attribute('Name', sections[r].scoreName);
            writer.attribute('MedcinId', 2508);
            writer.attribute('OverrideTranscription', true);
            writer.attribute('Text', sections[r].scoreName);

            writer.beginElement('Bindings');

            writer.beginElement('Binding');
            writer.attribute('BindingType', 'property');
            writer.attribute('BindTo', 'value');
            writer.attribute('Expression', sections[r].expr);
            writer.endElement();

            writer.beginElement('Binding');
            writer.attribute('BindingType', 'property');
            writer.attribute('BindTo', 'onset');
            writer.attribute('Expression', sections[r].expr2);
            writer.endElement();

            writer.endElement();
            writer.endElement();
        };
      
        writer.beginElement('Finding');
        writer.attribute('Name', 'TotalScorePercentage');
        writer.attribute('MedcinId', 2508);
        writer.attribute('OverrideTranscription', true);
        writer.attribute('Text', 'TotalScorePercentage');
        writer.endElement();

        writer.endElement();
        writer.endElement();

        var findingTable = core.Note.parseXml(writer.toString());
        editor.note.addElement(findingTable);
        topic.publish('/qc/ContentLoaded');
    };

    var hLoad = topic.subscribe('/qc/DocumentLoaded', function () {
        hLoad.remove();
        if (core.app && core.app.toolbar) {
            var toolsButton = array.filter(core.app.toolbar.getChildren(), function (x) { return x.get('label') == 'Tools' })[0];
            if (toolsButton && toolsButton.dropDown) {
                toolsButton.dropDown.addChild(new MenuItem({
                    label: 'Generate Score Table',
                    showLabel: true,
                    onClick: function () { generateScoreTable() }
                }));
                toolsButton.dropDown.addChild(new MenuItem({
                    label: 'Post Score',
                    showLabel: true,
                    onClick: function () { postScore() }
                }));
            };
        };
    });
});