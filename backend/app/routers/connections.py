from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.user import User
from app.models.connection import Connection
from app.models.notification import Notification
from app.models.safety import Block
from app.schemas.connection import ConnectionOut
from app.schemas.user import UserNearbyOut
from app.services.auth import get_current_user
from app.services.spatial import calculate_haversine_distance, format_distance

router = APIRouter(prefix="/connections", tags=["Connections"])

@router.get("", response_model=List[ConnectionOut])
def get_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conns = db.query(Connection).filter(
        or_(Connection.user_id == current_user.id, Connection.connected_user_id == current_user.id),
        Connection.status == "ACCEPTED"
    ).all()

    results = []
    for c in conns:
        partner_id = c.connected_user_id if c.user_id == current_user.id else c.user_id
        partner = db.query(User).filter(User.id == partner_id, User.is_active == True).first()
        if partner:
            results.append({
                "id": c.id,
                "user_id": c.user_id,
                "connected_user_id": c.connected_user_id,
                "status": c.status,
                "created_at": c.created_at,
                "partner": {
                    "id": partner.id,
                    "full_name": partner.full_name,
                    "avatar_url": partner.avatar_url,
                    "headline": partner.headline,
                    "trust_score": partner.trust_score,
                    "address_display": partner.address_display
                }
            })
    return results

@router.post("/{connected_user_id}", response_model=ConnectionOut)
def create_connection(
    connected_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if connected_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")

    partner = db.query(User).filter(User.id == connected_user_id, User.is_active == True).first()
    if not partner:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Connection).filter(
        or_(
            and_(Connection.user_id == current_user.id, Connection.connected_user_id == connected_user_id),
            and_(Connection.user_id == connected_user_id, Connection.connected_user_id == current_user.id)
        )
    ).first()
    
    if existing:
        return {
            "id": existing.id,
            "user_id": existing.user_id,
            "connected_user_id": existing.connected_user_id,
            "status": existing.status,
            "created_at": existing.created_at,
            "partner": {
                "id": partner.id,
                "full_name": partner.full_name,
                "avatar_url": partner.avatar_url,
                "headline": partner.headline,
                "trust_score": partner.trust_score,
                "address_display": partner.address_display
            }
        }

    conn = Connection(
        user_id=current_user.id,
        connected_user_id=connected_user_id,
        status="ACCEPTED"
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)

    # Notify partner
    notif = Notification(
        user_id=partner.id,
        type="NEW_CONNECTION",
        title="New Community Connection",
        message=f"{current_user.full_name} added you as a neighbor connection.",
        link=f"/profile/{current_user.id}"
    )
    db.add(notif)
    db.commit()

    return {
        "id": conn.id,
        "user_id": conn.user_id,
        "connected_user_id": conn.connected_user_id,
        "status": conn.status,
        "created_at": conn.created_at,
        "partner": {
            "id": partner.id,
            "full_name": partner.full_name,
            "avatar_url": partner.avatar_url,
            "headline": partner.headline,
            "trust_score": partner.trust_score,
            "address_display": partner.address_display
        }
    }

@router.delete("/{connected_user_id}")
def remove_connection(
    connected_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conn = db.query(Connection).filter(
        or_(
            and_(Connection.user_id == current_user.id, Connection.connected_user_id == connected_user_id),
            and_(Connection.user_id == connected_user_id, Connection.connected_user_id == current_user.id)
        )
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    db.delete(conn)
    db.commit()
    return {"message": "Connection removed"}

@router.get("/suggestions", response_model=List[UserNearbyOut])
def get_connection_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Already connected
    conns = db.query(Connection).filter(
        or_(Connection.user_id == current_user.id, Connection.connected_user_id == current_user.id)
    ).all()
    connected_ids = set([c.connected_user_id if c.user_id == current_user.id else c.user_id for c in conns])
    connected_ids.add(current_user.id)

    # Blocks
    blocks = [b.blocked_id for b in db.query(Block.blocked_id).filter(Block.blocker_id == current_user.id).all()]
    connected_ids.update(blocks)

    candidates = db.query(User).filter(
        User.id.notin_(connected_ids),
        User.is_active == True
    ).limit(10).all()

    suggestions = []
    for cand in candidates:
        dist_km = calculate_haversine_distance(
            current_user.latitude, current_user.longitude,
            cand.latitude, cand.longitude
        )
        suggestions.append({
            "id": cand.id,
            "full_name": cand.full_name,
            "avatar_url": cand.avatar_url,
            "headline": cand.headline,
            "address_display": cand.address_display,
            "distance_km": dist_km,
            "distance_display": format_distance(dist_km),
            "trust_score": cand.trust_score,
            "reliability_score": cand.reliability_score,
            "completed_exchanges_count": cand.completed_exchanges_count,
            "badges": cand.badges or [],
            "skills_offered": [],
            "skills_needed": [],
            "availability": cand.availability
        })
        
    suggestions.sort(key=lambda s: s["distance_km"])
    return suggestions
