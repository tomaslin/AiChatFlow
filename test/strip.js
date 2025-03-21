const fs = require('fs');
const path = require('path');

function stripHtmlContent(html) {
    // Remove everything under the <head> tag
    html = html.replace(/<head[\s\S]*?>[\s\S]*?<\/head>/gi, '');

    // Remove comments
    html = html.replace(/<!--[\s\S]*?-->/g, '');

    // Remove script tags and their content
    html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

    // Remove inline CSS styles
    html = html.replace(/style="[^"]*"/gi, '');

    // Remove SVG tags and their content
    html = html.replace(/<svg[\s\S]*?>[\s\S]*?<\/svg>/gi, '');

    // Remove image src attributes
    html = html.replace(/<img[^>]*\ssrc=["'][^"']*["']/gi, '');

    // Remove style tags and their content
    html = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');

    return html;
}

function processHtmlFile(filePath) {
    try {
        const absolutePath = path.resolve(filePath);
        const htmlContent = fs.readFileSync(absolutePath, 'utf-8');
        const cleanedHtml = stripHtmlContent(htmlContent);
        fs.writeFileSync(absolutePath, cleanedHtml, 'utf-8');
        console.log(`Processed and updated file: ${absolutePath}`);
    } catch (error) {
        console.error('Error processing HTML file:', error);
    }
}

// Specify the HTML file to process
const htmlFilePath = path.join(__dirname, 'parsing.html');
processHtmlFile(htmlFilePath);