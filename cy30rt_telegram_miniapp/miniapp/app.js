// Cy30rt_AI - Professional Cybersecurity Assistant v2
// Created by Abdulbasid Yakubu (cy30rt)

// ============ GLOBAL VARIABLES ============
let currentResponseDiv = null;
let currentResponseText = "";
let currentLanguage = "en";
let currentMessageDiv = null;
let audioInitialized = false;

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

// ============ AUDIO INITIALIZATION ============
function initAudio() {
    if (audioInitialized) return;
    try {
        const silent = new SpeechSynthesisUtterance("");
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
        audioInitialized = true;
    } catch (e) {
        console.log("Audio init:", e);
    }
}

// ============ TEXT TO SPEECH (FIXED) ============
async function textToSpeech(text, languageCode) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            resolve(false);
            return;
        }
        
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

// ============ SEND MESSAGE ============
async function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    
    if (!message) return;
    
    addUserMessage(message);
    input.value = "";
    input.style.height = "auto";
    
    initAudio();
    
    if (voiceReadbackEnabled) {
        await textToSpeech(`You asked: ${message}`, currentLanguage);
    }
    
    showTypingIndicator();
    
    try {
        const response = await fetch(`https://cy30rt-ai.onrender.com/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                language: currentLanguage || "en"
            })
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        hideTypingIndicator();
        startNewAIMessage();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            appendToCurrentMessage(chunk);
        }
        
        finishCurrentMessage();
        
    } catch (error) {
        hideTypingIndicator();
        addErrorMessage(error.message);
    }
}

function addUserMessage(text) {
    const container = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user";
    messageDiv.innerHTML = `
        <div class="message-avatar">U</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">You</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-text">${escapeHtml(text)}</div>
        </div>
    `;
    container.appendChild(messageDiv);
    scrollToBottom();
}

function startNewAIMessage() {
    const container = document.getElementById("chatMessages");
    currentMessageDiv = document.createElement("div");
    currentMessageDiv.className = "message ai";
    currentMessageDiv.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">Cy30rt_AI</span>
                <span class="message-time">Streaming...</span>
            </div>
            <div class="message-text" id="streamingText"></div>
        </div>
    `;
    container.appendChild(currentMessageDiv);
    currentResponseText = "";
    scrollToBottom();
}

function appendToCurrentMessage(chunk) {
    currentResponseText += chunk;
    const textDiv = currentMessageDiv.querySelector(".message-text");
    textDiv.innerHTML = formatMessageText(escapeHtml(currentResponseText));
    scrollToBottom();
}

function formatMessageText(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

function finishCurrentMessage() {
    if (currentMessageDiv) {
        const timeSpan = currentMessageDiv.querySelector(".message-time");
        if (timeSpan) timeSpan.textContent = new Date().toLocaleTimeString();
        
        addAudioControls(currentMessageDiv, currentResponseText, currentLanguage);
        
        if (autoPlayEnabled) {
            setTimeout(() => textToSpeech(currentResponseText, currentLanguage), 300);
        }
    }
    currentMessageDiv = null;
    currentResponseText = "";
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
    
    playBtn.onclick = async (e) => {
        e.stopPropagation();
        initAudio();
        
        if (isPlaying) {
            window.speechSynthesis.cancel();
            playBtn.textContent = "Play Audio";
            isPlaying = false;
            return;
        }
        
        playBtn.textContent = "Playing...";
        isPlaying = true;
        
        try {
            await textToSpeech(text, language);
            playBtn.textContent = "Play Audio";
            isPlaying = false;
        } catch {
            playBtn.textContent = "Retry";
            setTimeout(() => {
                playBtn.textContent = "Play Audio";
                isPlaying = false;
            }, 2000);
        }
    };
    
    stopBtn.onclick = (e) => {
        e.stopPropagation();
        window.speechSynthesis.cancel();
        playBtn.textContent = "Play Audio";
        isPlaying = false;
    };
    
    controlsDiv.appendChild(playBtn);
    controlsDiv.appendChild(stopBtn);
    
    const contentDiv = messageDiv.querySelector(".message-content");
    if (contentDiv) contentDiv.appendChild(controlsDiv);
}

// ============ NEW CHAT BUTTON ============
function newChat() {
    const msgCount = document.querySelectorAll('.message').length;
    if (msgCount > 2) {
        if (confirm("Start a new conversation? Current chat will be cleared.")) {
            clearAllMessages();
        }
    } else {
        clearAllMessages();
    }
}

function clearAllMessages() {
    const container = document.getElementById("chatMessages");
    container.innerHTML = '';
    
    const welcomeDiv = document.createElement("div");
    welcomeDiv.className = "message ai";
    welcomeDiv.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">Cy30rt_AI</span>
                <span class="message-time">Just now</span>
            </div>
            <div class="message-text">New conversation started. How can I assist you with cybersecurity today?</div>
        </div>
    `;
    container.appendChild(welcomeDiv);
    
    currentMessageDiv = null;
    currentResponseText = "";
    addSystemMessage("Conversation reset. Previous context cleared.");
    scrollToBottom();
}

function addSystemMessage(text) {
    const container = document.getElementById("chatMessages");
    const sysDiv = document.createElement("div");
    sysDiv.className = "message system";
    sysDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text" style="background: var(--bg-tertiary); text-align: center; font-size: 0.8rem;">🌐 ${escapeHtml(text)}</div>
        </div>
    `;
    container.appendChild(sysDiv);
    scrollToBottom();
}

function addErrorMessage(error) {
    const container = document.getElementById("chatMessages");
    const errorDiv = document.createElement("div");
    errorDiv.className = "message ai";
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

// ============ LANGUAGE ============
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

// ============ SETTINGS ============
function showSettingsModal() {
    document.getElementById("settingsModal").classList.add("active");
}

function closeSettingsModal() {
    document.getElementById("settingsModal").classList.remove("active");
}

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
    if (!SpeechRecognition) {
        voiceBtn.style.opacity = "0.5";
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    voiceBtn.onclick = () => {
        initAudio();
        recognition.lang = currentLanguage === "ar" ? "ar-SA" : "en-US";
        recognition.start();
        voiceBtn.style.opacity = "0.6";
    };
    
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        document.getElementById("messageInput").value = text;
        sendMessage();
        voiceBtn.style.opacity = "1";
    };
    
    recognition.onerror = () => { voiceBtn.style.opacity = "1"; };
    recognition.onend = () => { voiceBtn.style.opacity = "1"; };
}

// ============ INITIALIZE ============
document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    
    document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
    document.getElementById("newChatBtn")?.addEventListener("click", newChat);
    document.getElementById("languageBtn")?.addEventListener("click", showLanguageModal);
    document.getElementById("settingsBtn")?.addEventListener("click", showSettingsModal);
    
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
    if (savedLang && LANGUAGES && LANGUAGES[savedLang]) {
        currentLanguage = savedLang;
    }
});

document.addEventListener("input", function(e) {
    if (e.target.id === "messageInput") {
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }
});
