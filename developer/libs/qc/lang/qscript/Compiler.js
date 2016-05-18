define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "qc/_core",
    "qc/DateUtil",
    "qc/lang/qscript/Host",
    "qc/lang/qscript/Parser"
], function (array, declare, lang, core, DateUtil, Host, Parser) {
    var Compiler = declare("qc.lang.qscript.Compiler", [], {
        functionDefs: {
            'any': { functionType: 'quantifier', valueType: 'boolean', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'function', required: false, defaultValue: { nodeType: 'literal', valueType: 'function', value: 'pos'}}], findingProperties: ['result'] },
            'all': { functionType: 'quantifier', valueType: 'boolean', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'function', required: false, defaultValue: { nodeType: 'literal', valueType: 'function', value: 'pos'}}], findingProperties: ['result'] },
            'no': { functionType: 'quantifier', valueType: 'boolean', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'function', required: false, defaultValue: { nodeType: 'literal', valueType: 'function', value: 'pos'}}], findingProperties: ['result'] },
    
            'count': { functionType: 'aggregate', valueType: 'number', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'function', required: false, defaultValue: { nodeType: 'literal', valueType: 'function', value: 'ent'}}], findingProperties: ['result'] },
            'min': { functionType: 'aggregate', valueType: 'number', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'function', required: false, defaultValue: { nodeType: 'literal', valueType: 'function', value: 'ent'}}], findingProperties: ['result', 'value'] },
            'max': { functionType: 'aggregate', valueType: 'number', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'function', required: false, defaultValue: { nodeType: 'literal', valueType: 'function', value: 'ent'}}], findingProperties: ['result', 'value'] },
            'avg': { functionType: 'aggregate', valueType: 'number', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'function', required: false, defaultValue: { nodeType: 'literal', valueType: 'function', value: 'ent' } }], findingProperties: ['result', 'value'] },
            'sum': { functionType: 'aggregate', valueType: 'number', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'function', required: false, defaultValue: { nodeType: 'literal', valueType: 'function', value: 'ent' } }], findingProperties: ['result', 'value'] },
            'prod': { functionType: 'aggregate', valueType: 'number', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'function', required: false, defaultValue: { nodeType: 'literal', valueType: 'function', value: 'ent'}}], findingProperties: ['result', 'value'] },
    
            'pos': { functionType: 'resultCond', valueType: 'boolean', argTypes: [{ type: 'finding', required: false, defaultValue: { nodeType: 'ref', element: 'Owner', value: 'Owner'}}], findingProperties: ['result'] },
            'neg': { functionType: 'resultCond', valueType: 'boolean', argTypes: [{ type: 'finding', required: false, defaultValue: { nodeType: 'ref', element: 'Owner', value: 'Owner'}}], findingProperties: ['result'] },
            'ent': { functionType: 'resultCond', valueType: 'boolean', argTypes: [{ type: 'finding', required: false, defaultValue: { nodeType: 'ref', element: 'Owner', value: 'Owner'}}], findingProperties: ['result'] },
            'unent': { functionType: 'resultCond', valueType: 'boolean', argTypes: [{ type: 'finding', required: false, defaultValue: { nodeType: 'ref', element: 'Owner', value: 'Owner'}}], findingProperties: ['result'] },
            'isFinding': { functionType: 'resultCond', valueType: 'boolean', argTypes: [{ type: 'finding', required: false, defaultValue: { nodeType: 'ref', element: 'Owner', value: 'Owner' } }] },

            'le': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: '', required: true }, { type: '', required: true}], matchArgTypes: true },
            'ge': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: '', required: true }, { type: '', required: true}], matchArgTypes: true },
            'ne': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: '', required: true }, { type: '', required: true}], matchArgTypes: true },
            'eq': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: '', required: true }, { type: '', required: true}], matchArgTypes: true },
            'gt': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: '', required: true }, { type: '', required: true}], matchArgTypes: true },
            'lt': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: '', required: true }, { type: '', required: true}], matchArgTypes: true },
    
            'mul': { functionType: 'mathOp', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true }, { type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'div': { functionType: 'mathOp', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true }, { type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'sub': { functionType: 'mathOp', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true }, { type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'add': { functionType: 'mathOp', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true }, { type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'mod': { functionType: 'mathOp', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true }, { type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'pow': { functionType: 'mathOp', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true }, { type: 'number', required: true, convert: true}], findingProperties: ['value'] },
    
            'concat': { functionType: 'stringOp', valueType: 'string', argTypes: [{ type: 'string', required: true, convert: true }, { type: 'string', required: true, convert: true}], findingProperties: ['text'] },
    
            'abs': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'acos': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'asin': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'atan': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'atan2': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true }, { type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'ceil': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'cos': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'floor': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'log': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'ln': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'round': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true }, { type: 'number', required: false, defaultValue: 0, convert: true}], findingProperties: ['value'] },
            'sin': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'sqrt': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'tan': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'inv': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
            'exp': { functionType: 'math', valueType: 'number', argTypes: [{ type: 'number', required: true, convert: true}], findingProperties: ['value'] },
    
            'nv': { functionType: 'typeConversion', valueType: 'number', argTypes: [{ type: '', required: true}], findingProperties: ['value'] },
            'sv': { functionType: 'typeConversion', valueType: 'string', argTypes: [{ type: '', required: true}], findingProperties: ['text'] },
            'bv': { functionType: 'typeConversion', valueType: 'boolean', argTypes: [{ type: '', required: true}], findingProperties: ['result'] },
            'lv': { functionType: 'typeConversion', valueType: 'list', argTypes: [{ type: '', required: true }], findingProperties: ['result', 'value'] },
    
            'dv': { functionType: 'typeConversion', valueType: 'date', argTypes: [{ type: '', required: true}] },
    
            'and': { functionType: 'boolOp', valueType: 'boolean', argTypes: [{ type: 'boolean', required: true, convert: true }, { type: 'boolean', required: true, convert: true}], findingProperties: ['result'] },
            'or': { functionType: 'boolOp', valueType: 'boolean', argTypes: [{ type: 'boolean', required: true, convert: true }, { type: 'boolean', required: true, convert: true}], findingProperties: ['result'] },
            'not': { functionType: 'boolOp', valueType: 'boolean', argTypes: [{ type: 'boolean', required: true, convert: true}], findingProperties: ['result'] },
    
            'iif': { functionType: 'conditional', argTypes: [{ type: 'boolean', convert: true, required: true }, { required: true }, { required: true}] },
            'addTime': { functionType: 'time', argTypes: [{ type: 'date', convert: true, required: true }, { type: '', required: true}] },
            'now': { functionType: 'time', valueType: 'date', argTypes: [] },

            'empty': { functionType: 'string', valueType: 'string', argTypes: [] },

            'window': { functionType: 'illegal' },
            'navigator': { functionType: 'illegal' },
            'screen': { functionType: 'illegal' },
            'history': { functionType: 'illegal' },
            'location': { functionType: 'illegal' },
            'frames': { functionType: 'illegal' },
            'opener': { functionType: 'illegal' },
            'self': { functionType: 'illegal' },
            'this': { functionType: 'illegal' },

            'ancestorOf': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: 'finding', required: true }, { type: 'finding', required: false, defaultValue: { nodeType: 'ref', element: 'Owner', value: 'Owner' } }] },
            'descendantOf': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: 'finding', required: true }, { type: 'finding', required: false, defaultValue: { nodeType: 'ref', element: 'Owner', value: 'Owner' } }] },
            'childOf': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: 'finding', required: true }, { type: 'finding', required: false, defaultValue: { nodeType: 'ref', element: 'Owner', value: 'Owner' } }] },
            'nodeKeyMatch': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: 'string', required: true }, { type: 'finding', required: false, defaultValue: { nodeType: 'literal', value: false } }] },
            'medcinIdList': { functionType: 'relational', valueType: 'boolean', argTypes: [{ type: 'list', required: true, convert: true }, { type: 'finding', required: false, defaultValue: { nodeType: 'ref', element: 'Owner', value: 'Owner' } }] },

            'match': {
                functionType: 'stringOp',
                valueType: 'boolean',
                argTypes: [
                    { name: 'pattern', type: 'string', required: true, convert: true },
                    { name: 'input', type: 'string', required: true, convert: true },
                    { name: 'caseSensitive', type: 'boolean', required: false , defaultValue: false}
                ],
                findingProperties: ['text']
            },

            'format': {
                functionType: 'string',
                valueType: 'string',
                argTypes: [
                    { name: 'input', type: 'string', required: true },
                    { name: 'format', type: 'string', required: false, convert: true, defaultValue: '' }
                ]
            },
            'replace': {
                functionType: 'string',
                valueType: 'string',
                argTypes: [
                    { name: 'input', type: 'string', required: true },
                    { name: 'pattern', type: 'string', required: true, convert: true, defaultValue: '' },
                    { name: 'replacement', type: 'string', required: false, convert: true, defaultValue: '' },
                    { name: 'caseSensitive', type: 'boolean', required: false }
                ]
            }
            
        },
    
        parser: Parser,
    
        converters: {
            'number': 'nv',
            'string': 'sv',
            'boolean': 'bv',
            'list': 'lv',
            'date': 'dv'
        },
    
        illegalWords: [
            'window',
            'navigator',
            'screen',
            'history',
            'location',
            'frames',
            'opener',
            'self',
            'this'
        ],
    
        propertyMap: function (element, property) {
            switch (element || 'NoteElement') {
                case 'Patient':
                    switch (property) {
                        case 'id':
                        case 'lastName':
                        case 'firstName':
                        case 'sex':
                        case 'race':
                        case 'religion':
                        case 'ethnicity':
                        case 'maritalStatus':
                            return { name: property, type: 'string' };
                        case 'age':
                            return { name: 'ageInMinutes', type: 'number' };
                        case 'birthDate':
                            return { name: property, type: 'date' };
                        default:
                            return { name: property };
                    };
                    break;
                case 'Encounter':
                    switch (property) {
                        case 'id':
                        case 'code':
                        case 'description':
                            return property;
                        case 'time':
                        case 'encounterTime':
                            return { name: 'encounterTime', type: 'date' };
                        default:
                            return { name: property };
                    };
                    break;
                case 'Provider':
                    switch (property) {
                        case 'id':
                        case 'name':
                            return { name: property, type: 'string' };
                        default:
                            return { name: property };
                    };
                    break;
                default:
                    switch (property) {
                        case 'medcinId':
                        case 'termType':
                        case 'flag':
                            return { name: property, type: 'number' };
                        case 'nodeKey':
                        case 'prefix':
                        case 'result':
                        case 'status':
                        case 'modifier':
                        case 'text':
                            return { name: property, type: 'string' };
                        case 'value':
                        case 'unit':
                        case 'onset':
                        case 'duration':
                        case 'episode':
                        case 'timing':
                        case 'specifier':
                        case 'note':
                            return { name: property };
                        default:
                            return { name: property };
                    };
                    break;
            };
        },
    
        parseTree: function (input) {
            this.parser.yy.parseError = function (str, hash) {
                throw (str);
            };
            return this.parser.parse(input);
        },
    
        preProcess: function (input, options) {
            if (!input) {
                return '';
            };

            if (options.stripNewlines) {
                if (options.supportsAssignment) {
                    var reAssign = /((?:^\s*)[A-Z][a-zA-Z0-9_]*\s?=\s?[^=\>].+)(\n)/g;
                    input = input.replace(reAssign, '$1;');
                };
                input = input.replace(/\n/g, ' ');
            };

            return input;
        },

        parse: function (input, options) {
            var result = {
                sourceScript: input
            };
    
            options = options || {};
            var normInput = this.preProcess(input, options);
    
            try {
                var ast = this.parseTree(normInput);
                var info = { expr: '', references: {}, functions: {}, errors: [], options: options };
                this.resolveTypes(ast);
                this.postProcess(ast, info);
                if (info.errors.length > 0) {
                    result.error = info.errors.join('\n');
                    result.success = false;
                }
                else {
                    result.targetScript = info.expr;
                    result.references = info.references;
                    if (info.ranges) {
                        result.ranges = info.ranges;
                    };
                    result.success = true;
                }
            }
            catch (ex) {
                result.error = ex.message || ex;
                result.success = false;
            };
    
            return result;
        },
    
    
        resolveTypes: function (node) {
            var typeName = '';
            var pMap = null;
            if (!node.valueType) {
                switch (node.nodeType) {
                    case 'fn':
                        typeName = this.functionDefs[node.value] ? this.functionDefs[node.value].valueType || '' : '';
                        break;
                    case 'hostObj':
                    case 'ref':
                        pMap = this.propertyMap(node.element, node.property);
                        typeName = pMap ? pMap.type || '' : '';
                        break;
                    default:
                        break;
                };
            };
    
            if (typeName) {
                node.valueType = typeName;
            };
    
            array.forEach(node.args || node.nodes || node.lines || [], this.resolveTypes, this);
        },
    
        postProcess: function (node, info) {
            this['pproc_' + node.nodeType](node, info);
        },
    
        pproc_script: function (node, info) {
            var last = node.lines.length - 1;
            array.forEach(node.lines, function (line, i) {
                if (i == last) {
                    info.expr += 'return ';
                }
                this.postProcess(line, info);
                info.expr += ';';
            }, this);
        },
    
        pproc_assign: function (node, info) {
            if (!info.options.supportsAssignment) {
                throw "Assignment statements not supported in this context";
            };
            info.expr += "s('" + node.lhs.element + "',"
            info.expr += (node.lhs.property ? "'" + node.lhs.property + "'" : "null") + ","
            this.postProcess(node.rhs, info);
            info.expr += ')';
        },
    
        pproc_op: function (node, info) {
            var argList = array.map(node.args, function (argNode, i) {
                var argType = argNode.valueType || (this.functionDefs[argNode.value] ? this.functionDefs[argNode.value].valueType : '') || '';
                if (argType == node.valueType) {
                    return argNode;
                }
                else {
                    return {
                        nodeType: 'fn',
                        value: this.converters[node.valueType],
                        valueType: node.valueType,
                        args: [lang.clone(argNode)]
                    };
                }
            }, this);
    
            if (node.position == 'prefix') {
                info.expr += node.symbol;
                info.expr += '(';
                this.postProcess(argList[0], info);
                info.expr += ')';
            }
            else {
                info.expr += '(';
                this.postProcess(argList[0], info);
                info.expr += ' ' + node.symbol + ' ';
                this.postProcess(argList[1], info);
                info.expr += ')';
                node.args = argList;
            };
    
            return true;
        },
    
    
        pproc_predicate: function (node, info) {
            if (!node.source) {
                var domain = info.options.hostDomain || 'Document';
                node.source = { nodeType: 'ref', value: domain, element: domain };
            }
            info.expr += "$.filter($.lv("
            this.postProcess(node.source, info);
            info.contextStack = info.contextStack || [];
            info.contextStack.push({element: node.source.element})
            info.expr += "),function(x) {return ("
            this.postProcess(node.value, info);
            info.expr += ")})";
            info.contextStack.pop();
        },

        pproc_fn: function (node, info) {
            var def = this.functionDefs[node.value];
            if (!def) {
                throw ('Unknown function: ' + node.value);
            };
    
            if (array.indexOf(this.illegalWords, node.value) >= 0) {
                throw ('The keyword "' + node.value + '" is not allowed in script expressions');
            };
    
            if (!info.functions[node.value]) {
                info.functions[node.value] = 1;
            }
            else {
                info.functions[node.value] += 1;
            };
    
            for (var prop in def) {
                if (!node[prop]) {
                    node[prop] = def[prop];
                }
            };
    
            if (node.args.length > def.argTypes.length) {
                throw ("Too many arguments to the '" + node.value + "' function");
            };
    
            info.expr += '$.' + node.value
            info.expr += '(';
    
            var converters = this.converters;
            var forceArgType = '';
            if (def.matchArgTypes) {
                forceArgType = array.filter(node.args, function (a) { return a.valueType && converters[a.valueType] ? true : false }).map(function (x) { return x.valueType })[0] || '';
            };
    
            var ok = array.every(def.argTypes, function (argDef, i) {
                var argNode = node.args[i];
    
                if (!argNode) {
                    argNode = lang.clone(argDef.defaultValue);
                };
    
                if (argNode) {
    
                    if (argNode.nodeType == 'fn' && !argNode.valueType) {
                        argNode.valueType = this.functionDefs[argNode.value] ? this.functionDefs[argNode.value].valueType : '';
                    };
    
                    var argType = forceArgType || (argDef.convert ? argDef.type : '') || '';
                    if (argType && argNode.valueType != argType) {
                        var newArgNode = {
                            nodeType: 'fn',
                            value: converters[argType],
                            valueType: argType,
                            args: [lang.clone(argNode)]
                        };
                        node.args[i] = newArgNode;
                        argNode = node.args[i];
                    };
    
                    if (node.findingProperties) {
                        var refNodes = argNode.nodeType == 'ref' ? [argNode] : argNode.nodeType == 'arrayLiteral' ? argNode.value : [];
                        refNodes.forEach(function (aNode) {
                            node.findingProperties.forEach(function (pName) {
                                this.addRef(info, aNode.element, pName);
                            }, this);
                        }, this);
                    };


                    //if (argNode.nodeType == 'ref') {
                    //    array.forEach(node.findingProperties || [], function (pName) {
                    //        this.addRef(info, argNode.element, pName);
                    //    }, this);
                    //};
    
                    if (i > 0) {
                        info.expr += ', ';
                    };
    
                    this.postProcess(argNode, info);
    
                    return true;
                }
                else {
                    if (argDef.required) {
                        throw ('Missing argument ' + i + (argDef.name ? ' (' + argDef.name + ')' : '') + ' for ' + node.value + ' function');
                    }
                    else {
                        return true;
                    }
                }
            }, this);
    
            info.expr += ')';
    
            return ok;
        },
    
        pproc_iif: function (node, info) {
            var argNode = node.args[0];
            var argType = argNode.valueType || (this.functionDefs[argNode.value] ? this.functionDefs[argNode.value].valueType : '') || '';
            if (argType != 'boolean') {
                var newNode = {
                    nodeType: 'fn',
                    value: this.converters['boolean'],
                    valueType: node.valueType,
                    args: [lang.clone(argNode)]
                };
                node.args[0] = newNode;
            };
    
            info.expr += '('
            this.postProcess(node.args[0], info);
            info.expr += ' ? '
            this.postProcess(node.args[1], info);
            info.expr += ' : '
            this.postProcess(node.args[2], info);
            info.expr += ')';
    
            return true;
        },
    
        pproc_ref: function (node, info) {
            if (info.contextStack && info.contextStack.length > 0) {
                var src = info.contextStack[info.contextStack.length - 1];
                //info.expr += 'x.' + node.property;
                info.expr += "g(x,'" + node.property + "')";
                this.addRef(info, src.element, node.property);
                return true;
            };
           

            if (!node.element) {
                node.element = 'Owner';
            };

            if (node.property) {
                var pMap = this.propertyMap('NoteElement', node.property);
                if (!pMap) {
                    throw ('Unknown property: ' + node.element + '.' + node.property);
                };
                
                info.expr += "g('" + node.element + "','" + pMap.name + "')";
                if (!node.valueType && pMap.type) {
                    node.valueType = pMap.type;
                };
            }
            else {
                info.expr += "g('" + node.element + "')";
            }
            this.addRef(info, node.element, node.property);
            return true;
        },

        pproc_ref_ORIG: function (node, info) {
            if (!node.element) {
                node.element = 'Owner';
            };
    
            if (node.property) {
                var pMap = this.propertyMap('NoteElement', node.property);
                if (!pMap) {
                    throw ('Unknown property: ' + node.element + '.' + node.property);
                };
                //info.expr += ("_." + node.element + ".get('" + pMap.name + "')");
                info.expr += "g('" + node.element + "','" + pMap.name + "')";
                if (!node.valueType && pMap.type) {
                    node.valueType = pMap.type;
                };
            }
            else {
                //info.expr += ("_." + node.element);
                info.expr += "g('" + node.element + "')";
            }
            this.addRef(info, node.element, node.property);
            return true;
        },
    
        pproc_hostObj: function (node, info) {
            if (node.property) {
                var pMap = this.propertyMap(node.element, node.property);
                if (!pMap) {
                    throw ('Unknown property:' + node.element + '.' + node.property);
                };
                //info.expr += "_." + node.element + '.' + pMap.name;
                info.expr += "g('" + node.element + "','" + pMap.name + "')";
                if (!node.valueType && pMap.type) {
                    node.valueType = pMap.type;
                };
            }
            else {
                //info.expr += "_." + node.value;
                info.expr += "g('" + node.element + "')";
            };
    
            this.addRef(info, node.element, node.property);
            return true;
        },
    
        pproc_literal: function (node, info) {
            if (node.valueType == 'function') {
                info.expr += '$.' + node.value;
            }
            else if (node.valueType == 'date') {
                info.expr += "$.dv('" + node.value.substr(1, node.value.length - 2) + "')";
            }
            else if (node.isTimeSpan) {
                var minutes = node.value * DateUtil.multipliers[node.unit] / 60000;
                info.expr += minutes.toString();
            }
            else {
                info.expr += node.value;
            };
            return true;
        },
    
        pproc_rangeRef: function (node, info) {
            if (!info.options.supportsRanges) {
                throw 'Range references not supported in this context';
            };
            info.expr += "range('" + node.value + "')";
    
            if (!info.ranges) {
                info.ranges = [node.value];
            }
            else if (array.indexOf(info.ranges, node.value) < 0) {
                info.ranges.push(node.value);
            };
        },
    
        pproc_arrayLiteral: function (node, info) {
            info.expr += '['
            array.forEach(core.forceArray(node.value), function (x, i) {
                if (i > 0) {
                    info.expr += ',';
                };
                this.postProcess(x, info);
            }, this);
            info.expr += ']'
        },
    
        addRef: function (info, element, property) {
            if (!info) {
                return;
            };
    
    
            if (array.indexOf(this.illegalWords, element) >= 0) {
                throw ('The keyword "' + element + '" is not allowed in script expressions');
            };
            if (array.indexOf(this.illegalWords, property) >= 0) {
                throw ('The keyword "' + property + '" is not allowed in script expressions');
            };
    
            element = element || 'Owner';
    
            if (!info.references[element]) {
                info.references[element] = { properties: {} };
            };
            if (property && !info.references[element].properties[property]) {
                info.references[element].properties[property] = {};
            };
        },
    
        compile: function (input, options) {
            var parseResult = this.parse((input || '').toString().trim(), options);
    
            if (!parseResult.success) {
                console.log(parseResult.error);
                return parseResult;
            };
    
            var code = [];
            code.push('var $ = this;');
            code.push('var g = context.getObject ? this.hitch(context, context.getObject) : this.getObject(context);');
            code.push('var s = context.setObject ? this.hitch(context, context.setObject) : this.setObject(context);');
            code.push('var range = context.getRange ? this.hitch(context, context.getRange) : function() {return []};');
            code.push('var _ = context;');
            //code.push('return ' + parseResult.targetScript);
            code.push(parseResult.targetScript);

            parseResult.targetFunction = new Function('context', code.join('\n'));
            return parseResult;
        },

        exec: function (input, code, options) {
            input = input || {};
            var res = this.compile(code, options);
            if (res.success) {
                return res.targetFunction.call(Host, { Owner: input });
            }
            else {
                throw (res.error);
            };
        }
    
    });

	return new Compiler();
});