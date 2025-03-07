class SimpleChoice {
    constructor(options = {}) {
        this.dialogContainer = null;
        this.options = {
            title: options.title || 'Input Required',
            buttonText: options.buttonText || 'Confirm',
            placeholder: options.placeholder || '',
            initialValue: options.initialValue || '',
            onConfirm: options.onConfirm || (() => {}),
            validator: options.validator || (() => true)
        }
    }

    createDialog() {
        this.closeDialog();
        this.dialogContainer = document.createElement('div');
        this.dialogContainer.className = 'modal-overlay';
        this.dialogContainer.id = 'simple-choice';
        this.dialogContainer.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">${this.options.title}</h3>
                    <button class="modal-close-btn">×</button>
                </div>
                <div class="modal-content">
                    <input type="text" class="simple-input" placeholder="${this.options.placeholder}" value="${this.options.initialValue}">
                    <div class="error-message"></div>
                </div>
                <div class="modal-footer">
                    <button class="import-btn">${this.options.buttonText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.dialogContainer);
        this.setupEventListeners();
        
        // Focus the input field
        setTimeout(() => {
            const input = this.dialogContainer.querySelector('.simple-input');
            input.focus();
            input.select();
        }, 100);
    }

    closeDialog() {
        if (this.dialogContainer) {
            this.dialogContainer.remove();
            this.dialogContainer = null;
        }
    }

    setupEventListeners() {
        const closeBtn = this.dialogContainer.querySelector('.modal-close-btn');
        const confirmBtn = this.dialogContainer.querySelector('.import-btn');
        const input = this.dialogContainer.querySelector('.simple-input');
        const errorMessage = this.dialogContainer.querySelector('.error-message');
        
        closeBtn.addEventListener('click', () => this.closeDialog());
        
        const handleConfirm = () => {
            const value = input.value.trim();
            const validationResult = this.options.validator(value);
            
            if (validationResult === true) {
                this.options.onConfirm(value);
                this.closeDialog();
            } else {
                errorMessage.textContent = typeof validationResult === 'string' 
                    ? validationResult 
                    : 'Invalid input';
                errorMessage.style.display = 'block';
            }
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            }
        });
        
        this.dialogContainer.addEventListener('click', (e) => {
            if (e.target === this.dialogContainer) {
                this.closeDialog();
            }
        });
    }
}