from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.database import get_db
from app.models.user import User
from app.models.message import Message
from app.models.exchange import Exchange
from app.models.safety import Block
from app.schemas.message import MessageCreate, MessageOut, ConversationOut
from app.services.auth import get_current_user
from app.services.websocket import ws_manager
import datetime

router = APIRouter(prefix="/messages", tags=["Messaging"])

@router.get("/conversations", response_model=List[ConversationOut])
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find all users current_user has exchanged messages with
    sent_to = [m[0] for m in db.query(Message.receiver_id).filter(Message.sender_id == current_user.id).distinct().all()]
    received_from = [m[0] for m in db.query(Message.sender_id).filter(Message.receiver_id == current_user.id).distinct().all()]
    partner_ids = set(sent_to + received_from)

    # Also add partners from any active or pending exchanges
    ex_partners_1 = [e[0] for e in db.query(Exchange.receiver_id).filter(Exchange.requester_id == current_user.id).all()]
    ex_partners_2 = [e[0] for e in db.query(Exchange.requester_id).filter(Exchange.receiver_id == current_user.id).all()]
    partner_ids.update(ex_partners_1 + ex_partners_2)

    # Remove blocks
    blocked = [b[0] for b in db.query(Block.blocked_id).filter(Block.blocker_id == current_user.id).all()]
    partner_ids.difference_update(blocked)

    conversations = []
    for pid in partner_ids:
        partner = db.query(User).filter(User.id == pid, User.is_active == True).first()
        if not partner:
            continue

        # Last message
        last_msg = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == pid),
                and_(Message.sender_id == pid, Message.receiver_id == current_user.id)
            )
        ).order_by(Message.created_at.desc()).first()

        unread = db.query(Message).filter(
            Message.sender_id == pid,
            Message.receiver_id == current_user.id,
            Message.is_read == False
        ).count()

        # Check latest exchange context
        latest_ex = db.query(Exchange).filter(
            or_(
                and_(Exchange.requester_id == current_user.id, Exchange.receiver_id == pid),
                and_(Exchange.requester_id == pid, Exchange.receiver_id == current_user.id)
            )
        ).order_by(Exchange.created_at.desc()).first()

        conversations.append({
            "partner": {
                "id": partner.id,
                "full_name": partner.full_name,
                "avatar_url": partner.avatar_url,
                "headline": partner.headline,
                "trust_score": partner.trust_score,
                "address_display": partner.address_display
            },
            "last_message": last_msg.content if last_msg else (f"Exchange status: {latest_ex.status}" if latest_ex else "Started conversation"),
            "last_message_at": last_msg.created_at if last_msg else (latest_ex.created_at if latest_ex else None),
            "unread_count": unread,
            "active_exchange_id": latest_ex.id if latest_ex else None,
            "active_exchange_status": latest_ex.status if latest_ex else None
        })

    # Sort latest message first
    conversations.sort(key=lambda c: c["last_message_at"] or datetime.datetime.min, reverse=True)
    return conversations

@router.get("/{partner_id}", response_model=List[MessageOut])
def get_messages_with_partner(
    partner_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    partner = db.query(User).filter(User.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Mark incoming as read
    db.query(Message).filter(
        Message.sender_id == partner_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()

    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == partner_id),
            and_(Message.sender_id == partner_id, Message.receiver_id == current_user.id)
        )
    ).order_by(Message.created_at.asc()).all()

    return messages

@router.post("", response_model=MessageOut)
async def send_message(
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    # Check if blocked
    is_blocked = db.query(Block).filter(
        or_(
            and_(Block.blocker_id == current_user.id, Block.blocked_id == req.receiver_id),
            and_(Block.blocker_id == req.receiver_id, Block.blocked_id == current_user.id)
        )
    ).first()
    if is_blocked:
        raise HTTPException(status_code=403, detail="Communication not permitted between these accounts")

    msg = Message(
        sender_id=current_user.id,
        receiver_id=req.receiver_id,
        exchange_id=req.exchange_id,
        content=req.content.strip(),
        is_read=False
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Push to WebSocket if recipient is connected
    payload = {
        "event": "NEW_MESSAGE",
        "data": {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "exchange_id": msg.exchange_id,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
            "sender_name": current_user.full_name
        }
    }
    await ws_manager.send_personal_message(payload, req.receiver_id)

    return msg
