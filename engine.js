//regex transformation from word:

//remove empty lines
// req ^$\n
// sub (blank)

//define questionBlock
// rex \n?\((\d{1,3})\)\s?(.*):$
// sub       ]\n},\n{\n   "index":$1,\n   "topic":"$2",\n   "answers":\n      [

//define answers
// rex (^[^"\s\{}].*?)(?:\s\^\s(.*$))?$


//!prevention from moving from test page if test is in progress
//!careful with ", which may break json.. replace them in the beggining with \" if \ is not before them

function createQuestionBlock (index, randomize) {

    const item = QUEST[index];

    let questionBlock = document.createElement('div');
    questionBlock.setAttribute('index', index);
    questionBlock.classList.add('question_block')
    
    let questionName = document.createElement('span');
    questionName.classList.add('question_name');
    questionName.innerHTML = item.text;
    questionBlock.appendChild(questionName);
    
    let answersList = document.createElement('ul');
    answersList.classList.add('answers_list')
    questionBlock.appendChild(answersList);
    
    let answerIndexes;

    if (randomize) {
        answerIndexes = generateRandomUniqueNumbersArray(0, item.answers.length);
    } else {
        answerIndexes = generateGradualNumberArray(0, item.answers.length);
    }

    maxPoints += item.answers.length;

    for (let index of answerIndexes) {
        const answerItem = item.answers[index];
    
        //explanation
        const answerListItem = document.createElement('li');

        const answerSpan = document.createElement('span');
        answerListItem.appendChild(answerSpan);
        answerSpan.setAttribute('answer', '');

        let answerText = answerItem.text.trim();

        if (answerText.toLowerCase() === 'unknown') {
            if (answerItem.valid) 
                answerListItem.classList.add('selected');

            answerText = ' ';

        }
            
        answerSpan.innerHTML = answerText;
        
        if (answerItem.explanation) {
            const explanationSpan = document.createElement('span');
            answerListItem.appendChild(explanationSpan);
            explanationSpan.setAttribute('explanation', '')
            explanationSpan.innerHTML = answerItem.explanation;
        }
        
        answerListItem.setAttribute('valid', answerItem.valid);
        answersList.appendChild(answerListItem);
    }

    return questionBlock;
}

function generateGradualNumberArray (min, max) {
    
    const array = new Array();

    for (let i = min; i < max; i++)
    {
        array.push(i);
    }

    return array;
}

