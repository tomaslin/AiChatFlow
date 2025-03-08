class ClaudeProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = '[data-testid="menu-sidebar"]';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        this.messageContainerSelector = '[data-is-streaming="false"]';
        this.userMessageSelector = '[data-testid="user-message"]';
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
        const answerEl = container.querySelector(`${this.messageContainerSelector} > div > div > div > div`);

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