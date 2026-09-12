import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False)
    icon = Column(String(50), default="Wrench")
    description = Column(String(255), nullable=True)
    popularity = Column(Integer, default=0)

    user_skills = relationship("UserSkill", back_populates="skill", cascade="all, delete-orphan")

class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_type = Column(String(20), nullable=False) # "OFFERED" or "NEEDED"
    experience_level = Column(String(50), default="Intermediate") # Beginner, Intermediate, Advanced, Expert
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="skills")
    skill = relationship("Skill", back_populates="user_skills")
