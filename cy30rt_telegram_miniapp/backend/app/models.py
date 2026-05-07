from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    language: str
    timestamp: datetime

class PayloadRequest(BaseModel):
    category: str
    subcategory: Optional[str] = None
    language: str = "en"

class PayloadResponse(BaseModel):
    category: str
    name: str
    payloads: List[str]
    explanation: str
    warning: str