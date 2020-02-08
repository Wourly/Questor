function Questor (QUESTIONS, TAGS) {

    this.QUESTIONS = QUESTIONS || null;
    this.TAGS = TAGS || null;

    //stores references to important elements
    this.DOM = (function connectDOM ()
    {
        const DOM = new Object();

        const ids = ['main', 'inventory'];
        const idsLength = ids.length;

        for (let index = 0; index < idsLength; index++)
        {
            const id = ids[index];
            const element = document.querySelector('#' + id);

            if (element) {
                DOM[id] = element;
            }
            else
            {
                console.error('Could not connect to DOM, when querying for id: ' + id );
                throw new Error();
            }
            
        }

        return DOM;
    })();

    this.API = (function createApi ()
    {
        const API = new Object();

        API.loadQuestions = function loadQuestions (data) {

            if (data && Array.isArray(data))
            {
                this.QUESTIONS = data;
            }

        }.bind(this);

        return API;

    }.bind(this))();

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

    this.build = (function build ()
    {
        const build = new Object();

        build.questionBlock = function questionBlock () {

            const block = document.createElement('question-block');
            
            const title = document.createElement('question-title');
            


            return block;
        };

        return build
    })();

    this.errorHandling = (function errorHandling ()
    {
        const errorHandling = new Object();

        errorHandling.createErrorMessage

        return errorHandling;

    }.bind(this))();

}