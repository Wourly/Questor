"use strict"

function Questor (QUESTIONS, TAGS, SETTINGS) {

    this.QUESTIONS = QUESTIONS || null;
    this.TAGS = TAGS || null;
    this.SETTINGS = SETTINGS || null;
    this.questionsMaxIndex = this.QUESTIONS.length - 1 || null;
    
    this.DOM = null;

    this.misc = null;
    this.API = null;
    this.build = null;
    this.activate = null;
    this.runtime = null;
    this.errorHandling = null;

    Object.seal(this);

    //creates object containing requested elements by their ids
    function connectDOM (ids) {

        const container = new Object();

        if (ids)
        {
            const idsLength = ids.length;

            for (let index = 0; index < idsLength; index++)
            {
                const id = ids[index];
                const element = document.getElementById(id);
    
                //if no element was found
                if (!(container[id] = element)) {
    
                    //console.error('Could not connect to DOM, when connecting to element with id: ' + id);
                    throw new Error('Could not connect to DOM, when connecting to element with id: ' + id);
                }
            }
        }

        return container;
    };

    //stores references to important elements
    this.DOM = (function DOM ()
    {
        const DOM = new Object();

        DOM.menu = connectDOM(['menu','option-custom', 'option-real', 'tags-array', 'index-array', 'custom-inputs', 'flat-input', 'index-input', 'tags-input', 'read-button', 'start-button', 'finish-button']);
        DOM.flatInput = connectDOM(['flatInputMin', 'flatInputMax']);
        DOM.inventory = connectDOM(['subject-name', 'test-summary', 'incorrect-indexes', 'saved-indexes']);
        DOM.score = connectDOM(['total-questions']);
        DOM.global = connectDOM(['test-main', 'content', 'footer', 'question-position', 'arrow-left', 'arrow-right']);

        DOM.misc = connectDOM();

        return DOM;

    })();

    this.API = (function API ()
    {
        const API = new Object();

        API.loadQuestions = null;
        API.loadTags = null;
        API.setupTest = null;

        Object.seal(API);

        //could possibly be 'absorbData' with specified property, but it loses semantics
        API.loadQuestions = function loadQuestions (data) {

            if (data && Array.isArray(data))
            {
                this.QUESTIONS = data;
            }

        }.bind(this);

        API.loadTags = function loadTags (data) {

            if (data && Array.isArray(data))
            {
                this.TAGS = data;
            }
        }

        API.setupTest = function setupTest ()
        {
            
        }

        return API;

    }.bind(this))();

    
//console.log(this.DOM)
/*
    this.DOM.global['footer'].addEventListener('click', function toggleInventory ()
    {
        const inventory = this.DOM.global['footer'];
        
        if (!inventory.hasAttribute('open'))
        {
            inventory.setAttribute('open', '');
        }
        else
        {
            inventory.removeAttribute('open');
        }


    }.bind(this));
*/
    this.build = (function BUILD ()
    {
        const build = new Object();

        //functions
        build.newTestContent = null;
        build.questionPage = null;
        build.questionBlock = null;

        build.menuTags = null;

        Object.seal(build);

        build.menuTags = function menuTags () {

            const fragment = new DocumentFragment();

            const tags = this.TAGS;

            for (let property in tags)
            {
                const tagContainer = document.createElement('tag-container');
                fragment.appendChild(tagContainer);
                tagContainer.classList.add('button');
                tagContainer.classList.add('togglable');
                tagContainer.setAttribute('data-value', property.trim());

                const tagName = document.createElement('tag-name');
                tagContainer.appendChild(tagName);
                tagName.innerText = property;

                const tagCount = document.createElement('tag-count');
                tagContainer.appendChild(tagCount);
                tagCount.innerText = tags[property];
            };
            
            this.DOM.menu['tags-array'].innerHTML = '';
            this.DOM.menu['tags-array'].appendChild(fragment);

        }.bind(this);

        build.newTestContent = function newTestContent (inputIndexes) {

            if (inputIndexes instanceof Array)
            {
                const content = this.DOM.global.content;
                const contentFragment = new DocumentFragment();
                const quantity = 10;
                const indexesLength = inputIndexes.length;

                content.innerHTML = '';

                const indexChunks = new Array();

                //generate chunks for questionPages
                {
                    let chunk = new Array();

                        for(let i = 0; i < indexesLength; i++)
                        {
                            chunk.push(inputIndexes[i])        

                            if ((i + 1) % quantity === 0) {
                                indexChunks.push(chunk);
                                chunk = new Array();
                            }
                        }

                        if (chunk.length !== 0)
                            indexChunks.push(chunk);
                }

                this.runtime.countOfPages = indexChunks.length;
                this.runtime.testPages = new Array();

                this.runtime.currentTestPage = 0;

                for (let i = 0; i < this.runtime.countOfPages; i++) {
                    
                    const page = build.questionPage(indexChunks[i], i, quantity);
                    this.runtime.testPages.push(page);
                    contentFragment.appendChild(page);
                }

                if (this.runtime.countOfPages > 0)
                {
                    this.runtime.setActiveTestPage(this.runtime.currentTestPage);
                }

                content.appendChild(contentFragment);
            }
            else
            {
                console.warn('This function needs array as parameter!');
            }

        }.bind(this);

        build.questionPage = function questionPage (indexes, position, quantity) {

            const page = document.createElement('question-page');

            if (typeof position !== 'undefined')
                page.setAttribute('position', String(position))

            const indexesLength = indexes.length;

            const minQuestionPosition = quantity * position;
            let   maxQuestionPosition = minQuestionPosition - 1;

            for (let i = 0; i < indexesLength; i++, maxQuestionPosition++)
            {
                const index = indexes[i];

                const question = build.questionBlock(index);
                page.appendChild(question);
            };

            page.setAttribute('min', String(minQuestionPosition));
            page.setAttribute('max', String(maxQuestionPosition));
            
            return page;

        }.bind(this);

        build.questionBlock = function questionBlock (index) {

            const question = this.QUESTIONS[index] || null;

            if (!question)
            {
                console.error(index, ' index is not set withing questions', this.QUESTIONS);
            }

            const questionBlock = document.createElement('question-block');
            const runtimeQuestion = new Object();

                runtimeQuestion.element = questionBlock;
                runtimeQuestion.index = index;
                runtimeQuestion.answers = new Array();

            this.runtime.questions[question.id] = runtimeQuestion;
            //used for array
            
            //=======
            // UPPER
            //=======
            {
                const questionUpper = document.createElement('question-upper');
                
                questionBlock.appendChild(questionUpper);

                //question text
                {
                    const questionTitle = document.createElement('question-title');
                    questionUpper.appendChild(questionTitle);
                    questionTitle.innerHTML = question.text;
                }

                {
                    const infoContainer = document.createElement('identificator-container');
                    questionUpper.appendChild(infoContainer);

                    //question id
                    const questionIdentificator = document.createElement('question-identificator');
                    infoContainer.appendChild(questionIdentificator);
                    questionIdentificator.innerText = question.id;
                    
                    if (question.tags)
                    {
                        const questionTags = document.createElement('question-tags');
                        infoContainer.appendChild(questionTags);
                        questionTags.innerText = ' ' + question.tags.join(' | ');
                    }
                }
            }
            //=======
            // LOWER
            //=======
            {
                const questionLower = document.createElement('question-lower');
                questionBlock.appendChild(questionLower);

                //answers
                {
                    const questionAnswers = document.createElement('question-answers');
                    questionLower.appendChild(questionAnswers);

                    const answersLength = question.answers.length;

                    for (let index = 0; index < answersLength; index++)
                    {
                        const answer = question.answers[index];

                        const runtimeAnswer = new Object();

                        runtimeAnswer.valid = answer.valid;
                        runtimeAnswer.selected = false;
                        

                        const answerContainer = document.createElement('answer-container');
                        questionAnswers.appendChild(answerContainer);
                        runtimeAnswer.element = answerContainer;

                        answerContainer.addEventListener('click', function () {

                            
                            
                        });

                        const answerAlpha = document.createElement('answer-alpha');
                        answerContainer.appendChild(answerAlpha);
                        answerAlpha.innerText = String.fromCharCode(97 + index) + ') ';
                        
                        const answerText = document.createElement('answer-text');
                        answerContainer.appendChild(answerText);
                        answerText.innerHTML = answer.text;

                        questionAnswers.appendChild(answerContainer);
                        runtimeQuestion.answers.push(runtimeAnswer);
                    };

                    

                }

            
            }
            
            
            
/*
            <question-block>
            <question-lower>
                <question-answers>
                    <answer-block selected>
                        <answer-text>Využívají ATP</answer-text>
                        <hint-visible></hint-visible>
                        <hint-invisible></hint-invisible>
                    </answer-block>
                    <answer-block>
                        <answer-text>Pohyb vždy procesivní</answer-text>
                        <hint-visible></hint-visible>
                        <hint-invisible></hint-invisible>
                    </answer-block>
                    <answer-block>
                        <answer-text>Unknown</answer-text>
                        <hint-visible></hint-visible>
                        <hint-invisible></hint-invisible>
                    </answer-block>
                    <answer-block>
                        <answer-text>Transportují RNA, endosomy</answer-text>
                        <hint-visible></hint-visible>
                        <hint-invisible>netransportují RNA</hint-invisible>
                    </answer-block>
                </question-answers>
            </question-lower>
        </question-block>
*/
            return questionBlock;
        }.bind(this);


        /*
        this.DOM.global.content.appendChild(build.questionBlock(0));
        this.DOM.global.content.appendChild(build.questionBlock(1));
        this.DOM.global.content.appendChild(build.questionBlock(2));*/
        
        return build;

    }.bind(this))();

    this.activate = (function ACTIVATION () {

        const activate = new Object();

        activate.elementToggleSelectability = null;
        activate.elementSelectableOnlyOneOf = null;
        activate.startButton = null;
        activate.finishButton = null;

        Object.seal(activate);

        activate.elementToggleSelectability = function elementToggleSelectability (elementArray) {

            //inputs must not be togglable, needs new function
            if (elementArray && (Array.isArray(elementArray) || elementArray instanceof NodeList))
            {
                const elementArrayLength = elementArray.length;

                for (let index = 0; index < elementArrayLength; index++)
                {
                    const element = elementArray[index];

                    element.addEventListener('click', function handler () {
    
                        if (!element.hasAttribute('selected'))
                        {
                            element.setAttribute('selected', '');
                            element.removeAttribute('disabled');//should be done inside only one button grouping function
                        }
                        else
                        {
                            element.removeAttribute('selected');
                        }
    
                    });
                };
            }
            else
            {
                console.error('NodeList or Array of elements expected.');
            }
            
        };

        //groups up elements, of which can only one be active at a time
        activate.elementSelectableOnlyOneOf = function elementSelectableOnlyOneOf (elements, shouldDisableOthers) {

            const elementsLength = elements.length;

            for (let index = 0; index < elementsLength; index++)
            {
                const currentElement = elements[index];

                //just a variable, created by IIFE, that have every button, except the actual one above
                const otherElements = (function filterOtherElementsFromAllElements () {
                            
                    const otherElements = new Array();
                    
                    for (let otherElementIndex = 0; otherElementIndex < elementsLength; otherElementIndex++)
                    {
                        const elementAdept = elements[otherElementIndex];

                        if (currentElement !== elementAdept)
                        {
                            otherElements.push(elementAdept);
                        }
                        //else it is the same as currentElement from upper loop
                    };

                    return otherElements;

                })();
               
                //LISTENER
                currentElement.addEventListener('click', function handler () {

                    currentElement.setAttribute('selected', '');

                    if (shouldDisableOthers)
                    {
                        currentElement.removeAttribute('disabled');
                    }

                    const otherElementsLength = otherElements.length;

                    //forEach element from otherElements as otherElement
                    //deselecting (and disabling) otherElements (only currently clicked element is selected)
                    for (let otherElementIndex = 0; otherElementIndex < otherElementsLength; otherElementIndex++)
                    {
                        const otherElement = otherElements[otherElementIndex];

                        if (otherElement.hasAttribute('selected'))
                        {
                            otherElement.removeAttribute('selected');
                        }

                        if (shouldDisableOthers)
                        {
                            otherElement.setAttribute('disabled', '');
                        }
                    };
                }
                //LISTENER END

                );
            };
        };

        activate.startButton = function (element) {

            element.addEventListener('click', this.runtime.initializeTest);

        }.bind(this);

        activate.finishButton = function (element) {

            element.addEventListener('click', this.runtime.endTest);

        }.bind(this);

        return activate;

    }.bind(this))();

    this.runtime = (function RUNTIME () {

        const runtime = new Object();

        //variables
        runtime.activeTestPage = null;
        runtime.lastActiveTestPage = null;
        runtime.currentTestPage = null;
        runtime.countOfPages = null;

        runtime.incorrectQuestionsCount = null;
        runtime.correctQuestionsCount = null;
        runtime.incorrectAnswersCount = null;
        runtime.correctAnswersCount = null;

        //array variables
        runtime.testPages = null;
        runtime.questions = null;
        runtime.incorrectQuestionsIndexes = null;

        //functions
        runtime.setFooterPage = null;
        runtime.removeFooterPage = null;
        
        runtime.attachTestPageControl = null;
        runtime.detachTestPageControl = null;
            runtime.pageBack = null;
            runtime.pageNext = null;
        runtime.setActiveTestPage = null;

        runtime.answerClick = null;

        runtime.initializeTest = null;
            runtime.determineTestType = null;
            runtime.determineInputType = null;

            runtime.getFlatInput = null;
            runtime.getIndexInput = null;
            runtime.getTagsInput = null;

        runtime.startTest = null;
        runtime.endTest = null;

        runtime.adjustElementsForTest = null;

        Object.seal(runtime);

        runtime.setFooterPage = function setFooterPage (pageNumber)
        {
            this.DOM.global['footer'].setAttribute('data-page', String(pageNumber));
            
            let currentPageNumber = pageNumber !== 'max' ? pageNumber + 1 : runtime.countOfPages;
            let setPageNumber = false;

            if (typeof pageNumber === 'number')
            {
                currentPageNumber = pageNumber + 1;
                setPageNumber = true;
            }
            else if (pageNumber === 'max')
            {
                currentPageNumber = runtime.countOfPages;
                setPageNumber = true;
            }
            else if (pageNumber === 'only')
            {
                //nothing really, but it is possible input for this function
            }

            if (setPageNumber)
            {
                this.DOM.global['question-position'].innerText = String(currentPageNumber) + ' of ' + String(runtime.countOfPages);
            }
            
        }.bind(this);

        runtime.removeFooterPage = function removeFooterPage ()
        {
            this.DOM.global['footer'].removeAttribute('data-page');
        }.bind(this);

        runtime.pageBack = function () {
            
            if (runtime.currentTestPage > 0)
            {
                runtime.currentTestPage--;
                runtime.setFooterPage(runtime.currentTestPage);
                runtime.setActiveTestPage(runtime.currentTestPage);
            }   
        };

        runtime.pageNext = function pageNext () {
            
            const maxPage = runtime.countOfPages - 1;

            if (runtime.currentTestPage < maxPage)
            {
                runtime.currentTestPage++;

                if (runtime.currentTestPage < maxPage)
                {
                    runtime.setFooterPage(runtime.currentTestPage);
                }
                else
                {
                    runtime.setFooterPage('max');
                }

                runtime.setActiveTestPage(runtime.currentTestPage);
            }
        };

        runtime.attachTestPageControl = function () {

            const isOnlyOnePage = this.runtime.countOfPages === 1; 

            if (!isOnlyOnePage)
            {
                runtime.setFooterPage(runtime.currentTestPage);
                //! přidává nekonečno listenerů za víc testů?
                this.DOM.global['arrow-left'].addEventListener('click', runtime.pageBack);
                this.DOM.global['arrow-right'].addEventListener('click', runtime.pageNext);
            }
            else
            {
                runtime.setFooterPage('only');
            }
            
            
        }.bind(this);

        runtime.detachTestPageControl = function () {
            runtime.removeFooterPage();
            this.DOM.global['arrow-left'].removeEventListener('click', runtime.pageBack);
            this.DOM.global['arrow-right'].removeEventListener('click', runtime.pageNext);
        }.bind(this);
        
        runtime.setActiveTestPage = function setActiveTestPage (position) {

            runtime.lastActiveTestPage = runtime.activeTestPage;
            runtime.activeTestPage = runtime.testPages[position];

            if (runtime.lastActiveTestPage instanceof HTMLElement)
                runtime.lastActiveTestPage.removeAttribute('active');

            runtime.activeTestPage.setAttribute('active', 'true');
        }

        runtime.adjustElementsForTest = function () {

            this.DOM.global['test-main'].setAttribute('active', '');

        }.bind(this);

        runtime.answerClick = function (elementReference, runtimeReference) {

            if (!runtimeReference.selected)
            {
                elementReference.setAttribute('selected', '');
                runtimeReference.selected = true;
            }
            else
            {
                elementReference.removeAttribute('selected');
                runtimeReference.selected = false;
            }

        }

        runtime.startTest = function (questionsArray) {
            
            runtime.incorrectQuestionsCount = 0;
            runtime.correctQuestionsCount = 0;
            runtime.incorrectAnswersCount = 0;
            runtime.correctAnswersCount = 0;

            runtime.incorrectQuestionsIndexes = new Array();


            this.build.newTestContent(questionsArray);
            
            runtime.adjustElementsForTest();
            this.runtime.attachTestPageControl(); 
            
            console.log(runtime.questions)
        }.bind(this);

        runtime.endTest = function ()
        {
            const questions = runtime.questions;

            //evaluation
            for (let questionId in questions)
            {
                const question = questions[questionId];
                console.log(question)

                const answers = question.answers;
                const answersLength = answers.length;

                let correctAnswers = 0;
                let incorrectAnswers = 0;

                for (let answerIndex = 0; answerIndex < answersLength; answerIndex++)
                {
                    const answer = answers[answerIndex];

                    answer.element.removeEventListener('click', answerClick);

                    if (answer.selected && answer.valid)
                    {
                        answer.element.setAttribute('correct', '');
                        correctAnswers++;
                        runtime.correctAnswersCount++;
                    }
                    else if (!answer.selected && !answer.valid)
                    {
                        answer.element.setAttribute('correct', '');
                        correctAnswers++;
                        runtime.correctAnswersCount++;
                    }
                    else if (!answer.selected && answer.valid)
                    {
                        answer.element.setAttribute('incorrect', '');
                        incorrectAnswers++;
                        runtime.incorrectAnswersCount++;
                    }
                    else
                    {
                        answer.element.setAttribute('incorrect', '');
                        incorrectAnswers++;
                        runtime.incorrectAnswersCount++;
                    }                    
                };
                                    
                if (incorrectAnswers)
                {
                    runtime.incorrectQuestionsIndexes.push(question.index);
                    runtime.incorrectQuestionsCount++;
                }
                else
                {
                    runtime.correctQuestionsCount++;
                }
            }



            //summary

            console.log('wrong questions', runtime.incorrectQuestionsIndexes);
            console.log('correct questions', runtime.correctQuestionsCount);
            console.log('incorrect questions', runtime.incorrectQuestionsCount);
            console.log('correct answers', runtime.correctAnswersCount);
            console.log('incorrect answers', runtime.incorrectAnswersCount);

            console.log('answer success', runtime.correctAnswersCount/(runtime.incorrectAnswersCount + runtime.correctAnswersCount) * 100);


        }.bind(this);

        runtime.initializeTest = function () {

            runtime.questions = new Object();
            
            const testType = runtime.determineTestType();
            
            if (testType === 'real')
            {
                //random 20 questions
                let questionsArray = this.misc.createIndexArray(0, this.questionsMaxIndex);
                //this.misc.shuffleArray(questionsArray);
                questionsArray = questionsArray.slice(0,2);
                runtime.startTest(questionsArray);
            }
            else if (testType === 'custom')
            {
                const inputType = runtime.determineInputType();
                
                if (inputType === 'flat')
                {
                    const questionsArray = runtime.getFlatInput();
                    runtime.startTest(questionsArray);
                }
                else if (inputType === 'index')
                {
                    const questionsArray = runtime.getIndexInput();
                    runtime.startTest(questionsArray);
                }
                else if (inputType === 'tags')
                {
                    const questionsArray = runtime.getTagsInput();
                    runtime.startTest(questionsArray);
                }
                else
                {
                    this.errorHandling.createWarning('Click on one of test types');
                }
            }
            else
            {
                this.errorHandling.createWarning('Select test type');
            }

        }.bind(this);

        runtime.getTagsInput = function () {

            const selectedTags = this.DOM.menu['tags-array'].querySelectorAll('tag-container[selected]');

            if (selectedTags.length)
            {
                const inputTags = new Array();

                for (let index = 0; index < selectedTags.length; index++)
                {
                    const tagName = selectedTags[index].getAttribute('data-value');
                    inputTags.push(tagName);
                };

                const questionIndexes = new Array();

                //looping through all questions
                const questionsLength = this.QUESTIONS.length;
                for (let questionIndex = 0; questionIndex < questionsLength; questionIndex++)
                {
                    const question = this.QUESTIONS[questionIndex];

                    if (question.tags)
                    {
                        //looping through tags present at question
                        for (let questionTagIndex = 0; questionTagIndex < question.tags.length; questionTagIndex++)
                        {
                            const questionTag = question.tags[questionTagIndex];

                            //looping through input tags
                            for (let inputTagsIndex = 0; inputTagsIndex < selectedTags.length; inputTagsIndex++)
                            {
                                const inputTag = inputTags[inputTagsIndex];
                                
                                if (inputTag === questionTag)
                                {
                                    questionIndexes.push(questionIndex);
                                }
                            };
                        };
                    }
                };

                return Array.from(questionIndexes);
            }
            else
            {
                this.errorHandling.createWarning('No tags selected.');
                return null;
            }

        }.bind(this);

        runtime.getIndexInput = function () {

            const indexesValue = this.DOM.menu['index-array'].value.trim();
            let indexesArray = null;

            if (indexesValue)
            {
                try
                {
                    indexesArray = JSON.parse('[' + indexesValue + ']');                    
                }
                catch (error)
                {
                    this.errorHandling.createWarning('Incorrect index syntax detected nearby:\n' + error.message);
                    return null;
                }
            }

            const filteredIndexes = new Array();

            const indexesArrayLength = indexesArray.length;

            const questionsLength = this.QUESTIONS.length;
            for (let inputI = 0; inputI < indexesArrayLength; inputI++)
            {
                const inputIndex = indexesArray[inputI];

                for (let dbI = 0; dbI < questionsLength; dbI++)
                {
                    const dbIdentificator = this.QUESTIONS[dbI];

                    if (dbIdentificator.id === inputIndex)
                    {
                        filteredIndexes.push(dbI)
                    }
                };
            };

            return filteredIndexes;

            /*if (indexesValue.trim());
            {

            }*/

            /*try {
                JSON.parse(indexes);
            }

            console.log(JSON.parse('[' + indexes + ']'));*/

            /*if ()
            {
                
            }
            else
            {
                this.errorHandling.createWarning('Minimal flat input must be 0 or more.');
            }*/

        }.bind(this);

        runtime.getFlatInput = function () {

            const min = parseInt(this.DOM.flatInput['flatInputMin'].value);
            const max = parseInt(this.DOM.flatInput['flatInputMax'].value);

            if (min >= 0)
            {
                if (max < this.QUESTIONS.length)
                {
                    if (min <= max)
                    {
                        const questionsArray = new Array();

                        for (let index = min; index <= max; index++)
                        {
                            questionsArray.push(index);
                        };

                        //main
                        return questionsArray;
                    }
                    else
                    {
                        this.errorHandling.createWarning('Minimal flat input must be equal or smaller to max input.');
                    }
                }
                else
                {
                    this.errorHandling.createWarning('Maximal flat input must be ' + String(this.QUESTIONS.length - 1) + '.');
                }
            }
            else
            {
                this.errorHandling.createWarning('Minimal flat input must be 0 or more.');
            }

            return null;

        }.bind(this);

        runtime.determineTestType = function () {
            
            const element = this.DOM.menu['menu'].querySelector('test-option[selected]');
            
            if (element)
            {
                return element.getAttribute('data-value');
            }
            else
            {
                return null;
            }
            
        }.bind(this);

        runtime.determineInputType = function () {

            const element = this.DOM.menu['custom-inputs'].querySelector('flat-input[selected], index-input[selected], tags-input[selected]');
            
            if (element)
            {
                return element.getAttribute('data-value');
            }
            else
            {
                return null;
            }

        }.bind(this);

        return runtime;

    }.bind(this))();

    this.errorHandling = (function ERROR ()
    {
        const errorHandling = new Object();

        errorHandling.createWarning = function (message, halflife) {

            halflife = halflife || 1000;

            const container = document.createElement('warning-container');
            container.innerText = message;

            document.body.appendChild(container);

            setTimeout(function fader (){
                container.setAttribute('fading', '');
            }, halflife);

            setTimeout(function deleter () {
                container.remove();
            }, halflife * 2);
        }

        return errorHandling;

    }.bind(this))();

    this.misc = (function MISC ()
    {
        const misc = new Object();

        misc.generateRandomUniqueNumbersArray = null;
        misc.createIndexArray = null;
        misc.shuffleArray = null;

        Object.seal(misc);

        misc.generateRandomUniqueNumbersArray = function (min, max) {

            const array = new Array();
            let counter = min;
        
            while (true) {
        
                const newRandomNumber = min + Math.floor(Math.random() * max);
        
                if (!array.includes(newRandomNumber)) {
                    array.push(newRandomNumber);
                    counter++;
                }
        
                if (counter >= max) {
                    break;
                }
            }
        
            return array;
        }

        misc.createIndexArray = function (min, max) {
    
            const array = new Array();
        
            for (let i = min; i <= max; i++) {
                array.push(i);
            }
        
            return array;
        }

        misc.shuffleArray = function (array) {

            let reverseIndex = array.length
            
            let temporary;
            let randomIndex;
        
            for (let i = reverseIndex - 1; i > 0; --i)
            {
                randomIndex = Math.floor(Math.random() * (i + 1));
                temporary = array[randomIndex];
                array[randomIndex] = array[i];
                array[i] = temporary;
            }
        }

        return misc;
    })();

    var initialization = function () {
    //settings
    {console.log(this.SETTINGS)

        const info = new Object();            

        try
        {
            //errors are adequate now
            info.subjectName = this.SETTINGS.name; 
            info.subjectCode = this.SETTINGS.code;
        }
        catch (error)
        {
            console.error('Settings does not contain name and or code of subject.');
        }

        const defaultTest = new Object();
        defaultTest.questionsOnPage = this.SETTINGS.defaultTest.questionsOnPage || 20;
        defaultTest.questionsTotal = this.SETTINGS.defaultTest.questionsTotal || 20;
        defaultTest.timeLimit = this.SETTINGS.defaultTest.timeLimit || 60;

        this.DOM.inventory['subject-name'].innerText = info.subjectName;
    }
    //activating test type
    {
        const options = new Array(this.DOM.menu['option-custom'], this.DOM.menu['option-real']);
        this.activate.elementSelectableOnlyOneOf(options, false);
    }
    //activating inputs
    {
        const inputs = new Array(this.DOM.menu['flat-input'], this.DOM.menu['index-input'], this.DOM.menu['tags-input']);
        this.activate.elementSelectableOnlyOneOf(inputs, true); 
    }    
    //activating tags
    {
        this.build.menuTags();
            const tags = this.DOM.menu['tags-array'].querySelectorAll('tag-container');
        this.activate.elementToggleSelectability(tags);
    }
    //activating start button
    {
        this.activate.startButton(this.DOM.menu['start-button']);
    }
    //activating end button
    {
        this.activate.finishButton(this.DOM.menu['finish-button']);
    }
    
    this.runtime.initializeTest();
        
        //build.newTestContent([15,196,53,153,154,48,78,96,63,21,14,47,48,59,23,14,35,1,364,34,64,48,64,555,61,323,84,78,351,43,153,95,84,351,333,94,64,746,487,522,533,566,447,448,449,550,551]);    

    }.bind(this);

    initialization();
}