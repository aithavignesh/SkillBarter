from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    full_name: str
    is_admin: bool

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    address_display: Optional[str] = "Hyderabad"
    latitude: Optional[float] = 17.4485
    longitude: Optional[float] = 78.3748
    primary_skill: Optional[str] = None
    primary_category: Optional[str] = "Technology"
    primary_intent: Optional[str] = "EXCHANGE"

class PasswordResetRequest(BaseModel):
    email: EmailStr
