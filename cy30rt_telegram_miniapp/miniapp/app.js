// Cy30rt_AI - Complete with Stop Button, Conversation Memory, and Hausa Support
// Created by Abdulbasid Yakubu (cy30rt)

const API_URL = "https://cy30rt-ai.onrender.com";

// Global variables
let currentLanguage = "en";
let audioInitialized = false;
let chatHistory = [];
let currentChatId = null;
let recordingStatusDiv = null;
let currentAbortController = null;
let isGenerating = false;

// Voice settings
let voiceSpeed = 1.0;
let voicePitch = 1.0;
let autoPlayEnabled = false;
let voiceReadbackEnabled = false;

// ============ CONVERSATION MEMORY ============
// Stores chat history per session for context understanding
let conversationMemory = {};

function getConversationContext(chatId, lastNMessages = 5) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat || !chat.messages) return [];
    
    // Get last N messages for context
    const recentMessages = chat.messages.slice(-lastNMessages);
    return recentMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));
}

function addToConversationMemory(chatId, role, content) {
    if (!conversationMemory[chatId]) {
        conversationMemory[chatId] = [];
    }
    conversationMemory[chatId].push({ role, content, timestamp: Date.now() });
    
    // Keep only last 50 messages per chat
    if (conversationMemory[chatId].length > 50) {
        conversationMemory[chatId] = conversationMemory[chatId].slice(-50);
    }
}

// Voice map
const voiceMap = {
    'en': 'en-US', 'ar': 'ar-SA', 'es': 'es-ES',
    'fr': 'fr-FR', 'de': 'de-DE', 'hi': 'hi-IN',
    'ha': 'ha-NG', 'pt': 'pt-BR', 'ru': 'ru-RU',
    'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR',
    'tr': 'tr-TR', 'fa': 'fa-IR', 'ur': 'ur-PK'
};

// ============ CHAT HISTORY ============
function initChatHistory() {
    const saved = localStorage.getItem("cy30rt_chats");
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
        } catch (e) { chatHistory = []; }
    }
    
    // Load saved conversation memory
    const savedMemory = localStorage.getItem("cy30rt_memory");
    if (savedMemory) {
        try {
            conversationMemory = JSON.parse(savedMemory);
        } catch(e) {}
    }

    if (chatHistory.length === 0) {
        createNewChat();
    } else {
        currentChatId = chatHistory[0].id;
        loadCurrentChat();
    }
    renderHistoryList();
}

function saveChats() {
    localStorage.setItem("cy30rt_chats", JSON.stringify(chatHistory));
    localStorage.setItem("cy30rt_memory", JSON.stringify(conversationMemory));
}

function createNewChat() {
    const newId = Date.now().toString();
    const newChat = {
        id: newId,
        title: "New Chat",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    chatHistory.unshift(newChat);
    currentChatId = newId;
    saveChats();
    renderHistoryList();
    loadCurrentChat();
}

function switchChat(chatId) {
    currentChatId = chatId;
    loadCurrentChat();
    renderHistoryList();
}

function loadCurrentChat() {
    const chat = chatHistory.find(c => c.id === currentChatId);
    const container = document.getElementById("messagesContainer");

    if (!chat || chat.messages.length === 0) {
        container.innerHTML = getWelcomeHTML();
        return;
    }

    container.innerHTML = '';
    chat.messages.forEach(msg => {
        if (msg.role === 'user') {
            addMessageToUI('user', msg.content, msg.timestamp);
        } else if (msg.role === 'assistant') {
            addMessageToUI('assistant', msg.content, msg.timestamp);
        }
    });
    scrollToBottom();
}

function renderHistoryList() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    if (chatHistory.length === 0) {
        historyList.innerHTML = '<div style="padding: 12px; text-align: center; color: #666;">No chats yet</div>';
        return;
    }

    historyList.innerHTML = chatHistory.map(chat => `
        <div class="history-item ${currentChatId === chat.id ? 'active' : ''}" onclick="switchChat('${chat.id}')">
            ${escapeHtml(chat.title.substring(0, 30))}
        </div>
    `).join('');
}

