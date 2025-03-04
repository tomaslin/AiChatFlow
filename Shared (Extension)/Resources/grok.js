class GrokProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = 'main';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        this.messageContainerSelector = '[class*="message-row"][class*="items-start"]';
        this.userMessageSelector = '[class*="message-row"][class*="items-end"] [class*="message-bubble"] [class*="whitespace"]';
        this.assistantMessageSelector = '[class*="prose"] p, [class*="prose"] li';
        this.textboxSelector = 'textarea[class*="w-full"]';
        this.sendButtonSelector = 'button[type="submit"], button[aria-label*="send" i], button[title*="send" i]';
        this.stoppedSelector = '[class*="secondary"] svg[class*="octagon"]';
    }

    getType() {
        return 'grok';
    }

    getMessageContainers() {
        return document.querySelectorAll(this.messageContainerSelector);
    }

    getMaxPartSize() {
        return 30000;
    }

    slideContent(minimized) {
        setTimeout(() => {
            const mainContent = document.querySelector('main');
            if (!mainContent) return;
            mainContent.style.marginRight = minimized ? '' : '50%';
            mainContent.style.transition = 'margin-right 0.3s ease';
        }, 500);
    }

    async getPromptAndResponse(container) {
        try {
            const allContainers = Array.from(document.querySelectorAll('.message-row'));
            const currentIndex = allContainers.indexOf(container);

            let questionText = "Unable to retrieve question";
            if (currentIndex > 0) {
                const questionContainer = allContainers[currentIndex - 1];
                const questionElement = questionContainer.querySelector(this.userMessageSelector);
                if (questionElement) {
                    questionText = questionElement.textContent.trim();
                }
            }

            const responseHTML = container.innerHTML;
            const cleanedHtml = this.markDownConverter.remove(responseHTML, ['.hidden', '[aria-hidden="true"]']);

            return {
                question: questionText,
                answer: this.markDownConverter.convert(cleanedHtml)
            };
        } catch (error) {
            console.error('Error processing prompt and response:', error);
            return {
                question: "Error retrieving question",
                answer: "Error processing response"
            };
        }
    }

    async fillTextbox(message) {
        try {
            const textarea = await this.waitForElement(this.textareaSelector);
            if (!textarea) {
                throw new Error('Could not find textarea element');
            }

            this.simulateTyping(document.querySelector(this.textareaSelector), message);

            const sendButton = await this.waitForElement(this.sendButtonSelector);
            if (!sendButton) {
                throw new Error('Could not find send button');
            }

            sendButton.click();

            return true;
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
                        const stoppedElement = lastContainer.querySelector(this.stoppedSelector);
                        
                        if (stoppedElement) {
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

    async waitForRequestCompletion(expectedCount) {
        return await this.waitForCompletion();
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

    async detectStopped() {
        try {
            const stoppedElement = document.querySelector(this.stoppedSelector);
            return !!stoppedElement;
        } catch (error) {
            console.error('Error detecting stopped state:', error);
            return false;
        }
    }
}
