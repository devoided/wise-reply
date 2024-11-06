// background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log('Wise Reply: Extension installed/updated');
});

const RATE_LIMIT_DELAY = 1000;
let lastRequestTime = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateReply') {
        console.log('Wise Reply: Received generate reply request', { 
            tweetContent: request.tweetContent,
            isRefresh: request.isRefresh 
        });
        handleGenerateReply(request, sendResponse);
        return true; // Indicates async response
    }
});

async function handleGenerateReply(request, sendResponse) {
    try {
        const settings = await chrome.storage.local.get(['apiKey', 'examples']);
        
        console.log('Wise Reply: Retrieved settings', {
            hasApiKey: !!settings.apiKey,
            examplesCount: settings?.examples?.length || 0
        });

        if (!settings.apiKey) {
            throw new Error('Please set your Claude AI API key in the extension settings.');
        }

        if (!settings.examples || settings.examples.length < 3) {
            throw new Error('Please add at least 3 training examples in the extension settings.');
        }

        const currentTime = Date.now();
        if (currentTime - lastRequestTime < RATE_LIMIT_DELAY) {
            console.warn('Wise Reply: Rate limit hit', { timeSinceLastRequest: currentTime - lastRequestTime });
            throw new Error('Please wait a moment before generating another reply.');
        }
        lastRequestTime = currentTime;

        console.log('Wise Reply: Constructing messages array from examples', {
            examplesCount: settings.examples.length
        });

        // Construct messages array from examples
        const messages = [];
        settings.examples.forEach(example => {
            messages.push({
                role: "user",
                content: [
                    {
                        type: "text",
                        text: example.post
                    }
                ]
            });
            messages.push({
                role: "assistant",
                content: [
                    {
                        type: "text",
                        text: example.reply
                    }
                ]
            });
        });

        // Add the current tweet as the final message
        messages.push({
            role: "user",
            content: [
                {
                    type: "text",
                    text: request.tweetContent
                }
            ]
        });

        const systemPrompt = `You're an unfiltered, raw voice in social media, an expert at crafting viral tweets with punch and resonance. Your task: create an original reply to the provided post that cuts straight to the truth

First, study the example tweets for their style and structure. Pay close attention to: 
- Brutal honesty
- Simple, direct statements that get to the core
- Single-line sentences with minimal fluff
- Authentic, conversational tone
- Strategic line breaks to emphasize rhythm and impact

Focus on:  
1. Straight-shooting language: 
   - Real, simple, and bold statements
   - No extra words. No explanation. Just truth.

2. Themes of growth, authenticity, and self-respect, touching on: 
   - Personal growth in a raw, no-filter tone
   - Mindset shifts that feel like a slap of reality
   - Simple actions that speak louder than advice
   - Honest reflections on relationships and boundaries

3. Powerful statements and relatability: 
   - Each line should hit like a truth people need to hear
   - Tackle topics with an authentic, unpolished take

4. Independent ideas: 
   - Each tweet should stand alone, making a clear point without explanation
   - Easy for people to resonate with and share

5. Avoid direct copying from examples: 
   - Capture the essence without echoing the examples exactly
   - Deliver familiar sentiments with a fresh twist`;

        const requestBody = {
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 248,
            temperature: request.isRefresh ? 1 : 0,
            system: systemPrompt,
            messages: messages
        };

        console.log('Wise Reply: Sending request to Claude API', {
            messageCount: messages.length,
            systemPromptLength: systemPrompt.length,
            requestBody: requestBody
        });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': settings.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'messages-2023-12-15',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Wise Reply: Received response', {
            status: response.status,
            statusText: response.statusText
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Wise Reply: API request failed', {
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText
            });
            throw new Error(`API request failed (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('Wise Reply: API response data', data);

        if (data.content && Array.isArray(data.content) && data.content.length > 0) {
            const reply = data.content[0].text.trim();
            console.log('Wise Reply: Generated reply', { reply });
            sendResponse({ reply });
        } else {
            console.error('Wise Reply: Unexpected API response structure', data);
            throw new Error('Unexpected API response structure');
        }
    } catch (error) {
        console.error('Wise Reply: Error generating reply', {
            error: error.message,
            stack: error.stack
        });
        sendResponse({ error: `Error: ${error.message}` });
    }
}