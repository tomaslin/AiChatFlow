const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const vm = require('vm');

// Import BaseAIProvider and MarkDownConverter
const BaseAIProviderModule = require('../Shared (Extension)/Resources/baseProvider.js');
const MarkDownConverter = require('../Shared (Extension)/Resources/markdownConverter.js');

// Make sure BaseAIProvider is a constructor before making it global
if (typeof BaseAIProviderModule !== 'function' || !(BaseAIProviderModule.prototype instanceof Object)) {
    global.BaseAIProvider = class BaseAIProvider {
        constructor() {
            Object.assign(this, BaseAIProviderModule);
        }
    };
} else {
    global.BaseAIProvider = BaseAIProviderModule;
}

// Function to get provider class from file
function getProviderClass(providerPath, document) {
    const content = fs.readFileSync(providerPath, 'utf-8');
    const fileName = path.basename(providerPath, '.js');
    const className = fileName.charAt(0).toUpperCase() + fileName.slice(1) + 'Provider';
    
    const context = vm.createContext({
        BaseAIProvider: global.BaseAIProvider,
        document: document,
        setTimeout: setTimeout,
        console: console,
        MarkDownConverter: class MarkDownConverter {
            remove(html, selectors) { return html; }
            convert(html) { return html; }
        },
        window: {
            document: document
        },
        global: {},
        module: { exports: {} }
    });
    
    // Wrap the content to capture the class using dynamic class name
    const wrappedContent = `
        ${content}
        global.ProviderClass = ${className};
    `;
    
    // Execute the provider code in the context
    vm.runInContext(wrappedContent, context);
    
    // Return the provider class from global
    return context.global.ProviderClass;
}

async function testProvider(providerPath, htmlFilePath) {
    // Read the HTML file
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
    
    // Create a DOM from the HTML content
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Get the provider class with document context
    const ProviderClass = getProviderClass(providerPath, document);
    
    if (!ProviderClass) {

        throw new Error(`No provider class found in ${providerPath}`);
    }
    
    // Instantiate the provider
    const provider = new ProviderClass();
    
    // Check if methods exist before calling them
    if (typeof provider.getMessageContainers !== 'function') {
        console.error('getMessageContainers is not a function on the provider instance');
        console.log('Provider instance:', provider);
        return;
    }
    
    // Get message containers
    const containers = provider.getMessageContainers();
    
    if (!containers || containers.length === 0) {
        console.log('No message containers found');
        return;
    }
    
    // Test parsing for each container
    for (const container of containers) {
        if (typeof provider.getPromptAndResponse !== 'function') {
            console.error('getPromptAndResponse is not a function on the provider instance');
            return;
        }
        try {
            const result = await provider.getPromptAndResponse(container);
            console.log('Parsed Result:', result);
        } catch (error) {
            console.error('Error parsing container:', error);
        }
    }
}

// Example usage: Supply the provider path and path to your HTML file
const providerPath = path.join(__dirname, '../Shared (Extension)/Resources/gemini.js');
const htmlFilePath = path.join(__dirname, 'example.html');
testProvider(providerPath, htmlFilePath);