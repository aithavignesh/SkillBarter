from app.models.skill import Skill, UserSkill
from app.models.skill_graph import SkillRelationship
from app.models.user import User
from app.services.learning import build_learning_path


def test_learning_path_finds_missing_prerequisite(db):
    user = db.query(User).first()
    python = Skill(name="LP Python", category="Programming", popularity=10)
    ml = Skill(name="LP Machine Learning", category="AI", popularity=9)
    db.add_all([python, ml])
    db.commit()

    db.add(SkillRelationship(
        source_skill_id=python.id,
        target_skill_id=ml.id,
        relationship_type="PREREQUISITE_OF",
    ))
    db.add(UserSkill(
        user_id=user.id,
        skill_id=ml.id,
        skill_type="NEEDED",
        experience_level="Beginner",
    ))
    db.commit()

    result = build_learning_path(user, ml, db)
    assert python.id in [step["skill_id"] for step in result["missing_skills"]]


def test_learning_path_does_not_duplicate_cycles(db):
    user = db.query(User).first()
    a = Skill(name="LP Cycle A", category="Programming")
    b = Skill(name="LP Cycle B", category="Programming")
    db.add_all([a, b])
    db.commit()

    db.add_all([
        SkillRelationship(source_skill_id=a.id, target_skill_id=b.id, relationship_type="PREREQUISITE_OF"),
        SkillRelationship(source_skill_id=b.id, target_skill_id=a.id, relationship_type="PREREQUISITE_OF"),
    ])
    db.commit()

    result = build_learning_path(user, a, db)
    ids = [step["skill_id"] for step in result["path"]]
    assert len(ids) == len(set(ids))


def test_learning_goal_analysis_matches_existing_skill(db):
    user = db.query(User).first()
    db.add(Skill(name="Computer Vision", category="AI", popularity=100))
    db.commit()

    from app.services.learning import analyze_goal
    result = analyze_goal("I want to learn computer vision", db)
    assert result
    assert result[0]["skill_name"] == "Computer Vision"
