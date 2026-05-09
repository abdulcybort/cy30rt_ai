// TEST VERSION - JUST TO SEE IF BUTTONS WORK
console.log("Test script loaded");

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded");
    
    const sendBtn = document.getElementById("sendBtn");
    const messageInput = document.getElementById("messageInput");
    
    console.log("Send button found:", sendBtn);
    console.log("Message input found:", messageInput);
    
    if (sendBtn) {
        sendBtn.addEventListener("click", function() {
            const message = messageInput.value;
            console.log("Send clicked:", message);
            alert("You typed: " + message);
        });
    }
    
    if (messageInput) {
        messageInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                console.log("Enter pressed");
                const message = messageInput.value;
                alert("You typed: " + message);
            }
        });
    }
});
