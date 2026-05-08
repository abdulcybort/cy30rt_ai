// Cy30rt_AI - WORKING VERSION
const API_URL = "https://cy30rt-ai.onrender.com";

// Send message function
async function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    const chatMessages = document.getElementById("chatMessages");
    const userDiv = document.createElement("div");
    userDiv.className = "message user";
    userDiv.innerHTML = `
        <div class="message-avatar">U</div>
        <div class="message-content message-box user-box">
            <div class="message-header">
                <span class="message-sender">You</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-text">${escapeHtml(message)}</div>
        </div>
    `;
    chatMessages.appendChild(userDiv);
    
    input.value = "";
    scrollToBottom();
    
    // Add loading indicator
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "message ai";
    loadingDiv.id = "loadingMessage";
    loadingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content message-box">
            <div class="message-header">
                <span class="message-sender">Cy30rt_AI</span>
                <span class="message-time">Typing...</span>
            </div>
            <div class="message-text">Thinking...</div>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    scrollToBottom();
    
    try {
        // Call the API
        const response = await fetch(`${API_URL}/api/chat`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                language: "en"
            })
        });
        
        // Remove loading indicator
        loadingDiv.remove();
        
        // Get the response as text
        const responseText = await response.text();
        
        // Add AI response to chat
        const aiDiv = document.createElement("div");
        aiDiv.className = "message ai";
        aiDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content message-box">
                <div class="message-header">
                    <span class="message-sender">Cy30rt_AI</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-text">${escapeHtml(responseText.substring(0, 2000))}</div>
            </div>
        `;
        chatMessages.appendChild(aiDiv);
        scrollToBottom();
        
    } catch (error) {
        loadingDiv.remove();
        
        const errorDiv = document.createElement("div");
        errorDiv.className = "message ai";
        errorDiv.innerHTML = `
            <div class="message-avatar">⚠️</div>
            <div class="message-content message-box error-box">
                <div class="message-header">
                    <span class="message-sender">System</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-text" style="color: #ef4444;">Error: ${escapeHtml(error.message)}</div>
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        scrollToBottom();
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const container = document.getElementById("chatContainer");
    if (container) container.scrollTop = container.scrollHeight;
}

// Setup event listeners when page loads
document.addEventListener("DOMContentLoaded", () => {
    const sendBtn = document.getElementById("sendBtn");
    if (sendBtn) sendBtn.addEventListener("click", sendMessage);
    
    const messageInput = document.getElementById("messageInput");
    if (messageInput) {
        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    console.log("Cy30rt_AI Ready - API URL:", API_URL);
});
