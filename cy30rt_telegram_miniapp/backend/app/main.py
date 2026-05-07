from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .ai_service import cy30rt_ai
from .language_service import LANGUAGES, get_text
from .models import ChatRequest, PayloadRequest
import os

app = FastAPI(title="Cy30rt_AI API", version="1.0.0")

# CORS for Telegram Mini App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    # Will implement full payload database
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)