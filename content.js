// content.js

// Function to inject the Wise Reply button into a tweet
function injectEngageButton(tweetElement) {
    // Skip if button already exists
    if (tweetElement.querySelector('.wise-reply-btn')) return;

    const tweetActions = tweetElement.querySelector('[data-testid="reply"]')?.closest('div[role="group"]');
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

    button.firstElementChild.addEventListener('click', (e) => handleEngageClick(e, tweetElement));
    tweetActions.appendChild(button);
}

// Function to inject refresh button into toolbar
function injectRefreshButton(toolbar, tweetElement) {
    if (toolbar.querySelector('.wise-reply-refresh')) return;

    const refreshButton = document.createElement('div');
    refreshButton.className = 'css-175oi2r r-14tvyh0 r-cpa5s6';
    refreshButton.innerHTML = `
        <button aria-label="Regenerate reply" role="button" 
            class="css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l" 
            type="button" 
            style="background-color: rgba(0, 0, 0, 0); border-color: rgba(0, 0, 0, 0);">
            <div dir="ltr" 
                class="css-146c3p1 r-bcqeeo r-qvutc0 r-37j5jr r-q4m81j r-a023e6 r-rjixqe r-b88u0q r-1awozwy r-6koalj r-18u37iz r-16y2uox r-1777fci" 
                style="text-overflow: unset;">
                <svg viewBox="0 0 24 24" 
                    class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1xvli5t r-1hdv0qi">
                    <g>
                        <path d="M16.3 12.6c-.2-.2-.4-.3-.7-.3s-.5.1-.7.3L12 15.5l-3-2.9c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4l3.7 3.7c.2.2.4.3.7.3s.5-.1.7-.3l3.7-3.7c.4-.4.4-1 0-1.4zm5.7-.6c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2s10 4.5 10 10zm-2 0c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8 8-3.6 8-8z"/>
                    </g>
                </svg>
            </div>
        </button>
    `;

    refreshButton.querySelector('button').addEventListener('click', async () => {
        const editor = document.querySelector('[data-testid="tweetTextarea_0"]');
        if (editor) {
            // Clear existing content
            editor.textContent = '';
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            // Generate new reply
            handleEngageClick(new Event('click'), tweetElement);
        }
    });

    // Find the tablist element
    const tabList = toolbar.querySelector('[role="tablist"]');
    if (tabList) {
        // Append to the end of the tablist
        tabList.appendChild(refreshButton);
    }
}

// Function to handle the click event of the Wise Reply button
async function handleEngageClick(event, tweetElement, isRefresh = false) {
    event.preventDefault();
    event.stopPropagation();

    // Extract tweet content
    const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
    if (!tweetTextElement) {
        alert('Could not find tweet content');
        return;
    }
    const tweetContent = tweetTextElement.textContent;

    // Show loading indicator
    const loadingIndicator = createLoadingIndicator();
    document.body.appendChild(loadingIndicator);

    try {
        // Click the native reply button to open the reply box
        const replyButton = tweetElement.querySelector('[data-testid="reply"]');
        if (replyButton) {
            replyButton.click();
            // Wait for the reply box to appear
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Wait for the reply textarea and toolbar
        const replyBox = await waitForElement('[data-testid="tweetTextarea_0"]', 5000);
        const toolbar = await waitForElement('[role="navigation"]', 5000);
        
        if (!replyBox) {
            throw new Error('Could not find reply textarea');
        }

        // Generate the reply
        const response = await chrome.runtime.sendMessage({
            action: 'generateReply',
            tweetContent,
            isRefresh: isRefresh
        });

        if (response.error) {
            throw new Error(response.error);
        }

        // Insert the reply into the comment box
        replyBox.focus();
        document.execCommand('insertText', false, response.reply);

        // Trigger input event to ensure X recognizes the change
        replyBox.dispatchEvent(new Event('input', { bubbles: true }));

        // Inject refresh button into toolbar if found
        if (toolbar) {
            injectRefreshButton(toolbar, tweetElement);
        }

    } catch (error) {
        console.error('Wise Reply Error:', error);
        alert(error.message);
    } finally {
        loadingIndicator.remove();
    }
}

// Function to create a loading indicator
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

// Helper function to wait for an element to appear
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

// Initialize the extension
function init() {
    // Observe DOM changes to inject the button into new tweets
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if node itself is a tweet
                        if (node.matches('article[data-testid="tweet"]')) {
                            injectEngageButton(node);
                        }
                        // Check for tweets within the node
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

    // Inject button into existing tweets
    document.querySelectorAll('article[data-testid="tweet"]').forEach(injectEngageButton);
}

// Start the extension
init();