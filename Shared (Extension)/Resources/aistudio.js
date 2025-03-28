class AistudioProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = '.main-content';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;

        this.userMessageSelector = '.chat-turn-container.user';
        this.aiMessageSelector = '.chat-turn-container.model';

        this.textboxSelector = 'ms-autosize-textarea textarea';

        this.runButtonWrapperSelector = 'run-button';
        this.sendButtonReadySelector = 'run-button button[aria-label="Run"]:not([disabled]):not(.stoppable)';
        this.runningButtonSelector = 'run-button button[aria-label="Run"].stoppable svg.stoppable-spinner';

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
                return {
                    question: questionEl.textContent?.trim() ?? '',
                    answer: 'Error processing response: ' + (answerEl.textContent?.trim() ?? '')
                };
            }
        }
        return null;
    }

    async submitPrompt(message) {
        try {
            const textbox = await this.waitForElement(this.textboxSelector, 5000);
            if (!textbox) {
                throw new Error('Could not find textbox element');
            }

            textbox.value = message;
            textbox.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            textbox.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));

            const sendButton = await this.waitForElement(this.sendButtonReadySelector, 5000);

            if (!sendButton) {
                const disabledButton = document.querySelector(`${this.runButtonWrapperSelector} button[aria-label="Run"]`);
                if (disabledButton?.disabled) {
                     throw new Error(`Send button found but is disabled. Textbox content: "${textbox.value.substring(0, 50)}..."`);
                } else if (document.querySelector(this.runningButtonSelector)){
                     throw new Error('Send button seems to be already running (Stop state).');
                } else {
                     throw new Error(`Could not find send button using selector: ${this.sendButtonReadySelector}. Check UI structure.`);
                }
            }

            sendButton.click();

        } catch (error) {
            throw error;
        }
    }

    async waitForCompletion(initialContainerCount) {
        await this.waitForRequestCompletion(initialContainerCount);
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    async waitForRequestCompletion(initialContainerCount) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkInterval = 500;

            const checkCompletion = () => {
                try {
                    const isRunning = document.querySelector(this.runningButtonSelector);
                    const currentContainers = this.getMessageContainers();

                    if (!isRunning) {
                        if (currentContainers.length > initialContainerCount) {
                            resolve(true);
                            return;
                        }
                    }

                    if (Date.now() - startTime > this.maxWaitTime) {
                        const stillRunning = document.querySelector(this.runningButtonSelector);
                        reject(new Error(`Timeout: Request did not complete. Button running state: ${!!stillRunning}. Container count: ${currentContainers.length}.`));
                        return;
                    }

                    setTimeout(checkCompletion, checkInterval);

                } catch (error) {
                    reject(error);
                }
            };

            setTimeout(checkCompletion, checkInterval);
        });
    }

    async newChat() {
        document.location.href = 'https://aistudio.google.com/prompts/new_chat';
    }

}

