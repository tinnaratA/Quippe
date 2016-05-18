
    define([
    "qc/Workspace",
    "qc/_core",
    "dojo/_base/lang",
    "dojo/topic",
    "dojo/dom-class",
    "dojo/when",
    "dojo/request",
    "dojo/query",
    "dojo/text!BDMS/config.json"
], function (Workspace,core,lang,topic,domClass,when,request,query,config) {
        if(true){
    var config_json=JSON.parse(config);
    var originalNewEncounter = Workspace.prototype.newEncounter;
    lang.extend(Workspace,
        {
            newEncounter: function (settings) {
                var self = this;
                this.resetAll();
                console.log('==== newEncounter ====');
                console.log(settings);
                core.Encounter = settings.encounter;
                return when(this.setPatient(settings.patientId), function () {
                    self.newNote(settings.noteTemplate,settings);
                });
            },

            newNote: function (templateId,settings) {
                var editor = this.ensureEditor();

                editor.clear();
                editor.setView('expanded', true);

                templateId = templateId || core.settings.defaultNoteTemplate || "";

                this.tabControl.selectChild(this.tabs["noteEditor"].tabPage);

                request.get(core.serviceURL('Quippe/ContentLibrary/TemplateInfo'), {
                    query: { TemplateId: templateId, DataFormat: 'JSON' }, handleAs: 'json'
                }).then(function (data) {
                    var templateInfo = data.item || { id: templateId };

                    when(editor.loadDocumentTemplate(templateId,settings), function () {
                        editor.note.templateInfo = templateInfo;
                        editor.note.templateName = templateInfo.text || '';
                        editor.note.transcribe();
                        if (templateInfo.text) {
                            if (query('.finding', editor.note.domNode).some(function(x) {return !domClass.contains(x, 'freeText')})) {
                                topic.publish("/noteEditor/listAdded", {
                                    id: 'lstDocumentTemplate',
                                    icon: 'document',
                                    text: templateInfo.text,
                                    listType: 'documentTemplate',
                                    className: 'lstDocumentTemplate',
                                    canDelete: false
                                });
                            }
                        }
                    });
                });
            }
        }
    );
}});




