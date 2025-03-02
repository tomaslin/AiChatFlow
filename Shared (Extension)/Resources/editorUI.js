// Editor UI control functions

// Editor width is now fixed in CSS

// These keys are already defined in StorageManager class
// No need to redefine them here

async function getMinimizedState() {
    return StorageManager.getEditorMinimizedState();
}

async function getShowMoreFilesState() {
    return StorageManager.getShowMoreFilesState();
}

async function setShowMoreFilesState(showMore) {
    await StorageManager.setShowMoreFilesState(showMore);
}

async function setMinimizedState(minimized) {
    await StorageManager.setEditorMinimizedState(minimized);
}

async function createEditorUI() {
    const editorContainer = document.createElement('div');
    editorContainer.id = 'ai-chat-flow-editor';
    // Editor width is now controlled by CSS
    const icons = {
        "minimize": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z\"/></svg>",
        "new_file": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M8 1v6h6v2H8v6H6V9H0V7h6V1h2z\"/></svg>",
        "import_file": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M14 6l-1.4 1.4L8 2.8V13H6V2.8L1.4 7.4 0 6l7-7 7 7z\"/></svg>",
        "download_all": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M8 12l-4-4h2.5V2h3v6H12L8 12zm-6 2h12v2H2v-2z\"/></svg>",
        "close": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z\"/></svg>",
        "chat": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z\"/></svg>",
        "caret_down": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M8 4l6 6H2z\"/></svg>",
        "caret_up": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M8 12l-6-6h12z\"/></svg>",
        "transcribe_chat": `<svg width="24" height="24" viewBox="0 0 16 16"><path fill="currentColor" d="M15 8l-3-3v2h-5v2h5v2l3-3zM8 2H2v12h6v-3h-2v1H4v-8h2v1h2V2z"/></svg>`
    };
    editorContainer.innerHTML = `<div class="editor-header"><div class="editor-top-bar"><div class="toolbar"><button id="transcribe-chat-btn" class="toolbar-btn" title="Transcribe From Chat">${icons.transcribe_chat}</button><button id="new-file-btn" class="toolbar-btn" title="New File">${icons.new_file}</button><button id="import-file-btn" class="toolbar-btn" title="Import File">${icons.import_file}</button><button id="download-all-btn" class="toolbar-btn" title="Download All">${icons.download_all}</button></div><div style="flex: 1"></div><button class="ai-chat-flow-minimize-btn" title="Minimize">${icons.chat}</button></div><input type="file" id="file-input" multiple style="display: none"><div class="file-list-container"><div class="file-list"></div></div></div><div class="tab-container"><div class="tab-list"></div><div class="editor-content"><div class="welcome-message"><p>No file selected. Please create a new one or select an existing one.</p></div></div></div>`;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content.css');
    document.head.appendChild(link);
    document.body.appendChild(editorContainer);
    const minimizeBtn = editorContainer.querySelector('.ai-chat-flow-minimize-btn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            editorContainer.classList.add('minimized');
            await setMinimizedState(true);
            if (typeof aiProvider !== 'undefined' && aiProvider && !isIPhone) {
                aiProvider.slideContent(true);
            }
        });
    }
    editorContainer.addEventListener('click', async (e) => {
        if (editorContainer.classList.contains('minimized') && e.target !== closeBtn) {
            editorContainer.classList.remove('minimized');
            minimizeIcon.classList.remove('visible');
            await setMinimizedState(false);
            if (typeof aiProvider !== 'undefined' && aiProvider && !isIPhone) {
                aiProvider.slideContent(false);
            }
        }
    });
    const fileManager = new FileManager();

    // Initialize file count toggle
    const toggleFilesBtn = document.createElement('button');
    toggleFilesBtn.className = 'toolbar-btn toggle-files-btn';
    toggleFilesBtn.title = 'Show list of files';
    const fileListContainer = editorContainer.querySelector('.file-list-container');

    const updateFileListHeight = async () => {
        const showMore = await getShowMoreFilesState();
        fileListContainer.style.display = showMore ? '' : 'none';   
        if(isIPhone){
            fileListContainer.style.height = '50vh';
        }
        toggleFilesBtn.innerHTML = showMore ? icons.caret_up : icons.caret_down;
    };

    toggleFilesBtn.addEventListener('click', async () => {
        const currentState = await getShowMoreFilesState();
        await setShowMoreFilesState(!currentState);
        await updateFileListHeight();
    });

    // Insert toggle button after download button
    const downloadBtn = document.getElementById('download-all-btn');
    if (downloadBtn) {
        downloadBtn.parentNode.insertBefore(toggleFilesBtn, downloadBtn.nextSibling);
    }

    // Initialize state
    updateFileListHeight();
    const transcribeChatBtn = document.getElementById('transcribe-chat-btn');
    const newFileBtn = document.getElementById('new-file-btn');
    const importFileBtn = document.getElementById('import-file-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const fileInput = document.getElementById('file-input');
    if (transcribeChatBtn && newFileBtn && importFileBtn && downloadAllBtn && fileInput) {
        transcribeChatBtn.addEventListener('click', () => {
            new ChatTranscriber({
                onAddFile: (name, content) => fileManager.addFile(name, content),
                hasCurrent: () => {
                    return ( fileManager.fileActions.activeFile !== null)
                }
            }).createDialog();
        });
        newFileBtn.addEventListener('click', () => {
            const simpleChoice = new SimpleChoice({
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
            });
            simpleChoice.createDialog();
        });
        importFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const success = fileManager.addFile(file.name, event.target.result);
                    if (!success) {
                        alert(`Failed to import file: ${file.name}`);
                    }
                };
                reader.onerror = () => {
                    alert(`Error reading file: ${file.name}`);
                };
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
    }
    return editorContainer;
}
