import datetime
from sqlalchemy import Column, Integer, Boolean, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    exchange_id = Column(Integer, ForeignKey("exchanges.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 1 to 5 stars
    rating = Column(Integer, nullable=False)
    # Sub-scores
    reliability_score = Column(Integer, default=5)
    skill_quality_score = Column(Integer, default=5)
    would_exchange_again = Column(Boolean, default=True)
    
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Prevent duplicate reviews from the same reviewer on the same exchange
    __table_args__ = (
        UniqueConstraint('exchange_id', 'reviewer_id', name='uq_exchange_reviewer'),
    )

    exchange = relationship("Exchange", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="written_reviews")
    reviewee = relationship("User", foreign_keys=[reviewee_id], back_populates="received_reviews")
