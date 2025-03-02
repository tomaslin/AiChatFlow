// FileActionUI class for centralizing file action buttons and tooltips
class FileActionUI {
    constructor(fileManager) {
        this.fileManager = fileManager;
    }

    // SVG icons for file actions
    static get icons() {
        return {
            "chat": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M8 5v4h8v8h-8v4L2 12z"/>
            </svg>`,
            "play": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9 6v12l10-6z"/>
            </svg>`,
            "rename": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M16.4 4.4l2.2 2.2c1 1 1 2.6 0 3.6L8.2 20.6 2 23l2.4-6.2L14.8 6.4c1-1 2.6-1 3.6 0z"/>
            </svg>`,
            "download": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 16l-4-4h2.5V6h3v6H16l-4 4zm-8 2h16v2H4v-2z"/>
            </svg>`,
            "delete": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9 4h6v2H9zM5 7h14v2H5zm2 3h10l-1 10H8L7 10zm3 2v6h2v-6h-2zm4 0v6h2v-6h-2z"/>
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

    // Handle file download
    handleDownload(fileName) {
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
    }

    // Handle file deletion
    handleDelete(fileName) {
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
    }

    // Handle file rename
    handleRename(fileName) {
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
                    if (this.fileManager.fileActions.files.has(newName)) {
                        alert('A file with this name already exists. Please choose a different name.');
                    } else {
                        alert('Failed to rename file. Please try again.');
                    }
                }
            }
        });
        simpleChoice.createDialog();
    }

    // Create action buttons with common configuration
    createActionButtons(fileName, isFileItem = false) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'file-actions';
        
        const buttons = [
            {
                action: 'chat',
                title: 'Send to Chat',
                handler: (e) => {
                    if (isFileItem) e.stopPropagation();
                    const content = this.fileManager.fileActions.files.get(fileName);
                    aiProvider.sendFile(content, fileName);
                }
            },
            {
                action: 'play',
                title: 'Play prompts',
                handler: (e) => {
                    if (isFileItem) e.stopPropagation();
                    const content = this.fileManager.fileActions.files.get(fileName);
                    const promptPlayer = new PromptPlayer();
                    promptPlayer.createDialog(fileName, content);
                }
            },
            {
                action: 'download',
                title: 'Download',
                handler: (e) => {
                    if (isFileItem) e.stopPropagation();
                    this.handleDownload(fileName);
                }
            },
            {
                action: 'rename',
                title: 'Rename',
                handler: (e) => {
                    if (isFileItem) e.stopPropagation();
                    this.handleRename(fileName);
                }
            },
            {
                action: 'delete',
                title: 'Delete',
                handler: (e) => {
                    if (isFileItem) e.stopPropagation();
                    this.handleDelete(fileName);
                }
            }
        ];

        buttons.forEach(({ action, title, handler }) => {
            const button = this.createActionButton(action, title);
            button.addEventListener('click', handler);
            actionsContainer.appendChild(button);
        });

        return actionsContainer;
    }

    // Create all file action buttons for a file item in the file list
    createFileItemActions(fileName) {
        return this.createActionButtons(fileName, true);
    }
    
    // Create file action buttons for the editor toolbar
    createEditorToolbarActions(fileName) {
        return this.createActionButtons(fileName, false);
    }
}
