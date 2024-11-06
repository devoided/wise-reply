// Global state to avoid duplicate button injection
const processedTweets = new Set();

function injectEngageButton(tweet) {
    // Skip if already processed
    if (processedTweets.has(tweet) || tweet.querySelector('.wise-reply-btn')) return;
    
    const tweetActions = tweet.querySelector('[data-testid="reply"]')?.closest('div[role="group"]');
    if (!tweetActions) return;

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
    
    button.firstElementChild.addEventListener('click', (e) => handleEngageClick(e, tweet));
    tweetActions.appendChild(button);
    processedTweets.add(tweet);
}

async function handleEngageClick(event, tweetElement) {
    event.preventDefault();
    event.stopPropagation();

    // Extract tweet content first to validate we have something to work with
    const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
    if (!tweetTextElement) {
        alert('Could not find tweet content');
        return;
    }
    const tweetContent = tweetTextElement.textContent;

    // Show loading indicator immediately
    const loadingIndicator = createLoadingIndicator();
    document.body.appendChild(loadingIndicator);

    try {
        // First clear any existing reply textarea if it exists
        const existingEditor = document.querySelector('[data-testid="tweetTextarea_0"]');
        if (existingEditor) {
            await clearEditorContent(existingEditor);
        }

        // Click the native reply button to open modal
        const replyButton = tweetElement.querySelector('[data-testid="reply"]');
        if (replyButton) {
            replyButton.click();
            // Wait for modal animation
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Find and clear the reply textarea that appears after clicking reply
        const editor = await waitForElement('[data-testid="tweetTextarea_0"]', 2000);
        if (!editor) {
            throw new Error('Could not find reply textarea');
        }

        // Clear any pre-filled content
        await clearEditorContent(editor);

        // Generate the reply while modal is opening
        const response = await chrome.runtime.sendMessage({
            action: 'generateReply',
            tweetContent
        });

        if (response.error) {
            throw new Error(response.error);
        }

        // Insert the new reply
        await insertReplyText(editor, response.reply);

        // Add refresh button if needed
        addRefreshButton(editor, event, tweetElement);

    } catch (error) {
        console.error('Wise Reply Error:', error);
        alert(error.message);
    } finally {
        loadingIndicator.remove();
    }
}

async function clearEditorContent(editor) {
    // Clear the content
    editor.textContent = '';
    
    // Dispatch necessary events
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Give Twitter's UI time to process the clearing
    await new Promise(resolve => setTimeout(resolve, 100));
}

async function insertReplyText(editor, text) {
    // Focus the editor
    editor.focus();

    // Create and dispatch paste event
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);

    const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData
    });

    // Dispatch paste event
    editor.dispatchEvent(pasteEvent);

    // Fallback: If paste doesn't work, set content directly
    if (!editor.textContent) {
        editor.textContent = text;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Wait for content to be inserted
    await new Promise(resolve => setTimeout(resolve, 100));
}

function createLoadingIndicator() {
    const div = document.createElement('div');
    div.className = 'wise-reply-loading';
    div.innerHTML = `
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
    return div;
}

function addRefreshButton(editor, originalEvent, tweetElement) {
    // Remove existing refresh button if present
    const existingButton = editor.parentElement.querySelector('.wise-reply-refresh');
    if (existingButton) {
        existingButton.remove();
    }

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
    
    refreshButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        await clearEditorContent(editor);
        handleEngageClick(originalEvent, tweetElement);
    });

    editor.parentElement.appendChild(refreshButton);
}

function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
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
    // Create one observer for all tweets
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if node itself is a tweet
                        if (node.matches('article[data-testid="tweet"]')) {
                            injectEngageButton(node);
                        }
                        // Check children for tweets
                        const tweets = node.querySelectorAll('article[data-testid="tweet"]');
                        tweets.forEach(injectEngageButton);
                    }
                });
            }
        });
    });

    // Start observing
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });

    // Process any existing tweets
    document.querySelectorAll('article[data-testid="tweet"]').forEach(injectEngageButton);
}

// Start the extension
init();