const limitElement = document.getElementById('limit');
const limitQuestions = QUEST.length - 1;

let maxPoints = null;

limitElement.innerHTML = `0 - ${limitQuestions}`;

const questionsElement = document.getElementById('questions');
const testElement = document.getElementById('test');

const minInput = document.getElementById('min');
const maxInput = document.getElementById('max');

const indexInput = document.getElementById('indexes');
const wrongIndexesElement = document.getElementById('wrongIndexes');

//input <- filling max value automatically
maxInput.value = limitQuestions;

const readButton = document.getElementById('readButton');
const startButton = document.getElementById('startButton');
const endButton = document.getElementById('endButton');