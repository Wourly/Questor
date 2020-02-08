var q = null;

window.addEventListener('load', function pageLoad () {

    const URLVARS = getUrlVariables();
    deepFreeze(URLVARS);

    if (URLVARS && URLVARS.test)
    {
        const selectedTest = URLVARS.test;
        //===================
        // RUN
        //===================
        if (selectedTest !== 'convertor')
        {
            const selectedFolder = './Tests/' + selectedTest + '/';

            questionScript = document.createElement('script');
            questionScript.src = selectedFolder + 'questions.js';
            
            questionScript.addEventListener('load', function questionScriptLoaded () {

                q = new Questor(QUESTIONS, TAGS);
                console.log(q);
            });

            questionScript.addEventListener('error', function questionScriptMissing () {

                writeGuidePage('Could not find test: ' + selectedTest);

            });

            document.head.appendChild(questionScript);
            //playground
            {

            }
        }

        //===================
        // /RUN
        //===================
    }
    else
    {
        createGuidePage();
    }

});