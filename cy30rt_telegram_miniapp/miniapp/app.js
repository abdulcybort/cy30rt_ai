// Cy30rt_AI - WORKING VERSION
// Created by Abdulbasid Yakubu (cy30rt)

const API_URL = "https://cy30rt-ai.onrender.com";

// Global variables
let currentLanguage = "en";
let audioInitialized = false;
let currentAbortController = null;
let isGenerating = false;

// Voice settings
let voiceSpeed = 1.0;
let voicePitch = 1.0;
let autoPlayEnabled = false;

// Voice map
const voiceMap = {
    'en': 'en-US', 'ha': 'en-US', 'yo': 'en-US', 'ig': 'en-US',
    'ar': 'ar-SA', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
    'pt': 'pt-BR', 'ru': 'ru-RU', 'zh': 'zh-CN', 'ja': 'ja-JP',
    'ko': 'ko-KR', 'hi': 'hi-IN', 'tr': 'tr-TR'
};

// ============ STOP FUNCTION ============
function stopGeneration() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
    isGenerating = false;
    hideTypingIndicator();
    
    const container = document.getElementById("messagesContainer");
    const stopDiv = document.createElement("div");
    stopDiv.className = "message system";
    stopDiv.innerHTML = `
        <div class="message-avatar">⏹️</div>
        <div class="message-content">
            <div class="message-text" style="background: rgba(239,68,68,0.1); text-align: center;">
                ⏹️ Generation stopped by user.
            </div>
        </div>
    `;
    container.appendChild(stopDiv);
    scrollToBottom();
}

// ============ MESSAGE FUNCTIONS ============
function addUserMessage(text) {
    const container = document.getElementById("messagesContainer");
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

function addAIMessage(text) {
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
            <div class="message-text">${formatMessage(escapeHtml(text))}</div>
        </div>
    `;
    container.appendChild(messageDiv);
    scrollToBottom();
    
    if (autoPlayEnabled) {
        textToSpeech(text, currentLanguage);
    }
}

function addErrorMessage(error) {
    const container = document.getElementById("messagesContainer");
    const errorDiv = document.createElement("div");
    errorDiv.className = "message assistant";
    errorDiv.innerHTML = `
        <div class="message-avatar">⚠️</div>
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

function formatMessage(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const chatArea = document.getElementById("chatArea");
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
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

// ============ SEND MESSAGE ============
async function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    if (!message) return;
    
    input.value = "";
    input.style.height = "auto";
    
    // Remove welcome screen if present
    const container = document.getElementById("messagesContainer");
    if (container.querySelector(".welcome-screen")) {
        container.innerHTML = '';
    }
    
    addUserMessage(message);
    showTypingIndicator();
    
    try {
        // Create AbortController for stop functionality
        if (currentAbortController) {
            currentAbortController.abort();
        }
        currentAbortController = new AbortController();
        isGenerating = true;
        
        const response = await fetch(`${API_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message, language: currentLanguage }),
            signal: currentAbortController.signal
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.text();
        hideTypingIndicator();
        addAIMessage(data);
        isGenerating = false;
        currentAbortController = null;
        
    } catch (error) {
        hideTypingIndicator();
        if (error.name === 'AbortError') {
            addSystemMessage("⏹️ Generation stopped.");
        } else {
            console.error(error);
            addErrorMessage(error.message);
        }
        isGenerating = false;
        currentAbortController = null;
    }
}

function addSystemMessage(text) {
    const container = document.getElementById("messagesContainer");
    const sysDiv = document.createElement("div");
    sysDiv.className = "message system";
    sysDiv.innerHTML = `
        <div class="message-avatar">ℹ️</div>
        <div class="message-content">
            <div class="message-text" style="background: rgba(59,130,246,0.1); text-align: center;">
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
    };
    
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        document.getElementById("messageInput").value = text;
        sendMessage();
        voiceBtn.classList.remove("recording");
    };
    
    recognition.onerror = () => { voiceBtn.classList.remove("recording"); };
    recognition.onend = () => { voiceBtn.classList.remove("recording"); };
}

// ============ SETTINGS ============
function loadSettings() {
    autoPlayEnabled = localStorage.getItem("auto_play") === "true";
    voiceSpeed = parseFloat(localStorage.getItem("voice_speed") || "1.0");
    voicePitch = parseFloat(localStorage.getItem("voice_pitch") || "1.0");
    
    const autoToggle = document.getElementById("autoPlayToggle");
    const speedSlider = document.getElementById("voiceSpeed");
    const pitchSlider = document.getElementById("voicePitch");
    const speedVal = document.getElementById("speedValue");
    const pitchVal = document.getElementById("pitchValue");
    
    if (autoToggle) autoToggle.checked = autoPlayEnabled;
    if (speedSlider) speedSlider.value = voiceSpeed;
    if (pitchSlider) pitchSlider.value = voicePitch;
    if (speedVal) speedVal.textContent = voiceSpeed === 1.0 ? "Normal" : `${voiceSpeed.toFixed(1)}x`;
    if (pitchVal) pitchVal.textContent = voicePitch === 1.0 ? "Normal" : `${voicePitch.toFixed(1)}x`;
}

function saveSettings() {
    autoPlayEnabled = document.getElementById("autoPlayToggle")?.checked || false;
    voiceSpeed = parseFloat(document.getElementById("voiceSpeed")?.value || "1.0");
    voicePitch = parseFloat(document.getElementById("voicePitch")?.value || "1.0");
    
    localStorage.setItem("auto_play", autoPlayEnabled);
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

function toggleMobileMenu() {
    document.getElementById("sidebar").classList.toggle("open");
}

// ============ INITIALIZE ============
document.addEventListener("DOMContentLoaded", () => {
    console.log("Cy30rt_AI Ready");
    
    renderLanguageGrid();
    loadSettings();
    
    document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
    document.getElementById("stopBtn")?.addEventListener("click", stopGeneration);
    document.getElementById("settingsBtn")?.addEventListener("click", showSettingsModal);
    document.getElementById("languageBtn")?.addEventListener("click", showLanguageModal);
    document.getElementById("mobileMenuBtn")?.addEventListener("click", toggleMobileMenu);
    
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
