from pydantic import BaseModel, ConfigDict
from typing import Optional
import datetime

class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
