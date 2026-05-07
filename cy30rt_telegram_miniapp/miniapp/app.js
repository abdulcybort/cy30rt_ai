// Cy30rt_AI - Main Application Logic
// Created by Abdulbasid Yakubu (cy30rt)

let ws = null;
let currentResponseDiv = null;
let currentResponseText = "";
let isVoiceSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSavedLanguage();
    setupEventListeners();
    setupVoiceInput();
    setupTelegramIntegration();
});

function loadSavedLanguage() {
    const savedLang = localStorage.getItem("cy30rt_language");
    if (savedLang && LANGUAGES[savedLang]) {
        currentLanguage = savedLang;
        renderLanguageGrid();
        loadLanguage(currentLanguage);
        showMainApp();
    } else {
        renderLanguageGrid();
        document.getElementById("languageScreen").classList.add("active");
    }
}

function renderLanguageGrid() {
    const grid = document.getElementById("languageGrid");
    grid.innerHTML = "";

    Object.entries(LANGUAGES).forEach(([code, lang]) => {
        const item = document.createElement("div");
        item.className = "language-item";
        item.onclick = () => selectLanguage(code);
        item.innerHTML = `
            <div class="language-flag">${lang.flag}</div>
            <div class="language-name">${lang.name}</div>
            <div class="language-native">${lang.native}</div>
        `;
        grid.appendChild(item);
    });

    // Also render modal grid
    const modalGrid = document.getElementById("languageModalGrid");
    if (modalGrid) {
        modalGrid.innerHTML = "";
        Object.entries(LANGUAGES).forEach(([code, lang]) => {
            const item = document.createElement("div");
            item.className = "language-item";
            item.onclick = () => {
                selectLanguage(code);
                closeLanguageModal();
            };
            item.innerHTML = `
                <div class="language-flag">${lang.flag}</div>
                <div class="language-name">${lang.name}</div>
                <div class="language-native">${lang.native}</div>
            `;
            modalGrid.appendChild(item);
        });
    }
}

function selectLanguage(langCode) {
    currentLanguage = langCode;
    loadLanguage(langCode);
    localStorage.setItem("cy30rt_language", langCode);

    // Hide language screen and show main app
    document.getElementById("languageScreen").classList.add("hidden");
    showMainApp();

    // Update welcome message in new language
    updateWelcomeMessage();
}

function showMainApp() {
    document.getElementById("languageScreen").style.display = "none";
    document.getElementById("mainApp").classList.add("active");
}

function updateWelcomeMessage() {
    const texts = UI_TEXTS[currentLanguage] || UI_TEXTS["en"];
    const chatMessages = document.getElementById("chatMessages");

    // Clear existing messages
    chatMessages.innerHTML = `
        <div class="message ai-message">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-text">
                    ${texts.welcome}<br><br>
                    ${texts.welcome_creator}<br><br>
                    How can I help you today?
                </div>
                <div class="message-time">Just now</div>
            </div>
        </div>
    `;
}

function setupEventListeners() {
    // Send message
    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("messageInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Language button
    document.getElementById("languageBtn").addEventListener("click", showLanguageModal);

    // Voice button
    document.getElementById("voiceBtn").addEventListener("click", startVoiceInput);

    // Quick actions
    document.querySelectorAll(".action-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.getAttribute("data-action");
            handleQuickAction(action);
        });
    });

    // Modal close
    document.querySelector(".close-modal") ? .addEventListener("click", closeLanguageModal);
}

function handleQuickAction(action) {
    const texts = UI_TEXTS[currentLanguage] || UI_TEXTS["en"];

    switch (action) {
        case "learn":
            document.getElementById("messageInput").value = "/learn";
            sendMessage();
            break;
        case "payloads":
            document.getElementById("messageInput").value = "/payloads";
            sendMessage();
            break;
        case "labs":
            document.getElementById("messageInput").value = "/labs";
            sendMessage();
            break;
        case "tutorials":
            document.getElementById("messageInput").value = "/tutorials";
            sendMessage();
            break;
    }
}

