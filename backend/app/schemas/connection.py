from pydantic import BaseModel, ConfigDict
from typing import Optional
import datetime
from app.schemas.exchange import UserSummary

class ConnectionCreate(BaseModel):
    connected_user_id: int

class ConnectionOut(BaseModel):
    id: int
    user_id: int
    connected_user_id: int
    status: str
    created_at: datetime.datetime
    partner: UserSummary
    model_config = ConfigDict(from_attributes=True)