function addMessageToCurrentChat(role, content) {
    const chat = chatHistory.find(c => c.id === currentChatId);
    if (!chat) return;

    chat.messages.push({
        role: role,
        content: content,
        timestamp: new Date().toISOString()
    });
    chat.updatedAt = new Date().toISOString();
    
    // Add to conversation memory for context
    addToConversationMemory(currentChatId, role, content);

    if (role === 'user' && chat.messages.length === 1) {
        chat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
    }

    saveChats();
    renderHistoryList();
}

function getWelcomeHTML() {
    return `
        <div class="welcome-screen">
            <div class="welcome-icon">🤖</div>
            <h1>Cy30rt_AI</h1>
            <p>How can I help you with cybersecurity today?</p>
            <div class="example-prompts">
                <button class="example-btn" onclick="sendExample('What is SQL injection? Explain with examples.')">What is SQL injection?</button>
                <button class="example-btn" onclick="sendExample('How to perform network reconnaissance?')">How to perform network reconnaissance?</button>
                <button class="example-btn" onclick="sendExample('Explain Cross-Site Scripting (XSS) attacks.')">Explain XSS attacks</button>
            </div>
            <div class="creator-note">
                Created by Abdulbasid Yakubu (cy30rt) | Type /help for commands
            </div>
        </div>
    `;
}

function addMessageToUI(role, content, timestamp = null) {
    const container = document.getElementById("messagesContainer");
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `
        <div class="message-avatar">${role === 'user' ? 'U' : 'AI'}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">${role === 'user' ? 'You' : 'Cy30rt_AI'}</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-text">${formatMessage(escapeHtml(content))}</div>
        </div>
    `;
    container.appendChild(messageDiv);
    scrollToBottom();
}

function formatMessage(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

// ============ STOP GENERATION FEATURE ============
function stopGeneration() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
    isGenerating = false;
    hideTypingIndicator();
    
    const stopBtn = document.getElementById("stopBtn");
    if (stopBtn) stopBtn.style.display = "none";
    
    addSystemMessage("⏹️ Response generation stopped by user.");
}

function showStopButton() {
    const stopBtn = document.getElementById("stopBtn");
    if (stopBtn) stopBtn.style.display = "flex";
}

function hideStopButton() {
    const stopBtn = document.getElementById("stopBtn");
    if (stopBtn) stopBtn.style.display = "none";
}

// ============ TYPING ANIMATION ============
async function typeMessage(element, text) {
    element.innerHTML = '';
    const chars = text.split('');
    for (let i = 0; i < chars.length; i++) {
        if (!isGenerating) break;
        element.innerHTML += chars[i];
        await sleep(10);
        scrollToBottom();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ API CALL WITH CANCEL SUPPORT AND CONTEXT ============
async function apiCall(endpoint, options) {
    if (currentAbortController) {
        currentAbortController.abort();
    }
    
    currentAbortController = new AbortController();
    isGenerating = true;
    showStopButton();
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            signal: currentAbortController.signal
        });
        isGenerating = false;
        hideStopButton();
        currentAbortController = null;
        return response;
    } catch (error) {
        isGenerating = false;
        hideStopButton();
        currentAbortController = null;
        if (error.name === 'AbortError') {
            throw new Error('CANCELLED');
        }
        throw error;
    }
}

