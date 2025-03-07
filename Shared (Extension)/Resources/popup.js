document.addEventListener('DOMContentLoaded', async () => {
    const batchSeparatorInput = document.getElementById('batch-separator');
    const saveButton = document.getElementById('save-settings');
    const resetDbButton = document.getElementById('reset-db');
    
    // Download button is now in static HTML
    
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
    
    // Set up reset database button event listener
    resetDbButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset the database? This will delete all stored data and cannot be undone.')) {
            try {
                // Send message to background script to reset the database
                const response = await browser.runtime.sendMessage({
                    type: 'resetDB'
                });
                
                if (response && response.success) {
                    alert('Database reset successfully. The extension will now reload.');
                    window.close(); // Close the popup
                } else {
                    alert('Failed to reset database. Please try again.');
                }
            } catch (error) {
                console.error('Error resetting database:', error);
                alert('An error occurred while resetting the database: ' + error.message);
            }
        }
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
