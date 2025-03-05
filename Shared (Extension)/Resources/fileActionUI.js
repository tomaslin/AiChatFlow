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
            "share": `<svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
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
        const fileButtons = ['download', 'rename', 'delete'];
        button.className = `file-action-btn ${action}-btn ${fileButtons.includes(action) ? 'file-button' :''}`;
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
    
    // Handle file sharing
    handleShare(fileName) {
        const content = this.fileManager.fileActions.files.get(fileName);
        
        if (navigator.share) {
            // Use Web Share API with text content only
            navigator.share({
                title: fileName,
                text: content
            }).catch(err => {
           
            });
        } else {
            // Fallback for browsers that don't support Web Share API
            try {
                // Create a temporary textarea to copy content to clipboard
                const textarea = document.createElement('textarea');
                textarea.value = content;
                textarea.style.position = 'fixed';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('File content copied to clipboard!');
            } catch (error) {
                console.error('Error copying to clipboard:', error);
                alert('Unable to copy file content to clipboard.');
            }
        }
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
                action: 'share',
                title: 'Share',
                handler: (e) => {
                    if (isFileItem) e.stopPropagation();
                    this.handleShare(fileName);
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
