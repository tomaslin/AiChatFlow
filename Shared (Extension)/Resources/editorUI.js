async function getMinimizedState() {
    return StorageManager.getEditorMinimizedState();
}

async function getShowFilesState() {
    return StorageManager.getShowFilesState();
}

async function setShowFilesState(show) {
    await StorageManager.setShowFilesState(show);
}

async function setMinimizedState(minimized) {
    await StorageManager.setEditorMinimizedState(minimized);
}

// Add this new generic function
async function updateUIState(options) {
    const {
        containerSelector,
        buttonSelector,
        className,
        getState,
        setState,
        updateButton,
        onStateChange,
        forceState = null
    } = options;
    
    const container = containerSelector instanceof Element ? 
        containerSelector : document.querySelector(containerSelector);
    const button = buttonSelector instanceof Element ? 
        buttonSelector : container?.querySelector(buttonSelector);
    
    if (!container || !button) return;
    
    const state = forceState !== null ? forceState : await getState();
    
    container.classList.toggle(className, state);
    updateButton?.(button, state);
    
    if (forceState !== null) {
        await setState(state);
    }
    
    onStateChange?.(state);
    return state;
}

// Replace updateFileListVisibility with this
async function updateFileListVisibility(forceState = null) {
    return updateUIState({
        containerSelector: '#ai-chat-flow-editor',
        buttonSelector: '.toggle-files-btn',
        className: 'showFiles',
        getState: getShowFilesState,
        setState: setShowFilesState,
        forceState,
        updateButton: (button, state) => {
            button.innerHTML = state ? icons.caret_up : icons.caret_down;
        }
    });
}

// Replace updateMinimizedState with this
async function updateMinimizedState(forceState = null) {
    return updateUIState({
        containerSelector: '#ai-chat-flow-editor',
        buttonSelector: '.ai-chat-flow-minimize-btn',
        className: 'minimized',
        getState: getMinimizedState,
        setState: setMinimizedState,
        forceState,
        updateButton: (button, state) => {
            button.innerHTML = state ? icons.file : icons.chat;
            button.title = state ? "Expand" : "Minimize";
        },
        onStateChange: (state) => {
            if (typeof aiProvider !== 'undefined' && aiProvider && !isIPhone) {
                aiProvider.slideContent(state);
            }
        }
    });
}

const icons = {
    file: "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z\"/></svg>",
    new_file: "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M8 1v6h6v2H8v6H6V9H0V7h6V1h2z\"/></svg>",
    import_file: "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M14 6l-1.4 1.4L8 2.8V13H6V2.8L1.4 7.4 0 6l7-7 7 7z\"/></svg>",
    download_all: "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M8 12l-4-4h2.5V2h3v6H12L8 12zm-6 2h12v2H2v-2z\"/></svg>",
    close: "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z\"/></svg>",
    chat: "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z\"/></svg>",
    caret_down: "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M8 4l6 6H2z\"/></svg>",
    caret_up: "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M8 12l-6-6h12z\"/></svg>",
    transcribe_chat: "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M15 8l-3-3v2h-5v2h5v2l3-3zM8 2H2v12h6v-3h-2v1H4v-8h2v1h2V2z\"/></svg>"
};

const createButton = ({ id, className = 'toolbar-btn', title, icon, onClick }) => {
    const button = document.createElement('button');
    Object.assign(button, {
        id, className, title,
        innerHTML: icons[icon] || icon
    });
    if (onClick) button.addEventListener('click', onClick);
    return button;
};

