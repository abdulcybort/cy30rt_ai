from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .ai_service import cy30rt_ai
from .language_service import LANGUAGES, get_text
from .models import ChatRequest, PayloadRequest
import os
import httpx

app = FastAPI(title="Cy30rt_AI API", version="1.0.0")

# CORS for Telegram Mini App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Your Bot Token (keep it here or move to environment variable)
BOT_TOKEN = "8722134255:AAGCDtKU0qBuh60z6fBt5RVP0_a7HTM1Vqc"

@app.get("/")
async def root():
    return {
        "name": "Cy30rt_AI",
        "creator": "Abdulbasid Yakubu (cy30rt)",
        "description": "Cybersecurity Teaching Assistant",
        "languages": LANGUAGES,
        "version": "1.0.0"
    }

@app.get("/api/languages")
async def get_languages():
    """Get all supported languages"""
    return {"languages": LANGUAGES}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """AI chat endpoint with language support"""
    
    async def generate():
        async for chunk in cy30rt_ai.chat(request.message, request.language):
            yield chunk
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(generate(), media_type="text/plain")

@app.get("/api/payloads/{category}")
async def get_payloads(category: str, language: str = "en"):
    """Get payloads by category"""
    return {"category": category, "language": language}

@app.get("/api/labs")
async def get_labs(language: str = "en"):
    """Get practice lab recommendations"""
    labs = [
        {"id": "dvwa", "name": "DVWA", "url": "http://dvwa.co.uk", "difficulty": "Beginner"},
        {"id": "juice_shop", "name": "Juice Shop", "url": "https://juice-shop.herokuapp.com", "difficulty": "Beginner"},
        {"id": "portswigger", "name": "PortSwigger Academy", "url": "https://portswigger.net/web-security", "difficulty": "All Levels"},
        {"id": "hackthebox", "name": "Hack The Box", "url": "https://www.hackthebox.com", "difficulty": "Intermediate"},
        {"id": "tryhackme", "name": "TryHackMe", "url": "https://tryhackme.com", "difficulty": "Beginner"}
    ]
    return {"labs": labs}

# ============ TELEGRAM WEBHOOK ENDPOINT ============

async def send_telegram_message(chat_id: int, text: str, reply_markup: dict = None):
    """Helper function to send messages via Telegram API"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload)

@app.post("/webhook")
async def webhook(request: Request):
    try:
        update_data = await request.json()
        print(f"Received update: {update_data}")
        
        # Check if it's a message
        if "message" in update_data:
            message = update_data["message"]
            chat_id = message["chat"]["id"]
            text = message.get("text", "")
            
            # Handle /start command
            if text == "/start":
                await send_telegram_message(chat_id, 
                    "🤖 **Welcome to Cy30rt_AI!**\n\n"
                    "Your AI-Powered Cybersecurity Teaching Assistant\n\n"
                    "Created by **Abdulbasid Yakubu (cy30rt)**\n\n"
                    "Click the button below to open the Mini App!",
                    reply_markup={
                        "inline_keyboard": [[{
                            "text": "🚀 Launch Cy30rt_AI Mini App",
                            "web_app": {"url": "https://cy30rt-miniapp.onrender.com"}
                        }]]
                    }
                )
            else:
                await send_telegram_message(chat_id,
                    "Please use the Mini App for AI chat: https://cy30rt-miniapp.onrender.com")
        
        return {"status": "ok"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ============ END WEBHOOK ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
