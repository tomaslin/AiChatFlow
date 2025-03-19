class PoeProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = 'main[data-dd-privacy="mask-user-input"]';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        this.messageContainerSelector = 'div[data-complete]'; // More general message container selector
        this.userMessageSelector = '[data-testid="user-message"]';
        this.assistantMessageSelector = 'div[data-complete="true"]';
        this.textboxSelector = 'textarea.GrowingTextArea_textArea__ZWQbP';
        this.sendButtonSelector = 'button[aria-label="Send message"]';
        this.stoppedMessageSelector = '.ChatStopMessageButton_stopButton__QOW41';
        this.completionSelector = 'div[data-complete="true"]';
    }

    getType() {
        return 'poe';
    }

    getMessageContainers() {
        return document.querySelectorAll(this.messageContainerSelector);
    }

    getMaxPartSize() {
        return 30000;
    }

    slideContent(minimized) {
        const mainContent = document.querySelector(this.mainContentSelector);
        if (!mainContent) return;
        mainContent.style.marginRight = minimized ? '' : '30%';
    }

    async getPromptAndResponse(container) {
        if (!container) return null;

        const questionEl = container.querySelector(this.userMessageSelector);

        // Improved answerEl selector: Less brittle, more general
        const answerEl = container.querySelector('div > div > div div div p');

        if (questionEl && answerEl) {
            try {
                const cleanedHtml = this.markDownConverter.remove(
                    answerEl.innerHTML.trim(),
                    []
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
        const stopButton = document.querySelector(this.stoppedMessageSelector);
        return !!stopButton;
    }

    async submitPrompt(message) {
        try {
            const textbox = await this.waitForElement(this.textboxSelector);
            if (!textbox) {
                throw new Error('Could not find textbox element');
            }

            textbox.focus();
            textbox.value = message;

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
        return waitForClaudeRequestCompletion(expectedCount, initialContainerCount); // You might need Poe-specific implementation
    }

    async newChat() {
        document.location.href = 'https://poe.com'; //  Might need to adjust for Poe's new chat
    }
}