class AistudioProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = '.main-content';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        
        // User message selectors - updated to better target the nested span structure
        this.userMessageSelector = '.chat-turn-container.user';
        this.aiMessageSelector = '.chat-turn-container.model';
        
        // Other UI selectors
        this.textboxSelector = '.prompt-textarea, textarea[class*="w-full"]';
        this.sendButtonSelector = 'button[aria-label="Send message"], button[type="submit"]';
        this.completionSelector = '.response-complete-indicator';
    }

    getType() {
        return 'aistudio';
    }

    getMessageContainers() {
        return document.querySelectorAll(this.userMessageSelector);
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

    async getChatMessages() {
        const messages = [];
        const questionEls = document.querySelectorAll(this.userMessageSelector);
        const answerEls = document.querySelectorAll(this.aiMessageSelector);    
        const count = Math.min(questionEls.length, answerEls.length);
        for (let i = 0; i < count; i++) {
            const message = await this.parsePromptAndResponse(questionEls[i], answerEls[i]);
            if (message) {
                messages.push(message);
            }
        }
        return messages;
    }

    async parsePromptAndResponse(questionEl, answerEl) {
        if (questionEl && answerEl) {
            try {
                return {
                    question: this.markDownConverter.convert(
                        this.markDownConverter.remove(
                            questionEl.innerHTML.trim(),
                            ['mat-icon']
                    )),
                    answer: this.markDownConverter.convert(this.markDownConverter.remove(
                        answerEl.innerHTML.trim(),
                        ['mat-icon']
                    ))
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

    async submitPrompt(message) {
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
            
            const checkCompletion = () => {
                try {
                    const currentCount = this.countCompletedRequests();
                    const containers = this.getMessageContainers();
                    
                    if (currentCount >= expectedCount && containers.length > initialContainerCount) {
                        resolve(true);
                        return;
                    }
                    
                    if (Date.now() - startTime > this.maxWaitTime) {
                        console.warn('Timed out waiting for request completion');
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
        document.location = 'https://aistudio.google.com/prompts/new_chat';
    }
}