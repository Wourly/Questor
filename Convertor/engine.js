var Convertor = function (settings) {

    //============================
    // DOM for Convertor
    //============================

    //object to store references to elements needed by Convertor
    this.DOM = (function () {

        const DOM = new Object();

        const elementIds = ['input', 'output', 'errorContainer', 'errorLabel', 'errorContent', 'errorGuide'];

        var error = false;

        for (const index in elementIds) {

            const id = elementIds[index];

            const element = document.querySelector('#' + id);

            if (!element) {
                console.warn(id + ' element not present in DOM.');
                error = true;
                break;
            }

            let accessor = null;

            if (id !== 'errorGuide') {

                if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement)
                    accessor = 'value';
                else
                    accessor = 'innerText';
                
    
                if (!accessor) {
                    console.warn(id + '\'s content cannot be accessed.')
                    error = true;
                    break;
                }
            }
            else
            {
                accessor = 'innerHTML';
            }

            if (error)
                throw new Error('Convertor could not connect to DOM!')

            DOM[id] = new Object();
            DOM[id].element = element;
            DOM[id].accessor = accessor;
        }

        Object.freeze(DOM);

        return DOM;
    })();

    this.accessDOM = function (identificator, closure) {

        const pair = this.DOM[identificator];
        return closure(pair.element, pair.accessor);

    };

    //============================
    // Resources
    //============================

    //public
    //stores characters used as identificators for RegExp
    this.settings = new Object();
    //stores information for JSON indentation
    this.indentation = new Object();
    //stores main RegExp pattens and main RegExp substitution functions
    this.regExp =  new Object();

    this.preformatedInputText = null;
    this.outputText = null;
    this.errorText = null;
    this.outputArray = null;
    this.tags = new Object();

    //private
    //string blocks to be used in RegExp pattern substitution
    var blocks = new Object();
    //functions, that prepare input for conversion
    var preformators = null;
    //functions directly converting text
    var convertors = null;
    //functions involved in output checking
    var errorHandlers = null;
    //when errors occur, guides describe how to keep input correct
    var guides = null;
    //hardly sortable
    var miscellaneous =  new Object();
    
        //============================
        // General
        //============================
    
        this.conversionStatus = new Object();

        this.indentation.questionCurlyBrackets = 0;
        this.indentation.questionProperties = 3;
        this.indentation.answersSquareBrackets = 6;
        this.indentation.answerCurlyBrackets = 9;

        //-------------------
        // structure of JSON
        //-------------------
            //ends answer array, ends question object, starts another question object
            //end is put first and it's first occurence is sliced off
            blocks.questionEnd = (function generateQuestionEnd () {

                const body = [
                    ' '.repeat(this.indentation.answersSquareBrackets) + "]\n",
                    ' '.repeat(this.indentation.questionCurlyBrackets) + '}'
                ]

                return body.join('');

            }.bind(this))();

            blocks.questionStart = (function generateQuestionStart () {

                const body = [
                    ",\n",
                    ' '.repeat(this.indentation.questionCurlyBrackets)
                ]

                return body.join('');

            }.bind(this))();

            blocks.repetitiveQuestionUpperBody = blocks.questionEnd + blocks.questionStart + '{' + "\n";
            //starts answer array
            blocks.repetitiveQuestionLowerBody = (function generateQuestionRepetitiveLowerbody () {

                const body = [
                    "\n" + ' '.repeat(this.indentation.questionProperties) + '"answers":' + "\n",
                    ' '.repeat(this.indentation.answersSquareBrackets) + '['
                ]

                return body.join('');

            }.bind(this))()

            this.regExp.removeCommaAfterLastArrayItem = new RegExp(',[\\n](\\s{' + String(this.indentation.answersSquareBrackets) + ',' + String(this.indentation.answersSquareBrackets) + '}])', 'g');
            
        //-------------------
        // /structure of JSON
        //-------------------

        this.settings.visibleHintIdentificator = settings.visible_hint_identificator || '~';
        this.settings.invisibleHintIdentificator = settings.invisible_hint_identificator || '^';
        this.settings.tagIdentificator = settings.tags_identificator || '#';
        this.settings.propertySplitter = settings.tag_splitter || '|';

        miscellaneous.escapeChar = function (character) {

            //character is already escaped
            if (character[0] === '\\' && character[1])
                return character;
            

            return '\\' + character;
        };

        this.regExp.captureHintIdentificators = new RegExp('([' + miscellaneous.escapeChar(this.settings.visibleHintIdentificator) + miscellaneous.escapeChar(this.settings.invisibleHintIdentificator) + miscellaneous.escapeChar(this.settings.tagIdentificator) + '])', 'g');
        miscellaneous.splitterSequence = settings.splitter_sequence || 'ůíá';

        //============================
        // commenting
        //============================

        miscellaneous.commentsMarker = settings.commentsMarker || '=';
        //blocks.comments = new Object();
        //blocks.comments.highlightBody = '//' + miscellaneous.commentsMarker.repeat(30) + "\n";
        this.regExp.comments = new Object();
        this.regExp.comments.pattern =
        new RegExp(
            '^'
            +
            //comment marker at least 3 times
            miscellaneous.commentsMarker + '{3,}'
            +
            //anything, but not comment marker at least once
            '([^' + miscellaneous.commentsMarker + ']+)'
            +
            //comment marker at least 3 times
            miscellaneous.commentsMarker + '{3,}'
            +
            '$',
        'gm');

        this.regExp.comments.replacer = function commentsReplacer (captureGroups) {
            
            let innerNewLines = captureGroups[0].split("\n").length;
            
            return "\n".repeat(innerNewLines);

        }.bind(this);

        //============================
        // questions
        //============================

        this.settings.questionIdStart = settings.question_identificator_start || '(';
        this.settings.questionIdEnd = settings.question_identificator_end || ')';
        this.regExp.questions = new Object();
        this.regExp.questions.pattern = new RegExp(
            '^'
            +
            //from question id start char..
            miscellaneous.escapeChar(this.settings.questionIdStart)
            +
            //..match & capture everything
            '([^'
            +
            //..except question id brackets ()
            miscellaneous.escapeChar(this.settings.questionIdStart) + miscellaneous.escapeChar(this.settings.questionIdEnd)
            +
            //..except new line char..
            "\\n]+?)"
            +
            //..to question id end char..
            miscellaneous.escapeChar(this.settings.questionIdEnd)
            +
            //..and capture everything until the end of line
            "([^\\n]+)$",
        'gm');

        this.regExp.questions.replacer = function questionsReplacer (captureGroups) {
            
            const identificator = captureGroups[0];
            const bodyText = captureGroups[1];

            //contains text, hints
            const bodyObject = miscellaneous.bodyTextProcessor(bodyText);
            //stores individual property lines
            const bodyArray = new Array();

            //process bodyObject to bodyArray
            for (let property in bodyObject) {

                const value = bodyObject[property];

                let propertyOutput = '"' + property + '":';

                if (property !== 'tags') {
                    propertyOutput += '"' + value + '"';
                }
                else {
                    propertyOutput += value;
                }

                propertyOutput += ',';

                bodyArray.push(' '.repeat(this.indentation.questionProperties) + propertyOutput);
            }

            const bodyString = bodyArray.join('\n');

            const questionProperties = ' '.repeat(this.indentation.questionProperties) + '"id":"' + identificator + "\",\n" + bodyString;

            const finalString = blocks.repetitiveQuestionUpperBody + questionProperties + blocks.repetitiveQuestionLowerBody;

            return finalString;

        }.bind(this)

        //============================
        // answers
        //============================

        this.settings.answerCorrect = settings.correct_answer_identificator || 'T';
        this.settings.answerWrong = settings.wrong_answer_identificator || 'X';
        miscellaneous.answerStart = '[' + miscellaneous.escapeChar(this.settings.answerCorrect) + miscellaneous.escapeChar(this.settings.answerWrong) + ']';
        this.settings.answerEnd = settings.answer_end || "\\n";
        this.regExp.answers = new Object();
        this.regExp.answers.pattern = new RegExp(
            '^'
            +
            //match validity character
            '(' + miscellaneous.answerStart + ')'
            +
            //match content
            '([^\\n' + miscellaneous.escapeChar(this.settings.answerEnd) + ']*)'
            +
            '$',
        'gm');

        this.regExp.answers.replacer = function answersReplacer (captureGroups) {
            
            const validity = captureGroups[0] === 'T' ? true : false;
            const bodyText = captureGroups[1];

            const bodyObject = miscellaneous.bodyTextProcessor(bodyText);
            const bodyArray = new Array();

            //bodyObject => bodyArray
            {
                const bodyObjectLastPropertyIndex = Object.keys(bodyObject).length - 1;
                let propertyIndex = 0;

                for (let property in bodyObject) {

                    const value = bodyObject[property];
                    let propertyOutput = '"' + property + '":';
                    
                    if (property !== 'tags') {
                        
                        propertyOutput += '"' + value + '"';
                    }
                    else
                    {
                        propertyOutput += value;
                    }
                    
                    if (propertyIndex !== bodyObjectLastPropertyIndex) {
                        propertyOutput += ',';
                    } else {
                        propertyOutput += '},';
                    }

                    bodyArray.push(propertyOutput);
                    
                    propertyIndex++;
                }
            }

            const final = ' '.repeat(this.indentation.answerCurlyBrackets) + '{"valid":' + validity + ',' + bodyArray.join('');

            return final;

        }.bind(this);

    //========================
    //  PREFORMATORS
    //========================

    preformators = (function createPreformators() {

        const preformators = new Object();

        preformators.escapeDoubleQuotes = function (property) {

            // \ => \\ 
            this[property] = this[property].replace(/\\/g, '\\\\')
        }.bind(this);
    
        preformators.escapeDoubleQuotes = function (property) {
    
            // " => \"
            this[property] = this[property].replace(/\\*(["])/g, "\\$1");
        }.bind(this);
    
        //remove indentation and space leftovers after text on each line
        preformators.trimEachRow = function (string) {
            
            //trim spaces on each row
            string = string.replace(/^[^\S\n]*/gm, '');
            string = string.replace(/[^\S\n]*$/gm, '');
    
            return string;
        }.bind(this);

        return preformators;

    }.bind(this))();

    //========================
    //  CONVERTORS
    //========================

    //most converors have technically useless function arguments
    //their reason is clarity, as they need to be passed in this.convert function
    //they highlight, what properties are going to be affected

    convertors = (function createConvertors () {

        const convertors = new Object();

        convertors.applyRegExp = function applyRegExp (operationLabel, outputText, errorText, regExp, substitutioner) {

            var isCaptured = false;

            this[outputText] = this[outputText].replace(regExp, function applyReplacer (fullMatch, a, b, c, d, e, f) {

                isCaptured = true;

                var captureGroups = [a, b, c, d, e, f];

                //captureGroups = miscellaneous.filterValidCaptureGroups(captureGroups);

                return substitutioner(captureGroups);

            }.bind(this));
            
            if (isCaptured) {
                this[errorText] = this[errorText].replace(regExp, '');
                return true;
            } else {
                return false;
            }
            
        }.bind(this);

        convertors.removeComments = function removeComments (outputText, errorText) {
            convertors.applyRegExp('comments', outputText, errorText, this.regExp.comments.pattern, this.regExp.comments.replacer);
        }.bind(this);

        convertors.removeEmptyLines = function removeEmptyLines (property) {
            this[property] = this[property].replace(/^\s*$\n/gm, '');
        }.bind(this);
        
        convertors.processQuestions = function processQuestions (outputText, errorText) {
            return this.conversionStatus.questions = convertors.applyRegExp('questions', outputText, errorText, this.regExp.questions.pattern, this.regExp.questions.replacer);
        }.bind(this);

        convertors.processAnswers = function processAnswers (outputText, errorText) {
            return convertors.applyRegExp('answers', outputText, errorText, this.regExp.answers.pattern, this.regExp.answers.replacer);
        }.bind(this);

        convertors.finalizePreJsonString = function finalizePreJsonString (property) {

            //remove blocks added from first question, these blocks does not have
            {
                const answersClosingBracketIndex = this[property].indexOf(']');
                const firstCharacter = this[property].indexOf('{', answersClosingBracketIndex);
                const lastCharacter = 1 + Math.max(this[property].lastIndexOf('['), this[property].lastIndexOf(','));
        
                this[property] = this[property].slice(firstCharacter, lastCharacter);
            }
            
            //finish answers array ] and last question object }
            this[property] = '[' + this[property] + "\n" + blocks.questionEnd + ']';
            
            //remove last comma, in answers array
            this[property] = this[property].replace(this.regExp.removeCommaAfterLastArrayItem, "\n$1");
        }.bind(this);

        convertors.JSONparser = function JSONparser (outputText, outputArray) {

            try {
                this[outputArray] = JSON.parse(this[outputText]);
                //throw new Error('');
                return true;
            }
            catch (error) {
                return false;
            }
            
        }.bind(this);

        Object.freeze(convertors);

        return convertors;

    }.bind(this))();

    //========================
    // ERROR HANDLING
    //========================
    this.regExp.findLeftover = new RegExp('^(.+)$', 'm');
    errorHandlers = (function createErrorHandlers () {

        const errorHandlers = new Object();

        errorHandlers.isProcessingSuccessful = function (property) {
        
            if (this.conversionStatus[property])
            {
                return true;
            }
            else
            {
                return false;
            }
        }.bind(this);
    
        //severity describes how bad error is
        //label is main headline for error message
        //content is error output
        //guide is documentFragment, where description of error is
        errorHandlers.writeError = function (severity, label, content, guide) {
    
            this.accessDOM('errorContainer', function (element) {element.setAttribute('data-error', severity)});
            this.accessDOM('errorLabel', function (element, accessor) {element[accessor] = label});
    
            this.accessDOM('errorContent', function (element, accessor) {
    
                if (content instanceof HTMLElement)
                    element.appendChild(content);
                else
                    element[accessor] = content
            });
    
            this.accessDOM('errorGuide', function (element, accessor) {
    
                if (guide instanceof HTMLElement)
                    element.appendChild(guide);
                else
                    element[accessor] = guide
            });
    
        }.bind(this);
    
        //checks if there is any other character than space in this.errorText
        errorHandlers.detectTextLeftovers = function (errorText) {
    
            return !(this[errorText].match(/^[\S]/m) instanceof Object);
        }.bind(this);
    
        
    
        errorHandlers.findLeftover = function (showLinesBefore, showLinesAfter) {
    
            showLinesBefore = showLinesBefore || 10;
            showLinesAfter = showLinesAfter || 10;
    
            const input = this.preformatedInputText;
    
            const leftover = new Object();
    
            this.errorText.replace(this.regExp.findLeftover, function (fullMatch, capturedLeftover) {
    
                leftover.text = capturedLeftover;
            });
    
            leftover.line = this.errorText.indexOf(leftover.text) + 1;
    
            const minLine = leftover.line - showLinesBefore - 2;
            const maxLine = leftover.line + showLinesAfter - 2;
    
            var minIndex = null;
            var maxIndex = null;
            
            {
                let newLineCount = 0;
    
                //try enables quitting global replacement by throwing exception
                try {
                    input.replace(/\n/g, function (fullMatch, offSet) {
                        
                        if (minLine === newLineCount) {
                            minIndex = offSet;
                        }
    
                        if (maxLine === newLineCount) {
                            maxIndex = offSet;
                            throw 'Break loop';
                        }
    
                        newLineCount++;
                        return '\n';
                    })
                } catch (error){};
            }
    
            //when input is short and there is not enough of lines around left over, get it all
            minIndex = minIndex || 0;
            maxIndex = maxIndex || input.length;
            
            leftover.surroundingText = input.slice(minIndex, maxIndex);
    
            return leftover;
        }.bind(this);
    
        errorHandlers.createLeftoverElement = function (leftover) {
    
            const leftoverLines = leftover.surroundingText.split('\n');
            const leftoverLinesLength = leftoverLines.length;
            
            const leftoverIndex = (function findIndex () {
    
                for (let index = 0; index < leftoverLinesLength; index++) {
    
                    if (leftoverLines[index] === leftover.text)
                    {
                        return index;
                    }
                }
    
            })();
    
            const startLineIndex = leftover.line - leftoverIndex;
     
            const reportListElement = (function () {
    
                const list = document.createElement('ul');
                list.classList.add('reportList');
    
                for (let index = 0; index < leftoverLinesLength; index++) {
    
                    const listItemElement = document.createElement('li');
                    list.appendChild(listItemElement);
    
                    const lineNumber = startLineIndex + index;
                    const lineText = leftoverLines[index];
                    
                    const listItemLineNumberElement = document.createElement('span');
                    listItemLineNumberElement.classList.add('lineNumber');
                    listItemLineNumberElement.innerText = String(lineNumber);
                    listItemElement.appendChild(listItemLineNumberElement);
    
                    const listItemTextElement = document.createElement('span');
                    listItemTextElement.classList.add('text');
                    listItemTextElement.innerText = lineText;
                    listItemElement.appendChild(listItemTextElement);
    
                    if (lineNumber === leftover.line) {
                        listItemTextElement.classList.add('leftover')
                    }
                }
    
                const lineNumberLength = list.querySelector('li:last-child span.lineNumber').innerText.trim().length;
                list.setAttribute('data-lineDigits', lineNumberLength)
    
                return list;
            })();
    
            return reportListElement;
        }

        errorHandlers.checkHints = function (item, reportObject) {

            let correct = true;
    
            if ('vH' in item && item.vH.length === 0)
            {
                reportObject.vH = false;
                correct = false;
            }
    
            if ('iH' in item && item.iH.length === 0)
            {
                reportObject.iH = false;
                correct = false;
            }
    
            return correct;
    
        }
    
        //checks integritiy of each question in JSON arra, some properties should not be present in some cases
        errorHandlers.checkProperties = function (question, index) {
    
            const report = new Object();
            let correct = true;
    
            if (question.answers.length === 0)
            {
                report.answers = false;
                correct = false;
            }
            else
            {
                const answersLength = question.answers.length;
                const answersReport = new Array();
    
                for (let answerIndex = 0; answerIndex < answersLength; answerIndex++)
                {
    
                    //if (answerIndex === 0)
                    {
                        const answer = question.answers[answerIndex];
                        const answerReport = new Object();
                        let correctAnswer = true;
    
                        if (answer.text.length === 0)
                        {
                            answerReport.text = false;
                            correctAnswer = false;
                        }
    
                        if (!errorHandlers.checkHints(answer, answerReport))
                        {
                            correctAnswer = false;
                        }
    
                        //answers should not have tags
                        if (answer.tags)
                        {
                            answerReport.tags = true;
                            correctAnswer = false;
                        }
    
                        if (!correctAnswer)
                        {
                            answerReport.index = answerIndex;
                            answersReport.push(answerReport)
                        }
                    }
                }
    
                if (answersReport.length !== 0)
                {
                    report.answers = answersReport;
                    correct = false;
                }
            }
    
            if (!errorHandlers.checkHints(question, report))
            {
                correct = false;
            }
    
            //do not allow empty tags
            if (question.tags)
            {
                const tagLenght = question.tags.length;
    
                for (let tagIndex = 0; tagIndex < tagLenght; tagIndex++)
                {
                    if (question.tags[tagIndex].length === 0) {
                        report.tags = false;
                        correct = false;
                    }
                }
            }
    
            if (!correct) {
                report.succeeded = false;
                return report;
            } else {
                report.succeeded = true;
                return report;
            }
    
        }.bind(this);

        errorHandlers.isIdDuplicate = function isIdDuplicate (array, id) {

            const arrayLength = array.length;

            for (let index = 0; index < arrayLength; index++) {
                if (id === array[index])
                    return true;
            }

            array.push(id);

            return false;

        }
    
        //search for empty or unsound properties in JSON array
        errorHandlers.analyseJSON = function analyzeJSON (outputArray) {
    
            const questions = this[outputArray];
            const questionsLength = questions.length;
    
            const flawedQuestions = new Array();

            const uniqueIdentificators = new Array();
    
            //detecting flaws through all questions
            for (let index = 0; index < questionsLength; index++) {
    
                //if (index === 0)
                {
                    const question = questions[index];
    
                    const report = errorHandlers.checkProperties(question, index);

                    let isIdDuplicate = errorHandlers.isIdDuplicate(uniqueIdentificators, question.id);
                    
                    if (isIdDuplicate) {
                        report.succeeded = false;
                        report.duplicateId = true;
                    }

                    if (!report.succeeded) {
                        report.id = question.id;
                        uniqueIdentificators.push(question.id);
                        report.index = index;
                        flawedQuestions.push(report);
                    }
                }
            }
    
            if (flawedQuestions.length > 0) {
                errorHandlers.reportError('JSONanalysis', flawedQuestions);
            }

            //this.verifyQuestionIdentificators
            return true;
    
        }.bind(this);
    
        errorHandlers.errorContentToggler = function () {
    
            this.accessDOM('errorContainer', function (element) {
    
                element.classList.toggle('contentOpened');
            });
    
    
        }.bind(this);
    
        errorHandlers.createWarningLine = function createWarningLine (text, indentation) {
    
            indentation = indentation || 0;

            const warningLine = document.createElement('span');
            warningLine.classList.add('warningLine');
            warningLine.innerHTML = '&nbsp;'.repeat(indentation) + text;

            return warningLine;
    
        }

        miscellaneous.errorVisibleHintLine = '..has ' + this.settings.visibleHintIdentificator + ', but no content for it';
        miscellaneous.errorInvisibleHintLine = '..has ' + this.settings.invisibleHintIdentificator + ', but no content for it';
        miscellaneous.errorQuestionTags = '..has ' + this.settings.tagIdentificator + ', but at least 1 tag is empty';
        miscellaneous.errorAnswerTags = '..has ' + this.settings.tagIdentificator + ', but answers should not have tags';
    
        errorHandlers.createFlawedQuestionsListElement = function createFlawedQuestionsListElement (flawedQuestions) {
    
            const container = document.createElement('ul');
            container.classList.add('reportList')
    
            const flawedQuestionsLength = flawedQuestions.length;
    
            for (let index = 0; index < flawedQuestionsLength; index++)
            {
    
                //if (index === 0)
                {
                    const questionReport = flawedQuestions[index];
        
                    const questionItem = document.createElement('li');
                    container.appendChild(questionItem);
        
                    const questionId = document.createElement('span');
                    questionId.classList.add('questionId');
                    questionId.innerText = this.settings.questionIdStart + questionReport.id + this.settings.questionIdEnd;
                    questionItem.appendChild(questionId);

                    if (questionReport.duplicateId === true)
                    {
                        const warningLine = errorHandlers.createWarningLine('..identificator is duplicate');
                        questionItem.appendChild(warningLine);
                    }
    
                    if (questionReport.vH === false)
                    {
                        const warningLine = errorHandlers.createWarningLine(miscellaneous.errorVisibleHintLine);
                        questionItem.appendChild(warningLine);
                    }

                    if (questionReport.iH === false)
                    {
                        const warningLine = errorHandlers.createWarningLine(miscellaneous.errorInvisibleHintLine);
                        questionItem.appendChild(warningLine);
                    }

                    if (questionReport.tags === false)
                    {
                        const warningLine = errorHandlers.createWarningLine(miscellaneous.errorQuestionTags);
                        questionItem.appendChild(warningLine);
                    }

                    if (questionReport.answers === false)
                    {
                        const warningLine = errorHandlers.createWarningLine('..has no answers');
                        questionItem.appendChild(warningLine);
    
                    }
                    else if (questionReport.answers instanceof Array && questionReport.answers.length > 0)
                    {
                        const answersLength = questionReport.answers.length;

                        for (let answerIndex = 0; answerIndex < answersLength; answerIndex++)
                        {
                            const answer = questionReport.answers[answerIndex];
                            const warningLine = errorHandlers.createWarningLine('..answer ' + (answer.index + 1));
                            warningLine.classList.add('answer');
                            questionItem.appendChild(warningLine);

                            if (answer.vH === false)
                            {
                                const warningLine = errorHandlers.createWarningLine(miscellaneous.errorVisibleHintLine, 2);
                                questionItem.appendChild(warningLine);
                            }

                            if (answer.iH === false)
                            {
                                const warningLine = errorHandlers.createWarningLine(miscellaneous.errorInvisibleHintLine, 2);
                                questionItem.appendChild(warningLine);
                            }

                            if (answer.tags === true)
                            {
                                const warningLine = errorHandlers.createWarningLine('..answers are not allowed to have tags', 2);
                                questionItem.appendChild(warningLine);
                            }
                        }
                    }
                }
            }
    
            return container;
    
        }.bind(this);
    
        errorHandlers.reportError = function reportError (errorLabel, data) {
    
            switch (errorLabel) {
                case 'questions':
                    {
                        errorHandlers.writeError('medium', 'No questions in input!', '', guides.questionsElement);
                        break;
                    }
                case 'answers':
                    {
                        errorHandlers.writeError('medium', 'No answers in input!', '', guides.answersElement);
                        break;
                    }
                case 'leftovers':
                    {
                        const leftover = errorHandlers.findLeftover(10, 10);
                        
                        const leftoverDataElement = errorHandlers.createLeftoverElement(leftover);
    
                        errorHandlers.writeError('severe', 'Leftovers found!', leftoverDataElement, guides.leftoversElement);
                        break;
                    }
                case 'JSONparse':
                    {
                        //this error type should not be possible
                        //!Shall I make AJAX call to send me email with input text
    
                        errorHandlers.writeError('fatal', 'Fatal error!', '', 'Could not create output because of internal error! Please copy your current input data (left side) and send it to me on uropsilus@gmail.com, you can also contact me on facebook.com/Wourly');
                        break;
                    }
                case 'JSONanalysis':
                    {
                        const flawedQuestions = data;
    
                        const flawedQuestionsElement = errorHandlers.createFlawedQuestionsListElement(flawedQuestions);
    
                        errorHandlers.writeError('soft', 'Almost there!', flawedQuestionsElement, 'Format of your data is already working, but for better future maintenance and to avoid confusion, it is necessary to amend cases above. (double-click to expand)');
                        break;
                    }
                    
                default:
                    break;
            }
    
        }.bind(this);

        Object.freeze(errorHandlers);

        return errorHandlers;

    }.bind(this))();

    //========================
    // GUIDES
    //========================

    guides = (function () {

        const guides = new Object();

        guides.finalizeExample = function (inputArray) {  

            const container = document.createElement('div');
            container.classList.add('example');
    
            const inputArrayMaxIndex = String(inputArray.length - 1);
    
            for (let index in inputArray) {
                
                const span = document.createElement('span');
    
                if (index % 2 === 0)
                {
                    span.classList.add('highlight');
                }
                else
                {
                    span.classList.add('text');
                }
    
                span.innerText = inputArray[index];
    
                if (index === inputArrayMaxIndex)
                    span.classList.add('noSelect');
    
                container.appendChild(span);
            }
    
            return container;

        }.bind(this);
    
        //used in question guide
        guides.fullExample = (function () {
    
            const container = document.createElement('div');
    
            const headline1 = document.createElement('p');
                headline1.classList.add('headline');
                headline1.innerText = 'Real example for question and answers:';
    
            const question1 = guides.finalizeExample(['(', 'squid123', ')', ' Select true facts about squids', '\\n'])
            const answer11 = guides.finalizeExample(['T', ' they live in the sea', '\\n']);
            const answer12 = guides.finalizeExample(['X', ' they desire human meat', '\\n']);
            const answer13 = guides.finalizeExample(['T', ' they have 3 hearts', '\\n']);
            const answer14 = guides.finalizeExample(['X', ' they are ancient alien race', '\\n']);
    
            container.appendChild(headline1);
            container.appendChild(question1);
            container.appendChild(answer11);
            container.appendChild(answer12);
            container.appendChild(answer13);
            container.appendChild(answer14);
    
            const headline2 = document.createElement('p');
                headline2.classList.add('headline');
                headline2.innerText = 'Real example using hints:';
    
            const question2 = guides.finalizeExample(['(', 'squid123', ')', ' Select true facts about squids', '\\n'])
            const answer21 = guides.finalizeExample(['T', ' they live in the sea', '\\n']);
            const headlineForVisibleHint = document.createElement('p');
                headlineForVisibleHint.classList.add('semi-headline');
                headlineForVisibleHint.innerText = 'Hint visible during test:'; 
            const answer22 = guides.finalizeExample(['X', ' they eat human meat ', '@', ' considered wrong, but technically possible', '\\n']);
            const headlineForInvisibleHint = document.createElement('p');
                headlineForInvisibleHint.classList.add('semi-headline');
                headlineForInvisibleHint.innerText = 'Hint visible at the end of test:'; 
            const answer23 = guides.finalizeExample(['T', ' they have more than 1 heart ', '^', ' 3 hearts actually', '\\n']);
            const answer24 = guides.finalizeExample(['X', ' they are ancient alien race', '\\n']);
    
            container.appendChild(headline2);
            container.appendChild(question2);
            container.appendChild(answer21);
            container.appendChild(headlineForVisibleHint);
            container.appendChild(answer22);
            container.appendChild(headlineForInvisibleHint);
            container.appendChild(answer23);
            container.appendChild(answer24);
    
            const headline3 = document.createElement('p');
                headline3.classList.add('semi-headline');
                headline3.innerText = 'You can combine both hints freely and it is also possible to use them for questions.';
    
            container.appendChild(headline3);
    
            return container;
    
        }.bind(this))();
    
        guides.questionsElement = (function generateQuestionGuide () {
    
            const container = document.createElement('div');
    
            const headline1 = document.createElement('p');
            headline1.classList.add('headline');
            headline1.innerText = 'Questions should have the following format:';
    
            const example1 = guides.finalizeExample(['(', 'identificator', ')', ' question text', '\\n']);
    
            const headline2 = document.createElement('p');
            headline2.classList.add('headline');
            headline2.innerText = 'Real question example:';
    
            const example2 = guides.finalizeExample(['(', 'squid123', ')', ' Select true facts about squids', '\\n']);
    
            container.appendChild(headline1);
            container.appendChild(example1);
            container.appendChild(headline2);
            container.appendChild(example2);
    
            return container;
    
        }.bind(this))();
    
        guides.answersElement = (function generateQuestionGuide () {
    
            const container = document.createElement('div');
    
            const headline1 = document.createElement('p');
            headline1.classList.add('headline');
            headline1.innerText = 'Answers should have the following format:';
    
            const example1T = guides.finalizeExample(['T', ' correct answer text', '\\n']);
            const example1W = guides.finalizeExample(['X', ' wrong answer text', '\\n']);
    
            const headline2 = document.createElement('p');
            headline2.classList.add('headline');
            headline2.innerText = 'Real answer example:';
    
            const example2T = guides.finalizeExample(['T', ' beer is good', '\\n']);
            const example2W = guides.finalizeExample(['X', ' monkeys evolved from humans', '\\n']);
    
            container.appendChild(headline1);
            container.appendChild(example1T);
            container.appendChild(example1W);
            container.appendChild(headline2);
            container.appendChild(example2T);
            container.appendChild(example2W);
            container.appendChild(guides.fullExample);
    
            return container;
    
        }.bind(this))();
    
        guides.leftoversElement = (function () {
    
            const container = document.createElement('div');
    
            const headline1 = document.createElement('p');
                headline1.classList.add('headline');
                headline1.innerText = 'What are leftovers?';
            const text1 = document.createTextNode('Leftovers are bits of text, that are not recognized by convertor. Leftovers may also be unfinished questions - if it is so, finish question by it\'s pattern.');
            container.appendChild(headline1);
            container.appendChild(text1);
    
            const headline2 = document.createElement('p');
                headline2.classList.add('headline');
                headline2.innerText = 'Why do you need to delete them?';
            const text2 = document.createTextNode('These bits of text do not fit into JSON (converted format) and make it impossible for computer to understand it.');
            container.appendChild(headline2);
            container.appendChild(text2);
    
            const headline3 = document.createElement('p');
                headline3.classList.add('headline');
                headline3.innerText = 'How do I find them?';
            const text3 = document.createTextNode('You can find them by checking line number. You can also search for nearby texts.');
            const subtext3 = document.createElement('p');
                subtext3.classList.add('tiny');
                subtext3.innerText = 'Note: Some text editors (eg. Microsoft Word use different line numbering), they show line number just according to how you currently see the document, while those line numbers were calculated by using "\\n" character, which is usually generated by pressing enter. For this purpose you can just use Notepad (find it from Start search if you have windows). But be careful, as copying text to notepad will remove all formatting - so do not copy it back.'
            container.appendChild(headline3);
            container.appendChild(text3);
            container.appendChild(subtext3);
    
            return container;
            
        })();

        Object.freeze(guides);

        return guides;

    }.bind(this))();
    
    //========================
    //  MISCELLANEOUS
    //========================

    miscellaneous.properties = ['answers', 'vH', 'iH', 'tags'];

    //return bodyObject, which contains text and properties separated by symbols
    //these properties are mostly 'hints'
    miscellaneous.bodyTextProcessor = function bodyTextProcessor (textBody) {

        const markedTextBody = textBody.replace(this.regExp.captureHintIdentificators, miscellaneous.splitterSequence + "$1");
        
        const splitTokens = markedTextBody.split(miscellaneous.splitterSequence);

        const bodyObject = new Object();
        bodyObject.text = splitTokens[0].trim();

        //index 0 is always question text
        for (let index = 1; index < splitTokens.length; index++) {

            splitTokens[index].replace(/(.)(.*)/, function processProperties (fullMatch, variableIdentifier, variableText) {
                
                var recognizedVariable = null;
                
                switch (variableIdentifier) {
                    case this.settings.visibleHintIdentificator:
                        recognizedVariable = 'vH';
                        break;
                    case this.settings.invisibleHintIdentificator:
                        recognizedVariable = 'iH';
                        break;
                    case this.settings.tagIdentificator:
                        recognizedVariable = 'tags'
                        
                        variableText = miscellaneous.processTags(variableText);

                        break;
                    default:
                        recognizedVariable = variableIdentifier;
                        break;
                }

                bodyObject[recognizedVariable] = variableText.trim();
                
            }.bind(this));
        }

        return bodyObject;

    }.bind(this);

    miscellaneous.processTags = function (tagsString) {

        const tagArray = tagsString.split(this.settings.propertySplitter);
        const tagArrayLength = tagArray.length;

        const preStringArray = new Array();

        for (let index = 0; index < tagArrayLength; index++) {
            const tag = tagArray[index].trim();

            preStringArray.push('"' + tag + '"');
        }

        const final = '[' + preStringArray.join(',') + ']';

        return final;

    }.bind(this);

    //only effective for debugging purposes
    //only keeps array from capture groups
    miscellaneous.filterValidCaptureGroups = function (captureGroups) {

        var sliceEndIndex = null;

        for (var index = 0; index < captureGroups.length; index++) {
            if (Number.isInteger(captureGroups[index])) {
                sliceEndIndex = index;
            }
        }

        return captureGroups.slice(0, sliceEndIndex);
    };

    //never used now, had meaning before
    miscellaneous.settingsTokens = (function () {

        const tokens = new Array();

        for (let token in this.settings) {
            tokens.push(this.settings[token]);
        }

        return tokens;

    }.bind(this))();

    miscellaneous.clearOutputElement = function () {
        this.accessDOM('output', function (element, accessor) {element[accessor] = ''})
    }.bind(this);

    miscellaneous.clearErrorElements = function () {

        this.accessDOM('errorContainer', function (element) {element.removeAttribute('data-error')});
        this.accessDOM('errorLabel', function (element, accessor) {element[accessor] = ''})
        this.accessDOM('errorContent', function (element, accessor) {element[accessor] = ''})
        this.accessDOM('errorGuide', function (element, accessor) {element[accessor] = ''})
        
    }.bind(this);

    miscellaneous.copyInput = function () {
        return this.accessDOM('input', function (element, accessor) {return element[accessor]});
    }.bind(this);

    miscellaneous.fillOutputTextarea = function (outputText) {
        this.accessDOM('output', function (element, accessor) {
            element[accessor] = this[outputText];
        }.bind(this))
    }.bind(this);

    miscellaneous.countTags = function countTags (outputArray, tagsContainer) {
        
        const questions = this[outputArray];
        const questionsLength = questions.length;

        const tagsObject = this[tagsContainer];

        for (let index = 0; index < questionsLength; index++) {

            if (questions[index].tags)
            {
                const tags = questions[index].tags;
                const tagLenght = tags.length;

                for (let tagIndex = 0; tagIndex < tagLenght; tagIndex++)
                {
                    const tag = tags[tagIndex];

                    if (!tagsObject[tag])
                        tagsObject[tag] = 1;
                    else
                        tagsObject[tag]++;
                }
            }
        }

    }.bind(this);

    miscellaneous.finalizeOutputText = function finalizeOutputText (outputText, tagsContainer) {

        this[outputText] = "const QUESTIONS = \n" + this[outputText] + ';' + "\n" + 'const TAGS = ' + JSON.stringify(this[tagsContainer]) + ';';
        
    }.bind(this);

    //========================
    // MAIN FUNCTION
    //========================

    this.convert = function mainConversionFunction () {

        console.clear();
        var performanceStart = performance.now();

        //stores, which steps were completed, so it may clarify, where code is stuck
        this.conversionStatus = new Object();

        miscellaneous.clearOutputElement();
        miscellaneous.clearErrorElements();

        this.preformatedInputText = miscellaneous.copyInput();
        this.outputText = null;
        this.errorText = null;
        this.outputArray = null;
        this.tags = new Object();

        //JSON bug prevention
        preformators.escapeDoubleQuotes('preformatedInputText');

        this.preformatedInputText = preformators.trimEachRow(this.preformatedInputText);

        this.outputText = this.preformatedInputText;
        this.errorText = this.preformatedInputText;

        convertors.removeComments('outputText', 'errorText');
        convertors.removeEmptyLines('outputText');

        //processing questions
        this.conversionStatus.questions = convertors.processQuestions('outputText', 'errorText');
        if (!errorHandlers.isProcessingSuccessful('questions')) {
            errorHandlers.reportError('questions');
            return;
        }
        console.log(performance.now() - performanceStart, 'questions converted');

        //processing answers
        this.conversionStatus.answers = convertors.processAnswers('outputText', 'errorText');
        if (!errorHandlers.isProcessingSuccessful('answers')) {
            errorHandlers.reportError('answers');
            return;
        }
        console.log(performance.now() - performanceStart, 'answers converted');

        //checking for unprocessed code
        this.conversionStatus.leftovers = errorHandlers.detectTextLeftovers('errorText');
        if (!errorHandlers.isProcessingSuccessful('leftovers')) {
            errorHandlers.reportError('leftovers');
            return;
        }
        console.log(performance.now() - performanceStart, 'leftovers resolved');

        convertors.finalizePreJsonString('outputText');
        console.log(performance.now() - performanceStart, 'text for JSON parse');

        //this.outputText = 'tak tohle nepůjde, kámo';
        this.conversionStatus.JSONparse = convertors.JSONparser('outputText', 'outputArray');
        if (!errorHandlers.isProcessingSuccessful('JSONparse')) {
            errorHandlers.reportError('JSONparse');
            return;
        }
        console.log(performance.now() - performanceStart, 'JSONparsed');

        //already contains errorHandling, but it does not affect structural changes of JSON
        this.conversionStatus.JSONanalysis = errorHandlers.analyseJSON('outputArray');
        console.log(performance.now() - performanceStart, 'JSONanalyzed');

        miscellaneous.countTags('outputArray', 'tags');
        console.log(performance.now() - performanceStart, 'tags created');

        miscellaneous.finalizeOutputText('outputText', 'tags');
        console.log(performance.now() - performanceStart, 'text finalized');

        miscellaneous.fillOutputTextarea('outputText');
        console.log(performance.now() - performanceStart, 'finished');

        return true;

    }.bind(this);

    //========================
    // ATTACHEMENT
    //========================

    this.attach = function () {
        this.DOM.input.element.addEventListener('input', this.convert);
        this.DOM.errorContent.element.addEventListener('dblclick', errorHandlers.errorContentToggler);
    }.bind(this);
}