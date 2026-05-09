from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .ai_service import cy30rt_ai
from pydantic import BaseModel
import httpx
import subprocess
import json
import os

app = FastAPI(title="Cy30rt_AI API", version="4.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BOT_TOKEN = "8722134255:AAGCDtKU0qBuh60z6fBt5RVP0_a7HTM1Vqc"

# Store conversation history per user/session
conversation_memory = {}

class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    session_id: str = None
    history: list = None

class ReconRequest(BaseModel):
    target: str
    options: dict = {}

def get_conversation_context(session_id: str, max_messages: int = 10) -> str:
    """Get recent conversation history for context"""
    if session_id not in conversation_memory:
        return ""
    
    history = conversation_memory[session_id][-max_messages:]
    if not history:
        return ""
    
    context = "Previous conversation for context:\n"
    for msg in history:
        role = "User" if msg["role"] == "user" else "Assistant"
        context += f"{role}: {msg['content']}\n"
    context += "\nBased on the conversation above, respond to the user's latest message. Maintain consistency and refer back to previous topics when relevant.\n"
    return context

@app.get("/")
async def root():
    return {
        "name": "Cy30rt_AI",
        "creator": "Abdulbasid Yakubu (cy30rt)",
        "status": "online",
        "version": "4.0.0",
        "features": ["Teaching", "Bug Bounty", "Conversation Memory", "Voice", "15 Languages", "N-ATLAS"]
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """AI chat endpoint with full conversation memory"""
    
    session_id = request.session_id or "default"
    
    # Store user message in memory
    if session_id not in conversation_memory:
        conversation_memory[session_id] = []
    
    conversation_memory[session_id].append({
        "role": "user",
        "content": request.message,
        "timestamp": None
    })
    
    # Get conversation context
    context = get_conversation_context(session_id)
    
    async def generate():
        full_response = ""
        
        # Build prompt with context
        if context:
            full_prompt = f"{context}\n\nUser: {request.message}\nAssistant:"
        else:
            full_prompt = request.message
        
        async for chunk in cy30rt_ai.chat(full_prompt, request.language):
            full_response += chunk
            yield chunk
        
        # Store AI response in memory
        conversation_memory[session_id].append({
            "role": "assistant",
            "content": full_response,
            "timestamp": None
        })
        
        # Keep only last 30 messages to prevent memory bloat
        if len(conversation_memory[session_id]) > 30:
            conversation_memory[session_id] = conversation_memory[session_id][-30:]
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(generate(), media_type="text/plain")

@app.post("/api/recon")
async def run_recon(request: ReconRequest):
    try:
        target = request.target
        options = request.options
        
        if not target:
            return {"error": "No target provided", "success": False}
        
        cmd = ["reconix", target]
        
        if options.get("deep"):
            cmd.append("--deep")
        if options.get("js"):
            cmd.append("--js")
        if options.get("historical"):
            cmd.append("--historical")
        if options.get("aggressive"):
            cmd.append("--aggressive")
        if options.get("threads"):
            cmd.extend(["--threads", str(options["threads"])])
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        output = result.stdout + result.stderr
        
        findings = {
            "subdomains": [],
            "technologies": [],
            "endpoints": [],
            "secrets": [],
            "vulnerabilities": []
        }
        
        for line in output.split('\n'):
            if '[SUBDOMAIN]' in line:
                findings["subdomains"].append(line.replace('[SUBDOMAIN]', '').strip())
            elif '[TECH]' in line:
                findings["technologies"].append(line.replace('[TECH]', '').strip())
            elif '[JS_ENDPOINT]' in line or '[API]' in line:
                findings["endpoints"].append(line.split(']')[1].strip() if ']' in line else line)
            elif '[SECRET]' in line or '[KEY]' in line:
                findings["secrets"].append(line.split(']')[1].strip() if ']' in line else line)
            elif '[CVE]' in line or '[VULN]' in line:
                findings["vulnerabilities"].append(line.split(']')[1].strip() if ']' in line else line)
        
        return {
            "success": True,
            "target": target,
            "output": output[:8000],
            "findings": findings,
            "summary": {
                "subdomains_found": len(findings["subdomains"]),
                "technologies_found": len(findings["technologies"]),
                "endpoints_found": len(findings["endpoints"]),
                "secrets_found": len(findings["secrets"]),
                "vulnerabilities_found": len(findings["vulnerabilities"])
            }
        }
        
    except subprocess.TimeoutExpired:
        return {"error": "Scan timed out after 5 minutes", "success": False}
    except FileNotFoundError:
        return {"error": "Reconix not installed. Run: npm install -g @aquibk/reconix", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}

@app.post("/webhook")
async def webhook(request: Request):
    try:
        data = await request.json()
        print(f"Webhook received: {data}")
        
        if "message" in data:
            msg = data["message"]
            chat_id = msg["chat"]["id"]
            text = msg.get("text", "")
            
            # Cancel commands
            if text in ["/cancel", "/stop", "/terminate", "/kill"]:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "⏹️ Operation cancelled."
                        }
                    )
                return {"status": "ok"}
            
            # Help command
            if text == "/help":
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🤖 **Cy30rt_AI Commands**\n\n/recon <target> - Scan target\n/payload <type> - Get payloads\n/cve <id> - Look up CVE\n/learn <topic> - Learn\n/help - This help\n\n💡 Just ask me anything! I remember our conversation."
                        }
                    )
                return {"status": "ok"}
            
            # Start command
            if text == "/start":
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🤖 **Welcome to Cy30rt_AI!**\n\nYour cybersecurity assistant with conversation memory.\n\n💡 I remember our conversation! Ask me something, then follow up with questions like 'tell me more' or 'how to prevent it'.\n\nOpen the Mini App for full features!",
                            "reply_markup": {
                                "inline_keyboard": [[{
                                    "text": "🚀 Open Cy30rt_AI Mini App",
                                    "web_app": {"url": "https://cy30rt-miniapp.onrender.com"}
                                }]]
                            }
                        }
                    )
                return {"status": "ok"}
            
            # Who command
            if text == "/who":
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🤖 **Cy30rt_AI**\n\nCreated by Abdulbasid Yakubu (cy30rt)\n\nFeatures: Cybersecurity assistant, bug bounty tools, N-ATLAS for Hausa/Yoruba/Igbo, conversation memory, voice input, 15+ languages."
                        }
                    )
                return {"status": "ok"}
            
            # Regular message - send to AI with context
            else:
                # Get or create session for this user
                session_id = f"telegram_{chat_id}"
                
                # Store user message
                if session_id not in conversation_memory:
                    conversation_memory[session_id] = []
                
                conversation_memory[session_id].append({
                    "role": "user",
                    "content": text
                })
                
                # Get context
                context = get_conversation_context(session_id)
                
                # Call AI with context
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://cy30rt-ai.onrender.com/api/chat",
                        json={
                            "message": text,
                            "language": "en",
                            "session_id": session_id,
                            "history": conversation_memory[session_id][-10:]
                        },
                        timeout=60.0
                    )
                    
                    ai_response = response.text
                    
                    # Store AI response
                    conversation_memory[session_id].append({
                        "role": "assistant",
                        "content": ai_response
                    })
                    
                    # Send response
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": f"🤖 **Cy30rt_AI:**\n\n{ai_response[:4000]}"
                        }
                    )
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
