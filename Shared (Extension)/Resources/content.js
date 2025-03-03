// Make aiProvider globally accessible
let aiProvider;

const isIPhone = /iPhone/i.test(navigator.userAgent);

// Initialize Claude provider and apply margins
function initializeProvider() {
    const styleSheet = document.createElement('style');

    if (window.location.hostname === 'claude.ai' && !aiProvider) {
        aiProvider = new ClaudeProvider();
    }

    if (window.location.hostname === 'gemini.google.com' && !aiProvider) {
        
        styleSheet.textContent = `
        .ai-chat-flow-minimize-icon {
            top: 8px !important;
            right: ${isIPhone ? '175px' : '135px'} !important;
        }
        `;

        aiProvider = new GeminiProvider();
    }

    if (window.location.hostname === 'grok.com' && !aiProvider) {
        aiProvider = new GrokProvider();
    }

    if (window.location.hostname === 'chat.deepseek.com' && !aiProvider) {
        aiProvider = new DeepseekProvider();
    }

    if (window.location.hostname === 'copilot.microsoft.com' && !aiProvider) {
        aiProvider = new CopilotProvider();
    }
    
    if(isIPhone){
        styleSheet.textContent += `
        #ai-chat-flow-editor {
            width: 100%;
            height: 75%;
        }
        `;
    }

    document.head.appendChild(styleSheet);

    if(!isIPhone){
        getMinimizedState().then(isMinimized => {
            aiProvider.slideContent(isMinimized);
        });
    }
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

// Initialize the editor when the page loads
initializeEditor();
