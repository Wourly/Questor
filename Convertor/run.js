var c = null;
Object.freeze(SETTINGS);

window.addEventListener('load', function () {
    c = new Convertor(SETTINGS);
    console.log(c);
    c.attach();
    c.convert();
})