async function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();

    if (!message) return;

    // Add user message to chat
    addUserMessage(message);
    input.value = "";

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch(`https://your-backend.com/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                language: currentLanguage
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

function setupVoiceInput() {
    if (!isVoiceSupported) {
        document.getElementById("voiceBtn").style.opacity = "0.5";
        document.getElementById("voiceBtn").title = "Voice not supported";
        return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getSpeechLanguage(currentLanguage);

    document.getElementById("voiceBtn").onclick = () => {
        recognition.start();
        document.getElementById("voiceBtn").textContent = "🔴";
    };

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        document.getElementById("messageInput").value = text;
        document.getElementById("voiceBtn").textContent = "🎤";
        sendMessage();
    };

    recognition.onerror = () => {
        document.getElementById("voiceBtn").textContent = "🎤";
    };

    recognition.onend = () => {
        document.getElementById("voiceBtn").textContent = "🎤";
    };
}

function getSpeechLanguage(langCode) {
    const map = {
        "en": "en-US",
        "es": "es-ES",
        "fr": "fr-FR",
        "de": "de-DE",
        "pt": "pt-BR",
        "ru": "ru-RU",
        "zh": "zh-CN",
        "ja": "ja-JP",
        "ko": "ko-KR",
        "hi": "hi-IN",
        "tr": "tr-TR",
        "ar": "ar-SA"
    };
    return map[langCode] || "en-US";
}

function addUserMessage(text) {
    const chatMessages = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user-message";
    messageDiv.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(text)}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function startNewAIMessage() {
    const chatMessages = document.getElementById("chatMessages");
    currentResponseDiv = document.createElement("div");
    currentResponseDiv.className = "message ai-message";
    currentResponseDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-text" id="streamingText"></div>
            <div class="message-time">Streaming...</div>
        </div>
    `;
    chatMessages.appendChild(currentResponseDiv);
    currentResponseText = "";
    scrollToBottom();
}

function appendToCurrentMessage(chunk) {
    currentResponseText += chunk;
    const textDiv = currentResponseDiv.querySelector(".message-text");
    textDiv.innerHTML = escapeHtml(currentResponseText).replace(/\n/g, "<br>");
    scrollToBottom();
}

function finishCurrentMessage() {
    const timeDiv = currentResponseDiv.querySelector(".message-time");
    timeDiv.textContent = new Date().toLocaleTimeString();
    currentResponseDiv = null;
    currentResponseText = "";
}

function addErrorMessage(error) {
    const texts = UI_TEXTS[currentLanguage] || UI_TEXTS["en"];
    const chatMessages = document.getElementById("chatMessages");
    const errorDiv = document.createElement("div");
    errorDiv.className = "message ai-message";
    errorDiv.innerHTML = `
        <div class="message-avatar">⚠️</div>
        <div class="message-content">
            <div class="message-text" style="color: #ff4444;">${texts.error}<br><br>${escapeHtml(error)}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    const texts = UI_TEXTS[currentLanguage] || UI_TEXTS["en"];
    document.getElementById("typingText").textContent = texts.typing;
    indicator.style.display = "flex";
    scrollToBottom();
}

function hideTypingIndicator() {
    document.getElementById("typingIndicator").style.display = "none";
}

function showLanguageModal() {
    document.getElementById("languageModal").classList.add("active");
}

function closeLanguageModal() {
    document.getElementById("languageModal").classList.remove("active");
}

function scrollToBottom() {
    const container = document.getElementById("chatContainer");
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function setupTelegramIntegration() {
    if (window.TelegramWebApp) {
        const tg = window.TelegramWebApp;
        tg.ready();
        tg.expand();

        // Set theme colors
        if (tg.themeParams) {
            document.documentElement.style.setProperty('--cyber-dark', tg.themeParams.bg_color || '#0a0c10');
        }
    }
}