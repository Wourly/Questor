var Convertor = function (settings) {

    //established variables to connect convertor to DOM
    this.connectDOM = function (containerObject, identificatorsArray) {

        var error = false;

        for (const index in identificatorsArray) {
            const id = identificatorsArray[index];

            const element = document.querySelector('#' + id);

            if (!element) {
                console.warn(id + ' element not present in DOM');
                error = true;
                break;
            }

            let accessor = null;

            if (id !== 'errorGuide') {
                if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
                    accessor = 'value';
                } else {
                    accessor = 'innerText';
                }
    
                if (!accessor) {
                    console.warn(id + '\'s content cannot be accessed')
                    error = true;
                    break;
                }
            }
            else
            {
                accessor = 'innerHTML';
            }

            

            containerObject[id] = new Object();
            containerObject[id].element = element;
            containerObject[id].accessor = accessor;
        }

        if (error) {
            return false;
        } else {
            return true;
        }
    }

    this.DOM = new Object();

    {
        const desiredIdentificators = ['input', 'output', 'errorContainer', 'errorLabel', 'errorContent', 'errorGuide'];

        if (!this.connectDOM(this.DOM, desiredIdentificators)) {
            console.error('Failed to connect to DOM');
            return null;
        }
    }

    Object.freeze(this.DOM);

    //resources
    this.settings = new Object();
    this.indentation = new Object();
    this.blocks = new Object();
    this.regExp = new Object();
    this.miscellaneous = new Object();
    

        //============================
        // general
        //============================

        //!hint separator must not be more than single char

        this.indentation.questionCurlyBrackets = 0;
        this.indentation.questionProperties = 3;
        this.indentation.answersSquareBrackets = 6;
        this.indentation.answerCurlyBrackets = 9;

        this.indent = function (spaces) {
            return ' '.repeat(spaces);
        };

        //-------------------
        // structure of JSON
        //-------------------
            //ends answer array, ends question object, starts another question object
            //end is put first and it's first occurence is sliced off
            this.blocks.questionEnd = this.indent(this.indentation.answersSquareBrackets) + "]\n" + ' '.repeat(this.indentation.questionCurlyBrackets) + '}';
            this.blocks.questionStart = ",\n" + this.indent(this.indentation.questionCurlyBrackets);
            this.blocks.repetitiveQuestionUpperBody = this.blocks.questionEnd + this.blocks.questionStart + '{' + "\n";
            //starts answer array
            this.blocks.repetitiveQuestionLowerBody = "\n" + this.indent(this.indentation.questionProperties) + '"answers":' + "\n" + this.indent(this.indentation.answersSquareBrackets) + '[';
            this.regExp.removeCommaAfterLastArrayItem = new RegExp(',[\\n](\\s{' + String(this.indentation.answersSquareBrackets) + ',' + String(this.indentation.answersSquareBrackets) + '}])', 'g');
            this.regExp.sliceFirstQuestionUpperBody = new RegExp('^\\s{' + String(this.indentation.answersSquareBrackets) + ',' + String(this.indentation.answersSquareBrackets) + '}\\]\\n^\\s{' + String(this.indentation.questionCurlyBrackets) + ',' + String(this.indentation.questionCurlyBrackets) + '}},\\n^', 'm');
        //-------------------
        // /structure of JSON
        //-------------------

        //even that all lines have indentation removed, it is needed for errorText
        this.cleanLinePattern = '^[^\\S\\n]*'

        this.settings.visibleHintIdentificator = settings.visible_hint_identificator ? settings.visible_hint_identificator : '@';
        this.settings.invisibleHintIdentificator = settings.invisible_hint_identificator ? settings.invisible_hint_identificator : '^';

        this.regExp.captureHintIdentificators = new RegExp('([' + this.settings.visibleHintIdentificator + this.settings.invisibleHintIdentificator + '])', 'g');
        this.miscellaneous.splitterSequence = settings.splitter_sequence ? settings.splitter_sequence : 'ůíá';

        this.escapeChar = function (character) {

            //character is already escaped
            if (character[0] === '\\' && character[1])
                return character;
            

            return '\\' + character;
        };

        //return bodyObject, which contains text and properties separated by symbols
        //these properties are mostly 'hints'
        this.bodyTextProcessor = function (textBody) {

            var markedTextBody = textBody.replace(this.regExp.captureHintIdentificators, this.miscellaneous.splitterSequence + "$1");
            
            var splitTokens = markedTextBody.split(this.miscellaneous.splitterSequence);

            var bodyObject = new Object();
            bodyObject.text = splitTokens[0].trim();

            //index 0 is always question text
            for (let index = 1; index < splitTokens.length; index++) {

                splitTokens[index].replace(/(.)(.*)/, function (fullMatch, variableIdentifier, variableText) {
                    
                    var recognizedVariable = null;
                    
                    switch (variableIdentifier) {
                        case this.settings.visibleHintIdentificator:
                            recognizedVariable = 'vH';
                            break;
                        case this.settings.invisibleHintIdentificator:
                            recognizedVariable = 'iH';
                            break;
                        default:
                            recognizedVariable = variableIdentifier;
                            break;
                    }

                    bodyObject[recognizedVariable] = variableText.trim();
                }.bind(this));
            }

            //console.log(bodyObject);

            return bodyObject;

        };

        //============================
        // commenting
        //============================

        this.miscellaneous.commentsMarker = settings.commentsMarker ? settings.commentsMarker : '=';
        //this.blocks.comments = new Object();
        //this.blocks.comments.highlightBody = '//' + this.miscellaneous.commentsMarker.repeat(30) + "\n";
        this.regExp.comments = new Object();
        this.regExp.comments.pattern =
        new RegExp(
            '^'
            +
            //comment marker at least 3 times
            this.miscellaneous.commentsMarker + '{3,}'
            +
            //anything, but not comment marker at least once
            '([^' + this.miscellaneous.commentsMarker + ']+)'
            +
            //comment marker at least 3 times
            this.miscellaneous.commentsMarker + '{3,}'
            +
            '$',
        'gm');

        this.regExp.comments.replacer = function (captureGroups) {
            
            let innerNewLines = captureGroups[0].split("\n").length;
            
            return "\n".repeat(innerNewLines);

        }.bind(this);

        //============================
        // questions
        //============================

        this.settings.questionIdStart = settings.question_identificator_start ? settings.question_identificator_start : '(';
        this.settings.questionIdEnd = settings.question_identificator_end ? settings.question_identificator_end : ')';
        this.settings.questionEnd = settings.question_end ? settings.question_end : ':';
        this.regExp.questions = new Object();
        this.regExp.questions.pattern = new RegExp(
            '^'
            +
            //from question id start char..
            this.escapeChar(this.settings.questionIdStart)
            +
            //..match & capture everything
            '([^'
            +
            //..except question id brackets ()
            this.escapeChar(this.settings.questionIdStart) + this.escapeChar(this.settings.questionIdEnd)
            +
            //..except question end char
            this.escapeChar(this.settings.questionEnd)
            +
            //..except new line char..
            "\\n"
            +
            //..if it has at least 1 character..
            ']+?)'
            +
            //..until question id end char..
            this.escapeChar(this.settings.questionIdEnd)
            +
            //..and capture everything, which is not question end char or new line..
            '([^' + this.escapeChar(this.settings.questionEnd) + "\\n" + ']+)'
            +
            //..until question end char
            this.escapeChar(this.settings.questionEnd)
            +
            '$',
        'gm');

        this.regExp.questions.replacer = function (captureGroups) {
            
            var identificator = captureGroups[0];
            var bodyText = captureGroups[1];

            //contains text, hints
            var bodyObject = this.bodyTextProcessor(bodyText);
            //stores individual property lines
            var bodyArray = new Array();

            //process bodyObject to bodyArray
            for (var property in bodyObject) {

                var propertyString = '"' + property + '":"' + bodyObject[property] + '",';

                bodyArray.push(this.indent(this.indentation.questionProperties) + propertyString);
            }

            var bodyString = bodyArray.join('\n');

            var questionProperties = this.indent(this.indentation.questionProperties) + '"id":"' + identificator + "\",\n" + bodyString;

            var finalString = this.blocks.repetitiveQuestionUpperBody + questionProperties + this.blocks.repetitiveQuestionLowerBody;

            return finalString;

        }.bind(this)

        //============================
        // answers
        //============================

        this.settings.answerCorrect = settings.correct_answer_identificator ? settings.correct_answer_identificator : 'T';
        this.settings.answerWrong = settings.wrong_answer_identificator ? settings.wrong_answer_identificator : 'X';
        this.miscellaneous.answerStart = '[' + this.escapeChar(this.settings.answerCorrect) + this.escapeChar(this.settings.answerWrong) + ']';
        this.settings.answerEnd = settings.answer_end ? settings.answer_end : "\\n";
        this.regExp.answers = new Object();
        this.regExp.answers.pattern = new RegExp(
            '^'
            +
            //match validity character
            '(' + this.miscellaneous.answerStart + ')'
            +
            //match content
            '([^\\n' + this.escapeChar(this.settings.answerEnd) + ']*)'
            +
            '$',
        'gm');

        this.regExp.answers.replacer = function (captureGroups) {
            
            var validity = captureGroups[0] === 'T' ? true : false;
            var bodyText = captureGroups[1];

            var bodyObject = this.bodyTextProcessor(bodyText);
            var bodyArray = new Array();

            //creating scope for indexes
            //bodyObject => bodyArray
            (function stringifyBodyObject () {
                var bodyObjectLastPropertyIndex = Object.keys(bodyObject).length - 1;
                var propertyIndex = 0;

                for (var property in bodyObject) {

                    var propertyString = '"' + property + '":"' + bodyObject[property] + '"';

                    if (propertyIndex !== bodyObjectLastPropertyIndex) {
                        propertyString += ',';
                    } else {
                        propertyString += '},';
                    }

                    bodyArray.push(propertyString);
                    propertyIndex++;
                }
            })();

            
            var final = this.indent(this.indentation.answerCurlyBrackets) + '{"valid":' + validity + ',' + bodyArray.join('');

            //console.log(final);

            return final;

        }.bind(this);

    //============================
    // runtime
    //============================

    this.preformatedInputText = null;
    this.outputText = null;
    this.errorText = null;

    this.conversionStatus = new Object();

    //only keeps array from capture groups
    this.filterValidCaptureGroups = function (captureGroups) {

        var sliceEndIndex = null;

        for (var index = 0; index < captureGroups.length; index++) {
            if (Number.isInteger(captureGroups[index])) {
                sliceEndIndex = index;
            }
        }

        return captureGroups.slice(0, sliceEndIndex);
    };

    this.applyRegExp = function (operationLabel, outputText, errorText, regExp, substitutioner) {

        var isCaptured = false;

        this[outputText] = this[outputText].replace(regExp, function (fullMatch, a, b, c, d, e, f) {

            isCaptured = true;

            var captureGroups = [a, b, c, d, e, f];

            captureGroups = this.filterValidCaptureGroups(captureGroups);

            return substitutioner(captureGroups);

        }.bind(this));
        
        if (isCaptured) {
            this[errorText] = this[errorText].replace(regExp, '');
            return true;
        } else {
            return false;
        }
        
    };

    //------------
    //preformating
    //------------
    this.escapeEscapeChars = function (property) {

        // \ => \\ 
        this[property] = this[property].replace(/\\/g, '\\\\')
    }

    this.escapeDoubleQuotes = function (property) {

        // " => \"
        this[property] = this[property].replace(/\\*(["])/g, "\\$1");
    }

    //remove indentation and space leftovers after text on each line
    this.trimEachRow = function (property) {
        
        //trim spaces on each row
        this[property] = this[property].replace(/^[^\S\n]*/gm, '');
        this[property] = this[property].replace(/[^\S\n]*$/gm, '');
    }

    //----------
    //processors
    //----------
    this.removeComments = function (outputText, errorText) {
        this.applyRegExp('comments', outputText, errorText, this.regExp.comments.pattern, this.regExp.comments.replacer);
    }

    this.removeEmptyLines = function (property) {
        this[property] = this[property].replace(/^\s*$\n/gm, '');
    }
    
    this.processQuestions = function (outputText, errorText) {
        this.conversionStatus.questions = this.applyRegExp('questions', outputText, errorText, this.regExp.questions.pattern, this.regExp.questions.replacer);
    }

    this.processAnswers = function (outputText, errorText) {
        this.conversionStatus.answers = this.applyRegExp('answers', outputText, errorText, this.regExp.answers.pattern, this.regExp.answers.replacer);
    }

    this.isProcessingSuccessful = function (property) {
        
        if (this.conversionStatus[property]) {
            return true;
        }
        else
        {
            return false;
        }
    }

    this.writeError = function (severity, label, content, guide) {

        this.accessDOM('errorContainer', function (element) {element.setAttribute('data-error', severity)});
        this.accessDOM('errorLabel', function (element, accessor) {element[accessor] = label});
        this.accessDOM('errorContent', function (element, accessor) {element[accessor] = content});
        this.accessDOM('errorGuide', function (element, accessor) {element.appendChild(guide)});
    }

    this.fullExample = (function generateQuestionGuide () {

        const textArray = [
            'This is full example of how questions and answers should look like:',
            '<span class="highlight">',
            ':',
            '</span>'
        ];

    })();

    this.settingsTokens = (function () {

        const tokens = new Array();

        for (let token in this.settings) {
            tokens.push(this.settings[token]);
        }

        return tokens;

    }.bind(this))();

    this.regExp.finalizeExample = (function () {

        const escapedTokens = new Array();

        //'mappping'
        for (let index in this.settingsTokens) {
            escapedTokens.push(this.escapeChar(this.settingsTokens[index]));
        }

        return new RegExp('([\\' + escapedTokens + ']|[^' + escapedTokens + ']+)', 'g');
        
    }.bind(this))();

    this.finalizeExample = function (inputText) {  

        const cellFragment = new DocumentFragment();

        inputText.replace(this.regExp.finalizeExample, function (fullMatch, token) {

            const cell = document.createElement('td');
            let highlighted = false;
            
            for (let index = 0; index < this.settingsTokens.length; index++) {
                if (this.settingsTokens[index] === token) {
                    cell.classList.add('highlight');
                    highlighted = true;
                }
            }

            if (!highlighted)
                cell.classList.add('text');

            cell.innerText = token;

            cellFragment.appendChild(cell);

            return null;
        }.bind(this));

        const exampleTable = document.createElement('table');
        exampleTable.classList.add('example');
        const row = document.createElement('tr');
        exampleTable.appendChild(row);
        row.appendChild(cellFragment);

        return exampleTable;
    }

    

    this.questionsGuide = (function generateQuestionGuide () {

        const guideFragment = new DocumentFragment();

        const headline1 = document.createElement('p');
        headline1.classList.add('headline');
        headline1.innerText = 'Questions should have the following format:';

        const example1 = this.finalizeExample('(identificator) question text:');

        const headline2 = document.createElement('p');
        headline2.classList.add('headline');
        headline2.innerText = 'Real example for both question and answers:';

        const example2 = this.finalizeExample('(squid123) Select true facts about squids:');

        guideFragment.appendChild(headline1);
        guideFragment.appendChild(example1);
        guideFragment.appendChild(headline2);
        guideFragment.appendChild(example2);


        //const final = textArray.join('');
        //console.log(final);
        //return final;

        return guideFragment;

    }.bind(this))();

    this.reportError = function (errorLabel) {

        switch (errorLabel) {
            case 'questions':
                {
                    this.writeError('mild', 'No questions in input:', '', this.questionsGuide);
                    break;
                }

                
            default:
                break;
        }

    } 

    this.finalizeJsonArray = function (property) {

        //remove blocks added from first question, these blocks does not have
        {
            let answersClosingBracketIndex = this[property].indexOf(']');
            let firstQuestionStartingBracketIndex = this[property].indexOf('{', answersClosingBracketIndex);
    
            this[property] = this[property].slice(firstQuestionStartingBracketIndex, this[property].length);
        }
        
        //finish answers array ] and last question object }
        this[property] = '[' + this[property] + this.blocks.questionEnd + ']';
        
        //remove last comma, in answers array
        this[property] = this[property].replace(this.regExp.removeCommaAfterLastArrayItem, "\n$1");
    }

    this.accessDOM = function (identificator, closure) {

        const pair = this.DOM[identificator];
        return closure(pair.element, pair.accessor);

    }

    this.clearOutputElement = function () {
        this.accessDOM('output', function (element, accessor) {element[accessor] = ''})
    }

    this.clearErrorElements = function () {

        this.accessDOM('errorContainer', function (element) {element.removeAttribute('data-error')});
        this.accessDOM('errorLabel', function (element, accessor) {element[accessor] = ''})
        this.accessDOM('errorContent', function (element, accessor) {element[accessor] = ''})
        this.accessDOM('errorGuide', function (element, accessor) {element[accessor] = ''})
    }

    this.copyInput = function () {
        return this.accessDOM('input', function (element, accessor) {return element[accessor]});
    }

    this.insertOutputText = function () {

        this.accessDOM('output', function (element, accessor) {
            element[accessor] = this.outputText;
        }.bind(this))
    }

    this.convert = function () {

        var t0 = performance.now();

        this.clearOutputElement();
        this.clearErrorElements();

        this.preformatedInputText = this.copyInput();
        this.outputText = '';
        this.errorText = '';

        //JSON bug prevention
        this.escapeEscapeChars('preformatedInputText');
        this.escapeDoubleQuotes('preformatedInputText');

        this.trimEachRow('preformatedInputText');

        this.outputText = this.preformatedInputText;
        this.errorText = this.preformatedInputText;
        this.preformatedInputText = null;

        this.removeComments('outputText', 'errorText');
        this.removeEmptyLines('outputText');

        //processing questions
        this.processQuestions('outputText', 'errorText');
        if (!this.isProcessingSuccessful('questions')) {
            this.reportError('questions');
            return;
        }


        this.processAnswers('outputText', 'errorText');
        

        this.finalizeJsonArray('outputText');

        this.insertOutputText();



        //!! 


        //console.log('Conversion took', timeLength, 'miliseconds');

        
/*
        //must also work when errorText has length (.trim()?)
        if (this.errorText.trim() !== '') {
            this.errorContainer.setAttribute('data-error', 'true');
            this.errorContent[this.errorContentAccessor] = this.errorText.trim();
        }*/
        
        var t1 = performance.now();
        console.log(t1 - t0);

    }.bind(this);

    this.start = function () {
        this.DOM.input.element.addEventListener('input', this.convert)
    }.bind(this);
}