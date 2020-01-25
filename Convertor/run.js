var convertor = null;
Object.freeze(SETTINGS);

window.addEventListener('load', function () {
    convertor = new Convertor(SETTINGS);
    console.log(convertor);
    convertor.start();
    convertor.convert();
})