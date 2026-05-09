from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .ai_service import cy30rt_ai
from pydantic import BaseModel
import httpx
import json
import os

app = FastAPI(title="Cy30rt_AI API", version="5.0.0")

# CORS - Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BOT_TOKEN = "8722134255:AAGCDtKU0qBuh60z6fBt5RVP0_a7HTM1Vqc"

class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    session_id: str = None
    context: list = []

@app.get("/")
async def root():
    return {
        "name": "Cy30rt_AI",
        "creator": "Abdulbasid Yakubu (cy30rt)",
        "status": "online",
        "version": "5.0.0",
        "features": ["Conversation Memory", "Stop Button", "Hausa Language", "Voice", "15 Languages", "Bug Bounty Recon"]
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """AI chat endpoint with context memory and conversation understanding"""
    
    async def generate():
        async for chunk in cy30rt_ai.chat(
            request.message, 
            request.language, 
            request.context,
            request.session_id
        ):
            yield chunk
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(generate(), media_type="text/plain")

@app.post("/webhook")
async def webhook(request: Request):
    try:
        data = await request.json()
        print(f"Webhook received: {data}")
        
        if "message" in data:
            msg = data["message"]
            chat_id = msg["chat"]["id"]
            text = msg.get("text", "")
            
            # Send typing action
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/sendChatAction",
                    json={"chat_id": chat_id, "action": "typing"}
                )
            
            if text == "/start" or text == "/help":
                help_text = """🤖 **Cy30rt_AI - Cybersecurity Assistant**

Created by Abdulbasid Yakubu (cy30rt)

**Commands:**
/recon <target> - Fast reconnaissance
/payload <type> - Get payloads (sqli, xss, ssti, lfi)
/cve <id> - Look up CVE
/help - Show this help

**Features:**
• Remembers previous messages (context awareness)
• Supports 15 languages including Hausa العربية English
• Voice input and text-to-speech
• Bug bounty reconnaissance tools

⚠️ Type /help anytime

Stay secure. - Cy30rt_AI"""
                
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={"chat_id": chat_id, "text": help_text, "parse_mode": "Markdown"}
                    )
                
                # Send Mini App button
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🚀 Open the full AI experience:",
                            "reply_markup": {
                                "inline_keyboard": [[{
                                    "text": "Open Cy30rt_AI Mini App",
                                    "web_app": {"url": "https://cy30rt-miniapp.onrender.com"}
                                }]]
                            }
                        }
                    )
                return {"status": "ok"}
            
            # Handle other commands
            elif text.startswith("/recon") or text.startswith("/payload") or text.startswith("/cve"):
                # For commands, just echo that they work in Mini App
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": f"🔍 Command received: {text}\n\nFor full features including recon results, payloads, and CVE lookup, please open the Mini App:\nhttps://cy30rt-miniapp.onrender.com",
                            "parse_mode": "Markdown"
                        }
                    )
                return {"status": "ok"}
            
            # Handle regular messages with AI
            else:
                try:
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        response = await client.post(
                            "https://cy30rt-ai.onrender.com/api/chat",
                            json={"message": text, "language": "en"}
                        )
                        ai_response = response.text
                        
                        if len(ai_response) > 4000:
                            ai_response = ai_response[:4000] + "..."
                        
                        async with httpx.AsyncClient() as send_client:
                            await send_client.post(
                                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                                json={"chat_id": chat_id, "text": f"🤖 **Cy30rt_AI:**\n\n{ai_response}", "parse_mode": "Markdown"}
                            )
                except Exception as e:
                    async with httpx.AsyncClient() as send_client:
                        await send_client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": f"🤖 **Cy30rt_AI:**\n\nHello! I am Cy30rt_AI, your cybersecurity assistant created by Abdulbasid Yakubu (cy30rt).\n\nFor full features including voice, 15 languages, and bug bounty tools, please open the Mini App:\nhttps://cy30rt-miniapp.onrender.com",
                                "parse_mode": "Markdown"
                            }
                        )
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
