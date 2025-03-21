class AistudioProvider extends BaseAIProvider {
    constructor() {
        super();
        this.mainContentSelector = '.main-content';
        this.markDownConverter = new MarkDownConverter();
        this.maxWaitTime = 120000;
        
        // Message container selectors
        this.messageContainerSelector = '.message-container, [class*="message-row"], ms-chat-turn, div[data-turn-role]';
        
        // User message selectors - updated to better target the nested span structure
        this.userMessageSelector = '.user-message-container .message-content span, [class*="message-row"][class*="items-end"] [class*="message-bubble"] [class*="whitespace"], span[_ngcontent][class*="ng-star-inserted"], div[data-turn-role="User"] span';
        
        // Assistant message selectors
        this.assistantMessageSelector = '.assistant-message-container .message-content, [class*="message-row"][class*="items-start"] [class*="prose"], ms-cmark-node, p[_ngcontent][class*="ng-star-inserted"]';
        
        // Other UI selectors
        this.textboxSelector = '.prompt-textarea, textarea[class*="w-full"]';
        this.sendButtonSelector = 'button[aria-label="Send message"], button[type="submit"]';
        this.stoppedMessageSelector = '.stopped-response-indicator, [class*="secondary"] svg[class*="octagon"]';
        this.completionSelector = '.response-complete-indicator';
    }

    getType() {
        return 'aistudio';
    }

    getMessageContainers() {
        // First try with the specific selector
        const containers = document.querySelectorAll(this.messageContainerSelector);
        if (containers && containers.length > 0) {
            // For parsing.html, we need to filter out containers that don't represent complete turns
            if (document.querySelector('span[_ngcontent][class*="ng-star-inserted"]')) {
                // This is likely the parsing.html format
                
                // Group by data-turn-role if available
                if (document.querySelector('[data-turn-role]')) {
                    return document.querySelectorAll('[data-turn-role]');
                }
                
                // For parsing.html, we need a more specific approach to identify conversation turns
                // Look for ms-chat-message elements which represent complete turns
                const chatMessages = document.querySelectorAll('ms-chat-message');
                if (chatMessages && chatMessages.length > 0) {
                    return chatMessages;
                }
                
                // If we can't find ms-chat-message elements, try to identify conversation turns
                // by looking at the DOM structure
                const mainContainer = document.querySelector('ms-chat-container') || 
                                     document.querySelector('ms-chat') || 
                                     document.querySelector('.chat-container');
                
                if (mainContainer) {
                    // Get direct children that might be conversation turns
                    const directChildren = Array.from(mainContainer.children).filter(child => 
                        child.querySelector('span[_ngcontent][class*="ng-star-inserted"]') ||
                        child.querySelector('p[_ngcontent][class*="ng-star-inserted"]')
                    );
                    
                    if (directChildren.length > 0) {
                        return directChildren;
                    }
                }
                
                // If all else fails, try to group containers by their role attributes
                const allContainers = Array.from(containers);
                const userContainers = allContainers.filter(container => {
                    const userSpans = container.querySelectorAll('span[_ngcontent][class*="ng-star-inserted"]');
                    return userSpans.length > 0 && Array.from(userSpans).some(span => 
                        !span.closest('p[_ngcontent][class*="ng-star-inserted"]'));
                });
                
                const assistantContainers = allContainers.filter(container => {
                    const assistantParagraphs = container.querySelectorAll('p[_ngcontent][class*="ng-star-inserted"]');
                    return assistantParagraphs.length > 0;
                });
                
                // Combine and sort containers to maintain conversation order
                return [...userContainers, ...assistantContainers].sort((a, b) => {
                    const aIndex = allContainers.indexOf(a);
                    const bIndex = allContainers.indexOf(b);
                    return aIndex - bIndex;
                });
            }
            return containers;
        }
        
        // If no containers found, try a more generic approach
        // Look for any div that might contain message content
        return document.querySelectorAll('div:has(span[_ngcontent]), div:has(.message-content), div:has([class*="prose"]), div:has(span[_ngcontent][class*="ng-star-inserted"]), div[data-turn-role]');
    }

    getMaxPartSize() {
        return 30000;
    }

    slideContent(minimized) {
        setTimeout(() => {
            const mainContent = document.querySelector(this.mainContentSelector);
            if (!mainContent) return;
            mainContent.style.marginRight = minimized ? '' : '52%';
        }, 500);
    }

    async getPromptAndResponse(container) {
        if (!container) return null;
        
        try {
            // First try to identify if this is a ms-chat-turn element
            if (container.tagName && container.tagName.toLowerCase() === 'ms-chat-turn') {
                const role = container.getAttribute('role');
                
                if (role === 'user') {
                    // For user messages in ms-chat-turn, look for the content in spans
                    const spans = container.querySelectorAll('span');
                    let questionText = '';
                    spans.forEach(span => {
                        questionText += span.textContent.trim() + ' ';
                    });
                    
                    return {
                        question: questionText.trim(),
                        answer: ''
                    };
                } else if (role === 'assistant') {
                    // For assistant messages in ms-chat-turn
                    const cmarkNode = container.querySelector('ms-cmark-node');
                    const pElements = container.querySelectorAll('p');
                    
                    let answerHtml = '';
                    if (cmarkNode) {
                        answerHtml = cmarkNode.innerHTML.trim();
                    } else if (pElements.length > 0) {
                        pElements.forEach(p => {
                            answerHtml += p.outerHTML;
                        });
                    }
                    
                    const cleanedHtml = this.markDownConverter.remove(
                        answerHtml,
                        ['model-thoughts', '.experimental-mode-disclaimer-container', '.stopped-draft-message']
                    );
                    
                    return {
                        question: '',
                        answer: this.markDownConverter.convert(cleanedHtml)
                    };
                }
            }
            
            // Check if this is a container with data-turn-role attribute
            if (container.hasAttribute('data-turn-role')) {
                const role = container.getAttribute('data-turn-role');
                
                if (role === 'User') {
                    // Find all spans within this container
                    const spans = container.querySelectorAll('span[_ngcontent][class*="ng-star-inserted"]');
                    let questionText = '';
                    
                    spans.forEach(span => {
                        questionText += span.textContent.trim() + ' ';
                    });
                    
                    return {
                        question: questionText.trim(),
                        answer: ''
                    };
                } else if (role === 'Assistant') {
                    // Find all content for the assistant's response
                    const contentElements = container.querySelectorAll('[_ngcontent][class*="ng-star-inserted"]');
                    let answerHtml = '';
                    
                    // Process all content elements, not just paragraphs
                    contentElements.forEach(element => {
                        // Only include direct children of the container to avoid duplicates
                        if (element.parentNode === container || 
                            element.parentNode.parentNode === container) {
                            answerHtml += element.outerHTML;
                        }
                    });
                    
                    const cleanedHtml = this.markDownConverter.remove(
                        answerHtml,
                        ['model-thoughts', '.experimental-mode-disclaimer-container', '.stopped-draft-message']
                    );
                    
                    return {
                        question: '',
                        answer: this.markDownConverter.convert(cleanedHtml)
                    };
                }
            }
            
            // Special handling for parsing.html format
            // Check if this is a ms-chat-message element
            if (container.tagName && container.tagName.toLowerCase() === 'ms-chat-message') {
                // Determine if this is a user or assistant message
                const userContent = container.querySelector('.user-content, [class*="user-message"]');
                const assistantContent = container.querySelector('.assistant-content, [class*="assistant-message"]');
                
                if (userContent) {
                    // This is a user message
                    return {
                        question: userContent.textContent.trim(),
                        answer: ''
                    };
                } else if (assistantContent) {
                    // This is an assistant message
                    return {
                        question: '',
                        answer: this.markDownConverter.convert(assistantContent.innerHTML)
                    };
                }
            }
            
            // For parsing.html, check if the first span is the user message and the rest is the assistant response
            const allSpans = container.querySelectorAll('span[_ngcontent][class*="ng-star-inserted"]');
            const paragraphs = container.querySelectorAll('p[_ngcontent][class*="ng-star-inserted"]');
            
            // If we have spans but no paragraphs, this is likely a user message
            if (allSpans.length > 0 && paragraphs.length === 0) {
                let questionText = '';
                allSpans.forEach(span => {
                    questionText += span.textContent.trim() + ' ';
                });
                
                return {
                    question: questionText.trim(),
                    answer: ''
                };
            }
            
            // If we have paragraphs, this is likely an assistant message
            if (paragraphs.length > 0) {
                // Extract the first paragraph's text to check if it's repeating the user's message
                const firstParagraphText = paragraphs[0].textContent.trim();
                
                // Get all the HTML for the assistant's response
                let answerHtml = '';
                paragraphs.forEach((p, index) => {
                    // Skip the first paragraph if it's repeating the user's message
                    if (index === 0 && firstParagraphText === container.previousElementSibling?.textContent?.trim()) {
                        return;
                    }
                    answerHtml += p.outerHTML;
                });
                
                const cleanedHtml = this.markDownConverter.remove(
                    answerHtml,
                    ['model-thoughts', '.experimental-mode-disclaimer-container', '.stopped-draft-message']
                );
                
                return {
                    question: '',
                    answer: this.markDownConverter.convert(cleanedHtml)
                };
            }
            
            // Fallback to standard selectors
            const userEl = container.querySelector(this.userMessageSelector);
            const assistantEl = container.querySelector(this.assistantMessageSelector);
            
            let questionText = '';
            if (userEl) {
                questionText = userEl.textContent.trim();
            }
            
            let answerHtml = '';
            if (assistantEl) {
                answerHtml = assistantEl.innerHTML.trim();
            }
            
            // Only return non-empty values
            if (!questionText && !answerHtml) {
                return null; // Skip empty containers
            }
            
            // Clean the HTML and convert to markdown
            const cleanedHtml = this.markDownConverter.remove(
                answerHtml,
                ['model-thoughts', '.experimental-mode-disclaimer-container', '.stopped-draft-message']
            );
            
            return {
                question: questionText || "",
                answer: this.markDownConverter.convert(cleanedHtml)
            };
        } catch (error) {
            console.error('Error processing prompt and response:', error);
            return null; // Return null instead of error object to skip this container
        }
    }

    async detectStopped() {
        try {
            const containers = this.getMessageContainers();
            if (containers.length === 0) {
                return false;
            }
            
            const lastContainer = containers[containers.length - 1];
            const stoppedElement = lastContainer.querySelector(this.stoppedMessageSelector);
            
            return !!stoppedElement;
        } catch (error) {
            console.error('Error detecting stopped state:', error);
            return false;
        }
    }

    async submitPrompt(message) {
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
        return document.querySelectorAll(this.completionSelector).length;
    }

    async waitForCompletion(initialContainerCount) {
        const expectedCount = this.countCompletedRequests() + 1;        
        await this.waitForRequestCompletion(expectedCount, initialContainerCount);
    }

    async waitForRequestCompletion(expectedCount, initialContainerCount) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const intervalId = setInterval(() => {
                try {
                    const currentCount = this.countCompletedRequests();
                    const containers = this.getMessageContainers();
                    
                    if (currentCount >= expectedCount && containers.length > initialContainerCount) {
                        clearInterval(intervalId);
                        resolve(true);
                        return;
                    }
                    
                    if (Date.now() - startTime > this.maxWaitTime) {
                        console.warn('Timed out waiting for request completion');
                        clearInterval(intervalId);
                        resolve(false);
                    }
                } catch (error) {
                    console.error('Error in waitForRequestCompletion:', error);
                    clearInterval(intervalId);
                    resolve(false);
                }
            }, 1000);
        });
    }

    async newChat() {
        document.location = 'https://aistudio.google.com/prompts/new_chat';
    }
}