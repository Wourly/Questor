
window.addEventListener('load', function ()
{
    console.log('pesheck');

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '../../../../common.css';

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

    if (!isInIframe)
        document.body.classList.add('subtopic-isolated');

    console.log(isInIframe)

    console.log(window.location.path)

    document.head.appendChild(stylesheet);

});