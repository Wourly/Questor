"use strict"

function Questor (QUESTIONS, TAGS, SETTINGS) {

    this.QUESTIONS = QUESTIONS || null;
    this.TAGS = TAGS || null;
    
    this.DOM = null;

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
    
                    console.error('Could not connect to DOM, when connecting to element with id: ' + id);
                    //throw new Error('Could not connect to DOM, when connecting to element with id: ' + id);
                }
            }
        }

        return container;
    };

    //stores references to important elements
    this.DOM = (function constructDOM ()
    {
        const DOM = new Object();

        DOM.menu = connectDOM(['menu', 'option-custom', 'option-real', 'tags-array', 'index-array', 'custom-inputs', 'flat-input', 'index-input', 'tags-input', 'read-button', 'start-button']);
        DOM.flatInput = connectDOM(['flatInputMin', 'flatInputMax']);
        //DOM.inventory = connectDOM(['inventory']);
        DOM.global = connectDOM(['content', 'arrow-left', 'arrow-right']);

        DOM.misc = connectDOM();

        return DOM;

    })();

    this.API = (function createApi ()
    {
        const API = new Object();

        API.loadQuestions = null;
        API.loadTags = null;

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

        return API;

    }.bind(this))();

    

/*
    this.DOM.inventory.addEventListener('click', function toggleInventory ()
    {
        const inventory = this.DOM.inventory;
        
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
            const tagsLength = tags.length;

            for (let property in tags)
            {
                const tagContainer = document.createElement('tag-container');
                fragment.appendChild(tagContainer);
                tagContainer.classList.add('button');
                tagContainer.classList.add('togglable');

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
                const indexesLength = inputIndexes.length;

                content.innerHTML = '';

                const indexChunks = new Array();

                //generate chunks for questionPages
                {
                    let chunk = new Array();

                        for(let i = 0; i < indexesLength; i++)
                        {
                            chunk.push(inputIndexes[i])        

                            if ((i + 1) % 10 === 0) {
                                indexChunks.push(chunk);
                                chunk = new Array();
                            }
                        }

                        if (chunk.length !== 0)
                            indexChunks.push(chunk);
                }

                runtime.countOfPages = indexChunks.length;
                runtime.testPages = new Array();

                runtime.currentTestPage = 0;

                for (let i = 0; i < runtime.countOfPages; i++) {
                    
                    let page = build.questionPage(indexChunks[i], i);
                    runtime.testPages.push(page);
                    contentFragment.appendChild(page);
                }

                if (runtime.countOfPages > 0)
                {
                    runtime.setActiveTestPage(runtime.currentTestPage);
                }

                content.appendChild(contentFragment);

                console.log(this.DOM)

                runtime.attachTestPageControl();        

            }
            else
            {
                console.warn('This function needs array as parameter!');
            }

        }.bind(this);

        build.questionPage = function questionPage (indexes, position) {

            const page = document.createElement('question-page');

            if (typeof position !== 'undefined')
                page.setAttribute('position', String(position))

            const indexesLength = indexes.length;

            for (let i = 0; i < indexesLength; i++)
            {
                const index = indexes[i];

                const question = build.questionBlock(index);
                page.appendChild(question);
            };
            
            return page;

        }.bind(this);

        build.questionBlock = function questionBlock (index) {

            const question = this.QUESTIONS[index] || null;

            if (!question)
            {
                console.error(index, ' index is not set withing questions', this.QUESTIONS);
            }

            const questionBlock = document.createElement('question-block');

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

                        const answerContainer = document.createElement('answer-container');
                        questionAnswers.appendChild(answerContainer);

                        const answerAlpha = document.createElement('answer-alpha');
                        answerContainer.appendChild(answerAlpha);
                        answerAlpha.innerText = String.fromCharCode(97 + index) + ') ';
                        
                        const answerText = document.createElement('answer-text');
                        answerContainer.appendChild(answerText);
                        answerText.innerHTML = answer.text;

                        questionAnswers.appendChild(answerContainer);
                        
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

        return activate;

    }.bind(this))();

    this.runtime = (function RUNTIME () {

        const runtime = new Object();

        //variables
        runtime.activeTestPage = null;
        runtime.lastActiveTestPage = null;
        runtime.currentTestPage = null;
        runtime.countOfPages = null;

        //array variables
        runtime.testPages = null;

        //functions
        runtime.attachTestPageControl = null;
        runtime.detachTestPageControl = null;
            runtime.pageBack = null;
            runtime.pageNext = null;
        runtime.setActiveTestPage = null;

        runtime.initializeTest = null;
            runtime.determineTestType = null;
            runtime.determineInputType = null;

            runtime.getFlatInput = null;
            runtime.getIndexInput = null;

        runtime.startTest = null;

        Object.seal(runtime);

        runtime.pageBack = function () {
            
            if (runtime.currentTestPage > 0)
            {
                runtime.currentTestPage--;
                runtime.setActiveTestPage(runtime.currentTestPage);
            }   
        };

        runtime.pageNext = function () {
            
            if (runtime.currentTestPage < runtime.countOfPages - 1)
            {
                runtime.currentTestPage++;
                runtime.setActiveTestPage(runtime.currentTestPage);
            }
        };

        runtime.attachTestPageControl = function () {
            this.DOM.global['arrow-left'].addEventListener('click', runtime.pageBack);
            this.DOM.global['arrow-right'].addEventListener('click', runtime.pageNext);
        }.bind(this);

        runtime.detachTestPageControl = function () {
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

        runtime.startTest = function (questionsArray) {

        }

        runtime.initializeTest = function () {
            

            const testType = runtime.determineTestType();
            
            if (testType === 'real')
            {
                runtime.startTest();
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
                    console.log('pes');
                    const questionsArray = runtime.getIndexInput();
                    runtime.startTest(questionsArray);
                }
                else if (inputType === 'tags')
                {

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

        runtime.getIndexInput = function () {

            const indexes = this.DOM.menu['index-array'].value;


            const test = this.QUESTIONS.slice(0, 15).map((x) => x.id);

            console.log(JSON.parse('[' + indexes + ']'));

            /*if ()
            {
                
            }
            else
            {
                this.errorHandling.createWarning('Minimal flat input must be 0 or more.');
            }*/

            return null;

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

                        for (let index = min; index < max; index++)
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

    var initialization = function () {
    

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
        
    this.runtime.initializeTest();
        

        //build.newTestContent([15,196,53,153,154,48,78,96,63,21,14,47,48,59,23,14,35,1,364,34,64,48,64,555,61,323,84,78,351,43,153,95,84,351,333,94,64,746,487,522,533,566,447,448,449,550,551]);    

    }.bind(this);

    initialization();
}