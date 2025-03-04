class BaseAIProvider {
    constructor() {}

    getType() {
        return 'base';
    }

    async getChatMessages() {
        const messages = [];
        const messageContainers = this.getMessageContainers();
        for (const container of messageContainers) {
            const message = await this.getPromptAndResponse(container);
            if (message) {
                messages.push(message);
            }
        }
        return messages;
    }

    async sendMessage(message, retrieveResponse = false) {
        const initialContainerCount = this.getMessageContainers().length;
        await this.fillTextbox(message);
        await this.waitForCompletion(initialContainerCount);
        
        if (retrieveResponse) {
            return await this.retrieveResponse();
        }
        return null;
    }

    async sendFile(content, name) {
        const maxChars = this.getMaxPartSize();
        let parts = [];
        let currentPart = "";
        let partNumber = 1;
        let totalParts = 0;
        let messages = [];
        
        const paragraphs = content.split('\n');
        paragraphs.forEach(paragraph => {
            const formattedParagraph = `<p>${paragraph}</p>`;
            if (currentPart.length + formattedParagraph.length <= maxChars) {
                currentPart += formattedParagraph;
            } else {
                parts.push({
                    partNumber: partNumber,
                    content: currentPart
                });
                partNumber++;
                currentPart = formattedParagraph;
            }
        });
        
        if (currentPart) {
            parts.push({
                partNumber: partNumber,
                content: currentPart
            });
        }
        
        totalParts = parts.length;
        
        if (totalParts > 1) {
            parts.forEach(part => {
                messages.push(`<p>BEGIN PART ${part.partNumber} of ${totalParts} FILE: (${name})</p>${part.content}<p>END PART ${part.partNumber}</p><p>Acknowledge receipt of Part ${part.partNumber}.</p>`);
            });
        } else {
            messages.push(`<p>BEGIN FILE: ${name}</p>${parts[0]?.content || `<p></p>`}<p>END FILE</p><p>Acknowledge receipt of file only.</p>`);
        }
        
        await this.sendBatch(messages);
    }

    async sendBatch(messages) {
        for (const message of messages) {
            await this.sendMessage(message);
            if (await this.detectStopped()) {
                break;
            }
        }
    }

    async sendBatchToNewChat(messages) {
        await StorageManager.setChatBatch({
            provider: this.getType(),
            messages: messages
        });
        await this.newChat();
    }

    async newChat() {
        throw new Error('Method not implemented');
    }

    async runChatBatchIfNeeded(){
        const batch = await StorageManager.getChatBatch();
        if(batch && batch.provider === this.getType()){
            await StorageManager.clearChatBatch();
            await this.sendBatch(batch.messages);
        }
    }

    async waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }
            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    async waitForCompletion(initialContainerCount) {
        throw new Error('Method not implemented');
    }

    getMessageContainers() {
        throw new Error('Method not implemented');
    }

    getMaxPartSize() {
        throw new Error('Method not implemented');
    }
    
    async fillTextbox(message) {
        throw new Error('Method not implemented');
    }

    countCompletedRequests() {
        throw new Error('Method not implemented');
    }
    
    async retrieveResponse() {
        throw new Error('Method not implemented');
    }

    async getPromptAndResponse(container) {
        throw new Error('Method not implemented');
    }
    
    async detectStopped() {
        throw new Error('Method not implemented');
    }
}
