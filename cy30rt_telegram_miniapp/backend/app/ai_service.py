import os
import httpx
from groq import AsyncGroq
from typing import AsyncGenerator, Optional
import json

# Cerebras API key (your provided key)
CEREBRAS_API_KEY = "csk-mwv2j98wymw9cwyp4mxk42tndwhe65ymf9j43cxdmytnjrvy"

class Cy30rtAI:
    """Professional Cybersecurity AI with Multiple Intelligence Sources"""
    
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        self.cerebras_key = CEREBRAS_API_KEY
        self.contrast_base = "https://api.contrastcyber.com/v1"
        
        # System prompts for different AI models
        self.system_prompt = """You are Cy30rt_AI, a professional cybersecurity intelligence assistant created by Abdulbasid Yakubu (cy30rt).

Your responses must be:
1. Professional, clear, and accurate
2. Focused on educational cybersecurity content
3. Formatted without markdown symbols (*, _, #, etc.) - use natural text
4. Include real CVE data when relevant
5. Always end with: "Stay secure. - Cy30rt_AI"

Guidelines:
- Explain vulnerabilities step by step
- Provide safe, educational examples
- Reference real CVEs when applicable
- Never encourage illegal activities"""

    # ============ CONTRASTAPI - Real Cybersecurity Intel (NO KEY NEEDED) ============
    
    async def get_cve_info(self, cve_id: str) -> dict:
        """Get real CVE data from NVD + ContrastAPI"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try ContrastAPI first (no key)
                response = await client.get(f"{self.contrast_base}/cve/{cve_id}")
                if response.status_code == 200:
                    return {"source": "ContrastAPI", "data": response.json()}
                
                # Fallback to NVD
                nvd_response = await client.get(f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}")
                return {"source": "NVD", "data": nvd_response.json()}
        except Exception as e:
            return {"source": "error", "data": {"error": str(e)}}
    
    async def domain_recon(self, domain: str) -> dict:
        """Domain reconnaissance - SSL, DNS, WHOIS"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.contrast_base}/domain?url={domain}")
                return response.json() if response.status_code == 200 else {"error": "Domain recon failed"}
        except Exception as e:
            return {"error": str(e)}
    
    async def ip_lookup(self, ip_address: str) -> dict:
        """IP reputation and threat intelligence"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.contrast_base}/ip?address={ip_address}")
                return response.json() if response.status_code == 200 else {"error": "IP lookup failed"}
        except Exception as e:
            return {"error": str(e)}
    
    async def hash_lookup(self, file_hash: str) -> dict:
        """File hash threat intelligence"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.contrast_base}/hash?hash={file_hash}")
                return response.json() if response.status_code == 200 else {"error": "Hash lookup failed"}
        except Exception as e:
            return {"error": str(e)}

    # ============ CEREBRAS - Fast AI Responses ============
    
    async def chat_with_cerebras(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Use Cerebras for ultra-fast, intelligent responses"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.cerebras.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.cerebras_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama3.1-8b",
                        "messages": [
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": message}
                        ],
                        "stream": True,
                        "max_tokens": 1500,
                        "temperature": 0.7
                    }
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: ") and line != "data: [DONE]":
                            try:
                                data = json.loads(line[6:])
                                if "choices" in data and data["choices"][0].get("delta", {}).get("content"):
                                    yield data["choices"][0]["delta"]["content"]
                            except:
                                pass
        except Exception as e:
            yield f"Unable to process request. Error: {str(e)}"

    # ============ GROQ - Backup AI (Your existing) ============
    
    async def chat_with_groq(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Fallback to Groq if Cerebras fails"""
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
        except Exception as e:
            yield f"Error: {str(e)}"

    # ============ INTELLIGENT ROUTER - Chooses best API ============
    
    async def chat(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Intelligent routing - picks best AI for the query"""
        
        message_lower = message.lower()
        
        # Check if CVE lookup requested
        if "cve-" in message_lower or "cve number" in message_lower:
            import re
            cve_match = re.search(r'cve[- ]?(\d{4}-\d{4,})', message_lower, re.IGNORECASE)
            if cve_match:
                cve_id = f"CVE-{cve_match.group(1)}"
                cve_data = await self.get_cve_info(cve_id)
                yield f"Real CVE Intelligence for {cve_id}:\n\n"
                yield json.dumps(cve_data.get("data", {}), indent=2)[:1500]
                yield "\n\nStay secure. - Cy30rt_AI"
                return
        
        # Check if domain recon requested
        if any(x in message_lower for x in ["domain", "website", "recon", "scan domain"]):
            import re
            domain_match = re.search(r'(?:domain|website|scan)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', message_lower)
            if domain_match:
                domain = domain_match.group(1)
                domain_data = await self.domain_recon(domain)
                yield f"Domain Intelligence for {domain}:\n\n"
                yield json.dumps(domain_data, indent=2)[:1500]
                yield "\n\nStay secure. - Cy30rt_AI"
                return
        
        # Check if IP lookup requested
        if any(x in message_lower for x in ["ip", "ip address", "lookup ip", "check ip"]):
            import re
            ip_match = re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', message_lower)
            if ip_match:
                ip = ip_match.group(0)
                ip_data = await self.ip_lookup(ip)
                yield f"IP Intelligence for {ip}:\n\n"
                yield json.dumps(ip_data, indent=2)[:1500]
                yield "\n\nStay secure. - Cy30rt_AI"
                return
        
        # Check if hash lookup requested
        if any(x in message_lower for x in ["hash", "md5", "sha1", "sha256", "file hash"]):
            import re
            hash_match = re.search(r'[a-fA-F0-9]{32,64}', message_lower)
            if hash_match:
                file_hash = hash_match.group(0)
                hash_data = await self.hash_lookup(file_hash)
                yield f"Hash Intelligence for {file_hash}:\n\n"
                yield json.dumps(hash_data, indent=2)[:1500]
                yield "\n\nStay secure. - Cy30rt_AI"
                return
        
        # Try Cerebras first (faster, smarter)
        try:
            async for chunk in self.chat_with_cerebras(message, language):
                yield chunk
        except Exception:
            # Fallback to Groq
            async for chunk in self.chat_with_groq(message, language):
                yield chunk

# Singleton instance
cy30rt_ai = Cy30rtAI()
