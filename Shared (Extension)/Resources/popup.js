document.addEventListener('DOMContentLoaded', async () => {
    const batchSeparatorInput = document.getElementById('batch-separator');
    const saveButton = document.getElementById('save-settings');
    
    // Add download all workspaces button
    const settingsContainer = document.querySelector('.settings-container') || document.body;
    const downloadSection = document.createElement('div');
    downloadSection.className = 'download-section';
    downloadSection.innerHTML = `
        <h3>Download Options</h3>
        <button id="download-all-workspaces" class="download-btn">Download All Workspaces</button>
    `;
    settingsContainer.appendChild(downloadSection);
    
    // Set up download button event listener
    const downloadAllBtn = document.getElementById('download-all-workspaces');
    downloadAllBtn.addEventListener('click', async () => {
        // Send message to content script to download all workspaces
        browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'downloadAllWorkspaces'
            });
        });
    });
    
    let originalBatchSeparator = '';
    
    try {
        // Load saved settings from storage
        const separator = await StorageManager.getBatchSeparator();
        
        // Set up batch separator
        batchSeparatorInput.value = separator || '';
        originalBatchSeparator = separator || '';
        
        // Initially disable the save button since no changes have been made yet
        saveButton.disabled = true;

        // Enable/disable save button based on whether any changes have been made
        const checkChanges = () => {
            const currentSeparator = batchSeparatorInput.value.trim();
            const hasChanges = currentSeparator !== originalBatchSeparator;
            saveButton.disabled = !hasChanges || currentSeparator === '';
        };

        batchSeparatorInput.addEventListener('input', checkChanges);
        
        // Handle save button click
        saveButton.addEventListener('click', async () => {
            const newSeparator = batchSeparatorInput.value.trim();
            await StorageManager.setBatchSeparator(newSeparator);
            originalBatchSeparator = newSeparator;
            saveButton.disabled = true;
        });
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
});
