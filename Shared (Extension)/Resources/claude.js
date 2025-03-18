class ClaudeProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = '[data-testid="menu-sidebar"]';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        this.messageContainerSelector = '[data-testid="user-message"]';
        this.userMessageSelector = '[data-testid="user-message"]';
        this.responseSelector = '.font-claude-message';
        this.assistantMessageSelector = this.messageContainerSelector; // Use the same selector for assistant messages
        this.textboxSelector = '.ProseMirror[contenteditable="true"]';
        this.sendButtonSelector = '[aria-label="Send Message"]';
        this.stoppedMessageSelector = null;
        this.completionSelector = this.messageContainerSelector; // Use the same selector for completion
    }

    getType() {
        return 'claude';
    }

    getMessageContainers() {
        // Find all elements with data-test-render-count attribute that contain user messages
        // This ensures we only get containers that have actual user messages
        const containers = [];
        const allContainers = document.querySelectorAll('[data-test-render-count]');
        
        for (const container of allContainers) {
            // Only include containers that have a user message
            const userMessage = container.querySelector(this.userMessageSelector);
            if (userMessage) {
                // Check if this container has a next sibling that might contain a response
                const nextContainer = container.nextElementSibling;
                if (nextContainer && nextContainer.querySelector(this.responseSelector)) {
                    containers.push(container);
                }
            }
        }
        
        return containers;
    }

    getMaxPartSize() {
        return 30000;
    }

    slideContent(minimized) {
        setTimeout(() => {
            const mainContent = document.querySelector(this.mainContentSelector);
            if (!mainContent) return;
            mainContent.style.marginRight = minimized ? '' : '52%';
        }, 500);
    }
    
    async getPromptAndResponse(container) {
        if (!container) return null;
    
        // Get the user message element
        const questionEl = container.querySelector(this.userMessageSelector);
        if (!questionEl) return null;
        
        // We already verified in getMessageContainers that this container has a user message
        // and the next container has a response, so we can proceed with confidence
        
        // Get the next container which should have the Claude response
        const nextMessageGroup = container.nextElementSibling;
        if (!nextMessageGroup) return null;
        
        // Find the Claude response element within the next message group
        const answerEl = nextMessageGroup.querySelector(this.responseSelector);
        if (!answerEl) return null;
        
        try {
            // Extract the content from the Claude response
            // Look for the actual content within the font-claude-message container
            const contentContainer = answerEl.querySelector('.grid-cols-1.grid');
            if (!contentContainer) {
                // Try an alternative approach if the grid-cols-1.grid is not found
                // Just use the answerEl content directly
                const cleanedHtml = this.markDownConverter.remove(
                    answerEl.innerHTML.trim(),
                    ['model-thoughts', '.experimental-mode-disclaimer-container', '.stopped-draft-message']
                );
                
                return {
                    question: questionEl.textContent.trim(),
                    answer: this.markDownConverter.convert(cleanedHtml)
                };
            }
            
            const cleanedHtml = this.markDownConverter.remove(
                contentContainer.innerHTML.trim(),
                ['model-thoughts', '.experimental-mode-disclaimer-container', '.stopped-draft-message']
            );
            
            return {
                question: questionEl.textContent.trim(),
                answer: this.markDownConverter.convert(cleanedHtml)
            };
        } catch (error) {
            console.error('Error processing prompt and response:', error);
            return {
                question: questionEl.textContent.trim(),
                answer: 'Error processing response'
            };
        }
    }

    async detectStopped() {
        return false;
    }

    async fillTextbox(message) {
        try {
            const textbox = await this.waitForElement(this.textboxSelector);
            if (!textbox) {
                throw new Error('Could not find textbox element');
            }

            textbox.focus();
            textbox.textContent = message;

            textbox.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true
            }));

        } catch (error) {
            console.error('Error filling textbox:', error);
            throw error;
        }
    }

    countCompletedRequests() {
        return document.querySelectorAll(this.completionSelector).length;
    }

    async waitForCompletion(initialContainerCount) {
        const expectedCount = this.countCompletedRequests() + 1;
        await this.waitForRequestCompletion(expectedCount, initialContainerCount);
    }

    async waitForRequestCompletion(expectedCount, initialContainerCount) {
        return waitForClaudeRequestCompletion(expectedCount, initialContainerCount);
    }

    async newChat() {
        document.location.href = 'https://claude.ai/chat/new'; // Updated URL for new chat
    }
}
