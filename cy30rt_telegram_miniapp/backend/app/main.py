from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .ai_service import cy30rt_ai
from .language_service import LANGUAGES
from .models import ChatRequest
import os
import httpx

app = FastAPI(title="Cy30rt_AI API", version="2.0.0")

# CORS for Telegram Mini App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Your Bot Token
BOT_TOKEN = "8722134255:AAGCDtKU0qBuh60z6fBt5RVP0_a7HTM1Vqc"

@app.get("/")
async def root():
    return {
        "name": "Cy30rt_AI",
        "creator": "Abdulbasid Yakubu (cy30rt)",
        "description": "Professional Cybersecurity Intelligence Assistant",
        "apis": {
            "primary": "Cerebras (ultra-fast)",
            "backup": "Groq",
            "intel": "ContrastAPI (CVE, Domain, IP, Hash)"
        },
        "languages": LANGUAGES,
        "version": "2.0.0"
    }

@app.get("/api/languages")
async def get_languages():
    return {"languages": LANGUAGES}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """AI chat endpoint with intelligent API routing"""
    
    async def generate():
        async for chunk in cy30rt_ai.chat(request.message, request.language):
            yield chunk
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(generate(), media_type="text/plain")

@app.get("/api/cve/{cve_id}")
async def get_cve(cve_id: str):
    """Get real CVE intelligence"""
    result = await cy30rt_ai.get_cve_info(cve_id)
    return result

@app.get("/api/domain/{domain}")
async def get_domain_info(domain: str):
    """Get domain reconnaissance"""
    result = await cy30rt_ai.domain_recon(domain)
    return result

@app.get("/api/ip/{ip_address}")
async def get_ip_info(ip_address: str):
    """Get IP reputation"""
    result = await cy30rt_ai.ip_lookup(ip_address)
    return result

@app.get("/api/hash/{file_hash}")
async def get_hash_info(file_hash: str):
    """Get file hash intelligence"""
    result = await cy30rt_ai.hash_lookup(file_hash)
    return result

# ============ TELEGRAM WEBHOOK ============

async def send_telegram_message(chat_id: int, text: str, reply_markup: dict = None):
    """Send message via Telegram"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload)

@app.post("/webhook")
async def webhook(request: Request):
    try:
        update_data = await request.json()
        print(f"Received: {update_data}")
        
        if "message" in update_data:
            message = update_data["message"]
            chat_id = message["chat"]["id"]
            text = message.get("text", "")
            
            if text == "/start":
                await send_telegram_message(chat_id,
                    "🤖 <b>Cy30rt_AI - Cybersecurity Intelligence</b>\n\n"
                    "Created by Abdulbasid Yakubu (cy30rt)\n\n"
                    "Powered by: Cerebras AI + ContrastAPI + Groq\n\n"
                    "Click the button below to access the full platform.",
                    reply_markup={
                        "inline_keyboard": [[{
                            "text": "🚀 Launch Cy30rt_AI",
                            "web_app": {"url": "https://cy30rt-miniapp.onrender.com"}
                        }]]
                    }
                )
            else:
                await send_telegram_message(chat_id,
                    "Please use the Mini App for full AI assistance:\n"
                    "https://cy30rt-miniapp.onrender.com")
        
        return {"status": "ok"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
