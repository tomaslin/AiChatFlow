const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const vm = require('vm');

// Import BaseAIProvider (assuming this IS a CommonJS module)
const BaseAIProviderModule = require('../Shared (Extension)/Resources/baseProvider.js');
// --- REMOVED: require for markdownConverter ---

// --- Make BaseAIProvider global ---
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
// --- REMOVED: Global setup logic for MarkDownConverter ---

// --- Read the MarkDownConverter code as text ---
const markdownConverterPath = path.join(__dirname, '../Shared (Extension)/Resources/markdownConverter.js');
let markdownConverterCode = '';
try {
    markdownConverterCode = fs.readFileSync(markdownConverterPath, 'utf-8');
    console.log(`Successfully read ${markdownConverterPath}`);
} catch (error) {
    console.error(`Failed to read MarkDownConverter code from ${markdownConverterPath}:`, error);
    throw new Error(`Could not read markdownConverter.js. Ensure the path is correct and the file exists.`);
}

// Function to get provider class from file
function getProviderClass(providerPath, document) {
    const providerContent = fs.readFileSync(providerPath, 'utf-8');
    const fileName = path.basename(providerPath, '.js');
    const className = fileName.charAt(0).toUpperCase() + fileName.slice(1) + 'Provider';

    // Create the context for the VM
    const context = vm.createContext({
        // Provide BaseAIProvider via global
        BaseAIProvider: global.BaseAIProvider,
        // --- MarkDownConverter is NOT explicitly passed here anymore ---
        // It will be defined by executing its code string first.

        // Other necessary globals for the provider code
        document: document,
        window: { document: document }, // JSDOM window's document
        setTimeout: setTimeout,
        console: console, // Allow provider code to log
        global: {}, // Context's own global scope
        module: { exports: {} } // For provider scripts that might check module
    });

    // --- Combine MarkDownConverter code and Provider code ---
    // Execute MarkDownConverter code first to define the class,
    // then execute the provider code which uses it.
    // Finally, capture the ProviderClass.
    const wrappedContent = `
        // --- Injected MarkDownConverter Code ---
        ${markdownConverterCode}
        // --- End of Injected Code ---

        // --- Original Provider Code ---
        ${providerContent}
        // --- End of Provider Code ---

        // Capture the provider class (assuming it's globally available after its definition)
        // Ensure the class name derived matches the actual class name in the provider file.
        if (typeof ${className} !== 'undefined') {
           global.ProviderClass = ${className};
        } else {
           console.error("Error: Provider class '${className}' not found after executing script. Check class name in ${providerPath}");
           global.ProviderClass = null; // Explicitly set to null if not found
        }
    `;

    try {
        // Execute the combined script in the prepared context
        vm.runInContext(wrappedContent, context);
    } catch (e) {
        console.error(`Error running combined script (MarkdownConverter + Provider ${providerPath}) in VM context:`, e);
        // Provide more context on error if possible
        console.error("--- Error occurred likely within the injected or provider script execution ---");
        throw e; // Re-throw error after logging
    }


    // Return the provider class captured from the context's global
    if (!context.global.ProviderClass) {
         console.error(`Failed to capture ProviderClass (${className}) from the VM context.`);
    }
    return context.global.ProviderClass;
}

// (The rest of the script: testParsing, testWaitForCompletion, runTests remains largely the same)
// ... (Make sure error handling inside these functions is robust) ...

