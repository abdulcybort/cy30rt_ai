// Cy30rt_AI - Main Application Logic
// Created by Abdulbasid Yakubu (cy30rt)

let currentResponseDiv = null;
let currentResponseText = "";

// Send message function
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
    if (currentResponseDiv) {
        const timeDiv = currentResponseDiv.querySelector(".message-time");
        timeDiv.textContent = new Date().toLocaleTimeString();
    }
    currentResponseDiv = null;
    currentResponseText = "";
}

function addErrorMessage(error) {
    const texts = UI_TEXTS?.[currentLanguage] || UI_TEXTS?.en || {};
    const chatMessages = document.getElementById("chatMessages");
    const errorDiv = document.createElement("div");
    errorDiv.className = "message ai-message";
    errorDiv.innerHTML = `
        <div class="message-avatar">⚠️</div>
        <div class="message-content">
            <div class="message-text" style="color: #ff4444;">Error: ${escapeHtml(error)}<br><br>Please try again.</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    chatMessages.appendChild(errorDiv);
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

// Handle quick action buttons
function handleQuickAction(action) {
    let message = "";
    switch(action) {
        case "learn":
            message = "I want to learn about SQL injection. Can you teach me?";
            break;
        case "payloads":
            message = "Show me SQL injection payload examples";
            break;
        case "labs":
            message = "Recommend some practice labs for beginners";
            break;
        case "tutorials":
            message = "Give me a step-by-step tutorial for SQL injection";
            break;
    }
    if (message) {
        document.getElementById("messageInput").value = message;
        sendMessage();
    }
}

// Voice input setup
function setupVoiceInput() {
    const voiceBtn = document.getElementById("voiceBtn");
    if (!voiceBtn) return;
    
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    
    if (!SpeechRecognition) {
        voiceBtn.style.opacity = "0.5";
        voiceBtn.title = "Voice not supported in this browser";
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    
    voiceBtn.onclick = () => {
        recognition.start();
        voiceBtn.textContent = "🔴";
        voiceBtn.style.background = "rgba(255,0,0,0.2)";
    };
    
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        document.getElementById("messageInput").value = text;
        sendMessage();
        voiceBtn.textContent = "🎤";
        voiceBtn.style.background = "";
    };
    
    recognition.onerror = () => {
        voiceBtn.textContent = "🎤";
        voiceBtn.style.background = "";
    };
    
    recognition.onend = () => {
        voiceBtn.textContent = "🎤";
        voiceBtn.style.background = "";
    };
}

// Show language modal
function showLanguageModal() {
    const modal = document.getElementById("languageModal");
    if (modal) modal.classList.add("active");
}

function closeLanguageModal() {
    const modal = document.getElementById("languageModal");
    if (modal) modal.classList.remove("active");
}

// Initialize event listeners
document.addEventListener("DOMContentLoaded", () => {
    // Send button
    const sendBtn = document.getElementById("sendBtn");
    if (sendBtn) sendBtn.addEventListener("click", sendMessage);
    
    // Enter key
    const messageInput = document.getElementById("messageInput");
    if (messageInput) {
        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Language button
    const languageBtn = document.getElementById("languageBtn");
    if (languageBtn) languageBtn.addEventListener("click", showLanguageModal);
    
    // Close modal
    const closeModal = document.querySelector(".close-modal");
    if (closeModal) closeModal.addEventListener("click", closeLanguageModal);
    
    // Quick action buttons
    document.querySelectorAll(".action-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.getAttribute("data-action");
            if (action) handleQuickAction(action);
        });
    });
    
    // Voice input
    setupVoiceInput();
    
    // Click outside modal to close
    window.onclick = (event) => {
        const modal = document.getElementById("languageModal");
        if (event.target === modal) closeLanguageModal();
    };
});
