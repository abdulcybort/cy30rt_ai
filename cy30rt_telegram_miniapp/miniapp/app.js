// Cy30rt_AI - COMPLETE PROFESSIONAL VERSION
// ALL Features: Chat History, Voice Input, Audio Playback, 15 Languages,
// Auto-Play, Speed/Pitch Control, Recording Animation, Typing Animation, etc.

// ============ CONFIGURATION ============
const API_URL = "https://cy30rt-ai.onrender.com";

// Global variables
let currentLanguage = "en";
let audioInitialized = false;
let chatHistory = [];
let currentSessionId = null;
let streamingMessageDiv = null;
let recordingStatusDiv = null;

// Voice settings
let voiceSpeed = 1.0;
let voicePitch = 1.0;
let autoPlayEnabled = false;
let voiceReadbackEnabled = false;

// Voice language mapping
const voiceMap = {
    'en': 'en-US', 'ar': 'ar-SA', 'es': 'es-ES',
    'fr': 'fr-FR', 'de': 'de-DE', 'hi': 'hi-IN',
    'ha': 'en-US', 'pt': 'pt-BR', 'ru': 'ru-RU',
    'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR',
    'tr': 'tr-TR', 'fa': 'fa-IR', 'ur': 'ur-PK'
};

// ============ CHAT HISTORY FUNCTIONS ============
function initChatHistory() {
    const savedHistory = localStorage.getItem("cy30rt_chat_history");
    if (savedHistory) {
        try {
            chatHistory = JSON.parse(savedHistory);
        } catch(e) { chatHistory = []; }
    }
    
    currentSessionId = localStorage.getItem("cy30rt_session_id");
    if (!currentSessionId) {
        currentSessionId = 'session_' + Date.now();
        localStorage.setItem("cy30rt_session_id", currentSessionId);
    }
    
    loadMessagesForSession();
}

function saveMessageToHistory(role, content, language) {
    const message = {
        id: Date.now(),
        sessionId: currentSessionId,
        role: role,
        content: content,
        language: language,
        timestamp: new Date().toISOString()
    };
    chatHistory.push(message);
    if (chatHistory.length > 500) chatHistory = chatHistory.slice(-500);
    localStorage.setItem("cy30rt_chat_history", JSON.stringify(chatHistory));
}

function loadMessagesForSession() {
    const sessionMessages = chatHistory.filter(m => m.sessionId === currentSessionId);
    const container = document.getElementById("chatMessages");
    
    if (sessionMessages.length === 0) {
        addWelcomeMessage();
        return;
    }
    
    container.innerHTML = '';
    sessionMessages.forEach(msg => {
        if (msg.role === 'user') {
            addUserMessageToContainer(msg.content, msg.timestamp);
        } else if (msg.role === 'ai') {
            addAIMessageToContainer(msg.content, msg.timestamp);
        }
    });
    scrollToBottom();
}

