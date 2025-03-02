// FileActionUI class for centralizing file action buttons and tooltips
class FileActionUI {
    constructor(fileManager) {
        this.fileManager = fileManager;
    }

    // SVG icons for file actions
    static get icons() {
        return {
            "chat": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M10 2v3h6v6h-6v3L0 8z"/>
            </svg>`,
            "batch": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M4 2v12l8-6z"/>
            </svg>`,
            "import_chat": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M15 8l-3-3v2h-5v2h5v2l3-3zM8 2H2v12h6v-3h-2v1H4v-8h2v1h2V2z"/>
            </svg>`,
            "rename": `<svg width="24" height="24"  viewBox="0 0 24 24">
                <path fill="currentColor" d="M13.4 1.4l1.2 1.2c.8.8.8 2 0 2.8L5.2 14.8 0 16l1.2-5.2L10.6 1.4c.8-.8 2-.8 2.8 0z"/>
            </svg>`,
            "download": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M8 12l-4-4h2.5V2h3v6H12L8 12zm-6 2h12v2H2v-2z"/>
            </svg>`,
            "delete": `<svg width="24" height="24"  viewBox="0 0 24 24">
                <path fill="currentColor" d="M6 2h4v2H6zM2 4h12v1H2zm1 2h10l-1 9H4L3 6zm3 2v6h1V8H6zm3 0v6h1V8H9z"/>
            </svg>`
        };
    }

    // Create a file action button with tooltip
    createActionButton(action, title) {
        const button = document.createElement('button');
        button.className = `file-action-btn ${action}-btn`;
        button.title = title;
        button.innerHTML = FileActionUI.icons[action];
        return button;
    }

    // Create all file action buttons for a file item in the file list
    createFileItemActions(fileName) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'file-actions';
        
