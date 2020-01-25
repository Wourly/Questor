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

        //commenting
        this.settings.commentsMarker = settings.commentsMarker ? settings.commentsMarker : '=';
        this.regExp.comments = new Object();
        this.regExp.comments.pattern = new RegExp('/' + this.settings.commentsMarker + '{3,}?([^=]+?)={3,}/g');
        this.regExp.comments.replacer = function (captureGroups) {
            return '/*' + captureGroups[0] + '*/';
        };

        //process text and hints from question and answer body
        this.textBodyProcessor = function (textBody, indentation) {
            
            var bodyArray = textBody.split(/[@^]/);

            if (bodyArray.length === 1)
            {
                return textBody;
            }
            else //length 2 or 3
            {
                var visibleHintIndex = textBody.indexOf('@');
                var invisibleHintIndex = textBody.indexOf('^');

                var returnString = null;

                //joins into string later
                var returnArray = null;

                if (bodyArray.length === 2)
                {
                    //visible hint is present
                    if (visibleHintIndex > invisibleHintIndex)
                    {
                        returnArray = ['"text":"', bodyArray[0].trim(), '",\n"vHint":"', bodyArray[1].trim(), '"'];
                    }
                    //invisible hint is present
                    else
                    {
                        returnArray = ['"text":"', bodyArray[0].trim(), '",\n"iHint":"', bodyArray[1].trim(), '"'];
                    }
                }
                else //length === 3
                {
                    //visible hint is frist
                    if (visibleHintIndex < invisibleHintIndex)
                    {
                        returnArray = ['"text":"', bodyArray[0].trim(), '",\n"vHint":"', bodyArray[1].trim(), '",\n"iHint":"', bodyArray[2].trim() + '"'];
                    }
                    //invisible hint is first
                    else
                    {
                        returnArray = ['"text":"', bodyArray[0].trim(), '",\n"vHint":"', bodyArray[2].trim(), '",\n"iHint":"', bodyArray[1].trim() + '"'];
                    }
                }

                returnString = returnArray.join('');
            }

            console.log(JSON.parse('{' + returnString + '}'));
            return returnString;

        }

        //questions
        this.settings.questionIdStart = settings.question_identificator_start ? settings.question_identificator_start : '(';
        this.settings.questionIdEnd = settings.question_identificator_end ? settings.question_identificator_end : ')';
        this.regExp.questions = new Object();
        this.regExp.questions.pattern = new RegExp(/\(([^\(\):]+?)\)\s?([^:]+):/g);
        this.regExp.questions.replacer = function (captureGroups) {
            
            var identificator = captureGroups[0];
            var textBody = captureGroups[1];

            var bodyReplacement = this.textBodyProcessor(textBody);

            return '"identificator":"' + identificator + '",\n' + bodyReplacement + "'";

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
        } else {
            this.isError = true;
        }

    }.bind(this);

    //processors
    this.processComments = function () {
        this.applyRegExp(this.regExp.comments.pattern, this.regExp.comments.replacer);
    }.bind(this);

    this.processQuestionNames = function () {
        this.applyRegExp(this.regExp.questions.pattern, this.regExp.questions.replacer);
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

        //this.processComments();
        this.processQuestionNames();

        //console.log(this.outputText)
        //console.log(this.errorText)

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