var questionsFragment = new DocumentFragment();

const readQuestionsIndexLimit = QUEST.length;

for (let i = 0; i < readQuestionsIndexLimit; i++) {
    questionsFragment.appendChild(createQuestionBlock(i))
}

questionsElement.appendChild(questionsFragment);

readButton.addEventListener('click', function () {
    questionsElement.classList.toggle('hidden');
})

startButton.addEventListener('click', function () {

    let indexInputValue = indexInput.value.trim();

    //classic min to max input
    if (indexInputValue.length <= 0) {

        let input = validateFormData();
        
        if (input.status === 'valid') {
            startTest(input);
        }
    }
    //input from exact indexes
    else
    {
        //should be called identificators later
        const inputIndexes = indexInputValue.split('^');

        const questionSyntacticalIndexes = new Array();

        //filtering desired indexes
        for (let i = 0; i < inputIndexes.length; i++) {

            for (let j = 0; j < limitQuestions; j++) {

                if (QUEST[j].index === inputIndexes[i]) {
                    questionSyntacticalIndexes.push(j);
                }

            }
        }

        startTest(questionSyntacticalIndexes);

    }

});

endButton.addEventListener('click', endTest);