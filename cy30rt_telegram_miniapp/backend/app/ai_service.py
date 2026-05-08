import os
import httpx
from groq import AsyncGroq
from typing import AsyncGenerator
import json

# API Keys
DEEPSEEK_API_KEY = "sk-a03cefb52c364124a09573728e12861c"
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

    # ============ GROQ API (Primary - Free Tier Working) ============
    async def chat_with_groq(self, message: str) -> AsyncGenerator[str, None]:
        """Use Groq - You have free tier working"""
        try:
            if not self.groq_client:
                yield "Groq API not configured. Please check your API key."
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

    # ============ CEREBRAS API (Backup) ============
    async def chat_with_cerebras(self, message: str) -> AsyncGenerator[str, None]:
        """Use Cerebras as backup"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.cerebras.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer csk-mwv2j98wymw9cwyp4mxk42tndwhe65ymf9j43cxdmytnjrvy",
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

    # ============ MAIN CHAT ROUTER ============
    async def chat(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Try Groq first (working), then Cerebras, skip DeepSeek (payment issue)"""
        
        # Try Groq first (your working free tier)
        print("Trying Groq API...")
        async for chunk in self.chat_with_groq(message):
            yield chunk
            return
        
        # If Groq fails, try Cerebras
        print("Groq failed, trying Cerebras...")
        async for chunk in self.chat_with_cerebras(message):
            yield chunk
            return
        
        # If all fail
        yield "All AI services are currently unavailable. Please try again later. Stay secure. - Cy30rt_AI"

# Singleton instance
cy30rt_ai = Cy30rtAI()
