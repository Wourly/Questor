var Convertor = function (settings) {

    this.input = document.querySelector('#input');
    this.output = document.querySelector('#output');
    this.error = document.querySelector('#error');
    this.errorContainer = document.querySelector('#errorContainer');
    this.errorGuide = null; //document.querySelector();

    this.setContentAccessor = function (element) {
        if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
            return 'value';
        } else {
            return 'innerText';
        }
    }

    this.inputContentAccessor = this.setContentAccessor(this.input);
    this.outputContentAccessor = this.setContentAccessor(this.output);
    this.errorContentAccessor = this.setContentAccessor(this.error);
    this.errorGuideAccessor = this.setContentAccessor(this.errorGuide)

    //resources
    this.settings = new Object();
    this.indentation = new Object();
    this.blocks = new Object();
    this.regExp = new Object();
    

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
            this.settings.sliceStartIndex = this.blocks.questionEnd.length + this.blocks.questionStart.length;
            this.blocks.repetitiveQuestionUpperBody = this.blocks.questionEnd + this.blocks.questionStart + '{' + "\n";
            //starts answer array
            this.blocks.repetitiveQuestionLowerBody = "\n" + this.indent(this.indentation.questionProperties) + '"answers":' + "\n" + this.indent(this.indentation.answersSquareBrackets) + '[';
            
            this.regExp.removeCommaAfterLastArrayItem = new RegExp(',[\\n]*(\\s{' + String(this.indentation.answersSquareBrackets) + ',' + String(this.indentation.answersSquareBrackets) + '}])', 'g');
            this.regExp.sliceFirstQuestionUpperBody = new RegExp('^\\s{' + String(this.indentation.answersSquareBrackets) + ',' + String(this.indentation.answersSquareBrackets) + '}\\]\\n^\\s{' + String(this.indentation.questionCurlyBrackets) + ',' + String(this.indentation.questionCurlyBrackets) + '}},\\n^', 'm');
        //-------------------
        // /structure of JSON
        //-------------------

        //even that all lines have indentation removed, it is needed for errorText
        this.cleanLinePattern = '^[^\\S\\n]*'

        this.settings.visibleHintIdentificator = settings.visible_hint_identificator ? settings.visible_hint_identificator : '@';
        this.settings.invisibleHintIdentificator = settings.invisible_hint_identificator ? settings.invisible_hint_identificator : '^';

        this.regExp.captureHintIdentificators = new RegExp('([' + this.settings.visibleHintIdentificator + this.settings.invisibleHintIdentificator + '])', 'g');
        this.settings.splitterSequence = settings.splitter_sequence ? settings.splitter_sequence : 'ůíá';

        this.escapeChar = function (character) {

            //character is already escaped
            if (character[0] === '\\' && character[1])
                return character;
            

            return '\\' + character;
        };

        //return bodyObject, which contains text and properties separated by symbols
        //these properties are mostly 'hints'
        this.bodyTextProcessor = function (textBody) {

            var markedTextBody = textBody.replace(this.regExp.captureHintIdentificators, this.settings.splitterSequence + "$1");
            
            var splitTokens = markedTextBody.split(this.settings.splitterSequence);

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

        this.settings.commentsMarker = settings.commentsMarker ? settings.commentsMarker : '=';
        this.blocks.comments = new Object();
        this.blocks.comments.highlightBody = '//' + this.settings.commentsMarker.repeat(30) + "\n";
        this.regExp.comments = new Object();
        //!
        this.regExp.comments.pattern =
        new RegExp(
            '^={3}([^=]+)={3}$',
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
            //non capture (erase) any spaces before question
            this.cleanLinePattern
            +
            //from question id start char..
            this.escapeChar(this.settings.questionIdStart)
            +
            //..match & capture everything, except..
            '([^'
            +
            //..except question id brackets () and except..
            this.escapeChar(this.settings.questionIdStart) + this.escapeChar(this.settings.questionIdEnd)
            +
            //..except question end char..
            this.escapeChar(this.settings.questionEnd)
            +
            //..if it has at least 1 character..
            ']+?)'
            +
            //..until question id end char..
            this.escapeChar(this.settings.questionIdEnd)
            +
            //..followed by up to 3 spaces..
            '\s{0,3}'
            +
            //..and capture everything, which is not question end char..
            '([^' + this.escapeChar(this.settings.questionEnd) + ']+)'
            +
            //..until question end char
            this.escapeChar(this.settings.questionEnd),
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
        this.settings.answerStart = '[' + this.escapeChar(this.settings.answerCorrect) + this.escapeChar(this.settings.answerWrong) + ']';
        this.settings.answerEnd = settings.answer_end ? settings.answer_end : "\\n";
        this.regExp.answers = new Object();
        this.regExp.answers.pattern = new RegExp(
            //match any number of spaces excluding new lines (including tabs)
            this.cleanLinePattern
            +
            //match answer validity
            '(' + this.settings.answerStart + ')'
            +
            //match any separator character
            '[^\\S\\n' + this.escapeChar(this.settings.answerEnd) +']'
            +
            //until answer end char
            '([^' + this.escapeChar(this.settings.answerEnd) + ']*)',
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

    this.errorText = null;
    this.outputText = null;

    this.isErrorType = null;

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

    this.applyRegExp = function (operationName, oversee, regExp, substitutioner) {

        var isCaptured = false;

        this.outputText = this.outputText.replace(regExp, function (fullMatch, a, b, c, d, e, f) {

            isCaptured = true;

            var captureGroups = [a, b, c, d, e, f];

            captureGroups = this.filterValidCaptureGroups(captureGroups);

            return substitutioner(captureGroups);

        }.bind(this));

        
        if (isCaptured) {
            this.errorText = this.errorText.replace(regExp, '');
        } else {
            if (oversee) {
                this.isErrorType = operationName;
            }
        }
        
        
    };

    this.processComments = function () {
        this.applyRegExp('comments', false, this.regExp.comments.pattern, this.regExp.comments.replacer);
    }

    //processors
    this.processQuestionNames = function () {
        this.applyRegExp('questions', true, this.regExp.questions.pattern, this.regExp.questions.replacer);
    }

    this.processAnswers = function () {
        this.applyRegExp('answers', true, this.regExp.answers.pattern, this.regExp.answers.replacer);
    }

    this.amendOutputText = function () {

        (function slice () {
            var lastChar = this.outputText.lastIndexOf(','); //!!slices too much, if no answers added - looks confusing - cuts before answer's {}, which may also be in previous question, if last question does not have answers
            this.outputText = this.outputText.slice(this.settings.sliceStartIndex, this.outputText.length);
        }.bind(this))();



        
        this.outputText += this.blocks.questionEnd + '];';

        this.outputText = this.outputText.replace(this.regExp.removeCommaAfterLastArrayItem, "\n$1");



        
        this.outputText = "var QUEST = \n[" + this.outputText + "";
        








    
    }

    //this.findBug

    /*

`
 



cožeto ty wado


cožeto ty wado


        
        
        
         
                 
           
`.slice(0, 6).match(/\n/g).length
5
    */

    this.checkError = function () {

        if (this.isErrorType) {
            console.log(this.isErrorType);
        }
    }

    this.convert = function () {

        this.isErrorType = null;

        var t0 = performance.now();

        this.output[this.outputContentAccessor] = '';
        this.error[this.errorContentAccessor] = '';

        var inputText = this.input.value;

        //JSON bug prevention:
        // \ => \\ 
        inputText = inputText.replace(/\\/g, '\\\\')
        // " => \", ] => \]
        // ] could break JSON in very rare scenario, when removing last answer array comma
        inputText = inputText.replace(/\\*(["])/g, "\\$1");

        //trim spaces on each row
        inputText = inputText.replace(/^[^\S\n]*/gm, '');
        inputText = inputText.replace(/[^\S\n]*$/gm, '');


        this.outputText = inputText;
        this.errorText = inputText;

        
        
        
        this.errorContainer.removeAttribute('data-error');

        this.processComments();
        //remove empty lines
        this.outputText = this.outputText.replace(/^\s*$\n/gm, '');
        this.checkError();
        this.processQuestionNames();
        this.checkError();
        this.processAnswers();
        this.checkError();

        this.amendOutputText();

        this.output[this.outputContentAccessor] = this.outputText;






        //console.log('Conversion took', timeLength, 'miliseconds');

        

        //must also work when errorText has length (.trim()?)
        if (this.isErrorType || this.errorText.trim() !== '') {
            this.errorContainer.setAttribute('data-error', 'true');
            this.error[this.errorContentAccessor] = this.errorText.trim();
        }
        
        var t1 = performance.now();
        console.log(t1 - t0);

    }.bind(this);

    this.start = function () {
        this.input.addEventListener('input', this.convert)
    }.bind(this);
}