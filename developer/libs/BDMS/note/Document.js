/**
 * Created by bexuser on 4/30/15.
 */
define(["qc/note/Document",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-class",
    "qc/_core"
], function(Document,lang,array, domClass,core){
    if(true){
    var originalWriteNoteAttributes = Document.prototype.writeNoteAttributes;
    var originalParseXmlChildElements = Document.prototype.parseXmlChildElements;
    lang.extend(Document,
        {
            writeNoteAttributes : function(writer, mode){
                originalWriteNoteAttributes.apply(this, arguments);
                //writer.writeObject('episodeNumber', { episodeNumber : core.Encounter.en});
                //alert(core.Encounter.EpisodeNumber);
                writer.attribute("EpisodeNumber",core.Encounter.EpisodeNumber);

            }
        }
    );
}
});

