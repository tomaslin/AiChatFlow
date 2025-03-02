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
                    if (plainText.trim() !== '') {
                        plainText += '\n\n';
                    }
                    node.childNodes.forEach(processNode);
                    if (node.nextElementSibling && 
                        node.nextElementSibling.tagName.toLowerCase() !== 'p' && 
                        node.nextElementSibling.tagName.toLowerCase() !== 'ul' && 
                        node.nextElementSibling.tagName.toLowerCase() !== 'ol') {
                        plainText += '\n';
                    }
                } else if (tagName === 'strong' || tagName === 'b') {
                    plainText += '**';
                    node.childNodes.forEach(processNode);
                    plainText += '**';
                } else if (tagName === 'em' || tagName === 'i') {
                    plainText += '*';
                    node.childNodes.forEach(processNode);
                    plainText += '*';
                } else if (tagName === 'ul') {
                    if (plainText.trim() !== '' && !plainText.endsWith('\n')) {
                        plainText += '\n';
                    }
                    listLevel++;
                    node.childNodes.forEach(processNode);
                    listLevel--;
                    if (listLevel === 0 && !plainText.endsWith('\n')) {
                        plainText += '\n';
                    }
                } else if (tagName === 'ol') {
                    if (plainText.trim() !== '' && !plainText.endsWith('\n')) {
                        plainText += '\n';
                    }
                    listLevel++;
                    orderedListItemNumber = 1;
                    node.childNodes.forEach(processNode);
                    listLevel--;
                    if (listLevel === 0 && !plainText.endsWith('\n')) {
                        plainText += '\n';
                    }
                } else if (tagName === 'li') {
                    plainText += (node.parentNode.tagName.toLowerCase() === 'ol' ? 
                        `${orderedListItemNumber}. ` : '* ');
                    orderedListItemNumber++;
                    node.childNodes.forEach(processNode);
                    plainText += '\n';
                } else if (tagName === 'div') {
                    node.childNodes.forEach(processNode);
                } else if (tagName === 'h1') {
                    if (plainText.trim() !== '') {
                        plainText += '\n\n';
                    }
                    plainText += '# ';
                    node.childNodes.forEach(processNode);
                    plainText += '\n\n';
                } else if (tagName === 'h2') {
                    if (plainText.trim() !== '') {
                        plainText += '\n\n';
                    }
                    plainText += '## ';
                    node.childNodes.forEach(processNode);
                    plainText += '\n\n';
                } else if (tagName === 'h3') {
                    if (plainText.trim() !== '') {
                        plainText += '\n\n';
                    }
                    plainText += '### ';
                    node.childNodes.forEach(processNode);
                    plainText += '\n\n';
                } else if (tagName === 'h4') {
                    if (plainText.trim() !== '') {
                        plainText += '\n\n';
                    }
                    plainText += '#### ';
                    node.childNodes.forEach(processNode);
                    plainText += '\n\n';
                } else if (tagName === 'h5') {
                    if (plainText.trim() !== '') {
                        plainText += '\n\n';
                    }
                    plainText += '##### ';
                    node.childNodes.forEach(processNode);
                    plainText += '\n\n';
                } else if (tagName === 'h6') {
                    if (plainText.trim() !== '') {
                        plainText += '\n\n';
                    }
                    plainText += '###### ';
                    node.childNodes.forEach(processNode);
                    plainText += '\n\n';
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
        let inList = false;
        const lines = plainText.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('*') || /^\d+\.\s/.test(line)) {
                if (!inList && formattedText.trim() !== '') {
                    formattedText += '\n';
                }
                inList = true;
                formattedText += line + '\n';
            } else if (line !== '') {
                if (inList) {
                    inList = false;
                }
                if (formattedText.trim() !== '') {
                    formattedText += '\n\n';
                }
                formattedText += line;
            } else if (inList) {
                formattedText += '\n';
            }
        }

        formattedText = formattedText.trim();
        formattedText = formattedText.replace(/&nbsp;/g, ' ');
        
        while (formattedText.includes('  ')) {
            formattedText = formattedText.replace(/  /g, ' ');
        }

        return formattedText;
    }
}
