import os
import httpx
from groq import AsyncGroq
from typing import AsyncGenerator
import json

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class Cy30rtAI:
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
        
        self.system_prompt = """You are Cy30rt_AI, a professional cybersecurity assistant created by Abdulbasid Yakubu (cy30rt).

IMPORTANT RULES:
- ALWAYS give COMPLETE, DETAILED answers
- NEVER cut off your response mid-sentence
- Provide thorough explanations
- Use natural, professional language
- End with: "Stay secure. - Cy30rt_AI"

When asked "who are you" or "who created you", respond with:
"I am Cy30rt_AI, a professional cybersecurity intelligence assistant created by Abdulbasid Yakubu (cy30rt), a cybersecurity professional dedicated to making security education accessible."

When asked "hello" or "hi", respond with:
"Hello! I am Cy30rt_AI, your cybersecurity assistant. How can I help you with security today?"""

    async def chat_with_groq(self, message: str) -> AsyncGenerator[str, None]:
        """Use Groq API with complete responses"""
        try:
            if not self.groq_client:
                yield "Groq API not configured. Please check your API key."
                return
            
            print(f"Sending to Groq: {message}")
            
            stream = await self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=2000,  # Increased for longer responses
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield content
                    
        except Exception as e:
            print(f"Groq error: {e}")
            yield f"I am Cy30rt_AI, created by Abdulbasid Yakubu (cy30rt). How can I help you with cybersecurity today?"

    async def chat(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Main chat endpoint"""
        
        # Handle specific quick responses
        msg_lower = message.lower().strip()
        
        if msg_lower in ["hello", "hi", "hey", "good morning", "good evening"]:
            yield "Hello! I am Cy30rt_AI, your cybersecurity assistant. How can I help you with security today?"
            return
            
        if msg_lower in ["who are you", "who created you", "who made you", "what are you"]:
            yield "I am Cy30rt_AI, a professional cybersecurity intelligence assistant created by Abdulbasid Yakubu (cy30rt), a cybersecurity professional dedicated to making security education accessible to everyone. How can I assist you with your security questions today?"
            return
            
        if msg_lower in ["how are you", "how are you doing"]:
            yield "I am fully operational and ready to help you with cybersecurity. How can I assist you today?"
            return
        
        # Use Groq for other questions
        async for chunk in self.chat_with_groq(message):
            yield chunk

# Singleton instance
cy30rt_ai = Cy30rtAI()
