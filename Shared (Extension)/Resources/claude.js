class ClaudeProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = '[data-testid="menu-sidebar"]';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        this.messageContainerSelector = '[data-testid="user-message"]';
        this.userMessageSelector = '[data-testid="user-message"]';
        this.responseSelector = '.font-claude-message';
        this.assistantMessageSelector = this.messageContainerSelector;
        this.textboxSelector = '.ProseMirror[contenteditable="true"]';
        this.sendButtonSelector = '[aria-label="Send Message"]';
        this.completionSelector = this.messageContainerSelector;
    }

    getType() {
        return 'claude';
    }

    getMessageContainers() {
        const containers = [];
        const allContainers = document.querySelectorAll('[data-test-render-count]');
        
        for (const container of allContainers) {
            const userMessage = container.querySelector(this.userMessageSelector);
            if (userMessage) {
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
            if (mainContent) {
                mainContent.style.marginRight = minimized ? '' : '52%';
            }
        }, 500);
    }
    
    async getPromptAndResponse(container) {
        if (!container) return null;
    
        const questionEl = container.querySelector(this.userMessageSelector);
        if (!questionEl) return null;
        
        const nextMessageGroup = container.nextElementSibling;
        if (!nextMessageGroup) return null;
        
        const answerEl = nextMessageGroup.querySelector(this.responseSelector);
        if (!answerEl) return null;
        
        try {
            const contentContainer = answerEl.querySelector('.grid-cols-1.grid');
            const htmlContent = contentContainer ? contentContainer.innerHTML.trim() : answerEl.innerHTML.trim();
            const cleanedHtml = this.markDownConverter.remove(
                htmlContent,
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

    async submitPrompt(message) {
        try {
            const textbox = await this.waitForElement(this.textboxSelector);
            if (!textbox) throw new Error('Could not find textbox element');

            textbox.focus();
            textbox.textContent = message;

            textbox.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true
            }));


            const sendButton = await this.waitForElement(this.sendButtonSelector);
            if (!sendButton) {
                throw new Error('Could not find send button');
            }
            sendButton.click();

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
        return new Promise((resolve) => {
            const startTime = Date.now();
            const maxWaitTime = 120000;
            
            const checkCompletion = () => {
                try {
                    const containers = document.querySelectorAll('[data-test-render-count]');
                    const responseContainers = document.querySelectorAll('div[data-is-streaming]');
                    const lastResponseContainer = responseContainers.length > 0 ? 
                        responseContainers[responseContainers.length - 1] : null;
                    
                    const isStreamingComplete = lastResponseContainer && 
                        lastResponseContainer.getAttribute('data-is-streaming') === 'false';
                    
                    if (isStreamingComplete && containers.length > initialContainerCount) {
                        resolve(true);
                        return;
                    }
                    
                    if (Date.now() - startTime > maxWaitTime) {
                        console.warn('Timed out waiting for Claude response');
                        resolve(false);
                        return;
                    }

                    setTimeout(checkCompletion, 1000);
                } catch (error) {
                    console.error('Error in waitForRequestCompletion:', error);
                    resolve(false);
                }
            };

            checkCompletion();
        });
    }

    async newChat() {
        document.location.href = 'https://claude.ai/chat/new';
    }
}
