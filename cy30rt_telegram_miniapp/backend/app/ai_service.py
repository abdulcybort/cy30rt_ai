import os
import httpx
from groq import AsyncGroq
from typing import AsyncGenerator

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

    async def chat(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Main chat endpoint"""
        
        msg_lower = message.lower().strip()
        
        # Quick responses for common questions
        if msg_lower in ["hello", "hi", "hey"]:
            yield "Hello! I am Cy30rt_AI, your cybersecurity assistant. How can I help you with security today?\n\nStay secure. - Cy30rt_AI"
            return
        
        if msg_lower in ["who are you", "who created you", "what are you"]:
            yield "I am Cy30rt_AI, a professional cybersecurity intelligence assistant created by Abdulbasid Yakubu (cy30rt), a cybersecurity professional. I help with learning cybersecurity, bug bounty, and ethical hacking.\n\nStay secure. - Cy30rt_AI"
            return
        
        if not self.groq_client:
            yield "I am Cy30rt_AI, your cybersecurity assistant. Created by Abdulbasid Yakubu (cy30rt). Type /help to see commands.\n\nStay secure. - Cy30rt_AI"
            return
        
        try:
            stream = await self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=1000,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"I am Cy30rt_AI, created by Abdulbasid Yakubu (cy30rt). I'm here to help with cybersecurity. How can I assist you?\n\nStay secure. - Cy30rt_AI"

cy30rt_ai = Cy30rtAI()