function generateRandomUniqueNumbersArray (min, max) {

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

function validateInput (input) {

    integer = parseInt(input.value);

    if (Number.isInteger(integer))
        return integer;
}

function warnOnInput (input) {
    input.classList.add('errorInput');
}

function removeWarnOnInput (input) {
    input.classList.remove('errorInput');
};

function validateFormData () {

    const data = new Object();

    data.status = 'invalid';

    data.min = validateInput(minInput);
    data.max = validateInput(maxInput);

    if (typeof data.min !== 'undefined' && data.min >= 0 && data.min <= limitQuestions) {

        removeWarnOnInput(minInput);

        if (typeof data.max !== 'undefined' && data.min <= data.max && data.max <= limitQuestions) {

            removeWarnOnInput(maxInput);
            
            data.status = 'valid';
        }
        else {
            warnOnInput(maxInput);
        }
    }
    else {
        warnOnInput(minInput);
    }

    return data;
}

function createIndexArray (min, max) {
    
    const array = new Array();

    for (let i = min; i <= max; i++) {
        array.push(i);
    }

    return array;
}

//?
function shuffleArray (array) {

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

function selectAnswer (event) {

    let target = event.target;

    if (target.tagName.toUpperCase() === 'SPAN') {
        target = target.parentElement;
    }

    target.classList.toggle('selected');

}

function addVoting (testFragment) {
    const answers = testFragment.querySelectorAll('li');

    const answersLenght = answers.length;

    for (let index = 0; index < answersLenght; index++) {
        answers[index].addEventListener('click', selectAnswer);
    }
}

function startTest (data) {

    testElement.innerHTML = '';
    testElement.classList.add('active');
    endButton.classList.remove('hidden');

    maxPoints = 0;

    let indexArray;

    if (!Array.isArray(data)) //it is object, this is used on normal start
    {
        indexArray = createIndexArray(data.min, data.max) //array is created from minimal to maximal syntactical index
    }
    else
    {
        indexArray = data;
    }
    
    const indexArrayLength = indexArray.length;

    shuffleArray(indexArray);

    readButton.classList.add('hidden');
    startButton.classList.add('hidden');
    questionsElement.classList.add('hidden');

    testFragment = new DocumentFragment();

    for (let index = 0; index < indexArrayLength; index++)
    {
        questionBlock = createQuestionBlock(indexArray[index], false);
        testFragment.appendChild(questionBlock);
    }

    addVoting(testFragment);

    testElement.appendChild(testFragment);
}

function endTest () {

    testElement.classList.remove('active');

    const questionBlocks = testElement.querySelectorAll('.question_block');
    const questionBlocksLength = questionBlocks.length;

    const incorrectQuestions = new Array();
    var score = 0;

    for (let questionBlocksIndex = 0; questionBlocksIndex < questionBlocksLength; questionBlocksIndex++)
    {
        const question = questionBlocks[questionBlocksIndex];

        const index = parseInt(question.getAttribute('index'));
        const answers = question.querySelectorAll('li');
        const answersLenght = answers.length;
        
        let incorrect;

        for (let answerIndex = 0; answerIndex < answersLenght; answerIndex++)
        {
            const answer = answers[answerIndex];
            const isValidAnswer = answer.getAttribute('valid') === 'true' ? true : false;
            const isSelectedAnswer = answer.classList.contains('selected');

            answer.removeEventListener('click', selectAnswer);

            if (isValidAnswer === isSelectedAnswer)
            {
                answer.classList.add('correct');
                score++;
            }
            else
            {
                answer.classList.add('error');
                incorrect = true;
            }
        }

        if (incorrect) {
            incorrectQuestions.push(index);
        }
        //console.log(answer);
    }

    const scoreElement = document.createElement('div');
    scoreElement.setAttribute('id', 'score');

    const currentScoreElement = document.createElement('span');
    currentScoreElement.innerText = score;

    const maxScoreElement = document.createElement('span');
    const maxScore = maxPoints;
    maxScoreElement.innerText = maxScore;

    const percentScoreElement = document.createElement('span');
    percentScoreElement.innerText = (score / maxScore * 100).toFixed(2);

    let color;

    if (score < maxScore / 2) {
        const green = Math.floor((16 / maxScore * score)).toString(16);
        color = '#F' + green + '0';
    }
    else {
        const red = Math.floor(16 - (16 / maxScore * score)).toString(16);
        color = '#' + red + 'F0';
    }

    currentScoreElement.style.color = color;
    percentScoreElement.style.color = color;

    scoreElement.appendChild(currentScoreElement);
    scoreElement.appendChild(maxScoreElement);
    scoreElement.appendChild(percentScoreElement);

    testElement.appendChild(scoreElement);

    if (score !== maxScore) {

        const repeatWrongButton = document.createElement('div');
        repeatWrongButton.innerText = 'Repeat wrong answers';
        repeatWrongButton.classList.add('button');
        repeatWrongButton.setAttribute('id', 'repeatWrongButton');
        repeatWrongButton.addEventListener('click', function () {
            startTest(incorrectQuestions);
        })
        testElement.appendChild(repeatWrongButton);

        wrongIndexes = new Array();

        for (let i = 0; i < incorrectQuestions.length; i++) {
            wrongIndexes.push(QUEST[incorrectQuestions[i]].index);
        }

        wrongIndexesElement.innerText = wrongIndexes.join('^');

        const spacer = document.createTextNode(' ')
        testElement.appendChild(spacer);
    }

    const clearTestButton = document.createElement('div');
        clearTestButton.innerText = 'Clear test';
        clearTestButton.classList.add('button');
        clearTestButton.setAttribute('id', 'clearTestButton');
        clearTestButton.addEventListener('click', function () {
            testElement.innerHTML = '';
        })
        testElement.appendChild(clearTestButton);
    
    endButton.classList.add('hidden');
    readButton.classList.remove('hidden');
    startButton.classList.remove('hidden');
}