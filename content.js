// Inject the engagement button into Twitter's UI
function injectEngageButton(tweetElement) {
    const tweetActions = tweetElement.querySelector('[data-testid="reply"]')?.closest('div[role="group"]');
    
    if (tweetActions && !tweetActions.querySelector('.wise-reply-btn')) {
        const button = document.createElement('div');
        button.innerHTML = `
            <button class="wise-reply-btn">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z">
                    </path>
                </svg>
                <span>Wise Reply</span>
            </button>
        `;
        
        button.firstElementChild.addEventListener('click', (e) => handleEngageClick(e, tweetElement));
        tweetActions.appendChild(button);
    }
}

async function handleEngageClick(event, tweetElement) {
    event.preventDefault();
    console.log('Wise Reply: Engage button clicked');
    
    const replyButton = tweetElement.querySelector('[data-testid="reply"]');
    if (replyButton) {
        console.log('Wise Reply: Clicking reply button');
        replyButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const tweet = tweetElement.querySelector('[data-testid="tweetText"]');
    if (!tweet) {
        const error = 'Tweet content not found';
        console.error('Wise Reply:', error);
        alert('Error: ' + error);
        return;
    }

    const tweetContent = tweet.textContent;
    console.log('Wise Reply: Found tweet content', { tweetContent });
    
    // Wait for the Draft.js editor container
    const editorContainer = await waitForElement('[data-testid="tweetTextarea_0"], [data-testid="tweetTextarea_1"]');
    if (!editorContainer) {
        const error = 'Reply box not found';
        console.error('Wise Reply:', error);
        alert('Error: ' + error + '. Please try clicking reply first, then click Wise Reply.');
        return;
    }

    console.log('Wise Reply: Found editor container', editorContainer);

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'wise-reply-loading';
    loadingIndicator.innerHTML = `
        <div class="wise-reply-modal">
            <div class="wise-reply-progress">
                <div class="wise-reply-progress-bar"></div>
            </div>
            
            <div class="wise-reply-content">
                <div class="wise-reply-spinner-container">
                    <div class="wise-reply-spinner">
                        <div class="wise-reply-spinner-ring"></div>
                    </div>
                </div>
                
                <div class="wise-reply-text">
                    <h3 class="wise-reply-title">Generating Reply</h3>
                    <p class="wise-reply-subtitle">Crafting the perfect response...</p>
                </div>
            </div>
        </div>
    `;
        
    document.body.appendChild(loadingIndicator);

    try {
        console.log('Wise Reply: Sending message to background script');
        const response = await chrome.runtime.sendMessage({
            action: 'generateReply',
            tweetContent: tweetContent,
        });

        console.log('Wise Reply: Received response from background script', response);

        if (response.error) {
            throw new Error(response.error);
        }

        // Focus the editor container first
        editorContainer.focus();

        // Try to find the actual editable element
        const possibleEditors = [
            editorContainer.querySelector('.DraftEditor-root'),
            editorContainer.querySelector('[contenteditable="true"]'),
            editorContainer.querySelector('.public-DraftEditor-content'),
            editorContainer.querySelector('.DraftEditor-editorContainer'),
            editorContainer
        ];

        console.log('Wise Reply: Possible editors found:', possibleEditors);

        const draftEditor = possibleEditors.find(editor => editor && editor.isContentEditable);
        
        if (!draftEditor) {
            console.error('Wise Reply: Could not find editable element. Editor container:', editorContainer);
            console.error('Wise Reply: Editor container HTML:', editorContainer.outerHTML);
            throw new Error('Could not find editable element');
        }

        console.log('Wise Reply: Found editable element', draftEditor);

        // Focus the editor
        draftEditor.focus();

        // Simulate paste event to insert the reply
        function simulatePaste(element, text) {
            const clipboardData = new DataTransfer();
            clipboardData.setData('text/plain', text);

            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: clipboardData
            });

            element.dispatchEvent(pasteEvent);
        }

        simulatePaste(draftEditor, response.reply);

        // Create and dispatch necessary events
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: response.reply
        });
        draftEditor.dispatchEvent(inputEvent);

        // Also dispatch a change event
        const changeEvent = new Event('change', { bubbles: true });
        draftEditor.dispatchEvent(changeEvent);

        console.log('Wise Reply: Reply inserted', {
            reply: response.reply,
            editorContent: draftEditor.textContent
        });

        // Add refresh button
        const refreshButton = document.createElement('button');
        refreshButton.className = 'wise-reply-refresh';
        refreshButton.innerHTML = `
            <div class="css-175oi2r r-1awozwy r-18u37iz r-1q142lx">
                <svg viewBox="0 0 24 24" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1xvli5t r-1hdv0qi">
                    <g>
                        <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path>
                    </g>
                </svg>
            </div>
        `;        
        refreshButton.addEventListener('click', () => handleEngageClick(event, tweetElement));
        draftEditor.parentElement.appendChild(refreshButton);

    } catch (error) {
        console.error('Wise Reply: Error in handleEngageClick', {
            error: error.message,
            stack: error.stack
        });
        alert(`Error: ${error.message}`);
    } finally {
        loadingIndicator.remove();
    }
}


// Helper function to wait for an element
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}

// Initialize
function init() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches('article[data-testid="tweet"]')) {
                            injectEngageButton(node);
                        } else {
                            const tweets = node.querySelectorAll('article[data-testid="tweet"]');
                            tweets.forEach(injectEngageButton);
                        }
                    }
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('article[data-testid="tweet"]').forEach(injectEngageButton);
}

init();