// ============ SEND MESSAGE WITH CONTEXT ============
async function sendMessage() {
    const input = document.getElementById("messageInput");
    let message = input.value.trim();
    if (!message) return;
    
    input.value = "";
    input.style.height = "auto";
    
    const container = document.getElementById("messagesContainer");
    if (container.querySelector(".welcome-screen")) {
        container.innerHTML = '';
    }
    
    addMessageToUI('user', message);
    addMessageToCurrentChat('user', message);
    
    showTypingIndicator();
    
    try {
        // Get conversation context for understanding
        const context = getConversationContext(currentChatId, 5);
        
        // Send message with context to API
        const response = await apiCall('/api/chat', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message, 
                language: currentLanguage,
                context: context,
                session_id: currentChatId
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.text();
        hideTypingIndicator();
        
        const messageDiv = document.createElement("div");
        messageDiv.className = "message assistant";
        messageDiv.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">Cy30rt_AI</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-text" id="streamingText"></div>
            </div>
        `;
        container.appendChild(messageDiv);
        
        const textDiv = messageDiv.querySelector(".message-text");
        await typeMessage(textDiv, data);
        
        addMessageToCurrentChat('assistant', data);
        
        if (autoPlayEnabled) {
            textToSpeech(data, currentLanguage);
        }
        
        addAudioControls(messageDiv, data, currentLanguage);
        
    } catch (error) {
        hideTypingIndicator();
        if (error.message === 'CANCELLED') {
            addSystemMessage("⏹️ Response generation stopped.");
        } else {
            console.error(error);
            addErrorMessage(error.message);
        }
    }
}

function addSystemMessage(text) {
    const container = document.getElementById("messagesContainer");
    const sysDiv = document.createElement("div");
    sysDiv.className = "message system";
    sysDiv.innerHTML = `
        <div class="message-avatar">ℹ️</div>
        <div class="message-content">
            <div class="message-text" style="background: rgba(59,130,246,0.1); text-align: center; font-size: 0.85rem;">
                ${escapeHtml(text)}
            </div>
        </div>
    `;
    container.appendChild(sysDiv);
    scrollToBottom();
}

function sendExample(prompt) {
    document.getElementById("messageInput").value = prompt;
    sendMessage();
}

function addErrorMessage(error) {
    const container = document.getElementById("messagesContainer");
    const errorDiv = document.createElement("div");
    errorDiv.className = "message assistant";
    errorDiv.innerHTML = `
        <div class="message-avatar">!</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">Error</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-text" style="color: #ef4444;">Error: ${escapeHtml(error)}</div>
        </div>
    `;
    container.appendChild(errorDiv);
    scrollToBottom();
}

function addAudioControls(messageDiv, text, language) {
    const existing = messageDiv.querySelector(".audio-controls");
    if (existing) existing.remove();

    const controlsDiv = document.createElement("div");
    controlsDiv.className = "audio-controls";

    const playBtn = document.createElement("button");
    playBtn.className = "audio-btn";
    playBtn.textContent = "Play Audio";

    const stopBtn = document.createElement("button");
    stopBtn.className = "audio-btn";
    stopBtn.textContent = "Stop";

    let isPlaying = false;

    playBtn.onclick = async() => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            playBtn.textContent = "Play Audio";
            isPlaying = false;
            return;
        }
        playBtn.textContent = "Playing...";
        isPlaying = true;
        await textToSpeech(text, language);
        playBtn.textContent = "Play Audio";
        isPlaying = false;
    };

    stopBtn.onclick = () => {
        window.speechSynthesis.cancel();
        playBtn.textContent = "Play Audio";
        isPlaying = false;
    };

    controlsDiv.appendChild(playBtn);
    controlsDiv.appendChild(stopBtn);
    messageDiv.querySelector(".message-content").appendChild(controlsDiv);
}

// ============ AUDIO FUNCTIONS ============
function initAudio() {
    if (audioInitialized) return;
    try {
        const silent = new SpeechSynthesisUtterance("");
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
        audioInitialized = true;
    } catch (e) {}
}

async function textToSpeech(text, languageCode) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) { resolve(false); return; }
        initAudio();
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[\[\]\(\)\*\_\#]/g, '').substring(0, 1500);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // For Hausa, use specific voice
        if (languageCode === 'ha') {
            utterance.lang = 'ha-NG';
        } else {
            utterance.lang = voiceMap[languageCode] || 'en-US';
        }
        
        utterance.rate = voiceSpeed;
        utterance.pitch = voicePitch;
        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);
        window.speechSynthesis.speak(utterance);
    });
}

// ============ VOICE INPUT ============
function setupVoiceInput() {
    const voiceBtn = document.getElementById("voiceBtn");
    if (!voiceBtn) return;

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) { voiceBtn.style.opacity = "0.5"; return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    voiceBtn.onclick = () => {
        initAudio();
        // Support Hausa voice recognition
        if (currentLanguage === 'ha') {
            recognition.lang = 'ha-NG';
        } else if (currentLanguage === 'ar') {
            recognition.lang = 'ar-SA';
        } else {
            recognition.lang = 'en-US';
        }
        recognition.start();
        voiceBtn.classList.add("recording");
        showRecordingStatus();
    };

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        document.getElementById("messageInput").value = text;
        sendMessage();
        voiceBtn.classList.remove("recording");
        hideRecordingStatus();
    };

    recognition.onerror = () => { voiceBtn.classList.remove("recording");
        hideRecordingStatus(); };
    recognition.onend = () => { voiceBtn.classList.remove("recording");
        hideRecordingStatus(); };
}

function showRecordingStatus() {
    if (recordingStatusDiv) recordingStatusDiv.remove();
    recordingStatusDiv = document.createElement("div");
    recordingStatusDiv.className = "recording-status";
    recordingStatusDiv.innerHTML = 'Recording... Speak now';
    document.body.appendChild(recordingStatusDiv);
    setTimeout(() => { if (recordingStatusDiv) recordingStatusDiv.remove(); }, 10000);
}

function hideRecordingStatus() {
    if (recordingStatusDiv) { recordingStatusDiv.remove();
        recordingStatusDiv = null; }
}

// ============ HELPER FUNCTIONS ============
function showTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) indicator.style.display = "flex";
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) indicator.style.display = "none";
}

function scrollToBottom() {
    const chatArea = document.getElementById("chatArea");
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ============ SETTINGS ============
function loadSettings() {
    autoPlayEnabled = localStorage.getItem("auto_play") === "true";
    voiceReadbackEnabled = localStorage.getItem("voice_readback") === "true";
    voiceSpeed = parseFloat(localStorage.getItem("voice_speed") || "1.0");
    voicePitch = parseFloat(localStorage.getItem("voice_pitch") || "1.0");

    const autoToggle = document.getElementById("autoPlayToggle");
    const readbackToggle = document.getElementById("voiceReadbackToggle");
    const speedSlider = document.getElementById("voiceSpeed");
    const pitchSlider = document.getElementById("voicePitch");
    const speedVal = document.getElementById("speedValue");
    const pitchVal = document.getElementById("pitchValue");

    if (autoToggle) autoToggle.checked = autoPlayEnabled;
    if (readbackToggle) readbackToggle.checked = voiceReadbackEnabled;
    if (speedSlider) speedSlider.value = voiceSpeed;
    if (pitchSlider) pitchSlider.value = voicePitch;
    if (speedVal) speedVal.textContent = voiceSpeed === 1.0 ? "Normal" : `${voiceSpeed.toFixed(1)}x`;
    if (pitchVal) pitchVal.textContent = voicePitch === 1.0 ? "Normal" : `${voicePitch.toFixed(1)}x`;
}

function saveSettings() {
    autoPlayEnabled = document.getElementById("autoPlayToggle") ? .checked || false;
    voiceReadbackEnabled = document.getElementById("voiceReadbackToggle") ? .checked || false;
    voiceSpeed = parseFloat(document.getElementById("voiceSpeed") ? .value || "1.0");
    voicePitch = parseFloat(document.getElementById("voicePitch") ? .value || "1.0");

    localStorage.setItem("auto_play", autoPlayEnabled);
    localStorage.setItem("voice_readback", voiceReadbackEnabled);
    localStorage.setItem("voice_speed", voiceSpeed);
    localStorage.setItem("voice_pitch", voicePitch);

    const speedVal = document.getElementById("speedValue");
    const pitchVal = document.getElementById("pitchValue");
    if (speedVal) speedVal.textContent = voiceSpeed === 1.0 ? "Normal" : `${voiceSpeed.toFixed(1)}x`;
    if (pitchVal) pitchVal.textContent = voicePitch === 1.0 ? "Normal" : `${voicePitch.toFixed(1)}x`;
}

function showSettingsModal() { document.getElementById("settingsModal").classList.add("active"); }
function closeSettingsModal() { document.getElementById("settingsModal").classList.remove("active"); }
function showLanguageModal() { document.getElementById("languageModal").classList.add("active"); }
function closeLanguageModal() { document.getElementById("languageModal").classList.remove("active"); }

function changeLanguage(langCode) {
    currentLanguage = langCode;
    localStorage.setItem("cy30rt_language", langCode);
    closeLanguageModal();
    addSystemMessage(`Language changed to ${LANGUAGES[langCode].name}`);
}

function renderLanguageGrid() {
    const grid = document.getElementById("languageModalGrid");
    if (!grid || typeof LANGUAGES === 'undefined') return;
    grid.innerHTML = "";
    grid.className = "language-grid";
    Object.entries(LANGUAGES).forEach(([code, lang]) => {
        const btn = document.createElement("div");
        btn.className = "language-item";
        btn.onclick = () => changeLanguage(code);
        btn.innerHTML = `
            <div class="language-flag">${lang.flag}</div>
            <div class="language-name">${lang.name}</div>
            <div class="language-native">${lang.native}</div>
        `;
        grid.appendChild(btn);
    });
}

// ============ MOBILE MENU ============
function toggleMobileMenu() {
    document.getElementById("sidebar").classList.toggle("open");
}

// ============ INITIALIZE ============
document.addEventListener("DOMContentLoaded", () => {
    console.log("Cy30rt_AI Ready - With Stop Button, Memory, and Hausa Support");

    initChatHistory();
    loadSettings();
    renderLanguageGrid();

    document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
    document.getElementById("stopBtn")?.addEventListener("click", stopGeneration);
    document.getElementById("settingsBtn")?.addEventListener("click", showSettingsModal);
    document.getElementById("languageBtn")?.addEventListener("click", showLanguageModal);
    document.getElementById("mobileMenuBtn")?.addEventListener("click", toggleMobileMenu);
    document.getElementById("newChatBtn")?.addEventListener("click", createNewChat);

    document.getElementById("messageInput")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    document.getElementById("messageInput")?.addEventListener("input", function(e) {
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    });

    document.querySelector(".modal-close")?.addEventListener("click", closeLanguageModal);
    document.querySelector(".modal-close-settings")?.addEventListener("click", closeSettingsModal);

    document.getElementById("autoPlayToggle")?.addEventListener("change", saveSettings);
    document.getElementById("voiceReadbackToggle")?.addEventListener("change", saveSettings);
    document.getElementById("voiceSpeed")?.addEventListener("input", saveSettings);
    document.getElementById("voicePitch")?.addEventListener("input", saveSettings);

    setupVoiceInput();

    window.onclick = (event) => {
        if (event.target === document.getElementById("languageModal")) closeLanguageModal();
        if (event.target === document.getElementById("settingsModal")) closeSettingsModal();
    };

    if (document.getElementById("sidebar")) {
        document.addEventListener("click", function(e) {
            const sidebar = document.getElementById("sidebar");
            const menuBtn = document.getElementById("mobileMenuBtn");
            if (sidebar && sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== menuBtn) {
                sidebar.classList.remove("open");
            }
        });
    }

    const savedLang = localStorage.getItem("cy30rt_language");
    if (savedLang && typeof LANGUAGES !== 'undefined' && LANGUAGES[savedLang]) {
        currentLanguage = savedLang;
    }
});

window.switchChat = switchChat;
window.sendExample = sendExample;
window.stopGeneration = stopGeneration;
