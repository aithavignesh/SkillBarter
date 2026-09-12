import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    post_type = Column(String(50), nullable=False) # "OFFER", "REQUEST", "COMPLETED_EXCHANGE", "COMMUNITY", "RECOMMENDATION"
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    exchange_id = Column(Integer, ForeignKey("exchanges.id", ondelete="SET NULL"), nullable=True)
    partner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    author = relationship("User", foreign_keys=[author_id], back_populates="posts")
    skill = relationship("Skill", foreign_keys=[skill_id])
    partner = relationship("User", foreign_keys=[partner_id])
