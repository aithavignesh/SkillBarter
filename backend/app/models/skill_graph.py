import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class SkillRelationship(Base):
    __tablename__ = "skill_relationships"

    id = Column(Integer, primary_key=True, index=True)
    source_skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    target_skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(40), nullable=False, index=True)
    weight = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    source_skill = relationship("Skill", foreign_keys=[source_skill_id])
    target_skill = relationship("Skill", foreign_keys=[target_skill_id])

    __table_args__ = (
        UniqueConstraint("source_skill_id", "target_skill_id", "relationship_type", name="uq_skill_relationship"),
    )
