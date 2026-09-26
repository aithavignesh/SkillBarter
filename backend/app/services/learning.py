import re
from collections import deque
from typing import Dict, List, Set, Tuple

from sqlalchemy.orm import Session

from app.models.skill import Skill, UserSkill
from app.models.skill_graph import SkillRelationship
from app.models.safety import Block
from app.models.user import User


_ALLOWED_RELATIONSHIPS = {"PREREQUISITE_OF", "RELATED_TO"}
_STOPWORDS = {
    "i", "want", "to", "learn", "learning", "become", "good", "at", "in",
    "with", "for", "a", "an", "the", "and", "of", "my", "career", "skills",
}


def _tokens(value: str) -> Set[str]:
    return {
        token for token in re.findall(r"[a-z0-9+#.]+", value.lower())
        if token not in _STOPWORDS and len(token) > 1
    }


def analyze_goal(goal: str, db: Session) -> List[dict]:
    tokens = _tokens(goal)
    if not tokens:
        return []

    skills = db.query(Skill).order_by(Skill.popularity.desc(), Skill.name.asc()).all()
    matches = []
    for skill in skills:
        skill_tokens = _tokens(skill.name)
        if not skill_tokens:
            continue
        overlap = tokens.intersection(skill_tokens)
        if not overlap:
            continue
        score = round((len(overlap) / len(skill_tokens)) * 100)
        matches.append({
            "skill_id": skill.id,
            "skill_name": skill.name,
            "category": skill.category,
            "match_score": score,
            "matched_terms": sorted(overlap),
        })
    matches.sort(key=lambda item: (-item["match_score"], item["skill_name"].lower()))
    return matches[:10]


def _relationship_map(db: Session) -> Dict[int, List[SkillRelationship]]:
    relationships = db.query(SkillRelationship).filter(
        SkillRelationship.relationship_type.in_(_ALLOWED_RELATIONSHIPS)
    ).all()
    result: Dict[int, List[SkillRelationship]] = {}
    for rel in relationships:
        result.setdefault(rel.source_skill_id, []).append(rel)
    return result


def build_learning_path(user: User, target_skill: Skill, db: Session, goal: str | None = None) -> dict:
    user_skill_rows = db.query(UserSkill).filter(UserSkill.user_id == user.id).all()
    known_ids = {row.skill_id for row in user_skill_rows}
    graph = _relationship_map(db)

    # Traverse prerequisite edges backwards: A PREREQUISITE_OF B means A is
    # required before B. Cycles are safely ignored through visited tracking.
    required: List[Tuple[int, str]] = []
    visited: Set[int] = set()

    def visit(skill_id: int) -> None:
        if skill_id in visited:
            return
        visited.add(skill_id)
        for rel in graph.get(skill_id, []):
            if rel.relationship_type == "PREREQUISITE_OF":
                visit(rel.source_skill_id)
                if rel.source_skill_id not in known_ids:
                    required.append((rel.source_skill_id, rel.relationship_type))

    visit(target_skill.id)

    # Also include directly related skills as optional next steps only when
    # there is no prerequisite path. This keeps the core path deterministic.
    if not required:
        for rel in graph.get(target_skill.id, []):
            if rel.relationship_type == "RELATED_TO" and rel.target_skill_id not in known_ids:
                required.append((rel.target_skill_id, rel.relationship_type))

    seen: Set[int] = set()
    ordered_ids = []
    for skill_id, relationship in required:
        if skill_id not in seen and skill_id not in known_ids and skill_id != target_skill.id:
            seen.add(skill_id)
            ordered_ids.append((skill_id, relationship))

    path_steps: List[dict] = []
    for skill_id, relationship in ordered_ids:
        skill = db.query(Skill).filter(Skill.id == skill_id).first()
        if skill:
            path_steps.append({
                "skill_id": skill.id,
                "skill_name": skill.name,
                "category": skill.category,
                "status": "MISSING",
                "relationship": relationship,
                "reason": (
                    "Required prerequisite for the target skill."
                    if relationship == "PREREQUISITE_OF"
                    else "Related skill that can strengthen the target skill."
                ),
            })

    path_steps.append({
        "skill_id": target_skill.id,
        "skill_name": target_skill.name,
        "category": target_skill.category,
        "status": "KNOWN" if target_skill.id in known_ids else "TARGET",
        "relationship": None,
        "reason": "Target skill selected for this learning goal.",
    })

    blocked_by_me = {
        row.blocked_id for row in db.query(Block).filter(Block.blocker_id == user.id).all()
    }
    blocking_me = {
        row.blocker_id for row in db.query(Block).filter(Block.blocked_id == user.id).all()
    }
    excluded = blocked_by_me | blocking_me | {user.id}

    missing_ids = [step["skill_id"] for step in path_steps if step["status"] == "MISSING"]
    teacher_skill_id = missing_ids[0] if missing_ids else target_skill.id

    teacher_rows = db.query(UserSkill, User).join(
        User, User.id == UserSkill.user_id
    ).filter(
        UserSkill.skill_id == teacher_skill_id,
        UserSkill.skill_type == "OFFERED",
        User.is_active == True,
        User.id.notin_(excluded),
    ).limit(10).all()

    teachers = []
    for user_skill, teacher in teacher_rows:
        teachers.append({
            "user_id": teacher.id,
            "full_name": teacher.full_name,
            "headline": teacher.headline,
            "skill": target_skill.name if teacher_skill_id == target_skill.id else (
                db.query(Skill.name).filter(Skill.id == teacher_skill_id).scalar()
            ),
            "experience_level": user_skill.experience_level,
            "trust_score": teacher.trust_score,
            "completed_exchanges_count": teacher.completed_exchanges_count,
        })

    missing_steps = [step for step in path_steps if step["status"] == "MISSING"]
    return {
        "target_skill_id": target_skill.id,
        "target_skill": target_skill.name,
        "goal": goal,
        "known_skills": sorted(known_ids),
        "missing_skills": missing_steps,
        "path": path_steps,
        "suggested_teachers": teachers,
    }
