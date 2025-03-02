class StorageManager {
    static MAX_TOTAL_SIZE = 10485760;
    
    static KEYS = {
        FILE_INDEX: 'ai-chat-flow-file-index',
        TABS: 'ai-chat-flow-tabs',
        ACTIVE_FILE: 'ai-chat-flow-active-file',
        EDITOR_MINIMIZED: 'editorMinimized',
        SHOW_MORE_FILES: 'showMoreFiles',
        BATCH_SEPARATOR: 'batchSeparator',
        BATCH_RUNNER_PREFS: 'batchRunnerPrefs',
        CHAT_IMPORTER_PREFS: 'chatImporterPrefs',
        getMetaKey: (name) => `ai-chat-flow-meta-${name}`,
        getChunkKey: (name, index) => `ai-chat-flow-chunk-${name}-${index}`
    };

    // Send a message to the background script to perform a storage operation
    static async sendStorageMessage(operation, store, key, value = null) {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                const message = {
                    type: 'storage',
                    operation: operation,
                    store: store,
                    key: key
                };
                
                if (value !== null) {
                    message.value = value;
                }

                // Use Safari's native messaging system if available, fallback to browser.runtime for other browsers
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.controller) {
                    return await new Promise((resolve, reject) => {
                        // Add a unique message ID to track the response
                        const messageId = Date.now().toString() + Math.random().toString();
                        message.messageId = messageId;

                        // Set a timeout to prevent hanging
                        const timeoutId = setTimeout(() => {
                            delete window[`storage_callback_${messageId}`];
                            console.error(`Storage operation timed out: [${operation}] on [${store}/${key}]`);
                            reject(new Error(`Storage operation timed out after 5000ms: ${operation} on ${store}/${key}`));
                        }, 5000);

                        // Create a one-time message handler for this specific request
                        window[`storage_callback_${messageId}`] = (response) => {
                            clearTimeout(timeoutId);
                            delete window[`storage_callback_${messageId}`];
                            
                            if (!response || !response.success) {
                                console.error(`Storage operation failed: [${operation}] on [${store}/${key}]`, {
                                    error: response && response.error,
                                    messageId,
                                    value: value ? 'present' : 'null'
                                });
                                reject(new Error((response && response.error) || `Storage operation failed: ${operation} on ${store}/${key}`));
                            } else {
                                resolve(response.data);
                            }
                        };

                        // Send message to Safari's native handler
                        window.webkit.messageHandlers.controller.postMessage({
                            ...message,
                            callback: `storage_callback_${messageId}`
                        });
                    });
                } else {
                    // Fallback to browser.runtime for other browsers
                    const response = await browser.runtime.sendMessage(message);
                    
                    if (!response || !response.success) {
                        console.error(`Storage operation failed: [${operation}] on [${store}/${key}]`, {
                            error: response && response.error,
                            value: value ? 'present' : 'null'
                        });
                        throw new Error((response && response.error) || `Storage operation failed: ${operation} on ${store}/${key}`);
                    }
                    
                    return response.data;
                }
            } catch (error) {
                retryCount++;
                console.error(`Storage operation attempt ${retryCount} failed: [${operation}] on [${store}/${key}]`, {
                    error: error.message,
                    stack: error.stack,
                    value: value ? 'present' : 'null'
                });
                if (retryCount === maxRetries) {
                    console.error(`Storage operation failed after ${maxRetries} retries: [${operation}] on [${store}/${key}]`, {
                        error: error.message,
                        stack: error.stack,
                        value: value ? 'present' : 'null'
                    });
                    throw error;
                }
                // Wait before retrying with exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
            }
        }
    }

    static async getFromStore(storeName, key) {
        return await this.sendStorageMessage('get', storeName, key);
    }

    static async setInStore(storeName, key, value) {
        await this.sendStorageMessage('set', storeName, key, value);
    }

    static async deleteFromStore(storeName, key) {
        await this.sendStorageMessage('delete', storeName, key);
    }

    static async loadFileIndex() {
        const result = await this.getFromStore('metadata', this.KEYS.FILE_INDEX);
        return result ? JSON.parse(result) : [];
    }

    static async loadTabs() {
        const result = await this.getFromStore('preferences', this.KEYS.TABS);
        return result ? JSON.parse(result) : [];
    }

    static async loadActiveFile() {
        const result = await this.getFromStore('preferences', this.KEYS.ACTIVE_FILE);
        return result || null;
    }

    static async saveTabs(tabs) {
        await this.setInStore('preferences', this.KEYS.TABS, JSON.stringify(tabs));
    }

    static async saveActiveFile(fileName) {
        await this.setInStore('preferences', this.KEYS.ACTIVE_FILE, fileName);
    }

    static async saveFileIndex(fileNames) {
        await this.setInStore('metadata', this.KEYS.FILE_INDEX, JSON.stringify(fileNames));
    }

    static async loadFile(name) {
        try {
            const content = await this.getFromStore('files', name);
            return content !== undefined ? content : null;
        } catch (error) {
            console.error('Error loading file:', error);
            throw new Error(`Failed to load file "${name}": ${error.message}`);
        }
    }

    static async saveFile(name, content) {
        try {
            if (content.length > this.MAX_TOTAL_SIZE) {
                throw new Error('File is too large to store reliably. Please reduce the size.');
            }

            // Save file metadata
            const metaKey = this.KEYS.getMetaKey(name);
            await this.setInStore('metadata', metaKey, JSON.stringify({
                size: content.length,
                lastModified: Date.now()
            }));

            // Save content
            await this.setInStore('files', name, content);

            // Notify other windows about the file change
            if (window.syncManager) {
                window.syncManager.broadcastChange('fileContent', { fileName: name, content });
            }
        } catch (error) {
            console.error('Error saving file:', error);
            throw new Error(`Failed to save file "${name}": ${error.message}`);
        }
    }

    static async deleteFile(name) {
        try {
            // Delete metadata
            const metaKey = this.KEYS.getMetaKey(name);
            await this.deleteFromStore('metadata', metaKey);
            
            // Delete file content
            await this.deleteFromStore('files', name);
        } catch (error) {
            console.error('Error deleting file:', error);
            throw new Error(`Failed to delete file "${name}": ${error.message}`);
        }
    }

    static async clearAllFiles() {
        try {
            // Get file index
            const fileIndex = await this.loadFileIndex();
            
            // Delete all files and their metadata
            for (const fileName of fileIndex) {
                const metaKey = this.KEYS.getMetaKey(fileName);
                await this.deleteFromStore('files', fileName);
                await this.deleteFromStore('metadata', metaKey);
            }
            
            // Clear file index
            await this.saveFileIndex([]);
        } catch (error) {
            console.error('Error clearing files:', error);
            throw new Error(`Failed to clear files: ${error.message}`);
        }
    }

    static async getEditorMinimizedState() {
        const result = await this.getFromStore('preferences', this.KEYS.EDITOR_MINIMIZED);
        return result || false;
    }

    static async setEditorMinimizedState(minimized) {
        await this.setInStore('preferences', this.KEYS.EDITOR_MINIMIZED, minimized);
    }

    static async getShowMoreFilesState() {
        const result = await this.getFromStore('preferences', this.KEYS.SHOW_MORE_FILES);
        return result || false;
    }

    static async setShowMoreFilesState(showMore) {
        await this.setInStore('preferences', this.KEYS.SHOW_MORE_FILES, showMore);
    }

    static async getBatchSeparator() {
        const result = await this.getFromStore('preferences', this.KEYS.BATCH_SEPARATOR);
        return result || 'NEXT_PROMPT';
    }

    static async setBatchSeparator(separator) {
        await this.setInStore('preferences', this.KEYS.BATCH_SEPARATOR, separator);
    }

    static async getBatchRunnerPrefs() {
        const result = await this.getFromStore('preferences', this.KEYS.BATCH_RUNNER_PREFS);
        return result || {};
    }

    static async setBatchRunnerPrefs(prefs) {
        await this.setInStore('preferences', this.KEYS.BATCH_RUNNER_PREFS, prefs);
    }

    static async getChatImporterPrefs() {
        const result = await this.getFromStore('preferences', this.KEYS.CHAT_TRANSCRIBER_PREFS);
        return result || {};
    }

    static async setChatImporterPrefs(prefs) {
        await this.setInStore('preferences', this.KEYS.CHAT_TRANSCRIBER_PREFS, prefs);
    }


}