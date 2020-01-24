window.addEventListener('load', () => {

    const input = document.getElementById('input');
    const output = document.getElementById('output');

    input.addEventListener('input', () => {
        
        var outputText = input.value;

        //should be outputText object with error (not found by regex and converted), should not allow to copy converted, if there is error

        //removing comments
        var outputText = outputText.replace(/^=+(.+)=+$/gm, "//$1");

        //!should be in engine
        outputText = outputText.replace(/\{ion\{([A-Z][a-z])?(\d?[-+])\}\}/g,
            "$1<sup>$2</sup>");

        //remove empty lines
        outputText = outputText.replace(/^[\s]*?$\n/gm, '');

        //define questionBlock
        outputText = outputText.replace(/\n?\((\d{1,3})\)\s?(.*):$/gm,
            "\n        ]\n},\n{\n   \"index\":\"$1\",\n   \"text\":\"$2\",\n   \"answers\":\n        [")

        //define true answers
        outputText = outputText.replace(/^\s?T\s?([^^]*?)\s?(?:\^\s?(.*?))?$/gmi,
            "            {\"valid\":true, \"text\":\"$1\", \"explanation\":\"$2\"},")

        //define false answers
        outputText = outputText.replace(/^\s?X\s?([^^]*?)\s?(?:\^\s?(.*?))?$/gmi,
            "            {\"valid\":false, \"text\":\"$1\", \"explanation\":\"$2\"},")

        //clearing first ]} (created by regex)
        outputText = outputText.replace(/^[^\[\{\}]*?][^\[\{\}].*?},[^\[\{\}]*?{/s,
            "{")

        //ending of question object
        outputText += "\n        ]\n}";

        //remove comma at the end of (answers) array
        outputText = outputText.replace(/(\}),(\n.*?\])/gm, "$1$2");

        
        output.value = outputText

    })




})