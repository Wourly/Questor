

window.addEventListener('load', function ()
{
    window.name = 'subtopicIframe';
    document.body.setAttribute('subtopic', '');

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '../../../../common.css';
    document.head.appendChild(stylesheet);
    
    const isInIframe = (function ()
    {
        //ugly workaround, because VS code marks code after this function as unreachable if returns are in following try/catch
        let returnValue = null
        try
        {
            returnValue = window.self !== window.top;
        }
        catch (e)
        {
            returnValue = true;
        }

        return returnValue;
    })();

    if (!isInIframe) {
        document.body.setAttribute('isolated', '');
        
        const subtopicTitleElement = document.querySelector('h1');

        if (subtopicTitleElement)
        {
            document.title = subtopicTitleElement.innerText;
        }
    }
    else
    {
        //informs parent window of frame height dimension
        const messageIframeHeight = function messageIframeHeight () {

            //window.innerWidth is equal to maximum width, which could be provided by browser (if we consider frame has 100% width in parent)
            //DOMRect.width is equal to width actually used by frame
            //so scrollbar is present, if frame can maximally use less space, than the content is really using
            const isScrollbarPresent = window.innerWidth <= Math.ceil(document.body.getBoundingClientRect().width);
            
            //console.log(document.body.scrollHeight, document.body.clientHeight, document.body.offsetHeight)
            //console.log(window.innerWidth, outerWidth, document.body.scrollHeight, document.body.clientHeight, document.body.offsetHeight, document.body.getBoundingClientRect().width)

            //console.group();
            //console.log(window.innerWidth <= document.body.getBoundingClientRect().width, window.innerWidth, document.body.getBoundingClientRect().width)
            //console.log((window.innerWidth <= document.body.getBoundingClientRect().width) === (window.innerWidth <= parseInt(document.body.getBoundingClientRect().width)))
            //console.groupEnd();
            //console.log(isScrollbarPresent)

            parent.postMessage({action: 'setIframeHeight', height: document.body.offsetHeight, isScrollbarPresent: isScrollbarPresent}, '*');
        }

        //stylesheet need to be loaded, before it is possible to correctly calculate content height of iframe
        stylesheet.addEventListener('load', messageIframeHeight);

        //messaging
        window.addEventListener('message', function messageHandler (event) {
            if (event)
            {
                if (event.data)
                {
                    const {data} = event;
                    const {action} = data;
                    
                    switch (action) {
                        //requested on resize event from parent, so frame can be stretched
                        case 'requestIframeSize':
                            {
                                messageIframeHeight();
                                break;
                            }
                            
                        default:
                            {
                                console.warn('unrecognized action');
                            }
                    }
                }
            }
        })

        window.addEventListener('mouseup', function (event) {

            const selection = window.getSelection();
            const isSomethingSelected = (selection.anchorOffset - selection.focusOffset) !== 0 ? true : false;

            let selectionText = null;

            if (isSomethingSelected)
            {
                selectionText = selection + '';
            }

            parent.postMessage({action: 'textSelection', text: selectionText}, '*')
            parent.postMessage({action: 'focusMainWindow'}, '*')
        });
    }

    //image copyright processing
    {
        const images = document.querySelectorAll('img');
        const possibleDatasetCopyrightProperties = ['title', 'owner', 'author', 'website'];

        const imagesCount = images.length;

        //iterating over all images
        for (let index = 0; index < imagesCount; index++)
        {
            const image = images[index];

            let proceed = false;

            if (image.dataset)
                if (image.dataset.owner || image.dataset.author || image.dataset.website)
                    proceed = true;

            if (!proceed)
            {
                document.body.innerHTML = '<h1>Copyright violation!</h1><p>Every image needs attribute describing it\'s owner, author or website, where it was taken from!</p><h2>example:</h2><p>&lt;img src="choline.jpg" data-website="wikipedia.org"&gt;</p>';
                break;
            }
            else
            {
                const imageTitle = new Array();
                for (const propertyIndex in possibleDatasetCopyrightProperties)
                {
                    const propertyName = possibleDatasetCopyrightProperties[propertyIndex];
                    const propertyValue = image.dataset[propertyName];

                    if (propertyName === 'title' && propertyValue)
                    {
                        imageTitle.push(propertyValue + '\n');
                    }
                    else
                    {
                        if (propertyValue)
                        {
                            imageTitle.push(propertyName + ': ' + propertyValue);
                        }
                    }
                }

                image.setAttribute('title', imageTitle.join('\n'))
            }
        }
    }
    //image copyright processing end

    //space-block processing
    {
        const blocks = document.querySelectorAll('space-block');

        const blocksCount = blocks.length;

        //iterating over all images
        for (let index = 0; index < blocksCount; index++)
        {
            const block = blocks[index];

            //console.log(block);

            if (block.dataset)
            {
                const {height} = block.dataset;

                if (height)
                    block.style.height = String(height) + 'px';
            }

        }
    }
    //space-block processing

    //children-style processing
    /*{
        const elements = document.querySelectorAll('*[data-children-style]');

        const elementsCount = elements.length;

        //iterating over all images
        for (let index = 0; index < elementsCount; index++)
        {
            const element = elements[index];

            console.log(element);

            console.log(JSON.parse(element.dataset.childrenStyle));

        }
    }*/

    //children-style processing

    //source-reference processing
    //adds target="_blank" to anchors
    {
        const anchors = document.querySelectorAll('source-reference a');

        const anchorsCount = anchors.length;

        //iterating over all images
        for (let index = 0; index < anchorsCount; index++)
        {
            const anchor = anchors[index];
            anchor.setAttribute('target', '_blank');

        }
    }
    //source-reference processing
});