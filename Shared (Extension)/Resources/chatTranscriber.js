class ChatTranscriber {
    constructor(options = {}) {
        this.separator = 'NEXT_PROMPT';
        StorageManager.getBatchSeparator().then(separator => {
            this.separator = separator;
        });
        this.onAddFile = options.onAddFile || ((name, content) => {});
        this.hasCurrent = options.hasCurrent || false;
        
        this.batchChoice = new BatchChoice({
            type: 'importer',
            title: 'Transcribe from Chat',
            buttonLabel: 'Import Selected',
            showModeSelector: true,
            hasCurrent: this.hasCurrent,
            validateNewName: async (name) => {
                if (!name || !name.trim()) return false;
                const fileIndex = await StorageManager.loadFileIndex();
                return !fileIndex.includes(name);
            },
            modes: [
                { value: 'responses', label: 'Responses', default: true },
                { value: 'prompts', label: 'Prompts' },
                { value: 'both', label: 'Prompts and Responses' }
            ],
            loadItems: async () => {
                const messages = await this.getChatMessages();
                return messages.map(msg => ({
                    title: msg.question,
                    description: msg.answer
                }));
            },
            emptyMessage: 'No messages to transcribe, select another chat or start one',
            onSelect: async (selectedItems, mode, useNewItem, newName) => {
                let selectedMessages = '';
                const separator = this.separator || 'NEXT_PROMPT';
                
                if (mode === 'prompts') {
                    selectedMessages = selectedItems
                        .map((item, index) => {
                            return `${separator}\n\n${item.title}`;
                        })
                        .join('\n\n');
                } else if (mode === 'both') {
                    selectedMessages = selectedItems
                        .map(item => {
                            return `${separator}\n\n${item.title}\n\nRESPONSE\n\n${item.description}`;
                        })
                        .join('\n\n');
                } else {
                    selectedMessages = selectedItems
                        .map(item => `${item.description}\n\n`)
                        .join('');
                }
                if (selectedMessages) {
                    if (useNewItem && newName) {
                        this.onAddFile(newName, selectedMessages);
                    } else {
                        const editor = document.querySelector('.editor-content textarea');
                        if (editor) {
                            const currentContent = editor.value;
                            const cursorPosition = editor.selectionStart;
                            editor.value = currentContent.slice(0, cursorPosition) + selectedMessages + currentContent.slice(cursorPosition);
                            editor.dispatchEvent(new Event('input'));
                        }
                    }
                }
            }
        });
    }

    createDialog() {
        if (!document.body) return;
        
        // Check if there are any chat messages to transcribe
        this.getChatMessages().then(messages => {
            if (messages.length === 0) {
                alert('No chats to transcribe, pick a chat or start one');
                return;
            }
            this.batchChoice.createDialog();
        });
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
