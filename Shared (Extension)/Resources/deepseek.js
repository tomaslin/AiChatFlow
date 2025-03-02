class DeepseekProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = '[role="main"]';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        this.responseSelector = '[data-message-container]';
        this.userMessageSelector = '[data-user-message]';
        this.assistantMessageSelector = '[data-assistant-message]';
        this.textareaSelector = '[role="textbox"]';
        this.sendButtonSelector = '[data-send-message]';
        this.thinkingAnimationSelector = '[data-thinking-indicator]';
    }

    getType() {
        return 'deepseek';
    }

    getMessageContainers() {
        return document.querySelectorAll(this.responseSelector);
    }

    getMaxPartSize() {
        return 30000;
    }

    slideContent(minimized) {
        setTimeout(() => {
            const mainContent = document.querySelector(this.mainContentSelector);
            if (!mainContent) return;
            mainContent.style.marginRight = minimized ? '' : '52%';
            mainContent.style.transition = 'margin-right 0.3s ease';
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
                    ['[data-hidden]', this.thinkingAnimationSelector, '[data-error]']
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
            const thinkingAnimation = lastContainer.querySelector(this.thinkingAnimationSelector);
            const errorMessage = lastContainer.querySelector('[data-error]');
            
            return !thinkingAnimation || !!errorMessage;
        } catch (error) {
            console.error('Error detecting stopped state:', error);
            return false;
        }
    }

    async fillTextbox(message) {
        try {
            const textbox = await this.waitForElement(this.textareaSelector);
            if (!textbox) {
                throw new Error('Could not find textbox element');
            }
            
            textbox.value = message;
            textbox.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true
            }));

            const sendButton = await this.waitForElement(this.sendButtonSelector);
            if (!sendButton) {
                throw new Error('Could not find send button');
            }
            
            if (sendButton.disabled) {
                throw new Error('Send button is disabled');
            }
            
            sendButton.click();
        } catch (error) {
            console.error('Error filling textbox:', error);
            throw error;
        }
    }



    async waitForCompletion(initialContainerCount) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const intervalId = setInterval(() => {
                try {
                    const containers = this.getMessageContainers();
                    const currentCount = containers.length;
                    
                    if (currentCount > initialContainerCount) {
                        const lastContainer = containers[containers.length - 1];
                        const thinkingAnimation = lastContainer.querySelector(this.thinkingAnimationSelector);
                        const errorMessage = lastContainer.querySelector('[data-error]');
                        
                        if (!thinkingAnimation || errorMessage) {
                            clearInterval(intervalId);
                            resolve(true);
                            return;
                        }
                    }
                    
                    if (Date.now() - startTime > this.maxWaitTime) {
                        console.warn('Timed out waiting for request completion');
                        clearInterval(intervalId);
                        resolve(false);
                    }
                } catch (error) {
                    console.error('Error in waitForCompletion:', error);
                    clearInterval(intervalId);
                    resolve(false);
                }
            }, 1000);
        });
    }

    async retrieveResponse() {
        try {
            const containers = this.getMessageContainers();
            if (containers.length === 0) {
                return null;
            }
            
            const lastContainer = containers[containers.length - 1];
            return await this.getPromptAndResponse(lastContainer);
        } catch (error) {
            console.error('Error retrieving response:', error);
            return null;
        }
    }
}