import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Exchange(Base):
    __tablename__ = "exchanges"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Skills bartered
    requester_skill_id = Column(Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    receiver_skill_id = Column(Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    
    # State machine status: PENDING, ACCEPTED, COUNTERED, REJECTED, ACTIVE, COMPLETED, CANCELLED
    status = Column(String(30), default="PENDING", index=True, nullable=False)
    
    proposal_message = Column(Text, nullable=False)
    counter_message = Column(Text, nullable=True)
    preferred_date = Column(String(100), nullable=True)
    estimated_hours = Column(Float, default=2.0)
    location_area = Column(String(200), nullable=True)
    
    # Mutual completion protocol
    requester_completed = Column(Boolean, default=False)
    receiver_completed = Column(Boolean, default=False)
    
    cancellation_reason = Column(String(255), nullable=True)
    cancelled_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    requester = relationship("User", foreign_keys=[requester_id], back_populates="sent_exchanges")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_exchanges")
    requester_skill = relationship("Skill", foreign_keys=[requester_skill_id])
    receiver_skill = relationship("Skill", foreign_keys=[receiver_skill_id])
    reviews = relationship("Review", back_populates="exchange", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="exchange")
