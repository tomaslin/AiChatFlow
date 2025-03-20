class BatchProgressDialog {
    constructor() {
        this.dialogContainer = null;
        this.currentMessage = '';
        this.currentIndex = 0;
        this.totalMessages = 0;
        this.isStopped = false;
        this.onStopCallback = null;
    }

    createDialog(totalMessages) {
        this.closeDialog();
        this.totalMessages = totalMessages;
        this.currentIndex = 0;
        this.isStopped = false;

        this.dialogContainer = document.createElement('div');
        this.dialogContainer.className = 'batch-progress-overlay';
        this.dialogContainer.id = 'batch-progress';
        this.dialogContainer.innerHTML = this.getDialogHTML();
        document.body.appendChild(this.dialogContainer);
        
        this.setupEventListeners();
    }

    getDialogHTML() {
        return `
        <div class="batch-progress-dialog">
            <div class="batch-progress-header">
                <span class="batch-progress-title">Processing Batch</span>
                <span class="batch-progress-counter">0 of ${this.totalMessages}</span>
            </div>
            <div class="batch-progress-content">
                <div class="batch-progress-message">Initializing...</div>
            </div>
            <div class="batch-progress-footer">
                <button class="batch-progress-stop-btn">Stop</button>
            </div>
        </div>
        `;
    }

    setupEventListeners() {
        const stopBtn = this.dialogContainer.querySelector('.batch-progress-stop-btn');
        stopBtn.addEventListener('click', () => {
            this.isStopped = true;
            if (this.onStopCallback) {
                this.onStopCallback();
            }
            stopBtn.disabled = true;
            stopBtn.textContent = 'Stopping...';
        });
    }

    updateProgress(message, index) {
        if (!this.dialogContainer) return;
        
        this.currentMessage = message;
        this.currentIndex = index;
        
        const counterElement = this.dialogContainer.querySelector('.batch-progress-counter');
        const messageElement = this.dialogContainer.querySelector('.batch-progress-message');
        
        if (counterElement) {
            counterElement.textContent = `${index} of ${this.totalMessages}`;
        }
        
        if (messageElement) {
            // Truncate message to approximately 120 characters
            const truncatedMessage = message.length > 120 ? 
                message.substring(0, 117) + '...' : 
                message;
            messageElement.textContent = truncatedMessage;
        }
    }

    closeDialog() {
        if (this.dialogContainer) {
            this.dialogContainer.remove();
            this.dialogContainer = null;
        }
    }

    isBatchStopped() {
        return this.isStopped;
    }

    setOnStopCallback(callback) {
        this.onStopCallback = callback;
    }
}