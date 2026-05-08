from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .ai_service import cy30rt_ai
from pydantic import BaseModel
import httpx
import subprocess
import json
import os
import asyncio

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

# Function to send Telegram message
async def send_telegram_message(chat_id: int, text: str, parse_mode: str = "Markdown"):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": parse_mode
            }
        )

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
        
        # Parse findings
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
            
            # ============ /start COMMAND ============
            if text == "/start":
                await send_telegram_message(
                    chat_id,
                    "🤖 **Welcome to Cy30rt_AI!**\n\nYour professional cybersecurity and bug bounty assistant.\n\n**Created by:** Abdulbasid Yakubu (cy30rt)\n\n**Available Commands:**\n🔍 /recon <target> - Full reconnaissance\n💉 /payload <type> - Get payloads\n📋 /cve <id> - Look up CVE\n📚 /learn <topic> - Learn cybersecurity\n❓ /help - Show all commands\n\n👇 Click below to open the Mini App!",
                    "Markdown"
                )
                # Send Mini App button
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🚀 Launch the full AI experience:",
                            "reply_markup": {
                                "inline_keyboard": [[{
                                    "text": "Open Cy30rt_AI Mini App",
                                    "web_app": {"url": "https://cy30rt-miniapp.onrender.com"}
                                }]]
                            }
                        }
                    )
            
            # ============ /help COMMAND ============
            elif text == "/help":
                await send_telegram_message(
                    chat_id,
                    "🤖 **Cy30rt_AI Commands**\n\n📚 **Learning:**\n/learn sqli - SQL injection tutorial\n/learn xss - XSS tutorial\n/learn ssti - SSTI tutorial\n\n🔍 **Bug Bounty:**\n/recon <target> - Full reconnaissance (auto-results)\n/payload sqli - SQL injection payloads\n/payload xss - XSS payloads\n/payload ssti - SSTI payloads\n/payload lfi - LFI/RFI payloads\n/cve <id> - Look up CVE\n\n💬 **General:**\n/help - Show this help\n/who - About the creator\n\n⚠️ Always test only on authorized targets!\n\nFor full features, open the Mini App!",
                    "Markdown"
                )
            
            # ============ /who COMMAND ============
            elif text in ["/who", "/creator", "/about"]:
                await send_telegram_message(
                    chat_id,
                    "🤖 **Cy30rt_AI**\n\nI am a professional cybersecurity and bug bounty assistant created by **Abdulbasid Yakubu (cy30rt)** , a cybersecurity professional.\n\n**My capabilities:**\n• Teach cybersecurity concepts\n• Run reconnaissance on authorized targets\n• Generate attack payloads\n• Look up CVE information\n\n⚠️ Always practice on authorized systems only!\n\nFor full features with AI analysis, open the Mini App!",
                    "Markdown"
                )
            
            # ============ /recon COMMAND (AUTO RESULTS) ============
            elif text.startswith("/recon"):
                target = text.replace("/recon", "").strip()
                if target:
                    # Send initial message
                    await send_telegram_message(
                        chat_id,
                        f"🔍 **Starting reconnaissance on {target}...**\n\n⏳ This will take 1-2 minutes.\n📊 Results will appear here automatically when complete.",
                        "Markdown"
                    )
                    
                    # Run Reconix in background
                    try:
                        cmd = ["reconix", target, "--deep", "--threads=10"]
                        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
                        output = result.stdout + result.stderr
                        
                        # Format results
                        results = f"✅ **Recon Complete - {target}**\n\n"
                        results += "```\n"
                        results += output[:3500]  # Limit to 3500 chars for Telegram
                        results += "\n```\n\n"
                        results += "⚠️ Only test on authorized targets!\n\n"
                        results += "💡 For AI analysis of these results, open the Mini App."
                        
                        await send_telegram_message(chat_id, results, "Markdown")
                        
                    except subprocess.TimeoutExpired:
                        await send_telegram_message(
                            chat_id,
                            f"❌ **Scan timed out after 3 minutes**\n\nTry a more specific target or use the Mini App for better results.",
                            "Markdown"
                        )
                    except FileNotFoundError:
                        await send_telegram_message(
                            chat_id,
                            f"❌ **Reconix not installed on server**\n\nPlease use the Mini App for reconnaissance.",
                            "Markdown"
                        )
                    except Exception as e:
                        await send_telegram_message(
                            chat_id,
                            f"❌ **Error:** {str(e)}\n\nPlease try again or use the Mini App.",
                            "Markdown"
                        )
                else:
                    await send_telegram_message(
                        chat_id,
                        "📋 **Usage:** /recon <target>\n\nExample: /recon scanme.nmap.org\n\nFor best results with AI analysis, open the Mini App!",
                        "Markdown"
                    )
            
            # ============ /payload COMMAND ============
            elif text.startswith("/payload"):
                vuln_type = text.replace("/payload", "").strip().lower()
                payloads = {
                    "sqli": "💉 **SQL Injection Payloads**\n\n```\n' OR '1'='1' --\nadmin' --\n' OR 1=1--\n' UNION SELECT null, username, password FROM users--\n' AND SLEEP(5)--\n```\n\n💡 For more payloads, open the Mini App!",
                    "xss": "🔓 **XSS Payloads**\n\n```\n<script>alert('XSS')</script>\n<img src=x onerror=alert(1)>\n<svg/onload=alert(1)>\n<body onload=alert(1)>\n```\n\n💡 For more payloads, open the Mini App!",
                    "ssti": "🧠 **SSTI Payloads**\n\n```\n{{7*7}}\n{{config}}\n{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}\n```\n\n💡 For more payloads, open the Mini App!",
                    "lfi": "📂 **LFI/RFI Payloads**\n\n```\n../../../../etc/passwd\n../../../etc/passwd%00\nphp://filter/convert.base64-encode/resource=index.php\n```\n\n💡 For more payloads, open the Mini App!"
                }
                
                if vuln_type in payloads:
                    await send_telegram_message(chat_id, payloads[vuln_type], "Markdown")
                else:
                    await send_telegram_message(
                        chat_id,
                        "📋 **Available payload types:** sqli, xss, ssti, lfi\n\nExample: /payload sqli\n\nFor more, open the Mini App!",
                        "Markdown"
                    )
            
            # ============ /cve COMMAND ============
            elif text.startswith("/cve"):
                cve_id = text.replace("/cve", "").strip().upper()
                if cve_id:
                    if not cve_id.startswith("CVE-"):
                        cve_id = f"CVE-{cve_id}"
                    
                    await send_telegram_message(
                        chat_id,
                        f"🔍 **Looking up {cve_id}...**\n\n⏳ Fetching CVE details...",
                        "Markdown"
                    )
                    
                    # Try to fetch CVE data
                    try:
                        async with httpx.AsyncClient() as client:
                            response = await client.get(f"https://cve.circl.lu/api/cve/{cve_id}")
                            if response.status_code == 200:
                                data = response.json()
                                cve_info = f"📋 **{cve_id}**\n\n"
                                cve_info += f"**Summary:** {data.get('summary', 'N/A')[:500]}\n\n"
                                cve_info += f"**CVSS Score:** {data.get('cvss', 'N/A')}\n\n"
                                cve_info += f"**Published:** {data.get('Published', 'N/A')}\n\n"
                                cve_info += "⚠️ For complete analysis, open the Mini App!"
                                await send_telegram_message(chat_id, cve_info, "Markdown")
                            else:
                                await send_telegram_message(
                                    chat_id,
                                    f"❌ Could not find {cve_id}\n\nCheck the ID format or use the Mini App for CVE lookup.",
                                    "Markdown"
                                )
                    except Exception as e:
                        await send_telegram_message(
                            chat_id,
                            f"❌ Error fetching CVE: {str(e)}\n\nUse the Mini App for reliable CVE lookup.",
                            "Markdown"
                        )
                else:
                    await send_telegram_message(
                        chat_id,
                        "📋 **Usage:** /cve CVE-YYYY-XXXX\n\nExample: /cve CVE-2024-6387",
                        "Markdown"
                    )
            
            # ============ /learn COMMAND ============
            elif text.startswith("/learn"):
                topic = text.replace("/learn", "").strip().lower()
                lessons = {
                    "sqli": "📚 **SQL Injection Lesson**\n\n**What is SQL Injection?**\nSQL injection occurs when user input is inserted directly into SQL queries without sanitization.\n\n**Example vulnerable code:**\n```php\n$query = \"SELECT * FROM users WHERE username = '\" . $_GET['user'] . \"'\";\n```\n\n**Test payload:** `' OR '1'='1' --`\n\n**Resulting query:**\n```sql\nSELECT * FROM users WHERE username = '' OR '1'='1' --'\n```\n\n💡 For full interactive lesson, open the Mini App!",
                    "xss": "📚 **XSS Lesson**\n\n**What is Cross-Site Scripting?**\nInjecting malicious JavaScript into web pages.\n\n**Types:**\n1. Reflected XSS\n2. Stored XSS\n3. DOM-based XSS\n\n**Test payload:** `<script>alert('XSS')</script>`\n\n💡 For full interactive lesson, open the Mini App!",
                    "ssti": "📚 **SSTI Lesson**\n\n**What is Server-Side Template Injection?**\nAttacker injects template engine code into server-side rendering.\n\n**Detection:** Try `{{7*7}}` or `${7*7}` - if you see `49`, SSTI exists!\n\n**Common engines:** Jinja2 (Python), Twig (PHP), Freemarker (Java)\n\n💡 For full interactive lesson, open the Mini App!"
                }
                
                if topic in lessons:
                    await send_telegram_message(chat_id, lessons[topic], "Markdown")
                else:
                    await send_telegram_message(
                        chat_id,
                        "📋 **Available topics:** sqli, xss, ssti\n\nExample: /learn sqli\n\nFor more topics, open the Mini App!",
                        "Markdown"
                    )
            
            # ============ DEFAULT RESPONSE ============
            else:
                await send_telegram_message(
                    chat_id,
                    f"🤖 **Cy30rt_AI**\n\nFor full AI chat, reconnaissance, payloads, and interactive features, please open the Mini App:\n\nhttps://cy30rt-miniapp.onrender.com\n\n**Available Commands:**\n/start - Welcome\n/help - All commands\n/recon <target> - Run reconnaissance (auto-results)\n/payload <type> - Get payloads\n/cve <id> - Look up CVE\n/learn <topic> - Learn cybersecurity\n/who - About the creator",
                    "Markdown"
                )
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
