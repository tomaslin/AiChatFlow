class PromptPlayer {
    constructor() {
        this.separator = 'NEXT_PROMPT';
        StorageManager.getBatchSeparator().then(separator => {
            this.separator = separator;
        });
        this.batchChoice = new BatchChoice({
            type: 'player',
            title: 'Run prompts',
            buttonText: 'Run Selected',
            existingDescriptor: 'chat',
            hasCurrent: () => true,
            validateNewName: async (name) => {
                return name && name.trim().length > 0;
            },
            loadItems: async () => {
                return this.parseContent(this.content);
            },
            onSelect: (selectedItems, mode, useNewItem, newName) => {
                if (selectedItems.length > 0 && aiProvider) {
                    const messages = selectedItems.map(item => item.description);
                    aiProvider.sendBatch(messages, useNewItem, newName);
                }
            }
        });
    }

    createDialog(fileName = null, content = '') {
        this.content = content;
        this.batchChoice.createDialog();
    }

    parseContent(content) {
        if (!content) return [];
        
        const separator = this.separator;
        const lines = content.split('\n');
        const items = [];
        let currentItem = {
            title: '',
            description: ''
        };
        let currentContent = [];

        // Find the index of the first separator
        const firstSeparatorIndex = lines.findIndex(line => line.includes(separator));

        // Handle content before first separator
        if (firstSeparatorIndex === -1) {
            // No separator found, treat all content as one prompt
            const description = lines.join('\n').trim();
            if (description) {
                items.push({
                    title: '',
                    description
                });
            }
            return items;
        } else if (firstSeparatorIndex > 0) {
            // Add all content before first separator as one prompt
            const description = lines.slice(0, firstSeparatorIndex).join('\n').trim();
            if (description) {
                items.push({
                    title: '',
                    description
                });
            }
        }

        // Process the rest of the content
        for (let i = firstSeparatorIndex; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(separator)) {
                // Save previous item if it has content
                if (currentContent.length > 0) {
                    currentItem.description = currentContent.join('\n');
                    items.push({ ...currentItem });
                    currentContent = [];
                }

                // Parse new separator line
                const parts = line.split(separator);
                currentItem = {
                    title: parts[1] ? parts[1].trim() : '',
                    description: ''
                };
            } else {
                currentContent.push(line);
            }
        }

        // Add the last item
        if (currentContent.length > 0) {
            const description = currentContent.join('\n').trim();
            if (description) {
                currentItem.description = description;
                items.push(currentItem);
            }
        }

        return items;
    }
}