async function createEditorUI() {
    const editorContainer = document.createElement('div');
    editorContainer.id = 'ai-chat-flow-editor';
    
    const editorTemplate = {
        toolbar: `
            <div class="toolbar">
                ${createButton({
                    id: 'transcribe-chat-btn',
                    title: 'Transcribe From Chat',
                    icon: 'transcribe_chat'
                }).outerHTML}
                ${createButton({
                    id: 'new-file-btn',
                    className: 'toolbar-btn file-button',
                    title: 'New File',
                    icon: 'new_file'
                }).outerHTML}
                ${createButton({
                    id: 'import-file-btn',
                    className: 'toolbar-btn file-button',
                    title: 'Import File',
                    icon: 'import_file'
                }).outerHTML}
                ${createButton({
                    id: 'download-all-btn',
                    className: 'toolbar-btn file-button',
                    title: 'Download All',
                    icon: 'download_all'
                }).outerHTML}
            </div>
        `,
        header: function() {
            return `
                <div class="editor-header">
                    <div class="editor-top-bar">
                        ${this.toolbar}
                        <div style="flex: 1"></div>
                        ${createButton({
                            className: 'ai-chat-flow-minimize-btn',
                            title: 'Minimize',
                            icon: 'chat'
                        }).outerHTML}
                    </div>
                    <input type="file" id="file-input" multiple accept=".txt,.md,.json,.js,.html,.css" style="display: none">
                    <div class="file-list-container">
                        <div class="file-list"></div>
                    </div>
                </div>
            `;
        },
        content: `
            <div class="tab-container">
                <div class="tab-list"></div>
                <div class="editor-content">
                    <div class="welcome-message">
                        <p>No file selected. Please create a new one or select an existing one.</p>
                    </div>
                </div>
            </div>
        `
    };

    editorContainer.innerHTML = editorTemplate.header() + editorTemplate.content;
    document.body.appendChild(editorContainer);
    
    const minimizeBtn = editorContainer.querySelector('.ai-chat-flow-minimize-btn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isCurrentlyMinimized = editorContainer.classList.contains('minimized');
            await updateMinimizedState(!isCurrentlyMinimized);
        });
    }
    
    const fileManager = new FileManager();

document.addEventListener('aichatflow:workspacechanged', () => {
    this.updateWorkspaceDisplay();
});

    const toggleFilesBtn = createButton({
        className: 'toolbar-btn toggle-files-btn',
        title: 'Show list of files',
        onClick: async () => {
            const currentState = await getShowFilesState();
            await updateFileListVisibility(!currentState);
        }
    });

    // Insert the toggle button before the minimize button
    const minimizeButton = editorContainer.querySelector('.ai-chat-flow-minimize-btn');
    if (minimizeButton) {
        minimizeButton.parentNode.insertBefore(toggleFilesBtn, minimizeButton);
    }

    await Promise.all([
        updateFileListVisibility(),
        updateMinimizedState()
    ]);

    // Add visibilitychange event listener
    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            await Promise.all([
                updateFileListVisibility(),
                updateMinimizedState()
            ]);
        }
    });

    const setupFileHandlers = () => {
        const elements = {
            transcribeChatBtn: document.getElementById('transcribe-chat-btn'),
            newFileBtn: document.getElementById('new-file-btn'),
            importFileBtn: document.getElementById('import-file-btn'),
            downloadAllBtn: document.getElementById('download-all-btn'),
            fileInput: document.getElementById('file-input')
        };
        
        const { transcribeChatBtn, newFileBtn, importFileBtn, downloadAllBtn, fileInput } = elements;
        
        if (!Object.values(elements).every(Boolean)) return;
        
        transcribeChatBtn.addEventListener('click', () => {
            new ChatTranscriber({
                onAddFile: (name, content) => fileManager.addFile(name, content),
                hasCurrent: fileManager.fileActions.activeFile !== null
            }).createDialog();
        });
        
        newFileBtn.addEventListener('click', () => {
            new SimpleChoice({
                title: 'Create New File',
                buttonText: 'Create',
                placeholder: 'Enter file name',
                validator: (name) => {
                    if (!name.trim()) return 'File name cannot be empty.';
                    if (fileManager.fileActions.files.has(name)) return 'A file with this name already exists.';
                    return true;
                },
                onConfirm: (name) => {
                    const success = fileManager.addFile(name.trim());
                    if (!success) {
                        alert('Failed to create file. Please try again.');
                    }
                }
            }).createDialog();
        });
        
        importFileBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const success = fileManager.addFile(file.name, event.target.result);
                    if (!success) {
                        alert(`Failed to import file: ${file.name}`);
                    }
                };
                reader.onerror = () => alert(`Error reading file: ${file.name}`);
                reader.readAsText(file);
            });
        });

        downloadAllBtn.addEventListener('click', () => {
            if (fileManager.fileActions.files.size === 0) {
                alert('No files to download.');
                return;
            }
            fileManager.downloadAllFiles();
        });
    };
    
    setupFileHandlers();
    return editorContainer;
}
