class ClaudeProvider extends BaseAIProvider {
    constructor() {
      super();
      this.mainContentSelector = 'main';
      this.markDownConverter = new MarkDownConverter();
      this.maxWaitTime = 120000;
      this.messageContainerSelector = '[data-message-id]';
      this.userMessageSelector = '.human-message-content';
      this.assistantMessageSelector = '.prose';
      this.textboxSelector = 'div.ProseMirror[role="textbox"]';
      this.sendButtonSelector = 'button[data-testid="send-message-button"]';
      this.thinkingIndicatorSelector = 'div[data-testid="thinking-indicator"]';
    }
  
    getType() {
      return 'claude';
    }
  
    getMessageContainers() {
      return document.querySelectorAll(this.messageContainerSelector);
    }
  
    getMaxPartSize() {
      return 30000;
    }
  
    slideContent(minimized) {
      setTimeout(() => {
        const mainContent = document.querySelector(this.mainContentSelector);
        if (!mainContent) return;
  
        mainContent.style.marginRight = minimized ? '' : '52%';
        mainContent.style.transition = 'margin-right 0.3s ease';
      }, 500);
    }
  
    async getPromptAndResponse(container) {
      if (!container) return null;
      
      const questionEl = container.querySelector(this.userMessageSelector);
      const answerEl = container.querySelector(this.assistantMessageSelector);
      
      if (questionEl && answerEl) {
        try {
          const cleanedHtml = this.markDownConverter.remove(
            answerEl.innerHTML.trim(),
            []  // We'll define what to remove in later prompts
          );
          return {
            question: questionEl.textContent.trim(),
            answer: this.markDownConverter.convert(cleanedHtml)
          };
        } catch (error) {
          console.error('Error processing prompt and response:', error);
          return {
            question: questionEl.textContent.trim(),
            answer: 'Error processing response'
          };
        }
      }
      return null;
    }
  
    async detectStopped() {
      // Claude doesn't have an explicit "stopped" state in the UI
      // Will need to refine this based on further analysis
      try {
        return false; // Placeholder
      } catch (error) {
        console.error('Error detecting stopped state:', error);
        return false;
      }
    }
  
    async fillTextbox(message) {
      try {
        const textbox = await this.waitForElement(this.textboxSelector);
        if (!textbox) {
          throw new Error('Could not find textbox element');
        }
        
        // Set content and dispatch input event
        textbox.innerHTML = message;
        textbox.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true
        }));
        
        const sendButton = await this.waitForElement(this.sendButtonSelector);
        if (!sendButton) {
          throw new Error('Could not find send button');
        }
        
        sendButton.click();
      } catch (error) {
        console.error('Error filling textbox:', error);
        throw error;
      }
    }
  
    countCompletedRequests() {
      // Claude doesn't have a completion counter element like Gemini
      // We'll need a different approach for tracking completion
      // This will be refined in later prompts
      return document.querySelectorAll('.prose').length;
    }
  
    async waitForCompletion(initialContainerCount) {
      // This is a placeholder implementation that will be refined
      // in the MESSAGE_COMPLETION_STOPPED_REFINEMENT prompt
      const thinkingIndicator = this.thinkingIndicatorSelector;
      return new Promise((resolve) => {
        const startTime = Date.now();
        const intervalId = setInterval(() => {
          try {
            const containers = this.getMessageContainers();
            const currentCount = containers.length;
            
            if (currentCount > initialContainerCount) {
              const indicator = document.querySelector(thinkingIndicator);
              if (!indicator || indicator.classList.contains('opacity-0')) {
                clearInterval(intervalId);
                resolve(true);
                return;
              }
            }
            
            if (Date.now() - startTime > this.maxWaitTime) {
              console.warn('Timed out waiting for request completion');
              clearInterval(intervalId);
              resolve(false);
            }
          } catch (error) {
            console.error('Error in waitForCompletion:', error);
            clearInterval(intervalId);
            resolve(false);
          }
        }, 500);
      });
    }
  
    async retrieveResponse() {
      try {
        const containers = this.getMessageContainers();
        if (containers.length === 0) {
          return null;
        }
        const lastContainer = containers[containers.length - 1];
        return await this.getPromptAndResponse(lastContainer);
      } catch (error) {
        console.error('Error retrieving response:', error);
        return null;
      }
    }
  }