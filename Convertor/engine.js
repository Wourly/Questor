var Convertor = function (settings) {

    this.input = document.querySelector('#input');
    this.output = document.querySelector('#output');
    this.error = document.querySelector('#error');
    this.errorContainer = document.querySelector('#errorContainer');

    this.setContentAccessor = function (element) {
        if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
            return 'value';
        } else {
            return 'innerText';
        }
    }

    this.inputContentAccessor = this.setContentAccessor(input);
    this.outputContentAccessor = this.setContentAccessor(output);
    this.errorContentAccessor = this.setContentAccessor(error);

    //settings
    this.settings = new Object();
    this.regExp = new Object();
    this.blocks = new Object();

        //============================
        // general
        //============================

        this.settings.splitterSequence = settings.splitterSequence ? settings.splitterSequence : 'ůíá';

        this.indent = function (spaces, string) {
            return ' '.repeat(spaces) + string;
        };

        this.escapeChar = function (character) {
            return '\\' + character;
        }

        this.textBodyProcessor = function (textBody, indentation) {

            var markedTextBody = textBody.replace(/([@^])/g, this.settings.splitterSequence + "$1");
            
            var splitTokens = markedTextBody.split(this.settings.splitterSequence);

            var bodyObject = new Object();

            //index 0 is always question text
            for (let index = 1; index < splitTokens.length; index++) {

                splitTokens[index].replace(/(.)(.*)/, function (fullMatch, variableIdentifier, variableText) {
                    
                    var recognizedVariable = null;

                    switch (variableIdentifier) {
                        case '@':
                            recognizedVariable = 'vH';
                            break;
                        case '^':
                            recognizedVariable = 'iH';
                            break;
                        default:
                            recognizedVariable = variableIdentifier;
                            break;
                    }

                    bodyObject[recognizedVariable] = variableText.trim();
                });
            }

            //console.log(bodyObject);

            var returnArray = new Array();
            var returnString = null;

            returnArray.push(this.indent(indentation, '"text":"' + splitTokens[0].trim() + '",'));

            for (var property in bodyObject) {

                var propertyString = '"' + property + '":"' + bodyObject[property] + '",';

                returnArray.push(this.indent(indentation, propertyString));
            }

            returnString = returnArray.join('\n');

            return returnString;
        }

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
        this.blocks.questions.upperBody = this.indent(8, ']') + "\n" + this.indent(2, '}') + ",\n" + this.indent(2, '{');
        //starts answer array
        this.blocks.questions.lowerBody = this.indent(5, '"answers":') + "\n" + this.indent(8, '[') + "\n";
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
            ':'
            +
            //..if it has at least 1 character..
            ']+?)'
            +
            //..until question id end char..
            this.escapeChar(this.settings.questionIdEnd)
            +
            //..followed by up to 2 spaces..
            '\s{0,2}'
            +
            //..and capture everything, which is not question end char..
            '([^' + this.escapeChar(this.settings.questionEnd) + ':]+)'
            +
            //..until question end char
            this.escapeChar(this.settings.questionEnd),
        'g');

        this.regExp.questions.replacer = function (captureGroups) {
            
            var identificator = captureGroups[0];
            var textBody = captureGroups[1];

            var bodyReplacement = this.textBodyProcessor(textBody, 5);

            var questionProperties = this.indent(5, '"id":"' + identificator + '",\n') + bodyReplacement;

            var final = this.blocks.questions.upperBody + "\n" + questionProperties + "\n" + this.blocks.questions.lowerBody;

            //console.log(final)

            return final;

        }.bind(this);

        //============================
        // answers
        //============================

        this.settings.answerStart = '[TX]';
        this.settings.answerEnd = '';
        this.blocks.answers = new Object();
        this.regExp.answers = new Object();
        this.regExp.answers.pattern = new RegExp(
            '',
        'g');

        this.regExp.answers.replacer = function (captureGroups) {
            

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

            //captureGroups = this.filterValidCaptureGroups(captureGroups);

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
        //JSON bug prevention - adding just one escape character \ before "
        inputText = inputText.replace(/\\*"/g, '\\"');
        
        this.outputText = inputText;
        this.errorText = inputText;
        
        this.isError = false;
        this.errorContainer.removeAttribute('data-error');

        var timer = new Date();
        var startTime = timer.getTime();
        var t0 = performance.now();

        //this.processComments();
        //this.processQuestionNames();
        this.processAnswers();

        //console.log(this.outputText)
        //console.log(this.errorText)

        var endTime = timer.getTime();
        var timeLength = endTime - startTime;





var t1 = performance.now();
console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.");

        //console.log('Conversion took', timeLength, 'miliseconds');

        this.output[this.outputContentAccessor] = this.outputText;

        //must also work when errorText has length (.trim()?)
        if (this.isError || this.errorText.trim() !== '') {
            this.errorContainer.setAttribute('data-error', 'true');
            this.error[this.errorContentAccessor] = this.errorText;
        }
        
    }.bind(this);

    this.start = function () {
        this.input.addEventListener('input', this.convert)
    }.bind(this);
}