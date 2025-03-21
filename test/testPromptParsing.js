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

async function testParsing(providerPath, htmlFilePath) {
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
        // Check if getChatMessages exists on provider or fall back to base implementation
        const getChatMessagesMethod = typeof provider.getChatMessages === 'function' 
            ? provider.getChatMessages.bind(provider)
            : (typeof BaseAIProvider.prototype.getChatMessages === 'function' 
                ? BaseAIProvider.prototype.getChatMessages.bind(provider) 
                : null);
        
        if (!getChatMessagesMethod) {
            console.error('getChatMessages is not available on the provider or BaseAIProvider');
            return;
        }
        
        try {
            const result = await getChatMessagesMethod(container);
            console.log('Parsed Result:', result);
        } catch (error) {
            console.error('Error parsing container:', error);
        }
    }
}

// Function to test waitForCompletion method
async function testWaitForCompletion(providerPath, executingHtmlPath, finishedHtmlPath) {
    console.log('\nTesting waitForCompletion method...');
    
    // Test with executing HTML
    console.log('Testing with executing state...');
    const executingHtmlContent = fs.readFileSync(executingHtmlPath, 'utf-8');
    const executingDom = new JSDOM(executingHtmlContent);
    const executingDocument = executingDom.window.document;
    
    const ExecutingProviderClass = getProviderClass(providerPath, executingDocument);
    const executingProvider = new ExecutingProviderClass();
    
    if (typeof executingProvider.waitForCompletion !== 'function') {
        console.error('waitForCompletion is not a function on the provider instance');
        return;
    }
    
    const executingContainers = executingProvider.getMessageContainers();
    const initialExecutingCount = executingContainers.length;
    
    // Test with finished HTML
    console.log('Testing with finished state...');
    const finishedHtmlContent = fs.readFileSync(finishedHtmlPath, 'utf-8');
    const finishedDom = new JSDOM(finishedHtmlContent);
    const finishedDocument = finishedDom.window.document;
    
    const FinishedProviderClass = getProviderClass(providerPath, finishedDocument);
    const finishedProvider = new FinishedProviderClass();
    
    const finishedContainers = finishedProvider.getMessageContainers();
    const initialFinishedCount = finishedContainers.length;
    
    // Since we can't actually wait for completion in a test environment,
    // we'll just check if the method exists and can be called
    try {
        // We expect this to resolve quickly in test environment
        const executingResult = await executingProvider.waitForCompletion(initialExecutingCount - 1);
        console.log('Executing state result:', executingResult);
        
        const finishedResult = await finishedProvider.waitForCompletion(initialFinishedCount - 1);
        console.log('Finished state result:', finishedResult);
        
        console.log('waitForCompletion test completed');
    } catch (error) {
        console.error('Error testing waitForCompletion:', error);
    }
}

// Example usage: Supply the provider path and path to your HTML file
const providerPath = path.join(__dirname, '../Shared (Extension)/Resources/aistudio.js');
const htmlFilePath = path.join(__dirname, 'parsing.html');
const executingHtmlPath = path.join(__dirname, 'executing.html');
const finishedHtmlPath = path.join(__dirname, 'finished.html');

// Run the tests
testParsing(providerPath, htmlFilePath);
testWaitForCompletion(providerPath, executingHtmlPath, finishedHtmlPath);