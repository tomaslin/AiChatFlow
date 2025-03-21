const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function compareHtmlFiles(file1Content, file2Content, fileName1, fileName2) {
    const dom1 = new JSDOM(file1Content);
    const dom2 = new JSDOM(file2Content);

    const doc1 = dom1.window.document;
    const doc2 = dom2.window.document;

    const differences = new Set();

    // Compare div elements
    const divs1 = Array.from(doc1.querySelectorAll('div'));
    const divs2 = Array.from(doc2.querySelectorAll('div'));

    divs1.forEach((div, index) => {
        const div2 = divs2[index];
        if (!div2 || div.outerHTML !== div2.outerHTML) {
            differences.add(`Div difference at index ${index}: ${fileName1} - ${div.outerHTML}, ${fileName2} - ${div2 ? div2.outerHTML : 'Not present'}`);
        }
    });

    // Compare classes
    const classes1 = Array.from(doc1.querySelectorAll('*')).map(el => el.className).filter(Boolean);
    const classes2 = Array.from(doc2.querySelectorAll('*')).map(el => el.className).filter(Boolean);

    classes1.forEach((className) => {
        if (!classes2.includes(className)) {
            differences.add(`Class present in ${fileName1} but not in ${fileName2}: ${className}`);
        }
    });

    classes2.forEach((className) => {
        if (!classes1.includes(className)) {
            differences.add(`Class present in ${fileName2} but not in ${fileName1}: ${className}`);
        }
    });

    return Array.from(differences);
}

function processHtmlFiles(filePath1, filePath2) {
    try {
        const absolutePath1 = path.resolve(filePath1);
        const absolutePath2 = path.resolve(filePath2);
        const file1Content = fs.readFileSync(absolutePath1, 'utf-8');
        const file2Content = fs.readFileSync(absolutePath2, 'utf-8');
        const differences = compareHtmlFiles(file1Content, file2Content, path.basename(filePath1), path.basename(filePath2));
        differences.forEach(diff => console.log(diff));
    } catch (error) {
        console.error('Error processing HTML files:', error);
    }
}

// Specify the HTML files to compare
const htmlFilePath1 = path.join(__dirname, 'executing.html');
const htmlFilePath2 = path.join(__dirname, 'finished.html');
processHtmlFiles(htmlFilePath1, htmlFilePath2);