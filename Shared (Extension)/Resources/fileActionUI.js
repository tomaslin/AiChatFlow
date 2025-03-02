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
            "play": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M4 2v12l8-6z"/>
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
