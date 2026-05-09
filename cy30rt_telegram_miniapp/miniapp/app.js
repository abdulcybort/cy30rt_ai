// Cy30rt_AI - Complete Version with History Bar
// Created by Abdulbasid Yakubu (cy30rt)

const API_URL = "https://cy30rt-ai.onrender.com";

// Global variables
let currentLanguage = "en";
let audioInitialized = false;
let chatHistory = [];
let currentSessionId = null;
let recordingStatusDiv = null;
let currentStreamingMessage = null;
let currentResponseText = "";
let currentChatId = null;

// Voice settings
let voiceSpeed = 1.0;
let voicePitch = 1.0;
let autoPlayEnabled = false;
let voiceReadbackEnabled = false;

// Voice map
const voiceMap = {
    'en': 'en-US', 'ar': 'ar-SA', 'es': 'es-ES',
    'fr': 'fr-FR', 'de': 'de-DE', 'hi': 'hi-IN',
    'ha': 'en-US', 'pt': 'pt-BR', 'ru': 'ru-RU',
    'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR',
    'tr': 'tr-TR', 'fa': 'fa-IR', 'ur': 'ur-PK'
};

// ============ CHAT HISTORY MANAGEMENT ============
function initChatHistory() {
    const saved = localStorage.getItem("cy30rt_chat_sessions");
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
        } catch(e) { chatHistory = []; }
    }
    
    if (!currentSessionId) {
        currentSessionId = 'session_' + Date.now();
        currentChatId = currentSessionId;
    }
    
    loadChatList();
    loadCurrentChat();
}

function saveChatSessions() {
    localStorage.setItem("cy30rt_chat_sessions", JSON.stringify(chatHistory));
}

function createNewChat() {
    const newId = 'session_' + Date.now();
    const newChat = {
        id: newId,
        title: "New Chat",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    chatHistory.unshift(newChat);
    currentChatId = newId;
    saveChatSessions();
    loadChatList();
    loadCurrentChat();
}

function deleteChat(chatId) {
    chatHistory = chatHistory.filter(c => c.id !== chatId);
    if (currentChatId === chatId && chatHistory.length > 0) {
        currentChatId = chatHistory[0].id;
        loadCurrentChat();
    } else if (chatHistory.length === 0) {
        currentChatId = null;
        document.getElementById("messagesContainer").innerHTML = getWelcomeMessageHTML();
    }
    saveChatSessions();
    loadChatList();
}

function switchChat(chatId) {
    currentChatId = chatId;
    loadCurrentChat();
    loadChatList();
}

function loadChatList() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;
    
    if (chatHistory.length === 0) {
        historyList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No chats yet</div>';
        return;
    }
    
    historyList.innerHTML = chatHistory.map(chat => `
        <div class="history-item ${currentChatId === chat.id ? 'active' : ''}" onclick="switchChat('${chat.id}')">
            <div class="history-title">${escapeHtml(chat.title.length > 30 ? chat.title.substring(0, 30) + '...' : chat.title)}</div>
            <div class="history-date">${new Date(chat.updatedAt).toLocaleDateString()}</div>
        </div>
    `).join('');
}

function loadCurrentChat() {
    const container = document.getElementById("messagesContainer");
    if (!container) return;
    
    const chat = chatHistory.find(c => c.id === currentChatId);
    
    if (!chat || chat.messages.length === 0) {
        container.innerHTML = getWelcomeMessageHTML();
        return;
    }
    
    container.innerHTML = '';
    chat.messages.forEach(msg => {
        if (msg.role === 'user') {
            addUserMessageToUI(msg.content, msg.timestamp);
        } else if (msg.role === 'assistant') {
            addAIMessageToUI(msg.content, msg.timestamp);
        }
    });
    scrollToBottom();
}

function addMessageToCurrentChat(role, content) {
    const chat = chatHistory.find(c => c.id === currentChatId);
    if (!chat) return;
    
    const message = {
        role: role,
        content: content,
        timestamp: new Date().toISOString()
    };
    chat.messages.push(message);
    chat.updatedAt = new Date().toISOString();
    
    if (role === 'user' && chat.messages.length === 1) {
        chat.title = content.substring(0, 40) + (content.length > 40 ? '...' : '');
    }
    
    saveChatSessions();
    loadChatList();
}

function getWelcomeMessageHTML() {
    return `
        <div class="welcome-message">
            <div class="welcome-icon">🤖</div>
            <h1>Cy30rt_AI</h1>
            <p>Your professional cybersecurity intelligence assistant</p>
            <div class="capabilities">
                <span>🔍 CVE Analysis</span>
                <span>🌐 Domain Recon</span>
                <span>📡 IP Intelligence</span>
                <span>💉 Payload References</span>
                <span>🌍 15 Languages</span>
                <span>🎤 Voice Input</span>
            </div>
            <div class="creator-note">
                Developed by Abdulbasid Yakubu (cy30rt)
            </div>
        </div>
    `;
}

function addUserMessageToUI(text, timestamp = null) {
    const container = document.getElementById("messagesContainer");
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user";
    messageDiv.innerHTML = `
        <div class="message-avatar">U</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">You</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-text">${escapeHtml(text)}</div>
        </div>
    `;
    container.appendChild(messageDiv);
    scrollToBottom();
}