        // Chat button
        const chatBtn = this.createActionButton('chat', 'Send to Chat');
        chatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = this.fileManager.fileActions.files.get(fileName);
            aiProvider.sendFile(content, fileName);
        });
        
        // Batch button
        const batchBtn = this.createActionButton('batch', 'Run batch prompts');
        batchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = this.fileManager.fileActions.files.get(fileName);
            const batchRunner = new BatchRunner();
            batchRunner.createDialog(fileName, content);
        });
        
        // Download button
        const downloadBtn = this.createActionButton('download', 'Download');
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = this.fileManager.fileActions.files.get(fileName);
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        });
        
        // Rename button
        const renameBtn = this.createActionButton('rename', 'Rename');
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const simpleChoice = new SimpleChoice({
                title: 'Rename File',
                buttonText: 'Rename',
                placeholder: 'Enter new name',
                initialValue: fileName,
                validator: (name) => {
                    if (!name.trim()) return 'File name cannot be empty.';
                    if (name === fileName) return 'New name must be different from the current name.';
                    if (this.fileManager.fileActions.files.has(name)) return 'A file with this name already exists.';
                    return true;
                },
                onConfirm: (newName) => {
                    const success = this.fileManager.renameFile(fileName, newName);
                    if (success) {
                        this.fileManager.updateFileList();
                    } else {
                        // Check if failure is due to file already existing
                        if (this.fileManager.fileActions.files.has(newName)) {
                            alert('A file with this name already exists. Please choose a different name.');
                        } else {
                            alert('Failed to rename file. Please try again.');
                        }
                    }
                }
            });
            simpleChoice.createDialog();
        });
        
        // Delete button
        const deleteBtn = this.createActionButton('delete', 'Delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete ${fileName}?`)) {
                const wasActive = this.fileManager.fileActions.activeFile === fileName;
                this.fileManager.fileActions.deleteFile(fileName);
                
                const tabToRemove = Array.from(document.querySelectorAll('.tab')).find(tab => 
                    tab.querySelector('.tab-name').textContent === fileName
                );
                if (tabToRemove) tabToRemove.remove();
                
                if (wasActive) {
                    const remainingFiles = Array.from(this.fileManager.fileActions.files.keys());
                    if (remainingFiles.length > 0) {
                        this.fileManager.setActiveFile(remainingFiles[0]);
                    } else {
                        this.fileManager.setActiveFile(null);
                    }
                }
                
                this.fileManager.updateFileList();
            }
        });
        
        // Add all buttons to the container
        actionsContainer.appendChild(chatBtn);
        actionsContainer.appendChild(batchBtn);
        actionsContainer.appendChild(downloadBtn);
        actionsContainer.appendChild(renameBtn);
        actionsContainer.appendChild(deleteBtn);
        
        return actionsContainer;
    }
    
    // Create file action buttons for the editor toolbar
    createEditorToolbarActions(fileName) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'file-actions';
        
        // Chat button
        const chatBtn = this.createActionButton('chat', 'Send to Chat');
        chatBtn.addEventListener('click', () => {
            const content = this.fileManager.fileActions.files.get(fileName);
            aiProvider.sendFile(content, fileName);
        });
        
        // Batch button
        const batchBtn = this.createActionButton('batch', 'Run batch prompts');
        batchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = this.fileManager.fileActions.files.get(fileName);
            const batchRunner = new BatchRunner();
            batchRunner.createDialog(fileName, content);
        });
        
        // Import chat button
        const importChatBtn = this.createActionButton('import_chat', 'Import from Chat');
        importChatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatImporter = new ChatImporter();
            chatImporter.createDialog();
        });
        
        // Rename button
        const renameBtn = this.createActionButton('rename', 'Rename');
        renameBtn.addEventListener('click', () => {
            const simpleChoice = new SimpleChoice({
                title: 'Rename File',
                buttonText: 'Rename',
                placeholder: 'Enter new name',
                initialValue: fileName,
                validator: (name) => {
                    if (!name.trim()) return 'File name cannot be empty.';
                    if (name === fileName) return 'New name must be different from the current name.';
                    if (this.fileManager.fileActions.files.has(name)) return 'A file with this name already exists.';
                    return true;
                },
                onConfirm: (newName) => {
                    const success = this.fileManager.renameFile(fileName, newName);
                    if (success) {
                        this.fileManager.updateFileList();
                    } else {
                        // Check if failure is due to file already existing
                        if (this.fileManager.fileActions.files.has(newName)) {
                            alert('A file with this name already exists. Please choose a different name.');
                        } else {
                            alert('Failed to rename file. Please try again.');
                        }
                    }
                }
            });
            simpleChoice.createDialog();
        });
        
        // Download button
        const downloadBtn = this.createActionButton('download', 'Download');
        downloadBtn.addEventListener('click', () => {
            const content = this.fileManager.fileActions.files.get(fileName);
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        });
        
        // Delete button
        const deleteBtn = this.createActionButton('delete', 'Delete');
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete ${fileName}?`)) {
                const wasActive = this.fileManager.fileActions.activeFile === fileName;
                this.fileManager.fileActions.deleteFile(fileName);
                
                const tabToRemove = Array.from(document.querySelectorAll('.tab')).find(tab => 
                    tab.querySelector('.tab-name').textContent === fileName
                );
                if (tabToRemove) tabToRemove.remove();
                
                if (wasActive) {
                    const remainingFiles = Array.from(this.fileManager.fileActions.files.keys());
                    if (remainingFiles.length > 0) {
                        this.fileManager.setActiveFile(remainingFiles[0]);
                    } else {
                        this.fileManager.setActiveFile(null);
                    }
                }
                
                this.fileManager.updateFileList();
            }
        });
        
        // Add all buttons to the container
        actionsContainer.appendChild(chatBtn);
        actionsContainer.appendChild(batchBtn);
        actionsContainer.appendChild(importChatBtn);
        actionsContainer.appendChild(renameBtn);
        actionsContainer.appendChild(downloadBtn);
        actionsContainer.appendChild(deleteBtn);
        
        return actionsContainer;
    }
}