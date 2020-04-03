"use strict"

function Questor (QUESTIONS, TAGS, SETTINGS) {

    this.QUESTIONS = null;
    this.TAGS = null;
    this.SETTINGS = null;
    
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
    //no elements are queried inside code, everything uses reference to this.DOM, so there is less risk of getting reference error
    this.DOM = (function DOM ()
    {
        const DOM = new Object();

        DOM.menu = connectDOM(['menu', 'questions-count', 'option-custom', 'option-real', 'tags-array', 'start-button', 'end-button']);
        DOM.inputs = connectDOM(['custom-inputs', 'flat-input', 'index-input', 'tags-input', 'flat-min', 'flat-max', 'index-array']);
        DOM.inventory = connectDOM(['test-summary', 'clear-button', 'repeat-button', 'inventory-container', 'inventory-button', 'subject-name', 'test-summary', 'incorrect-identificators-container', 'incorrect-identificators', 'saved-identificators', 'download-questions', 'download-test', 'inventory-topic-container', 'inventory-topic-iframe', 'open-in-new-tab-inventory-button', 'clear-inventory-button']);
        DOM.score = connectDOM(['correct-questions', 'total-questions', 'questions-percentage', 'correct-answers', 'total-answers', 'answers-percentage']);
        DOM.global = connectDOM(['test-main', 'test-content', 'footer', 'question-position', 'arrow-left', 'arrow-right']);

        DOM.misc = connectDOM();

        return DOM;

    })();

    this.API = (function API ()
    {
        const API = new Object();

        API.loadQuestions = null;
        API.loadTags = null;
        API.loadSettings = null;

        Object.seal(API);

        API.loadQuestions = function loadQuestions (data) {

            if (data && Array.isArray(data))
            {
                this.QUESTIONS = data;
                this.activate.questions();
            }

        }.bind(this);

        API.loadTags = function loadTags (data) {
            
            if (data && data instanceof Object)
            {
                this.TAGS = data;
            }

        }.bind(this);

        API.loadSettings = function loadSettings (SETTINGS)
        {
            this.SETTINGS = new Object();
    
            this.SETTINGS.code = SETTINGS.code || 'code missing';
            this.SETTINGS.name = SETTINGS.name || 'name missing';

            this.SETTINGS.questionFile = SETTINGS.questionFile || null;
            this.SETTINGS.testFile = SETTINGS.testFile || null;

            this.SETTINGS.minPercentageLimit = SETTINGS.minPercentageLimit || 60;
    
            const defaultTest = new Object();
            defaultTest.questionsOnPage = SETTINGS.defaultTest.questionsOnPage || 20;
            defaultTest.questionsTotal = SETTINGS.defaultTest.questionsTotal || 20;
            defaultTest.timeLimit = SETTINGS.defaultTest.timeLimit || 60;

            this.SETTINGS.defaultTest = defaultTest;

            this.SETTINGS.browserScrollSize = (function ()
            {
                const div = document.createElement('div');

                const appliedWidth = 100;
            
                div.style.width= String(appliedWidth) + 'px';
                div.style.height = '0';
                div.style.overflow = 'scroll';
                div.style.visibility = 'hidden';
                div.style.position = 'fixed';
            
                document.body.appendChild(div);
                
                const scrollWidth = appliedWidth - div.clientWidth;
                
                div.remove();
            
                return scrollWidth;
            })();

            this.activate.settings();
    
        }.bind(this);

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
                const content = this.DOM.global['test-content'];
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

        //builds elements, that contain question title and answers, with it's functionality
        build.questionBlock = function questionBlock (index) {

            const question = this.QUESTIONS[index] || null;

            //must not happen from user input! just condition for me, if I have set boundaries correctly
            if (!question)
            {
                console.error(index, ' index is not set withing questions', this.QUESTIONS);
            }

            const questionBlock = document.createElement('question-block');
            const runtimeQuestion = new Object();

                runtimeQuestion.element = questionBlock;
                runtimeQuestion.index = index;
                runtimeQuestion.id = question.id;
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
                    questionTitle.setAttribute('identificator', question.id);

                    //click
                    const questionTitleclickHandler = function createQuestionTitleClickHandler () {

                        const container = this.DOM.inventory['saved-identificators'];
                        const id = JSON.stringify(questionTitle.getAttribute('identificator'));

                        return this.runtime.questionClickHandler(container, id);
                        
                    }.bind(this);

                    questionTitle.addEventListener('click', questionTitleclickHandler);
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
                                    
                if (question.links)
                {

                    const questionLinks = document.createElement('question-links');

                    const testCode = this.SETTINGS.code;

                    const questionLinksLength = question.links.length;

                    for (let index = 0; index < questionLinksLength; index++)
                    {
                        const topicName = question.links[index];
                        const questionLinkElement = document.createElement('a');
                        questionLinkElement.classList.add('question-link');

                        //href
                        const url = './Tests/' + testCode + '/subtopics/' + topicName + '/index.html';

                        questionLinkElement.setAttribute('href', url)
                        questionLinkElement.innerText = topicName;

                        //! dont forget to prevent default on ctrl
                        const questionLinkClickHandler = function createQuestionLinkClickHandler (event) {

                            return this.runtime.questionLinkClickHandler(topicName, event);

                        }.bind(this);

                        questionLinkElement.addEventListener('click', questionLinkClickHandler);

                        questionLinks.appendChild(questionLinkElement);

                        //last element
                        if ((questionLinksLength - 1) !== index)
                        {
                            const linkSeparator = document.createElement('question-link-separator');
                            linkSeparator.innerText = '|';
                            questionLinks.appendChild(linkSeparator);
                        }
                    }

                    questionUpper.appendChild(questionLinks);
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

                        runtimeAnswer.clickHandler = function clickHandlerAttacher () {

                            return this.runtime.answerClickHandler(answerContainer, runtimeAnswer);
                            
                        }.bind(this);

                        answerContainer.addEventListener('click', runtimeAnswer.clickHandler);

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

        activate.settings = null;
        activate.questions = null;

        activate.elementToggleSelectability = null;
        activate.elementSelectableOnlyOneOf = null;
        activate.startButton = null;
        activate.endButton = null;

        activate.inventory = null;

        activate.downloads = null;

        Object.seal(activate);

        activate.questions = function questions () {

            const questionsCount = this.QUESTIONS.length;
            this.DOM.menu['questions-count'].innerText = questionsCount;
            this.DOM.inputs['flat-max'].value = questionsCount - 1;

        }.bind(this);

        activate.settings = function settings () {

            this.DOM.inventory['subject-name'].innerText = this.SETTINGS.name;

        }.bind(this);
        

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

                //just array variable, created by IIFE, that contain every other button (not currently 'mouseDowned' button)
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
                currentElement.addEventListener('mousedown', function handler () {

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

        activate.inventory = function activateInventory () {
            
            //clickability of inventory button
            this.DOM.inventory['inventory-button'].addEventListener('click', this.runtime.inventoryButtonHandler);

            //opening of inventory with keyup q or Q
            window.addEventListener('keyup', function toggleInventory (event) {

                if (event && event.key && event.key.toLowerCase() === 'q')
                {
                    this.runtime.inventoryButtonHandler();
                }
                
            }.bind(this));
            
            //inventory topic clearance
            this.DOM.inventory['clear-inventory-button'].addEventListener('click', this.runtime.clearInventoryTopic);

            //subtopic messages receiving
            window.addEventListener('message', function messageHandler (event) {
                if (event)
                {
                    if (event.data)
                    {
                        const {data} = event;
                        const {action} = data;
                        
                        switch (action) {
                            case 'setIframeHeight':
                                {
                                    const iframe = this.DOM.inventory['inventory-topic-iframe'];
                                    const {height, isScrollbarPresent} = data;

                                    let horizontalScrollbarHeight = 0;

                                    if (isScrollbarPresent)
                                    {
                                        horizontalScrollbarHeight = this.SETTINGS.browserScrollSize;
                                    }

                                    iframe.style.height = String(height + horizontalScrollbarHeight) + 'px';

                                    this.runtime.fixButtonWhenInventoryScrollbarAppears();

                                    break;
                                }
                            //clicking on iframe would disable events on window
                            case 'focusMainWindow':
                                {
                                    window.focus();
                                    break;
                                }
                            default:
                                {
                                    console.warn('unrecognized action');
                                }
                        }
                    }
                }
            }.bind(this))

        }.bind(this);

        activate.downloads = function activateDownloads () {
             
            if (this.SETTINGS && this.SETTINGS.code)
            {
                //download questions
                if (this.SETTINGS.questionFile)
                {
                    const button = this.DOM.inventory['download-questions'];
                    button.setAttribute('active', '');
                    button.addEventListener('click', function downloadQuestionsHandler() {

                        window.location = window.location.pathname.replace(/\/[^\/]*$/m, '\/') + 'Tests/' + this.SETTINGS.code + '/' + this.SETTINGS.questionFile;

                    }.bind(this));
                }
                //download test
                if (this.SETTINGS.testFile && this.SETTINGS.code)
                {
                    const button = this.DOM.inventory['download-test'];
                    button.setAttribute('active', '');
                    button.addEventListener('click', function downloadTestHandler() {

                        window.location = window.location.pathname.replace(/\/[^\/]*$/m, '\/') + 'Tests/' + this.SETTINGS.code + '/' + this.SETTINGS.testFile;

                    }.bind(this));
                }
            }
            
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

        runtime.isTestEndAble = null;

        //array variables
        runtime.testPages = null;
        runtime.questions = null;
        runtime.incorrectQuestionsIdentificators = null;

        //functions
        runtime.setFooterPage = null;
        runtime.removeFooterPage = null;
        
        runtime.attachTestPageControl = null;
        runtime.detachTestPageControl = null;
            runtime.pageBack = null;
            runtime.pageNext = null;
            runtime.testKeyboardController = null;
            runtime.confirmTestEnding = null;
        runtime.setActiveTestPage = null;

        runtime.questionClickHandler = null;
        runtime.answerClickHandler = null;
        runtime.questionLinkClickHandler = null;

        runtime.initializeTest = null;
            runtime.determineTestType = null;
            runtime.determineInputType = null;

            runtime.getFlatInput = null;
            runtime.getIdentificatorInput = null;
            runtime.getTagsInput = null;

        runtime.startTest = null;
        runtime.endTest = null;
            runtime.processQuestions = null;
            runtime.createSummary = null;
        runtime.clearTest = null;
        runtime.repeatTest = null;

        runtime.setInventoryTopic = null;
        runtime.clearInventoryTopic = null;

        runtime.inventoryButtonHandler = null;
        runtime.fixButtonWhenInventoryScrollbarAppears = null;
        runtime.openInventory = null;
        runtime.closeInventory = null;

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

        runtime.testKeyboardController = function testKeyboardController (event) {

            if (event.key && event.code) {

                const key = event.key.toLowerCase();

                switch (key) {
                    case 'arrowleft': runtime.pageBack(); break;
                    case 'arrowright': runtime.pageNext(); break;
                    //no need to default case, simply no function for random key
                }
            }
        }

        runtime.attachTestPageControl = function attachTestPageControl () {

            const isOnlyOnePage = runtime.countOfPages === 1;

            

            if (!isOnlyOnePage)
            {
                runtime.setFooterPage(runtime.currentTestPage);

                this.DOM.global['arrow-left'].addEventListener('click', runtime.pageBack);
                this.DOM.global['arrow-right'].addEventListener('click', runtime.pageNext);
                
            }
            else
            {
                runtime.setFooterPage('only');
            }

            window.addEventListener('keyup', runtime.testKeyboardController);
            
            
        }.bind(this);

        runtime.detachTestPageControl = function detachTestPageControl () {

            this.DOM.global['arrow-left'].removeEventListener('click', this.runtime.pageBack);
            this.DOM.global['arrow-right'].removeEventListener('click', this.runtime.pageNext);
            window.removeEventListener('keyup', runtime.testKeyboardController);
            
        }.bind(this);

        runtime.removeFooterPage = function removeFooterPage ()
        {
            this.DOM.global['footer'].removeAttribute('data-page');
            this.DOM.global['question-position'].innerText = '';

        }.bind(this);

        runtime.pageBack = function pageBack () {
            
            window.scrollTo(0, 0);

            if (runtime.currentTestPage > 0)
            {
                runtime.currentTestPage--;
                runtime.setFooterPage(runtime.currentTestPage);
                runtime.setActiveTestPage(runtime.currentTestPage);
            }   
        };

        runtime.pageNext = function pageNext () {
            
            window.scrollTo(0, 0);

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
        
        //called by newTestContent, pageNext and pageBack
        runtime.setActiveTestPage = function setActiveTestPage (position) {

            runtime.lastActiveTestPage = runtime.activeTestPage;
            runtime.activeTestPage = runtime.testPages[position];

            if (runtime.lastActiveTestPage instanceof HTMLElement)
                runtime.lastActiveTestPage.removeAttribute('active');

            runtime.activeTestPage.setAttribute('active', 'true');
        }

        runtime.questionClickHandler = function questionClickHandler (container, id) {

            if (container.innerText.trim() !== '')
            {
                container.innerText += ', ' + id;
            }
            else
            {
                container.innerText += id;
            }

            this.misc.createMessage('Identificator: <span style="color:#62b9df;">' + id + '</span> was added to inventory.');

        }.bind(this);

        runtime.answerClickHandler = function answerClickHandler (elementReference, runtimeReference) {

            runtime.isTestEndAble = false;

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

        runtime.setInventoryTopic = function setInventoryTopic (topicName) {

            const container = this.DOM.inventory['inventory-topic-container'];
            const iframe = this.DOM.inventory['inventory-topic-iframe'];
            const testCode = this.SETTINGS['code'];

            const newTabAnchor = this.DOM.inventory['open-in-new-tab-inventory-button'];

            const src = './Tests/' + testCode + '/subtopics/' + topicName + '/index.html';

            iframe.src = src;
            iframe.setAttribute('data-topic-name', topicName);

            newTabAnchor.setAttribute('href', src);
            container.setAttribute('active', '');

        }.bind(this);

        runtime.clearInventoryTopic = function clearInventoryTopic () {
            const container = this.DOM.inventory['inventory-topic-container'];
            const iframe = this.DOM.inventory['inventory-topic-iframe'];

            iframe.removeAttribute('src');
            iframe.removeAttribute('data-topic-name');
            container.removeAttribute('active');

            runtime.fixButtonWhenInventoryScrollbarAppears()

        }.bind(this);


        runtime.questionLinkClickHandler = function questionLinkClickHandler (topicName, event) {

            if (event && !event.ctrlKey)
            {
                event.preventDefault();
                runtime.setInventoryTopic(topicName);
            }
        };

        runtime.inventoryButtonHandler = function inventoryButtonHandler () {

            const button = this.DOM.inventory['inventory-button'];

            if (button.getAttribute('next-action') === 'opening')
            {
                runtime.openInventory();
            }
            else
            {
                runtime.closeInventory();
            }

        }.bind(this);

        runtime.fixButtonWhenInventoryScrollbarAppears = function fixButtonWhenInventoryScrollbarAppears () {

            const inventory = this.DOM.inventory['inventory-container'];

            const inventoryHeight = inventory.scrollHeight;
            const windowHeight = window.innerHeight;

            const mustBeAdjusted = inventoryHeight > windowHeight ? true : false;

            if (mustBeAdjusted)
                this.DOM.inventory['inventory-button'].setAttribute('inventory-overflow', '');
            else
                this.DOM.inventory['inventory-button'].removeAttribute('inventory-overflow');

        }.bind(this);

        runtime.openInventory = function openInventory () {

            this.DOM.inventory['inventory-container'].setAttribute('active', '');
            this.DOM.inventory['inventory-button'].setAttribute('next-action', 'closing');
            
            runtime.fixButtonWhenInventoryScrollbarAppears();

        }.bind(this);

        runtime.closeInventory = function closeInventory () {
            this.DOM.inventory['inventory-container'].removeAttribute('active');
            this.DOM.inventory['inventory-button'].setAttribute('next-action', 'opening');

            this.DOM.inventory['inventory-button'].removeAttribute('inventory-overflow');

        }.bind(this);

        runtime.processQuestions = function processQuestions () {
            const questions = runtime.questions;

            //evaluation
            for (let questionId in questions)
            {
                const question = questions[questionId];

                const answers = question.answers;
                const answersLength = answers.length;

                let correctAnswers = 0;
                let incorrectAnswers = 0;

                for (let answerIndex = 0; answerIndex < answersLength; answerIndex++)
                {
                    const answer = answers[answerIndex];

                    answer.element.removeEventListener('click', answer.clickHandler);

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
                    runtime.incorrectQuestionsIdentificators.push(question.id);
                    runtime.incorrectQuestionsCount++;
                }
                else
                {
                    runtime.correctQuestionsCount++;
                }
            }
        }.bind(this);

        runtime.createSummary = function createSummary () {

            const correctQuestions = runtime.correctQuestionsCount;
            const incorrectQuestions = runtime.incorrectQuestionsCount;
            const totalQuestions = correctQuestions + incorrectQuestions;
            const questionsPercentage = Math.round(correctQuestions / totalQuestions * 10000) / 100;
            const correctQuestionsColor = this.misc.createScoreColor(questionsPercentage);
//?! no HINTS
            this.DOM.score['correct-questions'].innerHTML = '<span style="color: ' + correctQuestionsColor + '">' + correctQuestions + '</span>';
            this.DOM.score['total-questions'].innerText = totalQuestions;
            this.DOM.score['questions-percentage'].innerHTML = '<span style="color: ' + correctQuestionsColor + '">' + questionsPercentage + '</span>';
        
            //ANSWERS
        
            const correctAnswers = runtime.correctAnswersCount;
            const incorrectAnswers = runtime.incorrectAnswersCount;
            const totalAnswers = correctAnswers + incorrectAnswers;
            const answersPercentage = Math.round(correctAnswers / totalAnswers * 10000) / 100;
            const correctAnswersColor = this.misc.createScoreColor(answersPercentage);

            this.DOM.score['correct-answers'].innerHTML = '<span style="color: ' + correctAnswersColor + '">' + correctAnswers + '</span>';
            this.DOM.score['total-answers'].innerText = totalAnswers;
            this.DOM.score['answers-percentage'].innerHTML = '<span style="color: ' + correctAnswersColor + '">' + answersPercentage + '</span>';

            if (this.runtime.incorrectQuestionsIdentificators.length)
            {
                this.DOM.inventory['incorrect-identificators-container'].setAttribute('active', '');
                this.DOM.inventory['repeat-button'].setAttribute('active', '');

                const incorrectQuestionsIdentificators = JSON.stringify(this.runtime.incorrectQuestionsIdentificators);
                this.DOM.inventory['incorrect-identificators'].innerText = incorrectQuestionsIdentificators.slice(1, incorrectQuestionsIdentificators.length - 1);
            }

            this.DOM.global['test-main'].setAttribute('status', 'summary');
            this.DOM.inventory['test-summary'].setAttribute('active', '');

        }.bind(this);

        runtime.startTest = function startTest (questionsArray) {
            
            if (Array.isArray(questionsArray) && questionsArray.length > 0)
            {

                //if runtime.shuffle
                //?! being shuffled second time, when real test option
                this.misc.shuffleArray(questionsArray);
                runtime.incorrectQuestionsCount = 0;
                runtime.correctQuestionsCount = 0;
                runtime.incorrectAnswersCount = 0;
                runtime.correctAnswersCount = 0;

                runtime.questions = new Object();

                runtime.isTestEndAble = true; //selecting answer will make it false
    
                runtime.incorrectQuestionsIdentificators = new Array();
    
                this.build.newTestContent(questionsArray);
                window.addEventListener('beforeunload', runtime.confirmTestEnding);
                window.addEventListener('hashchange', runtime.confirmTestEnding);
                runtime.attachTestPageControl();
                this.DOM.global['test-main'].setAttribute('status', 'running');
            }

        }.bind(this);

        runtime.confirmTestEnding = function confirmTestEnding (event) {

            if (!runtime.isTestEndAble && !event)
            {
                runtime.isTestEndAble = confirm('Do you really want to end test?');
            }

            //beforeunlaod || hashchange
            if (!runtime.isTestEndAble && event)
            {
                event.returnValue = true;
                return true;
            }
        }

        runtime.endTest = function endTest ()
        {
            

            
            //?! prevent test end if not on last page or when closing tab
            //?! add timer
            
           runtime.confirmTestEnding();

            if (runtime.isTestEndAble)
            {
                window.removeEventListener('beforeunload', runtime.confirmTestEnding);
                window.removeEventListener('hashchange', runtime.confirmTestEnding);
                runtime.processQuestions();
                runtime.createSummary();
                runtime.openInventory();
            }

        }.bind(this);

        runtime.clearTest = function clearTest () {

            this.DOM.inventory['test-summary'].removeAttribute('active');

            //deleting summary
            /*
            const scoreElements = this.DOM.score;
            for (let id in this.DOM.score)
            {
                const element = scoreElements[id];
                element.innerText = '';
            };
            this.DOM.inventory['incorrect-identificators'].innerText = '';*/
            this.DOM.global['test-main'].setAttribute('status', 'off');
            this.DOM.global['test-content'].innerText = '';

            this.DOM.inventory['incorrect-identificators-container'].removeAttribute('active');
            this.DOM.inventory['repeat-button'].removeAttribute('active');

            runtime.detachTestPageControl();
            runtime.removeFooterPage();
            runtime.closeInventory();
            //runtime.

        }.bind(this);

        runtime.repeatTest = function repeatTest () {

            const questionsArray = runtime.getIdentificatorInput(runtime.incorrectQuestionsIdentificators);
            console.log(questionsArray)
            runtime.clearTest();

            runtime.startTest(questionsArray);

        }.bind(this);

        runtime.initializeTest = function initializeTest () {

            runtime.questions = new Object();
            
            const testType = runtime.determineTestType();
            
            if (testType === 'real')
            {
                //random 20 questions
                let questionsArray = this.misc.createIndexArray(0, this.QUESTIONS.length - 1);
                this.misc.shuffleArray(questionsArray);
                questionsArray = questionsArray.slice(0, this.SETTINGS.defaultTest.questionsTotal);
                runtime.startTest(questionsArray);
            }
            else if (testType === 'custom')
            {
                const inputType = runtime.determineInputType();
                
                if (inputType === 'flat')
                {
                    const questionsArray = runtime.getFlatInput();

                    if (questionsArray)
                    {
                        runtime.startTest(questionsArray);
                    }
                }
                else if (inputType === 'index')
                {
                    const questionsArray = runtime.getIdentificatorInput();
                    console.log(questionsArray);

                    if (questionsArray)
                    {
                        runtime.startTest(questionsArray);
                    }
                }
                else if (inputType === 'tags')
                {
                    const questionsArray = runtime.getTagsInput();
                    
                    if (questionsArray)
                    {
                        runtime.startTest(questionsArray);
                    }
                }
                else
                {
                    this.misc.createMessage('Select one input type.', 'warning');
                }
            }
            else
            {
                this.misc.createMessage('Select test type.', 'warning');
            }

        }.bind(this);

        runtime.getTagsInput = function getTagsInput () {

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
                                {//?!!
                                    /*const recentQuestionsLength = questionIndexes.length;
                                    let alreadyPresent = false;

                                    //mimicking Set()
                                    for (let recentQuestionsIndex = 0; recentQuestionsIndex < recentQuestionsLength; recentQuestionsIndex++)
                                    {
                                        const recentIndex = questionIndexes[recentQuestionsIndex];

                                        if (recentIndex === questionIndex)
                                        {
                                            alreadyPresent = true;
                                            break;
                                        }
                                    };

                                    if (!alreadyPresent)
                                    {*/
                                        questionIndexes.push(questionIndex);
                                    /*}
                                    else
                                    {
                                        console.log('duplicate:', question);
                                    }*/
                                    
                                }
                            };
                        };
                    }
                };

                return Array.from(questionIndexes);
            }
            else
            {
                this.misc.createMessage('No tags selected.', 'warning');
                return null;
            }

        }.bind(this);

        runtime.getIdentificatorInput = function getIdentificatorInput (repeatInput) {

            var identificatorArray = null;

            //this input is passed from runtime.repeatTest()
            if (repeatInput)
            {
                identificatorArray = repeatInput;
            }
            else
            {
                const identificatorValue = this.DOM.inputs['index-array'].value.trim();

                if (identificatorValue)
                {
                    try
                    {
                        identificatorArray = JSON.parse('[' + identificatorValue + ']');
                    }
                    catch (error)
                    {
                        this.misc.createMessage('Incorrect index syntax detected nearby:\n' + error.message, 'warning');
                        return null;
                    }
                }
                else
                {
                    this.misc.createMessage('No indexes in input.', 'warning');
                    return null;
                }
            }

            
            
            //?!filter duplicate indexinput tagsinput
            
            const identificatorArrayLength = identificatorArray.length;
            
            //looking for indexes by their identificators in QUESTIONS
            const filteredIndexes = new Array();
            
            const questions = this.QUESTIONS;
            const questionsLength = questions.length;

            for (let inputIndex = 0; inputIndex < identificatorArrayLength; inputIndex++)
            {
                const inputIdentificator = identificatorArray[inputIndex];

                for (let questionsIndex = 0; questionsIndex < questionsLength; questionsIndex++)
                {
                    const questionIdentificator = questions[questionsIndex].id;

                    if (questionIdentificator === inputIdentificator)
                    {
                        filteredIndexes.push(questionsIndex)
                    }
                };
            };

            if (filteredIndexes.length)
            {
                return filteredIndexes;
            }
            else
            {
                this.misc.createMessage('No such indexes found in questions.', 'warning')
                return null;
            }

            /*if (identificatorValue.trim());
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
                this.misc.createMessage('Minimal flat input must be 0 or more.', 'warning');
            }*/

        }.bind(this);

        runtime.getFlatInput = function getFlatInput () {

            const min = parseInt(this.DOM.inputs['flat-min'].value);
            const max = parseInt(this.DOM.inputs['flat-max'].value);


            if (!min || !max)
            {
                if (min !== 0)
                {
                    this.misc.createMessage('Use only numbers.', 'warning');
                    return null;
                }
            }

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
                        this.misc.createMessage('Minimal flat input must be equal or smaller to max input.', 'warning');
                    }
                }
                else
                {
                    this.misc.createMessage('Maximal flat input must be ' + String(this.QUESTIONS.length - 1) + '.', 'warning');
                }
            }
            else
            {
                this.misc.createMessage('Minimal flat input must be 0 or more.', 'warning');
            }

            return null;

        }.bind(this);

        runtime.determineTestType = function determineTestType () {
            
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

        runtime.determineInputType = function determineInputType () {

            const element = this.DOM.inputs['custom-inputs'].querySelector('flat-input[selected], index-input[selected], tags-input[selected]');
            
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

    this.misc = (function MISC ()
    {
        const misc = new Object();

        misc.createMessage = null;
        misc.generateRandomUniqueNumbersArray = null;
        misc.createIndexArray = null;
        misc.shuffleArray = null;
        misc.createScoreColor = null;

        Object.seal(misc);

        misc.createMessage = function createMessage (message, type, halflife) {

            halflife = halflife || 1000;

            const container = document.createElement('warning-container');;

            type = type || 'message';

            if (type === 'warning')
            {
                container.setAttribute('warning', '')
            }
            else
            {
                container.setAttribute('message', '');
            }

            container.innerHTML = message;

            document.body.appendChild(container);

            setTimeout(function fader (){
                container.setAttribute('fading', '');
            }, halflife);

            setTimeout(function deleter () {
                container.remove();
            }, halflife * 2);
        }

        misc.generateRandomUniqueNumbersArray = function generateRandomUniqueNumbersArray (min, max) {

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

        misc.createIndexArray = function createIndexArray (min, max) {
    
            const array = new Array();
        
            for (let i = min; i <= max; i++) {
                array.push(i);
            }
        
            return array;
        }

        misc.shuffleArray = function shuffleArray (array) {

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

        misc.createScoreColor = function scoreColor (percentage)
        {
            let red = 0;
            let green = 0;
            let blue = 0;

            const limit = this.SETTINGS.minPercentageLimit;

            if (percentage >= limit)
            {
                const percentAboveLimit = (percentage - limit) / 40 * 100;
                const invertpercentAboveLimit = 100 - percentAboveLimit;
                
                red = 255 * invertpercentAboveLimit / 100;
                green = 255;

            }
            else
            {
                red = 255;
            }

            const RGB = 'rgb(' + String(red) + ', ' + String(green) + ', ' + String(blue) + ')';

            return RGB;

        }.bind(this);

        return misc;
    }.bind(this))();

    var initialization = function INITIALIZATION ()
    {
        //settings
        {
            this.API.loadQuestions(QUESTIONS);
            this.API.loadTags(TAGS);
            this.API.loadSettings(SETTINGS)
        }
        //activating test type
        {
            const options = new Array(this.DOM.menu['option-custom'], this.DOM.menu['option-real']);
            this.activate.elementSelectableOnlyOneOf(options, false);
        }
        //activating inputs
        {
            const inputs = new Array(this.DOM.inputs['flat-input'], this.DOM.inputs['index-input'], this.DOM.inputs['tags-input']);
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
            this.DOM.menu['start-button'].addEventListener('click', this.runtime.initializeTest);
        }
        //activating end button
        {
            this.DOM.menu['end-button'].addEventListener('click', this.runtime.endTest);
        }
        //activating clear button
        {
            this.DOM.inventory['clear-button'].addEventListener('click', this.runtime.clearTest);
        }
        //activationg repeat button
        {
            this.DOM.inventory['repeat-button'].addEventListener('click', this.runtime.repeatTest);
        }
        this.activate.downloads();

        
        document.querySelector('head title').innerText = this.SETTINGS.name;
            
        this.activate.inventory();
            

        //this.runtime.inventoryButtonHandler();

        //this.runtime.startTest([4]);

        this.runtime.openInventory();
        this.runtime.setInventoryTopic('fosfatidylcholin');
            
        
            //build.newTestContent([15,196,53,153,154,48,78,96,63,21,14,47,48,59,23,14,35,1,364,34,64,48,64,555,61,323,84,78,351,43,153,95,84,351,333,94,64,746,487,522,533,566,447,448,449,550,551]);    

    }.bind(this);

    initialization();
}