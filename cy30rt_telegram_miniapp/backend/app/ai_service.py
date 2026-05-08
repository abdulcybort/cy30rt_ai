import os
import httpx
from groq import AsyncGroq
from typing import AsyncGenerator
import json

# API Keys
DEEPSEEK_API_KEY = "sk-a03cefb52c364124a09573728e12861c"
CEREBRAS_API_KEY = "csk-mwv2j98wymw9cwyp4mxk42tndwhe65ymf9j43cxdmytnjrvy"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class Cy30rtAI:
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
        
        self.system_prompt = """You are Cy30rt_AI, a professional cybersecurity assistant created by Abdulbasid Yakubu (cy30rt).

Rules:
- Provide clear, accurate cybersecurity information
- Use natural text without markdown symbols
- Keep responses professional and educational
- End with: Stay secure. - Cy30rt_AI"""

    # ============ DEEPSEEK API (Primary - Best for Cybersecurity) ============
    async def chat_with_deepseek(self, message: str) -> AsyncGenerator[str, None]:
        """Use DeepSeek - 1M context, great for security questions"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
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
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield f"DeepSeek API Error (Status {response.status_code})"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: ") and line != "data: [DONE]":
                            try:
                                data = json.loads(line[6:])
                                content = data.get("choices", [{}])[0].get("delta", {}).get("content")
                                if content:
                                    yield content
                            except:
                                pass
        except Exception as e:
            yield f"DeepSeek connection error: {str(e)}"

    # ============ CEREBRAS API (Backup - Ultra Fast) ============
    async def chat_with_cerebras(self, message: str) -> AsyncGenerator[str, None]:
        """Use Cerebras as first backup"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.cerebras.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {CEREBRAS_API_KEY}",
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
                    if response.status_code != 200:
                        yield f"Cerebras API Error (Status {response.status_code})"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: ") and line != "data: [DONE]":
                            try:
                                data = json.loads(line[6:])
                                content = data.get("choices", [{}])[0].get("delta", {}).get("content")
                                if content:
                                    yield content
                            except:
                                pass
        except Exception as e:
            yield f"Cerebras error: {str(e)}"

    # ============ GROQ API (Final Backup) ============
    async def chat_with_groq(self, message: str) -> AsyncGenerator[str, None]:
        """Use Groq as final backup"""
        try:
            if not self.groq_client:
                yield "No API available. Please check configuration."
                return
            
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

    # ============ MAIN CHAT ROUTER ============
    async def chat(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Try APIs in order: DeepSeek → Cerebras → Groq"""
        
        # Try DeepSeek first
        print(f"Trying DeepSeek API...")
        async for chunk in self.chat_with_deepseek(message):
            yield chunk
            return
        
        # If DeepSeek fails, try Cerebras
        print("DeepSeek failed, trying Cerebras...")
        async for chunk in self.chat_with_cerebras(message):
            yield chunk
            return
        
        # If Cerebras fails, try Groq
        print("Cerebras failed, trying Groq...")
        async for chunk in self.chat_with_groq(message):
            yield chunk
            return
        
        # If all fail
        yield "All AI services are currently unavailable. Please try again later. Stay secure. - Cy30rt_AI"

# Singleton instance
cy30rt_ai = Cy30rtAI()
