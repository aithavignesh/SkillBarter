from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.trust import recalculate_user_trust_score

router = APIRouter(prefix="/trust", tags=["Trust System"])

@router.get("/user/{user_id}")
def get_user_trust_score_details(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    data = recalculate_user_trust_score(user_id, db)
    return data
