

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
        const messageIframeHeight = function messageIframeHeight () {

            const isScrollbarPresent = (function detectScrollbarPresence () {

                const offSetScrollDifference = (document.body.offsetWidth - document.body.scrollWidth);
                //console.log(offSetScrollDifference);
                //edge has sometimes difference of 1
                if (offSetScrollDifference < 0)
                    return true;
                else
                    return false;

            })()
            
            //console.log(document.body.scrollHeight, document.body.clientHeight, document.body.offsetHeight)

            //console.log(isScrollbarPresent)

            parent.postMessage({action: 'setIframeHeight', height: document.body.scrollHeight, isScrollbarPresent: isScrollbarPresent}, '*');
        }

        //stylesheet need to be loaded, before it is possible to correctly calculate content height of iframe
        stylesheet.addEventListener('load', messageIframeHeight);

        //!must be called from resize event on parent
        window.addEventListener('message', function messageHandler (event) {
            if (event)
            {
                if (event.data)
                {
                    const {data} = event;
                    const {action} = data;
                    
                    switch (action) {
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
            //console.log(event);
            
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
});