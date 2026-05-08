from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .ai_service import cy30rt_ai
from pydantic import BaseModel
import httpx
import subprocess
import json
import os

app = FastAPI(title="Cy30rt_AI API", version="4.0.0")

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

class ReconRequest(BaseModel):
    target: str
    options: dict = {}

@app.get("/")
async def root():
    return {
        "name": "Cy30rt_AI",
        "creator": "Abdulbasid Yakubu (cy30rt)",
        "status": "online",
        "version": "4.0.0",
        "features": ["Teaching", "Bug Bounty", "Reconix Integration", "Voice", "15 Languages"]
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """AI chat endpoint - returns complete responses"""
    
    async def generate():
        async for chunk in cy30rt_ai.chat(request.message, request.language):
            yield chunk
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(generate(), media_type="text/plain")

@app.post("/api/recon")
async def run_recon(request: ReconRequest):
    """Run Reconix scan on target - Integrated into AI"""
    try:
        target = request.target
        options = request.options
        
        if not target:
            return {"error": "No target provided", "success": False}
        
        # Build command
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
        if options.get("output"):
            cmd.extend(["--output", options["output"]])
        
        # Run command with timeout
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        output = result.stdout + result.stderr
        
        # Parse output for findings
        findings = {
            "subdomains": [],
            "technologies": [],
            "endpoints": [],
            "secrets": [],
            "vulnerabilities": []
        }
        
        # Simple parsing of output
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
            "output": output[:8000],  # Limit output size
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
            
            if text == "/start":
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🤖 Welcome to Cy30rt_AI!\n\nYour professional cybersecurity and bug bounty assistant.\n\nCreated by Abdulbasid Yakubu (cy30rt)\n\n✅ Features:\n• Cybersecurity Teaching\n• Bug Bounty Recon (Reconix)\n• Payload Generation\n• CVE Lookup\n• Voice Input\n• 15 Languages\n\nClick the button below to open the Mini App!",
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
