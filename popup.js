document.addEventListener('DOMContentLoaded', function() {
    console.log('Wise Reply: Popup initialized');
    
    const state = {
        activeView: 'home',
        apiKey: '',
        examples: []
    };

    // Load saved settings
    chrome.storage.local.get(['apiKey', 'examples'], function(result) {
        console.log('Wise Reply: Loaded settings', {
            hasApiKey: !!result.apiKey,
            examplesCount: result?.examples?.length || 0
        });
        
        state.apiKey = result.apiKey || '';
        state.examples = result.examples || [];
        
        document.getElementById('apiKeyInput').value = state.apiKey;
        renderExamples();
        updateExampleCounter();
    });

    // View switching with animation
    document.getElementById('settingsBtn').addEventListener('click', function() {
        const button = this;
        button.classList.add('rotate-180');
        setTimeout(() => button.classList.remove('rotate-180'), 300);
        
        state.activeView = state.activeView === 'home' ? 'settings' : 'home';
        console.log('Wise Reply: Switched view', { activeView: state.activeView });
        updateView();
    });

    // API Key handling with visual feedback
    const apiKeyInput = document.getElementById('apiKeyInput');
    apiKeyInput.addEventListener('change', function(e) {
        state.apiKey = e.target.value;
        console.log('Wise Reply: API key updated');
        
        // Show success animation
        const checkmark = document.createElement('div');
        checkmark.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-green-500 transform scale-0 transition-transform';
        checkmark.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        `;
        apiKeyInput.parentElement.appendChild(checkmark);
        
        setTimeout(() => {
            checkmark.classList.remove('scale-0');
            checkmark.classList.add('scale-100');
        }, 50);
        
        setTimeout(() => {
            checkmark.classList.add('scale-0');
            setTimeout(() => checkmark.remove(), 200);
        }, 1500);
        
        saveSettings();
    });

    // Add example with animation
    document.getElementById('addExampleBtn').addEventListener('click', function() {
        if (state.examples.length < 10) {
            state.examples.push({ post: '', reply: '' });
            console.log('Wise Reply: Added new example', { totalExamples: state.examples.length });
            
            renderExamples();
            
            // Scroll to new example with smooth animation
            const newExample = document.querySelector('#examplesContainer > div:last-child');
            newExample.scrollIntoView({ behavior: 'smooth', block: 'end' });
            
            // Add entrance animation
            newExample.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                newExample.classList.remove('scale-95', 'opacity-0');
                newExample.classList.add('scale-100', 'opacity-100');
            }, 50);
        }
    });

    // Save training data with loading state
    document.getElementById('saveTrainingBtn').addEventListener('click', async function() {
        const button = this;
        if (state.examples.length >= 3) {
            // Show loading state
            const originalText = button.innerHTML;
            button.innerHTML = `
                <div class="flex items-center justify-center space-x-2">
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                </div>
            `;
            button.disabled = true;

            try {
                await saveSettings();
                
                // Show success state
                button.innerHTML = `
                    <div class="flex items-center justify-center space-x-2">
                        <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Saved Successfully!</span>
                    </div>
                `;
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);
                
            } catch (error) {
                // Show error state
                button.innerHTML = `
                    <div class="flex items-center justify-center space-x-2 text-red-100">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>Error Saving</span>
                    </div>
                `;
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);
            }
        } else {
            console.warn('Wise Reply: Not enough examples to save', { count: state.examples.length });
            // Show warning toast
            showToast('Please add at least 3 examples before saving', 'warning');
        }
    });

    function updateView() {
        const homeView = document.getElementById('homeView');
        const settingsView = document.getElementById('settingsView');
        const settingsBtn = document.getElementById('settingsBtn');
        
        // Add fade transition
        homeView.style.transition = 'opacity 0.2s ease-in-out';
        settingsView.style.transition = 'opacity 0.2s ease-in-out';
        
        if (state.activeView === 'home') {
            homeView.style.opacity = '0';
            settingsView.style.opacity = '0';
            
            setTimeout(() => {
                homeView.classList.remove('hidden');
                settingsView.classList.add('hidden');
                
                setTimeout(() => {
                    homeView.style.opacity = '1';
                }, 50);
            }, 200);
            
            settingsBtn.classList.remove('bg-gray-100');
        } else {
            homeView.style.opacity = '0';
            settingsView.style.opacity = '0';
            
            setTimeout(() => {
                homeView.classList.add('hidden');
                settingsView.classList.remove('hidden');
                
                setTimeout(() => {
                    settingsView.style.opacity = '1';
                }, 50);
            }, 200);
            
            settingsBtn.classList.add('bg-gray-100');
        }
        
        console.log('Wise Reply: View updated', { activeView: state.activeView });
    }

    function updateExampleCounter() {
        const counter = document.getElementById('exampleCounter');
        counter.textContent = `${state.examples.length}/10 examples`;
        
        // Add color coding
        if (state.examples.length < 3) {
            counter.classList.add('text-red-500');
            counter.classList.remove('text-green-500', 'text-gray-500');
        } else if (state.examples.length === 10) {
            counter.classList.add('text-green-500');
            counter.classList.remove('text-red-500', 'text-gray-500');
        } else {
            counter.classList.add('text-gray-500');
            counter.classList.remove('text-red-500', 'text-green-500');
        }
    }

    function renderExamples() {
        console.log('Wise Reply: Rendering examples', { count: state.examples.length });
        
        const container = document.getElementById('examplesContainer');
        container.innerHTML = '';

        state.examples.forEach((example, index) => {
            const exampleEl = createExampleElement(example, index);
            container.appendChild(exampleEl);
        });

        const addExampleBtn = document.getElementById('addExampleBtn');
        const saveTrainingBtn = document.getElementById('saveTrainingBtn');
        
        addExampleBtn.disabled = state.examples.length >= 10;
        saveTrainingBtn.disabled = state.examples.length < 3;

        // Update button states visually
        if (addExampleBtn.disabled) {
            addExampleBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            addExampleBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        if (saveTrainingBtn.disabled) {
            saveTrainingBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            saveTrainingBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        updateExampleCounter();
    }

    function createExampleElement(example, index) {
        console.log('Wise Reply: Creating example element', { index, example });
        
        const div = document.createElement('div');
        div.className = 'p-4 bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-gray-800 transition-all hover:border-blue-500 dark:hover:border-blue-400';
        div.innerHTML = `
            <div class="space-y-3">
                <textarea 
                    class="w-full p-3 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg resize-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Example post"
                    rows="2">${example.post}</textarea>
                <textarea 
                    class="w-full p-3 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg resize-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Example reply"
                    rows="2">${example.reply}</textarea>
                <button class="text-red-500 hover:text-red-600 text-sm font-medium transition-colors flex items-center space-x-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Remove</span>
                </button>
            </div>
        `;

        // Add event listeners with debouncing
        const postTextarea = div.querySelector('textarea:first-child');
        const replyTextarea = div.querySelector('textarea:last-of-type');
        const removeBtn = div.querySelector('button');

        let saveTimeout;
        const debouncedSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveSettings, 500);
        };

        postTextarea.addEventListener('input', (e) => {
            state.examples[index].post = e.target.value;
            console.log('Wise Reply: Updated example post', { index, value: e.target.value });
            debouncedSave();
        });

        replyTextarea.addEventListener('input', (e) => {
            state.examples[index].reply = e.target.value;
            console.log('Wise Reply: Updated example reply', { index, value: e.target.value });
            debouncedSave();
        });

        removeBtn.addEventListener('click', () => {
            div.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                console.log('Wise Reply: Removing example', { index });
                state.examples.splice(index, 1);
                renderExamples();
                saveSettings();
            }, 200);
        });

        return div;
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300 translate-y-full`;
        
        switch(type) {
            case 'warning':
                toast.classList.add('bg-yellow-500', 'text-white');
                break;
            case 'error':
                toast.classList.add('bg-red-500', 'text-white');
                break;
            default:
                toast.classList.add('bg-blue-500', 'text-white');
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.remove('translate-y-full'), 100);
        setTimeout(() => {
            toast.classList.add('translate-y-full');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function saveSettings() {
        return new Promise((resolve, reject) => {
            console.log('Wise Reply: Saving settings', {
                hasApiKey: !!state.apiKey,
                examplesCount: state.examples.length,
                examples: state.examples
            });
            
            chrome.storage.local.set({
                apiKey: state.apiKey,
                examples: state.examples
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Wise Reply: Error saving settings', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('Wise Reply: Settings saved successfully');
                    resolve();
                }
            });
        });
    }

    // Platform selection with ripple effect
    document.getElementById('twitterBtn').addEventListener('click', function(e) {
        console.log('Wise Reply: Twitter platform selected');
        
        // Add ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'absolute bg-white/20 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none';
        ripple.style.width = ripple.style.height = Math.max(this.clientWidth, this.clientHeight) + 'px';
        ripple.style.left = e.clientX - this.offsetLeft + 'px';
        ripple.style.top = e.clientY - this.offsetTop + 'px';
        ripple.style.animation = 'ripple 0.6s linear';
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });

    // Initial view update
    updateView();
    console.log('Wise Reply: Initial setup complete');
});