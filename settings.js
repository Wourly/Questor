const AVAILABLE_SUBJECTS = [
    {name:"Neurobiologie", code: "MB150P36",
        defaultTest: {

        }
    },
    {name:"Fyziologie živočichů a člověka", code: "MB150P26B",
        defaultTest: {
            questionsOnPage: 20,
            questionsTotal: 20,
            timeLimit: 60
        }
    }
];

deepFreeze(AVAILABLE_SUBJECTS);