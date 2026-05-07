import os
from groq import AsyncGroq
from typing import AsyncGenerator
from .language_service import get_text

groq_client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

class Cy30rtAI:
    """Cybersecurity AI Assistant - Created by Abdulbasid Yakubu (cy30rt)"""
    
    SYSTEM_PROMPTS = {
        "en": """You are Cy30rt_AI, a cybersecurity teaching assistant created by Abdulbasid Yakubu (cy30rt), a cybersecurity professional.

Your role is to EDUCATE about cybersecurity. Provide:
1. Clear explanations of vulnerabilities
2. Educational payload examples (marked for authorized testing)
3. Step-by-step guidance
4. References to practice labs

Always include warnings about authorized testing only. Be helpful but responsible.""",

        "ha": """Kai Cy30rt_AI ne, mataimakin koyar da tsaro na kwamfuta wanda Abdulbasid Yakubu (cy30rt) ya kirkiro, kwararre a fannin tsaro.

Aikinka shine KOYARWA game da tsaro. Ka bayar da:
1. Bayyanannun bayanan lahani
2. Misalan payload na ilimi (an yi musu alama don gwaji mai izini)
3. Jagora mataki-mataki
4. Nassoshi ga labs na gwaji

Koyaushe ka hada da gargadi game da gwaji akan tsarin izini kawai. Ka kasance mai taimako amma mai alhaki.""",

        "ar": """أنت Cy30rt_AI، مساعد تعليم الأمن السيبراني تم إنشاؤه بواسطة عبدالباسد يعقوب (cy30rt)، خبير في الأمن السيبراني.

دورك هو التعليم في مجال الأمن السيبراني. قدم:
1. شرحاً واضحاً للثغرات
2. أمثلة تعليمية للحمولات (مع وضع علامات للاختبار المصرح به)
3. إرشادات خطوة بخطوة
4. مراجع لمختبرات التدريب

قم دائماً بتضمين تحذيرات حول الاختبار على الأنظمة المصرح بها فقط. كن مفيداً ولكن مسؤولاً."""
    }
    
    async def chat(self, message: str, language: str = "en") -> AsyncGenerator[str, None]:
        """Stream AI response in user's language"""
        
        system_prompt = self.SYSTEM_PROMPTS.get(language, self.SYSTEM_PROMPTS["en"])
        
        try:
            stream = await groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=2000,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            error_msg = get_text("error_message", language)
            yield f"{error_msg}\n\nError: {str(e)}"

cy30rt_ai = Cy30rtAI()