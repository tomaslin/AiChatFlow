class MarkDownConverter {
    remove(htmlString, selectors) {
        const tempElement = document.createElement('div');
        tempElement.innerHTML = htmlString;
        const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

        selectorArray.forEach(selector => {
            const elements = tempElement.querySelectorAll(selector);
            elements.forEach(element => {
                element.parentNode.removeChild(element);
            });
        });

        console.log(tempElement);
        return tempElement.innerHTML;
    }

    convert(htmlString) {
        const tempElement = document.createElement('div');
        tempElement.innerHTML = htmlString;
        let plainText = '';
        let listLevel = 0;
        let orderedListItemNumber = 1;

        function processNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                plainText += node.textContent.trim();
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                plainText += ' ';

                if (tagName === 'p') {
                    node.childNodes.forEach(processNode);
                    plainText += '\n';
                } else if (tagName === 'strong' || tagName === 'b') {
                    plainText += '**';
                    node.childNodes.forEach(processNode);
                    plainText += '**';
                } else if (tagName === 'em' || tagName === 'i') {
                    plainText += '*';
                    node.childNodes.forEach(processNode);
                    plainText += '*';
                } else if (tagName === 'ul' || tagName === 'ol') {
                    listLevel++;
                    node.childNodes.forEach(processNode);
                    listLevel--;
                    plainText += '\n';
                } else if (tagName === 'li') {
                    plainText += (node.parentNode.tagName.toLowerCase() === 'ol' ? 
                        `${orderedListItemNumber}. ` : '* ');
                    orderedListItemNumber++;
                    node.childNodes.forEach(processNode);
                    plainText += '\n';
                } else if (tagName === 'div') {
                    node.childNodes.forEach(processNode);
                } else if (tagName.startsWith('h')) {
                    plainText += `${'#'.repeat(parseInt(tagName[1]))} `;
                    node.childNodes.forEach(processNode);
                    plainText += '\n';
                } else if (tagName === 'code') {
                    plainText += '`';
                    node.childNodes.forEach(processNode);
                    plainText += '`';
                } else {
                    node.childNodes.forEach(processNode);
                }
                plainText += ' ';
            }
        }

        processNode(tempElement);
        plainText = plainText.trim();

        let formattedText = '';
        const lines = plainText.split('\n').map(line => line.trim()).filter(line => line !== '');

        lines.forEach((line, index) => {
            if (index > 0 && !line.startsWith('*') && !/^\d+\.\s/.test(line)) {
                formattedText += '\n';
            }
            formattedText += line;
        });

        formattedText = formattedText.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

        return formattedText;
    }
}