function addWelcomeMessage() {
    const container = document.getElementById("chatMessages");
    const welcomeDiv = document.createElement("div");
    welcomeDiv.className = "message ai";
    welcomeDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content message-box">
            <div class="message-header">
                <span class="message-sender">Cy30rt_AI</span>
                <span class="message-time">Just now</span>
            </div>
            <div class="message-text welcome-text">
                <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    Cy30rt_AI · Cybersecurity Intelligence
                </div>
                <div style="margin-bottom: 16px; line-height: 1.6;">
                    Your professional AI assistant for security research, vulnerability analysis, and threat intelligence.
                </div>
                <div style="background: rgba(59,130,246,0.05); border-radius: 12px; padding: 14px; margin: 12px 0;">
                    <div style="font-weight: 500; margin-bottom: 8px; color: #3b82f6;">⚡ Capabilities</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <span style="background: rgba(59,130,246,0.1); padding: 3px 10px; border-radius: 15px; font-size: 0.75rem;">CVE Analysis</span>
                        <span style="background: rgba(59,130,246,0.1); padding: 3px 10px; border-radius: 15px; font-size: 0.75rem;">Domain Recon</span>
                        <span style="background: rgba(59,130,246,0.1); padding: 3px 10px; border-radius: 15px; font-size: 0.75rem;">IP Intelligence</span>
                        <span style="background: rgba(59,130,246,0.1); padding: 3px 10px; border-radius: 15px; font-size: 0.75rem;">Payload References</span>
                        <span style="background: rgba(59,130,246,0.1); padding: 3px 10px; border-radius: 15px; font-size: 0.75rem;">15 Languages</span>
                        <span style="background: rgba(59,130,246,0.1); padding: 3px 10px; border-radius: 15px; font-size: 0.75rem;">Voice Interaction</span>
                    </div>
                </div>
                <div style="color: #9ca3af; font-size: 0.85rem; border-top: 1px solid #2a2a35; padding-top: 12px; margin-top: 8px;">
                    Developed by <strong style="color: #3b82f6;">Abdulbasid Yakubu (cy30rt)</strong>
                </div>
            </div>
        </div>
    `;
    container.appendChild(welcomeDiv);
}

function addUserMessageToContainer(text, timestamp = null) {
    const container = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user";
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    messageDiv.innerHTML = `
        <div class="message-avatar">U</div>
        <div class="message-content message-box user-box">
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

function addAIMessageToContainer(text, timestamp = null) {
    const container = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message ai";
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content message-box">
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

function clearChatHistory() {
    if (confirm("Clear all chat history? This cannot be undone.")) {
        chatHistory = chatHistory.filter(m => m.sessionId !== currentSessionId);
        localStorage.setItem("cy30rt_chat_history", JSON.stringify(chatHistory));
        const container = document.getElementById("chatMessages");
        container.innerHTML = '';
        addWelcomeMessage();
        addSystemMessage("Chat history cleared. New conversation started.");
        currentMessageDiv = null;
        currentResponseText = "";
    }
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
        utterance.volume = 1;
        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);
        window.speechSynthesis.speak(utterance);
    });
}

// ============ VOICE RECORDING INDICATOR ============
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

// ============ SEND MESSAGE ============
async function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    if (!message) return;
    
    addUserMessageToContainer(message);
    saveMessageToHistory('user', message, currentLanguage);
    input.value = "";
    input.style.height = "auto";
    
    initAudio();
    if (voiceReadbackEnabled) await textToSpeech(`You asked: ${message}`, currentLanguage);
    
    showTypingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message, language: currentLanguage || "en" })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        hideTypingIndicator();
        startNewAIMessage();
        
        let fullResponse = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullResponse += decoder.decode(value);
            updateStreamingMessage(fullResponse);
        }
        
        await finishStreamingMessage(fullResponse);
        
    } catch (error) {
        hideTypingIndicator();
        addErrorMessage(error.message);
    }
}

