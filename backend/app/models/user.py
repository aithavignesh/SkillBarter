import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    headline = Column(String(200), nullable=True)
    
    # Hyperlocal coordinates & location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address_display = Column(String(200), nullable=True)
    exchange_radius_km = Column(Float, default=10.0)
    location_visibility = Column(String(50), default="APPROXIMATE") # APPROXIMATE, CITY_ONLY, EXACT
    availability = Column(String(100), default="Weekends & Evenings")
    
    # Trust Score breakdown (0 to 100)
    trust_score = Column(Float, default=85.0)
    reliability_score = Column(Float, default=90.0)
    response_rate = Column(Float, default=95.0)
    skill_quality_score = Column(Float, default=90.0)
    completed_exchanges_count = Column(Integer, default=0)
    reviews_count = Column(Integer, default=0)
    
    # Badges array/list
    badges = Column(JSON, default=lambda: ["Verified Member"])
    
    # Status & Auth
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    onboarding_completed = Column(Boolean, default=True)
    primary_intent = Column(String(50), default="EXCHANGE") # EXCHANGE, LEARN, TEACH, HELP, MEET
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    skills = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    sent_exchanges = relationship("Exchange", foreign_keys="[Exchange.requester_id]", back_populates="requester")
    received_exchanges = relationship("Exchange", foreign_keys="[Exchange.receiver_id]", back_populates="receiver")
    written_reviews = relationship("Review", foreign_keys="[Review.reviewer_id]", back_populates="reviewer")
    received_reviews = relationship("Review", foreign_keys="[Review.reviewee_id]", back_populates="reviewee")
    sent_messages = relationship("Message", foreign_keys="[Message.sender_id]", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="[Message.receiver_id]", back_populates="receiver")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    posts = relationship("Post", foreign_keys="[Post.author_id]", back_populates="author", cascade="all, delete-orphan")
