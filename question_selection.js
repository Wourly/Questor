function getUrlVariables () {

    const captureVariables = new RegExp (/^.*\?(.*)$/);
    const capturedVariables = captureVariables.exec(window.location);

    var variableString = null;

    if (capturedVariables.length > 1) {
        variableString = capturedVariables[1];
    }
    else
    {
        return null;
    }

    const variableStringArray = variableString.split('&');
    const variableStringArrayLength = variableStringArray.length;

    if (variableStringArrayLength > 0) {

        const variablesObject = new Object();

        for (let i = 0; i < variableStringArrayLength; i++) {

            const keyValuePair = variableStringArray[i].split('=');

            variablesObject[keyValuePair[0]] = keyValuePair[1];
        }

        return variablesObject;
    }
    else
    {
        return null;
    }
}

let questionsId = null;

const urlVars = getUrlVariables();

if (urlVars.questions && parseInt(urlVars.questions)) {
    questionsId = parseInt(urlVars.questions);
}
else
{
    questionsId = 1;
}

const questionFiles = ["valid_questions1.js", "valid_questions2.js"];

var questionSet = questionFiles[questionsId];

const questionScript = document.createElement('script');
questionScript.src = questionSet;

document.body.appendChild(questionScript);