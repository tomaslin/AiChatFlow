class FileManager {
    constructor() {
        this.fileActions = new FileActions();
        this.fileActionUI = new FileActionUI(this);
        
        document.addEventListener('aichatflow:createtab', (event) => {
            if (event.detail && event.detail.fileName) {
                this.createTab(event.detail.fileName);
            }
        });
        
        this.loadFromStorage();
    }

    async loadFromStorage() {
        await this.fileActions.loadFromStorage();
        this.updateFileList();
        
        if (this.fileActions.activeFile) {
            this.setActiveFile(this.fileActions.activeFile);
        }
    }
    
    updateFileList() {
        const fileList = document.querySelector('.file-list');
        if (!fileList) return;
        
        fileList.innerHTML = '';
        
        const fileElements = [];
        this.fileActions.files.forEach((content, name) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            if (name === this.fileActions.activeFile) {
                fileItem.classList.add('active');
            }
            
            const fileNameSpan = document.createElement('span');
            fileNameSpan.className = 'file-name';
            fileNameSpan.textContent = name;
            fileItem.appendChild(fileNameSpan);
            
            const actionsContainer = this.fileActionUI.createFileItemActions(name);
            fileItem.appendChild(actionsContainer);
            
            fileElements.push({ fileItem, name });
        });

        const existingFileItems = fileList.querySelectorAll('.file-item');
        existingFileItems.forEach(item => item.classList.remove('active'));

        fileElements.forEach(({ fileItem }) => {
            fileList.appendChild(fileItem);
        });

        fileElements.forEach(({ fileItem, name }) => {
            const fileName = fileItem.querySelector('.file-name');
            if (fileName) {
                fileName.addEventListener('click', () => {
                    const existingTab = Array.from(document.querySelectorAll('.tab')).find(tab => 
                        tab.querySelector('.tab-name').textContent === name
                    );
                    if (!existingTab) {
                        this.createTab(name);
                    }
                    this.setActiveFile(name);
                });
            }
        });
    }
    
    downloadAllFiles() {
        this.fileActions.downloadAllFiles();
    }

    addFile(name, content = '') {
        const success = this.fileActions.addFile(name, content);
        if (success) {
            this.updateFileList();
            this.createTab(name);
            this.setActiveFile(name);
            if (window.syncManager) {
                window.syncManager.broadcastChange('fileOperation', { operation: 'create', fileName: name, content });
            }
        }
        return success;
    }

    saveToStorage() {
        this.fileActions.saveToStorage();
    }

    createTab(name) {
        const tabList = document.querySelector('.tab-list');
        
        const existingTab = Array.from(document.querySelectorAll('.tab')).find(tab => 
            tab.querySelector('.tab-name').textContent === name
        );
        if (existingTab) return existingTab;
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        if (name === this.fileActions.activeFile) tab.classList.add('active');
        
        tab.innerHTML = `
            <span class="tab-name">${name}</span>
            ${!isIPhone ? '<span class="close-btn">×</span>' : ''}
        `;
        
        tabList.appendChild(tab);
        
        const closeBtn = tab.querySelector('.close-btn');
        
        const handleTabClick = (e) => {
            if (e.target === closeBtn) {
                e.stopPropagation();
                tab.removeEventListener('click', handleTabClick);
                tab.remove();
                
                if (this.fileActions.activeFile === name) {
                    const remainingTabs = Array.from(document.querySelectorAll('.tab'));
                    if (remainingTabs.length > 0) {
                        const nextTab = remainingTabs[0];
                        const nextFileName = nextTab.querySelector('.tab-name').textContent;
                        this.setActiveFile(nextFileName);
                    } else {
                        this.setActiveFile(null);
                    }
                } else {
                    this.saveToStorage();
                }
            } else if (e.target !== closeBtn) {
                this.setActiveFile(name);
            }
        };

        tab.addEventListener('click', handleTabClick);
        return tab;
    }

    updateFile(name, content) {
        this.fileActions.files.set(name, content);
        this.saveToStorage();
        if (window.syncManager) {
            window.syncManager.broadcastChange('fileContent', { fileName: name, content });
        }
    }

    async renameFile(oldName, newName) {
        const success = this.fileActions.renameFile(oldName, newName);
        if (success) {
            const existingTab = Array.from(document.querySelectorAll('.tab')).find(tab => 
                tab.querySelector('.tab-name').textContent === oldName
            );
            if (existingTab) {
                existingTab.querySelector('.tab-name').textContent = newName;
            }
            if (window.syncManager) {
                await window.syncManager.broadcastChange('fileOperation', { 
                    operation: 'rename', 
                    fileName: oldName, 
                    newFileName: newName 
                });
            }
            this.updateFileList();
        }
        return success;
    }

    transcribeChat() {
        const chatTranscriber = new ChatTranscriber();
        chatTranscriber.createDialogWithFileOptions(this);
    }

    async setActiveFile(name) {
        this.fileActions.setActiveFile(name);
        const content = this.fileActions.getFileContent(name);
        if (window.syncManager) {
            window.syncManager.broadcastChange('tabSelection', { fileName: name });
        }
        const editorContent = document.querySelector('.editor-content');
        const tabList = document.querySelector('.tab-list');
        const hasOpenTabs = tabList && tabList.children.length > 0;

        if (this.fileActions.files.size === 0 || (!name && !hasOpenTabs)) {
            await setShowMoreFilesState(true);
            const fileListContainer = document.querySelector('.file-list-container');
            if (fileListContainer) {
                fileListContainer.style.display = '';
                const toggleFilesBtn = document.querySelector('.toggle-files-btn');
                if (toggleFilesBtn) {
                    const icons = {
                        "caret_up": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M8 12l-6-6h12z\"/></svg>"
                    };
                    toggleFilesBtn.innerHTML = icons.caret_up;
                }
            }
        }
        
        document.querySelectorAll('.file-item').forEach(item => {
            const fileName = item.querySelector('.file-name').textContent;
            item.classList.toggle('active', fileName === name);
        });
        
        if (this.fileActions.files.size === 0 || (!name && !hasOpenTabs)) {
            editorContent.innerHTML = `
                <div class="welcome-message">
                    <h2>No file selected.</h2>
                    <p>Please create a new one by clicking on the '+'.</p>
                    <p>You can also import a new file or select an existing one in the list. </p>
                </div>`;
        } else {
            if (name) {
                const existingTab = Array.from(document.querySelectorAll('.tab')).find(tab => 
                    tab.querySelector('.tab-name').textContent === name
                );
                if (!existingTab && this.fileActions.files.has(name)) {
                    this.createTab(name);
                }
            }
            
            const tabList = document.querySelector('.tab-list');
            if (tabList) {
                document.querySelectorAll('.tab').forEach(tab => {
                    const tabName = tab.querySelector('.tab-name').textContent;
                    tab.classList.toggle('active', tabName === name);
                });
            }

            const textarea = document.createElement('textarea');
            textarea.value = content || '';

            editorContent.innerHTML = '';
            
            const toolbar = document.createElement('div');
            toolbar.className = 'toolbar';
            
            const fileActions = this.fileActionUI.createEditorToolbarActions(name);

            const textStats = document.createElement('div');
            textStats.className = 'text-stats';
            textStats.innerHTML = `
                <span class="word-count">Words: 0</span>
                ${isIPhone ? '<button class="toolbar-button close-btn"><svg class="close-icon" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg></button>' : ''}
            `;
            
            toolbar.appendChild(fileActions);
            toolbar.appendChild(textStats);
            editorContent.appendChild(toolbar);
            editorContent.appendChild(textarea);
            
            if (isIPhone) {
                const closeBtn = textStats.querySelector('.close-btn');
                closeBtn.addEventListener('click', () => {
                    const activeTab = document.querySelector('.tab.active');
                    if (activeTab) {
                        activeTab.remove();
                        const remainingTabs = Array.from(document.querySelectorAll('.tab'));
                        if (remainingTabs.length > 0) {
                            const nextTab = remainingTabs[0];
                            const nextFileName = nextTab.querySelector('.tab-name').textContent;
                            this.setActiveFile(nextFileName);
                        } else {
                            this.setActiveFile(null);
                        }
                    }
                });
            }
            
            const updateTextStats = () => {
                const text = textarea.value;
                const words = text.trim() ? text.trim().split(/\s+/).length : 0;
                textStats.querySelector('span').textContent = `Words: ${words}`;
            };
            
            textarea.addEventListener('input', () => {
                this.updateFile(name, textarea.value);
                updateTextStats();
            });
            
            updateTextStats();
        
            this.saveToStorage();
        }
    }
}