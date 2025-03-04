class CopilotProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = '[data-content="conversation"]';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        this.userMessageSelector = '[data-content="user-message"]';
        this.aiMessageSelector = '[data-content="ai-message"]';
        this.textboxSelector = '#userInput';
        this.sendButtonSelector = 'button[data-testid="submit-button"]';
        this.willChangeSelector = '[style*="will-change"]';
    }

    getType() {
        return 'copilot';
    }

    getMessageContainers() {
        return document.querySelectorAll(this.messageContainerSelector);
    }

    getMaxPartSize() {
        return 10000;
    }

    slideContent(minimized) {
        setTimeout(() => {
            const mainContent = document.querySelector(this.mainContentSelector);
            mainContent.style.marginRight = minimized ? '' : '50%';
            const textArea = document.querySelector(this.textboxSelector);
            textArea.style.marginRight = minimized ? '' : '50%';
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
                const cleanedHtml = this.markDownConverter.remove(
                    answerEl.innerHTML.trim(),
                    ['.sr-only']
                );
                return {
                    question: this.markDownConverter.convert(questionEl.textContent.trim()),
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
        return false;
    }

    async fillTextbox(message) {
        try {
            const textbox = await this.waitForElement(this.textboxSelector);
            if (!textbox) {
                throw new Error('Could not find textbox element');
            }

            textbox.value = message;
            textbox.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));

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

    async waitForCompletion(initialContainerCount) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const intervalId = setInterval(() => {
                try {
                    const aiMessages = document.querySelectorAll(this.aiMessageSelector);
                    const currentCount = aiMessages.length;
                    if (currentCount > initialContainerCount) {
                        const elements = document.querySelectorAll(this.aiMessageSelector);
                        const aiMessage = elements[elements.length - 1];
                        const willChangeElements = aiMessage.querySelectorAll(this.willChangeSelector);
                        if (willChangeElements.length === 0) {
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

    async newChat() {
        document.location = 'https://copilot.microsoft.com';
    }
}

