define([
    "qc/StringUtil",
    "qc/WordUtil",
    "qc/_EnumManager",
    "dijit/registry",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request",
    "dojo/dom-class",
    "dojo/dom-style",
    "qc/TimingTranscriber",
    "qc/_core",
	"qc/DateUtil"
], function (StringUtil, WordUtil, EnumManager, registry, array, declare, lang, request, domClass, domStyle, TimingTranscriber, core, DateUtil) {
    var Transcriber = declare("qc.Transcriber", [], {
        transcribe: function (finding, context) {
    
            if (!(finding && finding.phrasing)) {
                return '';
            };
    
            if (!context) {
                context = {
                    impliedPrefixes: [],
                    impliedWords: [],
                    termContext: [],
                    lastTerm: ''
                }
            }
    
            this.finding = finding;
            this.context = context;
            this.suppress = context.suppress ? lang.clone(context.suppress) : {};
            this.words = [];
            this.tags = [];
            this.text = '';
            this.autoNegate = false;
            this.useNeg = false;
            this.negOverride = '';
    
            this.determinePolarity();
            this.determineUsage();
            this.applyPrefix();
            this.applyResult();
            this.applyModifier();
            this.applyValueUnit();
            this.applyEpisode();
            this.applyOnset();
            this.applyDuration();
            this.applyStatus();
            this.applyTiming();
            this.applyNote();
            this.applyNegation();
            this.buildText();
            this.applyAutoNegate();
            this.applyLaterality();
            this.trimImpliedWords();
            this.trimRemainingTildes();
            this.finalizeText();
            return this.text.trim();
        },
    
        transcribeItem: function (item, includePrefix) {
            if (!item) {
                return '';
            };
    
            var itemText = (item.get ? item.get('text') : item.text) || '';
            if (item.overrideTranscription) {
                return itemText;
            };
    
            var phrase = item.phrasing && item.phrasing.ip ? item.phrasing.ip : itemText;
            var text = phrase.toString().replace(/\~\w+/g, '');
            if (includePrefix && item.prefix) {
                var desc = EnumManager.getTextSynch('prefix', item.prefix);
                return (desc + ' ' + text).trim();
            }
            else {
                return text;
            };
        },
    
    
        resolveFinding: function () {
            if (this.finding.phrasing) {
                return true;
            }
            else {
                return request(core.serviceURL('Quippe/NoteBuilder/Resolve'), {
                    query: { MedcinId: this.finding.medcinId, Culture: core.settings.culture, DataFormat: "JSON" },
                    handleAs: "json"
                }).then(function (data) {
                    for (var prop in data.term) {
                        if (this.finding[prop] == undefined) {
                            this.finding[prop] = data.term[prop];
                        }
                    };
                    return true;
                }, function (err) {
                    this.finding.phrasing = { independent: { positive: '##ERROR##'} };
                    return true;
                });
            }
        },
    
        determinePolarity: function () {
            var res = this.finding.get("result");
            var reverse = (parseInt((this.finding.flag || "0"), 10) & 0x100);
            if (res == 'N') {
                this.isNeg = true;
                if (reverse) {
                    this.useNeg = false;
                }
                else {
                    this.useNeg = true;
                }
            }
            else {
                this.isNeg = false;
                if (reverse) {
                    this.useNeg = true;
                }
                else {
                    this.useNeg = false;
                }
            };

            if (res == '' && /^N/.test(this.context.resultSequence || '')) {
                this.useNeg = !this.useNeg;
            };
    
            if (this.finding.fixedTranscription) {
                this.useNeg = reverse;
            };
    
            return true;
        },
    
        determineUsage: function () {
            var phrasing = this.finding.phrasing;
            var useDependent = false;
    
            if (this.context.usingDependent == true) {
                useDependent = true;
            };
    
            var isAncestor = function (parentKey, childKey) {
                return (childKey.length > parentKey.length && childKey.substr(0, parentKey.length) == parentKey);
            };

            var termContext = this.context.termContext || null;
            var nodeKey = this.finding.nodeKey || '';

            if (termContext && nodeKey) {
                while (termContext.length > 0 && !isAncestor(termContext[termContext.length - 1].nodeKey, nodeKey)) {
                    termContext.pop();
                };
                if (termContext.length > 0) {
                    var currentContext = termContext[termContext.length - 1];
                    if (phrasing.ctnk && (currentContext.nodeKey == phrasing.ctnk)) {
                        if (domStyle.get(currentContext.domNode, "display") != 'none') {
                            useDependent = true;
                            if (core.settings.transcribeChildResultIndependent) {
                                if (this.finding.result && !currentContext.result) {
                                    useDependent = false;
                                }
                            };
                        }
                    };
                };
            };
            
            if (useDependent) {
                this.posPhrase = phrasing["dp"];
                this.negPhrase = phrasing["dn"];
            }
    
            if (!this.posPhrase) {
                this.posPhrase = phrasing["ip"];
                this.negPhrase = phrasing["in"];
            }
    
            this.initText(this.posPhrase);
    
            if (phrasing.startContext) {
                if (!this.context.termContext) {
                    this.context.termContext = [];
                }
                this.context.termContext.push(this.finding);
            }
    
            this.finding.phrasing.usingDependent = useDependent;
            return true;
        },
    
        applyPrefix: function () {
            var p = this.tagWord("~P", "prefix", true);
    
            if (!this.finding.prefix) {
                return true;
            };
    
            if (this.isPrefixImplied(this.finding.prefix)) {
                if (this.useNeg) {
                    if (/^(O|PD)$/.test(this.finding.prefix)) {
                        //skip
                    }
                    else {
                        this.suppress.prefix = true;
                    }
                }
                else {
                    this.suppress.prefix = true;
                }
            };
    
            if (this.suppress.prefix) {
                return true;
            };
    
            var desc = EnumManager.getTextSynch('prefix', this.finding.prefix);
    
            if (p < 0) {
                if (!this.isPhraseImplied(desc) && !this.sourceText.toLowerCase().startsWith(desc.toLowerCase())) {
                    this.prepend(desc, "prefix");
                    this.autoNegate = true;
                }
            }
            else {
                this.words[p] = desc;
            }
    
            return true;
        },
    
        applyResult: function () {
            var p = this.tagWord("~R-", "result", true);
            if (p >= 0) {
                this.suppress.result = true;
                this.words[p] = '';
                return true;
            };
    
            p = this.tagWord("~R", "result", true);
    
            if (!this.finding.result) {
                return true;
            };
    
            if (!this.suppress.result) {
                switch (this.finding.result) {
                    case "H":
                    case "L":
                        this.suppress.result = false;
                        break;
                    default:
                        this.suppress.result = true;
                        break;
                }
            };
    
            if (this.suppress.result) {
                return true;
            };
    
            if (p < 0) {
                var r = this.indexOfTag("prefix");
                if (r >= 0) {
                    p = this.insert(r + 1, '', 'result');
                };
            };
    
            var desc = EnumManager.getTextSynch('result', this.finding.result);
            if (p < 0) {
                this.prepend(desc, "result");
                this.useNeg = false;
            }
            else {
                this.words[p] = desc;
            }
    
            return true;
        },
    
        applyModifier: function () {
            var useAdverb = false;
            var p = this.tagWord("~L", "modifier", true);
    
            if (p >= 0) {
                useAdverb = true;
            }
            else {
                p = this.tagWord("~M", "modifier", true);
                if (p >= 0) {
                    useAdverb = false;
                }
            };
    
            if (this.suppress.modifier || !this.finding.modifier) {
                return true;
            };
    
            if (p < 0) {
                var r = this.indexOfTag("result");
                if (r < 0) {
                    r = this.indexOfTag("prefix");
                };
                if (r >= 0) {
                    p = this.insert(r + 1, '', 'modifier');
                }
            };
    
            var desc = EnumManager.getTextSynch('modifier', this.finding.modifier);
    
            if (useAdverb) {
                desc = WordUtil.makeAdverb(this.finding.modifier, desc);
            };
            if (p < 0) {
                this.prepend(desc, "modifier");
                this.autoNegate = true;
            }
            else {
                this.words[p] = desc;
            };
    
            return true;
        },
    
    
        applyValueUnit: function () {
            var p = this.tagWord("~V", "valueUnit", true);
    
            if (this.suppress.value) {
                return true;
            };
    
            var valueUnit = this.finding.value || '';
            if (valueUnit && this.finding.unit) {
                valueUnit += (' ' + this.finding.unit);
            };
    
            if (!valueUnit) {
                return true;
            };
    
            if (p <= 0) {
                this.append(valueUnit, "valueUnit");
            }
            else {
                this.words[p] = valueUnit;
            };
            return true;
        },
    
        applyEpisode: function () {
            if (!this.suppress.episode && this.finding.episode) {
                this.append(DateUtil.formatEpisodeString(this.finding.episode), 'episode');
            };
            return true;
        },
    
        applyTiming: function () {
            if (!this.suppress.timing) {
                if (this.finding.timingComponents && this.finding.timingComponents.length > 0) {
                    this.append(TimingTranscriber.transcribe(this.finding.timingComponents, 'timing'));
                }
                else if (this.finding.timing) {
                    this.append(this.finding.timing, 'timing');
                };
            };
            return true;
        },
    
        applyOnset: function () {
            if (!this.suppress.onset && this.finding.onset) {
                var timeValue = DateUtil.parseTimeString(this.finding.onset);
                if (timeValue && timeValue.label) {
                    if (timeValue.type == 'absolute') {
                        this.append(timeValue.label, 'onset');
                    }
                    else if (timeValue.type == 'age') {
                        this.append(' at age ' + timeValue.label);
                    }
                    else if (timeValue.polarity == '+') {
                        this.append(' in ' + timeValue.label, 'onset');
                    }
                    else {
                        this.append(timeValue.label + ' ago', 'onset');
                    }
                }
                else {
                    this.append(this.finding.onset, 'onset');
                };
            };
            return true;
        },
    
        applyDuration: function () {
            if (!this.suppress.duration && this.finding.duration) {
                var timeValue = DateUtil.parseTimeString(this.finding.duration);
                if (timeValue && timeValue.label) {
                    if (timeValue.type == 'absolute') {
                        this.append(' to ' + timeValue.label, 'duration');
                    }
                    else {
                        this.append(' for ' + timeValue.label, 'duration');
                    }
                }
                else {
                    this.append(this.finding.duration, 'duration');
                };
            };
            return true;
        },
    
        applyStatus: function () {
            var p = this.tagWord("~S", "status", true);
    
            if (this.suppress.status || !this.finding.status) {
                return true;
            };
    
            var desc = EnumManager.getTextSynch('status', this.finding.status);
    
            var statusText = '- ' + desc;
            if (p < 0) {
                this.append(statusText, "status");
            }
            else {
                this.words[p] = statusText;
            }
    
            return true;
        },
    
    
        applyNegation: function () {
            if (this.useNeg && !this.autoNegate) {
                var diff = this.negOverride || this.negPhrase || "~< no";
                if (diff && diff != 'X') {
                    this.applyDiff(diff);
                };
            };
            return true;
        },
    
        applyNote: function () {
            if (!(this.suppress.notation || this.suppress.note) && this.finding.notation) {
                //this.append(this.finding.notation, "note");
                var src = this.finding.notation.toString().split('');
                var srcLen = src.length;
                var buf = [];
                var state = 0;
                var c = 0;
                while (c < srcLen) {
                    switch (state) {
                        case 0: //normal text
                            if (src[c] == '{') {
                                state = 1;
                            }
                            else {
                                buf.push(src[c]);
                            };
                            break;
                        case 1: //after {
                            if (src[c] == ':') {
                                buf.push(', ')
                                state = 2;
                            };
                            break;
                        case 2: //after {name:
                            if (src[c] == '}') {
                                state = 0;
                            }
                            else {
                                buf.push(src[c]);
                            }
                            break;
                        default:
                            break;
                    };
                    c++;
                };
                this.append(buf.join('').trim(), "note");
            }
            return true;
        },
    
        buildText: function () {
            this.text = this.getText();
            //this.text += (' (' + this.finding.nodeKey + ')');
            return true;
        },
    
        applyAutoNegate: function () {
            if (this.useNeg && this.autoNegate) {
                //this.text = WordUtil.prefixedAutoNegate(this.text, this.finding.prefix || '');
                this.text = this.prefixedAutoNegate(this.text, this.finding.prefix || '');
            };
            return true;
        },
    
        applyLaterality: function () {
            //TODO: remove ~Z bracketed parts when context has laterality
        },
    
        trimRemainingTildes: function () {
            this.text = StringUtil.stripTildeCodes(this.text);
        },
    
        finalizeText: function () {
            if (core.settings.showInfoIndicator && this.finding.hasInfo) {
                this.text += '&hellip;'
            };
    
            //always semicolons now, since bullet styles are handled by EntryStyle property
            this.applySepStyleSemicolon();
    
            //this.finding.set('preSep', '');
            //this.finding.set('postSep', '');
            //switch (core.settings.sepStyle) {
            //    case 'bullet':
            //        this.applySepStyleBullet();
            //        break;
            //    case 'semicolon':
            //        this.applySepStyleSemicolon();
            //        break;
            //    default:
            //        break;
            //}
    
        },
    
        applySepStyleBullet: function () {
            var finding = this.finding;
            if (finding.phrasing.usingDependent) {
                domClass.add(this.finding.domNode, 'inContext');
                var prevFinding = this.prevVisibleFinding(finding.domNode);
                if (prevFinding && prevFinding.nodeKey == finding.phrasing.ctnk) {
                    finding.set('label', ':');
                    domClass.add(prevFinding.domNode, 'contextHeading');
                }
                else {
                    finding.set('label', ',');
                }
            }
            else {
                domClass.remove(this.finding.domNode, 'inContext');
                finding.set('label', '&bull;');
            };
        },
    
        applySepStyleSemicolon: function () {
            var finding = this.finding;
            finding.set('postSep', ';');
    
            if (finding.phrasing.usingDependent) {
                domClass.add(this.finding.domNode, 'contextEnd');
    
                var prevFinding = this.prevVisibleFinding(finding.domNode);
                if (prevFinding && prevFinding.nodeKey == finding.phrasing.ctnk) {
                    prevFinding.set('postSep', ':');
                    domClass.remove(prevFinding.domNode, ['contextEnd', 'inContext']);
                    domClass.add(prevFinding.domNode, 'contextStart');
                }
                else if (prevFinding && prevFinding.phrasing && prevFinding.phrasing.ctnk == finding.phrasing.ctnk) {
                    prevFinding.set('postSep', ',');
                    domClass.remove(prevFinding.domNode, ['contextStart', 'contextEnd']);
                    domClass.add(prevFinding.domNode, 'inContext');
                }
                else if (prevFinding) { //if statement added by andrew - there was a problem with the first finding in a row
                    domClass.remove(prevFinding.domNode, ['contextStart', 'contextEnd', 'inContext']);
                    prevFinding.set('postSep', ';');
                }
            }
            else {
                domClass.remove(this.finding.domNode, ['inContext', 'contextEnd']);
            };
        },
    
        prevVisibleFinding: function (fromNode) {
            if (!fromNode) {
                return null;
            };
    
            var prevNode = fromNode.previousSibling;
            if (!prevNode) {
                return null;
            };
    
            if (!domClass.contains(prevNode, 'finding')) {
                return null;
            };
    
            if (domStyle.get(prevNode, 'display') == 'none') {
                return this.prevVisibleFinding(prevNode);
            }
            else {
                return registry.byNode(prevNode);
            };
    
        },
    
        trimImpliedWords: function () {
            var text = this.text;
    
            if (this.context.impliedPrefixes && this.context.impliedPrefixes.length > 0) {
                var prefixList = array.map(this.context.impliedPrefixes, function (x) { return EnumManager.getTextSynch('prefix', x) });
                text = this.trimStartingPhrases(text, prefixList);
            }
    
            if (this.context.impliedWords && this.context.impliedWords.length > 0) {
                text = this.trimStartingPhrases(text, this.context.impliedWords);
            }
    
            this.text = text;
            return true;
        },
    
        trimStartingPhrases: function (text, list) {
            if (!(text && list)) {
                return text;
            }

            var origText = text;

            for (var i = 0; i < list.length; i++) {
                if (text.substr(0, list[i].length).toLowerCase() == list[i]) {
                    text = text.substr(list[i].length).trim();
                    if (text.length == 0) {
                        return origText;
                    }
                }
            };
    
            return text;
        },
    
        /* Helper Functions */
        initText: function (text) {
            var sText = text ? text.toString() : '';
            var trimmedText = this.useNeg ? sText : this.truncateC(this.truncateT(sText)) || '';
    
            this.words = trimmedText.split(/\s+/);
            this.tags = [];
            for (var n = 0; n < this.words.length; n++) {
                this.tags.push('');
            };
            this.sourceText = sText;
        },
    
        truncateT: function (text) {
            var n = text.indexOf('~T');
            if (n >= 0) {
                return text.substr(0, n - 1);
            }
            else {
                return text;
            }
        },
    
        truncateC: function (text) {
            var n = text.indexOf('~C');
            if (n >= 0) {
                var prefList = ['DI', 'DR', 'E', 'RF', 'FU', 'H', 'O', 'F'];
                if (array.indexOf(prefList, this.finding.prefix) >= 0) {
                    return text.substr(0, n - 1);
                }
                else {
                    for (var p in this.context.impliedPrefixes) {
                        if (array.indexOf(prefList, p)) {
                            return text.substr(0, n - 1);
                        }
                    }
                    return text;
                }
            }
            else {
                return text;
            };
        },
    
        indexOfWord: function (word) {
            return array.indexOf(this.words, word);
        },
    
        indexOfTag: function (tag) {
            return array.indexOf(this.tags, tag);
        },
    
        tagWord: function (text, tag, clearText) {
            var n = this.indexOfWord(text);
            if (n >= 0) {
                this.tags[n] = tag;
                if (clearText) {
                    this.words[n] = '';
                };
            };
            return n;
        },
    
        append: function (text, tag) {
            this.words.push(text);
            this.tags.push(tag);
            return this.words.length - 1;
        },
    
        prepend: function (text, tag) {
            this.words.unshift(text);
            this.tags.unshift(tag);
            return 0;
        },
    
        getText: function () {
            var buf = [];
            array.forEach(this.words, function (word) {
                if (word) {
                    var tWord = word.toString().trim();
                    if (tWord.length > 0) {
                        switch (tWord.charAt(0)) {
                            case ',':
                                buf.push(tWord);
                                break;
                            default:
                                buf.push(' ');
                                buf.push(tWord);
                                break;
                        };
                    };
                };
            });
            return buf.join('');
        },
    
        insert: function (index, text, tag) {
            if (index < 0) {
                return this.prepend(text, tag);
            }
            else if (index > this.words.length) {
                return this.append(text, tag);
            }
            else {
                this.words.splice(index, 0, text);
                this.tags.splice(index, 0, tag);
                return index;
            }
        },
    
        applyDiff: function (diff) {
            var iWord = this.words;
            var iTag = this.tags;
            var dWord = diff.split(/\s+/);
            var oWord = [];
            var oTag = [];
            var d = 0;
            var i = 0;
    
            if (diff.indexOf("~") < 0) {
                var pLen = this.posPhrase.split(/\s+/).length;
                while (pLen > 0) {
                    this.words.shift();
                    this.tags.shift();
                    pLen--;
                };
                while (dWord.length > 0) {
                    this.words.unshift(dWord.pop());
                    this.tags.unshift('');
                };
                return;
            };
    
            while (d < dWord.length) {
                if (dWord[d][0] === '~') {
                    if (dWord[d][1] === '<') {
                        //skip
                    }
                    else if (dWord[d][1] === '>') {
                        while (i < iWord.length) {
                            oWord.push(iWord[i]);
                            oTag.push(iTag[i]);
                            i += 1;
                        }
                    }
                    else {
                        var m = dWord[d].match(/~(\d+)\.(\d+)/);
                        if (m) {
                            var nCopy = parseInt(m[1], 10);
                            while (nCopy > 0 && i < iWord.length) {
                                oWord.push(iWord[i]);
                                oTag.push(iTag[i]);
                                i += 1;
                                nCopy -= 1;
                            }
    
                            var nSkip = parseInt(m[2], 10);
                            while (nSkip > 0 && i < iWord.length) {
                                nSkip -= 1;
                                i += 1;
                            }
                        }
                        else {
                            oWord.push(dWord[d]);
                            oTag.push('');
                        }
                    }
                }
                else {
                    oWord.push(dWord[d]);
                    oTag.push('');
                }
                d += 1;
            };
    
            while (i < iWord.length) {
                oWord.push(iWord[i]);
                oTag.push(iTag[i]);
                i += 1;
            }
    
            this.words = oWord;
            this.tags = oTag;
        },
    
        isPrefixImplied: function (prefix) {
            return array.indexOf(this.context.impliedPrefixes || [], prefix) >= 0;
        },
    
        isPhraseImplied: function (text) {
            return array.indexOf(this.context.impliedWords || [], text) >= 0;
        },
    
        hasLateralityInContext: function () {
            return this.context.hasLaterality
                || this.isPhraseImplied("left")
                || this.isPhraseImplied("right");
        },
    
        getFindingRelationship: function (nKey, rKey) {
            var nLen = nKey.length;
            var rLen = rKey.length;
            var nParent = (nLen > 2) ? nKey.substr(0, nLen - 2) : '';
            var rParent = (rLen > 2) ? rKey.substr(0, rLen - 2) : '';
    
            if (nLen < rLen) {
                if (nKey == rParent) {
                    return 'parent';
                }
                else {
                    return 'other-ancestor';
                }
            }
            else if (nLen == rLen) {
                if (nKey == rKey) {
                    return 'self';
                }
                else {
                    return 'cousin';
                }
            }
            else {
                if (nParent == rKey) {
                    return 'child';
                }
            }
        },

        prefixedAutoNegate: function (text, prefix) {
            if (!text) {
                return '';
            };

            if (/^(G1|G2|G3)$/.test(prefix)) {
                return '(neg) ' + text;
            };

            if (/^(O|PD|OC|OX|R|RC|RO|AD|CN|RE|RN|RV)$/.test(prefix)) {
                return 'did not ' + text.replace(/ed/, '');
            };

            if (/^(CT|DC|E|M|MD|P1|TF|AV|RX|RT)$/.test(prefix)) {
                return 'do not ' + text;
            };

            if (/^(HU|IS)$/.test(prefix)) {
                return 'no ' + text;
            };

            if (/^(AM|CI|DV|HY|IB|IL|IN|IO|IP|IR|PC|PE|PF|PL|PO|PP|PR|PS|RF|SP|UN|SC)$/.test(prefix)) {
                return 'not ' + text;
            };

            if (/^(CO|VR|O1|O2|O3|OP)$/.test(prefix)) {
                var w = text.split(/\s+/g)
                w.splice(1, 0, 'not');
                return w.join(' ');
            };


            if (prefix == 'DN') {
                return text.replace('did not administer', 'administered');
            };

            if (prefix == 'DP') {
                return 'did not ' + text.replace('dispensed', 'dispense');
            };

            if (prefix == 'PU') {
                return text.replace('patient refused', 'patient did not refuse');
            };

            if (prefix == 'NC') {
                return text.replace('noncompliance', 'compliance');
            }

            return WordUtil.autoNegate(text)
        }
    });

    Transcriber.transcribeItem = Transcriber.prototype.transcribeItem;

    return Transcriber;
});