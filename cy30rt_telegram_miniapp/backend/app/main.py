from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .ai_service import cy30rt_ai
from .language_service import LANGUAGES
from pydantic import BaseModel
import httpx

app = FastAPI(title="Cy30rt_AI API", version="3.0.0")

# CORS - Allow all origins for Telegram Mini App
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

@app.get("/")
async def root():
    return {
        "name": "Cy30rt_AI",
        "creator": "Abdulbasid Yakubu (cy30rt)",
        "status": "online",
        "apis": ["DeepSeek", "Cerebras", "Groq", "ContrastAPI"],
        "version": "3.0.0"
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """AI chat endpoint - uses DeepSeek as primary"""
    
    async def generate():
        async for chunk in cy30rt_ai.chat(request.message, request.language):
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
            
            if text == "/start":
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🤖 Welcome to Cy30rt_AI!\n\nYour professional cybersecurity AI assistant.\n\nCreated by Abdulbasid Yakubu (cy30rt)\n\nClick the button below to open the Mini App.",
                            "reply_markup": {
                                "inline_keyboard": [[{
                                    "text": "🚀 Open Cy30rt_AI",
                                    "web_app": {"url": "https://cy30rt-miniapp.onrender.com"}
                                }]]
                            }
                        }
                    )
        return {"status": "ok"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
