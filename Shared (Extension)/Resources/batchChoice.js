class BatchChoice {
    constructor(options = {}) {
        this.dialogContainer = null;
        this.selectedItems = new Set();
        this.type = options.type || 'default';
        this.options = {
            title: options.title || 'Select Items',
            buttonLabel: options.buttonLabel || 'Import Selected',
            descriptor: options.descriptor || 'file',
            loadItems: options.loadItems || (() => []),
            onSelect: options.onSelect || (() => {}),
            emptyMessage: options.emptyMessage || 'No items found',
            renderItem: options.renderItem || this.defaultRenderItem.bind(this),
            truncateLength: options.truncateLength || { title: 140, description: 260 },
            selectAllByDefault: options.selectAllByDefault || false,
            showModeSelector: options.showModeSelector || false,
            modes: options.modes || [],
            validateNewName: options.validateNewName || (() => true),
            requireNewName: options.requireNewName ?? true,
            hasCurrent: options.hasCurrent || false
        }
        
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
                this.options.selectAllByDefault = prefs.selectAll !== undefined ? prefs.selectAll : this.options.selectAllByDefault;
                if (prefs.selectedMode && this.options.showModeSelector) {
                    this.options.modes.forEach(mode => {
                        mode.default = (mode.value === prefs.selectedMode);
                    });
                }
                this.useNewItem = prefs.useNewItem !== undefined ? prefs.useNewItem : this.useNewItem;
            }
            resolve();
        });
    }
    
    savePreferences(selectAll, selectedMode, useNewItem) {
        if (this.type !== 'runner' && this.type !== 'importer') return;
        
        const prefs = { selectAll };
        if (selectedMode && this.options.showModeSelector) {
            prefs.selectedMode = selectedMode;
        }
        if (useNewItem !== undefined && this.options.hasCurrent) {
            prefs.useNewItem = useNewItem;
        }
        
        const storageMethod = this.type === 'runner' ? StorageManager.setpromptPlayerPrefs : StorageManager.setChatTranscriberPrefs;
        storageMethod(prefs);
    }
    
    async createDialog() {
        await this.prefsLoaded;
        
        const items = await this.options.loadItems();
        if (items.length === 0) {
            alert(this.options.emptyMessage);
            return;
        }
        
        this.closeDialog();
        this.dialogContainer = document.createElement('div');
        this.dialogContainer.className = 'modal-overlay';
        this.dialogContainer.id = 'batch-choice';
        this.dialogContainer.innerHTML = this.getDialogHTML();
        document.body.appendChild(this.dialogContainer);
        this.setupEventListeners();
        this.loadItems();
    }

    getDialogHTML() {
        const modeSelectorHTML = this.options.showModeSelector ? `
            <div class="import-mode-section">
                <label class="import-mode-label">
                    <span>Copy over:</span>
                    <select id="import-mode" class="import-mode-select">
                        ${this.options.modes.map(mode => `
                            <option value="${mode.value}" ${mode.default ? 'selected' : ''}>
                                ${mode.label}
                            </option>
                        `).join('')}
                    </select>
                </label>
            </div>` : '';

        const newNameInput = this.options.requireNewName ? `
            <div class="new-name-container ${this.useNewItem ? 'visible' : ''}">
                <input type="text" class="new-name-input" placeholder="Enter name...">
            </div>
        ` : '';

        const radioGroupHTML = this.options.hasCurrent ? `
            <label class="radio-container">
                <input type="radio" name="target-type" value="current" ${!this.useNewItem ? 'checked' : ''}>
                <span>In open ${this.options.descriptor}</span>
            </label>
            <label class="radio-container">
                <input type="radio" name="target-type" value="new" ${this.useNewItem ? 'checked' : ''}>
                <span>In a new ${this.options.descriptor}</span>
                ${newNameInput}
            </label>` : `
            <div class="new-name-container visible">
                <label class="input-label">In a new ${this.options.descriptor}</label>
                ${this.options.requireNewName ? `<input type="text" class="new-name-input" placeholder="Enter name...">` : ''}
            </div>`;

        return `
            <div class="modal-dialog">
                <div class="modal-header">
                    <div class="header-content">
                        <h3 class="modal-title">${this.options.title}</h3>
                        <button class="modal-close-btn">×</button>
                    </div>
                </div>
                ${modeSelectorHTML}
                <div class="batch-choice-options">
                    <div class="batch-choice-header">
                        <div>
                            <div class="radio-group">
                                ${radioGroupHTML}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="select-all-container">
                    <input type="checkbox" class="select-all-checkbox">
                    <span>Select All</span>
                </div>
                <div class="batch-items-list"></div>
                <div class="modal-footer model-content">
                    <div class="status-message"></div>
                    <button class="import-btn">${this.options.buttonLabel}</button>
                </div>
            </div>`;
    }

    closeDialog() {
        if (this.dialogContainer) {
            this.dialogContainer.remove();
            this.dialogContainer = null;
            this.selectedItems.clear();
        }
    }

    async validateDialogState() {
        const importBtn = this.dialogContainer.querySelector('.import-btn');
        const statusMessage = this.dialogContainer.querySelector('.status-message');
        const newNameInput = this.dialogContainer.querySelector('.new-name-input');
    
        const hasSelectedItems = this.selectedItems.size > 0;
        let isValid = hasSelectedItems;
        let statusText = '';
    
        if (!hasSelectedItems) {
            statusText = 'No items selected';
        } else if (this.useNewItem && newNameInput) {
            const name = newNameInput.value.trim();
            const isNameValid = await this.options.validateNewName(name);
            isValid = isNameValid;
            
            if (!isNameValid) {
                statusText = 'Please enter a valid name - this name is not available';
            }
        }
    
        importBtn.disabled = !isValid;
        statusMessage.textContent = statusText;
    
        return isValid;
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
    
        const radioButtons = this.dialogContainer.querySelectorAll('input[name="target-type"]');
        const newNameContainer = this.dialogContainer.querySelector('.new-name-container');
        const newNameInput = this.dialogContainer.querySelector('.new-name-input');
    
        radioButtons.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                this.useNewItem = e.target.value === 'new';
                if (this.useNewItem) {
                    newNameContainer.classList.add('visible');
                    setTimeout(() => newNameInput.focus(), 50);
                } else {
                    newNameContainer.classList.remove('visible');
                    newNameInput.value = '';
                }
                await this.validateDialogState();
            });
        });
    
        if (newNameInput) {
            newNameInput.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            });
    
            newNameInput.addEventListener('input', () => this.validateDialogState());
        }
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
    
        const selectAllCheckbox = this.dialogContainer.querySelector('.select-all-checkbox');
        if (this.options.selectAllByDefault) {
            selectAllCheckbox.checked = true;
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
                this.validateDialogState();
            });
        });
    
        await this.validateDialogState();
    }

    async handleSelection() {
        const items = await this.options.loadItems();
        const isValid = await this.validateDialogState();
        
        if (!isValid) return;
    
        const selectedItems = Array.from(this.selectedItems)
            .sort((a, b) => a - b)
            .map(index => items[index]);
        
        const modeSelector = this.dialogContainer.querySelector('.import-mode-select');
        const selectedMode = modeSelector ? modeSelector.value : null;
        
        let newName = null;
        if ((this.useNewItem || !this.options.hasCurrent)) {
            const newNameInput = this.dialogContainer.querySelector('.new-name-input');
            if (newNameInput) {
                newName = newNameInput.value.trim();
            }
        }
    
        const selectAllCheckbox = this.dialogContainer.querySelector('.select-all-checkbox');
        
        if (this.type === 'runner' || this.type === 'importer') {
            this.savePreferences(selectAllCheckbox.checked, selectedMode, this.useNewItem);
        }
        
        this.options.onSelect(selectedItems, selectedMode, this.options.hasCurrent ? this.useNewItem : true, newName);
        this.closeDialog();
    }

    defaultRenderItem(item) {
        return `
            <div class="item-preview">
                <div class="item-title">${this.truncateText(item.title || '', this.options.truncateLength.title)}</div>
                <div class="item-description">${this.truncateText(item.description || '', this.options.truncateLength.description)}</div>
            </div>
        `;
    }

    toggleSelectAll(checked) {
        const checkboxes = this.dialogContainer.querySelectorAll('.item-checkbox');
        const importBtn = this.dialogContainer.querySelector('.import-btn');
        const statusMessage = this.dialogContainer.querySelector('.status-message');
        const newNameInput = this.dialogContainer.querySelector('.new-name-input');

        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = checked;
            if (checked) {
                this.selectedItems.add(index);
            } else {
                this.selectedItems.delete(index);
            }
        });

        if (this.selectedItems.size === 0) {
            statusMessage.textContent = 'No items selected';
            importBtn.disabled = true;
        } else if (this.useNewItem && newNameInput) {
            const name = newNameInput.value.trim();
            this.options.validateNewName(name).then(isValid => {
                importBtn.disabled = !isValid;
                statusMessage.textContent = !isValid ? 'Please enter a non-empty file name or one not in use' : '';
            });
        } else {
            statusMessage.textContent = '';
            importBtn.disabled = false;
        }
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
