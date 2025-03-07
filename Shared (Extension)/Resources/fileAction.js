class FileActions {
    constructor() {
        this.files = new Map();
        this.activeFile = null;
    }

    async loadFromStorage(workspace = null) {
        try {
            // If no workspace is specified, use the active workspace
            if (!workspace) {
                workspace = await StorageManager.getActiveWorkspace();
            }
            
            // Clear existing files
            this.files.clear();
            
            const fileNames = await StorageManager.loadFileIndex(workspace);
            const savedTabs = await StorageManager.loadTabs(workspace);
            const savedActiveFile = await StorageManager.loadActiveFile(workspace);
            
            if (fileNames && fileNames.length > 0) {
                for (const name of fileNames) {
                    const content = await StorageManager.loadFile(name);
                    if (content !== null) {
                        this.files.set(name, content);
                    }
                }
            }
            
            if (savedTabs && savedTabs.length > 0) {
                savedTabs.forEach(tab => {
                    if (this.files.has(tab.name)) {
                        const event = new CustomEvent('aichatflow:createtab', { 
                            detail: { fileName: tab.name }
                        });
                        document.dispatchEvent(event);
                    }
                });
            }

            if (savedActiveFile && this.files.has(savedActiveFile)) {
                this.setActiveFile(savedActiveFile);
            } else if (savedTabs && savedTabs.length > 0) {
                const activeTab = savedTabs.find(tab => tab.active);
                if (activeTab && this.files.has(activeTab.name)) {
                    this.setActiveFile(activeTab.name);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data: ' + error.message);
        }
    }

    async saveToStorage(workspace = null) {
        try {
            // If no workspace is specified, use the active workspace
            if (!workspace) {
                workspace = await StorageManager.getActiveWorkspace();
            }
            
            const openTabs = Array.from(document.querySelectorAll('.tab')).map(tab => ({
                name: tab.querySelector('.tab-name').textContent,
                active: tab.querySelector('.tab-name').textContent === this.activeFile
            }));
            
            await StorageManager.saveTabs(openTabs, workspace);
            await StorageManager.saveActiveFile(this.activeFile, workspace);
            
            await StorageManager.clearAllFiles(workspace);
            
            const fileIndex = Array.from(this.files.keys());
            await StorageManager.saveFileIndex(fileIndex, workspace);
            
            for (const [name, content] of this.files.entries()) {
                await StorageManager.saveFile(name, content);
            }
            const files = Object.fromEntries(this.files);
            browser.runtime.sendMessage({ type: 'filesUpdated', files, workspace });
        } catch (error) {
            console.error('Error saving data:', error);
            alert('Error saving data: ' + error.message);
        }
    }

    addFile(name, content = '') {
        if (!name || typeof name !== 'string') {
            console.error('Invalid file name');
            return false;
        }

        name = name.trim();
        if (name === '') {
            console.error('File name cannot be empty');
            return false;
        }

        if (this.files.has(name)) {
            console.error('File already exists');
            return false;
        }

        try {
            this.files.set(name, content);
            this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Error adding file:', error);
            return false;
        }
    }

    async renameFile(oldName, newName) {
        if (!oldName || !newName) {
            console.error('Invalid file names for rename operation');
            return false;
        }

        if (!this.files.has(oldName)) {
            console.error('Source file does not exist:', oldName);
            return false;
        }

        if (this.files.has(newName)) {
            console.error('Target file already exists:', newName);
            return false;
        }

        try {
            const content = this.files.get(oldName);
            this.files.delete(oldName);
            this.files.set(newName, content);

            if (this.activeFile === oldName) {
                this.activeFile = newName;
            }

            await this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Error renaming file:', error);
            return false;
        }
    }

    async deleteFile(name) {
        if (!name) {
            console.error('Invalid file name for delete operation');
            return false;
        }

        if (!this.files.has(name)) {
            console.error('File does not exist:', name);
            return false;
        }

        try {
            this.files.delete(name);

            if (this.activeFile === name) {
                const remainingFiles = Array.from(this.files.keys());
                this.activeFile = remainingFiles.length > 0 ? remainingFiles[0] : null;
            }

            await this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    downloadFile(name) {
        if (!this.files.has(name)) return false;

        const content = this.files.get(name);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        return true;
    }

    async downloadAllFiles(fromAllWorkspaces = false) {
        if (fromAllWorkspaces) {
            try {
                const allFiles = await StorageManager.getAllWorkspaceFiles();
                if (Object.keys(allFiles).length === 0) return false;
                ZipManager.downloadAllWorkspaceFiles(allFiles);
                return true;
            } catch (error) {
                console.error('Error downloading all workspace files:', error);
                return false;
            }
        } else {
            if (this.files.size === 0) return false;
            ZipManager.downloadAllFiles(this.files);
            return true;
        }
    }

    getFileContent(name) {
        return this.files.get(name) || null;
    }

    setActiveFile(name) {
        this.activeFile = name;
        this.saveToStorage();
    }
}