function startNewAIMessage() {
    const container = document.getElementById("chatMessages");
    streamingMessageDiv = document.createElement("div");
    streamingMessageDiv.className = "message ai";
    streamingMessageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content message-box streaming-box">
            <div class="message-header">
                <span class="message-sender">Cy30rt_AI</span>
                <span class="message-time streaming">Typing...</span>
            </div>
            <div class="message-text streaming-text"></div>
            <span class="typing-cursor"></span>
        </div>
    `;
    container.appendChild(streamingMessageDiv);
    scrollToBottom();
}

function updateStreamingMessage(text) {
    if (!streamingMessageDiv) return;
    const textDiv = streamingMessageDiv.querySelector(".message-text");
    if (textDiv) textDiv.innerHTML = formatMessageText(escapeHtml(text));
    scrollToBottom();
}

async function finishStreamingMessage(fullText) {
    if (!streamingMessageDiv) return;
    
    const timeSpan = streamingMessageDiv.querySelector(".message-time");
    if (timeSpan) timeSpan.textContent = new Date().toLocaleTimeString();
    
    const cursor = streamingMessageDiv.querySelector(".typing-cursor");
    if (cursor) cursor.remove();
    
    const box = streamingMessageDiv.querySelector(".message-content");
    if (box) box.classList.remove("streaming-box");
    
    saveMessageToHistory('ai', fullText, currentLanguage);
    addAudioControls(streamingMessageDiv, fullText, currentLanguage);
    
    if (autoPlayEnabled) setTimeout(() => textToSpeech(fullText, currentLanguage), 300);
    
    streamingMessageDiv = null;
}

function addAudioControls(messageDiv, text, language) {
    const existing = messageDiv.querySelector(".audio-controls");
    if (existing) existing.remove();
    
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "audio-controls";
    
    const playBtn = document.createElement("button");
    playBtn.className = "audio-btn";
    playBtn.textContent = "🔊 Play Audio";
    
    const stopBtn = document.createElement("button");
    stopBtn.className = "audio-btn";
    stopBtn.textContent = "⏹️ Stop";
    
    let isPlaying = false;
    
    playBtn.onclick = async (e) => {
        e.stopPropagation();
        initAudio();
        if (isPlaying) {
            window.speechSynthesis.cancel();
            playBtn.textContent = "🔊 Play Audio";
            isPlaying = false;
            return;
        }
        playBtn.textContent = "🔴 Playing...";
        isPlaying = true;
        try {
            await textToSpeech(text, language);
            playBtn.textContent = "🔊 Play Again";
            isPlaying = false;
        } catch {
            playBtn.textContent = "🔊 Retry";
            setTimeout(() => { playBtn.textContent = "🔊 Play Audio"; isPlaying = false; }, 2000);
        }
    };
    
    stopBtn.onclick = (e) => {
        e.stopPropagation();
        window.speechSynthesis.cancel();
        playBtn.textContent = "🔊 Play Audio";
        isPlaying = false;
    };
    
    controlsDiv.appendChild(playBtn);
    controlsDiv.appendChild(stopBtn);
    
    const contentDiv = messageDiv.querySelector(".message-content");
    if (contentDiv) contentDiv.appendChild(controlsDiv);
}

// ============ HELPER FUNCTIONS ============
function addSystemMessage(text) {
    const container = document.getElementById("chatMessages");
    const sysDiv = document.createElement("div");
    sysDiv.className = "message system";
    sysDiv.innerHTML = `<div class="message-content system-box"><div class="message-text" style="background: rgba(59,130,246,0.1); text-align: center;">🌐 ${escapeHtml(text)}</div></div>`;
    container.appendChild(sysDiv);
    scrollToBottom();
}

function addErrorMessage(error) {
    const container = document.getElementById("chatMessages");
    const errorDiv = document.createElement("div");
    errorDiv.className = "message ai";
    errorDiv.innerHTML = `<div class="message-avatar">⚠️</div><div class="message-content message-box error-box"><div class="message-header"><span class="message-sender">System</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" style="color: #ef4444;">Error: ${escapeHtml(error)}</div></div>`;
    container.appendChild(errorDiv);
    scrollToBottom();
}

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
    const container = document.getElementById("chatContainer");
    if (container) container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatMessageText(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

function newChat() { clearChatHistory(); }

// ============ LANGUAGE FUNCTIONS ============
function changeLanguage(langCode) {
    currentLanguage = langCode;
    localStorage.setItem("cy30rt_language", langCode);
    addSystemMessage(`Language changed to ${LANGUAGES[langCode].name}`);
    closeLanguageModal();
}

function showLanguageModal() {
    const modal = document.getElementById("languageModal");
    if (!modal) return;
    const grid = document.getElementById("languageModalGrid");
    if (grid && LANGUAGES) {
        grid.innerHTML = "";
        Object.entries(LANGUAGES).forEach(([code, lang]) => {
            const btn = document.createElement("div");
            btn.className = "language-item";
            btn.onclick = () => changeLanguage(code);
            btn.innerHTML = `<div class="language-flag">${lang.flag}</div><div class="language-name">${lang.name}</div><div class="language-native">${lang.native}</div>`;
            grid.appendChild(btn);
        });
    }
    modal.classList.add("active");
}

function closeLanguageModal() {
    const modal = document.getElementById("languageModal");
    if (modal) modal.classList.remove("active");
}

// ============ SETTINGS FUNCTIONS ============
function showSettingsModal() { document.getElementById("settingsModal").classList.add("active"); }
function closeSettingsModal() { document.getElementById("settingsModal").classList.remove("active"); }

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

// ============ INITIALIZE ============
document.addEventListener("DOMContentLoaded", () => {
    console.log("Cy30rt_AI Loaded - Full Version");
    initChatHistory();
    loadSettings();
    
    document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
    document.getElementById("newChatBtn")?.addEventListener("click", newChat);
    document.getElementById("clearHistoryBtn")?.addEventListener("click", clearChatHistory);
    document.getElementById("languageBtn")?.addEventListener("click", showLanguageModal);
    document.getElementById("settingsBtn")?.addEventListener("click", showSettingsModal);
    
    document.getElementById("messageInput")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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
    if (savedLang && typeof LANGUAGES !== 'undefined' && LANGUAGES[savedLang]) currentLanguage = savedLang;
});

document.addEventListener("input", function(e) {
    if (e.target.id === "messageInput") {
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }
});
