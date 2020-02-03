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

    //stores characters used as identificators for RegExp
    this.settings = new Object();
    //stores information for JSON indentation
    this.indentation = new Object();
    //string blocks to be used in RegExp pattern substitution
    this.blocks = new Object();
    //stores main RegExp pattens and main RegExp substitution functions
    this.regExp = new Object();
    //functions, that prepare input for conversion
    this.preformators = new Object();
    //functions directly converting text
    this.convertors = new Object();
    //functions involved in output checking
    this.errorHandlers = new Object();
    //when errors occur, guides describe how to keep input correct
    this.guides = new Object();
    //hardly sortable
    this.miscellaneous = new Object();
    
        //============================
        // General
        //============================

        this.preformatedInputText = null;
        this.outputText = null;
        this.errorText = null;
        this.outputArray = null;
        this.tags = new Object();
    
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
            this.blocks.questionEnd = (function generateQuestionEnd () {

                const body = [
                    ' '.repeat(this.indentation.answersSquareBrackets) + "]\n",
                    ' '.repeat(this.indentation.questionCurlyBrackets) + '}'
                ]

                return body.join('');

            }.bind(this))();

            this.blocks.questionStart = (function generateQuestionStart () {

                const body = [
                    ",\n",
                    ' '.repeat(this.indentation.questionCurlyBrackets)
                ]

                return body.join('');

            }.bind(this))();

            this.blocks.repetitiveQuestionUpperBody = this.blocks.questionEnd + this.blocks.questionStart + '{' + "\n";
            //starts answer array
            this.blocks.repetitiveQuestionLowerBody = (function generateQuestionRepetitiveLowerbody () {

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
        this.settings.tagSplitter = settings.tag_splitter || '|';

        this.miscellaneous.escapeChar = function (character) {

            //character is already escaped
            if (character[0] === '\\' && character[1])
                return character;
            

            return '\\' + character;
        };

        this.regExp.captureHintIdentificators = new RegExp('([' + this.miscellaneous.escapeChar(this.settings.visibleHintIdentificator) + this.miscellaneous.escapeChar(this.settings.invisibleHintIdentificator) + this.miscellaneous.escapeChar(this.settings.tagIdentificator) + '])', 'g');
        this.miscellaneous.splitterSequence = settings.splitter_sequence || 'ůíá';



        

        //============================
        // commenting
        //============================

        this.miscellaneous.commentsMarker = settings.commentsMarker || '=';
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

        this.settings.questionIdStart = settings.question_identificator_start || '(';
        this.settings.questionIdEnd = settings.question_identificator_end || ')';
        this.regExp.questions = new Object();
        this.regExp.questions.pattern = new RegExp(
            '^'
            +
            //from question id start char..
            this.miscellaneous.escapeChar(this.settings.questionIdStart)
            +
            //..match & capture everything
            '([^'
            +
            //..except question id brackets ()
            this.miscellaneous.escapeChar(this.settings.questionIdStart) + this.miscellaneous.escapeChar(this.settings.questionIdEnd)
            +
            //..except new line char..
            "\\n]+?)"
            +
            //..to question id end char..
            this.miscellaneous.escapeChar(this.settings.questionIdEnd)
            +
            //..and capture everything until the end of line
            "([^\\n]+)$",
        'gm');

        this.regExp.questions.replacer = function (captureGroups) {
            
            const identificator = captureGroups[0];
            const bodyText = captureGroups[1];

            //contains text, hints
            const bodyObject = this.miscellaneous.bodyTextProcessor(bodyText);
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

            const finalString = this.blocks.repetitiveQuestionUpperBody + questionProperties + this.blocks.repetitiveQuestionLowerBody;

            return finalString;

        }.bind(this)

        //============================
        // answers
        //============================

        this.settings.answerCorrect = settings.correct_answer_identificator || 'T';
        this.settings.answerWrong = settings.wrong_answer_identificator || 'X';
        this.miscellaneous.answerStart = '[' + this.miscellaneous.escapeChar(this.settings.answerCorrect) + this.miscellaneous.escapeChar(this.settings.answerWrong) + ']';
        this.settings.answerEnd = settings.answer_end || "\\n";
        this.regExp.answers = new Object();
        this.regExp.answers.pattern = new RegExp(
            '^'
            +
            //match validity character
            '(' + this.miscellaneous.answerStart + ')'
            +
            //match content
            '([^\\n' + this.miscellaneous.escapeChar(this.settings.answerEnd) + ']*)'
            +
            '$',
        'gm');

        this.regExp.answers.replacer = function (captureGroups) {
            
            const validity = captureGroups[0] === 'T' ? true : false;
            const bodyText = captureGroups[1];

            const bodyObject = this.miscellaneous.bodyTextProcessor(bodyText);
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
    this.preformators.escapeDoubleQuotes = function (property) {

        // \ => \\ 
        this[property] = this[property].replace(/\\/g, '\\\\')
    }.bind(this);

    this.preformators.escapeDoubleQuotes = function (property) {

        // " => \"
        this[property] = this[property].replace(/\\*(["])/g, "\\$1");
    }.bind(this);

    //remove indentation and space leftovers after text on each line
    this.preformators.trimEachRow = function (string) {
        
        //trim spaces on each row
        string = string.replace(/^[^\S\n]*/gm, '');
        string = string.replace(/[^\S\n]*$/gm, '');

        return string;
    }.bind(this);

    //========================
    //  CONVERTORS
    //========================

    //most converors have technically useless function arguments
    //their reason is clarity, as they need to be passed in this.convert function
    //they highlight, what properties are going to be affected

    this.convertors.applyRegExp = function (operationLabel, outputText, errorText, regExp, substitutioner) {

        var isCaptured = false;

        this[outputText] = this[outputText].replace(regExp, function (fullMatch, a, b, c, d, e, f) {

            isCaptured = true;

            var captureGroups = [a, b, c, d, e, f];

            //captureGroups = this.miscellaneous.filterValidCaptureGroups(captureGroups);

            return substitutioner(captureGroups);

        }.bind(this));
        
        if (isCaptured) {
            this[errorText] = this[errorText].replace(regExp, '');
            return true;
        } else {
            return false;
        }
        
    }.bind(this);

    this.convertors.removeComments = function (outputText, errorText) {
        this.convertors.applyRegExp('comments', outputText, errorText, this.regExp.comments.pattern, this.regExp.comments.replacer);
    }.bind(this);

    this.convertors.removeEmptyLines = function (property) {
        this[property] = this[property].replace(/^\s*$\n/gm, '');
    }.bind(this);
    
    this.convertors.processQuestions = function (outputText, errorText) {
        return this.conversionStatus.questions = this.convertors.applyRegExp('questions', outputText, errorText, this.regExp.questions.pattern, this.regExp.questions.replacer);
    }.bind(this);

    this.convertors.processAnswers = function (outputText, errorText) {
        return this.convertors.applyRegExp('answers', outputText, errorText, this.regExp.answers.pattern, this.regExp.answers.replacer);
    }.bind(this);

    this.convertors.finalizePreJsonString = function (property) {

        //remove blocks added from first question, these blocks does not have
        {
            const answersClosingBracketIndex = this[property].indexOf(']');
            const firstCharacter = this[property].indexOf('{', answersClosingBracketIndex);
            const lastCharacter = 1 + Math.max(this[property].lastIndexOf('['), this[property].lastIndexOf(','));
    
            this[property] = this[property].slice(firstCharacter, lastCharacter);
        }
        
        //finish answers array ] and last question object }
        this[property] = '[' + this[property] + "\n" + this.blocks.questionEnd + ']';
        
        //remove last comma, in answers array
        this[property] = this[property].replace(this.regExp.removeCommaAfterLastArrayItem, "\n$1");
    }.bind(this);

    //========================
    //  ERROR HANDLING
    //========================

    this.errorHandlers.isProcessingSuccessful = function (property) {
        
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
    this.errorHandlers.writeError = function (severity, label, content, guide) {

        this.accessDOM('errorContainer', function (element) {element.setAttribute('data-error', severity)});
        this.accessDOM('errorLabel', function (element, accessor) {element[accessor] = label});

        this.accessDOM('errorContent', function (element, accessor) {

            if (content instanceof HTMLElement)
                element.appendChild(content);
            else
                element[accessor] = content
        });

        this.accessDOM('errorGuide', function (element) {element.appendChild(guide)});

    }.bind(this);

    //checks if there is any other character than space in this.errorText
    this.errorHandlers.detectTextLeftovers = function (errorText) {

        return !(this[errorText].match(/^[\S]/m) instanceof Object);
    }.bind(this);

    this.regExp.findLeftover = new RegExp('^(.+)$', 'm');

    this.errorHandlers.findLeftover = function (showLinesBefore, showLinesAfter) {

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

    this.errorHandlers.createLeftoverListElement = function (leftover) {

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

    this.miscellaneous.hints = ['vH', 'iH', 'tags'];

    this.errorHandlers.checkHints = function (reportObject, block, index) {
       
        if (index === 1) {
            const hints = new Array();

            for (let hintIndex = 0; hintIndex < this.miscellaneous.hints.length; hintIndex++) {
                const hint = this.miscellaneous.hints[hintIndex];

                console.log(hint);
            }

            console.log(block)
        }
        

    }.bind(this);

    //search for empty or unsound properties in JSON array
    this.errorHandlers.analyseJSON = function (outputArray) {

        const questions = this[outputArray];
        const questionsLength = questions.length;

        const flawedQuestions = new Array();

        //detecting flaws through all questions
        /*for (let index = 0; index < questionsLength; index++) {

            if (index === 2) {
                const question = questions[index];
                const answers = question.answers;
                const answersLength = answers.length;

                console.log(question);

                let report = new Object();
                let isFlawed = false;

                
    //!!!!!
                report.answers = Boolean(answersLength);

                if (report.answers) {
                    
                    for (let answerIndex = 0; answerIndex < answersLength; answerIndex++) {

                        const answer = answers[answerIndex];

                        this.errorHandlers.checkHints(report, answer, answerIndex);
                    }
                }

                this.errorHandlers.check

                console.log(report)
            }
            

            
        }

        //console.log(flawedQuestions);*/


    }.bind(this);

    this.errorHandlers.reportError = function (errorLabel) {

        switch (errorLabel) {
            case 'questions':
                {
                    this.errorHandlers.writeError('mild', 'No questions in input!', null, this.guides.questionsElement);
                    break;
                }
            case 'answers':
                {
                    this.errorHandlers.writeError('mild', 'No answers in input!', null, this.guides.answersElement);
                    break;
                }
            case 'leftovers':
                {
                    const leftover = this.errorHandlers.findLeftover(10, 10);
                    
                    const leftoverDataElement = this.errorHandlers.createLeftoverListElement(leftover);

                    this.errorHandlers.writeError('severe', 'Leftovers found!', leftoverDataElement, this.guides.leftoversElement);
                }
            case 'JSONparse':
                {
                    //this error type should not be possible
                    //!I shall make AJAX call to send me email with input text
                }
                
            default:
                break;
        }

    }.bind(this);

    //========================
    //  GUIDES
    //========================

    this.guides.finalizeExample = function (inputArray) {  

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
    }

    //used in question guide
    this.guides.fullExample = (function () {

        const container = document.createElement('div');

        const headline1 = document.createElement('p');
            headline1.classList.add('headline');
            headline1.innerText = 'Real example for question and answers:';

        const question1 = this.guides.finalizeExample(['(', 'squid123', ')', ' Select true facts about squids', '\\n'])
        const answer11 = this.guides.finalizeExample(['T', ' they live in the sea', '\\n']);
        const answer12 = this.guides.finalizeExample(['X', ' they desire human meat', '\\n']);
        const answer13 = this.guides.finalizeExample(['T', ' they have 3 hearts', '\\n']);
        const answer14 = this.guides.finalizeExample(['X', ' they are ancient alien race', '\\n']);

        container.appendChild(headline1);
        container.appendChild(question1);
        container.appendChild(answer11);
        container.appendChild(answer12);
        container.appendChild(answer13);
        container.appendChild(answer14);

        const headline2 = document.createElement('p');
            headline2.classList.add('headline');
            headline2.innerText = 'Real example using hints:';

        const question2 = this.guides.finalizeExample(['(', 'squid123', ')', ' Select true facts about squids', '\\n'])
        const answer21 = this.guides.finalizeExample(['T', ' they live in the sea', '\\n']);
        const headlineForVisibleHint = document.createElement('p');
            headlineForVisibleHint.classList.add('semi-headline');
            headlineForVisibleHint.innerText = 'Hint visible during test:'; 
        const answer22 = this.guides.finalizeExample(['X', ' they eat human meat ', '@', ' considered wrong, but technically possible', '\\n']);
        const headlineForInvisibleHint = document.createElement('p');
            headlineForInvisibleHint.classList.add('semi-headline');
            headlineForInvisibleHint.innerText = 'Hint visible at the end of test:'; 
        const answer23 = this.guides.finalizeExample(['T', ' they have more than 1 heart ', '^', ' 3 hearts actually', '\\n']);
        const answer24 = this.guides.finalizeExample(['X', ' they are ancient alien race', '\\n']);

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

    this.guides.questionsElement = (function generateQuestionGuide () {

        const container = document.createElement('div');

        const headline1 = document.createElement('p');
        headline1.classList.add('headline');
        headline1.innerText = 'Questions should have the following format:';

        const example1 = this.guides.finalizeExample(['(', 'identificator', ')', ' question text', '\\n']);

        const headline2 = document.createElement('p');
        headline2.classList.add('headline');
        headline2.innerText = 'Real question example:';

        const example2 = this.guides.finalizeExample(['(', 'squid123', ')', ' Select true facts about squids', '\\n']);

        container.appendChild(headline1);
        container.appendChild(example1);
        container.appendChild(headline2);
        container.appendChild(example2);

        return container;

    }.bind(this))();

    this.guides.answersElement = (function generateQuestionGuide () {

        const container = document.createElement('div');

        const headline1 = document.createElement('p');
        headline1.classList.add('headline');
        headline1.innerText = 'Answers should have the following format:';

        const example1T = this.guides.finalizeExample(['T', ' correct answer text', '\\n']);
        const example1W = this.guides.finalizeExample(['X', ' wrong answer text', '\\n']);

        const headline2 = document.createElement('p');
        headline2.classList.add('headline');
        headline2.innerText = 'Real answer example:';

        const example2T = this.guides.finalizeExample(['T', ' beer is good', '\\n']);
        const example2W = this.guides.finalizeExample(['X', ' monkeys evolved from humans', '\\n']);

        container.appendChild(headline1);
        container.appendChild(example1T);
        container.appendChild(example1W);
        container.appendChild(headline2);
        container.appendChild(example2T);
        container.appendChild(example2W);
        container.appendChild(this.guides.fullExample);

        return container;

    }.bind(this))();

    this.guides.leftoversElement = (function () {

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

    //========================
    //  MISCELLANEOUS
    //========================

    //return bodyObject, which contains text and properties separated by symbols
    //these properties are mostly 'hints'
    this.miscellaneous.bodyTextProcessor = function (textBody) {

        const markedTextBody = textBody.replace(this.regExp.captureHintIdentificators, this.miscellaneous.splitterSequence + "$1");
        
        const splitTokens = markedTextBody.split(this.miscellaneous.splitterSequence);

        const bodyObject = new Object();
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
                    case this.settings.tagIdentificator:
                        recognizedVariable = 'tags'

                        variableText = this.miscellaneous.processTags(variableText);

                        break;
                    default:
                        recognizedVariable = variableIdentifier;
                        break;
                }

                bodyObject[recognizedVariable] = variableText.trim();

            }.bind(this));
        }

        console.log(bodyObject);
        return bodyObject;

    }.bind(this);

    this.miscellaneous.processTags = function (tagsString) {

        console.log(tagsString);

        const tagArray = tagsString.split(this.settings.tagSplitter);
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
    this.miscellaneous.filterValidCaptureGroups = function (captureGroups) {

        var sliceEndIndex = null;

        for (var index = 0; index < captureGroups.length; index++) {
            if (Number.isInteger(captureGroups[index])) {
                sliceEndIndex = index;
            }
        }

        return captureGroups.slice(0, sliceEndIndex);
    };

    //never used now, had meaning before
    this.miscellaneous.settingsTokens = (function () {

        const tokens = new Array();

        for (let token in this.settings) {
            tokens.push(this.settings[token]);
        }

        return tokens;

    }.bind(this))();

    this.miscellaneous.clearOutputElement = function () {
        this.accessDOM('output', function (element, accessor) {element[accessor] = ''})
    }.bind(this);

    this.miscellaneous.clearErrorElements = function () {

        this.accessDOM('errorContainer', function (element) {element.removeAttribute('data-error')});
        this.accessDOM('errorLabel', function (element, accessor) {element[accessor] = ''})
        this.accessDOM('errorContent', function (element, accessor) {element[accessor] = ''})
        this.accessDOM('errorGuide', function (element, accessor) {element[accessor] = ''})
        
    }.bind(this);

    this.miscellaneous.copyInput = function () {
        return this.accessDOM('input', function (element, accessor) {return element[accessor]});
    }.bind(this);

    this.miscellaneous.fillOutputTextarea = function (outputText) {
        this.accessDOM('output', function (element, accessor) {
            element[accessor] = this[outputText];
        }.bind(this))
    }.bind(this);


    /////////////oierhgierg iůergů ebogbe irgb eir g
    this.convertors.JSONparser = function (outputText, outputArray) {

        try {
            this[outputArray] = JSON.parse(this[outputText]);
            //throw new Error('');
            return true;
        }
        catch (error) {
            return false;
        }
        
    }.bind(this);

    //========================
    // MAIN FUNCTION
    //========================

    this.convert = function () {

        var performanceStart = performance.now();

        //stores, which steps were completed, so it may clarify, where code is stuck
        this.conversionStatus = new Object();

        this.miscellaneous.clearOutputElement();
        this.miscellaneous.clearErrorElements();

        this.preformatedInputText = this.miscellaneous.copyInput();
        this.outputText = null;
        this.errorText = null;
        this.outputArray = null;
        this.tags = new Object();

        //JSON bug prevention
        this.preformators.escapeDoubleQuotes('preformatedInputText');
        this.preformators.escapeDoubleQuotes('preformatedInputText');

        this.preformatedInputText = this.preformators.trimEachRow(this.preformatedInputText);

        this.outputText = this.preformatedInputText;
        this.errorText = this.preformatedInputText;

        this.convertors.removeComments('outputText', 'errorText');
        this.convertors.removeEmptyLines('outputText');

        //processing questions
        this.conversionStatus.questions = this.convertors.processQuestions('outputText', 'errorText');
        if (!this.errorHandlers.isProcessingSuccessful('questions')) {
            this.errorHandlers.reportError('questions');
            return;
        }

        //processing answers
        this.conversionStatus.answers = this.convertors.processAnswers('outputText', 'errorText');
        if (!this.errorHandlers.isProcessingSuccessful('answers')) {
            this.errorHandlers.reportError('answers');
            return;
        }

        //checking for unprocessed code
        this.conversionStatus.leftovers = this.errorHandlers.detectTextLeftovers('errorText');
        if (!this.errorHandlers.isProcessingSuccessful('leftovers')) {
            this.errorHandlers.reportError('leftovers');
            return;
        }

        this.convertors.finalizePreJsonString('outputText');

        this.conversionStatus.JSONparse = this.convertors.JSONparser('outputText', 'outputArray');
        if (!this.errorHandlers.isProcessingSuccessful('JSONparse')) {
            this.errorHandlers.reportError('JSONparse');
            return;
        }

        this.miscellaneous.fillOutputTextarea('outputText');

        //already contains errorHandling
        this.conversionStatus.JSONanalysis = this.errorHandlers.analyseJSON('outputArray');
        if (!this.errorHandlers.isProcessingSuccessful('JSONanalysis')) {
            
            this.miscellaneous.fillOutputTextarea('outputText');
        }
        
        var performanceEnd = performance.now();
        console.log(performanceEnd - performanceStart);

        return true;

    }.bind(this);

    //========================
    // ATTACHEMENT
    //========================

    this.start = function () {
        this.DOM.input.element.addEventListener('input', this.convert)
    }.bind(this);
}