// A sample task pane that calls the public Wolters Kluwer UpToDate search and scrapes the resulting HTML.
//
// The task pane simply passes the text of the currently selected finding to the UpToDate search URL
// and parses the resulting HTML to present a list of links.
// 
// Please note that this is a mock-up for demonstration purposes only.  A real integration would 
// require a subscription to the UpToDate service and calls to the UpToDate APIs.
//
// More information on UpToDate available at http://www.uptodate.com
//
define([
    "qc/TaskPane",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/dom-geometry",
    "dojo/topic",
    "dojo/request",
    "dojo/query",
    "qc/_core"
], function (TaskPane, array, declare, lang, domClass, domConstruct, domStyle, domGeometry, topic, request, query, core) {
    var typeDef = declare("samples.UpToDateTaskPane", [TaskPane], {
        name: "UpToDate",

        
        title: "UpToDate &reg;",
        group: 'Reference',
        visible: true,
        frame: null,
        fill: true,

        _onEnabled: function () {
            if (!this.subscriptions) {
                this.subscriptions = [
                    topic.subscribe("/noteEditor/SelectionChanged", lang.hitch(this, this.onFindingSelected))
                ];
            };
            this.onFindingSelected();
        },

        _onDisabled: function () {
            if (this.subscriptions) {
                array.forEach(this.subscriptions, core.unsubscribe);
                this.subscriptions = null;
            }
        },

        onFindingSelected: function () {
            var finding = core.getNoteEditor().selection.getFindings()[0] || null;
            if (!finding) {
                return this.clear();
            };
            this.getContent(finding);
        },

        getContent: function(finding) {
            var baseURL = 'http://www.uptodate.com';
            //var url = 'proxy?' + baseURL + '/contents/search?search=' + finding.get('text');
            var url = baseURL + '/contents/search?search=' + finding.get('text');
            var self = this;
            console.log(url);
            request.get(url).then(function (data) {
                console.log('== data ==');
                console.log(data);
                var div = domConstruct.create('div');
                div.innerHTML = data;
                var htm = '<ul style="margin:0px;padding-left:16px;font-size:smaller;">'
                htm += query('.indSearchResult a', div).map(function (linkNode) {
                    return '<li style="margin-bottom:1em;"><a href="' + baseURL + linkNode.getAttribute('href') + '" target="QuippeReferenceInfo">' + linkNode.textContent + '</a></li>'
                }).join('');
                htm += '</ul>';
                self.containerNode.innerHTML = htm;
            });
        },
        
        clear: function () {
            this.containerNode.innerHTML = '';
        }
    });

    var hSubscribe = topic.subscribe('/qc/TaskBarLoaded', function (taskBar) {
        hSubscribe.remove();
        //console.log('== Task Bar ==');
        //console.loh(taskBar);
        //console.log('== Before New Task Pane ==');
        var taskPane = new typeDef();
        //console.log('== After New Task Pane ==');
        taskBar.registerTaskPane(taskPane)
    });

    return typeDef;
});