async function testParsing(providerPath, htmlFilePath) {
    console.log(`\n--- Testing Parsing: ${path.basename(providerPath)} with ${path.basename(htmlFilePath)} ---`);
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    let ProviderClass;
    try {
         ProviderClass = getProviderClass(providerPath, document);
         if (!ProviderClass) {
             throw new Error(`getProviderClass returned null or undefined for ${providerPath}`);
         }
         console.log(`Successfully obtained ProviderClass: ${ProviderClass.name || 'Unnamed Class'}`);
    } catch (error) {
        console.error(`Error getting Provider Class from ${providerPath} for parsing:`, error);
        return; // Stop this specific test case
    }

    let provider;
    try {
        // Instantiation should now work because MarkDownConverter was defined in the context
        provider = new ProviderClass();
        console.log(`Successfully instantiated ${ProviderClass.name || 'provider'}`);
    } catch (error) {
        console.error(`Error instantiating Provider Class '${ProviderClass?.name}' from ${providerPath}:`, error);
        // Check if MarkDownConverter exists *inside the instance* if instantiation partly worked
        if (provider) console.error("Provider instance partially created:", provider);
        // Check if the class constructor failed before assigning properties
        else console.error("Instantiation failed likely within the constructor.");
        return; // Stop this specific test case
    }

    // Check instance methods
    if (typeof provider.getMessageContainers !== 'function') {
        console.error('getMessageContainers is not a function on the provider instance'); return;
    }
    if (typeof provider.getChatMessages !== 'function' && typeof BaseAIProvider.prototype.getChatMessages !== 'function') {
         console.error('getChatMessages is not available on the provider or BaseAIProvider'); return;
    }

    // Get containers
    const containers = provider.getMessageContainers();
    console.log(`Found ${containers ? containers.length : 0} message containers in ${path.basename(htmlFilePath)}.`);
    if (!containers || containers.length === 0) {
        // Don't necessarily stop, could be valid
    }

    // Define the method to call
    const getChatMessagesMethod = typeof provider.getChatMessages === 'function'
            ? provider.getChatMessages.bind(provider)
            : BaseAIProvider.prototype.getChatMessages.bind(provider); // Assume BaseAIProvider has it if provider doesn't override

    // Parse messages
    try {
        const result = await getChatMessagesMethod();
        console.log(`Parsed Result from ${path.basename(htmlFilePath)}:`, JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(`Error during getChatMessages from ${path.basename(htmlFilePath)}:`, error);
         // Log the state of the provider's markdown converter if it exists
        if(provider.markDownConverter) {
            console.error("Provider's markdownConverter instance:", provider.markDownConverter);
        } else {
             console.error("Provider instance does not have a 'markDownConverter' property.");
        }
    }
    console.log(`--- Finished Parsing Test: ${path.basename(htmlFilePath)} ---`);
}


async function testWaitForCompletion(providerPath, executingHtmlPath, finishedHtmlPath) {
    console.log(`\n--- Testing waitForCompletion: ${path.basename(providerPath)} ---`);

    // --- Setup for Executing State ---
    console.log(`Setting up for Executing State: ${path.basename(executingHtmlPath)}`);
    let executingProvider;
    let initialExecutingCount = 0;
    try {
        const executingHtmlContent = fs.readFileSync(executingHtmlPath, 'utf-8');
        const executingDom = new JSDOM(executingHtmlContent);
        const executingDocument = executingDom.window.document;

        const ExecutingProviderClass = getProviderClass(providerPath, executingDocument);
        if (!ExecutingProviderClass) throw new Error(`Failed to get provider class for executing state`);

        executingProvider = new ExecutingProviderClass();
        console.log(`Instantiated provider for executing state: ${ExecutingProviderClass.name}`);

        if (typeof executingProvider.waitForCompletion !== 'function') throw new Error('waitForCompletion method missing');
        if (typeof executingProvider.getMessageContainers !== 'function') throw new Error('getMessageContainers method missing');

        const executingContainers = executingProvider.getMessageContainers();
        initialExecutingCount = executingContainers ? executingContainers.length : 0;
        console.log(`Initial container count (executing): ${initialExecutingCount}`);

    } catch (error) {
         console.error("Error setting up test for executing state:", error);
         return; // Stop this test
    }

    // --- Setup for Finished State ---
    console.log(`\nSetting up for Finished State: ${path.basename(finishedHtmlPath)}`);
    let finishedProvider;
    let initialFinishedCount = 0;
     try {
        const finishedHtmlContent = fs.readFileSync(finishedHtmlPath, 'utf-8');
        const finishedDom = new JSDOM(finishedHtmlContent);
        const finishedDocument = finishedDom.window.document;

        const FinishedProviderClass = getProviderClass(providerPath, finishedDocument);
        if (!FinishedProviderClass) throw new Error(`Failed to get provider class for finished state`);

        finishedProvider = new FinishedProviderClass();
        console.log(`Instantiated provider for finished state: ${FinishedProviderClass.name}`);

        if (typeof finishedProvider.waitForCompletion !== 'function') throw new Error('waitForCompletion method missing');
        if (typeof finishedProvider.getMessageContainers !== 'function') throw new Error('getMessageContainers method missing');

        const finishedContainers = finishedProvider.getMessageContainers();
        initialFinishedCount = finishedContainers ? finishedContainers.length : 0;
        console.log(`Initial container count (finished): ${initialFinishedCount}`);

    } catch (error) {
         console.error("Error setting up test for finished state:", error);
         return; // Stop this test
    }

    // --- Run waitForCompletion Simulation ---
    console.log('\nRunning waitForCompletion simulation...');
    try {
        // Pass the count *before* the expected new item. Adjust if your logic differs.
        console.log(`Calling waitForCompletion on executing state (expecting result for container count > ${initialExecutingCount})...`);
        const executingResult = await executingProvider.waitForCompletion(initialExecutingCount);
        console.log('Executing state waitForCompletion simulation result:', executingResult);

        console.log(`Calling waitForCompletion on finished state (expecting result for container count > ${initialFinishedCount})...`);
        const finishedResult = await finishedProvider.waitForCompletion(initialFinishedCount);
        console.log('Finished state waitForCompletion simulation result:', finishedResult);

        console.log('\nwaitForCompletion test simulation completed.');
    } catch (error) {
        console.error('Error during waitForCompletion simulation:', error);
    }
     console.log(`--- Finished waitForCompletion Test ---`);
}

// --- Test Execution ---
const providerPath = path.join(__dirname, '../Shared (Extension)/Resources/aistudio.js');
const htmlFilePath = path.join(__dirname, 'parsing.html');
const executingHtmlPath = path.join(__dirname, 'executing.html');
const finishedHtmlPath = path.join(__dirname, 'finished.html');

async function runTests() {
    // Validate paths before starting
    const pathsToValidate = [providerPath, markdownConverterPath, htmlFilePath, executingHtmlPath, finishedHtmlPath];
    for (const p of pathsToValidate) {
        if (!fs.existsSync(p)) {
             console.error(`\nFATAL ERROR: Required file not found at path: ${p}`);
             process.exit(1);
        }
    }
    console.log("All required files found. Starting tests...\n");


    try {
        await testParsing(providerPath, htmlFilePath);
        await testParsing(providerPath, executingHtmlPath);
        await testParsing(providerPath, finishedHtmlPath);

        await testWaitForCompletion(providerPath, executingHtmlPath, finishedHtmlPath);

        console.log("\n--- All tests completed ---");

    } catch (error) {
        console.error("\n--- Unhandled error during test execution sequence ---:", error);
        process.exit(1);
    }
}

runTests();