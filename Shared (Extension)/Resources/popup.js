document.addEventListener('DOMContentLoaded', async () => {
    const batchSeparatorInput = document.getElementById('batch-separator');
    const saveButton = document.getElementById('save-settings');
    
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
