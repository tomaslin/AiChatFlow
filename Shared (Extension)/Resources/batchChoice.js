class BatchChoice {
    constructor(options = {}) {
        this.dialogContainer = null;
        this.selectedItems = new Set();
        this.type = options.type || 'default';
        this.options = {
            title: options.title || 'Select Items',
            buttonText: options.buttonText || 'Import Selected',
            loadItems: options.loadItems || (() => []),
            onSelect: options.onSelect || (() => {}),
            renderItem: options.renderItem || this.defaultRenderItem.bind(this),
            truncateLength: options.truncateLength || { title: 140, description: 260 },
            selectAllByDefault: options.selectAllByDefault || false,
            showModeSelector: options.showModeSelector || false,
            modes: options.modes || []
        }
        
        // Load saved preferences if type is specified
        this.prefsLoaded = Promise.resolve();
        if (this.type === 'runner' || this.type === 'importer') {
            this.prefsLoaded = this.loadPreferences();
        }
    }

    loadPreferences() {
        const storageMethod = this.type === 'runner' ? StorageManager.getpromptPlayerPrefs : StorageManager.getChatTranscriberPrefs;
        return new Promise(async resolve => {
            const prefs = await storageMethod.call(StorageManager);
            if (prefs) {
                if (prefs.selectAll !== undefined) {
                    this.options.selectAllByDefault = prefs.selectAll;
                }
                if (prefs.selectedMode && this.options.showModeSelector) {
                    // Update default mode in modes array
                    this.options.modes.forEach(mode => {
                        mode.default = (mode.value === prefs.selectedMode);
                    });
                }
            }
            resolve();
        });
    }
    
    savePreferences(selectAll, selectedMode) {
        if (this.type !== 'runner' && this.type !== 'importer') return;
        
        const prefs = { selectAll };
        
        if (selectedMode && this.options.showModeSelector) {
            prefs.selectedMode = selectedMode;
        }
        
        if (this.type === 'runner') {
            StorageManager.setpromptPlayerPrefs(prefs);
        } else {
            StorageManager.setChatTranscriberPrefs(prefs);
        }
    }
    
    async createDialog() {
        // Wait for preferences to be loaded before creating the dialog
        await this.prefsLoaded;
        
        this.closeDialog();
        this.dialogContainer = document.createElement('div');
        this.dialogContainer.className = 'modal-overlay';
        this.dialogContainer.id = 'batch-choice';
        this.dialogContainer.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">${this.options.title}</h3>
                    <button class="modal-close-btn">×</button>
                </div>
                <div class="batch-choice-options">
                    <label class="select-all-container">
                        <input type="checkbox" class="select-all-checkbox">
                        <span>Select All</span>
                    </label>
                    ${this.options.showModeSelector ? `
                    <div class="mode-selector-container">
                        <label for="import-mode">Import Mode:</label>
                        <select id="import-mode" class="import-mode-select">
                            ${this.options.modes.map(mode => `<option value="${mode.value}"${mode.default ? ' selected' : ''}>${mode.label}</option>`).join('')}
                        </select>
                    </div>
                    ` : ''}
                </div>
                <div class="batch-items-list"></div>
                <div class="modal-footer">
                    <button class="import-btn">${this.options.buttonText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.dialogContainer);
        this.setupEventListeners();
        this.loadItems();
    }

    closeDialog() {
        if (this.dialogContainer) {
            this.dialogContainer.remove();
            this.dialogContainer = null;
            this.selectedItems.clear();
        }
    }

    setupEventListeners() {
        const closeBtn = this.dialogContainer.querySelector('.modal-close-btn');
        const importBtn = this.dialogContainer.querySelector('.import-btn');
        const selectAllCheckbox = this.dialogContainer.querySelector('.select-all-checkbox');
        closeBtn.addEventListener('click', () => this.closeDialog());
        importBtn.addEventListener('click', () => this.handleSelection());
        selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        this.dialogContainer.addEventListener('click', (e) => {
            if (e.target === this.dialogContainer) {
                this.closeDialog();
            }
        });
    }

    async loadItems() {
        const itemsList = this.dialogContainer.querySelector('.batch-items-list');
        const items = await this.options.loadItems();
        if (items.length === 0) {
            itemsList.innerHTML = '<div class="no-items">No items found</div>';
            return;
        }
        itemsList.innerHTML = items.map((item, index) => `
            <div class="batch-item">
                <label class="item-checkbox-container">
                    <input type="checkbox" class="item-checkbox" data-index="${index}" ${this.options.selectAllByDefault ? 'checked' : ''}>
                    ${this.options.renderItem(item)}
                </label>
            </div>
        `).join('');

        // Set the select all checkbox state and initialize selectedItems
        const selectAllCheckbox = this.dialogContainer.querySelector('.select-all-checkbox');
        if (this.options.selectAllByDefault) {
            selectAllCheckbox.checked = true;
            // Add all items to selectedItems
            items.forEach((_, index) => this.selectedItems.add(index));
        }

        itemsList.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (e.target.checked) {
                    this.selectedItems.add(index);
                } else {
                    this.selectedItems.delete(index);
                }
            });
        });
    }

    defaultRenderItem(item) {
        // Use arrow function to preserve 'this' context
        return `
            <div class="item-preview">
                <div class="item-title">${this.truncateText(item.title || '', this.options.truncateLength.title)}</div>
                <div class="item-description">${this.truncateText(item.description || '', this.options.truncateLength.description)}</div>
            </div>
        `;
    }

    toggleSelectAll(checked) {
        const checkboxes = this.dialogContainer.querySelectorAll('.item-checkbox');
        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = checked;
            if (checked) {
                this.selectedItems.add(index);
            } else {
                this.selectedItems.delete(index);
            }
        });
    }

    async handleSelection() {
        const items = await this.options.loadItems();
        const selectedItems = Array.from(this.selectedItems)
            .sort((a, b) => a - b)
            .map(index => items[index]);
        
        const modeSelector = this.dialogContainer.querySelector('.import-mode-select');
        const selectedMode = modeSelector ? modeSelector.value : null;
        
        // Save user preferences if type is specified
        // Only save preferences when user explicitly clicks the OK button
        // Preferences are not saved when dialog is closed via X button or clicking outside
        const selectAllCheckbox = this.dialogContainer.querySelector('.select-all-checkbox');
        if (this.type === 'runner' || this.type === 'importer') {
            this.savePreferences(selectAllCheckbox.checked, selectedMode);
        }
        
        this.options.onSelect(selectedItems, selectedMode);
        this.closeDialog();
    }

    truncateText(text, maxLength) {
        text = text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#039;');
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}