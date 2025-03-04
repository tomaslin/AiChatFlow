class GeminiProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = 'bard-sidenav-content';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        this.messageContainerSelector = '.conversation-container';
        this.userMessageSelector = '.user-query-container';
        this.assistantMessageSelector = '.response-container-content';
        this.textboxSelector = 'rich-textarea .ql-editor[role="textbox"]';
        this.sendButtonSelector = 'button.send-button';
        this.stoppedMessageSelector = '.stopped-draft-message';
        this.completionSelector = 'div.avatar_primary_animation.is-gpi-avatar[data-test-lottie-animation-status="completed"]';
    }

    getType() {
        return 'gemini';
    }

    getMessageContainers() {
        return document.querySelectorAll(this.messageContainerSelector);
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
        
        const questionEl = container.querySelector(this.userMessageSelector);
        const answerEl = container.querySelector(this.assistantMessageSelector);
        
        if (questionEl && answerEl) {
            try {
                const cleanedHtml = this.markDownConverter.remove(
                    answerEl.innerHTML.trim(), 
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
        return null;
    }

    async detectStopped() {
        try {
            const containers = this.getMessageContainers();
            if (containers.length === 0) {
                return false;
            }
            
            const lastContainer = containers[containers.length - 1];
            const stoppedElement = lastContainer.querySelector(this.stoppedMessageSelector);
            
            return !!stoppedElement;
        } catch (error) {
            console.error('Error detecting stopped state:', error);
            return false;
        }
    }

    async fillTextbox(message) {
        try {
            const textbox = await this.waitForElement(this.textboxSelector);
            if (!textbox) {
                throw new Error('Could not find textbox element');
            }
            
            // Set content and dispatch input event
            textbox.innerHTML = message;
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
            const intervalId = setInterval(() => {
                try {
                    const currentCount = this.countCompletedRequests();
                    const containers = this.getMessageContainers();
                    
                    if (currentCount >= expectedCount && containers.length > initialContainerCount) {
                        clearInterval(intervalId);
                        resolve(true);
                        return;
                    }
                    
                    if (Date.now() - startTime > this.maxWaitTime) {
                        console.warn('Timed out waiting for request completion');
                        clearInterval(intervalId);
                        resolve(false);
                    }
                } catch (error) {
                    console.error('Error in waitForRequestCompletion:', error);
                    clearInterval(intervalId);
                    resolve(false);
                }
            }, 1000);
        });
    }

    async newChat() {
        document.location = 'https://gemini.google.com';
    }
}
