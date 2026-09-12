from pydantic import BaseModel, ConfigDict
from typing import Optional
import datetime
from app.schemas.exchange import UserSummary

class MessageCreate(BaseModel):
    receiver_id: int
    content: str
    exchange_id: Optional[int] = None

class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    exchange_id: Optional[int] = None
    content: str
    is_read: bool
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class ConversationOut(BaseModel):
    partner: UserSummary
    last_message: Optional[str] = None
    last_message_at: Optional[datetime.datetime] = None
    unread_count: int = 0
    active_exchange_id: Optional[int] = None
    active_exchange_status: Optional[str] = None
