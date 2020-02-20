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

                console.log(URLVARS);

                //const SETTINGS = new Object();

                const SETTINGS = (function findSubject () {

                    for (let index = 0; index < AVAILABLE_SUBJECTS.length; index++)
                    {
                        const subjectData = AVAILABLE_SUBJECTS[index];

                        if (subjectData.code === selectedTest)
                        {
                            return subjectData;
                        }
                    };
                })();

                console.log(SETTINGS);

                q = new Questor(QUESTIONS, TAGS, SETTINGS);
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