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

        this.indentation.questionCurlyBrackets = 2;
        this.indentation.questionProperties = 5;
        this.indentation.answersSquareBrackets = 8;
        this.indentation.answerCurlyBrackets = 11;

        this.regExp.removeCommaAfterLastArrayItem = new RegExp(',(\\n\\s{' + String(this.indentation.answersSquareBrackets) + ',' + String(this.indentation.answersSquareBrackets) + '})', 'g');

        this.settings.visibleHintIdentificator = settings.visible_hint_identificator ? settings.visible_hint_identificator : '@';
        this.settings.invisibleHintIdentificator = settings.invisible_hint_identificator ? settings.invisible_hint_identificator : '^';

        this.regExp.captureHintIdentificators = new RegExp('([' + this.settings.visibleHintIdentificator + this.settings.invisibleHintIdentificator + '])', 'g');
        this.settings.splitterSequence = settings.splitter_sequence ? settings.splitter_sequence : 'ůíá';

        this.indent = function (spaces, string) {
            return ' '.repeat(spaces) + string;
        };

        this.escapeChar = function (character) {
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

        }.bind(this);

        //============================
        // commenting
        //============================

        this.settings.commentsMarker = settings.commentsMarker ? settings.commentsMarker : '=';
        this.blocks.comments = new Object();
        this.blocks.comments.highlightBody = '//' + this.settings.commentsMarker.repeat(30) + "\n";
        this.regExp.comments = new Object();
        this.regExp.comments.pattern =
        new RegExp(
            //match at least 3 comment chars
            this.escapeChar(this.settings.commentsMarker) + '{3,}?'
            +
            //match anything with at least 1 char, but without comment char
            '([^' + this.escapeChar(this.settings.commentsMarker) + ']+?)'
            +
            //match at least 3 comment chars
            this.escapeChar(this.settings.commentsMarker) + '{3,}',
        'g');
        this.regExp.comments.replacer = function (captureGroups) {

            var commentBody = this.blocks.comments.highlightBody + '// ' + captureGroups[0] + "\n" + this.blocks.comments.highlightBody;
            return commentBody;
            
        }.bind(this);

        //============================
        // questions
        //============================

        this.settings.questionIdStart = settings.question_identificator_start ? settings.question_identificator_start : '(';
        this.settings.questionIdEnd = settings.question_identificator_end ? settings.question_identificator_end : ')';
        this.settings.questionEnd = settings.question_end ? settings.question_end : ':';
        this.blocks.questions = new Object();
        //ends answer array, ends question object, starts another question object
        this.blocks.questions.upperBody = this.indent(this.indentation.answersSquareBrackets, ']') + "\n" + this.indent(this.indentation.questionCurlyBrackets, '}') + ",\n" + this.indent(this.indentation.questionCurlyBrackets, '{') + "\n";
        //starts answer array
        this.blocks.questions.lowerBody = "\n" + this.indent(this.indentation.questionProperties, '"answers":') + "\n" + this.indent(this.indentation.answersSquareBrackets, '[');
        this.regExp.questions = new Object();
        this.regExp.questions.pattern = new RegExp(
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
        'g');

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

                bodyArray.push(this.indent(this.indentation.questionProperties, propertyString));
            }

            var bodyString = bodyArray.join('\n');

            var questionProperties = this.indent(this.indentation.questionProperties, '"id":"' + identificator + "\",\n") + bodyString;

            var finalString = this.blocks.questions.upperBody + questionProperties + this.blocks.questions.lowerBody;

            return finalString;

        }.bind(this);

        //============================
        // answers
        //============================

        this.settings.answerCorrect = settings.correct_answer_identificator ? settings.correct_answer_identificator : 'T';
        this.settings.answerWrong = settings.wrong_answer_identificator ? settings.wrong_answer_identificator : 'X';
        this.settings.answerStart = '[' + this.escapeChar(this.settings.answerCorrect) + this.escapeChar(this.settings.answerWrong) + ']';
        this.settings.answerEnd = settings.answer_end ? settings.answer_end : "\n";
        this.regExp.answers = new Object();
        this.regExp.answers.pattern = new RegExp(
            //match any number of spaces excluding new lines (including tabs)
            '^[^\\S\\n]*'
            +
            //match answer validity
            '(' + this.settings.answerStart + ')'
            +
            //match any separator character
            '\\s*'
            +
            //until answerd end char
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

                    if (propertyIndex != bodyObjectLastPropertyIndex) {
                        propertyString += ',';
                    } else {
                        propertyString += '},';
                    }

                    bodyArray.push(propertyString);
                    propertyIndex++;
                }
            })();

            var final = this.indent(this.indentation.answerCurlyBrackets, '{"validity":' + validity + ',' + bodyArray.join(''));

            //console.log(final);

            return final;

        }.bind(this);

    this.errorText = null;
    this.outputText = null;

    this.isError = false;

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

    this.applyRegExp = function (regExp, substitutioner) {

        var isCaptured = false;

        this.outputText = this.outputText.replace(regExp, function (fullMatch, a, b, c, d, e, f) {

            isCaptured = true;

            var captureGroups = [a, b, c, d, e, f];

            captureGroups = this.filterValidCaptureGroups(captureGroups);

            return substitutioner(captureGroups);

        }.bind(this));

        if (isCaptured) {
            this.errorText = this.errorText.replace(regExp, '');
        }

    }.bind(this);

    //processors
    this.processComments = function () {
        this.applyRegExp(this.regExp.comments.pattern, this.regExp.comments.replacer);
    }.bind(this);

    this.processQuestionNames = function () {
        this.applyRegExp(this.regExp.questions.pattern, this.regExp.questions.replacer);
    }

    this.processAnswers = function () {
        this.applyRegExp(this.regExp.answers.pattern, this.regExp.answers.replacer);
    }

    this.convert = function () {

        this.output[this.outputContentAccessor] = '';
        this.error[this.errorContentAccessor] = '';

        var inputText = this.input.value;

        //JSON bug prevention:
        // \ => \\ 
        inputText = inputText.replace(/\\/g, '\\\\')
        // " => \", ] => \]
        // ] could break JSON in very rare scenario, when removing last answer array comma
        inputText = inputText.replace(/\\*(["])/g, "\\$1");

        //remove empty lines
        inputText = inputText.replace(/^\s*$\n/gm, '');

        this.outputText = inputText;
        this.errorText = inputText;
        
        this.isError = false;
        this.errorContainer.removeAttribute('data-error');

        var timer = new Date();
        var startTime = timer.getTime();
        var t0 = performance.now();

        this.processComments();
        this.processQuestionNames();
        this.processAnswers();

        this.outputText = this.outputText.replace(this.regExp.removeCommaAfterLastArrayItem, "$1");

        
        
        //console.log(this.outputText)
        //console.log(this.errorText)

        var endTime = timer.getTime();
        var timeLength = endTime - startTime;





var t1 = performance.now();
//console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.");

        //console.log('Conversion took', timeLength, 'miliseconds');

        this.output[this.outputContentAccessor] = this.outputText;

        //must also work when errorText has length (.trim()?)
        if (this.isError || this.errorText.trim() !== '') {
            this.errorContainer.setAttribute('data-error', 'true');
            this.error[this.errorContentAccessor] = this.errorText.trim();
        }
        
    }.bind(this);

    this.start = function () {
        this.input.addEventListener('input', this.convert)
    }.bind(this);
}