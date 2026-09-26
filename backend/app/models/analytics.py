import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime

from app.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    event = Column(String(80), nullable=False, index=True)
    session_id = Column(String(120), nullable=False, index=True)
    path = Column(String(255), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    properties = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
