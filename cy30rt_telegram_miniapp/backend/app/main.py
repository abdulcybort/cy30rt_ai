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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BOT_TOKEN = "8722134255:AAGCDtKU0qBuh60z6fBt5RVP0_a7HTM1Vqc"

# Global variable to track running processes
running_processes = {}

class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    session_id: str = None

class ReconRequest(BaseModel):
    target: str
    options: dict = {}

# Helper function to send Telegram message
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

# Function to cancel running process for a chat
def cancel_process(chat_id: int):
    if chat_id in running_processes:
        process = running_processes[chat_id]
        try:
            process.terminate()
            process.kill()
            del running_processes[chat_id]
            return True
        except:
            return False
    return False

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
            
            # ============ CANCEL/STOP/TERMINATE COMMANDS ============
            if text in ["/cancel", "/stop", "/terminate", "/kill"]:
                if cancel_process(chat_id):
                    await send_telegram_message(
                        chat_id,
                        "⏹️ **Operation Cancelled**\n\nThe running scan or operation has been terminated.\n\nType /help to see available commands.",
                        "Markdown"
                    )
                else:
                    await send_telegram_message(
                        chat_id,
                        "ℹ️ **No Operation Running**\n\nThere are no active operations to cancel.\n\nType /help to see available commands.",
                        "Markdown"
                    )
                return {"status": "ok"}
            
            # ============ /start COMMAND ============
            if text == "/start":
                await send_telegram_message(
                    chat_id,
                    "🤖 **Welcome to Cy30rt_AI!**\n\nYour professional cybersecurity and bug bounty assistant.\n\n**Created by:** Abdulbasid Yakubu (cy30rt)\n\n**Commands:**\n🔍 /recon <target> - Fast reconnaissance\n🔍 /fullrecon <target> - Complete reconnaissance\n💉 /payload <type> - Get payloads (sqli, xss, ssti, lfi)\n📋 /cve <id> - Look up CVE\n📚 /learn <topic> - Learn cybersecurity\n🛑 /cancel - Stop running operation\n❓ /help - Show all commands\n\n👇 Click below to open the Mini App!",
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
                return {"status": "ok"}
            
            # ============ /help COMMAND ============
            if text == "/help":
                await send_telegram_message(
                    chat_id,
                    "🤖 **Cy30rt_AI Commands**\n\n🔍 **RECONNAISSANCE:**\n/recon <target> - Fast reconnaissance\n/fullrecon <target> - Complete recon\n\n💉 **PAYLOADS:**\n/payload sqli - SQL injection payloads\n/payload xss - XSS payloads\n/payload ssti - SSTI payloads\n/payload lfi - LFI/RFI payloads\n\n📋 **INTELLIGENCE:**\n/cve <id> - Look up CVE information\n\n📚 **LEARNING:**\n/learn sqli - SQL injection tutorial\n/learn xss - XSS tutorial\n\n🛑 **CONTROL:**\n/cancel - Stop running operation\n\n💬 **GENERAL:**\n/start - Welcome message\n/help - Show this help\n/who - About the creator\n\n⚠️ Type /cancel to stop any running scan!\n\n💡 **You can also just type a question like 'What is SQL injection?' and I'll answer!**",
                    "Markdown"
                )
                return {"status": "ok"}
            
            # ============ /who COMMAND ============
            if text in ["/who", "/creator", "/about"]:
                await send_telegram_message(
                    chat_id,
                    "🤖 **Cy30rt_AI**\n\nI am a professional cybersecurity and bug bounty assistant created by **Abdulbasid Yakubu (cy30rt)** , a cybersecurity professional.\n\n**My capabilities:**\n• Real reconnaissance tools\n• Generate attack payloads (SQLi, XSS, SSTI, LFI, CSRF)\n• Look up CVE information\n• Teach cybersecurity concepts\n• Voice input with adjustable speed/pitch (Mini App)\n• 15 languages support (Mini App)\n• /cancel to stop any operation\n\n⚠️ Always practice on authorized systems only!\n\nFor full features, open the Mini App!\n\n💡 **Try asking me: 'What is SQL injection?' or 'How do I find subdomains?'**",
                    "Markdown"
                )
                return {"status": "ok"}
            
            # ============ /recon COMMAND ============
            if text.startswith("/recon"):
                target = text.replace("/recon", "").strip()
                if target:
                    await send_telegram_message(
                        chat_id,
                        f"🔍 **Starting reconnaissance on {target}...**\n\n⏳ This will take 1-2 minutes.\n📊 Results will appear here automatically.\n🛑 Type /cancel to stop the scan.",
                        "Markdown"
                    )
                    
                    try:
                        cmd = ["reconix", target, "--deep", "--threads=10"]
                        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                        running_processes[chat_id] = process
                        
                        stdout, stderr = process.communicate(timeout=180)
                        output = stdout + stderr
                        
                        if chat_id in running_processes:
                            del running_processes[chat_id]
                        
                        results = f"✅ **Recon Complete - {target}**\n\n```\n{output[:3500]}\n```\n\n⚠️ Only test on authorized targets!\n\n🛑 Type /cancel to stop any scan.\n\nStay secure. - Cy30rt_AI"
                        await send_telegram_message(chat_id, results, "Markdown")
                        
                    except subprocess.TimeoutExpired:
                        if chat_id in running_processes:
                            running_processes[chat_id].terminate()
                            del running_processes[chat_id]
                        await send_telegram_message(
                            chat_id,
                            f"❌ **Scan timed out after 3 minutes**\n\nTry a more specific target or use the Mini App for better results.",
                            "Markdown"
                        )
                    except Exception as e:
                        if chat_id in running_processes:
                            del running_processes[chat_id]
                        await send_telegram_message(
                            chat_id,
                            f"❌ **Error:** {str(e)}\n\nPlease try again or use the Mini App.",
                            "Markdown"
                        )
                else:
                    await send_telegram_message(
                        chat_id,
                        "📋 **Usage:** /recon <target>\n\nExample: /recon scanme.nmap.org\n\n🛑 Type /cancel to stop any running scan.",
                        "Markdown"
                    )
                return {"status": "ok"}
            
            # ============ /fullrecon COMMAND ============
            if text.startswith("/fullrecon"):
                target = text.replace("/fullrecon", "").strip()
                if target:
                    await send_telegram_message(
                        chat_id,
                        f"🔍 **Starting FULL reconnaissance on {target}**\n\nRunning multiple tools...\n\n⏳ This will take 3-5 minutes.\n📊 Results will appear here automatically.\n🛑 Type /cancel to stop the scan.",
                        "Markdown"
                    )
                    
                    try:
                        all_output = []
                        
                        # Amass
                        amass_cmd = ["amass", "enum", "-d", target, "-silent"]
                        process = subprocess.Popen(amass_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                        running_processes[chat_id] = process
                        stdout, _ = process.communicate(timeout=120)
                        all_output.append(f"[Amass Results]\n{stdout[:500]}")
                        
                        # Naabu
                        await send_telegram_message(chat_id, "📡 Running port scan...", "Markdown")
                        naabu_cmd = ["naabu", "-host", target, "-silent", "-timeout", "500"]
                        process = subprocess.Popen(naabu_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                        running_processes[chat_id] = process
                        stdout, _ = process.communicate(timeout=60)
                        all_output.append(f"[Port Scan Results]\n{stdout[:500]}")
                        
                        # WhatWeb
                        await send_telegram_message(chat_id, "🌐 Detecting technologies...", "Markdown")
                        whatweb_cmd = ["whatweb", "--quiet", target]
                        process = subprocess.Popen(whatweb_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                        running_processes[chat_id] = process
                        stdout, _ = process.communicate(timeout=60)
                        all_output.append(f"[Technology Detection]\n{stdout[:500]}")
                        
                        if chat_id in running_processes:
                            del running_processes[chat_id]
                        
                        combined = "\n\n".join(all_output)
                        results = f"✅ **Full Recon Complete - {target}**\n\n```\n{combined[:3500]}\n```\n\n⚠️ Only test on authorized targets!\n\nStay secure. - Cy30rt_AI"
                        await send_telegram_message(chat_id, results, "Markdown")
                        
                    except Exception as e:
                        if chat_id in running_processes:
                            del running_processes[chat_id]
                        await send_telegram_message(
                            chat_id,
                            f"❌ **Error during full recon:** {str(e)}\n\nTry using /recon {target} for a faster scan.",
                            "Markdown"
                        )
                else:
                    await send_telegram_message(
                        chat_id,
                        "📋 **Usage:** /fullrecon <target>\n\nExample: /fullrecon scanme.nmap.org",
                        "Markdown"
                    )
                return {"status": "ok"}
            
            # ============ /payload COMMAND ============
            if text.startswith("/payload"):
                vuln_type = text.replace("/payload", "").strip().lower()
                payloads = {
                    "sqli": "💉 **SQL Injection Payloads**\n\n```\n' OR '1'='1' --\nadmin' --\n' OR 1=1--\n' UNION SELECT null, username, password FROM users--\n' AND SLEEP(5)--\n```\n\n💡 For more payloads, open the Mini App!",
                    "xss": "🔓 **XSS Payloads**\n\n```\n<script>alert('XSS')</script>\n<img src=x onerror=alert(1)>\n<svg/onload=alert(1)>\n```\n\n💡 For more payloads, open the Mini App!",
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
                return {"status": "ok"}
            
            # ============ /cve COMMAND ============
            if text.startswith("/cve"):
                cve_id = text.replace("/cve", "").strip().upper()
                if cve_id:
                    if not cve_id.startswith("CVE-"):
                        cve_id = f"CVE-{cve_id}"
                    
                    await send_telegram_message(
                        chat_id,
                        f"🔍 **Looking up {cve_id}...**\n\n⏳ Fetching CVE details...",
                        "Markdown"
                    )
                    
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
                return {"status": "ok"}
            
            # ============ /learn COMMAND ============
            if text.startswith("/learn"):
                topic = text.replace("/learn", "").strip().lower()
                lessons = {
                    "sqli": "📚 **SQL Injection Lesson**\n\n**What is SQL Injection?**\nSQL injection occurs when user input is inserted directly into SQL queries.\n\n**Test payload:** `' OR '1'='1' --`\n\n💡 For full interactive lesson, open the Mini App!",
                    "xss": "📚 **XSS Lesson**\n\n**What is XSS?**\nInjecting malicious JavaScript into web pages.\n\n**Test payload:** `<script>alert('XSS')</script>`\n\n💡 For full interactive lesson, open the Mini App!"
                }
                
                if topic in lessons:
                    await send_telegram_message(chat_id, lessons[topic], "Markdown")
                else:
                    await send_telegram_message(
                        chat_id,
                        "📋 **Available topics:** sqli, xss\n\nExample: /learn sqli\n\nFor more topics, open the Mini App!",
                        "Markdown"
                    )
                return {"status": "ok"}
            
            # ============ AI CHAT FOR REGULAR MESSAGES (FIXED) ============
            else:
                # Send typing indicator
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendChatAction",
                        json={"chat_id": chat_id, "action": "typing"}
                    )
                
                try:
                    # Call your AI service for a response
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.post(
                            "https://cy30rt-ai.onrender.com/api/chat",
                            json={"message": text, "language": "en"}
                        )
                        ai_response = response.text
                        
                        # Truncate if too long
                        if len(ai_response) > 4000:
                            ai_response = ai_response[:4000] + "..."
                        
                        await send_telegram_message(
                            chat_id,
                            f"🤖 **Cy30rt_AI:**\n\n{ai_response}",
                            "Markdown"
                        )
                except Exception as e:
                    # Fallback response if AI service fails
                    await send_telegram_message(
                        chat_id,
                        f"🤖 **Cy30rt_AI:**\n\nHello! I am Cy30rt_AI, your cybersecurity assistant created by Abdulbasid Yakubu (cy30rt).\n\nType /help to see what I can do!\n\nYou can ask me:\n• What is SQL injection?\n• How do I find subdomains?\n• Give me XSS payloads\n\nTry again in a moment!",
                        "Markdown"
                    )
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
