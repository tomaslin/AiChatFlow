document.addEventListener('DOMContentLoaded', async () => {
    const batchSeparatorInput = document.getElementById('batch-separator');
    const saveButton = document.getElementById('save-settings');
    const workspaceSelector = document.getElementById('workspace-selector');
    const newWorkspaceButton = document.getElementById('new-workspace');
    const deleteWorkspaceButton = document.getElementById('delete-workspace');
    const purgeWorkspaceButton = document.getElementById('purge-workspace');
    
    let originalBatchSeparator = '';
    let originalWorkspace = '';
    
    try {
        // Load saved settings from storage
        const [separator, workspaces, activeWorkspace] = await Promise.all([
            StorageManager.getBatchSeparator(),
            StorageManager.getWorkspaces(),
            StorageManager.getActiveWorkspace()
        ]);
        
        // Set up batch separator
        batchSeparatorInput.value = separator || '';
        originalBatchSeparator = separator || '';
        
        // Set up default workspace option
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = 'Default';
        workspaceSelector.appendChild(defaultOption);
        
        // Set up workspaces
        workspaces.forEach(workspace => {
            if (workspace && workspace.name && workspace.name !== 'default') {
                const option = document.createElement('option');
                option.value = workspace.name;
                option.textContent = workspace.name;
                workspaceSelector.appendChild(option);
            }
        });
        
        // Set active workspace
        if (activeWorkspace) {
            workspaceSelector.value = activeWorkspace;
        } else {
            workspaceSelector.value = 'default';
            StorageManager.setActiveWorkspace('default');
        }
        originalWorkspace = workspaceSelector.value;
        
        // Initially disable the save button since no changes have been made yet
        saveButton.disabled = true;

        // Enable/disable save button based on whether any changes have been made
        const checkChanges = () => {
            const currentSeparator = batchSeparatorInput.value.trim();
            const currentWorkspace = workspaceSelector.value;
            const hasChanges = currentSeparator !== originalBatchSeparator || currentWorkspace !== originalWorkspace;
            saveButton.disabled = !hasChanges || currentSeparator === '';
        };

        batchSeparatorInput.addEventListener('input', checkChanges);
        workspaceSelector.addEventListener('change', checkChanges);
        
        // Handle new workspace creation
        newWorkspaceButton.addEventListener('click', async () => {
            const name = prompt('Enter workspace name:');
            if (name && name.trim()) {
                const success = await StorageManager.addWorkspace(name.trim());
                if (success) {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    workspaceSelector.appendChild(option);
                    workspaceSelector.value = name;
                    checkChanges();
                } else {
                    alert('Failed to create workspace. Name might be invalid or already exists.');
                }
            }
        });
        
        // Handle workspace deletion
        deleteWorkspaceButton.addEventListener('click', async () => {
            const workspace = workspaceSelector.value;
            if (workspace === 'default') {
                alert('Cannot delete the default workspace.');
                return;
            }
            
            if (confirm(`Are you sure you want to delete workspace "${workspace}"? All files in this workspace will be deleted.`)) {
                const success = await StorageManager.deleteWorkspace(workspace);
                if (success) {
                    workspaceSelector.remove(workspaceSelector.selectedIndex);
                    workspaceSelector.value = 'default';
                    originalWorkspace = 'default';
                    await StorageManager.setActiveWorkspace('default');
                    checkChanges();
                } else {
                    alert('Failed to delete workspace.');
                }
            }
        });

        // Handle purge all files
        purgeWorkspaceButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete all files in the current workspace? This action cannot be undone.')) {
                try {
                    await StorageManager.clearAllFiles();
                    // Notify all tabs about the purge
                    const tabs = await browser.tabs.query({});
                    await Promise.all(tabs.map(tab => {
                        return browser.tabs.sendMessage(tab.id, {
                            type: 'REFRESH_FILES'
                        }).catch(err => console.error('Error updating tab:', err));
                    }));
                    alert('All files have been deleted successfully.');
                } catch (error) {
                    console.error('Error purging files:', error);
                    alert('Failed to delete all files. Please try again.');
                }
            }
        });
        
        // Save settings when save button is clicked
        saveButton.addEventListener('click', async () => {
            const separator = batchSeparatorInput.value.trim();
            const workspace = workspaceSelector.value;
            
            try {
                // Show saving feedback
                saveButton.textContent = 'Saving...';
                saveButton.disabled = true;
                
                // Save batch separator if changed
                if (separator !== originalBatchSeparator) {
                    await StorageManager.setBatchSeparator(separator);
                    // Update batch separator in all tabs
                    const tabs = await browser.tabs.query({});
                    await Promise.all(tabs.map(tab => {
                        return browser.tabs.sendMessage(tab.id, {
                            type: 'UPDATE_BATCH_SEPARATOR',
                            separator
                        }).catch(err => console.error('Error updating tab:', err));
                    }));
                    originalBatchSeparator = separator;
                }
                
                // Save workspace if changed
                if (workspace !== originalWorkspace) {
                    await StorageManager.setActiveWorkspace(workspace);
                    // Notify tabs about workspace change
                    const tabs = await browser.tabs.query({});
                    await Promise.all(tabs.map(tab => {
                        return browser.tabs.sendMessage(tab.id, {
                            type: 'UPDATE_WORKSPACE',
                            workspace
                        }).catch(err => console.error('Error updating tab:', err));
                    }));
                    originalWorkspace = workspace;
                }
                
                // Update save button text and state
                saveButton.textContent = 'Saved!';
                
                setTimeout(() => {
                    saveButton.textContent = 'Save Changes';
                    saveButton.disabled = true;
                }, 1000);
            } catch (error) {
                console.error('Error saving settings:', error);
                saveButton.textContent = 'Error Saving';
                setTimeout(() => {
                    saveButton.textContent = 'Save Changes';
                    saveButton.disabled = false;
                }, 1000);
            }
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        batchSeparatorInput.value = 'NEXT_PROMPT';
        saveButton.disabled = true;
    }
});