function addAIMessageToUI(text, timestamp = null) {
    const container = document.getElementById("messagesContainer");
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const messageDiv = document.createElement("div");
    messageDiv.className = "message assistant";
    messageDiv.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">Cy30rt_AI</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-text">${formatMessageText(escapeHtml(text))}</div>
        </div>
    `;
    container.appendChild(messageDiv);
    scrollToBottom();
}

// ============ TYPING ANIMATION (Like DeepSeek) ============
async function typeMessage(element, text) {
    element.innerHTML = '';
    const chars = text.split('');
    
    for (let i = 0; i < chars.length; i++) {
        element.innerHTML += chars[i];
        await sleep(15);
        scrollToBottom();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatMessageText(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

// ============ SEND MESSAGE ============
async function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    if (!message) return;
    
    input.value = "";
    input.style.height = "auto";
    
    addUserMessageToUI(message);
    addMessageToCurrentChat('user', message);
    
    showTypingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message, language: currentLanguage })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.text();
        
        hideTypingIndicator();
        
        // Create AI message container
        const container = document.getElementById("messagesContainer");
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
        console.error("Error:", error);
        addErrorMessage(error.message);
    }
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
    
    playBtn.onclick = async () => {
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
    } catch(e) {}
}

async function textToSpeech(text, languageCode) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) { resolve(false); return; }
        initAudio();
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[\[\]\(\)\*\_\#]/g, '').substring(0, 1500);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = voiceMap[languageCode] || 'en-US';
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
        recognition.lang = currentLanguage === "ar" ? "ar-SA" : "en-US";
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
    
    recognition.onerror = () => { voiceBtn.classList.remove("recording"); hideRecordingStatus(); };
    recognition.onend = () => { voiceBtn.classList.remove("recording"); hideRecordingStatus(); };
}

function showRecordingStatus() {
    if (recordingStatusDiv) recordingStatusDiv.remove();
    recordingStatusDiv = document.createElement("div");
    recordingStatusDiv.className = "recording-status";
    recordingStatusDiv.innerHTML = '🎙️ Recording... Speak now';
    document.body.appendChild(recordingStatusDiv);
    setTimeout(() => { if (recordingStatusDiv) recordingStatusDiv.remove(); }, 10000);
}

function hideRecordingStatus() {
    if (recordingStatusDiv) { recordingStatusDiv.remove(); recordingStatusDiv = null; }
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

function addErrorMessage(error) {
    const container = document.getElementById("messagesContainer");
    const errorDiv = document.createElement("div");
    errorDiv.className = "message assistant";
    errorDiv.innerHTML = `
        <div class="message-avatar">!</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">System</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-text" style="color: #ef4444;">Error: ${escapeHtml(error)}</div>
        </div>
    `;
    container.appendChild(errorDiv);
    scrollToBottom();
}

function clearAllHistory() {
    if (confirm("Delete all chat history? This cannot be undone.")) {
        chatHistory = [];
        currentChatId = null;
        saveChatSessions();
        loadChatList();
        document.getElementById("messagesContainer").innerHTML = getWelcomeMessageHTML();
    }
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
    autoPlayEnabled = document.getElementById("autoPlayToggle")?.checked || false;
    voiceReadbackEnabled = document.getElementById("voiceReadbackToggle")?.checked || false;
    voiceSpeed = parseFloat(document.getElementById("voiceSpeed")?.value || "1.0");
    voicePitch = parseFloat(document.getElementById("voicePitch")?.value || "1.0");
    
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
}

function renderLanguageGrid() {
    const grid = document.getElementById("languageModalGrid");
    if (!grid || typeof LANGUAGES === 'undefined') return;
    grid.innerHTML = "";
    Object.entries(LANGUAGES).forEach(([code, lang]) => {
        const btn = document.createElement("div");
        btn.className = "language-item";
        btn.onclick = () => changeLanguage(code);
        btn.innerHTML = `<div class="language-flag">${lang.flag}</div><div class="language-name">${lang.name}</div><div class="language-native">${lang.native}</div>`;
        grid.appendChild(btn);
    });
}

// ============ MOBILE MENU ============
function toggleMobileMenu() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("open");
}

// ============ INITIALIZE ============
document.addEventListener("DOMContentLoaded", () => {
    console.log("Cy30rt_AI Loaded - DeepSeek Style");
    
    initChatHistory();
    loadSettings();
    renderLanguageGrid();
    
    // Event listeners
    document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
    document.getElementById("newChatSidebarBtn")?.addEventListener("click", createNewChat);
    document.getElementById("clearAllHistoryBtn")?.addEventListener("click", clearAllHistory);
    document.getElementById("settingsBtn")?.addEventListener("click", showSettingsModal);
    document.getElementById("languageBtn")?.addEventListener("click", showLanguageModal);
    document.getElementById("mobileMenuBtn")?.addEventListener("click", toggleMobileMenu);
    
    document.getElementById("messageInput")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
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
    
    const savedLang = localStorage.getItem("cy30rt_language");
    if (savedLang && typeof LANGUAGES !== 'undefined' && LANGUAGES[savedLang]) {
        currentLanguage = savedLang;
    }
});

// Auto-resize textarea
document.addEventListener("input", function(e) {
    if (e.target.id === "messageInput") {
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }
});

window.switchChat = switchChat;
