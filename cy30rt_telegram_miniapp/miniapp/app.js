// Cy30rt_AI - Professional Cybersecurity Assistant
// Created by Abdulbasid Yakubu (cy30rt)

let currentResponseDiv = null;
let currentResponseText = "";
let currentLanguage = "en";
let currentMessageDiv = null;

// Voice settings
let voiceSpeed = 1.0;
let voicePitch = 1.0;
let autoPlayEnabled = false;
let voiceReadbackEnabled = false;

async function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    
    if (!message) return;
    
    addUserMessage(message);
    input.value = "";
    input.style.height = "auto";
    
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
    // Convert code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

function finishCurrentMessage() {
    if (currentMessageDiv) {
        const timeSpan = currentMessageDiv.querySelector(".message-time");
        if (timeSpan) timeSpan.textContent = new Date().toLocaleTimeString();
        
        // Add audio controls
        addAudioControls(currentMessageDiv, currentResponseText, currentLanguage);
        
        // Auto-play if enabled
        if (autoPlayEnabled) {
            textToSpeech(currentResponseText, currentLanguage);
        }
    }
    currentMessageDiv = null;
    currentResponseText = "";
}

function addAudioControls(messageDiv, text, language) {
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
        try {
            await textToSpeech(text, language);
            playBtn.textContent = "Play Again";
            isPlaying = false;
        } catch {
            playBtn.textContent = "Error";
            setTimeout(() => {
                playBtn.textContent = "Play Audio";
                isPlaying = false;
            }, 2000);
        }
    };
    
    stopBtn.onclick = () => {
        window.speechSynthesis.cancel();
        playBtn.textContent = "Play Audio";
        isPlaying = false;
    };
    
    controlsDiv.appendChild(playBtn);
    controlsDiv.appendChild(stopBtn);
    
    const contentDiv = messageDiv.querySelector(".message-content");
    if (contentDiv) contentDiv.appendChild(controlsDiv);
}

async function textToSpeech(text, languageCode) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject(new Error("Speech not supported"));
            return;
        }
        
        window.speechSynthesis.cancel();
        
        const voiceMap = {
            'en': 'en-US', 'ar': 'ar-SA', 'es': 'es-ES',
            'fr': 'fr-FR', 'de': 'de-DE', 'hi': 'hi-IN'
        };
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voiceMap[languageCode] || 'en-US';
        utterance.rate = voiceSpeed;
        utterance.pitch = voicePitch;
        utterance.volume = 1;
        
        utterance.onend = () => resolve(true);
        utterance.onerror = (e) => reject(e);
        
        window.speechSynthesis.speak(utterance);
    });
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
            <div class="message-text" style="color: #ef4444;">Unable to process request: ${escapeHtml(error)}</div>
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

function changeLanguage(langCode) {
    currentLanguage = langCode;
    localStorage.setItem("cy30rt_language", langCode);
    const texts = UI_TEXTS[langCode] || UI_TEXTS["en"];
    document.getElementById("statusText").innerText = texts.online;
    document.getElementById("typingText").innerText = texts.typing;
    addSystemMessage(`Language changed to ${LANGUAGES[langCode].name}`);
    closeLanguageModal();
}

// Voice input
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

// Settings
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

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    
    document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
    document.getElementById("messageInput")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    document.getElementById("languageBtn")?.addEventListener("click", () => {
        const modal = document.getElementById("languageModal");
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
    });
    
    document.getElementById("settingsBtn")?.addEventListener("click", showSettingsModal);
    document.querySelector(".modal-close")?.addEventListener("click", () => {
        document.getElementById("languageModal").classList.remove("active");
    });
    document.querySelector(".modal-close-settings")?.addEventListener("click", closeSettingsModal);
    
    document.getElementById("autoPlayToggle")?.addEventListener("change", saveSettings);
    document.getElementById("voiceReadbackToggle")?.addEventListener("change", saveSettings);
    document.getElementById("voiceSpeed")?.addEventListener("input", saveSettings);
    document.getElementById("voicePitch")?.addEventListener("input", saveSettings);
    
    setupVoiceInput();
    
    const savedLang = localStorage.getItem("cy30rt_language");
    if (savedLang && LANGUAGES && LANGUAGES[savedLang]) {
        currentLanguage = savedLang;
        document.getElementById("languageScreen").style.display = "none";
        document.getElementById("mainApp").classList.add("active");
    }
});

// Auto-resize textarea
document.addEventListener("input", function(e) {
    if (e.target.id === "messageInput") {
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }
});
