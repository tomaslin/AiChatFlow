class ChatImporter {
    constructor() {
        this.separator = 'NEW_PROMPT';
        StorageManager.getBatchSeparator().then(separator => {
            this.separator = separator;
        });
        
        this.batchChoice = new BatchChoice({
            type: 'importer',
            title: 'Transcribe From Chat',
            buttonText: 'Import Selected',
            showModeSelector: true,
            modes: [
                { value: 'responses', label: 'Responses only', default: true },
                { value: 'prompts', label: 'Prompts only' },
                { value: 'both', label: 'Prompts and Responses' }
            ],
            loadItems: async () => {
                const messages = await this.getChatMessages();
                return messages.map(msg => ({
                    title: msg.question,
                    description: msg.answer
                }));
            },
            onSelect: (selectedItems, mode) => {
                let selectedMessages = '';
                
                if (mode === 'prompts') {
                    // Prompts only mode - format for batch runner
                    selectedMessages = selectedItems
                        .map((item, index) => {
                            return `${this.separator}\n
${item.title}`;
                        })
                        .join('\n\n');
                } else if (mode === 'both') {
                    // Prompts and responses mode
                    selectedMessages = selectedItems
                        .map(item => {
                            return `${this.separator}\n
${item.title}\n\nRESPONSE\n\n${item.description}`;
                        })
                        .join('\n\n');
                } else {
                    // Default: Responses only (current implementation)
                    selectedMessages = selectedItems
                        .map(item => `${item.description}\n\n`)
                        .join('');
                }
                if (selectedMessages) {
                    const editor = document.querySelector('.editor-content textarea');
                    if (editor) {
                        const currentContent = editor.value;
                        const cursorPosition = editor.selectionStart;
                        editor.value = currentContent.slice(0, cursorPosition) + selectedMessages + currentContent.slice(cursorPosition);
                        editor.dispatchEvent(new Event('input'));
                    }
                }
            }
        });
    }

    createDialog() {
        this.batchChoice.createDialog();
    }

    async getChatMessages() {
        try {
            if (aiProvider) {
                const history = await aiProvider.getChatMessages();
                return history.map(item => ({
                    question: item.question || '',
                    answer: item.answer || ''
                }));
            }
            return [];
        } catch (error) {
            console.error('Error getting chat messages:', error);
            return [];
        }
    }
}
