// Make aiProvider globally accessible
let aiProvider;

const isIPhone = /iPhone/i.test(navigator.userAgent);

// Initialize Claude provider and apply margins
function initializeProvider() {
    const styleSheet = document.createElement('style');

    if (window.location.hostname === 'gemini.google.com' && !aiProvider) {
        aiProvider = new GeminiProvider();
    }
    
    if (window.location.hostname === 'aistudio.google.com' && !aiProvider) {
        aiProvider = new AistudioProvider();
    }

    if (window.location.hostname === 'grok.com' && !aiProvider) {
        aiProvider = new GrokProvider();
    }

    if (window.location.hostname === 'copilot.microsoft.com' && !aiProvider) {
        aiProvider = new CopilotProvider();
    }

    if (window.location.hostname === 'claude.ai' && !aiProvider) {
        aiProvider = new ClaudeProvider();
    }

    if (window.location.hostname === 'poe.com' && !aiProvider) {
        aiProvider = new PoeProvider();
    }
    
    
    if(isIPhone){
        styleSheet.textContent += `
        #ai-chat-flow-editor {
            width: 100%;
            height: 70%;
            background: #1a1a1a;
            border-left: 1px solid #3d4852;
            box-shadow: -2px 0 12px rgba(0,0,0,0.6);
        }
        .editor-header {
            background: #2d3748;
        }
        .editor-top-bar, .toolbar {
            background: #2d3748;
            border-bottom: 1px solid #4a5568;
        }
        .file-action-btn, .toolbar-btn, .copy-btn, .toggle-files-btn, .ai-chat-flow-minimize-btn {
            color: #e2e8f0;
        }
        `;
    }

    document.head.appendChild(styleSheet);

    if(!isIPhone){
        getMinimizedState().then(isMinimized => {
            aiProvider.slideContent(isMinimized);
        });
    }
    aiProvider.runChatBatchIfNeeded();
}

// Initialize the editor
function initializeEditor() {
    const initUI = () => createEditorUI().then(initializeProvider);
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }
}

// Listen for messages from the popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleEditor') {
        toggleEditor();
    } else if (message.action === 'toggleFiles') {
        toggleFiles();
    }
});

// Initialize the editor when the page loads
initializeEditor();
