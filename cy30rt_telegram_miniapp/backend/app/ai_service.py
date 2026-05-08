import os
import httpx
from groq import AsyncGroq
from typing import AsyncGenerator, Optional
import json

# API Keys
CEREBRAS_API_KEY = "csk-mwv2j98wymw9cwyp4mxk42tndwhe65ymf9j43cxdmytnjrvy"
DEEPSEEK_API_KEY = "sk-a03cefb52c364124a09573728e12861c"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class Cy30rtAI:
    """Professional Cybersecurity AI with Multiple Intelligence Sources"""
    
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=GROQ_API_KEY)
        self.cerebras_key = CEREBRAS_API_KEY
        self.deepseek_key = DEEPSEEK_API_KEY
        self.contrast_base = "https://api.contrastcyber.com/v1"
        
        # System prompt for professional responses
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
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.contrast_base}/cve/{cve_id}")
                if response.status_code == 200:
                    return {"source": "ContrastAPI", "data": response.json()}
                
                nvd_response = await client.get(f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}")
                return {"source": "NVD", "data": nvd_response.json()}
        except Exception as e:
            return {"source": "error", "data": {"error": str(e)}}
    
    async def domain_recon(self, domain: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.contrast_base}/domain?url={domain}")
                return response.json() if response.status_code == 200 else {"error": "Domain recon failed"}
        except Exception as e:
            return {"error": str(e)}
    
    async def ip_lookup(self, ip_address: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.contrast_base}/ip?address={ip_address}")
                return response.json() if response.status_code == 200 else {"error": "IP lookup failed"}
        except Exception as e:
            return {"error": str(e)}
    
    async def hash_lookup(self, file_hash: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.contrast_base}/hash?hash={file_hash}")
                return response.json() if response.status_code == 200 else {"error": "Hash lookup failed"}
        except Exception as e:
            return {"error": str(e)}

    # ============ DEEPSEEK API (Best for Cybersecurity) ============
    
    async def chat_with_deepseek(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Use DeepSeek - best reasoning model for security questions"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.deepseek_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": message}
                        ],
                        "stream": True,
                        "max_tokens": 2000,
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
            yield f"DeepSeek error: {str(e)}"

    # ============ CEREBRAS API (Ultra-Fast) ============
    
    async def chat_with_cerebras(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Use Cerebras for ultra-fast responses (20x faster than GPT)"""
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
            yield f"Cerebras error: {str(e)}"

    # ============ GROQ API (Backup) ============
    
    async def chat_with_groq(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Fallback to Groq if other APIs fail"""
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
            yield f"Groq error: {str(e)}"

    # ============ INTELLIGENT ROUTER - Chooses best API ============
    
    async def chat(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Intelligent routing - picks best AI for the query"""
        
        message_lower = message.lower()
        
        # Check for CVE lookup
        if "cve-" in message_lower or "cve number" in message_lower:
            import re
            cve_match = re.search(r'cve[- ]?(\d{4}-\d{4,})', message_lower, re.IGNORECASE)
            if cve_match:
                cve_id = f"CVE-{cve_match.group(1)}"
                cve_data = await self.get_cve_info(cve_id)
                response_text = f"Real CVE Intelligence for {cve_id}:\n\n{json.dumps(cve_data.get('data', {}), indent=2)[:1500]}\n\nStay secure. - Cy30rt_AI"
                for char in response_text:
                    yield char
                return
        
        # Check for domain recon
        if any(x in message_lower for x in ["domain", "website", "recon", "scan domain"]):
            import re
            domain_match = re.search(r'(?:domain|website|scan)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', message_lower)
            if domain_match:
                domain = domain_match.group(1)
                domain_data = await self.domain_recon(domain)
                response_text = f"Domain Intelligence for {domain}:\n\n{json.dumps(domain_data, indent=2)[:1500]}\n\nStay secure. - Cy30rt_AI"
                for char in response_text:
                    yield char
                return
        
        # Check for IP lookup
        if any(x in message_lower for x in ["ip", "ip address", "lookup ip", "check ip"]):
            import re
            ip_match = re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', message_lower)
            if ip_match:
                ip = ip_match.group(0)
                ip_data = await self.ip_lookup(ip)
                response_text = f"IP Intelligence for {ip}:\n\n{json.dumps(ip_data, indent=2)[:1500]}\n\nStay secure. - Cy30rt_AI"
                for char in response_text:
                    yield char
                return
        
        # Route to DeepSeek for all general questions (best model)
        try:
            async for chunk in self.chat_with_deepseek(message, language):
                yield chunk
        except Exception:
            # Fallback to Cerebras if DeepSeek fails
            try:
                async for chunk in self.chat_with_cerebras(message, language):
                    yield chunk
            except Exception:
                # Final fallback to Groq
                async for chunk in self.chat_with_groq(message, language):
                    yield chunk

# Singleton instance
cy30rt_ai = Cy30rtAI()
