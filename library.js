"use strict"

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

function deepFreeze (object) {

    if (object instanceof Object)
    {
        Object.freeze(object);
        
        for (let property in object)
        {
            deepFreeze(object[property]);
        }
    }
}

function createWarning (message, halflife) {

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

function writeGuidePage (errorMessage) {
    
    const body = document.body;

    body.innerHTML = '';

    body.classList.add('bodyPadding');

    if (errorMessage)
    {
        const headline = document.createElement('p');
        headline.classList.add('error-headline');
        headline.innerText = errorMessage;
        body.appendChild(headline);
    }

    {
        //from settings.js
        const subjects = AVAILABLE_SUBJECTS;
        const subjectsLength = subjects.length;

        const subjectFragment = new DocumentFragment();

        for (let index = 0; index < subjectsLength; index++)
        {
            const subject = subjects[index];
            console.log(subject);

            const subjectContainer = document.createElement('div');
            subjectContainer.classList.add('subject-container');
            subjectContainer.addEventListener('click', function anchor ()
            {
                window.location.href = window.location.pathname + '?test=' + subject.folder;
            });
            
            const subjectName = document.createElement('span');
            subjectName.classList.add('subject-name');
            subjectName.innerText = subject.name;
            subjectContainer.appendChild(subjectName);

            subjectFragment.appendChild(subjectContainer);

            
        }

        body.appendChild(subjectFragment);
    }

};