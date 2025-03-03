class FileManager {
    constructor() {
        this.fileActions = new FileActions();
        this.fileActionUI = new FileActionUI(this);
        
        document.addEventListener('aichatflow:createtab', (event) => {
            if (event.detail && event.detail.fileName) {
                this.createTab(event.detail.fileName);
            }
        });

        window.addEventListener('focus', () => {
            this.refreshFromStorage();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.refreshFromStorage();
            }
        });
        
        this.loadFromStorage();
    }

    async loadFromStorage() {
        await this.refreshFromStorage();
    }

    async refreshFromStorage() {
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
            <span class="close-btn">×</span>`;
        
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
            this.updateFileList();
        }
        return success;
    }

    async setActiveFile(name) {
        this.fileActions.setActiveFile(name);
        const content = this.fileActions.getFileContent(name);
        const editorContent = document.querySelector('.editor-content');
        const tabList = document.querySelector('.tab-list');
        const hasOpenTabs = tabList && tabList.children.length > 0;

        if (!hasOpenTabs || !name) {
            editorContent.innerHTML = `
                <div class="welcome-message">
                    <h2>No file selected.</h2>
                    <p>Please create a new one by clicking on the '+'.</p>
                    <p>You can also import a new file or select an existing one in the list. </p>
                </div>`;
            await setShowFilesState(true);
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
        
        if (name && hasOpenTabs) {
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
            `;
            
            toolbar.appendChild(fileActions);
            toolbar.appendChild(textStats);
            editorContent.appendChild(toolbar);
            editorContent.appendChild(textarea);
            
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